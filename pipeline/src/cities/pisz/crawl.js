// Pisz crawler — server-rendered bip.pisz.hi.pl BIP (hi.pl/PUBLIKATOR-style),
// consumed as plain HTML (no SPA, no OCR, no TLS workaround — chain verified
// OK 2026-07-10). See config.js for the host/CMS write-up.
//
// ONE query-string article scheme walks TWO boards:
//   CURRENT (rolling, undated breadcrumb):  index.php?k=84         ("Ogłoszenia")
//   PREVIOUS YEAR (sidebar-discovered):     index.php?k={N}        ("Rok NNNN")
// Confirmed live: neither board paginates (a full year's ~170-390 articles
// render on one page — no "strona="/next-page markup found), so this is a
// two-board walk, not a page-cursor loop. Each board <article id="zajawka-N">
// row links to the full-text detail page index.php?wiad=N, whose
// <div id="tresc"> is the ONLY body source (no attachment/PDF observed for
// property notices — a few unrelated car-auction notices ARE PDF-only, but
// they never reach an address-bearing parse; see parse.js).
//
// Routing (after fetching each detail page's TITLE + PODTYTUL + BODY blob):
//   isLease / isExchange / isBezprzetargowo  -> skipped entirely
//   isResultDoc                              -> crawlResultDocs() resultRefs
//   isSaleAuction && hasScheduledDate         -> parseAnnouncement -> listings/land
//   isWykazNotice                            -> parseWykaz -> wykaz (address-keyed only)
//   else                                     -> skipped (procurement/admin/car notices)
// A board-list PRE-filter (boardHintsSkip, title+podtytul only) drops the
// majority lease/loan-for-use/exchange noise WITHOUT a detail fetch — the
// spike counted 89+ "do wydzierżawienia" wykazy on the current board alone —
// which is what keeps ~600 raw board rows (current + 1 prior year) within a
// bounded MAX_DETAIL_FETCHES budget at the core fetcher's 1 req/sec throttle.
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  stripHtml,
  parseAnnouncement,
  parseWykaz,
  isLease,
  isExchange,
  isBezprzetargowo,
  isSaleAuction,
  hasScheduledDate,
  isResultDoc,
  isWykazNotice,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.pisz.hi.pl';
const ANNOUNCE_K = 84; // "Ogłoszenia" — rolling current-year board (no "Rok NNNN" in its own breadcrumb)

// A browser UA — harmless if unneeded; the safe default for municipal WAFs.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Bounds: current board (k=84) + the single most-recent "Rok NNNN" archive
// (chodziez's "current + previous year" convention), with a hard cap on
// DETAIL fetches so a future layout change (e.g. the lease pre-filter
// stops matching) can't blow the CI wall-clock budget. Observed volume
// 2026-07-10: 174 rows on k=84 + 388 on the 2025 archive, the large majority
// of which are pre-filtered lease/loan-for-use wykazy before any detail
// fetch — post-filter counts comfortably clear this cap.
const MAX_YEAR_BOARDS = 1;
const MAX_DETAIL_FETCHES = 260;

const boardUrl = (k) => `${ORIGIN}/index.php?k=${k}`;
const docUrl = (id) => `${ORIGIN}/index.php?wiad=${id}`;

const PL_MONTH_ABBR = {
  sty: 1, lut: 2, mar: 3, kwi: 4, maj: 5, cze: 6, lip: 7, sie: 8, wrz: 9,
  'paź': 10, paz: 10, lis: 11, gru: 12,
};

/** Board-list date ("czwartek,  9 lip 2026 09:06") -> ISO date, or null. */
export function boardDateToIso(raw) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(raw || '');
  if (!m) return null;
  const mo = PL_MONTH_ABBR[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

/**
 * Board-list rows from one <article id="zajawka-N" class="zajawka"> board
 * page. Split-on-marker rather than one big regex so minor whitespace
 * variance between rows can't break the match.
 * @param {string} html
 * @returns {Array<{id:string, title:string, podtytul:string, dateRaw:string, url:string}>}
 */
export function parseBoardPage(html) {
  const out = [];
  const chunks = String(html || '').split('<article id="zajawka-').slice(1);
  for (const chunk of chunks) {
    const idM = /^(\d+)/.exec(chunk);
    if (!idM) continue;
    const id = idM[1];
    const titleM = /zajawka__tytul">([\s\S]*?)<\/h2>/.exec(chunk);
    const subM = /zajawka__podtytul">([\s\S]*?)<\/div>/.exec(chunk);
    const dateM = /zajawka__data">([\s\S]*?)<\/div>/.exec(chunk);
    out.push({
      id,
      title: titleM ? stripHtml(titleM[1]) : '',
      podtytul: subM ? stripHtml(subM[1]) : '',
      dateRaw: dateM ? stripHtml(dateM[1]) : '',
      url: docUrl(id),
    });
  }
  return out;
}

/**
 * Prior-year archive boards from the current board's sidebar ("Menu" list of
 * "Rok NNNN" links, e.g. `<a href="index.php?k=1398" ...>Rok 2025</a>`; the
 * oldest entry is a range, "Rok 2015 - 2019" — its leading 4-digit year still
 * sorts correctly). Self-updating across year rollovers (no hardcoded k=).
 * @param {string} html  the k=84 board's HTML
 * @returns {Array<{k:string, label:string, year:number}>}
 */
export function discoverYearBoards(html) {
  const out = [];
  const re = /<a href="index\.php\?k=(\d+)" class="list-group-item">Rok\s+([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const label = m[2].trim();
    const yearNum = parseInt(label, 10);
    out.push({ k: m[1], label, year: Number.isFinite(yearNum) ? yearNum : 0 });
  }
  return out;
}

/** Detail-page TITLE (h2.wiadomosc-tytul) + PODTYTUL (div.podtytul) + BODY
 *  (div.tresc — the only body region; no nested <div> ever observed inside
 *  it, verified across 40+ live fixtures, so a plain indexOf-to-next-</div>
 *  slice is safe). */
export function extractDetail(html) {
  const src = String(html || '');
  const titleM = /wiadomosc-tytul">([\s\S]*?)<\/h2>/.exec(src);
  const subM = /class="podtytul">([\s\S]*?)<\/div>/.exec(src);
  let body = '';
  const i = src.indexOf('class="tresc">');
  if (i >= 0) {
    const j = src.indexOf('</div>', i);
    if (j > i) body = src.slice(i + 'class="tresc">'.length, j);
  }
  return {
    title: titleM ? stripHtml(titleM[1]) : '',
    podtytul: subM ? stripHtml(subM[1]) : '',
    body: stripHtml(body),
  };
}

/** Cheap board-list pre-filter (title+podtytul only, no detail fetch): drops
 *  the lease/loan-for-use/exchange majority before it ever costs a request.
 *  Bezprzetargowo sale-wykazy are NOT pre-filterable (title indistinguishable
 *  from a genuine wykaz — see parse.js) so those still cost a detail fetch. */
function boardHintsSkip(item) {
  const t = `${item.title} ${item.podtytul}`;
  return /dzier[żz]aw|u[żz]yczeni|w\s+drodze\s+zamiany/i.test(t);
}

async function fetchBoardHtml(k) {
  try {
    return await getText(boardUrl(k), FETCH_OPTS);
  } catch (err) {
    console.error(`  pisz: board k=${k} fetch failed: ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats + commercial units)
  const land = [];     // kind:'grunt' active records → land.json
  const wykaz = [];    // genuine pre-auction address-keyed designations
  const resultRefs = []; // { text, source_url, auction_date }

  const currentHtml = await fetchBoardHtml(ANNOUNCE_K);
  const boards = [{ k: ANNOUNCE_K, html: currentHtml }];
  const yearBoards = discoverYearBoards(currentHtml)
    .sort((a, b) => b.year - a.year)
    .slice(0, MAX_YEAR_BOARDS);
  for (const yb of yearBoards) {
    boards.push({ k: yb.k, html: await fetchBoardHtml(yb.k) });
  }

  const seenIds = new Set();
  let fetched = 0;
  for (const board of boards) {
    if (!board.html) continue;
    for (const item of parseBoardPage(board.html)) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      if (boardHintsSkip(item)) continue;
      if (fetched >= MAX_DETAIL_FETCHES) continue;
      fetched++;

      let detailHtml;
      try {
        detailHtml = await getText(item.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  pisz: detail ${item.id} fetch failed: ${err.message}`);
        continue;
      }
      const text = buildRecordText(extractDetail(detailHtml));
      const publishedDate = boardDateToIso(item.dateRaw);

      if (isLease(text) || isExchange(text) || isBezprzetargowo(text)) continue;

      if (isResultDoc(text)) {
        resultRefs.push({
          text,
          source_url: item.url,
          auction_date: auctionDateFromText(text) || publishedDate || null,
        });
        continue;
      }
      if (isSaleAuction(text) && hasScheduledDate(text)) {
        const parsed = parseAnnouncement(text);
        if (parsed) {
          const enriched = { ...parsed, detail_url: item.url, source_url: item.url };
          (parsed.kind === 'grunt' ? land : listings).push(enriched);
        }
        continue;
      }
      if (isWykazNotice(text)) {
        const w = parseWykaz(text, publishedDate);
        if (w) wykaz.push({ ...w, detail_url: item.url });
      }
    }
  }

  console.error(
    `  pisz: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s), ${resultRefs.length} result record(s) (${fetched} detail fetch(es), ${boards.length} board(s))`,
  );
  return { listings, land, wykaz, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land } = await crawlPromise;
  return { listings, wykaz, land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land, wykaz } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        wykaz: wykaz.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleWykaz: wykaz[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
