// Crawler for Pruszcz Gdański (bip.pruszcz-gdanski.pl)
//
// Fetches structured XML per auction using intermediate certificate chain.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip.pruszcz-gdanski.pl';
const BOARD_URLS = [
  `${BASE_URL}/przetargi-nieruchomosci/510`,
  `${BASE_URL}/przetargi-nieruchomosci/510/2`,
];

const FETCH_OPTS = { insecureTLS: true };

export async function crawlActive() {
  const seenIds = new Set();
  const auctionIds = [];

  for (const boardUrl of BOARD_URLS) {
    try {
      const html = await getText(boardUrl, FETCH_OPTS);
      if (!html) continue;

      const idMatches = [...html.matchAll(/href="[^"]*przetarg-nieruchomosci\/([0-9]+)\/([^"]+)"/gi)];
      for (const m of idMatches) {
        const id = m[1];
        if (!seenIds.has(id)) {
          seenIds.add(id);
          auctionIds.push(id);
        }
      }
    } catch (err) {
      console.error(`[pruszcz-gdanski] crawl board failed: ${boardUrl}`, err.message);
    }
  }

  const results = [];
  for (const id of auctionIds) {
    const xmlUrl = `${BASE_URL}/przetarg-nieruchomosci/xml/${id}/1`;
    try {
      const xml = await getText(xmlUrl, FETCH_OPTS);
      if (xml && xml.includes('<artykul>')) {
        const parsed = parseAnnouncement({ id }, xml);
        results.push(parsed);

        if (parsed.resultRaw && (isResultTitle(parsed.title) || /wynik|rozstrzygn/i.test(parsed.resultRaw))) {
          results.push(parseResultDocFn({ id, url: parsed.url, title: parsed.title }, parsed.resultRaw));
        }
      }
    } catch (err) {
      console.error(`[pruszcz-gdanski] failed to fetch xml for ${id}:`, err.message);
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
