// Płońsk crawler — fetches municipal property tenders from BIP Urząd Miejski w Płońsku.
// Parent node: https://umplonsk.bip.org.pl/id/1999 (Przetargi)
//
// Per-year boards:
//   2026: /id/2602, 2025: /id/2482, 2024: /id/2407,
//   2023: /id/2234, 2022: /id/2131, 2021: /id/2000
//
// Announcements and result notices are interleaved on the per-year boards as file attachments.
// Attachment file types are mixed: .docx and .pdf (both born-digital and scanned).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  htmlToText,
  isResultDoc,
  isAnnouncementDoc,
  parseAnnouncement,
  parseResultDoc,
} from './parse.js';

const ORIGIN = 'https://umplonsk.bip.org.pl';
const PARENT_URL = `${ORIGIN}/id/1999`;

// Known historical year boards (fallback if parent node parsing changes)
const KNOWN_YEAR_IDS = [2602, 2482, 2407, 2234, 2131, 2000];

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

let crawlPromise = null;

/** Helper to extract text from a .docx or .pdf attachment */
async function fetchAttachmentText(url) {
  if (url.endsWith('.docx') || url.endsWith('.doc')) {
    return await docText(url);
  }
  if (url.endsWith('.pdf')) {
    let text = await pdfText(url);
    if (!text || text.trim().length < 50) {
      text = await ocrPdf(url);
    }
    return text || '';
  }
  return '';
}

/** Discovers year board IDs under parent node /id/1999. */
export async function discoverYearBoards() {
  const ids = new Set(KNOWN_YEAR_IDS);
  try {
    const html = await getText(PARENT_URL, FETCH_OPTS);
    const parentIdx = html.indexOf('/id/1999');
    if (parentIdx !== -1) {
      const subTree = html.slice(parentIdx, parentIdx + 4000);
      const matches = [...subTree.matchAll(/<a\s+href=\"\/id\/(\d+)\"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of matches) {
        const text = m[2].replace(/<[^>]+>/g, '').trim();
        if (/^20\d\d$/.test(text)) {
          ids.add(Number(m[1]));
        }
      }
    }
  } catch (err) {
    console.error(`  plonsk: parent board discovery warning: ${err.message}`);
  }
  // Return in descending order (newest years first)
  return [...ids].sort((a, b) => b - a);
}

/** Parses attachment items from a year board's HTML. */
export function itemsFromBoardHtml(html, boardUrl) {
  const start = html.indexOf('class="attachments');
  if (start === -1) return [];

  const end = html.indexOf('Informacje o dokumencie:', start);
  const chunk = html.slice(start, end !== -1 ? end : start + 12000);
  const items = [];

  const rowRegex = /<div class="row">([\s\S]*?)<\/div>\s*<\/div>\s*<\/li>/gi;
  let m;
  while ((m = rowRegex.exec(chunk)) !== null) {
    const rowHtml = m[1];
    const hrefM = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(rowHtml);
    if (!hrefM) continue;

    const rawHref = hrefM[1];
    if (!rawHref.includes('/pliki/')) continue;
    // Strip query strings (?20261021232144) for canonical document URL
    const cleanPath = rawHref.split('?')[0];
    const fullUrl = cleanPath.startsWith('http') ? cleanPath : ORIGIN + cleanPath;

    const title = htmlToText(hrefM[2]).replace(/^(?:pdf|docx)\s+/i, '').trim();
    const dateM = /Data dodania:\s*<strong>([^<]+)<\/strong>/i.exec(rowHtml);
    const publishedDate = dateM ? dateM[1].trim().split(' ')[0] : null;

    items.push({
      url: fullUrl,
      title,
      publishedDate,
      boardUrl,
    });
  }

  return items;
}

/**
 * Single memoized crawl across all Płońsk year boards.
 * Fetches attachments, classifies flat vs land vs result, extracts data.
 */
export async function crawlAll() {
  const yearIds = await discoverYearBoards();
  const listings = [];
  const land = [];
  const resultRefs = [];
  const seenUrls = new Set();
  let totalItems = 0;

  for (const yearId of yearIds) {
    const boardUrl = `${ORIGIN}/id/${yearId}`;
    let html;
    try {
      html = await getText(boardUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  plonsk: failed to fetch board ${boardUrl}: ${err.message}`);
      continue;
    }

    const items = itemsFromBoardHtml(html, boardUrl);
    totalItems += items.length;

    for (const item of items) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      // Skip qualification lists ("Lista osób zakwalifikowanych")
      if (/lista\s+os[oó]b\s+zakwalifikowanych/i.test(item.title)) {
        continue;
      }

      let text = '';
      try {
        text = await fetchAttachmentText(item.url);
      } catch (err) {
        console.error(`  plonsk: failed to extract text from ${item.url}: ${err.message}`);
        continue;
      }

      if (isResultDoc(item.title, text)) {
        resultRefs.push({
          text,
          url: item.url,
          pdf_url: item.url,
          title: item.title,
          published_date: item.publishedDate,
          auction_date: null,
        });
      } else if (isAnnouncementDoc(item.title, text)) {
        const rec = parseAnnouncement(item.title, text, item.url, item.boardUrl, item.publishedDate);
        if (rec) {
          if (rec.kind === 'grunt') {
            land.push(rec);
          } else if (rec.address) {
            listings.push(rec);
          }
        }
      }
    }
  }

  console.error(
    `  plonsk: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ` +
      `${resultRefs.length} result notice(s) from ${totalItems} attachment(s) across ${yearIds.length} year boards`,
  );

  return {
    listings,
    land,
    resultRefs,
    validEmpty: listings.length === 0 && totalItems > 0,
    validEmptyLand: land.length === 0 && totalItems > 0,
  };
}

/** Active flat & building listings + land plots. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, validEmpty, validEmptyLand } = await crawlPromise;
  return {
    listings,
    wykaz: [],
    land,
    valid_empty: validEmpty,
    valid_empty_land: validEmptyLand,
  };
}

/** Result document references for the achieved-price stream. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export { parseResultDoc };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  console.log(JSON.stringify({ activeCount: active.listings.length, landCount: active.land.length, resultCount: results.length }, null, 2));
}
