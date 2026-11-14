import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  parseAnnouncement,
  extractTitle,
  extractPublishedDate,
  extractInlineBody,
  extractAttachmentUrl,
  stripTags,
  toAscii,
  isRental,
  isCancelled,
} from './parse.js';

const HOST = 'https://samorzad.gov.pl';
const UNIT = '/web/miasto-i-gmina-lipsko';
const SITEMAP_URL = `${HOST}${UNIT}/mapa-strony?show-bip=true`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_ARTICLES = 60;
const MIN_PDF_TEXT_CHARS = 40;

function classifyAnchor(text) {
  if (isRental(text) || isCancelled(text)) return null;
  const a = toAscii(text);
  if (/informacj\w*\s+o\s+wyniku[\s\S]*przetarg/.test(a)) return 'result';
  if (/ogloszeni\w*\s+o\s+[\s\S]{0,6}przetarg[\s\S]*sprzeda/.test(a)) return 'announce';
  return null;
}

async function discoverCandidates() {
  const html = await getText(SITEMAP_URL, FETCH_OPTS);
  const re = /<a[^>]+href="(\/web\/miasto-i-gmina-lipsko\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    const type = classifyAnchor(stripTags(m[2]));
    if (!type) continue;
    seen.add(path);
    out.push({ url: HOST + path, type });
  }
  console.error(
    `  lipsko: sitemap -> ${out.length} property-auction candidate(s) ` +
    `(${out.filter((c) => c.type === 'announce').length} announce, ` +
    `${out.filter((c) => c.type === 'result').length} result)`,
  );
  return out;
}

async function articleBody(html, url) {
  const inline = extractInlineBody(html);
  if (inline) return inline;
  const pdfUrl = extractAttachmentUrl(html);
  if (!pdfUrl) {
    console.error(`  lipsko: no inline body + no attachment (${url})`);
    return '';
  }
  try {
    const text = await pdfText(pdfUrl, FETCH_OPTS);
    if (text && text.trim().length >= MIN_PDF_TEXT_CHARS) return text;
  } catch (err) {
    console.error(`  lipsko: pdfText failed (${pdfUrl}): ${err.message} — trying OCR`);
  }
  try {
    return await ocrPdf(pdfUrl, FETCH_OPTS);
  } catch (err) {
    console.error(`  lipsko: OCR failed (${pdfUrl}): ${err.message}`);
    return '';
  }
}


let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;
  const candidates = (await discoverCandidates()).slice(0, MAX_ARTICLES);
  const records = [];
  for (const c of candidates) {
    let html;
    try {
      html = await getText(c.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lipsko fetch failed (${c.url}): ${err.message}`);
      continue;
    }
    const body = await articleBody(html, c.url);
    if (!body || !body.trim()) {
      console.error(`  lipsko: empty body, skipping (${c.url})`);
      continue;
    }
    records.push({
      type: c.type,
      url: c.url,
      title: extractTitle(html) || '',
      published: extractPublishedDate(html),
      body,
    });
  }
  console.error(`  lipsko: ${records.length} article(s) extracted from ${candidates.length} candidate(s)`);
  _cache = records;
  return records;
}


export async function crawlActive() {
  const today = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();
  const listings = [];
  for (const r of records) {
    if (r.type !== 'announce') continue;
    const a = parseAnnouncement(r.body, r.title);
    if (!a || a.cancelled) continue;
    if (!a.address && !a.dzialka_nr) {
      console.error(`  lipsko announce no subject (kind=${a.kind}): ${r.url}`);
      continue;
    }
    if (!a.auction_date || a.auction_date < today) continue;
    listings.push({
      kind: a.kind,
      address_raw: a.address_raw,
      address: a.address,
      dzialka_nr: a.dzialka_nr,
      obreb: a.obreb,
      area_m2: a.area_m2,
      starting_price_pln: a.starting_price_pln,
      auction_date: a.auction_date,
      round: a.round,
      detail_url: r.url,
      published_date: r.published,
    });
  }
  console.error(`  lipsko active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = records
    .filter((r) => r.type === 'result')
    .map((r) => ({ text: r.body, pdf_url: r.url, auction_date: r.published || null }));
  console.error(`  lipsko crawlResultDocs: ${refs.length} result notice(s)`);
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
