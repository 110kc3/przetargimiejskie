// Zgierz crawler.
//
// Source: zgierz.bip.net.pl — Nefeni Sp. z o.o. server-rendered HTML BIP (Next.js).
//
// Boards:
//   Flats & premises: https://zgierz.bip.net.pl/kategorie/121-sprzedaz-lokali-
//   Land parcels:     https://zgierz.bip.net.pl/kategorie/120-sprzedaz-gruntow
//
// Attachments are hosted on zgierz-api.bip.net.pl/api/attachments/<id>.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  parseListPage,
  parseDetailPage,
  parseAnnouncementFlats,
  parseAnnouncementLand,
  parseResultDoc,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://zgierz.bip.net.pl';
const FLATS_CAT = '121';
const FLATS_SLUG = '121-sprzedaz-lokali-';
const LAND_CAT = '120';
const LAND_SLUG = '120-sprzedaz-gruntow';
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
      console.error(`  zgierz: category ${catSlug} page ${page} fetch failed: ${err.message}`);
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

  if (!text || text.trim().length < 50) {
    try {
      text = await ocrPdf(url);
    } catch (err) {
      console.error(`  zgierz: ocrPdf failed for ${url}: ${err.message}`);
    }
  }

  return text || '';
}

/**
 * Crawl active flat listings and land auctions.
 */
export async function crawlActive() {
  const { entries: flatEntries, verified: verifiedFlats } = await harvestCategoryEntries(FLATS_SLUG, FLATS_CAT);
  const { entries: landEntries, verified: verifiedLand } = await harvestCategoryEntries(LAND_SLUG, LAND_CAT);
  console.error(`  zgierz: crawled ${flatEntries.length} flat entry/entries, ${landEntries.length} land entry/entries`);

  const listings = [];
  const wykaz = [];
  const land = [];

  // Crawl flats
  for (const entry of flatEntries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  zgierz: detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const title = detail.title || entry.title;
    const publishedDate = detail.publishedDate || entry.published_date;

    // Skip commercial lease / rental notices
    if (/dzier[żz]aw|najem/i.test(title) && !/sprzeda[żz]/i.test(title)) {
      continue;
    }

    // If result attachments exist or title specifies "wynik", it is a concluded auction
    // (handled by crawlResultDocs)
    const hasResults = detail.attachments.some((a) => /wynik|inform/i.test(a.name));
    if (hasResults || /wynik/i.test(title)) {
      continue;
    }

    // Find the announcement PDF
    const annPdf = detail.attachments.find((a) => !/wynik|inform/i.test(a.name) && /\.pdf(?:$|\?)/i.test(a.url)) ||
      detail.attachments[0];
    if (!annPdf) continue;

    const docText = await extractAttachmentText(annPdf.url);
    if (!docText) continue;

    const parsedFlats = parseAnnouncementFlats(docText, publishedDate, null, entry.url, annPdf.url);
    for (const f of parsedFlats) {
      listings.push({
        ...f,
        published_date: publishedDate,
      });
    }
  }

  // Crawl land
  for (const entry of landEntries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  zgierz: land detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const title = detail.title || entry.title;
    const publishedDate = detail.publishedDate || entry.published_date;

    if (/dzier[żz]aw|najem/i.test(title) && !/sprzeda[żz]/i.test(title)) {
      continue;
    }

    const hasResults = detail.attachments.some((a) => /wynik|inform/i.test(a.name));
    if (hasResults || /wynik/i.test(title)) {
      continue;
    }

    const annPdf = detail.attachments.find((a) => !/wynik|inform/i.test(a.name) && /\.pdf(?:$|\?)/i.test(a.url)) ||
      detail.attachments[0];
    if (!annPdf) continue;

    const docText = await extractAttachmentText(annPdf.url);
    if (!docText) continue;

    const parsedLand = parseAnnouncementLand(docText, publishedDate, null, entry.url, annPdf.url);
    if (parsedLand) {
      land.push({
        ...parsedLand,
        published_date: publishedDate,
      });
    }
  }

  console.error(`  zgierz active: ${listings.length} listing(s), ${wykaz.length} wykaz, ${land.length} land`);
  return {
    listings,
    wykaz,
    land,
    valid_empty: verifiedFlats && listings.length === 0,
    valid_empty_land: verifiedLand && land.length === 0,
  };
}

/**
 * Crawl result documents from resolved articles in both categories.
 */
export async function crawlResultDocs() {
  const resultCats = [
    { slug: FLATS_SLUG, id: FLATS_CAT },
    { slug: LAND_SLUG, id: LAND_CAT },
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

  console.error(`  zgierz: found ${allEntries.length} candidate result entry/entries`);

  const refs = [];
  for (const entry of allEntries) {
    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  zgierz: result detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const publishedDate = detail.publishedDate || entry.published_date;

    for (const att of detail.attachments) {
      // Must be a result document
      if (!/wynik|inform/i.test(att.name) && !/wynik|inform/i.test(att.url)) {
        continue;
      }

      const text = await extractAttachmentText(att.url);
      if (!text || text.trim().length < 20) continue;

      const recs = parseResultDoc(text, publishedDate, att.url);
      if (recs && recs.length > 0) {
        const auctionDate = auctionDateFromText(text) || publishedDate;
        refs.push({
          pdf_url: att.url,
          auction_date: auctionDate,
          detail_url: entry.url,
          text,
        });
      }
    }
  }

  console.error(`  zgierz: ${refs.length} result doc ref(s) extracted`);
  return refs;
}
