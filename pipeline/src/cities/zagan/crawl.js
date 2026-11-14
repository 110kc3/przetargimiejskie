import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseActiveFlatRow,
  parseActiveLandRow,
  buildResultText,
  inScopeKind,
  isLeaseRow,
  dateOnly,
} from './parse.js';

const ORIGIN = 'https://bip.zagan.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_ACTIVE_PAGES = Number(process.env.ZAGAN_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.ZAGAN_MAX_RESOLVED_PAGES) || 20;
const ROWS_PER_PAGE = 10;
const CRAWL_BUDGET_MS = Number(process.env.ZAGAN_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


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
    }
    out.push({ url, filename });
  }
  return out;
}


export function boardUrl(status, page) {
  return page <= 1
    ? `${ORIGIN}/przetargi/344/status/${status}/`
    : `${ORIGIN}/przetargi/344/${page}/status/${status}/`;
}

export function parseBoardPage(html) {
  const out = [];
  const rowRe = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html || '')) !== null) {
    const row = rm[1];

    const d1 = /td-date-1"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);
    const d2 = /td-date-2"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);

    const dotyczyM = /class="td-title-1"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(row);
    if (!dotyczyM) continue;
    const detailUrl = deamp(dotyczyM[1]);
    const dotyczyText = stripTags(dotyczyM[2]);

    const cenaM = /class="td-title-2"[^>]*>([\s\S]*?)<\/td>/.exec(row);
    const cenaText = cenaM ? stripTags(cenaM[1]) : '';

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


async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  zagan: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}


export async function crawlActive({ getPage = fetchPage } = {}) {
  const listings = [];
  const land = [];
  const seenDetails = new Set();
  let complete = false;
  let allParsed = true;

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    const html = await getPage(boardUrl(0, page));
    if (!html) break;
    const activeTab = /<a\b[^>]*id="tab-0"[^>]*>/i.exec(html)?.[0] || '';
    if (!activeTab.includes(`href="${boardUrl(0, 1)}"`) || !/aria-selected="true"/i.test(activeTab)) allParsed = false;
    const rows = parseBoardPage(html);
    const table = /<table\b[^>]*class="[^"]*\btable-data\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(html)?.[1];
    const rawRows = [...(table || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
      .filter((row) => /<td\b/i.test(row[1])).length;
    if (!table || rawRows !== rows.length) allParsed = false;
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      const kind = inScopeKind(row.dotyczyText);
      if (kind === 'mieszkalny') {
        const rec = parseActiveFlatRow(row);
        if (rec) listings.push(rec);
        else allParsed = false;
      } else if (kind === 'grunt') {
        const rec = parseActiveLandRow(row);
        if (rec) land.push(rec);
        else allParsed = false;
      } else if (!isLeaseRow(row.dotyczyText)) {
        allParsed = false;
      }
    }

    const laterPage = [...html.matchAll(/href="(?:https:\/\/bip\.zagan\.pl)?\/przetargi\/344\/(\d+)\/status\/0\//g)]
      .some((link) => Number(link[1]) > page);
    if (rows.length < ROWS_PER_PAGE && !laterPage) { complete = true; break; }
  }

  console.error(`  zagan crawlActive: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
  return {
    listings, wykaz: [], land,
    valid_empty: complete && allParsed && listings.length === 0,
    valid_empty_land: complete && allParsed && land.length === 0,
  };
}


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

    if (rows.length < ROWS_PER_PAGE) break;
  }

  if (skippedKnown) console.error(`  zagan: skipped ${skippedKnown} already-known result row(s)`);
  console.error(`  zagan crawlResultDocs: ${refs.length} result ref(s) (zero-fetch)`);
  return refs;
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
