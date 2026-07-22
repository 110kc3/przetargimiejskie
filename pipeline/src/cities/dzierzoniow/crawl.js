// Dzierżoniów crawler.
//
// *** Madkom SIP BIP — React SPA over a plain JSON HTTP API (no browser) ***
// bip.um.dzierzoniow.pl renders a bare CRA `<div id="root">` shell to a plain
// GET, but is backed by a plain JSON HTTP API (reverse-engineered from the
// compiled bundle, live-verified 2026-07-21):
//   GET /api/menu/<menuId>/articles?limit=N&offset=K&archived=true
//     -> { total, articles:[{ id, link:"a,<id>,<slug>.html",
//          aliasFields:[{alias:"title",value}], columnFields:[{fieldId:56,
//          value:"<publish datetime>"}, …] }] }
//   GET /api/articles/<articleId>
//     -> { id, title, content(HTML), attachments:[{ id, name, extension,
//          size, link:"e,pobierz,get.html?id=<id>" }], … }
//   GET /api/files/<attachmentId>   -> raw file bytes (born-digital PDF)
//
// TWO boards feed the two streams (menu hierarchy 12 › 1639 "Nieruchomości -
// przetargi"):
//   * ANNOUNCEMENTS: menu 1838 "Lokale mieszkalne" — each item is ONE flat's
//     detail article carrying an "Ogłoszenie …" PDF (price/date/round). This
//     is the clean, flats-only board (the sibling menu 48 "Ogłoszenia o
//     przetargach" mixes flats/land/commercial and only links here). Only
//     future-dated auctions are returned as active listings; the board keeps
//     a flat visible for a while after its auction, so past ones are dropped.
//   * RESULTS: menu 63 "Wyniki przetargów" — its "actual" tab is empty; every
//     result lives in the ARCHIVED tab (`archived=true`). Each article is one
//     auction DAY's "Informacja o rozstrzygnięciu przetargów" PDF (a numbered
//     list of ALL properties auctioned that day). parse.js splits it and keeps
//     only the lokale mieszkalne.
//
// TLS chain is COMPLETE (no insecureTLS); the plain bot UA is served fine. A
// browser UA is passed anyway as the standard municipal-WAF-safe default.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  parseResultDoc,
  isFlat,
  titleAuctionDate,
} from './parse.js';

const ORIGIN = 'https://bip.um.dzierzoniow.pl';
const API = `${ORIGIN}/api`;

const ANNOUNCE_MENU = 1838; // "Lokale mieszkalne"
const RESULT_MENU = 63;     // "Wyniki przetargów" (archived tab)

const LIST_COUNT = 100;
const MAX_LIST_PAGES = 12; // 304 archived results / 100 = 4 pages; generous guard

// Only fetch result PDFs for auctions in/after this year — matches refresh.js's
// pipeline floor (2020), so older ones (the archive reaches back to 2013) are
// skipped rather than fetched-then-floored. Env-overridable for a full backfill.
const RESULT_MIN_YEAR = Number(process.env.DZIERZONIOW_RESULT_MIN_YEAR) || 2020;

// Detail-fetch budget: one throttled article-JSON request + one PDF per result
// day. ~130 result days are 2020+, comfortably inside this; bounded per
// ADAPTER-GUIDE §5 (newest-first, remainder backfills next run) so archive
// growth can never time a CI job out.
const MAX_RESULT_DETAILS = Number(process.env.DZIERZONIOW_MAX_DETAILS) || 200;
const CRAWL_BUDGET_MS = Number(process.env.DZIERZONIOW_CRAWL_BUDGET_MS) || 12 * 60 * 1000;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

function listUrl(menuId, offset, archived) {
  const p = new URLSearchParams({ limit: String(LIST_COUNT), offset: String(offset) });
  if (archived) p.set('archived', 'true');
  return `${API}/menu/${menuId}/articles?${p.toString()}`;
}
const articleUrl = (id) => `${API}/articles/${id}`;
const fileUrl = (attId) => `${API}/files/${attId}`;
const pageUrl = (link) => `${ORIGIN}/${link}`;

function itemTitle(item) {
  const af = (item.aliasFields || []).find((f) => f.alias === 'title');
  if (af?.value) return af.value;
  const cf = (item.columnFields || []).find((f) => f.fieldId === 52);
  return cf?.value || '';
}

/** Walk one board (bounded), newest-first, collecting {id, link, title}. */
async function fetchBoardItems(menuId, archived) {
  const items = [];
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    let json;
    try {
      json = JSON.parse(await getText(listUrl(menuId, page * LIST_COUNT, archived), FETCH_OPTS));
    } catch (err) {
      console.error(`  dzierzoniow: board ${menuId} page ${page} failed: ${err.message}`);
      break;
    }
    const arts = Array.isArray(json?.articles) ? json.articles : [];
    if (!arts.length) break;
    for (const a of arts) {
      if (a?.id == null || !a?.link) continue;
      items.push({ id: a.id, link: a.link, title: itemTitle(a) });
    }
    const total = Number(json?.total) || 0;
    if ((page + 1) * LIST_COUNT >= total) break;
  }
  return items;
}

/** Fetch one article's attachments -> [{ id, name, extension }]. */
async function fetchAttachments(articleId) {
  let json;
  try {
    json = JSON.parse(await getText(articleUrl(articleId), FETCH_OPTS));
  } catch (err) {
    console.error(`  dzierzoniow: article ${articleId} failed: ${err.message}`);
    return [];
  }
  return (Array.isArray(json?.attachments) ? json.attachments : [])
    .filter((a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf')
    .map((a) => ({ id: a.id, name: a.name || '' }));
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];    // active future flat announcements
  const resultRefs = [];  // { text, pdf_url, auction_date }

  // ---- ANNOUNCEMENTS (menu 1838, current) --------------------------------
  const annItems = (await fetchBoardItems(ANNOUNCE_MENU, false)).filter((i) => isFlat(i.title));
  console.error(`  dzierzoniow: ${annItems.length} flat announcement article(s)`);
  for (const item of annItems) {
    const atts = await fetchAttachments(item.id);
    if (!atts.length) continue; // pre-auction (wykaz) stage — no ogłoszenie PDF yet
    const og = atts.find((a) => /og[łl]oszeni/i.test(a.name)) || atts[0];
    let body;
    try {
      body = await pdfText(fileUrl(og.id), FETCH_OPTS);
    } catch (err) {
      console.error(`  dzierzoniow: ann pdf ${og.id} failed: ${err.message}`);
      continue;
    }
    const rec = parseAnnouncement(body, item.title, pageUrl(item.link));
    if (rec) listings.push(rec);
  }

  // ---- RESULTS (menu 63, archived) ---------------------------------------
  const knownUrls = await loadKnownSourceUrls('dzierzoniow');
  const resItems = await fetchBoardItems(RESULT_MENU, true);
  console.error(`  dzierzoniow: ${resItems.length} result article(s) on the board`);

  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let processed = 0;
  let skippedOld = 0;
  for (const item of resItems) {
    const auction_date = titleAuctionDate(item.title);
    if (!auction_date || Number(auction_date.slice(0, 4)) < RESULT_MIN_YEAR) { skippedOld++; continue; }
    if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) {
      console.error(`  dzierzoniow: result budget reached (processed ${processed}); remainder backfills next run`);
      break;
    }
    processed++;

    const atts = await fetchAttachments(item.id);
    const pdf = atts.find((a) => /rozstrzyg|wynik/i.test(a.name)) || atts[0];
    if (!pdf) continue;
    const pdf_url = fileUrl(pdf.id);
    if (knownUrls.has(pdf_url)) continue; // already committed (incremental skip)

    let text;
    try {
      text = await pdfText(pdf_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  dzierzoniow: result pdf ${pdf.id} failed: ${err.message}`);
      continue;
    }
    if (!isFlat(text)) continue; // all-land / all-commercial day — no flat records
    resultRefs.push({ text, pdf_url, auction_date });
  }
  console.error(`  dzierzoniow: skipped ${skippedOld} result day(s) older than ${RESULT_MIN_YEAR}`);

  // Keep only genuinely upcoming announcements as active (the board keeps a
  // flat listed past its auction date; its concluded outcome lives in the
  // results stream). Same idiom as glogow/kamienna-gora.
  const today = new Date().toISOString().slice(0, 10);
  const active = listings.filter((l) => l.auction_date && l.auction_date >= today);
  console.error(
    `  dzierzoniow: ${active.length} active flat listing(s) (of ${listings.length} parsed), ` +
    `${resultRefs.length} result document(s) with flats`,
  );
  return { listings: active, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0], sampleResult: results[0]?.pdf_url },
      null,
      2,
    ) + '\n',
  );
}
