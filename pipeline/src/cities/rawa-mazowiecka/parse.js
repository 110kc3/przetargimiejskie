// Rawa Mazowiecka parsers.
//
// Gmina Miasto Rawa Mazowiecka (Wydział Gospodarki Terenami) sells municipal
// flats and land at `ustny przetarg nieograniczony`/`ograniczony` on the
// bip.net 7.32 (Extranet) hosted CMS at bip.rawamazowiecka.pl — clean
// SERVER-RENDERED HTML (Word-export markup), no SPA, no OCR. crawl.js strips
// each document's `id="PageContent"` region (up to the metryka footer) to
// plain text (BODY) and separately collects the attachment file names
// (ATTACH — see the address quirk below), then assembles them into ONE
// labelled blob via buildRecordText(); every parser here reads that blob.
//
// REAL DATA QUIRK #1 — flats never state a street NUMBER in body prose.
// Verified live 2026-07-10 across every fetched document: the Reymonta
// lokale-mieszkalne notice (announcement iddok/tresc=32411 AND its result
// tresc=32589) both say only "przy ul. Reymonta" / "– ul. Reymonta" — never
// "Reymonta 11". The number is recoverable ONLY from the attachment file
// name ("ogłoszenie o przetargu lokale Reymonta 11.pdf" / "Informacja o
// wyniku przetargu lokale nr 1 4 5 Reymonta 11.pdf"), confirmed by fetching
// the PDF itself (pdftotext) — the PDF is a byte-for-byte duplicate of the
// HTML body, so it does NOT carry the number either. buildingNumberFor()
// therefore tries a direct "ul. <street> <N>" body match first (future-
// proofing, unseen live so far) and falls back to mining the ATTACH file
// names for "<street-last-word> <N>". Built-but-addressless parcels
// (Zamkowa Wola dz.246/4, Murarska dz.321/2 — see REAL DATA QUIRK #2) don't
// have a numbered attachment either, so they correctly fall through this
// same gate and are DROPPED rather than force-fit — see below.
//
// REAL DATA QUIRK #2 — "zabudowana" (built) parcels are INCONSISTENTLY
// addressed: the SAME parcel's street sometimes has a number, sometimes has
// only a bare street name, and sometimes has none at all, depending on which
// specific document (and even which ROUND's re-announcement) you're reading.
// classify-kind.js documents 'zabudowana' as address-keyed (properties.json),
// and refresh.js's own comment confirms "Flats, houses (zabudowana) and
// commercial stay in properties.json/active.json; only land lives here" — so
// this adapter does NOT special-case 'zabudowana' into land.json; it applies
// the SAME address-resolution (direct body match, then attachment-file-name
// fallback) as flats, and drops the record when neither resolves — matching
// how every address-keyed kind here handles a missing address (zgorzelec's
// `if (!address_raw) return null`). All confirmed live on dz. 321/2, ul.
// Murarska(-skiej), obręb 1:
//   - tresc=31181 (round-2 ANNOUNCEMENT, Dec 2023): body states "przy ul.
//     Murarskiej 1." explicitly (with the number!) → KEPT, address_raw
//     "Murarskiej 1".
//   - tresc=31382 (that SAME round-2 auction's RESULT, Jan 2024, achieved
//     240 000→242 500 zł): body only says "przy ul. Murarskiej," (no
//     number), and its attachment ("Informacja o wyniku przetargu ul.
//     Murarska.pdf") uses the NOMINATIVE "Murarska", not the body's genitive
//     "Murarskiej" — the fallback's exact-substring match doesn't bridge
//     that, so this record is DROPPED. A real, if unfortunate, gap: the
//     announcement is kept but its own matching result isn't (no achieved
//     price recorded for this specific sale) — a deliberate scope limit
//     (see the file's closing note), not a crash or wrong data.
//   - dz. 246/4 "Zamkowa Wola" (ustny przetarg ograniczony do
//     współwłaścicieli, 33464/33614): the street name itself is ONLY in a
//     PDF file name on the announcement (never in body at all) and has no
//     number anywhere on either the announcement or the result → DROPPED on
//     both ends, no orphan.
//
// REAL DATA QUIRK #3 — a single document can describe MULTIPLE flats. The
// Reymonta announcement (tresc=32411) and its result (tresc=32589) each
// enumerate THREE independent lokale (nr 1, 4, 5) with their own date/area/
// price/wadium clauses in ONE flowing document (see ADAPTER-GUIDE.md §5.5).
// parseAnnouncement/parseResultDoc therefore return an ARRAY of 0..N records
// (not the single-object-or-null shape zgorzelec uses) — refresh.js already
// supports N>1 via `allRecords.push(...recs)` (src/refresh.js:91), so this is
// a safe, additive shape. splitAnnouncementUnits/splitResultUnits window the
// body text per unit so a per-flat regex scan can never leak into a
// neighboring flat's price/date/area (see their docstrings for the anchor
// each uses — the two document types put the per-unit anchor in different
// relative positions, so they need two different splitters).
//
// REAL DATA QUIRK #4 — round is a WORD ordinal ("pierwszego", "drugi"),
// unlike zgorzelec's Roman-numeral "I ustnym przetargu". After two failed
// rounds the 3rd+ round often drops the ordinal entirely (round → null,
// which is the documented "unstated" behavior, not a bug) — see
// tresc=32402/32501 (Pl. Piłsudskiego 7 lease, round 3).
//
// All regexes groundtruthed against live documents (verified 2026-07-10):
//   FLAT PENDING (3-in-1, round unstated ⇒ 1st time): tresc=32411
//     "…ogłasza ustne przetargi nieograniczone na sprzedaż trzech lokali
//      mieszkalnych, położonych w budynku na działce nr 308/13 w obrębie 4
//      miasta Rawa Mazowiecka … z dostępem do drogi publicznej – ul.
//      Reymonta … Ustny przetarg nieograniczony dla lokalu nr 1 odbędzie się
//      w dniu 22 października 2024 r. … Lokal mieszkalny nr 1 o pow. 40 m2 …
//      Cena wywoławcza lokalu nr 1 wynosi 110.000,00 zł brutto … [nr 4: …
//      31,28 m2 … 87.000,00 zł … nr 5: … 31,88 m2 … 53.000,00 zł] …
//      ogłoszenie o przetargu lokale Reymonta 11.pdf"
//   FLAT RESULT (3-in-1, all SOLD): tresc=32589
//     "INFORMACJA O WYNIKU PRZETARGÓW … W dniu 22 października 2024 r. o
//      godz. 10 00 … przeprowadzono ustny przetarg nieograniczony na
//      sprzedaż lokalu mieszkalnego nr 1 zlokalizowanego w budynku przy ul.
//      Reymonta w Rawie Mazowieckiej … Cena wywoławcza lokalu mieszkalnego nr
//      1 wynosiła 110 .000,00 zł brutto … uzyskano kwotę 111 .500,00 zł
//      brutto … Nabywcą nieruchomości zostali Państwo Kazimierz i Grażyna
//      Stefańscy. [nr 4 at 10:30, 87k→88k; nr 5 at 11:00, 53k→53.7k, same
//      buyers] … Informacja o wyniku przetargu lokale nr 1 4 5 Reymonta
//      11.pdf" — note the stray space inside amounts ("110 .000,00"), a
//      Word-mail-merge artifact; parsePLN strips all spaces+dots so it still
//      resolves correctly.
//   LAND PENDING (multi-parcel, "ustny przetarg nieograniczony"): tresc=33622
//     "…sprzedaż nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako
//      działki nr: 205/11 o pow. 0,0507 ha, 206/12 o pow. 0,0301 ha, 706/5 o
//      pow. 0,0022 ha … o łącznym obszarze 0,0830 ha … Przetarg odbędzie się
//      w dniu 10 września 2025 r. … Cena wywoławcza nieruchomości wynosi
//      273.900,00 zł"
//   LAND RESULT SOLD (same parcels, "nr ewid." phrasing on the RESTRICTED
//   variant): tresc=33614
//     "…przeprowadzono ustny przetarg ograniczony na sprzedaż nieruchomości
//      położonej w obrębie 2 miasta Rawa Mazowiecka przy ul. Zamkowa Wola,
//      oznaczonej nr ewid. 246/4 o pow. 0,0021 ha … Cena wywoławcza … wynosiła
//      1 5.000,00 zł … uzyskano kwotę 15 .200,00 zł … Nabywcą nieruchomości
//      zostali Państwo Jakub i Monika Fiedorowicz."
//   LAND RESULT UNSOLD (negative outcome, plain przetarg): tresc=33865
//     "…przeprowadzono ustny przetarg nieograniczony na sprzedaż
//      nieruchomości gruntowej … działki nr: 167 o pow. 0,2086 ha i 166 o
//      pow. 0,0475 ha … o łącznym obszarze 0,2561 ha … Cena wywoławcza …
//      wynosiła 815.000,00 zł … Nie wpłynęła żadna wpłata wadium … Przetarg
//      zakończył się wynikiem negatywnym."
//   LEASE PENDING/RESULT (najem, round word-ordinal): tresc=31750
//     "…ogłasza ustny przetarg nieograniczony na oddanie w najem lokali
//      użytkowych … Przedmiotem pierwszego ustnego przetargu nieograniczonego
//      jest oddanie w najem …" — isLease() must gate these out before
//      parseAnnouncement/parseResultDoc ever run on them.
//   PROCEDURAL doc sharing the RESULTS board (must NOT parse as a result):
//   tresc=32478 / 33592
//     "Lista osób zakwalifikowanych do udziału w ustnym przetargu
//      ograniczonym … informuję, że w terminie do dnia … zgłosili się: …
//      zostali oni zakwalifikowani do udziału w ww. przetargu." — no
//      "wyniku"/"przeprowadzon"/"odbył się", so isResultDoc() correctly
//      rejects it (verified: this is the REAL bug a naive "isResultDoc ⇒
//      informacja O WYNIKU only" gate would have let through as a bogus
//      0-price result — see crawl.js comment for how this was caught).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "110.000,00" / "1 5.000,00" (stray space) / "2 302 240,00" -> integer PLN.
// The grosze tail is whatever separator precedes exactly 2 trailing digits —
// stripped FIRST, by whichever character introduces it — then every
// remaining space/dot/comma is stripped as a thousands separator.
//
// REAL BUG caught live (tresc=29982, 2023 land announcement dz. 319): the
// source itself typos the grosze comma as a THIRD dot — "Cena wywoławcza
// wynosi 53.197.50 zł" (should be "53.197,50"). The original zgorzelec-style
// implementation stripped ALL dots unconditionally BEFORE looking for a
// ",NN" tail, so with no comma left to find it kept the "50" as significant
// digits and produced 5 319 750 zł — a 100x inflated price. Recognising
// EITHER "." or "," as the grosze separator (only when it precedes exactly 2
// trailing digits) fixes this without weakening the thousands-separator
// stripping for the correctly-punctuated common case.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const withoutGrosze = String(numStr).trim().replace(/[.,]\d{2}$/, '');
  const cleaned = withoutGrosze.replace(/[\s.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "40" / "31,28" / "0,0098" -> number. Comma OR dot decimal; space stripped.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML fragment to a single line of plain text. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
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
 * already-extracted document BODY plus the joined attachment file names
 * (ATTACH — needed for the street-number fallback, see file header); the
 * test passes the same real captured strings and lets stripHtml run.
 * @param {{body?:string, attach?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `BODY: ${stripHtml(f.body)}`,
    `ATTACH: ${stripHtml(f.attach)}`,
  ].join('\n');
}

/** Read a single labelled line's value from the blob. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/**
 * The BODY field of a labelled blob — OR, when `text` is not a labelled blob
 * at all (it doesn't start with "BODY:"), `text` itself unchanged. This dual
 * behaviour is what lets every "*FromText" function below be called BOTH at
 * the top level with the full blob (as the test file does, matching every
 * other city's convention) AND internally with an already-`whole()`-extracted
 * per-unit window substring (splitAnnouncementUnits/splitResultUnits) without
 * a parallel set of "PlainText" functions.
 */
function whole(text) {
  if (text && /^BODY:/.test(text)) return field(text, 'BODY');
  return text || '';
}

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a SALE auction ("… na sprzedaż …"). */
export function isSaleAuction(text) {
  return /na\s+sprzeda[żz]/i.test(whole(text));
}

/** True when this is a NAJEM (lease) przetarg — skipped entirely (out of
 *  scope: this pipeline tracks property SALES). Anchored on "oddanie w
 *  najem"/"na najem", the consistent phrase in every live lease notice, so a
 *  sale notice's own "sprzedaż" text never false-matches. */
export function isLease(text) {
  const t = whole(text);
  return /oddanie\s+w\s+najem|na\s+najem\b|w\s+dzier[żz]aw[eę]|na\s+dzier[żz]aw[eę]/i.test(t);
}

/**
 * True when this looks like a concluded "Informacja o wyniku" / result
 * notice. Broader than a bare "informacja o wyniku" title match because that
 * title is sometimes absent from the body (verified live, tresc=33614) —
 * falls back to the "przeprowadzono/odbył się … przetarg" past-tense clause
 * common to every result template. Verified NOT to match the "Lista osób
 * zakwalifikowanych" procedural notice sharing the results board (it only
 * uses the FUTURE-tense "odbędzie się", never "przeprowadzono"/"odbył się") —
 * see tresc=32478/33592 in the header.
 */
export function isResultDoc(text) {
  const t = whole(text);
  if (/informacj\w*\s+o\s+wyniku|wyniku\s+(?:\w+\s+)?przetarg|osi[ąa]gni[ęe]t|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(t)) return true;
  return /przetarg/i.test(t) && (/przeprowadzon\w*/i.test(t) || /\bodby[łl]\s+si[ęe]/i.test(t));
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+wp[łl]yn[ęe][łl]a?\s+[żz]adna\s+wp[łl]ata\s+wadium/i.test(t);
}

// ----------------------------------------------------------------- round

// Word-ordinal (NOT Roman numeral, unlike zgorzelec) — see REAL DATA QUIRK #4.
// Both the diacritic and ASCII-folded spelling are listed (source text is
// always accented live, but this keeps the lookup robust either way).
const ORD = {
  pierwsz: 1,
  drug: 2,
  trzeci: 3,
  czwart: 4,
  'piąt': 5,
  piat: 5,
  'szóst': 6,
  szost: 6,
  'siódm': 7,
  siodm: 7,
  'ósm': 8,
  osm: 8,
  'dziewiąt': 9,
  dziewiat: 9,
  'dziesiąt': 10,
  dziesiat: 10,
};

/**
 * Auction round from the WORD ordinal ("pierwszego ustnego przetargu",
 * "drugi ustny przetarg"). Returns null when unstated — real for round 3+,
 * which drops the ordinal entirely (tresc=32402/32501) rather than a parse
 * failure.
 */
export function roundFromText(text) {
  const t = whole(text);
  const m = /(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+(?:ustn\w*\s+)?przetarg/i.exec(t);
  if (!m) return null;
  const w = m[1].toLowerCase();
  const key = Object.keys(ORD).find((k) => w.startsWith(k.toLowerCase()));
  return key ? ORD[key] : null;
}

// ----------------------------------------------------------------- date

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
 * Announcement auction date — the FUTURE-tense clause "… odbędzie się w dniu
 * 22 października 2024 r." / "… odbędzie się w dniu 04.10.2024 r." (both
 * word-month and numeric formats seen live). -> ISO / null.
 */
export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(whole(text));
  return m ? parseDatePhrase(m[1].trim()) : null;
}

/**
 * Result auction date — the PAST-tense clause "W dniu 22 października 2024
 * r. o godz. 10 00 … przeprowadzono …" / "… odbył się przetarg …" (the lease
 * result template uses "odbył się" instead of "przeprowadzono" — both
 * accepted so the date anchor is robust to either). -> ISO / null.
 */
export function resultDateFromText(text) {
  const m = /\bw\s+dniu\s+([\s\S]{0,24}?)\s+o\s+godz[\s\S]{0,250}?(?:przeprowadzon\w*|odby[łl]\s+si[ęe])/i.exec(whole(text));
  return m ? parseDatePhrase(m[1].trim()) : null;
}

// ----------------------------------------------------------------- prices

// Both price anchors below use a PERMISSIVE lazy gap ([\s\S]{0,60}?, not
// [^0-9]{0,60}?) between the keyword and the amount. REAL BUG caught live: a
// digit-excluding gap cannot cross rawa's own unit-number digit sitting
// between the keyword and the real amount — "Cena wywoławcza **lokalu nr
// 1** wynosi 110.000,00 zł" (verified live, tresc=32411) — a [^0-9] gap stops
// dead at the "1" in "nr 1" and the whole match fails, so startingPriceFromText
// silently returned null for every Reymonta unit. The permissive gap plus the
// strict "digits directly followed by zł" completion is still safe: it can
// only ever capture the FIRST well-formed money amount after the keyword.

/** Starting price: "cena wywoławcza … wynosi(ła) <amount> zł" (present tense
 *  on announcements, past tense on results — both matched). */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz\w*[\s\S]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is named ("Nabywcą … został/zostali
 *  …"), from "W wyniku przeprowadzonego przetargu uzyskano kwotę <amount>
 *  zł". A numeric value ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /uzyskano\s+kwot[ęe][\s\S]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Kind from the body text ("lokal mieszkalny" → mieszkalny; "lokal
 *  niemieszkalny"/"lokal użytkowy" → uzytkowy; "nieruchomości niezabudowanej"
 *  / "działka" → grunt; a positive "zabudowana" → zabudowana). */
export function kindFromText(text) {
  return classifyKind(whole(text));
}

// ----------------------------------------------------------------- address

// Street name — anchored on "przy ul. <STREET>" OR the en-dash/hyphen form
// "– ul. <STREET>" (the road-access clause on the Reymonta announcement:
// "z dostępem do drogi publicznej – ul. Reymonta"). Deliberately does NOT
// require a trailing building number — see file header, REAL DATA QUIRK #1:
// the number is never in the body for flats, and land parcels legitimately
// have no building number at all.
//
// REAL BUGS caught live, both fixed by the capital-letter-per-word
// requirement PLUS a mandatory clean terminator (see TERMINATOR below):
//  1. Terminating only at punctuation ("," / "." / " w Raw…") over-captured
//     when neither followed soon enough — "przy ul. Mszczonowskiej w
//     sąsiedztwie zabudowy produkcyjno-usługowej i magazynowej
//     wielkokubaturowej." (tresc=33629) has no comma before the next clause,
//     so the old pattern swallowed the whole run-on sentence as the "street
//     name".
//  2. The word-count bound alone isn't enough: "…przy ul. Jeziorańskiego
//     Przedmiotem ustnego przetargu nieograniczonego jest…" (tresc=30279)
//     runs the header clause straight into a NEW sentence with only a space,
//     no punctuation — and "Przedmiotem" is ALSO capitalized (sentence-
//     initial), so it satisfied the old capital-letter-only rule and got
//     appended to the street name ("Jeziorańskiego Przedmiotem"). Requiring
//     the captured phrase be immediately followed by a real terminator fixes
//     this WITHOUT a hardcoded word-block-list: the malformed first "przy
//     ul. Jeziorańskiego" occurrence now fails to match at all (nothing after
//     it — 0, 1, or 2 extra capitalized words — is ever followed by a
//     terminator), so plain (non-global) regex backtracking naturally moves
//     on and matches the SAME street's second, cleanly-terminated mention a
//     few words later ("przy ul. Jeziorańskiego, oznaczonej jako działka…").
//
// Polish street names are always capitalized proper nouns and at most a
// handful of words ("Reymonta"; "Zamkowa Wola"; "Bolesława Prusa"), so each
// captured word must itself start with a capital letter — "w sąsiedztwie"
// (lowercase "w") ends the match at "Mszczonowskiej" alone. NOTE: STREET_WORD
// is deliberately used WITHOUT the 'i' (case-insensitive) flag — that would
// defeat the capital-letter requirement by matching lowercase words too.
// "ul." itself is matched case-insensitively via an explicit [Uu] instead,
// since "przy"/the street word both need to stay case-sensitive.
//
// TWO alternatives, tried in order (plain, non-global .exec() naturally
// retries at the NEXT "przy ul." occurrence in the string if BOTH fail at
// the current one — see the Jeziorańskiego trace above):
//   1. exactly ONE street word, followed by EITHER a real terminator OR
//      simply a lowercase-starting word (a lowercase word can never be part
//      of a — always-capitalized — street name, so it's always a safe place
//      to stop, punctuation or not: this is what correctly stops at
//      "Mszczonowskiej" before the unpunctuated "w sąsiedztwie…").
//   2. TWO OR THREE street words, followed ONLY by a real terminator (comma/
//      period/"w Raw…"/"oraz"/end) — deliberately NOT the lowercase-word
//      escape hatch, or alternative 2 would greedily accept "Jeziorańskiego
//      Przedmiotem" too (a following lowercase "ustnego" would satisfy it).
//      A genuine multi-word street name is always followed by real
//      punctuation in this data set ("Zamkowa Wola,", "Bolesława Prusa,").
const STREET_WORD = '[A-ZŁŚŻŹĆŃÓĄĘ][\\wąćęłńóśźż.]*';
const REAL_TERMINATOR = '(?:,|\\.|\\s+w\\s+Raw\\w*|\\s+oraz\\b|$)';
const LOOSE_TERMINATOR = `(?:${REAL_TERMINATOR}|\\s+[a-ząćęłńóśźż])`;
const STREET_RE = new RegExp(
  `(?:przy\\s+[Uu]l\\.|[-–]\\s*[Uu]l\\.)\\s+` +
    `(?:(${STREET_WORD})(?=${LOOSE_TERMINATOR})|(${STREET_WORD}(?:\\s+${STREET_WORD}){1,2})(?=${REAL_TERMINATOR}))`,
);

/** Street name (context for land; the address anchor for flats/commercial/
 *  zabudowana), or null if the body never states one. */
export function streetFromText(text) {
  const m = STREET_RE.exec(whole(text));
  const raw = m ? m[1] || m[2] : null;
  return raw ? raw.trim().replace(/\s+/g, ' ') : null;
}

/** Building number for `street`, from either a direct in-body "ul. <street>
 *  <N>" mention (future-proofing — not seen live yet) or, when the body only
 *  states the bare street name, from the document's own attachment file
 *  names (REAL DATA QUIRK #1). `text` must be the FULL labelled blob (needs
 *  the ATTACH field) — window substrings never carry it, which is why this is
 *  called once per document with the outer blob, not per unit-window. */
function buildingNumberFor(text, street) {
  if (!street) return null;
  const t = whole(text);
  const direct = new RegExp(`ul\\.?\\s*${escapeRe(street)}\\s+(\\d+[A-Za-z]?)\\b`, 'i').exec(t);
  if (direct) return direct[1];
  const attach = field(text, 'ATTACH');
  if (!attach) return null;
  const lastWord = street.trim().split(/\s+/).pop();
  const m = new RegExp(`${escapeRe(lastWord)}\\s+(\\d+[A-Za-z]?)`, 'i').exec(attach);
  return m ? m[1] : null;
}

// Multiple parcels + combined area for LAND records: "działki nr: 205/11 o
// pow. 0,0507 ha, 206/12 o pow. 0,0301 ha, 706/5 o pow. 0,0022 ha" (announce/
// unrestricted-result phrasing) AND "oznaczonej nr ewid. 246/4 o pow. 0,0021
// ha" (restricted "ograniczony" result phrasing — different trigger word,
// same "<parcel> o pow. <area> ha" shape, so ONE global scan over that shape
// catches both without needing to recognise the trigger phrase at all). Total
// area prefers an explicit "łącznym obszarze/łącznej powierzchni <N> ha"
// when present (multi-parcel sales), else sums the per-parcel areas.
const PARCEL_RE = /(\d+\/\d+|\d+)\s+o\s+pow\w*\.?\s*(\d+(?:[.,]\d+)?)\s*ha\b/gi;
const TOTAL_AREA_RE = /[łl][ąa]czn\w*\s+(?:obszarze|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*ha/i;

function landPlotsFromText(t) {
  const parcels = [];
  const seen = new Set();
  const areas = [];
  let m;
  PARCEL_RE.lastIndex = 0;
  while ((m = PARCEL_RE.exec(t)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    parcels.push(m[1]);
    areas.push(parseNum(m[2]));
  }
  let area_m2 = null;
  const tot = TOTAL_AREA_RE.exec(t);
  if (tot) {
    area_m2 = Math.round(parseNum(tot[1]) * 10000);
  } else if (areas.length) {
    area_m2 = Math.round(areas.reduce((a, b) => a + (b || 0), 0) * 10000);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

/**
 * True when this document should be routed as LAND (parcel-keyed), whether
 * or not classifyKind() itself said 'grunt'.
 *
 * REAL BUG caught live: the "przetarg OGRANICZONY do współwłaścicieli"
 * (restricted-to-adjacent-owners) RESULT template never uses "działka" /
 * "niezabudowana" / "grunt" at all — it describes the property only as
 * "nieruchomości … oznaczonej nr ewid. 265" (verified live, tresc=32532: the
 * Bolesława Prusa dz. 265 SOLD result, 20 000→20 300 zł — its OWN
 * announcement, tresc=32314, does say "nieruchomość gruntowej … działka nr
 * 265" and correctly classifies as 'grunt', but the result doesn't repeat
 * that wording). classifyKind() therefore returns 'unknown' for these
 * result docs, and 'unknown' used to fall into the address-keyed branch,
 * which requires a street+building number that plain parcels never have —
 * silently dropping an otherwise perfectly parseable, achieved-price sale.
 * Fixed by ALSO treating an 'unknown'-kind document as land whenever
 * landPlotsFromText finds a real parcel (the "<N> o pow. <area> ha" shape is
 * land-specific — flats/buildings are measured in m², never ha — so this
 * can't misroute an address-keyed record).
 */
function isLandLike(t, kind) {
  if (kind === 'grunt') return true;
  if (kind !== 'unknown') return false;
  return Boolean(landPlotsFromText(t).dzialka_nr);
}

// Unit floor area: "Lokal mieszkalny nr 1 o pow. 40 m 2" (the "m 2" spacing —
// not "m2"/"m²" — is what `<sup>2</sup>` collapses to once tags are stripped
// to a space; see stripHtml). Anchored on "nr <unit> o pow." with NO words
// allowed in between (`\s+` only) so the room/piwnica breakdown a few words
// later in the same sentence ("z piwnicą nr 1, położoną w odrębnym budynku o
// pow. 9 m 2") can never win — verified live against tresc=32411's lokal 1.
function unitAreaRe(unit) {
  const unitPart = unit ? `nr\\s+${escapeRe(unit)}\\s+` : '';
  return new RegExp(
    `${unitPart}o\\s+(?:[łl][ąa]cznej\\s+)?pow\\w*\\.?\\s*(?:u[żz]ytkow\\w+\\s+)?(\\d+(?:[.,]\\d+)?)\\s*m\\s*[²2]`,
    'i',
  );
}

/** Usable floor area (m²), or null. `unit` narrows to that flat's own clause
 *  inside a multi-flat blob; omit for a single-property document. */
export function unitAreaFromText(text, unit) {
  const m = unitAreaRe(unit).exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// ------------------------------------------------------- multi-unit splitting

/**
 * Split an ANNOUNCEMENT body into one window per flat (REAL DATA QUIRK #3).
 * Anchored on "dla lokalu nr <N>" — the clause that opens each flat's own
 * date/area/price/wadium block ("Ustny przetarg nieograniczony dla lokalu nr
 * 1 odbędzie się w dniu … Lokal mieszkalny nr 1 o pow. … Cena wywoławcza
 * lokalu nr 1 wynosi … Wadium dla lokalu nr 1 wynosi …"). A document with no
 * such clause (single-property: land/lease/commercial) yields ONE window
 * covering the whole text, unit:null.
 *
 * REAL BUG caught live: "dla lokalu nr N" itself recurs TWICE per unit — once
 * in the date clause ("… odbędzie się w dniu … dla lokalu nr 1 …") and again
 * in the wadium clause ("Wadium dla lokalu nr 1 wynosi …", verified live,
 * tresc=32411). Treating every match as its own window boundary produced TWO
 * windows per flat — the first cut off right before its own price clause
 * (price clause 4 sits between date-clause-2 and wadium-clause-5, so it
 * WOULD have been included — the real breakage was that window 1 ended at
 * the SECOND "dla lokalu nr 1" instead of at the NEXT unit's "dla lokalu nr
 * 4", i.e. a bare duplicate-per-unit rather than a lost field). Fixed by
 * keeping only the FIRST occurrence's position per unit number as that
 * unit's window start.
 * @param {string} text
 * @returns {Array<{unit:string|null, text:string}>}
 */
export function splitAnnouncementUnits(text) {
  const t = whole(text);
  const re = /dla\s+lokalu\s+nr\s+(\d+[A-Za-z]?)/gi;
  const marks = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(t)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    marks.push({ unit: m[1], start: m.index });
  }
  if (!marks.length) return [{ unit: null, text: t }];
  return marks.map((mk, i) => ({
    unit: mk.unit,
    text: t.slice(mk.start, i + 1 < marks.length ? marks[i + 1].start : t.length),
  }));
}

/**
 * Split a RESULT body into one window per flat. UNLIKE the announcement, the
 * per-unit date clause here PRECEDES the "lokalu mieszkalnego nr N" mention
 * ("W dniu 22 października 2024 r. o godz. 10 00 … przeprowadzono … na
 * sprzedaż lokalu mieszkalnego nr 1 … Cena wywoławcza lokalu mieszkalnego nr
 * 1 wynosiła … uzyskano kwotę … Nabywcą … został/zostali …"), so the window
 * MUST start at the repeating "W dniu <D>" marker (once per unit), not at the
 * unit-number mention itself, or the date would fall outside its own flat's
 * window. The unit number (if any) is then read back out of each window. A
 * single-property document (land/lease) still has exactly one "W dniu"
 * marker, so it naturally falls out as ONE window, unit:null.
 * @param {string} text
 * @returns {Array<{unit:string|null, text:string}>}
 */
export function splitResultUnits(text) {
  const t = whole(text);
  const re = /\bw\s+dniu\s+\d/gi;
  const starts = [];
  let m;
  while ((m = re.exec(t)) !== null) starts.push(m.index);
  if (!starts.length) return [{ unit: null, text: t }];
  return starts.map((start, i) => {
    const seg = t.slice(start, i + 1 < starts.length ? starts[i + 1] : t.length);
    const um = /lokal\w*\s+(?:mieszkaln\w*\s+)?nr\s+(\d+[A-Za-z]?)/i.exec(seg);
    return { unit: um ? um[1] : null, text: seg };
  });
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction) blob into 0..N active records
 * (N>1 for a multi-flat notice — see REAL DATA QUIRK #3; refresh.js/crawl.js
 * spread the array, so this is a safe shape). Land (kind 'grunt') → ONE
 * parcel-keyed record for land.json; flats/commercial/garage → one
 * address-keyed record per unit. A 'zabudowana' or address-keyed record whose
 * street/building can't be resolved is DROPPED (REAL DATA QUIRK #2).
 * @param {string} text  blob from buildRecordText
 * @returns {object[]}
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const t = whole(text);
  const kind = kindFromText(text);

  if (isLandLike(t, kind)) {
    const plot = landPlotsFromText(t);
    if (!plot.dzialka_nr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: streetFromText(t),
      starting_price_pln: startingPriceFromText(t),
      auction_date: auctionDateFromText(t),
      round: roundFromText(t),
    }];
  }

  const street = streetFromText(t);
  if (!street) return [];
  const building = buildingNumberFor(text, street);
  if (!building) return [];

  const out = [];
  for (const { unit, text: seg } of splitAnnouncementUnits(t)) {
    const address_raw = unit ? `${street} ${building}/${unit}` : `${street} ${building}`;
    const address = parseAddress(address_raw);
    if (!address) continue;
    out.push({
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      area_m2: unitAreaFromText(seg, unit),
      starting_price_pln: startingPriceFromText(seg),
      auction_date: auctionDateFromText(seg),
      round: roundFromText(seg) ?? roundFromText(t),
    });
  }
  return out;
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED "Informacja o wyniku" blob into 0..N result records
 * (N>1 for a multi-flat notice). Joins its property by address (+ unit-no)
 * or parcel in build-properties. Leases are gated out (isLease) — this
 * pipeline tracks property SALES only.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl (this
 *   adapter passes the metryka "Data publikacji" — the body's own date wins
 *   whenever it parses; see crawl.js)
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultDoc(text) || isLease(text)) return [];
  const t = whole(text);
  const kind = kindFromText(text);

  if (isLandLike(t, kind)) {
    const plot = landPlotsFromText(t);
    if (!plot.dzialka_nr) return [];
    const auction_date = resultDateFromText(t) || fallbackDate || null;
    const starting_price_pln = startingPriceFromText(t);
    const achieved = achievedPriceFromText(t);
    const sold = achieved != null;
    const negativeStated = isNegativeOutcome(t);
    const notes = [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: streetFromText(t),
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const street = streetFromText(t);
  if (!street) return [];
  const building = buildingNumberFor(text, street);
  if (!building) return [];

  const out = [];
  for (const { unit, text: seg } of splitResultUnits(t)) {
    const address_raw = unit ? `${street} ${building}/${unit}` : `${street} ${building}`;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const auction_date = resultDateFromText(seg) || fallbackDate || null;
    const starting_price_pln = startingPriceFromText(seg);
    const achieved = achievedPriceFromText(seg);
    const sold = achieved != null;
    const negativeStated = isNegativeOutcome(seg);
    const notes = [];
    if (address.warning) notes.push(address.warning);
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

    out.push({
      auction_date,
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round: roundFromText(seg) ?? roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(seg, unit),
      notes,
    });
  }
  return out;
}
