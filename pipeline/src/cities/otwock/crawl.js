// Otwock crawler.
//
// Source: bip.otwock.pl — INTERmedi@ CMS-BIP 3.0 server-rendered HTML.
//
// Boards:
//   ANNOUNCEMENTS (menu 1018 "Przetargi"):
//     https://bip.otwock.pl/?bip=1&cid=1018&pg={page}
//   RESULTS (menu 1039 "Ogłoszenia o wyniku postępowania"):
//     https://bip.otwock.pl/?bip=1&cid=1039&pg={page}
//
// Document layer:
//   Notice details (address, area, starting price, date, outcome) reside in
//   attached scanned PDFs (200 dpi JPEG full-page scans).
//   Extract via pdfText, falling back to ocrPdf.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseListPage,
  attachmentPdfFromDetail,
  isAnnouncement,
  isResultNotice,
  parseAnnouncementDetail,
} from './parse.js';

const ORIGIN = 'https://bip.otwock.pl';
const MAX_PAGES_ACTIVE = 10;
const MAX_PAGES_RESULTS = 10;

export function announcementBoardUrl(page = 0) {
  return `${ORIGIN}/?bip=1&cid=1018&pg=${page}`;
}

export function resultBoardUrl(page = 0) {
  return `${ORIGIN}/?bip=1&cid=1039&pg=${page}`;
}

export async function extractAttachmentText(url) {
  if (!url) return '';
  if (/\.docx?$/i.test(url)) {
    try {
      return await docText(url);
    } catch (err) {
      console.error(`  otwock: docText failed (${url}): ${err.message}`);
      return '';
    }
  }
  // PDF: try native text first, fall back to OCR
  try {
    const text = await pdfText(url);
    if (text && text.trim().length > 30) return text;
  } catch {
    // fall through to OCR
  }
  try {
    return await ocrPdf(url);
  } catch (err) {
    console.error(`  otwock: ocrPdf failed (${url}): ${err.message}`);
    return '';
  }
}

let activePromise = null;

async function doCrawlActive() {
  const listings = [];
  const seenUrls = new Set();
  let verified = false;

  for (let page = 0; page < MAX_PAGES_ACTIVE; page++) {
    const url = announcementBoardUrl(page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  otwock: announcements page ${page} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListPage(html, ORIGIN);
    if (page === 0) {
      verified = items.length > 0 || /Brak\s+wiadomo[śs]ci/i.test(html);
    }
    if (items.length === 0) break;

    const announcements = items.filter((it) => isAnnouncement(it.title, it.summary));
    for (const item of announcements) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      let detailHtml = '';
      try {
        detailHtml = await getText(item.url);
      } catch (err) {
        console.error(`  otwock: announcement detail failed (${item.url}): ${err.message}`);
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

  console.error(`  otwock active: ${listings.length} listing(s) crawled`);
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
  const knownUrls = await loadKnownSourceUrls('otwock');
  const refs = [];
  const seenUrls = new Set();

  for (let page = 0; page < MAX_PAGES_RESULTS; page++) {
    const url = resultBoardUrl(page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  otwock: results page ${page} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListPage(html, ORIGIN);
    if (items.length === 0) break;

    const resultItems = items.filter((it) => isResultNotice(it.title, it.summary));
    for (const item of resultItems) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      let detailHtml = '';
      try {
        detailHtml = await getText(item.url);
      } catch (err) {
        console.error(`  otwock: result detail failed (${item.url}): ${err.message}`);
        continue;
      }

      const attUrl = attachmentPdfFromDetail(detailHtml, ORIGIN);
      if (!attUrl) {
        console.error(`  otwock: no attachment on result page ${item.url}`);
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

  console.error(`  otwock: ${refs.length} result doc ref(s) crawled`);
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
