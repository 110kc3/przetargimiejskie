// Białystok crawler.
//
// Source: https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci
// CMS:    SmartSite by BIT Sp. z o.o.
//
// Index pagination — server-rendered, no JS required (confirmed 2026-06-27):
//   The BIP index form uses hidden fields to drive pagination:
//     pagination[form]=PAGE_SEARCH_TYPE_PROPERTY_SALES_AUCTIONS_FORM
//     pagination[limit]=10
//     pagination[offset]=N   (0, 10, 20, …)
//   Status filter:
//     fields[PAGE_SEARCH_PARAM_STATUS]=<id>
//       1376  = Otwarty
//       1377  = Rozstrzygnięty
//       12281 = Nierozstrzygnięty
//       95157 = Odwołany
//       196677= Zamknięty
//       1378  = Unieważnione
//
// Total entries: ~2 011 (all categories: flats, plots, commercial, kiosks, etc.)
// We crawl in two passes:
//   1. crawlActive()      — Status=Otwarty;       keep only przeznaczenie=lokal mieszkalny
//   2. crawlResultDocs()  — Status=Rozstrzygnięty + Nierozstrzygnięty;
//                           keep only przeznaczenie=lokal mieszkalny
//
// Detail page fields (server-rendered HTML, confirmed live):
//   Tytuł, Lokalizacja (położenie), Przeznaczenie, Cena wywoławcza,
//   Termin przetargu, Status, Cena nabycia (only on Rozstrzygnięty),
//   Kategoria newslettera, Osoba do kontaktu
//
// source: 'html' — we pre-parse detail pages in-adapter so refresh.js bypasses
// the generic PDF-OCR dispatch; crawlResultDocs() returns refs with `.text`
// already populated (serialised field lines).

import { getText } from '../../core/fetch.js';
import { parseDetailFields, parseDetailPage, stripTags } from './parse.js';

const ORIGIN = 'https://www.bip.bialystok.pl';
const BASE_PATH = '/postepowania/przetargi_na_nieruchomosci';
const BASE_URL = `${ORIGIN}${BASE_PATH}`;

// SmartSite pager form params (confirmed from live page source 2026-06-27)
const FORM_PARAM = 'PAGE_SEARCH_TYPE_PROPERTY_SALES_AUCTIONS_FORM';
const PAGE_LIMIT = 10;

// Status IDs from the <select> on the BIP index page
const STATUS_OPEN = 1376;         // Otwarty
const STATUS_RESOLVED = 1377;     // Rozstrzygnięty  (Cena nabycia present)
const STATUS_UNRESOLVED = 12281;  // Nierozstrzygnięty (no sale, but auction held)
const STATUS_CANCELLED = 95157;   // Odwołany

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function indexUrl(statusId, offset) {
  const params = new URLSearchParams({
    [`fields[PAGE_SEARCH_PARAM_STATUS]`]: String(statusId),
    [`pagination[form]`]: FORM_PARAM,
    [`pagination[limit]`]: String(PAGE_LIMIT),
    [`pagination[offset]`]: String(offset),
  });
  return `${BASE_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Index page parser
// ---------------------------------------------------------------------------

// Each listing on the index is a block like:
//   <a href="/postepowania/przetargi_na_nieruchomosci/ul-juliana-tuwima-11-m-41-44.html">
//     ul. Juliana Tuwima 1/1 m 41</a>
//   <span>Data utworzenia: 2026-06-19</span>
//   <span>Status: Otwarty</span>
//   <span>Termin przetargu: 2026-08-26</span>
//
// We extract all detail-page links from the index.

/**
 * Extract listing refs from one index page HTML.
 * @param {string} html
 * @returns {Array<{title:string, detailUrl:string}>}
 */
export function parseIndexPage(html) {
  const refs = [];
  const seen = new Set();
  // Match any link into the przetargi_na_nieruchomosci subdirectory (*.html slugs)
  const re = /href="(\/postepowania\/przetargi_na_nieruchomosci\/[^"]+\.html)"[^>]*>([^<]+)</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    refs.push({
      title: m[2].trim(),
      detailUrl: `${ORIGIN}${path}`,
    });
  }
  return refs;
}

/**
 * Extract total result count from the index page.
 * "Dostępne: 402 wyników ze wszystkich kategorii."
 * @param {string} html
 * @returns {number}
 */
export function parseTotalCount(html) {
  const m = /Dostępne:\s*(\d+)\s+wynik/i.exec(html);
  return m ? Number(m[1]) : 0;
}

// ---------------------------------------------------------------------------
// Fetch all pages for one status
// ---------------------------------------------------------------------------

async function fetchAllRefsForStatus(statusId) {
  const refs = [];
  const seen = new Set();
  let offset = 0;
  let total = null;

  while (true) {
    const url = indexUrl(statusId, offset);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  bialystok index fetch failed (status=${statusId} offset=${offset}): ${err.message}`);
      break;
    }

    if (total === null) {
      total = parseTotalCount(html);
    }

    const page = parseIndexPage(html);
    let added = 0;
    for (const r of page) {
      if (!seen.has(r.detailUrl)) {
        seen.add(r.detailUrl);
        refs.push(r);
        added++;
      }
    }

    offset += PAGE_LIMIT;
    // Stop when we've consumed all results or the server returned nothing new
    if (page.length === 0 || (total !== null && refs.length >= total)) break;
    // Hard cap: never fetch more than 5 000 entries (safety guard)
    if (offset > 5000) break;
  }

  console.error(
    `  bialystok index status=${statusId}: ${refs.length} refs (total reported: ${total})`,
  );
  return refs;
}

// ---------------------------------------------------------------------------
// Detail page fetch + field extraction
// ---------------------------------------------------------------------------

/**
 * Fetch one detail page and extract its structured fields as a newline-
 * separated "KEY: VALUE" text blob (ready for parseResultDoc).
 * Returns null if the page is not a flat sale.
 *
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchDetailText(url) {
  let html;
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    console.error(`  bialystok detail fetch failed (${url}): ${err.message}`);
    return null;
  }
  const fields = parseDetailFields(html);
  // Filter: only residential flats
  const przeznaczenie = fields.get('Przeznaczenie') || '';
  if (!/lokal\s+mieszkaln/i.test(przeznaczenie)) return null;

  // Serialise fields as "key: value\n" lines for parseResultDoc
  const lines = [];
  for (const [k, v] of fields.entries()) {
    lines.push(`${k}: ${v}`);
  }
  lines.push(`source_url: ${url}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

/**
 * Crawl the Otwarty (open) auctions index and return active flat listings.
 * @returns {Promise<{ listings: object[], wykaz: object[] }>}
 */
export async function crawlActive() {
  const refs = await fetchAllRefsForStatus(STATUS_OPEN);
  const listings = [];

  for (const r of refs) {
    let html;
    try {
      html = await getText(r.detailUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  bialystok active detail failed (${r.detailUrl}): ${err.message}`);
      continue;
    }
    const rec = parseDetailPage(html, r.detailUrl);
    if (!rec) continue; // not a flat
    listings.push({
      kind: rec.kind,
      address_raw: rec.address_raw,
      address: rec.address,
      auction_date: rec.auction_date,
      round: rec.round,
      area_m2: rec.area_m2,
      starting_price_pln: rec.starting_price_pln,
      detail_url: r.detailUrl,
    });
  }

  console.error(`  bialystok active: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

/**
 * Crawl Rozstrzygnięty + Nierozstrzygnięty indexes and return result refs
 * for flat auctions, each carrying a pre-extracted `.text` blob.
 * @returns {Promise<Array<{ text: string, auction_date: string|null, pdf_url: string }>>}
 */
export async function crawlResultDocs() {
  const allRefs = [];
  const seen = new Set();

  for (const statusId of [STATUS_RESOLVED, STATUS_UNRESOLVED, STATUS_CANCELLED]) {
    const refs = await fetchAllRefsForStatus(statusId);
    for (const r of refs) {
      if (!seen.has(r.detailUrl)) {
        seen.add(r.detailUrl);
        allRefs.push(r);
      }
    }
  }

  console.error(`  bialystok result candidates: ${allRefs.length} detail pages to check`);

  const out = [];
  for (const r of allRefs) {
    const text = await fetchDetailText(r.detailUrl);
    if (!text) continue; // not a flat
    // Extract auction date from the pre-fetched text for the ref metadata
    const terminM = /^Termin przetargu:\s*(\d{4}-\d{2}-\d{2})/m.exec(text);
    out.push({
      text,
      auction_date: terminM ? terminM[1] : null,
      pdf_url: r.detailUrl,
    });
  }

  console.error(`  bialystok result docs: ${out.length} flat result page(s)`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
