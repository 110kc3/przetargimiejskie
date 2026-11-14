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
  const cleaned = String(str).replace(/\s+/g, '').replace(',', '.');
  const m = cleaned.match(/(\d+(?:\.\d+)?)(?:\s*(?:m2|m²|ha|ar|a))?/i);
  if (!m) return null;
  let val = parseFloat(m[1]);
  if (!Number.isFinite(val) || val <= 0) return null;
  if (/ha/i.test(str)) {
    val = Math.round(val * 10000 * 100) / 100;
  }
  return val;
}

export function polishDateToIso(str) {
  if (!str) return null;
  const m = str.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = PL_MONTHS[m[2].toLowerCase()];
  const year = m[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

export function extractRound(text) {
  if (!text) return 1;
  if (/\b(?:czwarty|IV\s+przetarg)\b/i.test(text)) return 4;
  if (/\b(?:trzeci|III\s+przetarg)\b/i.test(text)) return 3;
  if (/\b(?:drugi|II\s+przetarg)\b/i.test(text)) return 2;
  if (/\b(?:pierwszy|I\s+przetarg)\b/i.test(text)) return 1;
  if (/\bkolejny\b/i.test(text)) return 2;
  const m = text.match(/\b([IVXLCDM]+)\s+przetarg/i);
  if (m) {
    const roman = m[1].toUpperCase();
    if (roman === 'I') return 1;
    if (roman === 'II') return 2;
    if (roman === 'III') return 3;
    if (roman === 'IV') return 4;
    if (roman === 'V') return 5;
  }
  return 1;
}

export function extractAuctionDate(text) {
  if (!text) return null;
  const m = text.match(/(?:odbędzie\s+się|wyznaczon[a-z]*\s+na)\s+(?:w\s+dniu|dnia)?\s*(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i);
  if (m) return polishDateToIso(m[1]);
  const m2 = text.match(/(\d{1,2})[.-](\d{1,2})[.-](\d{4})\s*(?:r\.?)?\s*o\s*godz/i);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return null;
}

export function extractStartingPrice(text) {
  if (!text) return null;
  const m = text.match(/cena\s+wywoławcza(?:\s+gruntu)?(?:\s+netto)?(?:\s+wynosi)?[:\s]+([\d\s.,]+(?:zł|pln)?)/i);
  if (m) return parsePLN(m[1]);
  const m2 = text.match(/cenie\s+wywoławczej[:\s]+([\d\s.,]+(?:zł|pln)?)/i);
  if (m2) return parsePLN(m2[1]);
  return null;
}

export function extractDeposit(text) {
  if (!text) return null;
  const m = text.match(/wadium(?:\s+w\s+wysokości)?[:\s]+([\d\s.,]+(?:zł|pln)?)/i);
  if (m) return parsePLN(m[1]);
  return null;
}

export function extractAddress(text) {
  if (!text) return null;
  const m = text.match(/przy\s+ul(?:\.|icy)?\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)(?:,|\.|\s+w\s+|\s+działka|\s+lokal|$)/i);
  if (m) {
    const raw = `ul. ${m[1].trim()}`;
    return parseAddress(raw);
  }
  const m2 = text.match(/w\s+Brzesku\s+na\s+[„"]([^"”]+)["”]/i);
  if (m2) {
    return parseAddress(`ul. ${m2[1].trim()}`);
  }
  return null;
}

export function extractParcels(text) {
  if (!text) return [];
  const parcels = [];
  const re = /(?:działk[a-ząćęłńóśźż]*|działek)\s*(?:ewidencyjn[a-ząćęłńóśźż]*\s*)?(?:nr\s*)?[:\s]*([0-9]+(?:\/[0-9]+)?)/gi;
  let m;
  while ((m = re.exec(text))) {
    if (!parcels.includes(m[1])) parcels.push(m[1]);
  }
  return parcels;
}

export function extractArticleLinks(html, baseUrl = 'https://www.brzesko.pl') {
  if (!html) return [];
  const links = [];
  const re = /<a[^>]*href="([^"]*\/wpis\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1].startsWith('http') ? m[1] : `${baseUrl}${m[1]}`;
    const titleMatch = m[2].match(/alt="([^"]+)"/i) || [null, m[2].replace(/<[^>]+>/g, '').trim()];
    const title = titleMatch[1] || '';
    if (!links.some((l) => l.url === href)) {
      links.push({ url: href, title });
    }
  }
  return links;
}

export function parseAnnouncementNotice(article) {
  const { url, title = '', html = '' } = article;
  const text = cleanText(html);
  const fullText = `${title} ${text}`;

  const isAuction = /przetarg\s+ustny\s+nieograniczony|publiczny\s+nieograniczony\s+przetarg\s+ustny/i.test(fullText);
  if (!isAuction) return null;

  const kind = classifyKind(fullText);
  const auctionDate = extractAuctionDate(fullText);
  const startingPrice = extractStartingPrice(fullText);
  const deposit = extractDeposit(fullText);
  const round = extractRound(fullText);
  const address = extractAddress(fullText);
  const parcels = extractParcels(fullText);

  if (kind === 'mieszkalny' || kind === 'uzytkowy') {
    const flatAreaMatch = fullText.match(/powierzchni(?:a)?\s+(?:użytkowa\s+)?(?:lokalu\s*)?[:\s]+(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);
    const area_m2 = flatAreaMatch ? parseArea(flatAreaMatch[1]) : null;

    return {
      type: 'property',
      data: {
        source_url: url,
        title,
        address: address?.key || address?.street ? `${address.street || ''} ${address.building || ''}`.trim() : title,
        area_m2,
        starting_price_pln: startingPrice,
        deposit_pln: deposit,
        auction_date: auctionDate,
        round,
        kind,
        raw_text: text.slice(0, 500),
      },
    };
  }

  if (kind === 'grunt' || parcels.length > 0) {
    const landAreaMatch = fullText.match(/powierzchnia\s+(?:działki\s+)?\[?ha\]?[:\s]*(\d+(?:[.,]\d+)?)/i);
    const area_m2 = landAreaMatch ? parseArea(`${landAreaMatch[1]} ha`) : null;

    return {
      type: 'land',
      data: {
        source_url: url,
        title,
        parcels: parcels.length > 0 ? parcels : null,
        area_m2,
        starting_price_pln: startingPrice,
        auction_date: auctionDate,
        round,
        raw_text: text.slice(0, 500),
      },
    };
  }

  return null;
}

export function parseResultDoc(ref) {
  const { url, title = '', text = '' } = ref;
  const full = `${title} ${text}`;
  const isResult = /informacja\s+o\s+wyniku|wynik(?:i)?\s+przetargu|rozstrzygnięci/i.test(full);
  if (!isResult) return [];

  const address = extractAddress(full);
  const auctionDate = extractAuctionDate(full);
  const priceMatch = full.match(/(?:najwyższą\s+cenę|cena\s+osiągnięta|za\s+cenę|osiągnięto\s+cenę)[:\s]+([\d\s.,]+(?:zł|pln)?)/i);
  const finalPrice = priceMatch ? parsePLN(priceMatch[1]) : null;
  const isNegative = /wynikiem\s+negatywnym|brak\s+ofert|nie\s+wpłacono\s+wadium/i.test(full);

  return [
    {
      source_url: url,
      address: address?.key || address?.street ? `${address.street || ''} ${address.building || ''}`.trim() : title,
      auction_date: auctionDate,
      final_price_pln: finalPrice,
      outcome: isNegative ? 'unsold' : finalPrice ? 'sold' : 'unknown',
    },
  ];
}
