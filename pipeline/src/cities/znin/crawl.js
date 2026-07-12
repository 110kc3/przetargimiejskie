// Żnin crawler — `bip.gminaznin.pl` ("System Rada"/eSesja BIP, browser-UA gated).
//
// DISCOVERY. GET the dedicated board `/nieruchomosci` (with a browser UA — the
// bot UA 403s) and harvest its REAL server-rendered `<a href="/nieruchomosc/
// <slug>">` rows (34 live; no JS/DataTables pagination crawl needed — every row
// is in the server HTML). Fetch each notice, parse the inline LABELLED field
// block (parse.js parseNotice), and — best-effort — read the auction date out of
// the SCANNED ogłoszenie PDF (pdfText first; its "\f" tiny-junk empty output ⇒
// ocrPdf). Any PDF failure (older attachment ids 403; occasional broken file)
// leaves auction_date null and the inline-HTML listing still ships.
//
// EMITTABLE RECORDS. A record is kept only if it can be KEYED downstream: land
// (kind 'grunt') needs a parcel number; every other kind needs a parsed street
// address. The board's land + the one flat + the ul.-Gnieźnieńska commercial unit
// key cleanly; the Kościuszki units and the Kl. Janickiego / pl. Działowy built
// properties state a street/parcel but NO building number, so they carry no
// address and are dropped (build-properties tolerates an occasional unkeyable
// row; parcel-less commercial can't live in land.json either).
//
// ACHIEVED-PRICE STREAM — UNSOLD-ONLY (see parse.js header). No result document
// is published; crawlResultDocs() groups the crawled notices by subject (address
// key for units, parcel+obręb for land) and forwards every round that a LATER
// round supersedes — round K's own HTML — so parseResultDoc emits round K's real
// price/subject as outcome:'unsold' (no hammer price exists here).
//
// discoverAll() is memoized so crawlActive() and crawlResultDocs() (each called
// once per refresh.js run) share one fetch+OCR pass. One request/second (enforced
// by core/fetch.js). NEVER modifies core/.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseNotice, parseResultDoc, extractAuctionDate, isRental, toAscii } from './parse.js';

const HOST = 'https://bip.gminaznin.pl';
const BOARD_URL = `${HOST}/nieruchomosci`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Board is ~34 rows; a generous cap bounds the crawl for the CI wall-clock budget
// even if the gmina grows the board.
const MAX_NOTICES = 90;

// ---------------------------------------------------------------------------
// Board → notice URLs
// ---------------------------------------------------------------------------

/** Harvest distinct `/nieruchomosc/<slug>` links (real server anchors) from the
 *  board HTML, in document order. @param {string} html @returns {string[]} */
export function parseBoard(html) {
  const seen = new Set();
  const out = [];
  for (const m of (html || '').matchAll(/href="(\/nieruchomosc\/[a-z0-9][a-z0-9-]*)"/gi)) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(HOST + path);
  }
  return out;
}

// A pdfText result is "real" only if it has meaningful content — the scanned
// Żnin PDFs return a lone form-feed ("\f\n"), the "tiny \f junk" that means OCR.
function hasRealText(t) {
  return Boolean(t) && t.replace(/[\s\f]+/g, '').length >= 20;
}

/** Best-effort auction date from the ogłoszenie PDF. Born-digital → pdfText;
 *  scanned (the Żnin case) → ocrPdf. Every failure path returns null. */
async function auctionDateFromPdf(pdfUrl) {
  if (!pdfUrl) return null;
  let text = '';
  try {
    text = await pdfText(pdfUrl, FETCH_OPTS);
  } catch (err) {
    console.error(`  znin: pdfText failed (${pdfUrl}): ${err.message}`);
  }
  if (!hasRealText(text)) {
    try {
      text = await ocrPdf(pdfUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  znin: OCR failed (${pdfUrl}): ${err.message}`);
      return null;
    }
  }
  return extractAuctionDate(text);
}

// ---------------------------------------------------------------------------
// Shared fetch-and-parse pass (memoized per process run)
// ---------------------------------------------------------------------------

let _cache = null;

/** @returns {Promise<Array<object>>} emittable notice records (with `.html`). */
async function discoverAll() {
  if (_cache) return _cache;

  let boardHtml;
  try {
    boardHtml = await getText(BOARD_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  znin: board fetch failed (${BOARD_URL}): ${err.message}`);
    _cache = [];
    return _cache;
  }

  const urls = parseBoard(boardHtml).slice(0, MAX_NOTICES);
  console.error(`  znin: ${urls.length} notice link(s) on the board`);

  const records = [];
  for (const url of urls) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  znin: notice fetch failed (${url}): ${err.message}`);
      continue;
    }
    const n = parseNotice(html, url);
    if (n.cancelled) { console.error(`  znin: cancelled, skip: ${url}`); continue; }
    if (isRental(n.title)) { console.error(`  znin: rental, skip: ${url}`); continue; }

    // Keep only records that can be keyed downstream (see file header).
    const emittable = n.kind === 'grunt' ? Boolean(n.dzialka_nr) : Boolean(n.address);
    if (!emittable) { console.error(`  znin: unkeyable (kind=${n.kind}), skip: ${url}`); continue; }

    const auction_date = await auctionDateFromPdf(n.pdf_url);
    records.push({ ...n, html, auction_date });
  }

  console.error(`  znin: ${records.length} emittable record(s) parsed from ${urls.length} notice(s)`);
  _cache = records;
  return records;
}

/** Per-run grouping key: address for address-kinds, parcel(+obręb) for land. */
function subjectKey(r) {
  if (r.kind === 'grunt') {
    return r.dzialka_nr ? `dz|${toAscii(r.obreb || '')}|${r.dzialka_nr}` : null;
  }
  return r.address ? r.address.key : null;
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

/** @returns {Promise<{ listings: Array<object>, wykaz: Array, land: Array }>} */
export async function crawlActive() {
  const records = await discoverAll();
  const listings = records.map((r) => ({
    kind: r.kind,
    address: r.address,
    address_raw: r.address_raw,
    dzialka_nr: r.dzialka_nr,   // refresh.js partitions kind 'grunt' → land.json
    obreb: r.obreb,
    area_m2: r.area_m2,
    starting_price_pln: r.starting_price_pln,
    auction_date: r.auction_date,   // best-effort (OCR); null is fine (kept active)
    round: r.round,
    detail_url: r.detail_url,
    published_date: r.published_date,
  }));
  console.error(`  znin active: ${listings.length} listing(s)`);
  // No wykaz board in scope, and land rides `listings` (refresh partitions it).
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

/**
 * Confirmed-superseded rounds only: round K's own html, forwarded because a round
 * K+1 for the SAME subject also exists. Contract mirrors the wolow analog —
 * {text, pdf_url, auction_date}: source:'html' ⇒ refresh.js hands `text` to
 * parseResultDoc, with `pdf_url` as sourceUrl and `auction_date` as fallbackDate.
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const records = await discoverAll();

  const groups = new Map();
  for (const r of records) {
    if (r.round == null) continue;
    const key = subjectKey(r);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const refs = [];
  for (const group of groups.values()) {
    // Collapse same-round republishes before the round-order arithmetic.
    const byRound = new Map();
    for (const r of group) if (!byRound.has(r.round)) byRound.set(r.round, r);
    const rounds = [...byRound.keys()].sort((a, b) => a - b);
    for (let i = 0; i < rounds.length - 1; i++) {
      const r = byRound.get(rounds[i]);
      refs.push({ text: r.html, pdf_url: r.detail_url, auction_date: r.auction_date });
    }
  }
  console.error(`  znin crawlResultDocs: ${refs.length} superseded round(s) across ${groups.size} subject(s)`);
  return refs;
}

// Re-exported so index.js can wire the registry contract from one module.
export { parseResultDoc };

// ---------------------------------------------------------------------------
// CLI harness (manual: node crawl.js [active|results|board])
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'board') {
    const html = await getText(BOARD_URL, FETCH_OPTS);
    const urls = parseBoard(html);
    process.stdout.write(urls.join('\n') + `\n(${urls.length} notice links)\n`);
  } else if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(
      JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n',
    );
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total active: ${listings.length}`);
  }
}
