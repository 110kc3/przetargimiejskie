// Głogów parsers.
//
// Prezydent Miasta Głogowa sells municipal flats, commercial units, garages,
// whole houses ("nieruchomość zabudowana") and land at "przetarg ustny
// (nie)ograniczony" via ONE bip.info.pl-family board (legacy idmp=27,
// live-migrated to an Angular SPA + `/api/fo/` JSON:API — see config.js and
// crawl.js's header). Every notice's operative text comes from an attached
// PDF (born-digital — `pdftotext`), fetched + extracted directly by crawl.js
// and wrapped into ONE labelled blob via buildRecordText({title, body}):
// `title` is the article's own metadata title (from the API list/detail
// JSON); `body` is the FULL pdftotext output of ONE attachment PDF.
//
// LOAD-BEARING DESIGN NOTE — body-first field extraction, never the (shared)
// title, for STRUCTURED fields: a single RESULT article can carry SEVERAL
// attachment PDFs (e.g. "INFORMACJE o wynikach … Kamienna Droga 37/8, 39/2,
// 39/6 i 39/8" — 4 attachments, one article, ONE shared aggregate title
// mentioning all 4 addresses). If address/price/area were read from the
// TITLE (or from title+body concatenated with title first), every one of
// those 4 records would extract the SAME (garbled, first-match) address from
// the aggregate title instead of its own attachment's clean, specific
// statement. So round/date/kind fall back to TITLE only when BODY has no
// match (defensive — not expected to trigger on real data); address/price/
// area/land-plot NEVER look at TITLE at all — see roundFromText/
// auctionDateFromText/kindFromText vs. addressRawFromText/
// startingPriceFromText/achievedPriceFromText/unitAreaFromText/
// landPlotFromText/landStreetFromText below. TITLE is used only for the
// coarse doc-type gates (isAnnouncement/isResultDoc/isQualifiedBiddersList),
// where "does this notice mention X anywhere" carries no such risk.
//
// MULTI-LOT ANNOUNCEMENTS (opposite structure from multi-lot RESULTS): a
// single announcement PDF can itself bundle several flats in ONE attachment,
// each introduced by its own "N.\nSamodzielny lokal (nie)mieszkalny/użytkowy
// nr M" marker (round + auction date/place are STATED ONCE, shared by every
// lot; price/area/address are PER LOT) — e.g. Wały Bolesława Chrobrego 6
// (lots 13, 14, 15), live-verified 2026-07-19. splitLots() below splits the
// PDF body on those markers; a document with 0-1 markers (the common case)
// comes back as a single one-element array, so callers never special-case it.
//
// Round: Głogów spells it out as a WORD ORDINAL ("pierwszy/pierwsze",
// "drugi/drugie", "trzeci/trzecie", "czwarty/czwarte", …), NOT a Roman
// numeral like Zgorzelec/Lubliniec. It always appears at the very TOP of the
// PDF body ("ogłasza\n<ordinal> przetarg(i) …" / "INFORMACJA\no wyniku
// przeprowadzonego <ordinal-genitive> przetargu …"), strictly BEFORE any
// prior-round HISTORY clause further down (e.g. "16. Pierwszy przetarg ustny
// nieograniczony … odbył się w dniu 31 marca 2026 r., a drugi w dniu 9
// czerwca 2026 r." — a real decoy, live-verified on the Rzemieślnicza 21a/9
// 3rd-round announcement). Because regex .exec() always returns the
// LEFTMOST match and the true current-round statement is always first,
// first-match-in-body naturally beats every observed decoy — no separate
// anchor phrase is needed (contrast Zgorzelec, which anchors on "ustnym" to
// dodge a same-position decoy).
//
// "ograniczony" (restricted-to-neighbors) auctions share this board with the
// open "nieograniczony" ones and are KEPT — both are real sales (same
// convention as this repo's Znin/Złotoryja adapters); only leases and the
// procedural "LISTA OSÓB ZAKWALIFIKOWANYCH …" (qualified-bidders list —
// neither an announcement nor a result) are out of scope.
//
// Real fixtures groundtruthing every regex below (all fetched live
// 2026-07-19 via glogow.bip.info.pl's `/api/fo/` API + attachment PDFs —
// see tests/parse-glogow.test.js for the full captured text):
//   ANNOUNCE single-lot (round III): Rzemieślnicza 21a/9, 345 000 zł,
//     47,75 m², przetarg 15.09.2026 — carries the round-history decoy above.
//   ANNOUNCE multi-lot (round I, PLURAL "pierwsze przetargi"): Wały
//     Bolesława Chrobrego 6/13 (240 000 zł, 70,49 m²), 6/14 (260 000 zł,
//     77,42 m²), 6/15 (180 000 zł, 47,47 m²) — ONE PDF, shared date
//     "Przetargi odbędą się w dniu 6 lipca 2026 r."
//   ANNOUNCE land (zabudowana — a whole tenement building, round II):
//     Kamienna Droga 49, dz. 48/7 obr. 3, 530 000 zł, 1055 m².
//   RESULT UNSOLD, flat (round I): Wały Bolesława Chrobrego 6/15 — "Przetarg
//     zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił …".
//   RESULT UNSOLD, house/zabudowana (round I): Kamienna Droga 49 — same
//     negative phrasing.
//   RESULT UNSOLD, flat (round IV, one of 4 SEPARATE attachments on one
//     "INFORMACJE o wynikach …" article — the multi-attachment-result
//     structure this parser must NOT confuse with multi-lot splitting):
//     Kamienna Droga 37/8, 185 000 zł.
//   RESULT UNSOLD, land niezabudowana (round II): ul. Stanisława Kutrzeby dz.
//     159/2 obr. 7, 950 000 zł — "nie zaoferował postąpienia ponad cenę
//     wywoławczą" (a second, distinct negative phrasing).
//   RESULT SOLD, flat (round III): Jedności Robotniczej 6a/10 — "Nabywcą
//     lokalu został Rafał Patrzałek za najwyższą zaoferowaną cenę 166 650,00
//     zł" (starting price 165 000 zł).
//   RESULT UNSOLD, flat on a SQUARE (round I): "przy Placu 1000-lecia 10"
//     (35,29 m², 172.000,00 zł — dot-thousands) under the GENERIC title
//     "… na sprzedaż lokalu mieszkalnego." — the Plac designator + digits-
//     first street name the address regexes must handle.
//   RESULT UNSOLD, shed-plot 'zabudowana' (round II): "przy ulicy
//     Spokojnej," — a street but NO building number → parcel-keyed fallback
//     (dz. 93 obr. 3).
//   RESULT + ANNOUNCEMENT, village-estate ½-share (round I): "w Witanowicach
//     nr 18, gmina Gaworzyce" — no Głogów street at all → parcel-keyed
//     fallback (dz. 99) on both parse paths.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "345000,00" / "550000,00 (słownie: …)" -> integer PLN. Głogów writes prices
// with NO thousands separator (unlike Zgorzelec's "180.000,00"), so this only
// needs to strip stray spaces/dots (defensive, in case a future notice adds
// them) and the ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "47,75" / "1935" -> number. Comma OR dot decimal; spaces stripped.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeWs(s) {
  return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------- record text blob

/**
 * Assemble the labelled text blob every parser reads. `title` is the API
 * article's own metadata title; `body` is the FULL pdftotext output of ONE
 * attachment PDF (crawl.js fetches PDFs directly — never trusts the API's
 * own `attachments[].attributes.content`, which is empty for some documents).
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [`TITLE: ${normalizeWs(f.title)}`, `BODY: ${normalizeWs(f.body)}`].join('\n');
}

/** Read a single labelled line's value from the blob. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/** TITLE + BODY concatenated — used ONLY for coarse doc-type gates (never for
 *  structured-field extraction — see header comment). */
function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'BODY')}`.trim();
}

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a SALE auction ("… przetarg … sprzedaż …"). */
export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

/** True when the auction PURPOSE is a DZIERŻAWA / NAJEM lease, not a sale
 *  (defensive — this board has not been observed to carry any, unlike the
 *  general "Ogłoszenia" boards on other bip.info.pl cities). */
export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t);
}

/** True for the procedural "LISTA OSÓB ZAKWALIFIKOWANYCH do … przetargu …"
 *  notice (the qualified-bidders list) — neither an announcement nor a
 *  result, but shares this board (~6 of 161 live-verified items). */
export function isQualifiedBiddersList(text) {
  return /lista\s+os[óo]b\s+zakwalifikowan/i.test(whole(text));
}

/** True for a "INFORMACJA(E) o wyniku(ach) …" result notice. */
export function isResultDoc(text) {
  return /informacj\w*\s+o\s+wynik/i.test(whole(text));
}

/** True for a "PREZYDENT MIASTA GŁOGOWA ogłasza …" announcement. */
export function isAnnouncement(text) {
  return /og[łl]asza/i.test(whole(text));
}

/** True when the resolution explicitly states a negative (unsold) outcome.
 *  Two distinct real phrasings observed: "…zakończył się wynikiem
 *  negatywnym, gdyż nikt nie przystąpił do przetargu" and "…wynikiem
 *  negatywnym, gdyż uczestnik przetargu nie zaoferował postąpienia ponad
 *  cenę wywoławczą" — both share the "wynikiem negatywnym" anchor. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+zaoferowa\w*\s+post[ąa]pieni/i.test(t);
}

// ----------------------------------------------------------------- round

const ORDINAL_STEMS = [
  [/^pierwsz/i, 1], [/^drug/i, 2], [/^trzeci/i, 3], [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5], [/^sz[óo]st/i, 6], [/^si[óo]dm/i, 7], [/^[oó]sm/i, 8],
  [/^dziewi[ąa]t/i, 9], [/^dziesi[ąa]t/i, 10],
];
const ORDINAL_RE =
  /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[oó]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg\w*/i;

function stemToRound(stem) {
  for (const [re, n] of ORDINAL_STEMS) if (re.test(stem)) return n;
  return null;
}

/**
 * Auction round — see the file header for why BODY (first match) is the
 * primary anchor, not TITLE, and why that's still decoy-safe.
 * @param {string} text  the TITLE/BODY blob
 * @returns {number|null}
 */
export function roundFromText(text) {
  let m = ORDINAL_RE.exec(field(text, 'BODY'));
  if (m) return stemToRound(m[1]);
  m = ORDINAL_RE.exec(field(text, 'TITLE')); // defensive fallback
  return m ? stemToRound(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Kind — BODY first (see header), TITLE as fallback — but classify the
 *  body's HEAD (the operative subject statement: "ogłasza … przetarg … na
 *  sprzedaż <object>" / "INFORMACJA o wyniku … na sprzedaż <object>", always
 *  inside the first few hundred chars), NOT the full body: deep zoning
 *  boilerplate mentions decoy asset words ("… przeznaczenie … parkingi,
 *  miejsca postojowe i garaże" — live-verified on the Kamienna Droga 49
 *  whole-tenement announcement, which classify-kind's GARAGE_RE would
 *  otherwise misroute to 'garaz'). Full-body classify stays as the LAST
 *  fallback for a hypothetical notice whose head is unusually long. */
export function kindFromText(text) {
  const body = field(text, 'BODY');
  let k = classifyKind(body.slice(0, 600));
  if (k !== 'unknown') return k;
  k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(body);
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
 * Auction date. ANNOUNCEMENT (future, singular OR plural for a multi-lot
 * shared session): "Przetarg(i) odbędzie/odbędą się w dniu <date> r.".
 * RESULT (past): "Przetarg przeprowadzono w dniu <date> r.". Both anchors are
 * distinct from the body's prior-round HISTORY clause ("… odbył się w
 * dniu …", a different verb), so that decoy never wins. See header for why
 * BODY (not TITLE) is searched.
 * @param {string} text  the TITLE/BODY blob
 * @returns {string|null} ISO date
 */
export function auctionDateFromText(text) {
  const t = field(text, 'BODY') || whole(text);
  let m = /odb(?:ędzie|ędą)\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /przetarg\w*\s+przeprowadzono\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}

// ----------------------------------------------------------------- prices
//
// The following operate on PLAIN text (a body, or one lot-chunk of a body —
// see splitLots) passed directly by the caller, NEVER on the labelled blob
// and NEVER on TITLE (see header comment).

// Anchored on "cen… wywoławcz…" (covers "Cena wywoławcza:", "cenę
// wywoławczą ustalono na kwotę", "cenę wywoławczą w <round> przetargu ustnym
// (nie)ograniczonym na sprzedaż … ustalono na kwotę" — the longest observed
// gap is ~100 chars). NOTE the noun stem is `cen[a-ząęó]*`, NOT `cen\w*`: JS
// \w is ASCII-only, so `cen\w*\s+` dies on the accusative "cenę wywoławczą"
// (the RESULT notices' spelling — "cenę" ends in a non-\w "ę" with no
// whitespace after "cen"); announcements' nominative "Cena wywoławcza" masked
// this until the first result fixture. The amount is NOT always immediately
// followed by "zł" (e.g. "…ustalono na kwotę 550000,00 (słownie: pięćset…",
// "zł" appears only after the parenthetical) — captures the first number in
// the window instead of requiring a trailing currency marker.
const STARTING_PRICE_RE = /cen[a-ząęó]*\s+wywo[łl]awcz[a-ząęó]*[\s\S]{0,150}?(\d[\d\s.]{2,}(?:,\d{2})?)/i;

/** @param {string} plainText @returns {number|null} */
export function startingPriceFromText(plainText) {
  const m = STARTING_PRICE_RE.exec(plainText || '');
  return m ? parsePLN(m[1]) : null;
}

// Achieved price — ONLY when a buyer is named ("Nabywcą … został <Name> za
// najwyższą zaoferowaną cenę <amount> zł"). A numeric value ⇒ sold; null ⇒
// unsold / not stated.
export function achievedPriceFromText(plainText) {
  const t = plainText || '';
  if (!/nabywc/i.test(t)) return null;
  const m = /za\s+najwy[żz]sz[ąa]\s+zaoferowan[ąa]\s+cen[ęe]\s+(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// Usable area of the unit: "… o powierzchni użytkowej 47,75 m2 …" (also
// matches a whole-building result/announce's own "… powierzchni użytkowej
// 182,03 m2", correctly skipping an earlier "powierzchni zabudowy 131,06 m2"
// footprint figure in the same sentence since that lacks "użytkow…").
const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w*\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i;

/** @param {string} plainText @returns {number|null} */
export function unitAreaFromText(plainText) {
  const m = UNIT_AREA_RE.exec(plainText || '');
  return m ? parseNum(m[1]) : null;
}

// ----------------------------------------------------------------- address

// Property street+building — anchored on "przy <designator> <STREET> <BLDG>"
// where the designator is "ul." / spelled-out "ulicy" (announcements
// abbreviate; the Kamienna Droga 49 whole-tenement RESULT spells it out) OR
// "Pl." / "Placu" (flats DO sit on squares — live-verified: "lokal mieszkalny
// nr 22 … przy Placu 1000-lecia 10 w Głogowie"). A plac designator is FOLDED
// into the street as nominative "Plac …" (bolesławiec's convention) so
// "przy Placu X" and "przy Pl. X" key identically. The street may open with
// a digit token ("1000-lecia") — hence the optional \d+[\s-]+ head, which the
// letters-only class would otherwise reject. Safe against the office address
// ("Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów") because Rynek is
// never preceded by "przy ul./ulicy/Pl./Placu" anywhere in the observed
// boilerplate. STREET is non-greedy up to the first standalone number so
// multi-word names ("Wały Bolesława Chrobrego") are captured whole.
const PROP_ADDR_RE =
  /przy\s+(ul(?:\.|icy)|pl(?:\.|acu))\s+((?:\d+[\s-]+)?[A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s+(\d+[A-Za-z]?)\b/i;

// Land street (no building number) — same designator alternation, terminated
// before a comma / "oznaczon…" (the geod. clause) / "w Głogowie" / end.
const LAND_STREET_RE =
  /przy\s+(ul(?:\.|icy)|pl(?:\.|acu))\s+((?:\d+[\s-]+)?[A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{2,40}?)(?:,|\s+oznaczon|\s+w\s+G[łl]ogowie|\.|$)/i;

/** Fold a matched designator + raw street into the display street: plac
 *  designators become a nominative "Plac " prefix; "ul." variants add none. */
function foldStreet(designator, rawStreet) {
  const street = rawStreet.trim().replace(/\s+/g, ' ');
  return /^pl/i.test(designator) ? `Plac ${street}` : street;
}

// Flat / commercial unit number: "lokal(u) (nie)mieszkaln…/użytkow… nr N".
const UNIT_NO_RE = /lokal\w*\s+(?:(?:nie)?mieszkaln\w+|u[żz]ytkow\w+)\s+(?:nr\s+)?(\d+[A-Za-z]?)/i;
function unitNoFromText(text) {
  const m = UNIT_NO_RE.exec(text);
  return m ? m[1] : null;
}

// Garage number: "garaż nr N" — passed through to parseAddress's own
// "<street> <bldg> garaż nr <N>" convention.
function garageNoFromText(text) {
  const m = /gara[żz]\w*\s+nr\s+(\d+)/i.exec(text);
  return m ? m[1] : null;
}

/**
 * "<street> <bldg>[/<apt>]" raw address for a flat / commercial unit /
 * garage / whole house, or null. @param {string} plainText
 */
export function addressRawFromText(plainText) {
  const t = plainText || '';
  const m = PROP_ADDR_RE.exec(t);
  if (!m) return null;
  const street = foldStreet(m[1], m[2]);
  const building = m[3];
  const apt = unitNoFromText(t);
  if (apt) return `${street} ${building}/${apt}`;
  const garageNo = garageNoFromText(t);
  if (garageNo) return `${street} ${building} garaż nr ${garageNo}`;
  return `${street} ${building}`;
}

/** Land street name (context/display for a parcel-keyed record), or null. */
export function landStreetFromText(plainText) {
  const m = LAND_STREET_RE.exec(plainText || '');
  return m ? foldStreet(m[1], m[2]) : null;
}

// Parcel(s) + area for LAND records. Parcels from "nr geod. <N>[/<M>]"
// (dedup'd — a result notice often echoes the same geod. number twice).
// Area from the first "o powierzchni <N> m2" (m² — integer) or "<N> ha".
//
// Both are read from the SUBJECT STATEMENT only — the text before the first
// "cen… wywoławcz…" anchor (falling back to the full text if a notice ever
// lacks one). The subject ("…nieruchomości gruntowej … oznaczonej nr geod.
// 159/2 … o powierzchni 1935 m2 …") always precedes the price block, while
// the conditions AFTER it can reference unrelated neighbouring parcels
// (live-verified: the Kutrzeby announcement's easement clause "…murów
// oporowych bastionu Św. Sebastiana … w granicach działki … nr geod. 118…").
//
// NB the unit alternation must NOT end in `m\b`: Głogów writes "1935 m2"
// with NO space/superscript, and there is no \b between the word chars "m"
// and "2" — live-verified on the Kutrzeby dz. 159/2 result. The lookahead
// rejects a letter after the unit so "m" can't false-match inside a word.
export function landPlotFromText(plainText) {
  const whole = plainText || '';
  const priceAnchor = /cen[a-ząęó]*\s+wywo[łl]awcz/i.exec(whole);
  const t = priceAnchor ? whole.slice(0, priceAnchor.index) : whole;
  const parcels = [];
  const seen = new Set();
  const reP = /nr\s+geod\.?\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const am = /o\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*(ha|m)(?:\s*[²2])?(?![a-ząęółśżźćń])/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// -------------------------------------------------------------- lot splitting

// A per-lot section always opens with "Samodzielny/Samodzielna lokal
// (nie)mieszkalny/użytkowy nr N" (verified on the only multi-lot document
// class observed — bundled flats; land/house/garage notices never bundle
// more than one item, so they simply produce 0 markers → a single chunk).
const LOT_START_RE = /Samodzieln\w+\s+lokal\w*\s+(?:(?:nie)?mieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+\d+[A-Za-z]?/gi;

/**
 * Split a document's BODY into per-lot chunks at each lot-start marker. A
 * document with 0 or 1 markers (the common case) returns `[body]`
 * unchanged — callers never need to special-case single-lot documents.
 * @param {string} body
 * @returns {string[]}
 */
export function splitLots(body) {
  const b = body || '';
  const starts = [];
  LOT_START_RE.lastIndex = 0;
  let m;
  while ((m = LOT_START_RE.exec(b)) !== null) starts.push(m.index);
  if (starts.length < 2) return [b];
  const chunks = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : b.length;
    chunks.push(b.slice(starts[i], end));
  }
  return chunks;
}

// ------------------------------------------------------------- announcement parse

function buildAnnouncementRecord(chunk, kind, round, auction_date) {
  const starting_price_pln = startingPriceFromText(chunk);
  if (kind === 'grunt') {
    const plot = landPlotFromText(chunk);
    const address_raw = landStreetFromText(chunk);
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
  const address_raw = addressRawFromText(chunk);
  if (!address_raw) {
    // Address-less BUILT property → parcel-keyed land record; mirrors the
    // identical fallback in parseResultDoc (see the comment there — Spokojna
    // shed-plot / Witanowice village estate). 'zabudowana' only.
    if (kind === 'zabudowana') {
      const plot = landPlotFromText(chunk);
      if (plot.dzialka_nr) {
        return {
          kind: 'grunt',
          dzialka_nr: plot.dzialka_nr,
          area_m2: plot.area_m2,
          address_raw: landStreetFromText(chunk),
          starting_price_pln,
          auction_date,
          round,
        };
      }
    }
    return null;
  }
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(chunk),
    starting_price_pln,
    auction_date,
    round,
  };
}

/**
 * Parse one ANNOUNCEMENT (pending auction) blob into 0, 1, or several active
 * records — several when the attachment PDF bundles multiple lots (see
 * splitLots). Land (kind 'grunt') → parcel-keyed record(s) for land.json;
 * flats / commercial units / garages / houses → address-keyed record(s).
 * Round + auction date are shared across all lots (read from the whole
 * blob); price/area/address are per-lot (read from each chunk).
 * @param {string} text  blob from buildRecordText
 * @returns {object[]}
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const body = field(text, 'BODY') || whole(text);
  const chunks = splitLots(body);
  const out = [];
  for (const chunk of chunks) {
    const rec = buildAnnouncementRecord(chunk, kind, round, auction_date);
    if (rec) out.push(rec);
  }
  return out;
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED "Informacja o wyniku" blob (ONE attachment PDF — a
 * multi-lot RESULT article is walked as several SEPARATE attachments by
 * crawl.js, each already a complete single-lot document, so no splitting is
 * needed here) into a result record. Returns 0 or 1 record (array = framework
 * interface).
 * @param {string} text        blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl   the canonical attachment-PDF URL (provenance)
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const notes = [];
  const body = field(text, 'BODY') || whole(text);

  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const starting_price_pln = startingPriceFromText(body);
  const achieved = achievedPriceFromText(body);
  const sold = achieved != null;
  // NB: the labelled blob, NOT the plain body — isNegativeOutcome (like all
  // the doc-type gates) reads the TITLE:/BODY: labels via whole(); handing it
  // the bare body would make it see two empty fields and always return false.
  const negativeStated = isNegativeOutcome(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(body);
    const address_raw = landStreetFromText(body);
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

  const address_raw = addressRawFromText(body);
  if (!address_raw) {
    // Address-less BUILT property — real cases, both live-verified: a plot
    // "przy ulicy Spokojnej," carrying only a farm shed (street but NO
    // building number) and a village property "w Witanowicach nr 18, gmina
    // Gaworzyce" (an out-of-town estate with no Głogów street at all). These
    // cannot be address-keyed, but the achieved-price row is still real —
    // fall back to a parcel-keyed land record instead of dropping it.
    // Restricted to kind 'zabudowana': an address-less FLAT would inherit its
    // whole building's parcel, which would be wrong.
    if (kind === 'zabudowana') {
      const plot = landPlotFromText(body);
      if (plot.dzialka_nr) {
        notes.push('parse: address-less built property — parcel-keyed');
        if (starting_price_pln == null) notes.push('parse: missing starting price');
        if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
        return [
          {
            auction_date,
            source_url: sourceUrl,
            kind: 'grunt',
            dzialka_nr: plot.dzialka_nr,
            area_m2: plot.area_m2,
            address_raw: landStreetFromText(body),
            round,
            starting_price_pln,
            final_price_pln: sold ? achieved : null,
            outcome: sold ? 'sold' : 'unsold',
            unsold_reason: sold ? null : 'unknown',
            notes,
          },
        ];
      }
    }
    return [];
  }
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      // Address-keyed result records carry `source_pdf` (NOT `source_url`):
      // build-properties persists exactly that field into listings[] (which
      // both feeds core/known-urls' incremental skip AND gives the
      // result-backed row dedupe priority over the announcement row — see
      // dedupeListingsByDate). Land records above keep `source_url`, the
      // field build-land persists.
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(body),
      notes,
    },
  ];
}
