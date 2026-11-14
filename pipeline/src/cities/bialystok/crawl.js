
import { pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseDetailFields, parseDetailPage, stripTags } from './parse.js';

const ORIGIN = 'https://www.bip.bialystok.pl';
const BASE_PATH = '/postepowania/przetargi_na_nieruchomosci';
const BASE_URL = `${ORIGIN}${BASE_PATH}`;

const FORM_PARAM = 'PAGE_SEARCH_TYPE_PROPERTY_SALES_AUCTIONS_FORM';
const PAGE_LIMIT = 100;

const STATUS_OPEN = 1376;
const STATUS_RESOLVED = 1377;
const STATUS_UNRESOLVED = 12281;
const STATUS_CANCELLED = 95157;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };


const CRAWL_BUDGET_MS =
  Number(process.env.BIALYSTOK_CRAWL_BUDGET_MS) || 12 * 60 * 1000;

const MAX_DETAILS =
  Number(process.env.BIALYSTOK_MAX_DETAILS) || 300;


export async function loadKnownUrls() {
  return loadKnownSourceUrls('bialystok');
}


function indexUrl(statusId, offset) {
  const params = new URLSearchParams({
    [`fields[PAGE_SEARCH_PARAM_STATUS]`]: String(statusId),
    [`pagination[form]`]: FORM_PARAM,
    [`pagination[limit]`]: String(PAGE_LIMIT),
    [`pagination[offset]`]: String(offset),
  });
  return `${BASE_URL}?${params.toString()}`;
}



export function parseIndexPage(html) {
  const refs = [];
  const seen = new Set();
  const re = /href="(\/postepowania\/przetargi_na_nieruchomosci\/[^"]+\.html)"[^>]*>([^<]+)</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    refs.push({
      title: m[2].trim(),
      detailUrl: `${ORIGIN}${path}`,
    });
  }
  return refs;
}

export function parseTotalCount(html) {
  const m = /Dostępne:\s*(\d+)\s+wynik/i.exec(html);
  return m ? Number(m[1]) : 0;
}

export function isLikelyResidentialTitle(title) {
  const plain = stripTags(title || '').replace(/\s+/g, ' ').trim();
  return /(?:\blokal(?:u)?\s+mieszkaln|\bm(?:\.|\s+)\s*\d+[a-z]?\b)/iu.test(plain);
}


async function fetchAllRefsForStatus(statusId) {
  const refs = [];
  const seen = new Set();
  let offset = 0;
  let total = null;

  while (true) {
    const url = indexUrl(statusId, offset);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  bialystok index fetch failed (status=${statusId} offset=${offset}): ${err.message}`);
      break;
    }

    if (total === null) {
      total = parseTotalCount(html);
    }

    const page = parseIndexPage(html);
    let added = 0;
    for (const r of page) {
      if (!seen.has(r.detailUrl)) {
        seen.add(r.detailUrl);
        refs.push(r);
        added++;
      }
    }

    offset += PAGE_LIMIT;
    if (page.length === 0 || (total !== null && refs.length >= total)) break;
    if (offset > 5000) break;
  }

  console.error(
    `  bialystok index status=${statusId}: ${refs.length} refs (total reported: ${total})`,
  );
  return refs;
}


async function fetchDetailText(url) {
  let html;
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    console.error(`  bialystok detail fetch failed (${url}): ${err.message}`);
    return null;
  }
  const fields = parseDetailFields(html);
  const przeznaczenie = fields.get('Przeznaczenie') || '';
  if (!/lokal\s+mieszkaln/i.test(przeznaczenie)) return null;

  const lines = [];
  for (const [k, v] of fields.entries()) {
    lines.push(`${k}: ${v}`);
  }
  lines.push(`source_url: ${url}`);
  return lines.join('\n');
}


export async function crawlActive() {
  const refs = await fetchAllRefsForStatus(STATUS_OPEN);
  const candidates = refs.filter((ref) => isLikelyResidentialTitle(ref.title));
  const listings = [];

  console.error(
    `  bialystok active candidates: ${candidates.length}/${refs.length} refs after residential-title filter`,
  );

  for (const r of candidates) {
    let html;
    try {
      html = await getText(r.detailUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  bialystok active detail failed (${r.detailUrl}): ${err.message}`);
      continue;
    }
    const rec = parseDetailPage(html, r.detailUrl);
    if (!rec) continue;
    listings.push({
      kind: rec.kind,
      address_raw: rec.address_raw,
      address: rec.address,
      auction_date: rec.auction_date,
      round: rec.round,
      area_m2: rec.area_m2,
      starting_price_pln: rec.starting_price_pln,
      detail_url: r.detailUrl,
    });
  }

  console.error(`  bialystok active: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [] };
}


export async function crawlResultDocs() {
  const allRefs = [];
  const seen = new Set();

  for (const statusId of [STATUS_RESOLVED, STATUS_UNRESOLVED, STATUS_CANCELLED]) {
    const refs = await fetchAllRefsForStatus(statusId);
    for (const r of refs) {
      if (!seen.has(r.detailUrl)) {
        seen.add(r.detailUrl);
        allRefs.push(r);
      }
    }
  }

  const residentialRefs = allRefs.filter((ref) => isLikelyResidentialTitle(ref.title));
  console.error(
    `  bialystok result candidates: ${residentialRefs.length}/${allRefs.length} refs after residential-title filter`,
  );

  const knownUrls = await loadKnownUrls();
  const newRefs = residentialRefs.filter((r) => !knownUrls.has(r.detailUrl));
  const skipped = residentialRefs.length - newRefs.length;
  if (skipped > 0) {
    console.error(`  bialystok result: skipping ${skipped} already-known URL(s); ${newRefs.length} new candidate(s) to fetch`);
  }

  const deadline = Date.now() + CRAWL_BUDGET_MS;
  const out = [];
  let fetched = 0;

  for (const r of newRefs) {
    if (fetched >= MAX_DETAILS || Date.now() > deadline) {
      const remaining = newRefs.length - fetched;
      console.error(
        `  bialystok result: crawl budget reached (fetched ${fetched}/${newRefs.length} new); ${remaining} remainder backfills next run`,
      );
      break;
    }

    const text = await fetchDetailText(r.detailUrl);
    fetched++;
    if (!text) continue;

    const terminM = /^Termin przetargu:\s*(\d{4}-\d{2}-\d{2})/m.exec(text);
    out.push({
      text,
      auction_date: terminM ? terminM[1] : null,
      pdf_url: r.detailUrl,
    });
  }

  console.error(`  bialystok result docs: ${out.length} flat result page(s)`);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
