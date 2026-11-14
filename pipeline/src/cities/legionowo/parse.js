
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
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

export function isAnnouncementTitle(title) {
  if (!title) return false;
  return /przetarg|rokowan|licytacj/i.test(title) &&
    !/wynik|unieważnieni|odwołani/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|informacja o wyniku|rozstrzygnię/i.test(title);
}

export function parsePlDate(text) {
  if (!text) return null;
  const m = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(20\d{2})/i);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${day}`;
  }
  const iso = text.match(/\b(20\d{2})[-.](0[1-9]|1[0-2])[-.](0[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

export function parsePrice(text) {
  if (!text) return null;
  const m = text.match(/([\d\s]+(?:,\d{2})?)\s*z[łl]/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

export function parseAnnouncement(article, fullHtml = '') {
  const text = cleanText(fullHtml || article.content || article.title);
  const title = (article.title || '').trim();

  const dateMatch = text.match(/(?:odbędzie się|termin przetargu|w dniu)\s+([^\n.]+?(?:20\d{2}))/i);
  const auctionDate = dateMatch ? parsePlDate(dateMatch[1]) : parsePlDate(article.date);

  const priceMatch = text.match(/cena wywoławcza[^\d]{1,30}([\d\s]+(?:,\d{2})?\s*z[łl])/i);
  const price = priceMatch ? parsePrice(priceMatch[1]) : null;

  const depositMatch = text.match(/wadium[^\d]{1,30}([\d\s]+(?:,\d{2})?\s*z[łl])/i);
  const deposit = depositMatch ? parsePrice(depositMatch[1]) : null;

  const parcelMatch = text.match(/działk[aieę]\s+(?:nr\s+)?(\d+(?:\/\d+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const areaMatch = text.match(/powierzchni\s+([\d\s]+(?:,\d{2,4})?)\s*(m2|m²|ha)/i);
  const areaRaw = areaMatch ? areaMatch[1].replace(/\s+/g, '').replace(',', '.') : null;
  const areaUnit = areaMatch ? areaMatch[2].toLowerCase() : null;
  let area = areaRaw ? parseFloat(areaRaw) : null;
  if (area && areaUnit === 'ha') {
    area = Math.round(area * 10000);
  }

  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|położon[a-z]*\s+w\s+Legionowie[,\s]+(?:przy\s+ul\.?)?)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+obrębie|\.|,|dla)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : 'Legionowo';
  const address = parseAddress(rawAddress, 'Legionowo');

  const kwMatch = text.match(/\b(WA1L\/\d{8}\/\d)\b/i) || text.match(/KW\s+(?:Nr\s+)?([A-Z0-9\/]+)/i);
  const landRegistry = kwMatch ? kwMatch[1].toUpperCase() : null;

  const kind = classifyKind(`${title} ${text}`);

  return {
    id: `legionowo-${article.id}`,
    source_id: String(article.id),
    title,
    url: article.link ? `https://bip.legionowo.pl/${article.link}` : `https://bip.legionowo.pl/a,${article.id}`,
    auction_date: auctionDate,
    price,
    deposit,
    parcel,
    area,
    address,
    land_registry: landRegistry,
    property_type: kind,
    type: 'announcement',
    raw_text: text.slice(0, 1500),
  };
}

export function parseResultDoc(article, fullHtml = '') {
  const text = cleanText(fullHtml || article.content || article.title);
  const title = (article.title || '').trim();

  const isCancelled = /unieważn|odwołan/i.test(text);
  const isNegative = /negatywn|zakończył się wynikiem negatywnym|brak oferentów|nikt nie przystąpił/i.test(text);
  const isPositive = /pozytywn|została wyłoniona|ustalona jako nabywca|nabywcą|najwyższa cena osiągnięta/i.test(text);

  let status = 'unknown';
  if (isCancelled) status = 'cancelled';
  else if (isNegative) status = 'negative';
  else if (isPositive) status = 'positive';

  const achievedMatch = text.match(/(?:najwyższa cena osiągnięta|cena nabycia|za kwotę|wylicytowano)[^\d]{1,30}([\d\s]+(?:,\d{2})?\s*z[łl])/i);
  const priceAchieved = achievedMatch ? parsePrice(achievedMatch[1]) : null;

  const buyerMatch = text.match(/(?:nabywca nieruchomości|nabywcą nieruchomości została|ustalona jako nabywca[^\n:]*:)\s*([A-ZĄĆĘŁŃÓŚŹŻ][^\n]+?)(?:\s+Legionowo|\s+Informacj|\.\s+[A-ZĄĆĘŁŃÓŚŹŻ]|\n|$)/i);
  let buyer = buyerMatch ? buyerMatch[1].trim().replace(/\.$/, '') : null;
  if (buyer && buyer.length > 80) buyer = buyer.slice(0, 80).trim();

  const biddersMatch = text.match(/osoby dopuszczone(?: do uczestniczenia)?[^\d]{1,15}(\d+)/i);
  const bidders = biddersMatch ? parseInt(biddersMatch[1], 10) : null;

  const parcelMatch = text.match(/działk[aieę]\s+(?:nr\s+)?(\d+(?:\/\d+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|położon[a-z]*\s+w\s+Legionowie[,\s]+(?:przy\s+ul\.?)?)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+obrębie|\.|,|dla)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : 'Legionowo';
  const address = parseAddress(rawAddress, 'Legionowo');

  return {
    id: `legionowo-result-${article.id}`,
    source_id: String(article.id),
    title,
    url: article.link ? `https://bip.legionowo.pl/${article.link}` : `https://bip.legionowo.pl/a,${article.id}`,
    status,
    price_achieved: priceAchieved,
    buyer,
    bidders_count: bidders,
    parcel,
    address,
    type: 'result',
    raw_text: text.slice(0, 1500),
  };
}
