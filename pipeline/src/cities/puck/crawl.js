
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip.miastopuck.pl';
const BOARD_URLS = [
  `${BASE_URL}/artykul/zbywanie-nieruchomosci`,
  `${BASE_URL}/artykul/informacje-o-wyniku-przetargow-i-rokowan`,
];

export async function crawlActive() {
  const seenUrls = new Set();
  const articles = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/<a[^>]+href="(\/artykul\/([^"#?]+))"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const path = m[1];
        const slug = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, '').trim();
        const url = `${BASE_URL}${path}`;

        if (!seenUrls.has(url) && (isAnnouncementTitle(rawTitle) || isResultTitle(rawTitle))) {
          seenUrls.add(url);
          articles.push({
            id: slug,
            slug,
            url,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[puck] crawl board failed: ${boardUrl}`, err.message);
    }
  }

  const results = [];
  for (const item of articles) {
    const title = item.title;
    try {
      const detailHtml = await getText(item.url);
      const attachMatches = [...detailHtml.matchAll(/href="([^"]*\/pliki\/miastopuck\/zalaczniki\/[^"]+\.pdf)"/gi)];

      let docText = detailHtml;
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

      if (isAnnouncementTitle(title)) {
        results.push(parseAnnouncement(item, docText));
      }
      if (isResultTitle(title) || /informacja o wyniku przetargu/i.test(docText)) {
        results.push(parseResultDocFn(item, docText));
      }
    } catch (err) {
      console.error(`[puck] failed to fetch item ${item.slug}:`, err.message);
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
