// Chełmno parsers.
//
// Chełmno's BIP (Logonet eUrząd, same CMS as Skarżysko-Kamienna) exposes every
// auction as a structured XML record: adres-nieruchomosci, przetarg-na,
// rodzaj-nieruchomosci, cena-wywolawcza, data-przetargu, an INLINE
// <rozstrzygniecie> resolution, and a free-text <tresc> body. crawl.js strips
// each of those to plain text and assembles them into ONE labelled text blob
// via buildRecordText() (below); every parse function reads that blob. The test
// builds the SAME blob from the real captured field strings, so the parsers are
// groundtruthed against live data without re-fetching.
//
// Active-vs-concluded is decided by <rozstrzygniecie>: EMPTY while pending
// (→ announcement / active listing), FILLED once held (→ result / achieved
// price or negative outcome). There is NO separate "Informacja o wyniku" page.
//
// All regexes groundtruthed against live records (verified 2026-07-05):
//   FLAT sold (round VIII):  record 10338  ul. Toruńska 8/7
//     przetarg-na "…lokalu mieszkalnego nr 7…"; tresc "ogłasza VIII przetarg…
//     lokalu mieszkalnego nr 7 o pow. 27,67 m2… przy ul. Toruńskiej 8…
//     Cena wywoławcza wynosi 29.000,00 zł… Przetarg odbędzie się w dniu
//     6 sierpnia 2024 roku…"; cena-wywolawcza "29.000 zł"; data "06.08.2024";
//     rozstrzygniecie "Nabywcą nieruchomości został Pan … za cenę 29.290,00 zł."
//   FLAT unsold (round I):   record 11290  ul. Wodna 34/9
//     tresc "ogłasza I przetarg… lokalu mieszkalnego nr 9 o pow. 25,89 m2…";
//     rozstrzygniecie "Nikt nie przystąpił do przetargu. Przetarg zakończył się
//     wynikiem negatywnym."
//   FLAT sold (round IV, spaced-slash address, no-grosze price): record 8824
//     adres "Chełmno ul. Powstańców Wielkopolskich 2 / 7";
//     rozstrzygniecie "…za cenę 170.000 zł."
//
// The tresc lists PRIOR-round history ("Pierwszy przetarg odbył się 9 marca
// 2023 roku. …") — a trap for BOTH round and date. So the round comes ONLY from
// the "ogłasza <ORDINAL> przetarg" anchor (Roman VIII / word), and the auction
// date is taken from the structured data-przetargu field first (anchoring the
// tresc fallback on the future-tense "odbędzie się w dniu").

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "70.000" / "29.000,00" / "1 500 000,00 zł" / "170.000" -> integer PLN.
// Dot OR (regular/NBSP) space thousands separator; optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "27,67" / "25,89" / "13.10" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse a CDATA/HTML fragment to a single line of plain text. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * already-stripped field strings; the test passes the raw captured strings and
 * lets stripHtml run. One line per field so `^LABEL:` (multiline) reads each.
 * @param {{adres?:string, rodzaj?:string, cena?:string, data?:string,
 *   rozstrzygniecie?:string, przetargNa?:string, tresc?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `ADRES: ${stripHtml(f.adres)}`,
    `RODZAJ: ${stripHtml(f.rodzaj)}`,
    `CENA: ${stripHtml(f.cena)}`,
    `DATA: ${stripHtml(f.data)}`,
    `ROZSTRZYGNIECIE: ${stripHtml(f.rozstrzygniecie)}`,
    `PRZETARGNA: ${stripHtml(f.przetargNa)}`,
    `TRESC: ${stripHtml(f.tresc)}`,
  ].join('\n');
}

/** Read a single labelled line's value from the blob. The inter-label gap is
 *  matched with [ \t]* (NOT \s*) so an EMPTY field can't let the match slide
 *  across the newline and capture the next label's line. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

// ----------------------------------------------------------------- doc-type gate

/** A record is CONCLUDED when its <rozstrzygniecie> resolution is non-empty.
 *  (Empty ⇒ the auction is still pending ⇒ an active announcement.) */
export function hasResolution(text) {
  return field(text, 'ROZSTRZYGNIECIE').length > 0;
}

/** True when this record is a DZIERŻAWA / NAJEM (a commercial lease, not a
 *  sale) — many "Lokal użytkowy" records at Rynek/Hallera are 10-year leases
 *  ("oddaniu w dzierżawę …", cena "… zł miesięcznie"). Skipped in crawl. */
export function isLease(text) {
  const t = text || '';
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$/im.test(t);
}

// ----------------------------------------------------------------- round

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
  'siódm': 7, siodm: 7, 'ósm': 8, osm: 8, 'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XX range used here) -> int, or null if malformed. */
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

/**
 * Auction round. Anchored ONLY on the current-auction clause "ogłasza <ORDINAL>
 * przetarg" (Roman "VIII" or a word ordinal), so the tresc's prior-round history
 * ("Pierwszy przetarg odbył się …") never wins. Falls back to a leading Roman on
 * the przetarg-na title ("I przetargi ustne …"). Returns null when unstated.
 */
export function roundFromText(text) {
  const tresc = field(text, 'TRESC');
  let m = /og[łl]asza\s+([IVXL]{1,5})\s+przetarg/i.exec(tresc);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  m = /og[łl]asza\s+(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg/i.exec(tresc);
  if (m) {
    const key = m[1].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  }
  const na = field(text, 'PRZETARGNA');
  m = /\b([IVXL]{1,5})\s+przetarg\w*\s+ustn/i.exec(na);
  if (m) return romanToInt(m[1]);
  return null;
}

// ----------------------------------------------------------------- date

/**
 * Auction date. PRIMARY: the structured data-przetargu field ("06.08.2024
 * godz. 08:30"). FALLBACK: the tresc's future-tense clause "Przetarg odbędzie
 * się w dniu 6 sierpnia 2024 roku" (anchored on "odbędzie się w dniu" so the
 * prior-round history "… odbył się 9 marca 2023 roku" can't win). -> ISO / null.
 */
export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const tresc = field(text, 'TRESC');
  m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tresc);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. PRIMARY: tresc "Cena wywoławcza wynosi 29.000,00 zł"
 *  (nominative + "wynosi", so the wadium clause "…10% ceny wywoławczej tj.
 *  2.900,00 zł" is never matched). FALLBACK: the cena-wywolawcza field
 *  ("29.000 zł" / "1 000 000,00 zł brutto; …" → first amount). */
export function startingPriceFromText(text) {
  const tresc = field(text, 'TRESC');
  let m = /cena\s+wywo[łl]awcza\s+wynosi\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(tresc);
  if (!m) {
    const cena = field(text, 'CENA');
    m = /(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(cena);
  }
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY from the resolution, and ONLY when a buyer is named
 *  ("Nabywcą … został … za cenę 29.290,00 zł."). A numeric value ⇒ sold; null ⇒
 *  unsold / not stated. */
export function achievedPriceFromText(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  if (!/nabywc/i.test(roz)) return null;
  const m = /za\s+cen[ęe]\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(roz);
  return m ? parsePLN(m[1]) : null;
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  return /wynikiem\s+negatywnym|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano/i.test(roz);
}

// ----------------------------------------------------------------- kind

/** Kind from the "Rodzaj nieruchomości" field, falling back to the przetarg-na
 *  sale clause. "Nieruchomość niezabudowana" → grunt (land.json); "Lokal
 *  mieszkalny" → mieszkalny; "Lokal użytkowy" → uzytkowy; "Nieruchomość
 *  zabudowana" → zabudowana (built property, address-keyed). */
export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  const na = field(text, 'PRZETARGNA');
  return classifyKind(na);
}

// ----------------------------------------------------------------- address

/** Clean the raw adres-nieruchomosci to a "<street> <bldg>[/<apt>]" string:
 *  drop the postcode + "Chełmno/Chełmnie", normalise glued "ul.Toruńska", and
 *  trim stray punctuation. */
function cleanAdres(raw) {
  let s = (raw || '')
    .replace(/\b\d{2}-\d{3}\b/g, ' ')
    .replace(/\bw\s+che[łl]mnie\b/gi, ' ')
    .replace(/\bche[łl]mn(?:o|a|ie|em)\b/gi, ' ')
    .replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;.\-]+|[\s,;.\-]+$/g, '')
    .trim();
  return s;
}

/** Flat/unit number from the przetarg-na / tresc ("lokalu mieszkalnego nr 9"). */
function flatNoFromText(text) {
  const s = `${field(text, 'PRZETARGNA')} ${field(text, 'TRESC')}`;
  const m = /lokal\w*\s+mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(s);
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat / built property, or null. */
export function addressRawFromText(text) {
  const cleaned = cleanAdres(field(text, 'ADRES'));
  if (!cleaned) return null;
  // Already carries an inline apartment ("Toruńska 8/7", "… 2 / 7").
  if (/\d+[A-Za-z]?\s*\/\s*\d+/.test(cleaned)) return cleaned;
  const flat = flatNoFromText(text);
  return flat ? `${cleaned}/${flat}` : cleaned;
}

// Usable floor area of the unit: "lokalu mieszkalnego nr 7 o pow. 27,67 m2" /
// "pomieszczenia przynależnego o powierzchni 13,10 m2". Anchored on the unit
// noun so a room breakdown ("1 pokój … o pow. 13,75 m2") or a plot area is not
// taken (the FIRST area after the unit noun is the total).
const UNIT_AREA_RE =
  /(?:lokal\w*\s+mieszkaln\w+|lokal\w*\s+u[żz]ytkow\w+|pomieszcz\w+\s+przynale[żz]n\w+)[\s\S]{0,80}?o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(field(text, 'TRESC'));
  return m ? parseArea(m[1]) : null;
}

// Plot parcel(s) + area for LAND records. Parcels come ONLY from the clean
// adres-nieruchomosci field, which lists them as "dz. 185/22 - ul. …; dz. 372 -
// …" — parsing the free tresc instead over-captures stray digits (KW numbers,
// obręb, "nr 91") that are not parcels. Area is the total ha from tresc.
function landPlotFromText(text) {
  const adres = field(text, 'ADRES');
  const parcels = [];
  const seen = new Set();
  const reP = /\bdz(?:ia[łl]k\w*)?\.?\s*(?:nr\s*)?(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(adres)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const ah = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+[.,]\d+)\s*ha\b/i.exec(field(text, 'TRESC'));
  if (ah) {
    const ha = Number(ah[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction) record blob into a single active
 * record, or null. Land (kind 'grunt') → parcel-keyed record for land.json;
 * flats / built properties → address-keyed record.
 * @param {string} text  blob from buildRecordText
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED record blob (non-empty <rozstrzygniecie>) into a concluded
 * auction record. Returns 0 or 1 record (array = framework interface). Joins its
 * property by address (+ flat-no) + round in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date from the crawl ref (data-przetargu)
 * @param {string} sourceUrl  the canonical record URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!hasResolution(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
