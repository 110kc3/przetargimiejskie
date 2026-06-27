// Szczecin crawler — bip.um.szczecin.pl / chapter_131207.
//
// Source: ICOR Application Server BIP; the listing page (chapter_131207.asp)
// renders its index client-side via JS, but the SAME board exposes a
// complete RSS feed at rss/131207/rss_131207.xml that contains EVERY
// announcement + result notice with its ?soid=<GUID> detail URL. As of
// 2026-06-27 the feed has 1 033 items (the full archive since ~2010).
//
// Crawl strategy:
//   1. Fetch the RSS feed (one HTTP request, ~1 MB).
//   2. Parse all <item> titles + links — split into flat announcements and
//      flat result notices; skip land/commercial/bezprzetargowy.
//   3. For announcements: fetch each ?soid= detail page; parse the HTML table
//      for address / area / starting price / auction date / round.
//   4. For result notices: same fetch + parse for achieved price + outcome.
//
// Both streams share the same board (chapter_131207) — no separate "wyniki"
// subpage for the WMiRSPN flat stream (unlike WZiON chapter_50749).
//
// `source: 'html'` ⇒ the refresh loop never calls ocrPdf / pdfText.
// crawlResultDocs() returns refs whose .text is pre-set; refresh.js hands
// them directly to parseResultDoc (which re-parses from the raw HTML stored
// in .text).
//
// NOTE (validate on first CI run): The RSS feed contains the full archive.
// Only items published/updated within the last ~MAX_AGE_DAYS are fetched as
// detail pages for active listings; older items are ignored for the
// crawlActive pass. The result pass looks back further to capture recent
// completed auctions (RESULT_LOOKBACK_DAYS).

import { getText } from '../../core/fetch.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncementPage,
  parseResultDoc as parseResultDocFn,
  isResultNotice,
} from './parse.js';

const ORIGIN = 'https://bip.um.szczecin.pl';
const RSS_URL = `${ORIGIN}/rss/131207/rss_131207.xml`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Only fetch detail pages for listings/results published within this window.
// Active announcements are typically posted 4–8 weeks before the auction date.
const MAX_AGE_DAYS = 90;
// Result notices appear a few days after the auction; look back further.
const RESULT_LOOKBACK_DAYS = 180;

// Parse RFC-2822 pubDate from RSS ("<Thu, 06 Oct 2025 06:59:28 GMT>") → ms epoch.
function parsePubDate(rfc2822) {
  try { return new Date(rfc2822).getTime(); } catch { return 0; }
}

/**
 * Parse RSS XML into structured item refs.
 * @param {string} xml
 * @returns {Array<{title:string, href:string, pubDate:string, pubMs:number}>}
 */
export function parseRss(xml) {
  if (!xml) return [];
  const out = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1];
    const titleM = /<title><!\[CDATA\[(.*?)\]\]>/i.exec(body);
    const linkM = /<link><!\[CDATA\[(.*?)\]\]>/i.exec(body) ||
                  /<guid[^>]*><!\[CDATA\[(.*?)\]\]>/i.exec(body);
    const dateM = /<pubDate><!\[CDATA\[(.*?)\]\]>/i.exec(body);
    if (!titleM || !linkM) continue;
    const pubDate = dateM ? dateM[1].trim() : '';
    // RSS title may have a ", Sprzedaż, Lokale, 2025/10/06..." suffix — strip it
    const title = titleM[1].trim().replace(/,\s*Sprzedaż.*$/, '').trim();
    // Convert link to absolute if needed
    let href = linkM[1].trim();
    if (href.startsWith('http://bip.um.szczecin.pl')) {
      href = href.replace('http://', 'https://');
    }
    out.push({ title, href, pubDate, pubMs: parsePubDate(pubDate) });
  }
  return out;
}

/** ISO date string from RSS pubDate ("Mon, 06 Oct 2025 06:59:28 GMT") → "2025-10-06" */
function rssDateToISO(rfc2822) {
  try {
    const d = new Date(rfc2822);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}

let crawlPromise = null;

async function crawlAll() {
  // Step 1: fetch RSS
  let xml;
  try {
    xml = await getText(RSS_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  szczecin RSS fetch failed: ${err.message}`);
    return { listings: [], wykaz: [], resultRefs: [] };
  }

  const allItems = parseRss(xml);
  console.error(`  szczecin RSS: ${allItems.length} total items`);

  const now = Date.now();
  const activeCutoff = now - MAX_AGE_DAYS * 86400 * 1000;
  const resultCutoff = now - RESULT_LOOKBACK_DAYS * 86400 * 1000;

  // Split by title type
  const announcementItems = allItems.filter(
    (it) => isAnnouncementTitle(it.title) && it.pubMs >= activeCutoff,
  );
  const resultItems = allItems.filter(
    (it) => isResultTitle(it.title) && it.pubMs >= resultCutoff,
  );

  console.error(
    `  szczecin: ${announcementItems.length} flat announcements (last ${MAX_AGE_DAYS}d), ` +
    `${resultItems.length} result notices (last ${RESULT_LOOKBACK_DAYS}d)`,
  );

  // Step 2: fetch + parse announcement detail pages
  const listings = [];
  for (const it of announcementItems) {
    let html;
    try {
      html = await getText(it.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  szczecin: announcement fetch failed (${it.href}): ${err.message}`);
      continue;
    }
    const rec = parseAnnouncementPage(html, it.href, it.title, rssDateToISO(it.pubDate));
    if (!rec) {
      console.error(`  szczecin: WARN: 0 flats parsed from ${it.href} (${it.title.slice(0, 60)})`);
      continue;
    }
    listings.push(rec);
  }

  // Step 3: prepare result refs (with pre-fetched HTML as .text so refresh.js
  // can call parseResultDoc without a second network round-trip per ref).
  const resultRefs = [];
  for (const it of resultItems) {
    let html;
    try {
      html = await getText(it.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  szczecin: result fetch failed (${it.href}): ${err.message}`);
      continue;
    }
    if (!isResultNotice(html)) continue;
    resultRefs.push({
      text: html,          // raw HTML; parseResultDoc receives this as its first arg
      pdf_url: it.href,   // field name kept for compat with refresh.js result-stream contract
      auction_date: null,
    });
  }

  console.error(
    `  szczecin: ${listings.length} active listings, ${resultRefs.length} result refs`,
  );
  return { listings, wykaz: [], resultRefs };
}

/** Result notices (achieved prices) — crawlAll() fetches both streams in one pass. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** Active listings (flat auctions). */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

/**
 * parseResultDoc — adapter entry point for refresh.js.
 * `text` here is the raw HTML of the result detail page (not PDF text).
 * `fallbackDate` is the RSS pubDate ISO string.
 * `sourceUrl` is the ?soid= URL.
 */
export { parseResultDoc } from './parse.js';

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
