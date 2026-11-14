
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s . ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s  ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

export function roundFromText(text) {
  const m = /\b([IVXLCDM]{1,6})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}


export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wyniku\s+przetarg/i.test(text || '');
}


export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const t = text || '';
  let m = /dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+w\s+Wydziale/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /Kędzierzyn[-\s]?Koźle[,.]?\s*(\d{1,2})\.(\d{2})\.(\d{4})\s*r/i.exec(t);
  return m ? `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}` : null;
}


export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[łl]awcza[\s\S]{0,120}?wynosi\w*\s+([\d . ]+,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza[\s\S]{0,400}?(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /(?<![%\d])(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?\s*(\d[\d . ]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const OBREB_RE = /obr[ęe]b(?:ie)?\s*:?\s*((?:[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)(?:[-\s][A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/;
export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  let dzialka_nr = null;
  const nm = /dzia[łl]k\w*\s+nr\s+([\d/]+(?:\s*(?:,|i)\s*[\d/]+)*)\s+o\s+(?:ł[ąa]cznej\s+)?powierzchni/i.exec(s);
  if (nm) {
    const nums = nm[1].split(/\s*(?:,|i)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
    if (nums.length) dzialka_nr = nums.join(', ');
  }
  let area_m2 = null;
  const am = /o\s+(?:ł[ąa]cznej\s+)?powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(s);
  if (am) {
    const ha = Number(am[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr, area_m2 };
}


function saleClause(text) {
  const m = /na\s+sprzeda[zż]\s*([\s\S]+)/i.exec(text || '');
  return m ? m[1] : (text || '');
}

const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?(?:-\d+)?)/i;

const FLAT_STREET_RE =
  /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)\s+(\d+[A-Za-z]?)\b/;

const OFFICE_STREET_RE = /piastowsk/i;

export function addressRawFromText(text) {
  const c = saleClause(text);
  const re = new RegExp(FLAT_STREET_RE.source, 'g');
  let m;
  while ((m = re.exec(c)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    const um = UNIT_NO_RE.exec(c);
    return um ? `ul. ${street} ${m[2]}/${um[1]}` : `ul. ${street} ${m[2]}`;
  }
  return null;
}

const LAND_STREET_RE =
  /\bul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?=\s+dzia[łl]k|\s*,|\s*\.|\s+ksi[ęe]g|\s+w\s+pokoju|\s+\d|\n|$)/g;
export function landStreetFromText(text) {
  const re = new RegExp(LAND_STREET_RE.source, 'g');
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (street && !OFFICE_STREET_RE.test(street)) return street;
  }
  return null;
}

const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+|\d+)\s*m\s*[²2](?!\d)/i;
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseNum(m[1]) : null;
}

function kindFromText(text) {
  const c = saleClause(text);
  return classifyKind(c.slice(0, 1200));
}


export function parseAnnouncement(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const isLand = ctx.isLandBoard || kind === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  if (isLand) {
    const plot = plotFromText(t);
    const street = landStreetFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl, ctx = {}) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated =
    /wynikiem\s+negatywnym|zako[ńn]czony\s+(?:zosta[łl]\s+)?wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+(?:zosta[łl]o\s+wp[łl]acone\s+wadium|odnotowano\s+wp[łl]at\s+wadi|przyst[ąa]pi)/i.test(t);

  const kind = kindFromText(t);
  const isLand = ctx.isLandBoard || kind === 'grunt';

  if (isLand) {
    const plot = plotFromText(t);
    const street = landStreetFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2,
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(t),
    notes,
  }];
}
