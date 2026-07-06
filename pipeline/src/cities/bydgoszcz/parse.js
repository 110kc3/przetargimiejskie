// Bydgoszcz parsers — groundtruthed against LIVE attachments fetched 2026-07-06:
//
// ANNOUNCEMENT DOC (attachments/download/32143, catdoc, ul. Henryka Sienkiewicza 37
// lokal nr 2, VII przetarg 09.07.2026):
//   "ogłasza VII przetarg ustny nieograniczony na sprzedaż lokalu\nmieszkalnego …"
//   "lokal mieszkalny nr 2 … budynku położonym\nprzy\n\nul. Henryka Sienkiewicza 37 w Bydgoszczy"
//   plot: "pow.778 m 2" (INTEGER, with a space inside "m 2") · flat: "94,29 m2"
//   piwnica: "P.12- piwnica:  6,27m2"
//   price cell: "299\n000,-" — catdoc WRAPS the amount across a line break!
//   wadium cell follows: "30 000,-"
//   "Przetarg odbędzie się w Urzędzie Miasta Bydgoszczy przy ul.\nJezuickiej 2
//    w Sali Łochowskiego (parter) w dniu 09 lipca 2026 r." — ~84 chars between
//   "odbędzie się" and "w dniu" (the VENUE ul. Jezuickiej 2 sits in between).
//
// ANNOUNCEMENT DOC (attachments/download/32401, ul. Grunwaldzkiej 90 lokal nr 3,
// I przetarg 31.07.2026): "38,04m2" (no space before m2), "250 000,-", genitive
// street kept as-is per normalize.js policy.
//
// RESULT DOCX (attachments/download/32667, ul. Chodkiewicza 2 lokal nr 1, VI
// przetarg 26.06.2026, unsold):
//   "informację o wyniku przeprowadzonego w dniu 26.06.2026r. w siedzibie Urzędu
//    Miasta Bydgoszczy przy ul. Jezuickiej 2 …"   ← venue address FIRST (trap)
//   "VI przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 1,
//    … położonego w Bydgoszczy przy ul. Chodkiewicza 2, o pow. 53,27m2 …"
//   "Cena wywoławcza nieruchomości: 135.000,- zł"   ← DOT thousands + ",-"
//   "Najwyższa cena osiągnięta w przetargu – brak"
//   "Nabywca nieruchomości – VI przetarg zakończył się wynikiem negatywnym"
//
// RESULT DOCX (attachments/download/32640, land, ul. ks. Augusta Szamarzewskiego
// dz. 9/6, trzeci przetarg 25.06.2026): "przeprowadzonego w dniu  25 czerwca
// 2026 r." (SPELLED month, doubled spaces), "Cena wywoławcza nieruchomości:
// 340.000,- zł netto*" — kind grunt → parseResultDoc returns [].
//
// Key Bydgoszcz-specific rules:
//   * Address must be anchored on "położon…" — the venue "przy ul. Jezuickiej 2"
//     and the office "ul. Grudziądzka 9-15" appear in EVERY document and must
//     never be taken as the property street.
//   * Prices: "299\n000,-" (space/newline thousands + ",-") and "135.000,- zł"
//     (dot thousands) both occur; grosze form "450 000,00 zł" seen on land.
//   * Announcement table: the "Cena wywoławcza w zł" header is ~1.5 kB away from
//     its value cell, so the announcement price is the FIRST ",-"-suffixed
//     amount in the document (price column precedes the wadium column).
//   * Round: Roman numeral before "przetarg…" ("VII przetarg", "VI przetargu").
//     Case-sensitive so "i przetarg" (conjunction) never matches. Land results
//     sometimes spell it out ("trzecim przetargu") — round null is acceptable.
//   * Unsold signals: "wynikiem negatywnym", "Najwyższa cena … – brak",
//     "brak wpłaconego wadium".

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------- PL months

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// ---------------------------------------------------------------- helpers

/**
 * "299\n000" / "135.000" / "450 000,00" / "299 000,-" → integer PLN or null.
 * Handles space/NBSP/newline thousands (catdoc wraps table cells), dot
 * thousands, a ",-" suffix, and a ",NN" grosze tail.
 */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr)
    .replace(/[\s ]/g, '')  // space/NBSP/newline thousands
    .replace(/,-$/, '')          // "299000,-" suffix
    .replace(/,\d{2}$/, '')      // "450000,00" grosze tail
    .replace(/\./g, '');         // "135.000" dot thousands
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "94,29" / "53.27" → float or null. */
function parseNum(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------- round (Roman)

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** "VII" → 7, "II" → 2. Returns null on a non-Roman token. */
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
 * Round from "VII przetarg ustny…" / "VI przetargu ustnego…". CASE-SENSITIVE
 * (uppercase Roman only) so the conjunction "i przetarg" and spelled-out
 * ordinals never match. First occurrence wins — in both document types the
 * stated round precedes any prior-round recap ("Pierwszy przetarg … odbył się").
 */
export function roundFromText(text) {
  const m = /(?:^|[\s(,–—-])([IVXLCDM]{1,7})\s+przetarg/.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}

// ---------------------------------------------------------------- doc-type gate

/**
 * Result-notice gate. Bydgoszcz result DOCXes read:
 *   "podaje do publicznej wiadomości informację o wyniku przeprowadzonego …"
 * (occasionally "o wynikach przeprowadzonych"). Announcements say "ogłasza …
 * przetarg" and never contain the phrase.
 */
export function isResultNotice(text) {
  return /informacj[ęea]*\s+o\s+wynik(?:u|ach)/i.test(text || '');
}

// ---------------------------------------------------------------- dates

/**
 * Announcement auction date: "Przetarg odbędzie się w Urzędzie Miasta Bydgoszczy
 * przy ul. Jezuickiej 2 w Sali Łochowskiego (parter) w dniu 09 lipca 2026 r."
 * The venue clause between "odbędzie się" and "w dniu" is ~84 chars → window 160.
 * Future-tense anchor skips the prior-round recap ("odbył się w dniu 28.02.2025").
 */
export function auctionDateFromAnn(text) {
  const t = text || '';
  // Spelled-out month (the live format)
  let m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,160}?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  // Numeric fallback
  m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,160}?w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}`;
  return null;
}

/**
 * Result-notice auction date:
 *   "informację o wyniku przeprowadzonego w dniu 26.06.2026r. …"   (numeric,
 *    often NO space before "r.") or
 *   "przeprowadzonego w dniu  25 czerwca  2026 r." (spelled month, doubled spaces).
 */
export function resultDateFromText(text) {
  const t = text || '';
  let m = /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}`;
  m = /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return null;
}

// ---------------------------------------------------------------- prices

const AMOUNT = '(\\d(?:[\\d\\s\\u00a0.]*\\d)?)'; // digits with space/NBSP/newline/dot separators

/**
 * Starting price.
 *   Result DOCX:      "Cena wywoławcza nieruchomości: 135.000,- zł"
 *   Land result:      "… o pow.0,1025 ha - 450 000,00 zł" after the label
 *   Announcement DOC: table — the "Cena wywoławcza w zł" HEADER is far (~1.5 kB)
 *     from the value cell, so fall back to the FIRST ",-"-suffixed amount in the
 *     whole text ("299\n000,-" precedes the wadium "30 000,-": the price column
 *     comes first). Verified: no earlier ",-" token exists in the live DOCs.
 */
export function startingPriceFromText(text) {
  const t = text || '';
  // 1) Labelled with colon (result notices)
  let m = new RegExp(`cena\\s+wywo[łl]awcza\\s+nieruchomo[śs]ci\\s*:\\s*${AMOUNT}(?:,(?:\\d{2}|-))?\\s*z[łl]`, 'i').exec(t);
  if (m) return parsePLN(m[1]);
  // 2) Labelled, amount within a bounded window ending in zł/,- (land results)
  m = new RegExp(`cena\\s+wywo[łl]awcza[\\s\\S]{0,300}?${AMOUNT}(?:,(?:\\d{2}|-))?\\s*z[łl]`, 'i').exec(t);
  if (m) return parsePLN(m[1]);
  // 3) Announcement table: first ",-"-suffixed amount in the document
  m = new RegExp(`${AMOUNT},-`).exec(t);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Achieved price from a result DOCX:
 *   "Najwyższa cena osiągnięta w przetargu – 142.000,- zł"  (sold)
 *   "Najwyższa cena osiągnięta w przetargu – brak"          (unsold → null)
 */
export function achievedPriceFromText(text) {
  const t = text || '';
  const m = new RegExp(
    `najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetarg\\w*\\s*[–—:-]\\s*${AMOUNT}(?:,(?:\\d{2}|-))?\\s*z[łl]`,
    'i',
  ).exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** True when the notice explicitly states the auction found no buyer. */
function isUnsold(text) {
  const t = text || '';
  return /wynikiem\s+negatywnym/i.test(t) ||
    /najwy[żz]sza\s+cena[\s\S]{0,60}?[–—-]\s*brak/i.test(t) ||
    /brak\s+wp[łl]acon\w+\s+wadi/i.test(t) ||
    /nie\s+odnotowano\s+wp[łl]at/i.test(t);
}

// ---------------------------------------------------------------- area

/**
 * Usable floor area of the flat. Live formats: "94,29 m2" · "38,04m2" ·
 * "o pow. 53,27m2". The flat area is the FIRST decimal-comma m² amount — plot
 * areas are integers ("pow.778 m 2", "322m2") and never match the decimal
 * requirement; piwnica/przynależne areas come after the flat area, and the
 * context guard skips them defensively if a document ever reorders.
 */
export function unitAreaFromText(text) {
  const t = text || '';
  const re = /(\d{1,3}[.,]\d{1,2})\s*m\s*[²2](?!\d)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 22), m.index);
    if (/piwnic|przynale[żz]|kom[óo]rk|\bwc\b|\bha\b/i.test(before)) continue;
    const v = parseNum(m[1]);
    if (v) return v;
  }
  return null;
}

// ---------------------------------------------------------------- address

/**
 * Property address. MUST be anchored on "położon…" — the auction venue
 * ("… w Urzędzie Miasta Bydgoszczy przy ul. Jezuickiej 2 …") and the WMG office
 * ("ul. Grudziądzka 9-15") appear in every document. Live property patterns:
 *   announcement: "budynku położonym przy\n\nul. Henryka Sienkiewicza 37 w Bydgoszczy"
 *   result:       "położonego w Bydgoszczy przy ul. Chodkiewicza 2, o pow. …"
 * The unit number comes from "lokal mieszkalny nr 2" / "lokalu mieszkalnego nr 1".
 */
export function addressRawFromText(text) {
  const t = (text || '').replace(/\r/g, '');

  const unitM = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const unit = unitM ? unitM[1] : null;

  const m = /po[łl]o[żz]on\w+[\s\S]{0,40}?\bul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(t);
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const bldg = m[2];
  return unit ? `ul. ${street} ${bldg}/${unit}` : `ul. ${street} ${bldg}`;
}

/** Kind from a bounded slice (headers + the object clause come first). */
function kindFromText(text) {
  return classifyKind((text || '').slice(0, 1500));
}

// ---------------------------------------------------------------- announcement parse

/**
 * Parse one announcement DOC (doc-text.js catdoc output). One flat per DOC.
 * @param {string} text
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
    // Land announcements are crawled but not wired into the flat stream.
    return { kind: 'grunt', starting_price_pln, auction_date, round };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(t),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ---------------------------------------------------------------- result parse

/**
 * Parse one result DOCX body (doc-text.js unzip branch). The achieved price
 * lives ONLY in the DOCX — never in the article HTML. One property per DOCX.
 * Registry contract: parseResultDoc(text, fallbackDate, sourceUrl).
 * @param {string} text
 * @param {string|null} fallbackDate  article publication date (crawl fallback)
 * @param {string} sourceUrl  DOCX download URL
 * @returns {Array<object>}  0 or 1 record
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const kind = kindFromText(t);
  // Land results are crawled (crawlResultDocs includes them) but are
  // parcel-keyed — out of scope for the address-keyed property stream.
  if (kind === 'grunt') return [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isUnsold(t);

  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
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
