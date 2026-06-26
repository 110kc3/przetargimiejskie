// Trzebinia parsers.
//
// Closest analog: the FINN-BIP HTML cities (Bytom / Świętochłowice / Mysłowice).
// Reuses core/finn-bip.js helpers (htmlToText, parsePLN, classifyKind,
// areaFromText, addressFrom). Deviations groundtruthed against the REAL live
// article bodies (verified 2026-06-26): the announcement carries cena wywoławcza
// + termin przetargu in a TABLE; the result notice is prose. The OFFICE "ulica
// Narutowicza 10" appears in every doc and is never the property street.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, areaFromText, auctionDateFromText, addressFrom } from '../../core/finn-bip.js';

export { htmlToText };

const OFFICE_STREET_RE = /narutowicz/i;

export function isResultTitle(title) {
  return /informacj\w*[\s\S]*?o\s+wynik|o\s+wynik\w*\s+przetarg/i.test(title || '');
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem|bezprzetarg/.test(t)) return false;
  if (/^\s*wykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const m = /\b(VIII|VII|VI|IX|IV|V|X|I{1,3})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? ROMAN[m[1]] ?? null : null;
}

export function tablePriceFromText(text) {
  const m = /(?<![%\d.,])(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function startingPriceFromText(text) {
  const m = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,140}?([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return (m ? parsePLN(m[1]) : null) ?? tablePriceFromText(text);
}

export function tableDateFromText(text) {
  let m = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*,?\s*godzin/i.exec(text || '');
  if (!m) m = /Termin\w*\s+przetarg\w*[\s\S]{0,200}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function achievedPriceFromText(text) {
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+wynios[łl]a\s*[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function parcelFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  const m = /dzia[łl]k\w*\s+(?:nr\.?|numer\w*)\s+([\d]+(?:\/\d+)?(?:\s*(?:,|i)\s*\d+(?:\/\d+)?)*)/i.exec(s) ||
    /numer\w*\s+geodezyjn\w*\s+([\d]+(?:\/\d+)?(?:\s*(?:,|i)\s*\d+(?:\/\d+)?)*)/i.exec(s);
  if (!m) return null;
  const nums = m[1].split(/\s*(?:,|i)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function plotAreaFromText(text) {
  const m = /o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return ha > 0 ? Math.round(ha * 10000) : null;
}

export function landStreetFromText(text) {
  const re = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,.]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+w\s+bezpo|\s+ksi|\s+jednost|\n|$)/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (street && !OFFICE_STREET_RE.test(street)) return street;
  }
  return null;
}

function kindFromText(title, text) {
  const fromTitle = classifyKind(title || '');
  if (fromTitle !== 'unknown') return fromTitle;
  return classifyKind(`${title || ''} ${(text || '').slice(0, 600)}`);
}

export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  const kind = kindFromText(title, text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text) ?? tableDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    return {
      kind: 'grunt', dzialka_nr, obreb: obrebFromText(text), area_m2: plotAreaFromText(text),
      address_raw: street ? `ul. ${street}` : null,
      starting_price_pln, auction_date, round, detail_url: url, source_url: url,
    };
  }

  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(text),
    starting_price_pln, auction_date, round, detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!/o\s+wynik|cena\s+osi[ąa]gni[ęe]ta|wynikiem\s+negatywnym|nabywc/i.test(t)) return [];
  const notes = [];
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = /wynikiem\s+negatywnym|nie\s+wy[łl]oniono|brak\s+(?:ofert|uczestnik)|nie\s+przyst[ąa]pi/i.test(t);
  const kind = kindFromText('', t);

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

  const addr = addressFrom('', t);
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
