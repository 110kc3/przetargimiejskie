// Pila crawler.
//
// Source: bip.pila.pl -- server-rendered custom-PHP BIP.
// See config.js + spikes/wielkopolskie/powiat-pilski/pila.md.
//
// Flow:
//   1. GET /542-aktualne-przetargi-na-nieruchomosci.html
//      -> HTML table: each row has NAME (title) + dates + a relative slug link.
//         Entries include active auctions AND (after they conclude) articles
//         that gain a "wyniki" PDF attachment -- same article, no separate list.
//   2. Filter by title: keep lokal mieszkalny entries; skip land, leases, etc.
//   3. GET each article page -> find PDF attachment links:
//        "Tresc ogloszenia" / "ogloszenie*" -> announcement PDF
//        "wyniki" / "wynik" in filename or label -> result PDF (post-auction)
//   4. Fetch + pdftotext the announcement PDF -> parseAnnouncementPdf()
//      Fetch + pdftotext the result PDF -> parseResultDoc() (if present)
//
// UA: bip.pila.pl silently returns an empty or minimal body to the default bot
// UA. All fetches use BROWSER_UA (same pattern as bytom, wejherowo).
//
// REDIRECT NOTE (from spike): direct slug URL navigation from within a session
// redirects to the homepage in some states. Fresh fetches (no Referer, browser
// UA) work reliably. The /542 list page is always stable.
//
// source:'html' means crawlResultDocs() returns refs with a .pdfUrl that the
// refresh loop passes to parseResultDoc via pdfText() -- we do NOT carry .text
// (unlike Tarnowskie Gory, which downloads the PDF here and carries .text).
// This keeps crawl.js light; pdfText is invoked by refresh.js.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncementPdf, parseResultDoc, isSkippableTitle, isFlatAnnouncementTitle } from './parse.js';

const ORIGIN = 'https://bip.pila.pl';
const LIST_URL = `${ORIGIN}/542-aktualne-przetargi-na-nieruchomosci.html`;

// Browser UA -- bip.pila.pl returns minimal/empty body to default bot UA.
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ---- HTML helpers -----------------------------------------------------------

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

// ---- list-page parser -------------------------------------------------------
//
// The /542 page renders a table (class "registry") with one row per entry.
// Each row has columns: TYP | NAZWA | DATA MODYFIKACJI | DATA DODANIA.
// The NAZWA column contains an <a href="<slug>.html?"> link.
//
// Confirmed live 2026-06-27: link href is a relative slug like
//   "prezydent-miasta-pily-oglasza-...html?"
// (with a trailing "?" -- the CMS appends it; strip it for fetching).
//
// We scan all <a href="...html"> links whose surrounding text contains a NAZWA.
// The simplest robust approach: match every link with a .html (or .html?) href
// that is NOT a navigation link (i.e. has a meaningful title text).

const ENTRY_LINK_RE = /href="([^"]+\.html\??)"[^>]*>\s*Kliknij[^<]*<\/a>/gi;
const NAMED_LINK_RE = /href="([^"]*\.html\??)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * Parse the list page HTML and return raw stubs for each entry.
 * @param {string} html
 * @returns {{ href: string, title: string, added_date: string|null }[]}
 */
export function parseListPage(html) {
  if (!html) return [];
  const out = [];
  // The registry table has links in the format:
  //   href="<slug>.html?" with adjacent text "Kliknij aby przejsc do <TITLE>."
  // We capture both the href and the title from the accessibility text.
  // Note: "przejsc" in Polish = przej + sc (two chars after przej).
  // The regex uses character classes to handle Polish diacritics on both chars.
  // Live markup 2026-07: the accessibility text moved from the link TEXT into
  // the title ATTRIBUTE — <a href="slug.html?" title="Kliknij aby przejść do
  // TITLE." class="registry__table_row_name…">TITLE</a>. Match both variants.
  const RE_ATTR =
    /href="([^"]+\.html\??)"[^>]*title="Kliknij\s+aby\s+przej[sSśŚ][cCćĆ]\s+do\s+([^"]*?)\.?\s*"[^>]*>([\s\S]*?)<\/a>/gi;
  const RE_TEXT =
    /href="([^"]+\.html\??)"[^>]*>\s*Kliknij\s+aby\s+przej[sSśŚ][cCćĆ]\s+do\s+([\s\S]*?)\.\s*<\/a>/gi;
  const RE = RE_ATTR.test(html) ? RE_ATTR : RE_TEXT;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const rawHref = m[1].replace(/\?$/, ''); // strip trailing "?"
    // Skip navigation links (they tend to be short numeric IDs or known paths)
    if (/^(https?:|#|rejestr|mapa|instrukcja|statysty|informacja|rss)/i.test(rawHref)) continue;
    const title = stripTags(m[2]).trim();
    if (!title) continue;
    // Find the nearest DATA DODANIA date after this link
    const afterPos = m.index + m[0].length;
    const rest = html.slice(afterPos, afterPos + 900);
    const dm = /(\d{4}-\d{2}-\d{2})/.exec(rest);
    out.push({
      href: rawHref,
      title,
      added_date: dm ? dm[1] : null,
    });
  }
  return out;
}

// ---- article-page attachment parser -----------------------------------------
//
// Each article page has an "ZALACZNIKI" section with download links:
//   <a href="files/file_add/download/<id>_<name>.pdf" ...>
// The filename + surrounding label text identifies the role of each PDF.
//
// Confirmed live 2026-06-27 for the 11 Listopada 39/8 article:
//   - "DRZWI_OTWARTE_LOKAL_MIESZKALNY.pdf"   -> open-house notice (skip)
//   - "ogloszenie_o_przetargu_lokal_mieszkalny.pdf" -> announcement (want)
//   - "Klauzula_informacyjna_*.pdf"            -> GDPR clause (skip)
//   - "mapa_*.pdf"                             -> map (skip)
//   - "Szkic lokalu *.pdf"                     -> floor plan (skip)
// Post-auction, a "wyniki" PDF is added (exact filename TBD -- validate on CI).

const ATTACH_RE =
  /href="(files\/file_add\/download\/[^"]+\.pdf)"[^>]*>[\s\S]*?(?:<[^>]+>)*([^<]*)/gi;

/**
 * @typedef {{ url: string, label: string, role: 'announcement'|'result'|'other' }} AttachmentRef
 *
 * Parse attachment links from an article-page HTML.
 * @param {string} html
 * @returns {AttachmentRef[]}
 */
export function parseArticleAttachments(html) {
  if (!html) return [];
  const out = [];
  ATTACH_RE.lastIndex = 0;
  let m;
  // Walk the HTML looking for the download link + its visible label.
  // Strategy: find all PDF download hrefs and use the inner <a> text for the label.
  const fullRE = /href="(files\/file_add\/download\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = fullRE.exec(html)) !== null) {
    const path = m[1];
    const url = `${ORIGIN}/${path}`;
    const rawLabel = stripTags(m[2]);
    // Also look for the "Kliknij aby pobrac plik: NAME.pdf." pattern (the
    // accessible label text used in the live page, confirmed 2026-06-27).
    // IMPORTANT: search FORWARD only (from m.index to end of this <a> + 100 chars)
    // so we do NOT accidentally pick up the previous attachment's label from
    // earlier in the HTML (which caused role mis-classification in testing).
    const accessibleRE = /Kliknij\s+aby\s+pobra[cCćĆ]\s+plik:\s+([^.\s][^.]*\.pdf)/i;
    const forwardWindow = html.slice(m.index, m.index + m[0].length + 100);
    const accessM = accessibleRE.exec(forwardWindow);
    const label = accessM ? accessM[1] : rawLabel;
    const lLower = (path + ' ' + label).toLowerCase();
    let role = 'other';
    if (/ogloszenie|ogłoszenie|tresc|tre[sś][cć]/.test(lLower)) role = 'announcement';
    else if (/wyniki|wynik(?!iem)/.test(lLower)) role = 'result';
    out.push({ url, label, role });
  }
  return out;
}

// ---- crawl ------------------------------------------------------------------

/**
 * Fetch and process the list + articles. Returns { listings, resultRefs }.
 * - listings: announcement records ready for crawlActive()
 * - resultRefs: { pdfUrl, detail_url, published_date } for crawlResultDocs()
 */
async function crawlAll() {
  // 1. Fetch the list page
  let listHtml;
  try {
    listHtml = await getText(LIST_URL, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  pila: list page fetch failed: ${err.message}`);
    return { listings: [], resultRefs: [] };
  }

  const stubs = parseListPage(listHtml);
  const flat = stubs.filter(s => !isSkippableTitle(s.title) && isFlatAnnouncementTitle(s.title));

  console.error(
    `  pila: list page: ${stubs.length} total entries, ${flat.length} flat announcement(s)`,
  );

  const listings = [];
  const resultRefs = [];

  for (const stub of flat) {
    const articleUrl = `${ORIGIN}/${stub.href}`;
    let articleHtml;
    try {
      articleHtml = await getText(articleUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  pila: article fetch failed (${stub.href}): ${err.message}`);
      continue;
    }

    const attachments = parseArticleAttachments(articleHtml);
    const annPdf = attachments.find(a => a.role === 'announcement');
    const resultPdf = attachments.find(a => a.role === 'result');

    if (annPdf) {
      let pdfTxt;
      try {
        pdfTxt = await pdfText(annPdf.url, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  pila: announcement PDF failed (${annPdf.url}): ${err.message}`);
      }
      if (pdfTxt) {
        const rows = parseAnnouncementPdf(pdfTxt);
        if (rows.length === 0) {
          console.error(`  pila WARN: no records parsed from ${stub.href}`);
        }
        for (const rec of rows) {
          listings.push({ ...rec, detail_url: articleUrl, source_url: annPdf.url });
        }
      }
    } else {
      console.error(`  pila: no announcement PDF on article ${stub.href}`);
    }

    if (resultPdf) {
      resultRefs.push({
        pdfUrl: resultPdf.url,
        detail_url: articleUrl,
        published_date: stub.added_date,
      });
    }
  }

  console.error(
    `  pila: ${listings.length} active listing(s), ${resultRefs.length} result PDF ref(s)`,
  );
  return { listings, resultRefs };
}

// Memoised crawl -- both crawlActive and crawlResultDocs share one pass.
let crawlPromise = null;

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

/**
 * Result-notice PDF refs for the achieved-price stream.
 * Each ref has { pdfUrl, detail_url, published_date }; refresh.js calls
 * pdfText(ref.pdfUrl) then parseResultDoc(text, ref.published_date, ref.pdfUrl).
 * @returns {Promise<Array<{ pdfUrl: string, detail_url: string, published_date: string|null }>>}
 */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, results: results.length, sampleListing: listings[0] }, null, 2) + '\n',
  );
}
