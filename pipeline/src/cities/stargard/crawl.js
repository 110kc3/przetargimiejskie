// Stargard crawler — dual-source (TBS WordPress announcements + BIP results).
//
// SOURCE 1 — TBS announcements (tbs.stargard.pl):
//   Paginate /rodzaj-nieruchomosci/przetargi/page/N/ (WordPress, server-HTML).
//   Harvest /ogloszenia/<slug>/ links from each page; fetch each detail page;
//   parse with parseTbsDetail. Filter to flats (kind === mieszkalny).
//   Dedup by address key (same flat may appear as I, II, III przetarg — keep
//   the most recent = the one with the highest round / latest date).
//
// SOURCE 2 — BIP result notices (bip.stargard.eu/22358):
//   Paginate /22358/strona/N (7 pages as of June 2026).
//   Parse each page with parseBipResultList; filter to flats/commercial.
//   No separate detail-page fetch needed — summary text is inline.
//   crawlResultDocs() returns these for parseResultDoc() to process.
//
// NOTE: Achieved price is in the PDF attachment on each BIP document page.
// The HTML body does not carry it. crawlResultDocs / parseResultDoc record
// the notice metadata but leave achieved_price_pln: null until PDF parsing
// is added in a future pass.

import { getText } from '../../core/fetch.js';
import { parseTbsDetail, parseBipResultList } from './parse.js';

const TBS_ORIGIN = 'https://tbs.stargard.pl';
const TBS_ARCHIVE = '/rodzaj-nieruchomosci/przetargi';
const BIP_RESULTS = 'https://bip.stargard.eu/22358';
const BIP_ORIGIN = 'https://bip.stargard.eu';

const MAX_TBS_PAGES = 15;
const MAX_BIP_PAGES = 10; // 7 pages visible as of June 2026 + safety margin

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// -------------------------------------------------------------------
// TBS helpers
// -------------------------------------------------------------------

/**
 * Harvest all /ogloszenia/<slug>/ links from a TBS listing page.
 * @param {string} html
 * @returns {string[]}  absolute URLs
 */
function harvestTbsPosts(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="(https?:\/\/tbs\.stargard\.pl\/ogloszenia\/[^"]+)"/gi)) {
    const url = m[1].replace(/\?.*$/, '').replace(/\/$/, '') + '/';
    out.add(url);
  }
  return [...out];
}

/**
 * Crawl all TBS flat announcements. Returns deduped array keyed by
 * address.key — when the same flat appears multiple times (I→II→III przetarg)
 * we keep the entry with the highest round (most current relisting).
 * @returns {Promise<object[]>}
 */
async function crawlTbsListings() {
  const postUrls = new Set();

  for (let page = 1; page <= MAX_TBS_PAGES; page++) {
    const url = page === 1
      ? `${TBS_ORIGIN}${TBS_ARCHIVE}/`
      : `${TBS_ORIGIN}${TBS_ARCHIVE}/page/${page}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      // 404 past the last page or network failure — stop paging
      if (/http 404|http 40[013]|ECONNREFUSED|ENOTFOUND/i.test(err.message)) break;
      console.error(`  stargard TBS page ${page} fetch failed: ${err.message}`);
      break;
    }
    const links = harvestTbsPosts(html);
    if (links.length === 0) break;
    let added = 0;
    for (const u of links) { if (!postUrls.has(u)) { postUrls.add(u); added++; } }
    if (added === 0) break; // identical to previous page → stop
  }

  console.error(`  stargard: ${postUrls.size} TBS post(s) to inspect`);

  // Fetch each detail page and parse
  const byKey = new Map(); // address.key → record (keep highest round)

  for (const url of postUrls) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  stargard TBS post fetch failed (${url}): ${err.message}`);
      continue;
    }
    const rec = parseTbsDetail(html, url);
    if (!rec || rec.kind === 'grunt') continue; // skip land + non-flats

    const key = rec.address?.key;
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, rec);
    } else {
      // Keep the higher round (or the one with a price when the other lacks it)
      const newRound = rec.round ?? 0;
      const existRound = existing.round ?? 0;
      if (newRound > existRound) byKey.set(key, rec);
    }
  }

  const listings = [...byKey.values()];
  console.error(`  stargard: ${listings.length} flat listing(s) from TBS`);
  return listings;
}

// -------------------------------------------------------------------
// BIP result helpers
// -------------------------------------------------------------------

/**
 * Crawl all BIP result notices across all pages.
 * Returns raw notice objects (symbol, date, href, text, kind).
 * @returns {Promise<object[]>}
 */
async function crawlBipResultPages() {
  const all = [];
  const seenSymbols = new Set();

  for (let page = 1; page <= MAX_BIP_PAGES; page++) {
    const url = page === 1 ? BIP_RESULTS : `${BIP_RESULTS}/strona/${page}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/http 404|http 40[013]/i.test(err.message)) break;
      console.error(`  stargard BIP results page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseBipResultList(html, BIP_ORIGIN);
    if (items.length === 0) break;

    let added = 0;
    for (const it of items) {
      if (seenSymbols.has(it.symbol)) continue;
      seenSymbols.add(it.symbol);
      all.push(it);
      added++;
    }
    if (added === 0) break;
  }

  console.error(`  stargard: ${all.length} flat/commercial BIP result notice(s)`);
  return all;
}

// -------------------------------------------------------------------
// Exported crawl functions (adapter contract)
// -------------------------------------------------------------------

/**
 * Crawl active flat listings from TBS.
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
export async function crawlActive() {
  const listings = await crawlTbsListings();
  return { listings, wykaz: [], land: [] };
}

/**
 * Crawl BIP result notices (achieved-price stream).
 * Returns one "doc" object per flat/commercial notice. The parseResultDoc
 * function then processes each one to emit structured result records.
 *
 * Shape of each returned object matches what parseResultDoc expects:
 *   { text: string (summary body), date: string (ISO), url: string }
 *
 * @returns {Promise<Array<{ text: string, date: string, url: string }>>}
 */
export async function crawlResultDocs() {
  const notices = await crawlBipResultPages();
  return notices.map((n) => ({
    text: n.text,
    date: n.date,
    url: n.href,
  }));
}
