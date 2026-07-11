// Sulęcin parsers — announcement PDFs + result ("informacja o wyniku
// przetargu") PDFs. Both live as attachments on the SAME entry stub page
// (bip.sulecin.pl/<board>/<id>/<slug>/); crawl.js fetches whichever exist.
//
// Groundtruthed 2026-07-11 against SIX real, live-fetched document pairs:
//
//   Rychlik 16B/3 — round II (SOLD, 73 100 -> 73 840 zł):
//     ogłoszenie: system/pobierz.php?plik=Ogloszenie_o_II_przetargu_-_lokal_Rychlik.pdf&id=ce084c265e69c8e60952ea2e9111350d
//     wynik:      system/pobierz.php?plik=Informacja_o_wyniku_II_przetargu_-_lokal_Rychlik.pdf&id=6aecdfa96318ebb4cdda9539f664fc6b
//   Rychlik 16B/3 — round I (UNSOLD, brak wpłaty wadium):
//     ogłoszenie: system/pobierz.php?plik=PRZETARG_RYCHLIK.pdf&id=4a2b87e845a87dd6d288667a50d68427
//     wynik:      system/pobierz.php?plik=Informacja_o_wyniku_I_przetargu_lokal_Rychlik.pdf&id=08e0b23077c1a663de14ca2691114c63
//   Żubrów 23/1 — round I (SOLD, 97 200 -> 98 180 zł):
//     ogłoszenie: system/pobierz.php?plik=PRZETARG_ZUBROW_na_BIP.pdf&id=cbf0fe7f38b40e966a2cb71fafc43751
//     wynik:      system/pobierz.php?plik=Informacja_o_wyniku_I_przetargu_-_lokal_Zubrow_23.1_BIP.pdf&id=30af5d172771f07b011aef62f5f74f43
//   dz. 437/1, obręb 0048 — land, ograniczony, round I (SOLD, 29 000 -> 29 290 zł,
//   SCANNED result — OCR'd):
//     ogłoszenie: system/pobierz.php?plik=ogloszenie_o_przetargu__ograniczonym_-_dz.437.1__Sulecin_-_BIP.pdf&id=340136e18f4f19c715c51a39ed17a9f0
//     wynik:      system/pobierz.php?plik=informacja_o_wyniku_przetargu_-_dz._437.1_Sulecin.pdf&id=c6601ac34ae63c8fbbe11c2f595fe0eb
//   dz. 231/17, obręb 0048 — land, ograniczony, round I (SOLD, 7 740 -> 13 800 zł):
//     ogłoszenie: system/pobierz.php?plik=ogloszenie_o_przetargu__ograniczonym_-_dz.231.17__ul._Kosciuszki-__BIP.pdf&id=93ae93e8a8a152825e6aa46e5dbc68ae
//     wynik:      system/pobierz.php?plik=Informacja_o_wyniku_przetargu__dz._231.17___Sulecin__-_BIP.pdf&id=e3e927ec4c6f44c97e85675dbbc7b21e
//
// Document shape (born-digital PDFs, pdftotext -layout; one scan observed, see
// above):
//
//   ANNOUNCEMENT: "BURMISTRZ SULĘCINA ogłasza <ROUND> przetarg ustny
//   [nie]ograniczony w dniu <D month YYYY> roku/r. o godz. HH:MM ... na sprzedaż
//   [lokalu mieszkalnego: | nieruchomości gruntowej niezabudowanej]". Flats then
//   carry a clean top-line "<Wieś> <Bldg>[Litera]/<Lokal>, gmina Sulęcin" (the
//   most reliable address source — used as PRIMARY); both kinds then carry a
//   pdftotext-wrapped table (Położenie/Nr działki/Pow. ha/KW/Cena wywoławcza
//   brutto/Wadium[/Udział for flats]) whose data row keeps dzialka+ha+cena+wadium
//   adjacent but has the KW number OR the whole row wrap onto extra lines
//   (poppler artifact) — obręb is read from that same table cell instead of
//   trying to re-anchor after the KW token. Flat area is a distinct prose line:
//   "Powierzchnia użytkowa lokalu mieszkalnego: XX,XX m2." (must NOT match the
//   later "Suma powierzchni użytkowej lokalu i powierzchni pomieszczeń
//   przynależnych: YY,Y m2." line when the flat also has a cellar — observed on
//   Żubrów 23/1: 70,3 vs 98,9 m2 — hence the anchor requires "lokalu
//   mieszkalnego:" literally, not just "pow...").
//
//   ROUND wording differs by kind: flat announcements state it as a ROMAN
//   numeral ("II przetarg ustny nieograniczony"); land (ograniczony) states it
//   as a Polish ordinal WORD ("pierwszy przetarg ustny ograniczony") — both
//   forms handled by announceRoundFromText.
//
//   RESULT ("informacja o wyniku przetargu"): numbered items, "4. Cena
//   wywoławcza nieruchomości: X zł" always present; SOLD adds "5. Cena
//   {osiągnięta w przetargu | uzyskana w przetargu}: Y zł" (flats say
//   "osiągnięta", land says "uzyskana" — a real, confirmed vocabulary split) +
//   a buyer name; UNSOLD instead reuses that numbered slot for
//   "brak wpłaty wadium, więc przetarg zakończył się wynikiem negatywnym." with
//   no achieved-price item at all. Address prose ("Lokal mieszkalny nr N w/we
//   <Wieś>[,/–] numer budynku NN[, klatka L]") states the village in LOCATIVE
//   case and sometimes folds the entrance letter into the building number
//   ("16B") and sometimes states it separately ("16, klatka B") — both forms
//   from the SAME physical flat's two rounds (Rychlik 16B/3), confirming this
//   is genuine per-document variance, not a one-off. A small, explicit
//   locative->nominative lookup (WYNIK_VILLAGE_NOMINATIVE, extend as new
//   villages are observed — same narrow-not-general philosophy as
//   miedzyrzecz's nominativePlace()) keeps the wynik-derived address keying the
//   same as the announcement's clean top-line for the villages actually seen.
//
//   REAL BUG (documented, not "fixed" in the sense of editing the source — the
//   source is what it is; the parser is designed AROUND it): Rychlik 16B/3's
//   round-II wynik doc (Informacja_o_wyniku_II_przetargu...) states in its own
//   body "10 lipca 2025 r. ... PIERWSZY przetarg ustny nieograniczony" even
//   though the filename, the announcement it resolves, and every external fact
//   confirm this was round II (round I, resolved unsold on 2025-05-13, is a
//   separate real document above). The wynik document's own round statement is
//   simply wrong on this occurrence (copy-paste from the round-I template,
//   never updated) — so, matching gorzow-wielkopolski's and miedzyrzecz's own
//   convention, parseResultDoc NEVER derives `round` from wynik prose; it is
//   always null there ("result notices reference the announcement, not the
//   round" — doubly justified here by a caught, concrete counterexample).
//
// LEASE (dzierżawa) gate: no live dzierżawa listing was found anywhere in the
// "Sprzedaż i dzierżawa" board family during this build (board 79's own
// "Dzierżawa" child was never populated with a distinct board id) — Sulęcin's
// board may simply not carry any right now. isLease() is a defensive,
// vocabulary-only gate (same convention + same "board is clean of it, but it's
// a cheap safety net" reasoning as miedzyrzecz's isFlatSaleRow), tested against
// a title built from Sulęcin's OWN confirmed real phrasing template
// ("Burmistrz Sulęcina ogłasza ... przetarg ... na DZIERŻAWĘ ...", substituting
// the one word that would actually change) rather than a live-fetched fixture —
// flagged explicitly in the test file, unlike every other fixture there.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── folding / numbers ────────────────────────────────────────────────────────

function foldPl(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

// "73 100,00" / "800,00" / "7 740,00" -> integer PLN. Space (or NBSP) thousands
// separator, comma decimal — the ONLY money format observed across every real
// document (announcements and results, flats and land alike).
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// "0,0524" / "0.0035" (comma OR period decimal — both observed live on
// BORN-DIGITAL announcement PDFs, not just OCR: dz.437/1 prints "0,0295", dz.
// 231/17 prints "0.0035" for the identical field — a genuine source
// inconsistency, not an artifact) -> hectares as a float.
function parseHa(s) {
  if (!s) return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Hectares string -> whole m2 (the land.json convention; see build-land.js). */
export function haToM2(s) {
  const ha = parseHa(s);
  return ha != null ? Math.round(ha * 10000) : null;
}

// "26,90" / "70,3" -> float m2 (flat usable area; one OR two decimal digits
// both observed live).
function parseAreaM2(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/** Polish genitive month name -> 1-12, or null. @param {string} word */
export function monthNum(word) {
  return PL_MONTHS[foldPl(word)] || null;
}

// ── round (Roman numeral for flats, Polish ordinal word for land) ──────────

const ROMAN_VALUES = { I: 1, V: 5, X: 10 };
function romanToRound(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VALUES[up[i]];
    const next = ROMAN_VALUES[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 20 ? total : null;
}

const ROUND_WORD_PREFIXES = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piat', 5], ['szost', 6], ['siodm', 7], ['osm', 8],
];
function wordToRound(word) {
  const f = foldPl(word);
  for (const [prefix, n] of ROUND_WORD_PREFIXES) {
    if (f.startsWith(prefix)) return n;
  }
  return null;
}

// "ogłasza\n  II przetarg ustny nieograniczony" (flats, Roman) / "ogłasza\n
// pierwszy przetarg ustny ograniczony" (land, word). Anchored on "ogłasza"
// immediately before the round token — the ONLY place this doc states the
// round reliably (see file header re: the wynik doc's own round statement
// being confirmed WRONG on one real document).
const ANNOUNCE_ROUND_RE =
  /ogłasza\s+([IVXivx]+|pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*)\s+przetarg/i;

/** @param {string} text @returns {number|null} */
export function announceRoundFromText(text) {
  const m = ANNOUNCE_ROUND_RE.exec(text || '');
  if (!m) return null;
  const token = m[1];
  return /^[IVXivx]+$/.test(token) ? romanToRound(token) : wordToRound(token);
}

// ── dates ────────────────────────────────────────────────────────────────────

// "w dniu 10 lipca 2025 roku o godz." (flats) / "w dniu 14 stycznia 2026 r. o
// godz." (land — "r." not "roku"; also land omits the ":" in "godz. 1000",
// irrelevant here since only the date is extracted).
const ANNOUNCE_DATE_RE = /w\s+dniu\s+(\d{1,2})\s+(\S+)\s+(\d{4})\s+r(?:oku|\.)/i;

/** @param {string} text @returns {string|null} ISO date */
export function announceDateFromText(text) {
  const m = ANNOUNCE_DATE_RE.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// "10 lipca 2025 r., Urząd Miejski w Sulęcinie" / "14 stycznia 2026 r., Urząd
// Miejski Sulęcin" — the auction date in a wynik doc's item 1. Anchored on the
// ", Urząd" suffix so the notice's OWN issuance-date header ("data: 22
// stycznia 2026 r." — no ", Urząd" following) is never picked up instead; the
// header date and the auction date are DIFFERENT dates on every real document
// (the notice is always signed after the auction it reports).
const RESULT_DATE_RE = /(\d{1,2})\s+(\S+)\s+(\d{4})\s*r\.,\s*Urz[ąa]d/i;

/** @param {string} text @returns {string|null} ISO date */
export function resultDateFromText(text) {
  const m = RESULT_DATE_RE.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// ── kind ─────────────────────────────────────────────────────────────────────

/**
 * Classify announcement/result text into 'mieszkalny' | 'grunt' | 'unknown',
 * scoped to the short header clause ("ogłasza ... na sprzedaż ...") rather
 * than the whole document — the boilerplate legal clauses shared by BOTH
 * templates mention "nieruchomości gruntowej" even in flat notices (verified:
 * the wadium-forfeiture clause), so scoping avoids relying on classifyKind's
 * flat-before-land ordering as the only thing preventing a misclassification.
 * @param {string} text
 * @returns {'mieszkalny'|'grunt'|'unknown'}
 */
export function kindFromText(text) {
  const t = text || '';
  const i = t.indexOf('ogłasza');
  const header = i === -1 ? t.slice(0, 600) : t.slice(i, i + 400);
  return classifyKind(header);
}

// ── lease gate ───────────────────────────────────────────────────────────────

/** @param {string} text @returns {boolean} */
export function isLease(text) {
  return /dzier[żz]aw|\bnajem\b/i.test(text || '');
}

// ── flat address (announcement clean top-line — PRIMARY, most reliable) ────

// "Rychlik 16B/3, gmina Sulęcin" / "Żubrów 23/1, gmina Sulęcin".
const ANNOUNCE_FLAT_ADDR_RE =
  /^[ \t]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+(\d{1,4}[A-Za-z]?)\/(\d{1,4}[A-Za-z]?)\s*,\s*gmina\s+Sul[ęe]cin/m;

/** @param {string} text @returns {string|null} "<Village> <Bldg>/<Apt>" */
export function announceFlatAddressRaw(text) {
  const m = ANNOUNCE_FLAT_ADDR_RE.exec(text || '');
  return m ? `${m[1]} ${m[2]}/${m[3]}` : null;
}

// Usable floor area: "Powierzchnia użytkowa lokalu mieszkalnego: 26,90 m2." —
// anchored on "lokalu mieszkalnego:" specifically so the LATER "Suma
// powierzchni użytkowej lokalu i powierzchni pomieszczeń przynależnych: Y m2."
// line (present when the flat also has a cellar, e.g. Żubrów 23/1: 70,3 vs
// 98,9 m2) is never picked up instead.
const UNIT_AREA_RE = /lokalu\s+mieszkalnego:?\s*(\d+(?:[.,]\d+)?)\s*m/i;

/** @param {string} text @returns {number|null} */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseAreaM2(m[1]) : null;
}

// ── announcement table (both kinds: dzialka/obręb/cena/wadium) ─────────────

// Flat table row: "gmina Sulęcin   <dzialka>   <ha>   <KW-token>   <cena>
// <wadium>" all on one pdftotext line; the KW token ("GW1U/00003532/6") is
// skipped via \S+ (it never contains whitespace). Anchored on "gmina Sulęcin"
// — the FIRST occurrence in the document is the top-line address's ", gmina
// Sulęcin" suffix, which this pattern correctly skips past (nothing
// dzialka-shaped follows it there) before matching the real table row.
const ANNOUNCE_FLAT_TABLE_RE =
  /gmina\s+Sul[ęe]cin\s+(\d{1,4}\/\d{1,4})\s+(\d+[.,]\d+)\s+\S+\s+(\d{1,3}(?:[\s .]\d{3})*,\d{2})\s+(\d{1,3}(?:[\s .]\d{3})*,\d{2})/;

// "obręb: 0045 Rychlik" (flats) — village name here is already NOMINATIVE.
const OBREB_NAME_RE = /obr[ęe]b:?\s*(\d{1,4})\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/;

/**
 * @param {string} text
 * @returns {{dzialka_nr:string, obreb:string|null, starting_price_pln:number|null}|null}
 */
function announceFlatTable(text) {
  const m = ANNOUNCE_FLAT_TABLE_RE.exec(text || '');
  if (!m) return null;
  const obrebM = OBREB_NAME_RE.exec(text || '');
  return {
    dzialka_nr: m[1],
    obreb: obrebM ? obrebM[1] : null,
    starting_price_pln: parsePLN(m[3]),
  };
}

// TWO real table sub-shapes confirmed live, differing in more than a KW-cell
// wrap: restricted "ograniczony" tenders (dz.437/1, dz.231/17) print
// "Położenie | Nr działki | Pow. działki | Księga wieczysta | Cena wywoławcza
// | Wadium | Uzasadnienie ..." with the dzialka number ALWAYS slashed
// ("437/1") and the KW cell wrapped onto its OWN line above the data row;
// unrestricted "nieograniczony" batch tenders (2024 board, e.g. "Słoneczne II
// dz. 596") print an EXTRA leading "Nr przetargu" column ("2/2024/III"), a
// BARE (unslashed) dzialka number ("596"), the KW cell INLINE on the data
// row, and NO "obręb" token at all (location instead reads "Sulęcin ul. Jana
// Matejki"). Rather than one rigid positional regex per shape, both fields
// are anchored on their own most distinctive, shape-invariant token instead:
//
//   dzialka_nr + ha: the hectare figure is reliably FOUR decimal digits on
//   every real table row seen (flat or land, either sub-shape — "0,0524" /
//   "0.1321" / "0,0295") — a shape nothing else in these tables has — so
//   the dzialka number is read as whatever number-or-slashed-number token
//   sits immediately before it.
//
//   cena + wadium: always the LAST TWO money-shaped (comma+2-decimal) tokens
//   before the "Opis działki" heading — true regardless of whether a KW
//   token, a "Nr przetargu" column, or a justification paragraph sits in
//   between (dates like "17.06.2024" and parcel refs like "432/6" never have
//   a 2-decimal comma tail, so they never compete for this anchor).
//
// A genuinely multi-parcel batch table (several dzialka rows under one
// heading — confirmed live on the 2024 board's "Jana Matejki" and "Krotka"
// entries) still only yields its FIRST row here; see parseAnnouncement's own
// header for why that's an accepted, documented gap rather than a decode
// attempt.
const HA_TOKEN_RE = /(\d{1,4}[A-Za-z]?\/\d{1,4}[A-Za-z]?|\d{1,4})\s+(\d+[.,]\d{4})\b/;
const MONEY_TOKEN_RE = /\d{1,3}(?:[\s .]\d{3})*,\d{2}/g;

/** obręb sits in the table's Położenie cell when present at all (the
 *  unrestricted/batch sub-shape omits it entirely — a street reference is
 *  used instead) — bounded to before "Opis działki" for the same reason as
 *  the money-token scan below.
 *  @param {string} text @returns {string|null} */
function earlyObrebFromText(text) {
  const t = text || '';
  const cut = t.indexOf('Opis działki');
  const scope = cut > -1 ? t.slice(0, cut) : t.slice(0, 2500);
  const m = /obr[ęe]b\w*\s*(\d{1,4})/.exec(scope);
  return m ? m[1] : null;
}

/**
 * @param {string} text
 * @returns {{dzialka_nr:string, obreb:string|null, area_m2:number|null, starting_price_pln:number|null}|null}
 */
function announceLandRow(text) {
  const t = text || '';
  const haM = HA_TOKEN_RE.exec(t);
  if (!haM) return null;

  const cut = t.indexOf('Opis działki');
  const scope = cut > -1 ? t.slice(haM.index, cut) : t.slice(haM.index, haM.index + 400);
  const moneys = scope.match(MONEY_TOKEN_RE) || [];
  if (moneys.length < 2) return null;
  const [cena, wadium] = moneys.slice(-2);
  // Sanity check (same spirit as gorzow-wielkopolski's cena/wadium ratio
  // guard): wadium is always well under cena on every real document seen.
  const cenaN = parsePLN(cena);
  const wadiumN = parsePLN(wadium);
  if (cenaN != null && wadiumN != null && wadiumN >= cenaN) return null;

  return {
    dzialka_nr: haM[1],
    obreb: earlyObrebFromText(t),
    area_m2: haToM2(haM[2]),
    starting_price_pln: cenaN,
  };
}

// ── announcement parser ──────────────────────────────────────────────────────

/**
 * Parse one ANNOUNCEMENT PDF's text into 0 or 1 listing/land record. Array
 * return (framework interface, mirrors gorzow-wielkopolski) even though every
 * real Sulęcin announcement observed is single-lot — a rare multi-parcel batch
 * (one ogłoszenie PDF, several dzialka result docs, seen live on the 2024
 * board's "Jana Matejki" entry) is intentionally NOT decomposed here; skip
 * rather than risk misattributing area/price across lots (same philosophy
 * gorzow-wielkopolski's own header documents).
 * @param {string} text
 * @param {{ pdfUrl?: string, detailUrl?: string, fallbackAuctionDate?: string|null }} [ctx]
 * @returns {Array<object>}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text) return [];
  if (isLease(text)) return [];
  const kind = kindFromText(text);
  const round = announceRoundFromText(text);
  const auction_date = ctx.fallbackAuctionDate || announceDateFromText(text) || null;

  if (kind === 'grunt') {
    const row = announceLandRow(text);
    if (!row) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: row.dzialka_nr,
      obreb: row.obreb,
      area_m2: row.area_m2,
      address_raw: row.obreb ? `Sulęcin, obręb ${row.obreb}` : `Sulęcin, dz. ${row.dzialka_nr}`,
      starting_price_pln: row.starting_price_pln,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    }];
  }

  if (kind !== 'mieszkalny') return [];
  const addressRaw = announceFlatAddressRaw(text);
  if (!addressRaw) return [];
  const address = parseAddress(addressRaw);
  if (!address) return [];
  const table = announceFlatTable(text);
  return [{
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln: table ? table.starting_price_pln : null,
    auction_date,
    round,
    detail_url: ctx.detailUrl || null,
    source_url: ctx.pdfUrl || null,
  }];
}

// ── result doc: shared field extraction ─────────────────────────────────────

/** @param {string} text @returns {boolean} */
export function isResultNotice(text) {
  // NOTE: "\w" is ASCII-only in JS regex and does NOT include Polish
  // diacritics — every real wynik doc says "informację" (accusative, ę right
  // after the stem), which a naive "informacj\w*" fails to bridge past (found
  // by running this parser against live-captured text: it silently matched
  // nothing on every real result document). Explicit Polish-letter class here.
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(text || '');
}

/** "brak wpłaty wadium, więc przetarg zakończył się wynikiem negatywnym." */
export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym|brak\s+wp[łl]aty\s+wadium/i.test(text || '');
}

// "4. Cena wywoławcza nieruchomości: 73 100,00 zł" / "cena wywoławcza
// nieruchomości ; 7 740,00 zł brutto" (label punctuation varies: ':' or ';').
const RESULT_STARTING_PRICE_RE =
  /[Cc]ena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*[:;]?\s*(\d{1,3}(?:[\s .]\d{3})*,\d{2})\s*z[łl]/;

/** @param {string} text @returns {number|null} */
export function startingPriceFromWynik(text) {
  const m = RESULT_STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// "Cena osiągnięta w przetargu 73 840,00 zł" (flats) / "cena uzyskana w
// przetargu ; 29 290,00 zł brutto" (land) — CONFIRMED vocabulary split, both
// verbs required.
const RESULT_ACHIEVED_PRICE_RE =
  /[Cc]ena\s+(?:osi[ąa]gni[ęe]ta|uzyskana)\s+w\s+przetargu\s*[:;]?\s*(\d{1,3}(?:[\s .]\d{3})*,\d{2})\s*z[łl]/;

/** @param {string} text @returns {number|null} */
export function achievedPriceFromWynik(text) {
  const m = RESULT_ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── result doc: flat address ────────────────────────────────────────────────

// Narrow, explicit locative -> nominative lookup for villages actually
// observed live in wynik prose (NOT a general Polish-declension solver — same
// tradeoff normalize.js and miedzyrzecz's nominativePlace() document). Extend
// this table as new villages are seen on future runs; an unlisted village
// falls back to its locative spelling as-is (still a valid, usable record —
// it just won't key identically to that property's announcement twin).
const WYNIK_VILLAGE_NOMINATIVE = {
  rychliku: 'Rychlik',
  zubrowie: 'Żubrów',
};

function nominativeVillage(raw) {
  return WYNIK_VILLAGE_NOMINATIVE[foldPl(raw)] || raw;
}

// "Lokal mieszkalny nr 3 w Rychliku, numer budynku 16B, ..." (fused entrance
// letter) / "Lokal mieszkalny nr 3 położony w Rychliku – numer budynku 16,
// klatka B, ..." (split entrance letter) / "Lokal mieszkalny nr 1 w Żubrowie,
// numer budynku 23, ..." (no entrance letter) — all three real, from the SAME
// two physical flats across their different rounds.
const WYNIK_FLAT_ADDR_RE =
  /Lokal\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)\s+(?:po[łl]o[żz]on\w*\s+)?we?\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)[,\s–-]+numer\s+budynku\s*(\d{1,4}[A-Za-z]?)(?:\s*,?\s*klatka\s+([A-Za-złńóśźżąćę]))?/;

/** @param {string} text @returns {string|null} "<Village> <Bldg>/<Apt>" */
export function wynikFlatAddressRaw(text) {
  const m = WYNIK_FLAT_ADDR_RE.exec(text || '');
  if (!m) return null;
  const lokalNr = m[1];
  const village = nominativeVillage(m[2]);
  let building = m[3].toUpperCase();
  const klatka = m[4];
  if (klatka && !/[A-Za-z]$/.test(building)) building += klatka.toUpperCase();
  return `${village} ${building}/${lokalNr}`;
}

// ── result doc: land parcel ─────────────────────────────────────────────────

// "działki nr 437/1 o pow.0.0295 ha ... obręb 0048" / "działki nr 231/17 o
// pow.0.0035 ha ... obręb 48" — comma OR period decimal (both observed:
// period on a CLEAN OCR pass, comma on a born-digital doc — decimal-separator
// inconsistency is a source-wide trait, not specific to scans).
const WYNIK_LAND_RE =
  /dzia[łl]k\w*\s+nr\.?\s*(\d{1,4}\/\d{1,4})\s+o\s+pow\.?\s*(\d+[.,]\d+)\s*ha[\s\S]{0,80}?obr[ęe]b\w*\s*(\d{1,4})/i;

/** @param {string} text @returns {{dzialka_nr:string, obreb:string, area_m2:number|null}|null} */
export function wynikLandParcel(text) {
  const m = WYNIK_LAND_RE.exec(text || '');
  if (!m) return null;
  return { dzialka_nr: m[1], obreb: m[3], area_m2: haToM2(m[2]) };
}

// ── result parser ────────────────────────────────────────────────────────────

/**
 * Parse one "informacja o wyniku przetargu" PDF's text into 0 or 1 concluded
 * auction record. `round` is deliberately ALWAYS null — see the file header
 * for the caught, real Rychlik-16B/3-round-II document whose own round
 * statement ("pierwszy przetarg") is confirmed wrong.
 * @param {string} text
 * @param {string|null} [fallbackDate]  ISO date from the crawl ref
 * @param {string|null} [sourceUrl]     wynik PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const auction_date = resultDateFromText(text) || fallbackDate || null;
  const starting_price_pln = startingPriceFromWynik(text);
  const negative = isNegativeOutcome(text);
  const achieved = negative ? null : achievedPriceFromWynik(text);
  const sold = !negative && achieved != null;

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  // Kind is decided by WHICH extractor actually succeeds, not by kindFromText
  // (which is deliberately scoped to "ogłasza ..." — a phrase that only
  // exists in ANNOUNCEMENT docs; every real wynik doc opens with "Burmistrz
  // Sulęcina podaje do publicznej wiadomości" instead, so that scoping found
  // nothing to classify on and every result doc silently produced kind:
  // 'unknown' until this was caught by running the parser against real
  // captured wynik text). Land- and flat-doc vocabulary is confirmed mutually
  // exclusive on every real document fetched (land docs never say "lokal
  // mieszkalny"; flat docs never pair a "działka nr N/N" with "o pow. X ha"),
  // so trying the more specific land signal first is safe.
  const plot = wynikLandParcel(text);
  if (plot) {
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      address_raw: `Sulęcin, obręb ${plot.obreb}`,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const addressRaw = wynikFlatAddressRaw(text);
  if (!addressRaw) return [];
  const address = parseAddress(addressRaw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    round: null,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: null, // wynik docs don't restate usable area; announcement is the source for that field
    notes,
  }];
}
