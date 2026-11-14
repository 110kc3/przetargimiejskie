import { pathToFileURL, fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { extractFields, parseAnnouncement, isSaleText } from './parse.js';

const ORIGIN = 'https://bip.zabkowiceslaskie.pl';

const PER_PAGE = Number(process.env.ZABKOWICE_PER_PAGE) || 25;
const MAX_ENUM_PAGES = Number(process.env.ZABKOWICE_MAX_ENUM_PAGES) || 80;
const MAX_DETAILS = Number(process.env.ZABKOWICE_MAX_DETAILS) || 120;
const CRAWL_BUDGET_MS = Number(process.env.ZABKOWICE_CRAWL_BUDGET_MS) || 12 * 60 * 1000;

const STATUS_ACTIVE = 0;
const STATUS_RESOLVED = 2;

const abs = (p) => (/^https?:/.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

function searchUrl(status, page) {
  const qs = new URLSearchParams({
    keyword: '', address: '', order: 'sprzedaż', type_id: '-1', kind_id: '-1',
    year: '', dateFrom: '', dateTo: '', status: String(status),
    perPage: String(PER_PAGE), page: String(page),
  });
  return `${ORIGIN}/przetargi-nieruchomosci/szukaj?${qs.toString()}`;
}

async function fetchHtml(url) {
  try {
    return await getText(url);
  } catch (err) {
    console.error(`  zabkowice-slaskie: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

export function noticeLinksFromPage(html) {
  const out = [];
  const seen = new Set();
  const re = /\/przetarg-nieruchomosci\/(\d+)\/([^"'#?\s]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, detailUrl: `${ORIGIN}/przetarg-nieruchomosci/${id}/${m[2]}` });
  }
  return out;
}

async function enumerateNotices(status) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_ENUM_PAGES; page++) {
    const html = await fetchHtml(searchUrl(status, page));
    if (!html) break;
    const links = noticeLinksFromPage(html);
    let added = 0;
    for (const l of links) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      refs.push(l);
      added++;
    }
    if (links.length < PER_PAGE || added === 0) break;
  }
  return refs;
}

export function resultPdfUrl(html) {
  const re = /href="([^"]*\/attachments\/download\/\d+)"[^>]*>\s*([^<]*?)\s*</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (/informacj\w*\s+o\s+wynik/i.test(m[2])) return abs(m[1]);
  }
  return null;
}


const PROPS_PATH = fileURLToPath(new URL('../../../../data/zabkowice-slaskie/properties.json', import.meta.url));
const LAND_PATH = fileURLToPath(new URL('../../../../data/zabkowice-slaskie/land.json', import.meta.url));

function collectUrls(obj, urls) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of ['source_pdf', 'source_url', 'detail_url', 'pdf_url']) {
    if (typeof obj[k] === 'string') urls.add(obj[k]);
  }
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) for (const x of v) collectUrls(x, urls);
    else if (v && typeof v === 'object') collectUrls(v, urls);
  }
}

export async function loadKnownUrls() {
  const urls = new Set();
  for (const path of [PROPS_PATH, LAND_PATH]) {
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8'));
      const records = parsed?.properties || parsed?.plots || parsed?.land || [];
      for (const rec of Array.isArray(records) ? records : []) collectUrls(rec, urls);
    } catch {}
  }
  return urls;
}


let activePromise = null;

async function crawlActiveInner() {
  const listings = [];
  const land = [];
  let complete = true;
  let allParsed = true;
  const refs = await enumerateNotices(STATUS_ACTIVE);
  console.error(`  zabkowice-slaskie: ${refs.length} active notice(s)`);
  for (const ref of refs) {
    const html = await fetchHtml(ref.detailUrl);
    if (!html) {
      allParsed = false;
      continue;
    }
    const fields = extractFields(html);
    if (!fields) {
      allParsed = false;
      continue;
    }
    if (fields.przetargNa && !isSaleText(fields.przetargNa)) continue;
    const rec = parseAnnouncement(fields, ref.detailUrl);
    if (!rec) {
      console.error(`  zabkowice-slaskie WARN: active notice not parsed (${ref.detailUrl})`);
      allParsed = false;
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }
  console.error(`  zabkowice-slaskie: ${listings.length} active listing(s), ${land.length} active land plot(s)`);
  return {
    listings,
    land,
    valid_empty: complete && allParsed && listings.length === 0,
    valid_empty_land: complete && allParsed && land.length === 0,
  };
}

export async function crawlActive() {
  activePromise ??= crawlActiveInner();
  const { listings, land, valid_empty, valid_empty_land } = await activePromise;
  return { listings, wykaz: [], land, valid_empty, valid_empty_land };
}


let resultPromise = null;

async function crawlResultsInner() {
  const allRefs = await enumerateNotices(STATUS_RESOLVED);
  const known = await loadKnownUrls();
  const newRefs = allRefs.filter((r) => !known.has(r.detailUrl));
  const skipped = allRefs.length - newRefs.length;
  console.error(
    `  zabkowice-slaskie result: ${allRefs.length} resolved notice(s); ${skipped} already known, ${newRefs.length} new to fetch`,
  );

  const resultRefs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let fetched = 0;
  for (const ref of newRefs) {
    if (fetched >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  zabkowice-slaskie result: crawl budget reached (fetched ${fetched}/${newRefs.length} new); remainder backfills next run`,
      );
      break;
    }
    fetched++;
    const html = await fetchHtml(ref.detailUrl);
    if (!html) continue;
    const fields = extractFields(html);
    if (fields?.przetargNa && !isSaleText(fields.przetargNa)) continue;
    const pdfUrl = resultPdfUrl(html);
    if (!pdfUrl) continue;
    let text;
    try {
      text = await ocrPdf(pdfUrl);
    } catch (err) {
      console.error(`  zabkowice-slaskie: OCR failed ${pdfUrl}: ${err.message}`);
      continue;
    }
    resultRefs.push({ text, pdf_url: ref.detailUrl, detail_url: ref.detailUrl, auction_date: fields?.auctionDate || null });
  }
  console.error(`  zabkowice-slaskie result: ${resultRefs.length} result notice(s) OCR'd this run`);
  return resultRefs;
}

export async function crawlResultDocs() {
  resultPromise ??= crawlResultsInner();
  return resultPromise;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
