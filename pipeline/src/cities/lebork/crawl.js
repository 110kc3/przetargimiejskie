// Lębork crawler — bip.um.lebork.pl, a bespoke slug-addressed BIP consumed as
// plain server HTML (no SPA, no OCR). See config.js.
//
// ONE board, but it is a RECURSIVE "Lista artykułów" tree, not a flat list:
//   BOARD  /artykul/sprzedaz-i-dzierzawa-nieruchomosci-przetargi
//            → year rows ("rok 2026" → /artykul/rok-2026-2027, newest first)
//   YEAR   → month rows ("Lipiec 2026", …) AND some direct leaf rows
//   MONTH  → individual leaf rows
//   LEAF   /artykul/<slug>  → the notice text inline in <article id="content">.
// Each "Lista artykułów" row is `<td><a href="/artykul/SLUG">TITLE</td><td>DATE</td>`
// (note the CMS emits NO closing </a> — the title runs to </td>). walk() fetches a
// node, and if it has such rows it recurses (bounded); a node with none is a LEAF,
// whose article body is stripped to text and paired with the row TITLE that
// pointed at it (the real notice headline — the leaf's own slug lies). Only the
// two most recent YEAR nodes are entered (upcoming auctions + recent results).
//
// Routing is by CONTENT (never the slug): cancelled ("Odwołanie przetargów"),
// leases (dzierżawa/najem) and rokowania are dropped; a result ("Informacja … o
// wyniku") → crawlResultDocs; a sale przetarg → crawlActive (grunt → land, flat/
// commercial → listings, one record per lokal).
//
// source:'html' ⇒ result refs already carry the built `.text` blob, which
// refresh.js hands straight to parseResultDoc (with ref.pdf_url as provenance and
// ref.auction_date as the fallback date).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isRokowania,
  isCancelled,
  isResultDoc,
  auctionDateFromText,
  stripHtml,
} from './parse.js';

const ORIGIN = 'https://bip.um.lebork.pl';
const BOARD = `${ORIGIN}/artykul/sprzedaz-i-dzierzawa-nieruchomosci-przetargi`;

// A browser UA — the board's `.dhtml` alias 301-redirects and municipal WAFs
// prefer a browser UA (harmless if unneeded).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Bounds so the recursive walk stays well under a 20-min CI step. At ~1 req/s
// (getText throttle) two years of the tree is ~150 fetches (~2.5 min).
const MAX_YEARS = 2;        // current + previous year nodes at the board root
const MAX_DEPTH = 4;        // board(0) → year(1) → month(2) → leaf(3); +1 slack
const MAX_FETCHES = 400;    // hard ceiling on total HTTP requests per run
const MAX_LEAVES = 300;     // hard ceiling on notice bodies extracted

/** Isolate the <article …> … </article> region (the notice / list content),
 *  dropping the surrounding nav + footer chrome. */
function articleRegion(html) {
  if (!html) return '';
  const i = html.indexOf('<article');
  if (i < 0) return html;
  const j = html.indexOf('</article>', i);
  return j > i ? html.slice(i, j) : html.slice(i);
}

const decodeHref = (h) => h.replace(/&amp;/gi, '&');

/**
 * "Lista artykułów" child rows of a list node. Row shape (no closing </a>):
 *   <td><a href="/artykul/SLUG">TITLE</td> <td>YYYY-MM-DD hh:mm:ss</td>
 * The breadcrumb links (`<a href="/artykul/informacje">…</a>`) are not in this
 * `<td>…</td><td>date</td>` shape, so they never match.
 * @param {string} html
 * @returns {Array<{href:string, title:string, date:string}>}
 */
export function parseListRows(html) {
  const region = articleRegion(html);
  const out = [];
  const seen = new Set();
  const re = /<td><a\s+href="(\/artykul\/[^"]+)"[^>]*>([\s\S]*?)<\/td>\s*<td>([^<]*)<\/td>/gi;
  let m;
  while ((m = re.exec(region)) !== null) {
    const href = decodeHref(m[1].trim());
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({
      href,
      title: stripHtml(m[2]),
      date: (m[3].trim().match(/\d{4}-\d{2}-\d{2}/) || [''])[0],
    });
  }
  return out;
}

/** Notice BODY (plain text) of a leaf article: strip the breadcrumb header (up to
 *  the last "Czytaj tekst") and the "Metadane …" edit-log footer, then to text. */
export function extractBody(html) {
  let txt = stripHtml(articleRegion(html));
  const head = txt.lastIndexOf('Czytaj tekst');
  if (head >= 0) txt = txt.slice(head + 'Czytaj tekst'.length).trim();
  const foot = txt.indexOf('Metadane');
  if (foot >= 0) txt = txt.slice(0, foot).trim();
  return txt;
}

let crawlPromise = null;

/** Depth-first walk of the tree from the board, collecting leaf notices. */
async function collectLeaves() {
  const leaves = [];
  const state = { fetches: 0 };
  const seen = new Set();

  async function walk(url, depth, rowTitle, rowDate) {
    if (depth > MAX_DEPTH) return;
    if (state.fetches >= MAX_FETCHES || leaves.length >= MAX_LEAVES) return;
    if (seen.has(url)) return;
    seen.add(url);

    let html;
    try {
      state.fetches++;
      html = await getText(url, { userAgent: UA });
    } catch (err) {
      console.error(`  lebork: fetch failed (${url}): ${err.message}`);
      return;
    }

    let rows = parseListRows(html);
    if (depth === 0) rows = rows.slice(0, MAX_YEARS); // newest years only

    if (rows.length && depth < MAX_DEPTH) {
      for (const r of rows) {
        await walk(`${ORIGIN}${r.href}`, depth + 1, r.title, r.date);
        if (state.fetches >= MAX_FETCHES || leaves.length >= MAX_LEAVES) break;
      }
      return;
    }

    // Leaf notice.
    const body = extractBody(html);
    if (body) leaves.push({ url, title: rowTitle || '', date: rowDate || null, body });
  }

  await walk(BOARD, 0, '', null);
  console.error(`  lebork: walked ${state.fetches} node(s) → ${leaves.length} leaf notice(s)`);
  return leaves;
}

/**
 * Fetch + route every leaf once (memoised per run).
 * @returns {Promise<{ listings: object[], land: object[], resultRefs: object[] }>}
 */
async function crawlAll() {
  const listings = []; // address-keyed active records (flats + commercial units)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, auction_date }
  const today = new Date().toISOString().slice(0, 10);

  const leaves = await collectLeaves();
  for (const leaf of leaves) {
    const text = buildRecordText({ title: leaf.title, body: leaf.body });

    if (isCancelled(text)) continue;
    if (isResultDoc(text)) {
      resultRefs.push({ text, pdf_url: leaf.url, auction_date: auctionDateFromText(text) || leaf.date || null });
      continue;
    }
    if (!isSaleAuction(text)) continue; // non-sale notice
    if (isLease(text) || isRokowania(text)) continue;

    for (const rec of parseAnnouncement(text)) {
      // Active = genuinely upcoming (or dateless); concluded ones are covered by
      // the result stream.
      if (rec.auction_date && rec.auction_date < today) continue;
      const enriched = { ...rec, detail_url: leaf.url, source_url: leaf.url, published_date: leaf.date };
      (rec.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  lebork: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0] && { ...results[0], text: `[${results[0].text.length} chars]` },
      },
      null,
      2,
    ) + '\n',
  );
}
