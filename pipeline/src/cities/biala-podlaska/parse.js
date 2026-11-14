import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function priceFromText(text) {
  if (!text) return null;
  const start = text.search(/cena\s+wywo[łl]awcza/i);
  if (start < 0) return null;
  const region = text.slice(start, start + 200);
  const m = /wynosi\s+([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

const PL_WORD = 'a-ząćęłńóśźż';

export function areaFromText(text) {
  if (!text) return null;
  const labeled = new RegExp(
    `powierzchni[${PL_WORD}]*\\s+u[żz]ytkow[${PL_WORD}]*[^0-9]{0,30}?([\\d][\\d.,]*)\\s*m\\s*[²2]`,
    'i',
  ).exec(text);
  if (labeled) {
    const v = parseArea(labeled[1]);
    if (v != null && v > 0) return v;
  }
  const M2 = /(?:o\s+)?powierzchni\s+([\d][\d.,]*)\s*m\s*[²2]/gi;
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/ł[ąa]cznej/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (v != null && v > 0) return v;
  }
  return null;
}

export function landAreaFromText(text) {
  if (!text) return null;
  const m = new RegExp(
    `dzia[łl]k[${PL_WORD}]*[\\s\\S]{0,80}?o\\s+(?:ł[ąa]cznej\\s+)?powierzchni\\s+([\\d][\\d.,]*)\\s*m\\s*[²2]`,
    'i',
  ).exec(text);
  return m ? parseArea(m[1]) : null;
}

export function dzialkaNrFromText(text) {
  if (!text) return null;
  const m = new RegExp(
    `dzia[łl]k[${PL_WORD}]*\\s*(?:nr\\s*)?(?:ew(?:id)?\\.?\\s*)?(\\d+(?:/\\d+)?)`,
    'i',
  ).exec(text);
  return m ? m[1] : null;
}

const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, szóst: 6, szost: 6 };

export function roundFromTitle(title) {
  const t = (title || '').toLowerCase();
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)[\wąćęłńóśźż]*\s+przetarg/i.exec(t);
  if (m) return ORDINALS[m[1]] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

export function lokalNrFromTitle(title) {
  const m = /oznaczon\w*\s+nr\s*(\d+[A-Za-z]?)/i.exec(title || '');
  return m ? m[1] : null;
}

export function streetBuildingFromTitle(title) {
  const m =
    /przy\s+(?:ul\.?|al\.?|pl\.?)\s*([^\n,.;]+?\s+\d+[A-Za-z]?)\s+w\s+Bia[łl]ej\s*Podlaskiej/i.exec(
      title || '',
    );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function addressFromTitle(title) {
  const sb = streetBuildingFromTitle(title);
  if (!sb) return null;
  const apt = lokalNrFromTitle(title);
  return parseAddress(apt ? `${sb}/${apt}` : sb);
}

export function kindFromText(title, body) {
  return classifyKind(`${title || ''} ${body || ''}`.trim());
}

export function parseResultDoc(_text, _date, _url) {
  return [];
}
