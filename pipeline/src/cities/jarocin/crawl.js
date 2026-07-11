// Jarocin crawler — WOKISS BIP (`bip2.wokiss.pl/jarocin`).
//
// DISCOVERY. The board `Przetargi na sprzedaż nieruchomości` is a year-indexed
// HTML menu (one sub-page per year, 2007..current). Each year sub-page lists
// its notices as `<div class="temat"><a href="...przetargi-w-roku-YYYY.html
// ?pid=N">TITLE</a></div>`; opening a `?pid=N` renders that one notice, whose
// real content is a single attached born-digital text PDF under
// `/jarocin/zasoby/przetargi/*.pdf`. So the crawl is:
//   index → recent year sub-pages → per-notice list (pid + title) → route by
//   title → fetch each notice's pid page → extract its PDF href → pdfText →
//   parse. One shared, memoized fetch+extract pass feeds BOTH crawlActive
//   (announcements) and crawlResultDocs (results), so no PDF is fetched twice.
//
// BOUND (ADAPTER-GUIDE §5): only the most recent YEARS_BACK years are scanned
// (older auctions fall under the pipeline's 2020 history floor anyway), only
// announcement + "informacja o wyniku" titles are fetched (cancellations and
// restricted-tender qualification lists are skipped by title), and the whole
// set is capped at MAX_NOTICES (newest pid first) so a big archive can't blow
// the CI wall-clock. Already-captured result PDFs are skipped via
// core/known-urls.js (safe: concluded results only).
//
// KIND is NOT taken from the title/slug — parse.js classifyKind(PDF BODY)
// decides flat vs land (this gmina sells mostly land, occasional flats).
//
// One request per second (core/fetch.js getText throttle).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, parseResultDoc, isCancellation, parseDateText } from './parse.js';

const ORIGIN = 'https://bip2.wokiss.pl';
// The CMS sets <base href="/jarocin/"> — every relative href resolves here.
const BASE = `${ORIGIN}/jarocin/`;
const INDEX_URL = `${BASE}bip/przetargi-na-sprzedaz-nieruchomosci.html`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// How many years back (incl. current) to scan, and the hard notice cap.
const YEARS_BACK = 3;          // current + 3 prior = 4 year sub-pages
const MAX_NOTICES = 120;       // wall-clock guard (newest pid first)

// ---------------------------------------------------------------------------
// HTML structure helpers (WOKISS menu markup)
// ---------------------------------------------------------------------------

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Absolute URL from a page-relative href (resolved against the CMS base). */
function abs(href) {
  try { return new URL(href, BASE).href; } catch { return null; }
}

/** Year sub-page hrefs from the board index → [{year, url}] (real href kept,
 *  so the "20181.html" source typo is not reconstructed). */
export function parseYearIndex(html) {
  const out = [];
  const seen = new Set();
  for (const m of (html || '').matchAll(/href="([^"]*przetargi-w-roku-(\d{4})[^"]*\.html)"/gi)) {
    const url = abs(m[1]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ year: Number(m[2]), url });
  }
  return out;
}

/** Notice list on a year sub-page → [{pid, url, title}]. */
export function parseNoticeList(html) {
  const out = [];
  const seen = new Set();
  for (const m of (html || '').matchAll(
    /<div class="temat">\s*<a href="([^"]*?pid=(\d+))">([\s\S]*?)<\/a>/gi,
  )) {
    const pid = Number(m[2]);
    if (seen.has(pid)) continue;
    seen.add(pid);
    const url = abs(m[1]);
    if (!url) continue;
    out.push({ pid, url, title: stripTags(m[3]) });
  }
  return out;
}

/** The notice's attached PDF url from its pid page (first .pdf anchor — the
 *  year list on the same page contains only ?pid links, never .pdf). */
export function extractNoticePdfUrl(html) {
  const m = /href="([^"]+\.pdf[^"]*)"/i.exec(html || '');
  return m ? abs(m[1]) : null;
}

// Title routing (NOT kind — kind comes from the PDF body). ASCII-folded.
function classifyTitle(title) {
  const t = (title || '')
    .toLowerCase()
    .replace(/ł/g, 'l').replace(/ó/g, 'o').replace(/ż/g, 'z').replace(/ś/g, 's')
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ć/g, 'c').replace(/ń/g, 'n').replace(/ź/g, 'z');
  if (/informacj\w*\s+o\s+odwolan/.test(t)) return 'skip';   // cancellation
  if (/kwalifikacyjn/.test(t)) return 'skip';                // qualification list
  if (/informacj\w*\s+o\s+wynik/.test(t)) return 'result';
  if (/og[l]oszeni\w*.*przetarg|przetarg\w*\s+ustn/.test(t)) return 'announce';
  return 'skip';
}

// ---------------------------------------------------------------------------
// Shared discovery + fetch + parse pass (memoized per process run)
// ---------------------------------------------------------------------------

let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;

  let indexHtml;
  try {
    indexHtml = await getText(INDEX_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  jarocin: index fetch failed (${INDEX_URL}): ${err.message}`);
    _cache = [];
    return _cache;
  }
  const thisYear = new Date().getFullYear();
  const minYear = thisYear - YEARS_BACK;
  const years = parseYearIndex(indexHtml)
    .filter((y) => y.year >= minYear && y.year <= thisYear + 1)
    .sort((a, b) => b.year - a.year);

  // Collect candidate notices (announce + result) across the bounded years.
  const candidates = [];
  for (const y of years) {
    let yhtml;
    try {
      yhtml = await getText(y.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  jarocin: year ${y.year} fetch failed: ${err.message}`);
      continue;
    }
    for (const n of parseNoticeList(yhtml)) {
      const type = classifyTitle(n.title);
      if (type === 'skip') continue;
      candidates.push({ ...n, type });
    }
  }
  // Newest first, then cap.
  candidates.sort((a, b) => b.pid - a.pid);

  // Skip result PDFs already committed (concluded → safe). Applied per-notice
  // below once we know the PDF url; here we just load the set once.
  const known = await loadKnownSourceUrls('jarocin');

  const records = [];
  let fetched = 0;
  for (const c of candidates) {
    if (fetched >= MAX_NOTICES) break;
    let pageHtml;
    try {
      pageHtml = await getText(c.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  jarocin: notice ${c.pid} page fetch failed: ${err.message}`);
      continue;
    }
    const pdfUrl = extractNoticePdfUrl(pageHtml);
    if (!pdfUrl) {
      console.error(`  jarocin: notice ${c.pid} has no PDF attachment — skipping`);
      continue;
    }
    if (c.type === 'result' && known.has(pdfUrl)) continue; // already captured
    fetched++;
    let text;
    try {
      text = await pdfText(pdfUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  jarocin: PDF text failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    // Born-digital text PDFs only (spike): an empty extract means a scanned
    // page slipped in — log and skip (OCR is not wired; none seen live).
    if (!text || !text.trim()) {
      console.error(`  jarocin: EMPTY pdftotext for ${pdfUrl} (scanned?) — skipping, not OCR'd`);
      continue;
    }
    records.push({ ...c, pdfUrl, text });
  }
  console.error(
    `  jarocin: ${years.length} year(s), ${candidates.length} candidate notice(s), ` +
    `${records.length} PDF(s) extracted (cap ${MAX_NOTICES})`,
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
    if (isCancellation(r.title)) continue;
    const a = parseAnnouncement(r.text, r.title, r.pdfUrl);
    if (!a.address && !a.dzialka_nr) {
      console.error(`  jarocin: announce ${r.pid} no subject (kind=${a.kind}) — skipping`);
      continue;
    }
    if (!a.auction_date || a.auction_date < todayIso) continue; // only upcoming
    listings.push(a);
  }
  console.error(`  jarocin active: ${listings.length} upcoming listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs()  → refs for refresh.js: { text, pdf_url, auction_date }
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = [];
  for (const r of records) {
    if (r.type !== 'result') continue;
    // Fallback auction date (parseResultDoc re-extracts; this backs it up):
    // body "w dniu <date>" → else title "z dnia <date>". A window is sliced so
    // a dotted numeric date ("20.03.2025") is captured whole.
    const bi = r.text.search(/w\s+dniu\s/i);
    const ti = r.title.search(/z\s+dnia\s/i);
    const auction_date =
      (bi >= 0 ? parseDateText(r.text.slice(bi, bi + 45)) : null) ||
      (ti >= 0 ? parseDateText(r.title.slice(ti, ti + 45)) : null) || null;
    refs.push({ text: r.text, pdf_url: r.pdfUrl, auction_date });
  }
  console.error(`  jarocin crawlResultDocs: ${refs.length} result doc(s)`);
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
