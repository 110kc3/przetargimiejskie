// Świnoujście crawler — Logonet BIP artykuly/1717 (active) + artykuly/1718 (archive).
//
// Board structure (groundtruthed 2026-06-28):
//   Board index: <h2><a href="/artykul/{board}/{id}/{slug}">TITLE</a></h2>
//                <p>BLURB (optional — auction date + location)</p>
//   Paginated: /artykuly/{board}/{page}/{perPage}/{slug}
//
// Each article detail page carries a brief body blurb and optional attachments.
// Newer announcements (2026): .doc (OLE2) — parseable with catdoc.
// Older announcements (2024-2025): scanned PDF — not parseable; price stays null.
//
// crawlResultDocs() → [] — no result notices on this BIP.
// crawlActive()     → { listings, wykaz:[], land:[] }
//
// DOC enrichment: for any listing with null price, attempt to fetch the first
// .doc attachment (if present on the detail page) and parse the starting price.
// Silently skip on fetch/parse failures.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import {
  isSkippableTitle,
  isAnnouncementTitle,
  parseArticle,
  startingPriceFromDoc,
} from './parse.js';

const ORIGIN = 'https://bip.um.swinoujscie.pl';

// Both boards — active (1717) and archive (1718).
const BOARDS = [
  { id: 1717, slug: 'przetargi-na-sprzedaz-nieruchomosci' },
  { id: 1718, slug: 'archiwum' },
];

// Logonet pagination URL: /artykuly/{boardId}/{page}/{perPage}/{slug}
const boardUrl = (board, page, per = 25) =>
  `${ORIGIN}/artykuly/${board.id}/${page}/${per}/${board.slug}`;

// ----------------------------------------------------------------- HTML parsing

/** Strip HTML tags, decode basic entities, collapse whitespace. */
function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse article list HTML into article refs.
 * Each article in Logonet's board page looks like:
 *   <h2><a href="/artykul/{board}/{id}/{slug}">TITLE</a></h2>
 *   <p class="...">BLURB</p>   ← optional
 *
 * @param {string} html
 * @param {number} boardId
 * @returns {Array<{id:string, title:string, blurb:string, detail_url:string}>}
 */
export function parseArticleList(html, boardId) {
  const out = [];
  // Match each h2>a section that links to this board.
  // Live markup 2026-07 uses ABSOLUTE hrefs (https://bip.um.swinoujscie.pl/artykul/…);
  // accept both absolute and the original relative form.
  const re = new RegExp(
    `<h2[^>]*>\\s*<a[^>]+href="(?:https?://[^"/]+)?(/artykul/${boardId}/(\\d+)/[^"]*)"[^>]*>([\\s\\S]*?)</a>\\s*</h2>(?:\\s*<(?:p|div)[^>]*>([\\s\\S]*?)</(?:p|div)>)?`,
    'gi',
  );
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    const id = m[2];
    const title = stripTags(m[3]);
    const blurb = stripTags(m[4] || '');
    const detail_url = `${ORIGIN}${path}`;
    out.push({ id, title, blurb, detail_url, board: boardId });
  }
  return out;
}

/** Fetch all article refs for one board, paginating until empty page or limit. */
async function listBoard(board) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= 20; page++) {
    const url = boardUrl(board, page);
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  swinoujscie board ${board.id} page ${page} fetch failed: ${err.message}`);
      break;
    }
    const arts = parseArticleList(html, board.id);
    if (arts.length === 0) break;
    let added = 0;
    for (const a of arts) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      refs.push(a);
      added++;
    }
    console.error(`  swinoujscie board ${board.id} page ${page}: ${arts.length} articles (${added} new)`);
    // If we got fewer than the per-page count, this was the last page
    if (arts.length < 25) break;
  }
  return refs;
}

// ----------------------------------------------------------------- DOC attachment URL

/**
 * Find the first .doc or .docx attachment URL on a detail article page.
 * Logonet attachment links: /attachments/download/<id>
 * The surrounding label text usually says "doc, N kB".
 * @param {string} html  detail page HTML
 * @returns {string|null}
 */
export function docAttachmentUrl(html) {
  if (!html) return null;
  // Find a /download/N link followed (within 600 chars) by a span containing "doc".
  // Uses [\s\S]{0,600}? to span the multiline gap between </a> and the label <span>
  // that exists in real Logonet BIP HTML (groundtruthed 2026-06-28).
  const re = /href="(https:\/\/bip\.um\.swinoujscie\.pl\/attachments\/download\/\d+)"[\s\S]{0,600}?<span[^>]*>[^<]*\bdoc\b/gi;
  const m = re.exec(html);
  return m ? m[1] : null;
}

// ----------------------------------------------------------------- detail page fetch + doc enrich

/**
 * Fetch a detail page and return the first .doc attachment URL (or null).
 * @param {string} detailUrl
 * @returns {Promise<string|null>}
 */
async function fetchDocUrl(detailUrl) {
  let html;
  try {
    html = await getText(detailUrl);
  } catch (err) {
    console.error(`  swinoujscie: detail fetch failed (${detailUrl}): ${err.message}`);
    return null;
  }
  return docAttachmentUrl(html);
}

// ----------------------------------------------------------------- crawlAll

async function crawlAll() {
  const listings = [];

  for (const board of BOARDS) {
    const refs = await listBoard(board);
    const relevant = refs.filter((r) => {
      if (isSkippableTitle(r.title, '')) return false;
      if (!isAnnouncementTitle(r.title, '')) return false;
      return true;
    });
    console.error(
      `  swinoujscie board ${board.id}: ${refs.length} total, ${relevant.length} relevant`,
    );

    for (const ref of relevant) {
      const rec = parseArticle(ref);
      if (!rec) {
        console.error(`  swinoujscie WARN: could not parse article ${ref.id} "${ref.title.slice(0, 60)}"`);
        continue;
      }
      // Land (grunt) — only include if it's a flat/house (non-land) kind
      // Land is excluded from the listings stream for now; the BIP has very
      // few land-only items and they mix with the flat announcements.
      // (If land support is needed later, emit { kind:'grunt', ... } into a
      // separate land array and return it from crawlActive.)
      if (rec.kind === 'grunt') {
        console.error(`  swinoujscie: skipping land article ${ref.id} "${ref.title.slice(0, 60)}"`);
        continue;
      }

      listings.push({ ...rec, source_url: ref.detail_url });
    }
  }

  // DOC enrichment: try to fetch starting price for listings that have none.
  // Only fetch the detail page when price is missing (avoids extra requests).
  let enriched = 0;
  for (const listing of listings) {
    if (listing.starting_price_pln != null) continue;
    const docUrl = await fetchDocUrl(listing.detail_url);
    if (!docUrl) continue;
    try {
      const text = await docText(docUrl);
      const price = startingPriceFromDoc(text);
      if (price != null) {
        listing.starting_price_pln = price;
        listing.doc_url = docUrl;
        enriched++;
      }
    } catch (err) {
      console.error(`  swinoujscie: DOC price enrich failed (${docUrl}): ${err.message}`);
    }
  }

  console.error(
    `  swinoujscie: ${listings.length} listing(s) total, ${enriched} price(s) enriched from DOC`,
  );
  return { listings };
}

let crawlPromise = null;

/** Active listings — flats and houses from both boards. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

/** No result notices on Świnoujście BIP. */
export async function crawlResultDocs() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, sample: listings[0] }, null, 2) + '\n',
  );
}
