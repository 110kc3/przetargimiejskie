// Swietochlowice crawler.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { config } from './config.js';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  htmlToText, addressFrom, roundFromTitle, shareFromTitle,
  priceFromText, areaFromText, auctionDateFromText,
  parseLandAnnouncement,
  parseDocLinks, isFlatAnnouncement, isAuctionAnnouncement, isFlatResultNotice,
} from './parse.js';
import { classifyKind } from '../../core/classify-kind.js';
import { urlCacheKey } from '../../core/hash.js';

const ORIGIN = config.bip.origin;
const LIST = `${ORIGIN}${config.bip.listPath}`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const RETRIES_BOARD = 4;
const RETRIES_ARCHIVE = 2;

const fixOcrText = (s) => String(s || '').replace(/(\d)\s*m\?/g, '$1 m²');

const DOC_CACHE_DIR = fileURLToPath(new URL('../../../doc-text-cache/', import.meta.url));

async function attachmentText(url) {
  if (existsSync(`${DOC_CACHE_DIR}${urlCacheKey(url)}.txt`)) {
    return docText(url, FETCH_OPTS);
  }
  let text;
  try {
    text = await pdfText(url, FETCH_OPTS);
  } catch {
    return docText(url, FETCH_OPTS);
  }
  if (text.replace(/\s+/g, '').length >= 200) return text;
  return fixOcrText(await ocrPdf(url, FETCH_OPTS));
}

function isConnError(err) {
  const s = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.cause?.message || ''}`;
  return /fetch failed|ECONNREFUSED|ETIMEDOUT|CONNECT_TIMEOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network/i.test(s);
}

async function walkCategory(listUrl, seen, entries, maxPages, label) {
  const take = (html) => {
    let added = 0;
    for (const d of parseDocLinks(html, ORIGIN)) {
      if (seen.has(d.url)) continue;
      seen.add(d.url);
      entries.push(d);
      added++;
    }
    return added;
  };

  try {
    take(await getText(listUrl, { ...FETCH_OPTS, retries: RETRIES_BOARD }));
  } catch (err) {
    console.error(`  swietochlowice: ${label} current page fetch failed (${err.message}) -- skipping category.`);
    return;
  }

  let emptyStreak = 0;
  for (let i = 0; i < maxPages; i++) {
    const url = `${listUrl}?showArchive=true&start=${i}`;
    let html;
    try {
      html = await getText(url, { ...FETCH_OPTS, retries: RETRIES_ARCHIVE });
    } catch (err) {
      console.error(`  swietochlowice: ${label} archive page ${i} fetch failed (${err.message}) -- stopping.`);
      if (isConnError(err)) break;
      continue;
    }
    const added = take(html);
    if (added === 0) {
      if (++emptyStreak >= 3) break;
    } else {
      emptyStreak = 0;
    }
  }
}

let flatLinksPromise = null;
function collectFlatLinks() {
  flatLinksPromise ??= collectFlatLinksOnce();
  return flatLinksPromise;
}
async function collectFlatLinksOnce() {
  const entries = [];
  const seen = new Set();
  try {
    const html = await getText(LIST, { ...FETCH_OPTS, retries: RETRIES_BOARD });
    for (const d of parseDocLinks(html, ORIGIN)) {
      if (seen.has(d.url)) continue;
      seen.add(d.url);
      entries.push(d);
    }
  } catch (err) {
    console.error(`  swietochlowice: flat board current page fetch failed (${err.message}) -- skipping city this run.`);
    return { entries: [], seen };
  }
  let emptyStreak = 0;
  for (let i = 0; i < config.bip.maxArchivePages; i++) {
    const url = `${LIST}?showArchive=true&start=${i}`;
    let html;
    try {
      html = await getText(url, { ...FETCH_OPTS, retries: RETRIES_ARCHIVE });
    } catch (err) {
      console.error(`  swietochlowice: flat archive page ${i} fetch failed (${err.message}) -- stopping archive walk.`);
      if (isConnError(err)) break;
      continue;
    }
    let added = 0;
    for (const d of parseDocLinks(html, ORIGIN)) {
      if (seen.has(d.url)) continue;
      seen.add(d.url);
      entries.push(d);
      added++;
    }
    if (added === 0) {
      if (++emptyStreak >= 3) break;
    } else {
      emptyStreak = 0;
    }
  }
  return { entries, seen };
}

export async function crawlActive() {
  const { entries: flatEntries, seen } = await collectFlatLinks();
  const flatAnnouncements = flatEntries.filter((x) => isFlatAnnouncement(x.title));
  console.error(`  swietochlowice: ${flatAnnouncements.length} flat announcement(s) to inspect (of ${flatEntries.length} flat-board links)`);

  const listings = [];
  for (const e of flatAnnouncements) {
    const addr = addressFrom(e.title, '');
    if (!addr) {
      console.error(`  swietochlowice WARN: unkeyable flat announcement (${e.title.slice(0, 70)})`);
      continue;
    }
    let price = null;
    let area = null;
    let date = null;
    try {
      const text = htmlToText(await attachmentText(e.url));
      price = priceFromText(text);
      area = areaFromText(text);
      date = auctionDateFromText(text);
    } catch (err) {
      console.error(`  swietochlowice attachment parse failed (${e.url}): ${err.message}`);
    }
    listings.push({
      kind: 'mieszkalny',
      address_raw: addr.address_raw,
      address: addr.address,
      auction_date: date,
      published_date: null,
      round: roundFromTitle(e.title),
      area_m2: area,
      starting_price_pln: price,
      detail_url: LIST,
      share: shareFromTitle(e.title),
    });
  }

  const land = [];
  const siblingPaths = config.bip.siblingPaths || [];
  const maxSiblingPages = config.bip.maxSiblingArchivePages ?? 30;

  for (const sibPath of siblingPaths) {
    const sibUrl = `${ORIGIN}${sibPath}`;
    const sibEntries = [];
    await walkCategory(sibUrl, seen, sibEntries, maxSiblingPages, sibPath);
    const announcements = sibEntries.filter((x) => isAuctionAnnouncement(x.title));
    console.error(`  swietochlowice ${sibPath}: ${announcements.length} announcement(s) (of ${sibEntries.length} links)`);

    for (const e of announcements) {
      // The sibling boards mix houses, land and commercial, and the city titles
      // most land sales tersely ("…na sprzedaż nieruchomości – ul. X") with no
      // niezabudowanej/zabudowanej/działka word — classifyKind(title) returns
      // `unknown`, and the loop previously had no branch for that, so every
      // terse land auction (e.g. ul. Lotnicza 11,98 ha; Krokusów/Chrobrego) was
      // dropped and land.json stayed empty. Fix: fetch the body once (every kept
      // kind needs it) and, when the title alone is `unknown`, re-classify on
      // title + body — the body always carries the disambiguating word — then
      // route grunt → parseLandAnnouncement and house/commercial → listings[].
      let bodyText = '';
      try {
        bodyText = htmlToText(await attachmentText(e.url));
      } catch (err) {
        console.error(`  swietochlowice attachment fetch failed (${e.url}): ${err.message}`);
      }
      let kind = classifyKind(e.title);
      if (kind === 'unknown') kind = classifyKind(`${e.title} ${bodyText}`);

      if (kind === 'grunt') {
        try {
          const lr = parseLandAnnouncement(e.title, `<p>${bodyText}</p>`, e.url);
          if (lr) {
            land.push(lr);
          } else {
            console.error(`  swietochlowice WARN: unkeyable land announcement (${e.title.slice(0, 70)})`);
          }
        } catch (err) {
          console.error(`  swietochlowice land parse failed (${e.url}): ${err.message}`);
        }
        continue;
      }

      if (kind === 'zabudowana' || kind === 'uzytkowy') {
        // Address from the title, then the body as a fallback — a terse house
        // title may carry no street, but the body does.
        const addr = addressFrom(e.title, bodyText);
        if (!addr) {
          console.error(`  swietochlowice WARN: unkeyable ${kind} announcement (${e.title.slice(0, 70)})`);
          continue;
        }
        listings.push({
          kind,
          address_raw: addr.address_raw,
          address: addr.address,
          auction_date: auctionDateFromText(bodyText),
          published_date: null,
          round: roundFromTitle(e.title),
          area_m2: areaFromText(bodyText),
          starting_price_pln: priceFromText(bodyText),
          detail_url: sibUrl,
          share: null,
        });
        continue;
      }

      // Still unresolved after the body fallback: log so a future board change
      // surfaces in the refresh output rather than silently disappearing.
      console.error(`  swietochlowice WARN: unclassified auction dropped (${e.title.slice(0, 70)})`);
    }
  }

  console.error(`  swietochlowice active: ${listings.length} listing(s) total; ${land.length} land plot(s)`);
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  const { entries: all } = await collectFlatLinks();
  const notices = all.filter((x) => isFlatResultNotice(x.title));
  console.error(`  swietochlowice results: ${notices.length} flat result notice(s)`);

  const out = [];
  for (const n of notices) {
    let text = '';
    try {
      text = await attachmentText(n.url);
    } catch (err) {
      console.error(`  swietochlowice result extract failed (${n.url}): ${err.message}`);
      continue;
    }
    out.push({
      text: `${n.title}\n${htmlToText(text)}`,
      auction_date: null,
      pdf_url: n.url,
    });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} listing(s); ${land.length} land plot(s)`);
}
