// Kraków parsers — MULTI-PROPERTY notices. Each ?news_id article is a numbered
// list of properties; the auction date is shared. Groundtruthed against real
// notices (verified 2026-06-26): news_id 245809 (announcement: garaż G12 ul.
// Królewska 69 + udział działki 169/16) and 249643 (result: same two, garaż sold
// 114 000 → 130 000, udział negatywny). Reuses core/finn-bip.js (htmlToText,
// parsePLN, areaFromText) + classifyKind + parseAddress.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, areaFromText } from '../../core/finn-bip.js';

export { htmlToText };

const PL_MONTH = { stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6, lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9, 'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12 };
function isoFrom(d, mo, y) { const m = PL_MONTH[String(mo).toLowerCase()]; return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null; }

// Auction date. Announcement: "Przetargi … odbędą się w dniu 15 kwietnia 2026 r."
// (+ title "Termin przetargu: 15 kwietnia 2026 r."). Result: "W dniu 15 kwietnia
// 2026 r. w siedzibie … przeprowadzone zostały" / header "z dnia 15 kwietnia 2026".
export function noticeDate(text, { isResult = false } = {}) {
  const t = text || '';
  if (isResult) {
    const m = /W\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+w\s+siedzibie/i.exec(t)
      || /z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
    return m ? isoFrom(m[1], m[2], m[3]) : null;
  }
  const m = /odb[ęe]d[ąa]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t)
    || /Termin\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  return m ? isoFrom(m[1], m[2], m[3]) : null;
}

// Split a notice body into numbered property items (each carries a cena wywoławcza
// amount). htmlToText flattens newlines, so split on " N. " markers and keep only
// price-bearing segments (drops the header + boilerplate numbered lists).
export function splitItems(text) {
  const t = htmlToText(text);
  return t.split(/\s\d{1,2}\.\s+/).filter((p) => /cena\s+wywo[łl]awcz/i.test(p) && /\d[\d\s .]*,\d{2}\s*z[łl]/.test(p));
}

const ROUND_WORD = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6 };
export function roundFromItem(seg) { const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(seg || ''); return m ? ROUND_WORD[m[1].toLowerCase()] ?? null : null; }
export function priceFromItem(seg) { const m = /cena\s+wywo[łl]awcz\w*(?:\s+[a-ząćęłńóśźż]+)?\s+wynosi[a-ząćęłńóśźż]*\s*:?\s*([\d][\d\s .]*,\d{2})\s*z[łl]/i.exec(seg || ''); return m ? parsePLN(m[1]) : null; }
export function achievedFromItem(seg) { const m = /zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+([\d][\d\s .]*,\d{2})\s*z[łl]/i.exec(seg || ''); return m ? parsePLN(m[1]) : null; }
export function parcelFromItem(seg) {
  const m = /(?:nr\.?|numer\w*)\s+dzia[łl]ki\s+(\d+(?:\/\d+)?)/i.exec(seg || '') || /dzia[łl]k\w*\s+(?:nr\.?|numer\w*)\s+(\d+(?:\/\d+)?)/i.exec(seg || '');
  return m ? m[1] : null;
}
export function obrebFromItem(seg) { const m = /w\s+obr[ęe]bie\s+([A-Z]-?\d+[A-Za-z]?|[A-ZŻŹĆŁŚ][\w-]+)/.exec(seg || ''); return m ? m[1] : null; }
export function haAreaFromItem(seg) { const m = /(\d+[.,]\d+|\d+)\s*ha\b/i.exec(seg || ''); if (!m) return null; const ha = Number(m[1].replace(',', '.')); return ha > 0 ? Math.round(ha * 10000) : null; }

const OFFICE = /podg[óo]rsk|kasprowicz|wszystkich\s+[śs]wi[ęe]t|mogilsk|rynek/i;
export function landStreet(seg) {
  const re = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+(?:w\s+Krakowie\s+)?przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń. -]+?)(?=\s*[,.]|\s+Nr\b|\n|$)/g;
  let m; while ((m = re.exec(seg || '')) !== null) { const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim(); if (s && !OFFICE.test(s)) return s; }
  return null;
}

// Built unit (flat / commercial / garage): "w budynku przy ul. Królewskiej Nr 69";
// garage unit "oznaczonego Nr G12" → "ul. Królewskiej 69 garaż nr 12".
export function builtAddress(seg) {
  const sm = /(?:w\s+budynku\s+)?(?:po[łl]o[żz]on\w+\s+)?przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń. -]+?)\s+Nr\s+(\d+[A-Za-z]?)/i.exec(seg || '');
  if (!sm) return null;
  const street = sm[1].replace(/\s+/g, ' ').trim();
  const building = sm[2];
  const garage = /oznaczon\w*\s+Nr\s+G\s?(\d+)/i.exec(seg || '');
  if (garage) { const raw = `ul. ${street} ${building} garaż nr ${garage[1]}`; const a = parseAddress(raw); return a ? { address_raw: raw, address: a } : null; }
  const flat = /lokal\w*\s+mieszkaln\w*\s+(?:nr\.?|numer\w*)\s+(\d+[A-Za-z]?)/i.exec(seg || '');
  const raw = flat ? `ul. ${street} ${building}/${flat[1]}` : `ul. ${street} ${building}`;
  const a = parseAddress(raw); return a ? { address_raw: raw, address: a } : null;
}

function parseItem(seg, { isResult, auction_date, url }) {
  const kind = classifyKind(seg || '');
  const round = roundFromItem(seg);
  const starting_price_pln = priceFromItem(seg);
  const achieved = isResult ? achievedFromItem(seg) : null;
  const wrap = (base) => isResult
    ? { auction_date, source_pdf: url, ...base, final_price_pln: achieved != null ? achieved : null, outcome: achieved != null ? 'sold' : 'unsold', unsold_reason: achieved != null ? null : 'unknown', notes: [] }
    : { ...base, auction_date, detail_url: url, source_url: url };

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromItem(seg);
    const street = landStreet(seg);
    if (!dzialka_nr && !street) return null;
    return wrap({ kind: 'grunt', dzialka_nr, obreb: obrebFromItem(seg), area_m2: haAreaFromItem(seg), address_raw: street ? `ul. ${street}` : null, round, starting_price_pln });
  }
  const addr = builtAddress(seg);
  if (!addr) return null;
  return wrap({ kind: kind === 'unknown' ? 'mieszkalny' : kind, address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(seg), round, starting_price_pln });
}

export function parseNotice(text, { isResult = false, url = null } = {}) {
  const auction_date = noticeDate(text, { isResult });
  const out = [];
  for (const seg of splitItems(text)) { const rec = parseItem(seg, { isResult, auction_date, url }); if (rec) out.push(rec); }
  return out;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!/o\s+wynik|zosta[łl]a\s+ustalona\s+na\s+kwot|wynikiem\s+negatywnym/i.test(t)) return [];
  return parseNotice(text, { isResult: true, url: sourceUrl }).map((r) => (r.auction_date ? r : { ...r, auction_date: fallbackDate || null }));
}
