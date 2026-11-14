import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const API_BASE = 'https://bip.tuchola.pl/api';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchJson(url) {
  try {
    const raw = await getText(url, FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[tuchola] fetch failed for ${url}:`, err.message);
    return null;
  }
}

export async function crawlActive() {
  const searchUrls = [
    `${API_BASE}/contexts/default/articles?s=przetarg+sprzeda%C5%BC+dzia%C5%82ki&limit=25&offset=0`,
    `${API_BASE}/contexts/default/articles?s=%22przetarg+ustny%22&limit=25&offset=0`,
  ];

  const seenIds = new Set();
  const articles = [];

  for (const sUrl of searchUrls) {
    const data = await fetchJson(sUrl);
    if (!data || !Array.isArray(data.elements)) continue;

    for (const el of data.elements) {
      if (!seenIds.has(el.id)) {
        seenIds.add(el.id);
        articles.push(el);
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
    }
    if (isResultTitle(title) || /informacja o wyniku/i.test(fullHtml)) {
      results.push(parseResultDocFn(item, fullHtml));
    }
  }

  return results;
}

export async function crawlResultDocs() {
  const searchUrl = `${API_BASE}/contexts/default/articles?s=informacja+o+wyniku+przetargu&limit=25&offset=0`;
  const data = await fetchJson(searchUrl);
  if (!data || !Array.isArray(data.elements)) return [];

  const results = [];
  for (const item of data.elements) {
    const detail = await fetchJson(`${API_BASE}/articles/${item.id}`);
    const fullHtml = detail && detail.content ? detail.content : '';
    results.push(parseResultDocFn(item, fullHtml));
  }
  return results;
}

export function parseResultDoc(doc) {
  return parseResultDocFn(doc, doc.content || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
