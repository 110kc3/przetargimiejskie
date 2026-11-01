// Brzesko crawler — www.brzesko.pl
//
// Crawls https://www.brzesko.pl/blog/5,ogloszenia-nieruchomosci for announcements and results.

import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { extractArticleLinks, parseAnnouncementNotice, parseResultDoc } from './parse.js';

const ORIGIN = 'https://www.brzesko.pl';
const BOARD_URL = `${ORIGIN}/blog/5,ogloszenia-nieruchomosci`;
const MAX_PAGES = Number(process.env.BRZESKO_MAX_PAGES) || 6;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const FETCH_OPTS = {
  userAgent: BROWSER_UA,
};

async function getArticleList() {
  const articles = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? BOARD_URL : `${BOARD_URL}/strona/${page}`;
    try {
      const html = await getText(pageUrl, FETCH_OPTS);
      if (!html) break;
      const links = extractArticleLinks(html, ORIGIN);
      let newCount = 0;
      for (const l of links) {
        if (!seenUrls.has(l.url)) {
          seenUrls.add(l.url);
          articles.push(l);
          newCount++;
        }
      }
      if (newCount === 0) break;
    } catch (err) {
      console.error(`  brzesko: error fetching page ${pageUrl}: ${err.message}`);
      break;
    }
  }

  return articles;
}

export async function crawlActive() {
  const articles = await getArticleList();
  const listings = [];
  const wykaz = [];
  const land = [];

  for (const art of articles) {
    try {
      const html = await getText(art.url, FETCH_OPTS);
      if (!html) continue;
      const parsed = parseAnnouncementNotice({ url: art.url, title: art.title, html });
      if (!parsed) continue;

      if (parsed.type === 'property') {
        listings.push(parsed.data);
      } else if (parsed.type === 'land') {
        land.push(parsed.data);
      }
    } catch (err) {
      console.error(`  brzesko: error parsing ${art.url}: ${err.message}`);
    }
  }

  return {
    listings,
    wykaz,
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlResultDocs() {
  const articles = await getArticleList();
  const knownUrls = await loadKnownSourceUrls('brzesko');
  const results = [];

  for (const art of articles) {
    if (knownUrls.has(art.url)) continue;
    try {
      const html = await getText(art.url, FETCH_OPTS);
      if (!html) continue;
      const resRecords = parseResultDoc({ url: art.url, title: art.title, text: html });
      if (resRecords && resRecords.length > 0) {
        results.push({
          url: art.url,
          title: art.title,
          text: html,
          records: resRecords,
        });
      }
    } catch (err) {
      console.error(`  brzesko: error processing results for ${art.url}: ${err.message}`);
    }
  }

  return results;
}
