// Trzebnica parsers.
//
// UNLIKE both suggested analogs, trzebnica's Logonet BIP is a HYBRID of rich
// structured board XML (naklo-nad-notecia's shape) plus deep fields that only
// live in a table-based PDF attachment (tarnowskie-gory's shape):
//
//   BOARD XML (`/przetargi-nieruchomosci/xml/{page}/1`) already embeds every
//   record's core fields inline — no per-record fetch needed just to see
//   address/kind/price/date/round:
//     <adres-nieruchomosci>Trzebnica ul. Rynek 12. </adres-nieruchomosci>
//     <przetarg-na>I przetarg ustny nieograniczony nr GGN P/6/2026 na
//       sprzedaż ... lokalowej ... w obrębie miasta Trzebnica przy
//       ul.Rynek 12. </przetarg-na>
//     <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
//     <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
//     <cena-wywolawcza>118.900,00 zł. </cena-wywolawcza>
//     <data-przetargu>27      .02      .2026  godz. 10:00</data-przetargu>
//
//   DEEP fields (usable floor area for flats; parcel number + plot area for
//   land) sit ONLY in the announcement PDF attachment's table
//   ("OGŁOSZENIE O PRZETARGU NR GGN P/…"), reached via a per-record fetch to
//   `/przetarg-nieruchomosci/xml/{id}/1` for its <zalaczniki>, e.g.:
//     "Lokal mieszkalny nr 2, ... o łącznej powierzchni użytkowej 93,40 m²
//      oraz z 4 pomieszczeń gospodarczych o łącznej powierzchni 108,80 m²."
//   The table layout (pdftotext -layout) wraps/interleaves columns, so field
//   extraction here deliberately does NOT anchor on a label-to-value gap that
//   could span a column boundary — see unitAreaFromText / landAreaFromText.
//
//   RESULT docs ("INFORMACJA O WYNIKU PRZETARGU", found via a <zalaczniki>
//   entry whose <nazwa> matches "informacj[a-e] o wynik…") are a clean
//   label:value Q&A layout, NOT prose:
//     "Rodzaj przeprowadzonego przetargu: I przetarg ustny nieograniczony"
//     "Oznaczenie nieruchomości ... według katastru nieruchomości:
//        Szczytkowice, dz. nr 49/1"
//     "Cena wywoławcza nieruchomości: 158.700,00 zł"
//     "Najwyższa cena osiągnięta w przetargu: Brak."
//     "Imię, nazwisko ... nabywca nieruchomości: Nie dotyczy. Przetarg
//        zakończony wynikiem negatywnym."
//   ACHIEVED-PRICE STREAM IS VERY SPARSE: a live census of all 366 board
//   records (2026-07-11) found exactly 2 with a body-CONFIRMED result
//   attachment — both from GGN P/10/2026 (Szczytkowice, two parcels sold in
//   separate przetargi under one shared announcement), both UNSOLD. A THIRD
//   attachment (Kobylice GGN P/9/2026) is <nazwa>-labeled "Informacja o
//   wyniku przetargu" but its BODY is actually a re-upload of the
//   announcement text (a real clerical mistake, confirmed by cross-reading a
//   later notice's "Terminy wcześniejszych przetargów" recap, which states
//   that round concluded "wynikiem negatywnym") — hence isResultNotice() ALWAYS
//   re-checks the fetched body, never trusting the attachment's <nazwa> alone
//   (crawl.js does the same before ever populating the WYNIK field).
//
// crawl.js assembles every record into ONE labelled text blob via
// buildRecordText() (below, same pattern as naklo-nad-notecia); every parse
// function reads that blob. The test builds the SAME blob from real captured
// board-XML field strings + real captured PDF-attachment text (extracted live
// via core/pdf-text.js, exactly like parse-naklo-nad-notecia.test.js), so the
// parsers are groundtruthed against production data without re-fetching.
//
// Live-verified field quirks (2026-07-11 census, 366 records):
//   - <adres-nieruchomosci> is WILDLY inconsistent: "Trzebnica ul. Rynek 12."
//     / "Trzebnica, ul. Witosa 12/13" / "W. Witosa 12/13 Trzebnica" (reversed,
//     no comma) / "Trzebnica ul.W. Witosa 12/13" (no space after "ul.") — all
//     the SAME physical flat across different years. cleanAdres() normalizes
//     all four shapes to the same joinable address key.
//   - Village-only flats (e.g. Boleścin GGN P/14/2026) have NO street/building
//     anywhere — board XML AND the PDF both just say the village name — the
//     property is identified purely by village + "Lokal mieszkalny nr N" +
//     its underlying parcel set. addressRawFromText() falls back to
//     "<village> 0/<lokalNr>", reusing normalize.js's own "unit known,
//     building unknown" convention (its bare "garaż nr N" fallback also
//     synthesizes building='0').
//   - <cena-wywolawcza> mixes dot-thousands ("149.450,00") AND space-thousands
//     ("215 700,00") separators, sometimes omits "zł" entirely, and ONE
//     observed record bundles TWO parcels' prices in one field ("l.p.1  -
//     158.700,00 zł.         lp.2 -  188.400,00 zł.", Szczytkowice GGN
//     P/10/2026 — two parcels, "zbywana w odrębnym przetargu" each, but one
//     shared announcement). Known simplification: startingPriceFromText takes
//     the FIRST amount for such multi-lot notices; each parcel's OWN
//     concluded price is still fully recoverable from ITS OWN result doc
//     (confirmed: 6929 dz 49/1 @ 158.700,00, 6930 dz 49/2 @ 188.400,00).
//   - <data-przetargu> is the same spaced-dot shape as naklo/Chełmno ("11
//     .08                        .2026  godz. 09:00"), sometimes without a
//     "godz." time part at all.
//   - Round is ALWAYS a leading Roman numeral (I..VII observed) — never a
//     Polish word ordinal like tarnowskie-gory/naklo's prose sometimes uses.
//   - ZERO najem/dzierżawa (lease) records exist anywhere in the 366-record
//     census — isLease() is a defensive-only gate (no live fixture exists;
//     the test fixture is a synthetic pattern mirroring naklo's REAL lease
//     phrasing, clearly labelled as such).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const TOWN = 'Trzebnica';

// ------------------------------------------------------------------ numbers

// "149.450,00" / "215 700,00" / "364.200,00 zł" -> integer PLN. Dot OR
// (regular/NBSP) space thousands separator (trzebnica's board XML mixes
// both); optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "93,40" / "108.80" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML/CDATA fragment OR a plain extracted-PDF string to a
 *  single line of plain text. Safe on PDF text: the target patterns below
 *  (a bare "X,XX m²", a 4-decimal ha figure, a label immediately followed by
 *  its value) all stay adjacent on their SOURCE line even inside a
 *  multi-column pdftotext -layout table, so flattening newlines to spaces
 *  never separates a token from the pattern that anchors it — it just also
 *  joins in whatever unrelated column text sat between them, which the
 *  patterns are already bounded/anchored enough to ignore. */
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
 * board-XML field strings (always available) + OGLOSZENIE (the extracted
 * announcement-attachment text, only fetched for currently-active records)
 * + WYNIK (the extracted result-attachment text, only set once
 * isResultNotice() has confirmed the body — never trust the attachment
 * <nazwa> alone, see header). The test passes the same real captured strings.
 * @param {{adres?:string, rodzaj?:string, cena?:string, data?:string,
 *   typ?:string, przetargNa?:string, ogloszenie?:string, wynik?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `ADRES: ${stripHtml(f.adres)}`,
    `RODZAJ: ${stripHtml(f.rodzaj)}`,
    `CENA: ${stripHtml(f.cena)}`,
    `DATA: ${stripHtml(f.data)}`,
    `TYP: ${stripHtml(f.typ)}`,
    `PRZETARGNA: ${stripHtml(f.przetargNa)}`,
    `OGLOSZENIE: ${stripHtml(f.ogloszenie)}`,
    `WYNIK: ${stripHtml(f.wynik)}`,
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

/** A record is CONCLUDED when its WYNIK (the fetched + body-confirmed
 *  "Informacja o wyniku …" attachment text) is non-empty. crawl.js only
 *  populates WYNIK once isResultNotice() has confirmed the body — so empty
 *  ⇒ still pending, no result posted, OR the labelled attachment turned out
 *  to be mislabeled (see header, Kobylice GGN P/9/2026). */
export function hasResolution(text) {
  return field(text, 'WYNIK').length > 0;
}

/** Is this fetched attachment text an ACTUAL result notice body (vs. a
 *  mislabeled re-upload of the announcement, or anything else)? The header
 *  "INFORMACJA O WYNIKU PRZETARGU" is the sole authority — crawl.js calls
 *  this on the RAW fetched text before ever assigning it to WYNIK, and
 *  parseResultDoc re-checks it on the blob's WYNIK field as defense in depth. */
export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIKU\s+PRZETARGU/i.test(text || '');
}

/** True when this record is a DZIERŻAWA / NAJEM (a lease, not a sale).
 *  DEFENSIVE ONLY — a full live census of all 366 board records (2026-07-11)
 *  found zero lease records on this board (every "Nieruchomość zabudowana" /
 *  "Lokal użytkowy" observed was a sale of ownership, e.g. "VI przetarg ...
 *  na sprzedaż prawa własność komunalnego lokalu użytkowego ..."). Kept in
 *  case a future record ever mixes one in (mirrors naklo-nad-notecia's real,
 *  observed isLease pattern on the same CMS family). */
export function isLease(text) {
  const t = `${field(text, 'RODZAJ')} ${field(text, 'PRZETARGNA')} ${field(text, 'CENA')} ${field(text, 'TYP')}`;
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s*\/?\s*miesi[ęe]cznie|miesi[ęe]cznie\s*$|rocznie\s*$/im.test(t);
}

// ----------------------------------------------------------------- kind

/** Kind from the "Rodzaj nieruchomości" board field, falling back to the
 *  przetarg-na sale clause. "Nieruchomość niezabudowana" → grunt (land.json);
 *  "Lokal mieszkalny" → mieszkalny; "Nieruchomość zabudowana" → zabudowana;
 *  "Lokal użytkowy" → uzytkowy. */
export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  return classifyKind(field(text, 'PRZETARGNA'));
}

// ----------------------------------------------------------------- round

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
 * Auction round. Every phrasing observed anchors a Roman numeral directly
 * before "przetarg[u]": PRZETARGNA opens with it directly ("III przetarg
 * ustny nieograniczony nr GGN P /15/2026 …"); the OGLOSZENIE PDF header
 * states it in "… ogłasza I przetarg ustny nieograniczony na sprzedaż …";
 * WYNIK states it in "Rodzaj przeprowadzonego przetargu: I przetarg ustny
 * nieograniczony". WYNIK (once present — a CONCLUDED record) is authoritative
 * over the shared/ambiguous board fields, same reasoning as
 * startingPriceFromText. Returns null when no phrasing matched.
 */
export function roundFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (wynik) {
    const m = /(?:Rodzaj\s+przeprowadzonego\s+przetargu|przeprowadzon\w*\s+zosta[łl]\w*)[\s\S]{0,60}?\b([IVXL]{1,5})\b\s+przetarg/i.exec(wynik);
    if (m) {
      const r = romanToInt(m[1]);
      if (r) return r;
    }
  }
  const na = field(text, 'PRZETARGNA');
  let m = /^\s*([IVXL]{1,5})\s+przetarg/i.exec(na);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  const ogl = field(text, 'OGLOSZENIE');
  m = /ogłasza\s+([IVXL]{1,5})\s+przetarg/i.exec(ogl);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  return null;
}

// ----------------------------------------------------------------- date

/**
 * Auction date. The structured DATA field is the spaced-dot shape shared
 * with naklo/Chełmno on the same CMS ("11    .08    .2026  godz. 09:00",
 * sometimes with no "godz." part at all) — always present on every board
 * record, announcement or result alike, so it is the primary and near-always
 * sufficient source. A WYNIK "DD.MM.YYYY rok" fallback is kept defensively
 * (not required by any live fixture — DATA already covers results too, since
 * it is the SAME board record being enriched, not a separate one).
 * -> ISO date or null.
 */
export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const wynik = field(text, 'WYNIK');
  m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})\s*rok/i.exec(wynik);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

// ----------------------------------------------------------------- prices

/**
 * Starting price. WYNIK's clean "Cena wywoławcza nieruchomości: X zł" is
 * authoritative when present (a CONCLUDED record — critically, for a
 * multi-parcel notice like Szczytkowice GGN P/10/2026 this is the ONLY place
 * each parcel's OWN price is unambiguous; the shared board CENA field would
 * return lot 1's price for BOTH parcels). Otherwise falls back to the board
 * CENA field's leading amount — take the FIRST amount for the rare
 * multi-lot "l.p.1 - X zł.  lp.2 - Y zł." shape (documented simplification,
 * see file header).
 */
export function startingPriceFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (wynik) {
    const m = /Cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*:?\s*(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(wynik);
    if (m) {
      const v = parsePLN(m[1]);
      if (v != null) return v;
    }
  }
  const cena = field(text, 'CENA');
  let m = /(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(cena);
  if (!m) m = /(\d[\d.\s ]*(?:,\d{2})?)/.exec(cena);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result docs only) — ONLY from WYNIK's "Najwyższa cena
 *  osiągnięta w przetargu: X zł" line. A numeric value => sold; the observed
 *  "Brak." (no digit) => null => unsold. */
export function achievedPriceFromText(text) {
  const wynik = field(text, 'WYNIK');
  const m = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:?\s*(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(wynik);
  return m ? parsePLN(m[1]) : null;
}

/** True when WYNIK explicitly states a negative (unsold) outcome — observed
 *  phrasing "Nie dotyczy. Przetarg zakończony wynikiem negatywnym." in the
 *  buyer-name field, when no buyer was established. */
export function isNegativeOutcome(text) {
  const wynik = field(text, 'WYNIK');
  return /wynikiem\s+negatywnym|nie\s+dotyczy/i.test(wynik);
}

// ----------------------------------------------------------------- area (flat)

// A bare "X,XX m²" / "X.XX m2" anywhere in the announcement text. Trzebnica's
// announcement PDFs never use a 2-decimal m² figure for anything OTHER than a
// unit's own usable floor area or its outbuildings (ha plot figures are
// always 4-decimal, see landAreaFromText) — so the FIRST such figure is
// reliably the flat's OWN usable area, stated before any attached outbuilding
// total in every observed announcement's prose ("Lokal mieszkalny nr 2 ... o
// łącznej powierzchni użytkowej 93,40 m² oraz z 4 pomieszczeń gospodarczych o
// łącznej powierzchni 108,80 m²." — 93,40 first, 108,80 the outbuilding).
// Deliberately NOT anchored on the "powierzchni użytkowej" label text itself:
// in the pdftotext -layout table output the label and its value can land on
// different lines/columns (see file header), which a label-to-value gap
// regex would fail or mis-match across.
const AREA_M2_RE = /(\d{1,4}[.,]\d{1,2})\s*m\s*[²2](?!\d)/;

/** Usable floor area (m2) of a flat/unit from the announcement attachment
 *  text, or null (OGLOSZENIE is empty for historical records whose
 *  attachment wasn't fetched — see crawl.js). */
export function unitAreaFromText(text) {
  const ogl = field(text, 'OGLOSZENIE');
  const m = AREA_M2_RE.exec(ogl);
  return m ? parseArea(m[1]) : null;
}

// ----------------------------------------------------------------- land plot

// A bare 4-decimal hectare figure ("0,3873" / "0,1099"). COMMA-only decimal
// separator is load-bearing, NOT "[.,]": Polish uses a comma for a decimal
// point but a PERIOD only as a date/citation separator, and both the intro
// paragraph's zarządzenie number ("nr OR.0050.41.2025") and the table's
// zoning-resolution date ("z dnia 29.11.2022 r.") contain a period-separated
// "<1-2 digits>.<4 digits>" substring that is INDISTINGUISHABLE from a ha
// figure's shape if "." is accepted too (regression: matched "41.2025" from
// the citation as if it were the plot's 0,3873 ha). Money uses 2-decimal
// grosze and the table's "Pow. gruntu (ha)" column is the only genuine
// COMMA-decimal 4-digit figure in these documents, so this shape alone is
// enough to find it without reconstructing the table's column layout.
const HA_RE = /\b(\d{1,2},\d{4})\b/;

function landAreaFromOgloszenie(ogl) {
  const m = HA_RE.exec(ogl || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return ha > 0 ? Math.round(ha * 10000) : null;
}

/**
 * Parcel number + village for a LAND record.
 *   RESULT docs (WYNIK) state it unambiguously: "Oznaczenie nieruchomości
 *   będącej przedmiotem przetargu według katastru nieruchomości: Szczytkowice,
 *   dz. nr 49/1" — "<village>, dz. nr X/Y", used verbatim when present.
 *   ANNOUNCEMENT prose (OGLOSZENIE) has no such clean label — best-effort:
 *   take the LAST "działki? nr X/Y" mention in the text. The subject parcel
 *   is consistently restated at the END of the description in the one
 *   pattern observed live (Kobylice: "... poprzez gminną drogę wewnętrzną
 *   (działka nr 258) ..." (a NEIGHBOUR/access parcel, mentioned first) "...
 *   Najbliższa droga publiczna znajduje się w odległości ok. 360 m od
 *   działki nr 1/2." (the SUBJECT parcel, restated last)) — an EARLIER
 *   mention risks being a neighbouring/access parcel instead.
 * @returns {{ dzialka_nr: string|null, village: string|null }}
 */
export function landPlotFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (wynik) {
    const m = /([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ .-]*?)\s*,\s*dz\.?\s*nr\.?\s*(\d+(?:\/\d+)?)/i.exec(wynik);
    if (m) return { dzialka_nr: m[2], village: m[1].trim() };
  }
  const ogl = field(text, 'OGLOSZENIE');
  const all = [...ogl.matchAll(/dzia[łl]k\w*\s+nr\.?\s+(\d+(?:\/\d+)?)/gi)];
  return { dzialka_nr: all.length ? all[all.length - 1][1] : null, village: null };
}

/** Plot area (m2) for a LAND record — the announcement table's ha figure is
 *  the only source observed (WYNIK never restates it). */
export function landAreaFromText(text) {
  return landAreaFromOgloszenie(field(text, 'OGLOSZENIE'));
}

// obręb (cadastral precinct) — "położonej w obrębie wsi Boleścin." /
// "w obrębie miasta Trzebnica." / "części obrębu Kobylice," (OGLOSZENIE
// prose, different declension). One or two capitalised words.
const OBREB_RE = /obr[ęe]b\w*\s+(?:wsi\s+|miasta\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZżźćłśąęóńŻŹĆŁŚĄĘÓŃ]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZżźćłśąęóńŻŹĆŁŚĄĘÓŃ]*)?)/;

/** obręb name, or null. */
export function obrebFromText(text) {
  const hay = `${field(text, 'PRZETARGNA')} ${field(text, 'OGLOSZENIE')}`;
  const m = OBREB_RE.exec(hay);
  return m ? m[1].trim() : null;
}

// ----------------------------------------------------------------- address

/** Strip the town name "Trzebnica" from either end of the raw ADRES field
 *  (leading "Trzebnica[,] ul. X" OR trailing "ul. X Trzebnica" — both shapes
 *  observed live), normalize a missing space after "ul./al./pl./os." (e.g.
 *  "ul.W. Witosa" -> "ul. W. Witosa" — WITHOUT this fix the SAME flat's
 *  street would streetNorm to two DIFFERENT join keys depending on which
 *  year's record you read), and drop stray trailing punctuation. Trzebnica
 *  is the only settlement in the gmina with "ul."-style streets — villages
 *  (Boleścin, Kobylice, …) have none, so this never strips a real street. */
function cleanAdres(raw) {
  let s = (raw || '').trim();
  if (!s) return '';
  s = s.replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ');
  s = s.replace(new RegExp(`^\\s*${TOWN}\\s*,?\\s*`, 'i'), '');
  s = s.replace(new RegExp(`\\s*,?\\s*${TOWN}\\s*\\.?\\s*$`, 'i'), '');
  s = s.replace(/\s*\.\s*$/, '');
  return s.replace(/\s+/g, ' ').trim();
}

/** Flat/unit number from the announcement text ("Lokal mieszkalny nr 2, …"). */
function flatNoFromText(text) {
  const hay = `${field(text, 'OGLOSZENIE')} ${field(text, 'PRZETARGNA')}`;
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(hay);
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat / built property, or
 *  null. Village-only flats (no street/building anywhere on the BIP, e.g.
 *  Boleścin) fall back to "<village> 0/<lokalNr>" — see file header. */
export function addressRawFromText(text) {
  const cleaned = cleanAdres(field(text, 'ADRES'));
  if (!cleaned) return null;
  if (/\d/.test(cleaned)) return cleaned; // already "<street> <bldg>[/<apt>]"
  const lokal = flatNoFromText(text);
  return lokal ? `${cleaned} 0/${lokal}` : null;
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
    const { dzialka_nr } = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(text),
      area_m2: landAreaFromText(text),
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
 * Parse one CONCLUDED record blob (non-empty, body-confirmed WYNIK) into a
 * concluded auction record. Returns 0 or 1 record (array = framework
 * interface). Joins its announcement by address (+ flat-no) + round, or by
 * dzialka_nr for land, in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date from the crawl ref
 * @param {string} sourceUrl  the result attachment URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!hasResolution(text)) return [];
  const wynikBody = field(text, 'WYNIK');
  // Defense in depth against a mislabeled attachment (see file header,
  // Kobylice GGN P/9/2026) — crawl.js already gates on this before ever
  // setting WYNIK, but the parser must not trust its input blindly either.
  if (!isResultNotice(wynikBody)) return [];

  const notes = [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);
  const isLand = kind === 'grunt' || /dz\.?\s*nr\.?\s*\d/i.test(wynikBody);

  if (isLand) {
    const { dzialka_nr, village } = landPlotFromText(text);
    const address_raw = village || cleanAdres(field(text, 'ADRES')) || null;
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb: village || obrebFromText(text),
        area_m2: landAreaFromText(text),
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
