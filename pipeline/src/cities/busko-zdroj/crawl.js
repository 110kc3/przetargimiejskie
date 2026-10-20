// Busko-Zdrój crawler.
//
// Single host (umig.busko.pl) with a large mixed /ogloszenia feed. Both the
// flat/land listings and result PDFs share announcement pages. One memoized
// crawl walks the visible feed's published pager, bounded to 60 pages, and
// reads each matched article once. PDF-only announcements use text extraction.
//
// crawlActive():
//   Harvest → fetch each announcement page → parseAnnouncementListings →
//   supported flat/land records. Returns { listings, land, wykaz: [] }.
//
// crawlResultDocs():
//   Harvest → fetch each announcement page → parseResultLink; if a result PDF
//   ("Informacja o wynikach przetargu") is linked, fetch its text (pdfText,
//   born-digital) → { text, pdf_url, auction_date }. parseResultDoc extracts
//   supported flat/land outcomes; missing items keep the stream incomplete.
//
// See config.js + spikes/swietokrzyskie/powiat-buski/busko-zdroj.md.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseIndexPage, parseAnnouncementListings, parseLandAnnouncementListings, parseResultLink, parseResultDoc } from './parse.js';

const FEED_BASE = 'https://www.umig.busko.pl/ogloszenia.html';
const PAGE_SIZE = 10;           // Joomla feed: 10 items/page
const MAX_PAGES = 60;           // 42 linked pages observed; capped if the source grows

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// Shared: harvest auction-announcement links across the bounded feed window
// ---------------------------------------------------------------------------

export async function harvestAnnouncementLinks({ fetchText = getText, maxPages = MAX_PAGES } = {}) {
  const links = [];
  links.complete = false;
  const seen = new Set();
  const pagesSeen = new Set();

  for (let page = 0; page < maxPages; page++) {
    const url = page === 0 ? FEED_BASE : `${FEED_BASE}?start=${page * PAGE_SIZE}`;
    let html;
    try {
      html = await fetchText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  busko-zdroj: feed page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }

    if (!html.includes('com-content-category-blog')) break;
    const currentPage = /<a\b(?=[^>]*aria-current="true")[^>]*>\s*(\d+)\s*<\/a>/i.exec(html);
    if (Number(currentPage?.[1]) !== page + 1) break;
    const paths = [...new Set([...html.matchAll(/href="(\/ogloszenia\/\d+-[^"<>]+\.html)"/g)].map(m => m[1]))].sort();
    const fingerprint = paths.join('\n');
    if (!paths.length || pagesSeen.has(fingerprint)) break;
    pagesSeen.add(fingerprint);

    const matches = parseIndexPage(html);
    for (const it of matches) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      links.push(it);
    }
    const offsets = [...html.matchAll(/href="\/ogloszenia\.html\?start=(\d+)"/g)].map(m => Number(m[1]));
    if (!offsets.some(offset => offset > page * PAGE_SIZE)) { links.complete = true; break; }
    if (!offsets.includes((page + 1) * PAGE_SIZE)) break;
  }

  console.error(`  busko-zdroj: harvested ${links.length} auction-announcement link(s) from ${pagesSeen.size} feed pages; complete=${links.complete}`);
  return links;
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

export async function crawlAll({ fetchText = getText, extractText = pdfText, maxPages = MAX_PAGES } = {}) {
  const links = await harvestAnnouncementLinks({ fetchText, maxPages });
  const listings = [];
  const land = [];
  const resultDocs = [];
  let complete = links.complete;

  for (const link of links) {
    let html;
    try {
      html = await fetchText(link.url, FETCH_OPTS);
    } catch (err) {
      complete = false;
      console.error(`  busko-zdroj: announcement fetch failed (${link.url}): ${err.message}`);
      continue;
    }
    const flats = parseAnnouncementListings(html, link.url);
    for (const f of flats) listings.push(f);
    let plots = parseLandAnnouncementListings(html, link.url);
    const { resultPdf, announcementPdf } = parseResultLink(html);
    if (!flats.length && !plots.length && announcementPdf) {
      try { plots = parseLandAnnouncementListings(await extractText(announcementPdf, FETCH_OPTS), link.url, announcementPdf); }
      catch (err) { complete = false; console.error(`  busko-zdroj: announcement PDF failed (${announcementPdf}): ${err.message}`); }
    }
    land.push(...plots);
    if (!flats.length && !plots.length) complete = false;
    if (!resultPdf) continue;

    let text;
    try {
      text = await extractText(resultPdf, FETCH_OPTS);
    } catch (err) {
      complete = false;
      console.error(`  busko-zdroj: result PDF text failed (${resultPdf}): ${err.message}`);
      continue;
    }

    const parsed = parseResultDoc(text, null, resultPdf);
    const clauses = [...text.matchAll(/(?:^|\n)\s*\d+\.\s+\w+\s+przetarg\s+ustny\s+nieograniczony/gi)];
    if (!parsed.length || parsed.some(record => !record.auction_date)
      || (clauses.length && parsed.length !== clauses.length)) complete = false;
    resultDocs.push({ text, pdf_url: resultPdf, detail_url: link.url, auction_date: null });
    console.error(`  busko-zdroj: found result doc "${link.title.slice(0, 60)}"`);
  }

  resultDocs.complete = complete;
  console.error(`  busko-zdroj: ${listings.length} flat listing(s), ${land.length} land plot(s), ${resultDocs.length} result doc(s); complete=${complete}`);
  return { listings, land, resultDocs, land_complete: false };
}

let crawlPromise;
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, land, wykaz: [], land_complete: false };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultDocs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
