import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export const PL_MONTHS = {
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

export function cleanText(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&oacute;/g, 'ó')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;/g, '„')
    .replace(/&rdquo;/g, '”')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(str) {
  if (!str) return null;
  const cleaned = String(str)
    .replace(/\s+/g, '')
    .replace(/zł|pln/gi, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const num = Math.round(parseFloat(m[0]));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function parseArea(str) {
  if (!str) return null;
  const cleaned = String(str)
    .replace(/\s+/g, '')
    .replace(/m2|m²|hektara|ha|metra/gi, '')
    .replace(',', '.');
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const val = parseFloat(m[0]);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function parseDate(str) {
  if (!str) return null;
  const mIso = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;

  const mDot = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (mDot) {
    const day = mDot[1].padStart(2, '0');
    const mon = mDot[2].padStart(2, '0');
    return `${mDot[3]}-${mon}-${day}`;
  }

  const mPl = str.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (mPl) {
    const mon = PL_MONTHS[mPl[2].toLowerCase()];
    if (mon) {
      const day = mPl[1].padStart(2, '0');
      return `${mPl[3]}-${mon}-${day}`;
    }
  }

  return null;
}

export function extractRound(title, text = '') {
  const combined = `${title || ''} ${text || ''}`;
  const mRoman = combined.match(/\b(IV|III|II|I|V|VI)\s+przetarg/i);
  if (mRoman) {
    const r = mRoman[1].toUpperCase();
    if (r === 'I') return 1;
    if (r === 'II') return 2;
    if (r === 'III') return 3;
    if (r === 'IV') return 4;
    if (r === 'V') return 5;
    if (r === 'VI') return 6;
  }
  const mWord = combined.match(/\b(pierwsz[a-z]*|drugi[a-z]*|trzeci[a-z]*|czwart[a-z]*|kolejn[a-z]*)\s+przetarg/i);
  if (mWord) {
    const w = mWord[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzec')) return 3;
    if (w.startsWith('czwart')) return 4;
    if (w.startsWith('kolejn')) return 2;
  }
  return 1;
}

export function extractParcels(text) {
  if (!text) return [];
  const parcels = [];
  const re = /(?:dzia[łl][a-ząćęłńóśźż]*(?:[^\n\r\d]*?(?:numerem|nr|numer))?|nr\s+ewid\.|dzia[łl]ek|dzia[łl]ki\s+ewidencyjnej:?)\s*(?:numer\s*|nr\s*)?([0-9]+(?:\/[0-9]+)?)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const p = m[1].trim();
    if (p && !parcels.includes(p)) parcels.push(p);
  }
  return parcels;
}

export function extractKw(text) {
  if (!text) return [];
  const re = /[A-Z0-9]{4}\/\d{8}\/\d/gi;
  const matches = text.match(re) || [];
  return Array.from(new Set(matches.map((k) => k.toUpperCase())));
}

export function isAnnouncement(title = '') {
  const t = title.toLowerCase();
  if (/wynik|rozstrzyg|protoko[łl]u/i.test(t)) return false;
  if (/bezprzetarg/i.test(t)) return false;
  if (/wykaz/i.test(t) && !/\bprzetarg/i.test(t)) return false;
  if (/dzierżaw|najem|darowizn/i.test(t)) return false;
  return /\bprzetarg/i.test(t) && (/sprzeda|lokal|nieruchomo/i.test(t));
}

export function isResult(title = '') {
  return /wynik|rozstrzyg|zatwierdzeni[a-z]*\s+protoko[łl]u|informacja\s+o\s+wynik/i.test(title || '');
}

export function isFlat(title, text = '') {
  const combined = `${title || ''} ${text || ''}`.toLowerCase();
  if (/lokal\w*\s+użytkow\w*/i.test(combined)) return false;
  if (/działk\w*\s+(?:niezabudowan|budowlan|roln|gruntu)/i.test(combined) && !/lokal/i.test(combined)) return false;
  return /lokal\w*\s+mieszkaln\w*|mieszkani\w*|nieruchomo[sś]ci\s+lokalowej/i.test(combined);
}

export function parseAnnouncement(text, title, url) {
  const combined = `${title} ${text}`;
  const round = extractRound(title, text);
  const parcels = extractParcels(combined);
  const kw = extractKw(combined);

  let address = null;
  const mAddr = combined.match(/(?:przy\s+(?:ulicy|ul\.|al\.|alei)|położon[a-ząćęłńóśźż]+\s+w\s+Oławie\s+przy\s+(?:ulicy|ul\.|al\.|alei)?)\s*([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\.\s\/-]+?)(?:\s+w\s+Oławie)?(?:,|\.|\s+o\s+pow|\s+\(|\s+dla\s+której|\s+stanowiąc)/i);
  if (mAddr) {
    address = parseAddress(mAddr[1].trim(), 'Oława');
  }

  let area_m2 = null;
  const mArea = combined.match(/(?:powierzchni(?:i|a)?\s+użytkowej|pow\.\s*użytkow[a-z]*|o\s+pow(?:ierzchni)?)\s*:?\s*([\d\s,.]+)\s*(?:m2|m²|metra)/i);
  if (mArea) {
    area_m2 = parseArea(mArea[1]);
  } else {
    const mHa = combined.match(/o\s+pow\.\s*([\d\s,.]+)\s*(?:ha|hektara)/i);
    if (mHa) {
      const ha = parseArea(mHa[1]);
      if (ha) area_m2 = Math.round(ha * 10000);
    }
  }

  let price = null;
  const mPrice = combined.match(/(?:Cena\s+wywoławcza[^\n\r:]*(?:netto)?|Cena\s+wywoławcza\s+nieruchomości\s+netto\s*\(złotych\))\s*:?\s*([\d\s,.]+)\s*(?:zł|pln|\n|$)/i);
  if (mPrice) {
    price = parsePLN(mPrice[1]);
  } else {
    const mPriceSimple = combined.match(/Cena\s+wywoławcza:?\s*([\d\s,.]+)\s*(?:zł|pln)?/i);
    if (mPriceSimple) price = parsePLN(mPriceSimple[1]);
  }

  let auction_date = null;
  const mDate = combined.match(/(?:odbędzie\s+się[^\n\r]*w\s+dniu|przetarg[^\n\r]*w\s+dniu|termin\s+przetargu:?)\s*(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (mDate) {
    auction_date = parseDate(mDate[1]);
  }

  const kind = classifyKind(combined);

  return {
    source_url: url,
    title,
    address,
    area_m2,
    price,
    auction_date,
    round,
    kind,
    parcels,
    kw,
  };
}

export function parseResultDoc(ref) {
  const { text, pdf_url, auction_date, title } = ref;
  const combined = `${title || ''} ${text || ''}`;
  const round = extractRound(title, text);
  const parcels = extractParcels(combined);

  let address = null;
  const mAddr = combined.match(/(?:przy\s+(?:ulicy|ul\.|al\.|alei)|ulica\s+|ul\.\s*)([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż0-9\.\s\/-]+?)(?:\s+w\s+Oławie)?(?:,|\.|\s+działka|\s+Liczba|\s+o\s+pow)/i);
  if (mAddr) {
    address = parseAddress(mAddr[1].trim(), 'Oława');
  }

  let price_reserve = null;
  const mReserve = combined.match(/Cena\s+wywoławcza[^\n\r:]*[:–-]?\s*([\d\s,.]+)\s*(?:zł|pln)?/i);
  if (mReserve) price_reserve = parsePLN(mReserve[1]);

  let price_achieved = null;
  const mAchieved = combined.match(/(?:Najwyższa\s+cena\s+osiągnięta[^\n\r:]*|cena\s+osiągnięta[^\n\r:]*|wylicytowan[a-z]*):?\s*([\d\s,.]+)\s*(?:zł|pln)?/i);
  if (mAchieved) price_achieved = parsePLN(mAchieved[1]);

  let status = 'unresolved';
  if (/nie\s+wyłoniono\s+nabywcy|wynikiem\s+negatywnym|brak\s+uczestników|brak\s+osób/i.test(combined)) {
    status = 'unresolved';
    price_achieved = null;
  } else if (price_achieved && price_achieved > 0) {
    status = 'won';
  }

  let buyer = null;
  const mBuyer = combined.match(/(?:nabywca\s+nieruchomości:?\s*|Imię\s+i\s+nazwisko[^\n\r]*nabywca[^\n\r]*:\s*)([A-ZĄĆĘŁŃÓŚŹŻ][^\n\r]{2,80})/i);
  if (mBuyer) {
    buyer = cleanText(mBuyer[1]);
  }

  return {
    source_url: pdf_url,
    auction_date: auction_date || parseDate(combined),
    address,
    round,
    price_reserve,
    price_achieved,
    status,
    buyer,
    parcels,
  };
}
