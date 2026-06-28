// Słupsk crawler.
//
//   LISTING: https://bip.um.slupsk.pl/przetargi/nieruchomosci/?pix=N
//     Server-rendered HTML, 20 items/page, paginated via ?pix=N (0-indexed).
//     "aktualne" = active; "zamknięte" = closed/past. We scrape ALL pages and
//     filter to flat auctions (isFlatAuction in parse.js). Status "aktualne" is
//     kept in active listings; "zamknięte" items are skipped (archive only).
//
//   DETAIL: https://bip.um.slupsk.pl/przetargi/<id>.html
//     Single notice page per flat — full text inline (no PDF needed).
//     Parsed by parseNoticePage → {area_m2, starting_price_pln, auction_date, kw, …}.
//
//   RESULT ARCHIVE: https://bip.um.slupsk.pl/nieruchomosci/dokumenty/846.html
//     Lists the most-recently-added result PDFs as <div class="mx-files-item pdf">
//     links. These are born-digital PDFs served at /file/<id>.
//     crawlResultDocs() returns refs with {pdf_url}; source:'html' tells the
//     refresh loop to call parseResultDoc on the extracted text directly.
//
// No auth, no JS SPA, no TLS issues observed. Standard browser UA used to
// avoid any WAF rejecting the default bot UA.

import { getText } from '../../core/fetch.js';
import {
  parseListingPage,
  hasNextPage,
  parseNoticePage,
  parseResultArchive,
} from './parse.js';

const ORIGIN = 'https://bip.um.slupsk.pl';
const LIST_BASE = `${ORIGIN}/przetargi/nieruchomosci/`;
const RESULT_ARCHIVE = `${ORIGIN}/nieruchomosci/dokumenty/846.html`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Safety cap: the board has 56+ pages as of 2026-06-27; cap at 120 to handle growth.
const MAX_PAGES = 120;

/**
 * Paginate the listing board and return refs for ALL flat auction notice pages.
 * Stops at the last page (no mx-next link) or MAX_PAGES, whichever comes first.
 *
 * @returns {Promise<Array<{detail_url:string, title:string, round:number|null, auction_date:string|null, status:string|null}>>}
 */
async function crawlListingPages() {
  const refs = [];
  const seenUrls = new Set();

  for (let pix = 0; pix < MAX_PAGES; pix++) {
    const url = pix === 0 ? LIST_BASE : `${LIST_BASE}?pix=${pix}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  slupsk listing page pix=${pix} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListingPage(html, ORIGIN);
    let added = 0;
    for (const it of items) {
      if (seenUrls.has(it.detail_url)) continue;
      seenUrls.add(it.detail_url);
      refs.push(it);
      added++;
    }

    console.error(
      `  slupsk listing pix=${pix}: ${items.length} flat items (${added} new)`,
    );

    // Stop if there is no next-page link.
    if (!hasNextPage(html)) break;
  }

  console.error(`  slupsk listing total: ${refs.length} flat notice refs`);
  return refs;
}

/**
 * Fetch each flat notice page and extract the detail fields.
 * Only "aktualne" (active) items become listings; closed ones are skipped.
 *
 * @returns {Promise<{ listings: object[], wykaz: object[] }>}
 */
export async function crawlActive() {
  const refs = await crawlListingPages();
  const active = refs.filter((r) => r.status === 'aktualne');

  console.error(
    `  slupsk: ${active.length} active flat refs (${refs.length - active.length} closed skipped)`,
  );

  const listings = [];
  for (const ref of active) {
    let html;
    try {
      html = await getText(ref.detail_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  slupsk detail fetch failed ${ref.detail_url}: ${err.message}`);
      continue;
    }

    const parsed = parseNoticePage(html, ref.detail_url);
    if (!parsed) {
      console.error(`  slupsk WARN: parseNoticePage returned null for ${ref.detail_url}`);
      continue;
    }

    // Merge: listing-page auction_date / round take precedence over detail-page
    // when the detail page has a garbled date (space-inserted digits in <b> tags).
    listings.push({
      kind: parsed.kind,
      address_raw: parsed.address_raw,
      address: parsed.address,
      auction_date: ref.auction_date || parsed.auction_date,
      round: ref.round ?? parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: parsed.starting_price_pln,
      kw: parsed.kw,
      detail_url: ref.detail_url,
    });
  }

  console.error(`  slupsk crawlActive: ${listings.length} listings`);
  return { listings, wykaz: [] };
}

/**
 * Fetch the result archive page and return PDF refs.
 * source:'html' → refresh loop calls parseResultDoc on pdfText(pdf_url).
 *
 * @returns {Promise<Array<{pdf_url:string, auction_date:null}>>}
 */
export async function crawlResultDocs() {
  let html;
  try {
    html = await getText(RESULT_ARCHIVE, FETCH_OPTS);
  } catch (err) {
    console.error(`  slupsk result archive fetch failed: ${err.message}`);
    return [];
  }

  const refs = parseResultArchive(html, ORIGIN);
  console.error(`  slupsk crawlResultDocs: ${refs.length} result PDF refs`);
  // Add auction_date:null so the refresh loop passes it to parseResultDoc as fallbackDate.
  return refs.map((r) => ({ ...r, auction_date: null }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
