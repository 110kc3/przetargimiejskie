// Kraków crawler — bip.krakow.pl (bespoke ACK Cyfronet BIP, server-rendered HTML).
// See config.js. Boards list ?news_id=N article links; each article is a
// multi-property notice parsed by parse.js. Announcements → listings/land;
// result notices → the achieved-price stream (source:'html' ⇒ refs carry .text).
//
// Pagination is one-based: strona=0 returns HTTP 400. Follow only pages exposed
// by the official pager, with bounded archive depth reported as incomplete.

import { getText } from '../../core/fetch.js';
import { parseNotice, splitItems } from './parse.js';

const ORIGIN = 'https://www.bip.krakow.pl';
const ANNOUNCEMENT_BOARDS = ['?dok_id=30626', '?dok_id=102895']; // active + archive
const RESULT_BOARDS = ['?dok_id=30630', '?dok_id=102899'];       // active + archive
const MAX_PAGES = 6;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const newsUrl = (id) => `${ORIGIN}/?news_id=${id}`;

export async function harvestNewsIds(boards, { fetchText = getText, maxPages = MAX_PAGES } = {}) {
  const ids = new Set();
  let complete = true;
  for (const board of boards) {
    const boardId = /dok_id=(\d+)/.exec(board)?.[1];
    const boardSeen = new Set();
    for (let p = 1; p <= maxPages; p++) {
      const url = `${ORIGIN}/${board}&strona=${p}`;
      let html;
      try {
        html = await fetchText(url, FETCH_OPTS);
      } catch (err) {
        complete = false;
        console.error(`  krakow board fetch failed (${url}): ${err.message}`);
        break;
      }
      const recognized = [...html.matchAll(/<form\b[^>]*action="([^"<>]+)"/gi)].some(match => {
        try {
          const action = new URL(match[1].replace(/&amp;/g, '&'), ORIGIN);
          return action.origin === ORIGIN && action.searchParams.get('dok_id') === boardId
            && Number(action.searchParams.get('strona') || '1') === p;
        } catch { return false; }
      });
      if (!boardId || !recognized) {
        complete = false;
        console.error(`  krakow board ${boardId} page ${p} has unrecognized markup`);
        break;
      }
      let added = 0;
      for (const m of html.matchAll(/[?&]news_id=(\d+)/g)) {
        ids.add(m[1]);
        if (!boardSeen.has(m[1])) { boardSeen.add(m[1]); added++; }
      }
      const pages = [...html.matchAll(/href="[^"<>]*[?&]dok_id=(\d+)(?:&amp;|&)strona=(\d+)[^"<>]*"/g)]
        .filter(m => m[1] === boardId).map(m => Number(m[2]));
      const hasNext = pages.some(page => page > p);
      if (!added) { complete = false; break; }
      if (!hasNext) break;
      if (p === maxPages) { complete = false; break; }
    }
  }
  const result = [...ids];
  result.complete = complete;
  return result;
}

let crawlPromise = null;

export async function crawlAll({ fetchText = getText, maxPages = MAX_PAGES } = {}) {
  const listings = [];
  const land = [];
  const resultRefs = [];

  // Result notices (the achieved-price stream).
  const resultIds = await harvestNewsIds(RESULT_BOARDS, { fetchText, maxPages });
  let resultsComplete = resultIds.complete;
  for (const id of resultIds) {
    const url = newsUrl(id);
    let html;
    try {
      html = await fetchText(url, FETCH_OPTS);
    } catch (err) {
      resultsComplete = false;
      console.error(`  krakow result fetch failed (${url}): ${err.message}`);
      continue;
    }
    const parsed = parseNotice(html, { isResult: true, url });
    if (!parsed.length || parsed.length !== splitItems(html).length) resultsComplete = false;
    resultRefs.push({ text: html, pdf_url: url, detail_url: url, auction_date: null });
  }

  // Announcements (active listings + land).
  for (const id of await harvestNewsIds(ANNOUNCEMENT_BOARDS, { fetchText, maxPages })) {
    const url = newsUrl(id);
    let html;
    try {
      html = await fetchText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  krakow announcement fetch failed (${url}): ${err.message}`);
      continue;
    }
    for (const rec of parseNotice(html, { isResult: false, url })) {
      (rec.kind === 'grunt' ? land : listings).push(rec);
    }
  }
  resultRefs.complete = resultsComplete;

  console.error(
    `  krakow: ${listings.length} flat/commercial/garage listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs, land_complete: false };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land, land_complete: false };
}
