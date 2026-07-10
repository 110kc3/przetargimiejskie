// Pleszew parsers. bip.pleszew.pl (WOKISS BIP) serves a single consolidated
// year-board HTML page per year; each entry's inline prose is a short teaser
// (used only to classify+route), while price/date/wadium/area live in the
// linked born-digital PDF (pdftotext, no OCR needed). See config.js for the
// full source-shape write-up.
//
// Groundtruthed against REAL live documents fetched 2026-07-10 from
// bip.pleszew.pl (board pages + PDFs) — see parse-pleszew.test.js for the
// verbatim fixtures. Key real chains captured:
//   ul. Zachodnia 1, lokal nr 1 (1/2 udział): Wykaz (25.09.2024, genuine
//     pre-auction sale designation) -> I przetarg (31.10.2024, 122 260 zł,
//     auction 2024-12-05) -> WYNIK negatywny (brak oferentów) -> II przetarg
//     (20.01.2025, same 122 260 zł, auction 2025-02-26) -> WYNIK negatywny
//     again (still recycling as of 2026-07-10, no III przetarg posted yet).
//   Kalisz, ul. Młynarska 13, "nieruchomość lokalowa" nr 4 (a Pleszew-owned
//     unit physically in neighbouring Kalisz — KW prefix KZ1A, Sąd Rejonowy
//     w Kaliszu, not KZ1P): I przetarg (19.08.2024, 232 500 zł) unsold ->
//     II przetarg (30.10.2024) -> WYNIK pozytywny: sold for 227 000 zł to
//     Julita Szaleniec.
//   Land (multi-parcel, table-priced): Kuczków 4 działki (II przetarg,
//     12.07.2024, per-parcel prices "dla działki NR – KWOTA zł"); Nowa Wieś
//     3 działki, recycled I(2025-07-08)->II(2025-09-15)->III(2026-04-15,
//     unsold, brak wadium)->IV (2026-08-18, CURRENTLY OPEN as of
//     2026-07-10 — posted 2026-07-09, the freshest live fixture in this
//     file), table format "NR   AREA ha   [KW]   PRICE zł" per row.
//   Land (single-parcel, sold): Kowalewo dz. 6/6 (81 450,60 zł ->
//     82 270,60 zł, Maksym Bruder); Zawidowice dz. 111 (15 990 zł ->
//     16 150 zł, Agnieszka i Tomasz Pilarczyk); Lenartowice dz. 136/6,
//     ustny OGRANICZONY (12 935 zł netto -> 13 065 zł netto, Emilia i
//     Ryszard Kujawscy).
//   Land (single-parcel, unsold): Sowin dz. 138/39 (63 960 zł, brak wadium).
//   Skip cases (verified real, must never reach a listing): Wykaz "zamierza
//     wydzierżawić" (ul. Piaski 41 grunt, dzierżawa); a rarer trap — an
//     "Ogłoszenie ... ogłasza przetarg ustny nieograniczony NA
//     WYDZIERŻAWIENIE ..." (same ul. Piaski 41 grunt) — same "ogłasza
//     <verb> przetarg" shape as a real sale announcement, differing only in
//     the object verb (wydzierżawienie, not sprzedaż) — the sale/lease
//     gate below inspects the whole teaser, not just the "ogłasza" anchor.
//
// Two REAL bugs caught + fixed while groundtruthing field extractors
// against these fixtures (before writing the test file — see
// pleszew-validate.mjs style checks done live against fetched text):
//   1. flatAptFromText/parcelFromText originally used a bare `\w*` (or a
//      fixed 3-way suffix alternation) after the "lokal"/"działk" stem.
//      JS's `\w` is ASCII-only, so it silently failed to consume Polish
//      accusative-case endings that are themselves diacritics: "nieruchomość
//      lokalOWĄ nr 4" (Kalisz's OWN wykaz — "wykazuje do sprzedaży ...
//      nieruchomość lokalową") and "zamierza sprzedać działkĘ nr 117"
//      (Piekarzewo wykaz) both failed to match with the ASCII-only version.
//      Fixed by using an explicit Polish-diacritic-inclusive class instead
//      of bare `\w*` after these stems (matches normalize.js's own
//      convention for street-name classes).
//   2. miejscowoscFromText's second-word capture (for two-word localities
//      like "Nowa Wieś") used a single case-insensitive regex, which let the
//      supposedly-uppercase-anchored second-word class also match a
//      following LOWERCASE word ("Zawidowicach oznaczonej", "Kaliszu przy"
//      instead of just "Zawidowicach"/"Kaliszu") because the `i` flag
//      applies to the whole pattern including that class. Fixed by dropping
//      the blanket `i` flag and spelling out both-case alternatives only for
//      the anchor words, leaving the locality-name capture's uppercase
//      requirement genuinely case-sensitive.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// Polish diacritics not covered by JS's ASCII-only `\w` — appended to `\w`
// wherever we need to consume a declined suffix directly on a stem (no
// space), e.g. "lokalOWĄ" (accusative) / "działkĘ" (accusative). Using a
// fixed 2/3-way suffix alternation instead of this class is what caused real
// bug #1 above (see file header) — those forms are silently unmatched.
const PL = 'żźćłśąęóńŻŹĆŁŚĄĘÓŃ';
const WC = `[\\w${PL}]*`; // "word char, Polish-aware, zero or more"

// ---------------------------------------------------------------------------
// Shared text helpers
// ---------------------------------------------------------------------------

export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "122.260" / "24.452" (dot-thousands, no decimal) / "91.020,00" (dot-
// thousands, comma-decimal) / "227 000" (space-thousands, no decimal) /
// "82.270,60" -> integer PLN (grosze truncated), or null. A single, more
// permissive rule than a strict "thousands group" check: strip a trailing
// 2-digit decimal fraction (comma OR dot) if present, then strip every
// remaining space/dot/comma separator and parse what's left as an integer.
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).trim();
  cleaned = cleaned.replace(/[,.](\d{2})$/, ''); // strip trailing grosze fraction
  cleaned = cleaned.replace(/[\s.,]/g, ''); // strip thousands separators
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "69,10" / "0,1014" -> float, or null.
export function parseArea(s) {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};
const MONTH_ALT = Object.keys(PL_MONTHS).filter((k) => k !== 'wrzesnia' && k !== 'pazdziernika').join('|');

// "5 grudnia 2024" / "05.12.2024" -> ISO date, or null.
export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Field extractors — operate on PDF text (pdftotext -layout) or, for the
// classification helpers, on the board's stripped inline teaser text.
// ---------------------------------------------------------------------------

const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

// Round: primarily the announcement's own operative verb, "Ogłasza <ROMAN>
// przetarg" (capitalised at the start of its own sentence in every real
// fixture — "O"/"o" both allowed — but the roman-numeral group itself is
// deliberately left case-SENSITIVE/uppercase-only so a bare lowercase "i"
// (the Polish conjunction "and") can never false-match, same rationale as
// chodziez). Falls back to the result-doc phrasings ("ustalono termin
// <ROMAN> przetargu", "o wyniku <ROMAN> przetargu", "odbył się <ROMAN>
// przetarg", "zakończył się <ROMAN> przetargiem"/"w wyniku <ROMAN>
// przetargu") — each anchor word spelled out for both first-letter cases
// instead of a blanket /i flag, for the same reason.
export function roundFromText(text) {
  const t = text || '';
  let m = /[Oo]g[łl]asza\s+(I{1,3}|IV|VI{0,3}|IX)\s+przetarg/.exec(t);
  if (m) return ROMAN_MAP[m[1]] ?? null;
  m = /(?:[Uu]stalono\s+termin|[Oo]dby[łl]\s+si[ęe]|[Zz]ako[ńn]czy[łl]\s+si[ęe]|[Ww]\s+wyniku|[Oo]\s+wyniku)\s+(I{1,3}|IV|VI{0,3}|IX)\s+przetarg/.exec(t);
  return m ? ROMAN_MAP[m[1]] ?? null : null;
}

// Auction date from "Przetarg odbędzie się [<location clause>] <D>
// <miesiąc> <YYYY> r." — the location clause (room/address) sometimes
// intervenes between "odbędzie się" and the actual date (multi-parcel
// notices name the venue before "w dniu <date>"), so the gap is bounded-lazy
// rather than a fixed short distance; the month-name anchor keeps a runaway
// match from ever occurring (matches the ADAPTER-GUIDE Kwiatowa lesson).
const AUCTION_DATE_RE = new RegExp(
  `[Pp]rzetarg\\s+odb[ęe]dzie\\s+si[ęe][\\s\\S]{0,160}?(\\d{1,2})\\s+(${MONTH_ALT})\\s+(\\d{4})`,
);
export function auctionDateFromText(text) {
  const m = AUCTION_DATE_RE.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

// Starting price: "cena wywoławcza <kwota> zł" (announcements — inline,
// lower-case, tail of the auction-date sentence) or "Cenę wywoławczą do
// <round> przetargu ... ustalono w wysokości <netto/brutto> <kwota> zł"
// (single-parcel land result docs). Bounded-lazy gap for the same reason as
// the auction date. NOT used for multi-parcel land (see parcelPriceFromText
// below — a shared "cena wywoławcza" sentence doesn't exist there).
const STARTING_PRICE_RE = /cen[a-ząćęłńóśźż]*\s+wywo[łl]awcz[a-ząćęłńóśźż]*[\s\S]{0,80}?([\d][\d\s.,]*)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// The Urząd's own street (never the property's address) — "W URZĘDZIE
// MIEJSKIM"-equivalent for Pleszew is "w Urzędzie Miasta i Gminy w
// Pleszewie" (no street token to collide with; Pleszew's notices name the
// room, not a street, for the office address) — kept as a documented no-op
// guard in case a future notice adds one; currently nothing to exclude.
const OFFICE_STREET_RE = /^$/; // intentionally never matches (see comment)

// First "przy ul. <Street Name(s)> <bldg>" match. Street names are given in
// whatever grammatical case the source uses (often genitive, e.g.
// "Zachodniej" for "Zachodnia") — stored as-stated, never force-normalized
// (matches the chodziez precedent + normalize.js's own documented
// -skiej/-ckiej ambiguity carve-out; nominativeStreetDisplay is applied
// centrally by build-properties.js, not per-adapter). NOTE (observed, not
// auto-healed): the SAME Kalisz street appears as nominative "Młynarska" in
// its own announcement PDFs but genitive "Młynarskiej" in its result/wykaz
// docs — a real source inconsistency; left as-is per the above.
export function streetBuildingFromText(text) {
  const re =
    /przy\s+ul\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*)*)\s+(\d+[A-Za-z]?)\b/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return { street, building: m[2].toUpperCase() };
  }
  return null;
}

// Flat/premises apt number from "lokal<any case ending> nr N" — e.g.
// "lokalowej nr 1" (genitive), "lokalową nr 4" (accusative — real bug #1,
// see file header), "Lokal mieszkalny nr 4" (nominative + explicit
// "mieszkalny"), "lokalu mieszkalnego nr 8".
const FLAT_APT_RE = new RegExp(`lokal${WC}\\s+(?:mieszkaln${WC}\\s+)?nr\\.?\\s*(\\d+[A-Za-z]?)`, 'i');
export function flatAptFromText(text) {
  const m = FLAT_APT_RE.exec(text || '');
  return m ? m[1] : null;
}

// Flat usable area from "o [łącznej] pow[ierzchni] użytkowej XX,XX m2".
export function flatAreaFromText(text) {
  const m = /(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s+u[żz]ytkowej\s+(\d+[,.]\d+)\s*m/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// classifyKind (core/classify-kind.js, shared vocabulary) doesn't recognize
// "nieruchomość lokalowa"/"nieruchomości lokalowej" — the legal term
// Pleszew's OWN documents consistently use for a flat/premises unit under
// its own KW (e.g. "sprzedaż 1/2 udziału w nieruchomości lokalowej nr 1")
// — as a flat signal; it only matches the more specific "lokal mieszkalny"
// phrase. Longer ANNOUNCEMENT/RESULT PDFs are safe (they always ALSO state
// "Lokal mieszkalny nr N położony jest ..." somewhere, which classifyKind's
// FLAT_RE catches before ever reaching its land check), but a WYKAZ
// entry's much shorter board teaser sometimes never says "mieszkalny" at
// all — and if it also cites the underlying co-owned plot ("na działce
// oznaczonej nr 2841 ..." — supplementary KW reference, NOT the sale
// object), classify-kind's LAND_RE matches that bare "działce" and
// misclassifies the whole record as land. REAL bug caught testing the live
// Zachodnia wykaz teaser (see WYKAZ_ZACHODNIA_GENUINE in the test file),
// which reads exactly that way. Overridden here — locally, not in the
// shared core file — whenever the "nieruchomość lokalowa" phrasing AND a
// "lokal... nr N" apartment number both appear (i.e. this unambiguously
// names a specific numbered premises unit, not a bare land parcel).
const PREMISES_RE = /nieruchomo[śs]ci?\s+lokalow[a-ząćęłńóśźż]*/i;
function classifyEntryKind(text) {
  const t = text || '';
  const kind = classifyKind(t);
  if (kind === 'grunt' && PREMISES_RE.test(t) && flatAptFromText(t)) return 'mieszkalny';
  return kind;
}

// ---- land helpers ----

// Single parcel from "działk<case ending> nr N[/N]" — either directly
// adjacent ("działki nr 917/1") or with a bounded gap for the common
// "działki niezabudowanej położonej w X oznaczonej ewidencyjnie nr 111"
// shape (Zawidowice/Lenartowice — no table, bare inline number). NOTE: for
// TABLE-formatted land (the "Nr działki / Pow. / Nr KW" 3-column layout used
// by Sowin/Kowalewo/Nowa-Wieś result docs, and Kuczków/Nowa-Wieś multi-
// parcel announcements) the parcel number is NOT textually adjacent to the
// word "nr" at all — use parcelsFromText below instead, which reads the
// table rows directly and is tried first by parseAnnouncementPage/
// parseResultDoc.
const PARCEL_ADJ_RE = new RegExp(`dzia[łl]k${WC}\\s+nr\\.?\\s*:?\\s*(\\d+(?:\\/\\d+)?)`, 'i');
const PARCEL_GAP_RE = new RegExp(`dzia[łl]k${WC}[\\s\\S]{0,80}?\\bnr\\.?\\s*(\\d+(?:\\/\\d+)?)\\b`, 'i');
export function parcelFromText(text) {
  const t = text || '';
  let m = PARCEL_ADJ_RE.exec(t);
  if (m) return m[1];
  m = PARCEL_GAP_RE.exec(t);
  return m ? m[1] : null;
}

// obręb (cadastral precinct) — "obręb NNNN [Miasto] <Name>" — present on
// some (not all) land notices; supplementary/display info only.
export function obrebFromText(text) {
  const m = /obr[ęe]b\s+\d+\s+(?:Miasto\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ]*)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

// Locality ("w miejscowości Nowa Wieś" / "położonej w Sowinie") — the
// second capture word is deliberately NOT under a blanket /i flag (real bug
// #2, see file header): only the anchor words ("w"/"miejscowości"/
// "położon...") get explicit both-case alternatives, so the locality name's
// uppercase-start requirement genuinely excludes a following lower-case
// word ("Zawidowicach oznaczonej" would otherwise wrongly include
// "oznaczonej"). Up to two capitalised words to catch "Nowa Wieś".
const NAME_RE = `[A-ZŻŹĆŁŚĄĘÓŃ][\\w${PL}]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\w${PL}]*)?`;
const MIEJSCOWOSC_DIRECT_RE = new RegExp(`[Ww]\\s+miejscowo[śs]ci\\s+(${NAME_RE})`);
const MIEJSCOWOSC_POLOZ_RE = new RegExp(`[Pp]o[łl]o[żz]on[\\w${PL}]*\\s+[Ww]\\s+(?:miejscowo[śs]ci\\s+)?(${NAME_RE})`);
export function miejscowoscFromText(text) {
  const t = text || '';
  let m = MIEJSCOWOSC_DIRECT_RE.exec(t);
  if (m) return m[1];
  m = MIEJSCOWOSC_POLOZ_RE.exec(t);
  return m ? m[1] : null;
}

// "o pow. 0,1014 ha" -> m2 (rounded), or null. Single-parcel notices state
// area in hectares inline; multi-parcel notices use a table (see
// parcelsFromText).
export function plotAreaFromText(text) {
  const m = /o\s+pow(?:ierzchni)?\.?\s+(\d+[,.]\d+)\s*ha\b/i.exec(text || '');
  if (m) {
    const v = Number(m[1].replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  return null;
}

// All "<NR>/<NR>  <area>,<frac> ha" table rows (the "Działka nr / Pow. / Nr
// KW [/ Godz. / Cena]" 2-6 column layout pdftotext renders as space-padded
// text) — works for both multi-parcel announcements (Kuczków, Nowa Wieś:
// area-only rows, price is a separate section) and single/multi-parcel
// result docs (Sowin, Nowa Wieś wynik: area+price combined on one row —
// price is read separately via parcelPriceFromText, not here, since the
// combined-row shape isn't reliable enough to split blindly).
const PARCEL_ROW_RE = /(\d{1,4}\/\d{1,4})\s+(\d[,.]\d{2,4})\s*ha\b/g;
export function parcelsFromText(text) {
  const t = text || '';
  const out = [];
  const seen = new Set();
  let m;
  PARCEL_ROW_RE.lastIndex = 0;
  while ((m = PARCEL_ROW_RE.exec(t)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ dzialka_nr: m[1], area_m2: Math.round(Number(m[2].replace(',', '.')) * 10000) });
  }
  return out;
}

// Per-parcel price for a multi-parcel (or table-row single-parcel) notice.
// Two real shapes seen live:
//   (a) "dla działki 67/1 – 67.834,50 zł brutto (...)" (Kuczków-style,
//       unambiguous — tried first).
//   (b) a bare table row "249/7      0,0869 ha       10/00        91.020,00
//       zł" (Nowa-Wieś/Sowin-style) — the parcel number is anchored to the
//       START of its own line (`(?:^|\n)\s*<NR>`) so it can't match a
//       mid-sentence mention of the SAME parcel number (e.g. the "Terminy
//       poprzednich przetargów"/"godz. ... dla działki NR" sentences that
//       precede the real table and would otherwise be the nearest, but
//       wrong, candidate — this was a real false-match caught while
//       building this adapter: an unanchored version matched a LATER
//       parcel's mid-sentence mention and returned an EARLIER parcel's
//       price instead). The price capture also requires an explicit
//       whitespace character immediately before its first digit, so a
//       table's trailing KW-number digit (".../2") — itself immediately
//       preceded by "/", not whitespace — can never be mistaken for the
//       start of the price.
export function parcelPriceFromText(text, dzialkaNr) {
  const t = text || '';
  const esc = dzialkaNr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re = new RegExp(`dla\\s+(?:dz\\.|dzia[łl]ki)\\s+(?:nr\\s+)?${esc}\\s*[–—-]\\s*([\\d][\\d\\s.,]*)\\s*z[łl]`, 'i');
  let m = re.exec(t);
  if (m) return parsePLN(m[1]);
  re = new RegExp(`(?:^|\\n)\\s*${esc}\\s+[\\s\\S]{0,90}?\\s(\\d[\\d.,]*)\\s*z[łl]`, 'i');
  m = re.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// Achieved (hammer) price — "Nabywcą za cenę 227 000 zł ... została Pani
// ..." (flats) / "nabywcami ww. działki za kwotę 113.043,90 zł brutto
// zostali ..." (land, plural buyers) / "nabywcą ... za kwotę brutto
// 82.270,60 zł został ...". One shared pattern covers all three real
// phrasings (kind, brutto/netto, singular/plural buyer all vary; the
// "nabywc... ... za cenę/kwotę ... zł" skeleton does not).
const ACHIEVED_RE = /nabywc[a-ząćęłńóśźż]*[\s\S]{0,80}?za\s+(?:cen[ęe]|kwot[ęe])(?:\s+(?:brutto|netto))?\s+([\d][\d\s.,]*)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  const m = ACHIEVED_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Negative outcome — "zakończył się wynikiem negatywnym" always present on
// an unsold result, phrased with a variety of reasons (brak oferentów, nie
// wpłynęło żadne wadium, nieprzystąpienie osoby zakwalifikowanej do
// przetargu).
export function isUnsoldText(text) {
  const t = text || '';
  return /wynikiem\s+negatywnym|nie\s+wp[łl]yn[ęe][łl]o\s+[żz]adne\s+wadium/i.test(t);
}
// Positive outcome — "zakończył się wynikiem pozytywnym" or (result docs
// that skip that stock phrase) the presence of a named nabywca.
export function isSoldText(text) {
  const t = text || '';
  return /wynikiem\s+pozytywnym|nabywc[a-ząćęłńóśźż]*[\s\S]{0,80}?za\s+(?:cen[ęe]|kwot[ęe])/i.test(t);
}

// ---------------------------------------------------------------------------
// Board-entry classification — operates on the INLINE (stripped) teaser
// text, i.e. BEFORE any PDF is fetched, so crawl.js can skip a whole class of
// entries (dzierżawa/najem/użyczenie/bezprzetargowo/aport — the majority of
// every board) without spending a request on them.
// ---------------------------------------------------------------------------

// "sprzedaż w drodze bezprzetargowej" / "w trybie bezprzetargowym" — a
// disposal OUTSIDE the open-auction track (typically to the sitting tenant)
// — explicitly out of scope regardless of the "sprzedaż" verb also present.
const BEZPRZETARGOWO_RE = /bezprzetargow/i;
// Lease / loan-for-use / capital-contribution verbs — never a sale, and (see
// the ul. Piaski 41 "Ogłoszenie ... na wydzierżawienie" fixture in the test
// file) can appear under the SAME "ogłasza <ROMAN> przetarg" shape as a real
// sale announcement, differing only in the object noun.
const SKIP_RE = /wydzier[żz]aw|dzier[żz]aw[a-ząćęłńóśźż]*|naj[ęe]m|wynaj[ąa][cć]|u[żz]yczeni|u[żz]yczy[cć]|wniesieni[a-ząćęłńóśźż]*\s+aportu|aport\s+rzeczow/i;
// Sale verbs — "sprzedaż"/"sprzedaży" (noun, announcements: "na sprzedaż",
// wykazy: "do sprzedaży") and "sprzedać" (infinitive verb, wykazy: "zamierza
// sprzedać" — a REAL bug caught by testing against the live Piekarzewo
// wykaz: an earlier version of this pattern only matched the ż/z-ending
// noun forms and silently missed the ć-ending verb form, which is the
// dominant phrasing "Burmistrz ... zamierza sprzedać działkę ..." actually
// uses on ~half of the genuine sale wykazy). "zbyć"/"zbycie" (rarer
// synonym, seen live on a single 2025 wykaz). The Polish-diacritic class
// (not bare \w*) after "sprzeda" catches every conjugation/declension in
// one pattern instead of enumerating endings one at a time.
const SALE_VERB_RE = new RegExp(`sprzeda[a-z${PL}]*|zbyci[ae]|zby[cć]`, 'i');

/** True when a board entry's teaser text must be skipped entirely (lease,
 * loan-for-use, capital contribution, or a bezprzetargowa/off-auction
 * disposal) regardless of any "ogłasza"/"sprzedaż" wording also present. */
export function isSkippableEntryText(text) {
  const t = text || '';
  if (BEZPRZETARGOWO_RE.test(t)) return true;
  if (SKIP_RE.test(t)) return true;
  return false;
}

/** True when a teaser reads as a genuine OPEN-AUCTION sale announcement
 * ("ogłasza <round> przetarg ... na sprzedaż ..."), i.e. crawl.js should
 * fetch its linked PDF (unless the entry also already carries a result —
 * see crawl.js's concluded-gate). */
export function isSaleAnnouncementText(text) {
  const t = text || '';
  if (isSkippableEntryText(t)) return false;
  return /ogłasza/i.test(t) && SALE_VERB_RE.test(t);
}

/** True for a "Wykaz ..." entry that is a genuine pre-auction SALE
 * designation ("wykazuje/zamierza sprzedać ...", not bezprzetargowa/
 * dzierżawa/najem/użyczenie/aport) worth keeping in the wykaz stream. */
export function isGenuineSaleWykazText(text) {
  const t = text || '';
  if (isSkippableEntryText(t)) return false;
  return SALE_VERB_RE.test(t);
}

/** True when a PDF-link's anchor label marks it as the RESULT document
 * ("Informacja o wyniku przetargu - format pdf") rather than the plain
 * "Pobierz dokument - format pdf" generic label used for announcements and
 * wykazy alike (filenames are NOT a reliable signal — a real announcement
 * PDF was observed filed under a "gp-wkz-*" (wykaz-prefixed) name). */
export function isResultLabel(label) {
  return /wynik/i.test(label || '');
}

// ---------------------------------------------------------------------------
// parseAnnouncementPage — registry-shaped active-listing extraction from a
// fetched announcement PDF's text.
// ---------------------------------------------------------------------------

/**
 * Parse one announcement PDF's text into 0+ listing/land records.
 * @param {string} text  pdftotext -layout output
 * @param {string} url   the PDF's absolute URL (stored as detail_url)
 * @returns {Array<object>}
 */
export function parseAnnouncementPage(text, url) {
  const t = (text || '').trim();
  if (!t) return [];

  const kind = classifyEntryKind(t);
  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);

  if (kind === 'grunt') {
    const rows = parcelsFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    const obreb = obrebFromText(t);
    const address_raw = miejscowosc || null;
    if (rows.length > 0) {
      return rows.map(({ dzialka_nr, area_m2 }) => ({
        kind: 'grunt',
        dzialka_nr,
        obreb: obreb || miejscowosc,
        area_m2,
        address_raw,
        address: null,
        starting_price_pln: parcelPriceFromText(t, dzialka_nr) ?? startingPriceFromText(t),
        auction_date,
        round,
        detail_url: url,
      }));
    }
    const dzialka_nr = parcelFromText(t);
    if (!dzialka_nr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: obreb || miejscowosc,
      area_m2: plotAreaFromText(t),
      address_raw,
      address: null,
      starting_price_pln: startingPriceFromText(t),
      auction_date,
      round,
      detail_url: url,
    }];
  }

  const base = streetBuildingFromText(t);
  if (!base) return [];
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  const address = parseAddress(addressStr);
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `ul. ${addressStr}`,
    address,
    area_m2: flatAreaFromText(t),
    starting_price_pln: startingPriceFromText(t),
    auction_date,
    round,
    detail_url: url,
  }];
}

// ---------------------------------------------------------------------------
// parseYearBoard — the consolidated year-board page -> entries. Each
// <h2>...</h2> starts one entry; its content runs up to (but excluding) the
// next <h2> — trailing "content-footer" boilerplate (responsible persons,
// print button) is stripped before text extraction, matching how the CMS
// itself delimits one wiadomość from the next.
// ---------------------------------------------------------------------------

const PDF_LINK_RE = /<a\s+(?:title="[^"]*"\s+)?href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;

/**
 * @param {string} html  the full year-board page HTML
 * @param {string} base  absolute origin+base-path to resolve relative PDF
 *   hrefs against, e.g. "https://bip.pleszew.pl/pleszewm/"
 * @returns {Array<{ title: string, bodyText: string, pdfLinks: Array<{url: string, label: string}> }>}
 */
export function parseYearBoard(html, base) {
  if (!html) return [];
  const start = html.indexOf('<h2>');
  if (start === -1) return [];
  const parts = html.slice(start).split(/(<h2>[\s\S]*?<\/h2>)/);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = stripTags(parts[i]);
    if (title === 'Miasto i Gmina Pleszew') continue; // page banner, not an entry
    let body = parts[i + 1] || '';
    const footerIdx = body.indexOf('<div class="content-footer">');
    if (footerIdx !== -1) body = body.slice(0, footerIdx);

    const pdfLinks = [];
    const seen = new Set();
    PDF_LINK_RE.lastIndex = 0;
    let m;
    while ((m = PDF_LINK_RE.exec(body)) !== null) {
      const href = m[1].trim();
      if (seen.has(href)) continue;
      seen.add(href);
      const linkUrl = /^https?:\/\//i.test(href) ? href : base + href;
      pdfLinks.push({ url: linkUrl, label: stripTags(m[2]) });
    }

    // Prose-only text for field extraction: strip <a>...</a> ENTIRELY
    // (anchor + its label text, not just the tag) before stripTags — a real
    // bug caught live against bip.pleszew.pl: without this, a locality name
    // sitting right before a "Pobierz dokument - format pdf" link (the last
    // sentence in many entries) had that boilerplate label run straight into
    // the prose once stripTags's whitespace-collapse joined them
    // ("...w miejscowości Piekarzewie" + "Pobierz dokument..." ->
    // "Piekarzewie Pobierz"), corrupting miejscowoscFromText's capture.
    const prose = body.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ');

    out.push({ title, bodyText: stripTags(prose), pdfLinks });
  }
  return out;
}

// ---------------------------------------------------------------------------
// wykazRecordFromEntry — a genuine pre-auction SALE wykaz -> a clean
// address/parcel-only record (no price/date expected — matches the
// ADAPTER-GUIDE wykaz convention). No PDF fetch needed: the board's own
// teaser text carries enough (address or parcel) to key the record.
// ---------------------------------------------------------------------------

/**
 * @param {string} bodyText  stripped teaser text (already gated by
 *   isGenuineSaleWykazText)
 * @param {string|null} pdfUrl  the wykaz's own linked PDF, if any (stored as
 *   detail_url — informational only, never fetched)
 * @returns {object|null}
 */
export function wykazRecordFromEntry(bodyText, pdfUrl) {
  const t = bodyText || '';
  const kind = classifyEntryKind(t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    if (!dzialka_nr && !miejscowosc) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(t) || miejscowosc,
      area_m2: plotAreaFromText(t),
      address_raw: miejscowosc,
      address: null,
      detail_url: pdfUrl,
    };
  }

  const base = streetBuildingFromText(t);
  if (!base) return null;
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `ul. ${addressStr}`,
    address: parseAddress(addressStr),
    detail_url: pdfUrl,
  };
}

// ---------------------------------------------------------------------------
// parseResultDoc — registry contract. Groundtruthed against REAL live
// result PDFs for both kinds and both outcomes (see file header + test).
// ---------------------------------------------------------------------------

function addressFromResultText(t) {
  const base = streetBuildingFromText(t);
  if (!base) return null;
  const apt = flatAptFromText(t);
  return parseAddress(apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`);
}

/**
 * Parse a "wynik przetargu" PDF's text into result record(s).
 * @param {string} text  pdftotext -layout output
 * @param {string|null} fallbackDate  ISO date fallback (rarely needed — the
 *   real documents always state their own date)
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = (text || '').trim();
  if (!t) return [];

  // A result doc either titles itself "Informacja o wyniku ..." (flats) or
  // reuses the scheduling-notice template ("Zgodnie z zarządzeniem ...
  // ustalono termin ... przetargu ...") with an outcome sentence appended
  // much later in the document (land — real gap measured up to ~670 chars
  // on a live fixture, so outcome detection below is intentionally NOT
  // proximity-bound to the "ustalono termin" anchor: an outcome phrase
  // — wynikiem negatywnym/pozytywnym, or a named nabywca — never appears in
  // a pure FUTURE-tense announcement, so its bare presence anywhere in the
  // document is itself a safe, sufficient signal that this is a result).
  const isResultDoc =
    /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(t) ||
    /o\s+wyniku[\s\S]{0,20}?przetargu/i.test(t) ||
    isUnsoldText(t) ||
    isSoldText(t);
  if (!isResultDoc) return [];

  const kind = classifyEntryKind(t);
  const round = roundFromText(t);
  const unsold = isUnsoldText(t);
  const sold = !unsold && isSoldText(t);
  const outcome = unsold ? 'unsold' : sold ? 'sold' : 'open';
  const achieved = sold ? achievedPriceFromText(t) : null;

  // Result-doc date: "na dzień <date>" (land: "ustalono termin ... na
  // dzień X" — the FIRST such match is the auction's own scheduled date,
  // shared by both the plain scheduling-notice template and its
  // result-bearing twin) or "wyznaczony na dzień <date>" (flats). Falls
  // back to the announcement-style future-tense phrasing, then the
  // caller's fallbackDate.
  const dateM = /na\s+dzie[ńn]\s+(\d{1,2}\s+[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})/i.exec(t);
  const auction_date = (dateM && parseDateText(dateM[1])) ?? auctionDateFromText(t) ?? fallbackDate ?? null;

  if (kind === 'grunt') {
    const rows = parcelsFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    const obreb = obrebFromText(t) || miejscowosc;
    if (rows.length > 0) {
      return rows.map(({ dzialka_nr, area_m2 }) => {
        const starting_price_pln = parcelPriceFromText(t, dzialka_nr) ?? startingPriceFromText(t);
        return {
          kind: 'grunt',
          dzialka_nr,
          obreb,
          area_m2,
          address_raw: miejscowosc,
          round,
          starting_price_pln,
          final_price_pln: outcome === 'sold' ? achieved : null,
          outcome,
          unsold_reason: unsold ? 'wynik negatywny' : null,
          auction_date,
          source_pdf: sourceUrl,
        };
      });
    }
    const dzialka_nr = parcelFromText(t);
    if (!dzialka_nr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: plotAreaFromText(t),
      address_raw: miejscowosc,
      round,
      starting_price_pln: startingPriceFromText(t),
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason: unsold ? 'wynik negatywny' : null,
      auction_date,
      source_pdf: sourceUrl,
    }];
  }

  const address = addressFromResultText(t);
  if (!address) return [];
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    round,
    starting_price_pln: startingPriceFromText(t),
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    auction_date,
    source_pdf: sourceUrl,
  }];
}
