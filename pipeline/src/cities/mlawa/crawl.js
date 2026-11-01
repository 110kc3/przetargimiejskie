// Crawler for Mława (bip.mlawa.pl)
//
// Fetches notices from Drupal BIP search and ogloszenia feeds.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.mlawa.pl';
const SEARCH_URLS = [
  `${ORIGIN}/search/node?keys=przetarg+nieruchomo%C5%9Bci`,
  `${ORIGIN}/search/node?keys=%22przetarg+ustny%22`,
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const seenUrls = new Set();
  const noticeUrls = [];

  for (const sUrl of SEARCH_URLS) {
    try {
      const html = await getText(sUrl, FETCH_OPTS);
      const matches = [...html.matchAll(/<h3[^>]*>\s*<a\s+href=[\"']([^\"']+)[\"'][^>]*>(.*?)<\/a>/gis)];
      for (const m of matches) {
        const fullUrl = m[1].startsWith('http') ? m[1] : `${ORIGIN}${m[1]}`;
        const title = m[2].replace(/<[^>]+>/g, '').trim();
        if (!seenUrls.has(fullUrl) && /przetarg/i.test(title)) {
          seenUrls.add(fullUrl);
          noticeUrls.push({ url: fullUrl, title });
        }
      }
    } catch (err) {
      console.warn(`[mlawa] search failed for ${sUrl}:`, err.message);
    }
  }

  const results = [];
  for (const notice of noticeUrls) {
    try {
      const html = await getText(notice.url, FETCH_OPTS);
      const idMatch = notice.url.match(/\/([^\/?#]+)$/);
      const id = idMatch ? idMatch[1] : `doc-${Date.now()}`;

      // Extract body text
      const bodyMatch = html.match(/class=\"[^\"]*field--name-body[^\"]*\">([\s\S]*?)<\/div>/i);
      let bodyText = bodyMatch ? bodyMatch[1] : html;

      // Check for attached PDFs
      const pdfMatches = [...html.matchAll(/href=[\"'](https:\/\/bip\.mlawa\.pl\/sites\/default\/files\/[^\"]+\.pdf)[^\"']*[\"']/gi)];
      let attachmentText = '';
      for (const pm of pdfMatches) {
        try {
          const pt = await pdfText(pm[1], FETCH_OPTS);
          attachmentText += ` ${pt}`;
        } catch (err) {
          console.warn(`[mlawa] pdfText failed for ${pm[1]}:`, err.message);
        }
      }

      const combinedText = `${bodyText} ${attachmentText}`;
      const item = {
        id,
        title: notice.title,
        url: notice.url,
      };

      if (isAnnouncementTitle(notice.title) || isAnnouncementTitle(combinedText)) {
        results.push(parseAnnouncement(item, combinedText));
      }
      if (isResultTitle(notice.title) || isResultTitle(combinedText)) {
        results.push(parseResultDocFn(item, combinedText));
      }
    } catch (err) {
      console.warn(`[mlawa] failed processing notice ${notice.url}:`, err.message);
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
