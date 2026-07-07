// Warszawa crawler — ETO category/165 (Wykup lokalu, przetargi).
//
// ARCHITECTURE:
//   ETO /category/165/announcement  <- single non-paginated page with ALL active
//                                      flat-sale announcements across all 18 dzielnice
//     +-- City-owned items (Srodmiescie, etc.)
//     |     href -> <dzielnica>.um.warszawa.pl/-/<slug>
//     |     crawlActive(): fetch dzielnica detail page, parse article text
//     |     crawlResultDocs(): fetch result-notice detail page, return with .text set
//     |
//     +-- AMW items (Agencja Mienia Wojskowego)
//           href -> eto.um.warszawa.pl/category/165/announcement/<eto-id>
//           PDF at /announcement/attachment/<eto-id>/<att-id> (scanned image)
//           crawlActive(): OCR the PDF via ocrPdf(), parse with parseAmwPdfText()
//
// SOURCE: 'html' -- crawlResultDocs() sets ref.text so refresh.js feeds it
// directly to parseResultDoc() without re-fetching.
//
// ETO is a LIVE WINDOW: only currently-active announcements appear on the list.
// Result notices have ~8-day windows. Daily polling is required to capture them.
// crawlResultDocs() skips known URLs (via loadKnownSourceUrls) to avoid
// re-processing already-captured result pages.
//
// NO PAGINATION: the ETO /category/165/announcement page shows ALL active items
// in one page (confirmed 2026-06-29: 11 items, no page-2 link).
//
// KNOWN LIMITS:
//   - Starting price: NOT available from ETO list titles or Srodmiescie article
//     bodies in current live samples (wykaz-phase notices). Added as null for
//     city-owned items.
//   - AMW PDF: scanned images (pdftotext returns empty); OCR via ocrPdf()
//     + parseAmwPdfText() extracts starting_price_pln, area_m2, auction_date.
//     Requires Polish tessdata (pol.traineddata) in the OCR environment.
//   - Per-dzielnica spot-check completed 2026-06-29 -- see warszawa.md.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseEtoListPage,
  isResultNoticeTitle,
  articleTextFromHtml,
  parseDetailText,
  attachmentUrlFromEtoDetail,
  parseAmwPdfText,
} from './parse.js';

const ETO_LIST_URL = 'https://eto.um.warszawa.pl/category/165/announcement';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  // 1. Fetch ETO list page
  let listHtml;
  try {
    listHtml = await getText(ETO_LIST_URL, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error('  warszawa: ETO list fetch failed: ' + err.message);
    return { listings, resultRefs };
  }

  const items = parseEtoListPage(listHtml);
  console.error('  warszawa: ETO list returned ' + items.length + ' items');

  const knownUrls = await loadKnownSourceUrls('warszawa');
  const seenUrls = new Set();

  // 2. Route each item
  for (const item of items) {
    const url = item.detail_url;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    // Result notice
    if (isResultNoticeTitle(item.title)) {
      if (knownUrls.has(url)) {
        console.error('  warszawa result: already captured ' + url + ' -- skipping');
        continue;
      }
      let detailHtml = '';
      try {
        detailHtml = await getText(url, { userAgent: BROWSER_UA, retries: 1 });
      } catch (err) {
        console.error('  warszawa result detail fetch failed (' + url + '): ' + err.message);
        continue;
      }
      const text = articleTextFromHtml(detailHtml) || '';
      if (!text) {
        console.error('  warszawa result: no article text found on ' + url);
        continue;
      }
      resultRefs.push({ text, pdf_url: url, auction_date: null });
      console.error('  warszawa result: captured "' + item.title.slice(0, 60) + '"');
      continue;
    }

    // Filter non-flat items
    if (item.kind && item.kind !== 'mieszkalny') {
      console.error('  warszawa: skipping non-flat "' + item.title.slice(0, 60) + '" (kind=' + item.kind + ')');
      continue;
    }

    // AMW item: OCR the PDF attachment
    if (item.is_eto_hosted) {
      // Step 1: get PDF attachment URL from ETO detail page
      let attUrl = null;
      try {
        const detailHtml = await getText(url, { userAgent: BROWSER_UA, retries: 1 });
        attUrl = attachmentUrlFromEtoDetail(detailHtml);
      } catch (err) {
        console.error('  warszawa AMW detail fetch failed (' + url + '): ' + err.message);
      }

      // Step 2: OCR the PDF and parse structured fields
      let pdfFields = { starting_price_pln: null, area_m2: null, auction_date: null,
                        address: null, address_raw: null, apt: null, round: null };
      if (attUrl) {
        try {
          const ocrText = await ocrPdf(attUrl, { userAgent: BROWSER_UA });
          pdfFields = parseAmwPdfText(ocrText);
          console.error(
            '  warszawa AMW PDF parsed: price=' + pdfFields.starting_price_pln +
            ' area=' + pdfFields.area_m2 + ' date=' + pdfFields.auction_date,
          );
        } catch (err) {
          console.error('  warszawa AMW PDF OCR failed (' + attUrl + '): ' + err.message);
        }
      }

      // Fall back to title-based parsing for any missing fields
      const titleFields = parseDetailText(item.title);

      listings.push({
        kind: item.kind ?? 'mieszkalny',
        address_raw: pdfFields.address_raw ?? titleFields.address_raw ?? item.title,
        address: pdfFields.address ?? titleFields.address,
        auction_date: pdfFields.auction_date ?? titleFields.auction_date,
        published_date: item.published_from,
        round: pdfFields.round ?? titleFields.round,
        area_m2: pdfFields.area_m2 ?? titleFields.area_m2,
        starting_price_pln: pdfFields.starting_price_pln,
        detail_url: attUrl ?? url,
        eto_nr: item.eto_nr,
        source: 'amw',
      });
      continue;
    }

    // City-owned item: fetch dzielnica detail page
    let detailHtml = '';
    try {
      detailHtml = await getText(url, { userAgent: BROWSER_UA, retries: 1 });
    } catch (err) {
      console.error('  warszawa detail fetch failed (' + url + '): ' + err.message);
      listings.push({
        kind: item.kind ?? 'mieszkalny',
        address_raw: item.title,
        address: null,
        auction_date: null,
        published_date: item.published_from,
        round: null,
        area_m2: null,
        starting_price_pln: null,
        detail_url: url,
        eto_nr: item.eto_nr,
        source: 'city',
      });
      continue;
    }

    const articleText = articleTextFromHtml(detailHtml);
    const parsed = parseDetailText(articleText);

    listings.push({
      kind: item.kind ?? 'mieszkalny',
      address_raw: parsed.address_raw ?? item.title,
      address: parsed.address,
      auction_date: parsed.auction_date,
      published_date: item.published_from,
      round: parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: null, // not in wykaz-phase announcements
      detail_url: url,
      eto_nr: item.eto_nr,
      source: 'city',
    });
    console.error(
      '  warszawa: "' + item.title.slice(0, 55) + '" -> ' + (parsed.address_raw ?? 'no address'),
    );
  }

  console.error(
    '  warszawa: ' + listings.length + ' active listing(s), ' +
    resultRefs.length + ' result notice(s) captured',
  );
  return { listings, resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [] };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  console.error('Total: ' + listings.length + ' active listing(s)');
}
