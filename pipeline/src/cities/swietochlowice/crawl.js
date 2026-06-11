// Świętochłowice crawler.
//
//   INDEX:   /bipkod/29287911                              (current flat auctions)
//            /bipkod/29287911?showArchive=true&start=<n>   (archive, 0-based pages)
//   DETAIL:  each announcement is an attachment at /res/serwisy/pliki/<id> —
//            EITHER a legacy Word .doc (older posts) OR a scanned image-only
//            PDF (most posts since ~2023; pdftotext yields nothing → OCR)
//
// Walks the current page + archive pages (stopping after 3 empty archive pages),
// harvests the flat-auction announcement links, and for each: takes the address
// + round from the announcement TITLE (always present, consistent spelling) and
// the price / usable area / auction date from the attachment body via
// attachmentText() (pdftotext → tesseract OCR → catdoc routing). If the
// attachment can't be fetched/parsed, the listing is still emitted from the
// title (price/area/date null). One flat per announcement →
// one active listing; build-properties marks past-dated ones `archived`.
// crawlResultDocs() reuses the SAME memoised page walk and routes the board's
// "Informacja o wyniku …" PDFs to parse.js parseResultDoc — the achieved-price
// stream. See parse.js + config.js.
//
// VERIFIED LIVE (June 2026, rendered-DOM spike). The host is reachable with a
// browser-like UA; the .doc announcement is OLE/legacy Word (catdoc), the .docx
// "KW" annex is ignored by isFlatAnnouncement.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  htmlToText, addressFrom, roundFromTitle, shareFromTitle,
  priceFromText, areaFromText, auctionDateFromText,
  parseDocLinks, isFlatAnnouncement, isFlatResultNotice,
} from './parse.js';
import { urlCacheKey } from '../../core/hash.js';

const ORIGIN = config.bip.origin;
const LIST = `${ORIGIN}${config.bip.listPath}`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// This host is flaky — it intermittently returns 502/503 (proxy errors) and can
// time out, even from a browser. politeGet retries on 5xx + connection errors
// with exponential backoff, so we give the FIRST (current-board) fetch a healthy
// retry budget to ride out a transient outage and seed data; archive pages get a
// smaller budget so a sustained outage still can't drag the job out for long.
const FETCH_OPTS = { userAgent: BROWSER_UA };
const RETRIES_BOARD = 4;   // ~1+2+4+8s backoff across attempts
const RETRIES_ARCHIVE = 2;

// OCR cleanup: tesseract reads the superscript "²" of "m²" as "?" (and the
// scans are low-res), so "38,01 m²" comes out "38,01 m?" — which would hide
// the usable area from areaFromText. Only the digit-adjacent case is touched.
const fixOcrText = (s) => String(s || '').replace(/(\d)\s*m\?/g, '$1 m²');

/**
 * Extract the text of one /res/serwisy/pliki/<id> attachment, routing by type:
 *   text PDF   → pdftotext           (pdf-text-cache)
 *   image PDF  → tesseract OCR       (ocr-cache)      — the common case since ~2023
 *   legacy .doc→ catdoc              (doc-text-cache)
 * pdf-text.js's magic-byte check throws "not a PDF" for the .doc case; a PDF
 * whose extracted text is (near-)empty is a scan → OCR.
 * @param {string} url
 * @returns {Promise<string>}
 */
const DOC_CACHE_DIR = fileURLToPath(new URL('../../../doc-text-cache/', import.meta.url));

async function attachmentText(url) {
  // Already extracted as a legacy .doc? Serve the committed cache and skip the
  // PDF probe — pdfText only caches actual PDFs, so probing a .doc URL would
  // re-download it on EVERY run just to learn (again) that it isn't a PDF.
  if (existsSync(`${DOC_CACHE_DIR}${urlCacheKey(url)}.txt`)) {
    return docText(url, FETCH_OPTS);
  }
  let text;
  try {
    text = await pdfText(url, FETCH_OPTS);
  } catch {
    return docText(url, FETCH_OPTS); // not a PDF → legacy Word .doc
  }
  if (text.replace(/\s+/g, '').length >= 200) return text;
  return fixOcrText(await ocrPdf(url, FETCH_OPTS)); // image-only scan
}

/** Did a fetch fail because the host is unreachable (vs. a normal 404/empty)? */
function isConnError(err) {
  const s = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.cause?.message || ''}`;
  return /fetch failed|ECONNREFUSED|ETIMEDOUT|CONNECT_TIMEOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network/i.test(s);
}

/** Collect unique doc links (ALL kinds) across current + archive pages —
 *  crawlActive filters for announcements, crawlResultDocs for result notices,
 *  both from this single memoised walk (one set of page fetches per run).
 *  Fails fast: if the host is unreachable on the current page, skip the city
 *  entirely (return []) rather than attempting every archive page. refresh.js
 *  tolerates an empty city, so one unreachable BIP never breaks the pipeline. */
let collectPromise = null;
function collectLinks() {
  collectPromise ??= collectLinksOnce();
  return collectPromise;
}
async function collectLinksOnce() {
  const entries = [];
  const seen = new Set();
  const take = (html) => {
    let added = 0;
    for (const d of parseDocLinks(html, ORIGIN)) {
      if (seen.has(d.url)) continue;
      seen.add(d.url);
      entries.push(d);
      added++;
    }
    return added;
  };

  // 1) Current board — retry hard to ride out a transient 502/503; if it still
  //    fails, abort the whole crawl fast (skip the city this run; merge keeps
  //    any previously-seeded archive).
  try {
    take(await getText(LIST, { ...FETCH_OPTS, retries: RETRIES_BOARD }));
  } catch (err) {
    console.error(`  swietochlowice: current board fetch failed (${err.message}) — skipping city this run.`);
    return [];
  }

  // 2) Archive pages — stop on the first connection failure, or after 3 empty pages.
  let emptyStreak = 0;
  for (let i = 0; i < config.bip.maxArchivePages; i++) {
    const url = `${LIST}?showArchive=true&start=${i}`;
    let html;
    try {
      html = await getText(url, { ...FETCH_OPTS, retries: RETRIES_ARCHIVE });
    } catch (err) {
      console.error(`  swietochlowice: archive page ${i} fetch failed (${err.message}) — stopping archive walk.`);
      if (isConnError(err)) break; // host went away; don't grind through the rest
      continue;
    }
    const added = take(html);
    if (added === 0) {
      if (++emptyStreak >= 3) break;
    } else {
      emptyStreak = 0;
    }
  }
  return entries;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  const all = await collectLinks();
  const entries = all.filter((x) => isFlatAnnouncement(x.title));
  console.error(`  swietochlowice: ${entries.length} flat announcement(s) to inspect (of ${all.length} links)`);

  const listings = [];
  for (const e of entries) {
    // Address + round from the title — present for every announcement, and
    // spelled consistently across the dataset (the .doc body sometimes expands
    // "ul. Powstańców Śl." to "Śląskich", which would split the property key).
    const addr = addressFrom(e.title, '');
    if (!addr) {
      console.error(`  swietochlowice WARN: unkeyable announcement (${e.title.slice(0, 70)})`);
      continue;
    }
    let price = null;
    let area = null;
    let date = null;
    try {
      const text = htmlToText(await attachmentText(e.url));
      price = priceFromText(text);
      area = areaFromText(text);
      date = auctionDateFromText(text);
    } catch (err) {
      console.error(`  swietochlowice attachment parse failed (${e.url}): ${err.message}`);
    }
    listings.push({
      kind: 'mieszkalny',
      address_raw: addr.address_raw,
      address: addr.address,
      auction_date: date,
      published_date: null,
      round: roundFromTitle(e.title),
      area_m2: area,
      starting_price_pln: price,
      detail_url: LIST, // the flats category page (the .doc link only downloads)
      share: shareFromTitle(e.title),
    });
  }

  console.error(`  swietochlowice active: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [] };
}

/**
 * The achieved-price stream: the board's "Informacja o wyniku …" attachments
 * (text PDFs, scanned PDFs → OCR, or legacy .doc → catdoc — see
 * attachmentText). Each ref carries `"<title>\n<extracted text>"` for parse.js
 * parseResultDoc (title = address key + round; body = date + prices).
 * @returns {Promise<Array<{text:string, auction_date:null, pdf_url:string}>>}
 */
export async function crawlResultDocs() {
  const all = await collectLinks();
  const notices = all.filter((x) => isFlatResultNotice(x.title));
  console.error(`  swietochlowice results: ${notices.length} flat result notice(s)`);

  const out = [];
  for (const n of notices) {
    let text = '';
    try {
      // Same routing as announcements: text PDF → scan-OCR → legacy .doc.
      text = await attachmentText(n.url);
    } catch (err) {
      console.error(`  swietochlowice result extract failed (${n.url}): ${err.message}`);
      continue;
    }
    out.push({
      text: `${n.title}\n${htmlToText(text)}`,
      auction_date: null, // parseResultDoc reads the date from the body
      pdf_url: n.url,
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
