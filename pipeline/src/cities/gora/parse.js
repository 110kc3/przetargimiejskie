import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\d{1,2})?';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s ]/g, '').replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const MONEY_ZL_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'gi');

export function moneyTokensZl(text) {
  return [...String(text || '').matchAll(MONEY_ZL_RE)]
    .map((m) => parsePLN(m[1]))
    .filter((n) => n != null);
}

const ANN_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcza(?:\\s+do\\s+rokowa[nń])?[\\s\\S]{0,30}?(${MONEY})\\s*z[łl]`,
  'i',
);
export function startingPriceAnnouncement(text) {
  const m = ANN_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const FLAT_AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w*\s+lokalu\s+wynosi\s+(\d+(?:[.,]\d+)?)\s*m/i;
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROUND_RE = /\b(VIII|VII|III|VI|IV|IX|II|V|I|X)\s+przetarg\w*/i;
const ROUND_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? (ROUND_NUM[m[1].toUpperCase()] ?? null) : null;
}


const PL_MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05',
  czerwca: '06', lipca: '07', sierpnia: '08', września: '09', wrzesnia: '09',
  października: '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

export function parsePolishDate(str) {
  if (!str) return null;
  const num = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(str.trim());
  if (num) {
    const [, d, mo, y] = num;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const long = /^(\d{1,2})\s+(\p{L}+)\s+(\d{4})$/u.exec(str.trim());
  if (long) {
    const [, d, monRaw, y] = long;
    const mo = PL_MONTHS[monRaw.toLowerCase()];
    if (mo) return `${y}-${mo}-${d.padStart(2, '0')}`;
  }
  return null;
}

const NUMERIC_DATE_RE = /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/;
const LONG_DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+(${Object.keys(PL_MONTHS).join('|')})\\s+(\\d{4})\\b`, 'iu');

export function auctionDateFromResult(text) {
  const t = text || '';
  const num = NUMERIC_DATE_RE.exec(t);
  if (num) return parsePolishDate(num[1]);
  const long = LONG_DATE_RE.exec(t);
  if (long) return parsePolishDate(`${long[1]} ${long[2]} ${long[3]}`);
  return null;
}

const ANN_DATE_RE = new RegExp(
  `(?:przetarg\\s+odb[ęe]dzie\\s+si[ęe]|rokowania\\s+(?:zostan[ąa]\\s+przeprowadzone|odb[ęe]d[ąa]\\s+si[ęe]))` +
    `[\\s\\S]{0,180}?w\\s+dniu\\s+(\\d{1,2}\\.\\d{1,2}\\.\\d{4}|\\d{1,2}\\s+\\p{L}+\\s+\\d{4})`,
  'iu',
);
export function auctionDateFromAnnouncement(text) {
  const m = ANN_DATE_RE.exec(text || '');
  return m ? parsePolishDate(m[1]) : null;
}


const U = 'A-ZĄĆĘŁŃÓŚŹŻ';
const L = 'A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż';
const BLD = '(\\d{1,4}[A-Za-z]?)\\s*/\\s*(\\d{1,3}[A-Za-z]?)';

const STREET_ADDR_RE = new RegExp(
  `(?:przy\\s+)?(?:ul|pl|al|os)\\.\\s*([${U}][${L}.]*(?:\\s+[${U}]?[${L}.]*){0,3}?)\\s+${BLD}`,
  'u',
);
const LOCALITY_ADDR_RE = new RegExp(
  `w\\s+miejscowo[śs]ci\\s+([${U}][${L}.]*(?:\\s+[${U}][${L}.]*){0,3}?)\\s+${BLD}`,
  'u',
);

export function extractFlatAddress(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  let m = STREET_ADDR_RE.exec(t);
  if (!m) m = LOCALITY_ADDR_RE.exec(t);
  if (!m) return null;
  return `${m[1].trim()} ${m[2]}/${m[3]}`;
}


const NEGATIVE_RE =
  /wynikiem\s+negatywnym|brak\w*\s+uczestnik|brak\w*\s+os[óo]b\s+ch[ęe]tnych|nie\s+wp[łl]aci[łl]\s+wadium|nie\s+odnotowano\s+wp[łl]at/i;

export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

export function isResultNotice(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynikiem\s+(?:negatywnym|pozytywnym)/i.test(t) ||
    /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]t\w*\s+w\s+(?:wyniku|rokowaniach)/i.test(t)
  );
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const money = moneyTokensZl(t);
  const negative = isNegativeOutcome(t);
  const sold = !negative && money.length >= 2;

  const starting_price_pln = money.length ? money[0] : null;
  const final_price_pln = sold ? money[1] : null;

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (/rokowa[nń]/i.test(t)) notes.push('procedure: rokowania');

  return [
    {
      auction_date: auctionDateFromResult(t) || fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: flatAreaFromText(t),
      notes,
    },
  ];
}


export function parseAnnouncement(text, sourceUrl = null) {
  if (!text) return null;
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return null;

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const auction_date = auctionDateFromAnnouncement(t);
  if (!auction_date) return null;

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: flatAreaFromText(t),
    starting_price_pln: startingPriceAnnouncement(t),
    auction_date,
    round: roundFromText(t),
    source_url: sourceUrl,
    detail_url: sourceUrl,
  };
}
