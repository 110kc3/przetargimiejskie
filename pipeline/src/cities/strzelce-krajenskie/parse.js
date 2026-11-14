import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseAreaNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const AREA_RE = /o\s+pow(?:ierzchni)?\.?\s*(?:u[żz]ytkowej)?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseAreaNum(m[1]) : null;
}

const STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s*[-–:]?\s*(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_PRICE_RE = /nabywc\w*[\s\S]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  const t = text || '';
  if (!/nabywc/i.test(t)) return null;
  const m = ACHIEVED_PRICE_RE.exec(t);
  return m ? parsePLN(m[1]) : null;
}


const NEGATIVE_RE =
  /wynikiem\s+negatywn\w*|nie\s+odnotowano\s+wp[łl]at|brak\s+wp[łl]at\w*\s+wadium|przetarg\s+si[ęe]\s+nie\s+odby[łl]/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

export function isResultNotice(text) {
  const t = text || '';
  return /informacj\w*\s+o\s+wynik/i.test(t) || isNegativeOutcome(t) || /nabywc/i.test(t);
}


const ROUND_RE = /\b([IVX]{1,4})\s+(?:nieograniczon\w*|ograniczon\w*)\s+przetarg/i;
function romanToInt(s) {
  const ROMAN = { I: 1, V: 5, X: 10 };
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 20 ? total : null;
}
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}


export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}


const LEASE_RE = /\b(dzier[żz]aw|najem|czynsz)/i;
const ROKOWANIA_RE = /rokowa[ńn]/i;

export function isInScopeRow(dotyczyText) {
  const t = dotyczyText || '';
  if (LEASE_RE.test(t) || ROKOWANIA_RE.test(t)) return false;
  const kind = classifyKind(t);
  return kind === 'mieszkalny' || kind === 'grunt';
}


const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

const UL_RE = /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(\d{1,4}[A-Za-z]?)\b/u;

const VILLAGE_GLUED_RE =
  /po[łl]o[żz]on\w*\s+w\s+(\p{Lu}\p{Ll}+)\s+(\d{1,4}[A-Za-z]?)\/(\d{1,4}[A-Za-z]?)/u;

const MIEJSCOWOSC_RE = /miejscowo[śs]ci\s+(\p{Lu}\p{Ll}+)/u;

export function extractFlatAddress(text) {
  const t = (text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  const ulM = UL_RE.exec(t);
  const lokalM = LOKAL_NR_RE.exec(t);
  if (ulM && lokalM) {
    return `${ulM[1].trim()} ${ulM[2].toUpperCase()}/${lokalM[1]}`;
  }

  const villM = VILLAGE_GLUED_RE.exec(t);
  if (villM) {
    let place = villM[1];
    const nomM = MIEJSCOWOSC_RE.exec(t);
    if (nomM) place = nomM[1];
    return `${place} ${villM[2].toUpperCase()}/${villM[3].toUpperCase()}`;
  }

  return null;
}


const PARCEL_RE = /numer\w*\s+ewidencyjn\w*(?:\s+grunt\w*)?\s+(\d+(?:\/\d+)?)/i;
export function parcelFromText(text) {
  const m = PARCEL_RE.exec(text || '');
  return m ? m[1] : null;
}

export function landPlaceFromText(text) {
  const m = MIEJSCOWOSC_RE.exec(text || '');
  return m ? m[1] : null;
}



export function parseAnnouncement(row, pdfBodyText, pdfUrl) {
  const primary = pdfBodyText || '';
  const title = (row && row.dotyczyText) || '';
  const kindSource = primary || title;
  const kind = classifyKind(kindSource);
  if (kind !== 'mieszkalny' && kind !== 'grunt') return null;

  const auction_date = dateOnly(row && row.auctionDateRaw) || null;
  const round = roundFromText(primary) ?? roundFromText(title);

  let starting_price_pln = startingPriceFromText(primary);
  if (starting_price_pln == null) starting_price_pln = startingPriceFromText(row && row.cenaText);

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(primary) || parcelFromText(title);
    const area_m2 = areaFromText(primary) ?? areaFromText(title);
    const address_raw = landPlaceFromText(primary) || landPlaceFromText(title);
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
      detail_url: (row && row.detailUrl) || null,
      source_url: pdfUrl || null,
      notes,
    };
  }

  const address_raw = extractFlatAddress(primary) || extractFlatAddress(title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaFromText(primary) ?? areaFromText(title),
    starting_price_pln,
    auction_date,
    round,
    detail_url: (row && row.detailUrl) || null,
    source_url: pdfUrl || null,
    notes,
  };
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const kind = classifyKind(text);
  if (kind !== 'mieszkalny' && kind !== 'grunt') return [];

  const negative = isNegativeOutcome(text);
  const achieved = achievedPriceFromText(text);
  const positive = !negative && achieved != null;
  if (!negative && !positive) return [];

  const starting_price_pln = startingPriceFromText(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const address_raw = landPlaceFromText(text);
    if (!dzialka_nr && !address_raw) return [];
    return [
      {
        auction_date: fallbackDate || null,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        area_m2: areaFromText(text),
        address_raw,
        round: roundFromText(text),
        starting_price_pln,
        final_price_pln: positive ? achieved : null,
        outcome: positive ? 'sold' : 'unsold',
        unsold_reason: positive ? null : 'unknown',
        notes,
      },
    ];
  }

  const address_raw = extractFlatAddress(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  return [
    {
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(text),
      starting_price_pln,
      final_price_pln: positive ? achieved : null,
      outcome: positive ? 'sold' : 'unsold',
      unsold_reason: positive ? null : 'unknown',
      area_m2: areaFromText(text),
      notes,
    },
  ];
}
