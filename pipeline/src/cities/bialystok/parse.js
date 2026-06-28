// Bialystok parsers.
//
// The BIP detail page (bip.bialystok.pl) uses a SmartSite CMS that renders
// every field as a pair of .grid-inner-item divs inside a .grid-inner wrapper:
//
//   <div class="grid-inner">
//     <div class="grid-inner-item"><strong>Tytul</strong></div>
//     <div class="grid-inner-item" data-value="">ul. Juliana Tuwima 1/1 m 41</div>
//   </div>
//
// Fields present on every detail page:
//   Tytul, Lokalizacja (polozenie), Przeznaczenie, Cena wywolawcza,
//   Termin przetargu, Status, Osoba do kontaktu
// Extra field only on Rozstrzygniety (resolved) pages:
//   Cena nabycia  ->  achieved price (our money signal)
//
// crawlResultDocs() pre-extracts these fields from the HTML so parseResultDoc()
// receives a plain-text blob with one "KEY: VALUE" line per field. This keeps
// the parser free of HTML manipulation and easily unit-testable.

import { parseAddress } from '../../core/normalize.js';

// ---------------------------------------------------------------------------
// Shared HTML helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and decode common entities.
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  if (!html) return '';
  let s = html
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Parse the .grid-inner field/value pairs from a BIP detail page.
 * Returns a Map of label -> value (both stripped of whitespace).
 * @param {string} html  raw HTML of the detail page
 * @returns {Map<string, string>}
 */
export function parseDetailFields(html) {
  const fields = new Map();
  if (!html) return fields;
  // The SmartSite grid renders each field as:
  //   <div class="grid-inner[ resolution]">
  //     <div class="grid-inner-item"><strong>LABEL</strong></div>
  //     <div class="grid-inner-item" id="" data-value="">VALUE</div>
  //   </div>
  //
  // Strategy: scan for <strong>LABEL</strong> then the immediately-following
  // second .grid-inner-item sibling for its value text.
  const pairRe =
    /<strong[^>]*>([\s\S]*?)<\/strong>[\s\S]*?<\/div>\s*<div[^>]*grid-inner-item[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = pairRe.exec(html)) !== null) {
    const label = stripTags(m[1]).trim();
    const value = stripTags(m[2]).trim();
    if (label) fields.set(label, value);
  }
  return fields;
}

// ---------------------------------------------------------------------------
// PLN helper
// ---------------------------------------------------------------------------

// "341.600,00 zl" / "285 100,00" / "269500" -> integer PLN
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s)
    .replace(/\s*z[lLł]\s*$/i, '')
    .replace(/\s/g, '')
    .replace(/,\d{1,2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Address parsing
// ---------------------------------------------------------------------------

// Bialystok addresses on the BIP follow the format:
//   "ul. Juliana Tuwima 1/1 m 41"    -> building=1, apt=41
//   "Al. Jozefa Pilsudskiego 38 m 23" -> building=38, apt=23
//   "ul. Wierzbowa 29A m 55"          -> building=29A, apt=55
//
// core/normalize parseAddress() converts "m N" -> "/N" before parsing, so the
// simple "BLDG m APT" cases work directly. The "BLDG/STAIRCASE m APT" case
// fails because parseAddress interprets the first "/" as the building/apt
// separator. We pre-strip the staircase so "1/1 m 41" becomes "1 m 41".

/**
 * Parse a Bialystok BIP address string into a structured address object.
 * @param {string} raw  e.g. "ul. Juliana Tuwima 1/1 m 41"
 * @returns {{ address_raw: string, address: object|null }}
 */
export function parseDetailAddress(raw) {
  if (!raw) return { address_raw: raw, address: null };
  let s = raw.trim();

  // Strip leading city-name prefix: "Białystok, " (case-insensitive, any diacritics)
  // Seen on some BIP entries: "Białystok, Aleja Józefa Piłsudskiego 24 m 62, dz. nr 1282"
  s = s.replace(/^Bia[łl]ystok\s*,\s*/i, '');

  // Strip trailing działka / dz. nr fragment:
  //   ", dz. nr 1282"  /  ", działka nr 1282"
  // The comma before "dz." is part of the tail and must be consumed here,
  // otherwise it is left on the string and breaks the address parser.
  s = s.replace(/\s*,?\s*dz\.\s*nr\b.*/i, '');
  s = s.replace(/\s*,?\s*dzia[łl]ka\b.*/i, '');

  s = s.trim();

  // Strip staircase: "BLDG/STAIRCASE m APT" -> "BLDG m APT"
  const normalised = s.replace(
    /(\d+[A-Za-z]?)\/\d+(\s+m\.?\s*\d+[A-Za-z]?)/,
    '$1$2',
  );
  const address = parseAddress(normalised);
  return { address_raw: raw, address };
}

// ---------------------------------------------------------------------------
// parseDetailPage
// ---------------------------------------------------------------------------

/**
 * Parse a single BIP detail page into a structured property record.
 * Returns null if not a residential flat (przeznaczenie filter).
 *
 * @param {string} html        raw HTML of the detail page
 * @param {string} detailUrl   the page URL (provenance)
 * @returns {object|null}
 */
export function parseDetailPage(html, detailUrl) {
  if (!html) return null;
  const fields = parseDetailFields(html);
  const notes = [];

  // Filter: only residential flats. "Przeznaczenie" field distinguishes them.
  const przeznaczenie = fields.get('Przeznaczenie') || '';
  if (!/lokal\s+mieszkaln/i.test(przeznaczenie)) return null;

  const lokalizacja =
    fields.get('Lokalizacja (położenie)') ||
    fields.get('Lokalizacja (polozenie)') ||
    fields.get('Tytuł') ||
    fields.get('Tytul') ||
    '';
  const { address_raw, address } = parseDetailAddress(lokalizacja);
  if (!address) notes.push('parse: address not resolved');

  const status = fields.get('Status') || null;

  const wywoRaw = fields.get('Cena wywoławcza') || fields.get('Cena wywolawcza') || '';
  const starting_price_pln = parsePLN(wywoRaw) ?? null;
  if (!starting_price_pln) notes.push('parse: missing starting price');

  const nabyciaRaw = fields.get('Cena nabycia') || '';
  const final_price_pln = nabyciaRaw ? (parsePLN(nabyciaRaw) ?? null) : null;

  const terminRaw = fields.get('Termin przetargu') || '';
  const auction_date = /^\d{4}-\d{2}-\d{2}$/.test(terminRaw) ? terminRaw : null;

  let outcome = null;
  if (status) {
    if (/rozstrzygniety|rozstrzygnięty/i.test(status)) outcome = 'sold';
    else if (/nierozstrzygniety|nierozstrzygnięty|unieważnione|uniewaznione|odwolany|odwołany/i.test(status)) outcome = 'unsold';
    else if (/otwarty/i.test(status)) outcome = 'open';
  }
  if (final_price_pln != null) outcome = 'sold';

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: null,
    starting_price_pln,
    final_price_pln,
    auction_date,
    status,
    outcome,
    round: null,
    source_url: detailUrl,
    notes,
  };
}

// ---------------------------------------------------------------------------
// parseResultDoc  (registry contract function)
// ---------------------------------------------------------------------------

// crawlResultDocs() pre-serialises detail-page fields as a plain-text blob:
//   Tytul: ul. Juliana Tuwima 1/1 m 41
//   Przeznaczenie: lokal mieszkalny
//   Cena wywolawcza: 285.100,00 zl
//   Termin przetargu: 2026-08-26
//   Status: Otwarty
//   Cena nabycia: 341.600,00 zl
//   source_url: https://...

/**
 * Parse one pre-serialised result-doc text into concluded auction records.
 *
 * @param {string}      text         serialised field lines
 * @param {string|null} fallbackDate ISO date from the crawl ref
 * @param {string}      sourceUrl    detail page URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const notes = [];

  // Parse key: value lines
  const fields = new Map();
  for (const line of String(text).split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key && val) fields.set(key, val);
  }

  // Filter to flat sales only
  const przeznaczenie = fields.get('Przeznaczenie') || '';
  if (!/lokal\s+mieszkaln/i.test(przeznaczenie)) return [];

  const status = fields.get('Status') || '';
  // Skip open auctions (defensive)
  if (/^otwarty$/i.test(status.trim())) return [];

  const lokalizacja =
    fields.get('Lokalizacja (położenie)') ||
    fields.get('Lokalizacja (polozenie)') ||
    fields.get('Tytuł') ||
    fields.get('Tytul') ||
    '';
  const { address_raw, address } = parseDetailAddress(lokalizacja);
  if (!address) return [];

  const wywoRaw = fields.get('Cena wywoławcza') || fields.get('Cena wywolawcza') || '';
  const starting_price_pln = parsePLN(wywoRaw) ?? null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const nabyciaRaw = fields.get('Cena nabycia') || '';
  const final_price_pln = nabyciaRaw ? (parsePLN(nabyciaRaw) ?? null) : null;

  const terminRaw = fields.get('Termin przetargu') || '';
  const auction_date =
    (/^\d{4}-\d{2}-\d{2}$/.test(terminRaw) ? terminRaw : null) ||
    fallbackDate ||
    null;

  let outcome = 'unsold';
  let unsold_reason = 'unknown';
  if (/rozstrzygniety|rozstrzygnięty/i.test(status) && final_price_pln != null) {
    outcome = 'sold';
    unsold_reason = null;
  } else if (/rozstrzygniety|rozstrzygnięty/i.test(status) && final_price_pln == null) {
    outcome = 'unsold';
    notes.push('parse: Rozstrzygniety but no Cena nabycia');
  }
  if (!final_price_pln && outcome === 'sold') {
    notes.push('parse: missing achieved price');
  }

  const src = fields.get('source_url') || sourceUrl;

  return [{
    auction_date,
    source_pdf: src,
    kind: 'mieszkalny',
    address_raw,
    address,
    round: null,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    outcome,
    unsold_reason,
    area_m2: null,
    notes,
  }];
}
