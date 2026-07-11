// Żagań crawler — ONE board on bip.zagan.pl (SystemDoBIP.pl/E-LINE, same
// engine as gorzow-wielkopolski and miedzyrzecz), live-verified 2026-07-11:
//
//   /przetargi/344/status/0/   ACTIVE (ogłoszone)        — crawlActive()
//   /przetargi/344/status/1/   RESOLVED (rozstrzygnięte) — crawlResultDocs()
//   /przetargi/344/status/2/   INVALIDATED (unieważnione) — not crawled
//     (matching gorzow-wielkopolski/miedzyrzecz's own convention)
//
// This is the miedzyrzecz SUB-SHAPE of the SystemDoBIP CMS family, confirmed
// by view-source, NOT gorzow's: the table itself carries "Cena wywoławcza"
// AND "Wynik" columns inline on every row (7 columns: Lp / Data ogłoszenia /
// Data i godzina przetargu / Dotyczy / Cena wywoławcza / Wynik / Załączniki),
// same <tr class="odd|even"> markup, same td-title-1 (Dotyczy first, Wynik
// second) positional trick, same pagination shape
// (/przetargi/344/{page}/status/{n}/, page segment omitted only for page 1) —
// gorzow's board has NEITHER an inline price/result column NOR this
// pagination shape (a wholly separate /509/ results archive instead).
//
// Board is LAND-HEAVY (10 land parcels on the active board at verification
// time, zero pending flats — flats cycle in/out per the spike) — this
// crawler routes each row to `listings` (flats) or `land` (parcels) by
// classifyKind via parse.js's inScopeKind(), unlike gorzow-wielkopolski/
// miedzyrzecz which only ever populate `listings` and leave `land: []`.
//
// ZERO document fetches anywhere (see parse.js file header for why a
// Pozytywny/sold row still can't recover an achieved price) — this crawler
// only ever fetches the board's own HTML pages, never an attachment.
//
// See spike: spikes/lubuskie/powiat-zaganski/zagan.md

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseActiveFlatRow,
  parseActiveLandRow,
  buildResultText,
  inScopeKind,
  dateOnly,
} from './parse.js';

const ORIGIN = 'https://bip.zagan.pl';
// Not observed to gate the default bot UA in this spike/build, but a browser
// UA is used defensively — same convention as gorzow-wielkopolski/miedzyrzecz
// on the same CMS family.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Page caps (env-overridable for backfills). Board holds 10 rows/page; the
// resolved board spans 64 pages of history at verification time (2026-07-11)
// — bounded well below that by default since a cold run would otherwise cost
// 64 HTTP round-trips for marginal old-history value (page-level HTML fetches
// only — cheap, but still bounded per ADAPTER-GUIDE §5.1).
const MAX_ACTIVE_PAGES = Number(process.env.ZAGAN_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.ZAGAN_MAX_RESOLVED_PAGES) || 20;
const ROWS_PER_PAGE = 10;
// Wall-clock budget — a safety net matching gorzow-wielkopolski/miedzyrzecz's
// own, even though this crawler's zero-fetch design rarely approaches it.
const CRAWL_BUDGET_MS = Number(process.env.ZAGAN_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

// ── HTML helpers ─────────────────────────────────────────────────────────────

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const deamp = (u) => (u || '').replace(/&amp;/g, '&');

function parseAttachments(rowHtml) {
  const out = [];
  const ulM = /<ul class="attachments">([\s\S]*?)<\/ul>/i.exec(rowHtml || '');
  if (!ulM) return out;
  const linkRe = /<a\s+href="([^"]+)"/gi;
  let m;
  while ((m = linkRe.exec(ulM[1])) !== null) {
    const url = deamp(m[1]);
    let filename = '';
    try {
      filename = new URL(url).searchParams.get('plik') || '';
    } catch {
      /* malformed URL — leave filename blank, callers just get no match */
    }
    out.push({ url, filename });
  }
  return out;
}

// ── Board ────────────────────────────────────────────────────────────────────

/** Board URL for a given status (0 active, 1 resolved, 2 invalidated) and 1-based page. */
export function boardUrl(status, page) {
  return page <= 1
    ? `${ORIGIN}/przetargi/344/status/${status}/`
    : `${ORIGIN}/przetargi/344/${page}/status/${status}/`;
}

/**
 * Parse one board page (status=0 or status=1 — same table shape) into row
 * objects. Both "Dotyczy" and "Wynik" cells share the CSS class "td-title-1"
 * (Dotyczy is first, Wynik second) — extracted positionally, not by class
 * alone (same trick as miedzyrzecz's own parseBoardPage, same CMS engine).
 * @param {string} html
 * @returns {import('./parse.js').BoardRow[]}
 */
export function parseBoardPage(html) {
  const out = [];
  const rowRe = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html || '')) !== null) {
    const row = rm[1];

    const d1 = /td-date-1"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);
    const d2 = /td-date-2"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);

    const dotyczyM = /class="td-title-1"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(row);
    if (!dotyczyM) continue; // no detail link — not a real row (defensive)
    const detailUrl = deamp(dotyczyM[1]);
    const dotyczyText = stripTags(dotyczyM[2]);

    const cenaM = /class="td-title-2"[^>]*>([\s\S]*?)<\/td>/.exec(row);
    const cenaText = cenaM ? stripTags(cenaM[1]) : '';

    // Two cells share class "td-title-1": [0] Dotyczy (has the <a>), [1] Wynik.
    const title1All = [...row.matchAll(/class="td-title-1"[^>]*>([\s\S]*?)<\/td>/g)];
    const wynikText = title1All.length > 1 ? stripTags(title1All[1][1]) : '';

    out.push({
      detailUrl,
      dotyczyText,
      cenaText,
      wynikText,
      announcedDate: d1 ? d1[1] : null,
      auctionDateRaw: d2 ? d2[1] : null,
      attachments: parseAttachments(row),
    });
  }
  return out;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  zagan: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Crawl the ACTIVE board only (status=0). Every field either the flat or the
 * land contract needs is already inline in the row text, so this makes zero
 * PDF/DOCX/OCR fetches — just the board page(s) themselves.
 * @returns {Promise<{ listings: object[], wykaz: [], land: object[] }>}
 */
export async function crawlActive() {
  const listings = [];
  const land = [];
  const seenDetails = new Set();

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    const html = await fetchPage(boardUrl(0, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      const kind = inScopeKind(row.dotyczyText);
      if (kind === 'mieszkalny') {
        const rec = parseActiveFlatRow(row);
        if (rec) listings.push(rec);
      } else if (kind === 'grunt') {
        const rec = parseActiveLandRow(row);
        if (rec) land.push(rec);
      }
    }

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  console.error(`  zagan crawlActive: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
  return { listings, wykaz: [], land };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Crawl the RESOLVED board (status=1). NEITHER outcome (Negatywny or
 * Pozytywny) ever needs a document fetch on this city's BIP (see parse.js
 * file header) — every ref's `.text` is synthesized straight from the row via
 * buildResultText(). `source:'html'` (config.js) means refresh.js hands each
 * ref's `.text` straight to parseResultDoc — no re-fetch there.
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const refs = [];
  const seenDetails = new Set();
  const known = await loadKnownSourceUrls('zagan');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skippedKnown = 0;

  for (let page = 1; page <= MAX_RESOLVED_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  zagan: result-crawl budget exhausted — stopping early');
      break;
    }
    const html = await fetchPage(boardUrl(1, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      if (!inScopeKind(row.dotyczyText)) continue;
      if (row.detailUrl && known.has(row.detailUrl)) {
        skippedKnown++;
        continue;
      }
      refs.push({
        text: buildResultText(row),
        pdf_url: row.detailUrl,
        detail_url: row.detailUrl,
        auction_date: dateOnly(row.auctionDateRaw),
      });
    }

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  if (skippedKnown) console.error(`  zagan: skipped ${skippedKnown} already-known result row(s)`);
  console.error(`  zagan crawlResultDocs: ${refs.length} result ref(s) (zero-fetch)`);
  return refs;
}

// ── Direct-run smoke test (`node src/cities/zagan/crawl.js`) ───────────────

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
