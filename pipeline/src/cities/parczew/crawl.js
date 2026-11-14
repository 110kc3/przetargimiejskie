
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://umparczew.bip.lubelskie.pl';
const MENU_IDS = ['413', '81'];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchAjaxRecords(menuId) {
  const url = `${ORIGIN}/index.php?id=${menuId}&action=list-ajax`;
  try {
    const raw = await getText(url, FETCH_OPTS);
    const data = JSON.parse(raw);
    return Array.isArray(data.aaData) ? data.aaData : [];
  } catch (err) {
    console.warn(`[parczew] list-ajax failed for menu ${menuId}:`, err.message);
    return [];
  }
}

export async function crawlActive() {
  const records = [];
  for (const menuId of MENU_IDS) {
    const items = await fetchAjaxRecords(menuId);
    records.push(...items);
  }

  const results = [];
  for (const rec of records) {
    const title = (rec.tresc || '').trim();
    if (!isAnnouncementTitle(title) && !isResultTitle(title)) {
      continue;
    }

    const docId = rec.id_dokumentu;
    const detailUrl = `${ORIGIN}/index.php?id=${rec.id_menu || '413'}&action=details&document_id=${docId}`;

    let pdfUrl = null;
    let docText = '';

    try {
      const detailHtml = await getText(detailUrl, FETCH_OPTS);
      if (detailHtml) {
        const pdfMatch = detailHtml.match(/href="([^"]*\/upload\/pliki\/[^"]+\.pdf(?:[?][^"]*)?)"/i);
        if (pdfMatch) {
          const rawHref = pdfMatch[1];
          pdfUrl = rawHref.startsWith('http') ? rawHref : `${ORIGIN}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
        }
      }
    } catch (err) {
      console.warn(`[parczew] failed to fetch detail for ${docId}:`, err.message);
    }

    if (pdfUrl) {
      try {
        const cleanPdf = pdfUrl.split('?')[0];
        docText = (await pdfText(cleanPdf)) || '';
      } catch (err) {
        console.warn(`[parczew] failed to extract pdf text for ${pdfUrl}:`, err.message);
      }
    }

    const itemObj = {
      ...rec,
      url: detailUrl,
    };

    if (isAnnouncementTitle(title)) {
      results.push(parseAnnouncement(itemObj, docText));
    } else if (isResultTitle(title)) {
      results.push(parseResultDocFn(itemObj, docText));
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Parczew:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
