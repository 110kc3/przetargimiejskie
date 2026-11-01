// Crawler for Radzyń Podlaski (umradzynpodlaski.bip.lubelskie.pl)
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

const ORIGIN = 'https://umradzynpodlaski.bip.lubelskie.pl';
const YEARLY_MENU_IDS = ['1914', '1766', '1506'];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

async function fetchAjaxRecords(menuId) {
  const url = `${ORIGIN}/index.php?id=${menuId}&action=list-ajax`;
  try {
    const raw = await getText(url, FETCH_OPTS);
    const data = JSON.parse(raw);
    return Array.isArray(data.aaData) ? data.aaData : [];
  } catch (err) {
    console.warn(`[radzyn-podlaski] list-ajax failed for menu ${menuId}:`, err.message);
    return [];
  }
}

export async function crawlActive() {
  const records = [];
  for (const menuId of YEARLY_MENU_IDS) {
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
    const detailUrl = `${ORIGIN}/index.php?id=${rec.id_menu || '1914'}&action=details&document_id=${docId}`;

    let pdfUrl = null;
    let docText = '';

    try {
      const detailHtml = await getText(detailUrl, FETCH_OPTS);
      const m = detailHtml.match(/href=[\"'](https:\/\/umradzynpodlaski\.bip\.lubelskie\.pl\/upload\/pliki\/[^\"]+\.pdf)[^\"']*[\"']/i);
      if (m) {
        pdfUrl = m[1];
        docText = await pdfText(pdfUrl, FETCH_OPTS);
      }
    } catch (err) {
      console.warn(`[radzyn-podlaski] failed processing doc ${docId}:`, err.message);
    }

    const item = {
      ...rec,
      id: docId,
      title,
      url: pdfUrl || detailUrl,
    };

    if (isAnnouncementTitle(title) || isAnnouncementTitle(docText)) {
      results.push(parseAnnouncement(item, docText));
    }
    if (isResultTitle(title) || isResultTitle(docText)) {
      results.push(parseResultDocFn(item, docText));
    }
  }

  return results;
}

export async function crawlResultDocs() {
  return [];
}

export function parseResultDoc(doc) {
  return parseResultDocFn(doc, doc.text || '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
