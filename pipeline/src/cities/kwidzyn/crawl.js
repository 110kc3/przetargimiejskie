// Kwidzyn crawler — the eUrząd/Logonet "nowoczesny BIP" JSON API on
// `bip.kwidzyn.pl` (same API family as tarnowskie-gory/sosnowiec/wegrow; see
// config.js for the analog note).
//
// DISCOVERY. The board `Gospodarka Nieruchomościami` (menu id 13536) has one
// child menu per year. The raw site is a React SPA, but it is backed by a clean
// JSON API, which we drive directly (so NO Playwright / core/render.js — see
// config.js):
//   GET /api/menu/13536              → the full top nav; the requested branch's
//                                      node carries `children` = the year menus.
//   GET /api/menu/{yearId}/articles  → { total, articles:[{id, link,
//                                      aliasFields[title], columnFields[date]}] }.
//   GET /api/articles/{id}           → { title, attachments:[{id, extension,
//                                      name, …}] }.
//   GET /e,pobierz,get.html?id={att} → the attachment bytes (the scanned PDF).
// The result "Informacja o wyniku przetargu" is normally a SECOND attachment on
// the announcement's own article, so one shared, memoized pass fetches every
// candidate article's PDFs, OCRs them, and classifies each PDF body — feeding
// BOTH crawlActive (announcements) and crawlResultDocs (results). No PDF twice.
//
// EXTRACTION IS OCR. The notice PDFs are the Burmistrz's signed paper scans
// (image-only; pdfText returns \f) → core/ocr-pdf.js `ocrPdf` (tesseract -l pol).
// `extractNoticeText` tries the cheap pdfText first so a future born-digital PDF
// is handled for free, then falls back to OCR (deleting the tiny pdfText junk so
// pdf-text-cache stays clean).
//
// BOUND (ADAPTER-GUIDE §5). OCR is the wall-clock bottleneck, so the crawl is
// bounded hard: only the most recent YEARS_BACK years (+ the board root's direct
// articles) are scanned; wykaz pre-announcement lists and cancellations are
// skipped by TITLE (kind still comes from the PDF body); the candidate set is
// capped (MAX_ARTICLES, newest first); and — crucially — at most
// MAX_UNCACHED_OCR *uncached* PDFs are OCR'd per run (already-committed ocr-cache
// hits are free and always processed). The committed ocr-cache means CI re-runs
// are cheap and the backlog backfills a slice per run. Already-captured result
// PDFs are skipped via core/known-urls.js (safe: concluded results only).
//
// One request per second (core/fetch.js getText throttle).

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { urlCacheKey } from '../../core/hash.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isCancellation, toAscii } from './parse.js';

const ORIGIN = 'https://bip.kwidzyn.pl';
const API = `${ORIGIN}/api`;
const GN_ROOT_MENU_ID = '13536'; // board "Gospodarka Nieruchomościami"

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const YEARS_BACK = 1;            // current + 1 prior year of the board
const MAX_ARTICLES = 80;         // candidate cap (newest article-id first)
const MAX_UNCACHED_OCR = 24;     // per-run wall-clock guard (uncached OCRs only)
const LIST_LIMIT = 200;          // articles per menu page
const LIST_PAGE_CAP = 2;         // ≤ 2 pages per menu

// pipeline/ocr-cache — used to tell whether a PDF's OCR is already committed
// (a free hit) vs. would incur a fresh tesseract run (counts to the cap).
const OCR_CACHE_DIR = fileURLToPath(new URL('../../../ocr-cache/', import.meta.url));
const PDFTEXT_CACHE_DIR = fileURLToPath(new URL('../../../pdf-text-cache/', import.meta.url));
function ocrCached(url) { return existsSync(join(OCR_CACHE_DIR, urlCacheKey(url) + '.txt')); }

const attUrl = (attId) => `${ORIGIN}/e,pobierz,get.html?id=${attId}`;

async function getJson(url) {
  const text = await getText(url, FETCH_OPTS);
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Structure helpers
// ---------------------------------------------------------------------------

/** Year menus under the board root → [{year, id}], from the GN node's children
 *  in GET /api/menu/{root}. @returns {Array<{year:number,id:string}>} */
export function parseYearMenus(menuArray, rootId = GN_ROOT_MENU_ID) {
  const root = (menuArray || []).find((m) => String(m.id) === String(rootId));
  const kids = (root && Array.isArray(root.children)) ? root.children : [];
  const out = [];
  for (const k of kids) {
    const y = Number(String(k.name).trim());
    if (Number.isInteger(y) && y > 2000 && y < 2100) out.push({ year: y, id: String(k.id) });
  }
  return out;
}

/** One article-list entry → {id, title, date, link}. Title comes from the
 *  aliasFields "title" (clean), date from the "Czas publikacji" column. */
export function parseArticleEntry(a) {
  const t = (a.aliasFields || []).find((f) => f.alias === 'title');
  const title = (t && t.value)
    ? String(t.value)
    : String(a.link || '').replace(/^a,\d+,/, '').replace(/\.html$/, '').replace(/-/g, ' ');
  const d = (a.columnFields || []).find((f) => f.fieldId === 26);
  const date = d && d.value ? String(d.value).slice(0, 10) : null;
  return { id: String(a.id), title, date, link: a.link };
}

/** Title routing (NOT kind — kind comes from the PDF body). */
function classifyTitle(title) {
  const t = toAscii(title || '');
  if (/wykaz/.test(t)) return 'skip';           // pre-announcement lists (bulk noise)
  if (isCancellation(title)) return 'skip';     // "o odwołaniu przetargu"
  if (/przetarg|sprzeda/.test(t)) return 'candidate';
  return 'skip';
}

/** An attachment worth OCR-ing: a PDF that is not a location map. */
function isNoticePdf(att) {
  if (!att || String(att.extension).toLowerCase() !== 'pdf') return false;
  return !/map|rzut|szkic|graficzn/i.test(att.name || '');
}

/** Classify one OCR'd PDF body → announce | result | skip. Result markers are
 *  tested first (a result form also prints "cena wywoławcza"). */
function classifyBody(text) {
  const t = toAscii(text || '');
  if (/informacj\w*\s+o\s+wynik/.test(t) || /cena\s+osiagni[ea]t/.test(t) ||
      /wynik\w*\s+negatywn|brak\s+chetnych/.test(t)) return 'result';
  if (/przetarg/.test(t) && /(oglasza|na\s+sprzeda|cena\s+wywolawcza)/.test(t)) return 'announce';
  return 'skip';
}

/** Text of a scanned notice PDF: pdfText (born-digital fast path) if it yields
 *  real text, else OCR. Any tiny pdfText \f-junk cache file is removed so
 *  pdf-text-cache is never polluted with 1–2 byte artifacts. */
async function extractNoticeText(url) {
  let quick = '';
  try { quick = await pdfText(url, FETCH_OPTS); } catch { quick = ''; }
  if (quick && quick.replace(/\s/g, '').length >= 40) return quick;
  // Scanned (the confirmed Kwidzyn case): drop the junk, OCR instead.
  try { await rm(join(PDFTEXT_CACHE_DIR, urlCacheKey(url) + '.txt'), { force: true }); } catch { /* ignore */ }
  return ocrPdf(url, FETCH_OPTS);
}

// ---------------------------------------------------------------------------
// Shared discovery + fetch + OCR + classify pass (memoized per process run)
// ---------------------------------------------------------------------------

let _cache = null;

async function fetchMenuArticles(menuId) {
  const out = [];
  for (let page = 0; page < LIST_PAGE_CAP; page++) {
    const offset = page * LIST_LIMIT;
    let j;
    try {
      j = await getJson(`${API}/menu/${menuId}/articles?limit=${LIST_LIMIT}&offset=${offset}`);
    } catch (err) {
      console.error(`  kwidzyn: menu ${menuId} articles (offset ${offset}) failed: ${err.message}`);
      break;
    }
    const arts = Array.isArray(j.articles) ? j.articles : [];
    for (const a of arts) out.push(parseArticleEntry(a));
    if (offset + arts.length >= (j.total || 0) || arts.length === 0) break;
  }
  return out;
}

async function discoverAll() {
  if (_cache) return _cache;

  // 1. Year menus under the board root.
  let menuArray;
  try {
    menuArray = await getJson(`${API}/menu/${GN_ROOT_MENU_ID}`);
  } catch (err) {
    console.error(`  kwidzyn: menu tree fetch failed: ${err.message}`);
    _cache = [];
    return _cache;
  }
  const thisYear = new Date().getFullYear();
  const minYear = thisYear - YEARS_BACK;
  const yearMenus = parseYearMenus(menuArray)
    .filter((y) => y.year >= minYear && y.year <= thisYear + 1)
    .sort((a, b) => b.year - a.year);
  // Board root itself carries a few direct (undated-menu) articles too.
  const menuIds = [GN_ROOT_MENU_ID, ...yearMenus.map((y) => y.id)];

  // 2. Candidate articles across those menus (deduped by article id).
  const byId = new Map();
  for (const menuId of menuIds) {
    for (const entry of await fetchMenuArticles(menuId)) {
      if (classifyTitle(entry.title) !== 'candidate') continue;
      if (!byId.has(entry.id)) byId.set(entry.id, entry);
    }
  }
  const candidates = [...byId.values()]
    .sort((a, b) => Number(b.id) - Number(a.id)) // newest article-id first
    .slice(0, MAX_ARTICLES);

  const known = await loadKnownSourceUrls('kwidzyn');

  // 3. Per article: fetch attachments, OCR the notice PDFs, classify each.
  const records = [];
  let uncachedOcr = 0;
  let articlesProcessed = 0;
  for (const c of candidates) {
    let art;
    try {
      art = await getJson(`${API}/articles/${c.id}`);
    } catch (err) {
      console.error(`  kwidzyn: article ${c.id} fetch failed: ${err.message}`);
      continue;
    }
    articlesProcessed++;
    for (const att of (art.attachments || [])) {
      if (!isNoticePdf(att)) continue;
      const pdfUrl = attUrl(att.id);
      const cached = ocrCached(pdfUrl);
      // A concluded result already in committed data → skip (never re-OCR).
      if (cached && known.has(pdfUrl)) continue;
      if (!cached) {
        if (uncachedOcr >= MAX_UNCACHED_OCR) continue; // defer to a later run
        uncachedOcr++;
      }
      let text;
      try {
        text = await extractNoticeText(pdfUrl);
      } catch (err) {
        console.error(`  kwidzyn: OCR failed (${pdfUrl}): ${err.message}`);
        continue;
      }
      if (!text || !text.trim()) {
        console.error(`  kwidzyn: EMPTY text for ${pdfUrl} — skipping`);
        continue;
      }
      const type = classifyBody(text);
      if (type === 'skip') continue;
      if (type === 'result' && known.has(pdfUrl)) continue;
      records.push({ articleId: c.id, title: c.title, date: c.date, pdfUrl, text, type });
    }
  }
  console.error(
    `  kwidzyn: ${menuIds.length} menu(s), ${candidates.length} candidate article(s), ` +
    `${articlesProcessed} fetched, ${records.length} notice PDF(s) (uncached OCR ${uncachedOcr}/${MAX_UNCACHED_OCR}).`,
  );
  _cache = records;
  return records;
}

// ---------------------------------------------------------------------------
// crawlActive()
// ---------------------------------------------------------------------------

export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();
  const listings = [];
  for (const r of records) {
    if (r.type !== 'announce') continue;
    const a = parseAnnouncement(r.text, r.title, r.pdfUrl);
    if (!a.address && !a.dzialka_nr) {
      console.error(`  kwidzyn: announce article ${r.articleId} no subject (kind=${a.kind}) — skipping`);
      continue;
    }
    if (!a.auction_date || a.auction_date < todayIso) continue; // upcoming only
    listings.push(a);
  }
  console.error(`  kwidzyn active: ${listings.length} upcoming listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs() → refs for refresh.js: { text, pdf_url, auction_date }
// (source:'html' → refresh.js uses ref.text directly; see refresh.js).
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = [];
  for (const r of records) {
    if (r.type !== 'result') continue;
    refs.push({ text: r.text, pdf_url: r.pdfUrl, auction_date: null });
  }
  console.error(`  kwidzyn crawlResultDocs: ${refs.length} result doc(s)`);
  return refs;
}

// ---------------------------------------------------------------------------
// CLI harness: node crawl.js [active|results]
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n');
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
