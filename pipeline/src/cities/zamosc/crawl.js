// Crawler for Zamość (umzamosc.bip.lubelskie.pl)
//
// Queries DataTables ajax endpoint on lubelskie.pl BIP platform.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://umzamosc.bip.lubelskie.pl';
const MENU_IDS = ['91'];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchAjaxRecords(menuId) {
  const url = `${ORIGIN}/index.php?id=${menuId}&action=list-ajax`;
  try {
    const raw = await getText(url, FETCH_OPTS);
    const data = JSON.parse(raw);
    return Array.isArray(data.aaData) ? data.aaData : [];
  } catch (err) {
    console.warn(`[zamosc] list-ajax failed for menu ${menuId}:`, err.message);
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
    const detailUrl = `${ORIGIN}/index.php?id=${rec.id_menu || '91'}&action=details&document_id=${docId}`;

    let pdfUrls = [];
    let docText = '';

    try {
      const detailHtml = await getText(detailUrl, FETCH_OPTS);
      if (detailHtml) {
        const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\/upload\/pliki\/[^"]+\.pdf(?:[?][^"]*)?)"/gi)];
        for (const m of pdfMatches) {
          const rawHref = m[1];
          const fullPdfUrl = rawHref.startsWith('http') ? rawHref : `${ORIGIN}${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
          if (!pdfUrls.includes(fullPdfUrl)) {
            pdfUrls.push(fullPdfUrl);
          }
        }
      }
    } catch (err) {
      console.warn(`[zamosc] failed to fetch detail for ${docId}:`, err.message);
    }

    for (const pUrl of pdfUrls) {
      try {
        const cleanPdf = pUrl.split('?')[0];
        const text = await pdfText(cleanPdf);
        if (text) {
          docText += `\n${text}`;
        }
      } catch (err) {
        console.warn(`[zamosc] failed to extract pdf text for ${pUrl}:`, err.message);
      }
    }

    const itemObj = {
      ...rec,
      url: detailUrl,
    };

    if (isAnnouncementTitle(title)) {
      results.push(parseAnnouncement(itemObj, docText));
    }
    if (isResultTitle(title) || /informacja o wyniku|wynik.*przetarg/i.test(docText)) {
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
  console.log(`Crawled ${items.length} items from Zamość:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
