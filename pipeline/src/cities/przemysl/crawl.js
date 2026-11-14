import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  parseListPage,
  isFlatTitle,
  parseAnnouncement,
  extractArticleText,
} from './parse.js';

const ANNOUNCE_BASE =
  'https://invest.przemysl.eu/40004/642/przetargi-na-zbycie-dzierzawe-najem-nieruchomosci.html';
const RESULTS_BASE =
  'https://bip.przemysl.pl/59228/3722/informacje-o-wynikach-przetargow.html';

const ANNOUNCE_HOST = 'https://invest.przemysl.eu';
const RESULTS_HOST = 'https://bip.przemysl.pl';

const MAX_LIST_PAGES = 10;


async function fetchAnnounceLinks() {
  const links = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const url = page === 1 ? ANNOUNCE_BASE : `${ANNOUNCE_BASE}?Page=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(
        `  przemysl announce page ${page} fetch failed: ${err.message}`,
      );
      break;
    }
    const items = parseListPage(html, ANNOUNCE_HOST);
    if (items.length === 0) {
      console.error(`  przemysl announce page ${page}: no items, stopping`);
      break;
    }
    let added = 0;
    for (const it of items) {
      if (!isFlatTitle(it.title)) continue;
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      links.push(it);
      added++;
    }
    console.error(
      `  przemysl announce page ${page}: ${items.length} items, ${added} flat title(s)`,
    );
    if (items.length < 10) break;
  }
  return links;
}

async function enrichAnnouncement(link) {
  let html;
  try {
    html = await getText(link.url);
  } catch (err) {
    console.error(`  przemysl announce detail fetch failed (${link.url}): ${err.message}`);
    return null;
  }
  const fields = parseAnnouncement(html, link.url);
  if (!fields.address) {
    console.error(`  przemysl announce no address: ${link.url}`);
    return null;
  }
  return {
    kind: fields.kind,
    address_raw: fields.address_raw,
    address: fields.address,
    area_m2: fields.area_m2,
    starting_price_pln: fields.starting_price_pln,
    auction_date: fields.auction_date,
    round: fields.round,
    detail_url: link.url,
    published_date: null,
  };
}

export async function crawlActive() {
  const links = await fetchAnnounceLinks();
  console.error(`  przemysl: ${links.length} flat announcement link(s)`);

  const listings = [];
  for (const link of links) {
    const record = await enrichAnnouncement(link);
    if (!record) continue;
    listings.push(record);
  }
  console.error(`  przemysl active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}


async function fetchResultLinks() {
  const links = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const url = page === 1 ? RESULTS_BASE : `${RESULTS_BASE}?Page=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  przemysl results page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseListPage(html, RESULTS_HOST);
    if (items.length === 0) {
      console.error(`  przemysl results page ${page}: no items, stopping`);
      break;
    }
    let added = 0;
    for (const it of items) {
      if (!isFlatTitle(it.title)) continue;
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      links.push(it);
      added++;
    }
    console.error(
      `  przemysl results page ${page}: ${items.length} items, ${added} flat title(s)`,
    );
    if (items.length < 10) break;
  }
  return links;
}

export async function crawlResultDocs() {
  const links = await fetchResultLinks();
  console.error(`  przemysl: ${links.length} flat result notice link(s)`);

  const refs = [];
  for (const link of links) {
    let html;
    try {
      html = await getText(link.url);
    } catch (err) {
      console.error(`  przemysl result fetch failed (${link.url}): ${err.message}`);
      continue;
    }
    const text = extractArticleText(html);
    if (!text) {
      console.error(`  przemysl result empty body: ${link.url}`);
      continue;
    }
    refs.push({ url: link.url, text, date: null });
  }
  console.error(`  przemysl crawlResultDocs: ${refs.length} ref(s) returned`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs, null, 2) + '\n');
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
