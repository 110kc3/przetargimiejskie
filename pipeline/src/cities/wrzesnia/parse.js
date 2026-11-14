
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/&bdquo;|&rdquo;/g, '"')
    .replace(/&sect;/g, '§')
    .replace(/&sup2;/g, '²')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(raw) {
  if (!raw) return null;
  const str = cleanText(String(raw));
  if (/brak/i.test(str)) return null;
  const m = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
}

export function parseArea(raw) {
  if (!raw) return null;
  const str = cleanText(String(raw));
  const m = str.replace(/\s/g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(ha|m2|m²|m\.kw\.)?/i);
  if (!m) return null;
  let val = parseFloat(m[1]);
  if (isNaN(val)) return null;
  if (m[2] && m[2].toLowerCase() === 'ha') {
    val = Math.round(val * 10000 * 100) / 100;
  }
  return val;
}

const MONTHS = {
  stycznia: '01',
  lutego: '02',
  marca: '03',
  kwietnia: '04',
  maja: '05',
  czerwca: '06',
  lipca: '07',
  sierpnia: '08',
  września: '09',
  wrzesnia: '09',
  października: '10',
  pazdziernika: '10',
  listopada: '11',
  grudnia: '12',
};

export function parseDate(raw) {
  if (!raw) return null;
  const str = cleanText(String(raw));

  const iso = str.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
  if (iso) return iso[1];

  const dot = str.match(/\b([0-3]?\d)\.([01]?\d)\.(202\d)\b/);
  if (dot) {
    const day = dot[1].padStart(2, '0');
    const month = dot[2].padStart(2, '0');
    return `${dot[3]}-${month}-${day}`;
  }

  const worded = str.match(/\b([0-3]?\d)\s+([a-ząćęłńóśźż]+)\s+(202\d)(?:\s*r\.?|\b)/i);
  if (worded) {
    const day = worded[1].padStart(2, '0');
    const mon = MONTHS[worded[2].toLowerCase()];
    if (mon) return `${worded[3]}-${mon}-${day}`;
  }

  return null;
}

export function extractRound(text) {
  const t = cleanText(text).toLowerCase();
  const m = t.match(/\b(i{1,3}|iv|v|vi)\s+(?:przetarg|ustn)/i);
  if (m) {
    const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
    return map[m[1].toLowerCase()] || 1;
  }
  if (/pierwsz/i.test(t)) return 1;
  if (/drug/i.test(t)) return 2;
  if (/trzec/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  return 1;
}

export function extractParcels(text) {
  const t = cleanText(text);
  const set = new Set();
  const matches = [...t.matchAll(/(?:\bdzia[łl][a-ząćęłńóśźż]*|nr\s+geod\.)[^\d\n]*?([0-9]+(?:\/[0-9]+)?)/gi)];
  for (const m of matches) set.add(m[1]);
  return [...set];
}

export function extractKw(text) {
  const t = cleanText(text);
  const matches = t.match(/\b(PO1F\/[A-Z0-9*]+\/[A-Z0-9*]+|[A-Z]{4}\/\d{8}\/\d)\b/gi);
  return matches ? [...new Set(matches.map((k) => k.toUpperCase()))] : [];
}

export function isAnnouncementTitle(title) {
  const t = cleanText(title).toLowerCase();
  if (isResultTitle(t)) return false;
  if (/wykaz|dzierżaw|najem/i.test(t)) return false;
  return /przetarg|ogłoszenie|ogloszenie|sprzedaż|sprzedaz/i.test(t);
}

export function isResultTitle(title) {
  const t = cleanText(title).toLowerCase();
  return /wynik|informacja\s+o\s+wynik/i.test(t);
}

export function isFlat(title) {
  const t = cleanText(title).toLowerCase();
  if (/użytkow|garaż|grunt|działk/i.test(t)) return false;
  return /mieszkal|lokal|mieszkanie/i.test(t);
}

export function parseAnnouncement(text, title = '', url = '') {
  const combined = `${title}\n${text}`;
  const cleaned = cleanText(combined);

  const round = extractRound(cleaned);
  const parcels = extractParcels(cleaned);
  const kw = extractKw(cleaned);

  let price = null;
  const mPrice = cleaned.match(/Cena\s+wywo[łl]awcza[^\n\r]*?(?:wynosi|wynosiła|:)\s*(\d[\d\s.,]*)(?:z[łl]|\.|$)/i) || cleaned.match(/Cena\s+wywo[łl]awcza[^\d]*?(\d[\d\s.,]*)(?:z[łl]|\.|$)/i);
  if (mPrice) {
    price = parsePLN(mPrice[1]);
  }

  let area_m2 = null;
  const mArea = cleaned.match(/(?:pow(?:ierzchnia|\.)?\s*u[żz]ytk[a-ząćęłńóśźż]*|o\s+pow(?:ierzchni|\.)?|powierzchnia)[^\d]*?(\d+[\d\s.,]*?)(?:\s*(?:m2|m²|m\.kw\.|ha)|\s*\+|$)/i);
  if (mArea) {
    area_m2 = parseArea(mArea[1]);
  }

  let auction_date = null;
  const mDate = cleaned.match(/(?:odbędzie\s+się|termin\s+przetargu|przeprowadzenia\s+dnia|w\s+dniu)[^\d]*?([0-3]?\d[\s.][a-ząćęłńóśźż0-9]+[\s.]202\d)/i);
  if (mDate) {
    auction_date = parseDate(mDate[1]);
  }

  let address_raw = null;
  const mAddr = cleaned.match(/(?:przy\s+ul(?:icy|\.)?|ul\.)\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s-]+?\s+\d+[a-zA-Z]?(?:\/\d+)?)\b/i);
  if (mAddr && !/Ratuszow/i.test(mAddr[0])) {
    address_raw = mAddr[0].trim();
  }

  const kind = classifyKind(cleaned);

  return {
    source_url: url,
    title: cleanText(title),
    round,
    price,
    area_m2,
    auction_date,
    parcels,
    kw,
    address_raw,
    address: address_raw ? parseAddress(address_raw) : null,
    kind,
  };
}

export function parseResultDoc(doc) {
  const { title = '', text = '', pdf_url = '', auction_date = null, source_url = '' } = doc;
  const combined = `${title}\n${text}`;
  const cleaned = cleanText(combined);

  const round = extractRound(cleaned);
  const parcels = extractParcels(cleaned);
  const kw = extractKw(cleaned);

  let price_reserve = null;
  const mRes = cleaned.match(/Cena\s+wywo[łl]awcza[^\d]*?(\d[\d\s.,]*)(?:z[łl]|\.|$)/i);
  if (mRes) {
    price_reserve = parsePLN(mRes[1]);
  }

  let price_achieved = null;
  const mAch = cleaned.match(/(?:osiągnięto\s+cenę|cena\s+osiągnięta|najwyższa\s+cena\s+osiągnięta|cena\s+uzyskana|za\s+kwotę)[^\d]*?(\d[\d\s.,]*)(?:z[łl]|\.|$)/i);
  if (mAch) {
    price_achieved = parsePLN(mAch[1]);
  }

  let status = 'unresolved';
  if (/nie\s+wyłoniono\s+nabywcy|wynikiem\s+negatywnym|brak\s+uczestników|brak\s+osób|brak\s+ofert|brak\s+wpłat\s+wadium/i.test(cleaned)) {
    status = 'unresolved';
    price_achieved = null;
  } else if (price_achieved && price_achieved > 0) {
    status = 'won';
  }

  let buyer = null;
  const mBuyer = cleaned.match(/(?:Nabywcą\s+nieruchomości[^\n\r:]*?został[^\n\r:]*?:?\s*|nabywc[a-ząćęłńóśźż]+(?:\s+nieruchomo[śs]ci)?(?:\s+zosta[łl][a-z]*)?[:\s]+|nabywców:?\s*)([A-ZĄĆĘŁŃÓŚŹŻ][^\n\r.]+)/i);
  if (mBuyer && status === 'won') {
    buyer = cleanText(mBuyer[1]).replace(/\.$/, '').trim();
  }

  let address_raw = null;
  const mAddr = cleaned.match(/(?:przy\s+ul(?:icy|\.)?|ul\.)\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s-]+?\s+\d+[a-zA-Z]?(?:\/\d+)?)\b/i);
  if (mAddr && !/Ratuszow/i.test(mAddr[0])) {
    address_raw = mAddr[0].trim();
  }

  const url = pdf_url || source_url;
  const aDate = auction_date || parseDate(cleaned);

  return {
    source_url: url,
    auction_date: aDate,
    round,
    price_reserve,
    price_achieved,
    status,
    buyer,
    parcels,
    kw,
    address_raw,
    address: address_raw ? parseAddress(address_raw) : null,
  };
}
