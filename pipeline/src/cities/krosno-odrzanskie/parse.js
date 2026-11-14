//     PDF body: "Nieruchomość położona jest w Krośnie Odrzańskim przy ul.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\d{1,2})?';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s ]/g, '').replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const LABELED_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcz\\w*(?:\\s+nieruchomo\\w+)?\\s*:?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
const BARE_PRICE_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'i');

export function startingPriceFromText(text) {
  const t = text || '';
  const m = LABELED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const b = BARE_PRICE_RE.exec(t);
  return b ? parsePLN(b[1]) : null;
}

const ACHIEVED_PRICE_RE = new RegExp(
  `cena\\s+osi[ąa]gni[ęe]t\\w*(?:\\s+w\\s+przetargu)?\\s*(?:wynios[łl]\\w*|wynosi\\w*|to|[:\\-–])?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const FLAT_AREA_RE = /pow(?:ierzchni\w*)?\.?\s*u[żz]ytkow\w*(?:\s+lokalu)?\s*:?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROUND_RE =
  /\b(pierwsz|drug|trzec|czwart|pi[ąa]t|sz[oó]st|si[oó]dm|[oó]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:(?:ustn\w+|nieograniczon\w+|ograniczon\w+)\s+){0,3}przetarg/iu;
const ROUND_NUM = {
  pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5, piąt: 5,
  szost: 6, szóst: 6, siodm: 7, siódm: 7, osm: 8, ósm: 8,
  dziewiat: 9, dziewiąt: 9, dziesiat: 10, dziesiąt: 10,
};
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  if (!m) return null;
  const stem = m[1].toLowerCase();
  return ROUND_NUM[stem] ?? null;
}


const LOKAL_NR_RE = /lokal\w*\s+(?:mieszkaln\w*|u[żz]ytkow\w*|niemieszkaln\w*)\s+nr\.?\s*(\d+[A-Za-z]?)/i;

const GLUED_PROPERTY_RE =
  /przy\s+ul\.\s*([^\d,;]+?)\s+(\d{1,4}[A-Za-z]?)\s*\/\s*(\d{1,4}[A-Za-z]?)\b/iu;
const PROPERTY_CLAUSE_RE =
  /po[łl]o[żz]on\w*[^.]*?przy\s+ul\.\s*([^,;]+?)\s+(\d{1,4}[A-Za-z]?)\b/iu;
const BARE_GLUED_RE = /\bul\.\s*([^,;]+?)\s+(\d{1,4}[A-Za-z]?)\s*\/\s*(\d{1,4}[A-Za-z]?)\b/iu;

const VENUE_STREET_RE = /park/i;

export function extractFlatAddress(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  let m = GLUED_PROPERTY_RE.exec(t);
  if (m && !VENUE_STREET_RE.test(m[1])) {
    return `${m[1].trim()} ${m[2].toUpperCase()}/${m[3].toUpperCase()}`;
  }
  const streetM = PROPERTY_CLAUSE_RE.exec(t);
  const lokalM = LOKAL_NR_RE.exec(t);
  if (streetM && lokalM && !VENUE_STREET_RE.test(streetM[1])) {
    return `${streetM[1].trim()} ${streetM[2].toUpperCase()}/${lokalM[1]}`;
  }
  m = BARE_GLUED_RE.exec(t);
  if (m && !VENUE_STREET_RE.test(m[1])) {
    return `${m[1].trim()} ${m[2].toUpperCase()}/${m[3].toUpperCase()}`;
  }
  return null;
}


export function isLeaseRow(text) {
  return /najem|dzier[żz]aw|czynsz/i.test(text || '');
}

export function isFlatSaleRow(text) {
  if (isLeaseRow(text)) return false;
  return classifyKind(text) === 'mieszkalny';
}

export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}


const NEGATIVE_RE =
  /wynikiem\s+negatywn|bez\s+rozstrzygni[ęe]|brak\s+oferent|nie\s+odnotowano\s+wp[łl]at|brak\s+wp[łl]at\w*\s+wadium|nie\s+wp[łl]acono\s+wadium/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

export function isResultNotice(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynik\s+przeprowadzonego/i.test(t) ||
    isNegativeOutcome(t) ||
    achievedPriceFromText(t) != null ||
    /nabywc/i.test(t)
  );
}


export function buildResultText(dotyczyText, cenaText, pdfBody) {
  return [pdfBody || '', dotyczyText || '', cenaText ? `Cena wywoławcza: ${cenaText}` : '']
    .filter(Boolean)
    .join('\n');
}

export function buildNegativeResultText(row) {
  return `${buildResultText(row.dotyczyText, row.cenaText, '')}\nPrzetarg zakończył się wynikiem negatywnym.`;
}



export function parseAnnouncement(row, pdfBody, pdfUrl) {
  const body = pdfBody || '';
  const title = (row && row.dotyczyText) || '';
  if (isLeaseRow(title)) return null;
  if (classifyKind(body || title) !== 'mieszkalny') return null;

  const address_raw = extractFlatAddress(body) || extractFlatAddress(title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const notes = [];
  if (address.warning) notes.push(address.warning);

  let starting_price_pln = startingPriceFromText((row && row.cenaText) || '');
  if (starting_price_pln == null) starting_price_pln = startingPriceFromText(body);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: flatAreaFromText(body),
    starting_price_pln,
    auction_date: dateOnly(row && row.auctionDateRaw),
    round: roundFromText(title) ?? roundFromText(body),
    detail_url: (row && row.detailUrl) || null,
    source_url: pdfUrl || null,
    notes,
  };
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];
  if (!isResultNotice(t)) return [];

  const negative = isNegativeOutcome(t);
  const achieved = achievedPriceFromText(t);
  const sold = !negative && achieved != null;
  if (!sold && !negative) return [];

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);
  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [
    {
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: flatAreaFromText(t),
      notes,
    },
  ];
}
