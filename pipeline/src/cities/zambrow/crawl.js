import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncementHtml,
  parseResultNotice,
} from './parse.js';

const ORIGIN = 'https://bip.zambrow.pl';
const BOARD_URL = `${ORIGIN}/artykul/ogloszenia`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  if (!html) return [];

  const articleLinks = [];
  const linkRegex = /<a[^>]*href="(\/artykul\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const relUrl = match[1];
    const title = match[2].trim();
    if (isAnnouncementTitle(title) || isResultTitle(title)) {
      articleLinks.push({
        url: `${ORIGIN}${relUrl}`,
        title,
      });
    }
  }

  const results = [];
  for (const item of articleLinks.slice(0, 15)) {
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
      console.error(`[zambrow] failed to fetch notice ${item.url}:`, err.message);
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Zambrów:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
