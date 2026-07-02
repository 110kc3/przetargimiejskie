// Gniezno crawler.
//
// TWO sources:
//
//   1. BIP (bip.gniezno.eu) — IDcom.pl CMS, server-rendered HTML.
//      Listing: https://bip.gniezno.eu/wiadomosci/11287/lista/{page}/{year}
//      Each entry is a <div class="contener"><p class="title"><a href="...">TITLE</a></p></div>.
//      No date or description inline — just title + URL.
//      Per-entry page carries PDF attachments (ogłoszenie + wynik per round).
//      Announcement PDFs (~413 KB each) contain: address, area, KW, cena wywoławcza,
//      wadium, auction date, round number.  All text-PDF (not scanned).
//
//   2. gniezno.eu Aktualności — inline HTML result notices published after each
//      auction; searched by fetching
//      https://www.gniezno.eu/wiadomosci/1/lista/przetargi_{year}
//      (category filtered) or by scanning a category feed.
//      Each notice is a short article with cena wywoławcza / najwyższa cena /
//      nabywca / wynik pozytywny|negatywny.
//
// crawlActive():
//   Scrapes BIP pages for the current year + prior year (to catch multi-round
//   flats whose first round was announced late in the prior year). Yields
//   { listings:[], wykaz:[], land:[] }.
//
// crawlResultDocs():
//   Fetches gniezno.eu result-notice article texts.  Returns refs with .text
//   already set so refresh.js passes the text straight to parseResultDoc without
//   a second fetch.  Falls back to an empty array on failure.

import { getText } from '../../core/fetch.js';

// bip.gniezno.eu serves an INCOMPLETE TLS chain (missing intermediate), which
// Node's fetch rejects with UNABLE_TO_VERIFY_LEAF_SIGNATURE while browsers
// quietly repair it via AIA. Same situation and same fix as zabrze/crawl.js —
// relax chain verification for this host only (or provide the intermediate
// via NODE_EXTRA_CA_CERTS and drop this flag).
const FETCH_OPTS = { insecureTLS: true };
import { pdfText } from '../../core/pdf-text.js';
import { parseBipList, pdfAttachmentUrlsFromDetail, parseAnnouncement } from './parse.js';

const BIP_BASE = 'https://bip.gniezno.eu/wiadomosci/11287/lista';
const GNIEZNO_RESULT_FEED = 'https://www.gniezno.eu/wiadomosci/1/lista/przetarg_na_sprzedaz_lokalu_mieszkalnego';

// Max pages per year on the BIP listing
const MAX_BIP_PAGES = 8;
// Current year + one year back (catches late prior-year announcements)
function yearsToScrape() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

// gniezno.eu result notice links: match article URLs for flat-sale results
const RESULT_NOTICE_RE = /href="(https?:\/\/(?:www\.)?gniezno\.eu\/wiadomosci\/1\/wiadomosc\/\d+\/[^"]*(?:przetarg|sprzedaz|wynik)[^"]*)"[^>]*>([^<]{10,120})</gi;

// ---- BIP crawl ---------------------------------------------------------------

async function crawlBipYear(year) {
  const items = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_BIP_PAGES; page++) {
    const url = `${BIP_BASE}/${page}/${year}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  gniezno BIP ${year} page ${page} fetch failed: ${err.message}`);
      break;
    }
    const pageItems = parseBipList(html);
    if (pageItems.length === 0) break;
    let added = 0;
    for (const it of pageItems) {
      if (seen.has(it.detail_url)) continue;
      seen.add(it.detail_url);
      items.push(it);
      added++;
    }
    console.error(`  gniezno BIP ${year} page ${page}: ${pageItems.length} entries (${added} flat-sale)`);
    // IDcom.pl paginates 10/page; fewer than 10 means last page
    if (pageItems.length < 5) break;
  }
  return items;
}

// Enrich a BIP entry stub by fetching the per-entry page and parsing the first
// ogłoszenie PDF attachment.
async function enrichFromDetailPage(stub) {
  let detailHtml;
  try {
    detailHtml = await getText(stub.detail_url, FETCH_OPTS);
  } catch (err) {
    console.error(`  gniezno detail fetch failed (${stub.title}): ${err.message}`);
    return stub;
  }
  const pdfUrls = pdfAttachmentUrlsFromDetail(detailHtml);
  if (pdfUrls.length === 0) {
    console.error(`  gniezno: no PDF attachments on ${stub.detail_url}`);
    return stub;
  }
  // First PDF is the ogłoszenie o I przetargu; use the most-recent ogłoszenie
  // (the last odd-indexed file — files alternate ogłoszenie/wynik/ogłoszenie…)
  // Heuristic: take the LAST file whose name contains "ogloszen" or whose index
  // is even (0-based). If uncertain, use first.
  const ogloszenieUrl =
    pdfUrls.find((u) => /ogloszen|oglosz/i.test(u)) || pdfUrls[0];

  let pdfInfo = {};
  try {
    const pdfTxt = await pdfText(ogloszenieUrl);
    pdfInfo = parseAnnouncement(pdfTxt);
  } catch (err) {
    console.error(`  gniezno: PDF parse failed (${ogloszenieUrl}): ${err.message}`);
  }

  return {
    ...stub,
    area_m2: pdfInfo.area_m2 ?? null,
    starting_price_pln: pdfInfo.starting_price_pln ?? null,
    auction_date: pdfInfo.auction_date ?? null,
    round: stub.round ?? pdfInfo.round ?? null,
    detail_url: stub.detail_url,
    bip_attachment_urls: pdfUrls,
  };
}

export async function crawlActive() {
  const allStubs = [];
  const seenUrls = new Set();
  for (const year of yearsToScrape()) {
    const yearItems = await crawlBipYear(year);
    for (const it of yearItems) {
      if (seenUrls.has(it.detail_url)) continue;
      seenUrls.add(it.detail_url);
      allStubs.push(it);
    }
  }

  const listings = [];
  for (const stub of allStubs) {
    const enriched = await enrichFromDetailPage(stub);
    // Skip stubs with no data at all (no area, no price, no date)
    if (
      enriched.area_m2 == null &&
      enriched.starting_price_pln == null &&
      enriched.auction_date == null
    ) {
      console.error(`  gniezno: skipped empty stub (${enriched.title})`);
      continue;
    }
    listings.push({
      kind: 'mieszkalny',
      address_raw: enriched.title,
      address: null, // address comes from the PDF parse via parseAnnouncement
      auction_date: enriched.auction_date,
      published_date: null,
      round: enriched.round,
      area_m2: enriched.area_m2,
      starting_price_pln: enriched.starting_price_pln,
      detail_url: enriched.detail_url,
    });
  }

  console.error(`  gniezno active: ${listings.length} flat listing(s) from ${allStubs.length} BIP stub(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---- gniezno.eu result-notice crawl -----------------------------------------

// Fetch result notices from gniezno.eu. The site exposes them in the Aktualności
// category. We fetch the category page and follow links matching flat-sale results.
async function fetchResultNoticeUrls() {
  const urls = [];
  const currentYear = new Date().getFullYear();
  // Fetch the Aktualności category for the last 2 years
  for (const year of [currentYear, currentYear - 1]) {
    const feedUrl = `https://www.gniezno.eu/wiadomosci/1/lista/${year}`;
    let html;
    try {
      html = await getText(feedUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  gniezno gniezno.eu feed ${year} failed: ${err.message}`);
      continue;
    }
    // Extract links to flat-sale result notices
    const RE = /href="(\/wiadomosci\/1\/wiadomosc\/\d+\/przetarg_na_sprzedaz_lokalu[^"]+)"/gi;
    let m;
    while ((m = RE.exec(html)) !== null) {
      const full = `https://www.gniezno.eu${m[1]}`;
      if (!urls.includes(full)) urls.push(full);
    }
  }
  return urls;
}

export async function crawlResultDocs() {
  const noticeUrls = await fetchResultNoticeUrls();
  console.error(`  gniezno: found ${noticeUrls.length} gniezno.eu result notice URL(s)`);
  const refs = [];
  for (const url of noticeUrls) {
    try {
      const html = await getText(url, FETCH_OPTS);
      // Extract the article body text
      const articleM = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
      const rawText = articleM ? articleM[1] : html;
      const text = rawText
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) continue;
      refs.push({
        url,
        text,
        date: null, // date is inside the text
      });
    } catch (err) {
      console.error(`  gniezno result notice fetch failed (${url}): ${err.message}`);
    }
  }
  return refs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active listing(s)`);
}
