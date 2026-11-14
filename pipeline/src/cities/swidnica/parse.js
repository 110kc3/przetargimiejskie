import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, priceFromText, areaFromText, parsePLN, shareFromTitle } from '../../core/finn-bip.js';

export { htmlToText };


export function isOutOfScopeTitle(title) {
  const t = (title || '').toLowerCase();
  if (/dzier[żz]aw|najem|wynajem/.test(t)) return true;
  if (/^\s*wykaz/.test(t)) return true;
  if (/rokowa/.test(t) && !/przetarg/.test(t)) return true;
  return false;
}

export function isCancelledTitle(title) {
  return /odwo[łl]an|uniewa[żz]ni/i.test(title || '');
}

export function titleInScopeKind(title) {
  const kind = classifyKind(title || '');
  return kind === 'mieszkalny' || kind === 'zabudowana' || kind === 'uzytkowy' || kind === 'garaz' ? kind : null;
}

export function isSaleTitle(title) {
  const t = (title || '').toLowerCase();
  return /przetarg/.test(t) && /sprzeda/.test(t);
}


export function isResultText(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wyniku/i.test(t) ||
    /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu/i.test(t)
  );
}

export function achievedPriceFromText(text) {
  const m = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:\s*([^.]+?)\s*z[łl]\.?/i.exec(text || '');
  if (!m || !/\d/.test(m[1])) return null;
  return parsePLN(m[1]);
}

export function buyerFromText(text) {
  const m = /Osoba\s+ustalona\s+jako\s+nabywca\s+nieruchomo[śs]ci\s*:\s*([^.]+?)\s*\./i.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  if (!/[A-ZŻŹĆŁŚĄĘÓŃ]/.test(raw)) return null;
  return raw.replace(/\s+/g, ' ').trim();
}

export function unsoldReasonFromText(text) {
  const t = text || '';
  if (/wp[łl]aci[łl][ao]?\s+0\s+os[oó]b/i.test(t)) return 'no_wadium';
  if (/dopuszczon\w*\s+0\s+os[oó]b/i.test(t)) return 'no_participants';
  return 'unknown';
}


const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const WORD_ROUND_MAP = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, pi: 5 };
const WORD_ROUND_RE = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i;

export function roundFrom(titleOrText) {
  const t = titleOrText || '';
  const w = WORD_ROUND_RE.exec(t);
  if (w) return WORD_ROUND_MAP[w[1].toLowerCase()] ?? null;
  if (/^\s*kolejny\b/i.test(t)) return 2;
  const m = /^\s*(I{1,3}|IV|V)\s+przetarg/.exec(t);
  if (m) return ROMAN[m[1]] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}


const ADDRESS_RE =
  /przy\s+(?:ul\.?|ulicy|[Aa]l\.?|[Aa]lei|placu|pl\.?|os\.?|osiedlu)\s+([A-ZŻŹĆŁŚĄĘÓŃ][\p{L}.\- ]+?)\s+nr\.?\s*(\d+(?:[-/]\d+)?[A-Za-z]?)\b/u;
const APT_RE = /lokal\w*\s+(?:mieszkaln\w*|niemieszkaln\w*|u[żz]ytkow\w*)\s+nr\.?\s*(\d+[A-Za-z]?)/i;

export function addressFrom(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const m = ADDRESS_RE.exec(src);
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const building = m[2].toUpperCase();
  const aptM = APT_RE.exec(src);
  const apt = aptM ? aptM[1] : null;
  const raw = apt ? `ul. ${street} ${building}/${apt}` : `ul. ${street} ${building}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

export function garageAddressFrom(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const noM = /gara[żz]u?\s*nr\.?\s*(\d+)/i.exec(src);
  if (!noM) return null;
  const streetM = ADDRESS_RE.exec(src);
  if (!streetM) return null;
  const street = streetM[1].replace(/\s+/g, ' ').trim();
  const building = streetM[2].toUpperCase();
  const raw = `ul. ${street} ${building} garaż nr ${noM[1]}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

function resolveAddress(title, text, kind) {
  if (kind === 'garaz') return garageAddressFrom(title, text) || addressFrom(title, text);
  return addressFrom(title, text);
}

function kindFromSpecificUnitPhrase(text) {
  const t = text || '';
  if (/lokal\w*\s+mieszkaln\w*\s+nr\.?\s*\d+[A-Za-z]?/i.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+(?:niemieszkaln\w*|u[żz]ytkow\w*)\s+nr\.?\s*\d+[A-Za-z]?/i.test(t)) return 'uzytkowy';
  if (/gara[żz]\w*\s+nr\.?\s*\d+/i.test(t)) return 'garaz';
  return null;
}

function resolveKind(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const specific = kindFromSpecificUnitPhrase(src);
  if (specific) return specific;
  if (/nieruchomo[śs]ci\s+gruntow|niezabudowan|dzia[łl]k\w*\s+po[łl]o[żz]on/i.test(src)) return 'grunt';
  return classifyKind(src);
}


export function auctionDateFromText(text) {
  const m = /odb[yę][a-ząćęłńóśźż]*\s+si[ęe][^0-9]{0,60}?(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}


export function buildAnnouncementRecord(title, text, url) {
  const kind = resolveKind(title, text);
  if (kind === 'grunt' || kind === 'unknown') return null;
  const addr = resolveAddress(title, text, kind);
  if (!addr) return null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFrom(title),
    auction_date: auctionDateFromText(text),
    detail_url: url,
    source_url: url,
    share: shareFromTitle(title, text),
  };
}

export function buildResultRecord(text, url) {
  if (!text) return null;
  const kind = resolveKind('', text);
  if (kind === 'grunt' || kind === 'unknown') return null;
  const addr = resolveAddress('', text, kind);
  if (!addr) return null;
  const achieved = achievedPriceFromText(text);
  const buyer = achieved != null ? buyerFromText(text) : null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    round: roundFrom(text),
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    final_price_pln: achieved,
    outcome: achieved != null ? 'sold' : 'unsold',
    unsold_reason: achieved != null ? null : unsoldReasonFromText(text),
    source_pdf: url,
    notes: buyer ? [`nabywca: ${buyer}`] : [],
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const rec = buildResultRecord(text, sourceUrl);
  if (!rec) return [];
  if (!rec.auction_date) rec.auction_date = fallbackDate || null;
  return [rec];
}
