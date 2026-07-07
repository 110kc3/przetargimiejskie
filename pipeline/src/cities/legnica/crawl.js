// Legnica crawler — BIP-E.PL "Przetargi na lokale" board.
//
// SOURCE:
//   Board:   https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale
//   Paginated: ?page=0 (default), ?page=1, …  (10 rows / page, 0-indexed)
//   Detail:  https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale/{ID},{slug}.html
//
// BOARD HTML STRUCTURE (verified 2026-06-27, BIP-E.PL CMS):
//   Each listing row is a bare <ul class=""> with 6 <li>:
//     [0] clipboard link (ignored)
//     [1] ordinal number (ignored)
//     [2] address link  → detail URL + address label
//     [3] "przetarg na" description ("lokal mieszkalny nr 8", etc.)
//     [4] date/time     ("20.07.2026 10:30" or empty for results)
//     [5] status        ("W toku" | "Rozstrzygniety")
//
// RESULT NOTICES:
//   "Wynik przetargu …" entries appear on the SAME board with
//   status "Rozstrzygniety".  The achieved price lives in a .doc attachment
//   (e.g. /download/107/63566/INFORMACJA.doc) fetched per detail page.
//   crawlResultDocs() returns refs for those entries.
//
// ACTIVE LISTINGS:
//   Only rows whose description contains "lokal mieszkalny" or "lokal użytkowy"
//   (or similar classifiable kind) are emitted. Non-flat entries (whole buildings,
//   "rokowania" proceedings, land) are skipped.
//
// DETAIL PAGE:
//   The HTML body has a short prose summary. More reliable fields (area m², round,
//   full address with apt nr) live in the .docx attachment linked as
//   /download/107/{id}/{filename}.docx (or .doc for older ones).
//   parseAnnouncement() in parse.js extracts those from the attachment text.
//
// NOTE: Pagination IDs (?page=N, 0-based) and the board structure were
// confirmed on 2026-06-27 but should be re-verified on first CI run —
// BIP-E.PL occasionally reorganises board IDs.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import { parseAnnouncement, parseResultDoc } from './parse.js';

const ORIGIN = 'https://um.bip.legnica.eu';
const BOARD = `${ORIGIN}/uml/przetargi-na-nieruchomo/przetargi-na-lokale`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_PAGES = 20; // safety cap

// ---- HTML helpers -----------------------------------------------------------

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "30.07.2026 11:00" → "2026-07-30"
function parseDate(s) {
  const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ---- Board page parser ------------------------------------------------------

/**
 * Parse one board page's HTML into raw row objects.
 * Each row: { id, detailUrl, addressLabel, kindLabel, dateRaw, status }
 * @param {string} html
 * @returns {Array<object>}
 */
export function parseBoardPage(html) {
  // Each row: <ul class=""> (bare, no class value)
  // with 6 <li> in sequence: clipboard, ordinal, address-link, kind, date, status
  const rowRe =
    /<ul\s+class="[^"]*">\s*<li>.*?<\/li>\s*<li>\d+<\/li>\s*<li><a\s+href="(\/uml\/przetargi-na-nieruchomo\/przetargi-na-lokale\/(\d+),[^"]+\.html)">([^<]+)<\/a><\/li>\s*<li>([^<]*)<\/li>\s*<li>([^<]*)<\/li>\s*<li>([^<]*)<\/li>/gi;
  const out = [];
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const [, href, id, addressLabel, kindLabel, dateRaw, status] = m;
    out.push({
      id,
      detailUrl: `${ORIGIN}${href}`,
      addressLabel: stripTags(addressLabel),
      kindLabel: stripTags(kindLabel),
      dateRaw: dateRaw.trim(),
      status: status.trim(),
    });
  }
  return out;
}

// ---- Attachment URL extraction from detail page HTML ------------------------

/**
 * Return the first .docx or .doc attachment href from a detail page, resolved
 * to an absolute URL.
 * @param {string} html
 * @returns {string|null}
 */
export function attachmentUrlFromDetail(html) {
  const m = /href="(\/download\/[^"]+\.docx?)"/i.exec(html || '');
  if (!m) return null;
  return `${ORIGIN}${m[1]}`;
}

// ---- Active listing address parsing ----------------------------------------

// "ul. Anielewicza 3 b." + "lokal mieszkalny nr 8" → "Anielewicza 3B/8"
// We synthesise a full address string and let parseAddress handle the key.
function fullAddressRaw(addressLabel, kindLabel) {
  // Extract apt number from kindLabel: "lokal mieszkalny nr 8" → "8"
  const aptM = /\bnr\s+(\d+\s*[a-z]?)/i.exec(kindLabel || '');
  const apt = aptM ? aptM[1].replace(/\s+/, '') : null;

  // Strip trailing punctuation / spaces from the address label
  let addr = addressLabel.replace(/[.\s]+$/, '').trim();

  if (apt) {
    return `${addr}/${apt}`;
  }
  return addr;
}

// ---- Single board page fetch -----------------------------------------------

async function fetchBoardPage(page) {
  const url = page === 0 ? BOARD : `${BOARD}?page=${page}`;
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  legnica board page ${page} fetch failed: ${err.message}`);
    return null;
  }
}

// ---- crawlActive ------------------------------------------------------------

/**
 * Crawl the active board pages, resolve address+kind, return listings.
 * Skips non-residential (buildings, land) and result notices.
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
export async function crawlActive() {
  const listings = [];
  const seenIds = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const html = await fetchBoardPage(page);
    if (!html) break;

    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    let added = 0;
    for (const row of rows) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);

      // Skip result notices ("Wynik przetargu …") — they have no date in the
      // date column and status "Rozstrzygniety"; handled by crawlResultDocs().
      if (/wynik\s+przetargu/i.test(row.addressLabel)) continue;
      if (row.status === 'Rozstrzygniety' && !row.dateRaw) continue;

      // Classify kind from the "przetarg na" column
      const kind = classifyKind(row.kindLabel);
      // Skip land, buildings, unknown, garages on this board — it's flat/commercial
      if (kind === 'grunt') continue;
      if (kind === 'zabudowana') continue;
      if (kind === 'unknown') {
        // The board mixes some "rokowania" and building entries; skip bare-label rows
        if (!/lokal/i.test(row.kindLabel)) continue;
      }

      const addressRaw = fullAddressRaw(row.addressLabel, row.kindLabel);
      const address = parseAddress(addressRaw);
      if (!address) {
        console.error(`  legnica: could not parse address for row #${row.id}: ${addressRaw}`);
        continue;
      }

      listings.push({
        kind,
        address_raw: addressRaw,
        address,
        auction_date: parseDate(row.dateRaw),
        round: null,   // enriched from .docx attachment in enrichActive()
        area_m2: null, // enriched from .docx attachment in enrichActive()
        starting_price_pln: null, // enriched from detail HTML or .docx
        detail_url: row.detailUrl,
        doc_url: null, // resolved lazily in enrichActive()
      });
      added++;
    }
    console.error(`  legnica board page ${page}: ${rows.length} rows, ${added} new listings`);

    // Stop when no "Następny" (next) link found — last page
    if (!/Nast[eę]pny/i.test(html)) break;
  }

  console.error(`  legnica crawlActive: ${listings.length} listings`);
  return { listings, wykaz: [], land: [] };
}

// ---- enrichActive -----------------------------------------------------------

/**
 * For each listing lacking price/area/round: fetch the detail page to get the
 * .docx attachment URL, then parse the attachment for the missing fields.
 * @param {object[]} active  mutated in place
 */
export async function enrichActive(active) {
  let recovered = 0;
  for (const l of active) {
    const hasData =
      l.starting_price_pln != null || l.area_m2 != null || l.round != null;
    if (hasData) continue;

    // Fetch detail page to find the .docx attachment
    let docUrl = l.doc_url;
    if (!docUrl) {
      try {
        const html = await getText(l.detail_url, { userAgent: BROWSER_UA });
        docUrl = attachmentUrlFromDetail(html);
        if (docUrl) l.doc_url = docUrl;
      } catch (err) {
        console.error(`  legnica enrich: detail fetch failed (${l.address_raw}): ${err.message}`);
      }
    }
    if (!docUrl) continue;

    try {
      const text = await docText(docUrl, { userAgent: BROWSER_UA });
      const f = parseAnnouncement(text);
      if (l.area_m2 == null) l.area_m2 = f.area_m2;
      if (l.starting_price_pln == null) l.starting_price_pln = f.starting_price_pln;
      if (l.round == null) l.round = f.round;
      if (l.auction_date == null) l.auction_date = f.auction_date;
      if (f.area_m2 != null || f.starting_price_pln != null || f.round != null) recovered++;
    } catch (err) {
      console.error(`  legnica enrich: .doc parse failed (${l.address_raw}): ${err.message}`);
    }
  }
  console.error(`  legnica enrichActive: recovered ${recovered} from attachments`);
}

// ---- crawlResultDocs --------------------------------------------------------

/**
 * Scan board pages for result notices ("Wynik przetargu …", status
 * "Rozstrzygniety"), fetch each detail page to get the .doc attachment URL.
 * Returns refs with the .doc URL for parseResultDoc() in parse.js.
 *
 * NOTE (validate on first CI run): the .doc attachment for Nowy Świat 2 (2026-03-24)
 * was successfully extracted in the spike (INFORMACJA.doc, OLE format). The
 * achieved price (151 500 zł) and buyer name were confirmed from that .doc.
 * The parse logic in parseResultDoc() is groundtruthed on that fixture.
 * @returns {Promise<Array<{doc_url:string, auction_date:string|null, detail_url:string}>>}
 */
export async function crawlResultDocs() {
  const refs = [];
  const seenIds = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const html = await fetchBoardPage(page);
    if (!html) break;

    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    for (const row of rows) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);

      // Result notices: status "Rozstrzygniety" AND title contains "Wynik przetargu"
      if (row.status !== 'Rozstrzygniety') continue;
      if (!/wynik\s+przetargu/i.test(row.addressLabel)) continue;

      // Fetch the detail page to find the .doc attachment
      let docUrl = null;
      try {
        const detailHtml = await getText(row.detailUrl, { userAgent: BROWSER_UA });
        docUrl = attachmentUrlFromDetail(detailHtml);
      } catch (err) {
        console.error(`  legnica result detail fetch failed ${row.detailUrl}: ${err.message}`);
        continue;
      }
      if (!docUrl) {
        console.error(`  legnica: no .doc attachment on result notice ${row.detailUrl}`);
        continue;
      }

      refs.push({
        doc_url: docUrl,
        auction_date: parseDate(row.dateRaw) || null,
        detail_url: row.detailUrl,
      });
    }

    if (!/Nast[eę]pny/i.test(html)) break;
  }

  console.error(`  legnica crawlResultDocs: ${refs.length} result notice(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
