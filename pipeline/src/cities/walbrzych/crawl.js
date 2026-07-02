// Wałbrzych crawler.
//
// Two independent streams:
//
//   1. ACTIVE LISTINGS — GET /przetargi-nieruchomosci/{page}/25 (paginated HTML
//      board). Each page card carries: address label, "Rodzaj nieruchomości",
//      "Cena wywoławcza", "Data przetargu", detail URL. We filter for cards
//      whose "Rodzaj nieruchomości" is "lokal mieszkalny". No form POST / no
//      mosparo token needed for the plain listing board.
//
//      Note: the board at /przetargi-nieruchomosci/2359 also accepts a `kind_id`
//      query param when POSTing the search form, but that form is mosparo-gated.
//      GET pagination without the filter is cheaper and reliable. We filter the
//      HTML client-side.
//
//   2. RESULT NOTICES — Walk the year/month sub-tree under
//      /artykuly/2369/informacje-o-wynikach-przetargow. Each leaf article page
//      links to a PDF at /attachments/download/{id}. We download and pdftotext
//      each PDF (source:'html' → refresh.js expects `.text` on each ref).
//
// Pagination: /przetargi-nieruchomosci/{page}/25 — confirmed 45 pages as of
// 2026-06-27. We stop when a page returns 0 flat cards or we exceed MAX_PAGES.
//
// Bot-blocking note: the BIP server returned empty responses to curl (bare UA)
// during spike research. A browser UA (see BROWSER_UA below) resolves this.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseResultDoc } from './parse.js';

const ORIGIN = 'https://bip.um.walbrzych.pl';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// ── Board pagination ──────────────────────────────────────────────────────────

const PER_PAGE = 25; // max items per page the BIP supports
const MAX_PAGES = 60; // safety ceiling (~1500 items; current total ~450)

/** URL for listing board page N (1-indexed) */
const boardUrl = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/${PER_PAGE}`;

/**
 * Parse a listing board HTML page. Extract property cards.
 * Each card is a `<div>` or `<section>` block with an italicised address header
 * and a table of fields. The web_fetch/getText view confirmed the rendered
 * markdown structure:
 *
 *   *Adres nieruchomości : Wałbrzych, przy ul. Villardczyków*
 *   | Adres nieruchomości  | [link text](detailUrl) |
 *   | Przetarg na          | … |
 *   | Typ przetargu        | Przetarg ustny nieograniczony |
 *   | Rodzaj nieruchomości | lokal mieszkalny |
 *   | Cena wywoławcza      | … |
 *   | Data przetargu       | **DD.MM.YYYY** godz. … |
 *
 * In the raw HTML each card is bounded by an <article> or <section> with
 * class "przetarg-nieruchomosci-item" (vendor CMS). We parse using regex on
 * the HTML text since there is no DOM parser available in plain Node ESM.
 *
 * @param {string} html raw HTML of a board page
 * @returns {Array<{detailUrl:string, address_raw:string, kind:string, starting_price_pln:number|null, auction_date:string|null}>}
 */
export function parseBoardPage(html) {
  const results = [];

  // Split on card boundaries. The CMS wraps each listing in an element whose
  // inner text starts with the italicised address. In the raw HTML this is:
  //   <em>Adres nieruchomości…</em> … </table>
  // We split on the start-of-card marker (<em>Adres nieruchomości</em> or the
  // address-label row of the table) and work on each segment.
  //
  // Confirmed raw HTML pattern (from live BIP, Logonet v2.9.0):
  //   <article … class="…przetarg…">
  //     <header>…<em>Adres nieruchomości : Wałbrzych, przy ul. …</em></header>
  //     <table>
  //       <tr><td>Adres nieruchomości</td><td><a href="/przetarg-nieruchomosci/NNN/slug">…</a></td></tr>
  //       <tr><td>Rodzaj nieruchomości</td><td>lokal mieszkalny</td></tr>
  //       <tr><td>Cena wywoławcza</td><td>NNN,00 zł</td></tr>
  //       <tr><td>Data przetargu</td><td><strong>DD.MM.YYYY</strong> …</td></tr>
  //     </table>
  //   </article>
  //
  // We use a regex to capture each <article>…</article> block, then extract
  // the fields we need from it.

  // Live markup (2026-07): no <article> wrapper — each card is a
  // <table class="table table-borderless"> block with <th scope="row"> labels,
  // and detail hrefs are ABSOLUTE (https://bip.um.walbrzych.pl/przetarg-...).
  const articleRe = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[0];

    // Detail URL — accept absolute or relative href.
    const hrefM = /href="(?:https?:\/\/[^"\/]+)?(\/przetarg-nieruchomosci\/[^"]+)"/.exec(block);
    if (!hrefM) continue;
    const detailUrl = ORIGIN + hrefM[1];

    // Kind
    const kindM = /Rodzaj nieruchomo[śs]ci<\/[^>]+>\s*<[^>]+>([^<]+)</.exec(block);
    const kind = kindM ? kindM[1].trim().toLowerCase() : '';
    if (!kind.includes('lokal mieszkalny')) continue; // filter: flats only

    // Address (from address cell, strip "Wałbrzych, przy " prefix)
    const addrM = /Adres nieruchomo[śs]ci<\/[^>]+>\s*<[^>]+><a[^>]*>([^<]+)<\/a>/.exec(block);
    const addrRaw = addrM
      ? addrM[1].trim().replace(/^Wa[łl]brzych,?\s*przy\s*/i, '').trim()
      : '';

    // Starting price
    const priceM = /Cena wywo[łl]awcza<\/[^>]+>\s*<[^>]+>([^<]+)</.exec(block);
    const priceStr = priceM ? priceM[1].trim() : '';
    const priceNum = priceStr ? Number(priceStr.replace(/[\s.]/g, '').replace(',', '.').replace(/[^0-9.]/g, '')) : null;
    const starting_price_pln = Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum) : null;

    // Auction date (DD.MM.YYYY inside <strong>)
    const dateM = /Data przetargu[\s\S]{0,200}?<strong>(\d{2})\.(\d{2})\.(\d{4})<\/strong>/.exec(block);
    const auction_date = dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}` : null;

    results.push({ detailUrl, address_raw: addrRaw, kind, starting_price_pln, auction_date });
  }

  return results;
}

/**
 * Crawl all listing board pages, collecting active flat announcements.
 * Stops when a page yields no flat cards or MAX_PAGES is reached.
 * @returns {Promise<Array<object>>}
 */
async function crawlListings() {
  const listings = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(boardUrl(page), { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  walbrzych board page ${page}: ${err.message}`);
      break;
    }
    const cards = parseBoardPage(html);
    if (cards.length === 0) break; // no more flat cards
    for (const c of cards) listings.push(c);
    // Stop if the page had fewer items than PER_PAGE (last page)
    // The raw HTML also contains pagination links — detect last page by checking
    // if a "następna strona" link is absent. We check cards < PER_PAGE as a proxy.
    if (cards.length < PER_PAGE && !html.includes('następna strona')) break;
  }
  console.error(`  walbrzych: ${listings.length} active flat listing(s) found`);
  return listings;
}

// ── Result notices ────────────────────────────────────────────────────────────
//
// Navigation tree (confirmed live 2026-06-27):
//   /artykuly/2369/informacje-o-wynikach-przetargow  →  year pages (2022–2026)
//   /artykuly/3300/2026-rok                          →  month sub-pages
//   /artykuly/3128/2025-rok                          →  month sub-pages
//   /artykuly/3129/styczen                           →  article links
//   /artykul/{parentId}/{articleId}/{slug}           →  article with PDF attachment
//
// The year-index page embeds the month links in the sidebar menu.
// Each month page lists article titles as <h2><a href=…> links.
// Each article page has a single PDF at /attachments/download/{id}.

/** Known year-index article IDs (confirmed from BIP navigation 2026-06-27). */
const YEAR_PAGES = [
  { year: 2026, url: `${ORIGIN}/artykuly/3300/2026-rok` },
  { year: 2025, url: `${ORIGIN}/artykuly/3128/2025-rok` },
  { year: 2024, url: `${ORIGIN}/artykuly/2893/2024-rok` },
  { year: 2023, url: `${ORIGIN}/artykuly/2631/2023-rok` },
  { year: 2022, url: `${ORIGIN}/artykuly/2370/2022-rok` },
];

/**
 * Parse month sub-page URLs from a year-index page HTML.
 * The sidebar menu contains: <a href="/artykuly/NNNN/month-name">month</a>
 * under the "2025 rok" / "2026 rok" node.
 * @returns {string[]} absolute URLs
 */
export function parseMonthUrls(html) {
  const urls = [];
  // Match sidebar links that look like /artykuly/NNNN/<polish-month-name>
  // Polish months: styczen, luty, marzec, kwiecien, maj, czerwiec,
  //   lipiec, sierpien, wrzesien, pazdziernik, listopad, grudzien
  // Live markup 2026-07 uses ABSOLUTE hrefs; accept both forms.
  const re = /href="(?:https?:\/\/[^"\/]+)?(\/artykuly\/\d+\/(?:styczen|luty|marzec|kwiecien|maj|czerwiec|lipiec|sierpien|wrzesien|pazdziernik|listopad|grudzien))"/gi;
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = ORIGIN + m[1];
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

/**
 * Parse result-article URLs from a month page HTML.
 * Each article is an <h2><a href="/artykul/{parentId}/{articleId}/{slug}">…</a></h2>.
 * @returns {string[]} absolute URLs
 */
export function parseArticleUrls(html) {
  const urls = [];
  const re = /href="(?:https?:\/\/[^"\/]+)?(\/artykul\/\d+\/\d+\/[^"]+)"/gi;
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = ORIGIN + m[1];
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

/**
 * Extract the PDF attachment URL from a result-article page HTML.
 * The attachment link: <a href="/attachments/download/NNNNN" …>…</a>
 * with accompanying text "pdf, NNN kB".
 * @returns {string|null} absolute URL
 */
export function parsePdfUrl(html) {
  // Primary: link followed by "pdf," mime hint
  const m = /href="(?:https?:\/\/[^"\/]+)?(\/attachments\/download\/\d+)"[^>]*>[^<]*<\/a>\s*pdf,/i.exec(html);
  if (m) return ORIGIN + m[1];
  // Fallback: any /attachments/download/ link
  const fb = /href="(?:https?:\/\/[^"\/]+)?(\/attachments\/download\/\d+)"/.exec(html);
  return fb ? ORIGIN + fb[1] : null;
}

/**
 * Fetch and pdftotext all result PDFs from the results sub-tree.
 * Returns refs shaped for refresh.js: { text, pdf_url, detail_url, auction_date }
 */
async function crawlResultDocs() {
  const refs = [];

  for (const { year, url: yearUrl } of YEAR_PAGES) {
    let yearHtml;
    try {
      yearHtml = await getText(yearUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  walbrzych year ${year}: ${err.message}`);
      continue;
    }

    const monthUrls = parseMonthUrls(yearHtml);
    if (monthUrls.length === 0) {
      console.error(`  walbrzych year ${year}: no month pages found`);
      continue;
    }

    for (const monthUrl of monthUrls) {
      let monthHtml;
      try {
        monthHtml = await getText(monthUrl, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  walbrzych month ${monthUrl}: ${err.message}`);
        continue;
      }

      const articleUrls = parseArticleUrls(monthHtml);
      for (const articleUrl of articleUrls) {
        let articleHtml;
        try {
          articleHtml = await getText(articleUrl, { userAgent: BROWSER_UA });
        } catch (err) {
          console.error(`  walbrzych article ${articleUrl}: ${err.message}`);
          continue;
        }

        const pdfUrl = parsePdfUrl(articleHtml);
        if (!pdfUrl) {
          console.error(`  walbrzych: no PDF attachment on ${articleUrl}`);
          continue;
        }

        let text;
        try {
          text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
        } catch (err) {
          console.error(`  walbrzych: PDF extract failed ${pdfUrl}: ${err.message}`);
          continue;
        }

        // Quick guard: skip non-result PDFs (should not occur in this tree)
        if (!/Informacja\s+o\s+wynikach\s+przetarg/i.test(text)) {
          console.error(`  walbrzych: unexpected non-result PDF at ${pdfUrl} — skipped`);
          continue;
        }

        refs.push({ text, pdf_url: pdfUrl, detail_url: articleUrl, auction_date: null });
      }
    }
  }

  console.error(`  walbrzych: ${refs.length} result notice PDF(s) found`);
  return refs;
}

// ── Public exports ────────────────────────────────────────────────────────────

/**
 * Fetch active flat listings from the public listing board.
 * @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>}
 */
export async function crawlActive() {
  const listings = await crawlListings();
  return { listings, wykaz: [], land: [] };
}

/**
 * Fetch and extract all result-notice PDFs from the results sub-tree.
 * Each returned ref already carries `.text` (source:'html' → refresh.js uses
 * the ref's text directly, bypassing the OCR/pdf-text dispatch).
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:null}>>}
 */
export { crawlResultDocs };

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
