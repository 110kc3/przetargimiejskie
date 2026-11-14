
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

// non-global .exec() naturally picks the first (correct) one.
const AREA_RE = /o\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseAreaNum(m[1]) : null;
}

const STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s*:?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)(?:\s*z[łl])?/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const DZIALKA_ANCHOR_RE = /(?:numer\w*|nr\.?)\s+ewidencyjn\w*/i;
const KW_NUMBER_RE = /\b\p{Lu}{2}\d\p{Lu}\/\d+\/\d+/gu;
const PARCEL_TOKEN_RE = /(?<![\d/])(\d{1,4}(?:\/+\d{1,3})?)(?!\d)/g;
const AREA_CLAUSE_RE = /o\s+pow(?:ierzchni)?\.?\s*\d/i;

export function dzialkaNrFromText(text) {
  const t = text || '';
  const anchorM = DZIALKA_ANCHOR_RE.exec(t);
  if (!anchorM) return null;
  const from = anchorM.index;
  const rest = t.slice(from);
  const areaM = AREA_CLAUSE_RE.exec(rest);
  const newlineIdx = rest.indexOf('\n');
  const bound = Math.min(areaM ? areaM.index : Infinity, newlineIdx >= 0 ? newlineIdx : Infinity, 600);
  const to = from + (Number.isFinite(bound) ? bound : 600);
  const scoped = t.slice(from, to).replace(KW_NUMBER_RE, ' ');
  const nums = [...new Set([...scoped.matchAll(PARCEL_TOKEN_RE)].map((m) => m[0].replace(/\/+/g, '/')))];
  return nums.length ? nums.join(', ') : null;
}

const LAND_HA_RE = /o\s+pow(?:ierzchni)?\.?\s*(\d+(?:[.,]\s?\d+)?)\s*ha/i;
const LAND_M2_RE = /o\s+pow(?:ierzchni)?\.?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function landAreaM2FromText(text) {
  const t = text || '';
  const haM = LAND_HA_RE.exec(t);
  if (haM) {
    const cleaned = haM[1].replace(/\s+/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10000) : null;
  }
  const m2M = LAND_M2_RE.exec(t);
  if (m2M) {
    const n = Number(m2M[1].replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }
  return null;
}

const LAND_STREET_RE =
  /po[łl]o[żz]on\w*\s+przy\s+ul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3})/u;
export function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(text || '');
  return m ? m[1].trim() : null;
}


export function isPositiveOutcome(text) {
  const t = text || '';
  return /pozytywn/i.test(t) && !/negatywn/i.test(t);
}

export function isNegativeOutcome(text) {
  return /negatywn/i.test(text || '');
}


export function isLeaseRow(text) {
  return /najem|dzier[żz]aw/i.test(text || '');
}

export function inScopeKind(text) {
  if (isLeaseRow(text)) return null;
  const k = classifyKind(text);
  return k === 'mieszkalny' || k === 'grunt' ? k : null;
}


const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+)/i;

const UL_RE = /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(\d{1,4}[A-Za-z]?)\b/u;

export function extractLokalAddress(text) {
  const t = (text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const lokalM = LOKAL_NR_RE.exec(t);
  if (!lokalM) return null;
  const apt = lokalM[1];
  const scoped = t.slice(lokalM.index, lokalM.index + 400);
  const ulM = UL_RE.exec(scoped);
  if (!ulM) return null;
  const street = ulM[1].trim();
  const building = ulM[2].toUpperCase();
  return `${street} ${building}/${apt}`;
}


export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}



export function parseActiveFlatRow(row) {
  const addrRaw = extractLokalAddress(row.dotyczyText);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;
  const firstAttachment = (row.attachments || [])[0] || null;
  return {
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    area_m2: areaFromText(row.dotyczyText),
    starting_price_pln: startingPriceFromText(row.cenaText),
    auction_date: dateOnly(row.auctionDateRaw),
    round: null, // see file header — only on the per-notice detail page
    detail_url: row.detailUrl || null,
    source_url: firstAttachment ? firstAttachment.url : row.detailUrl || null,
  };
}

export function parseActiveLandRow(row) {
  const dzialka_nr = dzialkaNrFromText(row.dotyczyText);
  if (!dzialka_nr) return null;
  const street = landStreetFromText(row.dotyczyText);
  const firstAttachment = (row.attachments || [])[0] || null;
  return {
    kind: 'grunt',
    dzialka_nr,
    address_raw: street,
    street,
    area_m2: landAreaM2FromText(row.dotyczyText),
    starting_price_pln: startingPriceFromText(row.cenaText),
    auction_date: dateOnly(row.auctionDateRaw),
    round: null,
    detail_url: row.detailUrl || null,
    source_url: firstAttachment ? firstAttachment.url : row.detailUrl || null,
  };
}


export function buildResultText(row) {
  const parts = [row.dotyczyText, row.cenaText];
  if (isPositiveOutcome(row.wynikText)) parts.push('Przetarg zakończył się wynikiem pozytywnym.');
  else if (isNegativeOutcome(row.wynikText)) parts.push('Przetarg zakończył się wynikiem negatywnym.');
  return parts.join('\n');
}

export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = text.replace(/\r/g, ' ');
  const kind = inScopeKind(t);
  if (!kind) return [];

  const negative = isNegativeOutcome(t);
  const positive = !negative && isPositiveOutcome(t);
  if (!negative && !positive) return [];

  const starting_price_pln = startingPriceFromText(t);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (positive) {
    notes.push("achieved price not published by this city's BIP for Pozytywny outcomes");
  }

  if (kind === 'mieszkalny') {
    const addrRaw = extractLokalAddress(t);
    if (!addrRaw) return [];
    const address = parseAddress(addrRaw);
    if (!address) return [];
    if (address.warning) notes.push(address.warning);
    return [{
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw: addrRaw,
      address,
      round: null, // result notices reference the announcement, not the round
      starting_price_pln,
      final_price_pln: null,
      outcome: positive ? 'sold' : 'unsold',
      unsold_reason: positive ? null : 'unknown',
      area_m2: areaFromText(t),
      notes,
    }];
  }

  const dzialka_nr = dzialkaNrFromText(t);
  if (!dzialka_nr) return [];
  const street = landStreetFromText(t);
  return [{
    auction_date: fallbackDate || null,
    source_pdf: sourceUrl,
    kind: 'grunt',
    dzialka_nr,
    address_raw: street,
    street,
    round: null,
    starting_price_pln,
    final_price_pln: null,
    outcome: positive ? 'sold' : 'unsold',
    unsold_reason: positive ? null : 'unknown',
    area_m2: landAreaM2FromText(t),
    notes,
  }];
}
