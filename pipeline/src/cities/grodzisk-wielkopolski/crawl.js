// Grodzisk Wielkopolski crawler.
//
// Platform: nv.pl / Symfony REST backend (Madkom SIP / Logonet family)
// BIP host: bip.grodzisk.wlkp.pl
//
// API Endpoints:
//   Board:   GET /api/menu/512/articles?limit=100&offset=N[&archived=1]
//   Article: GET /api/articles/{id}
//
// All announcements and results are published in menu 512 ("Przetargi").
// Articles may reside in either the active or archived board.
// Both boards are queried to ensure complete historical coverage.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isFlatNotice,
  cleanHtml,
  extractDate,
} from './parse.js';

const ORIGIN = 'https://bip.grodzisk.wlkp.pl';
const API = `${ORIGIN}/api`;
const MENU_ID = 512;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

function listUrl(offset, archived) {
  const p = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (archived) p.set('archived', '1');
  return `${API}/menu/${MENU_ID}/articles?${p.toString()}`;
}

const articleUrl = (id) => `${API}/articles/${id}`;
const pageUrl = (link) => `${ORIGIN}/${link}`;

function articleTitle(item) {
  const af = (item.aliasFields || []).find((f) => f.alias === 'title');
  if (af?.value) return af.value;
  const cf = (item.columnFields || []).find((f) => f.fieldId === 22);
  return cf?.value || '';
}

/**
 * Fetch all articles from one board (active or archived), paginating up to MAX_PAGES.
 * @param {boolean} archived
 * @returns {Promise<{ articles: Array<object>, complete: boolean }>}
 */
async function fetchBoardArticles(archived) {
  const items = [];
  let complete = true;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = listUrl(page * PAGE_SIZE, archived);
    let json;
    try {
      json = JSON.parse(await getText(url, FETCH_OPTS));
    } catch (err) {
      console.error(`  grodzisk-wielkopolski: board list failed (archived=${archived}, page=${page}): ${err.message}`);
      complete = false;
      break;
    }

    const arts = Array.isArray(json?.articles) ? json.articles : [];
    if (!arts.length) break;

    for (const a of arts) {
      if (a?.id == null || !a?.link) continue;
      items.push({
        id: String(a.id),
        link: a.link,
        title: articleTitle(a),
      });
    }

    const total = Number(json?.total) || 0;
    if ((page + 1) * PAGE_SIZE >= total) break;
  }

  return { articles: items, complete };
}

/**
 * Fetch single article JSON.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function fetchArticle(id) {
  try {
    const raw = await getText(articleUrl(id), FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`  grodzisk-wielkopolski: failed to fetch article ${id}: ${err.message}`);
    return null;
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  let annComplete = true;

  const [activeBoard, archivedBoard] = await Promise.all([
    fetchBoardArticles(false),
    fetchBoardArticles(true),
  ]);

  if (!activeBoard.complete || !archivedBoard.complete) {
    annComplete = false;
  }

  // De-duplicate articles by ID across active and archived boards
  const byId = new Map();
  for (const a of [...activeBoard.articles, ...archivedBoard.articles]) {
    if (!byId.has(a.id)) byId.set(a.id, a);
  }

  const allArticles = [...byId.values()];
  const knownUrls = await loadKnownSourceUrls('grodzisk-wielkopolski');

  for (const item of allArticles) {
    const title = item.title || '';
    const isResult = /wynik|rozstrzyg/i.test(title);
    const detailUrl = pageUrl(item.link);

    if (isResult) {
      if (knownUrls.has(detailUrl)) continue;

      const art = await fetchArticle(item.id);
      if (!art || !art.content) continue;
      if (!isFlatNotice(title, art.content)) continue;

      const text = cleanHtml(art.content);
      const dateM =
        /odby[łl]\s+si[ęe]\s+w\s+dniu\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text) ||
        /z\s+dnia\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text);
      const auction_date = dateM ? extractDate(dateM[1]) : null;

      resultRefs.push({
        text: art.content,
        pdf_url: detailUrl,
        auction_date,
      });
    } else {
      // Announcement notice
      if (!/przetarg|sprzeda|zbycie/i.test(title)) continue;
      if (/dzier[żz]aw|najem|dow[óo]z|siwz|sto[łl][óo]wek|roln/i.test(title)) continue;

      const art = await fetchArticle(item.id);
      if (!art || !art.content) continue;
      if (!isFlatNotice(title, art.content)) continue;

      const records = parseAnnouncement(art.content, {
        title,
        detail_url: detailUrl,
      });

      listings.push(...records);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeListings = listings.filter((l) => !l.auction_date || l.auction_date >= today);

  console.error(
    `  grodzisk-wielkopolski: ${activeListings.length} active listing(s) (of ${listings.length} parsed), ` +
    `${resultRefs.length} result doc(s)`,
  );

  return {
    listings: activeListings,
    resultRefs,
    valid_empty: annComplete && activeListings.length === 0,
    valid_empty_land: false,
  };
}

/**
 * Concluded records stream (achieved prices).
 * source:'html' => refs carry `.text` containing HTML content.
 * @returns {Promise<Array<object>>}
 */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/**
 * Active announcements stream.
 * @returns {Promise<{ listings: Array<object>, wykaz: Array<object>, land: Array<object>, valid_empty: boolean, valid_empty_land: boolean }>}
 */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, valid_empty, valid_empty_land } = await crawlPromise;
  return {
    listings,
    wykaz: [],
    land: [],
    valid_empty,
    valid_empty_land,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, valid_empty } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listingsCount: listings.length,
        resultsCount: results.length,
        valid_empty,
        sampleListing: listings[0] || null,
        sampleResultDoc: results[0]?.pdf_url || null,
      },
      null,
      2,
    ) + '\n',
  );
}
