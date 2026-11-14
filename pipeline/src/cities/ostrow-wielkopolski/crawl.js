
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncementHtml,
  parseResultHtml,
} from './parse.js';

const ORIGIN = 'https://bip.umostrow.pl';
const BOARD_URL = `${ORIGIN}/artykuly/187/gospodarka-nieruchomosciami`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  if (!html) return [];

  const noticeUrls = [];
  const linkRegex = /href="([^"]*\/artykul\/21\/(\d+)[^"]*)"/gi;
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
        const titleMatch = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || pageHtml.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : '';

        if (isAnnouncementTitle(title)) {
          const parsed = parseAnnouncementHtml(pageHtml, url);
          if (parsed && parsed.id) results.push(parsed);
        } else if (isResultTitle(title)) {
          const parsed = parseResultHtml(pageHtml, url);
          if (parsed && parsed.id) results.push(parsed);
        }
      }
    } catch (err) {
      console.error(`[ostrow-wielkopolski] failed to fetch notice ${url}:`, err.message);
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Ostrów Wielkopolski:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
