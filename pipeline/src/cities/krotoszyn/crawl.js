
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const API_BASE = 'https://bip.um.krotoszyn.pl/api';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchJson(url) {
  try {
    const raw = await getText(url, FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[krotoszyn] fetch failed for ${url}:`, err.message);
    return null;
  }
}

export async function crawlActive() {
  const searchUrls = [
    `${API_BASE}/menu/4569/articles?limit=25&offset=0`,
    `${API_BASE}/contexts/default/articles?s=%22przetarg+ustny%22&limit=25&offset=0`,
    `${API_BASE}/contexts/default/articles?s=sprzeda%C5%BC+lokalu&limit=25&offset=0`,
  ];

  const seenIds = new Set();
  const articles = [];

  for (const sUrl of searchUrls) {
    const data = await fetchJson(sUrl);
    if (!data) continue;
    const list = Array.isArray(data.elements) ? data.elements : Array.isArray(data.articles) ? data.articles : [];

    for (const el of list) {
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
  console.log(`Crawled ${items.length} items from Krotoszyn:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
