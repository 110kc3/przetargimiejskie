import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { urlCacheKey } from '../../core/hash.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isSaleTitle } from './parse.js';

const BASE = 'http://www.ars.plock.pl';
const ANNOUNCE_PATH = '/pl/przetargi/ogloszenia-o-przetargach';
const RESULTS_PATH = '/pl/przetargi/wyniki-przetargow';

const MAX_PAGES = Number(process.env.PLOCK_MAX_PAGES) || 15;
const MAX_DETAILS = Number(process.env.PLOCK_MAX_DETAILS) || 40;
const CRAWL_BUDGET_MS = Number(process.env.PLOCK_CRAWL_BUDGET_MS) || 8 * 60 * 1000;

const PDFTEXT_CACHE_DIR = fileURLToPath(new URL('../../../pdf-text-cache/', import.meta.url));

function abs(href) {
  if (/^https?:\/\//i.test(href)) return href;
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}


export function parseListItems(html) {
  const out = [];
  const re = /<div class="listing-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const href = m[1].replace(/&amp;/gi, '&');
    const title = stripTags(m[2]);
    const afterTitle = m.index + m[0].length;
    const window = html.slice(afterTitle, afterTitle + 400);
    const dateM = /Dodano:\s*<b>(\d{2})-(\d{2})-(\d{4})<\/b>/.exec(window);
    const published_date = dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}` : null;
    out.push({ title, detail_url: abs(href), published_date });
  }
  return out;
}

export function maxPageFromPagingPanel(html) {
  const panelM = /<div class="pagingPanel">([\s\S]*?)<\/div>/i.exec(html || '');
  if (!panelM) return 1;
  const nums = [...panelM[1].matchAll(/\/(\d+)"/g)].map((x) => Number(x[1]));
  return nums.length ? Math.min(MAX_PAGES, Math.max(1, ...nums)) : 1;
}

async function fetchBoardPage(basePath, page) {
  const url = page <= 1 ? `${BASE}${basePath}` : `${BASE}${basePath}/${page}`;
  return getText(url);
}

async function crawlBoard(basePath, label) {
  const items = [];
  let html;
  try {
    html = await fetchBoardPage(basePath, 1);
  } catch (err) {
    console.error(`  plock ${label} page 1 fetch failed: ${err.message}`);
    return items;
  }
  items.push(...parseListItems(html));
  const maxPage = maxPageFromPagingPanel(html);
  for (let p = 2; p <= maxPage; p++) {
    try {
      html = await fetchBoardPage(basePath, p);
    } catch (err) {
      console.error(`  plock ${label} page ${p} fetch failed: ${err.message}`);
      break;
    }
    const pageItems = parseListItems(html);
    if (pageItems.length === 0) break;
    items.push(...pageItems);
  }
  console.error(`  plock ${label}: ${items.length} item(s) across ${maxPage} page(s)`);
  return items;
}


export function bodyTextFromDetail(html) {
  const m = /<div class="standard-content">([\s\S]*?)<\/div>/i.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

export function attachmentsFromDetail(html) {
  const out = [];
  const re = /<a\s+href="([^"]*GetAttachment\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    out.push({ url: abs(m[1].replace(/&amp;/gi, '&')), name: stripTags(m[2]) });
  }
  return out;
}

function primaryAttachment(atts) {
  return atts.find((a) => !/regulamin/i.test(a.name)) || atts[0] || null;
}

async function extractPdfText(url) {
  let quick = '';
  try {
    quick = await pdfText(url);
  } catch {
    quick = '';
  }
  if (quick && quick.replace(/\s/g, '').length >= 40) return quick;
  try {
    await rm(join(PDFTEXT_CACHE_DIR, urlCacheKey(url) + '.txt'), { force: true });
  } catch {
  }
  return ocrPdf(url);
}


export async function crawlActive() {
  const board = await crawlBoard(ANNOUNCE_PATH, 'ogloszenia');
  const candidates = board.filter((it) => isSaleTitle(it.title));
  console.error(`  plock ogloszenia: ${candidates.length}/${board.length} sale candidate(s)`);

  const listings = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let detailsFetched = 0;
  for (const c of candidates) {
    if (detailsFetched >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  plock ogloszenia: budget reached (${detailsFetched}/${candidates.length} fetched); remainder next run`,
      );
      break;
    }
    let html;
    try {
      html = await getText(c.detail_url);
    } catch (err) {
      console.error(`  plock: detail fetch failed (${c.detail_url}): ${err.message}`);
      continue;
    }
    detailsFetched++;
    const bodyText = bodyTextFromDetail(html);
    const notice = primaryAttachment(attachmentsFromDetail(html));
    let pdfTxt = '';
    if (notice) {
      try {
        pdfTxt = await extractPdfText(notice.url);
      } catch (err) {
        console.error(`  plock: pdf/ocr text failed (${notice.url}): ${err.message}`);
      }
    }
    const rec = parseAnnouncement({
      title: c.title,
      bodyText,
      pdfText: pdfTxt,
      detailUrl: c.detail_url,
      publishedDate: c.published_date,
    });
    if (rec) listings.push(rec);
  }
  console.error(`  plock active: ${listings.length} listing(s)`);
  return { listings, wykaz: [] };
}


export async function crawlResultDocs() {
  const board = await crawlBoard(RESULTS_PATH, 'wyniki');
  const candidates = board.filter((it) => isSaleTitle(it.title));
  console.error(`  plock wyniki: ${candidates.length}/${board.length} sale-result candidate(s)`);

  const known = await loadKnownSourceUrls('plock');
  const refs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let detailsFetched = 0;
  let skippedKnown = 0;
  for (const c of candidates) {
    if (known.has(c.detail_url)) {
      skippedKnown++;
      continue;
    }
    if (detailsFetched >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  plock wyniki: budget reached (${detailsFetched}/${candidates.length} fetched); remainder next run`,
      );
      break;
    }
    let html;
    try {
      html = await getText(c.detail_url);
    } catch (err) {
      console.error(`  plock: result detail fetch failed (${c.detail_url}): ${err.message}`);
      continue;
    }
    detailsFetched++;
    const bodyText = bodyTextFromDetail(html);
    const notice = primaryAttachment(attachmentsFromDetail(html));
    let pdfTxt = '';
    if (notice) {
      try {
        pdfTxt = await extractPdfText(notice.url);
      } catch (err) {
        console.error(`  plock: result pdf/ocr text failed (${notice.url}): ${err.message}`);
      }
    }
    const text = `TYTUL: ${c.title}\n\n${bodyText}\n\n${pdfTxt}`;
    refs.push({ text, auction_date: null, pdf_url: c.detail_url });
  }
  console.error(
    `  plock results: ${refs.length} result doc(s) fetched this run (${skippedKnown} already known)`,
  );
  return refs;
}
