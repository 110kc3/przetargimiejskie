
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isResultDoc,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.zlotoryja.pl';
const API_ARTICLES = `${ORIGIN}/api/fo/articles`;

const CATEGORY_PRZETARGI = 'przedmiotowe74';
const CATEGORY_OGLOSZENIA = 'przedmiotowe5';

const LIST_PATH = '/ogloszenia-5';

const COUNT = 30;
const MAX_PAGES_ACTIVE = 10;
const MAX_PAGES_RESULTS = 20;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { insecureTLS: true, userAgent: UA };

function listUrl({ category, page, filter }) {
  const params = new URLSearchParams({ page: String(page), count: String(COUNT), path: LIST_PATH });
  if (category) params.set('category', category);
  if (filter) params.set('filter', JSON.stringify(filter));
  return `${API_ARTICLES}?${params.toString()}`;
}

function articleUrl(slug) {
  return `${API_ARTICLES}/${slug}`;
}

async function fetchListItems({ category, filter, maxPages }) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    let json;
    try {
      const text = await getText(listUrl({ category, page, filter }), FETCH_OPTS);
      json = JSON.parse(text);
    } catch (err) {
      console.error(`  zlotoryja: list page ${page} (category=${category || '-'}) failed: ${err.message}`);
      break;
    }
    const data = Array.isArray(json?.data) ? json.data : [];
    if (!data.length) break;
    items.push(...data);
    const totalPages = json?.meta?.pages || 1;
    if (page >= totalPages) break;
  }
  return items;
}

async function fetchArticle(slug) {
  let json;
  try {
    const text = await getText(articleUrl(slug), FETCH_OPTS);
    json = JSON.parse(text);
  } catch (err) {
    console.error(`  zlotoryja: article ${slug} fetch failed: ${err.message}`);
    return null;
  }
  const a = json?.data?.attributes;
  if (!a) return null;
  const text = buildRecordText({ title: a.title, body: a.content });
  const url = a.fullUrl ? `${ORIGIN}${a.fullUrl}` : articleUrl(slug);
  return { text, url };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const activeItems = await fetchListItems({ category: CATEGORY_PRZETARGI, maxPages: MAX_PAGES_ACTIVE });
  for (const item of activeItems) {
    const slug = item?.attributes?.slug;
    if (!slug) continue;
    const rec = await fetchArticle(slug);
    if (!rec) continue;
    const { text } = rec;
    if (!isSaleAuction(text)) continue;
    if (isLease(text)) continue;

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

    const enriched = { ...parsed, detail_url: rec.url, source_url: rec.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  const resultItems = await fetchListItems({
    category: CATEGORY_OGLOSZENIA,
    filter: { title: 'wyniku' },
    maxPages: MAX_PAGES_RESULTS,
  });
  for (const item of resultItems) {
    const slug = item?.attributes?.slug;
    if (!slug) continue;
    const rec = await fetchArticle(slug);
    if (!rec) continue;
    const { text } = rec;
    if (!isResultDoc(text)) continue;
    if (!isSaleAuction(text)) continue;
    if (isLease(text)) continue;
    resultRefs.push({
      text,
      source_url: rec.url,
      auction_date: auctionDateFromText(text) || null,
    });
  }

  console.error(
    `  zlotoryja: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
