// Słubice crawler.
//
// Source: bip.slubice.pl — bespoke Next.js SSR BIP platform.
//
// Boards:
//   ANNOUNCEMENTS & RESULTS (Category 193 "Sprzedaż mienia - przetargi"):
//     https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi
//
// Document layer:
//   Auction notices and results are published as scanned PDF attachments
//   (Develop ineo+ 451i office copier scans, CCITT-Fax / JPEG images @ 300 dpi).
//   Extract via pdfText, falling back to ocrPdf.
//   Attachment URLs in article HTML resolve via bip-api / bip-docrepo-api.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseListPage,
  attachmentPdfFromDetail,
  isAnnouncement,
  isResultNotice,
  parseAnnouncementDetail,
} from './parse.js';

const ORIGIN = 'https://bip.slubice.pl';
const BOARD_URL = `${ORIGIN}/kategorie/193-sprzedaz-mienia-przetargi`;
const MAX_PAGES = 5;

export function boardPageUrl(page = 0) {
  if (page === 0) return `${BOARD_URL}?lang=PL`;
  return `${BOARD_URL}?page=${page}&lang=PL`;
}

export async function extractAttachmentText(url) {
  if (!url) return '';
  // Try native pdftotext first
  try {
    const text = await pdfText(url);
    if (text && text.trim().length > 30) return text;
  } catch {
    // fall through to OCR
  }

  // Scanned PDF: route through tesseract -l pol
  try {
    return await ocrPdf(url);
  } catch (err) {
    console.error(`  slubice: ocrPdf failed (${url}): ${err.message}`);
    return '';
  }
}

let activePromise = null;

async function doCrawlActive() {
  const listings = [];
  const seenUrls = new Set();
  let verified = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = boardPageUrl(page);
    let html = '';
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  slubice: board page ${page} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListPage(html, ORIGIN);
    if (page === 0) {
      // Reaching the official board with content or explicit category header verifies the source
      verified = items.length > 0 ||
        /Sprzeda[żz]\s+mienia\s*[-–]\s*przetargi/i.test(html) ||
        /Brak\s+artyku[łl]/i.test(html);
    }
    if (items.length === 0) break;

    const announcements = items.filter((it) => isAnnouncement(it.title));
    for (const item of announcements) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      let detailHtml = '';
      try {
        detailHtml = await getText(item.url);
      } catch (err) {
        console.error(`  slubice: announcement detail failed (${item.url}): ${err.message}`);
      }

      const attUrl = detailHtml ? attachmentPdfFromDetail(detailHtml, ORIGIN) : null;
      let attText = '';
      if (attUrl) {
        attText = await extractAttachmentText(attUrl);
      }

      const records = parseAnnouncementDetail(detailHtml, attText, item);
      for (const rec of records) {
        listings.push({
          ...rec,
          source_pdf: attUrl,
        });
      }
    }
  }

  console.error(`  slubice active: ${listings.length} listing(s) crawled`);
  return {
    listings,
    wykaz: [],
    land: [],
    valid_empty: verified && listings.length === 0,
  };
}

export async function crawlActive() {
  activePromise ??= doCrawlActive();
  return activePromise;
}

let resultsPromise = null;

async function doCrawlResultDocs() {
  const knownUrls = await loadKnownSourceUrls('slubice');
  const refs = [];
  const seenUrls = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = boardPageUrl(page);
    let html = '';
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  slubice: results board page ${page} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListPage(html, ORIGIN);
    if (items.length === 0) break;

    const resultItems = items.filter((it) => isResultNotice(it.title));
    for (const item of resultItems) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      let detailHtml = '';
      try {
        detailHtml = await getText(item.url);
      } catch (err) {
        console.error(`  slubice: result detail failed (${item.url}): ${err.message}`);
        continue;
      }

      const attUrl = attachmentPdfFromDetail(detailHtml, ORIGIN);
      if (!attUrl) {
        console.error(`  slubice: no attachment on result page ${item.url}`);
        continue;
      }

      if (knownUrls.has(attUrl) || knownUrls.has(item.url)) {
        continue;
      }

      const attText = await extractAttachmentText(attUrl);
      if (!attText) continue;

      refs.push({
        text: attText,
        pdf_url: attUrl,
        auction_date: item.published_date,
        detail_url: item.url,
      });
    }
  }

  console.error(`  slubice: ${refs.length} result doc ref(s) crawled`);
  return refs;
}

export async function crawlResultDocs() {
  resultsPromise ??= doCrawlResultDocs();
  return resultsPromise;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        results: results.length,
        sampleListing: listings[0],
        sampleResult: results[0] && {
          pdf_url: results[0].pdf_url,
          auction_date: results[0].auction_date,
        },
      },
      null,
      2,
    ) + '\n',
  );
}
