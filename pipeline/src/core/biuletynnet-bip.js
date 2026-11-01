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
    !/wynik|unieważnieni|odwołani|komisji|protokół/i.test(title);
}

export function isResultTitle(title) {
  if (!title) return false;
  return /wynik|informacja o wyniku|rozstrzygnię|protokół/i.test(title);
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

export function parseBiuletynNetListing(html, host) {
  const origin = host.startsWith('http') ? host : `https://${host}`;
  const notices = [];
  const regex = /<div class="artykul-tlo[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m;

  while ((m = regex.exec(html)) !== null) {
    const block = m[1];

    const dateMatch = block.match(/Data wytworzenia\s*<span>\s*(\d{4}-\d{2}-\d{2})/i)
      || block.match(/(\d{4}-\d{2}-\d{2})/);
    const publishedAt = dateMatch ? dateMatch[1] : null;

    const linkMatch = block.match(/<a[^>]+href="([^"]*id=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const rawHref = linkMatch[1].replace(/&amp;/g, '&');
    const externalId = linkMatch[2];
    const rawTitle = cleanText(linkMatch[3]);

    const skrotMatch = block.match(/<div class="[^"]*skrot[^"]*">([\s\S]*?)<\/div>/i);
    const summary = skrotMatch ? cleanText(skrotMatch[1]) : '';

    const fullUrl = rawHref.startsWith('http')
      ? rawHref
      : `${origin}/${rawHref.startsWith('/') ? rawHref.slice(1) : rawHref}`;

    const isResult = isResultTitle(rawTitle);

    notices.push({
      id: externalId,
      url: fullUrl,
      title: rawTitle,
      publishedAt,
      summary,
      type: isResult ? 'result' : 'notice',
    });
  }

  const subCategoryUrls = [];
  const subCatMatch = html.match(/<ul class="submenu-tresc">([\s\S]*?)<\/ul>/i);
  if (subCatMatch) {
    const subCatRegex = /<a[^>]+href="([^"]*cid=\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let sm;
    while ((sm = subCatRegex.exec(subCatMatch[1])) !== null) {
      const sHref = sm[1].replace(/&amp;/g, '&');
      const fullSubUrl = sHref.startsWith('http')
        ? sHref
        : `${origin}/${sHref.startsWith('/') ? sHref.slice(1) : sHref}`;
      subCategoryUrls.push({ url: fullSubUrl, label: cleanText(sm[2]) });
    }
  }

  return { notices, subCategoryUrls };
}

export function parseBiuletynNetNotice(html, url, defaultCityLabel = '') {
  const titleMatch = html.match(/<h[12][^>]*class="[^"]*aktualnosci-tytul[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i)
    || html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1].replace(/<span class="ariaonly">[\s\S]*?<\/span>/i, '')) : '';

  const trescMatch = html.match(/<div class="aktualnosci-tresc">([\s\S]*?)<\/div>/i)
    || html.match(/<div id="skip-tresc"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  const content = trescMatch ? cleanText(trescMatch[1]) : '';

  const attachments = [];
  const attRegex = /<a[^>]+href="([^"]*\.(?:pdf|docx?|xlsx?))"[^>]*>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = attRegex.exec(html)) !== null) {
    attachments.push({
      url: am[1],
      name: cleanText(am[2]),
    });
  }

  const fullText = `${title} ${content}`;

  // Parcel extraction
  const parcelMatch = fullText.match(/(?:działk[a-ząćęłńóśźż]*\s+(?:ewidencyjn[a-ząćęłńóśźż]*\s+)?(?:nr\s*)?|dz\.\s*nr\s*|nr\s+geod\.\s*)([0-9]+(?:\/[0-9]+)?)/i);
  const parcel = parcelMatch ? parcelMatch[1] : null;

  // Area extraction
  let area = null;
  const areaM2 = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/i);
  if (areaM2) {
    area = parseFloat(areaM2[1].replace(',', '.'));
  } else {
    const areaHa = fullText.match(/(\d+(?:[.,]\d+)?)\s*ha\b/i);
    if (areaHa) area = Math.round(parseFloat(areaHa[1].replace(',', '.')) * 10000);
  }

  // Price extraction
  const priceMatch = fullText.match(/(?:cena wywoławcza|wywoławcza|cena)\s*(?::|-)?\s*([0-9\s]+(?:[.,][0-9]{2})?)\s*(?:zł|pln)/i);
  const price = priceMatch ? parsePrice(priceMatch[0]) : parsePrice(fullText);

  // Auction date extraction
  const dateMatch = fullText.match(/(?:odbędzie się|termin przetargu|w dniu|dnia)\s*(?::|-)?\s*([0-9]{1,2}[.\s][0-9a-ząćęłńóśźż]+[.\s][0-9]{4})/i);
  const auctionDate = dateMatch ? parsePlDate(dateMatch[1]) : null;

  return {
    url,
    title,
    content,
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

export function parseBiuletynNetResult(html, url) {
  const notice = parseBiuletynNetNotice(html, url);
  return {
    ...notice,
    isResult: isResultTitle(notice.title),
  };
}

export function makeBiuletynNetCrawlActive(config) {
  const { host, origin = `https://${host}`, defaultCid = 70, crawlSubcategories = true } = config;

  return async function crawlActive(opts = {}) {
    const startUrl = `${origin}/?bip=1&cid=${defaultCid}&bsc=N`;
    let html = '';
    try {
      html = await getText(startUrl, { ...opts, userAgent: BROWSER_UA });
    } catch (e) {
      return [];
    }

    const { notices, subCategoryUrls } = parseBiuletynNetListing(html, host);
    const allNotices = [...notices];

    if (crawlSubcategories && subCategoryUrls.length > 0) {
      const toCrawl = subCategoryUrls.slice(0, 2);
      for (const cat of toCrawl) {
        try {
          const catHtml = await getText(cat.url, { ...opts, userAgent: BROWSER_UA });
          const subRes = parseBiuletynNetListing(catHtml, host);
          for (const sn of subRes.notices) {
            if (!allNotices.some((n) => n.id === sn.id)) {
              allNotices.push(sn);
            }
          }
        } catch (e) {}
      }
    }

    return allNotices.filter((n) => isAnnouncementTitle(n.title) || n.type === 'result');
  };
}

export function makeBiuletynNetCity(config) {
  const { id, name, label, teryt, terc, voivodeship, authority, host, origin = `https://${host}`, defaultCid = 70 } = config;

  return {
    id,
    name: name || label,
    label: label || name,
    teryt: teryt || terc,
    terc: terc || teryt,
    voivodeship,
    authority,
    host,
    crawlActive: makeBiuletynNetCrawlActive({ host, origin, defaultCid }),
    crawlResults: async () => [],
    parseNotice: (html, url) => parseBiuletynNetNotice(html, url, name || label),
    parseResult: (html, url) => parseBiuletynNetResult(html, url),
  };
}
