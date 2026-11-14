import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  priceFromText, areaFromText, auctionDateFromText, roundFromText, addressFrom,
} from '../../core/finn-bip.js';


export function cleanText(s) {
  return (s || '')
    .replace(/[­​‌‍﻿⁠]/g, '')
    .replace(/ /g, ' ')
    .replace(/\f/g, ' ');
}


export function isSaleTitle(title) {
  const t = (title || '').toLowerCase();
  if (/najem|najmu|dzier[żz]aw|wynajem|rokowa|bezprzetarg/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

export function isSaleBody(text) {
  const head = (text || '').slice(0, 400).toLowerCase();
  if (/najem|najmu|dzier[żz]aw|wynajem|rokowa|bezprzetarg/.test(head)) return false;
  return /przetarg/.test(head) && /na\s+sprzeda[żz]/.test(head);
}


export function resolveKind(text) {
  const t = cleanText(text);
  let k = classifyKind(t.slice(0, 700));
  if (k === 'unknown') k = classifyKind(t.slice(0, 1500));
  return k;
}


const OS_RE = /\bos\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/;
const BLOK_RE = /blok\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;
const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

export function flatAddressFrom(text) {
  const os = OS_RE.exec(text || '');
  const blok = BLOK_RE.exec(text || '');
  if (!os || !blok) return null;
  const lok = LOKAL_NR_RE.exec(text || '');
  const raw = `os. ${os[1].replace(/\s+/g, ' ').trim()} ${blok[1]}${lok ? '/' + lok[1] : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

export function flatAreaFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*\d+[A-Za-z]?\s+o\s+powierzchni\s+([\d]+[.,]\d+)\s*m/i.exec(text || '');
  if (m) { const v = Number(m[1].replace(',', '.')); if (Number.isFinite(v) && v > 0) return v; }
  return areaFromText(text);
}


const OFFICE_STREET_RE = /mickiewicza/i;

const DZIALKA_RE = /dzia[łl][kc][a-ząćęłńóśźż]*\s+(?:ewidencyjn[a-ząćęłńóśźż]*\s+)?(?:o\s+)?(?:nr\.?|numer\w*)\s*(\d+\s*\/\s*\d+|\d+)/i;
const TABLE_PARCEL_RE = /\b\d+\.\s+(\d{3,5}\s*\/\s*\d+)/;

export function parcelFromText(text) {
  let m = DZIALKA_RE.exec(text || '');
  if (m) return m[1].replace(/\s+/g, '');
  m = TABLE_PARCEL_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, '') : null;
}

export function landAreaFromText(text) {
  const ha = /o\s+powierzchni\s+([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+powierzchni\s+([\d][\d.,\s]*?)\s*m\s*[²2]\b/i.exec(text || '');
  if (m2) { const v = Number(m2[1].replace(/[\s]/g, '').replace(',', '.')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

export function landStreetFromText(text) {
  const re = /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,.;]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+przeznaczon|\n|$)/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (s && !OFFICE_STREET_RE.test(s)) return s;
  }
  return null;
}


export function subjectKey(r) {
  if (r.kind === 'grunt') return r.dzialka_nr ? `dz|${r.dzialka_nr}` : null;
  return r.address ? r.address.key : null;
}


export function parseAnnouncement(title, rawText, url) {
  const text = cleanText(rawText);
  if (!isSaleBody(text) && !isSaleTitle(title)) return null;
  const kind = resolveKind(text);
  const round = roundFromText(text) ?? roundFromText(title) ?? 1;
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return {
      kind: 'grunt', dzialka_nr, obreb: null, area_m2: landAreaFromText(text),
      address_raw, address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln, auction_date, round, detail_url: url, source_url: url,
    };
  }

  const addr = flatAddressFrom(text) || addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address,
    area_m2: flatAreaFromText(text), starting_price_pln, auction_date, round,
    detail_url: url,
  };
}

export function parseResultDoc(rawText, fallbackDate, sourceUrl) {
  if (!rawText) return [];
  const text = cleanText(rawText);
  if (!text.trim()) return [];
  if (!isSaleBody(text)) return [];
  const kind = resolveKind(text);
  const round = roundFromText(text) ?? 1;
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const starting_price_pln = priceFromText(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  notes.push(
    'parse: no achieved-price document exists on this server-HTML source ' +
    '(results are on the bip.malopolska JS-SPA, out of scope) — outcome inferred ' +
    'from a later round being published, not a source-stated hammer price',
  );

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return [];
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: null,
      area_m2: landAreaFromText(text), address_raw: street ? `ul. ${street}` : null,
      address: null, round, starting_price_pln, final_price_pln: null,
      outcome: 'unsold', unsold_reason: 'superseded_by_next_round', notes,
    }];
  }

  const addr = flatAddressFrom(text) || addressFrom('', text);
  if (!addr) return [];
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln: null, outcome: 'unsold',
    unsold_reason: 'superseded_by_next_round', area_m2: flatAreaFromText(text), notes,
  }];
}
