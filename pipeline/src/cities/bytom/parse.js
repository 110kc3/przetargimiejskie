
const ORDINAL_PRZETARG_RE =
  /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,40}))/g;
const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };

const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9,
  października: 10, październik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  ORDINAL_PRZETARG_RE.lastIndex = 0;
  let m;
  while ((m = ORDINAL_PRZETARG_RE.exec(t)) !== null) {
    if (/\b(?:odby[łl]|zako[ńn]czy[łl])/.test(m[2])) continue;
    return ORDINALS[m[1]] ?? null;
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]d[ązie]+\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  const num = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(scope);
  if (num) return iso(num[3], num[2], num[1]);
  return null;
}

export function priceFromText(text) {
  if (!text) return null;
  const start = text.search(/cena\s+wywo[łl]awcza/i);
  if (start < 0) return null;
  const region = text.slice(start, start + 200);
  const m = /([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function areaFromText(text) {
  if (!text) return null;
  const M2 = /([\d][\d.,]*)\s*m\s*(?:[²2]|kw)(?!\d)/gi;
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (v && v > 0) return v;
  }
  const cands = [];
  let m;
  M2.lastIndex = 0;
  while ((m = M2.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt/i.test(before)) continue;
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]/i.test(before)) continue;
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function parseAnnouncement(text) {
  return {
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
  };
}

export function parseResultDoc(_text, _date, _url) {
  return [];
}
