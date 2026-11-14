
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseNotice, areaFromAnnouncement, parseResultDoc } from './parse.js';

const PORTAL = 'https://bip.gmina-sepolno.pl';
const BOARD = `${PORTAL}/657/przetargi.html`;
const BOARD_DOCID = '657';
const MAX_PAGES = 6;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

const LISTING_KINDS = new Set(['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz']);

export function parseBoardLinks(html) {
  const out = [];
  const seen = new Set();
  // Scope to board-card titles. Once /405/ disappeared, a global href scan
  const re = /<div[^>]*class="cct-item__name"[^>]*>\s*<a href="((?:https?:\/\/[^"]+)?\/(\d+)\/(?:405\/)?([^"]+\.html))"/gi;
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


let noticesPromise = null;

async function harvestNotices() {
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
    if (added === 0) break;
  }
  console.error(`  sepolno-krajenskie: ${links.length} notice link(s) across board`);

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


export async function crawlActive() {
  const notices = await getNotices();
  const listings = [];

  for (const n of notices) {
    if (!n.is_sale) continue;
    if (!LISTING_KINDS.has(n.kind)) continue;

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
