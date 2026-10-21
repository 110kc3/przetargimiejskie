// Kościerzyna crawler.
//
// Source: bip.koscierzyna.gda.pl — INTERmedi@ CMS-BIP server-rendered HTML.
//
// Boards:
//   Announcements and results are categorized by year under "Ogłoszenia o przetargach i aukcjach" (cid=206):
//     https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid={cid}&pg={page}
//   Known year category IDs:
//     2026: 557, 2025: 501, 2024: 454, 2023: 437, 2022: 424, 2021: 360, 2020: 209, 2019: 208.
//
// Document layer:
//   Notice details reside in attached born-digital text PDFs (pdfText).
//   Results ("Wyniki przetargu") are attached to the same announcement article after the auction;
//   some are born-digital text PDFs, while older or scanned notices require OCR fallback via ocrPdf.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseListPage,
  attachmentPdfFromDetail,
  resultPdfFromDetail,
  isAnnouncement,
  isResultNotice,
  parseAnnouncementDetail,
} from './parse.js';

export const ORIGIN = 'https://bip.koscierzyna.gda.pl';
const MAX_PAGES_PER_YEAR = 5;

export const YEAR_CIDS = [
  { year: 2026, cid: 557 },
  { year: 2025, cid: 501 },
  { year: 2024, cid: 454 },
  { year: 2023, cid: 437 },
  { year: 2022, cid: 424 },
  { year: 2021, cid: 360 },
  { year: 2020, cid: 209 },
  { year: 2019, cid: 208 },
];

export function yearBoardUrl(cid, page = 0) {
  return `${ORIGIN}/?bip=1&bsc=N&cid=${cid}&pg=${page}`;
}

export async function discoverYearCids(origin = ORIGIN) {
  try {
    const html = await getText(`${origin}/?bip=1&cid=206`);
    const idx = html.lastIndexOf('Ogłoszenia o&nbsp;przetargach i&nbsp;aukcjach');
    if (idx !== -1) {
      const section = html.slice(idx, idx + 2500);
      const reg = /<a[^>]+href="[^"]*cid=(\d+)[^"]*"[^>]*>(\d{4})<\/a>/gi;
      const discovered = new Map();
      let m;
      while ((m = reg.exec(section)) !== null) {
        const year = Number(m[2]);
        const cid = Number(m[1]);
        if (year >= 2018 && year <= 2040 && !discovered.has(year)) {
          discovered.set(year, cid);
        }
      }
      if (discovered.size > 0) {
        return [...discovered.entries()]
          .map(([year, cid]) => ({ year, cid }))
          .sort((a, b) => b.year - a.year);
      }
    }
  } catch (err) {
    console.error(`  koscierzyna: year category discovery failed: ${err.message}`);
  }
  return YEAR_CIDS;
}

export async function extractAttachmentText(url) {
  if (!url) return '';
  if (/\.docx?$/i.test(url)) {
    try {
      return await docText(url);
    } catch (err) {
      console.error(`  koscierzyna: docText failed (${url}): ${err.message}`);
      return '';
    }
  }
  // Try native text first, fall back to OCR
  try {
    const text = await pdfText(url);
    if (text && text.trim().length > 30) return text;
  } catch {
    // fall through to OCR
  }
  try {
    return await ocrPdf(url);
  } catch (err) {
    console.error(`  koscierzyna: ocrPdf failed (${url}): ${err.message}`);
    return '';
  }
}

let activePromise = null;

async function doCrawlActive() {
  const listings = [];
  const seenUrls = new Set();
  let verified = false;

  const allYears = await discoverYearCids(ORIGIN);
  const currentYear = new Date().getFullYear();
  // Active listings exist in current year and previous year boards
  const activeYears = allYears.filter((y) => y.year >= currentYear - 1);

  for (const { year, cid } of activeYears) {
    for (let page = 0; page < MAX_PAGES_PER_YEAR; page++) {
      const url = yearBoardUrl(cid, page);
      let html;
      try {
        html = await getText(url);
      } catch (err) {
        console.error(`  koscierzyna: year ${year} (cid=${cid}) page ${page} fetch failed: ${err.message}`);
        break;
      }

      const items = parseListPage(html, ORIGIN);
      if (page === 0 && year === currentYear) {
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
          console.error(`  koscierzyna: announcement detail failed (${item.url}): ${err.message}`);
          continue;
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
  }

  console.error(`  koscierzyna active: ${listings.length} listing(s) crawled`);
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
  const knownUrls = await loadKnownSourceUrls('koscierzyna');
  const refs = [];
  const seenUrls = new Set();

  const allYears = await discoverYearCids(ORIGIN);

  for (const { year, cid } of allYears) {
    for (let page = 0; page < MAX_PAGES_PER_YEAR; page++) {
      const url = yearBoardUrl(cid, page);
      let html;
      try {
        html = await getText(url);
      } catch (err) {
        console.error(`  koscierzyna: results year ${year} (cid=${cid}) page ${page} fetch failed: ${err.message}`);
        break;
      }

      const items = parseListPage(html, ORIGIN);
      if (items.length === 0) break;

      for (const item of items) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        let detailHtml = '';
        try {
          detailHtml = await getText(item.url);
        } catch (err) {
          console.error(`  koscierzyna: detail fetch failed (${item.url}): ${err.message}`);
          continue;
        }

        const resPdfUrl = resultPdfFromDetail(detailHtml, ORIGIN);
        if (!resPdfUrl) continue;

        if (knownUrls.has(resPdfUrl) || knownUrls.has(item.url)) {
          continue;
        }

        const attText = await extractAttachmentText(resPdfUrl);
        if (!attText) continue;

        refs.push({
          text: attText,
          pdf_url: resPdfUrl,
          auction_date: item.published_date,
          detail_url: item.url,
        });
      }
    }
  }

  console.error(`  koscierzyna: ${refs.length} result doc ref(s) crawled`);
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
