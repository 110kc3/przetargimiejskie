
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}


const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

export function roundFromText(text) {
  const t = text || '';
  const m = /ogłasza\s+(I{1,3}|IV|VI{0,3}|IX)\s+przetarg/.exec(t);
  if (m) return ROMAN_MAP[m[1]] ?? null;
  const body = /\b(VIII|VII|VI|IX|IV|I{1,3})\s+przetarg\w*\s+ustn/.exec(t);
  return body ? ROMAN_MAP[body[1]] ?? null : null;
}

export function auctionDateFromText(text) {
  const m = /PRZETARG\s+ODB[ĘE]DZIE\s+SI[ĘE]\s+W\s+DNIU\s+(\d{1,2})\s+([A-ZŻŹĆŁŚĄĘÓŃa-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
    text || '',
  );
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

export function startingPriceFromText(text) {
  const m = /Cena\s+wywo[łl]awcza\s+w\s+\S+\s+przetargu\s+wynosi\s*:?\s*([\d.,\s]+?)\s*z[łl]/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

const OFFICE_STREET_RE = /paderewskiego/i;

const STREET_BUILDING_RE =
  /ul\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*)*)\s+(\d+[A-Za-z]?)\b/gi;

export function baseStreetAddress(text) {
  const t = text || '';
  STREET_BUILDING_RE.lastIndex = 0;
  let m;
  while ((m = STREET_BUILDING_RE.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return { street, building: m[2].toUpperCase() };
  }
  return null;
}

export function flatUnitsFromText(text) {
  const re = /lokal\s+nr\s+(\d+[A-Za-z]?)\s+o\s+pow\.?\s+(\d+[,.]\d+)\s*m/gi;
  const out = [];
  let m;
  while ((m = re.exec(text || '')) !== null) {
    out.push({ apt: m[1], area_m2: parseArea(m[2]) });
  }
  return out;
}

export function singleFlatUnitFromText(text) {
  const t = text || '';
  const aptM = /lokal\w*\s+mieszkaln\w*(?:,?\s+oznaczon\w*\s+numerem|\s+nr\.?)\s+(\d+[A-Za-z]?)/i.exec(t);
  if (!aptM) return null;
  const areaM = /o\s+powierzchni\.?\s+(\d+[,.]\d+)\s*m/i.exec(t);
  return { apt: aptM[1], area_m2: areaM ? parseArea(areaM[1]) : null };
}


export function parcelFromText(text) {
  const m = /dzia[łl]k\w*\s+nr\.?\s+(\d+(?:\/\d+)?)/i.exec(text || '');
  return m ? m[1] : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\s+\d+\s+(?:Miasto\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ]*)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

export function landStreetFromText(text) {
  const re =
    /przy\s+ul(?:icy)?\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*){0,2})(?=\s*[,;.]|\s+oznaczon|\s+obr[ęe]b|\s+w\s+rejonie|$)/gi;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return street;
  }
  return null;
}

export function plotAreaFromText(text) {
  const ha = /o\s+pow(?:ierzchni)?\.?\s+(\d+[,.]\d+)\s*ha\b/i.exec(text || '');
  if (ha) {
    const v = Number(ha[1].replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  return null;
}


export function parseAnnouncementPage(html, url) {
  const text = stripTags(html);
  if (!text) return [];

  const kind = classifyKind(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return [];
    const address_raw = street ? `ul. ${street}` : null;
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(text),
      area_m2: plotAreaFromText(text),
      address_raw,
      address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln,
      auction_date,
      round,
      detail_url: url,
    }];
  }

  const base = baseStreetAddress(text);
  if (!base) return [];

  const units = flatUnitsFromText(text);
  if (units.length > 0) {
    return units.map(({ apt, area_m2 }) => {
      const address = parseAddress(`${base.street} ${base.building}/${apt}`);
      return {
        kind: 'mieszkalny',
        address_raw: `ul. ${base.street} ${base.building}/${apt}`,
        address,
        area_m2,
        starting_price_pln,
        auction_date,
        round,
        detail_url: url,
      };
    });
  }

  const single = singleFlatUnitFromText(text);
  const apt = single?.apt ?? null;
  const area_m2 = single?.area_m2 ?? null;
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  const address = parseAddress(addressStr);
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `ul. ${addressStr}`,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
  }];
}


const BOARD_LINK_RE = /<li[^>]*>\s*<a\s+href="([^"]+)"\s+title="([^"]*)"[^>]*>/gi;

export function parseBoardPage(html, base) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  let m;
  BOARD_LINK_RE.lastIndex = 0;
  while ((m = BOARD_LINK_RE.exec(html)) !== null) {
    const href = m[1].trim();
    if (seen.has(href)) continue;
    seen.add(href);
    const url = /^https?:\/\//i.test(href) ? href : base + href;
    out.push({ url, title: stripTags(m[2]) });
  }
  return out;
}

export function isWykazSaleTitle(title) {
  const t = (title || '').toLowerCase();
  if (!/wykaz/.test(t)) return false;
  if (/bezprzetargow/.test(t)) return false;
  if (/dzier[żz]aw|najem|najmu/.test(t)) return false;
  if (/u[żz]yczeni/.test(t)) return false;
  return /sprzeda/.test(t);
}


function addressFromResultText(text) {
  const base = baseStreetAddress(text);
  if (!base) return null;
  const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s+(\d+[A-Za-z]?)/i.exec(text || '');
  const apt = aptM ? aptM[1] : null;
  return parseAddress(apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`);
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = /<[a-z][\s\S]*>/i.test(text) ? stripTags(text) : String(text);

  const isResultNotice =
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynik\w*\s+przetargu/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /wynikiem\s+negatywnym/i.test(t);
  if (!isResultNotice) return [];

  const kind = classifyKind(t);
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  const achievedM = /cena\s+osi[ąa]gni[ęe]ta[\s\S]{0,40}?([\d][\d.,\s]*)\s*z[łl]/i.exec(t);
  const buyerM = /nabywc[ąa][\s\S]{0,60}?zosta[łl][\s\S]{0,60}?(?:za\s+cen[ęe])?\s*([\d][\d.,\s]*)\s*z[łl]/i.exec(t);
  const achieved = achievedM ? parsePLN(achievedM[1]) : buyerM ? parsePLN(buyerM[1]) : null;

  const unsold = /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi[łl]|brak\s+(?:ofert|oferent|uczestnik|wp[łl]aty\s+wadium)/i.test(t);
  const outcome = unsold ? 'unsold' : achieved != null ? 'sold' : 'open';

  const resultDateM = /(?:w\s+dniu|z\s+dnia)\s+(\d{1,2}\s+[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})/i.exec(t);
  const auction_date = (resultDateM && parseDateText(resultDateM[1])) ?? auctionDateFromText(t) ?? fallbackDate ?? null;

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const street = landStreetFromText(t);
    if (!dzialka_nr && !street) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plotAreaFromText(t),
      address_raw: street ? `ul. ${street}` : null,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason: unsold ? 'wynik negatywny' : null,
      auction_date,
      source_pdf: sourceUrl,
    }];
  }

  const address = addressFromResultText(t);
  if (!address) return [];
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    auction_date,
    source_pdf: sourceUrl,
  }];
}
