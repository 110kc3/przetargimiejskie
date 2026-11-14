import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  parseListPage,
  mentionsLokal,
  isAnnounceTitle,
  isResultTitle,
  parseAnnouncement,
  extractArticleText,
} from './parse.js';

const HOST = 'https://bip.olesno.pl';

const SALE_BOARDS = [
  { year: 2026, url: `${HOST}/12941/11571/przetargi-na-sprzedaz-nieruchomosci-2026.html` },
  { year: 2025, url: `${HOST}/12150/przetargi-na-sprzedaz-nieruchomosci-2025.html` },
  { year: 2024, url: `${HOST}/11446/przetargi-na-sprzedaz-nieruchomosci-2024.html` },
  { year: 2023, url: `${HOST}/10729/przetargi-na-sprzedaz-nieruchomosci-2023.html` },
];

const ACTIVE_BOARD_COUNT = 2;

const MAX_PAGES_PER_BOARD = 8;


async function fetchBoardLinks(boardUrl) {
  const links = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES_PER_BOARD; page++) {
    const url = page === 1 ? boardUrl : `${boardUrl}?Page=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  olesno board fetch failed (${url}): ${err.message}`);
      break;
    }
    const items = parseListPage(html, HOST);
    if (items.length === 0) {
      console.error(`  olesno board page ${page} (${boardUrl}): no items, stopping`);
      break;
    }
    let added = 0;
    for (const it of items) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      links.push(it);
      added++;
    }
    console.error(`  olesno board page ${page} (${boardUrl}): ${items.length} items, ${added} new`);
    if (added === 0 && page > 1) break;
  }
  return links;
}


async function enrichAnnouncement(link) {
  let html;
  try {
    html = await getText(link.url);
  } catch (err) {
    console.error(`  olesno announce detail fetch failed (${link.url}): ${err.message}`);
    return null;
  }
  const fields = parseAnnouncement(html, link.url);
  if (fields.kind !== 'mieszkalny') {
    console.error(`  olesno announce not a flat (kind=${fields.kind}): ${link.url}`);
    return null;
  }
  if (!fields.address) {
    console.error(`  olesno announce no address: ${link.url}`);
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const boards = SALE_BOARDS.slice(0, ACTIVE_BOARD_COUNT);

  const candidates = [];
  const seen = new Set();
  for (const board of boards) {
    const links = await fetchBoardLinks(board.url);
    let kept = 0;
    for (const link of links) {
      if (!mentionsLokal(link.title)) continue;
      if (!isAnnounceTitle(link.title)) continue;
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      candidates.push(link);
      kept++;
    }
    console.error(`  olesno board ${board.year}: ${kept} announcement candidate(s)`);
  }
  console.error(`  olesno: ${candidates.length} announcement candidate(s) across ${boards.length} board(s)`);

  const listings = [];
  for (const link of candidates) {
    const record = await enrichAnnouncement(link);
    if (!record) continue;
    if (!record.auction_date || record.auction_date < todayIso) {
      console.error(`  olesno announce not upcoming (date=${record.auction_date}): ${link.url}`);
      continue;
    }
    listings.push(record);
  }
  console.error(`  olesno active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const candidates = [];
  const seen = new Set();
  for (const board of SALE_BOARDS) {
    const links = await fetchBoardLinks(board.url);
    let kept = 0;
    for (const link of links) {
      if (!mentionsLokal(link.title)) continue;
      if (!isResultTitle(link.title)) continue;
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      candidates.push(link);
      kept++;
    }
    console.error(`  olesno board ${board.year}: ${kept} result candidate(s)`);
  }
  console.error(`  olesno: ${candidates.length} result candidate(s) across ${SALE_BOARDS.length} board(s)`);

  const refs = [];
  for (const link of candidates) {
    let html;
    try {
      html = await getText(link.url);
    } catch (err) {
      console.error(`  olesno result fetch failed (${link.url}): ${err.message}`);
      continue;
    }
    const text = extractArticleText(html);
    if (!text) {
      console.error(`  olesno result empty body: ${link.url}`);
      continue;
    }
    refs.push({ url: link.url, text, date: null });
  }
  console.error(`  olesno crawlResultDocs: ${refs.length} ref(s) returned`);
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
