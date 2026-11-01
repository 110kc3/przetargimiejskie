// Żary crawler — bip.zary.pl (SystemDoBIP CMS).
//
// Boards:
//   Announcements: https://bip.zary.pl/312/Przetargi/
//   Wykaz:         https://bip.zary.pl/313/Wyznaczone_do_sprzedazy/
//   Results:       https://bip.zary.pl/837/Wyniki_przetargow/
// Standard browser User-Agent required.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isAnnouncementTitle,
  isResultTitle,
} from './parse.js';

export const BASE_URL = 'https://bip.zary.pl';
export const ANNOUNCE_BOARD = `${BASE_URL}/312/Przetargi/`;
export const WYKAZ_BOARD = `${BASE_URL}/313/Wyznaczone_do_sprzedazy/`;
export const RESULTS_BOARD = `${BASE_URL}/837/Wyniki_przetargow/`;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const FETCH_OPTS = { userAgent: BROWSER_UA };

export const MAX_PAGES = Number(process.env.ZARY_MAX_PAGES) || 4;

export function resolveUrl(href) {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&'), BASE_URL).toString();
  } catch {
    return null;
  }
}

export function harvestBoardItems(html) {
  const items = [];
  const regex = /<a href="([^"]*\/(\d+)\/(\d+)\/([^"\/]+)\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    const rawTitle = m[5].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    const title = rawTitle.replace(/^czytaj więcej o\s+/i, '');
    if (url && title) {
      items.push({ url, title });
    }
  }
  return items;
}

export async function extractDetailAttachments(detailUrl) {
  try {
    const html = await getText(detailUrl, FETCH_OPTS);
    const links = [...html.matchAll(/href="([^"]*pobierz\.php[^"]*)"/gi)].map(m => resolveUrl(m[1]));
    return [...new Set(links)];
  } catch {
    return [];
  }
}

export async function extractPdfText(url) {
  if (!url) return '';
  try {
    const text = await pdfText(url, FETCH_OPTS);
    if (text && text.trim().length > 30) return text;
  } catch {
    // ignore
  }
  try {
    const text = await ocrPdf(url, FETCH_OPTS);
    if (text && text.trim().length > 30) return text;
  } catch {
    // ignore
  }
  return '';
}

export async function crawlActive() {
  const started = Date.now();
  const known = await loadKnownSourceUrls('zary');
  const listings = [];
  const land = [];
  const wykaz = [];

  // Crawl announcements
  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? ANNOUNCE_BOARD : `${ANNOUNCE_BOARD}${page}/`;
    let html;
    try {
      html = await getText(pageUrl, FETCH_OPTS);
    } catch {
      break;
    }

    const items = harvestBoardItems(html);
    if (items.length === 0) break;

    for (const it of items) {
      const atts = await extractDetailAttachments(it.url);
      for (const att of atts) {
        const text = await extractPdfText(att);
        if (!text) continue;

        const parsed = parseAnnouncement(text, it.title, it.url);
        if (parsed.kind === 'grunt') {
          land.push(parsed);
        } else {
          listings.push(parsed);
        }
      }
    }

    if (!html.includes(`/312/Przetargi/${page + 1}/`)) {
      break;
    }
  }

  // Crawl wykaz
  try {
    const wykazHtml = await getText(WYKAZ_BOARD, FETCH_OPTS);
    const wykazItems = harvestBoardItems(wykazHtml);
    for (const w of wykazItems) {
      wykaz.push({
        source_url: w.url,
        title: w.title,
      });
    }
  } catch {
    // ignore
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

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? RESULTS_BOARD : `${RESULTS_BOARD}${page}/`;
    let html;
    try {
      html = await getText(pageUrl, FETCH_OPTS);
    } catch {
      break;
    }

    const items = harvestBoardItems(html);
    if (items.length === 0) break;

    for (const it of items) {
      const atts = await extractDetailAttachments(it.url);
      for (const att of atts) {
        const text = await extractPdfText(att);
        results.push({
          source_url: att,
          title: it.title,
          text,
        });
      }
    }

    if (!html.includes(`/837/Wyniki_przetargow/${page + 1}/`)) {
      break;
    }
  }

  return results;
}
