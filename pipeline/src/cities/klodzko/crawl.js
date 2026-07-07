// Kłodzko crawler — Urząd Miasta w Kłodzku BIP (menu=346).
//
// Single BIP category carries both announcements and result notices. We crawl
// the active listing board to discover item IDs, then fetch each detail page
// and classify it as an announcement or a result notice by its title.
//
//   LISTING:  https://um.bip.klodzko.pl/index.php?n=i&sort=1&menu=346
//   DETAIL:   https://um.bip.klodzko.pl/index.php?n=i&id={id}&akcja=info&menu=346
//   ARCHIVE:  https://um.bip.klodzko.pl/index.php?n=i&menu=346&arch=1
//             ⚠️ ARCHIVE GAP: the archive tab may require JS interaction to
//             activate (tested: plain HTTP returns an empty list). A Playwright
//             pass is needed to backfill result notices older than the current
//             active listing. Noted as a known gap; the active board is scraped
//             first, result notices older than the window will be discovered
//             on the first human-triggered archive validation run.
//
// Title classification:
//   - Result notice: contains "INFORMACJA BURMISTRZA" + "WYNIKU PRZETARGU"
//   - Flat announcement: contains "lokal mieszkaln" + "przetarg ustny"
//   - Skip: commercial ("innym przeznaczeniu niż mieszkalny"), land (nieruchomości
//     zabudowanej / gruntowej) — these are not flats.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseDetailPage, parseListingPage } from './parse.js';

const ORIGIN = 'https://um.bip.klodzko.pl';
const LISTING_URL = `${ORIGIN}/index.php?n=i&sort=1&menu=346`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Build a detail page URL for a given item id. */
export function detailUrl(id) {
  return `${ORIGIN}/index.php?n=i&id=${id}&akcja=info&menu=346`;
}

/**
 * Classify a board headline as a flat announcement vs. a result notice.
 * The board titles the flat as "…na sprzedaż lokalu mieszkalnego…" (genitive),
 * so `lokal\w*` must absorb the case ending — a bare `lokal\s` skips these.
 * @param {string} title  the anchor's visible headline text
 * @returns {{ isFlat: boolean, isResult: boolean }}
 */
export function classifyBoardTitle(title) {
  const t = (title || '').toLowerCase();
  const isFlat = /lokal\w*\s+mieszkaln/.test(t) && /przetarg/.test(t);
  const isResult = /informacja\s+burmistrza.*wyniku|wyniku\s+przetargu/i.test(title || '');
  return { isFlat, isResult };
}

/**
 * Crawl the active listing board to collect item references.
 * Returns all items in the active board (flats + commercial + land —
 * the caller (crawlAll) classifies by title).
 */
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

// Memoised crawl — crawlActive() and crawlResultDocs() share one pass.
let crawlPromise = null;

async function crawlAll() {
  const boardItems = await crawlListingBoard();
  const listings = [];
  const resultRefs = [];

  for (const item of boardItems) {
    // Skip non-residential titles immediately (no network request needed).
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
      // announcement
      if (!parsed.listing) continue;
      listings.push(parsed.listing);
    }
  }

  console.error(
    `  klodzko: ${listings.length} active listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, wykaz: [], resultRefs };
}

/** Active flat listings from the BIP board. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

/**
 * Result notice refs — already carry `.text` (source:'html' → refresh.js
 * passes the text directly to parseResultDoc, bypassing OCR dispatch).
 */
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
