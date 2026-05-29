// Zabrze crawler — the city BIP's "Lokale mieszkalne" sale board.
//
//   LIST (JSON API):  https://bip.miastozabrze.pl/api/v1/document-list/549?q=
//   DOC (HTML):       https://bip.miastozabrze.pl/doc/<id>        (one per announcement)
//   FILE:             https://bip.miastozabrze.pl/attachment/<id> (the per-flat table)
//
// The board page (`…/zabrze_pns_mieszkalne`) is a Vue SPA — its served HTML is a
// shell with no announcements; the Vue app loads them from the JSON API
// `/api/v1/document-list/<categoryId>` (categoryId 549 = "Lokale mieszkalne").
// The API returns ALL items in one call (no pagination): { data: [ { doc_id,
// dscrpt (title), pubdat, … }, … ] }. The title carries the round ("I/II
// ustnych …") and the auction date ("na dzień DD.MM.YYYY r.").
//
// Each announcement's /doc/<id> page IS server-rendered (real HTML, carries the
// title + the /attachment/<id> link). The per-flat rows (address / area /
// starting price) live in that single attachment, which we extract per /doc.
//
// Zabrze is an ACTIVE-listings adapter (like Bytom): each flat becomes an active
// listing carrying the announcement's round + auction date + the /doc page as
// detail_url. crawlResultDocs() is []. The popup's past-date filter hides
// already-held auctions; the archive keeps them.
//
// ⚠️ Unverified pending the first CI run: the attachment is assumed a text PDF
// (pdfText/pdftotext) — see config.js. If it's scanned/DOC, swap the extractor.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncementText,
  roundFromTitle,
  auctionDateFromTitle,
} from './parse.js';

const ORIGIN = 'https://bip.miastozabrze.pl';
// "Lokale mieszkalne" category id, taken from the SPA's API call. Stable per
// category. (The human-facing board is /zabrze/nieruch/um_pnn/zabrze_pn_sprzedaz/zabrze_pns_mieszkalne.)
const LIST_CATEGORY_ID = 549;
const LIST_API = `${ORIGIN}/api/v1/document-list/${LIST_CATEGORY_ID}?q=`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// bip.miastozabrze.pl ships an incomplete TLS chain (missing intermediate) —
// Node's fetch fails UNABLE_TO_VERIFY_LEAF_SIGNATURE where browsers succeed. We
// relax chain verification for this host only (public, read-only data). See the
// long note + secure alternative in core/fetch.js.
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

/**
 * Map the document-list API payload to announcement refs.
 * @param {object} json  parsed { data: [ { doc_id, dscrpt, pubdat } ] }
 * @returns {Array<{doc_url:string, title:string, round:number|null, auction_date:string|null, published_date:string|null}>}
 */
export function parseDocumentList(json) {
  const items = json?.data;
  if (!Array.isArray(items)) return [];
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const id = it?.doc_id;
    const title = it?.dscrpt || '';
    if (!id || seen.has(id)) continue;
    if (!/przetarg|sprzeda|ogłoszenie/i.test(title)) continue;
    seen.add(id);
    out.push({
      doc_url: `${ORIGIN}/doc/${id}`,
      title,
      round: roundFromTitle(title),
      auction_date: auctionDateFromTitle(title),
      published_date: (it?.pubdat || '').slice(0, 10) || null,
    });
  }
  return out;
}

/** Extract the first /attachment/<id> URL from an announcement /doc page. */
export function attachmentUrlFromDoc(html) {
  const m = /href="(\/attachment\/\d+)"/i.exec(html);
  return m ? ORIGIN + m[1] : null;
}

/** Fetch + parse the document-list JSON API (all announcements, one call). */
async function crawlAnnouncements() {
  let json;
  try {
    json = JSON.parse(await getText(LIST_API, FETCH_OPTS));
  } catch (err) {
    console.error(`  zabrze document-list API failed: ${err.message}`);
    return [];
  }
  const anns = parseDocumentList(json);
  console.error(`  zabrze document-list: ${anns.length} announcements`);
  return anns;
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
