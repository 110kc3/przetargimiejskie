// Dzierżoniów parsers.
//
// Burmistrz Dzierżoniowa sells municipal flats (lokale mieszkalne) at "ustny
// przetarg nieograniczony na sprzedaż" via the city BIP (Madkom SIP, a React
// SPA over a plain JSON HTTP API — see config.js / crawl.js). Two streams,
// both born-digital text PDFs extracted with core's pdfText() (pdftotext
// -layout):
//
//   ANNOUNCEMENT (active listing) — one "Ogłoszenie nr N/PN/YYYY" PDF per flat
//     on the "Lokale mieszkalne" board (menu 1838). Prose subject + a ONE-ROW
//     price table:
//       Nr | Pow.lokalu [m2] | Wartość lokalu [zł] | Udział [%] |
//       Wartość udziału w gruncie [zł] | CENA WYWOŁAWCZA nieruchomości [zł] |
//       Wadium [zł]
//     e.g.  "17   31,74   112 879,00   3,96   2 121,00   115 000,00   11 500,00"
//     The data row is the line carrying the MOST comma-decimal tokens; on it
//     area = tokens[0] (Pow.), starting_price = tokens[-2] (Cena wywoławcza),
//     wadium = tokens[-1]. Auction date: "Termin przetargu - <D.M.YYYY> r.".
//     Round: Dzierżoniów states no ordinal — it lists the prior rounds
//     ("Poprzedni(e) przetarg(i) odbył(y) się <date>, <date>, …"); round =
//     (# of those dates) + 1, or 1 when the clause is absent. The flat ADDRESS
//     is taken from the article TITLE (the PDF prose abbreviates given names —
//     "I. Krasickiego" — while both the title and the RESULT PDFs spell them in
//     full — "Ignacego Krasickiego"; keying off the title keeps the
//     announcement's key identical to its results').
//
//   RESULT (achieved price) — one "Informacja o rozstrzygnięciu przetargów"
//     PDF per auction DAY on the "Wyniki przetargów" board (menu 63, archived
//     tab). A NUMBERED LIST of every property auctioned that day (flats, land
//     AND commercial mixed); each item:
//       "N. Lokalu mieszkalnego nr M o pow. [użytkowej] X,XX m2, położonego …
//        budynku przy ul. <STREET> <BLDG> w Dzierżoniowie, … Cena wywoławcza
//        nieruchomości [netto] <START> zł, w tym wartość udziału w działce
//        gruntu <SUB> zł. <OUTCOME>"
//     SOLD:   "… Uzyskana cena ze sprzedaży nieruchomości [netto][:] <FINAL>
//              zł, …, nabywca <Name>."  (also the land phrasing "Cena
//              sprzedaży <FINAL> zł. … Nabywca – <Name>.")
//     UNSOLD: "Przetarg zakończył się wynikiem negatywnym z uwagi na brak
//              oferentów." / "… nie odnotowano wpłaty wadium".
//     splitResultItems() splits the numbered list (validating that item
//     numbers run 1,2,3,… so a mid-sentence "8." can never open a false item);
//     only lokale mieszkalne are kept (this repo is a flat scraper).
//
// GIVEN-NAME NORMALISATION (property identity): the source spells patron-street
// given names inconsistently across documents — "Mikołaja Kopernika" vs
// "M. Kopernika", "Jana Kilińskiego" vs "J. Kilińskiego". stripGivenName()
// reduces both to the bare surname ("Kopernika", "Kilińskiego") so the same
// flat gets ONE stable address key everywhere. It strips a leading single
// initial ("X.") generally, plus a curated set of full Polish given names seen
// in the data; single-word streets are never touched.
//
// Real fixtures groundtruthing every regex below (fetched live 2026-07-21 via
// bip.um.dzierzoniow.pl's JSON API + attachment PDFs — see
// tests/parse-dzierzoniow.test.js for the captured text):
//   ANNOUNCE (round IV): Krasickiego 47/17, 115 000 zł, 31,74 m²,
//     termin 9.09.2026 (3 prior rounds listed).
//   RESULT 2025-11-26: Kopernika 27/2 SOLD 149 480 zł (start 149 000);
//     Krasickiego 47/17 UNSOLD; Mostowa 8/5 UNSOLD.
//   RESULT 2025-11-19: Nowowiejska 6/7 SOLD 79 790 zł; Nowowiejska 164/2
//     UNSOLD; Pocztowa 11a/1 SOLD 89 890 zł; Spacerowa 15/2 UNSOLD.
//   RESULT 2025-05-14: Świdnicka 38/5 lokal UŻYTKOWY (skipped); Ząbkowicka
//     60a/3 SOLD 69 690 zł ("nieruchomości : " space-colon phrasing);
//     Garncarska 11/5 UNSOLD (area from "łączna powierzchnia lokalu 31,09 m2").

import { parseAddress } from '../../core/normalize.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "149 480,00" / "62 000,00" -> integer PLN. Dzierżoniów writes spaced
// thousands and a ",00" grosze tail; strip spaces/dots and the tail.
export function parsePLN(numStr) {
  if (numStr == null) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "31,74" / "1146" -> number. Comma OR dot decimal; spaces stripped.
export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeWs(s) {
  return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
}

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ doc gates

/** True when the text describes a flat (lokal mieszkalny) somewhere. */
export function isFlat(text) {
  return /lokal\w*\s+mieszkaln/i.test(text || '');
}

// ------------------------------------------------------------------ address

// Leading given-name tokens to fold away so patron streets key on the surname
// alone (see header). A lone initial "X." is stripped generically; the curated
// full names cover every patron street observed in Dzierżoniów's flat stock.
const GIVEN_NAMES = [
  'Mikołaja', 'Ignacego', 'Jana', 'Marii', 'Adama', 'Józefa', 'Wincentego',
  'Stanisława', 'Tadeusza', 'Henryka', 'Bolesława', 'Władysława', 'Fryderyka',
  'Romualda', 'Juliusza', 'Wojciecha', 'Piotra', 'Pawła', 'Kazimierza',
  'Aleksandra', 'Zygmunta', 'Michała', 'Andrzeja',
];
const GIVEN_NAME_RE = new RegExp(
  `^(?:[A-ZĄĆĘŁŃÓŚŻŹ]\\.\\s+|(?:${GIVEN_NAMES.join('|')})\\s+)`,
  'i',
);

/** Fold a leading given-name token off a patron street ("M. Kopernika" /
 *  "Mikołaja Kopernika" -> "Kopernika"). Single-word streets are untouched. */
export function stripGivenName(street) {
  const s = normalizeWs(street);
  if (!/\s/.test(s)) return s; // single word — nothing to strip
  return s.replace(GIVEN_NAME_RE, '').trim();
}

const FLAT_NO_RE = /lokal\w*\s+mieszkaln\w+\s+nr\s+(\d+[a-z]?)/i;
// Three address designators, all terminated by "<BLDG> w Dzierżoniowie":
//   ul. / ulicy <street> <bldg>     — the common case (given name folded off)
//   na os. / osiedlu <name> <bldg>  — estate flats ("na os. Błękitnym 13b")
//   Rynek / Rynku <bldg>            — the market square (Rynek IS the street)
// `[^\w\s]?` after the building tolerates a stray punctuation artifact between
// the number and " w Dzierżoniowie" (live-verified: "Garncarskiej 11` w …").
const ADDR_UL_RE = /przy\s+ul(?:\.|icy)?\s+(.+?)\s+(\d+[a-z]?)[^\w\s]?\s+w\s+Dzier[żz]oniowie/i;
const ADDR_OS_RE = /\bos(?:\.|iedl\w*)\s+(.+?)\s+(\d+[a-z]?)[^\w\s]?\s+w\s+Dzier[żz]oniowie/i;
const ADDR_RYNEK_RE = /\bRyn(?:ek|ku)\s+(\d+[a-z]?)[^\w\s]?\s+w\s+Dzier[żz]oniowie/i;

/**
 * Extract "<street> <bldg>[/<flat>]" from a flat announcement TITLE or a result
 * item's prose. Handles ul./osiedle/Rynek addressing; for ul. streets a leading
 * given name is folded to the surname (see header) so the same flat keys
 * identically across both streams. @returns {string|null}
 */
export function extractFlatAddressRaw(text) {
  const t = normalizeWs(text);
  let street = null;
  let building = null;
  let m = ADDR_UL_RE.exec(t);
  if (m) { street = stripGivenName(m[1]); building = m[2]; }
  if (!street) {
    m = ADDR_OS_RE.exec(t);
    if (m) { street = `os. ${normalizeWs(m[1])}`; building = m[2]; }
  }
  if (!street) {
    m = ADDR_RYNEK_RE.exec(t);
    if (m) { street = 'Rynek'; building = m[1]; }
  }
  if (!street || !building) return null;
  const fm = FLAT_NO_RE.exec(t);
  return fm ? `${street} ${building}/${fm[1]}` : `${street} ${building}`;
}

// ------------------------------------------------------------- title date

/** Auction date from a result article TITLE ("… z dnia 14 stycznia 2026").
 *  The title is authoritative — one result body carried a typo year in its
 *  own "w dniu …" clause. @returns {string|null} ISO date */
export function titleAuctionDate(title) {
  const m = /z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(title || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? toIso(m[1], mo, m[3]) : null;
}

// ------------------------------------------------------ announcement fields

// A comma-decimal amount token, spaced thousands allowed: "31,74",
// "112 879,00", "115 000,00".
const AMOUNT_G = /\d{1,3}(?:[ \u00a0]\d{3})*,\d{2}/g;

/**
 * The price-table data row of a flat announcement: area (Pow.lokalu),
 * starting price (Cena wywoławcza — 2nd-to-last amount) and wadium (last).
 * The row is the single line carrying the most comma-decimal tokens (>=4);
 * every prose line has at most one or two. @returns {{area_m2, starting_price_pln, wadium}|null}
 */
export function announcementTableRow(pdfTextRaw) {
  let best = null;
  let bestCount = 0;
  for (const line of String(pdfTextRaw || '').split('\n')) {
    const nums = line.match(AMOUNT_G) || [];
    if (nums.length > bestCount) { bestCount = nums.length; best = nums; }
  }
  if (!best || best.length < 4) return null;
  return {
    area_m2: parseNum(best[0]),
    starting_price_pln: parsePLN(best[best.length - 2]),
    wadium: parsePLN(best[best.length - 1]),
  };
}

/** Auction date from "Termin przetargu - <D.M.YYYY> r." @returns {string|null} */
export function announcementTermin(pdfTextRaw) {
  const t = normalizeWs(pdfTextRaw);
  const m = /Termin\s+przetargu\s*[-:]?\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  return m ? toIso(m[1], m[2], m[3]) : null;
}

/** Round from the prior-rounds clause: (# of "Poprzedni…" dates) + 1, else 1. */
export function announcementRound(pdfTextRaw) {
  const t = normalizeWs(pdfTextRaw);
  const anchor = /Poprzedni\w*/i.exec(t);
  if (!anchor) return 1;
  // The date list is immediately after the anchor; the boilerplate that
  // follows ("W 6-tygodniowym …" / "W miejscowym …") carries no DD.MM.YYYY, so
  // a bounded window counts exactly the prior-round dates.
  const window = t.slice(anchor.index, anchor.index + 320);
  const dates = window.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [];
  return dates.length ? dates.length + 1 : 1;
}

/**
 * Parse ONE flat announcement into an active-listing record, or null.
 * @param {string} pdfTextRaw   pdftotext -layout of the "Ogłoszenie …" PDF
 * @param {string} titleAddress the flat article's TITLE (address source)
 * @param {string} detailUrl    the article's BIP page URL (provenance)
 */
export function parseAnnouncement(pdfTextRaw, titleAddress, detailUrl) {
  const addrRaw = extractFlatAddressRaw(titleAddress);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;
  const row = announcementTableRow(pdfTextRaw) || {};
  return {
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    area_m2: row.area_m2 ?? null,
    starting_price_pln: row.starting_price_pln ?? null,
    auction_date: announcementTermin(pdfTextRaw),
    round: announcementRound(pdfTextRaw),
    detail_url: detailUrl,
    wadium_deadline: null,
  };
}

// ---------------------------------------------------------------- result items

// A top-level property item opens with the property noun + "nr" — works for
// BOTH result layouts (numbered "1. Lokalu mieszkalnego nr …" and the
// unnumbered-paragraph form). CASE-SENSITIVE by design: an item head is always
// capitalised ("Lokalu…", "Działki…", "Garażu…"), while the SAME nouns recur
// mid-item only in lowercase — "części działki nr 636/49" (a ground-share
// clause, some notices drop "gruntu"), "przynależnym do lokalu". Requiring the
// capital initial means those mid-item mentions can never open a false item
// and split a flat off from its own price/outcome.
const ITEM_OPEN_RE =
  /Lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+)\s+nr|Dzia[łl]ki\s+nr|Gara[żz]\w*\s+nr/g;

/**
 * Split a "Informacja o rozstrzygnięciu przetargów" PDF into its property items
 * (all kinds — flats, land, commercial, garages). @param {string} pdfTextRaw
 * @returns {string[]} raw item chunks
 */
export function splitResultItems(pdfTextRaw) {
  const text = String(pdfTextRaw || '');
  const starts = [];
  ITEM_OPEN_RE.lastIndex = 0;
  let m;
  while ((m = ITEM_OPEN_RE.exec(text)) !== null) starts.push(m.index);
  const chunks = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    chunks.push(text.slice(starts[i], end));
  }
  return chunks;
}

// Starting price: "Cena wywoławcza nieruchomości [netto] <AMOUNT> zł" — the
// FIRST amount after the "nieruchomości" anchor (the "w tym wartość udziału w
// działce gruntu …" sub-amount comes later and is ignored).
const RES_START_RE =
  /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*(?:netto)?\s*:?\s*(\d[\d\s ]*,\d{2})\s*z[łl]/i;
// Achieved price (SOLD): "Uzyskana cena ze sprzedaży nieruchomości [netto][:]
// <AMOUNT> zł" or the land phrasing "Cena sprzedaży <AMOUNT> zł".
const RES_FINAL_RE =
  /uzyskan\w*\s+cen\w*\s+ze\s+sprzeda[żz]y\s+nieruchomo[śs]ci\s*(?:netto)?\s*:?\s*(\d[\d\s ]*,\d{2})\s*z[łl]/i;
const RES_FINAL_ALT_RE = /cen\w*\s+sprzeda[żz]y\s*:?\s*(\d[\d\s ]*,\d{2})\s*z[łl]/i;
// Flat area: prefer "łączna powierzchnia lokalu <X>" (the combined figure the
// announcement table also uses), else the unit's own "… nr M o pow.
// [użytkowej] <X> m2" (anchored on the lokal so the działka-gruntu area later
// in the item never wins).
const RES_AREA_LACZNA_RE = /[łl][ąa]czn\w*\s+powierzchni\w*\s+lokalu\s+(\d+(?:[.,]\d+)?)\s*m/i;
const RES_AREA_RE =
  /lokal\w*\s+mieszkaln\w+\s+nr\s+\d+[a-z]?\s+o\s+pow\.?\s+(?:u[żz]ytkowej\s+)?(\d+(?:[.,]\d+)?)\s*m/i;
const RES_NEGATIVE_RE =
  /wynikiem\s+negatywnym|brak\s+oferent[óo]w|nie\s+odnotowano\s+wp[łl]aty\s+wadium|nikt\s+nie\s+przyst[ąa]pi/i;

/** Map an unsold item's phrasing to the repo's unsold_reason vocabulary. */
function unsoldReason(itemNorm) {
  if (/brak\s+oferent[óo]w|nikt\s+nie\s+przyst[ąa]pi/i.test(itemNorm)) return 'no_participants';
  if (/nie\s+odnotowano\s+wp[łl]aty\s+wadium/i.test(itemNorm)) return 'no_wadium';
  return 'unknown';
}

function resultItemArea(itemNorm) {
  const l = RES_AREA_LACZNA_RE.exec(itemNorm);
  if (l) return parseNum(l[1]);
  const m = RES_AREA_RE.exec(itemNorm);
  return m ? parseNum(m[1]) : null;
}

/**
 * Parse ONE result item (already known to be a flat) into a result record, or
 * null when it has no usable address. @param {string} itemChunk raw item text
 * @param {string|null} auction_date @param {string} sourceUrl
 */
export function parseResultItem(itemChunk, auction_date, sourceUrl) {
  const item = normalizeWs(itemChunk);
  const addrRaw = extractFlatAddressRaw(item);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;

  const starting_price_pln = (() => {
    const m = RES_START_RE.exec(item);
    return m ? parsePLN(m[1]) : null;
  })();
  let final_price_pln = null;
  const fm = RES_FINAL_RE.exec(item) || RES_FINAL_ALT_RE.exec(item);
  if (fm) final_price_pln = parsePLN(fm[1]);
  const soldNamed = /nabywc\w*/i.test(item);
  const sold = final_price_pln != null && soldNamed;
  const negativeStated = RES_NEGATIVE_RE.test(item);

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && final_price_pln == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return {
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    round: null, // never stated per-item; build-properties derives it from history
    starting_price_pln,
    final_price_pln: sold ? final_price_pln : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : unsoldReason(item),
    area_m2: resultItemArea(item),
    notes,
  };
}

/**
 * Framework entry point: parse one day's "Informacja o rozstrzygnięciu
 * przetargów" PDF into result records — one per FLAT item (land / commercial
 * items on the same PDF are skipped). @param {string} text pdftotext of the PDF
 * @param {string|null} fallbackDate ISO auction date (from the article title)
 * @param {string} sourceUrl the PDF download URL @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const out = [];
  for (const chunk of splitResultItems(text)) {
    if (!isFlat(chunk)) continue; // land / lokal użytkowy — out of scope
    const rec = parseResultItem(chunk, fallbackDate || null, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}
