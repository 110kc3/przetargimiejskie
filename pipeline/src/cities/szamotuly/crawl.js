// Szamotuły crawler — bip.szamotuly.pl
//
// Crawls board 1247 ("Przetargi") via the eBIP JSON API.
// Carries both active announcements and concluded auction results.
//
// Endpoint pattern:
//   List:   GET /api/menu/1247/articles?limit=120&offset=0&archived=1
//   Detail: GET /api/articles/{id}  ->  { content, attachments, isArchived, ... }

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  isSkippableArticle,
  isResultArticle,
  isAnnouncementArticle,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://bip.szamotuly.pl';
const BOARD_ID = 1247;
const PAGE_SIZE = Number(process.env.SZAMOTULY_PAGE_SIZE) || 120;
const TIME_BUDGET_MS = Number(process.env.SZAMOTULY_TIME_BUDGET_MS) || 120000;
const MAX_ARTICLES = Number(process.env.SZAMOTULY_MAX_ARTICLES) || 200;
const CONCURRENCY = Number(process.env.SZAMOTULY_CONCURRENCY) || 4;
const MIN_HISTORY_YEAR = Number(process.env.MIN_HISTORY_YEAR) || 2020;
const MIN_DATE = `${MIN_HISTORY_YEAR}-01-01`;

const listApiUrl = (offset) =>
  `${ORIGIN}/api/menu/${BOARD_ID}/articles?limit=${PAGE_SIZE}&offset=${offset}&archived=1`;
const articleApiUrl = (id) => `${ORIGIN}/api/articles/${id}`;

function getArticleTitle(a) {
  const f = (a?.aliasFields || []).find((x) => x.alias === 'title');
  return (f?.value || '').trim();
}

function getArticleLead(a) {
  const f = (a?.aliasFields || []).find((x) => x.alias === 'lead');
  return (f?.value || '').trim();
}

function getArticlePubDate(a) {
  for (const c of a?.columnFields || []) {
    const v = (c?.value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

/**
 * Run async mapper with bounded concurrency.
 */
async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIdx = 0;
  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Single memoised pass over the board
let crawlPromise = null;

async function crawlAll() {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const listings = [];
  const land = [];
  const resultRefs = [];
  let boardReached = false;

  const knownUrls = await loadKnownSourceUrls('szamotuly', { includeLand: true }).catch(
    () => new Set(),
  );

  // 1. Discover article refs from board list
  const candidates = [];
  let offset = 0;

  for (;;) {
    if (Date.now() > deadline || candidates.length >= MAX_ARTICLES) break;

    let json;
    try {
      const url = listApiUrl(offset);
      const data = await getText(url);
      json = JSON.parse(data);
      boardReached = true;
    } catch (err) {
      console.error(
        `  szamotuly board list fetch failed at offset ${offset}: ${err.message}`,
      );
      break;
    }

    const articles = Array.isArray(json?.articles) ? json.articles : [];
    if (articles.length === 0) break;

    let hitDateFloor = false;

    for (const a of articles) {
      const id = a?.id;
      if (!id) continue;

      const title = getArticleTitle(a);
      const lead = getArticleLead(a);
      const slug = a?.link || '';
      const published_date = getArticlePubDate(a);

      if (published_date && published_date < MIN_DATE) {
        hitDateFloor = true;
        break;
      }

      if (isSkippableArticle(title, lead, slug)) continue;

      const detailUrl = a?.link
        ? `${ORIGIN}/${String(a.link).replace(/^\/+/, '')}`
        : `${ORIGIN}/api/articles/${id}`;

      const isResult = isResultArticle(title, lead, slug);
      if (isResult && knownUrls.has(detailUrl)) {
        continue;
      }

      candidates.push({
        id,
        title,
        lead,
        slug,
        published_date,
        detailUrl,
        isResult,
      });

      if (candidates.length >= MAX_ARTICLES) break;
    }

    if (hitDateFloor) break;

    const total = Number(json?.total) || 0;
    offset += PAGE_SIZE;
    if (offset >= total || articles.length < PAGE_SIZE) break;
  }

  console.error(
    `  szamotuly: board 1247 returned ${candidates.length} candidate article(s) to fetch`,
  );

  // 2. Fetch candidate article details with concurrency
  const fetchedArticles = await mapConcurrent(
    candidates,
    CONCURRENCY,
    async (item) => {
      if (Date.now() > deadline) return null;
      try {
        const data = await getText(articleApiUrl(item.id));
        const json = JSON.parse(data);
        return { ...item, article: json };
      } catch (err) {
        console.error(
          `  szamotuly article ${item.id} fetch failed: ${err.message}`,
        );
        return null;
      }
    },
  );

  // 3. Process each fetched article
  for (const item of fetchedArticles) {
    if (!item?.article) continue;
    const { article, detailUrl, published_date } = item;
    const content = article?.content || '';

    if (isResultArticle(item.title, item.lead, item.slug, content)) {
      resultRefs.push({
        text: content,
        pdf_url: detailUrl,
        detail_url: detailUrl,
        auction_date: null,
      });
      continue;
    }

    if (isAnnouncementArticle(item.title, item.lead, item.slug, content)) {
      const recs = parseAnnouncement({ ...article, link: item.slug, id: item.id });
      for (const rec of recs) {
        if (!rec.auction_date && published_date) {
          rec.auction_date = published_date;
          rec.auction_date_estimated = true;
        }
        if (rec.kind === 'grunt') {
          land.push(rec);
        } else {
          listings.push(rec);
        }
      }
    }
  }

  console.error(
    `  szamotuly: parsed ${listings.length} property listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
  );

  return {
    listings,
    wykaz: [],
    land,
    resultRefs,
    valid_empty: boardReached && listings.length === 0,
    valid_empty_land: boardReached && land.length === 0,
  };
}

/** Achieved-price result documents found on the board. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** Active property listings, land plots, and pre-announcement wykaz. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        activeCount: active.listings.length,
        landCount: active.land.length,
        resultsCount: results.length,
        valid_empty: active.valid_empty,
        valid_empty_land: active.valid_empty_land,
        sampleListing: active.listings[0] || null,
        sampleLand: active.land[0] || null,
        sampleResult: results[0] || null,
      },
      null,
      2,
    ) + '\n',
  );
}
