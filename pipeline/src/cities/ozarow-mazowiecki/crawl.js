// Ożarów Mazowiecki crawler.
// Fetches the primary WordPress board (ozarow-mazowiecki.pl/nieruchomosci-przeznaczone-do-zbycia/)
// and category archive. For each announcement post, downloads the born-digital
// "Załącznik nr 1 - Ogłoszenie o przetargu" PDF attachment and extracts its text via pdfText().
//
// crawlActive(): returns { listings, wykaz: [], land, valid_empty, valid_empty_land }
// crawlResultDocs(): returns [] (stub, achieved-price stream not confirmed)

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseIndexPage, findAnnouncementPdfUrl, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://ozarow-mazowiecki.pl';
const BOARD_URL = `${ORIGIN}/nieruchomosci-przeznaczone-do-zbycia/`;
const CATEGORY_URL = `${ORIGIN}/category/nieruchomosci-przeznaczone-do-zbycia/`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];

  const candidates = [];
  const seenUrls = new Set();

  // 1. Fetch main board
  try {
    const boardHtml = await getText(BOARD_URL, FETCH_OPTS);
    for (const item of parseIndexPage(boardHtml)) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        candidates.push(item);
      }
    }
  } catch (err) {
    console.error(`  ozarow-mazowiecki: board fetch failed (${BOARD_URL}): ${err.message}`);
  }

  // 2. Fetch category archive (page 1) to catch any additional posts
  try {
    const catHtml = await getText(CATEGORY_URL, FETCH_OPTS);
    for (const item of parseIndexPage(catHtml)) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        candidates.push(item);
      }
    }
  } catch (err) {
    // category page may fail or 404, not fatal
  }

  console.error(`  ozarow-mazowiecki: ${candidates.length} candidate post(s) found`);

  // 3. Process each post
  for (const c of candidates) {
    let postHtml;
    try {
      postHtml = await getText(c.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  ozarow-mazowiecki: post fetch failed (${c.url}): ${err.message}`);
      continue;
    }

    const pdfUrl = findAnnouncementPdfUrl(postHtml, c.url);
    let pdfContent = '';
    if (pdfUrl) {
      try {
        pdfContent = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  ozarow-mazowiecki: pdfText failed (${pdfUrl}): ${err.message}`);
      }
    }

    const recs = parseAnnouncement(postHtml, pdfContent, c.url);
    for (const r of recs) {
      if (r.kind === 'grunt') {
        land.push(r);
      } else {
        listings.push(r);
      }
    }
  }

  console.error(`  ozarow-mazowiecki: ${listings.length} flat/property listing(s), ${land.length} land plot(s)`);

  return {
    listings,
    wykaz: [],
    land,
    valid_empty: false,
    valid_empty_land: false,
  };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  return crawlPromise;
}

export async function crawlResultDocs() {
  return [];
}
