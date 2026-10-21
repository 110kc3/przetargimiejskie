// Malbork crawler.
//
// Source: bip.malbork.pl (Madkom SIP platform, React SPA backed by plain JSON HTTP API).
//
// API endpoints used:
//   GET /api/menu/<menuId>/articles?limit=N&offset=K[&archived=true]
//     -> { total, articles: [ { id, link, columnFields, aliasFields } ] }
//   GET /api/articles/<id>
//     -> { id, title, attachments: [ { id, name, extension, link } ] }
//   GET /api/files/<attId>
//     -> PDF bytes (born-digital)
//
// Menus:
//   - ANNOUNCEMENTS: menu 48 "Nieruchomości" (under 258 "Przetargi otwarte")
//   - RESULTS (rozstrzygnięte): menu 180 "Nieruchomości" (under 17 "Przetargi rozstrzygnięte")
//   - RESULTS (nierozstrzygnięte): menu 203 "Nieruchomości" (under 212 "Przetargi nierozstrzygnięte")

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  isFlat,
  isSkippable,
  parseAnnouncement,
  parseResultDoc,
} from './parse.js';

const ORIGIN = 'https://bip.malbork.pl';
const API = `${ORIGIN}/api`;

const ANNOUNCE_MENU = 48; // "Nieruchomości" (under 258 "Przetargi otwarte")
const RESULT_MENUS = [180, 203]; // 180 = rozstrzygnięte, 203 = nierozstrzygnięte

const LIST_COUNT = 100;
const MAX_LIST_PAGES = 10;

const RESULT_MIN_YEAR = Number(process.env.MALBORK_RESULT_MIN_YEAR) || 2020;
const MAX_RESULT_DETAILS = Number(process.env.MALBORK_MAX_DETAILS) || 250;
const CRAWL_BUDGET_MS = Number(process.env.MALBORK_CRAWL_BUDGET_MS) || 12 * 60 * 1000;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

function listUrl(menuId, offset, archived) {
  const p = new URLSearchParams({ limit: String(LIST_COUNT), offset: String(offset) });
  if (archived) p.set('archived', 'true');
  return `${API}/menu/${menuId}/articles?${p.toString()}`;
}

const articleUrl = (id) => `${API}/articles/${id}`;
const fileUrl = (attId) => `${API}/files/${attId}`;
const pageUrl = (link) => `${ORIGIN}/${link}`;

function itemTitle(item) {
  const af = (item.aliasFields || []).find((f) => f.alias === 'title');
  if (af?.value) return af.value.trim();
  const cf = (item.columnFields || []).find((f) => f.fieldId === 22);
  return cf?.value ? cf.value.trim() : '';
}

function itemPublishDate(item) {
  const cf = (item.columnFields || []).find((f) => f.fieldId === 26);
  return cf?.value ? cf.value.trim() : null;
}

/** Walk one board (bounded), collecting { id, link, title, publishDate }. */
async function fetchBoardItems(menuId, archived) {
  const items = [];
  let complete = true;

  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    let json;
    try {
      json = JSON.parse(await getText(listUrl(menuId, page * LIST_COUNT, archived), FETCH_OPTS));
    } catch (err) {
      console.error(`  malbork: board ${menuId} (archived=${archived}) page ${page} failed: ${err.message}`);
      complete = false;
      break;
    }

    const arts = Array.isArray(json?.articles) ? json.articles : [];
    if (!arts.length) break;

    for (const a of arts) {
      if (a?.id == null || !a?.link) continue;
      items.push({
        id: a.id,
        link: a.link,
        title: itemTitle(a),
        publishDate: itemPublishDate(a),
      });
    }

    const total = Number(json?.total) || 0;
    if ((page + 1) * LIST_COUNT >= total) break;
  }

  items.complete = complete;
  return items;
}

/** Fetch one article's attachments -> array of { id, name, extension } or null on error. */
async function fetchAttachments(articleId) {
  let json;
  try {
    json = JSON.parse(await getText(articleUrl(articleId), FETCH_OPTS));
  } catch (err) {
    console.error(`  malbork: article ${articleId} failed: ${err.message}`);
    return null;
  }
  return (Array.isArray(json?.attachments) ? json.attachments : [])
    .filter((a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf')
    .map((a) => ({ id: a.id, name: a.name || '' }));
}

/**
 * Crawl active announcements board for flat listings.
 * @returns {Promise<{ listings: object[], wykaz: object[], land: object[], valid_empty: boolean, valid_empty_land: boolean }>}
 */
export async function crawlActive() {
  const listings = [];
  const boardItems = await fetchBoardItems(ANNOUNCE_MENU, false);
  const annComplete = Boolean(boardItems.complete);

  console.error(`  malbork: ${boardItems.length} current article(s) on announcements board`);

  for (const item of boardItems) {
    if (isSkippable(item.title)) continue;

    const atts = await fetchAttachments(item.id);
    if (!atts?.length) continue;

    // Pick PDF attachments relating to flats or general property auctions
    const flatAtts = atts.filter((a) => isFlat(a.name) || !isSkippable(a.name));
    for (const att of flatAtts) {
      const pdf_url = fileUrl(att.id);
      let text;
      try {
        text = await pdfText(pdf_url, FETCH_OPTS);
      } catch (err) {
        console.error(`  malbork: ann pdf ${att.id} failed: ${err.message}`);
        continue;
      }

      if (!isFlat(text) && !isFlat(att.name)) continue;

      const recs = parseAnnouncement(text, pageUrl(item.link), pdf_url, att.name);
      listings.push(...recs);
    }
  }

  // Keep genuinely upcoming auctions as active
  const today = new Date().toISOString().slice(0, 10);
  const active = listings.filter((l) => !l.auction_date || l.auction_date >= today);

  console.error(
    `  malbork active: ${active.length} active flat listing(s) (of ${listings.length} parsed across current board)`,
  );

  return {
    listings: active,
    wykaz: [],
    land: [],
    valid_empty: annComplete && active.length === 0,
    valid_empty_land: false,
  };
}

/**
 * Crawl result notices from settled and unsettled property boards.
 * Returns array of doc refs: { text, pdf_url, auction_date, detail_url }.
 */
export async function crawlResultDocs() {
  const knownUrls = await loadKnownSourceUrls('malbork');
  const resultRefs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let processed = 0;
  let skippedOld = 0;
  let skippedKnown = 0;

  for (const menuId of RESULT_MENUS) {
    // Both current tab and archived tab contain result notices
    for (const isArchived of [false, true]) {
      const boardItems = await fetchBoardItems(menuId, isArchived);
      console.error(
        `  malbork: menu ${menuId} (archived=${isArchived}) has ${boardItems.length} result article(s)`,
      );

      for (const item of boardItems) {
        const pubYear = item.publishDate ? Number(item.publishDate.slice(0, 4)) : null;
        if (pubYear && pubYear < RESULT_MIN_YEAR) {
          skippedOld++;
          continue;
        }

        if (isSkippable(item.title)) continue;

        if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) {
          console.error(
            `  malbork: result budget reached (processed ${processed}); remainder backfills next run`,
          );
          break;
        }
        processed++;

        const atts = await fetchAttachments(item.id);
        if (!atts?.length) continue;

        // Prefer result notice attachment
        const pdf =
          atts.find((a) => /wynik|rozstrzyg|protok/i.test(a.name)) ||
          atts.find((a) => isFlat(a.name)) ||
          atts[0];
        if (!pdf) continue;

        const pdf_url = fileUrl(pdf.id);
        if (knownUrls.has(pdf_url)) {
          skippedKnown++;
          continue; // Incremental skip: already committed
        }

        let text;
        try {
          text = await pdfText(pdf_url, FETCH_OPTS);
        } catch (err) {
          console.error(`  malbork: result pdf ${pdf.id} failed: ${err.message}`);
          continue;
        }

        if (!isFlat(text) && !isFlat(pdf.name)) continue; // Land / non-residential — skip

        resultRefs.push({
          text,
          pdf_url,
          auction_date: item.publishDate ? item.publishDate.slice(0, 10) : null,
          detail_url: pageUrl(item.link),
        });
      }

      if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) break;
    }
    if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) break;
  }

  console.error(
    `  malbork results: collected ${resultRefs.length} result doc(s) with flats (skipped ${skippedOld} older than ${RESULT_MIN_YEAR}, ${skippedKnown} already known)`,
  );

  return resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        activeCount: active.listings.length,
        resultsCount: results.length,
        sampleActive: active.listings[0],
        sampleResult: results[0]?.pdf_url,
      },
      null,
      2,
    ) + '\n',
  );
}
