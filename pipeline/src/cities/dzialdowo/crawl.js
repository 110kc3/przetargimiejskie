// Crawler for Działdowo (bip.dzialdowo.eu)
//
// Scrapes BIPLO tablica ogłoszeń and digital text PDFs from /attachments/download/<id>.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip.dzialdowo.eu';
const BOARD_URLS = [
  `${BASE_URL}/artykuly/590/tablica-ogloszen`,
];

export async function crawlActive() {
  const seenIds = new Set();
  const articles = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/href="([^"]*\/artykul\/590\/([0-9]+)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const url = m[1].startsWith('http') ? m[1] : `${BASE_URL}${m[1]}`;
        const id = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, '').trim();
        if (!seenIds.has(id) && rawTitle) {
          seenIds.add(id);
          articles.push({
            id,
            url,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[dzialdowo] crawl board failed: ${boardUrl}`, err.message);
    }
  }

  const results = [];
  for (const item of articles) {
    const title = item.title;
    if (!isAnnouncementTitle(title) && !isResultTitle(title)) {
      continue;
    }

    try {
      const detailHtml = await getText(item.url);
      const attachMatches = [...detailHtml.matchAll(/href="([^"]*\/attachments\/download\/([0-9]+))"/gi)];

      let docText = detailHtml;
      for (const att of attachMatches) {
        const attachUrl = att[1].startsWith('http') ? att[1] : `${BASE_URL}${att[1]}`;
        try {
          const pdfTxt = await pdfText(attachUrl);
          if (pdfTxt && pdfTxt.trim().length > 50) {
            docText += `\n${pdfTxt}`;
          }
        } catch (_) {
          // ignore PDF fetch failure and rely on HTML
        }
      }

      if (isAnnouncementTitle(title)) {
        results.push(parseAnnouncement(item, docText));
      }
      if (isResultTitle(title) || /informacja o wyniku przetargu/i.test(docText)) {
        results.push(parseResultDocFn(item, docText));
      }
    } catch (err) {
      console.error(`[dzialdowo] failed to fetch item ${item.id}:`, err.message);
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
