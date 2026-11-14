
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isAnnouncementTitle,
  isResultTitle,
} from './parse.js';

export const BASE_URL = 'https://bip.wrzesnia.pl';
export const BOARD_URL = `${BASE_URL}/?bip=1&cid=216&bsc=N`;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const FETCH_OPTS = { userAgent: BROWSER_UA };

export const MAX_PAGES = Number(process.env.WRZESNIA_MAX_PAGES) || 6;

export function resolveUrl(href) {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&'), BASE_URL).toString();
  } catch {
    return null;
  }
}

export function harvestItemsFromHtml(html) {
  const items = [];
  const regex = /<div class="artykul-tlo aktualnosci-tlo">[\s\S]*?<div class="strona-data aktualnosci-data">Data wytworzenia <span>([0-9]{4}-[0-9]{2}-[0-9]{2})<\/span>[\s\S]*?<div class="submenu"><a href="([^"]+)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const date = m[1];
    const url = resolveUrl(m[2]);
    const title = m[3].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().replace(/\s+/g, ' ');
    if (url && title) {
      items.push({ url, title, date });
    }
  }
  return items;
}

export async function extractDetailContent(detailUrl) {
  try {
    const html = await getText(detailUrl, FETCH_OPTS);

    let inlineText = '';
    const mText = html.match(/<div class="aktualnosci-tresc">([\s\S]*?)<\/div>/i);
    if (mText) {
      inlineText = mText[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    let pdfUrl = null;
    const mPdf = html.match(/href="([^"]*fls\/bip_pliki\/[^"]*\.pdf)"/i);
    if (mPdf) {
      pdfUrl = resolveUrl(mPdf[1]);
    }

    let pdfExtracted = '';
    if (pdfUrl) {
      try {
        pdfExtracted = await pdfText(pdfUrl, FETCH_OPTS);
      } catch {
        // ignore
      }
      if (!pdfExtracted || pdfExtracted.trim().length < 30) {
        try {
          pdfExtracted = await ocrPdf(pdfUrl, FETCH_OPTS);
        } catch {
          // ignore
        }
      }
    }

    const combined = `${inlineText}\n${pdfExtracted}`.trim();
    return { text: combined, pdfUrl };
  } catch {
    return { text: '', pdfUrl: null };
  }
}

export async function crawlActive() {
  const started = Date.now();
  const known = await loadKnownSourceUrls('wrzesnia');
  const listings = [];
  const land = [];
  const wykaz = [];

  for (let pg = 0; pg < MAX_PAGES; pg++) {
    const pageUrl = `${BASE_URL}/?bip=2&cid=216&pg=${pg}`;
    let html;
    try {
      html = await getText(pageUrl, FETCH_OPTS);
    } catch {
      break;
    }

    const items = harvestItemsFromHtml(html);
    if (items.length === 0) break;

    for (const it of items) {
      if (/wykaz/i.test(it.title)) {
        wykaz.push({
          source_url: it.url,
          title: it.title,
          date_published: it.date,
        });
        continue;
      }

      if (isAnnouncementTitle(it.title)) {
        const { text, pdfUrl } = await extractDetailContent(it.url);
        const parsed = parseAnnouncement(text, it.title, it.url);
        parsed.date_published = it.date;

        if (parsed.kind === 'grunt') {
          land.push(parsed);
        } else {
          listings.push(parsed);
        }
      }
    }

    if (!html.includes(`&amp;pg=${pg + 1}`)) {
      break;
    }
  }

  return {
    listings,
    wykaz,
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlResultDocs() {
  const results = [];

  for (let pg = 0; pg < MAX_PAGES; pg++) {
    const pageUrl = `${BASE_URL}/?bip=2&cid=216&pg=${pg}`;
    let html;
    try {
      html = await getText(pageUrl, FETCH_OPTS);
    } catch {
      break;
    }

    const items = harvestItemsFromHtml(html);
    if (items.length === 0) break;

    for (const it of items) {
      if (!isResultTitle(it.title)) continue;

      const { text, pdfUrl } = await extractDetailContent(it.url);
      results.push({
        source_url: it.url,
        title: it.title,
        text,
        date: it.date,
        pdf_url: pdfUrl,
      });
    }

    if (!html.includes(`&amp;pg=${pg + 1}`)) {
      break;
    }
  }

  return results;
}
