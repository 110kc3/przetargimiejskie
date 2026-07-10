// Międzyrzecz parsers.
//
// Międzyrzecz's /przetargi/ board (bip.miedzyrzecz.pl, Wrota Lubuskie eBIP —
// same CMS + engine as gorzow-wielkopolski) is richer than Gorzów's: each list
// row is ONE typed table with columns Lp / Data ogłoszenia / Data i godzina
// przetargu / Dotyczy / Cena wywoławcza / Wynik / Załączniki. So — unlike
// Gorzów, which needs a batch-PDF table parse per announcement — the address,
// area, starting price, auction date and outcome are ALREADY inline as plain
// text on every row; only the ACHIEVED price (for a Pozytywny/sold row) needs
// a document fetch (the "informacja o wyniku przetargu" attachment).
//
// Groundtruthed 2026-07-10 against live rows fetched from
// https://bip.miedzyrzecz.pl/przetargi/0/status/{0,1}/ and two real result
// documents:
//
//   Kursko 28a/1 (WGM.6840.31.2016, born-digital DOCX — pierwszy przetarg):
//     https://bip.miedzyrzecz.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargu.docx&id=9b49f5e78d06b9430e31361d95f26462
//     "Lokal mieszkalny nr 1 o położony w budynku nr 28A w Kursku, obręb
//     geodezyjny 0008 Kursko o pow. 66,86 m2 ... Cena wywoławcza: 76.000,00 zł
//     ... Cena osiągnięta w przetargu: 76.800,00 zł ... zakończył się wynikiem
//     pozytywnym."
//   Mieszka I 88/5 (WGM.6840.11.2025, SCANNED PDF — OCR'd via core/ocr-pdf.js):
//     https://bip.miedzyrzecz.pl/system/pobierz.php?plik=INFORMACJA_O_WYNIKU_PRZETARGU_-_MIESZKA_I_88.B.5.pdf&id=fa3c2ed0ee6d637ae66edf47526a4b15
//     "Lokal mieszkalny nr 5 położony przy ul. Mieszka I 88B w Międzyrzeczu ...
//     Cena wywoławcza: 115.000,00 zł, Cena osiągnięta w przetargu: 116.150,00
//     zł ... zakończył wynikiem pozytywnym." (NOTE: the achieved price is
//     116 150 zł, ABOVE the 115 000 zł starting price — the spike's "115 000
//     zł" cited the starting price; OCR gives the real achieved figure.)
//
// Both documents share ONE template (numbered sections, "Cena wywoławcza: X
// zł," / "Cena osiągnięta w przetargu: X zł" labels, "Przetarg ... zakończył
// się wynikiem pozytywnym/negatywnym.") regardless of era or born-digital vs
// scanned — so one field-label-anchored parser (not Gorzów's positional zip)
// handles both, and also handles the terser list-row text used for rows that
// don't need a document fetch (see "no-fetch negative path" below).
//
// ADDRESS is the hard part: Międzyrzecz prose names the flat number, entrance
// ("klatka"), and building SEPARATELY rather than gluing them into one
// "Street NN/apt" token like Gorzów's table did. extractLokalAddress() below
// tries, in order: (1) explicit "ul. Street NN[letter]"; (2) "budynku [nr] NN"
// + the nearest capitalized place name in "w/we <Place>" (handles rural
// hamlets: "położonego w Kęszycy Leśnej w klatce C budynku nr 74"); (3) a bare
// "Miejscowość NN" adjacency (no "ul.", no "budynku nr" — "Jagielnik 25/4").
// The place name from (2) is often LOCATIVE case as written ("Kursku",
// "Kęszycy Leśnej") — the SAME physical flat's notices are not even
// internally consistent about this across auction rounds (some write
// "położonego w Kęszycy Leśnej ...", others "położonego w m. Kęszyca Leśna
// ..."), so two narrow, targeted fixes bring both forms to the same key
// (never a full Polish-declension solver — that's out of scope, same
// tradeoff normalize.js documents for genitive street names): a word-level
// suffix swap (nominativePlace: "-ej"→"-a", "-cy"→"-ca", covering the
// adjective+"-ca noun" pattern actually observed) and, only for a
// SINGLE-WORD candidate that swap doesn't touch, a fallback to the "obręb
// geodezyjny NNNN <Nominative>" spelling when it shares a 4-char prefix
// (fixes "Kursku"→"Kursko"). Known residual: a masculine noun's "-u" locative
// ("Jagielniku") is deliberately NOT stripped — that ending is far too common
// in genuinely-nominative Polish place names to swap blindly — so that one
// round keys as "jagielniku" instead of "jagielnik" (see adapter build notes).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money + area ─────────────────────────────────────────────────────────────

// "877.230,00" / "76.000,00" / "1 500 000,00" -> integer PLN. Dot OR space
// thousands separator, optional ",NN" grosze tail (Międzyrzecz always prints
// grosze, but the parser doesn't require it).
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseAreaNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "o pow. użytkowej 51,99 m²" (list row) / "o pow. 66,86 m2" (wynik doc).
const AREA_RE = /o\s+pow(?:ierzchni)?\.?\s*(?:u[żz]ytkowej)?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseAreaNum(m[1]) : null;
}

// Anchored on the field LABEL so the parser skips the row's own "Cena
// wywoławcza" <div> heading (list-row HTML repeats the label right before the
// real value: "Cena wywoławcza Cena wywoławcza: 877.230,00 zł ...") and the
// wynik doc's section heading ("... najwyższa cena osiągnięta w przetargu
// Cena wywoławcza: 76.000,00 zł,") — the regex simply fails at a label-only
// position (no digits follow) and `.exec` advances to the real value.
const STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s*:?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// "Cena osiągnięta w przetargu: 76.800,00 zł" (only present once resolved).
const ACHIEVED_PRICE_RE = /cena\s+osi[ąa]gni[ęe]t\w*(?:\s+w\s+przetargu)?\s*:?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── Outcome ──────────────────────────────────────────────────────────────────

// The wynik doc's own outcome sentence ("Przetarg [odbył się i ]zakończył
// [się] wynikiem pozytywnym/negatywnym."). Checked FIRST so a doc's unrelated
// boilerplate can't false-positive (the ogłoszenie doc's wadium-refund clause
// mentions "wynikiem negatywnym" too, but that's a different document — this
// adapter only ever feeds wynik-doc or list-row text to these functions).
const OUTCOME_SENTENCE_RE = /zako[ńn]czy\w*\s*(?:si[ęe])?\s*wynikiem\s+(pozytywn\w*|negatywn\w*)/i;

/** @param {string} text @returns {boolean} */
export function isPositiveOutcome(text) {
  const t = text || '';
  const m = OUTCOME_SENTENCE_RE.exec(t);
  if (m) return /^pozytywn/i.test(m[1]);
  // Terse list-row "Wynik" cell ("Pozytywny" / "Negatywny" / "Brak wyniku").
  return /pozytywn/i.test(t) && !/negatywn/i.test(t);
}

/** @param {string} text @returns {boolean} */
export function isNegativeOutcome(text) {
  const t = text || '';
  const m = OUTCOME_SENTENCE_RE.exec(t);
  if (m) return /^negatywn/i.test(m[1]);
  return /negatywn/i.test(t);
}

/**
 * Flat-SALE gate: reuses the shared classifier (mieszkalny) and locally
 * excludes lease noise, the same spirit as gorzow-wielkopolski's
 * isFlatSaleRow (the city board is clean of it per the spike, but this is a
 * cheap safety net — ZGL, the actual lease publisher, is a separate host this
 * adapter never fetches).
 *
 * Deliberately does NOT exclude on a bare "rokowa" substring the way Gorzów's
 * announcement-side filter does: EVERY Międzyrzecz wynik doc cites its legal
 * basis as "Rozporządzenia Rady Ministrów ... w sprawie sposobu i trybu
 * przeprowadzania przetargów oraz rokowań na zbycie nieruchomości" — a
 * boilerplate sentence naming both mechanisms generically, present even on a
 * plain przetarg's result notice (verified live: Kursko 28a/1, WGM.6840.31.2016).
 * A substring exclusion on "rokowa" would silently zero out every positive
 * result this adapter ever parses.
 * @param {string} text
 * @returns {boolean}
 */
export function isFlatSaleRow(text) {
  const t = text || '';
  if (/najem|dzier[żz]aw/i.test(t)) return false;
  return classifyKind(t) === 'mieszkalny';
}

// ── Address ──────────────────────────────────────────────────────────────────

const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+)/i;
const KLATKA_RE = /w\s+klatce\s+([A-ZĄĆĘŁŃÓŚŹŻ])/i;

// "ul. Mieszka I 88B" / "ul. Marcinkowskiego 28" — street name (1-4
// capitalised words, lazy so it stops at the first digit run) + building.
const UL_RE = /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(\d{1,4}[A-Za-z]?)\b/u;

// "budynku nr 28A" / "budynku mieszkalnego nr 74" — no street, village form.
const BUDYNEK_NR_RE = /budyn\w*\s+(?:mieszkalnego\s+)?(?:o\s+)?nr\.?\s*(\d{1,4}[A-Za-z]?)/i;

// Nominative place name from "obręb geodezyjny NNNN <Place>" — reliable case,
// used only to correct a SINGLE-WORD locative candidate (see file header).
const OBREB_RE = /obr[ęe]b\w*\s*(?:geodezyjny)?\s*\d{3,4}\s+(\p{Lu}\p{Ll}+)\b/u;

// Bare "Miejscowość NN" adjacency, no "ul."/"budynku nr" framing ("Jagielnik
// 25/4"); a trailing "/N" (if any) is NOT captured — the flat number always
// comes from LOKAL_NR_RE instead, since this trailing digit is inconsistent
// with the stated lokal nr in at least one observed listing.
const BARE_PLACE_NUM_RE = /\b(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)\s+(\d{1,4}[A-Za-z]?)(?:\/\d+)?\b/u;

const PLACE_STOPWORDS = new Set([
  'sprzedazy', 'sprzedaz', 'lokalu', 'lokal', 'lokalowej', 'mieszkalnego', 'mieszkalny', 'mieszkalna',
  'miedzyrzeczu', 'miedzyrzecz', 'miedzyrzecza', 'sali', 'slubow', 'urzedu', 'miejskiego', 'burmistrz',
  'burmistrza', 'ratusza', 'sad', 'sadu', 'rejonowy', 'rejonowego', 'wydzial', 'wydzialu', 'ksiag', 'ksiege',
  'wieczystych', 'wieczysta', 'dzialka', 'dzialke', 'oznaczona', 'ewidencyjnie', 'obreb', 'geodezyjny',
  'klatce', 'klatka', 'budynku', 'budynek', 'poddaszu', 'parterze', 'pietrze', 'wraz', 'udzialem', 'udzialu',
  'czesci', 'urzadzenia', 'panstwa', 'gmina', 'gminy', 'informacja', 'ogloszenie', 'przetargu', 'przetarg',
  'rady', 'ministrow', 'rozporzadzenia', 'zgodnie', 'oznaczenie', 'nieruchomosci', 'nieruchomosc',
]);

function foldPl(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

function isStopword(word) {
  return PLACE_STOPWORDS.has(foldPl(word).replace(/[^a-z]/g, ''));
}

function hasStopword(phrase) {
  return phrase.trim().split(/\s+/).some(isStopword);
}

// Locative -> nominative for the two place-name endings actually observed
// live (2026-07-10): the SAME flat's rounds are worded inconsistently —
// "położonego w Kęszycy Leśnej w klatce C ..." (locative) on some rounds,
// "położonego w m. Kęszyca Leśna w klatce C ..." (nominative, via the "w m."
// = "w miejscowości" form) on others. Without this, the two phrasings key the
// identical physical flat as two different properties. Mirrors normalize.js's
// OWN adjectival street-suffix table (same conservative "only an unambiguous
// ending" philosophy), applied word-by-word so an already-nominative word
// (from a "w m." match) is never touched — "Kęszyca"/"Leśna" end in neither
// suffix below, so re-running this on already-correct input is a no-op.
const PLACE_LOCATIVE_ENDINGS = [
  ['ej', 'a'],  // adjective: Leśnej -> Leśna
  ['cy', 'ca'], // "-ca" noun family: Kęszycy -> Kęszyca
];
function nominativePlace(phrase) {
  return phrase
    .split(' ')
    .map((word) => {
      for (const [suffix, repl] of PLACE_LOCATIVE_ENDINGS) {
        if (word.toLowerCase().endsWith(suffix) && word.length > suffix.length) {
          return word.slice(0, -suffix.length) + repl;
        }
      }
      return word;
    })
    .join(' ');
}

// Nearest "w/we <Place>" OR "w m. <Place>" (m. = skrót for "miejscowości")
// capitalised candidate around `index` (checks after, then before). The "m."
// form is a real live variant (confirmed 2026-07-10: some Kęszyca Leśna
// notices write "położonego w m. Kęszyca Leśna w klatce C budynku nr 74"
// instead of "położonego w Kęszycy Leśnej w klatce C budynku nr 74") and
// conveniently gives the place name in NOMINATIVE case already.
function placeNameNear(text, index) {
  const RE = /\bwe?\s+(?:m\.\s+)?(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)\b/u;
  const after = text.slice(index, index + 90);
  const before = text.slice(Math.max(0, index - 90), index);
  for (const window of [after, before]) {
    RE.lastIndex = 0;
    const m = RE.exec(window);
    if (m && !hasStopword(m[1])) return m[1].trim();
  }
  return null;
}

/**
 * Extract a raw "<street/village> <building><klatka?>/<apt>" address string
 * from Międzyrzecz auction prose (list-row "Dotyczy" text OR a wynik/ogłoszenie
 * doc body — both share the same phrase vocabulary; see file header for the
 * three-tier strategy). Returns null when no flat number or no building/street
 * candidate is found — callers must treat that as "can't key this record".
 * @param {string} text
 * @returns {string|null}
 */
export function extractLokalAddress(text) {
  const t = (text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const lokalM = LOKAL_NR_RE.exec(t);
  if (!lokalM) return null;
  const apt = lokalM[1];

  // Scope the street/building/klatka/obręb search to the clause STARTING at
  // "Lokal mieszkalny nr N" — a wynik doc's preamble names the AUCTION VENUE
  // ("Sala Ślubów Urzędu Miejskiego w Międzyrzeczu, ul. Rynek 1 (budynek
  // Ratusza, parter)") before ever mentioning the flat, and that "ul. Rynek 1"
  // would otherwise win as the first UL_RE match in the whole document. A
  // list row's "Dotyczy" text has no such preamble (it starts with
  // "Sprzedaży lokalu mieszkalnego nr N" already), so this scoping is a no-op
  // there. Bounded to 500 chars — comfortably covers the observed span from
  // "Lokal mieszkalny nr N" to the trailing "obręb ... o pow." clause with
  // margin, without risking a much later, unrelated address (e.g. a Sąd
  // Rejonowy footer) winning instead.
  const scoped = t.slice(lokalM.index, lokalM.index + 500);

  const klatkaM = KLATKA_RE.exec(scoped);
  const klatka = klatkaM ? klatkaM[1].toUpperCase() : '';

  let street = null;
  let building = null;

  const ulM = UL_RE.exec(scoped);
  if (ulM) {
    street = ulM[1].trim();
    building = ulM[2].toUpperCase();
  } else {
    const budM = BUDYNEK_NR_RE.exec(scoped);
    if (budM) {
      building = budM[1].toUpperCase();
      street = placeNameNear(scoped, budM.index);
      if (street) street = nominativePlace(street);
      if (street && !street.includes(' ')) {
        const obrebM = OBREB_RE.exec(scoped);
        if (obrebM && foldPl(obrebM[1]).slice(0, 4) === foldPl(street).slice(0, 4)) {
          street = obrebM[1];
        }
      }
    } else {
      const bareM = BARE_PLACE_NUM_RE.exec(scoped);
      if (bareM && !hasStopword(bareM[1])) {
        street = bareM[1].trim();
        building = bareM[2].toUpperCase();
      }
    }
  }
  if (!street || !building) return null;
  // Fold the entrance letter into the building number ("88" + klatka "B" ->
  // "88B") UNLESS the UL_RE branch already captured it inline (OCR'd wynik
  // docs write "ul. Mieszka I 88B" directly, with no separate "w klatce"
  // sentence) — without this guard the same physical flat would key
  // differently depending on which text (list row vs. doc) produced it.
  if (klatka && !/[A-Za-z]$/.test(building)) building += klatka;
  return `${street} ${building}/${apt}`;
}

// ── Row-level date helper (shared with crawl.js) ────────────────────────────

/** "2026-05-13 12:00:00" -> "2026-05-13". @param {string|null} s */
export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

// ── Active listing (board row -> listing record; no document fetch) ────────

/**
 * @typedef {object} BoardRow
 * @property {string|null} detailUrl
 * @property {string} dotyczyText     "Dotyczy" cell prose (title/description)
 * @property {string} cenaText        "Cena wywoławcza" cell text
 * @property {string} wynikText       "Wynik" cell text ("Pozytywny"/"Negatywny"/"Brak wyniku")
 * @property {string|null} announcedDate  "Data ogłoszenia" (YYYY-MM-DD HH:MM:SS)
 * @property {string|null} auctionDateRaw "Data i godzina przetargu" (YYYY-MM-DD HH:MM:SS)
 * @property {Array<{url:string, filename:string}>} attachments
 */

/**
 * Build an active-listing record straight from a status=0 board row — every
 * field the "active" contract needs (address, area, starting price, auction
 * date) is already inline in the row text, so no PDF/DOCX fetch happens here.
 * `round` is always null: Międzyrzecz only states "pierwszy/drugi przetarg" in
 * the ogłoszenie document body, not on the list row, and fetching that
 * document for every active row would trade the crawl's current zero-fetch
 * cost for a marginal, non-blocking field.
 * @param {BoardRow} row
 * @returns {object|null}
 */
export function parseActiveRow(row) {
  if (!isFlatSaleRow(row.dotyczyText)) return null;
  const addrRaw = extractLokalAddress(row.dotyczyText);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;
  const firstAttachment = (row.attachments || [])[0] || null;
  return {
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    area_m2: areaFromText(row.dotyczyText),
    starting_price_pln: startingPriceFromText(row.cenaText),
    auction_date: dateOnly(row.auctionDateRaw),
    round: null,
    detail_url: row.detailUrl || null,
    source_url: firstAttachment ? firstAttachment.url : null,
  };
}

// ── Result records ───────────────────────────────────────────────────────────

/**
 * Synthesize a small text blob for a NEGATIVE (Negatywny) resolved row so it
 * can go through the SAME parseResultDoc() as a real document — negative rows
 * carry no achieved price, so the list row's own Dotyczy + Cena wywoławcza
 * text is already everything a result record needs; fetching the wynik
 * attachment would just re-confirm "Negatywny" at the cost of an HTTP fetch
 * (+ OCR, for scanned PDFs) this adapter deliberately skips.
 * @param {BoardRow} row
 * @returns {string}
 */
export function buildNegativeResultText(row) {
  return [row.dotyczyText, row.cenaText, 'Przetarg zakończył się wynikiem negatywnym.'].join('\n');
}

/**
 * Guard: is this text a Międzyrzecz result document/blob? Used by crawl.js to
 * decide whether pdftotext's output is usable before falling back to OCR.
 * @param {string} text
 * @returns {boolean}
 */
export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wynik/i.test(text || '') || isNegativeOutcome(text) || isPositiveOutcome(text);
}

/**
 * Parse EITHER a full "informacja o wyniku przetargu" document (DOCX text or
 * OCR'd PDF text — a Pozytywny/sold row) OR a synthesized negative-row blob
 * (see buildNegativeResultText) into a concluded flat-auction record.
 * @param {string} text
 * @param {string|null} [fallbackDate]  ISO date from the board row (authoritative — see crawl.js)
 * @param {string|null} [sourceUrl]     wynik attachment URL, or the row's detail_url for negatives
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = text.replace(/\r/g, ' ');
  if (!isFlatSaleRow(t)) return [];

  const negative = isNegativeOutcome(t);
  const positive = !negative && isPositiveOutcome(t);
  if (!negative && !positive) return []; // not yet resolved / no outcome signal

  const addrRaw = extractLokalAddress(t);
  if (!addrRaw) return [];
  const address = parseAddress(addrRaw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);

  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const achieved = positive ? achievedPriceFromText(t) : null;
  if (positive && achieved == null) notes.push('parse: positive outcome but no achieved price found');
  if (positive && achieved != null && starting_price_pln != null && achieved < starting_price_pln) {
    notes.push('parse: achieved price below starting price — verify row');
  }

  return [{
    auction_date: fallbackDate || null,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    round: null, // result notices reference the announcement, not the round
    starting_price_pln,
    final_price_pln: positive ? achieved : null,
    outcome: positive ? 'sold' : 'unsold',
    unsold_reason: positive ? null : 'unknown',
    area_m2: areaFromText(t),
    notes,
  }];
}
