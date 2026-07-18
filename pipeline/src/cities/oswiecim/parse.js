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

// ---------------------------------------------------------------------------
// Result notices ("Informacja o wyniku przetargu" — scanned PDFs → OCR text).
// Groundtruthed on dokument 52545 / attachment 52547 (ul. gen. Jarosława
// Dąbrowskiego 46/14, III przetarg 26.11.2025, 150 000 → 151 500 zł, wynik
// pozytywny). Oświęcim's template says "Cena uzyskana w wyniku przetargu"
// (not the more common "cena osiągnięta") and the OCR renders m² as m”.
// ---------------------------------------------------------------------------

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

function resultRound(t) {
  const m = /\b([ivx]{1,4})\s+przetarg/i.exec(t);
  return m ? (ROMAN[m[1].toLowerCase()] ?? null) : null;
}

function resultPrice(t, labelRe) {
  const m = new RegExp(labelRe + String.raw`[\s\S]{0,80}?(\d[\d .]*,\d{2})\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}

// "sprzedaż lokalu mieszkalnego przy ul. gen. Jarosława Dąbrowskiego 46/14"
function resultAddress(t) {
  const m = /lokalu?\s+mieszkaln\w*(?:\s+nr\s+\d+\w*)?\s+(?:po[łl]o[żz]on\w*\s+)?przy\s+ul\.?\s+([A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]{2,60}?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)\b/.exec(t);
  if (!m) return null;
  const raw = `${m[1].replace(/\s+/g, ' ').trim()} ${m[2]}/${m[3]}`;
  const a = parseAddress(raw);
  return a ? { address_raw: raw, address: a } : null;
}

/** Parse one OCR'd result notice → result records (belchatow contract). */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = htmlToText(String(text));

  if (!/informacj\w*\s+o\s+wynik/i.test(t)) return [];
  // Flats only — land/commercial/lease result notices are out of scope.
  if (/dzia[łl]k|lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)|dzier[żz]aw|\bnajem\b/i.test(t) && !/lokalu?\s+mieszkaln/i.test(t)) return [];
  if (!/lokalu?\s+mieszkaln/i.test(t)) return [];

  const addr = resultAddress(t);
  if (!addr) return [];

  let auction_date = fallbackDate ?? null;
  const dM1 = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  const dM2 = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(t);
  if (dM1 && isoFrom(dM1[1], dM1[2], dM1[3])) auction_date = isoFrom(dM1[1], dM1[2], dM1[3]);
  else if (dM2) auction_date = `${dM2[3]}-${String(dM2[2]).padStart(2, '0')}-${String(dM2[1]).padStart(2, '0')}`;

  const starting_price_pln = resultPrice(t, String.raw`cena\s+wywo[łl]awcza`);
  const final_price_pln = resultPrice(t, String.raw`cena\s+(?:uzyskana|osi[ąa]gni[ęe]ta|nabycia)`);

  const unsold = /wynikiem\s+negatywn|nikt\s+nie\s+przyst[ąa]pi|brak\s+(?:oferent|uczestnik|wp[łl]at\w*\s+wadium)/i.test(t);
  const outcome = unsold ? 'unsold' : final_price_pln != null ? 'sold' : 'open';
  // No outcome signal at all (bad OCR of the price line, no negative clause) —
  // skip rather than emit a price-less "open" record for a concluded auction.
  if (!unsold && final_price_pln == null) return [];

  const areaM = /o\s+pow\.?(?:ierzchni)?\s*(?:u[żz]ytkowej\s*)?(\d+[,.]\d+)\s*m/i.exec(t);

  return [{
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaM ? Number(areaM[1].replace(',', '.')) : null,
    round: resultRound(t),
    starting_price_pln,
    final_price_pln,
    auction_date,
    outcome,
    unsold_reason: unsold ? (/wadium/i.test(t) ? 'brak wpłaty wadium' : 'wynik negatywny') : null,
    source_pdf: sourceUrl,
    notes: [],
  }];
}
