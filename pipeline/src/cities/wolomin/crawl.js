import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://wolomin.bip.net.pl';
const SEARCH_URLS = [
  `${ORIGIN}/?p=search&searchstr=przetarg+nieruchomo%C5%9Bci&sortby=moddatedesc`,
  `${ORIGIN}/?p=search&searchstr=przetarg+ustny&sortby=moddatedesc`,
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const seenArticleIds = new Set();
  const articleList = [];

  for (const sUrl of SEARCH_URLS) {
    try {
      const html = await getText(sUrl, FETCH_OPTS);
      const matches = [...html.matchAll(/<a\s+href=[\"']\?a=([0-9]+)[\"']\s+class=[\"']search_title[\"']>([\s\S]*?)<\/a>/gis)];
      for (const m of matches) {
        const id = m[1];
        const title = m[2].replace(/<[^>]+>/g, '').trim();
        if (!seenArticleIds.has(id)) {
          seenArticleIds.add(id);
          articleList.push({ id, title, url: `${ORIGIN}/?a=${id}` });
        }
      }
    } catch (err) {
      console.warn(`[wolomin] search failed for ${sUrl}:`, err.message);
    }
  }

  const results = [];
  for (const art of articleList) {
    try {
      const artHtml = await getText(art.url, FETCH_OPTS);

      const attMatches = [...artHtml.matchAll(/href=[\"'](\?p=document&amp;action=save&amp;id=(\d+)&amp;bar_id=(\d+))[\"']/gi)];

      if (attMatches.length > 0) {
        for (const m of attMatches) {
          const docId = m[2];
          const barId = m[3];
          const pdfUrl = `${ORIGIN}/?p=document&action=save&id=${docId}&bar_id=${barId}`;

          let docText = '';
          try {
            docText = await pdfText(pdfUrl, FETCH_OPTS);
          } catch (err) {
            console.warn(`[wolomin] pdfText failed for ${pdfUrl}:`, err.message);
          }

          const item = {
            id: `${art.id}-${docId}`,
            title: art.title,
            url: pdfUrl,
          };

          if (isAnnouncementTitle(art.title) || isAnnouncementTitle(docText)) {
            results.push(parseAnnouncement(item, docText));
          }
          if (isResultTitle(art.title) || isResultTitle(docText)) {
            results.push(parseResultDocFn(item, docText));
          }
        }
      } else {
        if (isAnnouncementTitle(art.title)) {
          results.push(parseAnnouncement(art, artHtml));
        }
        if (isResultTitle(art.title)) {
          results.push(parseResultDocFn(art, artHtml));
        }
      }
    } catch (err) {
      console.warn(`[wolomin] failed processing article ${art.id}:`, err.message);
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
