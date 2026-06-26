// Opole parsers (SISCO BIP, server-rendered articles). Reuses core/finn-bip.js
// (htmlToText, parsePLN, priceFromText, auctionDateFromText, roundFromText) +
// classifyKind; flat area ("o łącznej pow. 68,38m2") + the office-safe address
// (anchored after "na sprzedaż") are Opole-specific. Groundtruthed against the
// real article (flat nr 2, ul. Rynek 3, 624.000,00 zł, przetarg 28.01.2026).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, priceFromText, auctionDateFromText, roundFromText } from '../../core/finn-bip.js';

export { htmlToText };

// Everything after "na sprzedaż" — the office "Rynek 1A" / "Plac Wolności 7-8"
// addresses appear later but are never "przy ul.", so a "przy ul." match in this
// clause is the property.
function saleClause(text) { const m = /na\s+sprzeda[zż]\s*([\s\S]+)/i.exec(text || ''); return m ? m[1] : (text || ''); }

export function isSaleAnnouncement(text) {
  const t = (text || '').toLowerCase();
  if (/dzier[żz]aw|\bnajem\b|najmu|wynajem|bezprzetarg/.test(t)) return false;
  if (/^\s*wykaz|zamiar\s+sprzeda/.test(t)) return false;
  return /og[łl]asza/.test(t) && /przetarg/.test(t) && /sprzeda/.test(t);
}

// Flat usable area: "o łącznej pow. 68,38m2" / "o pow. 68,38 m2" (m², not ha).
// Flat usable area: "o łącznej pow. 95,38m2" / "o powierzchni użytkowej 47,00 m2".
// Takes the LARGEST plausible (>=8 m2) "pow … N m2" that is NOT a land-share /
// grunt / common area — a flat is always bigger than its cellar/komórka, so the
// ancillary (which caused cellar-area + insane-m2 errors) can never win. Land
// share is in ha (skipped); if no plausible flat area is found, returns null
// (a missing area is a WARN, never the cellar).
export function flatAreaFromText(text) {
  const t = text || '';
  const re = /pow(?:ierzchni)?\w*\.?\s+(?:[a-ząćęłńóśźż]+\s+){0,2}(\d+(?:[.,]\d+)?)\s*m\s*[²2](?!\w)/gi;
  const cands = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 55), m.index);
    if (/udzia[łl]|gruntu?\b|dz\.\s*nr|dzia[łl]k|wsp[óo]ln|piwnic|kom[óo]rk|przynale[żz]|gospodarcz|strych|gara[żz]/i.test(before)) continue;
    const n = Number(m[1].replace(',', '.'));
    if (Number.isFinite(n) && n >= 8 && n < 1e5) cands.push(n);
  }
  return cands.length ? Math.max(...cands) : null;
}
// Plot parcel + obręb + ha area (land).
export function parcelFromText(text) { const m = /dz(?:ia[łl]k\w*)?\.?\s+nr\s+(\d+(?:\/\d+)?(?:\s*(?:,|i)\s*\d+(?:\/\d+)?)*)/i.exec(text || ''); if (!m) return null; const nums = m[1].split(/\s*(?:,|i)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x)); return nums.length ? nums.join(', ') : null; }
export function obrebFromText(text) { const m = /obr[ęe]b\w*\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+)?)/.exec(text || ''); return m ? m[1].trim() : null; }
export function haAreaFromText(text) { const m = /([\d][\d.,\s]*)\s*ha\b/i.exec(text || ''); if (!m) return null; const ha = Number(m[1].replace(/\s/g, '').replace(',', '.')); return ha > 0 ? Math.round(ha * 10000) : null; }

const ADDR_RE = /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)\b/;
export function flatAddressFromText(text) {
  const c = saleClause(text);
  const sm = ADDR_RE.exec(c);
  if (!sm) return null;
  const street = sm[1].replace(/\s+/g, ' ').trim();
  const apt = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(c) || /lokal\w*\s+(?:u[żz]ytkow\w*|niemieszkaln\w*)\s+nr\s+(\d+[A-Za-z]?)/i.exec(c);
  return apt ? `ul. ${street} ${sm[2]}/${apt[1]}` : `ul. ${street} ${sm[2]}`;
}
export function landStreetFromText(text) {
  const m = /(?:przy|rejon\w*|w\s+rejonie)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,.]|\s+w\s+|\s+o\s+pow|\n|$)/.exec(saleClause(text));
  return m ? m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim() : null;
}

function kindFromText(text) { const c = saleClause(text); return classifyKind(c.slice(0, 300)); }

export function parseAnnouncement(title, html, url) {
  const text = htmlToText(html);
  if (!isSaleAnnouncement(text)) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return { kind: 'grunt', dzialka_nr, obreb: obrebFromText(text), area_m2: haAreaFromText(text), address_raw, address: address_raw ? parseAddress(address_raw) : null, starting_price_pln, auction_date, round, detail_url: url, source_url: url };
  }
  const raw = flatAddressFromText(text);
  if (!raw) return null;
  const address = parseAddress(raw); if (!address) return null;
  return { kind: kind === 'unknown' ? 'mieszkalny' : kind, address_raw: raw, address, area_m2: flatAreaFromText(text), starting_price_pln, auction_date, round, detail_url: url };
}
