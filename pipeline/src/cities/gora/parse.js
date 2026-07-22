// Góra parsers — flats (lokale mieszkalne) only.
//
// The data lives inside DOCX/PDF attachments linked from two BIP boards
// (bip.gora.com.pl, 2ClickPortal). Two document families:
//
//   RESULT NOTICE (/wyniki-przetargow.html) — either
//     (a) a LINEARIZED TABLE (docText emits every LABEL first, then every
//         VALUE in the same order): "INFORMACJA O WYNIKU PRZETARGU … Data i
//         miejsce przetargu / Rodzaj przetargu / … / Cena wywoławcza w zł /
//         Najwyższa cena osiągnięta w przetargu / Imię i Nazwisko …  16.02.2024
//         r. Urząd Miasta i Gminy w Górze / Przetarg ustny nieograniczony /
//         Lokal mieszkalny położony w miejscowości Kłoda Górowska 28/7 / … /
//         31 000,00 zł / 68 000,00 zł / Alina Jan Mendyka" — because label and
//         value are far apart, the two prices are read POSITIONALLY: the money
//         tokens carrying "zł" in document order are [cena wywoławcza,
//         najwyższa cena osiągnięta]. A NEGATIVE table has only ONE zł token
//         (the wywoławcza; osiągnięta is "-") plus an explicit "wynikiem
//         negatywnym" sentence.
//     (b) FREE PROSE (older rokowania notices): "W dniu 30 września 2021 r. …
//         odbyły się rokowania … Cena wywoławcza do rokowań wynosiła
//         27 600,00 zł. Cena osiągnięta … wyniosła 32 000,00 zł. Nabywcą …" —
//         same positional [wywoławcza, osiągnięta] money order holds.
//
//   ANNOUNCEMENT (/233-przetargi.html) — a clean labelled ogłoszenie:
//     "Burmistrz Góry ogłasza I przetarg ustny nieograniczony na sprzedaż
//      wolnego lokalu mieszkalnego w miejscowości Brzeżany 42/2 … Powierzchnia
//      użytkowa lokalu wynosi 36,50 m2 … Cena wywoławcza w zł. 57 000,00 zł …
//      Przetarg odbędzie się … w dniu 18.08.2026 r." — the auction date is
//      taken from the "PRZETARG ODBĘDZIE SIĘ … W DNIU <date>" anchor (numeric
//      DD.MM.YYYY or long-form "9 sierpnia 2024"), rokowania from "Rokowania
//      zostaną przeprowadzone w dniu <date>".
//
// ADDRESS shapes (both boards share the same phrase vocabulary, so one
// extractor serves both): "przy ul./pl. <StreetGen> <bldg>/<apt>" (Wrocławskiej
// 26/3, B. Chrobrego 2/2, Armii Polskiej 9/7) and, for villages, "w
// miejscowości <Locality> <bldg>/<apt>" (Kłoda Górowska 28/7, Brzeżany 42/2).
// The flat address is ALWAYS a "<bldg>/<apt>" slash form; the office/venue
// address ("ul. Mickiewicza nr 1", "ul. Adama Mickiewicza 1", postal "56-200")
// never carries the slash — so requiring the slash keeps the venue out.
//
// Groundtruthed 2026-07-21 against LIVE DOCX/PDF fetched from bip.gora.com.pl
// (see tests/parse-gora.test.js). SCOPE: flats only — land/dzierżawa/lokal
// użytkowy results are filtered out at the slug level in crawl.js and, as a
// backstop, by classifyKind here.
//
// See spike: spikes/dolnoslaskie/powiat-gorowski/gora.md

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money ────────────────────────────────────────────────────────────────────

// Dot OR space (regular + NBSP) thousands groups, optional ",NN" grosze tail —
// the separator itself optional between groups (matches "31 000,00",
// "100 850,00", "44 652,00", "57000", "9 925,00").
const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\d{1,2})?';

/** "31 000,00" / "100.850,00" / "57000" -> integer PLN, or null. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s ]/g, '').replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Every "<amount> zł" / "<amount> złotych" money token, in document order.
// "w zł." (a label) has no digits before "zł" so it never matches.
const MONEY_ZL_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'gi');

/** All zł-denominated amounts in a text, in order (integers). */
export function moneyTokensZl(text) {
  return [...String(text || '').matchAll(MONEY_ZL_RE)]
    .map((m) => parsePLN(m[1]))
    .filter((n) => n != null);
}

// Announcement starting price: labelled "Cena wywoławcza w zł. <money>" /
// "Cena wywoławcza do rokowań wynosi <money>" — the value directly follows the
// label in the ogłoszenie template.
const ANN_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcza(?:\\s+do\\s+rokowa[nń])?[\\s\\S]{0,30}?(${MONEY})\\s*z[łl]`,
  'i',
);
/** Starting price from an ANNOUNCEMENT body ("Cena wywoławcza …"), or null. */
export function startingPriceAnnouncement(text) {
  const m = ANN_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── Area (flats only) ────────────────────────────────────────────────────────

// "Powierzchnia użytkowa lokalu wynosi 36,50 m2" (announcement). Result notices
// don't state the flat's usable area (only the underlying plot's ha, which is
// deliberately NOT matched here — 'ha' ≠ 'm'), so area is enriched onto the
// result records via the shared property key from the announcement stream.
const FLAT_AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w*\s+lokalu\s+wynosi\s+(\d+(?:[.,]\d+)?)\s*m/i;
/** Usable floor area (m²) of a flat from an announcement, or null. */
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Round (roman numeral qualifying "przetarg") ──────────────────────────────

const ROUND_RE = /\b(VIII|VII|III|VI|IV|IX|II|V|I|X)\s+przetarg\w*/i;
const ROUND_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/**
 * Round from a roman numeral directly qualifying "przetarg[u]" ("ogłasza I
 * przetarg ustny", "INFORMACJA O WYNIKU II PRZETARGU"). Returns null for a
 * bare "Przetarg ustny nieograniczony" (a first attempt whose ordinal is
 * implicit — build-properties then derives it from history) and for rokowania.
 * Anchored on "<numeral> przetarg" so the conjunction "Miasta i Gminy" / a
 * kondygnacja roman never false-matches.
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? (ROUND_NUM[m[1].toUpperCase()] ?? null) : null;
}

// ── Dates ────────────────────────────────────────────────────────────────────

const PL_MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05',
  czerwca: '06', lipca: '07', sierpnia: '08', września: '09', wrzesnia: '09',
  października: '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

/** "18.08.2026" / "9 sierpnia 2024" -> "2026-08-18" / "2024-08-09", or null. */
export function parsePolishDate(str) {
  if (!str) return null;
  const num = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str.trim());
  if (num) {
    const [, d, mo, y] = num;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const long = /^(\d{1,2})\s+(\p{L}+)\s+(\d{4})$/u.exec(str.trim());
  if (long) {
    const [, d, monRaw, y] = long;
    const mo = PL_MONTHS[monRaw.toLowerCase()];
    if (mo) return `${y}-${mo}-${d.padStart(2, '0')}`;
  }
  return null;
}

const NUMERIC_DATE_RE = /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/;
const LONG_DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+(${Object.keys(PL_MONTHS).join('|')})\\s+(\\d{4})\\b`, 'iu');

/**
 * Auction date from a RESULT notice: the first numeric DD.MM.YYYY (the table
 * value, e.g. "16.02.2024 r. Urząd Miasta …"), falling back to the first
 * long-form Polish date ("W dniu 30 września 2021 r." — the prose rokowania
 * form has no numeric date at all). Result notices never cite a legal-reg
 * numeric date, so the first numeric date is the auction date.
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromResult(text) {
  const t = text || '';
  const num = NUMERIC_DATE_RE.exec(t);
  if (num) return parsePolishDate(num[1]);
  const long = LONG_DATE_RE.exec(t);
  if (long) return parsePolishDate(`${long[1]} ${long[2]} ${long[3]}`);
  return null;
}

// "PRZETARG ODBĘDZIE SIĘ … W DNIU <date>" / "Rokowania zostaną przeprowadzone
// w dniu <date>" — the date may be numeric or long-form. The lazy [\s\S]{0,180}
// grabs the FIRST "w dniu" after the auction-happens anchor (in the II-przetarg
// PDF a later "Pierwszy przetarg … odbył się w dniu 19.02.2021 r." must not win).
const ANN_DATE_RE = new RegExp(
  `(?:przetarg\\s+odb[ęe]dzie\\s+si[ęe]|rokowania\\s+(?:zostan[ąa]\\s+przeprowadzone|odb[ęe]d[ąa]\\s+si[ęe]))` +
    `[\\s\\S]{0,180}?w\\s+dniu\\s+(\\d{1,2}\\.\\d{1,2}\\.\\d{4}|\\d{1,2}\\s+\\p{L}+\\s+\\d{4})`,
  'iu',
);
/** Auction/rokowania date from an ANNOUNCEMENT body ("… odbędzie się … w dniu …"). */
export function auctionDateFromAnnouncement(text) {
  const m = ANN_DATE_RE.exec(text || '');
  return m ? parsePolishDate(m[1]) : null;
}

// ── Address (flats — one extractor for both boards) ──────────────────────────

const U = 'A-ZĄĆĘŁŃÓŚŹŻ';
const L = 'A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż';
// "<bldg>/<apt>" — e.g. 28/7, 26/3, 42/2, 9/7, 15/6 (letters tolerated: 1A/3).
const BLD = '(\\d{1,4}[A-Za-z]?)\\s*/\\s*(\\d{1,3}[A-Za-z]?)';

// "przy ul. Wrocławskiej 26/3" / "w Górze ul. Armii Polskiej 9/7" / "pl. B.
// Chrobrego 2/2" — the "przy" is optional, the prefix is ul./pl./al./os.
const STREET_ADDR_RE = new RegExp(
  `(?:przy\\s+)?(?:ul|pl|al|os)\\.\\s*([${U}][${L}.]*(?:\\s+[${U}]?[${L}.]*){0,3}?)\\s+${BLD}`,
  'u',
);
// "w miejscowości Kłoda Górowska 28/7" / "w miejscowości Brzeżany 42/2".
const LOCALITY_ADDR_RE = new RegExp(
  `w\\s+miejscowo[śs]ci\\s+([${U}][${L}.]*(?:\\s+[${U}][${L}.]*){0,3}?)\\s+${BLD}`,
  'u',
);

/**
 * Extract a raw "<street> <bldg>/<apt>" flat address from Góra auction prose
 * (a result notice or an announcement — same vocabulary). Tries the "ul./pl.
 * <street> N/M" form first (town flats), then the "w miejscowości <locality>
 * N/M" form (village flats). Returns null when no slash-form flat address is
 * present — so the office/venue address (no slash) is never mistaken for it.
 * @param {string} text
 * @returns {string|null}
 */
export function extractFlatAddress(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  let m = STREET_ADDR_RE.exec(t);
  if (!m) m = LOCALITY_ADDR_RE.exec(t);
  if (!m) return null;
  return `${m[1].trim()} ${m[2]}/${m[3]}`;
}

// ── Outcome / result gating ──────────────────────────────────────────────────

const NEGATIVE_RE =
  /wynikiem\s+negatywnym|brak\w*\s+uczestnik|brak\w*\s+os[óo]b\s+ch[ęe]tnych|nie\s+wp[łl]aci[łl]\s+wadium|nie\s+odnotowano\s+wp[łl]at/i;

/** True when the notice explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

/**
 * True when a text reads as a RESULT notice (guards the results-board router).
 * Anchored on the "INFORMACJA O WYNIKU …" title (present in every Góra result
 * notice) plus explicit outcome sentences — deliberately NOT a bare "cena
 * osiągnięta", because every ANNOUNCEMENT carries the boilerplate "Cena
 * osiągnięta w przetargu płatna najpóźniej …" future-payment clause, which is
 * not an achieved price and must not mark an ogłoszenie as a result.
 * @param {string} text
 * @returns {boolean}
 */
export function isResultNotice(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynikiem\s+(?:negatywnym|pozytywnym)/i.test(t) ||
    /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]t\w*\s+w\s+(?:wyniku|rokowaniach)/i.test(t)
  );
}

// ── Result records ───────────────────────────────────────────────────────────

/**
 * Parse a Góra RESULT notice (linearized-table OR free-prose DOCX/PDF text)
 * into a concluded flat-auction record. Flats only — non-flat text returns [].
 *
 * Prices are positional: the zł money tokens in document order are
 * [cena wywoławcza, najwyższa cena osiągnięta]. A SOLD notice has ≥2 tokens and
 * no explicit "wynikiem negatywnym"; a NEGATIVE notice has one token (the
 * wywoławcza; osiągnięta is "-") plus the negative sentence, so final = null.
 *
 * @param {string} text
 * @param {string|null} [fallbackDate]  ISO date from the crawl (Góra crawl passes null)
 * @param {string|null} [sourceUrl]     the DOCX/PDF attachment URL
 * @returns {Array<object>}  0 or 1 record
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const money = moneyTokensZl(t);
  const negative = isNegativeOutcome(t);
  const sold = !negative && money.length >= 2;

  const starting_price_pln = money.length ? money[0] : null;
  const final_price_pln = sold ? money[1] : null;

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (/rokowa[nń]/i.test(t)) notes.push('procedure: rokowania');

  return [
    {
      auction_date: auctionDateFromResult(t) || fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: flatAreaFromText(t),
      notes,
    },
  ];
}

// ── Announcement records (active listings) ───────────────────────────────────

/**
 * Parse a Góra ANNOUNCEMENT body into an active flat-listing record. Returns
 * null when it isn't a flat, has no keyable address, or carries no auction
 * date (e.g. a wykaz / lista osób that slipped past the slug filter — a real
 * przetarg/rokowania announcement always states its date).
 * @param {string} text
 * @param {string|null} [sourceUrl]  the DOCX/PDF attachment URL
 * @returns {object|null}
 */
export function parseAnnouncement(text, sourceUrl = null) {
  if (!text) return null;
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return null;

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const auction_date = auctionDateFromAnnouncement(t);
  if (!auction_date) return null; // not a scheduled auction (wykaz/lista) — skip

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: flatAreaFromText(t),
    starting_price_pln: startingPriceAnnouncement(t),
    auction_date,
    round: roundFromText(t),
    source_url: sourceUrl,
    detail_url: sourceUrl,
  };
}
