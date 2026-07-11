// Sępólno Krajeńskie crawler — single board on the extranet "BIP w JST" CMS
// bip.gmina-sepolno.pl (see config.js for the full rationale).
//
//   harvestNotices() [memoized] — crawls the Przetargi board /657/405 (paginated
//     ?Page=N, bounded), then fetches + parses each notice page ONCE. Shared by
//     both entry points so one refresh run fetches each notice HTML a single time.
//
//   crawlActive() — sale notices, address-keyed kinds only (flats/commercial/
//     garaż/built): metadata + title drive kind/round/price/date/address; the
//     ogłoszenie PDF fills area_m2 (the one DEEP field). Land (działki/grunt)
//     and lease (dzierżawa) are detected and skipped (see config.js scope note).
//     Returns { listings, wykaz: [], land: [] }.
//
//   crawlResultDocs() — sale notices carrying an "informacja o wyniku przetargu"
//     PDF: extract its text (pdfText, born-digital → NEVER OCR) and return refs
//     with ref.text (source:'html' → refresh.js reads ref.text directly).
//     Returns Array<{ text, pdf_url, auction_date }>.
//
// All fetches use a browser UA + insecureTLS (the host ships an incomplete cert
// chain — core/fetch.js handles it; we invent no new mechanism).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseNotice, areaFromAnnouncement, parseResultDoc } from './parse.js';

const PORTAL = 'https://bip.gmina-sepolno.pl';
const BOARD = `${PORTAL}/657/405/przetargi.html`;
const BOARD_DOCID = '657'; // the board's own self-link — never a notice
const MAX_PAGES = 6; // observed ~2 pages; a safety bound for growth

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

// Address-keyed kinds we emit as listings; grunt (parcel-keyed land) is skipped
// in v1 (compound multi-parcel notices — see config.js).
const LISTING_KINDS = new Set(['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz']);

/**
 * Extract notice-detail links from one board-index page.
 * Notice URL: /<docid>/405/<slug>.html (absolute or root-relative). Skips the
 * board's own self-link (docid 657 / slug "przetargi.html").
 * @param {string} html @returns {Array<{docid:string, url:string}>}
 */
export function parseBoardLinks(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"]+)?\/(\d+)\/405\/([^"]+\.html))"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const docid = m[2];
    const slug = m[3];
    if (docid === BOARD_DOCID || /^przetargi\.html/i.test(slug)) continue;
    if (seen.has(docid)) continue;
    seen.add(docid);
    let url = m[1];
    if (!/^https?:\/\//i.test(url)) url = PORTAL + url;
    out.push({ docid, url });
  }
  return out;
}

// ---------------------------------------------------------------- harvest (memoized)

let noticesPromise = null;

async function harvestNotices() {
  // 1. Paginate the board, collecting unique notice links.
  const links = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BOARD : `${BOARD}?Page=${page}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  sepolno-krajenskie: board page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }
    const found = parseBoardLinks(html);
    let added = 0;
    for (const l of found) {
      if (seen.has(l.docid)) continue;
      seen.add(l.docid);
      links.push(l);
      added++;
    }
    if (added === 0) break; // no new notices on this page — stop paginating
  }
  console.error(`  sepolno-krajenskie: ${links.length} notice link(s) across board`);

  // 2. Fetch + parse each notice page once.
  const notices = [];
  for (const l of links) {
    let html;
    try {
      html = await getText(l.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  sepolno-krajenskie: notice fetch failed (${l.url}): ${err.message}`);
      continue;
    }
    notices.push(parseNotice(html, l.url));
  }
  return notices;
}

function getNotices() {
  noticesPromise ??= harvestNotices();
  return noticesPromise;
}

// ---------------------------------------------------------------- crawlActive

export async function crawlActive() {
  const notices = await getNotices();
  const listings = [];

  for (const n of notices) {
    if (!n.is_sale) continue;
    if (!LISTING_KINDS.has(n.kind)) continue; // grunt/unknown → skipped (see config.js)

    // area_m2 (the one deep field) from the born-digital ogłoszenie PDF.
    let area_m2 = null;
    if (n.announcementPdf) {
      try {
        area_m2 = areaFromAnnouncement(await pdfText(n.announcementPdf, FETCH_OPTS));
      } catch (err) {
        console.error(`  sepolno-krajenskie: ogłoszenie PDF failed (${n.announcementPdf}): ${err.message}`);
      }
    }

    listings.push({
      kind: n.kind,
      address_raw: n.address_raw,
      address: n.address, // may be null (e.g. area-named garaż site) — pipeline drops it
      round: n.round,
      starting_price_pln: n.starting_price_pln,
      auction_date: n.auction_date,
      area_m2,
      published_year: n.published_year,
      detail_url: n.url,
    });
  }

  console.error(`  sepolno-krajenskie crawlActive: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------- crawlResultDocs

export async function crawlResultDocs() {
  const notices = await getNotices();
  const refs = [];

  for (const n of notices) {
    if (!n.is_sale || !n.resultPdf) continue;
    let text;
    try {
      text = await pdfText(n.resultPdf, FETCH_OPTS);
    } catch (err) {
      console.error(`  sepolno-krajenskie: result PDF failed (${n.resultPdf}): ${err.message}`);
      continue;
    }
    refs.push({ text, pdf_url: n.resultPdf, auction_date: n.auction_date });
  }

  console.error(`  sepolno-krajenskie crawlResultDocs: ${refs.length} result doc(s)`);
  return refs;
}

// ---------------------------------------------------------------- CLI smoke test

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const refs = await crawlResultDocs();
  const records = refs.flatMap((r) => parseResultDoc(r.text, r.auction_date, r.pdf_url));
  process.stdout.write(JSON.stringify({
    listings: listings.length,
    resultDocs: refs.length,
    resultRecords: records.length,
    sampleListing: listings[0],
    sampleResult: records[0],
  }, null, 2) + '\n');
}
