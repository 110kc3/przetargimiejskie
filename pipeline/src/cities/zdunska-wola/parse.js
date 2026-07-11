// Zduńska Wola parsers.
//
// The BIP (Logonet eUrząd) exposes every auction as a structured XML record:
// adres-nieruchomosci, przetarg-na, typ-przetargu, rodzaj-nieruchomosci,
// cena-wywolawcza, data-przetargu, an INLINE <rozstrzygniecie> resolution, and
// a free-text <tresc> body. crawl.js strips each to plain text and assembles
// them into ONE labelled text blob via buildRecordText() (below); every parse
// function reads that blob. The test builds the SAME blob from real captured
// field strings, so the parsers are groundtruthed against live data without
// re-fetching.
//
// Active-vs-concluded is decided by <rozstrzygniecie>: EMPTY/absent while
// pending (→ announcement / active listing), FILLED once held (→ result /
// achieved price or negative outcome) — same convention as Chełmno. There is
// NO separate "Informacja o wyniku" page.
//
// UNLIKE Chełmno, this city's <przetarg-na> and <tresc> stay boilerplate
// ("PREZYDENT MIASTA Zduńska Wola zawiadamia, że ... odbędzie się: <ROUND>
// PRZETARG ... Szczegóły w załączniku.") while PENDING — no inline area, no
// parcel numbers, sometimes not even a numeric price (see CENA below). Full
// detail (parcel numbers, plot area, achieved price, buyer) only appears
// inline once <rozstrzygniecie> is filled in. So area/parcel fields are
// legitimately null on pending records — that's this source's real shape,
// not a parser gap; PDF attachments (not fetched by this html-source adapter)
// are the only place the detail lives while pending.
//
// All regexes groundtruthed against LIVE + Wayback-archived records
// (verified 2026-07-11):
//   LAND pending (round I):  id 12995  ul. Karola Szymanowskiego
//     przetarg-na "Pierwszy przetarg ustny nieograniczony na sprzedaż prawa
//     własności nw. nieruchomości niezabudowanej - ul. Karola
//     Szymanowskiego"; rodzaj "Nieruchomość niezabudowana"; cena "108 000,00
//     zł w tym podatek VAT według obecnie obowiązującej stawki"; data
//     "08                        .07                        .2026  godz.
//     09:00"; rozstrzygniecie absent (tag omitted entirely, not just empty).
//   LAND sold (round I):     id 12972  ul. Torowa
//     rozstrzygniecie "...w dniu 24.06.2026 r. ... odbył się pierwszy ustny
//     przetarg nieograniczony ... oznaczonej w ewidencji gruntów numerami
//     działek 185/5, 185/6 i 185/7 o łącznej powierzchni 9232 m2 ... Cena
//     wywoławcza nieruchomości – 320 000,00 zł ... Pierwszy przetarg ...
//     zakończył się wynikiem pozytywnym. Osobami wyłonionymi w wyniku
//     przeprowadzonego przetargu zostali Katarzyna i Paweł małż.
//     Wojciechowscy, którzy wylicytowali ww. nieruchomość za cenę 324
//     000,00 zł ..." — NOTE: area is BARE m2, not ha (no x10000 conversion);
//     NOTE: the buyer clause never uses the word "nabywca" — it says "Osobami
//     wyłonionymi ... zostali ..., którzy wylicytowali ... za cenę X zł" /
//     "wynikiem pozytywnym" (a Chełmno/Nakło-style "/nabywc/i" gate would
//     silently miss every sale here).
//   FLAT pending (round IV, via Wayback — record no longer live, aged out of
//     the board; see config.js header): id 12666  ul. 1 Maja 10 lokal nr 18
//     przetarg-na "Czwarty przetarg ustny nieograniczony na sprzedaż prawa
//     własności nw. nieruchomości lokalowej - ul. 1 Maja 10 lokal nr 18";
//     rodzaj "Nieruchomość lokalowa" (NOT "Lokal mieszkalny" — a distinct
//     kind_id on this board's own filter that classifyKind() can't place, see
//     kindFromText); cena "w treści ogłoszenia" (non-numeric — the real
//     price, 185 000 zł per the spike's PDF read, is NOT in any HTML/XML
//     field, only the attachment); data "20 .11 .2025 godz. 09:00".
//   BONIFIKATA tenant sale (SKIP, structurally out of namespace — see
//     config.js header): "OBWIESZCZENIE w sprawie podania do publicznej
//     wiadomości wykazu dotyczącego lokali mieszkalnych przeznaczonych do
//     sprzedaży na rzecz najemców ... – w trybie bezprzetargowym." (real text,
//     bip.zdunskawola.pl/artykul/406/12899/..., captured 2026-07-11).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ------------------------------------------------------------------ numbers

// "108 000,00" / "320 000,00 zł w tym podatek VAT ..." / "9232" -> integer.
// Space (regular/NBSP) OR dot thousands separator; optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "27,67" / "25.89" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
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
 * already-stripped field strings; the test passes the raw captured strings
 * and lets stripHtml run. One line per field so `^LABEL:` (multiline) reads
 * each.
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

/** PRZETARGNA + TRESC + ROZSTRZYGNIECIE joined — the free-text search space
 *  for area/parcel extraction (see file header: full detail only appears
 *  once a record is resolved). */
function freeText(text) {
  return [field(text, 'PRZETARGNA'), field(text, 'TRESC'), field(text, 'ROZSTRZYGNIECIE')].join(' ');
}

// ----------------------------------------------------------------- doc-type gate

/** A record is CONCLUDED when its <rozstrzygniecie> resolution is non-empty
 *  (the tag is entirely OMITTED from the XML while pending — confirmed live
 *  on ul. Karola Szymanowskiego — so field() correctly reads '' either way). */
export function hasResolution(text) {
  return field(text, 'ROZSTRZYGNIECIE').length > 0;
}

/** True when this record should NEVER be treated as a municipal sale:
 *  DZIERŻAWA/NAJEM (lease/rental — e.g. TBS "Złotnicki") or a bonifikata
 *  tenant sale ("... na rzecz najemców ... w trybie bezprzetargowym"). Per
 *  config.js's header, NEITHER should structurally ever reach this board (TBS
 *  is a separate host+CMS; bonifikata wykazy live under /artykul/406/..., a
 *  different URL namespace) — this is a defense-in-depth guard, not a filter
 *  this crawl is expected to exercise often. Checked BEFORE routing
 *  hasResolution/parseAnnouncement.
 *
 *  DELIBERATELY does NOT match on the bare surname "Złotnicki": every single
 *  record's TRESC boilerplate names the auction VENUE as "Urzędu Miasta
 *  Zduńska Wola ul. Stefana Złotnickiego nr 12 - Gabinet Radnego" (groundtruthed
 *  on both the Torowa and Szymanowskiego fixtures below) — a street named
 *  after the same person the TBS company is named after, coincidentally. A
 *  bare surname match would therefore false-positive on EVERY record on this
 *  board; only the "TBS" acronym itself (never observed in the legitimate
 *  boilerplate) is safe to gate on. */
export function isSkippable(text) {
  const t = text || '';
  return (
    /bezprzetargow/i.test(t) ||
    /na\s+rzecz\s+najemc/i.test(t) ||
    /dzier[żz]aw/i.test(t) ||
    /\bnajem\b/i.test(t) ||
    /\bTBS\b/.test(t)
  );
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

/** Map a captured ordinal token (Roman OR a Polish word, any declension) to a
 *  round number via prefix match, or null. */
function ordinalToRound(token) {
  const r = romanToInt(token);
  if (r) return r;
  const key = token.toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  return null;
}

/**
 * Auction/rokowania round. PRIMARY: PRZETARGNA opens DIRECTLY with the
 * ordinal ("Pierwszy przetarg ustny nieograniczony na sprzedaż ...",
 * "Czwarty przetarg ustny nieograniczony ...") — no "ogłasza" preamble, no
 * prior-round history trap. Roman numerals are NOT observed in PRZETARGNA
 * live, but DO appear in attachment filenames ("Ogłoszenie o IV przetargu -
 * ul. 1Maja 10 m. 18.pdf"), so both forms are matched defensively. FALLBACK:
 * TRESC restates the round in an ALL-CAPS clause ("CZWARTY PRZETARG USTNY
 * NIEOGRANICZONY") and ROZSTRZYGNIECIE restates it in the closing outcome
 * sentence ("Pierwszy przetarg ... zakończył się wynikiem pozytywnym") — both
 * anchored the same way. Returns null when unstated everywhere.
 */
export function roundFromText(text) {
  const na = field(text, 'PRZETARGNA');
  let m = /^\s*([IVXL]{1,5})\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  m = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  for (const label of ['TRESC', 'ROZSTRZYGNIECIE']) {
    const t = field(text, label);
    m = /\b([IVXL]{1,5})\s+(?:przetarg|rokowani)/i.exec(t);
    if (m) {
      const r = romanToInt(m[1]);
      if (r) return r;
    }
    m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:przetarg|rokowani)/i.exec(t);
    if (m) {
      const r = ordinalToRound(m[1]);
      if (r) return r;
    }
  }
  return null;
}

// ----------------------------------------------------------------- date

/**
 * Auction date. PRIMARY: the structured DATA field ("08 .07 .2026  godz.
 * 09:00" — dots padded with long whitespace runs, same shape as Chełmno/
 * Nakło). FALLBACK: a "w dniu D month YYYY" clause in TRESC's boilerplate
 * ("zawiadamia, że w dniu 8 lipca 2026 r. ... odbędzie się"). -> ISO / null.
 */
export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const tresc = field(text, 'TRESC');
  const PL_MONTH = {
    stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
    lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
    'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
  };
  m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tresc);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. PRIMARY: the LEADING number in the structured CENA field
 *  ("108 000,00 zł w tym podatek VAT ..." / "320 000,00 zł ..."). CENA is
 *  sometimes NOT a number at all — "w treści ogłoszenia" ("[stated] in the
 *  text of the announcement", groundtruthed on ul. 1 Maja 10/18 — the real
 *  figure lives only in the PDF attachment) — the leading-digit anchor fails
 *  cleanly on that (returns null; callers note "missing starting price", the
 *  standard pattern for every analog adapter) rather than misparsing it. */
export function startingPriceFromText(text) {
  const cena = field(text, 'CENA');
  const m = /^(\d[\d.\s ]*(?:,\d{2})?)/.exec(cena);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY from ROZSTRZYGNIECIE, and ONLY the buyer's bid
 *  ("... którzy wylicytowali ww. nieruchomość za cenę 324 000,00 zł ...").
 *  UNLIKE Chełmno/Nakło this city's boilerplate never uses the word
 *  "nabywca" — the gate here is simply "did a 'za cenę X zł' amount appear in
 *  the resolution", which only happens in the buyer-selection sentence (see
 *  isPositiveOutcome / buyerFromText for the surrounding language). A numeric
 *  value ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  if (!roz) return null;
  const m = /za\s+cen[ęe]\s+(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(roz);
  return m ? parsePLN(m[1]) : null;
}

/** Buyer name(s) from the resolution's selection clause: "Osobami
 *  wyłonionymi w wyniku przeprowadzonego przetargu zostali Katarzyna i Paweł
 *  małż. Wojciechowscy, którzy wylicytowali ..." (plural, groundtruthed) /
 *  "Osobą wyłonioną w wyniku przeprowadzonego przetargu został(a) ..., który/
 *  która wylicytował(a) ..." (singular form, kept defensively — not observed
 *  live). Returns null when absent (unsold, or an un-groundtruthed phrasing). */
export function buyerFromText(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  const m = /Osob(?:ami|ą)\s+wy[łl]on\w*\s+w\s+wyniku\s+przeprowadzonego\s+przetargu\s+zosta[łl]\w*\s+([^,]+?),\s*kt[óo]r/i.exec(roz);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/** True when the resolution explicitly states a POSITIVE (sold) outcome:
 *  "... zakończył się wynikiem pozytywnym." (groundtruthed, ul. Torowa). */
export function isPositiveOutcome(text) {
  return /wynikiem\s+pozytywnym/i.test(field(text, 'ROZSTRZYGNIECIE'));
}

/** True when the resolution explicitly states a NEGATIVE (unsold) outcome.
 *  "wynikiem negatywnym" mirrors the positive phrasing groundtruthed above;
 *  the remaining alternatives are the standard Logonet-family vocabulary
 *  (wadium not paid / nobody entered / no bids / annulled) kept defensively —
 *  NOT groundtruthed against a live Zduńska Wola unsold record (none was
 *  found among the handful of concluded records reachable at build time). */
export function isNegativeOutcome(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  return /wynikiem\s+negatywnym|nie\s+w(?:p[łl]aci|niesi)\w*\s+wadi|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi[łl]\s+ż|brak\s+ofert|uniewa[żz]ni/i.test(roz);
}

// ----------------------------------------------------------------- kind

/** Kind from the "Rodzaj nieruchomości" field, falling back to the
 *  przetarg-na sale clause. "Nieruchomość niezabudowana" → grunt (land.json);
 *  "Lokal mieszkalny" → mieszkalny; "Lokal użytkowy" → uzytkowy;
 *  "Nieruchomość zabudowana" → zabudowana. This board's OWN filter dropdown
 *  also exposes a FIFTH kind, "Nieruchomość lokalowa" (kind_id=6) —
 *  classifyKind() can't place it (it only matches "lokal ... mieszkalny", not
 *  a bare "nieruchomość lokalowa"). Groundtruthed live: ul. 1 Maja 10/18 (a
 *  confirmed residential flat, round IV, cena wywoławcza 185 000 zł per the
 *  spike) carries rodzaj-nieruchomosci = "Nieruchomość lokalowa" verbatim. So
 *  that kind defaults to mieszkalny (the overwhelmingly common case on this
 *  board) unless the free text signals commercial. */
export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  if (/nieruchomo[śs][ćc]\s+lokalow/i.test(rodzaj)) {
    return /lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)/i.test(freeText(text)) ? 'uzytkowy' : 'mieszkalny';
  }
  return classifyKind(field(text, 'PRZETARGNA'));
}

// ----------------------------------------------------------------- address

/** Strip the leading locality + normalise "ul.X" spacing from the raw
 *  adres-nieruchomosci ("Zduńska Wola, ul. Torowa" / "Zduńska Wola, ul. 1
 *  Maja 10 lokal nr 18"). */
function cleanAdres(raw) {
  return (raw || '')
    .replace(/^\s*Zdu[nń]ska\s+Wola\s*,?\s*/i, '')
    .replace(/\bw\s+Zdu[nń]skiej\s+Woli\b/gi, ' ')
    .replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Trailing "lokal nr N" apartment suffix ("ul. 1 Maja 10 lokal nr 18").
const UNIT_SUFFIX_RE = /\s+lokal\s+nr\s+(\d+[A-Za-z]?)\s*$/i;

/**
 * "<street> [<bldg>][/<apt>]" raw address for a flat/land plot, or null. The
 * building is always the LAST whitespace-separated numeric token (an
 * optional "nr " immediately before it is tolerated defensively — not
 * observed live, but the URL slugs for some archived land records suggest it
 * may occur, e.g. ".../ul-jodlowa-nr-51"). This correctly handles a NUMERIC
 * street name ("1 Maja 10" -> street "1 Maja", building "10"): the lazy `.+?`
 * in the building regex keeps growing the street group until the remainder
 * is purely a trailing number, so it can never stop at the street's own
 * leading digit. Land plots often carry no building number at all (kept
 * null, e.g. "ul. Torowa" / "ul. Karola Szymanowskiego" — both groundtruthed
 * live with no number).
 */
export function addressRawFromText(text) {
  let s = cleanAdres(field(text, 'ADRES'));
  if (!s) return null;
  s = s.replace(/^(?:ul|al|pl|os)\.\s*/i, '');
  let unit = null;
  const um = UNIT_SUFFIX_RE.exec(s);
  if (um) {
    unit = um[1];
    s = s.slice(0, um.index).trim();
  }
  const bldgM = /^(.+?)\s+(?:nr\.?\s+)?(\d+[A-Za-z]?)\s*$/.exec(s);
  const street = bldgM ? bldgM[1].trim() : s;
  const building = bldgM ? bldgM[2] : null;
  if (!street) return null;
  return `ul. ${street}${building ? ` ${building}` : ''}${unit ? `/${unit}` : ''}`;
}

// Usable floor area of a flat/unit: "o powierzchni użytkowej N m2" / "o pow.
// użytkowej N m2". NOT groundtruthed against a live Zduńska Wola example (no
// resolved-flat record was reachable, and the one pending flat's area, 64,40
// m2 per the spike, lives only in a PDF attachment this html-source adapter
// does not fetch — see file header). Kept for when a record states it inline
// (this board fills in full detail only once resolved, same pattern as
// land — see plotFromText), using the same vocabulary as the sibling Logonet
// adapters (Chełmno/Nakło/Tarnowskie Góry).
const UNIT_AREA_RE =
  /lokal\w*(?:\s+mieszkaln\w+|\s+u[żz]ytkow\w+)?[\s\S]{0,60}?o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2](?!\d)/i;

/** Usable floor area (m2) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(freeText(text));
  return m ? parseArea(m[1]) : null;
}

// Land plot(s): "oznaczonej w ewidencji gruntów numerami działek 185/5,
// 185/6 i 185/7 o łącznej powierzchni 9232 m2" (groundtruthed live, ul.
// Torowa result). NOTE — the area unit here is BARE m2, NOT hectares like
// Chełmno/Nakło/Tarnowskie Góry ("o powierzchni ... ha", x10000 conversion) —
// do NOT apply that conversion for this city. A single-parcel fallback
// ("działka nr N o powierzchni M m2") is kept defensively (not observed
// live — every land record seen so far is a multi-parcel "łącznej
// powierzchni" complex).
//
// The root is matched as `dzia[łl]\w*` — NOT `dzia[łl]k\w*` — because the
// genitive plural "działek" (as in "numerami działek 185/5, ...") is a
// mobile-e Polish declension ("dział" + "ek"), not "działk" + a suffix; a
// literal "k" hard-coded right after "ł" (matching działka/działki/działką)
// silently fails to match działek specifically. Caught by the test suite:
// the live Torowa fixture is a genitive-plural "działek" phrasing.
const PLOT_LIST_RE =
  /dzia[łl]\w*\s+(\d+(?:\/\d+)?(?:\s*(?:,|i)\s*\d+(?:\/\d+)?)*)\s+o\s+[łl][ąa]cznej\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i;
const PLOT_SINGLE_RE =
  /dzia[łl]\w*\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i;

/** @returns {{ dzialka_nr: string|null, area_m2: number|null }} */
export function plotFromText(text) {
  const s = freeText(text);
  let m = PLOT_LIST_RE.exec(s);
  if (m) {
    const parcels = m[1].split(/\s*(?:,|i)\s*/).filter((p) => /^\d+(?:\/\d+)?$/.test(p));
    const area = Number(m[2].replace(',', '.'));
    return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2: area > 0 ? Math.round(area) : null };
  }
  m = PLOT_SINGLE_RE.exec(s);
  if (m) {
    const area = Number(m[2].replace(',', '.'));
    return { dzialka_nr: m[1], area_m2: area > 0 ? Math.round(area) : null };
  }
  return { dzialka_nr: null, area_m2: null };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction) record blob into a single active
 * record, or null. Land (kind 'grunt') → parcel-keyed record for land.json
 * (falls back to a street-only address_raw while pending — see file header,
 * dzialka_nr/area_m2 are usually null until resolved); flats/units →
 * address-keyed record.
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
    const plot = plotFromText(text);
    const address_raw = addressRawFromText(text);
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
 * Parse one CONCLUDED record blob (non-empty ROZSTRZYGNIECIE) into a
 * concluded auction record. Returns 0 or 1 record (array = framework
 * interface). Joins its property by address (+ flat-no) + round in
 * build-properties.
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
  const buyer = sold ? buyerFromText(text) : null;
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = plotFromText(text);
    const address_raw = addressRawFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        buyer,
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
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      buyer,
      notes,
    },
  ];
}
