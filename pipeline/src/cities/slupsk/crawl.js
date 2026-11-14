
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
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

const MAX_PAGES = 120;

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

    if (!hasNextPage(html)) break;
  }

  console.error(`  slupsk listing total: ${refs.length} flat notice refs`);
  return refs;
}

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

  const known = await loadKnownSourceUrls('slupsk');
  const newRefs = refs.filter((r) => !known.has(r.pdf_url));
  const skipped = refs.length - newRefs.length;
  if (skipped > 0) {
    console.error(
      `  slupsk result: skipping ${skipped} already-known PDF(s); ${newRefs.length} new ref(s) to fetch`,
    );
  }

  return newRefs.map((r) => ({ ...r, auction_date: null }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
