// Busko-Zdrój crawler.
//
// Single host (umig.busko.pl) with a large mixed /ogloszenia feed. Both the
// active flat listings and the result PDFs live on the SAME announcement pages,
// so both crawls harvest auction-announcement links from a BOUNDED window of
// the most-recent feed pages (page cap + implicit wall-clock budget), then fetch
// each matched article.
//
// crawlActive():
//   Harvest → fetch each announcement page → parseAnnouncementListings →
//   flat listing records. Returns { listings, wykaz: [] }.
//
// crawlResultDocs():
//   Harvest → fetch each announcement page → parseResultLink; if a result PDF
//   ("Informacja o wynikach przetargu") is linked, fetch its text (pdfText,
//   born-digital) → { text, date, url }. parseResultDoc extracts flat outcomes.
//
// See config.js + spikes/swietokrzyskie/powiat-buski/busko-zdroj.md.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseIndexPage, parseAnnouncementListings, parseResultLink } from './parse.js';

const FEED_BASE = 'https://www.umig.busko.pl/ogloszenia.html';
const PAGE_SIZE = 10;           // Joomla feed: 10 items/page
const MAX_PAGES = 30;           // ~300 most-recent feed items (bounded)

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// Shared: harvest auction-announcement links across the bounded feed window
// ---------------------------------------------------------------------------

async function harvestAnnouncementLinks() {
  const links = [];
  const seen = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = page === 0 ? FEED_BASE : `${FEED_BASE}?start=${page * PAGE_SIZE}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/\b404\b/.test(err.message)) break; // past last page — normal
      console.error(`  busko-zdroj: feed page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }

    const matches = parseIndexPage(html);
    for (const it of matches) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      links.push(it);
    }
  }

  console.error(`  busko-zdroj: harvested ${links.length} auction-announcement link(s) from ${MAX_PAGES} feed pages`);
  return links;
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

export async function crawlActive() {
  const links = await harvestAnnouncementLinks();
  const listings = [];

  for (const link of links) {
    let html;
    try {
      html = await getText(link.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  busko-zdroj: announcement fetch failed (${link.url}): ${err.message}`);
      continue;
    }
    const flats = parseAnnouncementListings(html, link.url);
    for (const f of flats) listings.push(f);
  }

  console.error(`  busko-zdroj crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  const links = await harvestAnnouncementLinks();
  const resultDocs = [];

  for (const link of links) {
    let html;
    try {
      html = await getText(link.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  busko-zdroj: announcement fetch failed (${link.url}): ${err.message}`);
      continue;
    }

    const { resultPdf, publishedDate } = parseResultLink(html);
    if (!resultPdf) continue;

    let text;
    try {
      text = await pdfText(resultPdf, FETCH_OPTS);
    } catch (err) {
      console.error(`  busko-zdroj: result PDF text failed (${resultPdf}): ${err.message}`);
      continue;
    }

    resultDocs.push({ text, date: publishedDate, url: resultPdf });
    console.error(`  busko-zdroj: found result doc "${link.title.slice(0, 60)}"`);
  }

  console.error(`  busko-zdroj crawlResultDocs: ${resultDocs.length} result doc(s)`);
  return resultDocs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
