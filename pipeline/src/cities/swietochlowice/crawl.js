// Świętochłowice crawler.
//
//   INDEX:   /bipkod/29287911                              (current flat auctions)
//            /bipkod/29287911?showArchive=true&start=<n>   (archive, 0-based pages)
//   DETAIL:  each announcement is a Word .doc at /res/serwisy/pliki/<id>
//
// Walks the current page + archive pages (stopping after 3 empty archive pages),
// harvests the flat-auction announcement links, and for each: takes the address
// + round from the announcement TITLE (always present, consistent spelling) and
// the price / usable area / auction date from the .doc body (catdoc via
// core/doc-text.js). If the .doc can't be fetched/parsed, the listing is still
// emitted from the title (price/area/date null). One flat per announcement →
// one active listing; build-properties marks past-dated ones `archived`.
// crawlResultDocs() is [] (no sold-price stream wired). See parse.js + config.js.
//
// VERIFIED LIVE (June 2026, rendered-DOM spike). The host is reachable with a
// browser-like UA; the .doc announcement is OLE/legacy Word (catdoc), the .docx
// "KW" annex is ignored by isFlatAnnouncement.

import { config } from './config.js';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import {
  htmlToText, addressFrom, roundFromTitle,
  priceFromText, areaFromText, auctionDateFromText,
  parseDocLinks, isFlatAnnouncement,
} from './parse.js';

const ORIGIN = config.bip.origin;
const LIST = `${ORIGIN}${config.bip.listPath}`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// Low retry budget for index pages: when this host is unreachable from a given
// network (it has timed out from the GitHub Actions runner while loading fine
// from a browser), we must NOT burn the whole job retrying every page 4×.
const FETCH_OPTS = { userAgent: BROWSER_UA, retries: 1 };

/** Did a fetch fail because the host is unreachable (vs. a normal 404/empty)? */
function isConnError(err) {
  const s = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.cause?.message || ''}`;
  return /fetch failed|ECONNREFUSED|ETIMEDOUT|CONNECT_TIMEOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network/i.test(s);
}

/** Collect unique flat-auction announcement links across current + archive pages.
 *  Fails fast: if the host is unreachable on the current page, skip the city
 *  entirely (return []) rather than attempting every archive page. refresh.js
 *  tolerates an empty city, so one unreachable BIP never breaks the pipeline. */
async function collectAnnouncements() {
  const entries = [];
  const seen = new Set();
  const take = (html) => {
    let added = 0;
    for (const d of parseDocLinks(html, ORIGIN).filter((x) => isFlatAnnouncement(x.title))) {
      if (seen.has(d.url)) continue;
      seen.add(d.url);
      entries.push(d);
      added++;
    }
    return added;
  };

  // 1) Current board — if this fails to connect, abort the whole crawl fast.
  try {
    take(await getText(LIST, FETCH_OPTS));
  } catch (err) {
    console.error(`  swietochlowice: current board fetch failed (${err.message}) — skipping city this run.`);
    return [];
  }

  // 2) Archive pages — stop on the first connection failure, or after 3 empty pages.
  let emptyStreak = 0;
  for (let i = 0; i < config.bip.maxArchivePages; i++) {
    const url = `${LIST}?showArchive=true&start=${i}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  swietochlowice: archive page ${i} fetch failed (${err.message}) — stopping archive walk.`);
      if (isConnError(err)) break; // host went away; don't grind through the rest
      continue;
    }
    const added = take(html);
    if (added === 0) {
      if (++emptyStreak >= 3) break;
    } else {
      emptyStreak = 0;
    }
  }
  return entries;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  const entries = await collectAnnouncements();
  console.error(`  swietochlowice: ${entries.length} flat announcement(s) to inspect`);

  const listings = [];
  for (const e of entries) {
    // Address + round from the title — present for every announcement, and
    // spelled consistently across the dataset (the .doc body sometimes expands
    // "ul. Powstańców Śl." to "Śląskich", which would split the property key).
    const addr = addressFrom(e.title, '');
    if (!addr) {
      console.error(`  swietochlowice WARN: unkeyable announcement (${e.title.slice(0, 70)})`);
      continue;
    }
    let price = null;
    let area = null;
    let date = null;
    try {
      const text = htmlToText(await docText(e.url, FETCH_OPTS));
      price = priceFromText(text);
      area = areaFromText(text);
      date = auctionDateFromText(text);
    } catch (err) {
      console.error(`  swietochlowice .doc parse failed (${e.url}): ${err.message}`);
    }
    listings.push({
      kind: 'mieszkalny',
      address_raw: addr.address_raw,
      address: addr.address,
      auction_date: date,
      published_date: null,
      round: roundFromTitle(e.title),
      area_m2: area,
      starting_price_pln: price,
      detail_url: LIST, // the flats category page (the .doc link only downloads)
    });
  }

  console.error(`  swietochlowice active: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [] };
}

/** No separate sold-price results stream wired yet. */
export async function crawlResultDocs() {
  return [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
