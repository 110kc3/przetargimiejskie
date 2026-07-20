// Głogów crawler.
//
// *** PLATFORM MIGRATION (read config.js's header first) ***
// The BUILD spike profiled glogow.bip.info.pl as server-rendered HTML with a
// JS-gated listing index but JS-free document/PDF pages. Re-verified LIVE
// 2026-07-19: the whole host now serves a bare Angular `<app-root>` shell
// (`last-modified: 2026-07-10`) for every path — index AND document pages
// alike. This is the SAME class of migration Złotoryja hit, except it
// rolled out on the SAME domain here (no host move).
//
// Reverse-engineered API shape (live-verified 2026-07-19, via the compiled
// bundle's favicon hint `/api/fo/favicon.ico` + direct probing):
//   GET /api/fo/articles?page=P&count=N&path=<page-path>&category=<id>
//     -> { meta:{pages,amount}, data:[{ id, attributes:{ slug, title,
//          publishedFrom, symbol, category:{...} } }] }         (list view)
//   GET /api/fo/articles/<slug>
//     -> { data:{ attributes:{ title, content (HTML teaser only — NOT the
//          operative legal text), attachments:[{id, attributes:{
//          originalName, extension, size, content }}], fullUrl, ... } } }
//   GET /api/fo/files/<attachmentId>/download
//     -> raw PDF bytes (born-digital; `pdftotext` extracts cleanly)
//
// The legacy idmp taxonomy survives as the category id: idmp=27 ==
// "przedmiotowe27d" (title "Sprzedaż nieruchomości gminnych", path
// "/sprzedaz-nieruchomosci-gminnych-2") — ONE board carrying BOTH streams
// (unlike Zgorzelec/Lubliniec's two-board split), title-routed via parse.js's
// isAnnouncement/isResultDoc; "LISTA OSÓB ZAKWALIFIKOWANYCH …" (qualified-
// bidders list) also shares it and is skipped before ever fetching an
// article. Live-verified volume at build time: 161 board items (6 pages),
// spanning 2022-12-21 to 2026-07-14.
//
// The article JSON's own `attachments[].attributes.content` field is
// UNRELIABLE — live-verified EMPTY for some documents (e.g. the Wały
// Bolesława Chrobrego 6 multi-lot announcement's attachment) and only a
// partial excerpt for others — so this adapter NEVER reads it. Every
// attachment PDF is downloaded and text-extracted directly via core's
// pdfText() (content-addressed cache, so repeat runs are instant).
//
// TLS: this host ships an INCOMPLETE certificate chain (missing intermediate
// CA — same class of issue as bip.zlotoryja.pl / bip.miastozabrze.pl); Node
// needs `insecureTLS: true`. Data is public/read-only.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isAnnouncement,
  isResultDoc,
  isQualifiedBiddersList,
} from './parse.js';

const ORIGIN = 'https://glogow.bip.info.pl';
const API_BASE = `${ORIGIN}/api/fo`;
const API_ARTICLES = `${API_BASE}/articles`;

const CATEGORY = 'przedmiotowe27d'; // legacy idmp=27 "Sprzedaż nieruchomości gminnych"
const LIST_PATH = '/sprzedaz-nieruchomosci-gminnych-2';
const COUNT = 30;

// Board-list pagination cap. Live-verified 161 items / 6 pages (2026-07-19),
// growing at roughly a few dozen/year; the walk self-stops the moment a page
// yields zero items or `meta.pages` is reached, so this generous cap only
// matters as a runaway guard.
const MAX_LIST_PAGES = 30;

// Detail-fetch (article JSON + attachment PDF) budget — the expensive part:
// one throttled request per article PLUS one per attachment PDF. Live volume
// at build time is ~155 real candidates after skipping qualified-bidder-list
// notices, comfortably inside this budget on a first full-history run;
// bounded anyway per ADAPTER-GUIDE §5 so growth can never make a CI job time
// out (remainder backfills the next run, newest-first since the board is
// newest-first).
const CRAWL_BUDGET_MS = Number(process.env.GLOGOW_CRAWL_BUDGET_MS) || 10 * 60 * 1000;
const MAX_DETAILS = Number(process.env.GLOGOW_MAX_DETAILS) || 220;

// A browser UA — bip.info.pl serves the bot UA too, but a browser UA is the
// safe default for municipal WAFs (harmless if unneeded, matches the rest of
// this repo's bip.info.pl adapters). `insecureTLS` works around the host's
// incomplete cert chain (see header).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { insecureTLS: true, userAgent: UA };

function listUrl(page) {
  const params = new URLSearchParams({
    page: String(page),
    count: String(COUNT),
    path: LIST_PATH,
    category: CATEGORY,
  });
  return `${API_ARTICLES}?${params.toString()}`;
}
function articleUrl(slug) {
  return `${API_ARTICLES}/${encodeURIComponent(slug)}`;
}
function pdfDownloadUrl(attachmentId) {
  return `${API_BASE}/files/${attachmentId}/download`;
}

/** Walk the board's list endpoint (bounded), newest-first, collecting every
 *  item's {slug, title, publishedFrom}. Stops at MAX_LIST_PAGES, or as soon
 *  as a page returns no items, or once `meta.pages` is reached. */
async function fetchBoardItems() {
  const items = [];
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    let json;
    try {
      const text = await getText(listUrl(page), FETCH_OPTS);
      json = JSON.parse(text);
    } catch (err) {
      console.error(`  glogow: board list page ${page} failed: ${err.message}`);
      break;
    }
    const data = Array.isArray(json?.data) ? json.data : [];
    if (!data.length) break;
    for (const item of data) {
      const a = item?.attributes;
      if (!a?.slug) continue;
      items.push({ slug: a.slug, title: a.title || '', publishedFrom: a.publishedFrom || null });
    }
    const totalPages = json?.meta?.pages || 1;
    if (page >= totalPages) break;
  }
  return items;
}

/** Fetch one article's full JSON -> { title, fullUrl, attachments:[{id,name}] }
 *  or null. */
async function fetchArticleMeta(slug) {
  let json;
  try {
    const text = await getText(articleUrl(slug), FETCH_OPTS);
    json = JSON.parse(text);
  } catch (err) {
    console.error(`  glogow: article ${slug} fetch failed: ${err.message}`);
    return null;
  }
  const a = json?.data?.attributes;
  if (!a) return null;
  const attachments = (Array.isArray(a.attachments) ? a.attachments : [])
    .filter((att) => att?.id && att?.attributes?.extension?.toLowerCase() === 'pdf')
    .map((att) => ({ id: att.id, name: att.attributes.originalName || '' }));
  return {
    title: a.title || '',
    fullUrl: a.fullUrl ? `${ORIGIN}${a.fullUrl}` : null,
    attachments,
  };
}

/** Fetch + extract ONE attachment's PDF text (born-digital — pdftotext, no
 *  OCR needed; content-addressed cache via core's pdfText()). Never trusts
 *  the API's own precomputed `content` field (see header). */
async function fetchAttachmentText(attachmentId) {
  try {
    return await pdfText(pdfDownloadUrl(attachmentId), FETCH_OPTS);
  } catch (err) {
    console.error(`  glogow: attachment ${attachmentId} pdf-text failed: ${err.message}`);
    return null;
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed announcement records (flats/units/garages/houses)
  const land = [];     // kind:'grunt' announcement records -> land.json
  // Result refs use the `pdf_url` field name — that is what refresh.js reads
  // (`city.parseResultDoc(text, ref.auction_date, ref.pdf_url)`), so naming it
  // anything else silently hands parseResultDoc an undefined sourceUrl.
  const resultRefs = []; // { text, pdf_url, auction_date }

  // Politeness: skip re-downloading a RESULT PDF whose URL is already in a
  // committed properties.json (never applied to announcements — an active
  // listing must always be re-checked). Empty on the first run.
  const knownUrls = await loadKnownSourceUrls('glogow');

  const boardItems = await fetchBoardItems();
  console.error(`  glogow: board has ${boardItems.length} item(s)`);

  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let processed = 0;
  let skippedQualifiedList = 0;
  for (const item of boardItems) {
    if (isQualifiedBiddersList(buildRecordText({ title: item.title }))) {
      skippedQualifiedList++;
      continue; // procedural notice, not ann/result — never worth an article fetch
    }

    if (processed >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  glogow: crawl budget reached (processed ${processed}/${boardItems.length}); remainder backfills next run`,
      );
      break;
    }
    processed++;

    const meta = await fetchArticleMeta(item.slug);
    if (!meta || !meta.attachments.length) continue;

    // The list title alone tells us the STREAM before we even look at a PDF
    // ("INFORMACJA(E) o wyniku(ach) …" vs "… ogłasza …"); used only to gate
    // the known-urls skip below, never to extract structured fields.
    const looksLikeResult = /informacj\w*\s+o\s+wynik/i.test(item.title);
    const sourceUrl = meta.fullUrl || articleUrl(item.slug);

    for (const att of meta.attachments) {
      const pdfUrl = pdfDownloadUrl(att.id);
      if (looksLikeResult && knownUrls.has(pdfUrl)) continue; // already committed

      const body = await fetchAttachmentText(att.id);
      if (!body) continue;
      const recordText = buildRecordText({ title: meta.title, body });

      if (isResultDoc(recordText)) {
        if (!isSaleAuction(recordText) || isLease(recordText)) continue;
        resultRefs.push({
          text: recordText,
          pdf_url: pdfUrl,
          auction_date: item.publishedFrom ? item.publishedFrom.slice(0, 10) : null,
        });
      } else if (isAnnouncement(recordText)) {
        if (!isSaleAuction(recordText) || isLease(recordText)) continue;
        for (const parsed of parseAnnouncement(recordText)) {
          const enriched = { ...parsed, detail_url: pdfUrl, source_url: pdfUrl };
          (parsed.kind === 'grunt' ? land : listings).push(enriched);
        }
      }
      // else: neither gate matched (rare stray doc on the board) — ignore.
    }
  }
  console.error(`  glogow: skipped ${skippedQualifiedList} qualified-bidders-list notice(s)`);

  // Announcements accumulate the board's FULL history (like results); keep
  // only genuinely upcoming ones as "active" — a past round's announcement
  // (superseded by a later round or a result notice) is not a current
  // listing. Same idiom as kamienna-gora/jarocin/kwidzyn/strzelce-opolskie.
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeListings = listings.filter((l) => l.auction_date && l.auction_date >= todayIso);
  const activeLand = land.filter((l) => l.auction_date && l.auction_date >= todayIso);

  console.error(
    `  glogow: ${activeListings.length} active flat/unit/garage/house listing(s) (of ${listings.length} parsed), ` +
    `${activeLand.length} active land plot(s) (of ${land.length} parsed), ${resultRefs.length} result record(s)`,
  );
  return { listings: activeListings, land: activeLand, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
