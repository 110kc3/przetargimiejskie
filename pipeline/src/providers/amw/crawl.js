import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseAmwActivePage, parseAmwResultsPage, parseAmwResultText, nextAmwPage } from './parse.js';

const ACTIVE_URL = 'https://amw.com.pl/pl/nieruchomosci/przetargi-nieruchomosci';
const RESULTS_URL = `${ACTIVE_URL}/wyniki-przetargow`;
const BROWSER_UA = 'Mozilla/5.0 (compatible; PrzetargiMiejskie/1.0; +https://przetargimiejskie.pl)';

async function crawlPages(firstUrl, parser, maxPages = 20) {
  const rows = [];
  const seen = new Set();
  let url = firstUrl;
  while (url && !seen.has(url) && seen.size < maxPages) {
    seen.add(url);
    const html = await getText(url, { userAgent: BROWSER_UA });
    rows.push(...parser(html));
    url = nextAmwPage(html);
  }
  return { rows, pages: seen.size };
}

export async function crawlAmw(_previous = []) {
  const active = await crawlPages(ACTIVE_URL, parseAmwActivePage);
  const results = await crawlPages(RESULTS_URL, parseAmwResultsPage);
  for (const row of results.rows) {
    if (row.outcome !== 'sold' || !row.result_url) continue;
    try {
      // ocrPdf is content-addressed, so this is instant after the first run.
      // Re-parse cached text every day so parser fixes repair committed rows.
      const text = await ocrPdf(row.result_url, { userAgent: BROWSER_UA });
      Object.assign(row, parseAmwResultText(text));
    } catch (error) {
      console.error(`  AMW result OCR ${row.result_url}: ${error.message}`);
    }
  }

  console.error(`  AMW: ${active.rows.length} active and ${results.rows.length} result residential sale rows (${active.pages + results.pages} page(s))`);
  return [...active.rows, ...results.rows];
}
