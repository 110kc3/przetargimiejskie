// Crawler for Nowy Dwór Gdański (bip.miastonowydwor.pl)
//
// Fetches RSS feed and 2ClickPortal announcement pages.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const BASE_URL = 'https://bip.miastonowydwor.pl';
const RSS_URL = `${BASE_URL}/rss/aktualnosci_pl.xml`;
const PRZETARGI_URL = `${BASE_URL}/przetargi.html`;

export async function crawlActive() {
  const seenUrls = new Set();
  const articles = [];

  try {
    const rss = await getText(RSS_URL);
    if (rss) {
      const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
      for (const it of items) {
        const itemXml = it[1];
        const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const link = linkMatch ? linkMatch[1].trim() : '';
        const date = pubDateMatch ? pubDateMatch[1].trim() : '';

        if (link && !seenUrls.has(link) && (isAnnouncementTitle(title) || isResultTitle(title))) {
          seenUrls.add(link);
          articles.push({
            id: link.replace(/.*\/([^.]+)\.html/, '$1'),
            url: link,
            link,
            title,
            date,
          });
        }
      }
    }
  } catch (err) {
    console.error('[nowy-dwor-gdanski] RSS fetch failed:', err.message);
  }

  try {
    const html = await getText(PRZETARGI_URL);
    if (html) {
      const linkMatches = [...html.matchAll(/<a[^>]+href="(\/(?:aktualnosci|przetargi)\/([^"#?]+)\.html)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of linkMatches) {
        const url = `${BASE_URL}${m[1]}`;
        const slug = m[2];
        const rawTitle = m[3].replace(/<[^>]+>/g, '').trim();

        if (!seenUrls.has(url) && (isAnnouncementTitle(rawTitle) || isResultTitle(rawTitle))) {
          seenUrls.add(url);
          articles.push({
            id: slug,
            url,
            link: url,
            title: rawTitle,
          });
        }
      }
    }
  } catch (err) {
    console.error('[nowy-dwor-gdanski] przetargi.html fetch failed:', err.message);
  }

  const results = [];
  for (const item of articles) {
    const title = item.title;
    try {
      const detailHtml = await getText(item.url);
      const attachMatches = [...detailHtml.matchAll(/href="([^"]*\/files\/[^"]+\.pdf)"/gi)];

      let docText = detailHtml;
      for (const att of attachMatches) {
        const attachUrl = att[1].startsWith('http') ? att[1] : `${BASE_URL}${att[1]}`;
        try {
          const pdfTxt = await pdfText(attachUrl);
          if (pdfTxt && pdfTxt.trim().length > 50) {
            docText += `\n${pdfTxt}`;
          }
        } catch (_) {
          // rely on HTML
        }
      }

      if (isAnnouncementTitle(title)) {
        results.push(parseAnnouncement(item, docText));
      }
      if (isResultTitle(title) || /informacja o wyniku przetargu/i.test(docText)) {
        results.push(parseResultDocFn(item, docText));
      }
    } catch (err) {
      console.error(`[nowy-dwor-gdanski] failed to fetch item ${item.id}:`, err.message);
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
