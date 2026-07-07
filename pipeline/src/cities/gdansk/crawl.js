// Gdańsk crawler — bip.gdansk.pl (Wydział Skarbu, server-rendered HTML).
//
//   ANNOUNCEMENT INDEX:  https://bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439
//     Server-rendered HTML listing auction-batch articles as <a> links with
//     slug pattern /urzad-miejski/OGLOSZENIE-...,a,<id>
//   ANNOUNCEMENT DETAIL: each article links exactly ONE PDF attachment hosted
//     at https://download.cloudgdansk.pl/gdansk-pl/d/<id>/<name>.pdf
//     The PDF is born-digital and bundles all properties per auction date.
//   RESULT NOTICES: URL pattern UNCONFIRMED. crawlResultDocs() returns []
//     until the section is found. See parse.js for the stub.
//
// bip.gdansk.pl is server-rendered (no JS SPA). No auth, no bot-block. The
// cloudgdansk.pl CDN has been observed to be slow — use 60-second timeout
// via getBytes (handled in core/fetch.js with retries).
//
// The index page shows only the current/upcoming auction; older entries are
// not paginated on the same URL. If the index ever goes empty between auction
// rounds, crawlActive() returns [] gracefully (no error).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncementPdf } from './parse.js';

const ORIGIN = 'https://bip.gdansk.pl';
// Announcement index (Wydział Skarbu → Ogłoszenia o przetargach)
const INDEX_URL = `${ORIGIN}/urzad-miejski/Ogloszenia-o-przetargach,a,1439`;
// Link pattern: BIP article slugs for auction-batch announcements
const ANN_LINK_RE =
  /\/urzad-miejski\/(?:OGLOSZENIE|ogloszenie)[^"'\s]*,a,\d+/i;
// PDF attachment link: cloudgdansk CDN
const PDF_LINK_RE =
  /https?:\/\/download\.cloudgdansk\.pl\/gdansk-pl\/d\/[^"'\s)]+\.pdf/i;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

/**
 * Extract unique announcement article URLs from the index page HTML.
 * @param {string} html
 * @returns {string[]}
 */
export function parseIndexLinks(html) {
  const seen = new Set();
  const out = [];
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/gi, '&');
    if (!ANN_LINK_RE.test(href)) continue;
    if (!/^https?:/i.test(href)) href = ORIGIN + (href.startsWith('/') ? '' : '/') + href;
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

/**
 * Extract the first PDF attachment URL from an announcement article HTML.
 * The article embeds the cloudgdansk.pl CDN link in a download anchor.
 * @param {string} html
 * @returns {string|null}
 */
export function parsePdfUrl(html) {
  const m = PDF_LINK_RE.exec(html);
  return m ? m[0] : null;
}

/**
 * Crawl active listings: fetch the BIP index → follow each article → fetch
 * the born-digital PDF → parse all property blocks.
 * @returns {Promise<{listings: object[], wykaz: object[], land: object[]}>}
 */
export async function crawlActive() {
  const listings = [];

  // 1) Fetch the announcement index
  let indexHtml;
  try {
    indexHtml = await getText(INDEX_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  gdansk index fetch failed: ${err.message}`);
    return { listings, wykaz: [], land: [] };
  }
  const articleUrls = parseIndexLinks(indexHtml);
  console.error(`  gdansk: ${articleUrls.length} announcement article(s) on index`);

  // 2) For each article, find the PDF and parse it
  for (const articleUrl of articleUrls) {
    let articleHtml;
    try {
      articleHtml = await getText(articleUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  gdansk article fetch failed (${articleUrl}): ${err.message}`);
      continue;
    }
    const pdfUrl = parsePdfUrl(articleHtml);
    if (!pdfUrl) {
      console.error(`  gdansk WARN: no PDF attachment on ${articleUrl}`);
      continue;
    }
    let text;
    try {
      text = await pdfText(pdfUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  gdansk PDF extract failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    const recs = parseAnnouncementPdf(text, {
      detail_url: articleUrl,
      source_url: pdfUrl,
    });
    if (recs.length === 0) {
      console.error(`  gdansk WARN: 0 properties parsed from ${pdfUrl}`);
    }
    listings.push(...recs);
    console.error(`  gdansk: ${recs.length} propert(y/ies) parsed from ${pdfUrl}`);
  }

  console.error(
    `  gdansk: ${listings.length} total listing(s) from ${articleUrls.length} article(s)`,
  );
  return { listings, wykaz: [], land: [] };
}

/**
 * Result-notice refs — returns [] until the result section URL is confirmed.
 * TODO: once the bip.gdansk.pl result-notice section URL is confirmed on a
 * CI run (the one soft gap from the spike), implement this to fetch result
 * PDFs and return refs with { text, pdf_url, auction_date }.
 * @returns {Promise<Array>}
 */
export async function crawlResultDocs() {
  // Result URL on bip.gdansk.pl NOT YET CONFIRMED (spike 2026-06-27).
  // The procedure page (,a,44430) confirms the notice exists but no index
  // page listing them was found. Likely appears as a new entry on the same
  // Ogloszenia-o-przetargach index (,a,1439) with a different title slug
  // pattern ("INFORMACJA-O-WYNIKACH-...,a,<id>") after the auction date.
  // Action: after 2026-07-01 auction, re-inspect the index and check whether
  // a "wyniki" article appears. If yes, extend parseIndexLinks with a
  // RESULT_LINK_RE and fetch its PDF here.
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
