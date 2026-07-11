// Ząbkowice Śląskie parsers.
//
// The Gmina (Urząd Miejski, Wydział Geodezji i Gospodarki Nieruchomościami, GN)
// sells municipal property — lokale mieszkalne, lokale użytkowe, garaże and a
// heavy tail of undeveloped land — via `przetarg ustny nieograniczony`. Everything
// is published on the city BIP (bip.zabkowiceslaskie.pl), which runs the **Logonet
// eUrząd** CMS. Unusually, Ząbkowice uses Logonet's dedicated real-estate module
// (not generic articles): a structured, filterable board whose per-notice detail
// page carries the announcement fields INLINE in a "Szczegóły" HTML table:
//
//   Adres nieruchomości  | Sulisławice 52B lokal mieszkalny nr 2 AM-2 obręb Sulisławice
//   Przetarg na          | sprzedaż lokalu mieszkalnego nr 2 położonego w miejscowości
//                          Sulisławice 52B wraz z udziałem … o pow. 0.0277 ha …
//   Typ przetargu        | Przetarg ustny nieograniczony
//   Rodzaj nieruchomości | lokal mieszkalny
//   Cena wywoławcza      | 50 000,00
//   Data przetargu       | <time datetime="2026-08-12T09:00:00"> 12.08.2026 godz. 09:00
//
// So ANNOUNCEMENTS are parsed straight from server HTML — no PDF, no OCR. The
// classifier and the address/parcel/area extractors run on the "Przetarg na"
// prose (the document BODY), never the URL slug (a real flat can have no "lokal"
// in its slug, and the "Rodzaj" field mis-files a lokal użytkowy as "nieruchomość
// zabudowana" — see the Ziębicka 21 fixture).
//
// RESULTS ("INFORMACJA O WYNIKU PRZETARGU") arrive as a per-notice **scanned**
// PDF (Producer "KONICA MINOLTA bizhub 554e" — NO text layer; verified live
// 2026-07-11, contradicting the spike's "born-digital" note), so the crawler OCRs
// them (core/ocr-pdf.js, tesseract -l pol) and parseResultDoc parses the OCR text.
// The result body uses the SAME Polish prose as the "Przetarg na" field
// ("… na sprzedaż lokalu mieszkalnego nr 5 … przy ul. Kłodzkiej 6 …"), so the
// address/parcel/kind extractors are shared — the result joins its announcement on
// the same address key (klodzkiej|6|5) / parcel key (dz|stolec|399/6). Achieved
// price + outcome + round live ONLY in the OCR text:
//   sold:     "Cena wywoławcza … wynosiła 15 000,00 zł, a cena osiągnięta w tym
//              przetargu wyniosła 15 150,00 zł" + "nabywcą … został <Name>"
//   negative: "nie odbył się … z powodu braku nabywców" / "z uwagi na brak nabywców"
// The auction ROUND is a ROMAN numeral ("I przetarg ustny", "VII przetarg ustny"),
// not a word ordinal.
//
// All regexes below were groundtruthed against real fetched fixtures — detail
// pages 10794 (flat announce), 10793 (lokal użytkowy announce), a land announce,
// and OCR of results 15268 (flat, brak nabywców) and 15994 (land, sold 15 150 zł,
// nabywca Jakub Kwit). See tests/parse-zabkowice-slaskie.test.js.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "50 000,00" / "15 150,00 zł" / "60 000 zł" / "136.000,-" -> integer PLN.
// Spaced thousands (regular + non-breaking space), a ",00" grosze tail or a
// dash ",-"/".-" are all dropped; any surrounding label ("zł", "wynosiła") is
// stripped. Returns null when no positive amount is present.
export function parsePLN(numStr) {
  if (numStr == null) return null;
  // Keep only digits and the separators that appear inside a Polish amount.
  const cleaned = String(numStr)
    .replace(/[^\d.,\s -]/g, '')
    .replace(/[\s ]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '') // dotted thousands "136.000"
    .replace(/,\d{2}\b/, '')       // grosze ",00"
    .replace(/[.,]?-\s*$/, '')     // dash grosze ",-" / ".-"
    .replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "76,85" / "0.2800" / "29,56" -> number. Comma or dot decimal separator.
export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------- round (Roman)

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
// Word-ordinal stems (regex fragments) -> round, for the tolerant fallback.
const ROUND_WORD_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['pi[ąa]t', 5], ['sz[óo]st', 6], ['si[óo]dm', 7],
];

/** Auction round qualifying "przetarg": Roman ("VII przetarg ustny" -> 7) is the
 *  Ząbkowice form; a word ordinal ("drugi przetarg" -> 2) is tolerated too.
 *  Returns null when unstated (most sale announcements don't restate the round). */
export function roundFromText(text) {
  const t = text || '';
  const rm = /(?:^|\s)([IVX]{1,4})\s+przetarg\w*\s+(?:ustn|pisemn|nieograniczon|ograniczon)/i.exec(t);
  if (rm) return ROMAN[rm[1].toLowerCase()] ?? null;
  for (const [stem, n] of ROUND_WORD_STEMS) {
    if (new RegExp(`\\b${stem}\\w*\\s+przetarg`, 'i').test(t)) return n;
  }
  return null;
}

// ------------------------------------------------------------- shared extractors
//
// These run on the same Polish prose whether it came from the "Przetarg na" HTML
// field (announcement) or the OCR body (result) — the phrasing is identical.

/** Kind from the announcement/result prose (classify on the BODY, never the slug).
 *  classify-kind's ordering makes "lokalu mieszkalnego" beat a later "działki"
 *  mention, and "niezabudowanej" resolve to land. */
export function kindFromProse(text) {
  return classifyKind(text || '');
}

// Flat/commercial unit number: "lokal mieszkalny nr 5", "lokalu mieszkalnego nr 2",
// "lokal użytkowy nr 1", "lokal niemieszkalny nr 3".
const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

/** Flat/commercial unit number ("nr N"), or null. */
export function unitNoFromProse(text) {
  const m = UNIT_NO_RE.exec(text || '');
  return m ? m[1] : null;
}

// Normalise a building token so "52 B" (OCR) and "52B" (HTML) collapse to one key.
function normBuilding(b) {
  return (b || '').replace(/\s+/g, '').toUpperCase();
}

// Street form: "… przy ul. Kłodzkiej 6 …" / "… przy ulicy Ziębickiej 21 …" /
// "pl. Jana Pawła II 1-3 …". Street = capitalised word(s); building = digits +
// optional letter (space-tolerant: "52 B") or a "1-3" range. The lazy street body
// stops at the building number, and the optional space+letter only fires for an
// UPPERCASE letter so a following preposition ("6 w Ząbkowicach") is never eaten.
const STREET_RE =
  /(?:przy\s+)?(?:ul(?:\.|icy|ica)?|pl(?:\.|acu|ac)?|al(?:\.|ei|eja)?|os(?:\.|iedla|iedle)?)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃIVX][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’-]*)*?)\s+(\d+(?:\s[A-Z]|[A-Za-z])?(?:-\d+)?)(?=[\s.,/]|$)/;

// Village form (no "ul."): "… położonego w miejscowości Sulisławice 52B …" /
// "… Sulisławice 52 B …". Single-word village + building.
const VILLAGE_RE =
  /w\s+miejscowo[śs]ci\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+)\s+(\d+(?:\s[A-Z]|[A-Za-z])?(?:-\d+)?)(?=[\s.,/]|$)/;

/** { street, building } from a street- or village-form address in the prose, or
 *  null. building is normalised ("52 B" -> "52B"). */
export function streetOrVillageFromProse(text) {
  const t = text || '';
  const sm = STREET_RE.exec(t);
  if (sm) return { street: sm[1].replace(/\s+/g, ' ').trim(), building: normBuilding(sm[2]) };
  const vm = VILLAGE_RE.exec(t);
  if (vm) return { street: vm[1].trim(), building: normBuilding(vm[2]) };
  return null;
}

/** "ul. <street> <bldg>[/<unit>]" raw address for an address-keyed asset, or null.
 *  (parseAddress strips the "ul." lead, so a village name passes through as the
 *  street.) A unit number appends "/N". */
export function addressRawFromProse(text) {
  const sv = streetOrVillageFromProse(text);
  if (!sv || !sv.building) return null;
  const unit = unitNoFromProse(text);
  return unit ? `ul. ${sv.street} ${sv.building}/${unit}` : `ul. ${sv.street} ${sv.building}`;
}

// Parcel number(s): "działkę nr 399/6", "działka nr 5/134", "działka nr 49",
// "działak nr 21/65" (OCR/source typo), "działki: 25/2, 25/3, 25/4". The list
// form collects every "N" / "N/M" token after "działki[:]".
export function parcelFromProse(text) {
  const t = (text || '').replace(/[ ]/g, ' ');
  const parcels = [];
  const seen = new Set();
  const add = (p) => { const v = p.trim(); if (/^\d+(?:\/\d+)?$/.test(v) && !seen.has(v)) { seen.add(v); parcels.push(v); } };
  // "dzia[łl]…" — \w does NOT cover the Polish endings (działkę, działką), so the
  // word tail is an explicit Polish lowercase class.
  // list form: "działki[:] 25/2, 25/3 i 25/4"
  const list = /dzia[łl][a-ząćęłńóśźż]*\s*:?\s*(?:nr\.?\s*)?((?:\d+(?:\/\d+)?\s*(?:,|i|oraz)\s*)+\d+(?:\/\d+)?)/i.exec(t);
  if (list) for (const p of list[1].split(/\s*(?:,|i|oraz)\s*/)) add(p);
  // single form: "działka nr 399/6" / "działkę nr 5/134" / "działak nr 21/65"
  const single = /dzia[łl][a-ząćęłńóśźż]*\s+(?:gruntow\w+\s+)?(?:o\s+)?(?:numer\w*|nr)\.?\s*(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = single.exec(t)) !== null) add(m[1]);
  return parcels.length ? parcels.join(', ') : null;
}

// obręb: "obręb Sulisławice", "obręb Osiedle Wschód", "ob. Centrum-14",
// "ob Sieroszów". One or two capitalised words, optionally a "-NN" suffix.
const OBREB_RE =
  /\bob(?:r[ęe]b(?:ie)?|\.?)\s*:?\s*((?:[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)(?:[\s-][A-Z0-9ŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń0-9]*)?)/;

/** obręb (cadastral precinct) name, or null. */
export function obrebFromProse(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// Plot area (LAND): "o pow. 0.2800 ha" / "o powierzchni 0,0500 ha" /
// "o łącznej pow. 0,4135 ha". Hectares -> m2 (x10 000, rounded).
export function landAreaFromProse(text) {
  const t = text || '';
  const m = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (!m) return null;
  const a = Number(m[1].replace(',', '.'));
  return a > 0 ? Math.round(a * 10000) : null;
}

// Usable floor area (FLAT/commercial unit): "o pow. 76,85 m2" /
// "o powierzchni użytkowej 29,56 m2". m2 only (never the "ha" plot area).
export function flatAreaFromProse(text) {
  const t = text || '';
  const m = /o\s+pow(?:ierzchni)?(?:\s+u[żz]ytkow\w+)?\.?\s*(\d+[.,]\d+|\d+)\s*m\s*[²2](?!\d)/i.exec(t);
  return m ? parseArea(m[1]) : null;
}

/** True when the "Przetarg na" description is a SALE (keep) vs a lease/rental
 *  (dzierżawa / najem — skip). Anchored on the leading action word. */
export function isSaleText(przetargNa) {
  const s = przetargNa || '';
  if (/\bdzier[żz]aw|\bnajem\b|na\s+najem\b/i.test(s)) return false;
  return /sprzeda|zbyci/i.test(s);
}

// ------------------------------------------------------------- detail HTML fields

/** Strip tags + collapse whitespace of a table cell's inner HTML. */
function cellText(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/** Value of a "Szczegóły" row by its <th> label (substring match), tags stripped. */
function rowValue(html, label) {
  const re = new RegExp(`<th[^>]*>\\s*${label}[^<]*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = re.exec(html);
  return m ? m[1] : null;
}

/**
 * Extract the announcement fields from a notice DETAIL page's "Szczegóły" table.
 * @param {string} html
 * @returns {{adres:string, przetargNa:string, typ:string, rodzaj:string,
 *   cenaText:string, auctionDate:string|null, publishedDate:string|null}|null}
 */
export function extractFields(html) {
  if (!html) return null;
  const przetargNaRaw = rowValue(html, 'Przetarg na');
  const adresRaw = rowValue(html, 'Adres nieruchomo');
  if (przetargNaRaw == null && adresRaw == null) return null;
  const dataCell = rowValue(html, 'Data przetargu') || '';
  const dt = /<time\s+datetime="([^"]+)"/i.exec(dataCell);
  // Publication date = the first date-only <time datetime="YYYY-MM-DD"> on the
  // page (the Logonet "opublikowano" metadata sits after the details table).
  const pub = /<time\s+datetime="(\d{4}-\d{2}-\d{2})"/i.exec(
    html.slice(html.search(/Data\s+publikacji|Opublikowano|metryk/i) >= 0 ? html.search(/Data\s+publikacji|Opublikowano|metryk/i) : 0),
  );
  return {
    adres: cellText(adresRaw),
    przetargNa: cellText(przetargNaRaw),
    typ: cellText(rowValue(html, 'Typ przetargu')),
    rodzaj: cellText(rowValue(html, 'Rodzaj nieruchomo')),
    cenaText: cellText(rowValue(html, 'Cena wywo')),
    auctionDate: dt ? dt[1].slice(0, 10) : null,
    publishedDate: pub ? pub[1] : null,
  };
}

// --------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT from the detail-page fields. Single property: returns
 * ONE record or null. Land (kind 'grunt') carries dzialka_nr/obreb/plot-area ->
 * land.json; flats/commercial/buildings carry an address -> properties.json.
 *
 * @param {ReturnType<typeof extractFields>} fields
 * @param {string} [detailUrl]
 * @returns {object|null}
 */
export function parseAnnouncement(fields, detailUrl) {
  if (!fields) return null;
  const prose = `${fields.przetargNa || ''} ${fields.adres || ''}`.trim();
  if (!prose) return null;
  if (fields.przetargNa && !isSaleText(fields.przetargNa)) return null; // lease/rental

  const kind = kindFromProse(fields.przetargNa || prose);
  const starting_price_pln = parsePLN(fields.cenaText);
  const auction_date = fields.auctionDate || null;
  const round = roundFromText(fields.przetargNa || prose);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromProse(prose);
    const obreb = obrebFromProse(prose);
    const sv = streetOrVillageFromProse(fields.przetargNa || '');
    const address_raw = sv ? `ul. ${sv.street}${sv.building ? ` ${sv.building}` : ''}` : null;
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromProse(prose),
      address_raw,
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl || null,
      source_url: detailUrl || null,
    };
  }

  // Address-keyed (flat / commercial unit / garage / building).
  const address_raw = addressRawFromProse(fields.przetargNa || prose) || addressRawFromProse(fields.adres || '');
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = flatAreaFromProse(prose);
  const landArea = area_m2 == null ? landAreaFromProse(prose) : null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    ...(landArea != null ? { land_area_m2: landArea } : {}),
    starting_price_pln,
    auction_date,
    round,
    detail_url: detailUrl || null,
    source_url: detailUrl || null,
  };
}

// ------------------------------------------------------------------ result parse

/** Is this text an "INFORMACJA O WYNIKU PRZETARGU" result notice? Lenient so a
 *  slightly OCR-garbled header still passes (the crawler already selected the
 *  result attachment by its HTML label). */
export function isResultNotice(text) {
  const t = text || '';
  return /informacj\w*\s+o\s+wynik/i.test(t) || /wynik\w*\s+przetarg/i.test(t);
}

// Achieved price (SOLD only): "cena osiągnięta w tym przetargu wyniosła
// 15 150,00 zł" / "cena osiągnięta w przetargu: 178 000,00 zł". A numeric value
// => sold.
export function achievedPriceFromResult(text) {
  const m = /cena\s+osi[ąa]gni[ęe]t\w*\s+w\s+(?:tym\s+)?przetargu\s*(?:wynios[łl]a|wyni[oó]s[łl]a|wynosi|to|:|-)?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Starting price in a result notice (when restated): "cena wywoławcza … wynosiła
// 15 000,00 zł". Often absent on negative notices.
export function startingPriceFromResult(text) {
  const m = /cena\s+wywo[łl]awcz\w*[^.]*?(?:wynosi[łl]a|wynosi|to|:|-)\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** True when the notice explicitly states a NEGATIVE outcome (no sale). */
export function isNegativeResult(text) {
  const t = text || '';
  return /nie\s+odby[łl]\s+si[ęe]|braku?\s+nabywc|z\s+uwagi\s+na\s+brak|wynikiem\s+negatywn|nie\s+wy[łl]oniono|nie\s+wp[łl]yn[ęe][łl]/i.test(t);
}

// Result auction date, tolerant of the three phrasings seen live:
//   "Dnia 12 października 2022 roku w Urzędzie …"      (sold)
//   "nie odbył się dnia 23 czerwca 2022 roku …"        (negative)
//   "ogłoszony na dzień 22 maja 2017 roku …"           (negative)
// The HTML "Data przetargu" (passed as fallbackDate) is authoritative; this only
// backstops a missing fallback. -> ISO or null.
export function resultDateFromText(text) {
  const t = text || '';
  const anchored =
    /(?:dnia|na\s+dzie[ńn]|Dnia)\s+(\d{1,2})\s+([a-zżźćęłóśąń]+)\s+(\d{4})\s+roku/i.exec(t);
  const m = anchored || /(\d{1,2})\s+([a-zżźćęłóśąń]+)\s+(\d{4})\s+roku/i.exec(t);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Parse one OCR'd RESULT notice into a concluded-auction record (same shape the
 * other adapters emit). Single property; joins its announcement by address key /
 * parcel key + round in build-properties / build-land.
 *
 * @param {string} text        OCR text of the "INFORMACJA O WYNIKU PRZETARGU" PDF
 * @param {string|null} fallbackDate  ISO auction date from the detail HTML (authoritative)
 * @param {string} sourceUrl   the OCR'd PDF URL (provenance)
 * @returns {Array<object>}    0 or 1 record
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const round = roundFromText(t);
  const achieved = achievedPriceFromResult(t);
  const starting_price_pln = startingPriceFromResult(t);
  const sold = achieved != null;
  const negativeStated = isNegativeResult(t);
  const auction_date = fallbackDate || resultDateFromText(t) || null;
  const kind = kindFromProse(t);

  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromProse(t);
    const obreb = obrebFromProse(t);
    const sv = streetOrVillageFromProse(t);
    const address_raw = sv ? `ul. ${sv.street}${sv.building ? ` ${sv.building}` : ''}` : null;
    if (!dzialka_nr && !address_raw) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl,
      detail_url: sourceUrl,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromProse(t),
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  // Address-keyed (flat / commercial / garage / building).
  const address_raw = addressRawFromProse(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  const area_m2 = flatAreaFromProse(t);
  const landArea = area_m2 == null ? landAreaFromProse(t) : null;
  return [{
    auction_date,
    source_pdf: sourceUrl,
    detail_url: sourceUrl,
    source_url: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2,
    ...(landArea != null ? { land_area_m2: landArea } : {}),
    notes,
  }];
}
