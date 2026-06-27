// Kielce crawler — bipum.kielce.eu SmartSite BIP board.
//
//   BOARD (one paginated list, 10 items/page, ~8 pages as of June 2026):
//     Page 1: …/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/
//     Page N: …/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci-1.html?page=N
//
// The same board carries BOTH flat auction announcements AND result notices
// ("Informacja o wyniku przetargu"). We walk all pages once, separate the two
// stream by title keyword, and:
//
//   ACTIVE: parseListPage() → flat items. All data extractable from the title
//     (round, area, address). No price or auction date in the list — those live
//     in the PDF/DOCX attachment fetched from the detail page. We return what
//     we have; CI enrichment will add prices/dates from attachments on first run.
//
//   RESULTS: for each result notice title, fetch the detail page, find the DOCX
//     (or PDF) attachment, extract its text with docText(), and return the ref
//     with `.text` set. refresh.js reads ref.text (source:'html') and feeds it
//     to parseResultDoc() to produce achieved-price records.
//
// Volume: ~5-8 flat auctions/year; ~8 pages total as of 2026.
// No bot-block, no CAPTCHA, plain HTTPS, no auth.

import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseListPage,
  isResultNoticeTitle,
  attachmentUrlFromDetail,
} from './parse.js';

const ORIGIN = 'https://bipum.kielce.eu';
const BOARD_BASE =
  `${ORIGIN}/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/` +
  `przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/`;
const BOARD_PAGED =
  `${BOARD_BASE}przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci-1.html`;

const MAX_PAGES = 12; // safety cap; real board is ~8 pages

function pageUrl(n) {
  return n === 1 ? BOARD_BASE : `${BOARD_PAGED}?page=${n}`;
}

// One memoised crawl — crawlActive() and crawlResultDocs() both read from here
// so the ~12 throttled board-page fetches happen exactly once per pipeline run.
let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = []; // { detail_url, title } — to be fetched below

  const seenKeys = new Set();
  const seenResultUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = pageUrl(page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  kielce board page ${page} fetch failed: ${err.message}`);
      break;
    }

    // SmartSite re-serves page 1 when ?page=N exceeds the last real page.
    // Detect the wrap: if the page > 1 URL still returns "current page = 1" in
    // the pagination aria-label, we've wrapped around.
    if (page > 1 && /aria-current="page"[^>]*>\s*1\s*<\/a>/i.test(html)) {
      console.error(`  kielce board: page ${page} wrapped to page 1 — stopping`);
      break;
    }

    // ---- active flat listings from this page --------------------------------
    const items = parseListPage(html, ORIGIN);
    let newFlats = 0;
    for (const it of items) {
      const key = it.address?.key ?? it.detail_url;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      listings.push({
        kind: it.kind,
        address_raw: it.address_raw,
        address: it.address,
        auction_date: null,         // not in list title; in PDF attachment
        published_date: it.published_date,
        round: it.round,
        area_m2: it.area_m2,
        starting_price_pln: null,   // not in list title; in PDF attachment
        detail_url: it.detail_url,
      });
      newFlats++;
    }

    // ---- result notices on this page ----------------------------------------
    // The h2 title links on the board page may include "Informacja o wyniku
    // przetargu ..." entries. We collect their detail-page URLs for the second
    // pass below.
    const titleLinkRe = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let rm;
    while ((rm = titleLinkRe.exec(html)) !== null) {
      const title = rm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!isResultNoticeTitle(title)) continue;
      let href = rm[1].replace(/&amp;/gi, '&');
      if (href.startsWith('/')) href = ORIGIN + href;
      if (seenResultUrls.has(href)) continue;
      seenResultUrls.add(href);
      resultRefs.push({ detail_url: href, title });
    }

    console.error(
      `  kielce page ${page}: ${newFlats} new flat(s), ` +
      `${resultRefs.length} result notice(s) seen so far`,
    );

    // Early stop on a genuinely empty page (no list items at all)
    if (!/<li[^>]*class="[^"]*component-item/.test(html)) {
      console.error(`  kielce: empty page ${page} — stopping`);
      break;
    }
  }

  // ---- fetch result notice DOCX/PDF attachments (second pass) ---------------
  // crawlResultDocs() contract (source:'html'): return refs with `.text` set
  // so refresh.js skips re-fetching and feeds ref.text straight to parseResultDoc.
  const resolvedRefs = [];
  for (const ref of resultRefs) {
    // Skip clearly non-flat result notices (land sales) to avoid pointless
    // DOCX downloads. Flat result: title contains "lokal mieszkalny" OR does NOT
    // contain "nieruchomości gruntowej". Be conservative — include if uncertain.
    const likelyFlat =
      /lokal\s+mieszkaln/i.test(ref.title) ||
      !/nieruchomo[śs]ci\s+gruntow/i.test(ref.title);
    if (!likelyFlat) {
      console.error(
        `  kielce result: skipping non-flat "${ref.title.slice(0, 60)}"`,
      );
      continue;
    }

    let detailHtml;
    try {
      detailHtml = await getText(ref.detail_url);
    } catch (err) {
      console.error(`  kielce result detail fetch failed (${ref.detail_url}): ${err.message}`);
      continue;
    }

    const attUrl = attachmentUrlFromDetail(detailHtml, ORIGIN);
    if (!attUrl) {
      console.error(`  kielce result: no DOCX/PDF attachment on ${ref.detail_url}`);
      continue;
    }

    let text = '';
    try {
      // Prefer docText (handles DOCX via unzip/catdoc AND .doc via catdoc).
      // Fall back to pdfText for PDF-only result notices.
      if (/\.pdf(\?|$)/i.test(attUrl)) {
        text = await pdfText(attUrl);
      } else {
        text = await docText(attUrl);
      }
    } catch (err) {
      // Try the other extractor on failure (attachment type may mismatch extension)
      try {
        text = /\.pdf(\?|$)/i.test(attUrl)
          ? await docText(attUrl)
          : await pdfText(attUrl);
      } catch (err2) {
        console.error(`  kielce result attachment extract failed (${attUrl}): ${err.message}`);
        continue;
      }
    }

    resolvedRefs.push({
      text,
      pdf_url: attUrl,   // convention: refresh.js reads ref.pdf_url for provenance
      auction_date: null, // filled by parseResultDoc from the DOCX body
    });
  }

  console.error(
    `  kielce: ${listings.length} active flat listing(s), ` +
    `${resolvedRefs.length} result DOCX(s) resolved`,
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
 * Result notice refs with `.text` pre-extracted.
 * refresh.js (source:'html') feeds ref.text → city.parseResultDoc().
 */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resolvedRefs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active flat listing(s)`);
}
