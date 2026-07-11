// Strzelce Krajeńskie parsers.
//
// bip.strzelce.pl's /przetargi/29/ board (SYSTEMDOBIP.PL/E-LINE — same CMS +
// engine as gorzow-wielkopolski and miedzyrzecz) renders the SAME 7-column
// table as miedzyrzecz (Lp / Data ogłoszenia / Data i godzina przetargu /
// Dotyczy / Cena wywoławcza / Wynik / Załączniki) — but its CONTENT behaves
// like gorzow-wielkopolski, not miedzyrzecz: "Cena wywoławcza" is almost
// always the placeholder "informacja w załączniku" (real numbers live in the
// attached announcement PDF) and "Wynik" is UNIFORMLY "Brak wyniku" on every
// row ever observed — verified live 2026-07-11 across the active board + 5
// pages of the resolved archive, including a flat that failed FOUR straight
// rounds (ul. Ludowej 9/4, GPM-30/2024) and never got a populated Wynik cell
// or a result attachment. So crawl.js fetches the announcement PDF per
// in-scope row (see file header there) and this module extracts fields from
// EITHER that PDF text OR (fallback / lease-skip / kind-gate) the board row's
// own "Dotyczy" title text — both share the same phrase vocabulary.
//
// Real fixtures groundtruthed live 2026-07-11 (see
// tests/parse-strzelce-krajenskie.test.js for the full captured strings):
//   Gilów 20/1 (GPM-24/2025, flat, VILLAGE form — no explicit "lokal nr",
//     building+apt glued: "położonego w Gilowie 20/1"; nominative place name
//     recovered from a separate "w miejscowości Gilów" sentence elsewhere in
//     the same document — the locative "Gilowie" is never converted by a
//     guessed suffix rule, only by this anchor, same discipline
//     miedzyrzecz/normalize.js use for genitive/locative place names):
//     https://bip.strzelce.pl/system/pobierz.php?plik=GPM_przetarg_Gilow_20_3B1.pdf&id=1f62487e29c813edd5f39d1a52a2edbf
//   ul. Ludowej 9/4 (GPM-30/2024, flat, TOWN form — explicit "lokalu
//     mieszkalnego nr 4" + separate "ul. Ludowej 9"):
//     https://bip.strzelce.pl/system/pobierz.php?plik=Ogloszenie_GPM_30_2024_.pdf&id=d7cf35bcdda52cbb5cbf1079c1c93092
//   Długie dz. 306/17 (GPM 25/2026, land, ACTIVE — przetarg 2026-09-02):
//     https://bip.strzelce.pl/system/pobierz.php?plik=GPM_25_2026.pdf&id=74b446f53fd27791e51e87040a2d8518
//   Ogardy 52 (GPM 22/2026, lokal NIEMIESZKALNY — see the bug note below):
//     https://bip.strzelce.pl/system/pobierz.php?plik=GPM_22_2026.pdf&id=9da92bef2145b043aee010591fb17fd6
//   Długie dzierżawa (lease, gastronomia stanowisko — board row text only):
//     https://bip.strzelce.pl/przetargi/29/132/OGLOSZENIE_Przedsiebiorstwo_Gospodarki_Komunalnej_Sp__z_o_o/
//   Wielisławice wynik (result doc — REAL result, but property is
//     'zabudowana' [a school building], not mieszkalny/grunt, so it's
//     correctly excluded by the kind gate below — this IS the achieved-price
//     stream's weakness the spike flagged: no in-scope wynik doc was found
//     live despite a multi-round flat and repeat land auctions):
//     https://bip.strzelce.pl/system/pobierz.php?plik=GPM_wynik_przetargu_Wielislawice.pdf&id=1b5f7dfa44c544264ab811ebb0ea8dff
//
// REAL BUG avoided here: gorzow-wielkopolski's own isFlatSaleRow uses a bare
// `/mieszkaln/.test(t)` (no word-boundary anchor). Strzelce's live board has
// a genuine "sprzedaż lokalu NIEmieszkalnego" row (Ogardy 52, GPM 22/2026) —
// since "niemieszkalnego" CONTAINS "mieszkalnego" as an unanchored substring,
// copying that regex verbatim would misclassify a non-residential unit as a
// flat sale. This adapter uses the shared core/classify-kind.js classifyKind()
// instead (its FLAT_RE requires "mieszkaln" immediately after whitespace,
// which correctly fails inside the glued "niemieszkalnego", while
// COMMERCIAL_RE catches it as 'uzytkowy') — the same fix miedzyrzecz already
// applies, verified here against this exact live row.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money + area ─────────────────────────────────────────────────────────────

// "54.000,00" (dot-thousands) / "121 000,00" (space-thousands) / "3500" (bare)
// -> integer PLN. Strzelce mixes dot- and space-thousands separators across
// documents (and even a bare no-separator wadium, "3500 zł") — strip both.
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

// "o pow. 37,78 m²" / "o powierzchni użytkowej 41,92 m²" / "o powierzchni 415 m2"
const AREA_RE = /o\s+pow(?:ierzchni)?\.?\s*(?:u[żz]ytkowej)?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseAreaNum(m[1]) : null;
}

// Anchored on the "Cena wywoławcza" label so the row's own placeholder
// ("informacja w załączniku") never produces a false digit match — the regex
// simply fails there (no digits follow) and returns null, signalling "need
// the PDF". Handles all three separator styles observed live: "- 54.000,00zł"
// (dot-thousands, no space before zł), "– 121 000,00 zł" (space-thousands,
// space before zł), "- 80 000,00zł" (space-thousands, no space before zł).
const STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s*[-–:]?\s*(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Best-effort achieved price — NOT yet observed in any real Strzelce wynik
// document (the only live result fetched, Wielisławice, is a negative/unsold
// outcome for an out-of-scope 'zabudowana' property; see file header). Kept
// defensively, mirroring naklo/miedzyrzecz's "nabywcą ... za cenę X zł"
// phrasing, for whenever a positive flat/land result is eventually posted.
const ACHIEVED_PRICE_RE = /nabywc\w*[\s\S]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  const t = text || '';
  if (!/nabywc/i.test(t)) return null;
  const m = ACHIEVED_PRICE_RE.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ── Outcome ──────────────────────────────────────────────────────────────────

// Strzelce's one real captured wynik doc (Wielisławice) phrases its negative
// outcome as "Brak wpłat wadium ... przetarg się nie odbył" — NOT the
// "wynikiem negatywnym" template naklo/miedzyrzecz/gorzow use (that phrase is
// also matched here defensively, in case a differently-worded notice uses it).
const NEGATIVE_RE =
  /wynikiem\s+negatywn\w*|nie\s+odnotowano\s+wp[łl]at|brak\s+wp[łl]at\w*\s+wadium|przetarg\s+si[ęe]\s+nie\s+odby[łl]/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

/** Guard: is this text a Strzelce result document? Used by crawl.js to decide
 *  whether pdftotext's output is usable before falling back to OCR. */
export function isResultNotice(text) {
  const t = text || '';
  return /informacj\w*\s+o\s+wynik/i.test(t) || isNegativeOutcome(t) || /nabywc/i.test(t);
}

// ── Round ────────────────────────────────────────────────────────────────────

const ROUND_RE = /\b([IVX]{1,4})\s+(?:nieograniczon\w*|ograniczon\w*)\s+przetarg/i;
function romanToInt(s) {
  const ROMAN = { I: 1, V: 5, X: 10 };
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 20 ? total : null;
}
/** Auction round from the Roman-numeral ordinal ("I nieograniczony przetarg
 *  ustny" / genitive "I nieograniczonego przetargu ustnego" both match — no
 *  word-final anchor on "przetarg" so the genitive "przetargu" still hits). */
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}

// ── Row-level date helper (shared with crawl.js) ────────────────────────────

/** "2026-09-02 10:00:00" -> "2026-09-02". The board's "Data i godzina
 *  przetargu" column is always populated (unlike Cena wywoławcza) so this is
 *  the AUTHORITATIVE auction date — PDF bodies sometimes omit the year
 *  ("Przetarg odbędzie się w dniu 2 września o godz. 10:00", real live text,
 *  GPM 25/2026) so no PDF-body date parser is used at all. */
export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

// ── Row scope gate (lease / rokowania / kind) ───────────────────────────────

const LEASE_RE = /\b(dzier[żz]aw|najem|czynsz)/i;
const ROKOWANIA_RE = /rokowa[ńn]/i;

/** True when this row's Dotyczy title is a mieszkalny/grunt SALE via open
 *  przetarg (not a lease, not rokowania-after-failed-auction, not any other
 *  kind — lokale niemieszkalne, zabudowana houses/palaces, ruchomości like
 *  kamień brukowcowy). Checked BEFORE any PDF is fetched (ADAPTER-GUIDE
 *  step 1: skip rentals/out-of-scope kinds at discovery, don't spend a fetch
 *  on them) — mirrors gorzow-wielkopolski's own rokowania/dzierżawa exclusion
 *  and naklo's isLease(), but the kind check itself goes through the SHARED
 *  classifyKind() (see file header bug note) rather than a hand-rolled regex.
 * @param {string} dotyczyText
 * @returns {boolean}
 */
export function isInScopeRow(dotyczyText) {
  const t = dotyczyText || '';
  if (LEASE_RE.test(t) || ROKOWANIA_RE.test(t)) return false;
  const kind = classifyKind(t);
  return kind === 'mieszkalny' || kind === 'grunt';
}

// ── Address (flats) ──────────────────────────────────────────────────────────

// "lokalu mieszkalnego nr 4" (TOWN form — separate flat-number statement).
const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

// "ul. Ludowej 9" / "przy ul. Ludowej 9" — street (kept in whatever grammatical
// case the source used, same convention as normalize.js's own genitive-street
// policy — see nominativeStreetDisplay there for the one this repo applies at
// display time) + building number.
const UL_RE = /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(\d{1,4}[A-Za-z]?)\b/u;

// "lokalu mieszkalnego położonego w Gilowie 20/1" (VILLAGE form — no separate
// "nr", building+apt glued as "<bldg>/<apt>" directly after the place name).
const VILLAGE_GLUED_RE =
  /po[łl]o[żz]on\w*\s+w\s+(\p{Lu}\p{Ll}+)\s+(\d{1,4}[A-Za-z]?)\/(\d{1,4}[A-Za-z]?)/u;

// Nominative place-name anchor: "w miejscowości Gilów," / "części miejscowości
// Długie," / "położonych w miejscowości Ogardy." — a recurring template phrase
// confirmed across all three Strzelce localities captured live (Gilów, Długie,
// Ogardy), used to recover the NOMINATIVE form instead of guessing a suffix
// swap on the locative "Gilowie" (deliberately not attempted — same
// conservative philosophy as normalize.js/miedzyrzecz's own place-name
// handling: only an unambiguous, observed anchor is trusted).
const MIEJSCOWOSC_RE = /miejscowo[śs]ci\s+(\p{Lu}\p{Ll}+)/u;

/**
 * Extract a raw "<street/place> <building>/<apt>" address string for a flat,
 * trying the TOWN form (ul. + separate "lokal nr") first, then the VILLAGE
 * form (place name + glued building/apt, corrected to nominative when the
 * "miejscowości X" anchor is present). Returns null when neither matches —
 * callers must treat that as "can't key this record".
 * @param {string} text
 * @returns {string|null}
 */
export function extractFlatAddress(text) {
  const t = (text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  const ulM = UL_RE.exec(t);
  const lokalM = LOKAL_NR_RE.exec(t);
  if (ulM && lokalM) {
    return `${ulM[1].trim()} ${ulM[2].toUpperCase()}/${lokalM[1]}`;
  }

  const villM = VILLAGE_GLUED_RE.exec(t);
  if (villM) {
    let place = villM[1];
    const nomM = MIEJSCOWOSC_RE.exec(t);
    if (nomM) place = nomM[1];
    return `${place} ${villM[2].toUpperCase()}/${villM[3].toUpperCase()}`;
  }

  return null;
}

// ── Land (parcel + place) ────────────────────────────────────────────────────

// "oznaczonej numerem ewidencyjnym gruntu 306/17" / "o numerze ewidencyjnym
// 306/17" / "numerem ewidencyjnym 306/14".
const PARCEL_RE = /numer\w*\s+ewidencyjn\w*(?:\s+grunt\w*)?\s+(\d+(?:\/\d+)?)/i;
export function parcelFromText(text) {
  const m = PARCEL_RE.exec(text || '');
  return m ? m[1] : null;
}

/** Locality display name for a land parcel (NOT the key — land.json keys on
 *  dzialka_nr; see core/build-land.js). @param {string} text */
export function landPlaceFromText(text) {
  const m = MIEJSCOWOSC_RE.exec(text || '');
  return m ? m[1] : null;
}

// ── Announcement parse (crawlActive) ────────────────────────────────────────

/**
 * @typedef {object} BoardRow
 * @property {string|null} detailUrl
 * @property {string} dotyczyText      "Dotyczy" cell prose (title/description)
 * @property {string} cenaText         "Cena wywoławcza" cell text (usually
 *   the placeholder "informacja w załączniku"; rarely a real inline price)
 * @property {string|null} announcedDate
 * @property {string|null} auctionDateRaw  "Data i godzina przetargu" (authoritative)
 * @property {Array<{url:string, filename:string}>} attachments
 */

/**
 * Build an active-listing/land record from a board row + (usually) its fetched
 * announcement-PDF text. `pdfBodyText` is preferred for every field except the
 * auction date (the board row is authoritative there — see dateOnly's doc);
 * `row.dotyczyText` is the fallback when no PDF text is available (fetch
 * failed / skipped) since it independently carries kind, round, area and
 * (for villages) the address too — verified live on every captured title.
 * @param {BoardRow} row
 * @param {string|null} pdfBodyText
 * @param {string|null} pdfUrl
 * @returns {object|null}
 */
export function parseAnnouncement(row, pdfBodyText, pdfUrl) {
  const primary = pdfBodyText || '';
  const title = (row && row.dotyczyText) || '';
  const kindSource = primary || title;
  const kind = classifyKind(kindSource);
  if (kind !== 'mieszkalny' && kind !== 'grunt') return null;

  const auction_date = dateOnly(row && row.auctionDateRaw) || null;
  const round = roundFromText(primary) ?? roundFromText(title);

  let starting_price_pln = startingPriceFromText(primary);
  if (starting_price_pln == null) starting_price_pln = startingPriceFromText(row && row.cenaText);

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(primary) || parcelFromText(title);
    const area_m2 = areaFromText(primary) ?? areaFromText(title);
    const address_raw = landPlaceFromText(primary) || landPlaceFromText(title);
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
      detail_url: (row && row.detailUrl) || null,
      source_url: pdfUrl || null,
      notes,
    };
  }

  const address_raw = extractFlatAddress(primary) || extractFlatAddress(title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaFromText(primary) ?? areaFromText(title),
    starting_price_pln,
    auction_date,
    round,
    detail_url: (row && row.detailUrl) || null,
    source_url: pdfUrl || null,
    notes,
  };
}

// ── Result parse (crawlResultDocs) ──────────────────────────────────────────

/**
 * Parse a fetched "wynik"-attachment PDF's text into a concluded record.
 * Returns [] for anything outside this adapter's scope (kind other than
 * mieszkalny/grunt — e.g. Wielisławice's real wynik doc, a 'zabudowana'
 * school building; see file header) or with no outcome signal at all.
 * @param {string} text        pdftotext/OCR output
 * @param {string|null} [fallbackDate]  ISO date from the crawl ref (board row)
 * @param {string|null} [sourceUrl]     wynik attachment URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const kind = classifyKind(text);
  if (kind !== 'mieszkalny' && kind !== 'grunt') return [];

  const negative = isNegativeOutcome(text);
  const achieved = achievedPriceFromText(text);
  const positive = !negative && achieved != null;
  if (!negative && !positive) return [];

  const starting_price_pln = startingPriceFromText(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const address_raw = landPlaceFromText(text);
    if (!dzialka_nr && !address_raw) return [];
    return [
      {
        auction_date: fallbackDate || null,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        area_m2: areaFromText(text),
        address_raw,
        round: roundFromText(text),
        starting_price_pln,
        final_price_pln: positive ? achieved : null,
        outcome: positive ? 'sold' : 'unsold',
        unsold_reason: positive ? null : 'unknown',
        notes,
      },
    ];
  }

  const address_raw = extractFlatAddress(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  return [
    {
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(text),
      starting_price_pln,
      final_price_pln: positive ? achieved : null,
      outcome: positive ? 'sold' : 'unsold',
      unsold_reason: positive ? null : 'unknown',
      area_m2: areaFromText(text),
      notes,
    },
  ];
}
