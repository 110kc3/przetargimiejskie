// Crawls the Katowice city BIP "Tablica ogłoszeń" board. Two document streams:
//   - sale-auction announcements -> active listings (parseAnnouncement)
//   - "wyniki przetargów" result PDFs -> sold records (parseResultPdf)
// The board list page and the document pages are both plain HTML — see
// SPIKE-WAVE1.md. The board is paginated; we walk pages adaptively until two
// consecutive pages yield no new auction-relevant docs.

import { getText } from '../../core/fetch.js';
import { parseAnnouncement } from './parse.js';

const BOARD =
  'https://bip.katowice.eu/ogloszenia/tablicaogloszen/default.aspx?idt=468&menu=679';
const ORIGIN = 'https://bip.katowice.eu';
const DOC = (idr) =>
  `${ORIGIN}/ogloszenia/tablicaogloszen/dokument.aspx?idr=${idr}&menu=679`;
const MAX_PAGES = 25;             // hard cap (the board is ~13–15 pages today)
const STOP_AFTER_EMPTY_PAGES = 5; // stop after this many consecutive auction-empty pages

const LINK_RE =
  /<a\b[^>]*\bhref="[^"]*dokument\.aspx\?idr=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
const PDF_RE = /href="([^"]*Attachments\/\d+\/[^"]*\.pdf)"/i;
const stripTags = (s) =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

const isAnnouncement = (t) =>
  /przetarg\w*\s+ustn\w+\s+nieograniczon\w+\s+na\s+sprzeda[żz]/i.test(t);
const isResult = (t) =>
  /informacj\w*\s+o\s+[\s\S]*wynik\w+[\s\S]*przetarg/i.test(t);

let _board = null;

// Crawl the board once per run; classify each auction-relevant document.
async function crawlBoard() {
  if (_board) return _board;
  const docs = [];
  const seen = new Set();
  let consecutiveEmpty = 0;
  let lastPage = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BOARD : `${BOARD}&page=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  katowice board page ${page}: ${err.message}`);
      break;
    }
    lastPage = page;
    let foundOnPage = 0;
    LINK_RE.lastIndex = 0;
    let m;
    while ((m = LINK_RE.exec(html)) !== null) {
      const idr = m[1];
      const title = stripTags(m[2]);
      if (!title || seen.has(idr)) continue;
      let kind = null;
      if (isResult(title)) kind = 'result';
      else if (isAnnouncement(title)) kind = 'announcement';
      if (!kind) continue;
      seen.add(idr);
      docs.push({ idr, title, kind, doc_url: DOC(idr) });
      foundOnPage++;
    }
    if (foundOnPage === 0) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= STOP_AFTER_EMPTY_PAGES) break;
    } else {
      consecutiveEmpty = 0;
    }
  }
  _board = docs;
  console.error(
    `  katowice board: walked ${lastPage} page(s), collected ${docs.length} auction doc(s)`,
  );
  return docs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  const docs = (await crawlBoard()).filter((d) => d.kind === 'announcement');
  console.error(`  katowice: ${docs.length} sale-announcement document(s)`);
  const listings = [];
  for (const d of docs) {
    let html;
    try {
      html = await getText(d.doc_url);
    } catch (err) {
      console.error(`  katowice doc ${d.idr}: ${err.message}`);
      continue;
    }
    const listing = parseAnnouncement(html, d.title, d.doc_url);
    if (listing) listings.push(listing);
  }
  console.error(`  katowice: ${listings.length} active listing(s) parsed`);
  return { listings, wykaz: [] };
}

/** @returns {Promise<Array<{ pdf_url: string, auction_date: string|null }>>} */
export async function crawlResultDocs() {
  const docs = (await crawlBoard()).filter((d) => d.kind === 'result');
  const refs = [];
  for (const d of docs) {
    let html;
    try {
      html = await getText(d.doc_url);
    } catch (err) {
      console.error(`  katowice result doc ${d.idr}: ${err.message}`);
      continue;
    }
    const pm = PDF_RE.exec(html);
    if (!pm) {
      console.error(`  katowice result doc ${d.idr}: no PDF attachment link`);
      continue;
    }
    let pdfUrl = pm[1].replace(/&amp;/gi, '&');
    if (!pdfUrl.startsWith('http')) pdfUrl = ORIGIN + pdfUrl;
    pdfUrl = pdfUrl.replace(/ /g, '%20');
    const dm = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(d.title);
    const auction_date = dm
      ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`
      : null;
    refs.push({ pdf_url: pdfUrl, auction_date });
  }
  console.error(`  katowice: ${refs.length} result PDF(s)`);
  return refs;
}
