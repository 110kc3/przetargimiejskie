// Starogard Gdański crawler.
//
// Dual-source crawler:
// 1. Official city BIP (bip.starogard.pl — Madkom SIP platform):
//    - Oral auction announcements: /api/menu/32/articles (active & archived)
//    - Concluded auction results:   /api/menu/447/articles (archived results)
//    - Attachments:                 /api/files/<attId> (born-digital PDFs)
// 2. City portal property board (starogard.pl):
//    - Pre-auction designations:    /informacje-o-nieruchomosciach.html (wykaz)

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  parseWykazBoard,
  parseResultDoc,
} from './parse.js';

const BIP_ORIGIN = 'https://bip.starogard.pl';
const CITY_ORIGIN = 'https://starogard.pl';
const API = `${BIP_ORIGIN}/api`;

const ANNOUNCE_MENU = 32;
const RESULT_MENU = 447;
const LIST_COUNT = 100;

const WYKAZ_CANDIDATE_URLS = [
  `${CITY_ORIGIN}/informacje-o-nieruchomosciach.html`,
  `${CITY_ORIGIN}/obwieszczenia`,
];

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

function listUrl(menuId, offset, archived) {
  const p = new URLSearchParams({ limit: String(LIST_COUNT), offset: String(offset) });
  if (archived) p.set('archived', 'true');
  return `${API}/menu/${menuId}/articles?${p.toString()}`;
}

const articleUrl = (id) => `${API}/articles/${id}`;
const fileUrl = (attId) => `${API}/files/${attId}`;
const pageUrl = (link) => `${BIP_ORIGIN}/${link}`;

function itemTitle(item) {
  const af = (item.aliasFields || []).find((f) => f.alias === 'title');
  if (af?.value) return af.value.trim();
  const cf = (item.columnFields || []).find((f) => f.fieldId === 22);
  return cf?.value ? cf.value.trim() : '';
}

function itemPublishDate(item) {
  const cf = (item.columnFields || []).find((f) => f.fieldId === 26);
  return cf?.value ? cf.value.trim().slice(0, 10) : null;
}

/** Fetch articles from a BIP menu board. */
async function fetchMenuArticles(menuId, archived = false) {
  const items = [];
  try {
    const raw = await getText(listUrl(menuId, 0, archived), FETCH_OPTS);
    const json = JSON.parse(raw);
    const arts = Array.isArray(json?.articles) ? json.articles : [];
    for (const a of arts) {
      if (a?.id == null) continue;
      items.push({
        id: a.id,
        link: a.link,
        title: itemTitle(a),
        publishDate: itemPublishDate(a),
      });
    }
  } catch (err) {
    console.error(`  starogard-gdanski: menu ${menuId} (archived=${archived}) fetch failed: ${err.message}`);
  }
  return items;
}

/** Fetch details and attachments for one article. */
async function fetchArticleDetails(articleId) {
  try {
    const raw = await getText(articleUrl(articleId), FETCH_OPTS);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`  starogard-gdanski: article ${articleId} fetch failed: ${err.message}`);
    return null;
  }
}

/** Filter out non-sale, lease, or procurement items. */
function isSaleArticle(title) {
  const t = (title || '').toLowerCase();
  if (/dzier[żz]aw|\bnajem\b|najmu|wynajem|bezprzetarg/.test(t)) return false;
  if (/zam[óo]wieni|zapytani|konkurs|oferty\s+pracy/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

/**
 * Crawl active & archived announcements for listings, land, and wykaz designations.
 * @returns {Promise<{ listings: Array, wykaz: Array, land: Array, valid_empty: boolean, valid_empty_land: boolean }>}
 */
export async function crawlActive() {
  const listings = [];
  const land = [];
  const wykaz = [];

  // 1. Crawl BIP oral auction announcements (both active and recent archived)
  const activeArts = await fetchMenuArticles(ANNOUNCE_MENU, false);
  const archivedArts = await fetchMenuArticles(ANNOUNCE_MENU, true);
  const allArts = [...activeArts];
  const seenIds = new Set(activeArts.map((a) => a.id));
  for (const a of archivedArts) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      allArts.push(a);
    }
  }

  console.error(`  starogard-gdanski: found ${allArts.length} total BIP announcement articles`);

  for (const art of allArts) {
    if (!isSaleArticle(art.title)) continue;

    const details = await fetchArticleDetails(art.id);
    if (!details) continue;

    const atts = (details.attachments || []).filter(
      (a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf',
    );
    if (!atts.length) continue;

    // Pick main announcement document (prefer 'Treść ogłoszenia' or 'Ogłoszenie')
    const mainAtt =
      atts.find((a) => /og[łl]oszen|tre[śs][ćc]/i.test(a.name || '')) || atts[0];
    const url = fileUrl(mainAtt.id);

    let text;
    try {
      text = await pdfText(url);
    } catch (err) {
      console.error(`  starogard-gdanski: pdfText failed for ${url}: ${err.message}`);
      continue;
    }

    const parsed = parseAnnouncement(text, {
      title: art.title,
      publishDate: art.publishDate,
      detail_url: art.link ? pageUrl(art.link) : url,
      source_url: url,
    });

    if (!parsed) continue;

    if (parsed.kind === 'grunt') {
      land.push(parsed);
    } else {
      listings.push(parsed);
    }
  }

  // 2. Crawl municipal wykaz board on starogard.pl
  for (const wykazUrl of WYKAZ_CANDIDATE_URLS) {
    try {
      const html = await getText(wykazUrl, FETCH_OPTS);
      const items = parseWykazBoard(html, {
        detail_url: wykazUrl,
        source_url: wykazUrl,
      });
      if (items.length > 0) {
        wykaz.push(...items);
        console.error(`  starogard-gdanski: parsed ${items.length} wykaz records from ${wykazUrl}`);
        break;
      }
    } catch (err) {
      // If 404 on first candidate, try the next
    }
  }

  const valid_empty = listings.length === 0 && wykaz.length === 0 && allArts.length > 0;
  const valid_empty_land = land.length === 0 && allArts.length > 0;

  console.error(
    `  starogard-gdanski crawlActive: ${listings.length} flat/premise listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz record(s)`,
  );

  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

/**
 * Crawl result documents from BIP menu 447 (Wyniki przetargów).
 * @returns {Promise<Array<object>>}
 */
export async function crawlResultDocs() {
  const known = await loadKnownSourceUrls('starogard-gdanski');
  const resultRefs = [];

  const activeResults = await fetchMenuArticles(RESULT_MENU, false);
  const archivedResults = await fetchMenuArticles(RESULT_MENU, true);
  const allResults = [...activeResults];
  const seenIds = new Set(activeResults.map((a) => a.id));
  for (const a of archivedResults) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      allResults.push(a);
    }
  }

  console.error(`  starogard-gdanski: found ${allResults.length} BIP result articles`);

  for (const art of allResults) {
    const details = await fetchArticleDetails(art.id);
    if (!details) continue;

    const atts = (details.attachments || []).filter(
      (a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf',
    );

    for (const att of atts) {
      const url = fileUrl(att.id);
      if (known.has(url)) continue;

      resultRefs.push({
        url,
        title: art.title,
        articleId: art.id,
        published_date: art.publishDate,
        page_url: art.link ? pageUrl(art.link) : url,
      });
    }
  }

  console.error(`  starogard-gdanski crawlResultDocs: ${resultRefs.length} new result notice doc(s)`);
  return resultRefs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  console.log(
    JSON.stringify(
      {
        listingsCount: active.listings.length,
        landCount: active.land.length,
        wykazCount: active.wykaz.length,
        resultDocsCount: results.length,
      },
      null,
      2,
    ),
  );
}
