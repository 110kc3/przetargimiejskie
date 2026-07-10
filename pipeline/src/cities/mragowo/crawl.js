// Mrągowo crawler — the city BIP's single mixed property board (kategoria
// 1050, "Gospodarka nieruchomościami") on the Warmińsko-Mazurskie CNT CMS
// (same engine as Olsztyn — see config.js). See parse.js for field extraction.
//
//   LIST (current):  /kategoria/1050/gospodarka-nieruchomosciami.html?page=N
//   LIST (archive):  same + ?VInformacjaSearch[archiwum]=1&page=N
//   ARTICLE:         /{id}/{slug}.html  — <article class="post"> body, plain
//                     HTML prose (no PDF, no attachment).
//
// TWO views, deliberately crawled differently:
//   - "Aktualny" (current, ~76 records / ~4 pages today): announcements whose
//     auction hasn't happened yet, or a result so fresh it hasn't archived.
//     Both listing- and result-routing run here.
//   - "Archiwalny" (historical, ~1,800 records / ~90 pages today): concluded
//     matters — this is where almost every result notice ends up once its
//     short "podano do publicznej wiadomości" display window (about a week)
//     closes. Bounded to MAX_ARCHIVE_PAGES (see below) and scanned for
//     RESULT-titled rows only — an announcement found here would already be
//     concluded (auction date in the past), so listing-routing is skipped to
//     keep the crawl bounded and fast.
//
// Row titles are mostly self-descriptive EXCEPT results, which are always the
// generic "Informacja o (negatywnym) wyniku przetargu" — the body is fetched
// and inspected for every non-skippable row regardless of which bucket its
// title suggests.
//
// source:'html' ⇒ result refs already carry `.text`; refresh.js calls
// crawlResultDocs() then crawlActive(), both awaiting one memoised crawl.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  stripTags,
  parseAnnouncement,
  isResultNotice,
  isLeaseNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'https://bipmragowo.warmia.mazury.pl';
const BOARD_PATH = '/kategoria/1050/gospodarka-nieruchomosciami.html';
const ARCHIVE_QS = 'VInformacjaSearch%5Barchiwum%5D=1';

// The current board is tiny (~4 pages); this cap is just a safety net against
// runaway growth. The archive is genuinely huge (~90 pages / ~1,800 records
// today, spanning many years of general "gospodarka nieruchomościami"
// business) — bounded per ADAPTER-GUIDE's "big archive" guidance so the CI job
// can't time out. 30 pages (~600 records) reaches back roughly a year and a
// half at the observed publication rate and is confirmed live to contain
// several real flat announcement/result cycles (Mrongowiusza 31/5, Wolności
// 20D/12) well within that window.
const MAX_PAGES = 20;
const MAX_ARCHIVE_PAGES = 30;

function boardUrl(page, archived) {
  const parts = [];
  if (archived) parts.push(ARCHIVE_QS);
  if (page > 1) parts.push(`page=${page}`);
  return `${ORIGIN}${BOARD_PATH}${parts.length ? `?${parts.join('&')}` : ''}`;
}

/** Total pages from the "Wyświetlone 1-20 z N rekordów." footer, capped. */
function totalPagesFromHtml(html, cap) {
  const m = /z\s+([\d,]+)\s+rekord/i.exec(html || '');
  if (!m) return 1;
  const total = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.min(Math.ceil(total / 20), cap);
}

/** Board rows { id, title, detailUrl, published_date } from one index page.
 *  Row shape: <tr data-key="ID"><td ...><td data-col-date>DD-MM-YYYY</td>
 *  <td ...><a href="/ID/slug.html" ...>TITLE</a></td>...</tr> */
export function parseIndexPage(html) {
  if (!html) return [];
  const rows = [];
  const rowRe = /<tr\s+data-key="(\d+)">([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const id = m[1];
    const inner = m[2];
    const linkM = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(inner);
    if (!linkM) continue;
    const href = linkM[1];
    const title = stripTags(linkM[2]).trim();
    const dateM = /data-col-date[^>]*>([^<]+)</i.exec(inner);
    const published_date = dateM
      ? dateM[1].trim().replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1')
      : null;
    const detailUrl = href.startsWith('http') ? href : `${ORIGIN}${href}`;
    rows.push({ id, title, detailUrl, published_date });
  }
  return rows;
}

/** The article body text: the `<div class="post-body ...">` content (stops
 *  right before the "Metryka" aside / version-history comment that follows
 *  it), stripped to plain text. Falls back to the whole <article> on layout
 *  drift. */
export function extractBodyText(html) {
  const bodyM = /<div class="post-body[^"]*">([\s\S]*?)<\/div>\s*(?:<!--|<aside)/i.exec(html || '');
  if (bodyM) return stripTags(bodyM[1]);
  const artM = /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/i.exec(html || '');
  return stripTags(artM ? artM[1] : html);
}

async function fetchBoardRows(archived, maxPages) {
  const rows = [];
  const seen = new Set();
  let html;
  try {
    html = await getText(boardUrl(1, archived));
  } catch (err) {
    console.error(`  mragowo: board fetch failed (archived=${archived}, page 1): ${err.message}`);
    return rows;
  }
  const totalPages = totalPagesFromHtml(html, maxPages);
  let page = 1;
  for (;;) {
    for (const r of parseIndexPage(html)) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      rows.push(r);
    }
    page += 1;
    if (page > totalPages) break;
    try {
      html = await getText(boardUrl(page, archived));
    } catch (err) {
      console.error(`  mragowo: board fetch failed (archived=${archived}, page ${page}): ${err.message}`);
      break;
    }
  }
  return rows;
}

async function fetchDetailText(ref) {
  let html;
  try {
    html = await getText(ref.detailUrl);
  } catch (err) {
    console.error(`  mragowo: detail fetch failed ${ref.detailUrl}: ${err.message}`);
    return null;
  }
  return extractBodyText(html);
}

function pushResult(resultRefs, resultSeen, ref, text) {
  if (resultSeen.has(ref.id)) return;
  resultSeen.add(ref.id);
  resultRefs.push({
    text,
    pdf_url: ref.detailUrl,
    detail_url: ref.detailUrl,
    auction_date: ref.published_date,
  });
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats/units)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date }
  const resultSeen = new Set();

  // --- current board: announcements (listings + land) and any fresh results ---
  const activeRows = await fetchBoardRows(false, MAX_PAGES);
  for (const ref of activeRows) {
    if (isSkippableTitle(ref.title)) continue;

    if (isResultTitle(ref.title)) {
      const text = await fetchDetailText(ref);
      if (!text || isLeaseNotice(text) || !isResultNotice(text)) continue;
      pushResult(resultRefs, resultSeen, ref, text);
      continue;
    }

    if (!isAnnouncementTitle(ref.title)) continue;
    const text = await fetchDetailText(ref);
    if (!text || isLeaseNotice(text)) continue;
    // Body is authoritative: a mistitled announcement that is actually a
    // result gets routed correctly instead of dropped.
    if (isResultNotice(text)) {
      pushResult(resultRefs, resultSeen, ref, text);
      continue;
    }
    const rec = parseAnnouncement(text);
    if (!rec) {
      console.error(`  mragowo WARN: announcement not parsed (article ${ref.id}, ${ref.title.slice(0, 60)})`);
      continue;
    }
    const enriched = { ...rec, detail_url: ref.detailUrl, source_url: ref.detailUrl, published_date: ref.published_date };
    (rec.kind === 'grunt' ? land : listings).push(enriched);
  }

  // --- archived board: bounded scan for the achieved-price result stream ---
  const archiveRows = await fetchBoardRows(true, MAX_ARCHIVE_PAGES);
  for (const ref of archiveRows) {
    if (resultSeen.has(ref.id)) continue;
    if (isSkippableTitle(ref.title)) continue;
    if (!isResultTitle(ref.title)) continue; // archive pass: results only (see header note)
    const text = await fetchDetailText(ref);
    if (!text || isLeaseNotice(text) || !isResultNotice(text)) continue;
    pushResult(resultRefs, resultSeen, ref, text);
  }

  console.error(
    `  mragowo: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
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
        sampleResult: results[0] && { pdf_url: results[0].pdf_url, auction_date: results[0].auction_date },
      },
      null,
      2,
    ) + '\n',
  );
}
