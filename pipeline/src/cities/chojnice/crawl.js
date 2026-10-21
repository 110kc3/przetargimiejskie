// Chojnice crawler.
// Crawls municipal auction announcements and results from miastochojnice.pl.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  isAnnouncementTitle,
  isResultTitle,
  parseAnnouncement,
  auctionDateFromText,
  parseDatePL,
} from './parse.js';

const INDEX_ANNOUNCEMENTS_BASE = 'https://miastochojnice.pl/kat/przetargi-na-nieruchomosci-miejskie/';
const INDEX_RESULTS_BASE = 'https://miastochojnice.pl/kat/przetargi-na-nieruchomosci-miejskie-wyniki/';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_PAGES_ANN = Number(process.env.CHOJNICE_MAX_PAGES_ANN) || 5;
const MAX_PAGES_RES = Number(process.env.CHOJNICE_MAX_PAGES_RES) || 10;
const TIME_BUDGET_MS = Number(process.env.CHOJNICE_TIME_BUDGET_MS) || 120000;

const AUX_ATTACHMENT_RE =
  /rzut|pi[ęe]tr|piwnic|ofert|zg[łl]oszen|lista|o[śs]wiadczen|umowa|formularz|regulamin|klauzul|rodo|inwentaryzacj/i;

export function extractAttachmentUrl(html) {
  const list = [];
  const reCustom = /<a[^>]+class="[^"]*custom-1-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = reCustom.exec(html)) !== null) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    list.push({ href, title });
  }
  if (list.length === 0) {
    const reDirect = /<a[^>]+href="([^"]+\.(?:pdf|docx?)(?:\?[^"]*)?)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = reDirect.exec(html)) !== null) {
      list.push({ href: m[1], title: m[2].replace(/<[^>]+>/g, '').trim() });
    }
  }
  if (list.length === 0) return null;

  const primary = list.filter((a) => !AUX_ATTACHMENT_RE.test(a.title));
  const candidates = primary.length > 0 ? primary : list;
  const matching = candidates.find((a) => /przetarg|og[łl]oszen|wynik/i.test(a.title));
  return (matching || candidates[0]).href;
}

export async function extractAttachmentText(docUrl) {
  try {
    return await pdfText(docUrl, FETCH_OPTS);
  } catch (err) {
    try {
      return await docText(docUrl, FETCH_OPTS);
    } catch (err2) {
      throw new Error(`failed to extract attachment ${docUrl}: pdf: ${err.message}, doc: ${err2.message}`);
    }
  }
}

export function harvestPosts(html) {
  const out = [];
  const re = /<a href="([^"]+)" class="article-link">\s*<p class="h5 pb-2">\s*([^<]+)\s*<\/p>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ url: m[1], title: m[2].trim() });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const start = Date.now();
  const known = await loadKnownSourceUrls('chojnice', { includeLand: true });

  const listings = [];
  const land = [];
  const resultRefs = [];

  let boardAnnReached = false;
  let boardResReached = false;

  // 1) Harvest results index (process results first so achieved price stream is populated)
  const resSeen = new Set();
  const resCandidates = [];
  for (let p = 1; p <= MAX_PAGES_RES; p++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  chojnice: results index time budget reached at page ${p}`);
      break;
    }
    const url = p === 1 ? INDEX_RESULTS_BASE : `${INDEX_RESULTS_BASE}page/${p}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
      boardResReached = true;
    } catch (err) {
      if (!/\b404\b/.test(err.message)) {
        console.error(`  chojnice results index failed (${url}): ${err.message}`);
      }
      break;
    }

    const posts = harvestPosts(html);
    if (posts.length === 0) break;

    for (const post of posts) {
      if (resSeen.has(post.url)) continue;
      resSeen.add(post.url);
      if (isResultTitle(post.title)) {
        resCandidates.push(post);
      }
    }
  }

  // 2) Process result documents
  for (const item of resCandidates) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error('  chojnice: time budget reached during result processing');
      break;
    }
    if (known.has(item.url)) continue;

    let postHtml;
    try {
      postHtml = await getText(item.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  chojnice: failed to fetch result post ${item.url}: ${err.message}`);
      continue;
    }

    const docUrl = extractAttachmentUrl(postHtml);
    if (!docUrl) {
      console.error(`  chojnice: no attachment found on result post ${item.url}`);
      continue;
    }

    let text;
    try {
      text = await extractAttachmentText(docUrl);
    } catch (err) {
      console.error(`  chojnice: ${err.message}`);
      continue;
    }

    resultRefs.push({
      text: `${item.title}\n\n${text}`,
      pdf_url: docUrl,
      detail_url: item.url,
      auction_date: auctionDateFromText(text, item.title) || parseDatePL(item.title),
    });
  }

  // 3) Harvest announcements index
  const annSeen = new Set();
  const annCandidates = [];
  for (let p = 1; p <= MAX_PAGES_ANN; p++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  chojnice: announcements time budget reached at page ${p}`);
      break;
    }
    const url = p === 1 ? INDEX_ANNOUNCEMENTS_BASE : `${INDEX_ANNOUNCEMENTS_BASE}page/${p}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
      boardAnnReached = true;
    } catch (err) {
      if (!/\b404\b/.test(err.message)) {
        console.error(`  chojnice announcements index failed (${url}): ${err.message}`);
      }
      break;
    }

    const posts = harvestPosts(html);
    if (posts.length === 0) break;

    for (const post of posts) {
      if (annSeen.has(post.url)) continue;
      annSeen.add(post.url);
      if (isAnnouncementTitle(post.title)) {
        annCandidates.push(post);
      }
    }
  }

  // 4) Process announcement documents
  for (const item of annCandidates) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error('  chojnice: time budget reached during announcement processing');
      break;
    }
    let postHtml;
    try {
      postHtml = await getText(item.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  chojnice: failed to fetch announcement post ${item.url}: ${err.message}`);
      continue;
    }

    const docUrl = extractAttachmentUrl(postHtml);
    if (!docUrl) {
      console.error(`  chojnice: no attachment found on announcement post ${item.url}`);
      continue;
    }

    let text;
    try {
      text = await extractAttachmentText(docUrl);
    } catch (err) {
      console.error(`  chojnice: ${err.message}`);
      continue;
    }

    const recs = parseAnnouncement(item.title, text, item.url, docUrl);
    for (const rec of recs) {
      (rec.kind === 'grunt' ? land : listings).push(rec);
    }
  }

  console.error(
    `  chojnice: parsed ${listings.length} property listing(s), ${land.length} land plot(s), ${resultRefs.length} result doc(s)`,
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
