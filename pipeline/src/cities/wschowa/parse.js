// Wschowa parsers.
//
// bip.gminawschowa.pl's /przetargi/29/ board (SystemDoBIP/E-LINE — same engine
// as gorzow-wielkopolski and miedzyrzecz) renders each przetarg as ONE table
// row with columns Lp / Data ogłoszenia / Data i godzina przetargu / Dotyczy /
// Cena wywoławcza / Wynik / Załączniki — the SAME inline-column shape as
// miedzyrzecz (NOT Gorzów's separate batch-PDF-per-announcement engine): the
// address, area and starting price are already plain text on every row: only
// the ACHIEVED price (a Pozytywny/sold row) needs a document fetch.
//
// THE ONE WRINKLE NEITHER ANALOG HAS: a single row can BUNDLE several lots —
// flats and/or land parcels — inside one "Cena wywoławcza" cell as a
// newline-separated numbered list ("1) Działka … 2) Działka …" / "1.Lokal
// mieszkalny nr 1 … 2. Lokal mieszkalny nr 2 …"). splitNumberedItems() below
// splits those into one self-contained text block per lot; a cell with no
// numbered markers is treated as a single item (the common case).
//
// Groundtruthed 2026-07-11 against LIVE rows/documents fetched from
// https://bip.gminawschowa.pl/przetargi/29/status/{0,1,2}/ (+ paginated
// /przetargi/29/{page}/status/{n}/):
//
//   PENDING flat (single-item row, status=1 Lp10, Wynik "Brak wyniku" — the
//   board genuinely leaves some past-date rows without a recorded outcome;
//   treated as still-unresolved, never fetched for a result):
//     Dotyczy: "Sprzedaż lokalu mieszkalnego Nr 5 położonego przy ul.
//       Dworcowej  1 we Wschowie o powierzchni 60,88 m2,(składający się z:
//       dwóch pokoi, kuchni, przedpokoju, korytarza, łazienki z WC,
//       pomieszczenia gospodarczego) wraz z udziałem w wysokości 6088/27090 …"
//     Cena wywoławcza: "144 000,00 zł"  (matches the spike's Dworcowa 1/5
//       figure exactly)
//
//   RESULT flat SOLD (status=1 Lp28, Wynik "Pozytywny" — fetched DOCX,
//   INFORMACJA_Boczna.docx, via core/doc-text.js):
//     "…IV przetarg ustny nieograniczony na sprzedaż spółdzielczego
//      własnościowego prawa do lokalu mieszkalnego nr 15 o powierzchni
//      użytkowej 27,98 m2, położonego przy ul. Bocznej 1a we Wschowie.
//      Księga wieczysta dla nieruchomości: ZG1W/00028052/3. Cena wywoławcza:
//      130 000,00 złotych - Przetarg zakończył się wynikiem pozytywnym.
//      - najwyższa cena osiągnięta w przetargu – 135 000,00 zł.,
//      - nabywcy lokalu mieszkalnego – Dorota Barbara Kidziak, Mariusz
//      Kidziak,- przetarg zakończył się wynikiem pozytywnym."
//
//   RESULT flat SOLD, second document shape — born-digital PDF, no explicit
//   "wynikiem pozytywnym" sentence at all (status=1 Lp71, fetched via
//   core/pdf-text.js from INFORMACJA_O_WYNIKACH_PRZETARGU-_Kilinskiego_11.pdf
//   — outcome must be INFERRED from an achieved price + nabywca, exactly the
//   braniewo/gorzow "achieved price present ⇒ sold" convention):
//     "…odbył się: II-gi         przetarg ustny ograniczony na sprzedaż
//      lokalu mieszkalnego nr 4 o powierzchni użytkowej 9,98 m2 położonego
//      na II piętrze budynku przy ul. Kilińskiego 11 we Wschowie. …
//      Cena wywoławcza: 11 100,00 złotych
//      Cena osiągnięta w przetargu: 11 220,00 złotych
//      Nabywca: Urszula, Marek Szczepaniak"
//
//   RESULT flat UNSOLD (status=1 Lp44, Wynik "Negatywny" — built straight
//   from the board row, no fetch, same no-fetch-negative convention as
//   miedzyrzecz):
//     Dotyczy: "Sprzedaż spółdzielczego własnościowego prawa do lokalu
//       mieszkalnego Nr 15 o powierzchni 27,98 m2 położonego we Wschowie
//       przy ul. Bocznej 1a."
//     Cena wywoławcza: "150000,00 zł"
//
//   LAND (status=0 Lp1, the only live ACTIVE row as of 2026-07-11 —
//   9-parcel bundle in one "Cena wywoławcza" cell):
//     Dotyczy: "II przetarg ustny nieograniczony na sprzedaż nieruchomości
//       stanowiącej mienie gminne położonej we Wschowie przy ul. Cisowej,
//       Jodłowej, Czereśniowej"
//     Cena wywoławcza (verbatim, first 2 of 9 numbered lots):
//       "1) Działka 138/1 o powierzchni 0,0773 ha.
//        Cena wywoławcza nieruchomości: 124.000,00 zł brutto (100.813,01 zł netto)
//        2) Działka 138/4 o powierzchni 0,0842 ha.
//        Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)"
//
//   LEASE-SKIP (status=1 Lp2 — a rental, not a sale; excluded by isLeaseRow
//   AND independently by classifyKind, which tags "lokal użytkowego" as
//   'uzytkowy' not 'mieszkalny' — belt and suspenders, same reasoning
//   miedzyrzecz documents for its own najem/dzierżawa guard):
//     Dotyczy: "Przetarg ustny nieograniczony na najem lokalu użytkowego
//       położonego przy ul. Łaziennej 10 we Wschowie"
//     Cena wywoławcza: "5,00 zł netto za m2 powierzchni użytkowej lokalu"
//
// PRICE FORMATTING is inconsistent across the years of live data — BOTH
// dot-thousands ("70.343,00") and space-thousands ("144 000,00") appear, with
// or without a "Cena wywoławcza" label, sometimes only as a trailing
// "- 70.343,00 zł" after a bundled item's description. parsePLN()/the money
// regexes below tolerate all of these (verified against every fixture above).
//
// SCOPE NOTE: crawlResultDocs() only tracks FLAT (mieszkalny) outcomes — same
// scope as gorzow-wielkopolski and miedzyrzecz. Land rows are captured via
// crawlActive()'s `land` bucket (a live snapshot of currently-designated
// parcels) but their achieved-price outcome is not tracked in this build; a
// future agent can extend parseResultDoc's kind-branching (see braniewo's
// parse.js for the pattern) if a land results stream becomes worth the
// added multi-item-bundling complexity.
//
// KNOWN GAP (live-crawl-verified, 2026-07-11, not a groundtruth requirement
// for this build): pre-2022 multi-flat WYNIK documents (e.g. articles
// 2/BG/2021 — 6 flats — and a 2019-12-16 3-flat notice) use an OLDER phrasing,
// "sprzedaż nieruchomości lokalowej nr N" instead of "lokal mieszkalny nr N",
// which (a) extractFlatAddress's LOKAL_NR_RE doesn't recognize at all, and
// (b) classifyKind mis-tags as 'grunt' (LAND_RE matches the incidental
// "na działce nr geodezyjny …" clause describing the underlying plot, and the
// document never says "lokal mieszkalny" to win via FLAT_RE first) — so these
// documents correctly return [] rather than a wrong/partial record, same
// discipline as every other unhandled-shape case in this file. Every current
// (2023+) WYNIK document observed live uses "lokal mieszkalny nr N" and
// parses correctly — see the harness's own live crawlResultDocs() run
// (7/9 refs parsed; the 2 misses are exactly these two legacy documents).
//
// See spike: spikes/lubuskie/powiat-wschowski/wschowa.md

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money ────────────────────────────────────────────────────────────────────

// Dot OR space (regular + NBSP) thousands groups, optional ",NN" grosze tail.
// The separator itself is OPTIONAL between groups — Wschowa's real data mixes
// properly-grouped amounts ("144 000,00", "70.343,00") with fully unseparated
// ones of the same magnitude ("150000,00" — verified live, Boczna 1a/15's
// Negatywny row) — so a run of 3-digit groups is accepted whether or not each
// one is preceded by a dot/space. Matches "144 000,00", "70.343,00",
// "150000,00", "10000", "11 100,00".
const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\d{1,2})?';

/** "70.343,00" / "144 000,00" / "10000" -> integer PLN, or null. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s ]/g, '').replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Labeled: "Cena wywoławcza: 11 100,00 zł" / "Cena wywoławcza nieruchomości:
// 124.000,00 zł brutto" (land). Stops right at the money token so the
// "brutto"/netto parenthetical or a trailing "Postąpienie …" never leaks in.
const LABELED_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcza(?:\\s+nieruchomo[śs]ci)?\\s*:?\\s*(${MONEY})`,
  'i',
);
// Bundled-item trailing price with no label at all: "… we Wschowie -
// 70.343,00 zł + VAT (zwolniony)."
const DASH_PRICE_RE = new RegExp(`[-–]\\s*(${MONEY})\\s*z[łl]`, 'i');
// Bare cell, no label, no dash: "144 000,00 zł" / "150000,00 zł".
const BARE_PRICE_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'i');

/** Starting price ("cena wywoławcza") from a row/item/document text. */
export function startingPriceFromText(text) {
  const t = text || '';
  let m = LABELED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  m = DASH_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  m = BARE_PRICE_RE.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// Achieved price: "najwyższa cena osiągnięta w przetargu – 135 000,00 zł."
// (en-dash) OR "Cena osiągnięta w przetargu: 11 220,00 złotych" (colon).
const ACHIEVED_PRICE_RE = new RegExp(
  `(?:najwy[żz]sza\\s+)?cena\\s+osi[ąa]gni[ęe]t\\w*(?:\\s+w\\s+przetargu)?\\s*[:\\-–]?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
/** Achieved price ("cena osiągnięta"), or null (unstated / unsold). */
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── Area ─────────────────────────────────────────────────────────────────────

// "o powierzchni 60,88 m2" / "o powierzchni użytkowej 27,98 m2".
const FLAT_AREA_RE = /o\s+powierzchni(?:\s+u[żz]ytkowej)?\s*(\d+(?:[.,]\d+)?)\s*m/i;
/** Usable floor area (m2) of a flat, or null. */
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "o powierzchni 0,0773 ha." — plot area, hectares -> m2 (x10 000).
const LAND_AREA_HA_RE = /powierzchni\w*\s*(\d+(?:[.,]\d+)?)\s*ha\b/i;
/** Plot area (m2, converted from ha), or null. */
export function landAreaM2FromText(text) {
  const m = LAND_AREA_HA_RE.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

// "Działka 138/1 o powierzchni …" / "działki nr 1895/4" (optional "nr").
const PARCEL_RE = /Dzia[łl]k\w*\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)/i;
/** Parcel number ("138/1"), or null. */
export function parcelNoFromText(text) {
  const m = PARCEL_RE.exec(text || '');
  return m ? m[1] : null;
}

// "obręb geodezyjny Wschowa" / "obręb nr 6" — not observed on the live board
// today (Wschowa's land notices state only the town, not a numbered obręb),
// kept for forward-compatibility with braniewo's own obrebFromText shape.
const OBREB_RE = /obr[ęe]b\w*\s*(?:geodezyjny)?\s*(?:nr\.?\s*)?(\d+|\p{Lu}\p{Ll}+)/u;
/** Cadastral precinct (obręb), or null. */
export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1] : null;
}

// ── Round (roman numeral, e.g. "IV przetarg", "II-gi przetarg") ─────────────

const ROUND_RE = /\b(IV|III|II|VI|V|I)(?:-\w{1,4})?\s+przetarg\w*/i;
const ROUND_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/**
 * Round from a roman-numeral ordinal directly qualifying "przetarg[u]":
 * "IV przetarg ustny nieograniczony", "II-gi         przetarg ustny
 * ograniczony" (PDF layout spacing), "IV PRZETARGU USTNEGO NIEOGRANICZONEGO".
 * Deliberately anchored on "<numeral> [+suffix] przetarg" so it does NOT
 * false-match an unrelated roman numeral elsewhere ("na II piętrze" — floor
 * number; "Miasta I Gminy" — the conjunction "i"/"I"; "II WYCIĄG" — a
 * different document-numbering scheme) since none of those are immediately
 * followed by "przetarg".
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? (ROUND_NUM[m[1].toUpperCase()] ?? null) : null;
}

// ── Address (flats only — land is parcel-keyed, see parcelNoFromText) ──────

// "lokalu mieszkalnego nr 6" / "Lokal mieszkalny nr 4" / "prawa do lokalu
// mieszkalnego nr 15" — the flat number is ALWAYS taken from here, never from
// a trailing "/N" elsewhere, mirroring miedzyrzecz's own reasoning (a
// standalone slash-number is not reliably the lokal nr on this board either).
const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

// "ul. Dworcowej 1", "ul. Bocznej 1a", "ul.  Kilińskiego nr  11" (the "nr"
// label + doubled layout spaces both optional/tolerated). Requires a trailing
// building number, so a numberless street ("ul. Rynek we Wschowie") correctly
// falls through to the budynek-nr tier below instead of matching short.
const UL_RE =
  /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(?:nr\.?\s*)?(\d{1,4}[A-Za-z]?)\b/u;

// "budynku nr 9" / "budynku mieszkalnego nr 107" — the Rynek/Kostki phrasing,
// where the building number sits on "budynku", not directly after the street.
const BUDYNEK_NR_RE = /budyn\w*\s+(?:mieszkalnego\s+)?(?:o\s+)?nr\.?\s*(\d{1,4}[A-Za-z]?)/i;

// Bare "ul. <street>" with NO trailing number, used only after BUDYNEK_NR_RE
// has already supplied the building — the lookahead requires "we/w
// Wschowie"/"w <Miejscowość>" right after the street words so it doesn't run
// on into unrelated trailing prose.
const UL_BARE_RE =
  /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)(?=\s+(?:we?\s+Wschowie|w\s+\p{Lu}))/u;

/**
 * Extract a raw "<street> <building>/<apt>" address for a flat from Wschowa
 * auction prose (a board row's Dotyczy/Cena wywoławcza text, a bundled item's
 * own text, or a wynik document body — all share the same phrase
 * vocabulary). Requires BOTH an explicit "lokal(u) mieszkaln… nr N" AND a
 * resolvable street+building; returns null otherwise (a record this adapter
 * can't safely key gets dropped rather than guessed — same discipline as
 * miedzyrzecz's extractLokalAddress).
 * @param {string} text
 * @returns {string|null}
 */
export function extractFlatAddress(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  const lokalM = LOKAL_NR_RE.exec(t);
  if (!lokalM) return null;
  const apt = lokalM[1];

  // Scope the street/building search to the clause STARTING at "lokal(u)
  // mieszkaln… nr N" — a wynik document's preamble names the AUCTION VENUE
  // ("w siedzibie Urzędu Miasta i Gminy Wschowa ul. Rynek 1, 67-400 Wschowa")
  // BEFORE ever mentioning the flat, and that "ul. Rynek 1" would otherwise
  // win as the first UL_RE match in the whole document (verified live: the
  // Boczna 1a/15 result DOCX would otherwise key as "Rynek 1/15"). A board
  // row's Dotyczy/item text has no such preamble, so this scoping is a no-op
  // there. Bounded to 500 chars, same margin miedzyrzecz's own
  // extractLokalAddress uses for the identical trap.
  const scoped = t.slice(lokalM.index, lokalM.index + 500);

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
      const bareM = UL_BARE_RE.exec(scoped);
      if (bareM) street = bareM[1].trim();
    }
  }
  if (!street || !building) return null;
  return `${street} ${building}/${apt}`;
}

// ── Row/item gating ──────────────────────────────────────────────────────────

/** True for a LEASE row (najem/dzierżawa) — never a municipal SALE. */
export function isLeaseRow(text) {
  return /najem|dzier[żz]aw/i.test(text || '');
}

/** True when text reads as a flat-SALE (not lease, kind === 'mieszkalny'). */
export function isFlatSaleRow(text) {
  if (isLeaseRow(text)) return false;
  return classifyKind(text) === 'mieszkalny';
}

/** "2026-05-19 09:00:00" -> "2026-05-19". @param {string|null} s */
export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

// ── Bundled-lot splitting ────────────────────────────────────────────────────

// A numbered-item anchor is a 1-2 digit "N." or "N)" at the START of the cell
// or right after a newline (the CMS renders a bundled "Cena wywoławcza" cell
// as plain text with REAL embedded newlines between lots — see crawl.js's
// cellText(), which preserves them; other single-line fields collapse
// whitespace and never contain this pattern by coincidence — verified against
// every live bundled/unbundled fixture above).
const ITEM_ANCHOR_RE = /(?:^|\n)\s*(\d{1,2})[.)]\s*/g;

/**
 * Split a (possibly bundled) "Cena wywoławcza" cell into one self-contained
 * text block per lot. A cell with 0 or 1 numbered markers is NOT a bundle —
 * returned whole as a single item (covers the common single-flat/single-plot
 * row, including ones that happen to start with a stray "1." prefix).
 * @param {string} text
 * @returns {Array<{n:number, text:string}>}
 */
export function splitNumberedItems(text) {
  const t = (text || '').trim();
  if (!t) return [];
  const anchors = [...t.matchAll(ITEM_ANCHOR_RE)];
  if (anchors.length < 2) return [{ n: 1, text: t }];
  const out = [];
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index + anchors[i][0].length;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : t.length;
    out.push({ n: Number(anchors[i][1]), text: t.slice(start, end).trim() });
  }
  return out;
}

// ── Active row -> listing/land records ──────────────────────────────────────

/**
 * @typedef {object} BoardRow
 * @property {string|null} detailUrl
 * @property {string} dotyczyText     "Dotyczy" cell prose
 * @property {string} cenaText        "Cena wywoławcza" cell (newlines preserved)
 * @property {string} wynikText       "Wynik" cell ("Pozytywny"/"Negatywny"/"Brak wyniku")
 * @property {string|null} announcedDate
 * @property {string|null} auctionDateRaw
 * @property {Array<{url:string, filename:string}>} attachments
 */

/**
 * Build 0+ active listing/land records from one status=0 (Ogłoszone) board
 * row — no document fetch: every field is already inline. Splits a bundled
 * cell into per-lot records; a single-item row also folds in the row's own
 * Dotyczy prose (which — unlike a bundled item's self-contained text — is
 * often where the address/area actually live; the Cena wywoławcza cell alone
 * can be a bare price with nothing else, e.g. Dworcowa's "144 000,00 zł").
 * @param {BoardRow} row
 * @returns {{ listings: object[], land: object[] }}
 */
export function recordsFromActiveRow(row) {
  const listings = [];
  const land = [];
  if (isLeaseRow(row.dotyczyText)) return { listings, land };

  const round = roundFromText(row.dotyczyText);
  const auction_date = dateOnly(row.auctionDateRaw);
  const items = splitNumberedItems(row.cenaText);
  const bundled = items.length > 1;
  const firstAttachment = (row.attachments || [])[0] || null;
  const source_url = firstAttachment ? firstAttachment.url : null;

  for (const item of items) {
    const searchText = bundled ? item.text : `${row.dotyczyText}\n${item.text}`;
    const kind = classifyKind(searchText);

    if (kind === 'mieszkalny') {
      const address_raw = extractFlatAddress(searchText);
      if (!address_raw) continue;
      const address = parseAddress(address_raw);
      if (!address) continue;
      listings.push({
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2: flatAreaFromText(searchText),
        starting_price_pln: startingPriceFromText(item.text),
        auction_date,
        round,
        detail_url: row.detailUrl || null,
        source_url,
      });
    } else if (kind === 'grunt') {
      const dzialka_nr = parcelNoFromText(searchText);
      if (!dzialka_nr) continue;
      land.push({
        kind: 'grunt',
        dzialka_nr,
        obreb: obrebFromText(searchText),
        area_m2: landAreaM2FromText(searchText),
        address_raw: null,
        starting_price_pln: startingPriceFromText(item.text),
        auction_date,
        round,
        detail_url: row.detailUrl || null,
        source_url,
      });
    }
  }
  return { listings, land };
}

// ── Result records (flats only — see file header SCOPE NOTE) ───────────────

/**
 * Synthesize a text blob for a NEGATIVE (Negatywny) resolved row so it can go
 * through the SAME parseResultDoc() as a real fetched document — a negative
 * row carries no achieved price, so the board row's own Dotyczy + Cena
 * wywoławcza text is already everything a result record needs (same no-fetch
 * convention as miedzyrzecz's buildNegativeResultText).
 * @param {BoardRow} row
 * @returns {string}
 */
export function buildNegativeResultText(row) {
  return [
    row.dotyczyText,
    `Cena wywoławcza: ${row.cenaText}`,
    'Przetarg zakończył się wynikiem negatywnym.',
  ].join('\n');
}

const EXPLICIT_NEGATIVE_RE = /wynikiem\s+negatywnym|nie\s+odnotowano\s+wp[łl]at|nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium/i;
const EXPLICIT_POSITIVE_RE = /wynikiem\s+pozytywnym/i;

/** True when the text explicitly states a negative outcome. */
export function isExplicitNegative(text) {
  return EXPLICIT_NEGATIVE_RE.test(text || '');
}
/** True when the text explicitly states a positive outcome. */
export function isExplicitPositive(text) {
  return EXPLICIT_POSITIVE_RE.test(text || '');
}

/**
 * Guard: does this text carry a result signal at all (used by crawl.js to
 * decide whether pdftotext's output is usable before falling back to OCR)?
 * @param {string} text
 * @returns {boolean}
 */
export function isResultNotice(text) {
  return (
    /informacj\w*\s+o\s+wynik/i.test(text || '') ||
    isExplicitNegative(text) ||
    isExplicitPositive(text) ||
    achievedPriceFromText(text) != null
  );
}

/**
 * Parse EITHER a full "informacja o wynikach przetargu" document (DOCX text
 * or a born-digital PDF's pdftotext output — a Pozytywny row) OR a
 * synthesized negative-row blob (see buildNegativeResultText) into a
 * concluded flat-auction record. Flats only — see file header SCOPE NOTE.
 *
 * Outcome is decided PRIMARILY by whether an achieved price is present (some
 * live result PDFs, e.g. the Kilińskiego 11 one, never say "wynikiem
 * pozytywnym" at all — only "Cena osiągnięta w przetargu: X" + "Nabywca:" —
 * matching the braniewo/gorzow-wielkopolski convention), with the explicit
 * "wynikiem negatywnym/pozytywnym" sentence as a confirming/overriding
 * signal when present (the synthesized negative blob has NO achieved price
 * to find, so it relies on the explicit sentence alone).
 *
 * @param {string} text
 * @param {string|null} [fallbackDate]  ISO date from the board row (auction date)
 * @param {string|null} [sourceUrl]     wynik attachment URL, or the row's detail_url for negatives
 * @returns {Array<object>}  0 or 1 record
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = text.replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];

  const achieved = achievedPriceFromText(t);
  const explicitNeg = isExplicitNegative(t);
  const explicitPos = isExplicitPositive(t);
  const sold = achieved != null && !explicitNeg;
  if (!sold && !explicitNeg && !explicitPos) return []; // no determinable outcome

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);

  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');

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
