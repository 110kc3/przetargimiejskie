// Żagań parsers — one board (bip.zagan.pl, SystemDoBIP.pl/E-LINE, same engine
// as gorzow-wielkopolski and miedzyrzecz) doubles as both the announcement AND
// the results engine, exactly like miedzyrzecz: every list row already states
// "Cena wywoławcza" and "Wynik" (Pozytywny/Negatywny/Brak wyniku) inline — no
// per-row document fetch is needed to build an active listing OR a NEGATIVE
// (unsold) result.
//
// UNLIKE miedzyrzecz, a POSITIVE (Pozytywny/sold) row ALSO never needs — or
// even CAN get — a document fetch: verified live 2026-07-11 against a real
// sold flat (Brodatego 12/2, /przetargi/344/600/6_/, Wynik=Pozytywny). Neither
// the resolved-board row, nor the notice's own detail page, nor its single
// attached DOCX ("treść ogłoszenia") ever gains an achieved-price or
// nabywca field once resolved — the DOCX is the SAME pre-auction announcement
// text before and after the auction, and the detail page's only price field
// is "Cena wywoławcza" (starting price), never "cena osiągnięta". Sampled 60
// resolved rows (6 board pages) across land + flats: no row's attachment list
// ever contained a "wynik"/"informacja_o_wyniku"/"protokol"-named file — only
// "ogloszenie_*"/"zmiana_ogloszenia_*"/"rokowania_*". So this adapter makes
// ZERO document fetches anywhere: a Pozytywny result can only ever report
// outcome:'sold' with final_price_pln left null (see parseResultDoc below).
// This is a genuine property of this city's BIP, not a parser gap — a future
// agent revisiting this city should re-verify before assuming a fetch would help.
//
// Groundtruthed 2026-07-11 against live rows/pages fetched from
// https://bip.zagan.pl/przetargi/344/status/{0,1}/ and
// https://bip.zagan.pl/przetargi/344/599/3_/ (Żelazna 16/3 detail page) +
// https://bip.zagan.pl/przetargi/344/600/6_/ (Brodatego 12/2 detail page):
//
//   Żelazna 16/3   (id 599) — 30,00 m², 135.000,00 zł, III przetarg
//     16.12.2025 — I (22.07.2025) and II (07.10.2025) both Negatywny; the
//     resolved board (page 6, Lp 53) shows III ALSO concluded Negatywny — by
//     this verification date (2026-07-11) the notice the task brief called
//     "live pending" has already progressed to a resolved/unsold result (the
//     LIVE active board is currently 100% land — 10 parcels — matching the
//     spike's own "flats cycle in and out" observation: no flat is pending
//     right now). Its real prose is used both ways in the test file: as an
//     ACTIVE-row fixture (validates the active-parsing path against real
//     text) and as its actual current RESOLVED (Negatywny) state.
//   Brodatego 12/2 (id 600) — 115,54 m², 300.000,00 zł starting, SOLD
//     (Pozytywny) after a SIXTH przetarg (15.05.2025→22.07.2025→...→16.12.2025
//     per "Rodzaj: szósty przetarg nieograniczony" on the detail page) — the
//     real "no achieved price published" case documented above.
//   Asnyka 1979/2, Chrobrego 1786/14, Kolejowa 3116/9 — LAND (niezabudowana),
//     the last one carrying a REAL source typo: "o pow. 0, 0926 ha" (a stray
//     space after the decimal comma) — landAreaM2FromText tolerates it.
//   A 2015 dzierżawa (lease) notice from the /152/ Nieruchomości archive —
//     real text, used to groundtruth the lease-skip gate (this city's own
//     /przetargi/344/ board carried zero dzierżawa/najem rows across every
//     page sampled, active + resolved + unieważnione, so the gate is a
//     defensive net, same spirit as miedzyrzecz's own isFlatSaleRow).
//
// ROUND is always null (both listings and results): the Polish ordinal word
// ("Rodzaj: trzeci przetarg nieograniczony") lives ONLY on the per-notice
// detail page, never on the board row itself. Fetching every row's detail
// page just for this one non-blocking field would trade away this adapter's
// zero-fetch design — the exact same tradeoff miedzyrzecz's own parse.js
// documents for its own non-inline round field.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money + area ─────────────────────────────────────────────────────────────

// "135.000,00" / "300.000,00" / "1 500 000,00" -> integer PLN. Dot OR space
// thousands separator, optional ",NN" grosze tail.
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

// "o powierzchni 30,00 m2" — the LOKAL's own usable area. Deliberately matches
// the FIRST occurrence only: Żagań prose always states the flat's own area
// before any pomieszczenie przynależne (piwnica/komórka) area, e.g. "o
// powierzchni 30,00 m2, wraz z ... komórką o powierzchni 20,10 m2" — a
// non-global .exec() naturally picks the first (correct) one.
const AREA_RE = /o\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseAreaNum(m[1]) : null;
}

// Anchored on the field LABEL so the parser skips the row's own repeated
// "Cena wywoławcza" <div> heading ("Cena wywoławcza135.000,00 zł." — no space,
// no colon, after stripTags collapses the <div>). The trailing currency
// marker is OPTIONAL: a handful of real historical rows (older re-listings of
// the same flat/parcel, e.g. Żelazna id 583, Brodatego id 477, Wesołej id
// 636, Joselewicza id 471 — all verified live 2026-07-11) state the figure
// with "zł" truncated to a bare "z" or dropped entirely ("135.000,00 z" /
// "795.000,00" then a newline) — the "Cena wywoławcza" label anchor plus the
// "X.XXX,XX"-shaped number is already unambiguous on its own.
const STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s*:?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)(?:\s*z[łl])?/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── Land-only fields ─────────────────────────────────────────────────────────

// "numer ewidencyjny 1979/2" / "numerem ewidencyjnym2112/9" (REAL source
// typo: no space before the digit, id 579, verified live 2026-07-11) / "nr
// ewidencyjnym 2027/9" (abbreviated "nr" form, id 444) — the anchor PHRASE
// only; the parcel number(s) themselves are collected separately below so a
// missing space or the "nr" abbreviation can't block extraction.
const DZIALKA_ANCHOR_RE = /(?:numer\w*|nr\.?)\s+ewidencyjn\w*/i;
// Księga wieczysta numbers ("ZG1G/00049757/4", or a shorter-middle-segment
// variant "ZG1G/53226/4", id 579) — Żagań's KW prefix is a fixed 4-char
// LETTER-LETTER-DIGIT-LETTER court code ("ZG1G"). Masked out of the scoped
// text BEFORE parcel-token scanning (below) so neither a digit run WITHIN
// the KW number nor the lone digit embedded in its own prefix ("ZG1G"'s "1")
// can ever be mistaken for a cadastral parcel number — simpler and more
// robust than trying to exclude it via a boundary lookaround, which (tried
// first, reverted) conflicted with the missing-space anchor typo below.
const KW_NUMBER_RE = /\b\p{Lu}{2}\d\p{Lu}\/\d+\/\d+/gu;
// One parcel token: "1979/2", "1304/13" (subdivided parcel), OR a bare
// "2612" (whole, undivided parcel — real fixture id 601, verified live
// 2026-07-11: "oznaczona numerem ewidencyjnym 2612," with no slash at all —
// the "/subparcel" suffix is therefore OPTIONAL). `\/+` (one or more)
// tolerates ANOTHER real source typo, a doubled slash ("2379//12", ids
// 637-639) — collapsed back to a single "/" when the match is used. Only
// needs a digit/slash boundary guard (not a letter one) because KW numbers
// are masked out first — this is what lets "ewidencyjnym2112/9" (id 579, no
// space before the digit) still match even though "2112" is glued directly
// to a letter.
const PARCEL_TOKEN_RE = /(?<![\d/])(\d{1,4}(?:\/+\d{1,3})?)(?!\d)/g;
// Where a MULTI-parcel list ends and the one combined area clause begins —
// "o pow. 2.9971 ha" / "o powierzchni 1,7418 ha" (multi-parcel complexes
// state ONE total area AFTER the full parcel list; single-parcel notices
// state area BEFORE the anchor instead — see dzialkaNrFromText).
const AREA_CLAUSE_RE = /o\s+pow(?:ierzchni)?\.?\s*\d/i;

/**
 * Extract one or more cadastral parcel numbers. A multi-parcel land complex
 * ("działek gruntu oznaczonych numerami ewidencyjnymi: 1982/15, ... 1304/13,
 * 1304/14, ... oraz 1974/7, 1975/16" — 6 real historical notices, verified
 * live 2026-07-11) returns a comma-joined string — core/build-land.js's own
 * splitParcels() already understands that shape. Scoped from the anchor to
 * the next area clause (or the first newline / a 600-char bound, whichever
 * is nearest, if the notice states area BEFORE the anchor instead — the
 * single-parcel case) so neither a KW number nor (via buildResultText()'s
 * '\n'-joined Cena/outcome fields) a price figure can ever be mistaken for a
 * second parcel.
 * @param {string} text
 * @returns {string|null}
 */
export function dzialkaNrFromText(text) {
  const t = text || '';
  const anchorM = DZIALKA_ANCHOR_RE.exec(t);
  if (!anchorM) return null;
  const from = anchorM.index;
  const rest = t.slice(from);
  const areaM = AREA_CLAUSE_RE.exec(rest);
  // A real Dotyczy clause never contains a newline — only the SYNTHETIC
  // buildResultText() blob does (it joins Dotyczy/Cena/outcome with '\n'),
  // so bounding here as well keeps a result-record scan from ever reaching
  // into "Cena wywoławcza 130.000,00 zł" (whose "130" would otherwise be a
  // valid-shaped bare token once KW numbers are masked out).
  const newlineIdx = rest.indexOf('\n');
  const bound = Math.min(areaM ? areaM.index : Infinity, newlineIdx >= 0 ? newlineIdx : Infinity, 600);
  const to = from + (Number.isFinite(bound) ? bound : 600);
  const scoped = t.slice(from, to).replace(KW_NUMBER_RE, ' ');
  // Collapse a doubled-slash typo ("2379//12" -> "2379/12") for a clean stored value.
  const nums = [...new Set([...scoped.matchAll(PARCEL_TOKEN_RE)].map((m) => m[0].replace(/\/+/g, '/')))];
  return nums.length ? nums.join(', ') : null;
}

// "o pow. 0,0565 ha" / "o powierzchni 0,7692 ha" -> integer m² (ha * 10 000).
// Tolerates a REAL live source typo — a stray space after the decimal comma
// ("o pow. 0, 0926 ha", Kolejowa 3116/9, verified 2026-07-11) — via the
// optional `\s?` between the comma and the fractional digits.
const LAND_HA_RE = /o\s+pow(?:ierzchni)?\.?\s*(\d+(?:[.,]\s?\d+)?)\s*ha/i;
// Rare small residual/infill parcels state area directly in m² instead of ha
// (a boundary-adjustment sale to an adjacent owner — real fixture id 444,
// "o powierzchni 392 m2" — verified live 2026-07-11); tried only when no "ha"
// clause is present.
const LAND_M2_RE = /o\s+pow(?:ierzchni)?\.?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function landAreaM2FromText(text) {
  const t = text || '';
  const haM = LAND_HA_RE.exec(t);
  if (haM) {
    const cleaned = haM[1].replace(/\s+/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10000) : null;
  }
  const m2M = LAND_M2_RE.exec(t);
  if (m2M) {
    const n = Number(m2M[1].replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }
  return null;
}

// "położonej przy ul. Asnyka w Żaganiu" / "położona przy ul. Kolejowej w
// Żaganiu" — land has no building number (parcel-keyed, not address-keyed),
// so this captures the street name only, stopping at the lowercase "w"
// (city). Supplementary field only — landKey() (core/build-land.js) prefers
// dzialka_nr and falls back to this only when a parcel number is missing.
const LAND_STREET_RE =
  /po[łl]o[żz]on\w*\s+przy\s+ul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3})/u;
export function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(text || '');
  return m ? m[1].trim() : null;
}

// ── Outcome ──────────────────────────────────────────────────────────────────

// The board's "Wynik" cell is ALWAYS a bare word after stripTags collapses
// its <div> label — "Wynik Brak wyniku" / "Wynik Negatywny" / "Wynik
// Pozytywny" (never a full sentence, unlike gorzow/miedzyrzecz's wynik-DOCUMENT
// text) — so a simple substring check is sufficient and unambiguous.
/** @param {string} text @returns {boolean} */
export function isPositiveOutcome(text) {
  const t = text || '';
  return /pozytywn/i.test(t) && !/negatywn/i.test(t);
}

/** @param {string} text @returns {boolean} */
export function isNegativeOutcome(text) {
  return /negatywn/i.test(text || '');
}

// ── Scope gates ──────────────────────────────────────────────────────────────

// This city's /przetargi/344/ board carried zero dzierżawa/najem rows across
// every page sampled (active + resolved + unieważnione, 2026-07-11) — this is
// a defensive net (same spirit as miedzyrzecz's isFlatSaleRow), groundtruthed
// against a REAL (2015) lease notice from the /152/ Nieruchomości archive.
export function isLeaseRow(text) {
  return /najem|dzier[żz]aw/i.test(text || '');
}

/**
 * This adapter's in-scope kinds: flats (address-keyed, properties.json) and
 * land (parcel-keyed, land.json). Houses/commercial/garages are out of scope
 * for this build (neither analog handles them either) — silently skipped.
 * @param {string} text
 * @returns {'mieszkalny'|'grunt'|null}
 */
export function inScopeKind(text) {
  if (isLeaseRow(text)) return null;
  const k = classifyKind(text);
  return k === 'mieszkalny' || k === 'grunt' ? k : null;
}

// ── Flat address ─────────────────────────────────────────────────────────────

const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+)/i;

// "ul. Żelaznej 16" / "ul. Armii Krajowej 13" — street name (1-4 capitalised
// words, lazy so it stops at the first digit run) + building. Żagań prose
// writes the street in LOCATIVE/genitive case within running text ("przy ul.
// Żelaznej 16" = "at ul. Żelazna(loc) 16") — kept as-is here (never converted
// to nominative): both the active-row text and the resolved-row text for the
// SAME flat use the identical phrasing, so address.key stays consistent
// between a listing and its later result; core/normalize.js's
// nominativeStreetDisplay() (applied downstream in build-properties.js, not
// here) handles the DISPLAY conversion for the common adjectival endings
// ("Żelaznej" -> "Żelazna") without touching the key.
const UL_RE = /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(\d{1,4}[A-Za-z]?)\b/u;

/**
 * Extract a raw "<street> <building>/<apt>" address string from Żagań flat
 * auction prose (a board row's "Dotyczy" text — every real example observed
 * uses the SAME "lokalu mieszkalnego nr N ... przy ul. Street NN" template,
 * unlike miedzyrzecz's rural klatka/budynek-nr/bare-place variants). Scoped to
 * 400 chars after the "lokal ... nr N" anchor so a later, unrelated address
 * elsewhere in a longer text can never win. Returns null when no lokal number
 * or no "ul." street/building candidate is found.
 * @param {string} text
 * @returns {string|null}
 */
export function extractLokalAddress(text) {
  const t = (text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const lokalM = LOKAL_NR_RE.exec(t);
  if (!lokalM) return null;
  const apt = lokalM[1];
  const scoped = t.slice(lokalM.index, lokalM.index + 400);
  const ulM = UL_RE.exec(scoped);
  if (!ulM) return null;
  const street = ulM[1].trim();
  const building = ulM[2].toUpperCase();
  return `${street} ${building}/${apt}`;
}

// ── Row-level date helper (shared with crawl.js) ────────────────────────────

/** "2026-05-13 12:00:00" -> "2026-05-13". @param {string|null} s */
export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

// ── Active listings (board row -> record; zero document fetches) ───────────

/**
 * @typedef {object} BoardRow
 * @property {string|null} detailUrl
 * @property {string} dotyczyText     "Dotyczy" cell prose (title/description)
 * @property {string} cenaText        "Cena wywoławcza" cell text
 * @property {string} wynikText       "Wynik" cell text ("Brak wyniku"/"Negatywny"/"Pozytywny")
 * @property {string|null} announcedDate  "Data ogłoszenia" (YYYY-MM-DD HH:MM:SS)
 * @property {string|null} auctionDateRaw "Data i godzina przetargu" (YYYY-MM-DD HH:MM:SS)
 * @property {Array<{url:string, filename:string}>} attachments
 */

/**
 * Build an active FLAT listing straight from a status=0 board row.
 * @param {BoardRow} row
 * @returns {object|null}
 */
export function parseActiveFlatRow(row) {
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
    round: null, // see file header — only on the per-notice detail page
    detail_url: row.detailUrl || null,
    source_url: firstAttachment ? firstAttachment.url : row.detailUrl || null,
  };
}

/**
 * Build an active LAND listing straight from a status=0 board row.
 * @param {BoardRow} row
 * @returns {object|null}
 */
export function parseActiveLandRow(row) {
  const dzialka_nr = dzialkaNrFromText(row.dotyczyText);
  if (!dzialka_nr) return null;
  const street = landStreetFromText(row.dotyczyText);
  const firstAttachment = (row.attachments || [])[0] || null;
  return {
    kind: 'grunt',
    dzialka_nr,
    address_raw: street,
    street,
    area_m2: landAreaM2FromText(row.dotyczyText),
    starting_price_pln: startingPriceFromText(row.cenaText),
    auction_date: dateOnly(row.auctionDateRaw),
    round: null,
    detail_url: row.detailUrl || null,
    source_url: firstAttachment ? firstAttachment.url : row.detailUrl || null,
  };
}

// ── Result records ───────────────────────────────────────────────────────────

/**
 * Synthesize a small text blob for a RESOLVED (status=1) row so it can go
 * through parseResultDoc() below — NEITHER outcome ever needs a document
 * fetch on this city's BIP (see file header): a Negatywny row carries
 * everything a result record needs already, and a Pozytywny row's document
 * would only re-confirm the SAME pre-auction starting price (never an
 * achieved price) at the cost of an HTTP fetch this adapter skips entirely.
 * @param {BoardRow} row
 * @returns {string}
 */
export function buildResultText(row) {
  const parts = [row.dotyczyText, row.cenaText];
  if (isPositiveOutcome(row.wynikText)) parts.push('Przetarg zakończył się wynikiem pozytywnym.');
  else if (isNegativeOutcome(row.wynikText)) parts.push('Przetarg zakończył się wynikiem negatywnym.');
  return parts.join('\n');
}

/**
 * Parse a resolved-row text blob (see buildResultText) into a concluded
 * flat OR land record. Routes on classifyKind so refresh.js's own kind-based
 * partitioning (LAND_KIND -> land.json) works transparently for either kind
 * returned from here.
 * @param {string} text
 * @param {string|null} [fallbackDate]  ISO date from the board row (authoritative)
 * @param {string|null} [sourceUrl]     the row's detail_url (provenance — no document exists to link)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = text.replace(/\r/g, ' ');
  const kind = inScopeKind(t);
  if (!kind) return [];

  const negative = isNegativeOutcome(t);
  const positive = !negative && isPositiveOutcome(t);
  if (!negative && !positive) return []; // not yet resolved / no outcome signal

  const starting_price_pln = startingPriceFromText(t);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (positive) {
    // See file header: this city's BIP never publishes an achieved price or
    // buyer name anywhere reachable (row, detail page, or attachment) once a
    // przetarg resolves positively — verified live against Brodatego 12/2.
    notes.push("achieved price not published by this city's BIP for Pozytywny outcomes");
  }

  if (kind === 'mieszkalny') {
    const addrRaw = extractLokalAddress(t);
    if (!addrRaw) return [];
    const address = parseAddress(addrRaw);
    if (!address) return [];
    if (address.warning) notes.push(address.warning);
    return [{
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw: addrRaw,
      address,
      round: null, // result notices reference the announcement, not the round
      starting_price_pln,
      final_price_pln: null,
      outcome: positive ? 'sold' : 'unsold',
      unsold_reason: positive ? null : 'unknown',
      area_m2: areaFromText(t),
      notes,
    }];
  }

  // kind === 'grunt'
  const dzialka_nr = dzialkaNrFromText(t);
  if (!dzialka_nr) return [];
  const street = landStreetFromText(t);
  return [{
    auction_date: fallbackDate || null,
    source_pdf: sourceUrl,
    kind: 'grunt',
    dzialka_nr,
    address_raw: street,
    street,
    round: null,
    starting_price_pln,
    final_price_pln: null,
    outcome: positive ? 'sold' : 'unsold',
    unsold_reason: positive ? null : 'unknown',
    area_m2: landAreaM2FromText(t),
    notes,
  }];
}
