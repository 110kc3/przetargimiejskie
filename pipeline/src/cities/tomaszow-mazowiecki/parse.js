import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN } from '../../core/finn-bip.js';

export { htmlToText };


const AUCTION_ANCHOR_RE = /przetarg\w*\s+ustn\w*|ustn\w*\s+przetarg\w*/i;

export function isAuctionSaleDoc(text) {
  const t = text || '';
  if (!AUCTION_ANCHOR_RE.test(t)) return false;
  return /sprzeda/i.test(t);
}

export function isResultNotice(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && /\bo\s+wynik(?:u|ach)\b|rozstrzygni[ęe]ci/i.test(t);
}

export function isAnnouncement(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && !isResultNotice(t) && /og[łl]asza/i.test(t);
}


const APT_FLAT_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;
const APT_COMMERCIAL_RE = /lokal\w*\s+u[żz]ytkow\w*\s+(?:oznaczon\w*\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;
const APT_GARAGE_RE = /gara[żz]\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

const STREET_PLAC_RE = /przy\s+(Placu?\s+[^\n,]+?)\s*(?:nr\.?\s*)?(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\b/i;
const STREET_UL_RE =
  /przy\s+(?:ul\.?|ulicy|al\.?|alei|os\.?|osiedlu)\s+([^\n,]+?)\s*(?:nr\.?\s*)?(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\b/i;

function placToNominative(name) {
  return name.trim().replace(/^Placu\b/, 'Plac');
}

export function builtAddress(text, kind) {
  const m = STREET_PLAC_RE.exec(text) || STREET_UL_RE.exec(text);
  if (!m) return null;
  let street = m[1].replace(/\s+/g, ' ').trim();
  if (/^Placu?\b/i.test(street)) street = placToNominative(street);
  const building = m[2].toUpperCase();
  let apt = null;
  if (kind === 'mieszkalny') apt = APT_FLAT_RE.exec(text)?.[1] ?? null;
  else if (kind === 'uzytkowy') apt = APT_COMMERCIAL_RE.exec(text)?.[1] ?? null;
  else if (kind === 'garaz') apt = APT_GARAGE_RE.exec(text)?.[1] ?? null;
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

const LAND_STREET_RE =
  /przy\s+(?:ul\.?|ulicy|al\.?|alei|os\.?|osiedlu)\s+([^\n,]+?)(?=[,.]|\s+w\s+obr|\s+dzia[łl]|$)/i;
const LAND_STREET_PLAC_RE = /przy\s+(Placu?\s+[^\n,]+?)(?=[,.]|\s+w\s+obr|\s+dzia[łl]|$)/i;
const PARCEL_RE = /numerem\s+(\d+(?:\/\d+)?)/i;
const OBREB_RE = /w\s+obr(?:ębie|ebie|\.)?\s*(\d+[A-Za-z]?)/i;

function landAreaM2(text) {
  const t = text || '';
  const m =
    /dzia[łl]\w*[\s\S]{0,80}?pow(?:ierzchni)?\.?\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(t) ||
    /pow(?:ierzchni)?\.?\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2][\s\S]{0,80}?dzia[łl]/i.exec(t);
  if (!m) return null;
  const v = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function landFields(text) {
  const t = text || '';
  const parcelM = PARCEL_RE.exec(t);
  const streetM = LAND_STREET_PLAC_RE.exec(t) || LAND_STREET_RE.exec(t);
  if (!parcelM && !streetM) return null;
  let street = null;
  if (streetM) {
    street = streetM[1].replace(/\s+/g, ' ').trim();
    if (/^Placu?\b/i.test(street)) street = placToNominative(street);
  }
  return {
    dzialka_nr: parcelM ? parcelM[1] : null,
    obreb: OBREB_RE.exec(t)?.[1] ?? null,
    area_m2: landAreaM2(t),
    address_raw: street ? `ul. ${street}` : null,
  };
}


export function builtAreaM2(text) {
  const m =
    /o\s+(?:łącznej\s+)?pow(?:ierzchni)?\.?\s*(?:u[żz]ytkowej\s*)?[:.]?\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(
      text || '',
    );
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v < 1000 ? v : null;
}


const STARTING_PRICE_RE =
  /cena\s+wy(?:wo[łl]awcz\w*|j[śs]ciow\w*)[\s\S]{0,60}?(?:kwot[ęe]|wynosi)[\s\S]{0,20}?[–-]?\s*([\d][\d.,\s]*?)\s*z[łl]/i;

export function startingPriceFrom(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_PRICE_RE =
  /najwy[żz]sz[ąa]\s+cen[ęe]\s+osi[ąa]gni[ęe]t[ąa]\s+w\s+przetargu\s+stanowi\s+kwota\s*([\d][\d.,\s-]*?)\s*z[łl]/i;

export function achievedPriceFrom(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym/i.test(text || '');
}


const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9, pazdziernika: 10,
  'października': 10, listopada: 11, grudnia: 12,
};

export function auctionDateFromText(text) {
  const t = text || '';
  const spelled = /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  const anySpelled =
    /w\s+dniu\s+(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[śs]nia|pa[źz]dziernika|listopada|grudnia)\s+(\d{4})/i.exec(
      t,
    );
  if (anySpelled) {
    const mon = PL_MONTHS[anySpelled[2].toLowerCase()];
    if (mon) return `${anySpelled[3]}-${String(mon).padStart(2, '0')}-${anySpelled[1].padStart(2, '0')}`;
  }
  return null;
}


const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ORDINAL_WORD = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };

function romanRoundNear(text, anchorRe, windowLen = 30) {
  const m = anchorRe.exec(text || '');
  if (!m) return null;
  const start = m.index + m[0].length;
  const window = text.slice(start, start + windowLen);
  const rm = /^\s*([IVX]+)\s+przetarg/.exec(window);
  return rm ? ROMAN[rm[1]] ?? null : null;
}

function wordRoundNear(text, anchorRe, windowLen = 30) {
  const m = anchorRe.exec(text || '');
  if (!m) return null;
  const start = m.index + m[0].length;
  const window = text.slice(start, start + windowLen);
  const wm = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(window);
  if (!wm) return null;
  const word = wm[1].toLowerCase();
  for (const [stem, n] of Object.entries(ORDINAL_WORD)) if (word.startsWith(stem)) return n;
  return null;
}

export function roundFromAnnouncement(text) {
  const anchor = /og[łl]asza\s*/i;
  return (
    romanRoundNear(text, anchor) ?? wordRoundNear(text, anchor) ?? (/przetarg/i.test(text || '') ? 1 : null)
  );
}

export function roundFromResult(text) {
  const anchor = /(?:wynikach|wyniku|odby[łl]\s+si[ęe])\s*:?\s*/i;
  return (
    romanRoundNear(text, anchor) ?? wordRoundNear(text, anchor) ?? (/przetarg/i.test(text || '') ? 1 : null)
  );
}


export function parseAnnouncement(text, opts = {}) {
  const t = text || '';
  if (!isAnnouncement(t)) return null;
  const { url = null } = opts;
  const kind = classifyKind(t);

  if (kind === 'grunt') {
    const land = landFields(t);
    if (!land) return null;
    return {
      kind: 'grunt',
      ...land,
      round: roundFromAnnouncement(t),
      starting_price_pln: startingPriceFrom(t),
      auction_date: auctionDateFromText(t),
      detail_url: url,
      source_url: url,
    };
  }

  const addr = builtAddress(t, kind);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: builtAreaM2(t),
    round: roundFromAnnouncement(t),
    starting_price_pln: startingPriceFrom(t),
    auction_date: auctionDateFromText(t),
    detail_url: url,
    source_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  if (!isResultNotice(t)) return [];
  const kind = classifyKind(t);
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromResult(t);
  const starting_price_pln = startingPriceFrom(t);
  const final_price_pln = achievedPriceFrom(t);
  const negative = isNegativeOutcome(t);
  const outcome = final_price_pln != null ? 'sold' : negative ? 'unsold' : 'unknown';
  const unsold_reason = negative ? 'wynikiem negatywnym' : null;

  if (kind === 'grunt') {
    const land = landFields(t);
    if (!land) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl || null,
      source_url: sourceUrl || null,
      kind: 'grunt',
      ...land,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      notes: [],
    }];
  }

  const addr = builtAddress(t, kind);
  if (!addr) return [];
  const notes = [];
  if (addr.address.warning) notes.push(addr.address.warning);

  return [{
    auction_date,
    source_pdf: sourceUrl || null,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    area_m2: builtAreaM2(t),
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    notes,
  }];
}
