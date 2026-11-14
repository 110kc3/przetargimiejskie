import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';

const BASE = 'https://zgm-gliwice.pl/wyniki-przetargow';


const PDF_RE =
  /href="(https:\/\/zgm-gliwice\.pl\/wp-content\/uploads\/[^"]+wyniki[^"]*\.pdf)"/gi;

const DATE_PATTERNS = [
  /\/(\d{2})\.(\d{2})\.(\d{4})[.-]/,
  /\/(\d{2})\.(\d{2})(\d{4})[.-]/,
  /\/(\d{2})\.(\d{2})\.(\d{2})[.-]/,
];

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

export async function crawlAllResultPdfs() {
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
