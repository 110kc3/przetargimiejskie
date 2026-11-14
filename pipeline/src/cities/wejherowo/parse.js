
import { parseAddress } from '../../core/normalize.js';

const PL_MONTHS = {
  stycznia: 1, styczeń: 1, styczen: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8, sierpien: 8,
  września: 9, wrzesień: 9, wrzesien: 9,
  października: 10, październik: 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}


export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]dzie\s+si[ęe]\s+dnia\s+([\s\S]{0,60})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  const num = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(scope);
  if (num) return iso(num[3], num[2], num[1]);
  return null;
}

export function priceFromText(text) {
  if (!text) return null;
  const start = text.search(/cena\s+wywo[łl]awcza/i);
  if (start < 0) return null;
  const region = text.slice(start, start + 200);
  const m = /([\d][\d .,]*)(?:,\d{2})?\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function areaFromText(text) {
  if (!text) return null;
  const lab =
    /powierzchni\w*\s+u[żz]ytkow\w*\s+([\d.,]+)\s*m/i.exec(text) ||
    /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,20}([\d.,]+)\s*m/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (v && v > 0 && v < 300) return v;
  }
  const M2_RE = /([\d.,]+)\s*m2/gi;
  let m;
  M2_RE.lastIndex = 0;
  while ((m = M2_RE.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0 || v >= 300) continue;
    const before = text.slice(Math.max(0, m.index - 50), m.index);
    if (/dzia[łl]k|grunt|obr[eę]b|udzia[łl]/i.test(before)) continue;
    return v;
  }
  return null;
}

export function roundFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const ORDINAL_PRZETARG_RE =
    /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t|sz[oó]st)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,50}))/g;
  ORDINAL_PRZETARG_RE.lastIndex = 0;
  let m;
  while ((m = ORDINAL_PRZETARG_RE.exec(t)) !== null) {
    const suffix = m[2] || '';
    if (/\b(?:odby[łl]|zako[ńn]czy[łl])/.test(suffix)) continue;
    const stem = m[1];
    if (/^pierwsz/.test(stem)) return 1;
    if (/^drug/.test(stem)) return 2;
    if (/^trzeci/.test(stem)) return 3;
    if (/^czwart/.test(stem)) return 4;
    if (/^pi[ąa]t/.test(stem)) return 5;
    if (/^sz[oó]st/.test(stem)) return 6;
    return null;
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

export function addressFromBody(text) {
  if (!text) return null;
  const m =
    /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)\s+[\wąćęłńóśźż\s,]*przy\s+(?:ul\.\s*|os\.\s*|Osiedlu\s+|al\.\s*|pl\.\s*)?([A-ZŁŚĆĘĄÓŹŻŃ][\wąćęłńóśźż.\s]+?)\s+(\d+[A-Za-z]?)\s+(?:w\s+Wejherowie|,\s*o\s+powierzchni|oraz\s+udzia)/i
      .exec(text);
  if (!m) return null;
  const apt = m[1];
  const street = m[2].replace(/\s+$/, '').replace(/^(ul\.|os\.|al\.|pl\.)\s*/i, '');
  const building = m[3];
  return parseAddress(`${street} ${building}/${apt}`);
}


export function parseAnnouncement(text) {
  return {
    address: addressFromBody(text),
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
  };
}


const RESULT_GUARD_RE = /(?:wynik|rozstrzygni[eę]|wynik[ui]\s+przetarg)/i;

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !RESULT_GUARD_RE.test(text)) return [];

  let auctionDate = null;
  const dateM =
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s+r\.?\s+odby[łl]/i.exec(text);
  if (dateM) {
    const mon = PL_MONTHS[dateM[2].toLowerCase()];
    if (mon) auctionDate = iso(dateM[3], mon, dateM[1]);
  }
  if (!auctionDate) {
    const numM = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text);
    if (numM) auctionDate = iso(numM[3], numM[2], numM[1]);
  }
  if (!auctionDate) auctionDate = fallbackDate;

  const address = addressFromBody(text);
  if (!address) return [];

  const startingPrice = priceFromText(text);

  const areaMqm = areaFromText(text);

  const kind = 'mieszkalny';

  const negative =
    /wynik(?:iem)?\s+negatywn|nie\s+wyłoniono\s+nabywcy|brak\s+ofert|odstąpi[łl]\s+od\s+zawarcia/i.test(text);

  let outcome, finalPrice, unsoldReason;
  if (negative) {
    outcome = 'unsold';
    finalPrice = null;
    unsoldReason = 'no_buyer';
  } else {
    const achM =
      /osi[ąa]gni[ęe]ta\s+w\s+wyniku\s+przetargu\s*[:=]?\s*([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(text) ||
      /cena\s+sprzeda[żz]y\s*[:=]?\s*([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(text) ||
      /za\s+kwot[eę]\s+([\d][\d .]*(?:,\d{2})?)\s*z[łl]/i.exec(text);
    finalPrice = achM ? parsePLN(achM[1]) : null;
    outcome = finalPrice != null ? 'sold' : 'unsold';
    unsoldReason = outcome === 'unsold' ? 'no_buyer' : null;
  }

  return [{
    address,
    kind,
    auction_date: auctionDate,
    round: roundFromText(text),
    area_m2: areaMqm,
    starting_price_pln: startingPrice,
    outcome,
    unsold_reason: unsoldReason,
    final_price_pln: finalPrice,
    source_pdf: sourceUrl,
    notes: null,
  }];
}
