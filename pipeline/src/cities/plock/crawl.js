// Płock (ARS Sp. z o.o.) crawler — two paginated HTML boards on the same
// server-rendered site:
//
//   ANNOUNCE_PATH  /pl/przetargi/ogloszenia-o-przetargach[/N]   ("Ogłoszenia")
//   RESULTS_PATH   /pl/przetargi/wyniki-przetargow[/N]           ("Wyniki")
//
// Each board page is a run of `<div class="listing">` items (title + link +
// "Dodano: DD-MM-YYYY" publish date); item links point at either
// `/pl/przetargi/<id>/<slug>` or `/pl/Auction/Details/<id>?title=<slug>` —
// both render the SAME detail template (verified live 2026-07-18), a short
// `<div class="standard-content">` body + a "Załączniki" attachment list
// (`/pl/AttachmentGallery/GetAttachment/<id>`, filename "Ogloszenie.pdf" /
// "Regulamin.pdf" on the announce board, "protokol.pdf" on the results board).
// The exact last page number is read straight off the `pagingPanel` on page 1
// (no blind iteration needed).
//
// HTTP ONLY. https://www.ars.plock.pl resets the TLS handshake ("Recv
// failure: Connection reset by peer" during the ClientHello — verified live
// 2026-07-18 with curl -v); http:// works fine (matches the spike's "HTTP
// also works" note).
//
// PDFs are a MIX of born-digital and SCANNED (Producer "KONICA MINOLTA bizhub
// C458" — no text layer) on BOTH boards: the Synagogalna 13 flat's
// announcement (GetAttachment/569) and one of its two result protocols
// (GetAttachment/573) are born-digital, but the Sienkiewicza 64 building's
// announcement (GetAttachment/538, 8 pages) and its result protocol
// (GetAttachment/543) are scanned. extractPdfText() tries the cheap pdfText
// first and falls back to OCR (core/ocr-pdf.js) when the quick text is empty
// or too short — the kwidzyn/zabkowice-slaskie idiom — for BOTH streams.
//
// BOUNDED (ADAPTER-GUIDE §5, and per the build brief — a prior research agent
// got this host rate-limited by making ~150 requests): MAX_PAGES caps board
// pagination (spike measured 8 announce / 6 results pages — plenty of
// margin), MAX_DETAILS caps how many notice detail pages (+ their PDF/OCR) are
// fetched per run, and CRAWL_BUDGET_MS is a wall-clock backstop. Non-sale
// items (rentals, construction/procurement) are dropped by TITLE before any
// detail page is even fetched, which is what keeps the real fetch count low —
// ARS's low volume (2-5 flat/building sale auctions/yr) means the filtered
// candidate set is always small. crawlResultDocs() additionally skips any
// notice whose detail URL is already captured in the committed data
// (core/known-urls.js) — safe because that only applies to CONCLUDED results.

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { urlCacheKey } from '../../core/hash.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isSaleTitle } from './parse.js';

const BASE = 'http://www.ars.plock.pl';
const ANNOUNCE_PATH = '/pl/przetargi/ogloszenia-o-przetargach';
const RESULTS_PATH = '/pl/przetargi/wyniki-przetargow';

const MAX_PAGES = Number(process.env.PLOCK_MAX_PAGES) || 15; // spike: ~8/~6 pages; margin for growth
const MAX_DETAILS = Number(process.env.PLOCK_MAX_DETAILS) || 40; // politeness cap
const CRAWL_BUDGET_MS = Number(process.env.PLOCK_CRAWL_BUDGET_MS) || 8 * 60 * 1000;

const PDFTEXT_CACHE_DIR = fileURLToPath(new URL('../../../pdf-text-cache/', import.meta.url));

function abs(href) {
  if (/^https?:\/\//i.test(href)) return href;
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

/** Strip tags + decode the entities this site actually emits (numeric decimal
 *  entities for accented letters, e.g. "&#243;" -> "ó"; "&amp;"/"&nbsp;"). */
function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---- board list parsing -----------------------------------------------------

/** One board page's items: [{ title, detail_url, published_date }]. Matches
 *  both `/pl/przetargi/<id>/<slug>` and `/pl/Auction/Details/<id>?title=..`
 *  links transparently (both sit inside the same `listing-title` markup). */
export function parseListItems(html) {
  const out = [];
  const re = /<div class="listing-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const href = m[1].replace(/&amp;/gi, '&');
    const title = stripTags(m[2]);
    // Window starts AFTER the matched title element (not at m.index): a long
    // slug/title can itself run past a fixed offset from m.index, pushing the
    // "Dodano:" date beyond a window measured from the match start.
    const afterTitle = m.index + m[0].length;
    const window = html.slice(afterTitle, afterTitle + 400);
    const dateM = /Dodano:\s*<b>(\d{2})-(\d{2})-(\d{4})<\/b>/.exec(window);
    const published_date = dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}` : null;
    out.push({ title, detail_url: abs(href), published_date });
  }
  return out;
}

/** Last page number straight off the `pagingPanel` on page 1 (capped by
 *  MAX_PAGES). Returns 1 when there's no paging panel (a single-page board). */
export function maxPageFromPagingPanel(html) {
  const panelM = /<div class="pagingPanel">([\s\S]*?)<\/div>/i.exec(html || '');
  if (!panelM) return 1;
  const nums = [...panelM[1].matchAll(/\/(\d+)"/g)].map((x) => Number(x[1]));
  return nums.length ? Math.min(MAX_PAGES, Math.max(1, ...nums)) : 1;
}

async function fetchBoardPage(basePath, page) {
  const url = page <= 1 ? `${BASE}${basePath}` : `${BASE}${basePath}/${page}`;
  return getText(url);
}

async function crawlBoard(basePath, label) {
  const items = [];
  let html;
  try {
    html = await fetchBoardPage(basePath, 1);
  } catch (err) {
    console.error(`  plock ${label} page 1 fetch failed: ${err.message}`);
    return items;
  }
  items.push(...parseListItems(html));
  const maxPage = maxPageFromPagingPanel(html);
  for (let p = 2; p <= maxPage; p++) {
    try {
      html = await fetchBoardPage(basePath, p);
    } catch (err) {
      console.error(`  plock ${label} page ${p} fetch failed: ${err.message}`);
      break;
    }
    const pageItems = parseListItems(html);
    if (pageItems.length === 0) break;
    items.push(...pageItems);
  }
  console.error(`  plock ${label}: ${items.length} item(s) across ${maxPage} page(s)`);
  return items;
}

// ---- detail page parsing -----------------------------------------------------

/** The `<div class="standard-content">` body prose, tags stripped. */
export function bodyTextFromDetail(html) {
  const m = /<div class="standard-content">([\s\S]*?)<\/div>/i.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

/** Every "Załączniki" attachment link: [{ url, name }]. */
export function attachmentsFromDetail(html) {
  const out = [];
  const re = /<a\s+href="([^"]*GetAttachment\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    out.push({ url: abs(m[1].replace(/&amp;/gi, '&')), name: stripTags(m[2]) });
  }
  return out;
}

/** The notice's primary PDF (skip "Regulamin.pdf" — the auction rules
 *  boilerplate, never the notice/protocol itself). */
function primaryAttachment(atts) {
  return atts.find((a) => !/regulamin/i.test(a.name)) || atts[0] || null;
}

/** pdfText (born-digital fast path) if it yields real text, else OCR. Any
 *  tiny pdfText \f-junk cache file is removed first so pdf-text-cache is
 *  never polluted with 1-2 byte artifacts (see the scanned-PDF gotcha this
 *  repo has hit before). */
async function extractPdfText(url) {
  let quick = '';
  try {
    quick = await pdfText(url);
  } catch {
    quick = '';
  }
  if (quick && quick.replace(/\s/g, '').length >= 40) return quick;
  try {
    await rm(join(PDFTEXT_CACHE_DIR, urlCacheKey(url) + '.txt'), { force: true });
  } catch {
    /* ignore */
  }
  return ocrPdf(url);
}

// ---- crawlActive (announcements) -------------------------------------------

export async function crawlActive() {
  const board = await crawlBoard(ANNOUNCE_PATH, 'ogloszenia');
  const candidates = board.filter((it) => isSaleTitle(it.title));
  console.error(`  plock ogloszenia: ${candidates.length}/${board.length} sale candidate(s)`);

  const listings = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let detailsFetched = 0;
  for (const c of candidates) {
    if (detailsFetched >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  plock ogloszenia: budget reached (${detailsFetched}/${candidates.length} fetched); remainder next run`,
      );
      break;
    }
    let html;
    try {
      html = await getText(c.detail_url);
    } catch (err) {
      console.error(`  plock: detail fetch failed (${c.detail_url}): ${err.message}`);
      continue;
    }
    detailsFetched++;
    const bodyText = bodyTextFromDetail(html);
    const notice = primaryAttachment(attachmentsFromDetail(html));
    let pdfTxt = '';
    if (notice) {
      try {
        pdfTxt = await extractPdfText(notice.url);
      } catch (err) {
        console.error(`  plock: pdf/ocr text failed (${notice.url}): ${err.message}`);
      }
    }
    const rec = parseAnnouncement({
      title: c.title,
      bodyText,
      pdfText: pdfTxt,
      detailUrl: c.detail_url,
      publishedDate: c.published_date,
    });
    if (rec) listings.push(rec);
  }
  console.error(`  plock active: ${listings.length} listing(s)`);
  return { listings, wykaz: [] };
}

// ---- crawlResultDocs (achieved-price stream) -------------------------------

export async function crawlResultDocs() {
  const board = await crawlBoard(RESULTS_PATH, 'wyniki');
  const candidates = board.filter((it) => isSaleTitle(it.title));
  console.error(`  plock wyniki: ${candidates.length}/${board.length} sale-result candidate(s)`);

  const known = await loadKnownSourceUrls('plock');
  const refs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let detailsFetched = 0;
  let skippedKnown = 0;
  for (const c of candidates) {
    if (known.has(c.detail_url)) {
      skippedKnown++;
      continue; // concluded result already captured — never re-fetch
    }
    if (detailsFetched >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  plock wyniki: budget reached (${detailsFetched}/${candidates.length} fetched); remainder next run`,
      );
      break;
    }
    let html;
    try {
      html = await getText(c.detail_url);
    } catch (err) {
      console.error(`  plock: result detail fetch failed (${c.detail_url}): ${err.message}`);
      continue;
    }
    detailsFetched++;
    const bodyText = bodyTextFromDetail(html);
    const notice = primaryAttachment(attachmentsFromDetail(html));
    let pdfTxt = '';
    if (notice) {
      try {
        pdfTxt = await extractPdfText(notice.url);
      } catch (err) {
        console.error(`  plock: result pdf/ocr text failed (${notice.url}): ${err.message}`);
      }
    }
    // "TYTUL:" marker lets parseResultDoc recover the clean notice title under
    // the registry's fixed (text, auction_date, pdf_url) contract — see parse.js.
    const text = `TYTUL: ${c.title}\n\n${bodyText}\n\n${pdfTxt}`;
    refs.push({ text, auction_date: null, pdf_url: c.detail_url });
  }
  console.error(
    `  plock results: ${refs.length} result doc(s) fetched this run (${skippedKnown} already known)`,
  );
  return refs;
}
