// Kędzierzyn-Koźle parsers.
//
// Every announcement / result is a SINGLE-property text PDF (one flat, one
// commercial unit, or one land parcel-set per PDF). Closest analog: Tarnowskie
// Góry (same Logonet CMS), but the office boilerplate is Kędzierzyn-Koźle's own.
// All regexes below were groundtruthed against the REAL `pdftotext`/web-extracted
// text of live attachments (verified 2026-06-26):
//   - download/74494  land ANNOUNCEMENT  (dz. 854/44, obręb Kędzierzyn, III przetarg, 150.000,00 zł)
//   - download/78414  land RESULT  (dz. 1756/5,9,10, XIV przetarg, 80.000,00 zł, wynik negatywny)
//   - download/73247  land RESULT  (dz. 450/7, sold: wywoławcza 60.000,00 → osiągnięta 60.600,00, nabywca)
//   - download/74897  flat RESULT  (ul. Grunwaldzka 51 nr 1, I przetarg, 170.000,00 zł, no wadium → unsold)
//
// Kędzierzyn-Koźle specifics vs. Tarnowskie Góry:
//   * ROUND is a ROMAN numeral qualifying "przetarg ustny" ("III przetarg ustny",
//     "XIV przetarg ustny") — not a word ordinal.
//   * PRICES use DOT thousands + comma grosze ("150.000,00 zł", "80.000,00 zł").
//   * The OFFICE address "przy ul. Piastowskiej 17" appears in EVERY doc, so the
//     property street is extracted only from the clause AFTER "na sprzedaż".
//   * Result header is "Informacja o wyniku przetargu"; the achieved price reads
//     "cena osiągnięta w przetargu wyniosła 60.600,00 zł".
//   * SOLD ⇔ an achieved price is present; UNSOLD ⇔ "wynikiem negatywnym" /
//     "nie zostało wpłacone wadium" / "nie odnotowano wpłat wadiów".

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "150.000,00" / "80.000,00 zł" / "60 600,00" -> integer PLN. Dot OR space
// thousands separator, optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s . ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "45,00" / "0,1120" / "1 050" -> number.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s  ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------- round (Roman)

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/** "XIV" -> 14, "III" -> 3, "I" -> 1. Returns null on a malformed token. */
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

/** Round from the Roman numeral qualifying "przetarg ustny": "III przetarg
 *  ustny nieograniczony" -> 3, "XIV przetarg ustny" -> 14. Case-SENSITIVE on the
 *  numeral (rounds are always upper-case Roman) so the conjunction "i" can never
 *  be misread as Roman 1. The first occurrence wins (the announced/conducted
 *  round is stated before any prior-round recap). */
export function roundFromText(text) {
  const m = /\b([IVXLCDM]{1,6})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}

// ---------------------------------------------------------------- doc-type gate

/** Result notice ("Informacja o wyniku przetargu") vs. announcement
 *  ("OGŁOSZENIE … ogłasza"). The body header is authoritative. */
export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wyniku\s+przetarg/i.test(text || '');
}

// ----------------------------------------------------------------------- dates

/** Announcement auction date: "Przetarg odbędzie się w dniu 22 stycznia 2026 r."
 *  Anchored on "odbędzie się w dniu" so a prior-round recap ("W dniu 2
 *  października 2025 r. odbył się I przetarg …") is never picked up. -> ISO/null. */
export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** Result auction date: "iż dnia 10 grudnia 2025 r. w Wydziale Gospodarki …
 *  przeprowadzono … przetarg". Anchored on the "… r. w Wydziale" tail so the
 *  Rozporządzenie citation ("z dnia 14 września 2004 r.") can't win. Falls back
 *  to the header stamp "Kędzierzyn-Koźle, DD.MM.YYYY r." -> ISO/null. */
export function resultDateFromText(text) {
  const t = text || '';
  let m = /dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+w\s+Wydziale/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // Header stamp "Kędzierzyn-Koźle, 18.12.2025 r." (publish date — last resort).
  m = /Kędzierzyn[-\s]?Koźle[,.]?\s*(\d{1,2})\.(\d{2})\.(\d{4})\s*r/i.exec(t);
  return m ? `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}` : null;
}

// ----------------------------------------------------------------- prices

/** Starting price ("cena wywoławcza"). Result notices read "Cena wywoławcza …
 *  wynosiła 80.000,00 zł"; announcements carry it in a table cell. Try the
 *  labelled "wywoławcza … wynosiła/wynosi N zł" form first, then the first
 *  comma-grosze zł amount that is NOT a percentage (the announcement table's
 *  cena wywoławcza is the first such amount). -> integer PLN or null. */
export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[łl]awcza[\s\S]{0,120}?wynosi\w*\s+([\d . ]+,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza[\s\S]{0,400}?(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /(?<![%\d])(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices only): "cena osiągnięta w przetargu wyniosła
 *  60.600,00 zł" (also tolerates ": 60 600,00"). A value ⇒ sold. -> PLN or null. */
export function achievedPriceFromText(text) {
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?\s*(\d[\d . ]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- land fields

// obręb (cadastral precinct): "obręb Kędzierzyn" / "obręb Sławięcice" — one or
// two capitalised words.
const OBREB_RE = /obr[ęe]b(?:ie)?\s*:?\s*((?:[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)(?:[-\s][A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/;
export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/** Parcels + plot area (m2). Phrasings: "działka nr 854/44 o powierzchni 0,1120
 *  ha"; "działki nr 1756/5, 1756/9 i 1756/10 o łącznej powierzchni 0,0745 ha".
 *  Hectares -> m2 (×10 000). -> { dzialka_nr, area_m2 }. */
export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  let dzialka_nr = null;
  const nm = /dzia[łl]k\w*\s+nr\s+([\d/]+(?:\s*(?:,|i)\s*[\d/]+)*)\s+o\s+(?:ł[ąa]cznej\s+)?powierzchni/i.exec(s);
  if (nm) {
    const nums = nm[1].split(/\s*(?:,|i)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
    if (nums.length) dzialka_nr = nums.join(', ');
  }
  let area_m2 = null;
  const am = /o\s+(?:ł[ąa]cznej\s+)?powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(s);
  if (am) {
    const ha = Number(am[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr, area_m2 };
}

// ----------------------------------------------------------------- addresses

// The clause AFTER "na sprzedaż" — the office street ("ul. Piastowskiej 17")
// always precedes it, so anchoring here keeps it out of the property address.
function saleClause(text) {
  const m = /na\s+sprzeda[zż]\s*([\s\S]+)/i.exec(text || '');
  return m ? m[1] : (text || '');
}

// Flat/commercial unit number: "lokalu mieszkalnego nr 1" / "lokalu użytkowego
// nr 5-6".
const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?(?:-\d+)?)/i;

// Street + building for a flat/commercial unit: "… przy ul. Grunwaldzkiej 51 …".
const FLAT_STREET_RE =
  /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)\s+(\d+[A-Za-z]?)\b/;

// The WGN office "ul. Piastowskiej 17" appears in EVERY doc (and, in
// announcements, after "na sprzedaż"), so any street that resolves to Piastowska
// is the office, never the property — skip it.
const OFFICE_STREET_RE = /piastowsk/i;

/** "ul. <street> <bldg>[/<unit>]" raw address for a flat/commercial unit, from
 *  the post-"na sprzedaż" clause. Skips the office street. Returns null without a
 *  property street + building (e.g. a flat announcement whose only "przy ul." is
 *  the office — that flat is still captured via its result notice). */
export function addressRawFromText(text) {
  const c = saleClause(text);
  const re = new RegExp(FLAT_STREET_RE.source, 'g');
  let m;
  while ((m = re.exec(c)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    const um = UNIT_NO_RE.exec(c);
    return um ? `ul. ${street} ${m[2]}/${um[1]}` : `ul. ${street} ${m[2]}`;
  }
  return null;
}

// Street for LAND (no building number). Prose form: "… przy ul. Grunwaldzkiej,
// księga …" / "… w rejonie ul. Roberta Kocha. ksiega …". Table form: "… ul.
// Niezapominajek działka nr …". Scans the whole text and skips the office street,
// taking the first property street (land is parcel-keyed, so this is display only).
const LAND_STREET_RE =
  /\bul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?=\s+dzia[łl]k|\s*,|\s*\.|\s+ksi[ęe]g|\s+w\s+pokoju|\s+\d|\n|$)/g;
export function landStreetFromText(text) {
  const re = new RegExp(LAND_STREET_RE.source, 'g');
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (street && !OFFICE_STREET_RE.test(street)) return street;
  }
  return null;
}

// Usable floor area of a flat: "o powierzchni użytkowej 45,00 m2". Anchored on
// "użytkowej" so the cellar ("piwnicy … 16,70 m2") and wc are excluded.
const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+|\d+)\s*m\s*[²2](?!\d)/i;
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseNum(m[1]) : null;
}

// Kind from a generous header slice (the asset word — "lokalu mieszkalnego" /
// "nieruchomości gruntowej niezabudowanej" — sits ~500 chars in, after the
// office-address boilerplate). classify-kind's FLAT-before-LAND ordering means a
// flat that also mentions its "działka" land-share still resolves to 'mieszkalny'.
function kindFromText(text) {
  const c = saleClause(text);
  return classifyKind(c.slice(0, 1200));
}

// ----------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT PDF (flat, commercial unit, or land parcel-set).
 * Single-property: returns ONE record or null. Land carries kind:'grunt' +
 * dzialka_nr/obreb (→ land.json); flats/units carry an address (→ properties.json).
 * @param {string} text
 * @param {{ isLandBoard?: boolean }} [ctx]
 * @returns {object|null}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const isLand = ctx.isLandBoard || kind === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  if (isLand) {
    const plot = plotFromText(t);
    const street = landStreetFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
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

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice ("Informacja o wyniku przetargu") into a concluded
 * auction record. Single-property. Joins its announcement by address (+ unit) +
 * round in build-properties. Returns 0 or 1 record (array = framework interface).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @param {{ isLandBoard?: boolean }} [ctx]
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl, ctx = {}) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated =
    /wynikiem\s+negatywnym|zako[ńn]czony\s+(?:zosta[łl]\s+)?wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+(?:zosta[łl]o\s+wp[łl]acone\s+wadium|odnotowano\s+wp[łl]at\s+wadi|przyst[ąa]pi)/i.test(t);

  const kind = kindFromText(t);
  const isLand = ctx.isLandBoard || kind === 'grunt';

  if (isLand) {
    const plot = plotFromText(t);
    const street = landStreetFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2,
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

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
