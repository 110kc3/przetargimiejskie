import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isResultDoc,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.lwowekslaski.pl';
const boardUrl = (page) => `${ORIGIN}/wiadomosci/3/lista/${page}`;

const MAX_PAGES = 8;
const MAX_ARTICLES = 150;
const DEADLINE_MS = 10 * 60 * 1000;

const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a>/g;

export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    const title = m[2].replace(/&amp;/g, '&').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

export function detailTitle(html, fallback = '') {
  if (!html) return fallback;
  const headers = [...html.matchAll(/<h2 class="header">([^<]*)<\/h2>/gi)].map((m) => m[1].trim());
  const real = headers.find((t) => t && t.toLowerCase() !== 'przetargi');
  return real || fallback || headers[0] || '';
}

export function attachmentPdfFromDetail(html) {
  if (!html) return null;
  const m = /href="(https:\/\/bip-v1-files\.idcom-jst\.pl\/[^"]+\.pdf[^"]*)"/i.exec(html);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

const PL_MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05',
  czerwca: '06', lipca: '07', sierpnia: '08', 'września': '09', wrzesnia: '09',
  'października': '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

export function publishedDateFromDetail(html) {
  if (!html) return null;
  const m = /Data wytworzenia dokumentu:\s*<span>(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(html);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(html);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

function titleIsLease(title) {
  return /dzier[żz]aw|\bnajem\b|oddanie\s+w\s+dzier/i.test(title || '');
}


let crawlPromise = null;

async function fetchRecord(entry) {
  let html = '';
  try {
    html = await getText(entry.url);
  } catch (err) {
    console.error(`  lwowek-slaski: detail fetch failed (${entry.url}): ${err.message}`);
    return null;
  }
  const title = detailTitle(html, entry.title);
  const published_date = publishedDateFromDetail(html);
  const pdfUrl = attachmentPdfFromDetail(html);
  let body = '';
  if (pdfUrl) {
    try {
      body = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  lwowek-slaski: pdf-text failed (${pdfUrl}): ${err.message}`);
    }
  }
  return { title, text: buildRecordText({ title, body }), published_date, url: entry.url };
}

async function crawlAll() {
  const started = Date.now();
  const overBudget = () => Date.now() - started > DEADLINE_MS;

  const entries = [];
  const seenUrls = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (overBudget()) break;
    let html;
    try {
      html = await getText(boardUrl(page));
    } catch (err) {
      console.error(`  lwowek-slaski: list page ${page} failed: ${err.message}`);
      break;
    }
    const pageEntries = parseListPage(html);
    let added = 0;
    for (const e of pageEntries) {
      if (seenUrls.has(e.url)) continue;
      seenUrls.add(e.url);
      added++;
      if (titleIsLease(e.title)) continue;
      entries.push(e);
    }
    if (added === 0) break;
    if (entries.length >= MAX_ARTICLES) break;
  }

  const listings = [];
  const land = [];
  const resultRefs = [];

  for (const entry of entries.slice(0, MAX_ARTICLES)) {
    if (overBudget()) break;
    const rec = await fetchRecord(entry);
    if (!rec) continue;
    const { text } = rec;
    if (isLease(text)) continue;

    if (isResultDoc(text)) {
      if (!isSaleAuction(text)) continue;
      resultRefs.push({
        text,
        auction_date: auctionDateFromText(text) || rec.published_date || null,
        pdf_url: rec.url,
      });
      continue;
    }

    if (!isSaleAuction(text)) continue;
    const parsed = parseAnnouncement(text);
    if (!parsed) continue;
    const enriched = { ...parsed, published_date: rec.published_date, detail_url: rec.url, source_url: rec.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  lwowek-slaski: ${listings.length} unit listing(s), ${land.length} land parcel(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
