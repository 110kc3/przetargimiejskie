// Crawler for Wysokie Mazowieckie (bip-umwysokiemaz.podlaskie.eu)
//
// Scrapes Podlaskie platform property pages and PDF attachments.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip-umwysokiemaz.podlaskie.eu';
const BOARD_URLS = [
  `${BASE_URL}/ogloszenia/inne/`,
];

export async function crawlActive() {
  const seenUrls = new Set();
  const articles = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]*(?:\/ogloszenia\/inne\/|\/resource\/)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const rawHref = m[1];
        const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
        const url = rawHref.startsWith('http') ? rawHref : `${BASE_URL}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;

        if (!seenUrls.has(url) && (isAnnouncementTitle(rawTitle) || isResultTitle(rawTitle) || /przetarg|ogloszenie-o-wyniku/i.test(url))) {
          seenUrls.add(url);
          articles.push({
            id: url.replace(/.*\/([^.]+)(?:\.html)?$/, '$1'),
            url,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[wysokie-mazowieckie] crawl board failed: ${boardUrl}`, err.message);
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
      console.error(`[wysokie-mazowieckie] failed to process item ${item.url}:`, err.message);
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Wysokie Mazowieckie:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
