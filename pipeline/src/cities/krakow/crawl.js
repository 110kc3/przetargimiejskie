// Kraków crawler — bip.krakow.pl (bespoke ACK Cyfronet BIP, server-rendered HTML).
// See config.js. Boards list ?news_id=N article links; each article is a
// multi-property notice parsed by parse.js. Announcements → listings/land;
// result notices → the achieved-price stream (source:'html' ⇒ refs carry .text).
//
// NOTE (confirm on first CI refresh): the &strona=N pagination + ?news_id harvest
// were inferred from the live board structure; the body parser is groundtruthed.
// Archive depth is capped here (active + recent); a deeper archive backfill can
// raise MAX_PAGES once the first run confirms the harvest.

import { getText } from '../../core/fetch.js';
import { parseNotice, htmlToText } from './parse.js';

const ORIGIN = 'https://www.bip.krakow.pl';
const ANNOUNCEMENT_BOARDS = ['?dok_id=30626', '?dok_id=102895']; // active + archive
const RESULT_BOARDS = ['?dok_id=30630', '?dok_id=102899'];       // active + archive
const MAX_PAGES = 6;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const newsUrl = (id) => `${ORIGIN}/?news_id=${id}`;

async function harvestNewsIds(boards) {
  const ids = new Set();
  for (const board of boards) {
    for (let p = 0; p < MAX_PAGES; p++) {
      const url = `${ORIGIN}/${board}&strona=${p}`;
      let html;
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        console.error(`  krakow board fetch failed (${url}): ${err.message}`);
        break;
      }
      let added = 0;
      for (const m of html.matchAll(/[?&]news_id=(\d+)/g)) {
        if (!ids.has(m[1])) { ids.add(m[1]); added++; }
      }
      if (added === 0 && p > 0) break; // no new ids on this page → stop paging
    }
  }
  return [...ids];
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  // Result notices (the achieved-price stream).
  for (const id of await harvestNewsIds(RESULT_BOARDS)) {
    const url = newsUrl(id);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  krakow result fetch failed (${url}): ${err.message}`);
      continue;
    }
    resultRefs.push({ text: html, pdf_url: url, detail_url: url, auction_date: null });
  }

  // Announcements (active listings + land).
  for (const id of await harvestNewsIds(ANNOUNCEMENT_BOARDS)) {
    const url = newsUrl(id);
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  krakow announcement fetch failed (${url}): ${err.message}`);
      continue;
    }
    for (const rec of parseNotice(html, { isResult: false, url })) {
      (rec.kind === 'grunt' ? land : listings).push(rec);
    }
  }

  console.error(
    `  krakow: ${listings.length} flat/commercial/garage listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
