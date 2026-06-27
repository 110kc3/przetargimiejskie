// Racibórz crawler — bipraciborz.pl Liferay BIP (no SPA, no auth, no OCR).
//
// Two boards, both plain HTML:
//   ACTIVE_BOARD — "sprzedaż" listings: announcements + rokowania
//   RESULTS_BOARD — "Informacje o wynikach przetargów": result notices
//
// Each board renders a list of `<div class="article-section" data-announcement-id="NNN">` items
// that each link to a detail page at ?komunikat=NNN. The detail page lists all
// attachments; the first PDF is always "ogłoszenie*.pdf" (the announcement) or the
// result notice PDF. Images, ODT forms, szkic.pdf follow — only the first PDF matters.
//
// Pagination on the active board: ?start=0 (default), ?start=1, … (10 items per page).
// The results board currently has only a handful of items and no pagination.
//
// `source: 'html'` means crawlResultDocs() returns refs with `.text` already extracted,
// so refresh.js hands them directly to parseResultDoc without going through the OCR path.

import { getText, getBytes } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncement, isResultNotice, isSkippableTitle, isResultTitle, isAnnouncementTitle } from './parse.js';

const ORIGIN = 'https://www.bipraciborz.pl';

// Active sale listings board (sprzedaż, all types including garaż + rokowania).
const ACTIVE_BOARD =
  `${ORIGIN}/bip/dokumenty-akcja-wyszukaj-idstatusu-77591-idtypu-77593-idkategorii-39853-idzakladki-95775-numerzakladki-1`;
// Results board ("Informacje o wynikach przetargów").
const RESULTS_BOARD = `${ORIGIN}/en/bipkod/27948305`;

const PAGE_SIZE = 10; // BIP returns 10 items per page

/**
 * Parse the board HTML and return all komunikat entries.
 * Each <div class="article-section" data-announcement-id="NNN"> wraps one item;
 * the title is in <h2 class="article-main-title">.
 *
 * @param {string} html
 * @param {string} baseUrl   the board URL (used to build detail + board-page URLs)
 * @returns {Array<{id:string, title:string, detailUrl:string}>}
 */
export function parseBoardHtml(html, baseUrl) {
  const out = [];
  // Match each article-section block
  const sectionRe =
    /data-announcement-id="(\d+)"[\s\S]*?<h2[^>]*class="article-main-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const id = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    out.push({ id, title, detailUrl: `${baseUrl}?komunikat=${id}` });
  }
  return out;
}

/**
 * Fetch all pages of a board and return the flattened komunikat list.
 * @param {string} boardUrl  base URL (pagination appended as ?start=N)
 * @param {string} label     for error messages
 * @returns {Promise<Array<{id,title,detailUrl}>>}
 */
async function listBoard(boardUrl, label) {
  const all = [];
  const seen = new Set();
  let page = 0;
  for (;;) {
    const url = page === 0 ? boardUrl : `${boardUrl}?start=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  raciborz ${label} board page ${page} failed: ${err.message}`);
      break;
    }
    const items = parseBoardHtml(html, boardUrl);
    let newItems = 0;
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      all.push(item);
      newItems++;
    }
    // Stop when page is under-full (< PAGE_SIZE items) or no new items were seen.
    if (items.length < PAGE_SIZE || newItems === 0) break;
    page++;
  }
  return all;
}

/**
 * Given a detail page URL, return the first PDF attachment URL, or null.
 * The attachment list on the detail page looks like:
 *   <a href="/res/serwisy/pliki/NNN?version=1.0">ogłoszenie I_NNN.pdf</a>
 * We take the first href that matches the file pattern.
 * @param {string} detailUrl
 * @returns {Promise<string|null>}
 */
async function firstPdfUrl(detailUrl) {
  let html;
  try {
    html = await getText(detailUrl);
  } catch (err) {
    console.error(`  raciborz detail page failed ${detailUrl}: ${err.message}`);
    return null;
  }
  const m = /href="(\/res\/serwisy\/pliki\/\d+[^"]*)"/i.exec(html);
  return m ? `${ORIGIN}${m[1]}` : null;
}

// One memoised pass (active + results boards share one cache slot each).
let crawlActivePromise = null;
let crawlResultsPromise = null;

async function crawlActiveAll() {
  const listings = [];
  const items = await listBoard(ACTIVE_BOARD, 'active');
  console.error(`  raciborz active board: ${items.length} item(s)`);

  for (const item of items) {
    if (isSkippableTitle(item.title)) continue;
    // Rokowania + przetargi are both announcements (result notices land on a different board).
    if (!isAnnouncementTitle(item.title)) continue;

    const pdfUrl = await firstPdfUrl(item.detailUrl);
    if (!pdfUrl) {
      console.error(`  raciborz: no PDF attachment for komunikat ${item.id} (${item.title.slice(0, 60)})`);
      continue;
    }
    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  raciborz: PDF extract failed ${pdfUrl}: ${err.message}`);
      continue;
    }
    const rec = parseAnnouncement(text);
    if (!rec) {
      console.error(`  raciborz WARN: announcement not parsed (komunikat ${item.id}, ${item.title.slice(0, 60)})`);
      continue;
    }
    listings.push({ ...rec, detail_url: item.detailUrl, source_url: pdfUrl });
  }
  console.error(`  raciborz: ${listings.length} listing(s) parsed`);
  return listings;
}

async function crawlResultsAll() {
  const resultRefs = [];
  const items = await listBoard(RESULTS_BOARD, 'results');
  console.error(`  raciborz results board: ${items.length} item(s)`);

  for (const item of items) {
    if (!isResultTitle(item.title)) continue;

    const pdfUrl = await firstPdfUrl(item.detailUrl);
    if (!pdfUrl) {
      console.error(`  raciborz: no PDF on result komunikat ${item.id} (${item.title.slice(0, 60)})`);
      continue;
    }
    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  raciborz: result PDF extract failed ${pdfUrl}: ${err.message}`);
      continue;
    }
    if (!isResultNotice(text)) {
      console.error(`  raciborz WARN: result PDF body not a result notice (komunikat ${item.id})`);
      continue;
    }
    resultRefs.push({ text, pdf_url: pdfUrl, detail_url: item.detailUrl, auction_date: null });
  }
  console.error(`  raciborz: ${resultRefs.length} result notice(s)`);
  return resultRefs;
}

/** Active listings → { listings, wykaz: [], land: [] }. */
export async function crawlActive() {
  crawlActivePromise ??= crawlActiveAll();
  const listings = await crawlActivePromise;
  return { listings, wykaz: [], land: [] };
}

/** Result notices (achieved prices) for the results board. */
export async function crawlResultDocs() {
  crawlResultsPromise ??= crawlResultsAll();
  return crawlResultsPromise;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
