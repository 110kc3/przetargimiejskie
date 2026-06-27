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
// live (2026-06-27). The exact PDF table layout is inferred from standard
// Gdańsk municipal auction practice (born-digital, standard vocabulary):
//   VALIDATE and tune on first CI run against the real 01.07.2026 PDF.
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
  /(?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.''\- ]+?\s+\d+[A-Za-z]?(?:\s*(?:lok\.|m\.)\s*\d+[A-Za-z]?(?:[,/]\d+[A-Za-z]?)*|\s*\/\s*\d+[A-Za-z]?)?/;

// Normalise "lok. N" / "m. N" / "m.N" → "/N" so parseAddress sees the
// standard slash-separated form.
function normaliseAptSuffix(raw) {
  // "lok. 3,4A" → take first apt "3"
  return raw
    .replace(/\s+lok\.\s*(\d+[A-Za-z]?)(?:[,\/]\d+[A-Za-z]?)*/i, '/$1')
    .replace(/\s+m\.?\s*(\d+[A-Za-z]?)/i, '/$1')
    .replace(/\s+/g, ' ')
    .trim();
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
  const addrM = ADDR_RE.exec(b);
  if (!addrM) return null;
  const addressRaw = normaliseAptSuffix(addrM[0]);
  const address = parseAddress(addressRaw);
  if (!address) return null;

  // Kind — default mieszkalny for this board; detect commercial/garage
  const kind = (() => {
    const k = classifyKind(b);
    // Gdańsk oral auctions include both flats and land; classifyKind on block
    // content is reliable. Default unknown → mieszkalny (this is the flat board).
    return (k === 'unknown') ? 'mieszkalny' : k;
  })();

  // Area (m²) — areaFromText handles "pow. użytkowej", "powierzchnia użytkowa"
  const area_m2 = areaFromText(b);

  // Starting price
  const starting_price_pln = parsePLN(
    (/cen[aą]\s+wywo[łl]awcz\w*\s*(?:wynosi\w*|lokalu\s+wynosi\w*|:)?\s*([\d][\d .,]*)\s*z[łl]/i.exec(b) ||
     /wynosi\s+([\d][\d .,]*)\s*z[łl]/i.exec(b))?.[1] ?? null,
  );

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
  const round = roundFromText(text);
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
      round,
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
