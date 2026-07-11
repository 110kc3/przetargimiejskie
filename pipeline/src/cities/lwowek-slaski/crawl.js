// Lwówek Śląski crawler.
//
// Source: bip.lwowekslaski.pl — an IDcom.pl bip-v1 server-rendered-HTML BIP
// (same CMS family as tczew/gniezno/gizycko). Verified live 2026-07-11.
//
//   LIST (board 3 == "Przetargi", paginated):
//     https://bip.lwowekslaski.pl/wiadomosci/3/lista/{PAGE}
//       (PAGE 1 is also aliased as .../wiadomosci/3/lista/przetargi)
//   DETAIL:
//     https://bip.lwowekslaski.pl/wiadomosci/3/wiadomosc/{ID}/{slug}
//   ATTACHMENT (born-digital PDF, static CDN):
//     https://bip-v1-files.idcom-jst.pl/sites/3103/wiadomosci/{ID}/files/{name}.pdf
//
// List page HTML (confirmed live): each entry is
//   <p class="title"><a href="{detailUrl}">{Title}</a></p>
// Detail page: the real title is the 2nd <h2 class="header"> (the 1st is the
// "Przetargi" breadcrumb); the born-digital ogłoszenie/informacja PDF hangs in
// <div class="t1 attachment"><a href="…idcom-jst…/files/*.pdf">; the publication
// date is "Data wytworzenia dokumentu: <span>DD.MM.YYYY r.</span>". A minority
// of older FLAT result notices are TITLE-ONLY (empty body, no attachment).
//
// This board mixes THREE streams (verified live): sale announcements
// ("Ogłoszenie o … przetargu … na sprzedaż"), sale results ("Informacja o
// wyniku / o nabywcy …"), and LEASE notices ("… przetarg na oddanie w dzierżawę
// …"). Lease items are skipped cheaply by title BEFORE any detail/PDF fetch;
// the rest are fetched, their TITLE + PDF body joined into ONE blob via
// buildRecordText(), then routed by the parser's isResultDoc / isSaleAuction
// gates. source:'html' ⇒ result refs carry the pre-built `.text` (crawl.js
// fetches the PDF itself via core/pdf-text.js `pdfText`), so refresh.js does NOT
// re-dispatch OCR/pdf-text.
//
// No bot-block and a complete TLS chain (verified live with the default bot UA
// on board, detail and the idcom-jst CDN) — so NO custom UA and NO insecureTLS.
//
// The walk is bounded (page cap + article cap + wall-clock budget) so a growing
// archive can never time out the 25-min CI job — live volume at build time is
// ~50 items across ~6 pages, leaving generous headroom.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isResultDoc,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.lwowekslaski.pl';
const boardUrl = (page) => `${ORIGIN}/wiadomosci/3/lista/${page}`; // board 3 = Przetargi

const MAX_PAGES = 8;       // ~6 pages live; cap leaves headroom
const MAX_ARTICLES = 150;  // hard cap on detail/PDF fetches
const DEADLINE_MS = 10 * 60 * 1000; // wall-clock budget for the whole crawl

const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a>/g;

/** All list-page entries: [{ url, title }]. */
export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    const title = m[2].replace(/&amp;/g, '&').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

/** The real article title — the 2nd <h2 class="header"> (1st is the "Przetargi"
 *  breadcrumb). Falls back to the list-page title if the detail parse fails. */
export function detailTitle(html, fallback = '') {
  if (!html) return fallback;
  const headers = [...html.matchAll(/<h2 class="header">([^<]*)<\/h2>/gi)].map((m) => m[1].trim());
  const real = headers.find((t) => t && t.toLowerCase() !== 'przetargi');
  return real || fallback || headers[0] || '';
}

/** First born-digital PDF attachment on the idcom-jst CDN (excludes the generic
 *  assets.lwowekslaski.pl/pliki/rodo.pdf boilerplate, which is on a different
 *  host). null when the notice is title-only. */
export function attachmentPdfFromDetail(html) {
  if (!html) return null;
  const m = /href="(https:\/\/bip-v1-files\.idcom-jst\.pl\/[^"]+\.pdf[^"]*)"/i.exec(html);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

const PL_MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05',
  czerwca: '06', lipca: '07', sierpnia: '08', 'września': '09', wrzesnia: '09',
  'października': '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

/** Publication date (ISO) from the detail page. Primary "Data wytworzenia
 *  dokumentu: <span>DD.MM.YYYY r.</span>" (dot format, with a trailing " r.");
 *  fallback "Data wprowadzenia dokumentu do BIP: <span>DD <month-word> YYYY …". */
export function publishedDateFromDetail(html) {
  if (!html) return null;
  const m = /Data wytworzenia dokumentu:\s*<span>(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(html);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(html);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

/** Cheap title-only lease test to skip "… przetarg na oddanie w dzierżawę …"
 *  items BEFORE any detail/PDF fetch. */
function titleIsLease(title) {
  return /dzier[żz]aw|\bnajem\b|oddanie\s+w\s+dzier/i.test(title || '');
}

// ---- one memoised crawl serving both streams -------------------------------

let crawlPromise = null;

/** Fetch a detail page, resolve its full title + PDF body into a buildRecordText
 *  blob. Returns { title, text, published_date, url } or null on hard failure. */
async function fetchRecord(entry) {
  let html = '';
  try {
    html = await getText(entry.url);
  } catch (err) {
    console.error(`  lwowek-slaski: detail fetch failed (${entry.url}): ${err.message}`);
    return null;
  }
  const title = detailTitle(html, entry.title);
  const published_date = publishedDateFromDetail(html);
  const pdfUrl = attachmentPdfFromDetail(html);
  let body = '';
  if (pdfUrl) {
    try {
      body = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  lwowek-slaski: pdf-text failed (${pdfUrl}): ${err.message}`);
    }
  }
  return { title, text: buildRecordText({ title, body }), published_date, url: entry.url };
}

async function crawlAll() {
  const started = Date.now();
  const overBudget = () => Date.now() - started > DEADLINE_MS;

  // ---- 1. paginate the board, collecting unique non-lease entries ----
  const entries = [];
  const seenUrls = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (overBudget()) break;
    let html;
    try {
      html = await getText(boardUrl(page));
    } catch (err) {
      console.error(`  lwowek-slaski: list page ${page} failed: ${err.message}`);
      break;
    }
    const pageEntries = parseListPage(html);
    let added = 0;
    for (const e of pageEntries) {
      if (seenUrls.has(e.url)) continue;
      seenUrls.add(e.url);
      added++;
      if (titleIsLease(e.title)) continue; // skip dzierżawa/najem before any fetch
      entries.push(e);
    }
    if (added === 0) break; // no new items -> past the last page
    if (entries.length >= MAX_ARTICLES) break;
  }

  // ---- 2. fetch each entry's detail + PDF, route into the two streams ----
  const listings = [];   // address-keyed active units (flat/commercial/built)
  const land = [];       // kind:'grunt' active parcels -> land.json
  const resultRefs = []; // { text, auction_date, pdf_url }

  for (const entry of entries.slice(0, MAX_ARTICLES)) {
    if (overBudget()) break;
    const rec = await fetchRecord(entry);
    if (!rec) continue;
    const { text } = rec;
    if (isLease(text)) continue; // defensive: body-level lease that slipped the title gate

    if (isResultDoc(text)) {
      if (!isSaleAuction(text)) continue; // e.g. a non-property "wynik" notice
      resultRefs.push({
        text,
        auction_date: auctionDateFromText(text) || rec.published_date || null,
        pdf_url: rec.url,
      });
      continue;
    }

    // announcement
    if (!isSaleAuction(text)) continue;
    const parsed = parseAnnouncement(text);
    if (!parsed) continue;
    const enriched = { ...parsed, published_date: rec.published_date, detail_url: rec.url, source_url: rec.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  lwowek-slaski: ${listings.length} unit listing(s), ${land.length} land parcel(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
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
