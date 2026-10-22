// Łęczyca crawler — harvests municipal property auction notices from
// the WordPress REST API at leczyca.info.pl/wp-json/wp/v2/posts.
//
// Both crawlActive() and crawlResultDocs() are served by a single memoised
// pass (crawlAll) to respect rate limits and keep refresh runtime fast.

import { getText } from '../../core/fetch.js';
import { parsePost, decodeEntities } from './parse.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const QUERY_URLS = [
  'https://leczyca.info.pl/wp-json/wp/v2/posts?search=przetarg+ustny+nieograniczony&per_page=100',
  'https://leczyca.info.pl/wp-json/wp/v2/posts?search=przetarg&per_page=100&page=1',
  'https://leczyca.info.pl/wp-json/wp/v2/posts?search=przetarg&per_page=100&page=2',
  'https://leczyca.info.pl/wp-json/wp/v2/posts?search=przetarg&per_page=100&page=3',
  'https://leczyca.info.pl/wp-json/wp/v2/posts?search=lokalowe+na+sprzeda%C5%BC&per_page=100',
  'https://leczyca.info.pl/wp-json/wp/v2/posts?categories=58&per_page=100',
];

let crawlPromise = null;

async function crawlAll() {
  const postsMap = new Map();

  for (const url of QUERY_URLS) {
    try {
      const raw = await getText(url, FETCH_OPTS);
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.id) {
            postsMap.set(item.id, item);
          }
        }
      }
    } catch (err) {
      if (!/\b404\b/.test(err.message)) {
        console.error(`  leczyca crawl warning (${url}): ${err.message}`);
      }
    }
  }

  console.error(`  leczyca: ${postsMap.size} unique post(s) harvested from WordPress REST API`);

  const listings = [];
  const land = [];
  const resultRefs = [];

  for (const [, post] of postsMap) {
    // Check if post is a result notice
    const title = post.title?.rendered || '';
    const bodyHtml = post.content?.rendered || '';
    const bodyText = decodeEntities(bodyHtml);

    if (/o\s+wyniku|wynik\w*\s+przetarg|informacja\s+o\s+wynik/i.test(title)) {
      resultRefs.push({
        text: `${title}. ${bodyText}`,
        pdf_url: post.link,
        detail_url: post.link,
        auction_date: null,
      });
      continue;
    }

    const { listings: postListings, land: postLand } = parsePost(post);
    listings.push(...postListings);
    land.push(...postLand);
  }

  console.error(
    `  leczyca: ${listings.length} listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );

  return { listings, land, resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return {
    listings,
    wykaz: [],
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}
