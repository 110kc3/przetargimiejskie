
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  parseResultDoc,
  isFlat,
  titleAuctionDate,
} from './parse.js';

const ORIGIN = 'https://bip.um.dzierzoniow.pl';
const API = `${ORIGIN}/api`;

const ANNOUNCE_MENU = 1838;
const RESULT_MENU = 63;

const LIST_COUNT = 100;
const MAX_LIST_PAGES = 12;

const RESULT_MIN_YEAR = Number(process.env.DZIERZONIOW_RESULT_MIN_YEAR) || 2020;

const MAX_RESULT_DETAILS = Number(process.env.DZIERZONIOW_MAX_DETAILS) || 200;
const CRAWL_BUDGET_MS = Number(process.env.DZIERZONIOW_CRAWL_BUDGET_MS) || 12 * 60 * 1000;

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
  if (af?.value) return af.value;
  const cf = (item.columnFields || []).find((f) => f.fieldId === 52);
  return cf?.value || '';
}

async function fetchBoardItems(menuId, archived) {
  const items = [];
  let complete = true;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    let json;
    try {
      json = JSON.parse(await getText(listUrl(menuId, page * LIST_COUNT, archived), FETCH_OPTS));
    } catch (err) {
      console.error(`  dzierzoniow: board ${menuId} page ${page} failed: ${err.message}`);
      complete = false;
      break;
    }
    const arts = Array.isArray(json?.articles) ? json.articles : [];
    if (!arts.length) break;
    for (const a of arts) {
      if (a?.id == null || !a?.link) continue;
      items.push({ id: a.id, link: a.link, title: itemTitle(a) });
    }
    const total = Number(json?.total) || 0;
    if ((page + 1) * LIST_COUNT >= total) break;
  }
  items.complete = complete;
  return items;
}

async function fetchAttachments(articleId) {
  let json;
  try {
    json = JSON.parse(await getText(articleUrl(articleId), FETCH_OPTS));
  } catch (err) {
    console.error(`  dzierzoniow: article ${articleId} failed: ${err.message}`);
    return null;
  }
  return (Array.isArray(json?.attachments) ? json.attachments : [])
    .filter((a) => a?.id != null && String(a?.extension || '').toLowerCase() === 'pdf')
    .map((a) => ({ id: a.id, name: a.name || '' }));
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  let allParsed = true;

  const boardItems = await fetchBoardItems(ANNOUNCE_MENU, false);
  const annComplete = Boolean(boardItems.complete);
  const annItems = boardItems.filter((i) => isFlat(i.title));
  console.error(`  dzierzoniow: ${annItems.length} flat announcement article(s)`);
  for (const item of annItems) {
    const atts = await fetchAttachments(item.id);
    if (atts === null) {
      allParsed = false;
      continue;
    }
    if (!atts.length) continue;
    const og = atts.find((a) => /og[łl]oszeni/i.test(a.name)) || atts[0];
    let body;
    try {
      body = await pdfText(fileUrl(og.id), FETCH_OPTS);
    } catch (err) {
      console.error(`  dzierzoniow: ann pdf ${og.id} failed: ${err.message}`);
      allParsed = false;
      continue;
    }
    const rec = parseAnnouncement(body, item.title, pageUrl(item.link));
    if (rec) {
      listings.push(rec);
    } else {
      allParsed = false;
    }
  }

  const knownUrls = await loadKnownSourceUrls('dzierzoniow');
  const resItems = await fetchBoardItems(RESULT_MENU, true);
  console.error(`  dzierzoniow: ${resItems.length} result article(s) on the board`);

  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let processed = 0;
  let skippedOld = 0;
  for (const item of resItems) {
    const auction_date = titleAuctionDate(item.title);
    if (!auction_date || Number(auction_date.slice(0, 4)) < RESULT_MIN_YEAR) { skippedOld++; continue; }
    if (processed >= MAX_RESULT_DETAILS || Date.now() > deadline) {
      console.error(`  dzierzoniow: result budget reached (processed ${processed}); remainder backfills next run`);
      break;
    }
    processed++;

    const atts = await fetchAttachments(item.id);
    if (!atts?.length) continue;
    const pdf = atts.find((a) => /rozstrzyg|wynik/i.test(a.name)) || atts[0];
    if (!pdf) continue;
    const pdf_url = fileUrl(pdf.id);
    if (knownUrls.has(pdf_url)) continue;

    let text;
    try {
      text = await pdfText(pdf_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  dzierzoniow: result pdf ${pdf.id} failed: ${err.message}`);
      continue;
    }
    if (!isFlat(text)) continue;
    resultRefs.push({ text, pdf_url, auction_date });
  }
  console.error(`  dzierzoniow: skipped ${skippedOld} result day(s) older than ${RESULT_MIN_YEAR}`);

  const today = new Date().toISOString().slice(0, 10);
  const active = listings.filter((l) => l.auction_date && l.auction_date >= today);
  console.error(
    `  dzierzoniow: ${active.length} active flat listing(s) (of ${listings.length} parsed), ` +
    `${resultRefs.length} result document(s) with flats`,
  );
  return {
    listings: active,
    resultRefs,
    valid_empty: annComplete && allParsed && active.length === 0,
    valid_empty_land: false,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz: [], land: [], valid_empty, valid_empty_land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0], sampleResult: results[0]?.pdf_url },
      null,
      2,
    ) + '\n',
  );
}
