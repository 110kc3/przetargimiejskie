// Walbrzych result-notice parser.
//
// Result notices ("Informacja o wynikach przetargow ...") are born-digital PDFs
// (~115-120 KB, 1 page, PDF 1.6). pdftotext -layout produces a fixed-width
// multi-column table with one row block per auctioned lot (all property types
// for one auction day mixed together).
//
// KEY LAYOUT INSIGHT (groundtruthed from real PDFs /download/50920, /50807):
//
//   Each lot block spans several lines. The FIRST line in the block at col >= 48
//   carries the STREET ADDRESS (e.g. "ul. Mickiewicza 6/9 dz."). Several
//   continuation lines follow (date, parcel, "Urzad Miejski" etc.), then the
//   Lp.-numbered row.
//
//   Lp. row (col positions confirmed from live PDFs, 2026-06-27):
//     Lp.             col  1-4
//     Rodzaj          col 33-97    "I przetarg   obr. ..."
//     Cena wywalawcza col 113-130
//     Najwyzsza cena  col 130-163
//     Nabywca         col 163+
//
//   SPECIAL CASE (Rynek 13/10, lp.3): the achieved price of 113 000 zl appears
//   on a CONTINUATION line (dz. 529/1 line) at col 130, because the Lp. row's
//   col-130 slot is occupied by "(bonifikata zabytkowa 50%)". We check
//   continuation lines for a price at col >= 130 when the Lp. row yields none.
//
//   ADDRESS BLEED: for Slowicza 19/3 (last lot) the buyer name "Tomasz" bleeds
//   onto the address line at col ~169. We cap address extraction at col 90.
//
// isFlatAddressLine guard: "dz. 37/13" has "dz." as prefix -> reject.
// The fix for \b after ".": just remove \b (the "." itself is the delimiter).

import { parseAddress } from '../../core/normalize.js';

// ---- Helpers ----------------------------------------------------------------

/** Parse "80.000,00 zl" / "80 000,00 zl" / "113.000,00 zl" -> integer PLN or null. */
function parsePLN(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t || t === '-') return null;
  const cleaned = t
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,\d{2}/, '')
    .replace(/[^0-9]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extract first PLN value from a string segment. */
function firstPLN(seg) {
  const m = /(\d[\d.,]+)\s*z[lł]/i.exec(seg || '');
  return m ? parsePLN(m[1]) : null;
}

/**
 * True when the PDF text is a Walbrzych result notice.
 */
export function isResultNotice(text) {
  return /Informacja\s+o\s+wynikach\s+przetarg/i.test(text || '');
}

/**
 * Auction date from PDF title line.
 * "Informacja o wynikach przetargow ... w dniu 22.01.2025 r."
 * @returns {string|null} ISO date YYYY-MM-DD
 */
export function auctionDateFromTitle(text) {
  const m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Round (I/II/III...) from the Rodzaj cell text.
 * "I przetarg" -> 1, "II przetarg" -> 2.
 * @returns {number|null}
 */
export function roundFromCell(cell) {
  const s = (cell || '').trim();
  const rm = /^(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg/i.exec(s);
  if (rm) {
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return roman[rm[1].toUpperCase()] ?? null;
  }
  return null;
}

// ---- Address helpers ---------------------------------------------------------

/**
 * True when a line (already trimmed, at-col content) is a FLAT address.
 *
 * Accepted (groundtruthed from real PDF /download/50920):
 *   "ul. Mickiewicza 6/9 dz."  -> true  (trailing "dz." is stripped later)
 *   "ul. Proletariacka 17/7"   -> true
 *   "Rynek 13/10"              -> true  (no ul. prefix)
 *   "ul. Daszynskiego 27/4"    -> true
 *   "ul. Brzechwy 11/9A dz."   -> true
 *   "ul. Slowicza 19/3"        -> true
 *
 * Rejected:
 *   "dz. 37/13"                -> false (parcel notation)
 *   "obr. Piaskowa Gora nr"    -> false
 *   "ul. Andersa 121A"         -> false (no apt, only building number)
 *   "ul. Madalinskiego"        -> false (no number)
 *   "KW nr SW1W/..."           -> false
 *   "575/1"                    -> false (bare parcel number)
 */
export function isFlatAddressLine(line) {
  const s = (line || '').trim();
  if (!s) return false;
  // Reject known non-address prefixes (NOTE: no \b after "." -- "." is non-word)
  if (/^(?:dz\.|obr\.|KW\s+nr|SW\d|SW1W)/i.test(s)) return false;
  if (/^(?:Informacja|Oznaczenie|Rodzaj|Liczba|Cena|Najwy|Data\s+i|Urz)/i.test(s)) return false;
  // Reject bare numbers / fractions (parcel IDs like "575/1", "222/2")
  if (/^\d+(?:\/\d+)?$/.test(s)) return false;
  // Must have: (optional street-type prefix) word(s) <bldg>[A-Za-z]? / <apt>[A-Za-z]?
  return /^(?:(?:ul|al|os|pl)\.\s+)?[A-Za-z][A-Za-zÀ-ɏ.\- ]*\s+\d+[A-Za-z]?\/\d+[A-Za-z]?(?:\s|$)/i.test(s);
}

/**
 * Normalise a raw address first-line for parseAddress().
 * Strips trailing "dz." parcel notation and nabywca bleed beyond col 90.
 * "Rynek 13/10"        -> "ul. Rynek 13/10"
 * "ul. Slowicza 19/3 ... Tomasz" -> "ul. Slowicza 19/3"
 */
export function normaliseAddressLine(raw) {
  // Truncate at first whitespace-heavy gap (5+ spaces) after the apt number
  // to strip trailing columns that bled in (e.g. "Tomasz" for Slowicza)
  let s = (raw || '').trim()
    .replace(/\s{5,}.*$/, '')   // drop anything after 5+ consecutive spaces
    .replace(/\s+dz\..*$/i, '') // drop trailing "dz." parcel notation
    .trim();
  if (/^(?:ul|al|os|pl)\./i.test(s)) return s;
  return `ul. ${s}`;
}

// ---- Column positions (confirmed from live PDF /download/50920) --------------

const ADDRESS_COL = 48;   // first non-space of the address line
const COL_RODZAJ  = 33;   // "I przetarg   obr. ..."
const COL_CENA_WY = 113;  // "80.000,00 zl"
const COL_CENA_OS = 130;  // "80.800,00 zl" (or "(bonifikata..." for Rynek)
const COL_NABYWCA = 163;  // buyer name or "nie pojeto licytacji"
const ADDR_CAP    = 90;   // cap address extraction to avoid nabywca bleed

/** Extract text from line at [startX, endX). */
function col(line, startX, endX) {
  if (!line || startX >= line.length) return '';
  return line.slice(startX, endX ?? line.length).trim();
}

// ---- Block-based table parser -----------------------------------------------
//
// Scan for address-candidate lines at col >= ADDRESS_COL, then look ahead for
// the Lp. row within a small window. Collect (address, lp-row) pairs.
//
// Special: for the Rynek/bonifikata case, the achieved price may appear on a
// continuation line (between address and Lp. row) at col >= COL_CENA_OS.
// We scan those lines too.

/**
 * Parse the multi-column table.
 * Exported for unit testing.
 * @param {string} text pdftotext -layout output
 * @returns {Array<{address1stLine, rodzaj, cenaWy, cenaOs, nabywca}>}
 */
export function parseTableRows(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const firstNS = /\S/.exec(ln);
    if (!firstNS || firstNS.index < ADDRESS_COL) continue;

    // Candidate: text starting at col >= ADDRESS_COL, capped at ADDR_CAP
    const candidate = ln.slice(firstNS.index, ADDR_CAP).trim();
    if (!candidate) continue;

    // Skip non-address tokens
    if (/^(?:\d{2}\.\d{2}\.\d{4}|dz\.\s*\d|obr\.|KW(?:\s*nr|$)|SW\d|\/\d|\d+\/\d+$|\d+$)/i.test(candidate)) continue;
    if (/Oznaczenie|nieruchomo|Liczba\s+os|przetargow\s+wg|katastru|Informacja|Data\s+i|Rodzaj\s+przepr|Cena\s+wywo|Najwy|Imie\s+i|nabywca\s+nieruchomo|siedzibie\s+Urz|rokowaniach/i.test(candidate)) continue;

    // Look ahead for the Lp. row (within 6 lines)
    let lpIdx = -1;
    for (let j = i + 1; j <= i + 6 && j < lines.length; j++) {
      if (/^ {0,5}\d+\s/.test(lines[j])) { lpIdx = j; break; }
    }
    if (lpIdx < 0) continue;

    const lpLine = lines[lpIdx];
    const rodzaj  = col(lpLine, COL_RODZAJ, COL_CENA_WY - 16).trim();
    const cenaWy  = col(lpLine, COL_CENA_WY, COL_CENA_OS).trim();
    let   cenaOs  = col(lpLine, COL_CENA_OS, COL_NABYWCA).trim();
    let   nabywca = col(lpLine, COL_NABYWCA).trim();

    // If cenaOs doesn't parse as a price (e.g. "(bonifikata...)"), look in
    // continuation lines between address and Lp. row for a price at col >= COL_CENA_OS.
    if (!parsePLN(cenaOs)) {
      for (let k = i + 1; k < lpIdx; k++) {
        const contPrice = firstPLN(col(lines[k], COL_CENA_OS));
        if (contPrice != null) { cenaOs = String(contPrice); break; }
      }
    }

    // Accumulate continuation lines for nabywca (buyer name may wrap)
    for (let j = lpIdx + 1; j < lines.length && j < lpIdx + 8; j++) {
      const lnj = lines[j];
      if (!lnj.trim()) break;
      if (/^ {0,5}\d+\s/.test(lnj)) break; // next Lp. row
      const cont = col(lnj, COL_NABYWCA);
      if (cont) nabywca = nabywca ? nabywca + ' ' + cont : cont;
    }

    rows.push({ address1stLine: candidate, rodzaj, cenaWy, cenaOs: cenaOs.trim(), nabywca: nabywca.trim() });
    i = lpIdx + 1;
  }

  return rows;
}

// ---- Public API -------------------------------------------------------------

/**
 * Parse a Walbrzych result-notice PDF text (pdftotext -layout output).
 * Returns one record per residential flat found in the multi-column table.
 *
 * @param {string}      text         pdftotext -layout output
 * @param {string|null} fallbackDate ISO date from crawl ref
 * @param {string}      sourceUrl    attachment download URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text || '')) return [];

  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromTitle(t) || fallbackDate || null;
  const tableRows = parseTableRows(t);
  const results = [];

  for (const row of tableRows) {
    const { address1stLine, rodzaj, cenaWy, cenaOs, nabywca } = row;

    if (!isFlatAddressLine(address1stLine)) continue;

    const address_raw = normaliseAddressLine(address1stLine);
    const address = parseAddress(address_raw);
    if (!address) continue;

    const notes = [];
    if (address.warning) notes.push(address.warning);

    const round = roundFromCell(rodzaj);
    const starting_price_pln = parsePLN(cenaWy);
    const achieved = parsePLN(cenaOs);
    const sold = achieved != null;
    const unsoldText = /nie\s+podj[e]to\s+licytacji|brak\s+zainteresowanych/i.test(
      nabywca + ' ' + cenaOs,
    );

    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !unsoldText && cenaOs !== '-' && cenaOs !== '') {
      notes.push('parse: no achieved price and no explicit unsold text');
    }

    results.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    });
  }

  return results;
}
