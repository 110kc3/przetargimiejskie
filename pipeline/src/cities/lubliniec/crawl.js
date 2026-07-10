// Lubliniec crawler — server-rendered bip.info.pl BIP, consumed as plain HTML
// (no SPA, no OCR, no TLS workaround), the SAME platform as Zgorzelec (this
// adapter's template). See config.js.
//
// Two dedicated boards:
//   ANNOUNCEMENTS  index.php?idmp=93&r=r → crawlActive (listings + land)
//   RESULTS        index.php?idmp=94&r=r → crawlResultDocs (achieved price)
// Pagination param is `istr` (NOT Zgorzelec's `strona` — live-verified
// 2026-07-10: `&istr=2` returns 50 genuinely NEW iddoks with zero overlap vs
// page 1; `&strona=2` would silently re-serve page 1 and the walk would stop
// after one page, missing the entire archive).
//
// Each board row links to a document dokument.php?iddok={id}&idmp={NN}&r=r,
// which 302-redirects to the comma-path canonical dokument,iddok,{id},idmp,{NN},r,r
// — getText()'s redirect:'follow' handles this transparently, so the
// query-string form is used directly (matches Zgorzelec). The board's
// <div id="content-main"> carries the full notice as flowing HTML text. We
// extract the board link text (TITLE) + the document body (BODY) and build
// the parse blob via buildRecordText(). Announcements are routed by kind:
//   grunt → land ;  flat / commercial unit / garage → listings.
// Leases ("dzierżawa"/"najem"), cancellations ("Odwołanie …") and complaint-
// resolution notices ("…rozstrzygnięcia skargi…") share the announcement
// board and are skipped (see parse.js's isSaleAuction/isNonAuctionNotice).
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.
//
// BOUNDING (live-verified 2026-07-10): board 93 (announcements) is a 9-page,
// ~432-item archive back to 05.02.2008; board 94 (results) is 7 pages,
// ~345 items, same start date. Both are FAR too deep to fully detail-fetch
// every run (777 throttled 1-req/sec fetches ≈ 13 min, before board-list
// pagination / other pipeline steps — too close to refresh.yml's 20-min "Run
// pipeline" step budget, and only gets worse as the archive grows). Board
// pages are newest-first, so a bounded per-board detail-fetch walk (wall-clock
// budget + item cap, same idiom as kedzierzyn-kozle/bialystok — see
// ADAPTER-GUIDE.md §5) always covers the freshest items first: the ones that
// can still be genuinely active. Page-boundary dates confirm the default cap
// (120 items ≈ pages 1-2.4) reaches back to ~Jan 2022 on the announcements
// board — comfortably past the "a few flat auctions per year" cadence (see
// spike) with margin for II/III/IV re-rounds. Anything not reached in a run
// backfills the next one (merge-history retains prior results; a future
// known-urls.js integration could make results-board backfill incremental
// instead of a fixed recent-window re-walk — not wired here, out of scope for
// the initial build). Override via LUBLINIEC_CRAWL_BUDGET_MS / LUBLINIEC_MAX_DETAILS.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://lubliniec.bip.info.pl';
const IDMP_ANNOUNCE = 93;
const IDMP_RESULT = 94;

// A browser UA — bip.info.pl serves the bot UA too, but a browser UA is the safe
// default for municipal WAFs (harmless if unneeded).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Board-list pagination hard cap. Board-list fetches are cheap (one request
// per ~50 items) so a generous cap costs little; the walk also self-stops the
// moment a page yields zero NEW iddok, well before this is ever hit at the
// live-verified depth (9 / 7 pages).
const MAX_PAGES = 12;

// Detail-fetch budget: the expensive part (one throttled request PER
// document). Applied independently to each board so a slow/deep results walk
// can never crowd out the announcements board. See header comment.
const CRAWL_BUDGET_MS = Number(process.env.LUBLINIEC_CRAWL_BUDGET_MS) || 6 * 60 * 1000;
const MAX_DETAILS = Number(process.env.LUBLINIEC_MAX_DETAILS) || 120;

const boardUrl = (idmp, page) =>
  `${ORIGIN}/index.php?idmp=${idmp}&r=r${page > 1 ? `&istr=${page}` : ''}`;
const docUrl = (iddok, idmp) => `${ORIGIN}/dokument.php?iddok=${iddok}&idmp=${idmp}&r=r`;

/** Isolate the <div id="content-main"> region of a page (board list or document
 *  body), dropping the surrounding chrome + the right column / footer. */
function contentMain(html) {
  if (!html) return '';
  const i = html.indexOf('id="content-main"');
  if (i < 0) return html;
  let j = html.indexOf('id="colRight"');
  if (j < 0 || j < i) j = html.indexOf('id="footer"');
  return j > i ? html.slice(i, j) : html.slice(i);
}

/** Decode the handful of entities that appear inside hrefs. */
function decodeHref(h) {
  return h.replace(/&amp;/gi, '&');
}

/**
 * Article refs from one board page's HTML. Each property row links to
 * dokument.php?iddok={id}&idmp={idmp}&r=r; the anchor text is the notice
 * title. (Unlike Zgorzelec, Lubliniec's board rows carry no `title=` deadline
 * attribute — just a plain publish-date table cell before the link — so no
 * deadline is extracted here; auctionDateFromText on the fetched doc body is
 * the reliable date source for both boards.)
 * @param {string} html
 * @param {number} idmp
 * @returns {Array<{iddok:string, url:string, title:string}>}
 */
export function parseBoardPage(html, idmp) {
  const region = contentMain(html);
  const out = [];
  const seen = new Set();
  const re = new RegExp(
    `<a\\b[^>]*?href='dokument\\.php\\?iddok=(\\d+)&amp;idmp=${idmp}[^']*'[^>]*>([\\s\\S]*?)</a>`,
    'gi',
  );
  let m;
  while ((m = re.exec(region)) !== null) {
    const iddok = m[1];
    if (seen.has(iddok)) continue;
    seen.add(iddok);
    const title = m[2].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    out.push({ iddok, url: decodeHref(docUrl(iddok, idmp)), title });
  }
  return out;
}

/** All article refs on a board, walking bounded pages until no NEW iddok. */
async function fetchBoardRefs(idmp) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(boardUrl(idmp, page), { userAgent: UA });
    } catch (err) {
      console.error(`  lubliniec: board idmp=${idmp} page ${page} failed: ${err.message}`);
      break;
    }
    const pageRefs = parseBoardPage(html, idmp);
    let added = 0;
    for (const r of pageRefs) {
      if (seen.has(r.iddok)) continue;
      seen.add(r.iddok);
      refs.push(r);
      added++;
    }
    if (added === 0) break; // exhausted the board, or past the last page
  }
  return refs;
}

/** Extract the notice BODY (plain text) from a document page's content-main:
 *  trim the metadata header ("… wersja do wydruku") and the footer ("Powrót" /
 *  "Metryka dokumentu" / "Załączniki"), which carry publish-date decoys and
 *  attachment-filename noise. */
export function extractDocBody(html) {
  let txt = contentMain(html)
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
  const head = txt.indexOf('wersja do wydruku');
  if (head >= 0) txt = txt.slice(head + 'wersja do wydruku'.length).trim();
  const cutAt = ['Powrót', 'Metryka dokumentu', 'Załączniki']
    .map((s) => txt.indexOf(s))
    .filter((n) => n >= 0);
  if (cutAt.length) txt = txt.slice(0, Math.min(...cutAt)).trim();
  return txt;
}

/** Fetch one document → { text, title, url }, or null. */
async function fetchDoc(ref) {
  let html;
  try {
    html = await getText(ref.url, { userAgent: UA });
  } catch (err) {
    console.error(`  lubliniec: doc ${ref.iddok} fetch failed: ${err.message}`);
    return null;
  }
  const body = extractDocBody(html);
  const text = buildRecordText({ title: ref.title, body });
  return { text, title: ref.title, url: ref.url };
}

/** Detail-fetch a board's refs up to the shared wall-clock budget + item cap,
 *  in board order (newest-first) — see header comment. Returns the refs
 *  actually processed, each with its fetched `{text}` attached. */
async function fetchDetailsBounded(refs, label) {
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  const out = [];
  let processed = 0;
  for (const ref of refs) {
    if (processed >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  lubliniec: ${label} crawl budget reached (processed ${processed}/${refs.length}); remainder backfills next run`,
      );
      break;
    }
    processed++;
    const rec = await fetchDoc(ref);
    if (!rec) continue;
    out.push({ ref, text: rec.text });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats / commercial / garage)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, source_url, auction_date }

  // ---- announcements board (idmp=93) ----
  const announceRefs = await fetchBoardRefs(IDMP_ANNOUNCE);
  const announceDetails = await fetchDetailsBounded(announceRefs, 'announcements');
  for (const { ref, text } of announceDetails) {
    if (!isSaleAuction(text)) continue; // lease / cancellation / skarga / works
    if (isLease(text)) continue;

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  // ---- results board (idmp=94) ----
  const resultBoardRefs = await fetchBoardRefs(IDMP_RESULT);
  const resultDetails = await fetchDetailsBounded(resultBoardRefs, 'results');
  for (const { ref, text } of resultDetails) {
    resultRefs.push({
      text,
      source_url: ref.url,
      auction_date: auctionDateFromText(text) || null,
    });
  }

  console.error(
    `  lubliniec: ${listings.length} flat/unit/garage listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
