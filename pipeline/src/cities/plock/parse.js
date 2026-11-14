import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function parsePLN(numStr) {
  if (numStr == null) return null;
  let s = String(numStr).trim();
  s = s.replace(/[.,]\d{2}\b/, '');
  s = s.replace(/[^\d]/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSaleTitle(title) {
  const t = (title || '').toLowerCase();
  if (/wynaj|dzier[żz]aw|\bnajem\b|\bnajmu\b/.test(t)) return false;
  return /sprzeda/.test(t);
}


const BUILDING_BOUNDARY = '(?=[\\s.,)/]|$)';
const STREET_UL_RE = new RegExp(
  `(?:przy\\s+)?ul\\.?\\s+([A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*)*?)\\s+(\\d+[A-Za-z]?)${BUILDING_BOUNDARY}`,
  'u',
);
const STREET_BUDYNEK_RE = new RegExp(
  `w\\s+budynku\\s+([A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*)*?)\\s+(\\d+[A-Za-z]?)${BUILDING_BOUNDARY}`,
  'u',
);
const STREET_BARE_RE = new RegExp(
  `(?:zabudowan\\w*|niezabudowan\\w*|mieszkaln\\w*|niemieszkaln\\w*|u[żz]ytkow\\w*|gara[żz]\\w*)\\s+` +
    `([A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\p{L}.'-]*)*?)\\s+(\\d+[A-Za-z]?)${BUILDING_BOUNDARY}`,
  'u',
);

export function streetBuildingFromTitle(title) {
  const t = title || '';
  const m = STREET_UL_RE.exec(t) || STREET_BUDYNEK_RE.exec(t) || STREET_BARE_RE.exec(t);
  if (!m) return null;
  return { street: m[1].trim(), building: m[2].toUpperCase() };
}

const UNIT_NO_RE =
  /lokal\w*\s+(?:mieszkaln\w*|u[żz]ytkow\w*|niemieszkaln\w*)\s*,?\s*nr\.?\s*(\d+[A-Za-z]?)/i;

export function unitNoFromText(text) {
  const m = UNIT_NO_RE.exec(text || '');
  return m ? m[1] : null;
}

export function addressRawFromTitle(title, unitNo) {
  const sb = streetBuildingFromTitle(title);
  if (!sb) return null;
  return unitNo ? `ul. ${sb.street} ${sb.building}/${unitNo}` : `ul. ${sb.street} ${sb.building}`;
}


export function startingPriceFromText(text) {
  const t = text || '';
  const m =
    /cena\s+wywo[łl]awcz\w*\s*(?:brutto|netto)?\s*wynosi\s*([\d][\d.,\s]*?)\s*z[łl]/i.exec(t) ||
    /(?:kwocie|cenie)\s+wywo[łl]awcz\w*[\s\S]{0,60}?wysoko[śs]ci\s*([\d][\d.,\s]*?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function auctionDateFromText(text) {
  const m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*(?:o\s+godz)/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  const t = text || '';
  const m = /z\s+dn\.?\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})[^\n]{0,20}przeprowadzi/i.exec(t);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return null;
}

export function wadiumDeadlineFromText(text) {
  const m = /wadium[\s\S]{0,160}?w\s+terminie\s+do\s+(?:dnia\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(
    text || '',
  );
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function flatAreaFromText(text) {
  const t = text || '';
  const lab =
    /Powierzchnia\s+lokalu\s+wynosi\s*([\d]+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(t) ||
    /powierzchni\w*\s+u[żz]ytkow\w*(?:\s+mieszkania)?\s*([\d]+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(t);
  if (lab) {
    const v = parseArea(lab[1]);
    if (v) return v;
  }
  const re = /o\s+powierzchni\s+([\d]+[.,]\d+|\d+)\s*m\s*[²2]/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 30), m.index);
    if (/piwnic|dzia[łl]k|grunt|przynale[żz]|kondygnacj|zabudowy/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (v) return v;
  }
  return null;
}

export function plotAreaHaFromText(text) {
  const m = /o\s+powierzchni\s+([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}


export function achievedPriceFromResult(text) {
  const m = /za\s+(?:cen[ęe]|staw[kc][ęe])\s*(?:brutto|netto)?\s*([\d][\d.,\s]*?)\s*z[łl]/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

export function hasWinnerRegistrationBlock(text) {
  const idx = (text || '').search(/Podpis\s+wygrywaj/i);
  if (idx < 0) return false;
  const tail = text.slice(idx, idx + 400);
  return /\bNIP[\s:.-]*\d{3}|\bREGON[\s:.-]*\d{6,}/i.test(tail);
}

export function isNegativeResult(text) {
  return /wynikiem\s+negatywn|brak\s+(?:uczestnik[oó]w|nabywc[oó]w)/i.test(text || '');
}


export function parseAnnouncement({ title, bodyText = '', pdfText = '', detailUrl, publishedDate = null }) {
  if (!isSaleTitle(title)) return null;
  const kind = classifyKind(title);
  if (kind === 'grunt' || kind === 'unknown') return null;

  const combined = `${title}\n${bodyText}\n${pdfText}`;
  const unitNo = unitNoFromText(title) || unitNoFromText(combined);
  const address_raw = addressRawFromTitle(title, unitNo);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const starting_price_pln = startingPriceFromText(combined);
  const auction_date = auctionDateFromText(combined);
  const wadium_deadline = wadiumDeadlineFromText(combined);
  const area_m2 = kind === 'zabudowana' ? null : flatAreaFromText(combined);
  const land_area_m2 = kind === 'zabudowana' ? plotAreaHaFromText(combined) : null;

  return {
    kind,
    address_raw,
    address,
    area_m2,
    ...(land_area_m2 != null ? { land_area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round: null,
    published_date: publishedDate,
    ...(wadium_deadline ? { wadium_deadline } : {}),
    detail_url: detailUrl || null,
    source_url: detailUrl || null,
  };
}


const TITLE_MARKER_RE = /^TYTUL:\s*(.*)$/m;

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  const title = TITLE_MARKER_RE.exec(t)?.[1] ?? '';
  if (!isSaleTitle(title)) return [];
  const kind = classifyKind(title);
  if (kind === 'grunt' || kind === 'unknown') return [];

  const unitNo = unitNoFromText(title) || unitNoFromText(t);
  const address_raw = addressRawFromTitle(title, unitNo);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const achieved = achievedPriceFromResult(t);
  const winnerBlock = achieved == null && hasWinnerRegistrationBlock(t);
  const sold = achieved != null || winnerBlock;
  const starting_price_pln = startingPriceFromText(t);
  const auction_date = fallbackDate || resultDateFromText(t) || null;
  const area_m2 = kind === 'zabudowana' ? null : flatAreaFromText(t);
  const land_area_m2 = kind === 'zabudowana' ? plotAreaHaFromText(t) : null;

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (winnerBlock) {
    notes.push(
      'achieved price unrecoverable (OCR); inferred SOLD from a winner registration block (NIP/REGON) after the signature line',
    );
  }

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      detail_url: sourceUrl,
      source_url: sourceUrl,
      kind,
      address_raw,
      address,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : isNegativeResult(t) ? 'no_bidders' : 'unknown',
      area_m2,
      ...(land_area_m2 != null ? { land_area_m2 } : {}),
      notes,
    },
  ];
}
