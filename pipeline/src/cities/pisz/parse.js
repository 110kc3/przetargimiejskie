// Pisz parsers — bip.pisz.hi.pl (hi.pl / PUBLIKATOR-style hosted BIP).
//
// Every notice is ONE flowing HTML article: crawl.js extracts the article's
// <h2 class="wiadomosc-tytul"> (TITLE), <div class="podtytul"> (PODTYTUL — a
// second-line summary; sometimes carries the ONLY substantive hint when TITLE
// is a bare "Wykaz"/"Ogłoszenie") and <div class="tresc"> (BODY) and pairs them
// into ONE labelled blob via buildRecordText(). Every parser below reads that
// blob. The test builds the SAME blob from real captured title+podtytul+body
// strings, so the parsers are groundtruthed against live data.
//
// THE CLASSIFICATION CHALLENGE (see also crawl.js header): the "Ogłoszenia"
// board (k=84) mixes FOUR unrelated notice families under overlapping title
// vocabulary:
//   1. LEASE / LOAN-FOR-USE wykazy — "Wykaz ... przeznaczonej do
//      wydzierżawienia" / "do oddania w użyczenie" — the majority of the
//      board (spike: 89+). Never a sale. -> isLease()
//   2. BEZPRZETARGOWO (non-auction) sale wykazy — title says "Wykaz ...
//      przeznaczonych do sprzedaży (lokal - ul. X)", INDISTINGUISHABLE from a
//      genuine pre-auction wykaz BY TITLE ALONE, but the body always states
//      "Lokal mieszkalny jest przedmiotem sprzedaży NA RZECZ NAJEMCY" (95%
//      bonifikata to the sitting tenant) or "...na rzecz użytkownika
//      wieczystego" — never goes to public auction. -> isBezprzetargowo()
//      Groundtruthed live 2026-07-10: wiad 31080 (Lipowa 9/26), 31063
//      (Matejki 3/7), 30467/30466/30465 (Rostki 41, units 5/2/1), 30670
//      (Pisz 1, dz. 1799/1 i 1793, "na rzecz użytkownika wieczysstego") — ALL
//      five 2026 flat wykazy on the current board are bezprzetargowo; the one
//      genuine pre-auction flat wykaz found (Klementowskiego 6/3, wiad 28368,
//      10 sty 2025) instead closes "8. Sprzedaż nieruchomości nastąpi w
//      drodze przetargu." with NO "na rzecz najemcy"/bonifikata anywhere.
//   3. GENUINE pre-auction wykaz (no date/price yet) -> isWykazNotice() ->
//      crawlActive().wykaz (address-keyed only — land wykazy have no street
//      and are dropped, matching the ADAPTER-GUIDE convention).
//   4. Real ANNOUNCEMENT ("ogłasza [pierwszy/drugi/.../czwarty] publiczny
//      przetarg ustny [nie]ograniczony na sprzedaż ...", always with a
//      scheduled "Przetarg odbędzie się dnia ...") and RESULT ("komisja
//      przetargowa przeprowadziła w dniu ... przetarg ... na sprzedaż ...")
//      notices — the actual auction stream. A handful of notices sell a CAR
//      ("na sprzedaż samochodu osobowego") via the same "Ogłoszenie o Nth
//      przetargu publicznym" title/round shape; isSaleAuction() requires
//      "nieruchomo..." too, which these lack (and their <tresc> is empty —
//      the notice is PDF-only), so they never reach parseAnnouncement.
//
// All regexes groundtruthed against live documents (verified 2026-07-10):
//   FLAT announcement (round II): wiad 29472  Pisz, ul. Klementowskiego 6/4
//     "ogłasza drugi publiczny przetarg ustny nieograniczony na sprzedaż
//      nieruchomości ... Położenie nieruchomości – Pisz, ul. Klementowskiego
//      6/4, Numer działki – 232/8, Powierzchnia nieruchomości – 440 m2 ...
//      lokal mieszkalny nr 4 o powierzchni użytkowej 91,35 m2 ... Cena
//      wywoławcza nieruchomości – 235.000,00 zł ... Przetarg odbędzie się
//      dnia 14 października 2025 r. ... 2. Pierwszy przetarg ... został
//      przeprowadzony w dniu 16 czerwca 2025 r." (round + date decoy the
//      parser must avoid — anchored on "ogłasza <word>" / "odbędzie się dnia").
//   FLAT result UNSOLD (round II): wiad 29789  Klementowskiego 6/4
//     "komisja przetargowa przeprowadziła w dniu 14 października 2025 r. ...
//      przetarg ustny nieograniczony na sprzedaż nieruchomości – lokalu
//      mieszkalnego nr 4 przy ul. Klementowskiego 6 w Piszu ... Cena
//      wywoławcza ... ustalona na kwotę 235.000 zł. Przetarg zakończył się
//      wynikiem negatywnym ponieważ nikt nie przystąpił do przetargu."
//   FLAT wykaz, GENUINE pre-auction: wiad 28368  Klementowskiego 6/3
//     "WYKAZ ... 1. Położenie nieruchomości – Pisz, ul. Klementowskiego 6/3,
//      ... lokal mieszkalny nr 3 o pow. użytkowej 109,83 m2 ... 8. Sprzedaż
//      nieruchomości nastąpi w drodze przetargu."
//   LAND announcement (round II, restricted-eligibility "ograniczony"):
//     wiad 30881  obręb Karwik, dz. 69/4 — "ogłasza drugi publiczny przetarg
//      ustny nieograniczony ... Położenie nieruchomości – obręb Karwik,
//      Numer działki – 69/4, Powierzchnia nieruchomości – 665 m2 ... Opis
//      nieruchomości - nieruchomość niezabudowana, Cena wywoławcza
//      nieruchomości – 70.000,00 zł ... Przetarg odbędzie się dnia 24
//      czerwca 2026 r."
//   LAND result SOLD (round I, "za cenę"-free, "w wysokości" achieved-price
//     phrasing, WITH a wadium-amount decoy that also says "w wysokości"):
//     wiad 29371  obręb Pisz 2, dz. 450/34 i 450/38 —
//     "przetarg ustny ograniczony na sprzedaż nieruchomości położonej w
//      obrębie Pisz 2, oznaczonymi działek 450/34 i 450/38 ... Cena
//      wywoławcza ... 12.700,00 zł netto. W przetargu wzięły udział 2
//      podmioty, które po wpłaceniu WADIUM w wysokości 2.500,00 zł zostały
//      dopuszczone ... Po trzecim wywołaniu najwyższej zaoferowanej CENY w
//      wysokości 100.000,00 zł netto przetarg zamknięto ... Arkadiusz
//      Kulikowski został ustalony jako nabywca." — achievedPriceFromText
//      anchors on "cen[y] w wysokości", never the earlier wadium amount.
//   LAND result UNSOLD (round I, restricted "ograniczony" tender):
//     wiad 30948  obręb Pisz 1, dz. 1886/24 — generic title "Ogłoszenie o
//      rozstrzygnięciu przetargu" (NO location in the title — body-only).
//   BEZPRZETARGOWO flat wykaz (never an auction): wiad 31080  Lipowa 9/26 —
//     "Lokal mieszkalny jest przedmiotem sprzedaży na rzecz najemcy ...
//      Cena sprzedaży nieruchomości po udzieleniu bonifikaty 95% wynosi
//      24.000,00 zł."
//   LEASE wykaz (skipped): wiad 31191  "Wykaz nieruchomości przeznaczonej do
//      wydzierżawienia (Pisz 1, cz. dz. nr 1886/25)".
//   LOAN-FOR-USE wykaz (skipped): wiad 29655  "Wykaz nieruchomości
//      przeznaczonej do oddania w użyczenie (Wiartel)".
//
// Achieved-price stream for FLATS specifically is WEAK as of 2026-07-10 (both
// captured 2023 and 2025 Klementowskiego rounds ended "wynikiem negatywnym");
// achievedPriceFromText/isNegativeOutcome are shared kind-agnostic logic and
// are proven against the real LAND sale above (kind only changes which
// address extractor runs) — parse gaps are noted in record .notes.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "235.000,00" / "330 000" / "2.302.240,00" -> integer PLN. Dot OR (regular/
// NBSP) space thousands separator; optional ",00" grosze tail (matches both
// the announcement's "235.000,00 zł" and the older docs' bare "330 000 zł").
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "91,35" / "440" -> number. Comma OR dot decimal; NBSP/space stripped.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML fragment to a single line of plain text. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sect;/g, '§').replace(/&sup2;/g, '²')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * already-extracted TITLE (h2.wiadomosc-tytul / board zajawka__tytul),
 * PODTYTUL (div.podtytul — sometimes the only substantive text, e.g. a
 * generic "Wykaz" TITLE with the real notice summary in the subtitle) and
 * BODY (div.tresc); the test passes the raw captured strings and lets
 * stripHtml run.
 * @param {{title?:string, podtytul?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `PODTYTUL: ${stripHtml(f.podtytul)}`,
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

/** TITLE + PODTYTUL + BODY concatenated — the searchable surface for anchored
 *  regexes (some notices carry their only real content in PODTYTUL). */
function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'PODTYTUL')} ${field(text, 'BODY')}`.trim();
}

// ----------------------------------------------------------------- doc-type gates

/** DZIERŻAWA / NAJEM / loan-for-use (użyczenie) — always skipped, never a
 *  sale. "wydzierżawienia" contains "dzierżaw" as a substring so one regex
 *  covers both "dzierżawa" and "wydzierżawienie/-nia". `\bnajem\b` requires a
 *  bare word so it does NOT false-positive on "najemcy"/"najemcę" (the
 *  bezprzetargowo-to-tenant clause, a genuine SALE — see isBezprzetargowo). */
export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|u[żz]yczeni/i.test(t);
}

/** "w drodze zamiany" (property swap) — not a sale, skipped. */
export function isExchange(text) {
  const t = whole(text);
  return /w\s+drodze\s+zamiany/i.test(t);
}

/** True when the sale is BEZPRZETARGOWO (to the sitting tenant at up to 95%
 *  bonifikata, or to a perpetual-usufruct holder) rather than a public
 *  auction — these share the "Wykaz ... przeznaczonych do sprzedaży" TITLE
 *  with a genuine pre-auction wykaz and are only distinguishable by body
 *  content. See file header for the five real 2026 fixtures this catches. */
export function isBezprzetargowo(text) {
  const t = whole(text);
  return /bezprzetargow|na\s+rzecz\s+najemc|na\s+rzecz\s+u[żz]ytkownika\s+wieczyst|na\s+rzecz\s+dotychczasowego|bonifikat/i.test(t);
}

/** True when this notice is a SALE auction: mentions przetarg + sprzedaż +
 *  real estate. The "nieruchomo..." requirement is what excludes the board's
 *  occasional car-auction notices ("Ogłoszenie o Nth przetargu publicznym" /
 *  "na sprzedaż samochodu osobowego"), whose <tresc> is empty anyway (PDF
 *  attachment only, not extracted by this html-source adapter). */
export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t) && /nieruchomo/i.test(t);
}

/** True for a real ANNOUNCEMENT: carries the future-tense scheduled-date
 *  clause. This is what distinguishes an announcement from a wykaz (no date
 *  yet) and from a result (past-tense "przeprowadził/-a/-ono"). */
export function hasScheduledDate(text) {
  return /odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu|dnia)\s+/i.test(whole(text));
}

/** True for a concluded "wyniku przetargu" / "rozstrzygnięciu przetargu"
 *  notice (title varies — sometimes generic, e.g. "Ogłoszenie o
 *  rozstrzygnięciu przetargu" with no location in the title at all — so this
 *  is body-anchored on the committee's past-tense "przeprowadził(a)/-ono w
 *  dniu" clause, not the title). */
export function isResultDoc(text) {
  const t = whole(text);
  // NOTE: \w* is ASCII-only in JS regex — it does NOT match "ł", so a naive
  // "przeprowadzi\w*" stops dead before the real inflection "przeprowadziła"
  // (feminine, agreeing with "komisja") and the required "\s+" after it then
  // never matches. \S* (non-whitespace) is used instead wherever a matched
  // stem must absorb a Polish-accented inflectional ending.
  return /wyniku\s+przetargu|rozstrzygni[ęe]ciu\s+przetargu|komisja\s+przetargowa\s+przeprowadzi|przeprowadzi\S*\s+w\s+dniu|przetarg\s+zako[ńn]czy[łl]\s+si[ęe]/i.test(t);
}

/** True when the result explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi[łl]?\s+do\s+przetargu|nie\s+przyst[ąa]pi[łl]\s+do\s+przetargu|brak\s+ofert|uniewa[żz]ni/i.test(t);
}

/** True for a GENUINE pre-auction wykaz (no date/price yet — "keep the clean
 *  address, don't treat as a scheduled auction" per ADAPTER-GUIDE). Callers
 *  MUST check isLease/isExchange/isBezprzetargowo FIRST — this only checks
 *  the title says "Wykaz" over a real-estate sale designation. */
export function isWykazNotice(text) {
  const title = field(text, 'TITLE');
  const t = whole(text);
  return /wykaz/i.test(title) && /nieruchomo/i.test(t) && /przeznaczon\w*\s+do\s+sprzeda/i.test(t);
}

// ----------------------------------------------------------------- round

const ROUND_WORD_TO_INT = {
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, 'piąty': 5,
  'szósty': 6, 'siódmy': 7, 'ósmy': 8, 'dziewiąty': 9, 'dziesiąty': 10,
};
const ROUND_WORD_RE =
  /og[łl]asza\s+(pierwszy|drugi|trzeci|czwarty|pi[ąa]ty|sz[óo]sty|si[óo]dmy|[óo]smy|dziewi[ąa]ty|dziesi[ąa]ty)\s+(?:publiczny\s+)?przetarg/i;

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
 * Auction round. PRIMARY: the WORD ordinal directly after "ogłasza" ("ogłasza
 * drugi publiczny przetarg") — this is what every 2025/2026 real-estate
 * notice uses, and anchoring on "ogłasza <word>" (not a bare word ordinal)
 * means the prior-round-history decoy ("2. Pierwszy przetarg na sprzedaż
 * nieruchomości został przeprowadzony w dniu ...", which starts a NEW
 * sentence with no "ogłasza" before it) never matches. FALLBACK: a Roman
 * numeral in the same "ogłasza <ROMAN>" position (older template, e.g. a 2014
 * vintage doc's "ogłasza II publiczny przetarg"), then a bare "<ROMAN>
 * przetargu publicznym" (title-only form used by the board's car-auction
 * notices — harmless since those never reach an address-bearing parse).
 * Returns null when unstated (wykaz notices).
 */
export function roundFromText(text) {
  const t = whole(text);
  const wm = ROUND_WORD_RE.exec(t);
  if (wm) return ROUND_WORD_TO_INT[wm[1].toLowerCase()] ?? null;
  let m = /og[łl]asza\s+([IVXL]{1,4})\s+(?:publiczny\s+)?przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /\b([IVXL]{1,4})\s+przetargu\s+publicznym\b/i.exec(t);
  return m ? romanToInt(m[1]) : null;
}

// ----------------------------------------------------------------- date

/** "14 października 2025" (word month) or "04.08.2026" (numeric) -> ISO. */
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
 * Auction date. PRIMARY (announcement): the future-tense clause "Przetarg
 * odbędzie się dnia 14 października 2025 r." — anchored on "odbędzie się
 * (w dniu|dnia)" so the prior-round history "...został przeprowadzony w dniu
 * 16 czerwca 2025 r." (PAST tense, no "odbędzie") can't win. FALLBACK
 * (result): "komisja przetargowa przeprowadziła w dniu 14 października 2025
 * r.". -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  let m = /odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /przeprowadzi\S*\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. Covers BOTH the announcement's short dash form ("Cena
 *  wywoławcza nieruchomości – 235.000,00 zł") and the result's long clause
 *  ("Cena wywoławcza nieruchomości będącej przedmiotem przetargu została
 *  ustalona na kwotę 235.000 zł") via a wide (bounded) non-digit gap. Stops
 *  at the first "zł", so a trailing "+ 23% podatku VAT" is never absorbed. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz\w*[^0-9]{0,100}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is named ("... nabywca ..."). Anchored
 *  on "cen[a/y/ę] w wysokości <amount> zł" (NOT a bare "w wysokości", which
 *  would catch an EARLIER wadium-amount decoy in the same result doc, e.g.
 *  "wadium w wysokości 2.500,00 zł" appearing before the real "najwyższej
 *  zaoferowanej ceny w wysokości 100.000,00 zł" — requiring "cen..." right
 *  before "w wysokości" skips the wadium clause entirely; \S* — not \w*, see
 *  isResultDoc — so the accusative "cenę" still matches). Falls back to the
 *  Zgorzelec/Chełm-style "za cenę X zł" phrasing for robustness. A numeric
 *  value => sold; null => unsold / not stated. */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  let m = /cen\S*\s+w\s+wysoko[śs]ci\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  if (!m) m = /za\s+cen[ęe]\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

// The SHARED core/classify-kind.js LAND_RE anchors on "dzia[łl]k" (matches
// "działka"/"działki"/"działką" — "k" directly follows "ł"), which does NOT
// match the genitive plural "działek" (a fleeting-vowel inflection: an "e" is
// inserted before the "k") — a real, observed pisz phrasing ("oznaczonymi
// numerami działek 450/34 i 450/38", a LAND result with no "niezabudowan..."
// anywhere else in the doc — wiad 29371, groundtruthed 2026-07-10) falls all
// the way through classifyKind() as 'unknown'. core/ is shared and must not
// be edited for one city, so this is compensated locally: if the shared
// classifier can't decide even on the whole blob, but the text plainly names
// an undeveloped parcel, call it 'grunt' here. Scoped to fire ONLY after all
// three classifyKind() tiers already missed, so it can never override a
// flat/commercial notice's own "udział w działce ..." aside.
const LAND_FALLBACK_RE = /niezabudowan|dzia[łl](?:k[aęiąo]|ek)\b/i;

/** Kind from TITLE first, then PODTYTUL (some notices carry the only
 *  substantive hint there, e.g. a bare "Ogłoszenie" title whose podtytul is
 *  "publiczny przetarg ustny nieograniczony na sprzedaż (dz. nr ...)"),
 *  falling back to the full text, then the LAND_FALLBACK_RE gap-patch above. */
export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  const k2 = classifyKind(field(text, 'PODTYTUL'));
  if (k2 !== 'unknown') return k2;
  const w = whole(text);
  const k3 = classifyKind(w);
  if (k3 !== 'unknown') return k3;
  return LAND_FALLBACK_RE.test(w) ? 'grunt' : 'unknown';
}

// ----------------------------------------------------------------- address

// FLAT/COMMERCIAL address — the structured "Położenie nieruchomości" field
// used by BOTH announcements and wykazy: "Położenie nieruchomości – Pisz, ul.
// Klementowskiego 6/4," (building+apt in one "N/M" token). The optional
// city-name/"obręb" prefix block and the requirement that the street capture
// stop at the first digit (not whitespace) together make this robust against
// the older-template glitch "ul. Klementowskiego15/28" (no space before the
// building number).
const FLAT_ADDR_RE =
  /Po[łl]o[żz]enie\s+nieruchomo[śs]ci\s*[–\-]\s*(?:(?:obr[ęe]b\s+)?[A-Za-zŁłŚśŻżŹźĆćĘęÓóŃńĄą]+\s*,\s*)?ul\.\s*([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s*(\d+(?:-\d+)?[A-Za-z]?)(?:\s*\/\s*([0-9]+[A-Za-z]?))?\b/i;

// FLAT/COMMERCIAL address — the RESULT-doc phrasing: "lokalu mieszkalnego nr
// 4 przy ul. Klementowskiego 6 w Piszu" (building only; apt comes separately
// from the "lokal... nr N" clause via unitNoFromText).
const RESULT_ADDR_RE =
  /przy\s+ul\.\s*([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s+w\s+Piszu/i;

/** Flat/unit number from "lokal(u) (nie)mieszkaln... nr <N>". */
function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat/commercial unit, tried
 *  against the announcement/wykaz structured field first, then the result
 *  phrasing + separate unit-number lookup. Null for land / unparseable. */
export function addressRawFromText(text) {
  let m = FLAT_ADDR_RE.exec(whole(text));
  if (m) {
    const street = m[1].trim().replace(/\s+/g, ' ');
    const building = m[2];
    const apt = m[3] || unitNoFromText(text);
    return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  }
  m = RESULT_ADDR_RE.exec(whole(text));
  if (m) {
    const street = m[1].trim().replace(/\s+/g, ' ');
    const building = m[2];
    const apt = unitNoFromText(text);
    return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  }
  return null;
}

// LAND — cadastral district ("obręb"), never a street: announcement
// "Położenie nieruchomości – obręb Karwik," / "– obręb ewidencyjny Pisz 1
// Numer działki..." (no comma at all — real fixture wiad 29395) / result
// "położonej w obrębie Pisz 1 (KW ...". Both anchors stop at the first
// comma/paren/"dla której"/"gmina"/"Numer" so a trailing "gmina Pisz"
// qualifier or the following structured field is never absorbed — "Numer" is
// needed as a stop-word too because some notices run the district straight
// into "Numer działki"/"Numer KW" with NO comma at all, and the character
// class (no "–") can't reach the "$" end-of-string fallback from there.
const LAND_OBREB_ANNOUNCE_RE =
  /Po[łl]o[żz]enie\s+nieruchomo[śs]ci\s*[–\-]\s*obr[ęe]b\s+([A-Za-zŁłŚśŻżŹźĆćĘęÓóŃńĄą0-9 ]+?)(?:,|\s+gmina\b|\s+[Nn]umer\b|$)/i;
const LAND_OBREB_RESULT_RE =
  /w\s+obr[ęe]bie\s+([A-Za-zŁłŚśŻżŹźĆćĘęÓóŃńĄą0-9 ]+?)(?:,|\s*\(|\s+dla\s+kt[óo]rej|\.|$)/i;

/** Cadastral district name ("Karwik", "Pisz 1", "Szczechy Małe") for a LAND
 *  record, or null. Used for BOTH `obreb` (dedup key alongside dzialka_nr in
 *  build-land.js) and to build a human `address_raw`. The "obręb ewidencyjny
 *  X" phrasing (a handful of notices insert the qualifier word) is trimmed to
 *  the bare district name "X" so the SAME district keys identically whether
 *  or not a given notice happened to say "ewidencyjny". */
export function obrebFromText(text) {
  const t = whole(text);
  let m = LAND_OBREB_ANNOUNCE_RE.exec(t);
  if (!m) m = LAND_OBREB_RESULT_RE.exec(t);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, ' ').replace(/^ewidencyjny\s+/i, '');
}

// Usable floor area of the FLAT unit: "lokal mieszkalny nr 4 o powierzchni
// użytkowej 91,35 m2" / "lokal mieszkalny nr 3 o pow. użytkowej 109,83 m2"
// (abbreviated) / "lokal mieszkalny nr 28, o powierzchni użytkowej 35,82 m2"
// (comma after the unit number). Anchored on the unit noun + number so the
// building's/plot's total area ("Powierzchnia nieruchomości – 440 m2" — the
// WHOLE-BUILDING plot, a trap for flats) and the cellar/attic breakdown are
// never taken.
const UNIT_AREA_RE =
  /lokal\w*\s+(?:nie)?mieszkaln\w*\s+nr\.?\s*\d+[A-Za-z]?,?\s+o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s*(?:u[żz]ytkow\w*\s+)?(\d+[.,]\d+)\s*m/i;

/** Usable floor area (m²) of the flat unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// LAND plot total area: "Powierzchnia nieruchomości – 665  m2" / "839 m²" /
// (older docs) "Powierzchnia działki – 2150 m2". ONLY used for kind:'grunt' —
// for flats this same label names the whole building's plot, not the unit.
const LAND_AREA_RE =
  /Powierzchnia\s+(?:nieruchomo[śs]ci|dzia[łl]ki)\s*[–\-:]?\s*(\d+(?:[.,]\d+)?)\s*(ha|m)/i;

/** LAND plot area (m²), hectares converted ×10 000, or null. */
export function landAreaFromText(text) {
  const m = LAND_AREA_RE.exec(whole(text));
  if (!m) return null;
  const val = parseNum(m[1]);
  if (val == null) return null;
  return /ha/i.test(m[2]) ? Math.round(val * 10000) : Math.round(val);
}

// Parcel number(s): "Numer działki – 232/8," / "Numery działek: 1799/1 i
// 1793," (announcement/wykaz, "numer(y)" BEFORE "działk(i/ek)"); "oznaczonej
// numerem działki 69/4" / "numerami działek 450/34 i 450/38" / "numerem
// geodezyjnym działki 1886/24" (result, same "numer... działk..." order with
// an optional "geodezyjnym" and no dash); and "oznaczonej nr działki 69/4"
// (result, the SHORT "nr" — not "numer…" — immediately before "działki",
// wiad 31101/30313 — real fixture; groundtruthed 2026-07-10). A second,
// looser pattern covers the reverse "działka nr N" order as a defensive
// fallback. Each parcel segment must look like a parcel (\d+(/\d+)?) and
// multi-parcel joins are ONLY the word "i"/"oraz" (never a bare comma) — a
// bare-comma join was tried first but wrongly absorbed the FOLLOWING
// enumerated line's leading digit ("2. Numer działki – 232/8, 3. Numer KW –
// ..." parsed as parcels "232/8" AND "3"). Only the FIRST match is used (not
// a global scan) so a LATER, unrelated "numer działki N" mention elsewhere in
// the same document — e.g. a "przetarg ograniczony" restricted-tender clause
// naming the ADJACENT co-owner's parcel ("...ograniczony do współwłaścicieli
// nieruchomości ... oznaczonej numerem działki 1886/8 przyległa do
// nieruchomości oznaczonej numerem 1886/24" — wiad 30743) — is never folded
// in as a second parcel of THIS sale; the parcel(s) actually being sold are
// always named first.
export function landPlotsFromText(text) {
  const t = whole(text);
  const seg = String.raw`\d+(?:\/\d+)?`;
  const join = String.raw`(?:\s*(?:\bi\b|\boraz\b)\s*${seg})*`;
  const re1 = new RegExp(
    `(?:numer\\w*|nr)\\s+(?:geodezyjn\\w*\\s+)?dzia[łl](?:ki|ek)\\s*(?:[–\\-:])?\\s*(${seg}${join})`,
    'i',
  );
  const re2 = new RegExp(`dzia[łl]k\\w*\\s+nr\\.?\\s*(${seg}${join})`, 'i');
  const m = re1.exec(t) || re2.exec(t);
  if (!m) return [];
  const parcels = [];
  const seen = new Set();
  for (const p of m[1].split(/\s*(?:\bi\b|\boraz\b)\s*/i)) {
    const clean = p.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      parcels.push(clean);
    }
  }
  return parcels;
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction) blob into a single active record,
 * or null. Land (kind 'grunt') → parcel-keyed record for land.json; flats /
 * commercial units → address-keyed record. Caller (crawl.js) is responsible
 * for the isLease/isExchange/isBezprzetargowo/isSaleAuction/hasScheduledDate
 * gating BEFORE calling this.
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
    const obreb = obrebFromText(text);
    const dzialkaList = landPlotsFromText(text);
    const dzialka_nr = dzialkaList.length ? dzialkaList.join(', ') : null;
    if (!obreb && !dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(text),
      address_raw: obreb ? `obręb ${obreb}` : null,
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

// ------------------------------------------------------------------- wykaz parse

/**
 * Parse one GENUINE pre-auction wykaz blob into an address-keyed wykaz
 * record, or null. Land wykazy (no street — only a parcel/obręb) have no
 * home in the {listings, wykaz, land} contract's address-keyed `wykaz[]`
 * (build-properties.js's wykaz loop requires `.address`) and are dropped here,
 * same as a flat/commercial wykaz whose address doesn't parse. Caller is
 * responsible for the isLease/isExchange/isBezprzetargowo gating BEFORE
 * calling this — do NOT call on a bezprzetargowo notice.
 * @param {string} text  blob from buildRecordText
 * @param {string|null} publishedDate  ISO date from the board listing
 * @returns {object|null}
 */
export function parseWykaz(text, publishedDate) {
  if (!text) return null;
  const kind = kindFromText(text);
  if (kind === 'grunt') return null;
  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    published_date: publishedDate || null,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED result blob into a result record. Returns 0 or 1
 * record (array = framework interface). Joins its property by address (+
 * unit-no) or parcel+obręb in build-properties.js/build-land.js.
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
    const obreb = obrebFromText(text);
    const dzialkaList = landPlotsFromText(text);
    const dzialka_nr = dzialkaList.length ? dzialkaList.join(', ') : null;
    if (!obreb && !dzialka_nr) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2: landAreaFromText(text),
        address_raw: obreb ? `obręb ${obreb}` : null,
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
