// Oświęcim parsers — MULTI-PROPERTY notices (like Kraków). Each numbered item is
// a lokal with its own cena wywoławcza + usable area; round + auction date are
// shared. Reuses core/finn-bip.js (htmlToText, parsePLN, priceFromText,
// areaFromText, roundFromText) + parseAddress + classifyKind. Groundtruthed
// against a real notice (Mały Rynek 9/4–9/6, II przetarg, 120.792 / 78.304 /
// 71.056 zł, przetarg 08.11.2011). NB: works on clean text; OCR'd scanned PDFs
// (the modern canonical path) feed the same parser with more noise.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, priceFromText, areaFromText, roundFromText } from '../../core/finn-bip.js';

export { htmlToText };

const PL_MONTH = { stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6, lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9, 'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12 };
function isoFrom(d, mo, y) { const m = PL_MONTH[String(mo).toLowerCase()]; return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null; }

// Auction date: "… odbędą się … na lokal 9/4 – 8 listopada 2011r." — the first
// DD <month> YYYY after "odbędą/odbędzie się".
export function noticeDate(text) {
  const m = /odb[ęe]d[ąa]?\s*[ąa]?\s*si[ęe][\s\S]{0,260}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  return m ? isoFrom(m[1], m[2], m[3]) : null;
}

export function isSaleAnnouncement(text) {
  const t = (text || '').toLowerCase();
  if (/dzier[żz]aw|\bnajem\b|najmu|wynajem|bezprzetarg/.test(t)) return false;
  return /og[łl]asza/.test(t) && /przetarg/.test(t) && /sprzeda/.test(t);
}

// Split a notice into numbered property items (each carries a cena wywoławcza).
export function splitItems(text) {
  const t = htmlToText(text);
  const parts = t.split(/\s\d{1,2}\.\s+/).filter((p) => /cena\s+wywo[łl]awcz/i.test(p) && /\d[\d. ]*,\d{2}\s*z[łl]/.test(p));
  return parts.length ? parts : (/cena\s+wywo[łl]awcz/i.test(t) ? [t] : []);
}

// Address: "lokal mieszkalny Mały Rynek 9/4" → "Mały Rynek 9/4".
export function addressFromItem(seg) {
  const m = /lokal\w*\s+(?:mieszkaln\w*|u[żz]ytkow\w*|niemieszkaln\w*)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)\b/.exec(seg || '');
  if (!m) return null;
  const raw = `${m[1].replace(/\s+/g, ' ').trim()} ${m[2]}/${m[3]}`;
  const a = parseAddress(raw);
  return a ? { address_raw: raw, address: a } : null;
}

function parseItem(seg, { round, auction_date, url }) {
  const addr = addressFromItem(seg);
  if (!addr) return null;
  const kind = classifyKind(seg);
  return { kind: kind === 'unknown' ? 'mieszkalny' : kind, address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(seg), starting_price_pln: priceFromText(seg), round, auction_date, detail_url: url };
}

/** Parse one announcement → an ARRAY of per-property listings (multi-property). */
export function parseAnnouncement(title, html, url) {
  const text = htmlToText(html);
  if (!isSaleAnnouncement(text)) return [];
  const round = roundFromText(text);
  const auction_date = noticeDate(text);
  return splitItems(text).map((seg) => parseItem(seg, { round, auction_date, url })).filter(Boolean);
}
