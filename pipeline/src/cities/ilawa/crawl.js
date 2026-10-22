// Iława crawler — bip.umilawa.pl (systemdobip.pl platform).
//
// BOARD:
//   Primary section: https://bip.umilawa.pl/77/Przetargi_-_mienie_komunalne/
//   Clean server-rendered HTML listing with pagination (/77/Przetargi_-_mienie_komunalne/{page}/).
//   Announcements and result notices are published on the same section board.
//
// FORMAT & ATTACHMENTS:
//   Each notice page links downloadable attachments via /system/pobierz.php?...
//   Municipal notices consistently carry .docx or .doc attachments alongside
//   signed scan PDFs. docText extracts clean digital text directly; pdfText
//   and ocrPdf serve as fallbacks when only PDF is provided.
//
// BOT USER-AGENT:
//   bip.umilawa.pl requires a standard browser User-Agent in HTTP headers.

import { pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  resultAuctionDate,
  isResultNotice,
} from './parse.js';

export const ORIGIN = 'https://bip.umilawa.pl';
export const BOARD_PATH = '/77/Przetargi_-_mienie_komunalne/';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const FETCH_OPTS = { userAgent: BROWSER_UA };

export const MAX_PAGES = Number(process.env.ILAWA_MAX_PAGES) || 12;
export const MAX_RESULT_DOCS = Number(process.env.ILAWA_MAX_RESULT_DOCS) || 200;
export const CRAWL_BUDGET_MS = Number(process.env.ILAWA_CRAWL_BUDGET_MS) || 12 * 60 * 1000;
export const RESULT_MIN_YEAR = Number(process.env.ILAWA_RESULT_MIN_YEAR) || 2020;

// ── URL & HTML helpers ──────────────────────────────────────────────────────

export function boardUrl(page = 1) {
  return page <= 1 ? `${ORIGIN}${BOARD_PATH}` : `${ORIGIN}${BOARD_PATH}${page}/`;
}

export function resolveUrl(href) {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&'), ORIGIN).toString();
  } catch {
    return null;
  }
}

export function harvestItemsFromHtml(html) {
  if (!html) return [];
  const out = [];
  const regex = /<div class="information">\s*<p class="phx ph3">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    const title = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (url && title) {
      out.push({ url, title });
    }
  }
  return out;
}

export function isRentalOrOrdinance(title) {
  return /dzier[zż]aw|najem|zarz[aą]dzenie/i.test(title);
}

export function isResultTitle(title) {
  return /wynik|informacja\s+o\s+wyniku/i.test(title);
}

export function isAnnouncementTitle(title) {
  return /og[łl]oszenie/i.test(title) && !isResultTitle(title);
}

export function extractAttachmentUrls(html) {
  const attachments = [];
  const regex = /<a[^>]+href="([^"]*pobierz\.php[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = resolveUrl(m[1]);
    const label = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (href) {
      attachments.push({ href, label });
    }
  }

  // Filter out maps, photos, sketches
  const main = attachments.filter(
    (a) => !/mapa|zdj[ęe]cie|foto|ortofoto|wyrys|geodezyjn/i.test(a.label + ' ' + a.href),
  );
  const pool = main.length > 0 ? main : attachments;

  let docUrl = null;
  let pdfUrl = null;

  for (const item of pool) {
    const lower = item.href.toLowerCase();
    if (!docUrl && (lower.includes('.doc') || lower.includes('.docx'))) {
      docUrl = item.href;
    } else if (!pdfUrl && lower.includes('.pdf')) {
      pdfUrl = item.href;
    }
  }

  return { docUrl, pdfUrl };
}

export function extractInlineText(html) {
  if (!html) return '';
  const m = /<div class="information">([\s\S]*?)<\/div>/i.exec(html);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function extractAttachmentText(docUrl, pdfUrl, detailHtml = '') {
  // 1. Prefer doc / docx (pristine native text)
  if (docUrl) {
    try {
      const text = await docText(docUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch (err) {
      console.error(`  ilawa: docText failed for ${docUrl}: ${err.message}`);
    }
  }

  // 2. Try pdfText
  if (pdfUrl) {
    try {
      const text = await pdfText(pdfUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch (err) {
      console.error(`  ilawa: pdfText failed for ${pdfUrl}: ${err.message}`);
    }

    // 3. Fall back to OCR for scanned PDFs
    try {
      const text = await ocrPdf(pdfUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch (err) {
      console.error(`  ilawa: ocrPdf failed for ${pdfUrl}: ${err.message}`);
    }
  }

  // 4. Fallback to inline article text
  return extractInlineText(detailHtml);
}

// ── Main crawl logic (memoized) ─────────────────────────────────────────────

let crawlPromise = null;

async function crawlAll() {
  const startTime = Date.now();
  const deadline = startTime + CRAWL_BUDGET_MS;
  const known = await loadKnownSourceUrls('ilawa', { includeLand: true });

  const listings = [];
  const land = [];
  const resultRefs = [];
  const seenUrls = new Set();
  const today = new Date().toISOString().slice(0, 10);

  let boardAnnReached = false;
  let skippedKnown = 0;
  const maxPages = Number(process.env.ILAWA_MAX_PAGES) || MAX_PAGES;

  for (let page = 1; page <= maxPages; page++) {
    if (Date.now() > deadline) {
      console.error('  ilawa: crawl time budget reached, stopping pagination');
      break;
    }

    const url = boardUrl(page);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  ilawa: failed to fetch board page ${page} (${url}): ${err.message}`);
      break;
    }

    const items = harvestItemsFromHtml(html);
    if (items.length === 0) break;

    boardAnnReached = true;

    for (const item of items) {
      if (Date.now() > deadline || resultRefs.length >= MAX_RESULT_DOCS) break;
      if (isRentalOrOrdinance(item.title)) continue;

      if (isResultTitle(item.title)) {
        if (known.has(item.url)) {
          skippedKnown++;
          continue;
        }

        let detailHtml;
        try {
          detailHtml = await getText(item.url, FETCH_OPTS);
        } catch (err) {
          console.error(`  ilawa: failed to fetch result detail ${item.url}: ${err.message}`);
          continue;
        }

        const { docUrl, pdfUrl } = extractAttachmentUrls(detailHtml);
        const primaryDoc = docUrl || pdfUrl || item.url;
        if (seenUrls.has(primaryDoc) || known.has(primaryDoc)) {
          if (known.has(primaryDoc)) skippedKnown++;
          continue;
        }
        seenUrls.add(primaryDoc);

        const text = await extractAttachmentText(docUrl, pdfUrl, detailHtml);
        if (!text || !isResultNotice(text)) continue;

        const aDate = resultAuctionDate(text);
        if (aDate) {
          const yr = Number(aDate.slice(0, 4));
          if (Number.isFinite(yr) && yr < RESULT_MIN_YEAR) {
            continue;
          }
        }

        resultRefs.push({
          text,
          pdf_url: primaryDoc,
          auction_date: aDate,
        });
      } else if (isAnnouncementTitle(item.title)) {
        let detailHtml;
        try {
          detailHtml = await getText(item.url, FETCH_OPTS);
        } catch (err) {
          console.error(`  ilawa: failed to fetch announcement detail ${item.url}: ${err.message}`);
          continue;
        }

        const { docUrl, pdfUrl } = extractAttachmentUrls(detailHtml);
        const text = await extractAttachmentText(docUrl, pdfUrl, detailHtml);
        if (!text) continue;

        const recs = parseAnnouncement(item.title, text, item.url, docUrl || pdfUrl);
        for (const rec of recs) {
          if (rec.auction_date && rec.auction_date >= today) {
            if (rec.kind === 'grunt') {
              land.push(rec);
            } else {
              listings.push(rec);
            }
          }
        }
      }
    }
  }

  if (skippedKnown > 0) {
    console.error(`  ilawa: skipped ${skippedKnown} already-known result URL(s)`);
  }
  console.error(
    `  ilawa: parsed ${listings.length} active property listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
  );

  return {
    listings,
    wykaz: [],
    land,
    resultRefs,
    valid_empty: boardAnnReached && listings.length === 0,
    valid_empty_land: boardAnnReached && land.length === 0,
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

// ── CLI harness ─────────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        activeCount: active.listings.length,
        landCount: active.land.length,
        validEmpty: active.valid_empty,
        validEmptyLand: active.valid_empty_land,
        resultsCount: results.length,
        sampleListing: active.listings[0] || null,
        sampleLand: active.land[0] || null,
        sampleResult: results[0] ? { ...results[0], text: `[${results[0].text.length} chars]` } : null,
      },
      null,
      2,
    ) + '\n',
  );
}
