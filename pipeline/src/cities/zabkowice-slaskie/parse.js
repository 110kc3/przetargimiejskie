
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (numStr == null) return null;
  const cleaned = String(numStr)
    .replace(/[^\d.,\s -]/g, '')
    .replace(/[\s ]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(/,\d{2}\b/, '')
    .replace(/[.,]?-\s*$/, '')
    .replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
const ROUND_WORD_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['pi[ąa]t', 5], ['sz[óo]st', 6], ['si[óo]dm', 7],
];

export function roundFromText(text) {
  const t = text || '';
  const rm = /(?:^|\s)([IVX]{1,4})\s+przetarg\w*\s+(?:ustn|pisemn|nieograniczon|ograniczon)/i.exec(t);
  if (rm) return ROMAN[rm[1].toLowerCase()] ?? null;
  for (const [stem, n] of ROUND_WORD_STEMS) {
    if (new RegExp(`\\b${stem}\\w*\\s+przetarg`, 'i').test(t)) return n;
  }
  return null;
}


export function kindFromProse(text) {
  return classifyKind(text || '');
}

const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

export function unitNoFromProse(text) {
  const m = UNIT_NO_RE.exec(text || '');
  return m ? m[1] : null;
}

function normBuilding(b) {
  return (b || '').replace(/\s+/g, '').toUpperCase();
}

const STREET_RE =
  /(?:przy,?\s+)?(?:ul(?:\.|icy|ica)?|pl(?:\.|acu|ac)?|al(?:\.|ei|eja)?|os(?:\.|iedla|iedle)?)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃIVX][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’-]*)*?)\s+(\d+(?:\s[A-Z]|[A-Za-z])?(?:-\d+)?)(?=[\s.,/]|$)/;

const STREET_BARE_RE =
  /(?:przy,?\s+)?(?:ul(?:\.|icy|ica)?|pl(?:\.|acu|ac)?|al(?:\.|ei|eja)?|os(?:\.|iedla|iedle)?)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃIVX][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’-]*)*)/;

const VILLAGE_RE =
  /w\s+miejscowo[śs]ci\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+)\s+(\d+(?:\s[A-Z]|[A-Za-z])?(?:-\d+)?)(?=[\s.,/]|$)/;

export function streetOrVillageFromProse(text) {
  const t = text || '';
  const sm = STREET_RE.exec(t);
  if (sm) return { street: sm[1].replace(/\s+/g, ' ').trim(), building: normBuilding(sm[2]) };
  const vm = VILLAGE_RE.exec(t);
  if (vm) return { street: vm[1].trim(), building: normBuilding(vm[2]) };
  return null;
}

export function addressRawFromProse(text, kind = null) {
  const sv = streetOrVillageFromProse(text);
  if (sv && sv.building) {
    const unit = unitNoFromProse(text);
    return unit ? `ul. ${sv.street} ${sv.building}/${unit}` : `ul. ${sv.street} ${sv.building}`;
  }
  if (kind === 'garaz') {
    const bm = STREET_BARE_RE.exec(text || '');
    if (bm) {
      const street = bm[1].replace(/\s+/g, ' ').trim();
      const unit = unitNoFromProse(text);
      const parcel = parcelFromProse(text);
      if (unit) return `ul. ${street} 0/${unit}`;
      if (parcel) return `ul. ${street} 0/${parcel.replace('/', '-')}`;
      return `ul. ${street} 0`;
    }
  }
  return null;
}

export function parcelFromProse(text) {
  const t = (text || '').replace(/[ ]/g, ' ');
  const parcels = [];
  const seen = new Set();
  const add = (p) => { const v = p.trim(); if (/^\d+(?:\/\d+)?$/.test(v) && !seen.has(v)) { seen.add(v); parcels.push(v); } };
  const list = /dzia[łl][a-ząćęłńóśźż]*\s*:?\s*(?:nr\.?\s*)?((?:\d+(?:\/\d+)?\s*(?:,|i|oraz)\s*)+\d+(?:\/\d+)?)/i.exec(t);
  if (list) for (const p of list[1].split(/\s*(?:,|i|oraz)\s*/)) add(p);
  const single = /dzia[łl][a-ząćęłńóśźż]*\s+(?:gruntow\w+\s+)?(?:o\s+)?(?:numer\w*|nr)\.?\s*(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = single.exec(t)) !== null) add(m[1]);
  return parcels.length ? parcels.join(', ') : null;
}

const OBREB_RE =
  /\bob(?:r[ęe]b(?:ie)?|\.?)\s*:?\s*((?:[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)(?:[\s-][A-Z0-9ŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń0-9]*)?)/;

export function obrebFromProse(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function landAreaFromProse(text) {
  const t = text || '';
  const m = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (!m) return null;
  const a = Number(m[1].replace(',', '.'));
  return a > 0 ? Math.round(a * 10000) : null;
}

export function flatAreaFromProse(text) {
  const t = text || '';
  const m = /o\s+pow(?:ierzchni)?(?:\s+u[żz]ytkow\w+)?\.?\s*(\d+[.,]\d+|\d+)\s*m\s*[²2](?!\d)/i.exec(t);
  return m ? parseArea(m[1]) : null;
}

export function isSaleText(przetargNa) {
  const s = przetargNa || '';
  if (/\bdzier[żz]aw|\bnajem\b|na\s+najem\b/i.test(s)) return false;
  return /sprzeda|zbyci/i.test(s);
}


function cellText(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function rowValue(html, label) {
  const re = new RegExp(`<th[^>]*>\\s*${label}[^<]*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = re.exec(html);
  return m ? m[1] : null;
}

export function extractFields(html) {
  if (!html) return null;
  const przetargNaRaw = rowValue(html, 'Przetarg na');
  const adresRaw = rowValue(html, 'Adres nieruchomo');
  if (przetargNaRaw == null && adresRaw == null) return null;
  const dataCell = rowValue(html, 'Data przetargu') || '';
  const dt = /<time\s+datetime="([^"]+)"/i.exec(dataCell);
  const pub = /<time\s+datetime="(\d{4}-\d{2}-\d{2})"/i.exec(
    html.slice(html.search(/Data\s+publikacji|Opublikowano|metryk/i) >= 0 ? html.search(/Data\s+publikacji|Opublikowano|metryk/i) : 0),
  );
  return {
    adres: cellText(adresRaw),
    przetargNa: cellText(przetargNaRaw),
    typ: cellText(rowValue(html, 'Typ przetargu')),
    rodzaj: cellText(rowValue(html, 'Rodzaj nieruchomo')),
    cenaText: cellText(rowValue(html, 'Cena wywo')),
    auctionDate: dt ? dt[1].slice(0, 10) : null,
    publishedDate: pub ? pub[1] : null,
  };
}


export function parseAnnouncement(fields, detailUrl) {
  if (!fields) return null;
  const prose = `${fields.przetargNa || ''} ${fields.adres || ''}`.trim();
  if (!prose) return null;
  if (fields.przetargNa && !isSaleText(fields.przetargNa)) return null;

  const kind = kindFromProse(fields.przetargNa || prose);
  const starting_price_pln = parsePLN(fields.cenaText);
  const auction_date = fields.auctionDate || null;
  const round = roundFromText(fields.przetargNa || prose);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromProse(prose);
    const obreb = obrebFromProse(prose);
    const sv = streetOrVillageFromProse(fields.przetargNa || '');
    const address_raw = sv ? `ul. ${sv.street}${sv.building ? ` ${sv.building}` : ''}` : null;
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromProse(prose),
      address_raw,
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl || null,
      source_url: detailUrl || null,
    };
  }

  const address_raw = addressRawFromProse(fields.przetargNa || prose, kind) || addressRawFromProse(fields.adres || '', kind);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = flatAreaFromProse(prose);
  const landArea = area_m2 == null ? landAreaFromProse(prose) : null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    ...(landArea != null ? { land_area_m2: landArea } : {}),
    starting_price_pln,
    auction_date,
    round,
    detail_url: detailUrl || null,
    source_url: detailUrl || null,
  };
}


export function isResultNotice(text) {
  const t = text || '';
  return /informacj\w*\s+o\s+wynik/i.test(t) || /wynik\w*\s+przetarg/i.test(t);
}

export function achievedPriceFromResult(text) {
  const m = /cena\s+osi[ąa]gni[ęe]t\w*\s+w\s+(?:tym\s+)?przetargu\s*(?:wynios[łl]a|wyni[oó]s[łl]a|wynosi|to|:|-)?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function startingPriceFromResult(text) {
  const m = /cena\s+wywo[łl]awcz\w*[^.]*?(?:wynosi[łl]a|wynosi|to|:|-)\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeResult(text) {
  const t = text || '';
  return /nie\s+odby[łl]\s+si[ęe]|braku?\s+nabywc|z\s+uwagi\s+na\s+brak|wynikiem\s+negatywn|nie\s+wy[łl]oniono|nie\s+wp[łl]yn[ęe][łl]/i.test(t);
}

export function resultDateFromText(text) {
  const t = text || '';
  const anchored =
    /(?:dnia|na\s+dzie[ńn]|Dnia)\s+(\d{1,2})\s+([a-zżźćęłóśąń]+)\s+(\d{4})\s+roku/i.exec(t);
  const m = anchored || /(\d{1,2})\s+([a-zżźćęłóśąń]+)\s+(\d{4})\s+roku/i.exec(t);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const round = roundFromText(t);
  const achieved = achievedPriceFromResult(t);
  const starting_price_pln = startingPriceFromResult(t);
  const sold = achieved != null;
  const negativeStated = isNegativeResult(t);
  const auction_date = fallbackDate || resultDateFromText(t) || null;
  const kind = kindFromProse(t);

  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromProse(t);
    const obreb = obrebFromProse(t);
    const sv = streetOrVillageFromProse(t);
    const address_raw = sv ? `ul. ${sv.street}${sv.building ? ` ${sv.building}` : ''}` : null;
    if (!dzialka_nr && !address_raw) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl,
      detail_url: sourceUrl,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromProse(t),
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const address_raw = addressRawFromProse(t, kind);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  const area_m2 = flatAreaFromProse(t);
  const landArea = area_m2 == null ? landAreaFromProse(t) : null;
  return [{
    auction_date,
    source_pdf: sourceUrl,
    detail_url: sourceUrl,
    source_url: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2,
    ...(landArea != null ? { land_area_m2: landArea } : {}),
    notes,
  }];
}
