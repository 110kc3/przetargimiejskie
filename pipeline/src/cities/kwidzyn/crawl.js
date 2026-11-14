
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { urlCacheKey } from '../../core/hash.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, parseResultDoc, isCancellation, toAscii } from './parse.js';

const ORIGIN = 'https://bip.kwidzyn.pl';
const API = `${ORIGIN}/api`;
const GN_ROOT_MENU_ID = '13536';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const YEARS_BACK = 1;
const MAX_ARTICLES = 80;
const MAX_UNCACHED_OCR = 24;
const LIST_LIMIT = 200;
const LIST_PAGE_CAP = 2;

const OCR_CACHE_DIR = fileURLToPath(new URL('../../../ocr-cache/', import.meta.url));
const PDFTEXT_CACHE_DIR = fileURLToPath(new URL('../../../pdf-text-cache/', import.meta.url));
export function textCached(url, directories = [OCR_CACHE_DIR, PDFTEXT_CACHE_DIR]) {
  return directories.some((directory) => {
    const path = join(directory, urlCacheKey(url) + '.txt');
    return existsSync(path) && readFileSync(path, 'utf8').replace(/\s/g, '').length >= 40;
  });
}

const attUrl = (attId) => `${ORIGIN}/e,pobierz,get.html?id=${attId}`;

async function getJson(url) {
  const text = await getText(url, FETCH_OPTS);
  return JSON.parse(text);
}


export function parseYearMenus(menuArray, rootId = GN_ROOT_MENU_ID) {
  const root = (menuArray || []).find((m) => String(m.id) === String(rootId));
  const kids = (root && Array.isArray(root.children)) ? root.children : [];
  const out = [];
  for (const k of kids) {
    const y = Number(String(k.name).trim());
    if (Number.isInteger(y) && y > 2000 && y < 2100) out.push({ year: y, id: String(k.id) });
  }
  return out;
}

export function parseArticleEntry(a) {
  const t = (a.aliasFields || []).find((f) => f.alias === 'title');
  const title = (t && t.value)
    ? String(t.value)
    : String(a.link || '').replace(/^a,\d+,/, '').replace(/\.html$/, '').replace(/-/g, ' ');
  const d = (a.columnFields || []).find((f) => f.fieldId === 26);
  const date = d && d.value ? String(d.value).slice(0, 10) : null;
  return { id: String(a.id), title, date, link: a.link };
}

function classifyTitle(title) {
  const t = toAscii(title || '');
  if (/wykaz/.test(t)) return 'skip';
  if (isCancellation(title)) return 'skip';
  if (/przetarg|sprzeda/.test(t)) return 'candidate';
  return 'skip';
}

function isNoticePdf(att) {
  if (!att || String(att.extension).toLowerCase() !== 'pdf') return false;
  return !/map|rzut|szkic|graficzn/i.test(att.name || '');
}

function classifyBody(text) {
  const t = toAscii(text || '');
  if (/informacj\w*\s+o\s+wynik/.test(t) || /cena\s+osiagni[ea]t/.test(t) ||
      /wynik\w*\s+negatywn|brak\s+chetnych/.test(t)) return 'result';
  if (/przetarg/.test(t) && /(oglasza|na\s+sprzeda|cena\s+wywolawcza)/.test(t)) return 'announce';
  return 'skip';
}

async function extractNoticeText(url) {
  const ocrPath = join(OCR_CACHE_DIR, urlCacheKey(url) + '.txt');
  if (existsSync(ocrPath)) {
    const cached = readFileSync(ocrPath, 'utf8');
    if (cached.replace(/\s/g, '').length >= 40) return cached;
  }
  let quick = '';
  try { quick = await pdfText(url, FETCH_OPTS); } catch { quick = ''; }
  if (quick && quick.replace(/\s/g, '').length >= 40) return quick;
  try { await rm(join(PDFTEXT_CACHE_DIR, urlCacheKey(url) + '.txt'), { force: true }); } catch { /* ignore */ }
  return ocrPdf(url, FETCH_OPTS);
}


let scanPromise = null;
const scan = () => (scanPromise ??= discoverAll());

async function fetchMenuArticles(menuId, fetchJson) {
  const out = [];
  out.complete = false;
  const seen = new Set();
  let expectedTotal = null;
  for (let page = 0; page < LIST_PAGE_CAP; page++) {
    const offset = page * LIST_LIMIT;
    let j;
    try {
      j = await fetchJson(`${API}/menu/${menuId}/articles?limit=${LIST_LIMIT}&offset=${offset}`);
    } catch (err) {
      console.error(`  kwidzyn: menu ${menuId} articles (offset ${offset}) failed: ${err.message}`);
      break;
    }
    const arts = j?.articles;
    if (!Array.isArray(arts) || !Number.isInteger(j.total) || j.total < offset + arts.length
      || (expectedTotal !== null && expectedTotal !== j.total)
      || new Set(arts.map((a) => String(a.id))).size !== arts.length
      || arts.some((a) => !/^\d+$/.test(String(a.id)) || seen.has(String(a.id)))) break;
    expectedTotal = j.total;
    for (const a of arts) { seen.add(String(a.id)); out.push(parseArticleEntry(a)); }
    if (offset + arts.length === j.total) { out.complete = true; break; }
    if (arts.length !== LIST_LIMIT) break;
  }
  return out;
}

export async function discoverAll({
  fetchJson = getJson, extractText = extractNoticeText, isCached = textCached,
  knownUrls = null, thisYear = new Date().getFullYear(), maxUncached = MAX_UNCACHED_OCR,
} = {}) {

  let menuArray;
  try {
    menuArray = await fetchJson(`${API}/menu/${GN_ROOT_MENU_ID}`);
  } catch (err) {
    console.error(`  kwidzyn: menu tree fetch failed: ${err.message}`);
    return { records: [], complete: false };
  }
  const minYear = thisYear - YEARS_BACK;
  const allYearMenus = Array.isArray(menuArray) ? parseYearMenus(menuArray) : [];
  const yearMenus = allYearMenus
    .filter((y) => y.year >= minYear && y.year <= thisYear + 1)
    .sort((a, b) => b.year - a.year);
  const menuIds = [GN_ROOT_MENU_ID, ...yearMenus.map((y) => y.id)];
  let complete = yearMenus.some((menu) => menu.year === thisYear)
    && !allYearMenus.some((menu) => menu.year >= 2020 && menu.year < minYear);

  const byId = new Map();
  for (const menuId of menuIds) {
    const entries = await fetchMenuArticles(menuId, fetchJson);
    if (!entries.complete) complete = false;
    for (const entry of entries) {
      if (classifyTitle(entry.title) !== 'candidate') continue;
      if (!byId.has(entry.id)) byId.set(entry.id, entry);
    }
  }
  const candidates = [...byId.values()]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, MAX_ARTICLES);
  if (byId.size > MAX_ARTICLES) complete = false;

  const known = knownUrls ?? await loadKnownSourceUrls('kwidzyn', { includeLand: true, resolvedOnly: true });

  const records = [];
  let uncachedOcr = 0;
  let articlesProcessed = 0;
  for (const c of candidates) {
    let art;
    try {
      art = await fetchJson(`${API}/articles/${c.id}`);
    } catch (err) {
      console.error(`  kwidzyn: article ${c.id} fetch failed: ${err.message}`);
      complete = false;
      continue;
    }
    if (String(art?.id) !== c.id || !Array.isArray(art.attachments)) { complete = false; continue; }
    articlesProcessed++;
    if (!art.attachments.some(isNoticePdf)) complete = false;
    for (const att of (art.attachments || [])) {
      if (!isNoticePdf(att)) continue;
      const pdfUrl = attUrl(att.id);
      if (!/^\d+$/.test(String(att.id))) { complete = false; continue; }
      const cached = isCached(pdfUrl);
      if (!cached) {
        if (uncachedOcr >= maxUncached) { complete = false; continue; }
        uncachedOcr++;
      }
      let text;
      try {
        text = await extractText(pdfUrl);
      } catch (err) {
        console.error(`  kwidzyn: OCR failed (${pdfUrl}): ${err.message}`);
        complete = false;
        continue;
      }
      if (!text || !text.trim()) {
        console.error(`  kwidzyn: EMPTY text for ${pdfUrl} — skipping`);
        complete = false;
        continue;
      }
      const type = classifyBody(text);
      if (type === 'skip') { complete = false; continue; }
      if (type === 'result' && known.has(pdfUrl)) continue;
      if (type === 'result' && !parseResultDoc(text, null, pdfUrl).length) complete = false;
      records.push({ articleId: c.id, title: c.title, date: c.date, pdfUrl, text, type });
    }
  }
  console.error(
    `  kwidzyn: ${menuIds.length} menu(s), ${candidates.length} candidate article(s), ` +
    `${articlesProcessed} fetched, ${records.length} notice PDF(s) (uncached OCR ${uncachedOcr}/${MAX_UNCACHED_OCR}).`,
  );
  return { records, complete };
}


export async function crawlActive({ discover = scan, today = new Date().toISOString().slice(0, 10) } = {}) {
  const { records } = await discover();
  const listings = [];
  for (const r of records) {
    if (r.type !== 'announce') continue;
    const a = parseAnnouncement(r.text, r.title, r.pdfUrl);
    if (!a.address && !a.dzialka_nr) {
      console.error(`  kwidzyn: announce article ${r.articleId} no subject (kind=${a.kind}) — skipping`);
      continue;
    }
    if (!a.auction_date || a.auction_date < today) continue;
    listings.push(a);
  }
  console.error(`  kwidzyn active: ${listings.length} upcoming listing(s)`);
  return { listings, wykaz: [], land: [], land_complete: false };
}


export async function crawlResultDocs({ discover = scan } = {}) {
  const { records, complete } = await discover();
  const refs = [];
  refs.complete = complete;
  for (const r of records) {
    if (r.type !== 'result') continue;
    refs.push({ text: r.text, pdf_url: r.pdfUrl, auction_date: null });
  }
  console.error(`  kwidzyn crawlResultDocs: ${refs.length} result doc(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n');
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
