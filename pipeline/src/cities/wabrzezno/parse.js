// Wąbrzeźno parsers.
//
// Gmina Miasto Wąbrzeźno (Burmistrz Wąbrzeźna) sells municipal flats and land at
// `nieograniczony przetarg ustny na sprzedaż prawa własności` and publishes both
// announcements and "Informacja o wynikach" results on the rbip.mojregion.info
// BIP — clean SERVER-RENDERED HTML/XML (no SPA). Each notice's text arrives as
// ONE flowing blob: crawl.js reads it from the notice's <tresc> CDATA when the
// ogłoszenie is pasted inline, or from a born-digital PDF / DOCX attachment when
// <tresc> is only a "PDF …/DOCX …" stub — then labels it TITLE (feed headline) +
// BODY (extracted text) via buildRecordText(). Every parser reads that blob. The
// test builds the SAME blob from the real captured title+body strings, so the
// parsers are groundtruthed against live data.
//
// ONE board (id 330) carries both streams; crawl.js splits announcement vs result
// by document CONTENT (isResultDoc), never by URL/slug — the CMS is ID-addressed
// and slugs lie (e.g. notice 336's slug says "lokalu-mieszkalnego" but its PDF is
// a GRUNT sale). classifyKind likewise runs on the BODY.
//
// Regexes groundtruthed against live documents (verified 2026-07-12):
//   FLAT announce, INLINE, round I, MULTI-LOKAL — notice 1866:
//     "OGŁASZAM pierwszy nieograniczony przetarg ustny na sprzedaż prawa
//      własności : 1) do lokalu mieszkalnego nr 2 o powierzchni użytkowej 33,25 m²
//      … przy ulicy Mickiewicza nr 19 … Cena wywoławcza wynosi 115.670,00 zł …
//      2) do lokalu mieszkalnego nr 68 … przy ulicy Niedziałkowskiego nr 1 … Cena
//      wywoławcza wynosi 89.241,00 zł … Przetarg odbędzie się dnia 29 lipca 2026
//      roku o godzinie 10.00 (lokal mieszkalny Mickiewicza 19/2) …"
//   FLAT announce, DOCX, round II, 3-LOKAL — notice 1461 (carries the round-trap
//     "Pierwszy przetarg odbył się …" that must NOT win the round):
//     "OGŁASZAM drugi nieograniczony przetarg ustny … do lokalu mieszkalnego nr 2
//      … Mickiewicza nr 19 … 90.000,00 zł … nr 74 … Niedziałkowskiego nr 1 …
//      95.000,00 zł … nr 7 … Matejki nr 20A … 150.000,00 zł … odbędzie się dnia
//      9 września 2025 roku …"
//   LAND announce, PDF, round II — notice 336:
//     "OGŁASZAM drugi nieograniczony przetarg ustny na sprzedaż prawa własności do
//      gruntu komunalnego o powierzchni 0,3066 ha określonego działką ewidencyjną
//      nr 392/8 … przy ulicy Wspólnej … Cena wywoławcza wynosi 267.300,00 zł …"
//   LAND result SOLD/negative phrasing anchor — notice 1287 (round I, negative):
//     "INFORMUJĘ iż przeprowadzony w dniu 01.04.2025 r. … pierwszy nieograniczony
//      przetarg ustny … określonej działkami ewidencyjnymi o nr : 555/5, 555/26,
//      555/27 … przy ulicy Kukułczej … zakończył się wynikiem negatywnym. Nikt nie
//      wpłacił wadium. Cena wywoławcza nieruchomości wynosiła 98.000,00 zł …"
//   LAND result negative, MULTI-PARCEL — notice 1602 (round II, brak ofert):
//     "INFORMUJĘ iż ogłoszone na dzień 15.01.2026 r. … drugie nieograniczone
//      przetargi ustne … 1. Działka nr 725 … przy ulicy Gruszkowej … zakończyły
//      się wynikami negatywnymi … Najwyższa cena osiągnięta w przetargach – brak
//      ofert. Nikt nie został nabywcą nieruchomości."
//
// The round anchors on the CURRENT-auction clause "<ordinal> [nie]ograniczon…
// przetarg" (word ordinal in bodies, Roman in some titles), so the history
// "Pierwszy przetarg odbył się …" (a bare "przetarg", no "[nie]ograniczony")
// never wins. The auction date anchors on the future-tense "odbędzie się dnia …"
// (announcement) or the result-tense "przeprowadzon… w dniu …" / "ogłoszone na
// dzień …", so the "Wywieszono dnia …" posting date can't win. The property
// street anchors on "przy ulic… <STREET> nr <BLDG>" (flat) or a "przy ulic…
// <STREET>" NOT followed by "nr <num>" (land), so the office address ("przy
// ulicy Wolności nr 18") is never taken as the land street.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// Polish word ordinal ROOT → int (declension-tolerant: pierwszy/pierwsze/
// pierwszego/pierwszym all share the "pierwsz" root). Bodies use these; some
// titles use Roman numerals instead.
const WORD_ORDINAL = [
  [/^pierwsz/i, 1],
  [/^drug/i, 2],
  [/^trzec/i, 3],
  [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5],
  [/^sz[óo]st/i, 6],
  [/^si[óo]dm/i, 7],
  [/^[óo]sm/i, 8],
];

// "115.670,00" / "267.300,00" / "1 500 000,00" -> integer PLN. Dot OR (regular/
// NBSP) space thousands separator; optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "33,25" / "0,3066" / "575" -> number. Comma OR dot decimal; NBSP/space stripped.
export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse a CDATA/HTML fragment to a single line of plain text. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the feed
 * TITLE and the extracted BODY (inline <tresc> text, or PDF/DOCX text); the test
 * passes the raw captured strings and lets stripHtml run. One line per field so
 * `^LABEL:` (multiline) reads each.
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

/** TITLE + BODY concatenated — the searchable surface for anchored regexes. An
 *  UNLABELLED input (e.g. a single lokal segment sliced out for the multi-lokal
 *  split) has no TITLE:/BODY: lines, so it is returned as-is rather than blank. */
export function whole(text) {
  const t = String(text || '');
  const title = field(t, 'TITLE');
  const body = field(t, 'BODY');
  if (!title && !body) return t.trim();
  return `${title} ${body}`.trim();
}

// Polish-inclusive word-continuation class — JS `\w` excludes ą/ć/ę/ł/ń/ó/ś/ź/ż,
// so a stem followed by a diacritic ("działką", "ewidencyjną") needs this.
const PLW = 'a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ';

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a SALE auction ("przetarg … na sprzedaż/zbycie …")
 *  and not a works tender ("Zaproszenie do składania/złożenia ofert …"), which
 *  shares the board. Land uses "na zbycie nieruchomości"; flats "na sprzedaż". */
export function isSaleAuction(text) {
  const t = whole(text);
  if (/zaproszenie\s+do\s+(?:sk[łl]adania|z[łl]o[żz]enia)\s+ofert/i.test(t)) return false;
  return /przetarg/i.test(t) && /(sprzeda[żz]|zbyci)/i.test(t);
}

/** True when the auction PURPOSE is a DZIERŻAWA / NAJEM lease (rent), not a sale.
 *  Anchored on the lease being the OBJECT of the auction ("… na dzierżawę",
 *  "oddanie w najem …", "czynsz dzierżawny …", a monthly rent) so a SALE notice
 *  that merely records a pre-existing lease encumbrance is NOT vetoed. */
export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t)
    || /z[łl]\s*\/?\s*miesi[ęe]cznie|\bmiesi[ęe]cznie\b/i.test(t);
}

/** True when the notice is a rokowania (post-failed-auction negotiations)
 *  procedure rather than a przetarg. Anchored on the title so a przetarg notice
 *  that merely mentions a prior rokowania is not skipped. */
export function isRokowania(title) {
  return /\brokowani/i.test(String(title || ''));
}

/** True when this is an "Informacja o wynikach/dotycząca …" result notice.
 *  Announcements use "OGŁASZAM …"; results use "INFORMUJĘ …" + an outcome, and a
 *  title that opens "Informacja …". "nabywca" alone is NOT used (it also appears
 *  in every announcement's wadium clause). */
export function isResultDoc(text) {
  const title = field(text, 'TITLE');
  const t = whole(text);
  if (/informacj\w*\s+(?:o\s+wynik|dotycz)/i.test(title)) return true;
  return /\binformuj[ęe]\b/i.test(t)
    && /(wynikiem\s+negatywnym|zako[ńn]czy[łl]\w*\s+si[ęe]|osi[ąa]gni[ęe]t|zosta[łl]\s+nabywc|nabywc[ąa]\s+\w+\s+zosta)/i.test(t);
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+negatywn\w*|zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynik\w*\s+negatywn|brak\s+ofert|nikt\s+nie\s+(?:zosta[łl]|wp[łl]aci|przyst[ąa]pi)|nie\s+wzi[ąeą][łl]\s+udzia[łl]|uniewa[żz]ni/i.test(t);
}

// ----------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XXXIX) -> int, or null if malformed. */
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

/** Polish word ordinal -> int, or null. */
function wordOrdinalToInt(word) {
  for (const [re, n] of WORD_ORDINAL) if (re.test(word)) return n;
  return null;
}

/**
 * Auction round. Anchored on the CURRENT-auction clause. Word-ordinal form
 * ("OGŁASZAM drugi nieograniczony przetarg", "drugie nieograniczone przetargi")
 * is tried first because bodies reliably carry it AND it structurally excludes
 * the prior-round history "Pierwszy przetarg odbył się …" (a bare "przetarg"
 * with no "[nie]ograniczony" between). Roman form ("IV przetarg", "III Przetarg")
 * is the title fallback. Returns null when unstated.
 */
export function roundFromText(text) {
  const t = whole(text);
  let m = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*)\s+(?:nie)?ograniczon\w+\s+(?:pisemn\w+\s+)?przetarg/i.exec(t);
  if (m) {
    const n = wordOrdinalToInt(m[1]);
    if (n) return n;
  }
  m = /\b([IVXL]{1,4})\s+(?:(?:nie)?ograniczon\w+\s+(?:pisemn\w+\s+)?)?przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  return null;
}

// ----------------------------------------------------------------- date

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** "29 lipca 2026" (word month) or "01.04.2025" (numeric) -> ISO, or null. */
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
 * Auction date. ANNOUNCEMENT: "… odbędzie się dnia 29 lipca 2026 roku …" /
 * "… odbędzie się dnia 9 maja 2023 roku …". RESULT: "… przeprowadzony w dniu
 * 01.04.2025 r. …" or "… ogłoszone na dzień 15.01.2026 r. …". The posting date
 * "Wywieszono dnia …" is outside every anchor. -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  const patterns = [
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe]\s+dnia\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`przeprowadzon\w*\s+w\s+dniu\s+${DATE_TOKEN}`, 'i'),
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

// Amount shape: "115.670,00" / "89.241,00" / "1 500 000,00" — dot/space thousands
// with a ",00" grosze tail. The gap after the label is [^,]{0,60}? so the label's
// own trailing "nieruchomości :" / " wynosi " / " wynosiła " (and a leading list
// index like "1.- ") is skipped without swallowing a comma.
const AMOUNT = String.raw`(\d{1,3}(?:[.\s ]\d{3})*,\d{2})`;
const PRICE_RE = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[^,]{0,60}?${AMOUNT}\s*z[łl]`, 'i');

/** Starting price ("cena wywoławcza … <amount> zł"). The wadium/postąpienie
 *  clauses use their own labels, so they are never matched. */
export function startingPriceFromText(text) {
  const m = PRICE_RE.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is actually named ("… nabywcą … został …")
 *  AND an "osiągnięta … <amount> zł" figure is present. A stated "Nikt … został
 *  nabywcą" / "brak ofert" ⇒ null (unsold). */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  if (/nikt\s+nie\s+zosta[łl]\s+nabywc/i.test(t)) return null;
  const m = new RegExp(String.raw`osi[ąa]gni[ęe]t\w*[^0-9]{0,40}?${AMOUNT}\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Notice-level kind for grunt-vs-address-keyed routing. Classified on the whole
 *  document (title + BODY), never the URL slug — the CMS is ID-addressed and the
 *  slug lies (notice 336's slug says "lokalu-mieszkalnego" but its body is a
 *  grunt sale). classifyKind's ordering (flat before land) means a flat notice's
 *  "lokalu mieszkalnego" wins over any incidental land/"zabudowane" wording. */
export function kindFromText(text) {
  return classifyKind(whole(text));
}

// ----------------------------------------------------------------- flat fields

// Property street+building — "przy ulic<y|.> <STREET> nr <BLDG>". STREET is
// non-greedy up to " nr <digit>"; BLDG is arabic + optional letter ("20A").
const FLAT_ADDR_RE =
  /przy\s+ulic\w*\.?\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘꟳÓóŃńĄą.\- ]+?)\s+nr\s+(\d+[A-Za-z]?)\b/i;

// Flat/unit number — "(do) lokalu (nie)mieszkalnego nr N". Also the multi-lokal
// segment anchor.
const LOKAL_RE = /lokalu?\s+(?:nie)?mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;

// Usable floor area — "o powierzchni użytkowej 33,25 m²". Anchored on "użytkowej"
// so the działka area ("o powierzchni 575 m²") and the piwnica ("piwnica o
// powierzchni 8,08 m²") are not taken.
const UNIT_AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]?/i;

/** Split a flat/commercial BODY into one segment per "lokalu … nr N" entry, so a
 *  multi-lokal notice yields one record each. A notice with no explicit list
 *  falls back to the whole body (single record). */
function flatSegments(body) {
  const re = new RegExp(LOKAL_RE.source, 'gi');
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

/** "<street> <bldg>[/<apt>]" raw address for a flat/commercial unit, or null. */
export function flatAddressRaw(segment) {
  const a = FLAT_ADDR_RE.exec(segment);
  if (!a) return null;
  const street = a[1].trim().replace(/\s+/g, ' ');
  const building = a[2];
  const u = LOKAL_RE.exec(segment);
  const apt = u ? u[1] : null;
  return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
}

/** Usable floor area (m²) of a unit segment, or null. */
export function unitAreaFromText(segment) {
  const m = UNIT_AREA_RE.exec(segment);
  return m ? parseNum(m[1]) : null;
}

// ----------------------------------------------------------------- land fields

/** Parcels + area for LAND records. Parcels from every "działk… (ewidencyjną) nr
 *  <N>[/<M>]" plus a trailing comma-list ("o nr : 555/5, 555/26, 555/27"). Area
 *  from the first "o (łącznej) powierzchni <N> ha|m²". */
export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const add = (p) => { if (p && !seen.has(p)) { seen.add(p); parcels.push(p); } };

  const reP = new RegExp(
    `dzia[łl]k[${PLW}]*\\s+(?:ewidencyjn[${PLW}]*\\s+)?(?:o\\s+)?nr\\s*:?\\s*(\\d+(?:\\/\\d+)?)`,
    'gi',
  );
  let m;
  while ((m = reP.exec(t)) !== null) {
    add(m[1]);
    // trailing comma-separated run right after this match ("… 555/5, 555/26, 555/27")
    const tail = t.slice(reP.lastIndex, reP.lastIndex + 80);
    const run = /^((?:\s*,\s*\d+(?:\/\d+)?)+)/.exec(tail);
    if (run) for (const p of run[1].match(/\d+(?:\/\d+)?/g) || []) add(p);
  }

  let area_m2 = null;
  // Area — "o (łącznej) powierzchni <N> ha|m²" OR the abbreviated "o pow. <N> ha".
  const am = /o\s+(?:[łl][ąa]cznej\s+)?(?:powierzchni|pow\.?)\s*(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

/** Land street — a "przy ulic… <STREET>" that is NOT immediately "przy ulicy
 *  Wolności nr 18" (the office). The office street is always followed by "nr
 *  <num>"; a parcel street is followed by " i zapisan…/przeznaczon…", a comma,
 *  or a period. Returns the first non-office street, or null. */
export function landStreetFromText(text) {
  const re = /przy\s+ul(?:ic\w*|\.)\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘꟳÓóŃńĄą.\- ]{2,40}?)(\s+nr\s+\d|\s+i\s+|,|\.|;|$)/gi;
  let m;
  while ((m = re.exec(whole(text))) !== null) {
    if (/^\s+nr\s+\d/.test(m[2])) continue; // office "Wolności nr 18"
    return m[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

// ------------------------------------------------------------- announcement parse

/** Build one address-keyed record from a flat/commercial segment, or null. */
function flatRecord(segment, notionalKind, round, auction_date) {
  const address_raw = flatAddressRaw(segment);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const k = classifyKind(segment);
  const kind = k !== 'unknown' ? k : (notionalKind !== 'unknown' ? notionalKind : 'mieszkalny');
  const rec = {
    kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(segment),
    starting_price_pln: startingPriceFromText(segment),
    auction_date,
    round,
  };
  if (address.warning) rec.notes = [address.warning];
  return rec;
}

/**
 * Parse one ANNOUNCEMENT blob into active record(s). Flats/commercial notices are
 * split into one record per lokal; land (kind 'grunt') → one parcel-keyed record.
 * @param {string} text  blob from buildRecordText
 * @returns {Array<object>}  (empty if nothing usable)
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const body = whole(text);

  if (kind === 'grunt') {
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
    const rec = flatRecord(seg, kind, round, auction_date);
    if (rec) out.push(rec);
  }
  return out;
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED "Informacja o wynikach/dotycząca …" blob into result
 * record(s). Land → one parcel-keyed record; a flat result → one address-keyed
 * record. Sold ⇒ final_price_pln from the achieved figure; otherwise unsold.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const kind = kindFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
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
  return [{
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
    area_m2: unitAreaFromText(whole(text)),
    notes,
  }];
}
