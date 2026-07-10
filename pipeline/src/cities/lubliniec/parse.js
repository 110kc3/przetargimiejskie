// Lubliniec parsers.
//
// Gmina Lubliniec (UM Wydział Nieruchomości i Zagospodarowania Przestrzennego —
// no ZGM/ZBM) sells municipal flats, commercial units, garages and land at
// `<ROMAN> przetarg ustny (licytacja) nieograniczony` and publishes them on the
// bip.info.pl hosted CMS at lubliniec.bip.info.pl — clean SERVER-RENDERED HTML
// (no SPA, no OCR), the SAME platform as Zgorzelec (this adapter's template).
// Like Zgorzelec, there are no structured fields: each notice is one flowing
// HTML article. crawl.js strips the article's <div id="content-main"> to plain
// text (BODY) and pairs it with the board-list link text (TITLE), then
// assembles them into ONE labelled blob via buildRecordText(); every parser
// reads that blob. The test builds the SAME blob from real captured
// title+body strings, so the parsers are groundtruthed against live data.
//
// TWO SEPARATE BOARDS:
//   Ogłoszenia o przetargach (idmp=93) → announcements → crawlActive listings/land
//   Wyniki przetargów        (idmp=94) → results        → crawlResultDocs
// so the active-vs-result split is by BOARD, not by an inline resolution.
//
// Lubliniec's phrasing differs from Zgorzelec's in several load-bearing ways
// (all confirmed live 2026-07-10 against real fetched documents — see
// tests/parse-lubliniec.test.js for the exact fixture text):
//
//   1. ADDRESS lives in the TITLE as "… na sprzedaż … przy ul. <STREET> <BLDG>
//      [/<APT>] w Lublińcu …" — NOT anchored on "położon…" (Zgorzelec's anchor)
//      since several Lubliniec titles put "przy ul." right after the sale-object
//      phrase with no "położon…" in between (e.g. "na sprzedaż nieruchomości
//      lokalowej przy ul. Mickiewicza 9/6"). The OFFICE address ("Urzędu
//      Miejskiego w Lublińcu przy ul. Paderewskiego 5") is explicitly excluded
//      so a body-text fallback search can never pick it up.
//   2. UNIT NUMBER (apt): most ANNOUNCEMENT bodies restate it as "Lokal
//      (nie)mieszkalny nr <N>" (like Zgorzelec/Chełmno), but terse RESULT docs
//      often DON'T restate it — there the "/<APT>" already captured from the
//      TITLE's "przy ul. <STREET> <BLDG>/<APT>" is the only source. Both are
//      tried, body-derived taking precedence when present.
//   3. ROUND: Lubliniec's word order is "<ROMAN> przetarg(u) ustn(y/ego)"
//      (ROMAN before "przetarg"), the REVERSE of Zgorzelec's "<ROMAN> ustn…
//      przetarg". The prior-round history clause ("I, II, III przetargi ustne
//      nieograniczone zakończyły się wynikiem negatywnym" / "I przetarg
//      wyznaczony na dzień …") never wins because it either lacks "ustn…"
//      immediately after "przetarg(i)" or appears after the TITLE's own (and
//      thus first-matched) round statement.
//   4. DATE: announcements state it as "… odbędzie się w siedzibie … w dniu
//      <DATE> o godzinie <HH:MM>" — the "odbędzie się" and "w dniu" are NOT
//      adjacent (Zgorzelec's tight anchor doesn't apply), so the anchor here is
//      the PAIRED "w dniu … o godzinie" clause, which also skips the decoy "w
//      dniu zawarcia umowy notarialnej" / "w dniu przetargu" boilerplate
//      (neither is followed by "o godzinie" within the lazy window). RESULT
//      docs never restate a time, so they use a separate "w dniu <DATE> (w
//      siedzibie|(godz|roku)" anchor.
//   5. PRICE: the modern (2023+) announcement layout is a TABLE — "cena
//      wywoławcza" the LABEL and its value are separated by an intervening
//      wadium-deadline date, so a small-gap label→value anchor (which DOES work
//      for RESULT docs and the pre-2023 layout) fails there. The fallback
//      anchors the table's "<CENA> zł <POSTĄPIENIE> zł <WADIUM> zł <HH:MM>"
//      triple and takes the first amount.
//   6. ACHIEVED PRICE: "Najwyższa cena osiągnięta w przetargu <AMOUNT> zł" —
//      unlike Zgorzelec's land phrasing the grosze tail (",00") is often
//      ABSENT ("141.400 zł"), so the amount pattern makes it optional.
//   7. A "rozstrzygnięcia skargi" (complaint-resolution) notice and
//      "Odwołanie …" (cancellation) notices share BOTH boards; both are
//      excluded by a TITLE-scoped guard (checking the whole text would false-
//      positive on the normal boilerplate clause "Burmistrz ma prawo
//      odwołania przetargu z ważnych powodów" present in every announcement).
//
// Confirmed live fixtures (verified 2026-07-10):
//   FLAT active (round IV, "lokal niemieszkalny" — commercial unit): iddok 26798
//     ul. Mickiewicza 9/6 — "…IV przetarg ustny (licytacja) nieograniczony na
//     sprzedaż nieruchomości lokalowej przy ul. Mickiewicza 9/6 w Lublińcu…
//     Prawo własności do lokalu niemieszkalnego nr 6 o powierzchni użytkowej
//     25,91 m2… odbędzie się w siedzibie … w dniu 29 kwietnia 2026r. o
//     godzinie 9:00… 32.000 zł 320 zł 3.200 zł 9:00" (table price layout)
//   FLAT active (round I, spółdzielcze prawo): iddok 22526 ul. Częstochowska 6/34
//   FLAT active (round I, "nr 1 położonej…" address form, pre-2023 direct
//     price label): iddok 13865 ul. Oświęcimska 19/1
//   LAND active (round I): iddok 26836 ul. Marii Curie Skłodowskiej, dz 1808/51
//   RESULT SOLD (round III): iddok 24862 ul. Paderewskiego 12/16 — 140.000 zł
//     wywoławcza → 141.400 zł osiągnięta (no-grosze), nabywcy Małgorzata i
//     Jarosław PROWDA
//   RESULT SOLD (round III): iddok 24861 ul. Oświęcimska 19/12 — 75.000 zł →
//     75.750 zł, nabywca CLEANING KAJA Sp. z o.o. (apt only in TITLE slash)
//   RESULT UNSOLD (round I, "nikt nie przystąpił"): iddok 25996 ul. Mickiewicza 9/6
//   RESULT SOLD land (round I) — the confirmed hammer-price doc: iddok 27200
//     ul. M.C. Skłodowskiej, dz 1808/51 — 400.000,00 zł → 552.000,00 zł, 3
//     oferentów, nabywca KOMTERM Sp. z o.o.

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

/** True when the notice's OWN title marks it as a cancellation ("Odwołanie …")
 *  or a complaint-resolution notice ("Informacja o sposobie rozstrzygnięcia
 *  skargi …") — a non-auction document type that shares both boards.
 *  TITLE-scoped deliberately: the ordinary boilerplate clause "Burmistrz ma
 *  prawo odwołania przetargu z ważnych powodów" appears in the BODY of every
 *  normal announcement, so checking the whole text would false-positive. */
function isNonAuctionNotice(text) {
  const title = field(text, 'TITLE');
  // NOTE: JS `\w` is ASCII-only ([A-Za-z0-9_]) — it does NOT match Polish
  // diacritics. "rozstrzygnięcia" has "ę" immediately after the "rozstrzygni"
  // stem, so a bare `rozstrzygni\w*` stops there and never reaches "skargi".
  // The `[ęe]` covers the real genitive/nominative/locative forms
  // (rozstrzygnięcia/rozstrzygnięcie/rozstrzygnięciu) plus a plain-e fallback.
  return /odwo[łl]an/i.test(title) || /rozstrzygni[ęe]\w*\s+skargi/i.test(title);
}

/** True when this notice is a SALE auction ("… przetarg … na sprzedaż …") and
 *  not a cancellation, complaint-resolution notice, or call-for-tenders /
 *  works contract, which share the same board. */
export function isSaleAuction(text) {
  if (isNonAuctionNotice(text)) return false;
  const t = whole(text);
  if (/zaproszenie\s+do\s+sk[łl]adania\s+ofert/i.test(t)) return false;
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

/** True when this is a DZIERŻAWA / NAJEM lease (rent), not a sale — skipped. */
export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$/i.test(t);
}

/** True when this looks like a "wynik przetargu" result notice (either the
 *  "Informacja pozytywna/negatywna …" or "INFORMACJA dotycząca wyniku …"
 *  convention, or the generic "…został przeprowadzony…"/"…osiągnięta…"
 *  phrasing) — and not a cancellation/complaint-resolution notice that also
 *  lands on the results board.
 *
 *  Deliberately NOT matched on a bare "wynik…(jest)…negatywny/pozytywny": an
 *  ACTIVE announcement's own round-history recap ("I, II, III przetargi
 *  ustne nieograniczone zakończyły się wynikiem negatywnym") uses exactly
 *  that phrase to describe a PRIOR round, which would otherwise make an
 *  announcement doc misclassify as a result doc (see
 *  MICKIEWICZA_IV_ACTIVE in the test — it carries that exact recap). Every
 *  real result doc observed live already opens with "Informacja
 *  pozytywna/negatywna …", so that (title-favoring, via TITLE-then-BODY
 *  concatenation) anchor plus the body-level anchors below are sufficient
 *  without the risky bare alternative. */
export function isResultDoc(text) {
  if (isNonAuctionNotice(text)) return false;
  const t = whole(text);
  // `dotycz[ąa]?\w*` (not bare `dotycz\w*`): "dotycząca" has "ą" immediately
  // after the stem, which plain `\w` (ASCII-only) can't bridge — see the
  // isNonAuctionNotice comment for the same JS-\w-vs-diacritics gotcha.
  return /informacj\w*\s+(?:pozytywn|negatywn)\w*|dotycz[ąa]?\w*\s+wyniku|przeprowadzon\w*\s+zosta[łl]|zosta[łl]\s+przeprowadzon\w*|osi[ąa]gni[ęe]t/i.test(t);
}

/** True when the resolution explicitly states a negative (unsold) outcome —
 *  Lubliniec's nominative "wynik jest negatywny" as well as the instrumental
 *  "wynikiem negatywnym" seen elsewhere in this CMS family. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+(?:jest\s+)?negatywn\w*|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium/i.test(t);
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
 * Auction round. Anchored on "<ROMAN> przetarg(u) ustn(y/ego)" — Lubliniec's
 * word order (ROMAN, then "przetarg", then "ustn…"), the REVERSE of
 * Zgorzelec's "<ROMAN> ustn… przetarg". The TITLE always states the CURRENT
 * round first, so POSITION ORDERING is what protects against the two history
 * phrasings observed live: "I przetarg wyznaczony na dzień … oraz II przetarg
 * wyznaczony na dzień …" (its "przetarg" is followed by "wyznaczony", not
 * "ustn…", so it never matches at all) and "I, II, III przetargi ustne
 * nieograniczone zakończyły się wynikiem negatywnym" (the LAST item, "III
 * przetargi ustne", DOES structurally match the pattern — it is only the
 * fact that the TITLE's own, earlier round statement is found first by
 * `.exec()` that keeps this decoy from ever being reached; see the
 * MICKIEWICZA_IV_ACTIVE test, which asserts round 4 despite this exact decoy
 * being present in the body). Returns null when unstated.
 */
export function roundFromText(text) {
  const m = /\b([IVXL]{1,5})\s+przetarg\w*\s+ustn\w*/i.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}

// ----------------------------------------------------------------- date

/** "26 sierpnia 2026" (word month) or "04.08.2026"/"17.06 2026" (numeric,
 *  space-for-dot month/year separator observed live) -> ISO. */
function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*[.\s]\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

/**
 * Auction date. PRIMARY (announcement): the PAIRED "w dniu <DATE> o
 * godz(inie)" clause — most notices spell it out ("… w dniu 29 kwietnia
 * 2026r. o godzinie 9:00") but at least one live land notice abbreviates it
 * ("… w dniu 17 czerwca 2026r. o godz. 9:00."), so both are accepted. It must
 * be a PAIR (not just "w dniu…") because the first bare "w dniu" in an
 * announcement body is usually a decoy — "w dniu zawarcia umowy notarialnej" /
 * "w dniu przetargu [złożą / następujące dokumenty]" — neither followed by "o
 * godz…" within the lazy window, so the regex naturally skips past them to
 * the real clause. FALLBACK (result docs never restate a time): "w dniu
 * <DATE> w siedzibie …" / "w dniu <DATE> (godz. …) w siedzibie …" / "w dniu
 * <DATE> roku". -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  let m = /w\s+dniu\s+([\s\S]{0,24}?)\s+o\s+godz(?:inie)?\.?/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /w\s+dniu\s+([\s\S]{0,24}?)\s*(?:w\s+siedzibie|\(godz|roku\b)/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/**
 * Starting price. TIER 1: the label and value sit close together — RESULT
 * docs ("Cena wywoławcza nieruchomości lokalowej 140.000 zł") and the pre-2023
 * announcement layout ("Cena wywoławcza nieruchomości: 60.147,54 zł"). TIER 2
 * (the 2023+ announcement table layout, where a wadium-deadline DATE sits
 * between the "Cena wywoławcza" column header and its value, defeating a
 * small-gap anchor): the table always lists "<CENA> zł <POSTĄPIENIE> zł
 * <WADIUM> zł <HH:MM>" in that fixed column order, so the FIRST of three
 * consecutive "<amount> zł" tokens immediately followed by a bare time is the
 * starting price. The capture has a `(?<![\d/])` guard: the row's own
 * "Oznaczenie nieruchomości" label often ends in a bare "<BLDG>/<APT>"
 * address (e.g. "…przy ul. Częstochowskiej 6/34 250.000 zł …") with only a
 * SPACE between the apartment number and the real price — and a space is a
 * legal thousands-separator elsewhere (e.g. "1 500 000,00"), so without the
 * guard the number-matcher happily bridges "34" + " " + "250.000" into one
 * bogus "34250000". The guard rejects a match starting right after a digit
 * or "/", forcing it onto the real price token instead.
 */
export function startingPriceFromText(text) {
  const t = whole(text);
  let m = /cena\s+wywo[łl]awcz\w*[^0-9]{0,30}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /(?<![\d/])(\d[\d. ]*(?:,\d{2})?)\s*z[łl]\s+\d[\d. ]*(?:,\d{2})?\s*z[łl]\s+\d[\d. ]*(?:,\d{2})?\s*z[łl]\s+\d{1,2}:\d{2}/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is named ("… nabywc… …"), anchored on
 *  "Najwyższa cena [netto] osiągnięta w przetargu <AMOUNT> zł". The grosze
 *  tail is OPTIONAL: unlike the land phrasing ("552.000,00 zł") the flat/unit
 *  results often state a whole-zloty figure ("141.400 zł"). A numeric value
 *  ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /najwy[żz]sz\w*\s+cen\w*\s+(?:netto\s+)?osi[ąa]gni[ęe]t\w*\s+w\s+przetargu\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Kind from the TITLE (unambiguous sale-object phrase) first, falling back to
 *  the full text. Most Lubliniec TITLEs only say "nieruchomości lokalowej"
 *  (unqualified) — the mieszkalny/niemieszkalny qualifier usually only
 *  appears in the BODY's "Lokal (nie)mieszkalny nr N" clause, so the
 *  whole-text fallback is the common path here (unlike Zgorzelec, where the
 *  TITLE itself is usually already qualified). "Działka"/"nieruchomości
 *  gruntowej" → grunt. */
export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(whole(text));
}

// ----------------------------------------------------------------- address

// Property street+building[/apt] — anchored on "przy ul. <STREET> <BLDG>
// [/<APT>]" (no "położon…" prefix requirement: several Lubliniec titles put
// "przy ul." directly after the sale-object phrase, e.g. "na sprzedaż
// nieruchomości lokalowej przy ul. Mickiewicza 9/6"). STREET is non-greedy up
// to the first number, CAPPED at 60 chars: land notices' "przy ul. <STREET>"
// often has NO building number at all (land is parcel-, not building-,
// addressed), and without a cap the lazy quantifier — finding no digit for
// many words — will run straight through sentence boundaries into a LATER,
// unrelated digit (e.g. the "działka nr 1808/51" parcel number two clauses
// later), producing a garbage multi-clause "street name". Every real
// flat/commercial street→building gap observed live is under 20 chars, so 60
// is a generous cap for the genuine case while making the land case
// correctly fail closed (no match) instead of over-matching — land routes
// through landStreetFromText/landPlotFromText instead, never this regex, so
// failing closed here is exactly the wanted behavior if it's ever reached.
// The optional "/<APT>" is a FALLBACK apt source (see addressRawFromText)
// for terse RESULT docs that don't restate "Lokal … nr N".
const PROP_ADDR_RE =
  /przy\s+ul\.\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{1,60}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*(\d+[A-Za-z]?))?\b/gi;

// Land street (no building) — "położon… (w Lublińcu) przy ul. …" / "położon…
// w rejonie ul. …" (the "w rejonie ul." form seen on some land notices lacks
// "przy"). Terminated before a comma / "w Lublińcu" / "który" / an opening
// paren (parcel-number aside) / end.
const LAND_STREET_RE =
  /po[łl]o[żz]on\w*\s+(?:w\s+Lubli[ńn]cu\s+)?(?:przy\s+ul\.|w\s+rejonie\s+ul\.)\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)(?:\s+w\s+Lubli[ńn]cu|,|\s+kt[óo]r|\(|\.|$)/i;

/** The UM's own office address ("Urzędu Miejskiego w Lublińcu przy ul.
 *  Paderewskiego 5" / auction venue "ul. Paderewskiego 5, Sala posiedzeń nr
 *  11") — excluded from address matching so a body-text fallback search can
 *  never mistake it for the property's address. A genuine sale at a DIFFERENT
 *  building number on Paderewskiego (e.g. "Paderewskiego 12/16") is unaffected. */
function isOfficeAddress(street, building) {
  return /^paderewsk/i.test(street.trim()) && building === '5';
}

/** True when a captured "street name" actually crossed a sentence boundary
 *  into an unrelated clause — this regex is flat/commercial-only, but LAND
 *  text has no building number to stop the lazy street capture near, so on
 *  land text (never routed here in the real parseAnnouncement/parseResultDoc
 *  flow — kind:'grunt' uses landStreetFromText/landPlotFromText instead) it
 *  can run past "Marii Curie Skłodowskiej" through "działka nr" before
 *  finally finding the PARCEL number as if it were a building number. The
 *  60-char cap on PROP_ADDR_RE's street group already rejects the worst
 *  cases; this catches the rest by rejecting a handful of words that a real
 *  Polish street name never contains. */
function isJunkStreetCapture(street) {
  return /dzia[łl]k|przedmiot|paragraf|rozdzia[łl]/i.test(street);
}

/** Flat/unit number from "lokal(u) (nie)mieszkaln… nr <N>". */
function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat / commercial unit, or
 *  null. Walks every "przy ul. …" match in TITLE+BODY (order: TITLE first),
 *  skipping the UM office address and any junk (sentence-crossing) capture,
 *  and returns the first genuine one. The apt prefers the BODY's "Lokal …
 *  nr N" restatement; when absent (terse RESULT docs) it falls back to the
 *  "/<APT>" already captured from the matched "przy ul." clause itself. */
export function addressRawFromText(text) {
  const t = whole(text);
  PROP_ADDR_RE.lastIndex = 0;
  let m;
  while ((m = PROP_ADDR_RE.exec(t)) !== null) {
    const street = m[1].trim().replace(/\s+/g, ' ');
    const building = m[2];
    if (isOfficeAddress(street, building)) continue;
    if (isJunkStreetCapture(street)) continue;
    const slashApt = m[3] || null;
    const apt = unitNoFromText(text) || slashApt;
    return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  }
  return null;
}

/** Land street name (for context/display on parcel-keyed records), or null. */
function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(whole(text));
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

// Usable floor area of the unit: "lokal mieszkalny nr 1 o powierzchni
// użytkowej 26,50 m 2" (most notices: immediate) / "lokalu mieszkalnego nr 34,
// położone w budynku wielomieszkaniowym przy ul. … w Lublińcu, o powierzchni
// użytkowej 46,20 m 2" (spółdzielcze-prawo notices: a "położone przy ul. …"
// clause intervenes between the unit number and "o powierzchni" — up to ~100
// chars). Anchored on the unit noun+number so the room breakdown, the cellar
// ("piwnica … m2") and the shared-plot area are not taken.
const UNIT_AREA_RE =
  /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?\d+[A-Za-z]?[\s\S]{0,100}?\bo\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m²) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// Parcel(s) + area for LAND records. Parcels from "działka nr <N>[/<M>]"
// (case-insensitive; also matches the "działki nr" plural / genitive echoes,
// which dedupes). Area from the first "o pow. <N> m²" (m² — integer) or
// "<N> ha".
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
 * commercial units / garages → address-keyed record.
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
 * Parse one CONCLUDED "wynik przetargu" blob into a result record. Returns 0
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
