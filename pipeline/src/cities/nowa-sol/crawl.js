
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseIndexPage, parseDetailPage } from './parse.js';

const INDEX_BASE = 'https://nowasol.pl/przetargi';
const MAX_PAGES = 10;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };


export async function crawlActive() {
  const allLinks = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? INDEX_BASE : `${INDEX_BASE}/page/${page}`;
    let indexHtml;
    try {
      indexHtml = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/\b404\b/.test(err.message)) break;
      console.error(`  nowa-sol: index page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }

    const links = parseIndexPage(indexHtml);
    if (links.length === 0) break;

    let newOnPage = 0;
    for (const link of links) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);
      allLinks.push(link);
      newOnPage++;
    }
    if (newOnPage === 0) break;
  }

  console.error(`  nowa-sol crawlActive: ${allLinks.length} flat listing link(s) across all pages`);

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


export async function crawlResultDocs() {
  console.error('  nowa-sol crawlResultDocs: stub — result stream not yet confirmed');
  return [];
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
