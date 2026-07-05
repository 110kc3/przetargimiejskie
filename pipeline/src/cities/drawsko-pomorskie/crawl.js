// Drawsko Pomorskie crawler.
//
// Single source: drawsko.pl/aktualnosci-2/33-nieruchomosci/ — a paginated news
// board (/strona-N/, ~12 items/page, ~33 pages). One shared pass:
//   1. Walk board pages (bounded), harvest in-section article links.
//   2. Keep flat articles: announcements (przetarg ustny) + results
//      (informacja o wyniku); skip land, wykaz, dzierżawa, odwołania.
//   3. Fetch each article, pull JSON-LD articleBody, then:
//        announcement → parseAnnouncement → active listing
//        result       → carry decoded body as a result ref
//
// 403 NOTE: the board 403s the default bot UA. A browser UA (verified: OR a
// Referer) defeats it, so every fetch reuses core/fetch.js getText with
// BROWSER_UA (getText's userAgent path sends a full browser header set). No
// custom Referer fetch is needed — reuse over reimplementation.
//
// source:'html' — result refs carry `.text` (decoded articleBody); refresh.js
// reads ref.text directly and calls parseResultDoc(text, ref.auction_date,
// ref.pdf_url). No OCR/PDF.

import { getText } from '../../core/fetch.js';
import {
  extractArticleBody,
  parseListingLinks,
  parseAnnouncement,
  parseResultDoc,
  isFlatSlug,
  isResultSlug,
  isAnnouncementSlug,
} from './parse.js';

const ORIGIN = 'https://drawsko.pl';
const SECTION = '/aktualnosci-2/33-nieruchomosci/';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Bounds so the 25-min CI job can't stall on the archive.
const MAX_PAGES = 40;             // > the ~33 real pages
const WALL_CLOCK_BUDGET_MS = 12 * 60 * 1000;

function pageUrl(n) {
  return n === 1 ? `${ORIGIN}${SECTION}` : `${ORIGIN}${SECTION}strona-${n}/`;
}

// Walk board pages and collect unique flat-article links.
async function collectFlatArticles() {
  const started = Date.now();
  const byUrl = new Map(); // url -> slug
  for (let n = 1; n <= MAX_PAGES; n++) {
    if (Date.now() - started > WALL_CLOCK_BUDGET_MS) {
      console.error('  drawsko-pomorskie: page budget reached, stopping pagination');
      break;
    }
    let html;
    try {
      html = await getText(pageUrl(n), FETCH_OPTS);
    } catch (err) {
      console.error(`  drawsko-pomorskie: board page ${n} fetch failed: ${err.message}`);
      break;
    }
    const links = parseListingLinks(html, ORIGIN);
    if (links.length === 0) break; // past the last page
    let added = 0;
    for (const l of links) {
      if (byUrl.has(l.url)) continue;
      if (!isFlatSlug(l.slug)) continue;
      if (!isAnnouncementSlug(l.slug) && !isResultSlug(l.slug)) continue;
      byUrl.set(l.url, l.slug);
      added++;
    }
    // Board pages carry the full pagination nav, so once a fetched page yields
    // no NEW article links at all we've run out of fresh content — stop.
    if (n > 1 && added === 0 && !links.some((l) => !byUrl.has(l.url))) break;
  }
  return byUrl;
}

// One shared crawl pass, memoised across crawlActive + crawlResultDocs.
async function crawlAll() {
  const articles = await collectFlatArticles();
  console.error(`  drawsko-pomorskie: ${articles.size} flat article(s) to fetch`);

  const listings = [];
  const resultRefs = [];

  for (const [url, slug] of articles) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  drawsko-pomorskie: article fetch failed (${slug}): ${err.message}`);
      continue;
    }
    const art = extractArticleBody(html);
    if (!art || !art.body) {
      console.error(`  drawsko-pomorskie: no articleBody on ${slug}`);
      continue;
    }

    if (isResultSlug(slug)) {
      resultRefs.push({ text: art.body, auction_date: art.datePublished, pdf_url: url });
    } else {
      const rec = parseAnnouncement(art.body, art.headline, url);
      if (rec) listings.push(rec);
      else console.error(`  drawsko-pomorskie WARN: could not parse announcement ${slug}`);
    }
  }

  console.error(
    `  drawsko-pomorskie: ${listings.length} active listing(s), ${resultRefs.length} result ref(s)`,
  );
  return { listings, resultRefs };
}

let crawlPromise = null;

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

/**
 * Result-notice refs for the achieved-price stream. Each ref carries the decoded
 * article text; refresh.js calls parseResultDoc(ref.text, ref.auction_date,
 * ref.pdf_url).
 * @returns {Promise<Array<{ text: string, auction_date: string|null, pdf_url: string }>>}
 */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

// Re-export so refresh.js / the registry can reach the pure parser.
export { parseResultDoc };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
