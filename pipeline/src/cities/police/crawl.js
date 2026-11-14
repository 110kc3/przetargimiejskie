import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  parseNoticeHtml,
  parseResultNotice,
} from './parse.js';

const ORIGIN = 'https://bip.police.pl';
const BOARD_URL = `${ORIGIN}/przetargi-nieruchomosci/376`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  if (!html) return [];

  const noticeUrls = [];
  const linkRegex = /href="([^"]*\/przetarg-nieruchomosci\/(\d+)[^"]*)"/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${ORIGIN}${rawUrl}`;
    if (!noticeUrls.includes(fullUrl)) {
      noticeUrls.push(fullUrl);
    }
  }

  const results = [];
  for (const url of noticeUrls.slice(0, 15)) {
    try {
      const pageHtml = await getText(url, FETCH_OPTS);
      if (pageHtml) {
        const parsed = parseNoticeHtml(pageHtml, url);
        if (parsed && parsed.id) {
          results.push(parsed);
        }
      }
    } catch (err) {
      console.error(`[police] failed to fetch notice ${url}:`, err.message);
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Police:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
