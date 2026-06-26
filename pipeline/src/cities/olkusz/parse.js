// Olkusz parsers. WordPress posts titled by date, so the sale gate + kind come
// from the BODY. Reuses core/finn-bip.js (htmlToText, parsePLN, priceFromText,
// auctionDateFromText, roundFromText, areaFromText) + classifyKind; parcel / plot
// area / street are Olkusz-specific. Groundtruthed against the real post for dz.
// 638/25 (V przetarg, ul. Wapiennej, 627 400,00 zł, przetarg 11.04.2025).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, priceFromText, areaFromText, auctionDateFromText, roundFromText } from '../../core/finn-bip.js';

export { htmlToText };

const OFFICE_STREET_RE = /^rynek$/i; // Urząd: Rynek 1

// The "ogłasza …" summary sentence (the post title is just a date).
export function effectiveTitle(text) {
  const m = /og[łl]asza\s+([\s\S]{0,180}?)\./i.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

export function isSaleAnnouncement(text) {
  const t = (text || '').toLowerCase();
  if (/dzier[żz]aw|\bnajem\b|najmu|wynajem|bezprzetarg/.test(t)) return false;
  if (/informacj\w*\s+o\s+wynik|^\s*wykaz|zamiar\s+sprzeda/.test(t)) return false;
  return /og[łl]asza/.test(t) && /przetarg/.test(t) && /sprzeda/.test(t);
}

export function parcelFromText(text) {
  const m = /dzia[łl]k\w*\s+nr\s+(\d+(?:\/\d+)?(?:\s*(?:,|i)\s*(?:nr\s*)?\d+(?:\/\d+)?)*)\s+o\s+(?:pow|powierzchni|[łl][ąa]cznej)/i.exec(text || '');
  if (!m) return null;
  const nums = m[1].split(/\s*(?:,|i)\s*/).map((x) => x.replace(/^nr\s*/i, '').trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function plotAreaFromText(text) {
  let m = /o\s+(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(text || '');
  if (m) { const n = Number(m[1].replace(/[\s ]/g, '')); if (Number.isFinite(n) && n > 0) return n; }
  m = /([\d][\d.,\s]*)\s*ha\b/i.exec(text || '');
  if (m) { const ha = Number(m[1].replace(/\s/g, '').replace(',', '.')); if (ha > 0) return Math.round(ha * 10000); }
  return null;
}

export function landStreetFromText(text) {
  const re = /(?:przy|w\s+pobli[żz]u|w\s+rejonie)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,.]|\s+w\s+|\s+ks|\n|$)/g;
  let m; while ((m = re.exec(text || '')) !== null) { const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim(); if (s && !OFFICE_STREET_RE.test(s)) return s; }
  return null;
}

function kindFromText(eff, text) { const k = classifyKind(eff); if (k !== 'unknown') return k; return classifyKind(`${eff} ${(text || '').slice(0, 600)}`); }

export function parseAnnouncement(title, html, url) {
  const text = htmlToText(html);
  if (!isSaleAnnouncement(text)) return null;
  const eff = effectiveTitle(text);
  const kind = kindFromText(eff, text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return { kind: 'grunt', dzialka_nr, obreb: obrebFromText(text), area_m2: plotAreaFromText(text), address_raw, address: address_raw ? parseAddress(address_raw) : null, starting_price_pln, auction_date, round, detail_url: url, source_url: url };
  }

  const am = /(?:przy|w\s+pobli[żz]u)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)/i.exec(text);
  if (!am) return null;
  const flat = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  const raw = flat ? `ul. ${am[1].trim()} ${am[2]}/${flat[1]}` : `ul. ${am[1].trim()} ${am[2]}`;
  const address = parseAddress(raw); if (!address) return null;
  return { kind: kind === 'unknown' ? 'mieszkalny' : kind, address_raw: raw, address, area_m2: areaFromText(text), starting_price_pln, auction_date, round, detail_url: url };
}
