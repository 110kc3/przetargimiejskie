import { parseAddress } from '../../core/normalize.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function addressFromLabel(label) {
  if (!label) return null;
  let s = label.replace(/^\s*OG[ŁL]OSZENIE\s+/i, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/_(?=[0-9])/g, '/');
  const address = parseAddress(s);
  return address ? { address_raw: s, address } : null;
}

const ORDINAL_PRZETARG_RE =
  /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,40}))/g;
const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };

export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  ORDINAL_PRZETARG_RE.lastIndex = 0;
  let m;
  while ((m = ORDINAL_PRZETARG_RE.exec(t)) !== null) {
    if (/\b(?:odby[łl]|zako[ńn]czy[łl])/.test(m[2])) continue;
    return ORDINALS[m[1]] ?? null;
  }
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const num = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text)
    || /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  const word = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (word) {
    const m = PL_MONTHS[word[2].toLowerCase()];
    if (m) return `${word[3]}-${String(m).padStart(2, '0')}-${word[1].padStart(2, '0')}`;
  }
  return null;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function priceFromText(text) {
  const m = /cena\s+wywo[łl]awcza[^0-9]{0,80}?([\d][\d  .]*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function areaFromText(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,20}?([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (plausible(v)) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  let m;
  const cands = [];
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/dzia[łl]k|grunt/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function parseAnnouncement(label, text) {
  const addr = addressFromLabel(label);
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
  };
}

export function parseResultDoc(_text, _date, _url) {
  return [];
}
