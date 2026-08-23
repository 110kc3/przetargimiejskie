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
 * Read the price-shaped values from a complete table row. Walbrzych has used
 * several column widths, but its money cells consistently retain the
 * `NN.NNN,00` shape. Reading those tokens is more stable than slicing fixed
 * offsets (which turned 60.000 / 60.600 into the trailing value 600).
 */
function tablePLNs(line) {
  return [...String(line || '').matchAll(/\b\d{1,3}(?:[.\s]\d{3})+,\d{2}\b/g)]
    .map((match) => parsePLN(match[0]))
    .filter((value) => value != null);
}

/**
 * True when the PDF text is a Walbrzych result notice.
 */
export function isResultNotice(text) {
  return /Informacja\s+o\s+wynik(?:u|ach)\s+przetarg/i.test(text || '');
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

const POLISH_MONTHS = new Map([
  ['stycznia', 1], ['lutego', 2], ['marca', 3], ['kwietnia', 4],
  ['maja', 5], ['czerwca', 6], ['lipca', 7], ['sierpnia', 8],
  ['wrzesnia', 9], ['pazdziernika', 10], ['listopada', 11], ['grudnia', 12],
]);

/** Parse a prose date such as "na dzień 12 stycznia 2026 r.". */
function proseAuctionDate(text) {
  const m = /(?:na\s+dzie[nń]|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r?\.?/iu.exec(text || '');
  if (!m) return null;
  const monthName = m[2]
    .toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const month = POLISH_MONTHS.get(monthName);
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function proseRound(text) {
  const m = /\b(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[aą]t\w*|sz[oó]st\w*)\s+przetarg/iu.exec(text || '');
  if (!m) return null;
  const word = m[1].toLocaleLowerCase('pl-PL');
  if (word.startsWith('pierwsz')) return 1;
  if (word.startsWith('drug')) return 2;
  if (word.startsWith('trzeci')) return 3;
  if (word.startsWith('czwart')) return 4;
  if (/^pi[aą]t/u.test(word)) return 5;
  if (/^sz[oó]st/u.test(word)) return 6;
  return null;
}

function priceAfter(text, label) {
  const m = label.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Parse the residential property from the newer prose result notices. */
function parseProseResult(text, fallbackDate, sourceUrl) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const aptM = /lokal\w*\s+mieszkaln\w*(?:\s+nr)?\s+(\d+[A-Za-z]?)/iu.exec(flat);
  // Search forward from the flat phrase. Multi-property notices mention the
  // venue first ("Urząd Miejski przy ulicy Kopernika 2"), which is provenance,
  // not the auctioned property's address.
  let propertyText = aptM ? flat.slice(aptM.index) : '';
  if (aptM) {
    const nextItem = /\s\d+\)\s/.exec(propertyText.slice(aptM[0].length));
    if (nextItem) propertyText = propertyText.slice(0, aptM[0].length + nextItem.index);
  }
  const streetM = /przy\s+ul(?:icy|\.)?\s+([\p{L}.' -]*?\p{L})\s+(\d+[A-Za-z]?)\s*(?:,|\b)/iu.exec(propertyText);
  if (!aptM || !streetM) return [];

  const address_raw = `ul. ${streetM[1].trim()} ${streetM[2]}/${aptM[1]}`;
  const address = parseAddress(address_raw);
  if (!address) return [];

  const starting_price_pln = priceAfter(
    propertyText,
    /Cena\s+wywo[łl]awcza(?:\s+nieruchomo[śs]ci)?\s*[-–—:]\s*(\d[\d\s.,]*)\s*z[łl]/iu,
  );
  const final_price_pln = priceAfter(
    propertyText,
    /(?:Najwy[żz]sza\s+cena(?:\s+osi[aą]gni[eę]ta(?:\s+w\s+przetargu)?)?|Cena\s+osi[aą]gni[eę]ta)\s*[-–—:]\s*(\d[\d\s.,]*)\s*z[łl]/iu,
  );
  const explicitlyUnsold = /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[aą]pi[łl]|nie\s+podj[eę]to\s+licytacji/iu.test(flat);
  const explicitlySold = /wynikiem\s+pozytywnym/iu.test(flat) || final_price_pln != null;
  if (!explicitlyUnsold && !explicitlySold) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date: auctionDateFromTitle(flat) || proseAuctionDate(flat) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw,
    address,
    round: proseRound(flat),
    starting_price_pln,
    final_price_pln: explicitlyUnsold ? null : final_price_pln,
    outcome: explicitlyUnsold ? 'unsold' : 'sold',
    unsold_reason: explicitlyUnsold ? 'no_bidders' : null,
    notes,
  }];
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
  if (/^(?:(?:cz\.\s*)?dz\.?|dzia[łl]k|obr\.|KW\b|SW\d|SW1W)/i.test(s)) return false;
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
    // Result templates alternate between abbreviated and plain patron names.
    // Align the verified variants with the board/full-name result spellings so
    // successive rounds stay on one property history.
    .replace(/^ul\.\s+gen\.\s+(?:W\.\s*)?Andersa\b/i, 'ul. Andersa')
    .replace(/^ul\.\s+P\.\s+Skargi\b/i, 'ul. Piotra Skargi')
    .trim();
  if (/^(?:ul|al|os|pl)\./i.test(s)) return s;
  return `ul. ${s}`;
}

// ---- Column positions (confirmed from live PDF /download/50920) --------------

const COL_RODZAJ  = 33;   // "I przetarg   obr. ..."
const COL_CENA_WY = 113;  // "80.000,00 zl"
const COL_CENA_OS = 130;  // "80.800,00 zl" (or "(bonifikata..." for Rynek)
const COL_NABYWCA = 163;  // buyer name or "nie pojeto licytacji"
const ADDR_WIDTH  = 90;   // relative cap avoids buyer-column bleed

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
  const lines = text.replace(/\r/g, '').replace(/\f/g, '').split('\n');
  const rows = [];

  function addressCandidate(line) {
    const firstNS = /\S/.exec(line);
    if (!firstNS) return null;

    // Templates move the address column and sometimes put the date before it
    // on the same line. Try every explicit street-prefix position, then the
    // first non-space position for prefix-less forms such as "Rynek 13/10".
    const starts = [...line.matchAll(/(?:ul|al|os|pl)\.\s+/gi)].map((match) => match.index);
    starts.push(firstNS.index);
    for (const start of [...new Set(starts)]) {
      // Older tables place the address on the same line as the Lp. marker.
      // This parser's block association is address-before-row; accepting those
      // lines pairs a property with the NEXT lot's prices. Leave that distinct
      // legacy layout unparsed instead of publishing cross-row corruption.
      if (/^\s*\d{1,2}\s+/.test(line.slice(0, start))) continue;
      const possible = line.slice(start, start + ADDR_WIDTH).trim();
      if (isFlatAddressLine(possible)) return possible;
    }
    return null;
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const candidate = addressCandidate(ln);
    if (!candidate) continue;

    // Look ahead for the Lp. row (within 6 lines)
    let lpIdx = -1;
    for (let j = i + 1; j <= i + 6 && j < lines.length; j++) {
      if (/^ {0,5}\d+\s/.test(lines[j])) { lpIdx = j; break; }
    }
    if (lpIdx < 0) continue;

    // In several 2025/2026 templates the Lp. marker and cadastral data occupy
    // one physical line, while the round and price cells wrap onto the next
    // one. Include those continuation lines, stopping before the next address
    // or row marker so prices can never bleed across lots.
    let rowEnd = lpIdx + 1;
    for (let j = lpIdx + 1; j <= lpIdx + 6 && j < lines.length; j++) {
      if (addressCandidate(lines[j])) break;
      if (/^ {0,5}\d+\s/.test(lines[j])) break;
      rowEnd = j + 1;
    }

    const lpLine = lines[lpIdx];
    let   rodzaj  = col(lpLine, COL_RODZAJ, COL_CENA_WY - 16).trim();
    let   cenaWy  = col(lpLine, COL_CENA_WY, COL_CENA_OS).trim();
    let   cenaOs  = col(lpLine, COL_CENA_OS, COL_NABYWCA).trim();
    let   nabywca = col(lpLine, COL_NABYWCA).trim();

    // The 2025-09 onward templates shifted both price columns roughly twenty
    // characters left. Prefer complete-row price tokens whenever present;
    // keep the historical fixed-column reads only as a fallback.
    const rowPrices = lines.slice(lpIdx, rowEnd).flatMap(tablePLNs);
    const preRowPrices = lines.slice(i, lpIdx).flatMap(tablePLNs);
    if (rowPrices.length > 0) {
      cenaWy = String(rowPrices[0]);
      cenaOs = rowPrices.length > 1 ? String(rowPrices[1]) : '';
    } else if (preRowPrices.length > 0) {
      // Some wrapped templates put the price-bearing continuation line just
      // before the later line that carries the Lp. number.
      cenaWy = String(preRowPrices[0]);
      cenaOs = preRowPrices.length > 1 ? String(preRowPrices[1]) : '';
    }
    const rowBlock = lines.slice(i, rowEnd).join(' ');
    const rowRound = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg\b/i.exec(rowBlock);
    if (rowRound) rodzaj = `${rowRound[1]} przetarg`;
    else if (/\brokowania\b/i.test(rowBlock)) rodzaj = 'rokowania';

    // If cenaOs doesn't parse as a price (e.g. "(bonifikata...)"), look in
    // continuation lines between address and Lp. row for a price at col >= COL_CENA_OS.
    if (!parsePLN(cenaOs)) {
      for (let k = i + 1; k < lpIdx; k++) {
        const contPrice = tablePLNs(lines[k])[0] ?? firstPLN(col(lines[k], COL_CENA_OS));
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
    // Fixed-column buyer extraction is intentionally retained for older
    // layouts; the complete bounded row text supplies wrapped unsold wording.
    nabywca = `${nabywca} ${rowBlock}`.trim();

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

  return results.length > 0 ? results : parseProseResult(t, fallbackDate, sourceUrl);
}
