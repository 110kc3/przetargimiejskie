// Bydgoszcz parsers — groundtruthed against live attachments fetched 2026-06-27.
//
// ANNOUNCEMENT DOC (download/32143, catdoc text, Sienkiewicza 37 lokal nr 2, VII przetarg):
//   "PREZYDENT MIASTA BYDGOSZCZY"
//   "ogłasza VII przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego …"
//   "lokal mieszkalny nr 2 … ul. Henryka Sienkiewicza 37 …"
//   "94,29 m2"
//   "299 000,-" (price has ",-" suffix, not "zł" in the table cell)
//   "Przetarg odbędzie się … w dniu 09 lipca 2026 r."
//
// RESULT DOCX (download/32448, unzip word/document.xml, Wyszogrodzka land, unsold):
//   "PREZYDENT MIASTA BYDGOSZCZY"
//   "informację o wynikach przeprowadzonych w dniu 18.06.2026 r."
//   "II przetargach ustnych nieograniczonych na sprzedaż nieruchomości gruntowych"
//   "Cena wywoławcza nieruchomości: dz. nr 156/3 o pow.0,1025 ha - 450 000,00 zł"
//   "Najwyższa cena osiągnięta w przetargach – brak"
//   "ww. przetargi zakończyły się wynikiem negatywnym."
//
// Flat SOLD result pattern (inferred from standard WMG practice + similar Logonet cities):
//   "Najwyższa cena osiągnięta w przetargu – NNN NNN,00 zł"
//   "Nabywca nieruchomości – <name>"
//
// Key Bydgoszcz-specific notes:
//   * Round: Roman numeral before "przetarg ustny" ("VII przetarg", "II przetarg")
//   * Prices: space-thousands "299 000,-" OR "450 000,00 zł" — both formats seen
//   * Announcement DOC lists area in table: "94,29 m2" (comma decimal)
//   * Date in announcement: "w dniu 09 lipca 2026 r." (spelled month, genitive)
//   * Date in result DOCX: "w dniu 18.06.2026 r." (numeric DD.MM.YYYY)
//   * Unsold signals: "wynikiem negatywnym" OR "Najwyższa cena ... – brak"
//   * Nabywca: "Nabywca nieruchomości –" (result DOCX)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------- PL months

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// ---------------------------------------------------------------- helpers

/** "299 000,-" / "450 000,00 zł" / "299000" → integer PLN or null. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  // Strip thousands separators (space or non-breaking space), grosze tail
  const s = String(numStr)
    .replace(/ /g, ' ')
    .replace(/\s/g, '')
    .replace(/,-$/, '')          // "299000,-" suffix
    .replace(/,\d{2}$/, '');    // "450000,00" grosze tail
  const n = Number(s.replace(/\./g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "94,29" / "94.29" → float or null. */
function parseNum(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------- round (Roman)

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** "VII" → 7, "II" → 2. Returns null on unknown token. */
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const nxt = ROMAN[s[i + 1]];
    total += nxt && cur < nxt ? -cur : cur;
  }
  return total > 0 ? total : null;
}

/**
 * Round from "VII przetarg ustny nieograniczony" pattern. Roman numerals only
 * (case-sensitive so conjunction "i" and ordinals "in" are never mis-matched).
 * The first occurrence wins (the stated round, before any history recaps).
 */
export function roundFromText(text) {
  const m = /\b([IVXLCDM]{1,6})\s+przetarg\w*/i.exec(text || '');
  if (!m) return null;
  // Reject if the matched token is all-lower (not a real Roman numeral heading)
  if (m[1] !== m[1].toUpperCase()) return null;
  return romanToInt(m[1]);
}

// ---------------------------------------------------------------- doc-type gate

/**
 * Result notice gate. Bydgoszcz result DOCXes open with:
 * "podaje do publicznej wiadomości informację o wynikach przeprowadzonych przetargów"
 * or the shorter inline variant:
 * "informację o wyniku … przetargu"
 */
export function isResultNotice(text) {
  return /informacj[ęą]?\s+o\s+wynik(?:u|ach)/i.test(text || '');
}

// ---------------------------------------------------------------- dates

/**
 * Announcement auction date: "Przetarg odbędzie się … w dniu 09 lipca 2026 r."
 * Anchored on future-tense "odbędzie się" so prior-round recap dates are skipped.
 */
export function auctionDateFromAnn(text) {
  const t = text || '';
  // Future-tense anchor
  let m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,60}?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  // Fallback: numeric date in future-tense context
  m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,60}?(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}`;
  return null;
}

/**
 * Result notice date: "przeprowadzonych w dniu 18.06.2026 r." (numeric)
 * or rarely spelled-out "przeprowadzonego w dniu 18 czerwca 2026 r."
 */
export function resultDateFromText(text) {
  const t = text || '';
  // Numeric: DD.MM.YYYY
  let m = /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}`;
  // Spelled-out month
  m = /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return null;
}

// ---------------------------------------------------------------- prices

/**
 * Starting price from announcement DOC table or result DOCX body.
 * Patterns seen:
 *   "Cena wywoławcza w zł … 299 000,-"  (table, after header)
 *   "Cena wywoławcza nieruchomości: … 450 000,00 zł"
 *   "cena wywoławcza … wynosiła NNN zł"
 * Scans a generous window after the "cena wywoławcza" label.
 */
export function startingPriceFromText(text) {
  const t = text || '';
  // Try label + amount in bounded window (300 chars covers multi-line table)
  const m = /cena\s+wywo[łl]awcza[\s\S]{0,300}?(\d[\d  .]*(?:,\d{2})?)\s*(?:zł|,-)/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Achieved price from result DOCX:
 *   "Najwyższa cena osiągnięta w przetargu – NNN NNN,00 zł"
 *   "Najwyższa cena osiągnięta w przetargach – NNN NNN,00 zł"
 * Returns null when "– brak" (unsold).
 */
export function achievedPriceFromText(text) {
  const t = text || '';
  const m = /[Nn]ajwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetarg\w*\s*[–—-]\s*(\d[\d  .]*(?:,\d{2})?)\s*zł/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** True when the DOCX explicitly says the auction produced no buyer. */
function isUnsold(text) {
  const t = text || '';
  return /wynikiem\s+negatywnym/i.test(t) ||
    /[Nn]ajwy[żz]sza\s+cena[\s\S]{0,40}–\s*brak/i.test(t) ||
    /[Nn]abywc\w+[\s\S]{0,20}–\s*brak/i.test(t) ||
    /brak\s+(?:wp[łl]aconych\s+)?wadi[óo]w/i.test(t);
}

// ---------------------------------------------------------------- area

/**
 * Usable floor area of a flat from the announcement DOC table cell.
 * Bydgoszcz uses comma-decimal: "94,29 m2" or "94,29 m²".
 * Anchored on "powierzchni użytkow" to skip the piwnica/plot area.
 */
export function unitAreaFromText(text) {
  const t = text || '';
  // Labelled "powierzchni użytkowej/użytkowa … N m2"
  let m = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?(\d+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(t);
  if (m) return parseNum(m[1]);
  // Standalone "94,29 m2" in the table — pick the FIRST occurrence that isn't
  // a plot area (plot has "ha" before or "działka" context)
  const re = /(\d{1,3}[.,]\d{1,2})\s*m\s*2(?!\d)/g;
  let best = null;
  let n;
  while ((n = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, n.index - 50), n.index);
    if (/ha\b|dzia[łl]k|grunt|przynale[żz]/i.test(before)) continue;
    const v = parseNum(n[1]);
    if (v && v > 0) { best = v; break; }
  }
  return best;
}

// ---------------------------------------------------------------- address

/**
 * Property address from the announcement DOC.
 * Bydgoszcz uses two patterns:
 *   "lokal mieszkalny nr 2 … przy ul. Henryka Sienkiewicza 37"
 *   "ul. <street> <num>" (header line in the table)
 *
 * Strategy: look for "przy ul." first (most reliable for flat announcements),
 * then fall back to the opening "ul." line. The table header "lokal … nr N"
 * gives the apartment number.
 */
export function addressRawFromText(text) {
  const t = (text || '').replace(/\r/g, '');

  // Unit number: "lokal mieszkalny nr N" / "nr N" standalone in table context
  const unitM = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkalnw+)?\s*nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const unit = unitM ? unitM[1] : null;

  // 1) "przy ul. <street> <num>" pattern (announcement body)
  const byulRe = /przy\s+ul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.''\- ]+?)\s+(\d+[A-Za-z]?)\b/;
  const bm = byulRe.exec(t);
  if (bm) {
    const street = bm[1].replace(/\s+/g, ' ').trim();
    const bldg = bm[2];
    return unit ? `ul. ${street} ${bldg}/${unit}` : `ul. ${street} ${bldg}`;
  }

  // 2) Opening "ul. <street> <num>" line (announcement heading / table row)
  const ulRe = /\bul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.''\- ]+?)\s+(\d+[A-Za-z]?)\b/;
  const um = ulRe.exec(t);
  if (um) {
    const street = um[1].replace(/\s+/g, ' ').trim();
    const bldg = um[2];
    return unit ? `ul. ${street} ${bldg}/${unit}` : `ul. ${street} ${bldg}`;
  }

  return null;
}

/** Kind from a bounded slice of the announcement text. */
function kindFromText(text) {
  return classifyKind((text || '').slice(0, 1200));
}

// ---------------------------------------------------------------- announcement parse

/**
 * Parse one announcement DOC (converted by doc-text.js catdoc/unzip branch).
 * Single flat/land per DOC. Returns a record or null.
 * @param {string} text  catdoc or OOXML-unzip extracted text
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const round = roundFromText(t);
  const auction_date = auctionDateFromAnn(t);
  const starting_price_pln = startingPriceFromText(t);

  if (kind === 'grunt') {
    // Land / nieruchomość gruntowa — address keyed differently; return minimal record
    return { kind: 'grunt', starting_price_pln, auction_date, round };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}

// ---------------------------------------------------------------- result parse

/**
 * Parse one result DOCX body (extracted by doc-text.js unzip branch).
 * The achieved price and outcome live in the DOCX (NOT in the HTML body).
 * Single property per DOCX (one flat or land parcel-set).
 * @param {string} text  OOXML-extracted text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl  DOCX download URL
 * @returns {Array<object>}  0 or 1 record
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isUnsold(t);

  const kind = kindFromText(t);

  // Land result: no address key, skip for property stream
  // (land results are logged but don't produce address-keyed records)
  if (kind === 'grunt') {
    if (starting_price_pln == null) notes.push('parse: missing starting price (grunt)');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    // Land results are out-of-scope for the flat-auction stream; return []
    // so refresh.js does not add them to properties.json. They are still
    // crawled (crawlResultDocs includes them) — a future land.json stream
    // can be wired up. For now: log and skip.
    return [];
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) {
    notes.push('parse: could not extract address from result DOCX');
    return [];
  }
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(t),
    notes,
  }];
}
