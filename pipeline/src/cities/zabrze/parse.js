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

// The real Zabrze announcement (a text PDF) is a numbered table — one block per
// flat — e.g.:
//
//   1. adres: ul. Ks. Bolesława Domańskiego 4/6
//   działka: nr 4129/50 pow.: 1.377 m2 księga wieczysta nr GL1Z/00019567/1
//   opis lokalu: położenie: I piętro pow.: 26,74 m2 pomieszczenia: …
//   Cena wywoławcza: 37.000,00 zł
//   Wysokość wadium: 1.900,00 zł
//
// So we split on the per-flat "adres:" label (which appears only in the flat
// blocks, never in the boilerplate — this also avoids the office addresses
// "ul. Powstańców Śląskich 5-7" etc. that a generic address scan would wrongly
// pick up). The block has TWO `pow.:` values: the *plot* (działka) first and the
// *flat* (opis lokalu) second — we take the flat one.

// The address token within the "adres:" line. The capture group excludes the
// ul./al./pl. prefix; the full match (am[0]) keeps it for parseAddress.
const ADDR_IN_LINE =
  /(?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?/;
// In the real pdftotext -layout output the "w tym: …%" cell lands BETWEEN
// "Cena" and "wywoławcza:", so we anchor on the second word "wywoławcza" — the
// starting price ("37.000,00 zł") follows it directly.
const PRICE_RE = /wywo[łl]awcza\s*:?\s*([\d][\d .,]*?)\s*z[łl]/i;
const POW_RE = /pow\.?\s*:?\s*([\d.,]+)\s*m\s?(?:2|²|kw)?/gi;

// Flat area for one block. Each block has several "pow.: X m²" values — the
// PLOT (działka), the FLAT (opis lokalu), and sometimes a cellar/komórka
// (pomieszczenie przynależne). We:
//   - look only at the flat's own section (before "Cena"/"Wysokość wadium"),
//     so boilerplate plot areas further down don't leak in;
//   - drop the value inside the "działka … opis lokalu" span (the plot);
//   - take the LARGEST of the rest (the flat is bigger than its cellar).
// This is more robust to layout drift than "first pow after opis lokalu".
function flatAreaFromBlock(block) {
  const cut = block.search(/Wysoko[śs][ćc]\s+wadium|Cena\b/i);
  const region = cut > 0 ? block.slice(0, cut) : block;
  const dz = region.search(/dzia[łl]k/i);
  const opis = region.search(/opis\s+lokalu/i);
  const cands = [];
  POW_RE.lastIndex = 0;
  let m;
  while ((m = POW_RE.exec(region)) !== null) {
    const v = parseArea(m[1]);
    if (v == null) continue;
    const inPlot = dz >= 0 && opis > dz && m.index > dz && m.index < opis;
    if (inPlot) continue;
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

/**
 * Extract per-flat rows from one announcement's attachment text.
 * @param {string} text  extracted attachment text (pdftotext)
 * @returns {Array<{address_raw:string, address:object|null, kind:string, area_m2:number|null, starting_price_pln:number|null}>}
 */
export function parseAnnouncementText(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const starts = [...t.matchAll(/adres\s*:/gi)].map((m) => m.index);
  if (starts.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < starts.length; i++) {
    const block = t.slice(starts[i], starts[i + 1] ?? t.length);
    const addrLine = (/adres\s*:?\s*([^\n]+)/i.exec(block)?.[1] || '').trim();
    const am = ADDR_IN_LINE.exec(addrLine);
    if (!am) continue;
    const addressRaw = am[0].replace(/\s+/g, ' ').trim();
    const address = parseAddress(addressRaw);
    if (!address || seen.has(address.key)) continue;
    seen.add(address.key);

    out.push({
      address_raw: addressRaw,
      address,
      kind: classifyKind(block),
      area_m2: flatAreaFromBlock(block),
      starting_price_pln: parsePLN(PRICE_RE.exec(block)?.[1]),
    });
  }
  return out;
}

// Contract stub — Zabrze has no separate results stream; crawlResultDocs()
// returns [], so this is never invoked. Present only to satisfy the registry.
export function parseResultDoc(_text, _date, _url) {
  return [];
}
