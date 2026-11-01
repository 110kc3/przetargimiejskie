// Crawler for Nowy Dwór Mazowiecki (bip.nowydwormaz.pl)
//
// Fetches board 1368,przetargi-nieruchomosci and extracts PDFs.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.nowydwormaz.pl';
const BOARD_URL = `${ORIGIN}/1368,przetargi-nieruchomosci`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = {
  userAgent: UA,
  headers: {
    'Cookie': '_cp=%7B%22_cb%22%3A%22%22%2C%22_fp%22%3A%224d4aaa%22%2C%22_lu%22%3A1793400837%7D',
  },
};

export async function crawlActive() {
  let html = '';
  try {
    html = await getText(BOARD_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`[nowy-dwor-mazowiecki] board fetch failed:`, err.message);
    return [];
  }

  // Parse items from the board
  // Look for: <div class="system_anchor obiekt obiekt_pliki" id="pliki_3282"><h2 class="predef">...</h2>...<a href="plik,6920,..."
  const itemRegex = /<h2\s+class=\"predef\">([\s\S]*?)<\/h2>[\s\S]*?<a\s+[^>]*href=\"(plik,[^\"]+\.pdf)\"[^>]*>/gi;
  const matches = [...html.matchAll(itemRegex)];

  const results = [];
  for (const m of matches) {
    const rawTitle = m[1].replace(/<[^>]+>/g, '').trim();
    const pdfRel = m[2];
    const pdfUrl = `${ORIGIN}/${pdfRel}`;
    const idMatch = pdfRel.match(/plik,(\d+),/i);
    const id = idMatch ? idMatch[1] : `doc-${Date.now()}`;

    let docText = '';
    try {
      docText = await pdfText(pdfUrl, FETCH_OPTS);
    } catch (err) {
      console.warn(`[nowy-dwor-mazowiecki] pdfText failed for ${pdfUrl}:`, err.message);
    }

    const item = {
      id,
      title: rawTitle,
      url: pdfUrl,
    };

    if (isAnnouncementTitle(rawTitle) || /przetarg/i.test(rawTitle)) {
      results.push(parseAnnouncement(item, docText));
    }
    if (isResultTitle(rawTitle) || /informacja o wyniku/i.test(docText)) {
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
