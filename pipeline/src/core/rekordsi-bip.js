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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
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
  const m = text.match(/([\d\s.]+(?:,\d{2})?)\s*(?:z[łl]|PLN)/i);
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseParcelNumber(text) {
  if (!text) return null;
  const m = text.match(/(?:dzia[łl]k[aie]|nr\s+ewid(?:\.|yjny)?)\s*(?:nr\s*)?([0-9]+(?:\/[0-9]+)?)/i);
  return m ? m[1] : null;
}

export function parseRekordSiNotice(html, url = '', options = {}) {
  const text = cleanText(html);
  const cityLabel = options.label || 'Gmina';
  const cityId = options.id || 'rekordsi';

  const docIdMatch = url.match(/\/dokument\/(\d+)/);
  const sourceId = docIdMatch ? docIdMatch[1] : null;

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : '';

  const dateMatch = text.match(/w\s+dniu\s+([0-9]{1,2}[.\s][a-ząćęłńóśźż0-9]+[.\s]20[0-9]{2})/i);
  const auctionDate = dateMatch ? parsePlDate(dateMatch[1]) : parsePlDate(text);

  const priceMatch = text.match(/cena\s+wywo[łl]awcza\s*(?:wynosi)?:?\s*([\d\s.]+(?:,\d{2})?\s*z[łl])/i);
  const price = priceMatch ? parsePrice(priceMatch[1]) : null;

  const depositMatch = text.match(/wadium\s*(?:w\s+wysoko[śs]ci)?:?\s*([\d\s.]+(?:,\d{2})?\s*z[łl])/i);
  const deposit = depositMatch ? parsePrice(depositMatch[1]) : null;

  const parcel = parseParcelNumber(text);
  const address = parseAddress(text, cityLabel);

  const areaMatch = text.match(/(?:powierzchni|pow\.)\s*(?:u[żz]ytkowej)?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:m2|m²|ha)/i);
  let area = null;
  if (areaMatch) {
    area = parseFloat(areaMatch[1].replace(',', '.'));
  }

  const kind = classifyKind(text);
  const propertyType = kind && kind !== 'unknown' ? kind : (/lokal/i.test(text) ? 'lokal' : 'grunt');

  return {
    id: `${cityId}-${sourceId || Math.random().toString(36).slice(2, 8)}`,
    source_id: sourceId,
    title: title || text.slice(0, 150),
    url,
    auction_date: auctionDate,
    price,
    deposit,
    parcel,
    area,
    address: address ? address.full : null,
    property_type: propertyType,
    type: 'announcement',
    raw_text: text.slice(0, 1500),
  };
}

export function makeRekordSiCrawlActive(options) {
  const origin = (options.origin || (options.host ? `https://${options.host}` : '')).replace(/\/$/, '');
  const board = options.board || '/15665';
  const maxPages = options.maxPages || 3;

  return async function crawlActive() {
    const docUrls = [];

    for (let p = 1; p <= maxPages; p++) {
      const pageUrl = p === 1 ? `${origin}${board}` : `${origin}${board}/strona/${p}`;
      let html = '';
      try {
        html = await getText(pageUrl, { userAgent: BROWSER_UA });
      } catch (err) {
        break;
      }
      if (!html) break;

      const cleanBoard = board.replace(/^\//, '');
      const linkRegex = new RegExp(`href="([^"]*?${cleanBoard}/dokument/(\\d+)[^"]*)"`, 'gi');
      let match;
      let pageFound = 0;
      while ((match = linkRegex.exec(html)) !== null) {
        const rawUrl = match[1];
        const fullUrl = rawUrl.startsWith('http')
          ? rawUrl
          : `${origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
        if (!docUrls.includes(fullUrl)) {
          docUrls.push(fullUrl);
          pageFound++;
        }
      }
      if (pageFound === 0) break;
    }

    const results = [];
    for (const url of docUrls.slice(0, 20)) {
      try {
        const docHtml = await getText(url, { userAgent: BROWSER_UA });
        if (docHtml) {
          const parsed = parseRekordSiNotice(docHtml, url, options);
          if (parsed && parsed.id) {
            results.push(parsed);
          }
        }
      } catch (err) {}
    }

    return results;
  };
}

export function makeRekordSiCity(options) {
  const crawlActive = makeRekordSiCrawlActive(options);
  const crawlResults = async () => [];

  return {
    id: options.id,
    teryt: options.teryt,
    label: options.label,
    voivodeship: options.voivodeship,
    authority: options.authority || `Prezydent Miasta ${options.label}`,
    host: options.host || (options.origin ? new URL(options.origin).host : ''),
    source: options.origin ? `${options.origin}${options.board || ''}` : `https://${options.host}${options.board || ''}`,
    contact: options.contact || `bip@${options.id}.pl`,
    crawlActive,
    crawlResults,
  };
}
