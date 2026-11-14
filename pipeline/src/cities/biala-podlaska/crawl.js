
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

const MAX_LIST_PAGES = 8;
const MIN_ROW_YEAR = 2019;
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
    if (!anyRecent) break;
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

export async function crawlResultDocs() {
  return [];
}
