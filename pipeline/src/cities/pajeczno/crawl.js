
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  parseBoardPage,
  parseDetailPage,
  extractTitle,
  extractBody,
  publishedDateFromDetail,
  extractAttachmentPdf,
  isResultTitle,
} from './parse.js';

const BOARD_BASE = 'https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/';

const MAX_PAGES = 6;


async function collectBoardItems() {
  const items = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BOARD_BASE : `${BOARD_BASE}?p=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  pajeczno: board page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }
    const pageItems = parseBoardPage(html);
    let newCount = 0;
    for (const it of pageItems) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      items.push(it);
      newCount++;
    }
    if (pageItems.length === 0 || newCount === 0) break;
  }
  return items;
}


let crawlPromise = null;

async function crawlAll() {
  const boardItems = await collectBoardItems();
  console.error(`  pajeczno: ${boardItems.length} board item(s) across all pages`);

  const listings = [];
  const land = [];
  const resultRefs = [];

  for (const item of boardItems) {
    let html;
    try {
      html = await getText(item.url);
    } catch (err) {
      console.error(`  pajeczno: detail fetch failed (${item.url}): ${err.message}`);
      continue;
    }

    const title = extractTitle(html);
    if (isResultTitle(title)) {
      const publishedDate = publishedDateFromDetail(html) ?? item.published_date;
      let text = extractBody(html);
      let pdfUrl = null;
      if (!text) {
        pdfUrl = extractAttachmentPdf(html);
        if (pdfUrl) {
          try {
            text = await ocrPdf(pdfUrl);
          } catch (err) {
            console.error(`  pajeczno: OCR failed (${pdfUrl}): ${err.message}`);
            continue;
          }
        }
      }
      if (!text) {
        console.error(`  pajeczno: result notice with no extractable text (${item.url})`);
        continue;
      }
      resultRefs.push({
        text,
        auction_date: publishedDate,
        pdf_url: pdfUrl ?? item.url,
        detail_url: item.url,
      });
      continue;
    }

    const rec = parseDetailPage(html, item.url, item.published_date);
    if (!rec) continue;
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  pajeczno: ${listings.length} flat listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
  );
  return { listings, land, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
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
      },
      null,
      2,
    ) + '\n',
  );
}
