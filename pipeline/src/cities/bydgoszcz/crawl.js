// Bydgoszcz crawler — server-rendered Logonet BIP (v2.9.0), board 1208.
//
// Single board: https://bip.um.bydgoszcz.pl/artykuly/1208/ holds both
// announcements ("Lokal przeznaczony do sprzedaży …") and result notices
// ("Informacja o wyniku …") for ALL property types (flats, land, buildings).
//
// Enumeration (groundtruthed 2026-06-27):
//   Index pages: /artykuly/1208/{page}/25/ogloszenia-o-przetargach-na-zbycie-nieruchomosci
//     Each page lists up to 25 article stubs (title + snippet). Only currently
//     visible items (2 pages = ~20 items at 10/page by default; we use 25/page
//     to get all items in 1-2 fetches).
//   Article page: /artykul/1208/{id}/{slug}
//     Contains: HTML body stub (title + 1-2 sentences) + Załączniki list.
//   Attachments:
//     Announcement articles: PDF (scanned image — pdftotext returns empty) +
//       DOC (born-digital OLE; catdoc extracts) + optional rzut PDF.
//     Result articles: DOCX only (20-50 kB, born-digital OOXML).
//     Both handled by doc-text.js (PK→unzip for .docx; OLE→catdoc for .doc).
//
// Strategy: fetch up to MAX_PAGES index pages (25/page) → collect all article
// stubs → for each flat/result article fetch the article page → find the
// DOC or DOCX attachment → call docText() → route by body header.
//
// Filtering:
//   - "Lokal przeznaczony do sprzedaży w drodze przetargu" = flat announcement
//   - "Informacja o wyniku" = result notice (any asset type)
//   - Land / zabudowane / cancellations are identified by title and dropped
//     from crawlActive (flat stream) but included in crawlResultDocs so future
//     land.json wiring can be added without a re-crawl.
//   - "Informacja o odwołaniu" (cancellation notices) are skipped entirely.
//
// source:'html' → crawlResultDocs() refs carry .text; refresh.js skips generic dispatch.

import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { parseAnnouncement, parseResultDoc, isResultNotice } from './parse.js';
import { parseAddress } from '../../core/normalize.js';

const ORIGIN = 'https://bip.um.bydgoszcz.pl';
const BOARD = 1208;
const PER_PAGE = 25;
const MAX_PAGES = 6; // safety cap; board currently has ~2 pages at 10/page

const abs = (p) => (/^https?:/.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url));
  } catch (err) {
    console.error(`  bydgoszcz: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

/**
 * Extract article stubs from one index page.
 * @param {string} html
 * @returns {Array<{id:string, slug:string, title:string, snippet:string}>}
 */
export function parseIndexPage(html) {
  const out = [];
  const seen = new Set();
  // Article links: href="/artykul/1208/{id}/{slug}"
  const linkRe = /href="\/artykul\/1208\/(\d+)\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({ id, slug: m[2], title });
  }
  return out;
}

/**
 * Classify an article stub's title/slug into a role.
 * Returns 'flat-ann' | 'result' | 'skip'.
 */
export function classifyArticle(title, slug) {
  const t = (title || '').toLowerCase();
  const s = (slug || '').toLowerCase();

  // Cancellation notices — always skip
  if (/odwo[łl]ani/i.test(t) || /odwolani/.test(s)) return 'skip';

  // Result notices — include in result stream
  if (/informacja\s+o\s+wyniku/i.test(t) || /informacja-o-wyniku/.test(s)) return 'result';

  // Flat announcements — the distinctive "Lokal przeznaczony do sprzedaży"
  if (/lokal\s+przeznaczony\s+do\s+sprzeda[żz]y/i.test(t)) return 'flat-ann';

  // Everything else (land, buildings, etc.) — skip for the active flat stream
  return 'skip';
}

/**
 * DOC or DOCX attachment URLs from an article page HTML.
 * Returns [{ url, name }] ordered: DOCX first, then DOC (prefer DOCX for results).
 * PDF-only attachments (scanned floor plans / announcement PDFs) are excluded —
 * pdftotext yields empty on the scanned announcement PDFs.
 */
export function docAttachments(html) {
  const out = [];
  const seen = new Set();
  // Match: href="/attachments/download/{id}" ... name text ... extension "doc" or "docx"
  // The extension appears in the text after the link: "docx, 20 kB" / "doc, 54 kB"
  const re = /href="(\/attachments\/download\/\d+)"[^>]*title="[^"]*"[^>]*>\s*([^<]*?)\s*<\/a>[^<]*?(?:docx?),/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = abs(m[1]);
    const name = m[2].replace(/\s+/g, ' ').trim();
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, name });
  }
  // Sort: .docx first (for result notices; announcements have both .pdf + .doc)
  out.sort((a, b) => (b.url.includes('docx') ? 1 : 0) - (a.url.includes('docx') ? 1 : 0));
  return out;
}

/**
 * Fallback: extract publication date from article HTML metryczka.
 * "Data wytworzenia: DD.MM.YYYY" → "YYYY-MM-DD".
 */
function pubDateFromHtml(html) {
  const m = /Data\s+(?:opublikowania|wytworzenia)[^0-9]*(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(html || '');
  return m ? `${m[3]}-${m[2]}-${String(m[1]).padStart(2, '0')}` : null;
}

// One memoised crawl per refresh run.
let crawlPromise = null;

async function crawlAll() {
  const flatListings = [];   // active flat announcements
  const resultRefs = [];     // result-notice refs (text already extracted)

  const articlesSeen = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${ORIGIN}/artykuly/${BOARD}/${page}/${PER_PAGE}/ogloszenia-o-przetargach-na-zbycie-nieruchomosci`;
    const html = await fetchHtml(url);
    if (!html) break;

    const stubs = parseIndexPage(html);
    if (stubs.length === 0) break; // no items on this page → stop

    for (const stub of stubs) {
      if (articlesSeen.has(stub.id)) continue;
      articlesSeen.add(stub.id);

      const role = classifyArticle(stub.title, stub.slug);
      if (role === 'skip') continue;

      const detail_url = abs(`/artykul/${BOARD}/${stub.id}/${stub.slug}`);
      const articleHtml = await fetchHtml(detail_url);
      if (!articleHtml) continue;

      const atts = docAttachments(articleHtml);
      if (atts.length === 0) {
        console.error(`  bydgoszcz: no DOC/DOCX attachment on ${detail_url}`);
        continue;
      }

      let text;
      for (const att of atts) {
        try {
          text = await docText(att.url);
          if (text && text.trim().length > 50) break; // got usable text
        } catch (err) {
          console.error(`  bydgoszcz: doc-text failed ${att.url}: ${err.message}`);
          text = null;
        }
      }
      if (!text || text.trim().length < 50) {
        console.error(`  bydgoszcz: empty text from attachment(s) on ${detail_url}`);
        continue;
      }

      const docUrl = atts[0].url;
      const fallbackDate = pubDateFromHtml(articleHtml);

      if (role === 'result' || isResultNotice(text)) {
        resultRefs.push({ text, pdf_url: docUrl, detail_url, auction_date: fallbackDate });
        continue;
      }

      // Flat announcement
      if (role === 'flat-ann') {
        const rec = parseAnnouncement(text);
        if (!rec || rec.kind === 'grunt' || !rec.address) {
          console.error(`  bydgoszcz: announcement not parsed (article ${stub.id})`);
          continue;
        }
        flatListings.push({ ...rec, detail_url, source_url: docUrl });
      }
    }

    // If the page had fewer items than PER_PAGE, we're on the last page
    if (stubs.length < PER_PAGE) break;
  }

  console.error(
    `  bydgoszcz: ${flatListings.length} flat listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { flatListings, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' → refs carry .text. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { flatListings } = await crawlPromise;
  return { listings: flatListings, wykaz: [], land: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
