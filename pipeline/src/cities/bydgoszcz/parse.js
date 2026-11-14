
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};


export function parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr)
    .replace(/[\s ]/g, '')
    .replace(/,-$/, '')
    .replace(/,\d{2}$/, '')
    .replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNum(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const nxt = ROMAN[s[i + 1]];
    total += nxt && cur < nxt ? -cur : cur;
  }
  return total > 0 ? total : null;
}

export function roundFromText(text) {
  const m = /(?:^|[\s(,–—-])([IVXLCDM]{1,7})\s+przetarg/.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}


export function isResultNotice(text) {
  return /informacj[ęea]*\s+o\s+wynik(?:u|ach)/i.test(text || '');
}


export function auctionDateFromAnn(text) {
  const t = text || '';
  let m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,160}?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,160}?w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}`;
  return null;
}

export function resultDateFromText(text) {
  const t = text || '';
  let m = /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}`;
  m = /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return null;
}


const AMOUNT = '((?:[1-9]\\d{0,2}(?:[\\s\\u00a0.]+\\d{3})+|[1-9]\\d*))';

export function startingPriceFromText(text) {
  const t = text || '';
  let m = new RegExp(`cena\\s+wywo[łl]awcza\\s+nieruchomo[śs]ci\\s*:\\s*${AMOUNT}(?:,(?:\\d{2}|-))?\\s*z[łl]`, 'i').exec(t);
  if (m) return parsePLN(m[1]);
  m = new RegExp(`cena\\s+wywo[łl]awcza[\\s\\S]{0,300}?${AMOUNT}(?:,(?:\\d{2}|-))?\\s*z[łl]`, 'i').exec(t);
  if (m) return parsePLN(m[1]);
  m = new RegExp(`${AMOUNT},-`).exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  const m = new RegExp(
    `najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetarg\\w*\\s*[–—:-]\\s*${AMOUNT}(?:,(?:\\d{2}|-))?\\s*z[łl]`,
    'i',
  ).exec(t);
  return m ? parsePLN(m[1]) : null;
}

function isUnsold(text) {
  const t = text || '';
  return /wynikiem\s+negatywnym/i.test(t) ||
    /najwy[żz]sza\s+cena[\s\S]{0,60}?[–—-]\s*brak/i.test(t) ||
    /brak\s+wp[łl]acon\w+\s+wadi/i.test(t) ||
    /nie\s+odnotowano\s+wp[łl]at/i.test(t);
}


export function unitAreaFromText(text) {
  const t = text || '';
  const re = /(\d{1,3}[.,]\d{1,2})\s*m\s*[²2](?!\d)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 22), m.index);
    if (/piwnic|przynale[żz]|kom[óo]rk|\bwc\b|\bha\b/i.test(before)) continue;
    const v = parseNum(m[1]);
    if (v) return v;
  }
  return null;
}


export function addressRawFromText(text) {
  const t = (text || '').replace(/\r/g, '');

  const unitM = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+)\s+nr\s+([A-Za-z]?\d+[A-Za-z]?)/i.exec(t);
  const rawUnit = unitM ? unitM[1] : null;
  const prefixUnit = rawUnit && /^([A-Za-z])(\d+)$/.exec(rawUnit);
  const unit = prefixUnit ? `${prefixUnit[2]}${prefixUnit[1].toUpperCase()}` : rawUnit;

  const m = /po[łl]o[żz]on\w+[\s\S]{0,40}?\bul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'\- ]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\b/.exec(t);
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const bldg = m[2];
  return unit ? `ul. ${street} ${bldg}/${unit}` : `ul. ${street} ${bldg}`;
}

function kindFromText(text) {
  return classifyKind((text || '').slice(0, 1500));
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const round = roundFromText(t);
  const auction_date = auctionDateFromAnn(t);
  const starting_price_pln = startingPriceFromText(t);

  if (kind === 'grunt') {
    return { kind: 'grunt', starting_price_pln, auction_date, round };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(t),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const kind = kindFromText(t);
  if (kind === 'grunt') return [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isUnsold(t);

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
