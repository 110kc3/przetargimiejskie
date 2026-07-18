// Sopot parsers. Groundtruthed against REAL fetched fixtures (2026-07-18):
//   - id 58541 (announcement .doc, Armii Krajowej 61/1): "Cena wywoławcza
//     lokalu mieszkalnego nr 1 ... wynosi: 900.000,00 zł" / "Powierzchnia
//     użytkowa lokalu wynosi 65,20 m²" / "Przetarg odbędzie się w dniu 16
//     lipca 2026 r."
//   - id 59208 (result .doc, same property, NEGATIVE): "Wadium ... nie
//     zostało wpłacone przez żaden podmiot ... przetarg zakończył się
//     wynikiem negatywnym."
//   - id 55644 (result .doc, Wybickiego 45/4, SOLD): "Cena sprzedaży lokalu
//     niemieszkalnego nr 4 ... osiągnęła w wyniku przetargu kwotę -
//     404.000,00 zł. Nabywcą lokalu została Pani Katarzyna Jagiełka ..."
//   - id 17712 (INLINE result article, Fiszera 2, 2016 era, NEGATIVE): result
//     prose lives directly in the article's `content` HTML, no attachment.
//
// Reuses core/finn-bip.js's generic Polish auction-text helpers (priceFromText,
// areaFromText, auctionDateFromText for the future-tense announcement date,
// addressFrom, shareFromTitle, parsePLN) — Sopot's prose uses the same
// vocabulary. Round detection and the result-side (past-tense) date are
// Sopot-specific (see below) because Sopot's title phrasing ("<Roman>
// publiczny przetarg") and result phrasing ("W dniu ... odbył się") differ
// from the FINN-BIP titles those helpers were tuned against.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  parsePLN,
  shareFromTitle,
  addressFrom,
} from '../../core/finn-bip.js';

export { htmlToText };

// ---- title-level filters (cheap — no fetch needed) -------------------------

/** Rentals, movable-property sales, pure rokowania (post-failed-auction
 *  negotiations, no ustny przetarg to parse), and wykaz pre-announcements —
 *  never a keyable flat/commercial/garage SALE auction. */
export function isOutOfScopeTitle(title) {
  const t = (title || '').toLowerCase();
  if (/najem|dzier[żz]aw|wynajem/.test(t)) return true;
  if (/pojazd|samoch[oó]d|motorower|sk[łl]adnika\s+maj[ąa]tku\s+ruchomego|kawiarenk/.test(t)) return true;
  if (/rokowa/.test(t) && !/przetarg/.test(t)) return true;
  if (/^\s*wykaz/.test(t)) return true;
  return false;
}

/** "(ODWOŁANY)" / "[UNIEWAŻNIONY]" etc. — the auction never happened. */
export function isCancelledTitle(title) {
  return /odwo[łl]an|uniewa[żz]ni/i.test(title || '');
}

/** Cheap pre-fetch kind classification from the board-list TITLE alone —
 *  null means land/other, out of scope for this build. */
export function titleInScopeKind(title) {
  const t = title || '';
  if (/lokal\w*\s+mieszkaln/i.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)/i.test(t)) return 'uzytkowy';
  if (/gara[żz]/i.test(t)) return 'garaz';
  return null;
}

export function isSaleAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

/** A standalone "Informacja (dotycząca rozstrzygnięcia | o wyniku) ..."
 *  article — the pre-~2020 shape where the result is its OWN board entry
 *  (as opposed to a "wynik" attachment appended to the announcement article). */
export function isResultStandaloneTitle(title) {
  return /informacj\w*[\s\S]{0,40}?(rozstrzygni|wynik)/i.test(title || '');
}

// ---- text-level classification (after fetch: which role does this
// attachment/inline-content text play?) -------------------------------------

export function isResultText(text) {
  const t = text || '';
  return (
    /wynikiem\s+negatywnym/i.test(t) ||
    /informacj\w*\s+o\s+wyniku/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+przez\s+[żz]aden\s+podmiot/i.test(t) ||
    /rozstrzygni[ęe]cia\s+(?:i|ii|iii|iv|v)?\s*publiczn/i.test(t) ||
    /cena\s+sprzeda[żz]y[\s\S]{0,120}?osi[ąa]gn/i.test(t)
  );
}

export function isAnnouncementText(text) {
  return /cena\s+wywo[łl]awcz/i.test(text || '') && !isResultText(text);
}

export function isNegativeResultText(text) {
  const t = text || '';
  return (
    /wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+przez\s+[żz]aden\s+podmiot/i.test(t) ||
    /nie\s+wp[łl]acono\s+wadium/i.test(t)
  );
}

/** "Cena sprzedaży ... osiągnęła w wyniku przetargu kwotę - 404.000,00 zł." */
export function achievedPriceFromText(text) {
  const m = /osi[ąa]gn[ęe][łl]a[\s\S]{0,80}?kwot[ęe]\s*-?\s*([\d][\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** "Nabywcą lokalu została Pani Katarzyna Jagiełka, zamieszkała przy ..." →
 *  optional buyer name for `notes` (public record; not required by the
 *  extension's schema, kept as a light informational extra). */
export function buyerFromText(text) {
  const m = /Nabywc[ąa]\s+(?:lokalu\s+)?(?:zosta[łl]\w*|sta[łl]\w*)\s+(Pan\w*\s+[A-ZŻŹĆŁŚĄĘÓŃ][\p{L}.\- ]+?)(?=,|\s+zamieszka|\s*$)/u.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function unsoldReasonFromText(text) {
  const t = text || '';
  if (/wadium/i.test(t) && /(nie\s+zosta[łl]o\s+wp[łl]acone|nie\s+wp[łl]acono|brak\s+wp[łl]aty)/i.test(t)) {
    return 'no_wadium';
  }
  if (/brak\s+uczestnik|nikt\s+nie\s+przyst[ąa]pi/i.test(t)) return 'no_participants';
  return 'unknown';
}

// ---- round ------------------------------------------------------------------

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const WORD_ROUND_RE = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i;
const WORD_ROUND_MAP = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, pi: 5 };

/**
 * Round marker anywhere in the given text (title OR body). Case-SENSITIVE on
 * the Roman group — a lowercase "i" is the Polish conjunction, not a numeral.
 * Handles bare "<Roman> przetarg" ("II przetarg ustny nieograniczony ..."),
 * the common Sopot phrasing "<Roman> publiczn[y|ego] przetarg[u]" ("I
 * publiczny przetarg ustny nieograniczony ..."), word-spelled rounds ("Drugi
 * przetarg pisemny ..."), and the live-observed data-entry typo of a
 * lowercase "l" standing in for Roman "I" at a title's start (seen live: "l
 * publiczny przetarg ustny nieograniczony ...", ids 18926/18760/18665/17902).
 * @param {string} text
 * @returns {number|null}
 */
export function roundFrom(text) {
  // Strip a leading status marker: "(ZAKOŃCZONY) I publiczny ..." / "[ODWOŁANY] ...".
  const t = (text || '').replace(/^\s*[([][^)\]]*[)\]]\s*/, '');
  const w = WORD_ROUND_RE.exec(t);
  if (w) return WORD_ROUND_MAP[w[1].toLowerCase()] ?? null;
  if (/^l\s+publiczny\s+przetarg/.test(t)) return 1; // OCR/data-entry typo "l" for "I"
  const m = /\b(I{1,3}|IV|V)\s+publiczn\w*\s+przetarg/.exec(t) || /\b(I{1,3}|IV|V)\s+przetarg/.exec(t);
  if (m) return ROMAN[m[1]] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}

// ---- garage address ----------------------------------------------------------
//
// Garages are often sold WITHOUT a street building number of their own (a
// standalone garage court): "sprzedaż garażu nr 16 położonego przy ul.
// Traugutta w Sopocie". core/finn-bip's generic addressFrom expects a
// building number after the street and has no "garaż nr N" apartment marker
// (that's a flat-only pattern), so garage titles get their own extractor —
// garage number and street are searched INDEPENDENTLY (order-agnostic) since
// Sopot titles use both orders live ("garażu nr 417 ... przy ul. X" and
// "przy ul. X ... budynku garażu nr 30").

// Sopot's own documents spell the same street inconsistently across
// documents for the SAME property — observed live:
//   - "Gen. Józefa Wybickiego" (id 23848) vs "Generała Józefa Wybickiego"
//     (id 55644);
//   - "Al. Niepodległości 671-671A" (id 20824) vs "Alei Niepodległości
//     671-671A" (id 22698) — core/normalize's STRIP_LEAD only strips the
//     abbreviated "al\.?", so the full word "Alei" survives into the street
//     name and the SAME building splits into two property keys ("alei
//     niepodległości|671|" vs "niepodległości|671|").
// Without normalizing these, the announcement and its achieved-price result
// never link up as one property. Fold the full form down to the abbreviated
// one (which STRIP_LEAD already handles) before address extraction.
const STREET_PREFIX_NORMALIZATIONS = [
  [/\bGen\.\s+/g, 'Generała '],
  [/\bgen\.\s+/g, 'generała '],
  [/\bAlei\s+/g, 'Al. '],
  [/\balei\s+/g, 'al. '],
];
function expandRankAbbrev(s) {
  let out = s || '';
  for (const [re, repl] of STREET_PREFIX_NORMALIZATIONS) out = out.replace(re, repl);
  return out;
}

export function garageAddressFrom(text) {
  const t = text || '';
  const noM = /gara[żz]u?\s*nr\s*(\d+)/i.exec(t);
  if (!noM) return null;
  const streetM =
    /przy\s+(?:ul\.|ulicy|al\.|alei)?\s*((?:\d{1,2}\s+)?[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?:\s+(\d+[A-Za-z]?))?(?=\s+(?:w\s+Sopocie|wraz|i\s+ustanowieniem|[,.]|$))/i.exec(
      t,
    );
  if (!streetM) return null;
  const street = streetM[1].replace(/\s+/g, ' ').trim();
  const bldg = streetM[2];
  const raw = bldg ? `ul. ${street} ${bldg} garaż nr ${noM[1]}` : `ul. ${street} garaż nr ${noM[1]}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

// ---- date (result text) ------------------------------------------------------
//
// Result prose is PAST tense ("W dniu 16 lipca 2026 r. ... odbył się ...", or
// the older "Termin przetargu: 29 września 2016r.") — a different anchor than
// core/finn-bip's auctionDateFromText, which is tuned to the FUTURE-tense
// announcement phrasing ("odbędzie się").

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9, pazdziernika: 10,
  'października': 10, listopada: 11, grudnia: 12,
};
function isoFromPl(d, monName, y) {
  const m = PL_MONTHS[String(monName).toLowerCase()];
  return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const t = text || '';
  const m1 = /[Ww]\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,150}?odby[łl]/i.exec(t);
  if (m1) {
    const d = isoFromPl(m1[1], m1[2], m1[3]);
    if (d) return d;
  }
  const m2 = /[Tt]ermin\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m2) {
    const d = isoFromPl(m2[1], m2[2], m2[3]);
    if (d) return d;
  }
  return null;
}

// ---- unit (apartment) number for NON-flat units --------------------------
//
// core/finn-bip's addressFrom only extracts the apartment number for the
// literal "lokal... MIESZKALN..." (flat) phrasing — a commercial/non-
// residential unit ("lokalu niemieszkalnego nr 4" / "lokalu użytkowego nr
// 1A") falls through with address.apt left null, which loses the distinct
// unit (two commercial lokale in the same building would collide on one
// address key). Patch the apt in ourselves when addressFrom found a street +
// building but no apt.

function unitAptFrom(text) {
  const m = /lokal\w*\s+(?:mieszkaln\w*|niemieszkaln\w*|u[żz]ytkow\w*)\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i.exec(
    text || '',
  );
  return m ? m[1] : null;
}

function resolveAddress(title, text, kind) {
  const t = expandRankAbbrev(title);
  const b = expandRankAbbrev(text);
  if (kind === 'garaz') {
    return garageAddressFrom(t) || garageAddressFrom(b) || addressFrom(t, b);
  }
  const addr = addressFrom(t, b);
  if (!addr || addr.address.apt != null) return addr;
  const apt = unitAptFrom(`${t} ${b}`);
  if (!apt) return addr;
  const raw = `${addr.address.street} ${addr.address.building}/${apt}`;
  const patched = parseAddress(raw);
  return patched ? { address_raw: raw, address: patched } : addr;
}

// ---- record builders ---------------------------------------------------------

/** Build one ACTIVE-listing record from an announcement's extracted text
 *  (either the article's inline `content` or an attachment's docText/pdfText).
 *  Returns null when the record isn't keyable (no usable address). */
export function buildAnnouncementRecord(title, text, url) {
  let kind = classifyKind(`${title} ${text}`);
  if (kind === 'unknown') kind = titleInScopeKind(title) || 'unknown';
  if (kind === 'grunt' || kind === 'unknown') return null;

  const addr = resolveAddress(title, text, kind);
  if (!addr) return null;

  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFrom(title),
    auction_date: auctionDateFromText(text),
    detail_url: url,
    source_url: url,
    share: shareFromTitle(title, text),
  };
}

/**
 * Build one RESULT record from a result article/attachment's full text. This
 * is the ONLY place a result record is actually assembled — crawl.js hands
 * the already-extracted text straight through (source:'html' contract) and
 * parseResultDoc (the adapter's contract entry point) calls this at
 * refresh-time.
 * @param {string} text
 * @param {string} url
 * @returns {object|null}
 */
export function buildResultRecord(text, url) {
  if (!text) return null;
  const negative = isNegativeResultText(text);
  const achieved = negative ? null : achievedPriceFromText(text);
  const kind = classifyKind(text);
  if (kind === 'grunt' || kind === 'unknown') return null;

  const addr = resolveAddress('', text, kind);
  if (!addr) return null;

  const buyer = achieved != null ? buyerFromText(text) : null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    round: roundFrom(text),
    starting_price_pln: priceFromText(text),
    auction_date: resultDateFromText(text),
    final_price_pln: achieved,
    outcome: achieved != null ? 'sold' : 'unsold',
    unsold_reason: achieved != null ? null : unsoldReasonFromText(text),
    source_pdf: url,
    notes: buyer ? [`nabywca: ${buyer}`] : [],
  };
}

/**
 * Adapter contract entry point: parse one already-extracted result text
 * (crawl.js's ref.text) into an array of result records.
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const rec = buildResultRecord(text, sourceUrl);
  if (!rec) return [];
  if (!rec.auction_date) rec.auction_date = fallbackDate || null;
  return [rec];
}
