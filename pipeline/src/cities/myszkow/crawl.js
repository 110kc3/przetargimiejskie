// Crawler for Myszków (bip.miastomyszkow.pl)
//
// Scrapes BIPv2 tender categories and digital text PDFs from bip-api.miastomyszkow.pl.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip.miastomyszkow.pl';
const BOARD_URLS = [
  `${BASE_URL}/kategorie/450-przetargi-poza-ustawa-pzp`,
];

export async function crawlActive() {
  const seenIds = new Set();
  const articles = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/href="(\/kategorie\/450-przetargi-poza-ustawa-pzp\/artykuly\/([0-9]+)-[^"?]+(?:\?lang=PL)?)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const path = m[1];
        const id = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, '').trim();
        if (!seenIds.has(id) && rawTitle) {
          seenIds.add(id);
          articles.push({
            id,
            url: `${BASE_URL}${path}`,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[myszkow] crawl board failed: ${boardUrl}`, err.message);
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
      const attachMatches = [...detailHtml.matchAll(/href="(https:\/\/bip-api\.miastomyszkow\.pl\/api\/attachments\/([0-9]+))"/gi)];

      let docText = detailHtml;
      for (const att of attachMatches) {
        const attachUrl = att[1];
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
      if (isResultTitle(title) || /informacja o wyniku/i.test(docText)) {
        results.push(parseResultDocFn(item, docText));
      }
    } catch (err) {
      console.error(`[myszkow] failed to fetch item ${item.id}:`, err.message);
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
