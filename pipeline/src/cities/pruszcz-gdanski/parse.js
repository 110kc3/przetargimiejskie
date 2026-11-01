// Parser for Pruszcz Gdański auction notices and results (bip.pruszcz-gdanski.pl)
//
// Handles Logonet eUrząd XML export and HTML documents.

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

export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAnnouncementTitle(title) {
  if (!title) return false;
  return /przetarg|rokowan|ogłoszenie.*przetargu|sprzedaż.*nieruchomo/i.test(title) &&
    !/wynik|informacja o wyniku|unieważnieni|odwołani|komisji/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|informacja o wyniku|rozstrzygnię/i.test(title);
}

export function parsePlDate(text) {
  if (!text) return null;

  const dotMatch = text.replace(/\s+/g, '').match(/\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})/);
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
  }

  const slashMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }

  const namedMatch = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(20\d{2})/i);
  if (namedMatch) {
    const month = PL_MONTHS[namedMatch[2].toLowerCase()];
    if (month) {
      const day = namedMatch[1].padStart(2, '0');
      return `${namedMatch[3]}-${month}-${day}`;
    }
  }

  return null;
}

export function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/(\d[\d\s.]*(?:,\d{2})?)\s*(?:z[łl]|PLN|netto|brutto)/i);
  if (!match) return null;
  const clean = match[1].replace(/\s+/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? null : num;
}

export function parseXmlDoc(xmlStr) {
  const getTag = (tag) => {
    const m = xmlStr.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
    return m ? cleanText(m[1]) : '';
  };

  const url = getTag('url');
  const address = getTag('adres-nieruchomosci') || 'Pruszcz Gdański';
  const title = getTag('przetarg-na') || getTag('rodzaj-nieruchomosci') || '';
  const priceRaw = getTag('cena-wywolawcza');
  const dateRaw = getTag('data-przetargu');
  const body = getTag('tresc');
  const resultRaw = getTag('rozstrzygniecie');

  const price = parsePrice(priceRaw) || parsePrice(body);
  const auctionDate = parsePlDate(dateRaw) || parsePlDate(body);

  const fullText = `${title} ${address} ${body}`;
  const kind = classifyKind(fullText);

  const kwMatch = fullText.match(/\b([A-Z0-9]{4}\/\d{8}\/\d)\b/);
  const kw = kwMatch ? kwMatch[1] : null;

  const parcelMatch = fullText.match(/\b(?:działk[aieę]|działce|dz\.|działki\s+gruntowe\s+niezabudowane\s+nr)\s*[:]?\s*([0-9]+(?:\/[0-9]+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const areaMatch = fullText.match(/(?:powierzchni[aę]?|pow\.)(?:\s+łącznej)?\s*[:]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(m2|m²|ha)?/i);
  let area = null;
  if (areaMatch) {
    const val = parseFloat(areaMatch[1].replace(',', '.'));
    if (!isNaN(val)) {
      area = (areaMatch[2] && areaMatch[2].toLowerCase() === 'ha') ? Math.round(val * 10000) : val;
    }
  }

  const idMatch = url.match(/przetarg-nieruchomosci\/([0-9]+)/);
  const id = idMatch ? idMatch[1] : '';

  return {
    id,
    title,
    url,
    price,
    auctionDate,
    kind,
    kw,
    parcel,
    area,
    address,
    resultRaw,
    body,
  };
}

export function parseAnnouncement(item, docText = '') {
  if (docText.includes('<przetargi-nieruchomosci>')) {
    return parseXmlDoc(docText);
  }

  const title = (item && item.title) || '';
  const text = cleanText(docText);

  const priceMatch = text.match(/(?:cena|stawka)\s+wywoławcza[^\n:]*?:\s*([0-9\s.,]+)\s*zł/i);
  const price = priceMatch ? parsePrice(priceMatch[0]) : parsePrice(text);

  const datePattern = /(?:przetarg\s+odbędzie\s+się|termin\s+przetargu|odbędzie\s+się)[\s\S]*?\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})/i;
  const auctionDateMatch = text.match(datePattern);
  const auctionDate = auctionDateMatch ? `${auctionDateMatch[3]}-${auctionDateMatch[2]}-${auctionDateMatch[1]}` : (item.date ? parsePlDate(item.date) : null);

  const kwMatch = text.match(/\b([A-Z0-9]{4}\/\d{8}\/\d)\b/);
  const kw = kwMatch ? kwMatch[1] : null;

  const parcelMatch = text.match(/\b(?:działk[aieę]|działce|dz\.|działka\s+o\s+nr)\s*(?:nr|o\s+numerze)?\s*[:]?\s*([0-9]+(?:\/[0-9]+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const areaMatch = text.match(/(?:powierzchni[aę]?|pow\.)(?:\s+użytkow[aey])?\s*[:]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(m2|m²|ha)?/i);
  let area = null;
  if (areaMatch) {
    const val = parseFloat(areaMatch[1].replace(',', '.'));
    if (!isNaN(val)) {
      area = (areaMatch[2] && areaMatch[2].toLowerCase() === 'ha') ? Math.round(val * 10000) : val;
    }
  }

  const kind = classifyKind(`${title} ${text}`);
  const address = parseAddress(title) || parseAddress(text) || 'Pruszcz Gdański';

  return {
    id: String(item.id || ''),
    title,
    url: item.url || (item.id ? `https://bip.pruszcz-gdanski.pl/przetarg-nieruchomosci/${item.id}` : ''),
    price,
    date: item.date ? parsePlDate(item.date) : auctionDate,
    auctionDate,
    kind,
    kw,
    parcel,
    area,
    address,
  };
}

export function parseResultDoc(item, docText = '') {
  const title = (item && item.title) || '';
  const text = cleanText(docText);

  let resultStatus = 'unknown';
  if (/zakończył\s+się\s+wynikiem\s+negatywnym|brak\s+ofert|nie\s+wpłynęła\s+żadna|nikt\s+nie\s+przystąpił|niedokonano\s+wyboru|unieważnion/i.test(text)) {
    resultStatus = 'cancelled';
  } else if (/nabywc[aąę]|wyłoniono\s+nabywcę|została\s+ustalona\s+jako\s+nabywca|został\s+wyłoniony\s+jako\s+nabywca|wygrał/i.test(text)) {
    resultStatus = 'completed';
  }

  const priceMatch = text.match(/(?:cena\s+osiągnięta|cena\s+nabycia|wylicytowana\s+cena|za\s+cenę|najwyższa\s+cena)[^:]*?:\s*([0-9\s.,]+)\s*zł/i) ||
    text.match(/cena\s+sprzedaży\s*([0-9\s.,]+)\s*zł/i);
  const price = priceMatch ? parsePrice(priceMatch[0]) : null;

  const buyerMatch = text.match(/(?:nabywc[aąę]\s+(?:nieruchomości\s+)?(?:został[a]?\s+wyłonion[aey]|został[a]?\s+ustalon[aey]|został[a]?|zostali|ustalono)|ustalono\s+na\s+nabywcę|nabywca\s+nieruchomości:?|nabywca:?)\s*[:–-]?\s*([A-ZĄĆĘŁŃÓŚŹŻ][^\n\r.]+?(?:\s+Sp\.\s*z\s*o\.o\.)?)(?:\.|\n|$)/i);
  const buyer = buyerMatch ? buyerMatch[1].trim() : null;

  return {
    id: String(item.id || ''),
    title,
    url: item.url || (item.id ? `https://bip.pruszcz-gdanski.pl/przetarg-nieruchomosci/${item.id}` : ''),
    status: resultStatus,
    price,
    buyer,
    rawText: text.slice(0, 500),
  };
}
