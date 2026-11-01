// Ełk crawler — www.elk.pl
//
// Walks paginated HTML category 139:
// https://www.elk.pl/aktualnosci-kategorie/139/invest-sprzedaz-nieruchomosci-tryb-przetargowy

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  cleanText,
  isAnnouncement,
  isResult,
  isFlat,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://www.elk.pl';
const CATEGORY_BASE = `${ORIGIN}/aktualnosci-kategorie/139/invest-sprzedaz-nieruchomosci-tryb-przetargowy`;
const MAX_PAGES = 10;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

function pageUrl(page) {
  if (page === 1) return CATEGORY_BASE;
  return `${CATEGORY_BASE}/${page}`;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  let allParsed = true;
  const seenArticleUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const listUrl = pageUrl(page);
    let html;
    try {
      html = await getText(listUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  elk: failed to fetch page ${listUrl}: ${err.message}`);
      allParsed = false;
      break;
    }

    // Match links to articles: href="/aktualnosci-wpis/ID/slug"
    const linkRe = /href="(\/aktualnosci-wpis\/\d+\/[^"]+)"/gi;
    let m;
    const articlePaths = [];
    while ((m = linkRe.exec(html)) !== null) {
      const p = m[1];
      if (!seenArticleUrls.has(p)) {
        seenArticleUrls.add(p);
        articlePaths.push(p);
      }
    }

    if (!articlePaths.length) break;
    console.error(`  elk: page ${page} has ${articlePaths.length} articles`);

    for (const p of articlePaths) {
      const artUrl = `${ORIGIN}${p}`;
      let artHtml;
      try {
        artHtml = await getText(artUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  elk: failed to fetch ${artUrl}: ${err.message}`);
        allParsed = false;
        continue;
      }

      // Title
      const mTitle = artHtml.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
      const title = cleanText(mTitle ? mTitle[1] : '');

      // Content inside regular-content or article
      const mContent = artHtml.match(/<div[^>]*class="[^"]*regular-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const text = cleanText(mContent ? mContent[1] : artHtml);

      if (isResult(title)) {
        resultRefs.push({
          text,
          pdf_url: artUrl,
          title,
          auction_date: null,
        });
      } else if (isAnnouncement(title)) {
        const rec = parseAnnouncement(text, title, artUrl);
        if (rec && rec.price) {
          if (isFlat(title, text)) {
            listings.push(rec);
          } else {
            land.push(rec);
          }
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeListings = listings.filter((l) => !l.auction_date || l.auction_date >= today);
  const activeLand = land.filter((l) => !l.auction_date || l.auction_date >= today);

  console.error(
    `  elk: ${activeListings.length} active flat listing(s), ${activeLand.length} active land, ` +
    `${resultRefs.length} result doc(s)`,
  );

  return {
    listings: activeListings,
    land: activeLand,
    resultRefs,
    valid_empty: allParsed && activeListings.length === 0,
    valid_empty_land: allParsed && activeLand.length === 0,
  };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const res = await crawlPromise;
  return {
    listings: res.listings,
    wykaz: [],
    land: res.land,
    valid_empty: res.valid_empty,
    valid_empty_land: res.valid_empty_land,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const res = await crawlPromise;
  return res.resultRefs;
}

export function parseResultDoc(ref) {
  return parseResultDocFn(ref);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sample: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
