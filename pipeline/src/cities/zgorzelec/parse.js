// Zgorzelec parsers.
//
// Gmina Miejska Zgorzelec (Burmistrz Miasta Zgorzelec, Wydział Gospodarki
// Nieruchomościami / WGN) sells municipal flats, commercial units and land at
// `ustny przetarg nieograniczony` and publishes them on the bip.info.pl hosted
// CMS at zgorzelec.bip.info.pl — clean SERVER-RENDERED HTML (no SPA, no OCR).
// UNLIKE Chełmno's XML feed there are no structured fields: each notice is one
// flowing HTML article. crawl.js strips the article's <div id="content-main"> to
// plain text (BODY) and pairs it with the board-list link text (TITLE), then
// assembles them into ONE labelled blob via buildRecordText(); every parser
// reads that blob. The test builds the SAME blob from the real captured
// title+body strings, so the parsers are groundtruthed against live data.
//
// TWO SEPARATE BOARDS (unlike Chełmno's single board):
//   Ogłoszenia o przetargu (idmp=32) → announcements → crawlActive listings/land
//   Rozstrzygnięcia        (idmp=34) → results        → crawlResultDocs
// so the active-vs-result split is by BOARD, not by an inline resolution.
//
// All regexes groundtruthed against live documents (verified 2026-07-10):
//   FLAT active (round I): iddok 18253  ul. Reymonta 32/1
//     "OGŁOSZENIE … o I ustnym przetargu … na sprzedaż lokalu mieszkalnego nr 1
//      położonego w Zgorzelcu przy ul. Reymonta 32 … odbędzie się w dniu
//      26 sierpnia 2026 r. … lokal mieszkalny nr 1 o pow. 57,61 m 2 …
//      CENA WYWOŁAWCZA NIERUCHOMOŚCI : 180.000,00 ZŁ"
//   COMMERCIAL active (round I): iddok 18255  ul. Warszawska 12/6A
//     "…lokalu niemieszkalnego nr 6A … przy ul. Warszawskiej 12 … 28,60 m 2"
//   LAND active (round III): iddok 18166  ul. Francuska, dz. 20/4
//     "…III ustnym przetargu … nieruchomości niezabudowanej … przy ul.
//      Francuskiej … 04.08.2026 … Działka Nr 20/4 … o pow. 3933 m 2 … Cena
//      wywoławcza: 270.850,00 zł" — carries a PRIOR-ROUND trap: "Pierwszy
//      przetarg odbył się dnia 21.01.2026 r. Drugi przetarg odbył się dnia
//      12.05.2026 r." (round + date decoy the parser must avoid).
//   LAND result SOLD (round I): iddok 18192  ul. Migdałowa, dz. 11/3
//     "Informacja o wyniku przetargu Dnia 09.06.2026 roku … został
//      przeprowadzony I ustny przetarg … Działka Nr 11/3 … Cena wywoławcza:
//      215.000,00 zł … Najwyższa cena netto osiągnięta w przetargu … 217.150,00
//      zł. Firma ustalona jako nabywca nieruchomości: JOBCONSULT Sp. z o.o."
//
// The round is anchored ONLY on the "<ROMAN> ustn… przetarg" clause, so the land
// notice's prior-round history ("Pierwszy przetarg odbył się …", a WORD ordinal
// with no "ustnym") never wins. The auction date is anchored on the future-tense
// "odbędzie się w dniu …" (announcement) or "Dnia <DD.MM.YYYY> roku … został
// przeprowadzony" (result), so the history "…odbył się dnia …" and the metryka
// publish date can't win. The address is anchored on "położon… przy ul. …" so
// the office address ("w siedzibie Urzędu Miasta … przy ul. Domańskiego 6") is
// never taken.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "180.000,00" / "270.850,00" / "1 500 000,00" -> integer PLN. Dot OR (regular/
// NBSP) space thousands separator; optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "57,61" / "28,60" / "3933" -> number. Comma OR dot decimal; NBSP/space stripped.
function parseNum(numStr) {
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
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * already-extracted TITLE (board link text) and BODY (article content-main
 * text); the test passes the raw captured strings and lets stripHtml run. One
 * line per field so `^LABEL:` (multiline) reads each.
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

/** Read a single labelled line's value from the blob. The inter-label gap is
 *  matched with [ \t]* (NOT \s*) so an EMPTY field can't let the match slide
 *  across the newline and capture the next label's line. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/** TITLE + BODY concatenated — the searchable surface for anchored regexes. */
function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'BODY')}`.trim();
}

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a SALE auction ("… przetarg … na sprzedaż …") and
 *  not a call-for-tenders / works contract ("Zaproszenie do składania ofert …"
 *  for conservation/renovation), which share the same board. */
export function isSaleAuction(text) {
  const t = whole(text);
  if (/zaproszenie\s+do\s+sk[łl]adania\s+ofert/i.test(t)) return false;
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

/** True when the auction PURPOSE is a DZIERŻAWA / NAJEM lease (rent), not a sale.
 *  Anchored on the lease being the OBJECT of the auction ("… na/w/do dzierżawę",
 *  "oddanie w najem …", "czynsz dzierżawny …", a monthly rent) so a SALE notice
 *  that merely records the plot is ENCUMBERED by a pre-existing lease ("Działka …
 *  objęta jest umową dzierżawy gruntu rolnego") is NOT vetoed. Pure lease auctions
 *  are already dropped upstream by !isSaleAuction (they carry no "sprzedaż"); this
 *  is the secondary guard for a mixed notice. */
export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t)
    || /z[łl]\s*\/?\s*miesi[ęe]cznie|\bmiesi[ęe]cznie\s*$/i.test(t);
}

/** True when this looks like a "Informacja o wyniku" result notice. */
export function isResultDoc(text) {
  const t = whole(text);
  return /informacj\w*\s+o\s+wyniku|wyniku\s+(?:\w+\s+)?przetargu|zosta[łl]\s+przeprowadzon|osi[ąa]gni[ęe]t/i.test(t);
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium/i.test(t);
}

// ----------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XXXIX range used here) -> int, or null if malformed. */
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
 * Auction round. Anchored ONLY on the current-auction clause "<ROMAN> ustn…
 * przetarg" ("o I ustnym przetargu", "III ustnym przetargu", "I ustny przetarg",
 * "I ustnego przetargu"). The land notice's prior-round history ("Pierwszy
 * przetarg odbył się …", "Drugi przetarg …") uses a WORD ordinal with a bare
 * "przetarg" (no "ustnym"), so it never matches. Returns null when unstated.
 */
export function roundFromText(text) {
  const m = /\b([IVXL]{1,5})\s+ustn\w*\s+przetarg/i.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}

// ----------------------------------------------------------------- date

/** "26 sierpnia 2026" (word month) or "04.08.2026"/"09.06.2026" (numeric) -> ISO. */
function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

/**
 * Auction date. PRIMARY (announcement): the future-tense clause "… odbędzie się
 * w dniu 26 sierpnia 2026 r." / "… odbędzie się w dniu 04.08.2026 r." — anchored
 * on "odbędzie się w dniu" so the prior-round history "…odbył się dnia
 * 21.01.2026 r." (PAST tense) can't win. FALLBACK (result): "Dnia 09.06.2026
 * roku … został przeprowadzony …". The metryka publish date is outside both
 * anchors. -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  let m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /\bDnia\s+([\s\S]{0,24}?)\s+roku\b[\s\S]{0,120}?przeprowadzon/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. Anchored on the NOMINATIVE "cena wywoławcza … <amount> zł"
 *  ("CENA WYWOŁAWCZA NIERUCHOMOŚCI : 180.000,00 ZŁ", "Cena wywoławcza:
 *  270.850,00 zł"). The wadium clause uses the GENITIVE "10% ceny wywoławczej"
 *  (and the "Wadium:" label), so it is never matched. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz[ae]\w*[^0-9]{0,40}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is named ("… nabywca …"), from either the
 *  Zgorzelec land phrasing ("Najwyższa cena netto osiągnięta w przetargu …
 *  217.150,00 zł") or the Chełmno-style flat phrasing ("… za cenę … zł"). A
 *  numeric value ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  let m = /osi[ąa]gni[ęe]t\w*[\s\S]{0,120}?(\d[\d. ]*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /za\s+cen[ęe]\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Kind from the TITLE (unambiguous sale-object phrase) first, falling back to
 *  the full text. "lokalu mieszkalnego" → mieszkalny; "lokalu niemieszkalnego" →
 *  uzytkowy; "nieruchomości niezabudowanej"/"Działka" → grunt. */
export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(whole(text));
}

// ----------------------------------------------------------------- address

// Property street+building — anchored on "położon… (w Zgorzelcu) przy ul. <STREET>
// <BLDG>" so the office address ("w siedzibie Urzędu Miasta … przy ul.
// Domańskiego 6") is never captured. STREET is non-greedy up to the first number.
const PROP_ADDR_RE =
  /po[łl]o[żz]on\w*\s+(?:w\s+Zgorzelcu\s+)?przy\s+ul\.\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s+(\d+[A-Za-z]?)\b/i;

// Land street (no building) — same "położon… przy ul." anchor, terminated before
// a comma / "w Zgorzelcu" / "który". The street is length-bounded ({2,40}) so a
// terminator-less TITLE occurrence ("… przy ul. Francuskiej" with the article
// body following, no comma for ~120 chars) can't over-run: that start position
// fails the bound and .exec falls through to the BODY occurrence ("… przy ul.
// Francuskiej, który …"), which terminates cleanly on the comma.
const LAND_STREET_RE =
  /po[łl]o[żz]on\w*\s+(?:w\s+Zgorzelcu\s+)?przy\s+ul\.\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{2,40}?)(?:\s+w\s+Zgorzelcu|,|\s+kt[óo]r|\.|$)/i;

/** Flat/unit number from "lokal(u) (nie)mieszkaln… nr <N>". */
function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat / commercial unit, or null. */
export function addressRawFromText(text) {
  const m = PROP_ADDR_RE.exec(whole(text));
  if (!m) return null;
  const street = m[1].trim().replace(/\s+/g, ' ');
  const building = m[2];
  const apt = unitNoFromText(text);
  return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
}

/** Land street name (for context/display on parcel-keyed records), or null. */
function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(whole(text));
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

// Usable floor area of the unit: "lokal mieszkalny nr 1 o pow. 57,61 m 2" /
// "lokal niemieszkalny nr 6A o pow. 28,60 m 2". Anchored on the unit noun +
// number so the room breakdown ("Powierzchnia użytkowa … wynosi 39,69 m 2"), the
// cellar ("piwnica … 17,92 m 2") and the shared-plot area are not taken.
const UNIT_AREA_RE =
  /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?\d+[A-Za-z]?\s+o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m²) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// Parcel(s) + area for LAND records. Parcels from "Działka Nr <N>[/<M>]"
// (case-insensitive; also matches the lowercase "za działkę nr 11/3" echo, which
// dedupes). Area from the first "o pow. <N> m²" (m² — integer) or "<N> ha".
function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const reP = /dzia[łl]k\w*\s+nr\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const am = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction) blob into a single active record, or
 * null. Land (kind 'grunt') → parcel-keyed record for land.json; flats /
 * commercial units → address-keyed record.
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
    const address_raw = landStreetFromText(text);
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
 * Parse one CONCLUDED "Informacja o wyniku" blob into a result record. Returns 0
 * or 1 record (array = framework interface). Joins its property by address (+
 * unit-no) or parcel + round in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
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
    const address_raw = landStreetFromText(text);
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
