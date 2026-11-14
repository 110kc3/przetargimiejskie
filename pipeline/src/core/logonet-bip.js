
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
  return /przetarg|ogłoszenie.*przetargu|sprzedaż.*nieruchomo|sprzedaż.*lokalu|wykaz.*sprzedaży|działk|lokal/i.test(title) &&
    !/wynik|unieważnieni|odwołani/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|informacja o wyniku|rozstrzygnię/i.test(title);
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

export function parseLogonetNotice(html, url = '', options = {}) {
  const text = cleanText(html);
  const cityLabel = options.label || 'Gmina';
  const cityId = options.id || 'logonet';

  const idMatch = url.match(/\/przetarg-nieruchomosci\/(\d+)/) || url.match(/\/artykul\/\d+\/(\d+)/) || url.match(/\/(\d+)\//);
  const sourceId = idMatch ? idMatch[1] : null;

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : '';

  const priceTableMatch = html.match(/<th[^>]*>\s*Cena wywoławcza\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  const priceProseMatch =
    text.match(/(?:cena wywoławcza|cena)\s*(?:netto|brutto)?[:\-]?\s*([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i) ||
    text.match(/cena wywoławcza[^\d]{1,60}([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const price = priceTableMatch ? parsePrice(cleanText(priceTableMatch[1])) : (priceProseMatch ? parsePrice(priceProseMatch[1]) : null);

  const dateTagMatch = html.match(/<time[^>]*datetime="([^"]+)"/i) || html.match(/<th[^>]*>\s*Data przetargu\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  const dateProseMatch =
    text.match(/(?:odbędzie się w dniu|w dniu|termin przetargu)\s+([0-9]{1,2}\s+[a-ząćęłńóśźż]+\s+20\d{2})/i) ||
    text.match(/(?:odbędzie się w dniu|w dniu|termin przetargu)\s+([0-9]{1,2}\.[0-9]{2}\.20\d{2})/i);
  const auctionDate = dateTagMatch ? parsePlDate(dateTagMatch[1]) : (dateProseMatch ? parsePlDate(dateProseMatch[1]) : null);

  const typeTableMatch = html.match(/<th[^>]*>\s*Rodzaj nieruchomości\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  const rawType = typeTableMatch ? cleanText(typeTableMatch[1]) : '';

  const parcelMatch = text.match(/\b(?:działk[aieę]|działek|dz\.|nr\s+działki)\s*(?:nr)?[:\s\-]{1,10}(\d+(?:\/\d+)?)/i);
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
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : (title.includes(cityLabel) ? title : cityLabel);
  const address = parseAddress(rawAddress, cityLabel);

  const kind = classifyKind(`${rawType} ${title} ${text}`);

  return {
    id: sourceId ? `${cityId}-${sourceId}` : null,
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

export function parseLogonetResult(html, url = '', options = {}) {
  const text = cleanText(html);
  const cityId = options.id || 'logonet';

  const idMatch = url.match(/\/przetarg-nieruchomosci\/(\d+)/) || url.match(/\/artykul\/\d+\/(\d+)/) || url.match(/\/(\d+)\//);
  const sourceId = idMatch ? idMatch[1] : null;

  const isCancelled = /unieważn|odwołan/i.test(text);
  const isNegative = /negatywn|zakończył się wynikiem negatywnym|brak oferentów|nikt nie przystąpił/i.test(text);
  const isPositive = /pozytywn|została wyłoniona|ustalona jako nabywca|nabywcą|najwyższa cena osiągnięta/i.test(text);

  let status = 'unknown';
  if (isCancelled) status = 'cancelled';
  else if (isNegative) status = 'negative';
  else if (isPositive) status = 'positive';

  const achievedMatch = text.match(/(?:najwyższa cena osiągnięta|cena nabycia|cena sprzedaży|za kwotę)[^\d]{1,30}([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const priceAchieved = achievedMatch ? parsePrice(achievedMatch[1]) : null;

  const buyerMatch = text.match(/(?:nabywca nieruchomości|nabywc[aąę]|ustalona jako nabywca)[^\n:]*[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+?)(?:\.|\n|$)/i);
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

export function makeLogonetCrawlActive(options) {
  const origin = (options.origin || (options.host ? `https://${options.host}` : '')).replace(/\/$/, '');
  const boardUrl = options.boardUrl || (options.boardId
    ? `${origin}/artykuly/${options.boardId}/przetargi-nieruchomosci`
    : `${origin}/przetargi-nieruchomosci/376`);

  return async function crawlActive() {
    let html = '';
    try {
      html = await getText(boardUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      return [];
    }
    if (!html) return [];

    const noticeUrls = [];
    const linkRegex = /href="([^"]*\/(?:przetarg-nieruchomosci|artykul\/\d+)\/(\d+)[^"]*)"/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const rawUrl = match[1];
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      if (!noticeUrls.includes(fullUrl)) {
        noticeUrls.push(fullUrl);
      }
    }

    const results = [];
    for (const url of noticeUrls.slice(0, 15)) {
      try {
        const pageHtml = await getText(url, { userAgent: BROWSER_UA });
        if (pageHtml) {
          const titleMatch = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || pageHtml.match(/<title>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? cleanText(titleMatch[1]) : '';

          if (isAnnouncementTitle(title)) {
            const parsed = parseLogonetNotice(pageHtml, url, options);
            if (parsed && parsed.id) results.push(parsed);
          } else if (isResultTitle(title)) {
            const parsed = parseLogonetResult(pageHtml, url, options);
            if (parsed && parsed.id) results.push(parsed);
          }
        }
      } catch (err) {
        // Skip failed detail
      }
    }

    return results;
  };
}

export function makeLogonetCity(options) {
  const crawlActive = makeLogonetCrawlActive(options);
  const crawlResults = async () => [];

  return {
    id: options.id,
    teryt: options.teryt,
    label: options.label,
    voivodeship: options.voivodeship,
    authority: options.authority || `Burmistrz Miasta ${options.label}`,
    host: options.host || (options.origin ? new URL(options.origin).host : ''),
    source: options.boardUrl || options.origin || `https://${options.host}`,
    contact: options.contact || `bip@${options.id}.pl`,
    crawlActive,
    crawlResults,
  };
}
