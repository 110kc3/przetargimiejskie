// Rawa Mazowiecka crawler — server-rendered bip.net 7.32 (Extranet) BIP,
// consumed as plain HTML (no SPA, no OCR, no insecureTLS workaround: plain
// `fetch` over TLS works fine, verified live 2026-07-10). See config.js.
//
// UNLIKE zgorzelec's two fixed board ids, rawa's boards are YEAR-PARTITIONED
// and re-created every January (a fresh bip.net numeric content-id per year:
// "3648,przetargi-2025" this year, some other id next January). Hardcoding
// ids would silently stop finding new auctions after the first rollover — so
// discoverBoards() re-reads the "Przetargi"/"Wyniki przetargów" menu (which
// is embedded in every page, including the hub page itself) on every crawl
// and extracts whichever ids are live right now, bounded to the last
// RAWA_CRAWL_YEARS years (default 6 — plenty for this low-volume board: 2-8
// docs/year confirmed live across 2020-2026) so a CI run can't grow unbounded
// even if the site's history goes back further (it does — to 2008).
//
//   ANNOUNCEMENTS hub: 1311,przetargi → children "<id>,przetargi-<year>"
//   RESULTS hub:       1312,wyniki-przetargow → children "<id>,<year>" (bare)
//   DOCUMENT:          redir,<boardId>?tresc=<tresc>  (302 → the board page
//                      with ?tresc=<n>, which expands that one notice in
//                      full inside <div id="PageContent">)
//
// A notice's full prose is INLINE HTML (Word-export markup) in PageContent —
// verified live that the attached PDF (when present) is a byte-identical
// duplicate, so it is never fetched. What IS needed from the attachment list
// is just the visible FILE NAMES (not their bytes) — see parse.js's
// buildingNumberFor() for why.
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.
//
// REAL BUG CAUGHT DURING BUILD: the results board also carries a THIRD
// document type — "Lista osób zakwalifikowanych do udziału w ustnym
// przetargu ograniczonym" (the qualified-bidders list for a "przetarg
// ograniczony", published between the announcement and the result). It has
// no OCR/PDF issue, fetches fine, and a naive "does this doc mention a
// price and a date" parse would have manufactured a bogus 0-price "result"
// from it. Caught by testing against the REAL live doc (tresc=32478/33592)
// before trusting the crawl: parse.js's isResultDoc() requires the
// past-tense "przeprowadzono"/"odbył się" (or "wyniku") signal, which this
// doc — written entirely in future tense ("odbędzie się", "zgłosili się")
// — never satisfies, so parseResultDoc() correctly returns [] for it. Kept
// in the crawl (not filtered by URL/title) so this stays regression-tested
// by construction rather than by a brittle skip-list.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { buildRecordText, parseAnnouncement, parseResultDoc, isSaleAuction, isLease } from './parse.js';

const ORIGIN = 'https://bip.rawamazowiecka.pl';
const HUB_URL = `${ORIGIN}/1311,przetargi`;

// The exact anchor text immediately preceding each board family's own
// year-child list in the (site-wide) menu markup embedded in every page —
// verified live 2026-07-10. Bounded forward-slice (not full-document regex)
// so an unrelated bare-year board elsewhere in the menu (e.g. a quarterly-
// report archive) can never be picked up.
const ANNOUNCE_MENU_ANCHOR = 'href="1311,przetargi" role="menuitem">';
const RESULT_MENU_ANCHOR = 'href="1312,wyniki-przetargow" role="menuitem">';
const MENU_SLICE_CHARS = 3200; // comfortably covers the ~19 year entries (2008-2026) at ~90-160 chars each

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - (Number(process.env.RAWA_CRAWL_YEARS) || 6);

// A browser UA is the safe default for municipal WAFs (harmless if unneeded;
// this host answered a bare fetch fine too, but keep parity with the rest of
// the codebase's convention for bip.net/bip.info.pl-family hosts).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Defensive wall-clock budget + document cap (ADAPTER-GUIDE.md §5.1) — at
// this city's confirmed low volume (2-8 docs/board/year) neither should ever
// bind, but a broken/looping board must never blow the 25-min CI job.
const DEADLINE_MS = Number(process.env.RAWA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;
const MAX_DOCS = Number(process.env.RAWA_MAX_DOCS) || 250;

async function fetchHtml(url) {
  try {
    return await getText(url, { userAgent: UA });
  } catch (err) {
    console.error(`  rawa-mazowiecka: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

/**
 * Year→boardId pairs for one board family, discovered from the hub page's
 * own embedded menu. `slugPattern` distinguishes the two families' href
 * shapes: announcements are "<id>,przetargi-<year>", results are the bare
 * "<id>,<year>".
 * @param {string} hubHtml
 * @param {string} anchor
 * @param {RegExp} slugPattern  must have exactly 2 capture groups: (id, year)
 * @returns {Array<{id:string, year:number}>} sorted newest-year-first
 */
function discoverBoards(hubHtml, anchor, slugPattern) {
  const i = hubHtml.indexOf(anchor);
  if (i < 0) return [];
  const tail = hubHtml.slice(i, i + MENU_SLICE_CHARS);
  const out = [];
  const re = new RegExp(slugPattern.source, 'gi');
  let m;
  while ((m = re.exec(tail)) !== null) {
    const year = Number(m[2]);
    if (Number.isFinite(year) && year >= MIN_YEAR) out.push({ id: m[1], year });
  }
  return out.sort((a, b) => b.year - a.year);
}

const boardUrl = (id, slug) => `${ORIGIN}/${id},${slug}`;
const docUrl = (boardId, tresc) => `${ORIGIN}/redir,${boardId}?tresc=${tresc}`;

/** Distinct `tresc` ids linked from one board page's HTML. */
export function parseBoardRefs(html, boardId) {
  const re = new RegExp(`redir,${boardId}\\?tresc=(\\d+)`, 'g');
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(m[1]);
  }
  return out;
}

const CONTENT_START = 'id="PageContent"';
const CONTENT_END_MARKERS = ['metryka_przycisk_wrapper', 'id="wstecz_link'];

/**
 * Extract one document's plain-text BODY, its attachment file names (joined,
 * for the ATTACH field — see parse.js's buildingNumberFor), and the metryka
 * "Data publikacji" as a last-resort fallback date, from a `?tresc=` page.
 * Cuts the body at the metryka footer (verified live: everything from
 * `class="metryka_przycisk_wrapper"` onward is page chrome, not notice text)
 * so the "Opublikował"/"Data publikacji" boilerplate never leaks into BODY
 * and gets mistaken for auction-relevant prose.
 *
 * REAL BUG caught live: `indexOf('metryka_przycisk_wrapper', …)` finds the
 * position of that literal SUBSTRING, which sits mid-attribute inside
 * `<div class="metryka_przycisk_wrapper">` — cutting the region there lops
 * off the tag's closing `>`, so the dangling `…<div class="` fragment has no
 * `>` for the `<[^>]+>` tag-stripper to match and survives as literal text
 * (verified live, tresc=34834: body ended in "…dnia 29.05.2026 r. <div
 * class=\""). Fixed by backing the cut up to the start of that same dangling
 * tag (its last unmatched `<`) whenever the raw marker search lands inside
 * one, so region always ends on a clean tag boundary.
 */
export function extractDoc(html) {
  const i = html.indexOf(CONTENT_START);
  if (i < 0) return { body: '', attach: '', publishDate: null };
  let end = -1;
  for (const marker of CONTENT_END_MARKERS) {
    const j = html.indexOf(marker, i);
    if (j >= 0 && (end < 0 || j < end)) end = j;
  }
  if (end < 0) end = i + 25000; // defensive cap if both markers are ever absent
  let region = html.slice(i, end);
  const lastLt = region.lastIndexOf('<');
  if (lastLt >= 0 && region.indexOf('>', lastLt) < 0) region = region.slice(0, lastLt);

  const attach = [];
  const attRe = /class="pliki_nazwa">([^<]*)</gi;
  let am;
  while ((am = attRe.exec(region)) !== null) {
    const name = am[1].trim();
    if (name) attach.push(name);
  }

  const dm = /Data publikacji\s*<\/span><span class="system_metryka_wartosc">(\d{4}-\d{2}-\d{2})/i.exec(
    html.slice(i, i + 30000),
  );

  const body = region
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { body, attach: attach.join('; '), publishDate: dm ? dm[1] : null };
}

async function fetchDoc(boardId, tresc) {
  const url = docUrl(boardId, tresc);
  const html = await fetchHtml(url);
  if (!html) return null;
  const { body, attach, publishDate } = extractDoc(html);
  if (!body) return null;
  return { text: buildRecordText({ body, attach }), url, publishDate };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats/commercial/garage)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, source_url, auction_date }

  const hubHtml = await fetchHtml(HUB_URL);
  if (!hubHtml) {
    console.error('  rawa-mazowiecka: hub page fetch failed — cannot discover year boards');
    return { listings, land, resultRefs };
  }

  const announceBoards = discoverBoards(hubHtml, ANNOUNCE_MENU_ANCHOR, /href="(\d+),przetargi-(\d{4})"/);
  const resultBoards = discoverBoards(hubHtml, RESULT_MENU_ANCHOR, /href="(\d+),(\d{4})"/);
  console.error(
    `  rawa-mazowiecka: discovered ${announceBoards.length} announcement board(s) [${announceBoards.map((b) => b.year).join(',')}], ${resultBoards.length} result board(s) [${resultBoards.map((b) => b.year).join(',')}]`,
  );

  const deadline = Date.now() + DEADLINE_MS;
  let processed = 0;
  const overBudget = () => processed >= MAX_DOCS || Date.now() > deadline;

  // ---- announcements ----
  for (const b of announceBoards) {
    if (overBudget()) break;
    const html = await fetchHtml(boardUrl(b.id, `przetargi-${b.year}`));
    if (!html) continue;
    for (const tresc of parseBoardRefs(html, b.id)) {
      if (overBudget()) break;
      processed++;
      const doc = await fetchDoc(b.id, tresc);
      if (!doc) continue;
      if (!isSaleAuction(doc.text) || isLease(doc.text)) continue; // leases + non-sale docs out of scope
      for (const rec of parseAnnouncement(doc.text)) {
        const enriched = { ...rec, detail_url: doc.url, source_url: doc.url };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      }
    }
  }

  // ---- results ----
  for (const b of resultBoards) {
    if (overBudget()) break;
    const html = await fetchHtml(boardUrl(b.id, `${b.year}`));
    if (!html) continue;
    for (const tresc of parseBoardRefs(html, b.id)) {
      if (overBudget()) break;
      processed++;
      const doc = await fetchDoc(b.id, tresc);
      if (!doc) continue;
      // Push every results-board doc (announcements-vs-procedural-vs-lease
      // routing happens inside parseResultDoc's own gates — see the header
      // comment on the "Lista osób zakwalifikowanych" bug this caught).
      resultRefs.push({ text: doc.text, source_url: doc.url, auction_date: doc.publishDate });
    }
  }

  if (processed >= MAX_DOCS || Date.now() > deadline) {
    console.error(`  rawa-mazowiecka: crawl budget reached (processed ${processed}) — remainder backfills next run`);
  }
  console.error(
    `  rawa-mazowiecka: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result document(s)`,
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
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
