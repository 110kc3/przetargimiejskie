// Crawler for Świecie (bip.swiecie.eu)
//
// Walks property boards and search on BIPLO CMS.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.swiecie.eu';
const BOARD_URLS = [
  `${ORIGIN}/artykuly/197/gospodarka-nieruchomosciami`,
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const articleUrls = new Set();

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl, FETCH_OPTS);
      const matches = [...html.matchAll(/href=[\"'](https:\/\/bip\.swiecie\.eu\/artykul\/[^\"]+)[\"']/gi)];
      for (const m of matches) {
        if (/przetarg|zbyci|sprzedaz/i.test(m[1])) {
          articleUrls.add(m[1]);
        }
      }
    } catch (err) {
      console.warn(`[swiecie] board fetch failed for ${boardUrl}:`, err.message);
    }
  }

  const results = [];
  for (const articleUrl of articleUrls) {
    try {
      const html = await getText(articleUrl, FETCH_OPTS);
      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Ogłoszenie o przetargu';

      // Find attachment links
      const attMatches = [...html.matchAll(/href=[\"'](https:\/\/bip\.swiecie\.eu\/attachments\/download\/(\d+))[\"']/gi)];
      if (attMatches.length > 0) {
        for (const m of attMatches) {
          const attUrl = m[1];
          const attId = m[2];

          let docText = '';
          try {
            docText = await pdfText(attUrl, FETCH_OPTS);
          } catch (err) {
            console.warn(`[swiecie] pdfText failed for ${attUrl}:`, err.message);
          }

          const item = {
            id: attId,
            title,
            url: attUrl,
          };

          if (isAnnouncementTitle(title) || isAnnouncementTitle(docText)) {
            results.push(parseAnnouncement(item, docText));
          }
          if (isResultTitle(title) || isResultTitle(docText)) {
            results.push(parseResultDocFn(item, docText));
          }
        }
      } else {
        const item = {
          id: articleUrl.match(/\/(\d+)\/[^\/]+$/)?.[1] || `doc-${Date.now()}`,
          title,
          url: articleUrl,
        };
        if (isAnnouncementTitle(title)) {
          results.push(parseAnnouncement(item, html));
        }
        if (isResultTitle(title)) {
          results.push(parseResultDocFn(item, html));
        }
      }
    } catch (err) {
      console.warn(`[swiecie] failed processing article ${articleUrl}:`, err.message);
    }
  }

  return results;
}

export async function crawlResultDocs() {
  return [];
}

export function parseResultDoc(doc) {
  return parseResultDocFn(doc, doc.text || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
