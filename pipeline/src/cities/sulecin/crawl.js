// Sulęcin crawler — bip.sulecin.pl, SYSTEMDOBIP.PL / E-LINE CMS, live-verified
// 2026-07-11.
//
// BOARDS: property sales live on a family of GENERIC numeric "Lista
// informacji" boards (matches gorzow-wielkopolski's OWN /509/ results-board
// shape — <div class="information"> blocks, <p class="phx ph3"> title + link —
// not the specialized /przetargi/<id>/status/<n>/ tabular engine gorzow's
// announcements and miedzyrzecz's whole board use; that engine exists on this
// BIP too at /przetargi/0/status/{0,1,2}/ but is currently EMPTY and, per its
// own "Rodzaj" filter (only "przetarg ustny ograniczony" listed), looks scoped
// to a different workflow — it is NOT crawled here):
//
//   https://bip.sulecin.pl/80/Sprzedaz_nieruchomosci/        "current" bucket (empty right now)
//   https://bip.sulecin.pl/481/Sprzedaz_nieruchomosci_2025/  2025 (5 entries, live-verified)
//   https://bip.sulecin.pl/461/Sprzedaz_nieruchomosci_2024/  2024 (4 entries, land-only, live-verified)
//   https://bip.sulecin.pl/379/Sprzedaz_nieruchomosci_2021/  2021 (empty — slug from the spike is stale/pruned)
//
// New year-boards get a NEW numeric id (481 for 2025, 461 for 2024 — no
// predictable pattern) but DO appear as a sidebar nav link on every page
// ("Sprzedaż nieruchomości 2026" would show up the same way "... 2024" and
// "... 2025" do today) — discoverBoardUrls() scrapes that nav for
// "Sprzedaz_nieruchomosci" links so a future year is picked up automatically,
// falling back to the four URLs above (all confirmed live 2026-07-11) if
// discovery ever finds nothing.
//
// ENTRY PAGES (one per notice, e.g. /481/2454/Ogloszenie_o_II_.../): an HTML
// stub whose body is minimal — the actual ogłoszenie AND (once concluded) the
// "informacja o wyniku przetargu" BOTH live as PDF attachments on the SAME
// entry page (system/pobierz.php?plik=...&id=...), classified by filename
// (isWynikFilename / isOgloszenieFilename below). This CONTRADICTS the spike's
// pessimistic caveat ("no confirmed wyniki/achieved-price board") — results
// exist, just co-located with their announcement rather than on a separate
// board; five real announcement+wynik pairs were fetched and groundtruthed for
// this build (see parse.js header).
//
// PDF text: every real document but one was born-digital (pdftotext -layout
// works directly); one wynik doc (dz. 437/1) was a scan with NO text layer —
// extractPdf() falls back to ocrPdf() (psm 1, matching gorzow-wielkopolski's
// own defensive rotated-scan rationale) whenever pdftotext's output doesn't
// look usable.
//
// CI budget: crawlResultDocs (via the shared crawlAll() promise, see below)
// uses known-URL skipping for wynik PDFs specifically (never for the
// announcement side — see processEntry) plus a wall-clock budget + board cap,
// though volume here is a handful of entries per year, nowhere near either
// limit in practice.
//
// See spike: spikes/lubuskie/powiat-sulecinski/sulecin.md

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.sulecin.pl';
// Same CMS family as gorzow-wielkopolski/miedzyrzecz, both of which document
// this BIP engine gating the default bot UA; used defensively here too
// (every fetch during this build's research used a browser UA and worked).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Live-verified 2026-07-11 seed boards — kept as a fallback even though
// discoverBoardUrls() should find the year-boards (481, 461) itself via the
// nav sidebar; board 80 and 379 are NOT reachable via that nav (80 has no
// sibling-year link to itself; 379/2021 has been pruned from the current
// nav/sitemap even though the page still resolves), so they're seeded
// directly.
const SEED_BOARD_URLS = [
  `${ORIGIN}/80/Sprzedaz_nieruchomosci/`,
  `${ORIGIN}/481/Sprzedaz_nieruchomosci_2025/`,
  `${ORIGIN}/461/Sprzedaz_nieruchomosci_2024/`,
  `${ORIGIN}/379/Sprzedaz_nieruchomosci_2021/`,
];

const MAX_BOARDS = Number(process.env.SULECIN_MAX_BOARDS) || 12;
const MAX_ARCHIVE_PAGES = Number(process.env.SULECIN_MAX_ARCHIVE_PAGES) || 5;
const CRAWL_BUDGET_MS = Number(process.env.SULECIN_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

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

/**
 * Parse a "Lista informacji" board (or archive) page into entry links. Shape
 * matches gorzow-wielkopolski's own /509/ results-board parser exactly:
 * <div class="information"> blocks, a <p class="phx ph3"><a href=...> title.
 * @param {string} html
 * @returns {Array<{url:string, title:string}>}
 */
export function parseInformationList(html) {
  const out = [];
  const blocks = (html || '').split(/<div class="information">/i);
  for (const block of blocks.slice(1)) {
    const m = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!m) continue;
    const url = deamp(m[1]);
    if (!/^https:\/\/bip\.sulecin\.pl\/\d+\/\d+\//.test(url)) continue; // skip non-entry links defensively
    out.push({ url, title: stripTags(m[2]) });
  }
  return out;
}

/** The "Przejdź do archiwum" link's page-1 URL, or null. @param {string} html */
export function archiveUrlFromBoardHtml(html) {
  const m = /href="(https:\/\/bip\.sulecin\.pl\/\d+\/1\/archiwum\/[^"]+)"/i.exec(html || '');
  return m ? deamp(m[1]) : null;
}

/** Swap an archive URL's leading page segment. @param {string} archiveUrl @param {number} page */
export function archivePageUrl(archiveUrl, page) {
  return archiveUrl.replace(/\/\d+\/archiwum\//, `/${page}/archiwum/`);
}

// ── attachment classification ───────────────────────────────────────────────

/** @param {string} filename @returns {boolean} */
export function isWynikFilename(filename) {
  return /wynik/i.test(filename || '');
}

/** @param {string} filename @returns {boolean} */
export function isOgloszenieFilename(filename) {
  const f = filename || '';
  if (isWynikFilename(f)) return false;
  // "zgłoszenie" (participant registration) and "zakwalifik-/zakwalifok-"
  // (qualified-participant list, incl. a real observed typo) are DIFFERENT
  // words from "ogłoszenie" and must not be swept in by a loose /przetarg/
  // match on their own filenames (both real, observed on the restricted-land
  // entries alongside the real ogłoszenie/wynik pair).
  if (/zgloszenie|zakwalif|zalacznik|^lista/i.test(f)) return false;
  return /ogloszenie|^przetarg/i.test(f);
}

/**
 * @param {string} html  entry stub page
 * @returns {Array<{url:string, filename:string}>}
 */
export function parseAttachments(html) {
  const out = [];
  const re = /href="(https:\/\/bip\.sulecin\.pl\/system\/pobierz\.php\?plik=([^"&]+)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    let filename = m[2];
    try {
      filename = decodeURIComponent(filename);
    } catch {
      /* malformed escape — keep the raw (still classifiable) string */
    }
    out.push({ url: deamp(m[1]), filename });
  }
  return out;
}

// ── fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  sulecin: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

/**
 * Extract a PDF's text: pdftotext first, OCR fallback when the text doesn't
 * look usable (empty text layer — one real wynik doc, dz. 437/1, was a scan).
 * @param {string} pdfUrl
 * @param {(text:string) => boolean} usable
 * @returns {Promise<string|null>}
 */
async function extractPdf(pdfUrl, usable) {
  let text = null;
  try {
    text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  sulecin: pdftotext failed (${pdfUrl}): ${err.message}`);
  }
  if (text && usable(text)) return text;
  try {
    const ocr = await ocrPdf(pdfUrl, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr && usable(ocr)) return ocr;
  } catch (err) {
    console.error(`  sulecin: OCR fallback failed (${pdfUrl}): ${err.message}`);
  }
  return null;
}

const looksLikeAnnouncement = (t) => /ogłasza/i.test(t || '') || (t || '').trim().length > 200;

// ── board discovery ──────────────────────────────────────────────────────────

/**
 * Seed boards + any "Sprzedaz_nieruchomosci"-named board discovered in board
 * 80's own nav sidebar (future years get a new numeric id but always show up
 * there, the same way "... 2024" and "... 2025" do today).
 * @returns {Promise<string[]>}
 */
async function discoverBoardUrls() {
  const urls = new Set(SEED_BOARD_URLS);
  const html = await fetchPage(`${ORIGIN}/80/Sprzedaz_nieruchomosci/`);
  if (html) {
    const re = /href="(https:\/\/bip\.sulecin\.pl\/\d+\/[^"]*Sprzedaz_nieruchomosci[^"]*)"/gi;
    let m;
    while ((m = re.exec(html)) !== null) urls.add(deamp(m[1]));
  }
  return [...urls];
}

// ── per-entry processing ────────────────────────────────────────────────────

/**
 * @param {{url:string, title:string}} entry
 * @param {{listings:object[], land:object[], resultRefs:object[], known:Set<string>}} ctx
 */
async function processEntry(entry, ctx) {
  const html = await fetchPage(entry.url);
  if (!html) return;
  const attachments = parseAttachments(html);
  const oglo = attachments.find((a) => isOgloszenieFilename(a.filename));
  const wynik = attachments.find((a) => isWynikFilename(a.filename));

  // Announcement side: always attempted (cheap, tiny volume) — a listing is
  // produced regardless of whether this same entry ALSO already has a wynik
  // (mirrors gorzow-wielkopolski's own convention of not gating listings on
  // resolution status; downstream build-properties.js reconciles the two).
  if (oglo) {
    const text = await extractPdf(oglo.url, looksLikeAnnouncement);
    if (text) {
      const recs = parseAnnouncement(text, { detailUrl: entry.url, pdfUrl: oglo.url });
      for (const rec of recs) (rec.kind === 'grunt' ? ctx.land : ctx.listings).push(rec);
    } else {
      console.error(`  sulecin: no usable announcement text for ${oglo.url} — skipped`);
    }
  }

  // Result side: skip re-extracting a wynik PDF already captured in committed
  // data (incremental crawl — concluded auctions never change).
  if (wynik) {
    if (ctx.known.has(wynik.url)) return;
    const text = await extractPdf(wynik.url, isResultNotice);
    if (text) {
      ctx.resultRefs.push({ text, pdf_url: wynik.url, detail_url: entry.url, auction_date: null });
    } else {
      console.error(`  sulecin: no usable result text for ${wynik.url} — skipped`);
    }
  }
}

/** @param {string} html @param {object} ctx */
async function processBoardPage(html, ctx) {
  for (const entry of parseInformationList(html)) {
    if (ctx.seenEntries.has(entry.url)) continue;
    ctx.seenEntries.add(entry.url);
    if (Date.now() > ctx.deadline) break;
    await processEntry(entry, ctx);
  }
}

/** @param {string} boardUrl @param {object} ctx */
async function crawlBoardAndArchive(boardUrl, ctx) {
  const html = await fetchPage(boardUrl);
  if (!html) return;
  await processBoardPage(html, ctx);

  const archiveBase = archiveUrlFromBoardHtml(html);
  if (!archiveBase) return;
  for (let page = 1; page <= MAX_ARCHIVE_PAGES; page++) {
    if (Date.now() > ctx.deadline) break;
    const url = page === 1 ? archiveBase : archivePageUrl(archiveBase, page);
    const ahtml = await fetchPage(url);
    if (!ahtml) break;
    const entries = parseInformationList(ahtml);
    if (entries.length === 0) break;
    const fresh = entries.filter((e) => !ctx.seenEntries.has(e.url));
    if (fresh.length === 0) break; // nothing new -> treat as the last page
    await processBoardPage(ahtml, ctx);
  }
}

// ── shared crawl (one pass feeds both crawlActive and crawlResultDocs) ─────
//
// Unlike gorzow-wielkopolski (separate announcement/result BOARDS) Sulęcin's
// listing AND result documents live on the SAME entry pages, so one board
// walk collects both streams — matching naklo-nad-notecia's crawlAll()
// pattern rather than gorzow's two-separate-crawls one.

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const seenEntries = new Set();
  const known = await loadKnownSourceUrls('sulecin');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  const ctx = { listings, land, resultRefs, seenEntries, known, deadline };

  const boardUrls = await discoverBoardUrls();
  let boardsWalked = 0;
  for (const boardUrl of boardUrls) {
    if (boardsWalked >= MAX_BOARDS) break;
    if (Date.now() > deadline) {
      console.error('  sulecin: crawl budget exhausted — stopping early');
      break;
    }
    boardsWalked++;
    await crawlBoardAndArchive(boardUrl, ctx);
  }

  console.error(
    `  sulecin: ${listings.length} flat listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
  );
  return { listings, land, resultRefs };
}

/** @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>} */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  // No confirmed live "wykaz" (pre-auction designation, no date/price yet)
  // source was found during this build — the spike's 2026-06-17 mention isn't
  // reachable from the board family walked here (see spike + config.js
  // header); kept empty rather than guessing at an unverified shape.
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  console.log(
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
    ),
  );
}
