// Gorzów Wielkopolski crawler — two BIP boards, both returning HTML tables with
// PDF attachments (born-digital, pdftotext -layout extracts clean text):
//
//   ANNOUNCEMENTS board: https://bip.um.gorzow.pl/przetargi/320/status/
//     • Table of active auctions; rows carry detail URL + PDF attachment.
//     • Pagination: /przetargi/320/status/ (active, ~4 rows), no sub-pages needed
//       for active-only. For history: /przetargi/320/status/0/, /status/0/2/ etc.
//     • Each row: date-1 (ogłoszenia), date-2 (przetargu), title+detail-href, attachments.
//     • Flat-batch PDFs: "sprzedaż … lokali mieszkalnych" — one PDF lists all flats.
//     • Filter: keep only "sprzedaż" + "lokal" titles; skip najem/dzierżawa/rokowania.
//
//   RESULTS board: https://bip.um.gorzow.pl/509/1/archiwum/…/ (paginated)
//     • Each entry: title + PDF attachment. Flat results: "lokali mieszkalnych" in title.
//     • Pagination: /509/1/archiwum/Informacje_o_wynikach_przetargow__2F_rokowan/N/
//
// The crawl is split: crawlActive() reads the announcements board; crawlResultDocs()
// reads the results archive. Because PDFs are text-based, pdfText() is used inline
// (source:'html' → refresh.js hands each result ref's .text to parseResultDoc).
//
// Live-verified 2026-06-27:
//   Announcement PDF: bip.um.gorzow.pl/system/obj/59130_Ogloszenie_nr_61-2025.pdf
//   Result PDF:       pobierz.php?plik=informacja_o_wyniku_przetargu.pdf&id=a7a56…

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncement, parseResultDoc, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.um.gorzow.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Announcements board: status/0/ = active (current), status/1/ = resolved (past)
const ANN_BOARD_ACTIVE = `${ORIGIN}/przetargi/320/status/0/`;
const ANN_BOARD_RESOLVED = `${ORIGIN}/przetargi/320/status/1/`;
// Results archive root
const RESULTS_ARCHIVE = `${ORIGIN}/509/1/archiwum/Informacje_o_wynikach_przetargow__2F_rokowan/`;

const MAX_ANN_PAGES = 20;
const MAX_RESULT_PAGES = 30;

// ── HTML helpers ──────────────────────────────────────────────────────────────

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&rsaquo;/gi, '›')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "2026-05-25 09:35:00" → "2026-05-25"
function isoDate(s) {
  const m = /(\d{4}-\d{2}-\d{2})/.exec(s || '');
  return m ? m[1] : null;
}

// ── Board row parser ──────────────────────────────────────────────────────────

/**
 * Parse one HTML board page (announcements list) into row objects.
 * Each row: { detailUrl, title, announcedDate, auctionDateRaw, pdfUrl }
 * @param {string} html
 * @returns {Array<object>}
 */
export function parseBoardPage(html) {
  const out = [];
  // Each row is <tr class="odd|even">…</tr>
  const rowRe = /<tr\s+class="(?:odd|even)">([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const row = rm[1];

    // date-1: announcement date
    const d1m = /<td class="td-date-1">.*?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/.exec(row);
    const announcedDate = d1m ? d1m[1].slice(0, 10) : null;

    // date-2: auction date
    const d2m = /<td class="td-date-2">.*?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/.exec(row);
    const auctionDateRaw = d2m ? d2m[1].slice(0, 10) : null;

    // detail URL + title from td-title-1 <a href="…">title</a>
    const linkM = /<td class="td-title-1">.*?<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/s.exec(row);
    if (!linkM) continue;
    const detailUrl = linkM[1];
    const title = stripTags(linkM[2]);

    // PDF attachment: first .pdf href in td-attachments-1
    const attM = /href="(https:\/\/bip\.um\.gorzow\.pl\/system\/(?:pobierz\.php|obj\/)[^"]+\.pdf[^"]*)"/i.exec(row);
    const pdfUrl = attM ? attM[1].replace(/&amp;/g, '&') : null;

    out.push({ detailUrl, title, announcedDate, auctionDateRaw, pdfUrl });
  }
  return out;
}

/**
 * Classify an announcement board row as a flat-sale row we should fetch.
 * Returns true when the title signals a residential flat sale (*przetarg* + *sprzedaż* +
 * *lokal*); false for rentals, commercial-only, land, najem, dzierżawa, rokowania,
 * sprostowania, and cancelled auctions.
 * @param {string} title
 * @returns {boolean}
 */
export function isFlatSaleRow(title) {
  const t = (title || '').toLowerCase();
  // Skip rentals, withdrawals, corrections, negotiations, licence sales
  if (/\bnajem\b|dzier[zż]aw|sprostowanie|odwo[łl]anie|uniewa[zż]ni|rokowania/.test(t)) return false;
  // Skip rows that are land/niezabudowane only (no lokal) or purely commercial (lokali użytkowych)
  if (/nieruchomo[śs]ci niezabudowan/.test(t) && !/lokal/.test(t)) return false;
  if (/lokal[ai]\s+u[żz]ytkow/.test(t) && !/lokal[ai]\s+mieszk/.test(t)) return false;
  // Include: sprzedaż + lokal + przetarg
  return /sprzeda[zż]/.test(t) && /lokal/.test(t) && /przetarg/.test(t);
}

// ── Result-archive page parser ─────────────────────────────────────────────

/**
 * Parse one results-archive page into { title, pdfUrl } objects.
 * @param {string} html
 * @returns {Array<{title:string, pdfUrl:string|null}>}
 */
export function parseResultsPage(html) {
  const out = [];
  // Split on opening <div class="information"> — handles arbitrary nested content
  // and does not require a trailing terminator (lookahead approach missed last block).
  const blocks = html.split(/<div\s+class="information">/i);
  for (const block of blocks.slice(1)) {
    const titleM = /<p class="phx ph3">([\s\S]*?)<\/p>/i.exec(block);
    const title = titleM ? stripTags(titleM[1]) : '';
    // PDF attachment
    const pdfM = /href="(https:\/\/bip\.um\.gorzow\.pl\/system\/pobierz\.php[^"]+\.pdf[^"]*)"/i.exec(block);
    const pdfUrl = pdfM ? pdfM[1].replace(/&amp;/g, '&') : null;
    if (title || pdfUrl) out.push({ title, pdfUrl });
  }
  return out;
}

/**
 * True when a results-board title looks like a flat-sale result notice.
 * Accepts "sprzedaż lokali mieszkalnych" and the generic "sprzedaż nieruchomości"
 * (since the flat batch may use the generic wording — we parse the PDF body to
 * confirm). Excludes dzierżawa/najem/rokowania.
 * @param {string} title
 * @returns {boolean}
 */
export function isResultFlatRow(title) {
  const t = (title || '').toLowerCase();
  if (/dzier[zż]aw|najem|rokowania/.test(t)) return false;
  return /wynik.*przetarg|przetarg.*wynik/.test(t) && /sprzeda[zż]/.test(t);
}

// ── Fetchers ───────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gorzow-wielkopolski: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

async function fetchPdfText(pdfUrl) {
  try {
    return await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gorzow-wielkopolski: PDF extract failed (${pdfUrl}): ${err.message}`);
    return null;
  }
}

// ── crawlActive ────────────────────────────────────────────────────────────

/**
 * Crawl the active + resolved announcement boards, filter flat-sale rows, parse
 * each batch PDF and return individual flat listing records.
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
export async function crawlActive() {
  const listings = [];
  const seenPdfs = new Set();

  // Crawl both active (status/0/) and resolved (status/1/) boards — the resolved
  // board still has announcements whose outcome is not yet in the results stream.
  for (const boardBase of [ANN_BOARD_ACTIVE, ANN_BOARD_RESOLVED]) {
    for (let page = 0; page < MAX_ANN_PAGES; page++) {
      const url = page === 0 ? boardBase : `${boardBase}${page + 1}/`;
      const html = await fetchPage(url);
      if (!html) break;

      const rows = parseBoardPage(html);
      if (rows.length === 0) break;

      for (const row of rows) {
        if (!isFlatSaleRow(row.title)) continue;
        if (!row.pdfUrl || seenPdfs.has(row.pdfUrl)) continue;
        seenPdfs.add(row.pdfUrl);

        const text = await fetchPdfText(row.pdfUrl);
        if (!text) continue;

        // Each batch PDF has a table with multiple flats — parse them all
        const recs = parseAnnouncement(text, {
          pdfUrl: row.pdfUrl,
          detailUrl: row.detailUrl,
          announcedDate: row.announcedDate,
          fallbackAuctionDate: row.auctionDateRaw,
        });
        for (const r of recs) {
          listings.push(r);
        }
      }

      // Stop when fewer rows than expected (last page) or no next-page hint
      if (rows.length < 10 || !html.includes(`${boardBase}${page + 2}/`)) break;
    }
  }

  console.error(`  gorzow-wielkopolski crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ── crawlResultDocs ────────────────────────────────────────────────────────

/**
 * Crawl the results archive (/509/1/archiwum/…/), fetch each result PDF, and
 * return refs with the extracted text so refresh.js can call parseResultDoc.
 * source:'html' → refs carry .text (already extracted here).
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const refs = [];
  const seenPdfs = new Set();

  for (let page = 1; page <= MAX_RESULT_PAGES; page++) {
    const url = page === 1
      ? RESULTS_ARCHIVE
      : `${RESULTS_ARCHIVE}${page}/`;
    const html = await fetchPage(url);
    if (!html) break;

    const items = parseResultsPage(html);
    if (items.length === 0) break;

    for (const item of items) {
      if (!isResultFlatRow(item.title)) continue;
      if (!item.pdfUrl || seenPdfs.has(item.pdfUrl)) continue;
      seenPdfs.add(item.pdfUrl);

      const text = await fetchPdfText(item.pdfUrl);
      if (!text) continue;
      if (!isResultNotice(text)) continue;

      // Extract auction date from the PDF text (format: "dnia DD ... YYYY r.")
      const dateM = /przeprowadzonych?\s+dnia\s+(\d{1,2})\s+([^\s]+)\s+(\d{4})r?\.?/i.exec(text);
      let auction_date = null;
      if (dateM) {
        const PL = {
          stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05', czerwca: '06',
          lipca: '07', sierpnia: '08, września': '09', wrzesnia: '09', 'września': '09',
          'października': '10', pazdziernika: '10', listopada: '11', grudnia: '12',
        };
        const mo = PL[dateM[2].toLowerCase()];
        if (mo) auction_date = `${dateM[3]}-${mo}-${String(dateM[1]).padStart(2, '0')}`;
      }

      refs.push({ text, pdf_url: item.pdfUrl, detail_url: item.pdfUrl, auction_date });
    }

    // Stop when there's no link to the next page
    const nextUrl = `${RESULTS_ARCHIVE}${page + 1}/`;
    if (!html.includes(nextUrl)) break;
  }

  console.error(`  gorzow-wielkopolski crawlResultDocs: ${refs.length} result PDF(s)`);
  return refs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, results: results.length, sampleListing: listings[0] }, null, 2) + '\n',
  );
}
