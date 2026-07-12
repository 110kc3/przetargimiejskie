// Sucha Beskidzka parsers — Interaktywna Polska board (server HTML) whose notices
// are born-digital text PDFs at /mfiles/879/28/0/z/*.pdf. The parsers operate on
// `pdfText` (pdftotext -layout) output, so they take PLAIN TEXT (not HTML). We
// reuse the shared core/finn-bip.js TEXT helpers where they fit as-is
// (parsePLN, priceFromText, auctionDateFromText, roundFromText, areaFromText,
// addressFrom) + classifyKind; the Sucha-specific deviations below are:
//
//   1. TEXT CLEANING — pdftotext drops the superscript of "m²" on some notices,
//      leaving "51,52 m" followed by a U+200B zero-width space and no "2"
//      (confirmed live on the round-I flat), and litters bodies with soft hyphens
//      (U+00AD). cleanText() strips those so a single set of regexes parses both
//      the "m²"-preserving and the "m²"-dropped notices.
//
//   2. FLAT ADDRESS — the municipal flats are in osiedle blocks, stated as
//      "…lokalu mieszkalnego nr <apt>, znajdującego się w bloku nr <bldg>,
//      os. <Osiedle>…" (e.g. os. Beskidzkie, blok nr 1, lokal nr 9). core's
//      addressFrom only understands "przy ul. <Street> <bldg>", so
//      flatAddressFrom() builds "os. <Osiedle> <bldg>/<apt>" for parseAddress
//      (which strips the "os." lead → key "beskidzkie|1|9"). addressFrom is kept
//      as a fallback for a hypothetical flat on a named street.
//
//   3. FLAT AREA — the flat's own usable area sits right on the subject line
//      ("Lokal mieszkalny nr 9 o powierzchni 51,52 m…"); anchoring there avoids
//      the piwnica (9,95 m²) and the building's działka (0,0723 ha), and works
//      even when the "m²" superscript was dropped (no trailing "2"/"²" required).
//
//   4. KIND on a BOUNDED WINDOW — classifyKind over the WHOLE land notice
//      mis-fires: a built commercial plot's body says "…działka … zabudowana
//      dwoma budynkami" hundreds of chars in, flipping a clear grunt to
//      'zabudowana'. resolveKind classifies only the opening (~700 chars, the
//      "ogłasza … na sprzedaż <subject>" declaration) so the deep incidental
//      "zabudowan" can't win; the flat's own "lokal mieszkalny" is first in the
//      window so flats still resolve correctly.
//
//   5. LAND PARCEL / AREA — parcels appear as prose ("działce ewidencyjnej nr
//      9673/6" / "działkę ewidencyjną nr 9911 / 1", diacritic-declined, spaces
//      around "/") AND in a table row ("1. 6900 / 7 …"); parcelFromText handles
//      both. Land area prefers hectares ("o powierzchni 0,1356 ha" → 1356 m²).
//
// Groundtruthed against REAL fetched PDFs (verified live 2026-07-12, from this
// Pi's Polish IP) — see the fixtures + header in tests/parse-sucha-beskidzka.test.js.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  priceFromText, areaFromText, auctionDateFromText, roundFromText, addressFrom,
} from '../../core/finn-bip.js';

// ------------------------------------------------------------------- cleaning

// Strip the zero-width / soft-hyphen junk pdftotext leaves in these notices
// (U+00AD soft hyphen, U+200B/U+200C/U+200D/U+FEFF/U+2060 zero-width family) and
// fold the non-breaking space (U+00A0) to a normal space. Idempotent — safe to
// call again inside parseResultDoc on already-forwarded text.
export function cleanText(s) {
  return (s || '')
    .replace(/[­​‌‍﻿⁠]/g, '')
    .replace(/ /g, ' ')
    .replace(/\f/g, ' ');
}

// --------------------------------------------------------------- title routing

// A municipal SALE notice: "przetarg … na sprzedaż …". Excludes the lease/rent
// stream that dominates this board (przetarg pisemny na najem / dzierżawę,
// zaproszenie do rokowań) and bezprzetargowe sales. Used both as the cheap
// board-anchor pre-filter (crawl.js) and as a body backstop.
export function isSaleTitle(title) {
  const t = (title || '').toLowerCase();
  if (/najem|najmu|dzier[żz]aw|wynajem|rokowa|bezprzetarg/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

// Body gate (scoped to the opening declaration so "umowy sprzedaży" boilerplate
// in a lease notice can't sneak a rental through). @param {string} text cleaned.
export function isSaleBody(text) {
  const head = (text || '').slice(0, 400).toLowerCase();
  if (/najem|najmu|dzier[żz]aw|wynajem|rokowa|bezprzetarg/.test(head)) return false;
  return /przetarg/.test(head) && /na\s+sprzeda[żz]/.test(head);
}

// ---------------------------------------------------------------------- kind

// classifyKind over the OPENING only (see header §4). @returns kind string.
export function resolveKind(text) {
  const t = cleanText(text);
  let k = classifyKind(t.slice(0, 700));
  if (k === 'unknown') k = classifyKind(t.slice(0, 1500));
  return k;
}

// --------------------------------------------------------------- flat helpers

// "os. Beskidzkie" (one or two capitalised words).
const OS_RE = /\bos\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/;
// "blok nr 1" / "w bloku nr 1".
const BLOK_RE = /blok\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;
// "lokal mieszkalny nr 9" / "lokalu mieszkalnego nr 9".
const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

/**
 * Osiedle-block flat address → keyed address. Builds "os. <Osiedle> <bldg>/<apt>"
 * (parseAddress strips the "os." lead). @param {string} text @returns
 * {{address_raw:string, address:object}|null}
 */
export function flatAddressFrom(text) {
  const os = OS_RE.exec(text || '');
  const blok = BLOK_RE.exec(text || '');
  if (!os || !blok) return null;
  const lok = LOKAL_NR_RE.exec(text || '');
  const raw = `os. ${os[1].replace(/\s+/g, ' ').trim()} ${blok[1]}${lok ? '/' + lok[1] : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

/**
 * Flat usable area from the subject line, "Lokal mieszkalny nr N o powierzchni
 * <X> m…" — robust to the dropped "m²" superscript (see header §3). Falls back to
 * the shared labelled-area helper. @param {string} text @returns {number|null}
 */
export function flatAreaFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*\d+[A-Za-z]?\s+o\s+powierzchni\s+([\d]+[.,]\d+)\s*m/i.exec(text || '');
  if (m) { const v = Number(m[1].replace(',', '.')); if (Number.isFinite(v) && v > 0) return v; }
  return areaFromText(text);
}

// --------------------------------------------------------------- land helpers

// The auction is HELD at the Urząd (ul. Mickiewicza 19) — never the sale subject.
const OFFICE_STREET_RE = /mickiewicza/i;

// Prose parcel: "działce ewidencyjnej nr 9673/6" / "działkę ewidencyjną nr 9911 / 1"
// (diacritic-declined stem, optional "ewidencyjn…", spaces allowed around "/").
const DZIALKA_RE = /dzia[łl][kc][a-ząćęłńóśźż]*\s+(?:ewidencyjn[a-ząćęłńóśźż]*\s+)?(?:o\s+)?(?:nr\.?|numer\w*)\s*(\d+\s*\/\s*\d+|\d+)/i;
// Table fallback: a "Lp." row "1. 6900 / 7 …".
const TABLE_PARCEL_RE = /\b\d+\.\s+(\d{3,5}\s*\/\s*\d+)/;

/** @param {string} text @returns {string|null} normalised "6900/7" */
export function parcelFromText(text) {
  let m = DZIALKA_RE.exec(text || '');
  if (m) return m[1].replace(/\s+/g, '');
  m = TABLE_PARCEL_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, '') : null;
}

/** Land area: hectares ("0,1356 ha" → 1356 m²) preferred; else a bare m² value. */
export function landAreaFromText(text) {
  const ha = /o\s+powierzchni\s+([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+powierzchni\s+([\d][\d.,\s]*?)\s*m\s*[²2]\b/i.exec(text || '');
  if (m2) { const v = Number(m2[1].replace(/[\s]/g, '').replace(',', '.')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

/** Land street from "…przy ul(icy) <Street>…" (first non-office match). */
export function landStreetFromText(text) {
  const re = /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,.;]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+przeznaczon|\n|$)/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (s && !OFFICE_STREET_RE.test(s)) return s;
  }
  return null;
}

// ------------------------------------------------------------- subject key

/** Per-run grouping key for supersession: address for address-kinds, parcel for
 *  land. @param {object} r a parsed record @returns {string|null} */
export function subjectKey(r) {
  if (r.kind === 'grunt') return r.dzialka_nr ? `dz|${r.dzialka_nr}` : null;
  return r.address ? r.address.key : null;
}

// ---------------------------------------------------------------- parsers

/**
 * Parse one sale-notice PDF text into a listing (flat/built) or a land plot.
 * @param {string} title  the board anchor text (routing only; fields come from body)
 * @param {string} rawText  the notice's pdfText output
 * @param {string} url  the notice PDF url
 * @returns {object|null}
 */
export function parseAnnouncement(title, rawText, url) {
  const text = cleanText(rawText);
  if (!isSaleBody(text) && !isSaleTitle(title)) return null;
  const kind = resolveKind(text);
  const round = roundFromText(text) ?? roundFromText(title) ?? 1;
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return {
      kind: 'grunt', dzialka_nr, obreb: null, area_m2: landAreaFromText(text),
      address_raw, address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln, auction_date, round, detail_url: url, source_url: url,
    };
  }

  const addr = flatAddressFrom(text) || addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address,
    area_m2: flatAreaFromText(text), starting_price_pln, auction_date, round,
    detail_url: url,
  };
}

/**
 * Parse a CONFIRMED-superseded round's OWN notice text into the achieved-price-
 * stream shape. crawl.js only calls this on a round it has proven superseded (a
 * later round for the same subject exists), and no hammer price is reachable on
 * this source (results are SPA-only, see config.js), so every record is
 * `outcome: 'unsold'`, `final_price_pln: null`.
 * @param {string} rawText  the superseded round's own pdfText output (ref.text)
 * @param {string|null} fallbackDate  ref.auction_date
 * @param {string} sourceUrl  the superseded round's own url
 * @returns {Array<object>}
 */
export function parseResultDoc(rawText, fallbackDate, sourceUrl) {
  if (!rawText) return [];
  const text = cleanText(rawText);
  if (!text.trim()) return [];
  if (!isSaleBody(text)) return []; // defensive: never emit a lease/cancelled doc
  const kind = resolveKind(text);
  const round = roundFromText(text) ?? 1;
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const starting_price_pln = priceFromText(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  notes.push(
    'parse: no achieved-price document exists on this server-HTML source ' +
    '(results are on the bip.malopolska JS-SPA, out of scope) — outcome inferred ' +
    'from a later round being published, not a source-stated hammer price',
  );

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return [];
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: null,
      area_m2: landAreaFromText(text), address_raw: street ? `ul. ${street}` : null,
      address: null, round, starting_price_pln, final_price_pln: null,
      outcome: 'unsold', unsold_reason: 'superseded_by_next_round', notes,
    }];
  }

  const addr = flatAddressFrom(text) || addressFrom('', text);
  if (!addr) return [];
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln: null, outcome: 'unsold',
    unsold_reason: 'superseded_by_next_round', area_m2: flatAreaFromText(text), notes,
  }];
}
