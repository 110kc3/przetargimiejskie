// Lipsko crawler — samorzad.gov.pl (national govpl / Liferay BIP template).
//
// DISCOVERY. The unit's `/przetargi` page is a PUBLIC-PROCUREMENT hub (zamówienia
// publiczne), NOT property auctions — confirmed live. The walkable index is the
// unit SITE MAP `/web/miasto-i-gmina-lipsko/mapa-strony?show-bip=true`: one
// server-rendered ~1.27 MB page carrying ~1400 article links WITH anchor text
// (server HTML — no JS/SPA). This crawler fetches it once per run and filters
// the anchor text into two buckets:
//   * announce — "Ogłoszenie o [I/II] przetargu … na sprzedaż …"
//   * result   — "Informacja o wyniku [II] przetargu …"
// Excluded outright: rentals ("na dzierżawę / na najem / oddania w użyczenie")
// and cancellations ("Informacja o odwołaniu … przetargu"). Property-sale
// volume is LOW (~a dozen live articles), so no pagination is needed; a
// defensive MAX_ARTICLES cap protects the CI budget if the filter over-matches.
//
// PER-ARTICLE BODY. Each article page is server-rendered but carries its fields
// one of two ways (see config.js):
//   * INLINE prose in <div class="editor-content"> (older, ~2024) → parsed from
//     HTML directly; OR
//   * a SCANNED-image PDF at /attachment/<uuid> (2025+) → pdfText returns empty
//     (no font layer), so we fall back to OCR (core/ocr-pdf.js, tesseract -l
//     pol; confirmed clean Polish output live). Same split for announcements
//     AND results.
// The OCR/pdf-text caches are content-addressed + committed, so CI extracts each
// scan exactly once (ADAPTER-GUIDE §7).
//
// WYKAZ is deliberately NOT crawled: the live "wykaz … do sprzedaży" notices are
// bezprzetargowa tenant-right flat sales (Daniszów 22 / Iłżecka 5 — a TABLE that
// OCR mangles, and out of scope per the spike's tenant-track note) or rentals.
// Every plot that reaches a public auction still surfaces via the announce
// bucket. crawlActive therefore returns wykaz: [].
//
// One request/second (enforced by getText's throttle in core/fetch.js).

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

// Browser UA — the govpl portal serves the bot UA fine, but a browser UA is
// used defensively (some govpl edges gate on Accept-Language / Sec-Fetch-*).
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_ARTICLES = 60; // defensive; live property-sale volume is ~a dozen
const MIN_PDF_TEXT_CHARS = 40; // below this, treat pdfText as empty → OCR

// Classify one mapa anchor's text into a bucket, or null to skip.
function classifyAnchor(text) {
  if (isRental(text) || isCancelled(text)) return null;
  const a = toAscii(text);
  if (/informacj\w*\s+o\s+wyniku[\s\S]*przetarg/.test(a)) return 'result';
  if (/ogloszeni\w*\s+o\s+[\s\S]{0,6}przetarg[\s\S]*sprzeda/.test(a)) return 'announce';
  return null;
}

/**
 * Fetch the site map and return de-duplicated property-auction candidates.
 * @returns {Promise<Array<{url:string, type:'announce'|'result'}>>}
 */
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

/** Get one article's body as plain text: inline editor-content if present,
 *  else pdfText the attachment, falling back to OCR on an empty/scanned PDF. */
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

// ---------------------------------------------------------------------------
// Shared discover-fetch-extract pass, memoized per process run so crawlActive()
// and crawlResultDocs() (each called once per refresh.js run) never re-fetch or
// re-OCR the same article set.
// ---------------------------------------------------------------------------

let _cache = null;

/** @returns {Promise<Array<{type:string, url:string, title:string, published:string|null, body:string}>>} */
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

// ---------------------------------------------------------------------------
// crawlActive()
// ---------------------------------------------------------------------------

/** @returns {Promise<{ listings: Array<object>, wykaz: [], land: [] }>} */
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
    if (!a.auction_date || a.auction_date < today) continue; // only genuinely upcoming
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

// ---------------------------------------------------------------------------
// crawlResultDocs()
// ---------------------------------------------------------------------------

/**
 * Result refs for the achieved-price stream. Contract (source==='html'):
 * refresh.js hands `ref.text` straight to parseResultDoc(text, ref.auction_date,
 * ref.pdf_url) — so `text` is the already-extracted body (inline or OCR),
 * `pdf_url` is the article URL (provenance), `auction_date` is a fallback date.
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = records
    .filter((r) => r.type === 'result')
    .map((r) => ({ text: r.body, pdf_url: r.url, auction_date: r.published || null }));
  console.error(`  lipsko crawlResultDocs: ${refs.length} result notice(s)`);
  return refs;
}

// ---------------------------------------------------------------------------
// CLI harness (manual: node crawl.js [active|results])
// ---------------------------------------------------------------------------
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
