
import { getText } from './fetch.js';
import { parseAddress } from './normalize.js';
import { classifyKind } from './classify-kind.js';

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

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAnnouncementTitle(title) {
  if (!title) return false;
  return /przetarg|ogłasza.*przetarg|sprzedaż.*nieruchomo/i.test(title) &&
    !/unieważn|odwołan/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|rozstrzygnię/i.test(title);
}

export function parsePlDate(text) {
  if (!text) return null;
  const iso = text.match(/(20\d{2})[-.](0[1-9]|1[0-2])[-.](0[1-9]|[12]\d|3[01])/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dot = text.match(/(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;
  const m = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(20\d{2})/i);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${day}`;
  }
  return null;
}

export function parsePrice(text) {
  if (!text) return null;
  const m = text.match(/([\d\s.]+(?:,\d{2})?)\s*(?:z[łl]|PLN)?/i);
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseSystemDoBipRow(rowHtml, options = {}) {
  const text = cleanText(rowHtml);
  const cityLabel = options.label || 'Gmina';
  const cityId = options.id || 'systemdobip';

  const linkMatch = rowHtml.match(/<a[^>]*href="([^"]*\/przetargi\/\d+\/(\d+)\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
  if (!linkMatch) return null;

  const url = linkMatch[1];
  const sourceId = `${linkMatch[2]}-${linkMatch[3]}`;
  const title = cleanText(linkMatch[4]);

  const date1Match = rowHtml.match(/<td class="td-date-1">[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
  const date2Match = rowHtml.match(/<td class="td-date-2">[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
  const auctionDate = date2Match ? date2Match[1] : (date1Match ? date1Match[1] : null);

  const priceMatch =
    text.match(/(?:cena wywoławcza|cena)\s*(?:netto|brutto)?[:\-]?\s*([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const price = priceMatch ? parsePrice(priceMatch[1]) : null;

  const parcelMatch = text.match(/\b(?:działk[aieę]|działce|dz\.|nr\s+działki)\s*(?:nr)?[:\s\-]{1,10}(\d+(?:\/\d+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const areaMatch = text.match(/pow(?:ierzchni|\.)[^\d]{1,25}([\d\s.]+(?:,\d{1,4})?)\s*(m2|m²|ha)/i);
  let area = null;
  if (areaMatch) {
    const rawNum = areaMatch[1].replace(/\s+/g, '').replace(',', '.');
    const unit = (areaMatch[2] || 'm2').toLowerCase();
    const val = parseFloat(rawNum);
    if (Number.isFinite(val)) {
      area = unit === 'ha' ? Math.round(val * 10000) : val;
    }
  }

  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+[A-ZĄĆĘŁŃÓŚŹŻ]|\.|,|KW|obręb)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : cityLabel;
  const address = parseAddress(rawAddress, cityLabel);

  const kind = classifyKind(`${title} ${text}`);

  return {
    id: `${cityId}-${sourceId}`,
    source_id: sourceId,
    title,
    url,
    auction_date: auctionDate,
    price,
    parcel,
    area,
    address,
    property_type: kind,
    type: 'announcement',
    raw_text: text.slice(0, 1500),
  };
}

export function parseSystemDoBipResult(html, url = '', options = {}) {
  const text = cleanText(html);
  const cityId = options.id || 'systemdobip';
  const idMatch = url.match(/\/(\d+)\/(\d+)[^\/]*\/?$/);
  const sourceId = idMatch ? `${idMatch[1]}-${idMatch[2]}` : null;

  const isCancelled = /unieważn|odwołan/i.test(text);
  const isNegative = /negatywn|zakończył się wynikiem negatywnym|brak oferentów|nikt nie przystąpił/i.test(text);
  const isPositive = /pozytywn|została wyłoniona|ustalona jako nabywca|nabywcą|(?:najwyższa\s+)?cena\s+osiągnięta/i.test(text);

  let status = 'unknown';
  if (isCancelled) status = 'cancelled';
  else if (isNegative) status = 'negative';
  else if (isPositive) status = 'positive';

  const achievedMatch = text.match(/(?:(?:najwyższa\s+)?cena\s+osiągnięta|cena nabycia|cena sprzedaży|za kwotę)[^\d]{1,30}([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const priceAchieved = achievedMatch ? parsePrice(achievedMatch[1]) : null;

  const buyerMatch = text.match(/(?:nabywca nieruchomości|nabywc[aąę]|ustalona jako nabywca)[^\n:]*[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][^\n.]+?)(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ]|\.\s+[A-ZĄĆĘŁŃÓŚŹŻ]|\n|$)/i);
  let buyer = buyerMatch ? buyerMatch[1].trim().replace(/\.$/, '') : null;
  if (buyer && buyer.length > 80) buyer = buyer.slice(0, 80).trim();

  return {
    id: sourceId ? `${cityId}-result-${sourceId}` : null,
    source_id: sourceId,
    url,
    status,
    price_achieved: priceAchieved,
    buyer,
    type: 'result',
    raw_text: text.slice(0, 1500),
  };
}

export function makeSystemDoBipCrawlActive(options) {
  const origin = (options.origin || (options.host ? `https://${options.host}` : '')).replace(/\/$/, '');
  const boardId = options.boardId || 361;
  const boardUrl = `${origin}/przetargi/${boardId}/status/0/`;

  return async function crawlActive() {
    let html = '';
    try {
      html = await getText(boardUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      return [];
    }
    if (!html) return [];

    const results = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;

    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      if (rowHtml.includes('td-title-1')) {
        const parsed = parseSystemDoBipRow(rowHtml, options);
        if (parsed) results.push(parsed);
      }
    }

    return results;
  };
}

export function makeSystemDoBipCity(options) {
  const crawlActive = makeSystemDoBipCrawlActive(options);
  const crawlResults = async () => [];

  return {
    id: options.id,
    teryt: options.teryt,
    label: options.label,
    voivodeship: options.voivodeship,
    authority: options.authority || `Burmistrz Miasta ${options.label}`,
    host: options.host || (options.origin ? new URL(options.origin).host : ''),
    source: options.origin || `https://${options.host}/przetargi/${options.boardId || 361}/status/`,
    contact: options.contact || `bip@${options.id}.pl`,
    crawlActive,
    crawlResults,
  };
}
