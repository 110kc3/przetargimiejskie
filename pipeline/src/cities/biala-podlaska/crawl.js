// Biała Podlaska — ZGL Biała Podlaska Sp. z o.o. (zglbp.pl), the city-owned
// housing-manager company, publishes "przetarg ustny (aukcja) w trybie
// Kodeksu cywilnego" (a civil-code auction — ZGL is a sp. z o.o., not the
// gmina itself, so it doesn't use the ustawa o gospodarce nieruchomościami
// procedure) on ITS OWN SITE, not the city BIP. See
// spikes/lubelskie/biala-podlaska/biala-podlaska.md (live-verified 2026-06-27).
//
// Source shape (live-verified): plain server-rendered HTML (netcoding.pl /
// Drimo CMS), no auth, no bot blocks, no JS required.
//   LIST:   https://www.zglbp.pl/przetargi?filtruj=1&rodzaj=sprzedaz_nieruchomosci
//           (paginated /przetargi/page,N?filtruj=1&rodzaj=sprzedaz_nieruchomosci)
//           — the `rodzaj` filter narrows the board to property SALES only,
//           dropping the procurement noise (usługi/dostawy/roboty budowlane
//           etc.) that also lives on /przetargi. Each row: seq, published
//           date, auction/deadline date ("Termin" on the detail page — the
//           two agree exactly, verified against 3 samples), title link,
//           status (w toku / zakończone / unieważnione), pdf icon.
//   DETAIL: the title link's own page — a "Status / Rodzaj zamówienia /
//           Zamawiający / Znak sprawy / Termin / Miejsce / Ogłoszono dnia /
//           Ogłoszono przez" meta box, followed by the full announcement
//           prose INLINE in the HTML. No PDF/DOC attachment was observed on
//           any sprzedaz_nieruchomosci row in the crawled window (all show
//           "no_pdf.png" on the list) — so `source: 'html'` and this adapter
//           never calls pdfText/ocrPdf/docText.
//
// Volume is LOW (~1-3 open flat auctions/yr; verified: two 2025 auctions for
// Kopernika 7 lok. 9, 330 000 zł). The filtered list is newest-first and
// small (~54 rows total since ~2011, but only ~20 fall in/after MIN_ROW_YEAR
// — everything older lives on page,2+ and is dropped by the early-stop below,
// bounding both the page count and the number of detail fetches per run).
//
// No achieved-price stream exists on-site (auction pages show "zakończone"
// but never a "cena osiągnięta"/wynik notice) — this is announcement-only.
// crawlResultDocs() returns [] and final_price_pln always stays null; every
// listing's outcome ('active' vs 'archived') is derived from its date vs.
// today by build-properties.js, not from a published result.
//
// A titled "... nieruchomości gruntowej ..." (land) row is NOT reliably empty
// land — see parse.js kindFromText: one verified example (Brzeska 36) turned
// out, per its own body prose, to carry two commercial buildings on the
// parcel. Kind is reclassified from title+body once the detail page is
// fetched; a sparse/attachment-only detail body (observed for Narutowicza 30)
// falls back to the title-only classification ('grunt').

import { getText } from '../../core/fetch.js';
import { classifyKind, LAND_KIND } from '../../core/classify-kind.js';
import {
  priceFromText,
  areaFromText,
  landAreaFromText,
  dzialkaNrFromText,
  roundFromTitle,
  addressFromTitle,
  kindFromText,
} from './parse.js';

const HOST = 'https://www.zglbp.pl';
const LIST_BASE = `${HOST}/przetargi`;
const FILTER_QS = 'filtruj=1&rodzaj=sprzedaz_nieruchomosci';

// Safety cap on list pages (the real filtered list is currently 6 pages / ~54
// rows total since ~2011) — MIN_ROW_YEAR below stops us long before this in
// practice; this is just the hard backstop for a CI job's wall clock.
const MAX_LIST_PAGES = 8;
// Once every row on a page predates this year, stop paginating (the list is
// newest-first, so once we're this deep we're past the window this project's
// pipeline cares about for a fresh adapter — see refresh.js
// PIPELINE_MIN_HISTORY_YEAR, which floors result-doc records at 2020 anyway).
const MIN_ROW_YEAR = 2019;
// Budget cap on detail-page fetches (price/area/kind-refinement) per run —
// the whole filtered MIN_ROW_YEAR+ window is ~20 rows, comfortably under
// this. Keeps a live run polite (per-fetch throttle is enforced by
// core/fetch.js) and bounds wall-clock even if the site's volume grows.
const MAX_DETAIL_FETCHES = 40;

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * One `<div class="wiersz">` list row -> { published_date, auction_date,
 * href, title, status }. Exported for the test suite (groundtruthed against
 * a real fetched fragment of https://www.zglbp.pl/przetargi?filtruj=1&rodzaj=
 * sprzedaz_nieruchomosci).
 */
export function parseListRows(html) {
  const rows = [];
  const blocks = (html || '').split('<div class="wiersz">').slice(1);
  for (const b of blocks) {
    const dates = [...b.matchAll(/<div>\s*(\d{4}-\d{2}-\d{2})\s*<\/div>/g)].map((m) => m[1]);
    const linkM = /<a\s+href="([^"]+)"\s*>([\s\S]*?)<\/a>/.exec(b);
    if (!linkM) continue;
    const status = /<div>\s*(w toku|zakończone|unieważnione)\s*<\/div>/.exec(b)?.[1] ?? null;
    rows.push({
      published_date: dates[0] ?? null,
      auction_date: dates[1] ?? null,
      href: linkM[1].replace(/&amp;/gi, '&'),
      title: stripTags(linkM[2]),
      status,
    });
  }
  return rows;
}

async function fetchListPage(page) {
  const url = page === 0 ? `${LIST_BASE}?${FILTER_QS}` : `${LIST_BASE}/page,${page}?${FILTER_QS}`;
  const html = await getText(url);
  return parseListRows(html);
}

/** Fetch + tag-strip one detail page's body, then pull price/area/dzialka. */
async function fetchDetailFields(url) {
  let html;
  try {
    html = await getText(url);
  } catch (err) {
    console.error(`  biala-podlaska: detail fetch failed (${url}): ${err.message}`);
    return null;
  }
  const bodyText = stripTags(html);
  return {
    bodyText,
    starting_price_pln: priceFromText(bodyText),
    area_m2: areaFromText(bodyText),
    land_area_m2: landAreaFromText(bodyText),
    dzialka_nr: dzialkaNrFromText(bodyText),
  };
}

/** Collect recent (>= MIN_ROW_YEAR) sprzedaz_nieruchomosci rows across the
 *  filtered, paginated list — bounded by MAX_LIST_PAGES and an early stop
 *  once a whole page predates the window (the list is newest-first). */
async function crawlListRows() {
  const rows = [];
  const seenHrefs = new Set();
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    let pageRows;
    try {
      pageRows = await fetchListPage(page);
    } catch (err) {
      console.error(`  biala-podlaska: list page ${page} fetch failed: ${err.message}`);
      break;
    }
    if (pageRows.length === 0) break;

    let anyRecent = false;
    for (const r of pageRows) {
      if (seenHrefs.has(r.href)) continue;
      seenHrefs.add(r.href);
      const yr = Number((r.auction_date || r.published_date || '').slice(0, 4));
      const recent = !Number.isFinite(yr) || yr >= MIN_ROW_YEAR;
      if (recent) {
        rows.push(r);
        anyRecent = true;
      }
    }
    console.error(`  biala-podlaska list page ${page}: ${pageRows.length} row(s), ${rows.length} recent total so far`);
    if (!anyRecent) break; // every row on this page predates MIN_ROW_YEAR — stop paginating
  }
  return rows;
}

export async function crawlActive() {
  const rows = await crawlListRows();

  const listings = [];
  let detailFetches = 0;
  let skippedNoAddress = 0;
  for (const r of rows) {
    const address = addressFromTitle(r.title);
    if (!address) {
      skippedNoAddress++;
      console.error(`  biala-podlaska: no address parsed from title, skipping: "${r.title}"`);
      continue;
    }

    const detailUrl = new URL(r.href, HOST).href;
    let kind = classifyKind(r.title);
    let starting_price_pln = null;
    let area_m2 = null;
    let land_area_m2 = null;
    let dzialka_nr = null;

    if (detailFetches < MAX_DETAIL_FETCHES) {
      detailFetches++;
      const d = await fetchDetailFields(detailUrl);
      if (d) {
        starting_price_pln = d.starting_price_pln;
        area_m2 = d.area_m2;
        dzialka_nr = d.dzialka_nr;
        kind = kindFromText(r.title, d.bodyText);
        // landAreaFromText fires on ANY "działka ... powierzchni" clause,
        // including the boilerplate a FLAT's own announcement uses to name
        // the building's underlying plot (e.g. Kopernika 7/9 — see parse.js).
        // Only meaningful for whole-property (grunt/zabudowana) records; a
        // single flat/commercial unit never gets a land_area_m2.
        if (kind === LAND_KIND || kind === 'zabudowana') land_area_m2 = d.land_area_m2;
      }
    }

    listings.push({
      kind,
      address_raw: r.title,
      address,
      auction_date: r.auction_date,
      published_date: r.published_date,
      round: roundFromTitle(r.title),
      area_m2,
      ...(land_area_m2 != null ? { land_area_m2 } : {}),
      starting_price_pln,
      detail_url: detailUrl,
      ...(dzialka_nr ? { dzialka_nr } : {}),
      ...(kind === LAND_KIND ? { zoning: 'niezabudowana' } : {}),
    });
  }

  if (skippedNoAddress) {
    console.error(`  biala-podlaska: WARN dropped ${skippedNoAddress}/${rows.length} row(s) with no parseable address`);
  }
  console.error(
    `  biala-podlaska active: ${listings.length} listing(s) from ${rows.length} row(s) in the crawled window (${detailFetches} detail fetch(es))`,
  );
  return { listings, wykaz: [], land: [] };
}

// No machine-readable results stream exists on zglbp.pl (see file header) —
// every listing stays outcome 'active'/'archived' (by date), never
// 'sold'/'unsold'. parseResultDoc (parse.js) is a stub, never invoked.
export async function crawlResultDocs() {
  return [];
}
