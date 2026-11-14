
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.sulecin.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SEED_BOARD_URLS = [
  `${ORIGIN}/80/Sprzedaz_nieruchomosci/`,
  `${ORIGIN}/481/Sprzedaz_nieruchomosci_2025/`,
  `${ORIGIN}/461/Sprzedaz_nieruchomosci_2024/`,
  `${ORIGIN}/379/Sprzedaz_nieruchomosci_2021/`,
];

const MAX_BOARDS = Number(process.env.SULECIN_MAX_BOARDS) || 12;
const MAX_ARCHIVE_PAGES = Number(process.env.SULECIN_MAX_ARCHIVE_PAGES) || 5;
const CRAWL_BUDGET_MS = Number(process.env.SULECIN_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


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

export function parseInformationList(html) {
  const out = [];
  const blocks = (html || '').split(/<div class="information">/i);
  for (const block of blocks.slice(1)) {
    const m = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!m) continue;
    const url = deamp(m[1]);
    if (!/^https:\/\/bip\.sulecin\.pl\/\d+\/\d+\//.test(url)) continue;
    out.push({ url, title: stripTags(m[2]) });
  }
  return out;
}

export function archiveUrlFromBoardHtml(html) {
  const m = /href="(https:\/\/bip\.sulecin\.pl\/\d+\/1\/archiwum\/[^"]+)"/i.exec(html || '');
  return m ? deamp(m[1]) : null;
}

export function archivePageUrl(archiveUrl, page) {
  return archiveUrl.replace(/\/\d+\/archiwum\//, `/${page}/archiwum/`);
}


export function isWynikFilename(filename) {
  return /wynik/i.test(filename || '');
}

export function isOgloszenieFilename(filename) {
  const f = filename || '';
  if (isWynikFilename(f)) return false;
  if (/zgloszenie|zakwalif|zalacznik|^lista/i.test(f)) return false;
  return /ogloszenie|^przetarg/i.test(f);
}

export function parseAttachments(html) {
  const out = [];
  const re = /href="(https:\/\/bip\.sulecin\.pl\/system\/pobierz\.php\?plik=([^"&]+)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    let filename = m[2];
    try {
      filename = decodeURIComponent(filename);
    } catch {
      /* malformed escape — keep the raw (still classifiable) string */
    }
    out.push({ url: deamp(m[1]), filename });
  }
  return out;
}


async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  sulecin: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

async function extractPdf(pdfUrl, usable) {
  let text = null;
  try {
    text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  sulecin: pdftotext failed (${pdfUrl}): ${err.message}`);
  }
  if (text && usable(text)) return text;
  try {
    const ocr = await ocrPdf(pdfUrl, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr && usable(ocr)) return ocr;
  } catch (err) {
    console.error(`  sulecin: OCR fallback failed (${pdfUrl}): ${err.message}`);
  }
  return null;
}

const looksLikeAnnouncement = (t) => /ogłasza/i.test(t || '') || (t || '').trim().length > 200;


async function discoverBoardUrls() {
  const urls = new Set(SEED_BOARD_URLS);
  const html = await fetchPage(`${ORIGIN}/80/Sprzedaz_nieruchomosci/`);
  if (html) {
    const re = /href="(https:\/\/bip\.sulecin\.pl\/\d+\/[^"]*Sprzedaz_nieruchomosci[^"]*)"/gi;
    let m;
    while ((m = re.exec(html)) !== null) urls.add(deamp(m[1]));
  }
  return [...urls];
}


async function processEntry(entry, ctx) {
  const html = await fetchPage(entry.url);
  if (!html) return;
  const attachments = parseAttachments(html);
  const oglo = attachments.find((a) => isOgloszenieFilename(a.filename));
  const wynik = attachments.find((a) => isWynikFilename(a.filename));

  if (oglo) {
    const text = await extractPdf(oglo.url, looksLikeAnnouncement);
    if (text) {
      const recs = parseAnnouncement(text, { detailUrl: entry.url, pdfUrl: oglo.url });
      for (const rec of recs) (rec.kind === 'grunt' ? ctx.land : ctx.listings).push(rec);
    } else {
      console.error(`  sulecin: no usable announcement text for ${oglo.url} — skipped`);
    }
  }

  if (wynik) {
    if (ctx.known.has(wynik.url)) return;
    const text = await extractPdf(wynik.url, isResultNotice);
    if (text) {
      ctx.resultRefs.push({ text, pdf_url: wynik.url, detail_url: entry.url, auction_date: null });
    } else {
      console.error(`  sulecin: no usable result text for ${wynik.url} — skipped`);
    }
  }
}

async function processBoardPage(html, ctx) {
  for (const entry of parseInformationList(html)) {
    if (ctx.seenEntries.has(entry.url)) continue;
    ctx.seenEntries.add(entry.url);
    if (Date.now() > ctx.deadline) break;
    await processEntry(entry, ctx);
  }
}

async function crawlBoardAndArchive(boardUrl, ctx) {
  const html = await fetchPage(boardUrl);
  if (!html) return;
  await processBoardPage(html, ctx);

  const archiveBase = archiveUrlFromBoardHtml(html);
  if (!archiveBase) return;
  for (let page = 1; page <= MAX_ARCHIVE_PAGES; page++) {
    if (Date.now() > ctx.deadline) break;
    const url = page === 1 ? archiveBase : archivePageUrl(archiveBase, page);
    const ahtml = await fetchPage(url);
    if (!ahtml) break;
    const entries = parseInformationList(ahtml);
    if (entries.length === 0) break;
    const fresh = entries.filter((e) => !ctx.seenEntries.has(e.url));
    if (fresh.length === 0) break;
    await processBoardPage(ahtml, ctx);
  }
}


let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const seenEntries = new Set();
  const known = await loadKnownSourceUrls('sulecin');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  const ctx = { listings, land, resultRefs, seenEntries, known, deadline };

  const boardUrls = await discoverBoardUrls();
  let boardsWalked = 0;
  for (const boardUrl of boardUrls) {
    if (boardsWalked >= MAX_BOARDS) break;
    if (Date.now() > deadline) {
      console.error('  sulecin: crawl budget exhausted — stopping early');
      break;
    }
    boardsWalked++;
    await crawlBoardAndArchive(boardUrl, ctx);
  }

  console.error(
    `  sulecin: ${listings.length} flat listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
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
  console.log(
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
    ),
  );
}
