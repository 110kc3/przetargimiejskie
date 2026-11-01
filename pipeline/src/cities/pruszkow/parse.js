// Parser for Pruszków auction notices and results (bip.um.pruszkow.pl)
//
// Parses BIPLO CMS articles and attached PDF documents.

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
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAnnouncementTitle(title) {
  if (!title) return false;
  return /przetarg|ogłoszenie o przetargu|sprzedaż.*nieruchomo/i.test(title) &&
    !/wynik|unieważnieni|odwołani/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|informacja o wyniku|rozstrzygnię/i.test(title);
}

export function parsePlDate(text) {
  if (!text) return null;
  const dot = text.match(/\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})\b/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;
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
  const m = text.match(/([\d\s]+(?:,\d{2})?)\s*(?:z[łl]|PLN)/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

export function parseAnnouncement(item, docText = '') {
  const text = cleanText(`${item.title || ''} ${docText}`);
  const title = (item.title || '').trim();

  // Date
  const dateMatch =
    text.match(/(?:odbędzie się w dniu|w dniu|termin przetargu)\s+([0-9]{1,2}[.\s/-][0-9a-ząćęłńóśźż]{2,}[.\s/-]20\d{2})/i) ||
    text.match(/(?:odbędzie się w dniu|w dniu|termin przetargu)\s+([^\n]+?(?:20\d{2}))/i);
  const auctionDate = dateMatch ? parsePlDate(dateMatch[1]) : parsePlDate(item.date);

  // Price
  const priceMatch =
    text.match(/(?:cena wywoławcza|cena)\s*(?:netto|brutto)?\s*[:\-]?\s*([\d\s]+(?:,\d{2})?\s*(?:z[łl]|PLN))/i) ||
    text.match(/(?:cena wywoławcza|cena)\s*(?:w\s*zł)?[\s\S]{1,100}?\b([\d]{1,3}(?:\s+\d{3})+(?:,\d{2})?)\s*(?:z[łl]|brutto|netto)/i);
  const price = priceMatch ? parsePrice(priceMatch[1].includes('zł') ? priceMatch[1] : `${priceMatch[1]} zł`) : null;

  // Deposit
  const depositMatch = text.match(/wadium[^\d]{1,40}([\d\s]+(?:,\d{2})?\s*(?:z[łl]|PLN))/i);
  const deposit = depositMatch ? parsePrice(depositMatch[1]) : null;

  // Parcel
  const parcelMatch = text.match(/\bdz(?:\.|iałk[aieę])\s*(?:nr\s*)?(\d+(?:\/\d+)?)/i) ||
    text.match(/Pruszków\s+(\d+(?:\/\d+)?)\s+obr/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  // Area
  const areaMatch =
    text.match(/powierzchni[^\d]{1,15}([\d\s]+(?:,\d{1,4})?)\s*(m2|m²|ha)/i) ||
    text.match(/(?:KW[-:\s]+[A-Z0-9\/]+|obr(?:\.|ęb)\s*\d+)\s+(\d{2,6})\s+[\d\s]+/i) ||
    text.match(/\b(\d{2,6})\s+[\d\s]{3,}(?:,\d{2})?\s*(?:z[łl]|brutto)/i);
  let area = null;
  if (areaMatch) {
    const rawNum = areaMatch[1].replace(/\s+/g, '').replace(',', '.');
    const unit = (areaMatch[2] || 'm2').toLowerCase();
    const val = parseFloat(rawNum);
    if (Number.isFinite(val)) {
      area = unit === 'ha' ? Math.round(val * 10000) : val;
    }
  }

  // Address
  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+obrębie|obr\.|\.|,|KW)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : 'Pruszków';
  const address = parseAddress(rawAddress, 'Pruszków');

  // KW
  const kwMatch = text.match(/\b(WA1P\/\d{8}\/\d)\b/i) || text.match(/KW[-:\s]+([A-Z0-9\/]+)/i);
  const landRegistry = kwMatch ? kwMatch[1].toUpperCase() : null;

  const kind = classifyKind(`${title} ${text}`);

  return {
    id: `pruszkow-${item.id}`,
    source_id: String(item.id),
    title,
    url: item.url || 'https://bip.um.pruszkow.pl',
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

export function parseResultDoc(item, docText = '') {
  const text = cleanText(`${item.title || ''} ${docText}`);
  const title = (item.title || '').trim();

  const isCancelled = /unieważn|odwołan/i.test(text);
  const isNegative = /negatywn|zakończył się wynikiem negatywnym|brak oferentów|nikt nie przystąpił/i.test(text);
  const isPositive = /pozytywn|została wyłoniona|ustalona jako nabywca|nabywcą|najwyższa cena osiągnięta/i.test(text);

  let status = 'unknown';
  if (isCancelled) status = 'cancelled';
  else if (isNegative) status = 'negative';
  else if (isPositive) status = 'positive';

  const achievedMatch = text.match(/(?:najwyższa cena osiągnięta|cena nabycia|za kwotę|wylicytowano)[^\d]{1,30}([\d\s]+(?:,\d{2})?\s*(?:z[łl]|PLN))/i);
  const priceAchieved = achievedMatch ? parsePrice(achievedMatch[1]) : null;

  const buyerMatch = text.match(/(?:nabywca nieruchomości|nabywcą nieruchomości została|ustalona jako nabywca[^\n:]*:)\s*([A-ZĄĆĘŁŃÓŚŹŻ][^\n]+?)(?:\s+Osoby|\s+Pruszków|\.\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-z]{3,}|\n|$)/i);
  let buyer = buyerMatch ? buyerMatch[1].trim().replace(/\.$/, '') : null;
  if (buyer && buyer.length > 80) buyer = buyer.slice(0, 80).trim();

  const biddersMatch = text.match(/osoby dopuszczone(?: do uczestniczenia)?[^\d]{1,15}(\d+)/i);
  const bidders = biddersMatch ? parseInt(biddersMatch[1], 10) : null;

  const parcelMatch = text.match(/\bdz(?:\.|iałk[aieę])\s*(?:nr\s*)?(\d+(?:\/\d+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+obrębie|obr\.|\.|,|KW)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : 'Pruszków';
  const address = parseAddress(rawAddress, 'Pruszków');

  return {
    id: `pruszkow-result-${item.id}`,
    source_id: String(item.id),
    title,
    url: item.url || 'https://bip.um.pruszkow.pl',
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
