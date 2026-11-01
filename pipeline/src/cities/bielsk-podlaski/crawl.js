// Crawler for Bielsk Podlaski (bip-umbielsk.podlaskie.eu)
//
// Scrapes Podlaskie platform property pages and born-digital PDFs.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip-umbielsk.podlaskie.eu';
const BOARD_URLS = [
  `${BASE_URL}/cms/page/link/1281`,
  `${BASE_URL}/cms/page/link/1284`,
];

export async function crawlActive() {
  const seenUrls = new Set();
  const articles = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]*(?:\/nieruchomosci\/|\/resource\/)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const rawHref = m[1];
        const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
        const url = rawHref.startsWith('http') ? rawHref : `${BASE_URL}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;

        if (!seenUrls.has(url) && (isAnnouncementTitle(rawTitle) || isResultTitle(rawTitle) || /przetarg|sprzedaż/i.test(url))) {
          seenUrls.add(url);
          articles.push({
            id: url.replace(/.*\/([^.]+)(?:\.html)?$/, '$1'),
            url,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[bielsk-podlaski] crawl board failed: ${boardUrl}`, err.message);
    }
  }

  const results = [];
  for (const item of articles) {
    const title = item.title;
    try {
      let docText = '';
      if (item.url.endsWith('.pdf')) {
        docText = (await pdfText(item.url)) || '';
      } else {
        const detailHtml = await getText(item.url);
        docText = detailHtml;

        const attachMatches = [...detailHtml.matchAll(/href="([^"]*\/resource\/[^"]+\.pdf[^"]*)"/gi)];
        for (const att of attachMatches) {
          const attachUrl = att[1].startsWith('http') ? att[1] : `${BASE_URL}${att[1]}`;
          try {
            const pdfTxt = await pdfText(attachUrl);
            if (pdfTxt && pdfTxt.trim().length > 50) {
              docText += `\n${pdfTxt}`;
            }
          } catch (_) {
            // rely on HTML
          }
        }
      }

      if (isAnnouncementTitle(title) || isAnnouncementTitle(docText.slice(0, 300))) {
        results.push(parseAnnouncement(item, docText));
      }
      if (isResultTitle(title) || /informacja o wyniku przetargu/i.test(docText)) {
        results.push(parseResultDocFn(item, docText));
      }
    } catch (err) {
      console.error(`[bielsk-podlaski] failed to fetch item ${item.id}:`, err.message);
    }
  }

  return results;
}

export async function crawlResultDocs() {
  const active = await crawlActive();
  return active.filter(x => x.status !== undefined);
}

export function parseResultDoc(doc) {
  return parseResultDocFn(doc, doc.rawText || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
