import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://umkrasnystaw.bip.lubelskie.pl';
const LIST_URLS = [
  `${BASE_URL}/index.php?id=1391&action=list-ajax`,
  `${BASE_URL}/index.php?id=1303&action=list-ajax`,
];

async function fetchJson(url) {
  try {
    const raw = await getText(url);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[krasnystaw] fetch failed for ${url}:`, err.message);
    return null;
  }
}

export async function crawlActive() {
  const seenIds = new Set();
  const rawDocs = [];

  for (const listUrl of LIST_URLS) {
    const data = await fetchJson(listUrl);
    if (!data || !Array.isArray(data.aaData)) continue;

    for (const item of data.aaData) {
      if (item.id_dokumentu && !seenIds.has(item.id_dokumentu)) {
        seenIds.add(item.id_dokumentu);
        rawDocs.push(item);
      }
    }
  }

  const results = [];
  for (const item of rawDocs) {
    const title = item.tresc || '';
    if (!isAnnouncementTitle(title) && !isResultTitle(title)) {
      continue;
    }

    const detailUrl = `${BASE_URL}/index.php?id=${item.id_menu || 1391}&p=document&action=show&id_dokumentu=${item.id_dokumentu}`;
    let docText = '';

    try {
      const html = await getText(detailUrl);
      docText = html;

      const attachMatches = [...html.matchAll(/href="([^"]*action=save[^"]*)"/gi)];
      for (const m of attachMatches) {
        const attachUrl = m[1].startsWith('http') ? m[1] : `${BASE_URL}/${m[1].replace(/^\//, '')}`;
        try {
          const pdfTxt = await pdfText(attachUrl);
          if (pdfTxt && pdfTxt.trim().length > 50) {
            docText += `\n${pdfTxt}`;
          }
        } catch (_) {
        }
      }
    } catch (err) {
      console.error(`[krasnystaw] detail fetch failed for ${item.id_dokumentu}:`, err.message);
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
