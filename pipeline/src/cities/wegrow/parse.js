// Węgrów parsers.
//
// Board 345 ("Ogłoszenia sprzedaży") is a GENERIC Logonet article board (not
// the dedicated real-estate-tender XML module naklo-nad-notecia/chelmno use —
// see config.js). crawl.js enumerates it via the board's own XML feed
// (`/artykuly/xml/345/<page>/1`, found via the board HTML's `<a class="xml">`
// link), which gives every article's {id, url, tytul, data} — NOT structured
// per-record fields. Each kept article's real content is fetched from its own
// PDF attachment (crawl.js finds it via the `#attachments` "Załączniki"
// section, robust across old (pre-2025, no inline body text at all — see
// article 10953) and new (body paragraph mirrors the attachment links)
// article layouts alike) and extracted with pdfText, falling back to ocrPdf
// (every ogłoszenie/informacja-o-wyniku PDF sampled live — 2024 through 2026
// — is a 300dpi scan with NO embedded text layer: `pdftotext` returns 0-2
// chars and `pdffonts` lists zero fonts, confirmed via `pdfimages -list`
// showing a single full-page jbig2/jpeg image per page. This directly
// contradicts the spike's "inline HTML text, no PDF gate" / "OCR unlikely on
// this CMS" claims — a real, live-verified correction to the spike, not a
// paraphrase).
//
// buildRecordText() assembles ONE labelled blob (TYTUL + TRESC) that every
// field function reads — the test builds the SAME blob from real captured
// title + OCR'd body text, so the parsers are groundtruthed against
// production data without re-fetching/re-OCRing.
//
// Regexes below were groundtruthed against real extracted text (verified
// 2026-07-10/11, all from https://bip.wegrow.com.pl/artykul/345/<id>):
//   PENDING flat (round unstated, i.e. round 1): article 12148 "Ogłoszenie
//     przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej
//     lokal mieszkalny nr 19 przy ul. Nowej 3 w Węgrowie" — body opens
//     "BURMISTRZ MIASTA WĘGROWA OGŁASZA PRZETARG USTNY NIEOGRANICZONY" (NO
//     ordinal word — round is stated ONLY when >1, confirmed by contrast
//     against article 10953 below); "lokal mieszkalny nr 19 ... przy ul.
//     Nowej 3 w Węgrowie, o powierzchni użytkowej 52,70 m?" (OCR renders the
//     m² glyph as "m?" — tolerated); "Cena wywoławcza nieruchomości wynosi
//     160 000,00 zł"; "Przetarg odbędzie się w dniu 28 kwietnia 2026 r.".
//   UNSOLD flat result (round 1, "wynikiem negatywnym"): article 12233
//     "Informacja o wyniku przetargu ... lokal mieszkalny nr 19 przy ul. Nowej
//     3" — "w dniu 28 kwietnia 2026 r. ... odbył się przetarg ustny
//     nieograniczony ... Cena wywoławcza nieruchomości wynosiła 160 000,00 zł
//     ... Przetarg zakończył się wynikiem negatywnym, z powodu braku
//     uczestników przetargu (nikt nie wpłacił wadium)." — no achieved price.
//   PENDING land (round unstated): article 12186 "Ogłoszenie przetargu ...
//     sprzedaż nieruchomości gruntowych ... przy ul. Ks. Kazimierza
//     Czarkowskiego" — "działka nr 3286/2 o pow. 0,0412 ha ... nr 5742/2 o
//     pow. 0,0288 ha ... nr 5773/7 o pow. 0,0582 ha ... o łącznej powierzchni
//     0,1282 ha"; "Cena wywoławcza nieruchomości wynosi 500 000,00 zł netto".
//   SOLD land result (round 1): article 12289 "Informacja o wyniku przetargu
//     - sprzedaż nieruchomości gruntowych przy ul. Ks. Kazimierza
//     Czarkowskiego" — "Cena wywoławcza nieruchomości wynosiła 500 000,00 zł
//     netto ... Cena osiągnięta w przetargu wyniosła 605 000,00 zł netto"
//     (netto figure kept — matches the netto starting-price convention; the
//     brutto-with-VAT total is a different, larger figure and is NOT used).
//   SOLD house result, ROUND 2 (explicit ordinal, both sides): article 10953
//     ann "ogłasza DRUGI przetarg ustny nieograniczony na sprzedaż
//     nieruchomości gruntowej zabudowanej ... przy ul. Narutowicza" + "5.
//     Pierwszy przetarg został ogłoszony w dniu 07 listopada 2023 r. i
//     zakończył się wynikiem negatywnym." (a prior-round-history trap —
//     roundFromText must anchor on "ogłasza <ORDINAL> przetarg", not just any
//     ordinal-adjacent-to-"przetarg" mention, or this line would misfire);
//     result article 11070 "w dniu 26 marca 2024 r. ... odbył się DRUGI
//     przetarg ... Cena wywoławcza nieruchomości wynosiła 500.000,00 zł
//     (DOT-thousands, unlike the space-thousands seen on the 2026 docs) ...
//     Cena osiągnięta w przetargu – 505.000,00 zł" (en-dash separator, NO
//     "wyniosła" verb — a second live achieved-price phrasing, distinct from
//     Czarkowskiego's "wyniosła X zł").
//   BEZPRZETARGOWO wykaz (tenant sale, SKIPPED before ever being fetched):
//     article 12147 "Wykaz lokalu mieszkalnego Nr 19 przy ul. Piłsudskiego 9
//     przeznaczonego do sprzedaży na rzecz jego najemcy" — real native-text
//     PDF (Word-produced, not scanned) body: "Sprzedaż w trybie
//     bezprzetargowym na rzecz najemcy". isSkippableTitle() catches this (and
//     every other wykaz — pre-przetarg designation wykazy are ALSO skipped;
//     see crawl.js header for why) purely from the board XML's <tytul>, so
//     the PDF is never even downloaded.
//
// Węgrów's announcement/result prose never restates "lokal mieszkalny"-style
// wording for land/house records, so kind classification defers entirely to
// the shared classifyKind() — verified live to resolve all three kinds
// correctly (mieszkalny / grunt / zabudowana) including the LAND_RE-vs-
// BUILT_RE precedence needed for article 10953 ("nieruchomości gruntowej
// zabudowanej" — a BUILT plot, i.e. a house, not raw land).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ------------------------------------------------------------------ numbers

// "160 000,00" / "500.000,00" / "2 302 240,00" -> integer PLN. Both space- and
// dot-thousands separators are observed live (space on the 2026 docs, dot on
// the 2024 doc) — strip both, keep the ",NN" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "52,70" / "119.25" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML fragment OR an already-plain extracted string (OCR/pdftotext)
 *  to plain text, trimmed. Safe on plain text (no-ops). */
function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parse function reads: the article's
 * own TITLE (the XML board's <tytul> — carries round-number info the body
 * sometimes omits, e.g. "Ogłoszenie o drugim przetargu ...") + the extracted
 * PDF body (TRESC — pdftotext/OCR output, newlines preserved so the
 * street-header regex can use them as an unambiguous terminator). crawl.js
 * passes the live-fetched strings; the test passes the same real captured
 * strings.
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [`TYTUL: ${stripHtml(f.title)}`, `TRESC:\n${(f.body || '').replace(/\r/g, '').trim()}`].join('\n');
}

/** Read the TYTUL line (single line). */
function titleField(text) {
  const m = /^TYTUL:[ \t]*(.*)$/im.exec(text || '');
  return m ? m[1].trim() : '';
}

/** Read the TRESC block (everything after the "TRESC:" line to the end). */
function bodyField(text) {
  const m = /^TRESC:\n([\s\S]*)$/m.exec(text || '');
  return m ? m[1] : '';
}

// ----------------------------------------------------------------- title routing
//
// The board mixes open-auction announcements/results with tenant
// bezprzetargowo wykazy, pre-przetarg designation wykazy, property-exchange
// wykazy, qualified-bidder lists, cancellations, and (twice, historically) a
// sale of RUCHOMOŚCI (movable equipment from a defunct wholesaler — NOT
// nieruchomości/real estate). Titles are classified BEFORE fetching the
// article at all, so skipped items never cost a request.

/** True for a title to SKIP outright: any wykaz (bezprzetargowo tenant sales,
 *  pre-przetarg designations, property exchanges/darowizna — see crawl.js for
 *  why ALL wykaz variants are skipped uniformly), qualified-bidder lists,
 *  cancellations/annulments, movable-property ("ruchomości", NOT
 *  "NIEruchomości") sales, and (defensively, not observed live on this board
 *  but the pattern used by every other Logonet analog) leases/rokowania. */
export function isSkippableTitle(title) {
  const s = title || '';
  return (
    /\bwykaz/i.test(s) ||
    /lista\s+os[óo]b/i.test(s) ||
    /odwo[łl]ani|uniewa[żz]ni/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(?<!nie)ruchomo[śs]ci/i.test(s) ||
    /\bnajem\b|dzier[żz]aw/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

/** True when the title is a published RESULT notice ("Informacja(e) o
 *  wyniku ... przetargu/przetargów ..." — singular/plural/ograniczony all
 *  match). Call BEFORE isAnnouncementTitle. */
export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik/i.test(title || '');
}

/** True when the title is a municipal sale-auction announcement ("Ogłoszenie
 *  (o) przetargu ...", "Ogłoszenie o drugim przetargu ...", a bare "Przetarg
 *  na sprzedaż ..."). Call only after isSkippableTitle (which already
 *  excludes "sprzedaż ruchomości") / isResultTitle. */
export function isAnnouncementTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo/i.test(s);
}

// ----------------------------------------------------------------- round

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

function ordinalToRound(word) {
  const key = (word || '').toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  return null;
}

const ORDINAL_ALT = '(pierwsz\\w*|drug\\w*|trzeci\\w*|czwart\\w*|pi[ąa]t\\w*|sz[óo]st\\w*)';

/**
 * Auction round. Węgrów's template states the ordinal ONLY for a repeat
 * attempt — round 1 announcements open bare ("OGŁASZA PRZETARG USTNY
 * NIEOGRANICZONY", no ordinal at all; confirmed live on 2 independent round-1
 * fixtures), round ≥2 ones state it right after the verb ("ogłasza DRUGI
 * przetarg …", article 10953). So: null (not 1!) when unstated — matches
 * every other adapter's convention of leaving round-1 implicit for
 * build-properties' own history-based derivation. Anchored specifically on
 * "ogłasza <ORDINAL> przetarg" / "odbył się <ORDINAL> przetarg" so a
 * prior-round history clause ("Pierwszy przetarg został OGŁOSZONY w dniu … i
 * zakończył się wynikiem negatywnym" — different verb form/word order, article
 * 10953 point 5) can never be mistaken for the current round.
 */
export function roundFromText(text) {
  const t = bodyField(text);
  let m = new RegExp(`og[łl]asza\\s+${ORDINAL_ALT}\\s+przetarg`, 'i').exec(t);
  if (m) return ordinalToRound(m[1]);
  // Result notices: "... odbył się [<ORDINAL>] przetarg ustny ...".
  m = new RegExp(`odby[łl]\\s+si[ęe]\\s+${ORDINAL_ALT}\\s+przetarg`, 'i').exec(t);
  if (m) return ordinalToRound(m[1]);
  return null;
}

// ----------------------------------------------------------------- date

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/**
 * Auction date. Announcement: "Przetarg odbędzie się w dniu D <miesiąc> YYYY".
 * Result: "… informuje, że w dniu D <miesiąc> YYYY r[.] …[odbył się <ORDINAL>]
 * przetarg …" — the optional single word before "przetarg" absorbs a round-2+
 * result's ordinal ("… odbył się DRUGI przetarg …", article 11070) without a
 * separate result-only pattern. -> ISO date or null.
 */
export function auctionDateFromText(text) {
  const t = bodyField(text);
  let m = /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (!m) {
    m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,150}?odby[łl]\s+si[ęe]\s+(?:\S+\s+)?przetarg/i.exec(t);
  }
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// ----------------------------------------------------------------- prices

/** Starting price: "Cena wywoławcza nieruchomości wynosi[ła] X zł" (present
 *  tense on announcements, past on results — both matched). */
export function startingPriceFromText(text) {
  const t = bodyField(text);
  const m = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s+wynosi(?:[łl]a)?\s*:?\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices only) — TWO live phrasings: "cena osiągnięta
 *  w przetargu WYNIOSŁA X zł" (Czarkowskiego land) and "cena osiągnięta w
 *  przetargu – X zł" (en-dash, no verb; Narutowicza house). A numeric value =>
 *  sold; no match (unsold, or the clause is absent entirely) => null. */
export function achievedPriceFromText(text) {
  const t = bodyField(text);
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** True when the result text explicitly states a negative (unsold) outcome.
 *  "brak\w*" (not bare "brak") so the genitive "braku uczestników" (real live
 *  phrasing, article 12233 — "z powodu braku uczestników przetargu") matches
 *  too, not just the bare nominative "brak ofert". */
export function isNegativeOutcome(text) {
  const t = bodyField(text);
  return /wynikiem\s+negatywnym|brak\w*\s+(?:uczestnik|ofert)|nie\s+wp[łl]aci[łl]\w*\s+wadium|nie\s+odnotowano/i.test(t);
}

/** True when this text is (or was routed as) a published result notice — used
 *  defensively by parseResultDoc; the primary announcement/result split
 *  happens by TITLE in crawl.js (isResultTitle), before the article is even
 *  fetched. */
export function isResultNotice(text) {
  return isResultTitle(titleField(text)) || /informacj\w*\s+o\s+wynik/i.test(bodyField(text));
}

// ----------------------------------------------------------------- kind

/** Kind classification: TITLE first (concise, reliably states "lokal
 *  mieszkalny" / "nieruchomości gruntowych" for flats/land — though NOT for
 *  houses, whose title is often just "… przy ul. X", no asset-type word at
 *  all: article 10953), falling back to a WINDOWED body (first 700 chars —
 *  the sale-object description in point/paragraph 1) only when the title
 *  alone is unclassifiable.
 *
 *  REAL LIVE BUG avoided by the window: classify-kind's BUILT_RE guard is a
 *  global (unwindowed) text scan, and Węgrów's land announcements' OWN
 *  boilerplate describes NEIGHBORING parcels as built ("Otoczenie
 *  nieruchomości stanowią nieruchomości gruntowe zabudowane …", article
 *  12186 point 2) — feeding classifyKind() the FULL body lets that unrelated
 *  mention defeat the LAND_RE guard and misclassify the (niezabudowana)
 *  SUBJECT parcel as 'zabudowana'. Verified live on article 12186:
 *  "niezabudowane" sits at char 344 of the body; the polluting "Otoczenie …
 *  zabudowane" clause only starts at char 986 — a 700-char window (title
 *  fails to classify this one anyway, so windowing is moot for this specific
 *  article, but the margin is validated) keeps clear of it. Cross-checked
 *  against article 10953 (a genuine house, title also unclassifiable): its
 *  own legitimate zabudowanej/działka co-occurrence sits at chars 504/686 —
 *  both inside the window, and classify-kind's own "grunt(?!\w*\s+zabudowan)"
 *  lookahead already keeps that case out of 'grunt' correctly on its own. */
function kindFromText(text) {
  const titleKind = classifyKind(titleField(text));
  if (titleKind !== 'unknown') return titleKind;
  return classifyKind(bodyField(text).slice(0, 700));
}

// ----------------------------------------------------------------- address

// Street (+ optional building number) from "przy ul[icy] <Street> [<Bldg>]".
// The building-number capture carries its OWN lookahead (comma or " w
// Węgrowie") so a following list marker ("… ul. Narutowicza\n\n1. Przedmiotem
// …", article 10953's bare header mention with NO real building number) can
// never be mistaken for one; the outer lookahead deliberately excludes a bare
// "." (unlike other Logonet analogs) so an abbreviation inside the street name
// itself ("Ks. Kazimierza Czarkowskiego") is never truncated at the
// abbreviating period. A real newline is a valid terminator (this run
// intentionally does NOT collapse whitespace — see buildRecordText).
const STREET_HEADER_RE =
  /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?)(?=\s*,|\s+w\s+W[ęe]growie\b))?(?=,|\s+w\s+W[ęe]growie\b|\n|$)/gi;

/** { street, building|null } — prefers the FIRST occurrence that carries a
 *  real building number (a bare/title mention of the street earlier in the
 *  text, with no number, is common — see article 10953 header vs point 1),
 *  falling back to the first bare mention (land: no building number exists
 *  anywhere; identified by dzialka_nr instead).
 *
 *  REAL LIVE BUG fixed: result notices restate the AUCTION VENUE — the
 *  Urząd's own fixed seat, "Rynek Mariacki 16" (present in every document's
 *  letterhead) — as "w siedzibie Urzędu Miejskiego w Węgrowie, PRZY UL. Rynek
 *  Mariacki 16, odbył się przetarg …", WITH a "przy ul." prefix and a real
 *  building number (article 12233); announcements never do (they state the
 *  same venue as bare "…, Rynek Mariacki 16, piętro I, pokój nr 8", no "przy
 *  ul."). Unguarded, this venue mention — appearing BEFORE the actual
 *  property address in the result's opening sentence — was picked as "the"
 *  address instead of the subject flat's. Guarded by skipping any "przy ul."
 *  match whose preceding ~60 chars contain "w siedzibie" (a venue-announcing
 *  phrase no auctioned property is ever described with). */
export function streetFromHeader(text) {
  const t = bodyField(text);
  const re = new RegExp(STREET_HEADER_RE.source, 'gi');
  let m;
  let bare = null;
  while ((m = re.exec(t)) !== null) {
    const precedingWindow = t.slice(Math.max(0, m.index - 60), m.index);
    if (/w\s+siedzibie/i.test(precedingWindow)) continue;
    const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (!street) continue;
    if (m[2]) return { street, building: m[2] };
    if (!bare) bare = { street, building: null };
  }
  return bare;
}

// Flat/unit number: "lokal mieszkalny nr 19".
const UNIT_NO_RE = /lokal\w*\s+mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;

/** "ul. <street> <bldg>[/<apt>]" raw address for a flat/house, or null
 *  (address-keyed records need at least a building number). */
export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const t = bodyField(text);
  const um = UNIT_NO_RE.exec(t);
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

// Usable floor area of the unit: "lokal mieszkalny nr 19, … o powierzchni
// użytkowej 52,70 m?" — anchored on "lokal … mieszkalny nr N" so a later
// per-room breakdown is never taken; the m² glyph is tolerated as "m2", "m²"
// OR OCR-mangled "m?" (observed live on every scanned flat notice sampled).
const UNIT_AREA_RE =
  /lokal\w*\s+mieszkaln\w+\s+nr\s+\d+[A-Za-z]?[\s\S]{0,150}?o\s+powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2?]/i;

/** Usable floor area (m2) of a flat, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(bodyField(text));
  return m ? parseArea(m[1]) : null;
}

// Parcel(s) + total area for LAND records. Węgrów states each parcel as
// "<nr> o pow[ierzchni] <area> ha" (the "działka nr" prefix is only spelled
// out for the FIRST parcel in a list — "nr 3286/2 o pow. 0,0412 ha … nr
// 5742/2 o pow. 0,0288 ha … nr 5773/7 o pow. 0,0582 ha"; "pow." is the
// consistently-used abbreviation, never the full "powierzchni" — unlike the
// Śląskie Logonet analogs), gated on the text containing "dział…" so a
// coincidental "<number> o pow. …" elsewhere can't false-positive. A trailing
// "o łącznej powierzchni X ha" total, when present, wins over the per-parcel
// sum (both agree on every live sample). REAL LIVE BUG found + worked around:
// on article 12186's announcement scan, OCR misreads the "o" in the THIRD
// parcel's "5773/7 o pow. 0,0582 ha" as "©" ("5773/7 © pow. 0,0582 ha"),
// silently dropping that parcel from the per-parcel regex — recovered via the
// SAME article's cleanly-OCR'd summary clause ("trzy sąsiadujące ze sobą
// działki nr 3286/2, 5742/2, 5773/7 o łącznej powierzchni …", reListRe below),
// which every land announcement restates. The parcel AREA total is unaffected
// either way (it comes from the "łącznej powierzchni" ha figure, not the sum).
function plotFromText(text) {
  const t = bodyField(text).replace(/\s+/g, ' ');
  if (!/dzia[łl]k/i.test(t)) return { dzialka_nr: null, area_m2: null };
  const parcels = [];
  const seen = new Set();
  const parcelArea = new Map();
  const re = /(\d+(?:\/\d+)?)\s+o\s+pow(?:ierzchni|\.)?\s+(\d+[.,]\d+)\s*ha\b/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
    const a = Number(m[2].replace(',', '.'));
    if (a > 0 && !parcelArea.has(m[1])) parcelArea.set(m[1], a);
  }
  // Supplementary: a comma-separated parcel list immediately before "o
  // łącznej powierzchni" (recovers a parcel the per-parcel regex above missed
  // due to an OCR glitch on ITS OWN "o pow." occurrence — see header comment).
  const reListRe = /dzia[łl]k\w*\s+(?:nr\s+)?((?:\d+(?:\/\d+)?\s*,\s*)+\d+(?:\/\d+)?)\s+o\s+[łl][ąa]cznej\s+pow/i;
  const lmList = reListRe.exec(t);
  if (lmList) {
    for (const p of lmList[1].split(/\s*,\s*/)) {
      const v = p.trim();
      if (/^\d+(?:\/\d+)?$/.test(v) && !seen.has(v)) { seen.add(v); parcels.push(v); }
    }
  }
  let area_m2 = null;
  const lm = /[łl][ąa]cznej\s+pow(?:ierzchni|\.)?\s+(\d+[.,]\d+)\s*ha\b/i.exec(t);
  if (lm) {
    const a = Number(lm[1].replace(',', '.'));
    if (a > 0) area_m2 = Math.round(a * 10000);
  }
  if (area_m2 == null && parcelArea.size) {
    let sum = 0;
    for (const a of parcelArea.values()) sum += a;
    area_m2 = Math.round(sum * 10000);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT record blob into an active listing, or null. Land
 * (kind 'grunt') -> parcel-keyed record for land.json; flats/houses ->
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
    const h = streetFromHeader(text);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
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
  const area_m2 = unitAreaFromText(text);
  const plot = kind === 'zabudowana' ? plotFromText(text) : { area_m2: null };
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED (result) record blob into a result record. Returns 0 or
 * 1 record (array = framework interface). Joins its announcement by address
 * (+ flat-no) + round in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date from the crawl ref (XML <data>)
 * @param {string} sourceUrl  canonical article URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = plotFromText(text);
    const h = streetFromHeader(text);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
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

  const area_m2 = unitAreaFromText(text);
  const plot = kind === 'zabudowana' ? plotFromText(text) : { area_m2: null };
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
      area_m2,
      ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
      notes,
    },
  ];
}
