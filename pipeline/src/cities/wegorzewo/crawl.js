// Węgorzewo crawler — bip.wegorzewo.pl, IDcom.pl (exact gizycko host shape).
// Confirmed live 2026-07-10/11. TLS chain is incomplete (see config.js) —
// every fetch here passes insecureTLS.
//
// TWO separate IDcom categories (UNLIKE gizycko, which shares one board for
// both streams — confirmed by following the live "Informacje o wynikach
// przetargów" nav link, which is a DIFFERENT category id from "Przetargi"):
//   3      "Przetargi"                       — announcements  -> crawlActive()
//   14619  "Informacje o wynikach przetargów" — results        -> crawlResultDocs()
// Both are paginated per-year at /wiadomosci/<category>/lista/<page>/<year>
// (confirmed live for years >= 2021 on category 14619; category 3 has no
// such floor). List rows are `<p class="title"><a href="...">TEXT</a></p>`,
// same markup as gizycko.
//
// Detail pages nest further <div>s INSIDE <div class="tresc"> (e.g. each
// numbered section "<div><strong>IV. Cena wywoławcza ...</strong></div>" is
// itself a <div> — confirmed live on wiadomosc/501783) — a naive
// non-greedy-to-first-</div> extraction (gizycko's own regex, and the
// indexOf-based one pisz/crawl.js uses) truncates the body immediately after
// section I, losing price/date/wadium entirely. extractTrescDiv below does a
// proper balanced-tag scan instead.
//
// Results are inline HTML with a structured "cena wywoławcza / najwyższa
// cena osiągnięta / nabywca" block — see parse.js header "SOURCE CORRECTION"
// for why this adapter does NOT stub parseResultDoc to always return [] the
// way gizycko does. fetchResultText below still defensively tries
// pdfText/ocrPdf if a result ever lacks that inline block AND carries a PDF
// attachment — untested against any live fixture (none needed it), kept only
// so a future format change degrades gracefully instead of silently
// dropping the record.
//
// See spikes/warminsko-mazurskie/powiat-wegorzewski/wegorzewo.md.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  parseAnnouncement,
  auctionDateFromBody,
  isSaleAuctionTitle,
  isResultTitle,
} from './parse.js';

const ORIGIN = 'https://bip.wegorzewo.pl';
const BOARD_ANNOUNCEMENTS = '3';
const BOARD_RESULTS = '14619';
const FETCH_OPTS = { insecureTLS: true };

// Board pages hold ~10 rows each; a short page (<5) signals the last page
// for that year (same heuristic gizycko uses). MAX_PAGES bounds a broken
// feed / pagination loop from ever running away (ADAPTER-GUIDE §5.1).
const MAX_PAGES_ACTIVE = 6;
const MAX_PAGES_RESULTS = 20;

function currentYear() {
  return new Date().getFullYear();
}

export function listUrl(board, year, page = 1) {
  return `${ORIGIN}/wiadomosci/${board}/lista/${page}/${year}`;
}

// ---- list-page parser -------------------------------------------------------

const TITLE_LINK_RE = /<p class="title"><a href="([^"]+)">([^<]+)<\/a><\/p>/g;

export function parseListPage(html) {
  if (!html) return [];
  TITLE_LINK_RE.lastIndex = 0;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = TITLE_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&').trim();
    const title = m[2].replace(/&amp;/g, '&').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

// ---- detail-page helpers -----------------------------------------------------

export function publishedDateFromDetail(html) {
  if (!html) return null;
  const isoM = /Data wytworzenia dokumentu:\s*<span>(\d{4}-\d{2}-\d{2})<\/span>/i.exec(html);
  return isoM ? isoM[1] : null;
}

export function attachmentPdfUrlsFromDetail(html) {
  if (!html) return [];
  const out = [];
  const RE = /href="([^"]+\.pdf(?:\?[^"]*)?)"/gi;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    if (!out.includes(url)) out.push(url);
  }
  return out;
}

function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&sup2;/gi, '²')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&sect;/gi, '§')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Balanced-tag extraction of <div class="tresc">...</div> — wegorzewo's
 *  detail markup nests further <div>s inside it (see file header), so this
 *  tracks open/close depth instead of stopping at the first </div>. */
export function extractTrescDiv(html) {
  const src = html || '';
  const openM = /<div[^>]*\bclass="tresc"[^>]*>/i.exec(src);
  if (!openM) return '';
  const start = openM.index + openM[0].length;
  let depth = 1;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let m;
  let endIdx = -1;
  while ((m = tagRe.exec(src)) !== null) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0) { endIdx = m.index; break; }
    } else {
      depth++;
    }
  }
  return endIdx === -1 ? src.slice(start) : src.slice(start, endIdx);
}

export function bodyTextFromDetail(html) {
  return stripTags(extractTrescDiv(html));
}

// ---- board walk --------------------------------------------------------------

async function fetchBoardEntries(board, years, maxPages) {
  const allEntries = [];
  const seen = new Set();
  for (const year of years) {
    for (let page = 1; page <= maxPages; page++) {
      const url = listUrl(board, year, page);
      let html = '';
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  wegorzewo: list fetch failed (${url}): ${err.message}`);
        break;
      }
      const items = parseListPage(html);
      if (items.length === 0) break;
      let added = 0;
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        allEntries.push(item);
        added++;
      }
      console.error(`  wegorzewo: board ${board} ${year} page ${page}: ${items.length} entries (${added} new)`);
      if (items.length < 5) break; // short page = last page for this year
    }
  }
  return allEntries;
}

// ---- crawlActive --------------------------------------------------------------

export async function crawlActive() {
  const years = [currentYear(), currentYear() - 1];
  const allEntries = await fetchBoardEntries(BOARD_ANNOUNCEMENTS, years, MAX_PAGES_ACTIVE);
  const saleEntries = allEntries.filter((e) => isSaleAuctionTitle(e.title));
  console.error(`  wegorzewo: ${allEntries.length} board entries, ${saleEntries.length} sale announcement(s)`);

  const listings = [];
  const land = [];
  for (const entry of saleEntries) {
    let html = '';
    try {
      html = await getText(entry.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  wegorzewo: detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }
    const body = bodyTextFromDetail(html);
    const fullText = `${entry.title}\n${body}`;
    const rec = parseAnnouncement(fullText, entry.url);
    if (!rec) {
      console.error(`  wegorzewo: could not parse announcement: "${entry.title}"`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  wegorzewo active: ${listings.length} listing(s), ${land.length} land plot(s)`);
  return { listings, wykaz: [], land };
}

// ---- crawlResultDocs ------------------------------------------------------------

/**
 * Extract a result entry's usable text: the inline tresc body (every live
 * fixture so far), or — defensively, never yet exercised — pdfText/ocrPdf
 * over an attached PDF if the body itself doesn't carry the expected
 * "cena wywoławcza" block. @returns {Promise<string|null>}
 */
async function fetchResultText(entry) {
  let html = '';
  try {
    html = await getText(entry.url, FETCH_OPTS);
  } catch (err) {
    console.error(`  wegorzewo: result detail fetch failed (${entry.url}): ${err.message}`);
    return null;
  }
  const body = bodyTextFromDetail(html);
  const fullText = `${entry.title}\n${body}`;
  if (/cena\s+wywo[łl]awcza/i.test(fullText)) return fullText;

  // Defensive fallback (no live fixture has ever needed this path — see
  // parse.js's "SOURCE CORRECTION" header).
  const pdfUrls = attachmentPdfUrlsFromDetail(html);
  for (const pdfUrl of pdfUrls) {
    try {
      const text = await pdfText(pdfUrl, FETCH_OPTS);
      if (text && /cena\s+wywo[łl]awcza/i.test(text)) return `${entry.title}\n${text}`;
    } catch { /* try OCR next */ }
    try {
      const text = await ocrPdf(pdfUrl, FETCH_OPTS);
      if (text) return `${entry.title}\n${text}`;
    } catch (err) {
      console.error(`  wegorzewo: PDF/OCR fallback failed (${pdfUrl}): ${err.message}`);
    }
  }
  return fullText; // whatever we have, even if thin — let parseResultDoc's own gates decide
}

export async function crawlResultDocs() {
  const years = [currentYear(), currentYear() - 1, currentYear() - 2, currentYear() - 3];
  const allEntries = await fetchBoardEntries(BOARD_RESULTS, years, MAX_PAGES_RESULTS);
  const resultEntries = allEntries.filter((e) => isResultTitle(e.title));
  console.error(`  wegorzewo: ${allEntries.length} result-board entries, ${resultEntries.length} property result(s)`);

  const refs = [];
  for (const entry of resultEntries) {
    const text = await fetchResultText(entry);
    if (!text) continue;
    refs.push({ text, pdf_url: entry.url, auction_date: auctionDateFromBody(text) });
  }
  console.error(`  wegorzewo: ${refs.length} result ref(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
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
    ) + '\n',
  );
}
