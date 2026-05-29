// Zabrze crawler — the city BIP's "Lokale mieszkalne" sale board.
//
//   LIST:  https://bip.miastozabrze.pl/zabrze/nieruch/um_pnn/zabrze_pn_sprzedaz/zabrze_pns_mieszkalne
//   DOC:   https://bip.miastozabrze.pl/doc/<id>          (one per announcement)
//   FILE:  https://bip.miastozabrze.pl/attachment/<id>   (the per-flat table)
//
// The list is server-rendered: each announcement is an <article class="border-t…">
// with <h2><a href="/doc/<id>">TITLE</a></h2> and a publication date. The TITLE
// carries the round ("I/II ustnych …") and the auction date ("na dzień
// DD.MM.YYYY r."). The per-flat rows (address / area / starting price) live in
// the announcement's single attachment, which we extract per /doc page.
//
// Zabrze is modelled as an ACTIVE-listings adapter (like Bytom): each flat in
// an announcement becomes an active listing carrying the announcement's round +
// auction date + the /doc page as detail_url. crawlResultDocs() is []. The
// popup's past-date filter naturally hides already-held auctions; the archive
// keeps them.
//
// ⚠️ Two pieces are unverified pending the first CI run (the host was
// unreachable from the dev sandbox): (a) the attachment is assumed to be a text
// PDF (pdfText/pdftotext) — see config.js; (b) the list pagination param
// (`?page=N`) — if wrong, we still get page 1 (the 30 newest). Both are logged.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncementText,
  roundFromTitle,
  auctionDateFromTitle,
} from './parse.js';

const ORIGIN = 'https://bip.miastozabrze.pl';
const LIST_URL = `${ORIGIN}/zabrze/nieruch/um_pnn/zabrze_pn_sprzedaz/zabrze_pns_mieszkalne`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_PAGES = 8;
// bip.miastozabrze.pl ships an incomplete TLS chain (missing intermediate) —
// Node's fetch fails UNABLE_TO_VERIFY_LEAF_SIGNATURE where browsers succeed. We
// relax chain verification for this host only (public, read-only data). See the
// long note + secure alternative in core/fetch.js.
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

/**
 * Parse one list page into announcement refs.
 * @param {string} html
 * @returns {Array<{doc_url:string, title:string, round:number|null, auction_date:string|null, published_date:string|null}>}
 */
export function parseList(html) {
  const out = [];
  const seen = new Set();
  const artRe = /<article[^>]*class="[^"]*border-t[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let a;
  while ((a = artRe.exec(html)) !== null) {
    const item = a[1];
    const linkM = /<a[^>]*href="(\/doc\/\d+)"[^>]*>([\s\S]*?)<\/a>/i.exec(item);
    if (!linkM) continue;
    const docUrl = ORIGIN + linkM[1];
    if (seen.has(docUrl)) continue;
    seen.add(docUrl);
    const title = stripTags(linkM[2]);
    if (!/przetarg|sprzeda|ogłoszenie/i.test(title)) continue;
    const published = /dnia\s+(\d{4}-\d{2}-\d{2})/i.exec(stripTags(item))?.[1] ?? null;
    out.push({
      doc_url: docUrl,
      title,
      round: roundFromTitle(title),
      auction_date: auctionDateFromTitle(title),
      published_date: published,
    });
  }
  return out;
}

/** Extract the first /attachment/<id> URL from an announcement /doc page. */
export function attachmentUrlFromDoc(html) {
  const m = /href="(\/attachment\/\d+)"/i.exec(html);
  return m ? ORIGIN + m[1] : null;
}

/** Crawl all list pages (paginated). */
async function crawlAnnouncements() {
  const all = [];
  const seenDocs = new Set();
  let firstPageFirstDoc = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? LIST_URL : `${LIST_URL}?page=${page}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze list page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseList(html);
    if (items.length === 0) break;
    // Pagination guard: if page>1 returns the same first doc as page 1, the
    // `?page=` param isn't honoured — stop (we already have page 1).
    if (page === 1) firstPageFirstDoc = items[0]?.doc_url;
    else if (items[0]?.doc_url === firstPageFirstDoc) {
      console.error('  zabrze: pagination param not honoured — stopping at page 1');
      break;
    }
    let added = 0;
    for (const it of items) {
      if (seenDocs.has(it.doc_url)) continue;
      seenDocs.add(it.doc_url);
      all.push(it);
      added++;
    }
    console.error(`  zabrze list page ${page}: ${items.length} announcements (${added} new)`);
    if (added === 0) break;
  }
  return all;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  const announcements = await crawlAnnouncements();
  const listings = [];
  for (const ann of announcements) {
    let docHtml;
    try {
      docHtml = await getText(ann.doc_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze doc fetch failed ${ann.doc_url}: ${err.message}`);
      continue;
    }
    const attUrl = attachmentUrlFromDoc(docHtml);
    if (!attUrl) {
      console.error(`  zabrze: no attachment on ${ann.doc_url}`);
      continue;
    }
    let text = '';
    try {
      // Assumed text PDF — see config.js. pdftotext throws on non-PDF; we log
      // and skip so one odd attachment can't break the whole crawl.
      text = await pdfText(attUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze attachment extract failed ${attUrl}: ${err.message}`);
      continue;
    }
    const flats = parseAnnouncementText(text);
    if (flats.length === 0) {
      console.error(`  zabrze WARN: 0 flats parsed from ${attUrl} (${ann.title})`);
    }
    for (const f of flats) {
      listings.push({
        kind: f.kind,
        address_raw: f.address_raw,
        address: f.address,
        auction_date: ann.auction_date,
        round: ann.round,
        area_m2: f.area_m2,
        starting_price_pln: f.starting_price_pln,
        detail_url: ann.doc_url,
      });
    }
  }
  console.error(`  zabrze active: ${listings.length} flats from ${announcements.length} announcements`);
  return { listings, wykaz: [] };
}

/** No separate results stream — properties are built from active announcements. */
export async function crawlResultDocs() {
  return [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
