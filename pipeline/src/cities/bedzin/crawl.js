// Będzin crawler — server-rendered bip.info.pl BIP, consumed as plain HTML
// and attachment PDFs/ODTs. See config.js.
//
// Boards:
//   ANNOUNCEMENTS (Nieruchomości): index.php?idmp=943&r=r (sub-board of 450)
//   ANNOUNCEMENTS (Mieszkania):    index.php?idmp=35&r=r  (Informacje i ogłoszenia)
//   RESULTS (Archiwum):            index.php?idmp=484&r=r (Archiwum Przetargi)
//   RESULTS (Wyniki):              index.php?idmp=945&r=r (Wyniki ogłoszonych przetargów)
//
// Pagination param is `&istr=N`.
// Each board row links to a document: dokument.php?iddok={id}&idmp={NN}&r=r.
// Document text is extracted from HTML <div id="content-main">; if the notice
// body is an attachment (common for results and some flat announcements), the
// attachment text is extracted via pdfText/ocrPdf.

import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bedzin.bip.info.pl';
const IDMP_ANNOUNCE = 943;
const IDMP_OGLOSZENIA = 35;
const IDMP_ARCHIVE = 484;
const IDMP_RESULTS = 945;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_PAGES = 4;
const CRAWL_BUDGET_MS = Number(process.env.BEDZIN_CRAWL_BUDGET_MS) || 6 * 60 * 1000;
const MAX_DETAILS = Number(process.env.BEDZIN_MAX_DETAILS) || 50;

const boardUrl = (idmp, page) =>
  `${ORIGIN}/index.php?idmp=${idmp}&r=r${page > 1 ? `&istr=${page}` : ''}`;
const docUrl = (iddok, idmp) => `${ORIGIN}/dokument.php?iddok=${iddok}&idmp=${idmp}&r=r`;

/** Isolate the <div id="content-main"> region of a page. */
function contentMain(html) {
  if (!html) return '';
  const i = html.indexOf('id="content-main"');
  if (i < 0) return html;
  let j = html.indexOf('id="colRight"');
  if (j < 0 || j < i) j = html.indexOf('id="footer"');
  return j > i ? html.slice(i, j) : html.slice(i);
}

/** Decode HTML entities in href. */
function decodeHref(h) {
  return h.replace(/&amp;/gi, '&');
}

/**
 * Extract article refs from a board page HTML.
 * @param {string} html
 * @param {number} idmp
 * @returns {Array<{iddok:string, url:string, title:string}>}
 */
export function parseBoardPage(html, idmp) {
  const region = contentMain(html);
  const out = [];
  const seen = new Set();
  const re =
    /<a\b[^>]*?href=[\x27"](?:dokument\.php\?iddok=(\d+)[^\x27"]*|dokument,iddok,(\d+)[^\x27"]*)[\x27"][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(region)) !== null) {
    const iddok = m[1] || m[2];
    if (seen.has(iddok)) continue;
    seen.add(iddok);
    const title = m[3].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    out.push({ iddok, url: decodeHref(docUrl(iddok, idmp)), title });
  }
  return out;
}

/** All article refs on a board, walking bounded pages. */
async function fetchBoardRefs(idmp, maxPages = MAX_PAGES) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    let html;
    try {
      html = await getText(boardUrl(idmp, page), { userAgent: UA });
    } catch (err) {
      console.error(`  bedzin: board idmp=${idmp} page ${page} failed: ${err.message}`);
      break;
    }
    const pageRefs = parseBoardPage(html, idmp);
    let added = 0;
    for (const r of pageRefs) {
      if (seen.has(r.iddok)) continue;
      seen.add(r.iddok);
      refs.push(r);
      added++;
    }
    if (added === 0) break;
  }
  return refs;
}

/** Extract plain text from document content-main. */
export function extractDocBody(html) {
  let txt = contentMain(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const head = txt.indexOf('wersja do wydruku');
  if (head >= 0) txt = txt.slice(head + 'wersja do wydruku'.length).trim();
  const cutAt = ['Powrót', 'Metryka dokumentu', 'Załączniki']
    .map((s) => txt.indexOf(s))
    .filter((n) => n >= 0);
  if (cutAt.length) txt = txt.slice(0, Math.min(...cutAt)).trim();
  return txt;
}

/** Extract attachment links from document HTML. */
export function extractAttachmentLinks(html) {
  const region = contentMain(html);
  const out = [];
  const re = /<a\b[^>]*?href=[\x27"]([^'"\s]*plik\.php\?id=\d+[^'"\s]*)[\x27"][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(region)) !== null) {
    const rawHref = m[1].replace(/&amp;/g, '&');
    const fullUrl = rawHref.startsWith('http') ? rawHref : `${ORIGIN}/${rawHref.replace(/^\//, '')}`;
    const name = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ url: fullUrl, name });
  }
  return out;
}

/** Fetch one document (HTML + attachment text if needed). */
async function fetchDoc(ref) {
  let html;
  try {
    html = await getText(ref.url, { userAgent: UA });
  } catch (err) {
    console.error(`  bedzin: doc ${ref.iddok} fetch failed: ${err.message}`);
    return null;
  }
  let body = extractDocBody(html);

  // If the body is short or explicitly points to an attachment, extract attachment text
  if (body.length < 300 || /za[łl][ąa]cznik/i.test(body)) {
    const attachments = extractAttachmentLinks(html);
    for (const att of attachments) {
      if (/\.pdf$/i.test(att.name) || /plik\.php/i.test(att.url)) {
        try {
          let attText = await pdfText(att.url);
          if (!attText || attText.trim().length < 50) {
            attText = await ocrPdf(att.url);
          }
          if (attText && attText.trim().length > 50) {
            body = `${body}\n${attText}`.trim();
            break;
          }
        } catch (e) {
          console.error(`  bedzin: attachment ${att.url} extraction failed: ${e.message}`);
        }
      } else if (/\.(odt|doc|docx)$/i.test(att.name)) {
        try {
          const attText = await docText(att.url);
          if (attText && attText.trim().length > 50) {
            body = `${body}\n${attText}`.trim();
            break;
          }
        } catch (e) {
          console.error(`  bedzin: doc attachment ${att.url} failed: ${e.message}`);
        }
      }
    }
  }

  const text = buildRecordText({ title: ref.title, body });
  return { text, title: ref.title, url: ref.url };
}

/** Detail-fetch a list of refs bounded by time and count. */
async function fetchDetailsBounded(refs, label) {
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  const out = [];
  let processed = 0;
  for (const ref of refs) {
    if (processed >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  bedzin: ${label} crawl budget reached (processed ${processed}/${refs.length}); remainder backfills next run`,
      );
      break;
    }
    processed++;
    const rec = await fetchDoc(ref);
    if (!rec) continue;
    out.push({ ref, text: rec.text });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const knownUrls = await loadKnownSourceUrls('bedzin', { includeLand: true });

  // 1. Announcements
  const announceRefs = [];
  const seenAnnounce = new Set();

  const board943 = await fetchBoardRefs(IDMP_ANNOUNCE, 3);
  for (const r of board943) {
    if (!seenAnnounce.has(r.iddok)) {
      seenAnnounce.add(r.iddok);
      announceRefs.push(r);
    }
  }

  const board35 = await fetchBoardRefs(IDMP_OGLOSZENIA, 2);
  for (const r of board35) {
    if (seenAnnounce.has(r.iddok)) continue;
    if (/lokal\s+mieszkaln|przetarg\s+na\s+sprzeda/i.test(r.title)) {
      seenAnnounce.add(r.iddok);
      announceRefs.push(r);
    }
  }

  const announceDetails = await fetchDetailsBounded(announceRefs, 'announcements');
  for (const { ref, text } of announceDetails) {
    if (!isSaleAuction(text)) continue;
    if (isLease(text)) continue;

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  // 2. Results
  const resultBoardRefs = [];
  const seenResults = new Set();

  const board484 = await fetchBoardRefs(IDMP_ARCHIVE, 4);
  for (const r of board484) {
    if (seenResults.has(r.iddok)) continue;
    if (/wynik|informacja\s+o\s+wyniku/i.test(r.title)) {
      seenResults.add(r.iddok);
      resultBoardRefs.push(r);
    }
  }

  const board945 = await fetchBoardRefs(IDMP_RESULTS, 2);
  for (const r of board945) {
    if (seenResults.has(r.iddok)) continue;
    seenResults.add(r.iddok);
    resultBoardRefs.push(r);
  }

  const freshResultRefs = resultBoardRefs.filter((r) => !knownUrls.has(r.url));
  const resultDetails = await fetchDetailsBounded(freshResultRefs, 'results');
  for (const { ref, text } of resultDetails) {
    resultRefs.push({
      text,
      source_url: ref.url,
      auction_date: auctionDateFromText(text) || null,
    });
  }

  console.error(
    `  bedzin: ${listings.length} flat/unit/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** Active records (listings, wykaz, land). */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return {
    listings,
    wykaz: [],
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
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
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
