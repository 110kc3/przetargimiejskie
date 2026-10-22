// Bartoszyce crawler — bip.bartoszyce.pl (SYSTEMDOBIP.PL / E-LINE platform).
//
// Boards:
//   - Active announcements: https://bip.bartoszyce.pl/160/Ogloszenia_o_przetargach/
//   - Archive announcements & results: https://bip.bartoszyce.pl/160/1/archiwum/Ogloszenia_o_przetargach/{page}/
//   - Active wykaz: https://bip.bartoszyce.pl/158/Zbycie_w_trybie_przetargu/
//
// Both flat and land sales are published as entry articles on board 160 with PDF
// attachments in /system/pobierz.php?plik=...&id=...
//
// Rate limiting: bip.bartoszyce.pl throttles rapid successive hits to system/pobierz.php.
// A polite delay is used between document fetches and known results are skipped via
// loadKnownSourceUrls('bartoszyce').

import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isResultNotice,
  isLease,
} from './parse.js';

const ORIGIN = 'https://bip.bartoszyce.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BOARD_ACTIVE_URL = `${ORIGIN}/160/Ogloszenia_o_przetargach/`;
const BOARD_ARCHIVE_URL = `${ORIGIN}/160/1/archiwum/Ogloszenia_o_przetargach/`;
const BOARD_WYKAZ_URL = `${ORIGIN}/158/Zbycie_w_trybie_przetargu/`;

const MAX_ARCHIVE_PAGES = Number(process.env.BARTOSZYCE_MAX_ARCHIVE_PAGES) || 6;
const FETCH_DELAY_MS = Number(process.env.BARTOSZYCE_FETCH_DELAY_MS) || 1200;
const CRAWL_BUDGET_MS = Number(process.env.BARTOSZYCE_CRAWL_BUDGET_MS) || 8 * 60 * 1000;

// ── HTML helpers ─────────────────────────────────────────────────────────────

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const deamp = (u) => (u || '').replace(/&amp;/g, '&');

/**
 * Parse a "Lista informacji" board or archive page into entries.
 * @param {string} html
 * @returns {Array<{url:string, title:string}>}
 */
export function parseInformationList(html) {
  const out = [];
  const blocks = (html || '').split(/<div class="information">/i);
  for (const block of blocks.slice(1)) {
    const m = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!m) continue;
    const url = deamp(m[1]);
    if (!/^https?:\/\/bip\.bartoszyce\.pl\/\d+\/\d+\//.test(url)) continue;
    out.push({ url, title: stripTags(m[2]) });
  }
  return out;
}

/**
 * Extract attachments from an entry stub page.
 * @param {string} html
 * @returns {Array<{url:string, filename:string}>}
 */
export function parseAttachments(html) {
  const out = [];
  const re = /href="((?:https:\/\/bip\.bartoszyce\.pl)?\/system\/pobierz\.php\?plik=([^"&]+)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    let fullUrl = m[1];
    if (fullUrl.startsWith('/')) fullUrl = ORIGIN + fullUrl;
    let filename = m[2];
    try {
      filename = decodeURIComponent(filename);
    } catch {
      /* keep raw filename */
    }
    out.push({ url: deamp(fullUrl), filename });
  }
  return out;
}

export function isWynikAttachment(filename, entryTitle) {
  const f = filename || '';
  const t = entryTitle || '';
  if (/regulamin|porozumienie|zalacznik|graficzn|mapa/i.test(f)) return false;
  return /wynik/i.test(f) || (/wynik/i.test(t) && !/regulamin/i.test(f));
}

export function isOgloszenieAttachment(filename, entryTitle) {
  const f = filename || '';
  const t = entryTitle || '';
  if (isWynikAttachment(f, t)) return false;
  if (/regulamin|porozumienie|zalacznik|graficzn|mapa/i.test(f)) return false;
  return /ogloszenie|przetarg/i.test(f) || /og[łl]oszenie|przetarg/i.test(t);
}

// ── fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  bartoszyce: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

async function extractPdf(pdfUrl, usable) {
  let text = null;
  try {
    text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  bartoszyce: pdftotext failed (${pdfUrl}): ${err.message}`);
  }
  if (text && usable(text)) return text;
  try {
    const ocr = await ocrPdf(pdfUrl, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr && usable(ocr)) return ocr;
  } catch (err) {
    console.error(`  bartoszyce: OCR fallback failed (${pdfUrl}): ${err.message}`);
  }
  return null;
}

const looksLikeAnnouncement = (t) => /ogłasza|przetarg/i.test(t || '') && (t || '').trim().length > 150;

// ── crawlAll shared pass ─────────────────────────────────────────────────────

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const wykaz = [];
  const land = [];
  const resultRefs = [];
  const seenEntries = new Set();
  const known = await loadKnownSourceUrls('bartoszyce');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let activeBoardReached = false;

  // 1. Walk active announcements board
  const activeHtml = await fetchPage(BOARD_ACTIVE_URL);
  if (activeHtml) {
    activeBoardReached = true;
    const activeEntries = parseInformationList(activeHtml);
    for (const entry of activeEntries) {
      if (seenEntries.has(entry.url)) continue;
      seenEntries.add(entry.url);
      if (isLease(entry.title)) continue;

      await sleep(FETCH_DELAY_MS);
      const entryHtml = await fetchPage(entry.url);
      if (!entryHtml) continue;

      const attachments = parseAttachments(entryHtml);
      const oglo = attachments.find((a) => isOgloszenieAttachment(a.filename, entry.title));
      const wynik = attachments.find((a) => isWynikAttachment(a.filename, entry.title));

      if (oglo) {
        await sleep(FETCH_DELAY_MS);
        const text = await extractPdf(oglo.url, looksLikeAnnouncement);
        if (text) {
          const recs = parseAnnouncement(text, { detailUrl: entry.url, pdfUrl: oglo.url });
          for (const rec of recs) {
            (rec.kind === 'grunt' ? land : listings).push(rec);
          }
        }
      }

      if (wynik && !known.has(wynik.url)) {
        await sleep(FETCH_DELAY_MS);
        const text = await extractPdf(wynik.url, isResultNotice);
        if (text) {
          resultRefs.push({ text, pdf_url: wynik.url, detail_url: entry.url, auction_date: null });
        }
      }
    }
  }

  // 2. Walk active wykaz board
  const wykazHtml = await fetchPage(BOARD_WYKAZ_URL);
  if (wykazHtml) {
    const wykazEntries = parseInformationList(wykazHtml);
    for (const entry of wykazEntries) {
      if (seenEntries.has(entry.url)) continue;
      seenEntries.add(entry.url);
      if (isLease(entry.title)) continue;

      await sleep(FETCH_DELAY_MS);
      const entryHtml = await fetchPage(entry.url);
      if (!entryHtml) continue;

      const attachments = parseAttachments(entryHtml);
      const doc = attachments[0];
      if (doc) {
        wykaz.push({
          title: entry.title,
          url: entry.url,
          doc_url: doc.url,
        });
      }
    }
  }

  // 3. Walk archive pages for results (wyniki)
  for (let page = 1; page <= MAX_ARCHIVE_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  bartoszyce: crawl budget exhausted — stopping archive walk');
      break;
    }
    const pageUrl = page === 1 ? BOARD_ARCHIVE_URL : `${BOARD_ARCHIVE_URL}${page}/`;
    await sleep(FETCH_DELAY_MS);
    const pageHtml = await fetchPage(pageUrl);
    if (!pageHtml) break;

    const entries = parseInformationList(pageHtml);
    if (entries.length === 0) break;

    for (const entry of entries) {
      if (seenEntries.has(entry.url)) continue;
      seenEntries.add(entry.url);
      if (Date.now() > deadline) break;
      if (isLease(entry.title)) continue;

      // Only inspect result notices in archive
      if (!isResultNotice(entry.title)) continue;

      await sleep(FETCH_DELAY_MS);
      const entryHtml = await fetchPage(entry.url);
      if (!entryHtml) continue;

      const attachments = parseAttachments(entryHtml);
      const wynik = attachments.find((a) => isWynikAttachment(a.filename, entry.title)) || attachments[0];
      if (!wynik) continue;

      if (known.has(wynik.url)) continue;

      await sleep(FETCH_DELAY_MS);
      const text = await extractPdf(wynik.url, isResultNotice);
      if (text) {
        resultRefs.push({ text, pdf_url: wynik.url, detail_url: entry.url, auction_date: null });
      }
    }
  }

  const valid_empty = activeBoardReached && listings.length === 0;
  const valid_empty_land = activeBoardReached && land.length === 0;

  console.error(
    `  bartoszyce: ${listings.length} flat listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz, ${resultRefs.length} result doc(s)`,
  );

  return { listings, wykaz, land, resultRefs, valid_empty, valid_empty_land };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  console.log(
    JSON.stringify(
      {
        listings: active.listings.length,
        land: active.land.length,
        wykaz: active.wykaz.length,
        results: results.length,
        valid_empty: active.valid_empty,
        valid_empty_land: active.valid_empty_land,
        sampleLand: active.land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ),
  );
}
