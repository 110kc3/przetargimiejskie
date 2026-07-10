// Olesno crawler.
//
// ONE BIP host (bip.olesno.pl, skyCMS v4), but — unlike Przemyśl's two
// dedicated hosts (a "current announcements" board + a "results" board) —
// Olesno publishes PER-YEAR archive boards ("przetargi na sprzedaż
// nieruchomości <ROK>") that interleave announcements and results for ALL
// sale-board property types (flats + land; lease is on separate per-year
// boards and is never fetched here). One board serves both crawlActive() and
// crawlResultDocs(); the split happens by classifying each board entry's
// title (see parse.js's isAnnounceTitle / isResultTitle), then confirming
// the actual kind via classifyKind() on the fetched body (title alone is not
// reliable — round-I's real announcement title omits "mieszkalny" entirely).
//
// Volume (from spike): LOW, land-skewed. Flats appear ~1-3/year but recur
// across multiple years as I/II/III round repeats when unsold. As of this
// build (2026-07-10) the current 2026 board has zero lokal-titled entries at
// all (only działki) — crawlActive() legitimately returning an empty listing
// set is an expected, not a broken, outcome for this city right now.
//
// No auth or bot protection. Server-rendered HTML only.
// One request per second (enforced by getText throttle in core/fetch.js).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  parseListPage,
  mentionsLokal,
  isAnnounceTitle,
  isResultTitle,
  parseAnnouncement,
  extractArticleText,
} from './parse.js';

const HOST = 'https://bip.olesno.pl';

// Per-year sale boards. Numeric IDs are NOT a predictable function of year
// (skyCMS assigns them at publish time — 2026's board is a THREE-segment path,
// the others are two-segment), so these are hardcoded, each verified live
// (HTTP 200, real board content) on 2026-07-10 from this Pi's Polish IP.
// EXTENDING: when a 2027 board goes up, find its URL from the current board's
// own page (skyCMS lists sibling-year boards) or from the Wydział GNiL page
// (bip.olesno.pl/6657/wydzial-gospodarki-nieruchomosciami-i-lokalami.html)
// and prepend it here.
const SALE_BOARDS = [
  { year: 2026, url: `${HOST}/12941/11571/przetargi-na-sprzedaz-nieruchomosci-2026.html` },
  { year: 2025, url: `${HOST}/12150/przetargi-na-sprzedaz-nieruchomosci-2025.html` },
  { year: 2024, url: `${HOST}/11446/przetargi-na-sprzedaz-nieruchomosci-2024.html` },
  { year: 2023, url: `${HOST}/10729/przetargi-na-sprzedaz-nieruchomosci-2023.html` },
];

// crawlActive() only walks the current + previous year board — a genuinely
// pending (not-yet-decided) auction won't be sitting in a 2+ year old
// archive. crawlResultDocs() walks the full bounded window (backfill depth
// for the achieved-price history stream).
const ACTIVE_BOARD_COUNT = 2;

// Safety ceiling per board (observed live: 2025's 26-entry board = 3 pages
// at ~9/page; 8 pages gives headroom for a busier year without runaway).
const MAX_PAGES_PER_BOARD = 8;

// ---------------------------------------------------------------------------
// Shared board-list walker
// ---------------------------------------------------------------------------

/**
 * Fetch all article links from one per-year board, paginated.
 * skyCMS clamps an out-of-range ?Page=N to the last page rather than
 * erroring (confirmed live) — so pagination stops once a page adds nothing
 * new, not on a fixed page-size threshold (Olesno's boards run ~9/page, not
 * Przemyśl's flat 10/page).
 *
 * @param {string} boardUrl
 * @returns {Promise<Array<{title:string, url:string}>>}
 */
async function fetchBoardLinks(boardUrl) {
  const links = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES_PER_BOARD; page++) {
    const url = page === 1 ? boardUrl : `${boardUrl}?Page=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  olesno board fetch failed (${url}): ${err.message}`);
      break;
    }
    const items = parseListPage(html, HOST);
    if (items.length === 0) {
      console.error(`  olesno board page ${page} (${boardUrl}): no items, stopping`);
      break;
    }
    let added = 0;
    for (const it of items) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      links.push(it);
      added++;
    }
    console.error(`  olesno board page ${page} (${boardUrl}): ${items.length} items, ${added} new`);
    if (added === 0 && page > 1) break;
  }
  return links;
}

// ---------------------------------------------------------------------------
// Announcement crawl (crawlActive)
// ---------------------------------------------------------------------------

/**
 * Fetch and parse one announcement detail page into a listing record.
 * Returns null if this candidate turned out not to be a viable flat listing
 * (caller logs + skips).
 *
 * @param {{title:string, url:string}} link
 * @returns {Promise<object|null>}
 */
async function enrichAnnouncement(link) {
  let html;
  try {
    html = await getText(link.url);
  } catch (err) {
    console.error(`  olesno announce detail fetch failed (${link.url}): ${err.message}`);
    return null;
  }
  const fields = parseAnnouncement(html, link.url);
  if (fields.kind !== 'mieszkalny') {
    console.error(`  olesno announce not a flat (kind=${fields.kind}): ${link.url}`);
    return null;
  }
  if (!fields.address) {
    console.error(`  olesno announce no address: ${link.url}`);
    return null;
  }
  return {
    kind: fields.kind,
    address_raw: fields.address_raw,
    address: fields.address,
    area_m2: fields.area_m2,
    starting_price_pln: fields.starting_price_pln,
    auction_date: fields.auction_date,
    round: fields.round,
    detail_url: link.url,
    published_date: null,
  };
}

/**
 * Crawl active (upcoming, not-yet-decided) flat-sale announcements from the
 * current + previous year sale boards.
 *
 * @returns {Promise<{ listings: Array<object>, wykaz: [], land: [] }>}
 */
export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const boards = SALE_BOARDS.slice(0, ACTIVE_BOARD_COUNT);

  const candidates = [];
  const seen = new Set();
  for (const board of boards) {
    const links = await fetchBoardLinks(board.url);
    let kept = 0;
    for (const link of links) {
      if (!mentionsLokal(link.title)) continue;
      if (!isAnnounceTitle(link.title)) continue;
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      candidates.push(link);
      kept++;
    }
    console.error(`  olesno board ${board.year}: ${kept} announcement candidate(s)`);
  }
  console.error(`  olesno: ${candidates.length} announcement candidate(s) across ${boards.length} board(s)`);

  const listings = [];
  for (const link of candidates) {
    const record = await enrichAnnouncement(link);
    if (!record) continue;
    if (!record.auction_date || record.auction_date < todayIso) {
      console.error(`  olesno announce not upcoming (date=${record.auction_date}): ${link.url}`);
      continue;
    }
    listings.push(record);
  }
  console.error(`  olesno active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------------------
// Result-docs crawl (crawlResultDocs)
// ---------------------------------------------------------------------------

/**
 * Crawl result/protocol notices from the full bounded board window and
 * return refs with pre-fetched text.
 * Contract: returns Array<{url:string, text:string, date:string|null}>.
 * The caller (refresh.js) passes .text directly to parseResultDoc(), which
 * itself filters out non-flat / textless (PDF-only) candidates.
 *
 * @returns {Promise<Array<{url:string, text:string, date:string|null}>>}
 */
export async function crawlResultDocs() {
  const candidates = [];
  const seen = new Set();
  for (const board of SALE_BOARDS) {
    const links = await fetchBoardLinks(board.url);
    let kept = 0;
    for (const link of links) {
      if (!mentionsLokal(link.title)) continue;
      if (!isResultTitle(link.title)) continue;
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      candidates.push(link);
      kept++;
    }
    console.error(`  olesno board ${board.year}: ${kept} result candidate(s)`);
  }
  console.error(`  olesno: ${candidates.length} result candidate(s) across ${SALE_BOARDS.length} board(s)`);

  const refs = [];
  for (const link of candidates) {
    let html;
    try {
      html = await getText(link.url);
    } catch (err) {
      console.error(`  olesno result fetch failed (${link.url}): ${err.message}`);
      continue;
    }
    const text = extractArticleText(html);
    if (!text) {
      console.error(`  olesno result empty body: ${link.url}`);
      continue;
    }
    refs.push({ url: link.url, text, date: null });
  }
  console.error(`  olesno crawlResultDocs: ${refs.length} ref(s) returned`);
  return refs;
}

// ---------------------------------------------------------------------------
// CLI harness (manual testing: node crawl.js [active|results])
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs, null, 2) + '\n');
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
