// Namysłów (ZAN) crawler.
//
// crawlActive():
//   Paginates zan-namyslow.pl/przetargi/ (WordPress/Divi board, newest-first,
//   ~8 posts/page) up to MAX_PAGES. The board mixes flat-sale announcements
//   with unrelated notices (procurement RFQs, garage-rental przetargi,
//   building-renovation tenders + their "zawiadomienie o wyborze oferty"
//   award notices) — parseBoardPage extracts every post; isFlatSaleTitle
//   (title-only: classifyKind + a lease guard) keeps only flat-sale
//   candidates before any detail page is fetched. Each candidate's detail
//   page is fetched and parsed for the inline HTML fields (parseDetailPage).
//   If that parse comes back empty AND the post links a backup PDF
//   ("Ogłoszenie o przetargu" — born-digital, same prose), we retry from the
//   PDF text via core/pdf-text.js. Returns { listings, wykaz: [] } — ZAN has
//   no wykaz/pre-announcement board (that lives on the gmina BIP, out of
//   scope — see config.js).
//
// crawlResultDocs():
//   STUB — returns []. ZAN publishes no dedicated flat-sale RESULTS board;
//   see config.js + spikes/opolskie/powiat-namyslowski/namyslow.md §4.
//   Achieved prices are only inferable from repeat-round history (the round
//   number climbs each time a flat fails to sell) — build-properties already
//   surfaces that via the listing history once multiple rounds of the same
//   address have been crawled; there is nothing further to scrape here.
//   Revisit if ZAN ever posts a "wynik przetargu" notice on this board.
//
// Bounding (ADAPTER-GUIDE §5.1 — "paginate, but bound it"): MAX_PAGES caps
// pagination. The board's WordPress archive widget goes back to 2011, but
// page 1 alone held all 3 live flats on spike day (2026-07-08), and live
// re-verification during build (2026-07-10) showed pages 1-3 already cover
// ~6 months / rounds I-V of the site's small rotating flat pool — older
// pages only repeat already-superseded rounds of the same handful of
// addresses. MAX_DETAIL_FETCHES is a defensive backstop in case a future
// page is unexpectedly flat-heavy.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseBoardPage, parseDetailPage, parseNoticeText, isFlatSaleTitle } from './parse.js';

const BOARD_BASE = 'https://zan-namyslow.pl/przetargi';
const MAX_PAGES = 6;
const MAX_DETAIL_FETCHES = 40;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

async function collectFlatSaleCandidates() {
  const candidates = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? `${BOARD_BASE}/` : `${BOARD_BASE}/page/${page}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/\b404\b/.test(err.message)) break; // past the last page — normal
      console.error(`  namyslow: board page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }

    const items = parseBoardPage(html);
    if (items.length === 0) break; // empty page — past the end of the board

    for (const item of items) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      if (isFlatSaleTitle(item.title)) candidates.push(item);
    }
  }

  return candidates;
}

// Fetch one detail page + parse; falls back to the backup PDF ("Ogłoszenie o
// przetargu") when the inline HTML parse is incomplete.
async function fetchAndParseListing(item) {
  let html;
  try {
    html = await getText(item.url, FETCH_OPTS);
  } catch (err) {
    console.error(`  namyslow: detail page fetch failed (${item.url}): ${err.message}`);
    return null;
  }

  let parsed = parseDetailPage(html, item.url);
  const incomplete = !parsed || parsed.address == null || parsed.starting_price_pln == null;

  if (incomplete && parsed?.detail_pdf) {
    try {
      const text = await pdfText(parsed.detail_pdf, FETCH_OPTS);
      const fromPdf = parseNoticeText(text.replace(/\s+/g, ' ').trim());
      if (fromPdf) parsed = { ...fromPdf, detail_url: item.url, detail_pdf: parsed.detail_pdf };
    } catch (err) {
      console.error(`  namyslow: PDF fallback failed (${parsed.detail_pdf}): ${err.message}`);
    }
  }

  if (!parsed || !parsed.address) {
    console.error(`  namyslow: no parseable flat-sale record for ${item.url}`);
    return null;
  }
  return parsed;
}

export async function crawlActive() {
  const candidates = await collectFlatSaleCandidates();
  console.error(`  namyslow crawlActive: ${candidates.length} flat-sale post(s) found (≤${MAX_PAGES} board pages)`);

  const listings = [];
  for (const item of candidates.slice(0, MAX_DETAIL_FETCHES)) {
    const parsed = await fetchAndParseListing(item);
    if (parsed) listings.push(parsed);
  }

  console.error(`  namyslow crawlActive: ${listings.length} listing(s) parsed`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs — stub (see header note)
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  console.error('  namyslow crawlResultDocs: stub — ZAN publishes no dedicated flat-results board (see spike §4)');
  return [];
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
