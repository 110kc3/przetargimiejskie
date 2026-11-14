import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const API_BASE = 'https://bip.kartuzy.pl/api';
const BASE_URL = 'https://bip.kartuzy.pl';

async function fetchJson(url) {
  try {
    const raw = await getText(url);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[kartuzy] fetch failed for ${url}:`, err.message);
    return null;
  }
}

export async function crawlActive() {
  const searchUrls = [
    `${API_BASE}/contexts/default/articles?s=przetarg+sprzeda%C5%BC&limit=25&offset=0`,
    `${API_BASE}/contexts/default/articles?s=og%C5%82oszenie+o+przetargu&limit=25&offset=0`,
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
    let docText = (detail && detail.content) || '';

    if (detail && Array.isArray(detail.attachments)) {
      for (const att of detail.attachments) {
        if (att.link && (att.extension === 'pdf' || /pdf/i.test(att.name || ''))) {
          const downloadUrl = att.link.startsWith('http') ? att.link : `${BASE_URL}/${att.link}`;
          try {
            const pdfTxt = await pdfText(downloadUrl);
            if (pdfTxt && pdfTxt.trim().length > 50) {
              docText += `\n${pdfTxt}`;
            }
          } catch (_) {
          }
        }
      }
    }

    if (isAnnouncementTitle(title)) {
      results.push(parseAnnouncement(item, docText));
    }
    if (isResultTitle(title) || /informacja o wyniku przetargu/i.test(docText)) {
      results.push(parseResultDocFn(item, docText));
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
    let docText = (detail && detail.content) || '';

    if (detail && Array.isArray(detail.attachments)) {
      for (const att of detail.attachments) {
        if (att.link && (att.extension === 'pdf' || /pdf/i.test(att.name || ''))) {
          const downloadUrl = att.link.startsWith('http') ? att.link : `${BASE_URL}/${att.link}`;
          try {
            const pdfTxt = await pdfText(downloadUrl);
            if (pdfTxt && pdfTxt.trim().length > 50) {
              docText += `\n${pdfTxt}`;
            }
          } catch (_) {
          }
        }
      }
    }

    results.push(parseResultDocFn(item, docText));
  }
  return results;
}

export function parseResultDoc(doc) {
  return parseResultDocFn(doc, doc.rawText || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
