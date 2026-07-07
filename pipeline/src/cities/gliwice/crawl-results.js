// Walks /wyniki-przetargow/page/N/ and returns every historical result-PDF URL.
//
// The page itself is HTML with one card per result; each card links to a PDF
// (e.g. .../04.05.2026-r.-wyniki-przetargow.pdf) and shows a "Data publikacji"
// date. The *auction* date sits inside the PDF filename — we extract it here so
// downstream code never has to parse Polish month names.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';

const BASE = 'https://zgm-gliwice.pl/wyniki-przetargow';

/**
 * @typedef {object} ResultPdfRef
 * @property {string} pdf_url
 * @property {string} auction_date     ISO YYYY-MM-DD parsed from the PDF filename
 * @property {string} listing_page_url
 */

const PDF_RE =
  /href="(https:\/\/zgm-gliwice\.pl\/wp-content\/uploads\/[^"]+wyniki[^"]*\.pdf)"/gi;

// ZGM is inconsistent with filename dates. Examples seen:
//   04.05.2026-r.-wyniki-przetargow.pdf   (DD.MM.YYYY canonical)
//   16.06.2025-wyniki-przetargow.pdf      (DD.MM.YYYY, no "r.")
//   22.092025-r.-wyniki-przetargow.pdf    (DD.MMYYYY — missing dot, real typo)
//   26.08.24-wyniki-przetargow.pdf        (DD.MM.YY — 2-digit year)
const DATE_PATTERNS = [
  /\/(\d{2})\.(\d{2})\.(\d{4})[.-]/, // DD.MM.YYYY
  /\/(\d{2})\.(\d{2})(\d{4})[.-]/,   // DD.MMYYYY
  /\/(\d{2})\.(\d{2})\.(\d{2})[.-]/, // DD.MM.YY
];

/** @param {string} pdfUrl @returns {string|null} */
function extractAuctionDate(pdfUrl) {
  for (const re of DATE_PATTERNS) {
    const m = re.exec(pdfUrl);
    if (!m) continue;
    let [, dd, mm, yy] = m;
    if (yy.length === 2) yy = `20${yy}`;
    const d = Number(dd), mo = Number(mm), y = Number(yy);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2020 || y > 2099) continue;
    return `${yy}-${mm}-${dd}`;
  }
  return null;
}

/** @returns {Promise<ResultPdfRef[]>} */
export async function crawlAllResultPdfs() {
  /** @type {Map<string, ResultPdfRef>} */
  const found = new Map();
  let page = 1;
  let consecutiveEmpty = 0;
  while (consecutiveEmpty < 1) {
    const url = page === 1 ? `${BASE}/` : `${BASE}/page/${page}/`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  page ${page}: ${err.message} — end of pagination`);
      break;
    }
    const before = found.size;
    let m;
    PDF_RE.lastIndex = 0;
    while ((m = PDF_RE.exec(html)) !== null) {
      const pdfUrl = m[1];
      if (found.has(pdfUrl)) continue;
      const auctionDate = extractAuctionDate(pdfUrl);
      if (!auctionDate) {
        console.error(`  WARN: cannot parse date from ${pdfUrl}`);
        continue;
      }
      found.set(pdfUrl, { pdf_url: pdfUrl, auction_date: auctionDate, listing_page_url: url });
    }
    const added = found.size - before;
    console.error(`  page ${page}: ${added} new PDF link(s) (total ${found.size})`);
    if (added === 0) consecutiveEmpty++; else consecutiveEmpty = 0;
    page++;
    if (page > 50) break;
  }
  return [...found.values()].sort((a, b) => b.auction_date.localeCompare(a.auction_date));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const refs = await crawlAllResultPdfs();
  process.stdout.write(JSON.stringify(refs, null, 2) + '\n');
  console.error(`Total: ${refs.length} result PDF(s)`);
}
