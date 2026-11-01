// Crawler for Myślenice (bip.malopolska.pl/umigmyslenice)
//
// Fetches articles and attachments from Wrota Małopolski MADKOM API.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.malopolska.pl';
const CONTEXT = 'umigmyslenice';
const API_BASE = `${ORIGIN}/api`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchJson(url) {
  try {
    const raw = await getText(url, FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[myslenice] fetch failed for ${url}:`, err.message);
    return null;
  }
}

export async function crawlActive() {
  const searchUrls = [
    `${API_BASE}/contexts/${CONTEXT}/articles?s=przetarg+sprzeda%C5%BC+nieruchomo%C5%9Bci&limit=25&offset=0`,
    `${API_BASE}/contexts/${CONTEXT}/articles?s=%22przetarg+ustny%22&limit=25&offset=0`,
  ];

  const seenIds = new Set();
  const articles = [];

  for (const sUrl of searchUrls) {
    const data = await fetchJson(sUrl);
    if (!data || !Array.isArray(data.elements)) continue;

    for (const el of data.elements) {
      if (!seenIds.has(el.id)) {
        seenIds.add(el.id);
        const title = (el.title || el.aliasFields?.find?.(a => a.alias === 'title')?.value || '').trim();
        articles.push({
          ...el,
          title,
        });
      }
    }
  }

  const results = [];
  for (const item of articles) {
    const title = (item.title || '').trim();
    if (!isAnnouncementTitle(title) && !isResultTitle(title)) {
      continue;
    }

    const detail = await fetchJson(`${API_BASE}/articles/${item.id}`);
    const fullHtml = detail && detail.content ? detail.content : '';

    if (isAnnouncementTitle(title)) {
      results.push(parseAnnouncement(item, fullHtml));
    } else if (isResultTitle(title)) {
      results.push(parseResultDocFn(item, fullHtml));
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Myślenice:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
