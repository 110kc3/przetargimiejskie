// Nowa Sól crawler.
//
// crawlActive():
//   Fetches all pages of nowasol.pl/przetargi (paginated WordPress list,
//   standard pagination at /page/N).  For each flat-sale link found on the
//   index, fetches the individual detail page and parses the structured
//   <table>.  Returns { listings, wykaz: [] }.
//
//   The index page shows only the current/active list (there is no explicit
//   "archiwum" tab on the WordPress side), so all returned listings reflect
//   what is currently published.  Past-dated auctions are marked 'archived'
//   downstream by buildCityData's TODAY comparison.
//
// crawlResultDocs():
//   STUB — returns [].  The achieved-price stream via bip.nowasol.pl is not
//   yet confirmed (the BIP appears to be JS-gated and returned an empty body
//   on direct fetch during the spike on 2026-06-29).  Implement once
//   confirmed; see parse.js parseResultDoc for the plan.
//
// Volume: ~1–2 lokal mieszkalny announcements/month — very low traffic.

import { getText } from '../../core/fetch.js';
import { parseIndexPage, parseDetailPage } from './parse.js';

const INDEX_BASE = 'https://nowasol.pl/przetargi';
const MAX_PAGES = 10; // safety cap; observed ~3 pages total

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

/**
 * Crawl the paginated przetargi index and fetch each flat-sale detail page.
 * @returns {Promise<{ listings: Array, wykaz: Array }>}
 */
export async function crawlActive() {
  const allLinks = [];
  const seenUrls = new Set();

  // Paginate the index until no new flat-sale links appear or we hit MAX_PAGES.
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? INDEX_BASE : `${INDEX_BASE}/page/${page}`;
    let indexHtml;
    try {
      indexHtml = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/\b404\b/.test(err.message)) break; // past last page — normal
      console.error(`  nowa-sol: index page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }

    const links = parseIndexPage(indexHtml);
    if (links.length === 0) break; // no flat links on this page — stop

    let newOnPage = 0;
    for (const link of links) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);
      allLinks.push(link);
      newOnPage++;
    }
    if (newOnPage === 0) break; // all links already seen — stop paginating
  }

  console.error(`  nowa-sol crawlActive: ${allLinks.length} flat listing link(s) across all pages`);

  // Fetch each detail page and parse.
  const listings = [];
  for (const link of allLinks) {
    let detailHtml;
    try {
      detailHtml = await getText(link.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  nowa-sol: detail page fetch failed (${link.url}): ${err.message}`);
      continue;
    }
    const parsed = parseDetailPage(detailHtml, link.url);
    if (!parsed || !parsed.address) {
      console.error(`  nowa-sol: parse returned null/no address for ${link.url}`);
      continue;
    }
    listings.push(parsed);
  }

  console.error(`  nowa-sol crawlActive: ${listings.length} listing(s) parsed`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs — stub
// ---------------------------------------------------------------------------

/**
 * Fetch result / achieved-price documents.
 * STUB — returns [] until bip.nowasol.pl is confirmed accessible or result
 * notices appear as separate WordPress posts on the same /przetargi board.
 * @returns {Promise<Array>}
 */
export async function crawlResultDocs() {
  console.error('  nowa-sol crawlResultDocs: stub — result stream not yet confirmed');
  return [];
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
