// Łódź crawler — bip.uml.lodz.pl (TYPO3, server-rendered HTML).
//
// ARCHITECTURE (confirmed live 2026-06-27):
//
//   Listing pages (active + archive):
//     /urzad-miasta/przetargi/sprzedaz-nieruchomosci/
//     /urzad-miasta/przetargi/archiwum-przetargow/sprzedaz-nieruchomosci-archiwum/
//       sprzedaz-nieruchomosci-archiwum-2024-r-1-1/    ← 2026 archive (TYPO3 slug)
//
//   Article URL pattern:
//     /urzad-miasta/przetargi/sprzedaz-nieruchomosci/ogloszenie/{slug}-id{N}/YYYY/MM/D/
//   or in archive:
//     /...sprzedaz-nieruchomosci-archiwum.../ogloszenie-2024-1-1/{slug}-id{N}/YYYY/MM/D/
//
//   Each article has ONE or TWO PDF links:
//     "Treść ogłoszenia [.pdf]"      → announcement (always present)
//     "Informacja o wynikach przetargów [.pdf]" → result (added post-auction)
//
//   Result PDF naming: ZNN_wyniki_{addresses}_{YYYYMMDD}.pdf
//   Announcement PDF naming: ZNN_przetarg_{addresses}_{YYYYMMDD}.pdf
//     (Note: live naming uses "ZNN_przetarg_" not "ZNN_sn_" as the spike draft said.)
//
//   The /ostatnio-dodane/ "Wyniki…" articles just LINK BACK to the archived
//   announcement article — they are not fetched separately.
//
// crawlAll() does ONE pass over all article pages, separating:
//   - Announcement PDFs without a result link → active listings (crawlActive)
//   - Result PDFs (when present on the article) → result refs (crawlResultDocs)
//
// source:'html' → result refs carry `.text` (already extracted PDF text) so
// refresh.js skips its own pdf-text dispatch.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncementPdf } from './parse.js';

const ORIGIN = 'https://bip.uml.lodz.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// The active listing board + the 2026 archive board.
// The archive TYPO3 slug ends in "-2024-r-1-1" because the node was created in
// 2024 and the CMS appended counter suffixes — confirmed live 2026-06-27.
const LISTING_PAGES = [
  `${ORIGIN}/urzad-miasta/przetargi/sprzedaz-nieruchomosci/`,
  `${ORIGIN}/urzad-miasta/przetargi/archiwum-przetargow/sprzedaz-nieruchomosci-archiwum/sprzedaz-nieruchomosci-archiwum-2024-r-1-1/`,
];

// Article links on listing pages match /ogloszenie/ in the href.
const ARTICLE_LINK_RE = /href="([^"]*\/ogloszenie[^"]+)"/g;
// PDF attachment link text signals.
const ANN_PDF_TITLE_RE = /Tre[śs][ćc]\s+og[łl]oszenia/i;
const RESULT_PDF_TITLE_RE = /Informacja\s+o\s+wynikach/i;

/**
 * Extract all article URLs from one listing-page HTML.
 * @param {string} html
 * @returns {string[]} absolute URLs
 */
function parseArticleLinks(html) {
  const urls = [];
  const seen = new Set();
  let m;
  ARTICLE_LINK_RE.lastIndex = 0;
  while ((m = ARTICLE_LINK_RE.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    const abs = href.startsWith('http') ? href : `${ORIGIN}${href}`;
    if (!seen.has(abs)) { seen.add(abs); urls.push(abs); }
  }
  return urls;
}

/**
 * Extract PDF link(s) from an article's HTML.
 * Returns { annPdfUrl, resultPdfUrl } — either may be null.
 * @param {string} html
 * @returns {{ annPdfUrl: string|null, resultPdfUrl: string|null }}
 */
export function parsePdfLinks(html) {
  // Live TYPO3 markup nests the label in a <span> and repeats it in the
  // title attribute:
  //   <a href="/files/…ZNN_przetarg_….pdf" target="_blank"
  //      title="Treść ogłoszenia [.pdf]">
  //     <span class="ce-uploads-fileName">Treść ogłoszenia [.pdf]</span></a>
  // The old ([^<]+) captured only the whitespace before <span>, so labels
  // never matched. Read the attributes AND the tag-stripped inner HTML.
  const re = /<a[^>]*href="([^"]*\.pdf)"([^>]*)>([\s\S]{0,300}?)<\/a>/gi;
  let annPdfUrl = null;
  let resultPdfUrl = null;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const label = `${m[2]} ${m[3].replace(/<[^>]+>/g, ' ')}`;
    const abs = href.startsWith('http') ? href : `${ORIGIN}${href}`;
    if (ANN_PDF_TITLE_RE.test(label) && !annPdfUrl) annPdfUrl = abs;
    if (RESULT_PDF_TITLE_RE.test(label) && !resultPdfUrl) resultPdfUrl = abs;
  }
  return { annPdfUrl, resultPdfUrl };
}

// One memoised full crawl.
let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  // 1) Collect all article URLs from every listing page (deduplicated).
  const articleUrls = [];
  const seenUrls = new Set();
  for (const listingPage of LISTING_PAGES) {
    let html;
    try {
      html = await getText(listingPage, FETCH_OPTS);
    } catch (err) {
      console.error(`  lodz listing fetch failed (${listingPage}): ${err.message}`);
      continue;
    }
    const links = parseArticleLinks(html);
    let added = 0;
    for (const u of links) {
      if (!seenUrls.has(u)) { seenUrls.add(u); articleUrls.push(u); added++; }
    }
    console.error(`  lodz listing ${listingPage}: ${links.length} article link(s) (${added} new)`);
  }
  console.error(`  lodz: ${articleUrls.length} candidate article(s) to inspect`);

  // 2) For each article, fetch HTML, extract PDF links, process PDFs.
  for (const articleUrl of articleUrls) {
    let html;
    try {
      html = await getText(articleUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  lodz article fetch failed (${articleUrl}): ${err.message}`);
      continue;
    }

    const { annPdfUrl, resultPdfUrl } = parsePdfLinks(html);
    if (!annPdfUrl) {
      console.error(`  lodz WARN: no announcement PDF on ${articleUrl}`);
      continue;
    }

    // Parse the announcement PDF → active records.
    let annText;
    try {
      annText = await pdfText(annPdfUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  lodz ann PDF extract failed (${annPdfUrl}): ${err.message}`);
      continue;
    }

    const annRecords = parseAnnouncementPdf(annText, {
      detail_url: articleUrl,
      source_url: annPdfUrl,
    });
    for (const rec of annRecords) {
      if (rec.kind === 'grunt') land.push(rec);
      else listings.push(rec);
    }

    // If there's a result PDF, collect it for the result stream.
    if (resultPdfUrl) {
      let resultText;
      try {
        resultText = await pdfText(resultPdfUrl, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  lodz result PDF extract failed (${resultPdfUrl}): ${err.message}`);
        continue;
      }
      resultRefs.push({
        text: resultText,
        pdf_url: resultPdfUrl,
        detail_url: articleUrl,
        auction_date: null, // parseResultDoc extracts from the PDF text
      });
    }
  }

  console.error(
    `  lodz: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved-price PDFs attached to archived announcement articles). */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** Active listings + land. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}
