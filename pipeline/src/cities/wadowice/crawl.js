import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.malopolska.pl';
const CONTEXT = 'umwadowice';
const API_BASE = `${ORIGIN}/api`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchJson(url) {
  try {
    const raw = await getText(url, FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[wadowice] fetch failed for ${url}:`, err.message);
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

    let attachmentText = '';
    if (detail && Array.isArray(detail.attachments)) {
      for (const att of detail.attachments) {
        if (att.link && att.link.includes('pobierz') && (att.extension === 'pdf' || att.name?.endsWith('.pdf'))) {
          const pdfUrl = `${ORIGIN}/${att.link}`;
          try {
            const pt = await pdfText(pdfUrl, FETCH_OPTS);
            attachmentText += ` ${pt}`;
          } catch (err) {
            console.warn(`[wadowice] pdfText failed for ${pdfUrl}:`, err.message);
          }
        }
      }
    }

    const combined = `${fullHtml} ${attachmentText}`;
    if (isAnnouncementTitle(title) || isAnnouncementTitle(combined)) {
      results.push(parseAnnouncement(item, combined));
    }
    if (isResultTitle(title) || isResultTitle(combined)) {
      results.push(parseResultDocFn(item, combined));
    }
  }

  return results;
}

export async function crawlResultDocs() {
  const searchUrl = `${API_BASE}/contexts/${CONTEXT}/articles?s=informacja+o+wyniku+przetargu&limit=25&offset=0`;
  const data = await fetchJson(searchUrl);
  if (!data || !Array.isArray(data.elements)) return [];

  const results = [];
  for (const item of data.elements) {
    const detail = await fetchJson(`${API_BASE}/articles/${item.id}`);
    const fullHtml = detail && detail.content ? detail.content : '';

    let attachmentText = '';
    if (detail && Array.isArray(detail.attachments)) {
      for (const att of detail.attachments) {
        if (att.link && (att.extension === 'pdf' || att.name?.endsWith('.pdf'))) {
          const pdfUrl = `${ORIGIN}/${att.link}`;
          try {
            const pt = await pdfText(pdfUrl, FETCH_OPTS);
            attachmentText += ` ${pt}`;
          } catch (err) {
            console.warn(`[wadowice] pdfText failed for ${pdfUrl}:`, err.message);
          }
        }
      }
    }

    results.push(parseResultDocFn(item, `${fullHtml} ${attachmentText}`));
  }
  return results;
}

export function parseResultDoc(doc) {
  return parseResultDocFn(doc, doc.content || doc.text || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
