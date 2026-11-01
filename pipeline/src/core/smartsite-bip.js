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
  return /przetarg|ogłoszenie.*przetargu|sprzedaż.*nieruchomo|sprzedaż.*lokalu|sprzedaż.*działk|zbycie/i.test(title) &&
    !/wynik|unieważnieni|odwołani|komisji/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|informacja o wynikach|rozstrzygnię|protokół/i.test(title);
}

export function parsePlDate(text) {
  if (!text) return null;
  const iso = text.match(/\b(20\d{2})[-.](0[1-9]|1[0-2])[-.](0[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dot = text.match(/\b(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})\b/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;

  const pl = text.match(/\b(0?[1-9]|[12]\d|3[01])\s+([a-ząćęłńóśźż]+)\s+(20\d{2})\b/i);
  if (pl) {
    const month = PL_MONTHS[pl[2].toLowerCase()];
    if (month) return `${pl[3]}-${month}-${pl[1].padStart(2, '0')}`;
  }
  return null;
}

export function parsePrice(text) {
  if (!text) return null;
  const m = text.match(/([\d\s]+(?:[.,]\d{2})?)\s*(?:zł|pln)/i);
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function parseSmartSiteListing(html, host) {
  const origin = host.startsWith('http') ? host : `https://${host}`;
  const notices = [];
  const regex = /<a[^>]+href="([^"]*\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;

  while ((m = regex.exec(html)) !== null) {
    const rawHref = m[1];
    const rawTitle = cleanText(m[2]);

    if (!isAnnouncementTitle(rawTitle) && !isResultTitle(rawTitle) && !/przetarg|nieruchom/i.test(rawHref)) {
      continue;
    }

    const fullUrl = rawHref.startsWith('http')
      ? rawHref
      : `${origin}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;

    const idMatch = rawHref.match(/\/([a-zA-Z0-9_-]+)\.html$/);
    const externalId = idMatch ? idMatch[1] : rawHref;

    const isResult = isResultTitle(rawTitle) || /wynik|protokol/i.test(rawHref);

    if (!notices.some((n) => n.url === fullUrl)) {
      notices.push({
        id: externalId,
        url: fullUrl,
        title: rawTitle,
        type: isResult ? 'result' : 'notice',
      });
    }
  }

  return notices;
}

export function parseSmartSiteNotice(html, url, defaultCityLabel = '') {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let title = titleMatch ? cleanText(titleMatch[1].replace(/- BIP.*$/, '')) : '';

  const fullText = cleanText(html);

  const parcelMatch = fullText.match(/(?:działk[a-ząćęłńóśźż]*\s+(?:ewidencyjn[a-ząćęłńóśźż]*\s+)?(?:nr\s*)?|dz\.\s*nr\s*|nr\s+geod\.\s*)([0-9]+(?:\/[0-9]+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  let area = null;
  const areaM2 = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);
  if (areaM2) {
    area = parseFloat(areaM2[1].replace(',', '.'));
  } else {
    const areaHa = fullText.match(/(\d+(?:[.,]\d+)?)\s*ha\b/i);
    if (areaHa) area = Math.round(parseFloat(areaHa[1].replace(',', '.')) * 10000);
  }

  const priceMatch = fullText.match(/(?:cena wywoławcza|wywoławcza|cena)\s*(?::|-)?\s*([0-9\s]+(?:[.,][0-9]{2})?)\s*(?:zł|pln)/i);
  const price = priceMatch ? parsePrice(priceMatch[0]) : parsePrice(fullText);

  const dateMatch = fullText.match(/(?:odbędzie się|termin przetargu|w dniu|dnia|data wytworzenia:)\s*(?::|-)?\s*([0-9]{1,2}[.\s-][0-9a-ząćęłńóśźż0-9]+[.\s-][0-9]{4})/i);
  const auctionDate = dateMatch ? parsePlDate(dateMatch[1]) : null;

  const attachments = [];
  const attRegex = /<a[^>]+href="([^"]*\/resource\/[^"]*|\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = attRegex.exec(html)) !== null) {
    attachments.push({
      url: am[1],
      name: cleanText(am[2]),
    });
  }

  return {
    url,
    title,
    isRealEstate: isAnnouncementTitle(fullText) || /nieruchom|działk|lokal/i.test(fullText),
    cadastralNumbers: parcel ? [parcel] : [],
    parcel,
    area,
    areaSqMeters: area,
    price,
    auction_date: auctionDate,
    attachments,
  };
}

export function parseSmartSiteResult(html, url) {
  const notice = parseSmartSiteNotice(html, url);
  return {
    ...notice,
    isResult: isResultTitle(notice.title),
  };
}

export function makeSmartSiteCrawlActive(config) {
  const { host, origin = `https://${host}`, defaultPath = '/przetargi/' } = config;

  return async function crawlActive(opts = {}) {
    let html = '';
    const candidates = [defaultPath, '/0ca0d5b3653d84a/', '/przetargi/nieruchomosci/', '/nieruchomosci-2.html', '/'];
    for (const p of candidates) {
      try {
        const page = await getText(`${origin}${p}`, { ...opts, userAgent: BROWSER_UA });
        if (page && (page.includes('przetarg') || page.includes('nieruchom'))) {
          html = page;
          break;
        }
      } catch (e) {}
    }

    if (!html) return [];

    const notices = parseSmartSiteListing(html, host);
    return notices.filter((n) => isAnnouncementTitle(n.title) || n.type === 'result');
  };
}

export function makeSmartSiteCity(config) {
  const { id, name, label, teryt, terc, voivodeship, authority, host, origin = `https://${host}`, defaultPath = '/przetargi/' } = config;

  return {
    id,
    name: name || label,
    label: label || name,
    teryt: teryt || terc,
    terc: terc || teryt,
    voivodeship,
    authority,
    host,
    crawlActive: makeSmartSiteCrawlActive({ host, origin, defaultPath }),
    crawlResults: async () => [],
    parseNotice: (html, url) => parseSmartSiteNotice(html, url, name || label),
    parseResult: (html, url) => parseSmartSiteResult(html, url),
  };
}
