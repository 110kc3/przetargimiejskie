// Jędrzejów crawler.
//
// Source: bip.jedrzejow.eu — an IDcom.pl server-rendered HTML BIP.
//
// Board 3 == "Przetargi":
//   List: https://bip.jedrzejow.eu/wiadomosci/3/lista/{PAGE}
//   Detail: https://bip.jedrzejow.eu/wiadomosci/3/wiadomosc/{ID}/{slug}
//   Attachments: static PDF documents on bip-v1-files.idcom-jst.pl (scanned; OCR via ocrPdf with psm: 1)
//
// The board hosts announcements ("Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż..."),
// result notices ("Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż..."),
// and designation lists ("Wykaz nieruchomości przeznaczonych do sprzedaży...").
// Non-sale notices (leases, municipal vehicle sales, church restoration procurement) are filtered out.
//
// source: 'html' convention: result refs carry the extracted/OCR text in ref.text.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  buildRecordText,
  parseAuctionDate,
  parseAnnouncement,
  parseResultDoc,
  parseWykaz,
  isResultDoc,
  isAnnouncement,
  isWykaz,
  isLease,
} from './parse.js';

const ORIGIN = 'https://bip.jedrzejow.eu';
const boardUrl = (page) => `${ORIGIN}/wiadomosci/3/lista/${page}`;

const MAX_PAGES = 10;
const MAX_ARTICLES = 100;
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
  const real = headers.find((t) => t && !/^(?:menu|przetargi|ogłoszenia|urząd miejski)/i.test(t));
  return real || fallback || headers[0] || '';
}

export function attachmentPdfFromDetail(html) {
  if (!html) return null;
  const m = /href="([^"]*idcom-jst\.pl\/[^"]+\.pdf[^"]*)"/i.exec(html) ||
            /href="([^"]+\.pdf[^"]*)"/i.exec(html);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

const PL_MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05',
  czerwca: '06', lipca: '07', sierpnia: '08', 'września': '09', wrzesnia: '09',
  'października': '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

export function publishedDateFromDetail(html) {
  if (!html) return null;
  let m = /Data wytworzenia dokumentu:\s*<span>(\d{4}-\d{2}-\d{2})/i.exec(html);
  if (m) return m[1];

  m = /Data wytworzenia dokumentu:\s*<span>(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(html);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  m = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(html);
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function titleIsLease(title) {
  return /dzier[żz]aw|\bnajem\b|stanowisk\s+handlowych|ci[ąa]gnik|odbudowy\s+zabytk[oó]w|zam[oó]wie[ńn]\s+publicznych|[śs]wiadcze[ńn]\s+zdrowotnych/i.test(title || '');
}

async function extractAttachmentText(pdfUrl) {
  if (!pdfUrl) return '';
  try {
    const text = await pdfText(pdfUrl);
    if (text && text.trim().length >= 50) return text;
  } catch {
    // fallback to OCR
  }
  try {
    return await ocrPdf(pdfUrl, { psm: 1 });
  } catch (err) {
    console.error(`  jedrzejow: ocr failed (${pdfUrl}): ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const started = Date.now();
  const overBudget = () => Date.now() - started > DEADLINE_MS;

  // 1. Paginate the board
  const entries = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (overBudget()) break;
    let html;
    try {
      html = await getText(boardUrl(page));
    } catch (err) {
      console.error(`  jedrzejow: list page ${page} failed: ${err.message}`);
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

  // 2. Fetch details & attachments, route records
  const listings = [];
  const wykaz = [];
  const land = [];
  const resultRefs = [];

  for (const entry of entries.slice(0, MAX_ARTICLES)) {
    if (overBudget()) break;
    let html = '';
    try {
      html = await getText(entry.url);
    } catch (err) {
      console.error(`  jedrzejow: detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const title = detailTitle(html, entry.title);
    const publishedDate = publishedDateFromDetail(html);
    const pdfUrl = attachmentPdfFromDetail(html);
    const body = pdfUrl ? await extractAttachmentText(pdfUrl) : '';
    const recordText = buildRecordText({ title, body });

    if (isLease(recordText)) continue;

    if (isResultDoc(recordText)) {
      resultRefs.push({
        text: recordText,
        auction_date: parseAuctionDate(recordText, publishedDate),
        pdf_url: pdfUrl || entry.url,
        source_url: entry.url,
      });
      continue;
    }

    if (isAnnouncement(recordText)) {
      const items = parseAnnouncement(recordText, publishedDate, entry.url);
      for (const it of items) {
        const enriched = { ...it, published_date: publishedDate, detail_url: entry.url };
        (it.kind === 'grunt' ? land : listings).push(enriched);
      }
      continue;
    }

    if (isWykaz(recordText)) {
      const wykazItems = parseWykaz(recordText, publishedDate, entry.url);
      for (const w of wykazItems) {
        wykaz.push({ ...w, detail_url: entry.url, source_pdf: pdfUrl });
      }
      continue;
    }
  }

  console.error(
    `  jedrzejow: ${listings.length} active flat listing(s), ${wykaz.length} wykaz, ${land.length} land parcel(s), ${resultRefs.length} result doc(s)`,
  );

  return {
    listings,
    wykaz,
    land,
    resultRefs,
    valid_empty: false,
    valid_empty_land: false,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, wykaz, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        wykaz: wykaz.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleWykaz: wykaz[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
