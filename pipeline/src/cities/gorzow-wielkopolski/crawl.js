// Gorzów Wielkopolski crawler — two boards on bip.um.gorzow.pl, live-verified
// 2026-07-06:
//
//   ANNOUNCEMENTS  /przetargi/320/status/0/   (active)
//                  /przetargi/320/status/1/   (resolved / past)
//     • HTML table; rows are <tr class="odd|even"> with cells
//       td-date-1 (data ogłoszenia), td-date-2 (data i godzina przetargu),
//       td-title-1 (title + detail href), td-attachments-1 (PDF links at
//       /system/pobierz.php?plik=…pdf&id=…).
//     • Pagination puts the page number BEFORE the status segment:
//       /przetargi/320/2/status/1/, /przetargi/320/3/status/1/, …
//     • Flat batches: title contains "sprzedaż … lokali mieszkalnych";
//       one PDF lists 4-12 flats (parseAnnouncement splits them).
//
//   RESULTS        /509/  (newest) + /509/1/archiwum/Informacje_o_wynikach_…/N/
//     • Items are <div class="information"> blocks: <p class="phx ph3"> title +
//       an attachments list with the result PDF. ~10 items/page, 19 pages.
//     • Titles carry the auction date ("przeprowadzonych w dniu 5 lutego
//       2026r.") — extracted here because scanned PDFs have no text date.
//
// PDF text: announcements and results are born-digital PDFs EXCEPT recent
// EZD-printed scans (e.g. Ogłoszenie 34/2026, wynik 26.03.2026) whose text
// layer only holds the print footer. pdfText() is tried first; when it yields
// no usable content the crawler falls back to ocrPdf() (tesseract, cached).
//
// CI budget: crawlResultDocs uses known-URL skipping (data/…/properties.json)
// plus a wall-clock budget + page cap, so a cold first run cannot blow the
// 25-min job even if many scans need OCR — the rest backfills next run.
//
// See spike: spikes/lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isResultNotice, resultDateFromText } from './parse.js';

const ORIGIN = 'https://bip.um.gorzow.pl';
// The BIP intermittently 403s/empties on bot UAs (observed in the spike);
// a browser UA is reliable.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const RESULTS_ARCHIVE = `${ORIGIN}/509/1/archiwum/Informacje_o_wynikach_przetargow__2F_rokowan/`;

// Page caps (env-overridable for backfills). Boards hold ~10 rows/page.
const MAX_ACTIVE_PAGES = Number(process.env.GORZOW_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.GORZOW_MAX_RESOLVED_PAGES) || 6;
const MAX_RESULT_PAGES = Number(process.env.GORZOW_MAX_RESULT_PAGES) || 20;
// Wall-clock budget for the result-PDF fetch/extract loop.
const CRAWL_BUDGET_MS = Number(process.env.GORZOW_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

// ── HTML helpers ─────────────────────────────────────────────────────────────

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const deamp = (u) => (u || '').replace(/&amp;/g, '&');

// ── Announcements board ──────────────────────────────────────────────────────

/** Board URL for a given status (0 = active, 1 = resolved) and 1-based page. */
export function boardUrl(status, page) {
  return page <= 1
    ? `${ORIGIN}/przetargi/320/status/${status}/`
    : `${ORIGIN}/przetargi/320/${page}/status/${status}/`;
}

/**
 * Parse one announcements board page into row objects.
 * @param {string} html
 * @returns {Array<{detailUrl:string|null, title:string, announcedDate:string|null,
 *                  auctionDateRaw:string|null, pdfUrl:string|null}>}
 */
export function parseBoardPage(html) {
  const out = [];
  const rowRe = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html || '')) !== null) {
    const row = rm[1];

    const d1 = /td-date-1"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2})/.exec(row);
    const d2 = /td-date-2"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2})/.exec(row);

    const linkM = /td-title-1"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(row);
    if (!linkM) continue;

    // First PDF attachment = the main ogłoszenie (map annexes come after it).
    const attM = /<ul class="attachments">[\s\S]*?href="([^"]+?\.pdf[^"]*)"/i.exec(row);

    out.push({
      detailUrl: deamp(linkM[1]),
      title: stripTags(linkM[2]),
      announcedDate: d1 ? d1[1] : null,
      auctionDateRaw: d2 ? d2[1] : null,
      pdfUrl: attM ? deamp(attM[1]) : null,
    });
  }
  return out;
}

/**
 * Keep only flat-SALE auction announcements: "przetarg… na sprzedaż … lokali
 * mieszkalnych". Rentals, land-only, corrections, cancellations and rokowania
 * are skipped.
 * @param {string} title
 * @returns {boolean}
 */
export function isFlatSaleRow(title) {
  const t = (title || '').toLowerCase();
  if (/najem|dzier[żz]aw|rokowa[ńn]|rokowania|sprostowani|odwo[łl]a|uniewa[żz]n/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda[żz]/.test(t) && /lokal/.test(t) && /mieszkaln/.test(t);
}

// ── Results board ────────────────────────────────────────────────────────────

/**
 * Parse a /509/ page (root or archive) into { title, pdfUrl } items.
 * @param {string} html
 * @returns {Array<{title:string, pdfUrl:string|null}>}
 */
export function parseResultsPage(html) {
  const out = [];
  const blocks = (html || '').split(/<div class="information">/i);
  for (const block of blocks.slice(1)) {
    const titleM = /<p class="phx ph3">([\s\S]*?)<\/p>/i.exec(block);
    const title = titleM ? stripTags(titleM[1]) : '';
    const pdfM = /href="(https:\/\/bip\.um\.gorzow\.pl\/system\/pobierz\.php[^"]+?\.pdf[^"]*)"/i.exec(block);
    const pdfUrl = pdfM ? deamp(pdfM[1]) : null;
    if (title || pdfUrl) out.push({ title, pdfUrl });
  }
  return out;
}

/**
 * Keep result notices for SALES (przetargi and rokowania both sell flats);
 * skip dzierżawa/najem results.
 * @param {string} title
 * @returns {boolean}
 */
export function isSaleResultRow(title) {
  const t = (title || '').toLowerCase();
  if (/dzier[żz]aw|najem/.test(t)) return false;
  return /wynik/.test(t) && /sprzeda[żz]/.test(t);
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gorzow-wielkopolski: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

/**
 * Extract a PDF's text: pdftotext first, OCR fallback for EZD scans whose
 * text layer holds only the print footer. `usable` decides when to fall back.
 * @param {string} pdfUrl
 * @param {(text:string) => boolean} usable
 * @returns {Promise<string|null>}
 */
async function extractPdf(pdfUrl, usable) {
  let text = null;
  try {
    text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gorzow-wielkopolski: pdftotext failed (${pdfUrl}): ${err.message}`);
  }
  if (text && usable(text)) return text;
  try {
    // psm 1 (auto + orientation detection): Gorzów's EZD scans arrive rotated
    // (OSD reports 270°) — the default psm 3 OCRs them to garbage.
    const ocr = await ocrPdf(pdfUrl, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr && usable(ocr)) return ocr;
  } catch (err) {
    console.error(`  gorzow-wielkopolski: OCR fallback failed (${pdfUrl}): ${err.message}`);
  }
  return null;
}

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Crawl the active + resolved announcement boards, parse each flat-batch PDF
 * into per-flat listing records.
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
export async function crawlActive() {
  const listings = [];
  const seenPdfs = new Set();
  const seenDetails = new Set();

  for (const [status, maxPages] of [[0, MAX_ACTIVE_PAGES], [1, MAX_RESOLVED_PAGES]]) {
    for (let page = 1; page <= maxPages; page++) {
      const html = await fetchPage(boardUrl(status, page));
      if (!html) break;
      const rows = parseBoardPage(html);
      if (rows.length === 0) break;

      // Overflowing the page range makes some BIPs re-serve the last page —
      // stop when a page brings nothing new.
      const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
      if (fresh.length === 0) break;
      for (const r of fresh) seenDetails.add(r.detailUrl);

      for (const row of fresh) {
        if (!isFlatSaleRow(row.title)) continue;
        if (!row.pdfUrl || seenPdfs.has(row.pdfUrl)) continue;
        seenPdfs.add(row.pdfUrl);

        const text = await extractPdf(row.pdfUrl, (s) => /lokal\w*\s+mieszkaln/i.test(s));
        if (!text) {
          console.error(`  gorzow-wielkopolski: no usable text for ${row.pdfUrl} — skipped`);
          continue;
        }
        listings.push(
          ...parseAnnouncement(text, {
            pdfUrl: row.pdfUrl,
            detailUrl: row.detailUrl,
            fallbackAuctionDate: row.auctionDateRaw,
          }),
        );
      }

      if (rows.length < 10) break; // short page = last page
    }
  }

  console.error(`  gorzow-wielkopolski crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Crawl /509/ (newest) + its archive pages, fetch each sale-result PDF and
 * return refs with `.text` extracted (source:'html' → refresh.js hands each
 * ref's text straight to parseResultDoc).
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const refs = [];
  const seenPdfs = new Set();
  const known = await loadKnownSourceUrls('gorzow-wielkopolski');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skippedKnown = 0;

  // Page 0 = /509/ root (holds the newest, not-yet-archived notice).
  for (let page = 0; page <= MAX_RESULT_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  gorzow-wielkopolski: result-crawl budget exhausted — stopping early');
      break;
    }
    const url = page === 0 ? `${ORIGIN}/509/` : page === 1 ? RESULTS_ARCHIVE : `${RESULTS_ARCHIVE}${page}/`;
    const html = await fetchPage(url);
    if (!html) break;
    const items = parseResultsPage(html);
    if (items.length === 0) break;

    for (const item of items) {
      if (Date.now() > deadline) break;
      if (!isSaleResultRow(item.title)) continue;
      if (!item.pdfUrl || seenPdfs.has(item.pdfUrl)) continue;
      seenPdfs.add(item.pdfUrl);
      if (known.has(item.pdfUrl)) {
        skippedKnown++;
        continue;
      }

      const text = await extractPdf(item.pdfUrl, isResultNotice);
      if (!text) {
        console.error(`  gorzow-wielkopolski: no usable text for result ${item.pdfUrl} — skipped`);
        continue;
      }

      // Prefer the HTML title's auction date — scanned PDFs have no text date.
      const auction_date = resultDateFromText(item.title) || resultDateFromText(text) || null;
      refs.push({ text, pdf_url: item.pdfUrl, detail_url: item.pdfUrl, auction_date });
    }
  }

  if (skippedKnown) {
    console.error(`  gorzow-wielkopolski: skipped ${skippedKnown} already-known result PDF(s)`);
  }
  console.error(`  gorzow-wielkopolski crawlResultDocs: ${refs.length} result PDF(s)`);
  return refs;
}
