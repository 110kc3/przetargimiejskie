
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


async function collectFlatSaleCandidates() {
  const candidates = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? `${BOARD_BASE}/` : `${BOARD_BASE}/page/${page}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/\b404\b/.test(err.message)) break;
      console.error(`  namyslow: board page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }

    const items = parseBoardPage(html);
    if (items.length === 0) break;

    for (const item of items) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      if (isFlatSaleTitle(item.title)) candidates.push(item);
    }
  }

  return candidates;
}

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


export async function crawlResultDocs() {
  console.error('  namyslow crawlResultDocs: stub — ZAN publishes no dedicated flat-results board (see spike §4)');
  return [];
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
