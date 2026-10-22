// Złotów crawler.
//
// Source: bip.zlotow.pl — Nefeni BIPv2 (Next.js App Router SSR platform).
//
// Boards:
//   Parent property sales:      https://bip.zlotow.pl/kategorie/181-sprzedaz-nieruchomosci
//   Flats & premises:           https://bip.zlotow.pl/kategorie/184-sprzedaz-nieruchomosci-lokalowej
//   Tender notices board:       https://bip.zlotow.pl/kategorie/94-ogloszenia-o-przetargu
//   Wykaz board:                https://bip.zlotow.pl/kategorie/91-wykaz-nieruchomosci-przeznaczonych-do-obrotu
//
// Attachments are hosted on bip-api.zlotow.pl/api/attachments/<id>.
// PDF documents are born-digital or clean scans (pdfText with ocrPdf fallback).

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { classifyKind } from '../../core/classify-kind.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseListPage,
  parseDetailPage,
  isAnnouncement,
  isResultNotice,
  isWykaz,
  parseAnnouncementDoc,
  parseResultDoc,
  addressFromText,
} from './parse.js';

const ORIGIN = 'https://bip.zlotow.pl';
const MAX_PAGES = 5;

// Active announcement categories (current and recent years)
const ACTIVE_ANNOUNCEMENT_CATS = [
  '267-2026',
  '242-2025',
  '243-2025',
  '181-sprzedaz-nieruchomosci',
  '184-sprzedaz-nieruchomosci-lokalowej',
  '94-ogloszenia-o-przetargu',
];

// Active wykaz categories (current and recent years)
const ACTIVE_WYKAZ_CATS = [
  '270-2026',
  '241-2025',
  '91-wykaz-nieruchomosci-przeznaczonych-do-obrotu',
];

// All historical result categories for achieved-price stream
const ALL_RESULT_CATS = [
  '267-2026',
  '242-2025',
  '182-2024',
  '183-2023',
  '243-2025',
  '187-2024',
  '185-2023',
  '181-sprzedaz-nieruchomosci',
  '184-sprzedaz-nieruchomosci-lokalowej',
  '94-ogloszenia-o-przetargu',
];

export function buildCategoryUrl(catSlug, page = 0, size = 100) {
  return `${ORIGIN}/kategorie/${catSlug}?size=${size}&page=${page}&lang=PL`;
}

/**
 * Dynamically discover subcategories linked from a parent category board.
 */
export async function discoverSubcategories(parentSlug) {
  try {
    const url = buildCategoryUrl(parentSlug, 0);
    const html = await getText(url);
    const subcats = [...html.matchAll(/href="\/kategorie\/(\d+-[a-z0-9_-]+)(?:\?|")/gi)].map((m) => m[1]);
    return [...new Set(subcats)].filter((s) =>
      !/podstawowe|pomoc|deklaracja|nasze-miasto|urzad|zalatwianie|rada|prawo|finanse|podatki|ochrona|organizacje|jednostki|oswiadczenia|akcje|dostepnosc|monitoring/i.test(s)
    );
  } catch {
    return [];
  }
}

/**
 * Harvest article entries from a paginated category board.
 */
export async function harvestCategoryEntries(catSlug) {
  const entries = [];
  const seen = new Set();
  let verified = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = buildCategoryUrl(catSlug, page);
    let html = '';
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  zlotow: category ${catSlug} page ${page} fetch failed: ${err.message}`);
      break;
    }

    const found = parseListPage(html, ORIGIN);
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

    // Single page with fewer items than requested size means no further pages exist
    if (added === 0 || found.length < 100) break;
  }

  return { entries, verified };
}

/**
 * Extract text from an attachment URL, trying born-digital pdfText first,
 * then falling back to ocrPdf.
 */
export async function extractAttachmentText(url) {
  if (!url) return '';
  let text = '';
  try {
    text = await pdfText(url);
  } catch {
    // pdfText error, proceed to OCR
  }

  if (!text || text.trim().length < 50) {
    try {
      text = await ocrPdf(url);
    } catch (err) {
      console.error(`  zlotow: ocrPdf failed for ${url}: ${err.message}`);
    }
  }

  return text || '';
}

/**
 * Pick notice PDF from attachments list, ignoring supplementary maps.
 */
export function pickNoticeAttachment(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const noticeAtt = attachments.find(
    (a) => /og[łl]|przetarg|wykaz/i.test(a.name) && !/map[ay]|geoportal|gison/i.test(a.name)
  );
  if (noticeAtt) return noticeAtt;
  const nonMapPdf = attachments.find(
    (a) => /\.pdf/i.test(a.name || a.url) && !/map[ay]|geoportal|gison|print-map/i.test(a.name || a.url)
  );
  if (nonMapPdf) return nonMapPdf;
  return attachments.find((a) => /\.pdf/i.test(a.name || a.url)) || attachments[0];
}

let activePromise = null;

async function doCrawlActive() {
  const [salesSubcats, localSubcats, wykazSubcats] = await Promise.all([
    discoverSubcategories('181-sprzedaz-nieruchomosci'),
    discoverSubcategories('184-sprzedaz-nieruchomosci-lokalowej'),
    discoverSubcategories('91-wykaz-nieruchomosci-przeznaczonych-do-obrotu'),
  ]);

  // Keep active / recent years (2025, 2026, and upcoming)
  const isRecentCat = (c) => /202[5-9]/.test(c) || !/202[0-4]/.test(c);

  const activeAuctionCats = [
    ...new Set([...ACTIVE_ANNOUNCEMENT_CATS, ...salesSubcats.filter(isRecentCat), ...localSubcats.filter(isRecentCat)]),
  ];
  const activeWykazCats = [
    ...new Set([...ACTIVE_WYKAZ_CATS, ...wykazSubcats.filter(isRecentCat)]),
  ];

  const allEntries = [];
  const seenUrls = new Set();
  let anyBoardVerified = false;

  for (const cat of activeAuctionCats) {
    const { entries, verified } = await harvestCategoryEntries(cat);
    if (verified) anyBoardVerified = true;
    for (const e of entries) {
      if (!seenUrls.has(e.url)) {
        seenUrls.add(e.url);
        allEntries.push(e);
      }
    }
  }

  const wykazEntries = [];
  for (const cat of activeWykazCats) {
    const { entries, verified } = await harvestCategoryEntries(cat);
    if (verified) anyBoardVerified = true;
    for (const e of entries) {
      if (!seenUrls.has(e.url)) {
        seenUrls.add(e.url);
        wykazEntries.push(e);
      }
    }
  }

  console.error(`  zlotow: active scan found ${allEntries.length} auction articles, ${wykazEntries.length} wykaz articles`);

  const listings = [];
  const wykaz = [];
  const land = [];

  // Process auction announcements
  for (const entry of allEntries) {
    if (!isAnnouncement(entry.title)) continue;

    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  zlotow: detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const title = detail.title || entry.title;
    const publishedDate = detail.publishedDate || entry.published_date;

    const noticeAtt = pickNoticeAttachment(detail.attachments);
    const pdfUrl = noticeAtt ? noticeAtt.url : null;
    const docText = pdfUrl ? await extractAttachmentText(pdfUrl) : '';

    const parsed = parseAnnouncementDoc(docText, title, publishedDate, entry.url, pdfUrl);
    for (const item of parsed.listings) listings.push(item);
    for (const item of parsed.land) land.push(item);
  }

  // Process wykaz notices
  for (const entry of wykazEntries) {
    if (!isWykaz(entry.title)) continue;

    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  zlotow: wykaz detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const title = detail.title || entry.title;
    const publishedDate = detail.publishedDate || entry.published_date;

    const noticeAtt = pickNoticeAttachment(detail.attachments);
    const pdfUrl = noticeAtt ? noticeAtt.url : null;
    const docText = pdfUrl ? await extractAttachmentText(pdfUrl) : '';

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
  }

  console.error(`  zlotow active: ${listings.length} listing(s), ${wykaz.length} wykaz, ${land.length} land`);

  return {
    listings,
    wykaz,
    land,
    valid_empty: anyBoardVerified && listings.length === 0,
    valid_empty_land: anyBoardVerified && land.length === 0,
  };
}

export async function crawlActive() {
  activePromise ??= doCrawlActive();
  return activePromise;
}

let resultsPromise = null;

async function doCrawlResultDocs() {
  const knownUrls = await loadKnownSourceUrls('zlotow');

  const [salesSubcats, localSubcats] = await Promise.all([
    discoverSubcategories('181-sprzedaz-nieruchomosci'),
    discoverSubcategories('184-sprzedaz-nieruchomosci-lokalowej'),
  ]);

  const allAuctionCats = [...new Set([...ALL_RESULT_CATS, ...salesSubcats, ...localSubcats])];

  const allEntries = [];
  const seenUrls = new Set();

  for (const cat of allAuctionCats) {
    const { entries } = await harvestCategoryEntries(cat);
    for (const e of entries) {
      if (!seenUrls.has(e.url)) {
        seenUrls.add(e.url);
        allEntries.push(e);
      }
    }
  }

  const resultEntries = allEntries.filter((e) => isResultNotice(e.title));
  console.error(`  zlotow: found ${resultEntries.length} candidate result entry/entries`);

  const refs = [];
  for (const entry of resultEntries) {
    // If entry URL itself is already in knownUrls, skip detail fetch
    if (knownUrls.has(entry.url)) continue;

    let detailHtml = '';
    try {
      detailHtml = await getText(entry.url);
    } catch (err) {
      console.error(`  zlotow: result detail fetch failed (${entry.url}): ${err.message}`);
      continue;
    }

    const detail = parseDetailPage(detailHtml, entry.url);
    const publishedDate = detail.publishedDate || entry.published_date;

    for (const att of detail.attachments) {
      if (!/\.pdf(?:$|\?)/i.test(att.url) && !/\.pdf/i.test(att.name) && !/informacja|wynik|przetarg/i.test(att.name)) {
        continue;
      }

      if (knownUrls.has(att.url) || knownUrls.has(entry.url)) {
        continue;
      }

      const text = await extractAttachmentText(att.url);
      if (!text || text.trim().length < 20) continue;

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

  console.error(`  zlotow: ${refs.length} result doc ref(s) extracted`);
  return refs;
}

export async function crawlResultDocs() {
  resultsPromise ??= doCrawlResultDocs();
  return resultsPromise;
}
