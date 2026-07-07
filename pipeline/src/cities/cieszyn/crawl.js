// Cieszyn crawler — bip.um.cieszyn.pl, Logonet CMS 2.9.0.
//
// Two-phase crawl:
//
//   PHASE 1 (crawlActive):
//     Paginate /przetargi-nieruchomosci/{page}/15 until no more items.
//     Filter index rows to rodzaj = 'lokal mieszkalny' (flats only).
//     Fetch each flat's detail page to get: area, round, wynik_url, body text.
//     Result: { listings, wykaz:[], land:[] }
//
//   PHASE 2 (crawlResultDocs):
//     For each detail page that carries a wynik_url (result-notice link),
//     fetch the wynik article. If it returns a parseable body (it may have
//     expired and gone 404/redirect), record { text, detail_url, auction_date }.
//     source:'html' → refs carry .text; refresh.js passes to parseResultDoc
//     directly without OCR dispatch.
//
// The two phases share one memoised crawlAll() pass.
//
// NOTE: wynik articles expire ~30 days after auction. A wynik_url present on
// the detail page but returning 404/redirect is logged and silently skipped.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseIndexPage, parseDetailPage, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.um.cieszyn.pl';
const INDEX_URL = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/15`;
const MAX_PAGES = 30; // safety cap; ~21 pages today

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  const seenUrls = new Set();

  // Phase 1: paginate the index, filter for lokal mieszkalny
  const flatRefs = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(INDEX_URL(page));
    } catch (err) {
      console.error(`  cieszyn index page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseIndexPage(html);
    if (items.length === 0) break;

    let addedFlats = 0;
    for (const item of items) {
      if (seenUrls.has(item.detail_url)) continue;
      seenUrls.add(item.detail_url);
      // Filter: only flat (lokal mieszkalny) sale (przetarg na sprzedaż)
      if (!/lokal\s+mieszkaln/i.test(item.rodzaj)) continue;
      // Skip rentals / najem / dzierżawa in the title
      if (/najem|dzier[zż]aw/i.test(item.address_raw + ' ' + item.rodzaj)) continue;
      flatRefs.push(item);
      addedFlats++;
    }
    console.error(
      `  cieszyn index page ${page}: ${items.length} item(s), ${addedFlats} new flat(s)`,
    );
    // If the page returned fewer items than the page size, we've reached the last page
    if (items.length < 15) break;
  }

  console.error(`  cieszyn: ${flatRefs.length} flat ref(s) to detail-fetch`);

  // Phase 2: fetch each detail page
  for (const ref of flatRefs) {
    let html;
    try {
      html = await getText(ref.detail_url);
    } catch (err) {
      console.error(`  cieszyn detail fetch failed (${ref.detail_url}): ${err.message}`);
      continue;
    }

    const parsed = parseDetailPage(html, ref.detail_url);
    if (!parsed || !parsed.listing) {
      console.error(`  cieszyn: parse failed or non-flat at ${ref.detail_url}`);
      continue;
    }

    const listing = parsed.listing;
    // Merge index-level data as fallback for missing detail fields
    if (!listing.starting_price_pln && ref.starting_price_pln) {
      listing.starting_price_pln = ref.starting_price_pln;
    }
    if (!listing.auction_date && ref.auction_date) {
      listing.auction_date = ref.auction_date;
    }
    listings.push(listing);

    // Phase 3: fetch wynik article if linked
    const wynikUrl = listing.wynik_url;
    if (!wynikUrl) continue;
    let wynikHtml;
    try {
      wynikHtml = await getText(wynikUrl);
    } catch (err) {
      console.error(`  cieszyn wynik fetch failed (${wynikUrl}): ${err.message}`);
      continue;
    }
    // Check if the article returned a real result page (not "Problem z wyświetleniem")
    if (/Problem\s+z\s+wy[sś]wietleniem|b[łl][aą]d\s*[-–]\s*4\d\d/i.test(wynikHtml)) {
      console.error(`  cieszyn: wynik article expired/404 at ${wynikUrl}`);
      continue;
    }
    // Strip to plain text for the parser
    const wynikText = wynikHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
    if (!isResultNotice(wynikText)) {
      console.error(`  cieszyn: wynik page not recognised as result notice (${wynikUrl})`);
      continue;
    }
    resultRefs.push({
      text: wynikText,
      detail_url: wynikUrl,
      auction_date: listing.auction_date || null,
    });
  }

  console.error(
    `  cieszyn: ${listings.length} active listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, resultRefs };
}

/** Active flat listings. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

/**
 * Result-notice refs — carry .text already (source:'html').
 * refresh.js passes .text directly to parseResultDoc.
 */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sample: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
