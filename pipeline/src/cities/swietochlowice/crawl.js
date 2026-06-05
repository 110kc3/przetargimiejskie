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
const FETCH_OPTS = { userAgent: BROWSER_UA };

/** Collect unique flat-auction announcement links across current + archive pages. */
async function collectAnnouncements() {
  const pages = [LIST];
  for (let i = 0; i < config.bip.maxArchivePages; i++) {
    pages.push(`${LIST}?showArchive=true&start=${i}`);
  }

  const entries = [];
  const seen = new Set();
  let emptyStreak = 0;
  for (const url of pages) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  swietochlowice index fetch failed (${url}): ${err.message}`);
      continue;
    }
    const flats = parseDocLinks(html, ORIGIN).filter((d) => isFlatAnnouncement(d.title));
    let added = 0;
    for (const d of flats) {
      if (seen.has(d.url)) continue;
      seen.add(d.url);
      entries.push(d);
      added++;
    }
    // Stop walking the archive once pages stop yielding new flat announcements.
    if (url.includes('showArchive')) {
      if (added === 0) {
        if (++emptyStreak >= 3) break;
      } else {
        emptyStreak = 0;
      }
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
