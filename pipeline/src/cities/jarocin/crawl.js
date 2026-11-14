
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncementLots, parseResultDoc, isCancellation, parseDateText } from './parse.js';

const ORIGIN = 'https://bip2.wokiss.pl';
const BASE = `${ORIGIN}/jarocin/`;
const INDEX_URL = `${BASE}bip/przetargi-na-sprzedaz-nieruchomosci.html`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const YEARS_BACK = 3;
const MAX_NOTICES = 120;


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

function abs(href) {
  try { return new URL(href, BASE).href; } catch { return null; }
}

export function parseYearIndex(html) {
  const out = [];
  const seen = new Set();
  for (const m of (html || '').matchAll(/href="([^"]*przetargi-w-roku-(\d{4})[^"]*\.html)"/gi)) {
    const url = abs(m[1]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ year: Number(m[2]), url });
  }
  return out;
}

export function parseNoticeList(html) {
  const out = [];
  const seen = new Set();
  for (const m of (html || '').matchAll(
    /<div class="temat">\s*<a href="([^"]*?pid=(\d+))">([\s\S]*?)<\/a>/gi,
  )) {
    const pid = Number(m[2]);
    if (seen.has(pid)) continue;
    seen.add(pid);
    const url = abs(m[1]);
    if (!url) continue;
    out.push({ pid, url, title: stripTags(m[3]) });
  }
  return out;
}

export function extractNoticePdfUrl(html) {
  const m = /href="([^"]+\.pdf[^"]*)"/i.exec(html || '');
  return m ? abs(m[1]) : null;
}

function classifyTitle(title) {
  const t = (title || '')
    .toLowerCase()
    .replace(/ł/g, 'l').replace(/ó/g, 'o').replace(/ż/g, 'z').replace(/ś/g, 's')
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ć/g, 'c').replace(/ń/g, 'n').replace(/ź/g, 'z');
  if (/informacj\w*\s+o\s+odwolan/.test(t)) return 'skip';
  if (/kwalifikacyjn/.test(t)) return 'skip';
  if (/informacj\w*\s+o\s+wynik/.test(t)) return 'result';
  if (/og[l]oszeni\w*.*przetarg|przetarg\w*\s+ustn/.test(t)) return 'announce';
  return 'skip';
}


let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;

  let indexHtml;
  try {
    indexHtml = await getText(INDEX_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  jarocin: index fetch failed (${INDEX_URL}): ${err.message}`);
    _cache = [];
    return _cache;
  }
  const thisYear = new Date().getFullYear();
  const minYear = thisYear - YEARS_BACK;
  const years = parseYearIndex(indexHtml)
    .filter((y) => y.year >= minYear && y.year <= thisYear + 1)
    .sort((a, b) => b.year - a.year);

  const candidates = [];
  let complete = years.length > 0;
  for (const y of years) {
    let yhtml;
    try {
      yhtml = await getText(y.url, FETCH_OPTS);
    } catch (err) {
      complete = false;
      console.error(`  jarocin: year ${y.year} fetch failed: ${err.message}`);
      continue;
    }
    for (const n of parseNoticeList(yhtml)) {
      const type = classifyTitle(n.title);
      if (type === 'skip') continue;
      candidates.push({ ...n, type });
    }
  }
  candidates.sort((a, b) => b.pid - a.pid);

  const known = await loadKnownSourceUrls('jarocin');

  const records = [];
  let fetched = 0;
  for (const c of candidates) {
    if (fetched >= MAX_NOTICES) { complete = false; break; }
    let pageHtml;
    try {
      pageHtml = await getText(c.url, FETCH_OPTS);
    } catch (err) {
      complete = false;
      console.error(`  jarocin: notice ${c.pid} page fetch failed: ${err.message}`);
      continue;
    }
    const pdfUrl = extractNoticePdfUrl(pageHtml);
    if (!pdfUrl) {
      complete = false;
      console.error(`  jarocin: notice ${c.pid} has no PDF attachment — skipping`);
      continue;
    }
    if (c.type === 'result' && known.has(pdfUrl)) continue;
    fetched++;
    let text;
    try {
      text = await pdfText(pdfUrl, FETCH_OPTS);
    } catch (err) {
      complete = false;
      console.error(`  jarocin: PDF text failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    if (!text || !text.trim()) {
      complete = false;
      console.error(`  jarocin: EMPTY pdftotext for ${pdfUrl} (scanned?) — skipping, not OCR'd`);
      continue;
    }
    records.push({ ...c, pdfUrl, text });
  }
  console.error(
    `  jarocin: ${years.length} year(s), ${candidates.length} candidate notice(s), ` +
    `${records.length} PDF(s) extracted (cap ${MAX_NOTICES})`,
  );
  records.complete = complete;
  _cache = records;
  return records;
}


export async function crawlActive({ loadRecords = discoverAll, todayIso = new Date().toISOString().slice(0, 10) } = {}) {
  const records = await loadRecords();
  const listings = [];
  for (const r of records) {
    if (r.type !== 'announce') continue;
    if (isCancellation(r.title)) continue;
    const lots = parseAnnouncementLots(r.text, r.title, r.pdfUrl);
    if (!lots.length) console.error(`  jarocin: announce ${r.pid} unsupported or inconsistent parcel table — skipping`);
    for (const a of lots) {
      if (!a.address && !a.dzialka_nr) {
        console.error(`  jarocin: announce ${r.pid} no subject (kind=${a.kind}) — skipping`);
        continue;
      }
      if (!a.auction_date || a.auction_date < todayIso) continue;
      listings.push(a);
    }
  }
  console.error(`  jarocin active: ${listings.length} upcoming listing(s)`);
  return { listings, wykaz: [], land: [], land_complete: false };
}


export async function crawlResultDocs({ loadRecords = discoverAll } = {}) {
  const records = await loadRecords();
  const refs = [];
  refs.complete = records.complete === true;
  for (const r of records) {
    if (r.type !== 'result') continue;
    if (!parseResultDoc(r.text, null, r.pdfUrl).length) refs.complete = false;
    const bi = r.text.search(/w\s+dniu\s/i);
    const ti = r.title.search(/z\s+dnia\s/i);
    const auction_date =
      (bi >= 0 ? parseDateText(r.text.slice(bi, bi + 45)) : null) ||
      (ti >= 0 ? parseDateText(r.title.slice(ti, ti + 45)) : null) || null;
    refs.push({ text: r.text, pdf_url: r.pdfUrl, auction_date });
  }
  console.error(`  jarocin crawlResultDocs: ${refs.length} result doc(s)`);
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
