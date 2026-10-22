// Starachowice crawler.
// Crawls municipal property auctions and results from starachowice.eu.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  isExcludedTitle,
  parseAnnouncement,
  auctionDateFromText,
  parseDatePL,
} from './parse.js';

const BASE_URL = 'https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi';
const ORIGIN = 'https://starachowice.eu';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_PAGES = Number(process.env.STARACHOWICE_MAX_PAGES) || 25;
const TIME_BUDGET_MS = Number(process.env.STARACHOWICE_TIME_BUDGET_MS) || 180000;

export function extractAttachmentUrl(html) {
  if (!html) return null;
  // Look for official document link on BIP or /fckeditor/file/
  const mBip = /<a[^>]+href="([^"]*(?:bip\.um\.starachowice\.pl|\/fckeditor\/file\/)[^"]*\.pdf(?:\?[^"]*)?)"[^>]*>/i.exec(html);
  if (mBip) return mBip[1];

  // Any pdf that is not the page print (?format=pdf)
  const mPdf = /<a[^>]+href="([^"]+\.pdf(?:\?[^"]*)?)"[^>]*>/gi;
  let m;
  while ((m = mPdf.exec(html)) !== null) {
    if (!m[1].includes('format=pdf')) return m[1];
  }
  return null;
}

export function extractArticleBody(html) {
  if (!html) return '';
  const startIdx = html.indexOf('id="main-content"');
  if (startIdx === -1) return '';
  const endIdx = html.indexOf('</article>', startIdx);
  const chunk = html.substring(startIdx, endIdx !== -1 ? endIdx : startIdx + 15000);
  return chunk
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/Więcej aktualności[\s\S]*/i, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function harvestCards(html) {
  const cards = [];
  const re = /<time datetime="([^"]+)">[^<]*<\/time>\s*<h2>([^<]+)<\/h2>[\s\S]*?<a\s+[^>]*href="([^"]+)"[^>]*class="[^"]*btn-more/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const rawHref = m[3];
    const fullUrl = rawHref.startsWith('http') ? rawHref : new URL(rawHref, ORIGIN).href;
    cards.push({
      pubDate: m[1],
      title: m[2].trim(),
      url: fullUrl,
    });
  }
  return cards;
}

let crawlPromise = null;

async function crawlAll() {
  const start = Date.now();
  const known = await loadKnownSourceUrls('starachowice', { includeLand: true });

  const listings = [];
  const land = [];
  const resultRefs = [];

  let boardAnnReached = false;

  const annCandidates = [];
  const resCandidates = [];
  const seenUrls = new Set();

  let maxBoardPages = MAX_PAGES;

  // 1) Harvest listings index across pages
  for (let page = 1; page <= maxBoardPages; page++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  starachowice: listing index time budget reached at page ${page}`);
      break;
    }

    const url = page === 1 ? BASE_URL : `${BASE_URL}/przetargi.html?page=${page}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
      boardAnnReached = true;
    } catch (err) {
      if (!/\b404\b/.test(err.message)) {
        console.error(`  starachowice: listing index failed (${url}): ${err.message}`);
      }
      break;
    }

    // Determine max page from pagination on first page
    if (page === 1) {
      const mLastPage = /page=(\d+)[^>]*aria-label="Ostatnia strona"|aria-label="Ostatnia strona"[^>]*page=(\d+)/i.exec(html);
      if (mLastPage) {
        const pNum = Number(mLastPage[1] || mLastPage[2]);
        if (pNum > 0 && pNum < maxBoardPages) maxBoardPages = pNum;
      }
    }

    // Detect wrap to page 1
    if (page > 1 && /aria-current="page"[^>]*>\s*1\s*<\/a>/i.test(html)) {
      break;
    }

    const cards = harvestCards(html);
    if (cards.length === 0) break;

    for (const card of cards) {
      if (seenUrls.has(card.url)) continue;
      seenUrls.add(card.url);

      if (isExcludedTitle(card.title)) continue;

      if (isResultTitle(card.title)) {
        resCandidates.push(card);
      } else if (isAnnouncementTitle(card.title)) {
        annCandidates.push(card);
      }
    }
  }

  // 2) Process result notices
  for (const item of resCandidates) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error('  starachowice: time budget reached during result processing');
      break;
    }

    if (known.has(item.url)) continue;

    let postHtml;
    try {
      postHtml = await getText(item.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  starachowice: failed to fetch result post ${item.url}: ${err.message}`);
      continue;
    }

    const articleText = extractArticleBody(postHtml);
    const docUrl = extractAttachmentUrl(postHtml);

    if (docUrl && known.has(docUrl)) continue;

    let attachmentText = '';
    if (docUrl) {
      try {
        attachmentText = await pdfText(docUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  starachowice: failed to fetch attachment ${docUrl}: ${err.message}`);
      }
    }

    const combinedText = `${item.title}\n\n${articleText}\n\n${attachmentText || ''}`.trim();
    const auction_date = auctionDateFromText(combinedText, item.title) || parseDatePL(item.pubDate);

    resultRefs.push({
      text: combinedText,
      pdf_url: docUrl || item.url,
      detail_url: item.url,
      auction_date,
    });
  }

  // 3) Process active announcements
  for (const item of annCandidates) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error('  starachowice: time budget reached during announcement processing');
      break;
    }

    let postHtml;
    try {
      postHtml = await getText(item.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  starachowice: failed to fetch announcement post ${item.url}: ${err.message}`);
      continue;
    }

    const articleText = extractArticleBody(postHtml);
    const docUrl = extractAttachmentUrl(postHtml);

    const recs = parseAnnouncement(item.title, articleText, item.url, docUrl);
    for (const rec of recs) {
      (rec.kind === 'grunt' ? land : listings).push(rec);
    }
  }

  console.error(
    `  starachowice: parsed ${listings.length} property listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
  );

  return {
    listings,
    wykaz: [],
    land,
    resultRefs,
    valid_empty: boardAnnReached && listings.length === 0,
    valid_empty_land: boardAnnReached && land.length === 0,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

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
        sampleListing: active.listings[0] || null,
        sampleLand: active.land[0] || null,
        sampleResult: results[0] || null,
      },
      null,
      2,
    ) + '\n',
  );
}
