// Poddębice crawler — bip.poddebice.pl, devcomm "bipv45" CMS.
//
// One board ("Ogłoszenia Burmistrza Poddębic", id=102) carries every property
// auction, wykaz pre-announcement, and MPZP-planning notice mixed together
// (~279 docs as of 2026-07-10). Its list is a DataTables-JSON AJAX endpoint
// that returns EVERY row in a single call — no pagination needed. Confirmed
// live 2026-07-10: valid TLS chain (insecureTLS not needed), no bot-block
// (plain bot UA works for the JSON list, detail HTML, and PDF attachments
// alike).
//
// JSON row shape (aaData[i]), 0-indexed:
//   [0]=?, [1]=autor, [2]=TITLE, [3]=znak(usually empty), [4]=autor(dup),
//   [5]=DATE "YYYY-MM-DD", [6]=docId, [7..8]=?, [9]=p2 (the id the detail
//   page URL needs), [10]=menuId(=102), [11..16]=?
// See spikes/lodzkie/powiat-poddebicki/poddebice.md for the endpoint spike.
//
// DETAIL: index.php?id=102&p1=szczegoly&p2=<row[9]> — server-rendered HTML
// shell; the only real content is a relative "upload/pliki/<name>.pdf" link
// (the announcement's terms — address/area/price/date — live ONLY in that
// PDF; the detail page repeats just the title + creation date, both of which
// the JSON row already gave us for free).
//
// crawlActive(): filters the list to titles that are a scheduled AUCTION-SALE
//   announcement (isAuctionSaleTitle, see parse.js) within a 2-calendar-year
//   window (this board's realistically-still-open auctions are always this
//   recent — see withinActiveWindow; anything older would just resolve to
//   'archived' downstream anyway, the window exists purely to bound the
//   number of detail+PDF fetches on a 279-doc mixed board). For each
//   candidate: fetch the detail HTML for the PDF link, pdfText() it, hand the
//   text + title to parse.js's parseAnnouncementPdf(). Routes each resulting
//   record by kind: 'mieszkalny' -> listings (flats), 'grunt' -> land.
// crawlResultDocs(): NO achieved-price stream exists on this board — zero
//   "informacja o wyniku przetargu" / "rozstrzygnięcie" notices across all
//   279 entries (confirmed live 2026-07-10; see config.js). Scans
//   defensively (title-only, cheap) in case one is ever published, but
//   returns [] today. `source: 'pdf-text'` in config.js means refresh.js
//   calls pdfText() on any refs this ever returns — crawl.js does not
//   self-extract result text.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { isAuctionSaleTitle, isLeaseTitle, parseAnnouncementPdf } from './parse.js';

const ORIGIN = 'https://bip.poddebice.pl';
const BOARD_ID = '102';
const LIST_URL = `${ORIGIN}/index.php?id=${BOARD_ID}&akcja=pobierz_dokumenty_ajax&chwila=1`;

// Hard cap so a mis-filtered board can never balloon into hundreds of
// detail+PDF fetches in one CI run. Real live volume within the 2-year
// window is ~10 candidates (2026-07-10) — this is a circuit breaker, not a
// tuning knob.
const MAX_CANDIDATES = 60;

export function detailUrl(p2) {
  return `${ORIGIN}/index.php?id=${BOARD_ID}&p1=szczegoly&p2=${encodeURIComponent(p2)}`;
}

function currentYear() {
  return new Date().getFullYear();
}

/**
 * Parse the DataTables JSON list response into board entries.
 * @param {string} jsonText
 * @returns {Array<{title: string, date: string|null, p2: string}>}
 */
export function parseListJson(jsonText) {
  if (!jsonText) return [];
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    console.error(`  poddebice: list JSON parse failed: ${err.message}`);
    return [];
  }
  const rows = Array.isArray(data?.aaData) ? data.aaData : [];
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 10) continue;
    const title = String(row[2] || '').replace(/\s+/g, ' ').trim();
    const date = row[5] || null;
    const p2 = row[9] != null ? String(row[9]) : null;
    if (!title || !p2 || seen.has(p2)) continue;
    seen.add(p2);
    out.push({ title, date, p2 });
  }
  return out;
}

/**
 * Extract the relative "upload/pliki/*.pdf" attachment link from a detail
 * page and resolve it to an absolute URL.
 * @param {string} html
 * @returns {string|null}
 */
export function pdfUrlFromDetail(html) {
  if (!html) return null;
  const m = /href="(upload\/pliki\/[^"]+\.pdf)"/i.exec(html);
  if (!m) return null;
  try {
    return new URL(m[1], `${ORIGIN}/`).href;
  } catch {
    return null;
  }
}

// This board's realistically-still-open auctions are always within the
// current + previous calendar year (mirrors gizycko/tczew's year window) —
// bounds the candidate count on a 279-doc mixed board without meaningfully
// affecting which real auctions get crawled; an item aged past this window
// that somehow still mattered would just resolve to 'archived' downstream.
function withinActiveWindow(dateStr) {
  if (!dateStr) return false;
  const year = Number(dateStr.slice(0, 4));
  return Number.isFinite(year) && year >= currentYear() - 1;
}

let listPromise = null;
async function fetchListEntries() {
  listPromise ??= (async () => {
    let jsonText;
    try {
      jsonText = await getText(LIST_URL);
    } catch (err) {
      console.error(`  poddebice: list fetch failed: ${err.message}`);
      return [];
    }
    return parseListJson(jsonText);
  })();
  return listPromise;
}

export async function crawlActive() {
  const entries = await fetchListEntries();
  const candidates = entries
    .filter((e) => withinActiveWindow(e.date) && isAuctionSaleTitle(e.title) && !isLeaseTitle(e.title))
    .slice(0, MAX_CANDIDATES);
  console.error(`  poddebice: ${entries.length} board entries, ${candidates.length} active-auction candidate(s)`);

  const listings = [];
  const land = [];
  for (const entry of candidates) {
    let detailHtml;
    try {
      detailHtml = await getText(detailUrl(entry.p2));
    } catch (err) {
      console.error(`  poddebice: detail fetch failed (p2=${entry.p2}): ${err.message}`);
      continue;
    }
    const pdfUrl = pdfUrlFromDetail(detailHtml);
    if (!pdfUrl) {
      console.error(`  poddebice: no PDF link on detail p2=${entry.p2} — "${entry.title.slice(0, 90)}"`);
      continue;
    }
    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  poddebice: pdfText failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    const records = parseAnnouncementPdf(text, entry.title, entry.date, pdfUrl);
    if (records.length === 0) {
      console.error(`  poddebice: parser returned 0 records for p2=${entry.p2} — "${entry.title.slice(0, 90)}"`);
      continue;
    }
    for (const r of records) (r.kind === 'grunt' ? land : listings).push(r);
  }

  console.error(`  poddebice active: ${listings.length} flat listing(s), ${land.length} land record(s)`);
  return { listings, wykaz: [], land };
}

/**
 * No achieved-price stream exists on this board (see file header + config.js)
 * — this scans defensively for a future "wynik"/"rozstrzygnięcie" title but
 * is expected to return [] indefinitely.
 * @returns {Promise<Array<{pdf_url: string, auction_date: string|null}>>}
 */
export async function crawlResultDocs() {
  const entries = await fetchListEntries();
  const resultEntries = entries.filter((e) => /wynik|rozstrzygni[eę]/i.test(e.title));
  if (resultEntries.length === 0) return [];

  const refs = [];
  for (const entry of resultEntries.slice(0, MAX_CANDIDATES)) {
    let detailHtml;
    try {
      detailHtml = await getText(detailUrl(entry.p2));
    } catch (err) {
      console.error(`  poddebice: result detail fetch failed (p2=${entry.p2}): ${err.message}`);
      continue;
    }
    const pdfUrl = pdfUrlFromDetail(detailHtml);
    if (!pdfUrl) continue;
    refs.push({ pdf_url: pdfUrl, auction_date: entry.date });
  }
  console.error(`  poddebice: ${refs.length} result PDF ref(s) (expected 0 — no result stream on this board)`);
  return refs;
}

// CLI smoke test: `node src/cities/poddebice/crawl.js` — prints counts + one
// sample record from each stream.
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
