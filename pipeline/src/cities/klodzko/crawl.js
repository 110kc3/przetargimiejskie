
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseDetailPage, parseListingPage } from './parse.js';

const ORIGIN = 'https://um.bip.klodzko.pl';
const LISTING_URL = `${ORIGIN}/index.php?n=i&sort=1&menu=346`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function detailUrl(id) {
  return `${ORIGIN}/index.php?n=i&id=${id}&akcja=info&menu=346`;
}

export function classifyBoardTitle(title) {
  const t = (title || '').toLowerCase();
  const isFlat = /lokal\w*\s+mieszkaln/.test(t) && /przetarg/.test(t);
  const isResult = /informacja\s+burmistrza.*wyniku|wyniku\s+przetargu/i.test(title || '');
  return { isFlat, isResult };
}

async function crawlListingBoard() {
  let html;
  try {
    html = await getText(LISTING_URL, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  klodzko listing fetch failed: ${err.message}`);
    return [];
  }
  const items = parseListingPage(html);
  console.error(`  klodzko active board: ${items.length} item(s)`);
  return items;
}

let crawlPromise = null;

async function crawlAll() {
  const boardItems = await crawlListingBoard();
  const listings = [];
  const resultRefs = [];

  for (const item of boardItems) {
    const { isFlat, isResult } = classifyBoardTitle(item.title);
    if (!isFlat && !isResult) {
      console.error(`  klodzko: skip non-flat item id=${item.id} — "${item.title.slice(0, 60)}"`);
      continue;
    }

    let html;
    try {
      html = await getText(detailUrl(item.id), { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  klodzko detail fetch failed id=${item.id}: ${err.message}`);
      continue;
    }

    const parsed = parseDetailPage(html, item.id);
    if (!parsed) {
      console.error(`  klodzko: could not parse detail page id=${item.id}`);
      continue;
    }

    if (parsed.kind === 'result') {
      resultRefs.push({
        text: parsed.text,
        detail_url: detailUrl(item.id),
        auction_date: parsed.auction_date,
      });
    } else {
      if (!parsed.listing) continue;
      listings.push(parsed.listing);
    }
  }

  console.error(
    `  klodzko: ${listings.length} active listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, wykaz: [], resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, results: results.length, sample: listings[0] }, null, 2) + '\n',
  );
}
