
import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText, parsePLN, areaFromText, auctionDateFromText, roundFromTitle,
  addressFrom, resolveKind,
} from '../../core/finn-bip.js';

export { htmlToText };

const OFFICE_STREET_RE = /poniatowskiego/i;

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };


export function isResultTitle(title) {
  const t = (title || '').toLowerCase();
  if (!/informacj\w*\s+o\s+wynik\w*\s+(?:\w+\s+)?przetarg/.test(t)) return false;
  if (/najem|wynajem|dzier[żz]aw/.test(t)) return false;
  return /sprzeda/.test(t);
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(title)) return false;
  if (/najem|wynajem|dzier[żz]aw/.test(t)) return false;
  if (/^\s*wykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni|informacj\w*\s+komisj/.test(t)) return false;
  return /przetarg/.test(t);
}

export function isSaleBody(text) {
  const t = text || '';
  if (/na\s+wynajem|w\s+dzier[żz]aw[ęe]|na\s+najem/i.test(t)) return false;
  return /na\s+sprzeda[żz]/i.test(t);
}


export function roundFromBody(text) {
  const m = /\b(VIII|VII|VI|IX|IV|V|X|I{1,3})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? ROMAN[m[1]] ?? null : null;
}

export function startingPriceFromText(text) {
  const m = /cen[aęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,250}?wynosi[a-ząćęłńóśźż]*\s*(?:brutto\s*)?[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /cen[aęy]\s+nabycia[\s\S]{0,80}?wynosi\s*(?:brutto\s*)?[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const NEGATIVE_RE = /wynikiem\s+negatywnym|brak\s+(?:ofert|oferent|uczestnik)|nie\s+wy[łl]oniono|nie\s+odnotowano|nikt\s+nie/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}


export function parcelFromText(text) {
  const t = text || '';
  let m = /dz(?:iałk\w*)?\.?\s+nr\.?\s*([\d]+\/\d+)/i.exec(t);
  if (m) return m[1];
  m = /nr\s+ewid(?:\.|ency\w*)?\s*(?:działki\s*)?([\d]+\/\d+)/i.exec(t);
  return m ? m[1] : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/.exec(text || '');
  return m ? m[1].trim() : null;
}

export function plotAreaFromText(text) {
  const t = text || '';
  const ha = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(t);
  if (m2) { const v = Number(m2[1].replace(/[\s ]/g, '')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

const LAND_STREET_STOP =
  '(?=\\s*[,;.]|\\s+stanowi|\\s+przeznaczon|\\s+wpisan|\\s+po[łl]o[żz]on|\\s+oznaczon\\w*\\s+w\\s+ewidencj|\\s+w\\s+[A-ZŻŹĆŁŚ]|\\s+obr[ęe]b|\\s+ksi|\\n|$)';
const LAND_STREET_RE = new RegExp(
  `(?:przy|w\\s+rejonie|po[łl]o[żz]on\\w+\\s+przy)\\s+ul(?:icy)?\\.?\\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\\- ]+?)${LAND_STREET_STOP}`,
);
export function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(text || '');
  if (!m) return null;
  const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!s || s.length > 30 || OFFICE_STREET_RE.test(s)) return null;
  return s;
}

function stripGarageZoningNoise(text) {
  return (text || '').replace(/gara[żz]ami|gara[żz]ac?h|gara[żz]e\b/gi, '');
}

export function resolveKindLocal(title, text) {
  const generic = resolveKind(title, stripGarageZoningNoise(text));
  if (generic !== 'unknown') return generic;
  const t = text || '';
  if (/nr\s+ewid|dz(?:iałk\w*)?\.?\s+nr/i.test(t) && /\bha\b/i.test(t) && !/\blokal/i.test(t)) return 'grunt';
  return generic;
}

function addressFromSafe(title, text, kind = null) {
  if (kind === 'garaz') {
    const street = landStreetFromText(text);
    if (street) {
      const address = parseAddress(`ul. ${street} garaż nr 0`);
      if (address) return { address_raw: `ul. ${street}`, address };
    }
  }
  const addr = addressFrom(title, text);
  if (addr && OFFICE_STREET_RE.test(addr.address.street)) return null;
  return addr;
}


export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  if (!isSaleBody(text)) return null;
  const kind = resolveKindLocal(title, text);
  const round = roundFromTitle(title) ?? roundFromBody(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return {
      kind: 'grunt', dzialka_nr, obreb: obrebFromText(text), area_m2: plotAreaFromText(text),
      address_raw, address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln, auction_date, round, detail_url: url, source_url: url,
    };
  }

  const addr = addressFromSafe(title, text, kind);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(text),
    starting_price_pln, auction_date, round, detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!/o\s+wyniku|cena\s+nabycia|wynikiem\s+negatywnym/i.test(t)) return [];
  if (/na\s+najem|na\s+wynajem|na\s+dzier[żz]aw[ęe]/i.test(t)) return [];
  const notes = [];
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromTitle(t) ?? roundFromBody(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(t);
  const kind = resolveKindLocal('', t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const street = landStreetFromText(t);
    if (!dzialka_nr && !street) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: obrebFromText(t),
      area_m2: plotAreaFromText(t), address_raw: street ? `ul. ${street}` : null, round,
      starting_price_pln, final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    }];
  }

  const addr = addressFromSafe('', t, kind);
  if (!addr) return [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: areaFromText(t), notes,
  }];
}
