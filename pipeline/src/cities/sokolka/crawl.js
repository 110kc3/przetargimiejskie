
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip-umsokolka.podlaskie.eu';
const BOARD_ROOT = `${BASE_URL}/przet_zam/47cac52c6f2e811/`;
const YEAR_URLS = [
  `${BOARD_ROOT}2026/`,
  `${BOARD_ROOT}2025/`,
  `${BOARD_ROOT}2024/`,
];

export async function crawlActive() {
  const seenUrls = new Set();
  const articles = [];

  for (const yearUrl of YEAR_URLS) {
    try {
      const html = await getText(yearUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]*\.html)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const rawHref = m[1];
        const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
        const url = rawHref.startsWith('http') ? rawHref : `${BASE_URL}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;

        if (!seenUrls.has(url) && (isAnnouncementTitle(rawTitle) || isResultTitle(rawTitle) || /grk6840/i.test(url))) {
          seenUrls.add(url);
          articles.push({
            id: url.replace(/.*\/([^.]+)(?:\.html)?$/, '$1'),
            url,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[sokolka] crawl board failed: ${yearUrl}`, err.message);
    }
  }

  const results = [];
  for (const item of articles) {
    const title = item.title;
    try {
      const detailHtml = await getText(item.url);
      let docText = detailHtml || '';

      const pdfMatches = [...(detailHtml || '').matchAll(/href="([^"]*\/resource\/[^"]+\.pdf)"/gi)];
      for (const pm of pdfMatches) {
        const pdfHref = pm[1];
        const pdfUrl = pdfHref.startsWith('http') ? pdfHref : `${BASE_URL}${pdfHref.startsWith('/') ? '' : '/'}${pdfHref}`;
        const pText = await pdfText(pdfUrl);
        if (pText) docText += `\n${pText}`;
      }

      if (isAnnouncementTitle(title)) {
        results.push(parseAnnouncement(item, docText));
      }
      if (isResultTitle(title) || /informacja o wyniku|wynik.*przetarg|-wynik/i.test(docText)) {
        results.push(parseResultDocFn(item, docText));
      }
    } catch (err) {
      console.error(`[sokolka] failed to process item ${item.url}:`, err.message);
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Sokółka:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
