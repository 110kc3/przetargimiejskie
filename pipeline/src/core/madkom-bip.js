// Reusable MADKOM eBIP platform engine.
//
// Handles municipalities running MADKOM eBIP (Małopolska, Wielkopolska, Dolnośląskie, etc.)
// which expose a clean JSON REST API:
//   - GET /api/contexts/<context>/articles?s=<query>&limit=<N>&offset=<M>
//   - GET /api/menu/<menuId>/articles?limit=<N>&offset=<M>
//   - GET /api/articles/<id>
//
// Yields announcements and result notices with structured metadata and attachments.

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
  return /przetarg|ogłoszenie.*przetargu|sprzedaż.*nieruchomo|sprzedaż.*lokalu|zbycie/i.test(title) &&
    !/wynik|unieważnieni|odwołani|komisji/i.test(title);
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

export function parseMadkomAnnouncement(article, fullHtml = '', options = {}) {
  const text = cleanText(fullHtml || article.contextTxt || article.content || article.title);
  const title = (article.title || article.aliasFields?.find?.(a => a.alias === 'title')?.value || '').trim();
  const cityLabel = options.label || 'Gmina';
  const cityId = options.id || 'madkom';

  // Date
  const dateMatch =
    text.match(/(?:odbędzie się w dniu|w dniu|termin przetargu|data(?:\s+przetargu)?|dnia)\s*[:\-]?\s*([0-9]{1,2}\s+[a-ząćęłńóśźż]+\s+20\d{2})/i) ||
    text.match(/(?:odbędzie się w dniu|w dniu|termin przetargu|data(?:\s+przetargu)?|dnia)\s*[:\-]?\s*([0-9]{1,2}\.[0-9]{2}\.20\d{2})/i);
  const auctionDate = dateMatch ? parsePlDate(dateMatch[1]) : parsePlDate(article.date);

  // Price
  const priceMatch =
    text.match(/(?:cena wywoławcza|cena)\s*(?:netto|brutto)?\s*(?:w\s*zł)?[:\-]?\s*(?:wynosi\s*)?([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i) ||
    text.match(/cena wywoławcza[^\d]{1,60}([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const price = priceMatch ? parsePrice(priceMatch[1]) : null;

  // Deposit
  const depositMatch = text.match(/(?:wadium|wysokość wadium)[^\d]{1,40}([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const deposit = depositMatch ? parsePrice(depositMatch[1]) : null;

  // Parcel
  const parcelMatch = text.match(/\b(?:działk[aieę]|działce|dz\.|nr\s+działki)\s*(?:nr)?[:\s\-]{1,10}(\d+(?:\/\d+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  // Area
  const areaMatch =
    text.match(/pow(?:ierzchni|\.)[^\d]{1,25}([\d\s.]+(?:,\d{1,4})?)\s*(m2|m²|ha)/i) ||
    text.match(/pow(?:ierzchnia|\.)\s*(?:w\s*)?(m2|m²|m\s*2|ha)[:\s\-]{1,10}([\d\s.]+(?:,\d{1,4})?)/i);
  let area = null;
  if (areaMatch) {
    const isPrefix = Boolean(areaMatch[2] && !isNaN(parseFloat(areaMatch[2])));
    const rawNum = (isPrefix ? areaMatch[2] : areaMatch[1]).replace(/\s+/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const unit = ((isPrefix ? areaMatch[1] : areaMatch[2]) || 'm2').toLowerCase().replace(/\s+/g, '');
    const val = parseFloat(rawNum);
    if (Number.isFinite(val)) {
      area = unit === 'ha' ? Math.round(val * 10000) : val;
    }
  }

  // Address
  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|ul\.|w\s+miejscowości)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+[A-ZĄĆĘŁŃÓŚŹŻ]|\.|,|KW|przeznaczon)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : cityLabel;
  const address = parseAddress(rawAddress, cityLabel);

  // KW
  const kwMatch = text.match(/\b([A-Z0-9]{4}\/\d{8}\/\d)\b/i) || text.match(/KW[-:\s]+([A-Z0-9\/]+)/i);
  const landRegistry = kwMatch ? kwMatch[1].toUpperCase() : null;

  const kind = classifyKind(`${title} ${text}`);

  const itemUrl = article.link
    ? (article.link.startsWith('http') ? article.link : `${options.origin || ''}/${article.link}`)
    : `${options.origin || ''}/a,${article.id}`;

  return {
    id: `${cityId}-${article.id}`,
    source_id: String(article.id),
    title,
    url: itemUrl,
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

export function parseMadkomResult(article, fullHtml = '', options = {}) {
  const text = cleanText(fullHtml || article.contextTxt || article.content || article.title);
  const title = (article.title || article.aliasFields?.find?.(a => a.alias === 'title')?.value || '').trim();
  const cityLabel = options.label || 'Gmina';
  const cityId = options.id || 'madkom';

  const isCancelled = /unieważn|odwołan/i.test(text);
  const isNegative = /negatywn|zakończył się wynikiem negatywnym|brak oferentów|nikt nie przystąpił/i.test(text);
  const isPositive = /pozytywn|została wyłoniona|ustalona jako nabywca|nabywcą|najwyższa cena osiągnięta/i.test(text);

  let status = 'unknown';
  if (isCancelled) status = 'cancelled';
  else if (isNegative) status = 'negative';
  else if (isPositive) status = 'positive';

  const achievedMatch = text.match(/(?:najwyższa cena osiągnięta|cena nabycia|za kwotę|wylicytowano)[^\d]{1,30}([\d\s.]+(?:,\d{2})?\s*(?:z[łl]|PLN)?)/i);
  const priceAchieved = achievedMatch ? parsePrice(achievedMatch[1]) : null;

  const buyerMatch = text.match(/(?:nabywca nieruchomości|nabywc[aąę] nieruchomości (?:został[a]?|ustalono)|nabywc[aąę]|ustalona jako nabywca)[^\n:]*[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+?)(?:\.|\n|$)/i);
  let buyer = buyerMatch ? buyerMatch[1].trim().replace(/\.$/, '') : null;
  if (buyer && buyer.length > 80) buyer = buyer.slice(0, 80).trim();

  const biddersMatch = text.match(/(?:liczba )?os[oó]b(?:y)? dopuszczon[aeyych]+[^\d]{1,15}(\d+)/i);
  const bidders = biddersMatch ? parseInt(biddersMatch[1], 10) : null;

  const parcelMatch = text.match(/\b(?:działk[aieę]|działce|dz\.|nr\s+działki)\s*(?:nr)?[:\s\-]{1,10}(\d+(?:\/\d+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  const addrMatch = text.match(/(?:przy\s+ul\.?|ulicy|ul\.|w\s+miejscowości)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][a-ząćęłńóśźż\s\d\/-]+?)(?:w\s+[A-ZĄĆĘŁŃÓŚŹŻ]|\.|,|KW)/i);
  const rawAddress = addrMatch ? `ul. ${addrMatch[1].trim()}` : cityLabel;
  const address = parseAddress(rawAddress, cityLabel);

  const itemUrl = article.link
    ? (article.link.startsWith('http') ? article.link : `${options.origin || ''}/${article.link}`)
    : `${options.origin || ''}/a,${article.id}`;

  return {
    id: `${cityId}-result-${article.id}`,
    source_id: String(article.id),
    title,
    url: itemUrl,
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

export function makeMadkomCrawlActive(options) {
  const origin = (options.origin || (options.host ? `https://${options.host}` : '')).replace(/\/$/, '');
  const apiBase = `${origin}/api`;
  const context = options.context || 'default';
  const menuIds = options.menuIds || [];
  const searchQueries = options.searchQueries || ['przetarg sprzedaż nieruchomości', '"przetarg ustny"', 'sprzedaż lokalu'];

  return async function crawlActive() {
    const searchUrls = [];
    for (const menuId of menuIds) {
      searchUrls.push(`${apiBase}/menu/${menuId}/articles?limit=25&offset=0`);
    }
    for (const q of searchQueries) {
      searchUrls.push(`${apiBase}/contexts/${context}/articles?s=${encodeURIComponent(q)}&limit=25&offset=0`);
    }

    const seenIds = new Set();
    const articles = [];

    for (const sUrl of searchUrls) {
      try {
        const raw = await getText(sUrl, { userAgent: BROWSER_UA });
        const data = JSON.parse(raw);
        const list = Array.isArray(data.elements) ? data.elements : (Array.isArray(data.articles) ? data.articles : []);
        for (const el of list) {
          if (!seenIds.has(el.id)) {
            seenIds.add(el.id);
            const title = (el.title || el.aliasFields?.find?.(a => a.alias === 'title')?.value || '').trim();
            articles.push({ ...el, title });
          }
        }
      } catch (err) {
        // Skip failed endpoint gracefully
      }
    }

    const results = [];
    for (const item of articles.slice(0, 25)) {
      const title = (item.title || '').trim();
      if (!isAnnouncementTitle(title) && !isResultTitle(title)) continue;

      let fullHtml = '';
      try {
        const detailRaw = await getText(`${apiBase}/articles/${item.id}`, { userAgent: BROWSER_UA });
        const detail = JSON.parse(detailRaw);
        fullHtml = detail?.content || '';
      } catch (err) {}

      if (isAnnouncementTitle(title)) {
        results.push(parseMadkomAnnouncement(item, fullHtml, { ...options, origin }));
      } else if (isResultTitle(title)) {
        results.push(parseMadkomResult(item, fullHtml, { ...options, origin }));
      }
    }

    return results;
  };
}

export function makeMadkomCity(options) {
  const crawlActive = makeMadkomCrawlActive(options);
  const crawlResults = async () => [];

  return {
    id: options.id,
    teryt: options.teryt,
    label: options.label,
    voivodeship: options.voivodeship,
    authority: options.authority || `Burmistrz Miasta ${options.label}`,
    host: options.host || (options.origin ? new URL(options.origin).host : ''),
    source: options.origin || `https://${options.host}`,
    contact: options.contact || `bip@${options.id}.pl`,
    crawlActive,
    crawlResults,
  };
}
