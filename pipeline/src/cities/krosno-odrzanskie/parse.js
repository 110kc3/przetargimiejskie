// Krosno Odrzańskie parsers.
//
// bip.krosnoodrzanskie.pl's /przetargi/202/ board (SYSTEMDOBIP.PL / E-LINE —
// same CMS + engine as wschowa and strzelce-krajenskie) renders each przetarg
// as ONE table row: Lp / Data ogłoszenia / Data i godzina przetargu / Dotyczy /
// Cena wywoławcza / Wynik / Załączniki. Like WSCHOWA (the closest analog) the
// "Cena wywoławcza" cell is a REAL inline number and the "Wynik" cell is
// populated ("Pozytywny"/"Negatywny"/"Brak wyniku") — so the result flow is
// Wynik-gated, not a per-row PDF probe like strzelce.
//
// TWO wrinkles wschowa does not have, both handled below:
//   (1) The auction ROUND is a Polish WORD ordinal ("pierwszy"/"drugi"/
//       "trzeci"/"czwarty" przetarg), not a Roman numeral — roundFromText().
//   (2) The flat AREA and the CANONICAL full street name are only in the
//       born-digital announcement / wynik PDF body; the board "Dotyczy" title
//       carries an ABBREVIATED address ("ul. B.Chrobrego 26/3"). So both flows
//       fetch that PDF and key on its canonical address ("Bolesława Chrobrego
//       26/3"), keeping the active-listing key === the result key.
//
// THE MISLABEL TRAP (real, groundtruthed): the wynik PDF for the Chrobrego
// 26/3 flat (auction 9/GN/2026) calls the property "lokal użytkowy nr 3"
// though the board "Dotyczy" AND the announcement PDF both say "lokal
// mieszkalny" (same 78,19 m², same address). classifyKind() on the PDF body
// alone would tag it 'uzytkowy' and DROP a real flat result. buildResultText()
// (used by crawl.js and the tests) appends the board "Dotyczy" title to the
// PDF body, so classifyKind()'s FLAT_RE (checked before COMMERCIAL_RE) matches
// the row's "lokalu mieszkalnego" and wins regardless of the PDF's mislabel.
//
// THE VENUE TRAP: every announcement/wynik PDF names the auction VENUE
// ("w siedzibie Urzędu Miasta w Krośnie Odrzańskim przy ul. Parkowej 1")
// before the property. extractFlatAddress() only trusts a "położon…przy ul."
// property clause (or a glued "przy ul. <street> <bldg>/<apt>"), never a bare
// first "ul.", and explicitly rejects the town-hall street (Parkow…) — same
// discipline wschowa uses for its "ul. Rynek 1" venue.
//
// Groundtruthed 2026-07-12 against LIVE rows/documents fetched from
// https://bip.krosnoodrzanskie.pl/przetargi/202/status/{0,1}/ (see
// tests/parse-krosno-odrzanskie.test.js for the full captured strings):
//
//   ANNOUNCEMENT flat (board row "9/GN/2026" + announcement PDF
//   I_przetarg_ustny_nieogran._na_sprzedaz_lokalu_mieszkalnego.pdf):
//     Dotyczy: "pierwszy przetarg ustny nieograniczony na sprzedaż lokalu
//       mieszkalnego wraz z udziałem w częściach wspólnych i prawie do
//       gruntu - ul. B.Chrobrego 26/3"
//     Cena wywoławcza: "220 000,00 zł"   auction date 2026-06-09
//     PDF body: "Nieruchomość położona jest w Krośnie Odrzańskim przy ul.
//       Bolesława Chrobrego 26/3 …  Powierzchnia użytkowa lokalu: 78,19 m2."
//
//   RESULT flat UNSOLD (Wynik "Negatywny", wynik PDF
//   Informacja_o_wyniku_przetargu_Chrobrego_-_negatywny.pdf — the MISLABEL doc):
//     "INFORMACJA O WYNIKU PRZETARGU … wynik przeprowadzonego w dniu 09
//      czerwca 2026 r. pierwszego ustnego przetargu … 1. Przedmiotem
//      przetargu był lokal użytkowy nr 3 o pow. użytkowej 78,19 m2, położony
//      w Krośnie Odrzańskim przy ul. Bolesława Chrobrego 26 … 2. Cena
//      wywoławcza … wynosiła 220 000,00 zł. 3. Przetarg bez rozstrzygnięcia
//      z uwagi na brak oferentów."
//
//   RESULT land SOLD (Wynik "Pozytywny", wynik PDF
//   Informacja_o_wyniku_przetargu_307.pdf — used to groundtruth the
//   achieved-price regex on real "cena osiągnięta … wyniosła X zł" phrasing;
//   the record itself is 'grunt' → correctly excluded by the flats-only gate):
//     "Cena wywoławcza … wynosiła 47 000,00 zł. Najwyższa cena osiągnięta w
//      przetargu wyniosła 47 470,00 zł netto + 23% VAT tj. 58 388,10 zł
//      brutto. Nabywcą nieruchomości gruntowej została spółka Recykl …"
//
// SCOPE NOTE: no POSITIVE (sold) flat result exists in the live archive yet —
// every flat auction observed (2024–2026: Chrobrego 26/3, Chrobrego 8/2,
// 3 Maja 10 Świebodzin) closed "Negatywny"/"brak oferentów" (matches the
// spike's "keeps failing to sell" reading). The sold-flat path (final price +
// outcome 'sold') is therefore exercised by unit-testing achievedPriceFromText
// against the real LAND wynik doc's phrasing, not a fabricated flat document.
//
// PRICE FORMATTING is space-thousands throughout ("220 000,00", "47 000,00",
// "51 200,00") with or without a "Cena wywoławcza" label; parsePLN()/the money
// regexes tolerate dot-thousands too, for forward-compatibility with the
// dot-grouped amounts seen on the sibling Lubuskie boards.
//
// See spike: spikes/lubuskie/powiat-krosnienski/krosno-odrzanskie.md

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money ────────────────────────────────────────────────────────────────────

// Dot OR space (regular + NBSP) thousands groups, optional ",NN" grosze tail.
// The separator is OPTIONAL between groups so a fully-unseparated amount of the
// same magnitude ("150000,00") is also accepted. Matches "220 000,00",
// "47 470,00", "70.343,00", "10000".
const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\d{1,2})?';

/** "220 000,00" / "70.343,00" / "10000" -> integer PLN, or null. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s ]/g, '').replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Labeled "Cena wywoławcza[ nieruchomości]: 220 000,00 zł" — number ADJACENT to
// the label (stops the "przedmiotowej nieruchomości do trzeciego … wynosiła"
// prose form in a wynik PDF from matching; buildResultText appends the clean
// board "Cena wywoławcza: <value>" so this still fires on the composed text).
const LABELED_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcz\\w*(?:\\s+nieruchomo\\w+)?\\s*:?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
// Bare cell, no label ("220 000,00 zł") — used for the board's own Cena cell.
const BARE_PRICE_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'i');

/** Starting price ("cena wywoławcza") from a document/row/cell text. */
export function startingPriceFromText(text) {
  const t = text || '';
  const m = LABELED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const b = BARE_PRICE_RE.exec(t);
  return b ? parsePLN(b[1]) : null;
}

// Achieved price: "Najwyższa cena osiągnięta w przetargu wyniosła 47 470,00 zł"
// (the real land-wynik phrasing — filler "wyniosła"/"wynosi"/"to"/colon/dash
// between "przetargu" and the number), first (net) figure wins.
const ACHIEVED_PRICE_RE = new RegExp(
  `cena\\s+osi[ąa]gni[ęe]t\\w*(?:\\s+w\\s+przetargu)?\\s*(?:wynios[łl]\\w*|wynosi\\w*|to|[:\\-–])?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
/** Achieved price ("cena osiągnięta"), or null (unstated / unsold). */
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── Area (flats) ─────────────────────────────────────────────────────────────

// "Powierzchnia użytkowa lokalu: 78,19 m2" (announcement) / "o pow. użytkowej
// 78,19 m2" (wynik) / "o powierzchni użytkowej 27,98 m2". "użytkow" is REQUIRED
// so an incidental "o łącznej powierzchni 24,14 m2" (the flat's cellar) or a
// plot "o powierzchni 0,1071 ha" never wins.
const FLAT_AREA_RE = /pow(?:ierzchni\w*)?\.?\s*u[żz]ytkow\w*(?:\s+lokalu)?\s*:?\s*(\d+(?:[.,]\d+)?)\s*m/i;
/** Usable floor area (m2) of a flat, or null. */
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Round (Polish WORD ordinal: "pierwszy … przetarg") ──────────────────────

// Ordinal stem (declension-tolerant) immediately qualifying "przetarg", with up
// to a few "ustny/nieograniczony/ograniczony" filler words in between:
//   "pierwszy przetarg ustny", "czwarty przetarg", "pierwszego ustnego
//   przetargu", "do trzeciego ustnego przetargu".
const ROUND_RE =
  /\b(pierwsz|drug|trzec|czwart|pi[ąa]t|sz[oó]st|si[oó]dm|[oó]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:(?:ustn\w+|nieograniczon\w+|ograniczon\w+)\s+){0,3}przetarg/iu;
const ROUND_NUM = {
  pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5, piąt: 5,
  szost: 6, szóst: 6, siodm: 7, siódm: 7, osm: 8, ósm: 8,
  dziewiat: 9, dziewiąt: 9, dziesiat: 10, dziesiąt: 10,
};
/**
 * Round from a Polish word-ordinal directly qualifying "przetarg[u]".
 * Deliberately anchored on "<ordinal> … przetarg" so it never false-matches an
 * ordinal elsewhere in the prose.
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  if (!m) return null;
  const stem = m[1].toLowerCase();
  return ROUND_NUM[stem] ?? null;
}

// ── Address (flats only) ─────────────────────────────────────────────────────

// Apartment number from an explicit "lokal(u) mieszkaln…/użytkow…/niemieszkaln…
// nr N" (the kind word is accepted regardless — the board already decided this
// is a flat; here we only want the apt number, and the wynik doc mislabels the
// kind word — see file header).
const LOKAL_NR_RE = /lokal\w*\s+(?:mieszkaln\w*|u[żz]ytkow\w*|niemieszkaln\w*)\s+nr\.?\s*(\d+[A-Za-z]?)/i;

// Glued PROPERTY address: "przy ul. Bolesława Chrobrego 26/3" (announcement PDF)
// — anchored on "przy ul." so the venue ("przy ul. Parkowej 1", no /apt) can't
// win, and requires the "/apt" so a bare "przy ul. <street> <bldg>" venue is
// skipped too. The street class excludes DIGITS so the capture stops at the
// building number and can never run forward across a bare building into a later
// slash-pair — the fractional gruntu share ("245/1000") or the parcel
// ("dz. nr 1142/7") that follows a wynik's bare "…Chrobrego 26 z równoczesna…".
const GLUED_PROPERTY_RE =
  /przy\s+ul\.\s*([^\d,;]+?)\s+(\d{1,4}[A-Za-z]?)\s*\/\s*(\d{1,4}[A-Za-z]?)\b/iu;
// Non-glued PROPERTY street+building inside a "położon…przy ul." clause (the
// wynik-PDF form: "… położony w Krośnie Odrzańskim przy ul. Bolesława Chrobrego
// 26 …"); apt comes from LOKAL_NR_RE. `[^.]*?` keeps the anchor and the street
// in the same sentence, so an earlier venue "Ul. Parkowa 1" (own sentence) is
// never reached.
const PROPERTY_CLAUSE_RE =
  /po[łl]o[żz]on\w*[^.]*?przy\s+ul\.\s*([^,;]+?)\s+(\d{1,4}[A-Za-z]?)\b/iu;
// Bare glued "ul. <street> <bldg>/<apt>" ANYWHERE — last-resort for a board-row
// derived record (the abbreviated "ul. B.Chrobrego 26/3" Dotyczy title), only
// reached when no PDF body was available.
const BARE_GLUED_RE = /\bul\.\s*([^,;]+?)\s+(\d{1,4}[A-Za-z]?)\s*\/\s*(\d{1,4}[A-Za-z]?)\b/iu;

// The Urząd seat street — an address matching this is the auction venue, never
// the property (belt-and-suspenders on top of the "położon…przy" anchoring).
const VENUE_STREET_RE = /park/i;

/**
 * Extract a raw "<street> <building>/<apt>" address for a FLAT. Prefers the
 * canonical PDF-body forms (glued "przy ul. …/…", then "położon…przy ul. …" +
 * "lokal … nr N"), so the active-listing key === the result key; only falls
 * back to a bare glued board-title address when no PDF body is present.
 * Returns null when nothing safe resolves (record dropped, never guessed).
 * @param {string} text
 * @returns {string|null}
 */
export function extractFlatAddress(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // (1) glued property form (announcement PDF).
  let m = GLUED_PROPERTY_RE.exec(t);
  if (m && !VENUE_STREET_RE.test(m[1])) {
    return `${m[1].trim()} ${m[2].toUpperCase()}/${m[3].toUpperCase()}`;
  }
  // (2) non-glued property clause + separate lokal-nr apt (wynik PDF).
  const streetM = PROPERTY_CLAUSE_RE.exec(t);
  const lokalM = LOKAL_NR_RE.exec(t);
  if (streetM && lokalM && !VENUE_STREET_RE.test(streetM[1])) {
    return `${streetM[1].trim()} ${streetM[2].toUpperCase()}/${lokalM[1]}`;
  }
  // (3) bare glued board-title fallback (abbreviated "ul. B.Chrobrego 26/3").
  m = BARE_GLUED_RE.exec(t);
  if (m && !VENUE_STREET_RE.test(m[1])) {
    return `${m[1].trim()} ${m[2].toUpperCase()}/${m[3].toUpperCase()}`;
  }
  return null;
}

// ── Row / document gating ────────────────────────────────────────────────────

/** True for a LEASE row (najem/dzierżawa/czynsz) — never a municipal SALE. */
export function isLeaseRow(text) {
  return /najem|dzier[żz]aw|czynsz/i.test(text || '');
}

/** True when text reads as a flat-SALE (not lease, kind === 'mieszkalny'). */
export function isFlatSaleRow(text) {
  if (isLeaseRow(text)) return false;
  return classifyKind(text) === 'mieszkalny';
}

/** "2026-06-09 10:30:00" -> "2026-06-09". @param {string|null} s */
export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

// ── Outcome ──────────────────────────────────────────────────────────────────

// Krosno's real negative phrasing is "Przetarg bez rozstrzygnięcia z uwagi na
// brak oferentów" (NOT the "wynikiem negatywnym" template the siblings use —
// that + "nie odnotowano/wpłacono wadium" are matched too, defensively).
const NEGATIVE_RE =
  /wynikiem\s+negatywn|bez\s+rozstrzygni[ęe]|brak\s+oferent|nie\s+odnotowano\s+wp[łl]at|brak\s+wp[łl]at\w*\s+wadium|nie\s+wp[łl]acono\s+wadium/i;
/** True when the text states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

/**
 * Guard: does this text carry a result signal at all (used by crawl.js to
 * decide whether pdftotext output is usable before an OCR fallback)?
 * @param {string} text
 * @returns {boolean}
 */
export function isResultNotice(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynik\s+przeprowadzonego/i.test(t) ||
    isNegativeOutcome(t) ||
    achievedPriceFromText(t) != null ||
    /nabywc/i.test(t)
  );
}

// ── Composed result text (kind-anchor + clean price) ────────────────────────

/**
 * Build the text handed to parseResultDoc(). Order is load-bearing:
 *   [PDF body] — canonical address ("położon…przy ul. …") + area + outcome;
 *   [board Dotyczy] — the AUTHORITATIVE kind anchor ("lokalu mieszkalnego"),
 *      so classifyKind()'s FLAT_RE beats a mislabeled PDF ("lokal użytkowy");
 *   ["Cena wywoławcza: <cell>"] — the clean board starting price.
 * refresh.js forwards this as `ref.text` straight to parseResultDoc() (the
 * adapter is source:'html'), so everything the parser needs is embedded here.
 * @param {string} dotyczyText  board "Dotyczy" title
 * @param {string} cenaText     board "Cena wywoławcza" cell
 * @param {string} pdfBody      wynik-PDF text ('' when none was fetched)
 * @returns {string}
 */
export function buildResultText(dotyczyText, cenaText, pdfBody) {
  return [pdfBody || '', dotyczyText || '', cenaText ? `Cena wywoławcza: ${cenaText}` : '']
    .filter(Boolean)
    .join('\n');
}

/**
 * Build the composed text for a NEGATIVE row that has NO wynik attachment
 * (rare — every observed negative flat DID have one). Adds an explicit
 * negative sentence so isNegativeOutcome() fires without a document.
 * @param {{dotyczyText:string, cenaText:string}} row
 * @returns {string}
 */
export function buildNegativeResultText(row) {
  return `${buildResultText(row.dotyczyText, row.cenaText, '')}\nPrzetarg zakończył się wynikiem negatywnym.`;
}

// ── Announcement (crawlActive → listing) ────────────────────────────────────

/**
 * @typedef {object} BoardRow
 * @property {string|null} detailUrl
 * @property {string} dotyczyText     "Dotyczy" cell prose (title/description)
 * @property {string} cenaText        "Cena wywoławcza" cell (real inline price)
 * @property {string} wynikText       "Wynik" cell ("Pozytywny"/"Negatywny"/"Brak wyniku")
 * @property {string|null} announcedDate
 * @property {string|null} auctionDateRaw
 * @property {Array<{url:string, filename:string}>} attachments
 */

/**
 * Build an active FLAT listing from a status=0 board row + (usually) its
 * fetched announcement-PDF body. Address + area come from the PDF (canonical,
 * so the key matches the result key); starting price + round + auction date
 * come from the board row (cleanest / authoritative), with a PDF fallback.
 * Returns null for a non-flat row or an address we can't safely key.
 * @param {BoardRow} row
 * @param {string|null} pdfBody
 * @param {string|null} pdfUrl
 * @returns {object|null}
 */
export function parseAnnouncement(row, pdfBody, pdfUrl) {
  const body = pdfBody || '';
  const title = (row && row.dotyczyText) || '';
  if (isLeaseRow(title)) return null;
  if (classifyKind(body || title) !== 'mieszkalny') return null;

  const address_raw = extractFlatAddress(body) || extractFlatAddress(title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const notes = [];
  if (address.warning) notes.push(address.warning);

  let starting_price_pln = startingPriceFromText((row && row.cenaText) || '');
  if (starting_price_pln == null) starting_price_pln = startingPriceFromText(body);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: flatAreaFromText(body),
    starting_price_pln,
    auction_date: dateOnly(row && row.auctionDateRaw),
    round: roundFromText(title) ?? roundFromText(body),
    detail_url: (row && row.detailUrl) || null,
    source_url: pdfUrl || null,
    notes,
  };
}

// ── Result (crawlResultDocs → parseResultDoc) ───────────────────────────────

/**
 * Parse a composed result text (see buildResultText) into a concluded FLAT
 * record. Flats only: classifyKind() runs on the composed text whose board
 * "Dotyczy" anchor makes FLAT_RE win over a mislabeled PDF body; anything that
 * still classifies non-mieszkalny (e.g. a land wynik doc) returns [].
 *
 * Outcome: negative when isNegativeOutcome() fires; sold when an achieved price
 * is present and it isn't negative. A positive-but-priceless or
 * outcome-less doc returns [] (no fabricated result).
 *
 * @param {string} text        composed result text (ref.text)
 * @param {string|null} [fallbackDate]  ISO auction date from the board row
 * @param {string|null} [sourceUrl]     wynik attachment URL (provenance)
 * @returns {Array<object>}  0 or 1 record
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];
  if (!isResultNotice(t)) return [];

  const negative = isNegativeOutcome(t);
  const achieved = achievedPriceFromText(t);
  const sold = !negative && achieved != null;
  if (!sold && !negative) return []; // no determinable outcome

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);
  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [
    {
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: flatAreaFromText(t),
      notes,
    },
  ];
}
