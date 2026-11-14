import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseListPage,
  isResultNoticeTitle,
  attachmentUrlFromDetail,
  parseAnnouncementDetail,
} from './parse.js';

const ORIGIN = 'https://bip.um.augustow.pl';

const ACTIVE_BASE =
  `${ORIGIN}/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-aktualne/`;
const ARCHIVE_BASE =
  `${ORIGIN}/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-nieaktualne/`;

function pageUrl(base, n) {
  return n === 1 ? base : `${base}ogloszenia-aktualne.html?page=${n}`;
}

const MAX_PAGES_ACTIVE = 5;
const MAX_PAGES_ARCHIVE = 25;

let crawlPromise = null;

async function crawlBoard(base, maxPages, label) {
  const listings = [];
  const resultRefs = [];
  const seenKeys = new Set();
  const seenResultUrls = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = pageUrl(base, page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  augustow ${label} page ${page} fetch failed: ${err.message}`);
      break;
    }

    if (!/<li[^>]*class="[^"]*component-item[^"]*clearfix/i.test(html)) {
      console.error(`  augustow ${label}: empty page ${page} — stopping`);
      break;
    }

    const items = parseListPage(html, ORIGIN);
    let newFlats = 0;
    for (const it of items) {
      const key = it.detail_url;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      listings.push({
        kind: it.kind,
        address_raw: null,
        address: null,
        auction_date: null,
        published_date: it.published_date,
        round: it.round,
        area_m2: null,
        starting_price_pln: null,
        detail_url: it.detail_url,
      });
      newFlats++;
    }

    const titleLinkRe = /<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"(?:[^>]*title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/gi;
    let rm;
    while ((rm = titleLinkRe.exec(html)) !== null) {
      const title = stripHtml(rm[2] || rm[3]);
      if (!isResultNoticeTitle(title)) continue;
      if (!/lokal\s+mieszkaln/i.test(title)) continue;
      let href = rm[1].replace(/&amp;/gi, '&');
      if (href.startsWith('/')) href = ORIGIN + href;
      if (seenResultUrls.has(href)) continue;
      seenResultUrls.add(href);
      resultRefs.push({ detail_url: href, title });
    }

    console.error(
      `  augustow ${label} page ${page}: ${newFlats} new flat(s), ` +
      `${resultRefs.length} result notice(s) seen so far`,
    );
  }

  return { listings, resultRefs };
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function crawlAll() {
  const [active, archive] = await Promise.all([
    crawlBoard(ACTIVE_BASE, MAX_PAGES_ACTIVE, 'aktualne'),
    crawlBoard(ARCHIVE_BASE, MAX_PAGES_ARCHIVE, 'nieaktualne'),
  ]);

  const seenUrls = new Set();
  const listings = [];
  for (const l of [...active.listings, ...archive.listings]) {
    if (seenUrls.has(l.detail_url)) continue;
    seenUrls.add(l.detail_url);
    listings.push(l);
  }

  const seenResultUrls = new Set();
  const resultRefs = [];
  for (const r of [...active.resultRefs, ...archive.resultRefs]) {
    if (seenResultUrls.has(r.detail_url)) continue;
    seenResultUrls.add(r.detail_url);
    resultRefs.push(r);
  }

  const enrichedListings = [];
  for (const l of listings) {
    let detailHtml;
    try {
      detailHtml = await getText(l.detail_url);
    } catch (err) {
      console.error(`  augustow detail fetch failed (${l.detail_url}): ${err.message}`);
      enrichedListings.push(l);
      continue;
    }
    const recs = parseAnnouncementDetail(detailHtml, l);
    if (recs.length === 0) {
      console.error(`  augustow: detail parse yielded 0 flat records (${l.detail_url})`);
      enrichedListings.push(l);
      continue;
    }
    enrichedListings.push(...recs);
  }

  const resolvedRefs = [];
  for (const ref of resultRefs) {
    let detailHtml;
    try {
      detailHtml = await getText(ref.detail_url);
    } catch (err) {
      console.error(`  augustow result detail fetch failed (${ref.detail_url}): ${err.message}`);
      continue;
    }

    const pdfUrl = attachmentUrlFromDetail(detailHtml, ORIGIN);
    if (!pdfUrl) {
      console.error(`  augustow result: no PDF attachment on ${ref.detail_url}`);
      continue;
    }

    let text = '';
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  augustow result PDF extract failed (${pdfUrl}): ${err.message}`);
      continue;
    }

    resolvedRefs.push({
      text,
      pdf_url: pdfUrl,
      auction_date: null,
    });
  }

  console.error(
    `  augustow: ${enrichedListings.length} flat record(s) from ${listings.length} announcement(s), ` +
    `${resolvedRefs.length} result PDF(s) resolved`,
  );
  return { listings: enrichedListings, resolvedRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [] };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resolvedRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active flat listing(s)`);
}
