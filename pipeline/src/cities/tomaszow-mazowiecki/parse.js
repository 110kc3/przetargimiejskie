// Tomaszów Mazowiecki parsers — bip.tomaszow.miasta.pl announcement/result
// PDFs (and the occasional .docx — same text, extracted by core/doc-text.js).
// Both streams are the SAME house style (a fixed-fill-in-the-blank template
// citing "Rozporządzenia Rady Ministrów z dnia 14 września 2004 roku w
// sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
// nieruchomości"), so one shared field-extraction layer covers both, gated by
// isAnnouncement()/isResultNotice() — same architecture as kalisz/parse.js.
//
// Groundtruthed against REAL fixtures live-fetched 2026-07-19:
//   - ul. Zielona 38-40 — ANNOUNCEMENT, LAND (grunt: 2 combined parcels
//     522/3 + 525/1, obr. 24, 442 m² total), I przetarg ustny nieograniczony,
//     cena wyjściowa 110 000,00 zł, auction 2026-08-12. Uses the "cena
//     WYJŚCIOWA" price-label variant (not "wywoławcza").
//   - ul. Parkowa — RESULT, LAND (grunt: parcel 1121/2, obr. 13, 717 m²),
//     I przetarg, cena wywoławcza 123 000,00 zł, UNSOLD ("przetarg
//     zakończył się wynikiem negatywnym" — no wadium received), auction
//     2026-06-08.
//   - Plac Kościuszki 23 lokal mieszkalny nr 9 — RESULT, FLAT (63,30 m²,
//     "Placu Kościuszki" genitive → nominalized to "Plac Kościuszki"),
//     unnumbered/round-1 przetarg, cena wywoławcza 35 000,00 zł, SOLD at
//     35 350,00 zł ("najwyższą cenę osiągniętą w przetargu stanowi kwota"),
//     auction 2022-08-19. No explicit "wynikiem pozytywnym" sentence in this
//     template — sold is inferred from an achieved price being present.
//
// A joint/combined multi-unit sale in one notice (spike-cited: Plac
// Kościuszki 4, lokal użytkowy C5 + lokal mieszkalny C9 sold together) is a
// known simplification gap: this build extracts ONE property per document
// (the first address match), matching kalisz's single-record-per-PDF scope.
// The specific historical id (bip id=175624) the spike cited for that case
// now serves an EMPTY body (title metadata survives, content does not) —
// could not be re-groundtruthed live; flag for re-check if it resurfaces.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN } from '../../core/finn-bip.js';

export { htmlToText };

// --- notice-type discriminators (run on the fetched PDF/DOCX BODY, never the
// board title — the board can mislabel a row, see ADAPTER-GUIDE.md §5.3) ---

const AUCTION_ANCHOR_RE = /przetarg\w*\s+ustn\w*|ustn\w*\s+przetarg\w*/i;

/** @param {string} text @returns {boolean} is this an open-auction sale doc at all? */
export function isAuctionSaleDoc(text) {
  const t = text || '';
  if (!AUCTION_ANCHOR_RE.test(t)) return false;
  return /sprzeda/i.test(t);
}

/** @param {string} text @returns {boolean} is this a result ("o wyniku(ach)"/"rozstrzygnięci...") notice? */
export function isResultNotice(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && /\bo\s+wynik(?:u|ach)\b|rozstrzygni[ęe]ci/i.test(t);
}

/** @param {string} text @returns {boolean} is this a forward-looking announcement ("ogłasza")? */
export function isAnnouncement(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && !isResultNotice(t) && /og[łl]asza/i.test(t);
}

// --- address extraction -----------------------------------------------

const APT_FLAT_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;
const APT_COMMERCIAL_RE = /lokal\w*\s+u[żz]ytkow\w*\s+(?:oznaczon\w*\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;
const APT_GARAGE_RE = /gara[żz]\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

// A square ("Plac(u) <Name>") KEEPS the "Plac" word as part of the street
// name (unlike "ul."/"al.", which are dropped) — same reasoning as
// boleslawiec/parse.js's placToNominative: "Placu Kościuszki" and "ul.
// Kościuszki" must not collide on the same street key.
const STREET_PLAC_RE = /przy\s+(Placu?\s+[^\n,]+?)\s*(?:nr\.?\s*)?(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\b/i;
const STREET_UL_RE =
  /przy\s+(?:ul\.?|ulicy|al\.?|alei|os\.?|osiedlu)\s+([^\n,]+?)\s*(?:nr\.?\s*)?(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\b/i;

/** "Placu Kościuszki" -> "Plac Kościuszki" (genitive/locative -> nominative). */
function placToNominative(name) {
  return name.trim().replace(/^Placu\b/, 'Plac');
}

/**
 * Built-unit (flat/house/commercial/garage) address from document text.
 * @param {string} text @param {string} kind classifyKind() result
 * @returns {{address_raw:string, address:object}|null}
 */
export function builtAddress(text, kind) {
  const m = STREET_PLAC_RE.exec(text) || STREET_UL_RE.exec(text);
  if (!m) return null;
  let street = m[1].replace(/\s+/g, ' ').trim();
  if (/^Placu?\b/i.test(street)) street = placToNominative(street);
  const building = m[2].toUpperCase();
  let apt = null;
  if (kind === 'mieszkalny') apt = APT_FLAT_RE.exec(text)?.[1] ?? null;
  else if (kind === 'uzytkowy') apt = APT_COMMERCIAL_RE.exec(text)?.[1] ?? null;
  else if (kind === 'garaz') apt = APT_GARAGE_RE.exec(text)?.[1] ?? null;
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

// A bare street name (no trailing building number required) for land: plots
// are parcel-keyed, not street+building-keyed, and are routinely cited
// without a building number ("przy ul. Parkowej, w obrębie 13").
const LAND_STREET_RE =
  /przy\s+(?:ul\.?|ulicy|al\.?|alei|os\.?|osiedlu)\s+([^\n,]+?)(?=[,.]|\s+w\s+obr|\s+dzia[łl]|$)/i;
const LAND_STREET_PLAC_RE = /przy\s+(Placu?\s+[^\n,]+?)(?=[,.]|\s+w\s+obr|\s+dzia[łl]|$)/i;
const PARCEL_RE = /numerem\s+(\d+(?:\/\d+)?)/i;
const OBREB_RE = /w\s+obr(?:ębie|ebie|\.)?\s*(\d+[A-Za-z]?)/i;

/** "działki ... o powierzchni 717 m2" (either clause order). @returns {number|null} */
function landAreaM2(text) {
  const t = text || '';
  // "dzia[łl]" (NOT "dzia[łl]k") is deliberate: "działka"/"działki" have the
  // 'k' immediately after ł, but the genitive plural "działEk" (used in
  // "działek oznaczonych ...", the Zielona fixture) inserts an 'e' between ł
  // and k — requiring a literal trailing "k" silently failed to match that
  // real inflection.
  const m =
    /dzia[łl]\w*[\s\S]{0,80}?pow(?:ierzchni)?\.?\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(t) ||
    /pow(?:ierzchni)?\.?\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2][\s\S]{0,80}?dzia[łl]/i.exec(t);
  if (!m) return null;
  const v = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * @param {string} text
 * @returns {object|null} a land ('grunt') record's core fields, or null when
 *   there's neither a parcel number nor a street to key on.
 */
export function landFields(text) {
  const t = text || '';
  const parcelM = PARCEL_RE.exec(t);
  const streetM = LAND_STREET_PLAC_RE.exec(t) || LAND_STREET_RE.exec(t);
  if (!parcelM && !streetM) return null;
  let street = null;
  if (streetM) {
    street = streetM[1].replace(/\s+/g, ' ').trim();
    if (/^Placu?\b/i.test(street)) street = placToNominative(street);
  }
  return {
    dzialka_nr: parcelM ? parcelM[1] : null,
    obreb: OBREB_RE.exec(t)?.[1] ?? null,
    area_m2: landAreaM2(t),
    address_raw: street ? `ul. ${street}` : null,
  };
}

// --- flat/house/commercial area -----------------------------------------

/**
 * Built-unit usable area: "o łącznej pow.63,30 m2" / "o powierzchni
 * użytkowej 71,10 m2". NOTE: deliberately does NOT reuse core/finn-bip.js's
 * areaFromText() — its plot/share guard excludes any "before" window
 * containing "łącznej" (tuned for a DIFFERENT city's land-plot phrasing),
 * which would false-negative Tomaszów's own legitimate "o łącznej
 * pow.<N> m2" flat-area idiom (see Kościuszki fixture above).
 * @param {string} text @returns {number|null}
 */
export function builtAreaM2(text) {
  const m =
    /o\s+(?:łącznej\s+)?pow(?:ierzchni)?\.?\s*(?:u[żz]ytkowej\s*)?[:.]?\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(
      text || '',
    );
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v < 1000 ? v : null;
}

// --- price extraction ----------------------------------------------------

// "cena wywoławcza ... kwotę 35.000,00 zł" / "cena wyjściowa ... kwotę –
// 110 000,00 zł" — Tomaszów uses BOTH label variants (Zielona: wyjściowa;
// everything else seen: wywoławcza).
const STARTING_PRICE_RE =
  /cena\s+wy(?:wo[łl]awcz\w*|j[śs]ciow\w*)[\s\S]{0,60}?(?:kwot[ęe]|wynosi)[\s\S]{0,20}?[–-]?\s*([\d][\d.,\s]*?)\s*z[łl]/i;

/** @param {string} text @returns {number|null} */
export function startingPriceFrom(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// "najwyższą cenę osiągniętą w przetargu stanowi kwota 35 350,00 zł" — the
// one confirmed SOLD-result phrasing (Kościuszki 23). Re-confirm against a
// second sold fixture if one surfaces with different wording.
const ACHIEVED_PRICE_RE =
  /najwy[żz]sz[ąa]\s+cen[ęe]\s+osi[ąa]gni[ęe]t[ąa]\s+w\s+przetargu\s+stanowi\s+kwota\s*([\d][\d.,\s-]*?)\s*z[łl]/i;

/** @param {string} text @returns {number|null} */
export function achievedPriceFrom(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** "przetarg zakończył się wynikiem negatywnym" — confirmed UNSOLD idiom (Parkowa, Środkowa). */
export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym/i.test(text || '');
}

// --- auction date ----------------------------------------------------------

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9, pazdziernika: 10,
  'października': 10, listopada: 11, grudnia: 12,
};

/**
 * Auction date: announcement "Przetarg odbędzie się w dniu 12 sierpnia 2026
 * roku" (future tense); result "w dniu 19 sierpnia 2022 r. ... odbył się ...
 * przetarg" (the FIRST "w dniu <date>" in a result doc is always the auction
 * date itself — the committee-review date that follows always comes later
 * in the text — confirmed on both Parkowa/unsold and Kościuszki/sold).
 * @param {string} text @returns {string|null} ISO date
 */
export function auctionDateFromText(text) {
  const t = text || '';
  const spelled = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  const anySpelled =
    /w\s+dniu\s+(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[śs]nia|pa[źz]dziernika|listopada|grudnia)\s+(\d{4})/i.exec(
      t,
    );
  if (anySpelled) {
    const mon = PL_MONTHS[anySpelled[2].toLowerCase()];
    if (mon) return `${anySpelled[3]}-${String(mon).padStart(2, '0')}-${anySpelled[1].padStart(2, '0')}`;
  }
  return null;
}

// --- round -----------------------------------------------------------------

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ORDINAL_WORD = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };

// Finds a Roman-numeral round immediately after `anchorRe` (case-sensitive on
// the numeral itself, so a stray lowercase "i" conjunction near the anchor
// can never be misread as round I).
function romanRoundNear(text, anchorRe, windowLen = 30) {
  const m = anchorRe.exec(text || '');
  if (!m) return null;
  const start = m.index + m[0].length;
  const window = text.slice(start, start + windowLen);
  const rm = /^\s*([IVX]+)\s+przetarg/.exec(window);
  return rm ? ROMAN[rm[1]] ?? null : null;
}

function wordRoundNear(text, anchorRe, windowLen = 30) {
  const m = anchorRe.exec(text || '');
  if (!m) return null;
  const start = m.index + m[0].length;
  const window = text.slice(start, start + windowLen);
  const wm = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(window);
  if (!wm) return null;
  const word = wm[1].toLowerCase();
  for (const [stem, n] of Object.entries(ORDINAL_WORD)) if (word.startsWith(stem)) return n;
  return null;
}

/** Announcement round: "Ogłasza I przetarg ustny nieograniczony". */
export function roundFromAnnouncement(text) {
  const anchor = /og[łl]asza\s*/i;
  return (
    romanRoundNear(text, anchor) ?? wordRoundNear(text, anchor) ?? (/przetarg/i.test(text || '') ? 1 : null)
  );
}

/** Result round: "o wynikach III przetargu" / unnumbered -> round 1. */
export function roundFromResult(text) {
  const anchor = /(?:wynikach|wyniku|odby[łl]\s+si[ęe])\s*:?\s*/i;
  return (
    romanRoundNear(text, anchor) ?? wordRoundNear(text, anchor) ?? (/przetarg/i.test(text || '') ? 1 : null)
  );
}

// --- top-level parsers -------------------------------------------------

/**
 * Parse one announcement doc's text into 0-1 active-listing/land records.
 * @param {string} text pdftotext/docText output
 * @param {{url?:string}} [opts]
 * @returns {object|null}
 */
export function parseAnnouncement(text, opts = {}) {
  const t = text || '';
  if (!isAnnouncement(t)) return null;
  const { url = null } = opts;
  const kind = classifyKind(t);

  if (kind === 'grunt') {
    const land = landFields(t);
    if (!land) return null;
    return {
      kind: 'grunt',
      ...land,
      round: roundFromAnnouncement(t),
      starting_price_pln: startingPriceFrom(t),
      auction_date: auctionDateFromText(t),
      detail_url: url,
      source_url: url,
    };
  }

  const addr = builtAddress(t, kind);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: builtAreaM2(t),
    round: roundFromAnnouncement(t),
    starting_price_pln: startingPriceFrom(t),
    auction_date: auctionDateFromText(t),
    detail_url: url,
    source_url: url,
  };
}

/**
 * Parse one result ("Informacja o wyniku(ach)/rozstrzygnięciu ...") doc's
 * text into the achieved-price-stream record(s).
 * @param {string} text pdftotext/docText output (source:'html' -> ref.text)
 * @param {string|null} fallbackDate ISO date from the crawl ref
 * @param {string} sourceUrl the result PDF/DOCX URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  if (!isResultNotice(t)) return [];
  const kind = classifyKind(t);
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromResult(t);
  const starting_price_pln = startingPriceFrom(t);
  const final_price_pln = achievedPriceFrom(t);
  const negative = isNegativeOutcome(t);
  const outcome = final_price_pln != null ? 'sold' : negative ? 'unsold' : 'unknown';
  const unsold_reason = negative ? 'wynikiem negatywnym' : null;

  if (kind === 'grunt') {
    const land = landFields(t);
    if (!land) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl || null,
      // build-land.js copies detail_url/source_url (NOT source_pdf) into the
      // published land.json listings; emitting source_url here keeps the doc's
      // provenance visible in land.json AND lets crawl.js's known-urls union
      // (loadKnownLandUrls) skip already-captured result docs so the
      // MAX_RESULT_ITEMS window advances into the archive on each refresh.
      source_url: sourceUrl || null,
      kind: 'grunt',
      ...land,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      notes: [],
    }];
  }

  const addr = builtAddress(t, kind);
  if (!addr) return [];
  const notes = [];
  if (addr.address.warning) notes.push(addr.address.warning);

  return [{
    auction_date,
    source_pdf: sourceUrl || null,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    area_m2: builtAreaM2(t),
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    notes,
  }];
}
