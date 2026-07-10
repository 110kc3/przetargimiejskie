// Pajęczno crawler — single-host Sulimo board+detail HTML sweep (see
// config.js for the two-page-board / OCR-fallback rationale).
//
// crawlActive() and crawlResultDocs() share ONE underlying sweep (crawlAll,
// cached via a module-level promise — same pattern as chelmno) so the board
// and every detail page are each fetched exactly once per refresh run,
// regardless of which of the two registry methods runs first.
//
// Per board item (bounded MAX_PAGES pagination, ~16-20 items total as of
// 2026-07-10 — small enough that no separate item cap is needed):
//   1. Fetch the detail page.
//   2. If its title is a result notice ("Informacja o wyniku przetargu"):
//        try the inline body first; if empty (confirmed the case for the one
//        live example, n,354725 — text lives only in the attached scanned
//        PDF), OCR the first PDF attachment. Push {text, auction_date,
//        pdf_url, detail_url} onto resultRefs.
//   3. Else parseDetailPage() classifies + extracts a flat ('mieszkalny') or
//      land ('grunt') listing, or returns null for wykaz/rokowania/
//      bezprzetargowa/unrecognised pages (skipped).
//
// Field-naming convention for resultRefs (refresh.js reads `ref.pdf_url` and
// `ref.auction_date` regardless of city.source — confirmed by reading
// src/refresh.js directly; see kielce/chelm/braniewo/bydgoszcz/gorzow-
// wielkopolski for the same convention. NOT `date`/`url`, which some older
// adapters use but refresh.js does not actually read for those fields).

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

// Board is 2 pages / ~16-20 items total as of 2026-07-10 (spans back to
// 2021). Generous headroom over the observed size, still small enough that a
// runaway/broken pager can never loop long.
const MAX_PAGES = 6;

// ---------------------------------------------------------------------------
// Board pagination
// ---------------------------------------------------------------------------

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
    if (pageItems.length === 0 || newCount === 0) break; // empty/repeat page — past the end
  }
  return items;
}

// ---------------------------------------------------------------------------
// One sweep — listings + land + result refs
// ---------------------------------------------------------------------------

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
    if (!rec) continue; // wykaz / rokowania / bezprzetargowa / unrecognised kind
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  pajeczno: ${listings.length} flat listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  // wykaz is always [] here: the board's wykaz notices carry no per-flat data
  // in their inline HTML (only in a scanned-PDF attachment — see config.js);
  // the 3 flats they designate are already captured as real przetarg
  // listings once published, so OCR'ing the wykaz PDF would be pure
  // duplication, not incremental coverage.
  return { listings, wykaz: [], land };
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

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
