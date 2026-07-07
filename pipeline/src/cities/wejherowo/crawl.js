// Wejherowo crawler.
//
// Source: bip.wejherowo.pl — server-rendered FINN-style BIP.
// Annual index pages: /artykul/przetargi-YYYY-r
//   Each page contains a DataTables widget whose rows are rendered server-side
//   (all items in one HTML response, no XHR pagination). The grid uses
//   role="row" / role="gridcell" with <a href="/artykul/..."> links + a date
//   cell. Confirmed live 2026-06-27.
//
// UA block: bip.wejherowo.pl returns an empty body for the default bot UA;
// all fetches pass BROWSER_UA. Same pattern as bytom.pl (see bytom/crawl.js).
//
// Active listings: crawled from the current year's page (and prior year for
// late-year results). Article body is plain HTML; parseAnnouncement() extracts
// address / area / cena wywoławcza / auction date / round from the article text.
//
// Result PDFs: after settlement the article gains a "wyniki" PDF attachment at
// /pliki/wejherowo/zalaczniki/<id>/<filename>.pdf.
// crawlResultDocs() re-fetches already-seen resolved articles and returns refs
// that carry .pdfUrl for parseResultDoc via the standard pipeline refresh loop.
//
// NEEDS-LIVE-VERIFY on first CI run:
//   - UA-block bypass works (getText with BROWSER_UA)
//   - Annual page URL pattern (/artykul/przetargi-YYYY-r) is stable year-to-year
//   - DataTables row selectors (role="row"/role="gridcell") still apply
//   - Result PDF naming ("wyniki" substring in filename) is consistent

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAnnouncement, parseResultDoc as _parseResultDoc } from './parse.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';

const ORIGIN = 'https://bip.wejherowo.pl';

// Real browser UA — bip.wejherowo.pl gates the default bot UA to an empty body.
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// How many years back to scan for result docs (current + previous).
const RESULT_YEARS_BACK = 1;

function currentYear() {
  return new Date().getFullYear();
}

function annualPageUrl(year) {
  return `${ORIGIN}/artykul/przetargi-${year}-r`;
}

// ---- list-page parser -------------------------------------------------------
//
// The BIP list page renders a DataTables grid server-side. Each data row has
// role="row" / role="gridcell" with an <a href="/artykul/..."> link in the
// first cell and a "YYYY-MM-DD HH:MM:SS" date string in the second cell.
//
// Markup confirmed live 2026-06-27:
//   <div role="row">
//     <div role="gridcell"><a href="/artykul/SLUG">Title…</a></div>
//     <div role="gridcell">2026-06-26 11:31:34</div>
//   </div>
//
// Approach: find every /artykul/ link, strip its inner HTML to a title, then
// scan the next 500 chars of raw HTML for the first YYYY-MM-DD date string.
// This is robust to any nesting depth.

const ARTYKUL_LINK_RE = /href="(\/artykul\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
const DATE_AFTER_RE = /(\d{4}-\d{2}-\d{2})/;

/**
 * Parse a list page HTML and return raw article stubs.
 * @param {string} html
 * @returns {{ href: string, title: string, published_date: string|null }[]}
 */
export function parseListPage(html) {
  if (!html) return [];
  ARTYKUL_LINK_RE.lastIndex = 0;
  const out = [];
  let m;
  while ((m = ARTYKUL_LINK_RE.exec(html)) !== null) {
    const href = m[1];
    const title = stripTags(m[2]);
    // Look for a date in the next 500 chars after this link's closing tag
    const afterPos = m.index + m[0].length;
    const rest = html.slice(afterPos, afterPos + 500);
    const dm = DATE_AFTER_RE.exec(rest);
    out.push({ href, title, published_date: dm ? dm[1] : null });
  }
  return out;
}

// ---- article-page attachment parser ----------------------------------------
//
// After settlement the article gains a "wyniki" PDF in a <table class="table table-striped">:
//   <td><a href="/pliki/wejherowo/zalaczniki/ID/filename.pdf" class="download"
//          id="NNN" download="">NAME (PDF, ...)</a></td>
//
// We match the FIRST PDF whose filename or label contains "wyniki".

const ATTACH_RE = /href="(\/pliki\/wejherowo\/zalaczniki\/[^"]+\.pdf)"[^>]*>([^<]*)/gi;

/**
 * Extract the result PDF URL from an article page HTML.
 * @param {string} html
 * @param {string} base  origin for resolving relative hrefs
 * @returns {string|null}
 */
export function resultPdfUrlFromArticle(html, base = ORIGIN) {
  ATTACH_RE.lastIndex = 0;
  let m;
  while ((m = ATTACH_RE.exec(html)) !== null) {
    const path = m[1];
    const label = m[2].toLowerCase();
    // Match "wyniki" in either the filename path or the display label
    if (/wyniki/i.test(path) || /wyniki/i.test(label)) {
      return base + path;
    }
  }
  return null;
}

// ---- helpers ----------------------------------------------------------------

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns true when a title clearly belongs to a residential flat auction. */
function isFlatTitle(title) {
  return /lokal\w*\s+mieszkaln/i.test(title);
}

/** Returns true when a title is a non-flat item we should skip
 *  (land, commercial, najem/lease, nieruchomość gruntowa). */
function isSkippableTitle(title) {
  // Skip land parcels
  if (/nieruchomo[śs][śc][iy]\s+gruntow|dzia[łl][ck]|grunt/i.test(title) &&
      !/lokal\w*\s+mieszkaln/i.test(title)) return true;
  // Skip commercial (najem = lease)
  if (/najem|dzier[żz]aw|u[żz]ytkow[yea]/i.test(title) &&
      !/lokal\w*\s+mieszkaln/i.test(title)) return true;
  return false;
}

/** "[PRZETARG ROZSTRZYGNIĘTY]" marker in the title. */
function isResolved(title) {
  return /przetarg\s+rozstrzygni[eę]t/i.test(title);
}

// ---- Polish ordinal → round -------------------------------------------------

// Matches the operative ordinal + "przetarg", skipping prior-round history clauses.
const ORDINAL_RE =
  /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t|sz[oó]st|si[oó]dm|[oó]sm|dziewi[ąa]t|dziesi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,50}))/g;
const ORDINAL_MAP = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4,
  'piąt': 5, piat: 5, 'sząst': 6, szost: 6, 'szóst': 6,
  'siódm': 7, siodm: 7, ósmm: 8, osm: 8,
  'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};

export function roundFromTitle(title) {
  const t = (title || '').toLowerCase();
  // Match the ordinal prefix directly from the title
  const m = /^(?:\[.*?\]\s*-?\s*)?(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[oó]st|si[oó]dm|[oó]sm)/i.exec(t);
  if (!m) return 1; // bare "przetarg" = first
  const stem = m[1].toLowerCase()
    .replace(/ą/g, 'a').replace(/ó/g, 'o').replace(/ę/g, 'e');
  if (/^pierwsz/.test(stem)) return 1;
  if (/^drug/.test(stem)) return 2;
  if (/^trzeci/.test(stem)) return 3;
  if (/^czwart/.test(stem)) return 4;
  if (/^piat|^piąt/.test(stem)) return 5;
  if (/^szost|^szóst|^szosc/.test(stem)) return 6;
  if (/^siodm|^siódm/.test(stem)) return 7;
  if (/^osm|^ósm/.test(stem)) return 8;
  return 1;
}

// ---- address extraction from title ------------------------------------------
//
// Title format (confirmed live):
//   "[PRZETARG ROZSTRZYGNIĘTY] - Czwarty przetarg ustny nieograniczony na
//    sprzedaż lokalu mieszkalnego nr 28 położonego w budynku przy ul. Harcerskiej
//    11 w Wejherowie, o powierzchni użytkowej 19,56 m2 …"
//
// OR (Osiedle):
//   "… lokalu mieszkalnego nr 58 położonego w budynku przy Osiedlu Staszica 1 …"
//
// We capture the address after "przy" up to ", o powierzchni" or " w Wejherowie"
// if the latter comes first, or after "w budynku" + "przy".

const ADDR_FROM_TITLE_RE =
  /przy\s+(?:ul\.\s*|os\.\s*|Osiedlu\s+|al\.\s*|pl\.\s*)?(.+?)\s+(?:w\s+Wejherowie|,\s*o\s+powierzchni|i\s+gruntu)/i;

/**
 * Extract a raw "street building/apt" string from the flat auction title.
 * Returns null if no match.
 */
export function addressRawFromTitle(title) {
  const clean = title.replace(/^\[.*?\]\s*-?\s*/i, '').trim();
  // Look for "nr <apt> położonego w budynku przy <address>"
  const m = ADDR_FROM_TITLE_RE.exec(clean);
  if (!m) return null;
  // m[1] might look like "Harcerskiej 11" or "Staszica 1"
  // We also need to prepend ul./os. if they were consumed
  const rawAddr = m[1].replace(/,\s*$/, '').trim();
  return rawAddr;
}

/**
 * Extract flat number from title: "lokalu mieszkalnego nr 28"
 */
export function aptFromTitle(title) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(title);
  return m ? m[1] : null;
}

// ---- crawl ------------------------------------------------------------------

/**
 * Fetch and parse one annual list page. Returns raw stubs for flat auctions.
 */
async function fetchAnnualPage(year) {
  const url = annualPageUrl(year);
  let html;
  try {
    html = await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wejherowo: annual page ${year} fetch failed: ${err.message}`);
    return [];
  }
  const stubs = parseListPage(html);
  const flat = stubs.filter(s => !isSkippableTitle(s.title));
  console.error(`  wejherowo: ${year} page — ${stubs.length} total, ${flat.length} after filter`);
  return flat;
}

/**
 * Fetch one article page and extract a listing record.
 * Returns null if the article cannot be parsed.
 */
async function fetchArticle(stub) {
  const url = ORIGIN + stub.href;
  let html;
  try {
    html = await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wejherowo: article fetch failed (${stub.href}): ${err.message}`);
    return null;
  }

  const bodyText = stripTags(html);
  const parsed = parseAnnouncement(bodyText);

  // Address: prefer parser result (from body), fall back to title extraction.
  let address = parsed.address;
  if (!address) {
    const aptNo = aptFromTitle(stub.title);
    const addrRaw = addressRawFromTitle(stub.title);
    if (addrRaw && aptNo) {
      // Reconstruct "Street Building/Apt" for parseAddress
      address = parseAddress(`${addrRaw}/${aptNo}`);
      if (!address) address = parseAddress(addrRaw);
    }
  }
  if (!address) {
    console.error(`  wejherowo: could not parse address from "${stub.title.slice(0, 80)}"`);
    return null;
  }

  const kind = classifyKind(stub.title);
  const resolved = isResolved(stub.title);
  const pdfUrl = resolved ? resultPdfUrlFromArticle(html) : null;

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: stub.title,
    address,
    round: parsed.round ?? roundFromTitle(stub.title),
    published_date: stub.published_date,
    auction_date: parsed.auction_date,
    area_m2: parsed.area_m2,
    starting_price_pln: parsed.starting_price_pln,
    detail_url: url,
    // Resolved articles: attach result PDF URL for crawlResultDocs
    result_pdf_url: pdfUrl,
  };
}

// ---- public API -------------------------------------------------------------

export async function crawlActive() {
  const year = currentYear();
  const stubs = await fetchAnnualPage(year);

  const listings = [];
  for (const stub of stubs) {
    if (isResolved(stub.title)) continue; // resolved items are not "active"
    const rec = await fetchArticle(stub);
    if (rec) listings.push(rec);
  }

  console.error(`  wejherowo active: ${listings.length} active listing(s)`);
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  const year = currentYear();
  const refs = [];

  // Scan current year + previous year for resolved articles with result PDFs
  for (let y = year; y >= year - RESULT_YEARS_BACK; y--) {
    const stubs = await fetchAnnualPage(y);
    const resolved = stubs.filter(s => isResolved(s.title));

    for (const stub of resolved) {
      const url = ORIGIN + stub.href;
      let html;
      try {
        html = await getText(url, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  wejherowo: result article fetch failed (${stub.href}): ${err.message}`);
        continue;
      }

      const pdfUrl = resultPdfUrlFromArticle(html);
      if (!pdfUrl) continue;

      // Extract date hint from the article or the published_date
      const bodyText = stripTags(html);
      const parsed = parseAnnouncement(bodyText);

      refs.push({
        pdfUrl,
        date: parsed.auction_date ?? stub.published_date,
        sourceUrl: url,
      });
    }
  }

  console.error(`  wejherowo: ${refs.length} result doc ref(s) found`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active listing(s)`);
}
