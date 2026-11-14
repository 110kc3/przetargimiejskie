
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncementHtml,
  parseResultNotice,
} from './parse.js';

const ORIGIN = 'https://bip.olecko.pl';
const BOARD_URL = `${ORIGIN}/1539/sprzedaz-nieruchomosci.html`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  if (!html) return [];

  const noticeUrls = [];
  const linkRegex = /<a[^>]*href="([^"]*\/(\d+)\/[^"]*\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${ORIGIN}${rawUrl}`;
    const title = match[3].trim();
    if (isAnnouncementTitle(title) || isResultTitle(title)) {
      if (!noticeUrls.some(x => x.url === fullUrl)) {
        noticeUrls.push({ url: fullUrl, title });
      }
    }
  }

  const results = [];
  for (const item of noticeUrls.slice(0, 15)) {
    try {
      const pageHtml = await getText(item.url, FETCH_OPTS);
      if (pageHtml) {
        if (isAnnouncementTitle(item.title)) {
          const parsed = parseAnnouncementHtml(pageHtml, item.url);
          if (parsed && parsed.id) results.push(parsed);
        } else if (isResultTitle(item.title)) {
          const parsed = parseResultNotice(pageHtml, item.url);
          if (parsed && parsed.id) results.push(parsed);
        }
      }
    } catch (err) {
      console.error(`[olecko] failed to fetch notice ${item.url}:`, err.message);
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Olecko:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
