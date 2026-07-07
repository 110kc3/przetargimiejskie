// Augustów crawler — bip.um.augustow.pl SmartSite BIP boards.
//
// Two boards to walk (both paginated with ?page=N pattern):
//   ACTIVE:  /przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-aktualne/
//   ARCHIVE: /przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-nieaktualne/
//
// Page 1 = bare board URL.
// Page N = <board>/ogloszenia-aktualne.html?page=N
// Stop: page returns no <li class="component-item clearfix"> items.
//
// Both boards carry BOTH flat auction announcements AND result notices
// ("Informacja o wynikach…"). We separate them by title keyword:
//   - Flat announcements → crawlActive() listings
//   - Result notices     → crawlResultDocs() refs
//
// RESULT NOTICE PATTERN (Augustów-specific):
//   The HTML body of a result notice page contains ONLY a heading and a PDF
//   attachment. The achieved price is in the PDF — not inline HTML. So
//   crawlResultDocs() must:
//     1. Collect result-notice detail URLs from the board pages.
//     2. Fetch each detail page to find the PDF attachment URL.
//     3. Extract text from the PDF (pdfText).
//     4. Return refs with .text set (source:'html' contract).
//
// Volume: ~2–5 flat auctions/year across 19 archive pages + 2 active pages.
// No bot-block, no CAPTCHA, plain HTTPS.
//
// Groundtruthed against live fixtures 2026-06-29:
//   - Announcement: Rynek Zygmunta Augusta 16 (lokal 1 & 3), published 2024-08-08
//   - Result notice: lokal nr 1 at Rynku Zygmunta Augusta 16, published 2024-09-17
//     PDF: /resource/26697/Infromacja+o+wynikach+-+lokal+Nr+1.pdf

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseListPage,
  isResultNoticeTitle,
  attachmentUrlFromDetail,
} from './parse.js';

const ORIGIN = 'https://bip.um.augustow.pl';

// Board base URLs (page 1)
const ACTIVE_BASE =
  `${ORIGIN}/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-aktualne/`;
const ARCHIVE_BASE =
  `${ORIGIN}/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-nieaktualne/`;

// Paged URL: page 1 = bare base; page N = base + "ogloszenia-aktualne.html?page=N"
function pageUrl(base, n) {
  return n === 1 ? base : `${base}ogloszenia-aktualne.html?page=${n}`;
}

const MAX_PAGES_ACTIVE = 5;   // active board: 2 pages as of 2026-06-29; safety cap
const MAX_PAGES_ARCHIVE = 25; // archive: 19 pages as of 2026-06-29; safety cap

// One memoised crawl for the whole pipeline run.
let crawlPromise = null;

async function crawlBoard(base, maxPages, label) {
  const listings = [];
  const resultRefs = [];
  const seenKeys = new Set();
  const seenResultUrls = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = pageUrl(base, page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  augustow ${label} page ${page} fetch failed: ${err.message}`);
      break;
    }

    // Stop when page is empty (beyond last real page — Augustów serves empty body,
    // NOT a redirect to page 1, so no wrap-detection needed).
    if (!/<li[^>]*class="[^"]*component-item[^"]*clearfix/i.test(html)) {
      console.error(`  augustow ${label}: empty page ${page} — stopping`);
      break;
    }

    // ---- flat announcement listings ----------------------------------------
    const items = parseListPage(html, ORIGIN);
    let newFlats = 0;
    for (const it of items) {
      const key = it.detail_url;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      listings.push({
        kind: it.kind,
        address_raw: null,   // not in list title for Augustów multi-flat announcements
        address: null,       // parsed from detail page body on first CI run
        auction_date: null,  // in detail page body text
        published_date: it.published_date,
        round: it.round,
        area_m2: null,       // in detail page body text
        starting_price_pln: null, // in detail page body text
        detail_url: it.detail_url,
      });
      newFlats++;
    }

    // ---- result notice links -----------------------------------------------
    const titleLinkRe = /<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"(?:[^>]*title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/gi;
    let rm;
    while ((rm = titleLinkRe.exec(html)) !== null) {
      const title = stripHtml(rm[2] || rm[3]);
      if (!isResultNoticeTitle(title)) continue;
      // Only collect result notices that mention "lokal mieszkalny" — skip land/house results.
      if (!/lokal\s+mieszkaln/i.test(title)) continue;
      let href = rm[1].replace(/&amp;/gi, '&');
      if (href.startsWith('/')) href = ORIGIN + href;
      if (seenResultUrls.has(href)) continue;
      seenResultUrls.add(href);
      resultRefs.push({ detail_url: href, title });
    }

    console.error(
      `  augustow ${label} page ${page}: ${newFlats} new flat(s), ` +
      `${resultRefs.length} result notice(s) seen so far`,
    );
  }

  return { listings, resultRefs };
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function crawlAll() {
  const [active, archive] = await Promise.all([
    crawlBoard(ACTIVE_BASE, MAX_PAGES_ACTIVE, 'aktualne'),
    crawlBoard(ARCHIVE_BASE, MAX_PAGES_ARCHIVE, 'nieaktualne'),
  ]);

  // Merge, deduplicating by detail_url
  const seenUrls = new Set();
  const listings = [];
  for (const l of [...active.listings, ...archive.listings]) {
    if (seenUrls.has(l.detail_url)) continue;
    seenUrls.add(l.detail_url);
    listings.push(l);
  }

  const seenResultUrls = new Set();
  const resultRefs = [];
  for (const r of [...active.resultRefs, ...archive.resultRefs]) {
    if (seenResultUrls.has(r.detail_url)) continue;
    seenResultUrls.add(r.detail_url);
    resultRefs.push(r);
  }

  // ---- fetch result notice PDFs (second pass) --------------------------------
  const resolvedRefs = [];
  for (const ref of resultRefs) {
    let detailHtml;
    try {
      detailHtml = await getText(ref.detail_url);
    } catch (err) {
      console.error(`  augustow result detail fetch failed (${ref.detail_url}): ${err.message}`);
      continue;
    }

    const pdfUrl = attachmentUrlFromDetail(detailHtml, ORIGIN);
    if (!pdfUrl) {
      console.error(`  augustow result: no PDF attachment on ${ref.detail_url}`);
      continue;
    }

    let text = '';
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  augustow result PDF extract failed (${pdfUrl}): ${err.message}`);
      continue;
    }

    resolvedRefs.push({
      text,
      pdf_url: pdfUrl,
      auction_date: null, // filled by parseResultDoc from PDF body
    });
  }

  console.error(
    `  augustow: ${listings.length} flat listing(s) total, ` +
    `${resolvedRefs.length} result PDF(s) resolved`,
  );
  return { listings, resolvedRefs };
}

/** Active flat auction listings. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [] };
}

/**
 * Result notice refs with .text pre-extracted from PDF.
 * refresh.js (source:'html') feeds ref.text → city.parseResultDoc().
 */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resolvedRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active flat listing(s)`);
}
