// Mogilno crawler.
//
// Source: bip.mogilno.pl — Nefeni Sp. z o.o. server-rendered HTML BIP.
//
// Boards:
//   Sales & designations: https://bip.mogilno.pl/kategorie/98-zbycie-nieruchomosci
//   Results (property):   https://bip.mogilno.pl/kategorie/101-informacja-o-wynikach-przetargow
//   Results (general):    https://bip.mogilno.pl/kategorie/265-rozstrzygniete
//
// Attachments are hosted on bip-api.mogilno.pl/api/attachments/<id>.
// Most formal notices and result notices in Mogilno are scanned PDFs (OCR required).

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  parseListPage,
  parseDetailPage,
  addressFromText,
  auctionDateFromText,
  roundFromText,
  startingPriceFromText,
  areaFromText,
  parcelFromText,
  obrebFromText,
  parseResultDoc,
} from './parse.js';

const ORIGIN = 'https://bip.mogilno.pl';
const SALES_CAT = '98';
const RESULTS_CAT_PROPERTY = '101';
const RESULTS_CAT_GENERAL = '265';
const MAX_PAGES = 5;

export function buildCategoryUrl(catSlug, page = 0, size = 100) {
  return `${ORIGIN}/kategorie/${catSlug}?size=${size}&page=${page}&lang=PL`;
}

/**
 * Harvest all article entries from a paginated category board.
 */
export async function harvestCategoryEntries(catSlug, catId) {
  const entries = [];
  const seen = new Set();
  let verified = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = buildCategoryUrl(catSlug, page);
    let html = '';
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  mogilno: category ${catSlug} page ${page} fetch failed: ${err.message}`);
      break;
    }

    const found = parseListPage(html, catId);
    if (page === 0) {
      verified = found.length > 0 || /Brak artykułów|Brak wiadomości/i.test(html);
    }

    let added = 0;
    for (const entry of found) {
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
      entries.push(entry);
      added++;
    }

    if (added === 0) break;
  }

  return { entries, verified };
}

/**
 * Extract text from an attachment URL, trying born-digital pdfText first,
 * then falling back to ocrPdf for scanned notices.
 */
export async function extractAttachmentText(url) {
  if (!url) return '';
  let text = '';
  try {
    text = await pdfText(url);
  } catch (err) {
    // pdfText error, proceed to OCR
  }

  // If pdftotext returned nothing or negligible whitespace/page-break characters
  if (!text || text.trim().length < 50) {
    try {
      text = await ocrPdf(url);
    } catch (err) {
      console.error(`  mogilno: ocrPdf failed for ${url}: ${err.message}`);
    }
  }

  return text || '';
}

/**
 * Crawl active listings, designations (wykaz), and land parcels.
 */
export async function crawlActive() {
  const { entries, verified } = await harvestCategoryEntries('98-zbycie-nieruchomosci', SALES_CAT);
  console.error(`  mogilno: crawled ${entries.length} entry/entries from zbycie-nieruchomosci`);

  const listings = [];
  const wykaz = [];
  const land = [];

  for (const entry of entries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  mogilno: detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const title = detail.title || entry.title;
    const publishedDate = detail.publishedDate || entry.published_date;

    // Skip rentals/leases
    if (/dzier[żz]aw|najem/i.test(title) && !/sprzeda[żz]/i.test(title)) {
      continue;
    }

    // Find first PDF attachment
    const pdfAtt = detail.attachments.find((a) => /\.pdf(?:$|\?)/i.test(a.url) || /\.pdf/i.test(a.name)) ||
      detail.attachments[0];
    const pdfUrl = pdfAtt ? pdfAtt.url : null;
    const docText = pdfUrl ? await extractAttachmentText(pdfUrl) : '';

    const isWykaz = /wykaz|w\s+sprawie\s+sporz[aą]dzenia\s+wykazu/i.test(title) && !/przetarg/i.test(title);
    const isAuction = /przetarg/i.test(title) || /przetarg/i.test(docText);

    if (isWykaz) {
      const kind = classifyKind(`${title} ${docText}`);
      const address = addressFromText(docText, title);
      wykaz.push({
        kind: kind === 'unknown' ? 'mieszkalny' : kind,
        address,
        address_raw: title,
        published_date: publishedDate,
        detail_url: entry.url,
        source_pdf: pdfUrl,
      });
      continue;
    }

    if (isAuction) {
      const kind = classifyKind(`${title} ${docText}`);
      const round = roundFromText(`${title} ${docText}`);
      const auctionDate = auctionDateFromText(docText);
      const startingPrice = startingPriceFromText(docText);
      const area = areaFromText(docText);

      if (kind === 'grunt') {
        const dzialka_nr = parcelFromText(`${docText} ${title}`);
        const obreb = obrebFromText(`${docText} ${title}`);
        land.push({
          kind: 'grunt',
          dzialka_nr,
          obreb,
          address_raw: title,
          auction_date: auctionDate,
          published_date: publishedDate,
          round,
          starting_price_pln: startingPrice,
          area_m2: area,
          detail_url: entry.url,
          source_pdf: pdfUrl,
        });
      } else if (['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz'].includes(kind)) {
        const address = addressFromText(docText, title);
        listings.push({
          kind,
          address,
          address_raw: title,
          auction_date: auctionDate,
          published_date: publishedDate,
          round,
          starting_price_pln: startingPrice,
          area_m2: area,
          detail_url: entry.url,
          source_pdf: pdfUrl,
        });
      }
    }
  }

  console.error(`  mogilno active: ${listings.length} listing(s), ${wykaz.length} wykaz, ${land.length} land`);
  return {
    listings,
    wykaz,
    land,
    valid_empty: verified && listings.length === 0,
    valid_empty_land: verified && land.length === 0,
  };
}

/**
 * Crawl result documents from results boards.
 */
export async function crawlResultDocs() {
  const resultCats = [
    { slug: '101-informacja-o-wynikach-przetargow', id: RESULTS_CAT_PROPERTY },
    { slug: '265-rozstrzygniete', id: RESULTS_CAT_GENERAL },
  ];

  const allEntries = [];
  const seenUrls = new Set();

  for (const cat of resultCats) {
    const { entries } = await harvestCategoryEntries(cat.slug, cat.id);
    for (const e of entries) {
      if (!seenUrls.has(e.url)) {
        seenUrls.add(e.url);
        allEntries.push(e);
      }
    }
  }

  console.error(`  mogilno: found ${allEntries.length} candidate result entry/entries`);

  const refs = [];
  for (const entry of allEntries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  mogilno: result detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const publishedDate = detail.publishedDate || entry.published_date;

    for (const att of detail.attachments) {
      // Must be a document (PDF)
      if (!/\.pdf(?:$|\?)/i.test(att.url) && !/\.pdf/i.test(att.name) && !/informacja|wynik|przetarg/i.test(att.name)) {
        continue;
      }

      const text = await extractAttachmentText(att.url);
      if (!text || text.trim().length < 20) continue;

      // Verify that parseResultDoc finds at least one valid record
      const recs = parseResultDoc(text, publishedDate, att.url);
      if (recs && recs.length > 0) {
        refs.push({
          pdf_url: att.url,
          auction_date: publishedDate,
          detail_url: entry.url,
          text,
        });
      }
    }
  }

  console.error(`  mogilno: ${refs.length} result doc ref(s) extracted`);
  return refs;
}
