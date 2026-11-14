
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://www.bip.zywiec.pl';
const BOARD_URLS = [
  `${BASE_URL}/category/sprzedaz-i-wydzierzawianie-nieruchomosci-1`,
  `${BASE_URL}/category/sprzedaz-i-wydzierzawianie-nieruchomosci-1,strona2`,
];

export async function crawlActive() {
  const seenIds = new Set();
  const articles = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl);
      if (!html) continue;

      const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]*item\/([0-9]+))"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const id = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, '').trim();
        if (!seenIds.has(id) && rawTitle) {
          seenIds.add(id);
          articles.push({
            id,
            url: `${BASE_URL}/item/${id}`,
            printUrl: `${BASE_URL}/item/${id}/print`,
            title: rawTitle,
          });
        }
      }
    } catch (err) {
      console.error(`[zywiec] crawl board failed: ${boardUrl}`, err.message);
    }
  }

  const results = [];
  for (const item of articles) {
    const title = item.title;
    if (!isAnnouncementTitle(title) && !isResultTitle(title)) {
      continue;
    }

    try {
      const detailHtml = await getText(item.printUrl || item.url);
      if (isAnnouncementTitle(title)) {
        results.push(parseAnnouncement(item, detailHtml));
      }
      if (isResultTitle(title) || /informacja o wyniku przetargu/i.test(detailHtml)) {
        results.push(parseResultDocFn(item, detailHtml));
      }
    } catch (err) {
      console.error(`[zywiec] failed to fetch item ${item.id}:`, err.message);
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
