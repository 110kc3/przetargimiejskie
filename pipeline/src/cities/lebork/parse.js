// Lębork parsers.
//
// Gmina Miasto Lębork (Burmistrz Miasta Lęborka) sells municipal flats + commercial
// units and, separately, undeveloped land at `przetarg ustny nieograniczony na
// sprzedaż`, and publishes both announcements and "Informacja … o wyniku"
// results as plain inline HTML on bip.um.lebork.pl (no SPA, no PDF, no OCR).
// crawl.js strips each notice's <article id="content"> to plain text (BODY) and
// pairs it with the board-row link text (TITLE), then assembles ONE labelled blob
// via buildRecordText(); every parser reads that blob. The test builds the SAME
// blob from the real captured title+body strings, so the parsers are
// groundtruthed against live data (verified 2026-07-13).
//
// The board carries BOTH streams intermixed; crawl.js splits announcement vs
// result by CONTENT (isResultDoc — result titles open "Informacja …"), never by
// slug (slugs are decorative and lie). classifyKind likewise runs on the BODY.
//
// Regexes groundtruthed against live documents (verified 2026-07-13):
//   FLAT announce, INLINE, round I, MULTI-LOKAL (2 flats + 1 commercial unit):
//     "Burmistrz Miasta Lęborka ogłasza I przetargi ustne nieograniczone
//      1. Sprzedaż lokalu mieszkalnego nr 10 o powierzchni 33,02 m2 przy ul.
//      Stryjewskiego 10 … Przetarg odbędzie się 14.01.2026r. … Cena wywoławcza
//      161.000,00 zł … wadium … 16.000,00 zł. 2. … nr 3 … 30,78 m2 przy ul.
//      Mieszka I 14B … 137.000,00 zł … 3. Sprzedaż lokalu o innym niż mieszkalne
//      przeznaczeniu nr 4 … 50,64 m2 przy ul. Armii Krajowej 12 … 267.000,00 zł"
//   FLAT announce, round II (Roman ordinal + a prior-round DATE trap):
//     "… ogłasza II przetarg ustny nieograniczony … lokalu mieszkalnego nr 3 o
//      powierzchni 42,25 m2 … przy ul. Łokietka 24 … I przetarg ustny
//      nieograniczony został przeprowadzony w dniu 27.05.2026r. Przetarg odbędzie
//      się 12.08.2026r. … Cena wywoławcza 120.000,00 zł"
//   LAND announce, round I, tabular MULTI-PARCEL:
//     "I przetarg … na sprzedaż nieruchomości gruntowych niezabudowanych …
//      przy ul. Polnej … 1. 134/5 1745 … 178.000,00 zł … 2. 134/6 1318 …
//      147.000,00 zł … Przetargi przeprowadzone zostaną w dniu 19.08.2026 r."
//   FLAT result SOLD, prose, round I: "Informacja … po I przetargu …
//      przeprowadzonego w dniu 14.01.2026r. … lokalu mieszkalnego nr 3 o pow.
//      30,78 m2 … przy ul. Mieszka I 14B … cena wywoławcza 137.000,00 zł …
//      wyłoniono nabywców … najwyższą cenę … 154.200,00 zł"
//   COMMERCIAL result NEGATIVE, prose, round I: "Informacja … o I przetargu …
//      lokalu o innym niż mieszkalne przeznaczeniu nr 4 … przy ul. Armii Krajowej
//      12 … cena wywoławcza 267.000,00 zł Przetarg zakończył się wynikiem
//      negatywnym, ponieważ nikt nie przystąpił do przetargu."
//   LAND result, tabular: SOLD "Informacja o wyniku III przetargu … przeprowadzony
//      w dniu 11.03.2026 r. … przy ul. Polnej … 132/5 2392 210.000,00 zł … 260.883,00
//      zł …"; NEGATIVE "… IV przetargów … 08.01.2026 … Przetarg zakończył się
//      wynikiem negatywnym".
//
// TRAPS the anchors avoid: (a) the OFFICE address — every notice ends "… w sali
// nr 101 Urzędu Miejskiego w Lęborku przy ul. Armii Krajowej 14" (and a real
// property can be Armii Krajowej 12!); the property address is anchored on the
// FIRST "przy ul." of each lokal SEGMENT, which always precedes the office clause.
// (b) the prior-round history ("I przetarg … został przeprowadzony w dniu …"): the
// announcement date anchors on the future "odbędzie się …" tried BEFORE the
// result-tense anchor, and the round anchors on the TITLE. (c) the udział działka
// area ("działkę nr 118/3 … o powierzchni 249 m2", integer) vs the flat area
// ("o powierzchni 30,78 m2", decimal) — the flat area anchor requires a decimal.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// "161.000,00" / "1 500 000,00" -> integer PLN. Dot/space thousands, optional
// ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "33,02" / "42,25" / "1745" -> number. Comma OR dot decimal; NBSP/space stripped.
export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML fragment to a single line of plain text, decoding the
 *  entities that carry data (ó, ², nbsp spacing, ndash). */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|td|tr|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–').replace(/&mdash;/gi, '—')
    .replace(/&sup2;/gi, '²').replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the board
 * row TITLE and the extracted article BODY; the test passes the raw captured
 * strings and lets stripHtml run. One line per field so `^LABEL:` (multiline)
 * reads each.
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

/** Read a single labelled line's value. Inter-label gap is [ \t]* (NOT \s*) so an
 *  empty field can't slide the match across the newline into the next label. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/** TITLE + BODY concatenated — the searchable surface. An UNLABELLED input (a
 *  single lokal segment sliced out for the multi-lokal split) has no TITLE:/BODY:
 *  lines, so it is returned as-is rather than blank. */
export function whole(text) {
  const t = String(text || '');
  const title = field(t, 'TITLE');
  const body = field(t, 'BODY');
  if (!title && !body) return t.trim();
  return `${title} ${body}`.trim();
}

// Polish-letter class for street names (JS \w excludes ą/ć/ę/ł/ń/ó/ś/ź/ż).
const PL = 'A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄąÜü';
// Uppercase-initial class: a real street name is a proper noun (Łokietka, Armii,
// M. Reja, Skłodowskiej), never a lowercase prose word — used to keep the "ul.-less"
// address form (result notices write "przy Łokietka 24") from matching stray
// "przy <lowercase word> <digit>" phrases.
const UPPER = 'A-ZŁŚŻŹĆĘÓŃĄÜ';

// ----------------------------------------------------------------- doc-type gates

/** True when this is a SALE auction ("przetarg … na sprzedaż/zbycie …"). */
export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /(sprzeda[żz]|zbyci)/i.test(t);
}

/** True when the auction PURPOSE is a DZIERŻAWA / NAJEM lease, not a sale. */
export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t);
}

/** True when the notice is a rokowania (post-failed-auction negotiations). */
export function isRokowania(text) {
  return /\brokowani/i.test(whole(text));
}

/** True when the notice CANCELS/withdraws an auction ("Odwołanie przetargów …",
 *  "przetarg … został odwołany", "unieważni…") — not a sale, not a result. */
export function isCancelled(text) {
  const title = field(text, 'TITLE');
  const t = whole(text);
  if (/^\s*odwo[łl]ani\w*\s+przetarg/i.test(title)) return true;
  return /przetarg\w*\s+(?:zosta[łl]\w*\s+)?odwo[łl]an/i.test(t) || /uniewa[żz]ni\w*\s+przetarg/i.test(t);
}

/** True when this is an "Informacja … o wyniku / po … przetargu" RESULT notice.
 *  Anchored on the title opening "Informacja …" (every result does; announcements
 *  open "Burmistrz … ogłasza …" / "<Roman> przetarg …"), with a body fallback on
 *  the result-only phrasings. The bare prior-round history "… został
 *  przeprowadzony w dniu …" that a round-II ANNOUNCEMENT carries is NOT used. */
export function isResultDoc(text) {
  const title = field(text, 'TITLE');
  if (/^\s*informacj/i.test(title)) return true;
  const t = whole(text);
  return /informacj\w*\s+(?:burmistrza\s+)?(?:miasta\s+)?(?:l[ęe]borka\s+)?(?:o\s+wynik|po\s+[IVX]+\s+przetarg|dotycz)/i.test(t)
    || /podaj[ęe]\s+do\s+publicznej\s+wiadomo[śs]ci\s+informacj/i.test(t)
    || /przetarg\w*\s+zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynikiem/i.test(t);
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynikiem\s+negatywnym|nikt\s+nie\s+(?:przyst[ąa]pi|wp[łl]aci|wzi[ąeą][łl])|brak\s+ofert|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium/i.test(t);
}

// ----------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10 };

/** Roman numeral (I..XXXIX) -> int, or null. */
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

/**
 * Auction round. Anchored on the TITLE's "<Roman> przetarg(i|u|ów)" — every notice
 * states the current round there ("ogłasza II przetarg", "po I przetargu",
 * "o wyniku III przetargu", "IV przetargów"). Requiring "przetarg" after the Roman
 * means a Roman inside a street name ("… przy ul. Mieszka I 14B/3", "Armii …") is
 * never taken. Falls back to the same anchor over the whole blob (the body repeats
 * the heading), where the first match is the CURRENT round because the lead
 * ("ogłasza II przetarg" / "informację o wyniku III przetargu") precedes any
 * prior-round history ("I przetarg … został przeprowadzony …"). Returns null when
 * unstated.
 */
export function roundFromText(text) {
  const RE = /\b([IVX]{1,4})\s+przetarg/i;
  const title = field(text, 'TITLE');
  let m = RE.exec(title);
  if (m) { const n = romanToInt(m[1]); if (n) return n; }
  m = RE.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}

// ----------------------------------------------------------------- date

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** "14.01.2026" (numeric) or "19 sierpnia 2026" (word month) -> ISO, or null. */
function parseDatePhrase(phrase) {
  const s = String(phrase || '').trim();
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(s);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(s);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

const DATE_TOKEN = String.raw`(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})`;

/**
 * Auction date. Tried in order so an ANNOUNCEMENT that also carries a prior-round
 * history date resolves to the future one:
 *   ANNOUNCEMENT flat: "Przetarg odbędzie się 12.08.2026r." (no "dnia").
 *   ANNOUNCEMENT land / RESULT: "Przetargi przeprowadzone zostaną w dniu 19.08.2026 r.",
 *     "przeprowadzonego w dniu 14.01.2026r.", "zostały przeprowadzone w dniu 08.01.2026 r."
 *   RESULT fallback: "ogłoszone na dzień …".
 * -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  const patterns = [
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`przeprowadzon\w*[\s\S]{0,20}?\bw\s+dniu\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`og[łl]oszon\w*\s+na\s+dzie[ńn]\s+${DATE_TOKEN}`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) {
      const iso = parseDatePhrase(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}

// ----------------------------------------------------------------- prices

// "161.000,00" / "1 500 000,00" — dot/space thousands with a ",00" grosze tail.
const AMOUNT = String.raw`(?<!\d)(\d{1,3}(?:[.\s ]\d{3})*,\d{2})`;
const PRICE_RE = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[^0-9]{0,40}?${AMOUNT}\s*z[łl]`, 'i');
const AMOUNT_ZL_RE = new RegExp(String.raw`${AMOUNT}\s*z[łl]`, 'i');

/**
 * Starting price ("cena wywoławcza … <amount> zł"). The flat/commercial prose form
 * has 0 digits between the label and the amount; the wadium clause has its own
 * label so it is never matched. LAND is tabular ("Cena wywoławcza netto" header
 * far from the row value, with the wadium column's digits in between), so when the
 * labelled anchor fails the fallback takes the first "<amount> zł" — which is the
 * first parcel's cena wywoławcza (the wadium column follows it).
 */
export function startingPriceFromText(text) {
  const t = whole(text);
  const m = PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const m2 = AMOUNT_ZL_RE.exec(t);
  return m2 ? parsePLN(m2[1]) : null;
}

/** Wadium ("wadium … w wysokości <amount> zł"), or null. */
export function wadiumFromText(text) {
  const m = /wadium\w*[^0-9]{0,40}?w\s+wysoko[śs]ci\s+(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price of a FLAT/commercial result — ONLY when a buyer is named
 *  ("wyłoniono nabywc…" / "nabywcą … został") from "najwyższą cenę … <amount> zł"
 *  / "za cenę … <amount> zł". A stated "nikt nie przystąpił" / "wynikiem
 *  negatywnym" ⇒ null (unsold). */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  if (isNegativeOutcome(t)) return null;
  let m = new RegExp(String.raw`najwy[żz]sz\w+\s+cen\w+[^0-9]{0,80}?${AMOUNT}\s*z[łl]`, 'i').exec(t);
  if (!m) m = new RegExp(String.raw`za\s+cen[ęe]\s+(?:w\s+wysoko[śs]ci\s+)?${AMOUNT}\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** True when the notice is a LAND sale (grunt) — "nieruchomości gruntow…/
 *  niezabudowan…/działki" WITHOUT any "lokal" sale-object. */
export function isLandNotice(text) {
  const t = whole(text);
  if (/lokal\w*\s+(?:mieszkaln|o\s+innym\s+ni[żz]\s+mieszkaln|niemieszkaln|u[żz]ytkow)/i.test(t)) return false;
  return /gruntow\w*|niezabudowan\w*|nieruchomo[śs]ci\s+gruntow|dzia[łl]k/i.test(t);
}

/** Kind of one flat/commercial lokal SEGMENT. "lokal o innym niż mieszkalne
 *  przeznaczeniu" / "lokal niemieszkalny" / "lokal użytkowy" → commercial
 *  (checked first, because it contains the word "mieszkalne"); a plain "lokal
 *  mieszkalny" → residential; a garage → garaz. */
function kindFromSegment(seg) {
  const s = String(seg || '');
  if (/lokal\w*\s+o\s+innym\s+ni[żz]\s+mieszkaln|lokal\w*\s+(?:niemieszkaln|u[żz]ytkow)/i.test(s)) return 'uzytkowy';
  if (/lokal\w*\s+mieszkaln|mieszkaln\w+\s+nr|lokalu\s+nr/i.test(s)) return 'mieszkalny';
  if (/gara[żz]/i.test(s)) return 'garaz';
  const k = classifyKind(s);
  return k === 'unknown' ? 'mieszkalny' : k;
}

/** Notice-level kind (grunt vs address-keyed) for routing. */
export function kindFromText(text) {
  if (isLandNotice(text)) return 'grunt';
  return kindFromSegment(whole(text));
}

// ----------------------------------------------------------------- flat fields

// A lokal's own number: "lokalu mieszkalnego nr 10 o powierzchni" / "lokalu o
// innym niż mieszkalne przeznaczeniu nr 4 o pow." — the "nr N" that directly
// precedes "o pow(ierzchni)". The udział działka number ("działkę nr 118/3 obręb
// 3 o powierzchni") does NOT (it has "obręb N" between), and is slash-formed.
// A lokal number may carry a qualifier between the number and "o pow" — the real
// stock includes "nr 17 oficyna o powierzchni …" (a rear-annex unit); tolerate it
// so the middle unit of a multi-lokal notice is not dropped.
const LOKAL_NR_RE = /\bnr\s+(\d+[A-Za-z]?)\s+(?:oficyna\s+)?o\s+p(?:ow\b|ow\.|owierzchni)/i;

// Property street + building — "przy [ul.] <STREET> <BLDG>" (Lębork writes no "nr"
// before the building; the "ul." is present in announcements but DROPPED in result
// prose — "…wielolokalowym przy Łokietka 24 wraz…" — so it is optional). STREET is
// non-greedy up to the building number and may carry a Roman-numeral word ("Mieszka
// I") or two words ("Armii Krajowej"). The anchor is CASE-SENSITIVE and requires an
// UPPERCASE initial: with "ul." optional this is what keeps a stray lowercase "przy
// <word> <digit>" out; a street is always a proper noun. The office/bank clauses
// ("w sali … Urzędu … przy ul. Armii Krajowej 14") are uppercase too but excluded
// by OFFICE_RE on the preceding context.
const ADDR_RE = new RegExp(String.raw`[Pp]rzy\s+(?:ul(?:\.|ic\w*)?\s+)?([${UPPER}][${PL}.\- ]*?)\s+(\d+[A-Za-z]?)\b`);
// Office / bank markers that precede a NON-property "przy ul." occurrence.
const OFFICE_RE = /(urz[ęe]d|siedzib|sali\b|w\s+sali|banku|oddzia[łl]|tablicy)/i;

// Flat area — "o powierzchni 33,02 m2" / "o pow. 30,78 m2" (decimal, so the
// integer udział działka area "o powierzchni 249 m2" is not taken).
const AREA_RE = /o\s+p(?:ow\.|owierzchni)\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Split a flat/commercial BODY into one segment per lokal (each real lokal has a
 *  "… nr N o pow(ierzchni)" anchor; boilerplate has none). ≤1 anchor ⇒ single
 *  segment. */
function flatSegments(body) {
  const re = new RegExp(String.raw`\blokal\w*\b[^.]{0,80}?\bnr\s+\d+[A-Za-z]?\s+(?:oficyna\s+)?o\s+p(?:ow\b|ow\.|owierzchni)`, 'gi');
  const starts = [];
  let m;
  while ((m = re.exec(body)) !== null) starts.push(m.index);
  if (starts.length <= 1) return [body];
  const segs = [];
  for (let i = 0; i < starts.length; i++) {
    segs.push(body.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : body.length));
  }
  return segs;
}

/** First property "przy ul. <street> <bldg>" of a segment that is NOT the office
 *  address, or null. */
function streetBuildingFromSegment(seg) {
  const re = new RegExp(ADDR_RE.source, 'g'); // case-sensitive (see ADDR_RE)
  let m;
  while ((m = re.exec(seg)) !== null) {
    const before = seg.slice(Math.max(0, m.index - 30), m.index);
    if (OFFICE_RE.test(before)) continue; // office / bank clause
    return { street: m[1].trim().replace(/\s+/g, ' '), building: m[2] };
  }
  return null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat/commercial unit, or null. */
export function flatAddressRaw(seg) {
  const sb = streetBuildingFromSegment(seg);
  if (!sb) return null;
  const u = LOKAL_NR_RE.exec(seg);
  const apt = u ? u[1] : null;
  return apt ? `${sb.street} ${sb.building}/${apt}` : `${sb.street} ${sb.building}`;
}

/** Flat/commercial usable area (m²) of a segment, or null. */
export function unitAreaFromText(seg) {
  const m = AREA_RE.exec(seg);
  return m ? parseNum(m[1]) : null;
}

// ----------------------------------------------------------------- land fields

/** Parcels + area for a LAND record. Parcels come from prose "działki nr N"
 *  anchors (announcements); when absent (result tables have a "Nr działki" header,
 *  not the prose form) the first table row after the "Nabywca" column header —
 *  "Nabywca <parcel> <area> <price> …" — yields the first parcel + its area. The
 *  remaining rows of a multi-parcel table are column-ambiguous and left unscraped
 *  (best-effort — land is the secondary stream). Area also falls back to a prose
 *  "o powierzchni <N> ha|m²". */
export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const reP = /dzia[łl]k[a-ząćęłńóśźż]*\s+nr\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  if (!parcels.length) {
    const row = /Nabywca\s+(\d+(?:\/\d+)?)\s+(\d{2,5})\b/i.exec(t);
    if (row) { parcels.push(row[1]); area_m2 = parseNum(row[2]); }
  }
  if (area_m2 == null) {
    const am = /o\s+(?:[łl][ąa]cznej\s+)?p(?:ow\.|owierzchni)\s+(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
    if (am) {
      const val = parseNum(am[1]);
      if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
    }
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

/** Land street ("przy ul. <STREET>" not followed by a building number, not the
 *  office), or null. */
export function landStreetFromText(text) {
  const re = new RegExp(String.raw`przy\s+ul(?:\.|ic\w*)?\s+([${PL}][${PL}.\- ]{1,40}?)(\s+\d|,|;|\.|\s+i\s+|$)`, 'gi');
  let m;
  const t = whole(text);
  while ((m = re.exec(t)) !== null) {
    if (/^\s+\d/.test(m[2])) continue;        // "Armii Krajowej 14" (office, has bldg)
    const before = t.slice(Math.max(0, m.index - 30), m.index);
    if (OFFICE_RE.test(before)) continue;
    return m[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

/** Highest achieved amount of a grunt result that EXCEEDS the starting price
 *  (a winning bid), or null. Single-subject grunt results only — a mixed
 *  multi-parcel table is inherently lossy in one record. */
function gruntAchieved(text, starting) {
  if (starting == null) return null;
  const re = new RegExp(AMOUNT_ZL_RE.source, 'gi');
  let m; let best = null;
  while ((m = re.exec(whole(text))) !== null) {
    const v = parsePLN(m[1]);
    if (v != null && v > starting && (best == null || v > best)) best = v;
  }
  return best;
}

// ------------------------------------------------------------- announcement parse

/** One address-keyed record from a flat/commercial segment, or null. */
function flatRecord(seg, round, auction_date) {
  const address_raw = flatAddressRaw(seg);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const rec = {
    kind: kindFromSegment(seg),
    address_raw,
    address,
    area_m2: unitAreaFromText(seg),
    starting_price_pln: startingPriceFromText(seg),
    wadium_pln: wadiumFromText(seg),
    auction_date,
    round,
  };
  if (address.warning) rec.notes = [address.warning];
  return rec;
}

/**
 * Parse one ANNOUNCEMENT blob into active record(s). Flat/commercial notices are
 * split into one record per lokal; land (kind 'grunt') → one parcel-keyed record.
 * @param {string} text  blob from buildRecordText
 * @returns {Array<object>}  (empty if nothing usable)
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const body = whole(text);

  if (isLandNotice(text)) {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln: startingPriceFromText(text),
      auction_date,
      round,
    }];
  }

  const out = [];
  for (const seg of flatSegments(body)) {
    const rec = flatRecord(seg, round, auction_date);
    if (rec) out.push(rec);
  }
  return out;
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED "Informacja … o wyniku / po … przetargu" blob into result
 * record(s). Flat/commercial → one address-keyed record (sold ⇒ final_price from
 * the achieved figure; else unsold). Land → one parcel-keyed record (best-effort;
 * a mixed multi-parcel table is lossy).
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const negativeStated = isNegativeOutcome(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (isLandNotice(text)) {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    const achieved = negativeStated ? null : gruntAchieved(text, starting_price_pln);
    const sold = achieved != null;
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
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
    }];
  }

  const address_raw = flatAddressRaw(whole(text));
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    auction_date,
    source_url: sourceUrl,
    kind: kindFromSegment(whole(text)),
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(whole(text)),
    notes,
  }];
}
