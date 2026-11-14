
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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_PAGES = 12;

const CRAWL_BUDGET_MS = Number(process.env.LUBLINIEC_CRAWL_BUDGET_MS) || 6 * 60 * 1000;
const MAX_DETAILS = Number(process.env.LUBLINIEC_MAX_DETAILS) || 120;

const boardUrl = (idmp, page) =>
  `${ORIGIN}/index.php?idmp=${idmp}&r=r${page > 1 ? `&istr=${page}` : ''}`;
const docUrl = (iddok, idmp) => `${ORIGIN}/dokument.php?iddok=${iddok}&idmp=${idmp}&r=r`;

function contentMain(html) {
  if (!html) return '';
  const i = html.indexOf('id="content-main"');
  if (i < 0) return html;
  let j = html.indexOf('id="colRight"');
  if (j < 0 || j < i) j = html.indexOf('id="footer"');
  return j > i ? html.slice(i, j) : html.slice(i);
}

function decodeHref(h) {
  return h.replace(/&amp;/gi, '&');
}

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
    if (added === 0) break;
  }
  return refs;
}

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
  const listings = [];
  const land = [];
  const resultRefs = [];

  const announceRefs = await fetchBoardRefs(IDMP_ANNOUNCE);
  const announceDetails = await fetchDetailsBounded(announceRefs, 'announcements');
  for (const { ref, text } of announceDetails) {
    if (!isSaleAuction(text)) continue;
    if (isLease(text)) continue;

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

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

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

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
