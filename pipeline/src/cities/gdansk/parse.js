// Gdańsk parsers — batch-PDF announcement notices.
//
// The Gdańsk Wydział Skarbu publishes one born-digital PDF per auction batch
// (one per auction date) at download.cloudgdansk.pl. Each PDF bundles multiple
// properties in a numbered table. The table layout (confirmed from the
// announcement page for 2026-07-01) follows the standard Polish przetarg
// vocabulary used by city-treasury bodies:
//
//   "OGŁOSZENIE O PRZETARGACH NIEOGRANICZONYCH USTNYCH NA SPRZEDAŻ
//    NIERUCHOMOŚCI STANOWIĄCYCH WŁASNOŚĆ GMINY MIASTA GDAŃSKA ODBYWAJĄCYCH
//    SIĘ W DNIU DD.MM.RRRR R."
//
// Each property block in the PDF contains:
//   - Address: "ul. <Street> <bldg> lok. <apt>" or "ul. <Street> <bldg> m. <apt>"
//   - Flat usable area: "o pow. użytkowej … m²" or "powierzchnia użytkowa … m²"
//   - Starting price: "cena wywoławcza … zł" or "cena wywoławcza wynosi … zł"
//
// The parser is groundtruthed against the announcement URL structure confirmed
// live (2026-06-27) and the wide PDF tables published for the 30.09.2026 and
// 26.10.2026 auctions (validated 2026-08-23).
//
// Result notices: the result PDF format is unconfirmed (wyniki URL unknown).
// parseResultDoc is a stub that returns [] until the result section is found.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, areaFromText } from '../../core/finn-bip.js';

export { htmlToText };

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "ODBYWAJĄCYCH SIĘ W DNIU 01.07.2026 R." → "2026-07-01"
// Also handles "w dniu 01 lipca 2026 r." (spelled month form)
export function auctionDateFromText(text) {
  if (!text) return null;
  // Current batch PDFs open with "zaprasza do uczestnictwa w dniu 30
  // września 2026 r.". Prefer that heading over historic auction dates later
  // in the per-row notes ("po bezskutecznym przetargu w dniu 01.07.2026").
  const headingM =
    /(?:uczestnictwa|udzia[łl]u)\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text.slice(0, 2000));
  if (headingM) {
    const mo = PL_MONTH[headingM[2].toLowerCase()];
    if (mo) return `${headingM[3]}-${String(mo).padStart(2, '0')}-${headingM[1].padStart(2, '0')}`;
  }
  // Numeric: "W DNIU DD.MM.YYYY" or "W DNIU DD.MM.YYYY R."
  const numM =
    /W\s+DNIU\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text) ||
    /odb[ęe]d[ąa]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text) ||
    /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) {
    const [, d, mo, y] = numM;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Spelled month
  const splM =
    /odb[ęe]d[ąa]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text) ||
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (splM) {
    const mo = PL_MONTH[splM[2].toLowerCase()];
    if (mo) return `${splM[3]}-${String(mo).padStart(2, '0')}-${splM[1].padStart(2, '0')}`;
  }
  return null;
}

// Round from the PDF title line or body.
// Gdańsk titles typically say "PRZETARG USTNY NIEOGRANICZONY" without ordinal
// (always first round unless marked otherwise), but some rounds have Roman
// numerals: "II PRZETARG USTNY". Default: 1.
export function roundFromText(text) {
  if (!text) return 1;
  const t = text;
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  // Roman before "przetarg": "II PRZETARG"
  const m = /\b(VI{0,3}|IV|I{1,3}|V)\s+PRZETARG/i.exec(t);
  if (m) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return ROMAN[m[1].toUpperCase()] ?? 1;
  }
  return 1;
}

// ---- Per-property block parser --------------------------------------------
//
// Gdańsk PDF format (born-digital, standard municipal auction vocabulary).
// Each block is anchored on the address line — typically:
//   "ul. Kaprów 15 lok. 5" / "ul. Kaprów 15 m. 5" / "ul. Kaprów 15/5"
//
// Area: "o pow. użytkowej XX,XX m²" or via core areaFromText()
// Price: "cena wywoławcza XX.XXX,XX zł" or "wynosi XX.XXX,XX zł"
// Kind: classifyKind on the block text (default: mieszkalny for this board)

// Address patterns in Gdańsk announcements:
//   "ul. Kaprów 15 lok. 5"      → street=Kaprów, bldg=15, apt=5
//   "ul. Kaprów 15 m. 5"        → street=Kaprów, bldg=15, apt=5
//   "ul. Kaprów 15 m.5"         → same
//   "ul. Kaprów 15/5"           → street=Kaprów, bldg=15, apt=5
//   "ul. Ks. M. Góreckiego 8 lok. 3,4A" → multi-unit notice, take first
const ADDR_RE =
  /(?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.''\- ]+?\s+\d+[A-Za-z]?(?:\s*(?:lok\.?|lokal(?:u)?\s+nr|m\.)\s*\d+[A-Za-z]?(?:[,/]\d+[A-Za-z]?)*|\s*\/\s*\d+[A-Za-z]?)?/;

// Normalise "lok. N" / "m. N" / "m.N" → "/N" so parseAddress sees the
// standard slash-separated form.
function normaliseAptSuffix(raw) {
  // "lok. 3,4A" → take first apt "3"
  return raw
    .replace(/\s+(?:lok\.?|lokal(?:u)?\s+nr)\s*(\d+[A-Za-z]?)(?:[,\/]\d+[A-Za-z]?)*/i, '/$1')
    .replace(/\s+m\.?\s*(\d+[A-Za-z]?)/i, '/$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// pdftotext -layout preserves table columns, but long addresses can wrap over
// several lines. Keep only the first (location) column and join the street line
// to the first line containing "lokal nr":
//   "ul. Opata Jacka" + "Rybińskiego 6 lokal nr 7"
//   "ul. Na Zaspę 34B" + "lokal nr 6"
function tableAddress(block) {
  const leftColumn = (line) => line.trim().split(/\s{2,}/, 1)[0].trim();
  const lines = block.split('\n');
  const aptIndex = lines.findIndex((line) => /\blokal(?:u)?\s+nr\b/i.test(leftColumn(line)));
  if (aptIndex < 0) return null;

  const aptLine = leftColumn(lines[aptIndex]);
  if (/^(?:ul|al|pl|os)\.?\s/i.test(aptLine)) return aptLine;

  for (let i = aptIndex - 1; i >= 0; i--) {
    const streetLine = leftColumn(lines[i]);
    if (/^(?:ul|al|pl|os)\.?\s/i.test(streetLine)) {
      return `${streetLine} ${aptLine}`;
    }
  }
  return null;
}

/**
 * Split PDF text into per-property blocks.
 * Gdańsk PDFs use numbered list items ("1.", "2.", …) as block delimiters.
 * Each item is preceded by its ordinal on its own line or inline.
 * We split on "^\d+\." anchored at the start of a line (or after a newline).
 * Only blocks that contain a price ("cena wywoławcza" / "cena wywoł…")
 * are kept — this filters out the boilerplate header/footer numbered items.
 *
 * @param {string} text  pdftotext -layout output
 * @returns {string[]}
 */
export function splitBlocks(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');

  // Live 2026-09/10 PDFs are wide tables: land comes first, followed by a
  // distinct NIERUCHOMOŚCI LOKALOWE section. pdftotext emits each local row
  // beginning with its "Gdańsk – <district>" location, while the numeric row
  // marker appears later in the same row. Slice away land, then split on those
  // location anchors. If the local section exists but is empty, return []
  // rather than falling back to parsing the land table as a flat.
  const localM = /NIERUCHOMOŚCI\s+LOKALOWE\s*:/i.exec(t);
  if (localM) {
    let local = t.slice(localM.index + localM[0].length);
    const footer = /\nWarunkiem\s+wzi[ęe]cia\s+udzia[łl]u/i.exec(local);
    if (footer) local = local.slice(0, footer.index);
    const starts = [...local.matchAll(/^\s*Gda[ńn]sk\s+[\-–]\s+/gmi)];
    const blocks = [];
    for (let i = 0; i < starts.length; i++) {
      // The first row's price/wadium columns can be emitted before its
      // "Gdańsk – <district>" cell, so retain the local-table prelude.
      const start = i === 0 ? 0 : starts[i].index;
      const end = i + 1 < starts.length ? starts[i + 1].index : local.length;
      const block = local.slice(start, end).trim();
      if (/\blokal(?:u)?\s+nr\b/i.test(block) && /z[łl]/i.test(block)) blocks.push(block);
    }
    return blocks;
  }

  // Split on numbered list markers at line start
  const parts = t.split(/(?:^|\n)(\d{1,2})\.\s+/m);
  // parts: [before, num, block, num, block, …]
  const blocks = [];
  for (let i = 1; i < parts.length; i += 2) {
    const block = (parts[i + 1] || '').trim();
    if (/cen[aą]\s+wywo[łl]awcz/i.test(block)) {
      blocks.push(block);
    }
  }
  // Fallback: if no numbered splits found (single-property PDF or different
  // layout), treat the whole text as one block when it has a price.
  if (blocks.length === 0 && /cen[aą]\s+wywo[łl]awcz/i.test(t)) {
    blocks.push(t);
  }
  return blocks;
}

/**
 * Parse one property block from a Gdańsk announcement PDF.
 * @param {string} block
 * @returns {null | {kind, address_raw, address, area_m2, starting_price_pln}}
 */
export function parseBlock(block) {
  if (!block) return null;
  const b = block.replace(/\r/g, '');

  // Extract address
  // Wide tables wrap long streets before the building number; flatten only
  // for address recognition while keeping the original layout for fields.
  const tableAddressRaw = tableAddress(b);
  const addrM = tableAddressRaw ? null : ADDR_RE.exec(b.replace(/\s+/g, ' '));
  const rawAddress = tableAddressRaw ?? addrM?.[0];
  if (!rawAddress) return null;
  const addressRaw = normaliseAptSuffix(rawAddress);
  const address = parseAddress(addressRaw);
  if (!address) return null;

  // Kind — default mieszkalny for this board; detect commercial/garage
  const kind = (() => {
    // Local-table rows also contain cadastral "Działka nr" metadata, which
    // would make classifyKind call the whole row land despite its "lokal nr".
    if (/\blokal(?:u)?\s+nr\b/i.test(b)) return 'mieszkalny';
    const k = classifyKind(b);
    // Gdańsk oral auctions include both flats and land; classifyKind on block
    // content is reliable. Default unknown → mieszkalny (this is the flat board).
    return (k === 'unknown') ? 'mieszkalny' : k;
  })();

  // In the live wide table, the first decimal m2 value is the unit area; later
  // prose may name a cellar area and would otherwise win areaFromText's more
  // semantic pattern. The reconstructed/older prose format keeps its fallback.
  // The retained first-row prelude can mention a cellar belonging to the row;
  // the unit-area cell itself is emitted after the address/"lokal nr" cell.
  const tableRowStart = /\blokal(?:u)?\s+nr\b/i.exec(b)?.index ?? 0;
  const tableAreaM = /(\d{1,3},\d{2})\s*m(?:2|²)/i.exec(b.slice(tableRowStart));
  const area_m2 = tableAreaM ? Number(tableAreaM[1].replace(',', '.')) : areaFromText(b);

  // Starting price
  const labelledPrice =
    (/cen[aą]\s+wywo[łl]awcz\w*\s*(?:wynosi\w*|lokalu\s+wynosi\w*|:)?\s*([\d][\d .,]*)\s*z[łl]/i.exec(b) ||
     /wynosi\s+([\d][\d .,]*)\s*z[łl]/i.exec(b))?.[1] ?? null;
  // The live table prints the heading once, outside every row. Column order in
  // extracted text varies: price may occur before the location, with wadium
  // and minimum increment on either side. The starting price is the largest
  // PLN amount in a row.
  const tablePrices = [...b.matchAll(/(\d{1,3}(?:[ .]\d{3})+(?:,\d{2})?|\d{4,}(?:,\d{2})?)\s*z[łl]/gi)]
    .map((match) => parsePLN(match[1]))
    .filter(Number.isFinite);
  const tablePrice = tablePrices.length > 0 ? Math.max(...tablePrices) : null;
  const starting_price_pln = parsePLN(labelledPrice) ?? tablePrice;

  return {
    kind,
    address_raw: addressRaw,
    address,
    area_m2,
    starting_price_pln,
  };
}

/**
 * Parse an entire Gdańsk announcement PDF text into per-property listings.
 * @param {string} text  pdftotext -layout output
 * @param {{ detail_url?: string, source_url?: string }} [opts]
 * @returns {Array<object>}
 */
export function parseAnnouncementPdf(text, opts = {}) {
  if (!text) return [];
  const auction_date = auctionDateFromText(text);
  const blocks = splitBlocks(text);
  const out = [];
  const seen = new Set();
  for (const block of blocks) {
    const rec = parseBlock(block);
    if (!rec) continue;
    const key = rec.address?.key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind: rec.kind,
      address_raw: rec.address_raw,
      address: rec.address,
      area_m2: rec.area_m2,
      starting_price_pln: rec.starting_price_pln,
      auction_date,
      round: roundFromText(block),
      detail_url: opts.detail_url ?? null,
      source_url: opts.source_url ?? null,
    });
  }
  return out;
}

// ---- Result notices -------------------------------------------------------
//
// The result-notice URL pattern on bip.gdansk.pl was NOT confirmed during the
// spike (2026-06-27). The procedure page (,a,44430) confirms that "informacja
// o wyniku przetargu" is published on the BIP notice board, but the exact
// section URL is unknown. crawlResultDocs() returns [] until the pattern is
// confirmed on a CI run; then parseResultDoc will be wired up.
//
// When the result section is found, the expected PDF vocabulary is:
//   "INFORMACJA O WYNIKACH PRZETARGÓW NIEOGRANICZONYCH USTNYCH …
//    PRZEPROWADZONYCH W DNIU DD.MM.YYYY R."
// with per-property blocks giving achieved price ("cena uzyskana w przetargu
// wyniosła … zł") or negative outcome ("wynik negatywny" / "bez rozstrzygnięcia").

/**
 * Parse one result PDF text into concluded auction records.
 * STUB — not yet wired up (result URL unconfirmed). Returns [].
 * @param {string} _text
 * @param {string|null} _fallbackDate
 * @param {string} _sourceUrl
 * @returns {Array}
 */
export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  // TODO: implement once the result-notice BIP section URL is confirmed on CI.
  // Expected trigger: /INFORMACJA\s+O\s+WYNIK/i.test(_text)
  return [];
}
