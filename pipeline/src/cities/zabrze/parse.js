// Zabrze parsers.
//
// Two layers:
//   1. Title parsers — round + auction date from the list title
//      ("Ogłoszenie o II ustnych … przetargach … na dzień 18.06.2026 r.").
//      These are reliable (read straight from the server-rendered list).
//   2. parseAnnouncementText — extracts the per-flat (address / area /
//      starting price) rows from the announcement attachment's extracted text.
//
// ⚠️ parseAnnouncementText is BEST-EFFORT, written without a real sample
// attachment (the file was unreachable during the spike — see config.js). It
// uses the standard Polish ogłoszenie vocabulary (the same boilerplate the
// Gliwice parser anchors on: "przy ul. <street> <bldg>/<apt>", "o powierzchni
// … m²", "cena wywoławcza … zł"), tolerant of both a `pdftotext -layout` table
// (linearised rows) and prose. VALIDATE + TUNE against the first real CI run.

import { parseAddress } from '../../core/normalize.js';

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

/** "Ogłoszenie o II ustnych … na dzień 18.06.2026 r." → 2 */
export function roundFromTitle(title) {
  const t = title || '';
  // Word ordinals first (some titles spell them out).
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrugi|\bdrugich|\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  // Roman numeral immediately before "ustn…" ("o II ustnych …").
  const m = /\bo\s+(VI{0,3}|IV|I{1,3}|V)\s+ustn/i.exec(t);
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  if (/\bustn\w+\s+(?:nieograniczon\w+\s+)?przetarg/i.test(t)) return 1;
  return null;
}

/** "… na dzień 18.06.2026 r." → "2026-06-18" (ISO). */
export function auctionDateFromTitle(title) {
  const m = /na\s+dzie[ńn]\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(title || '');
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// "253.620,00" / "97 000 zł" / "46500,00" → integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = numStr.replace(/\s/g, '').replace(/[:;]/g, '.');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

// "52,40" / "52.40" → 52.4
function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function classifyKind(s) {
  const t = (s || '').toLowerCase();
  if (/niemieszkaln/.test(t)) return 'uzytkowy';
  if (/mieszkaln/.test(t)) return 'mieszkalny';
  if (/u[żz]ytkow/.test(t)) return 'uzytkowy';
  return 'mieszkalny'; // this board is the "Lokale mieszkalne" category
}

// Address inside the announcement body: "… przy ul. <street> <bldg>[/<apt>]"
// (also al./pl./os.). Street may contain Polish letters, spaces, dots, hyphens
// and may *start with a digit* (Polish streets like "3 Maja", "11 Listopada").
const ADDR_RE =
  /(?:przy\s+)?(?:ul|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)/g;

const AREA_RE = /(?:o\s+)?(?:powierzchni(?:\s+u[żz]ytkowej)?|pow\.?)\s*(?:wynosz\w+\s*)?[:\s]*([\d]+(?:[.,]\d+)?)\s*m\s?(?:2|²|kw)/i;
const PRICE_RE = /cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d .,]+?)\s*z[łl]/i;

/**
 * Extract per-flat rows from one announcement's attachment text.
 * Strategy: each flat is anchored by its street address; area + starting price
 * are taken from a window of text following the address (covers both a
 * linearised table row and a prose sentence).
 * @param {string} text  extracted attachment text
 * @returns {Array<{address_raw:string, address:object|null, kind:string, area_m2:number|null, starting_price_pln:number|null}>}
 */
export function parseAnnouncementText(text) {
  if (!text) return [];
  const flat = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const out = [];
  const seen = new Set();
  ADDR_RE.lastIndex = 0;
  let m;
  while ((m = ADDR_RE.exec(flat)) !== null) {
    const addressRaw = m[1].trim().replace(/\s+/g, ' ');
    const address = parseAddress(addressRaw);
    if (!address) continue;
    if (seen.has(address.key)) continue;
    seen.add(address.key);
    // Forward window (area + price come *after* the address): from this address
    // up to the next address (or 400 chars).
    const start = m.index + m[0].length;
    ADDR_RE.lastIndex = start;
    const n = ADDR_RE.exec(flat);
    const next = n ? n.index : Math.min(flat.length, m.index + 400);
    ADDR_RE.lastIndex = start; // restore for the outer loop
    const windowText = flat.slice(m.index, Math.max(next, m.index + 60));
    // Kind word ("lokal mieszkalny" / "niemieszkalny") sits *before* the
    // address in each row — read a short preceding window; default to
    // mieszkalny (this is the "Lokale mieszkalne" board).
    const preceding = flat.slice(Math.max(0, m.index - 60), m.index);
    out.push({
      address_raw: addressRaw,
      address,
      kind: classifyKind(preceding),
      area_m2: parseArea(AREA_RE.exec(windowText)?.[1]),
      starting_price_pln: parsePLN(PRICE_RE.exec(windowText)?.[1]),
    });
  }
  return out;
}

// Contract stub — Zabrze has no separate results stream; crawlResultDocs()
// returns [], so this is never invoked. Present only to satisfy the registry.
export function parseResultDoc(_text, _date, _url) {
  return [];
}
