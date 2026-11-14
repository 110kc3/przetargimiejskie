import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText } from '../../core/finn-bip.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isAnnouncement,
  isResultDoc,
  isQualifiedBiddersList,
} from './parse.js';

const ORIGIN = 'https://glogow.bip.info.pl';
const API_BASE = `${ORIGIN}/api/fo`;
const API_ARTICLES = `${API_BASE}/articles`;
const OFFICIAL_ORIGIN = 'https://www.glogow.pl';
const OFFICIAL_LIST = `${OFFICIAL_ORIGIN}/urzad/index.php/ogloszenia`;

const CATEGORY = 'przedmiotowe27d';
const LIST_PATH = '/sprzedaz-nieruchomosci-gminnych-2';
const COUNT = 30;

const MAX_LIST_PAGES = 30;

const MAX_OFFICIAL_FALLBACK_PAGES = 12;

const CRAWL_BUDGET_MS = Number(process.env.GLOGOW_CRAWL_BUDGET_MS) || 10 * 60 * 1000;
const MAX_DETAILS = Number(process.env.GLOGOW_MAX_DETAILS) || 220;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { insecureTLS: true, userAgent: UA };

function listUrl(page) {
  const params = new URLSearchParams({
    page: String(page),
    count: String(COUNT),
    path: LIST_PATH,
    category: CATEGORY,
  });
  return `${API_ARTICLES}?${params.toString()}`;
}
function articleUrl(slug) {
  return `${API_ARTICLES}/${encodeURIComponent(slug)}`;
}
function pdfDownloadUrl(attachmentId) {
  return `${API_BASE}/files/${attachmentId}/download`;
}

export function parseOfficialFallbackPage(html) {
  const out = [];
  for (const match of String(html || '').matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const card = match[1];
    const title = htmlToText(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(card)?.[1] || '');
    const teaser = htmlToText(card);
    const probe = buildRecordText({ title, body: teaser });
    const role = isResultDoc(probe) ? 'result' : isAnnouncement(probe) ? 'announcement' : null;
    if (!role || !isSaleAuction(probe) || isLease(probe)) continue;

    const pdfUrls = [];
    const seen = new Set();
    for (const link of card.matchAll(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi)) {
      const url = new URL(link[1].replace(/&amp;/gi, '&'), OFFICIAL_ORIGIN).href;
      if (seen.has(url)) continue;
      seen.add(url);
      pdfUrls.push(url);
    }
    if (!pdfUrls.length) continue;
    const publishedFrom = /class=["'][^"']*miesiac[^"']*["'][^>]*>\s*(\d{4}-\d{2}-\d{2})/i.exec(card)?.[1] || null;
    out.push({ title, publishedFrom, pdfUrls, role });
  }
  return out;
}

async function fetchBoardItems() {
  const items = [];
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    let json;
    try {
      const text = await getText(listUrl(page), FETCH_OPTS);
      json = JSON.parse(text);
    } catch (err) {
      console.error(`  glogow: board list page ${page} failed: ${err.message}`);
      break;
    }
    const data = Array.isArray(json?.data) ? json.data : [];
    if (!data.length) break;
    for (const item of data) {
      const a = item?.attributes;
      if (!a?.slug) continue;
      items.push({ slug: a.slug, title: a.title || '', publishedFrom: a.publishedFrom || null });
    }
    const totalPages = json?.meta?.pages || 1;
    if (page >= totalPages) break;
  }
  return items;
}

async function fetchArticleMeta(slug) {
  let json;
  try {
    const text = await getText(articleUrl(slug), FETCH_OPTS);
    json = JSON.parse(text);
  } catch (err) {
    console.error(`  glogow: article ${slug} fetch failed: ${err.message}`);
    return null;
  }
  const a = json?.data?.attributes;
  if (!a) return null;
  const attachments = (Array.isArray(a.attachments) ? a.attachments : [])
    .filter((att) => att?.id && att?.attributes?.extension?.toLowerCase() === 'pdf')
    .map((att) => ({ id: att.id, name: att.attributes.originalName || '' }));
  return {
    title: a.title || '',
    fullUrl: a.fullUrl ? `${ORIGIN}${a.fullUrl}` : null,
    attachments,
  };
}

async function fetchAttachmentText(attachmentId) {
  try {
    return await pdfText(pdfDownloadUrl(attachmentId), FETCH_OPTS);
  } catch (err) {
    console.error(`  glogow: attachment ${attachmentId} pdf-text failed: ${err.message}`);
    return null;
  }
}

async function crawlOfficialFallback({ listings, land, resultRefs, knownUrls }) {
  let candidates = 0;
  let fetchedPages = 0;
  for (let page = 0; page < MAX_OFFICIAL_FALLBACK_PAGES; page++) {
    const url = page === 0 ? OFFICIAL_LIST : `${OFFICIAL_LIST}?start=${page * 4}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  glogow: official fallback page ${page + 1} failed: ${err.message}`);
      break;
    }
    fetchedPages++;
    const cards = parseOfficialFallbackPage(html);
    candidates += cards.length;
    for (const card of cards) {
      for (const pdfUrl of card.pdfUrls) {
        if (card.role === 'result' && knownUrls.has(pdfUrl)) continue;
        let body;
        try {
          body = await pdfText(pdfUrl, FETCH_OPTS);
        } catch (err) {
          console.error(`  glogow: official fallback PDF failed ${pdfUrl}: ${err.message}`);
          continue;
        }
        const recordText = buildRecordText({ title: card.title, body });
        if (isResultDoc(recordText)) {
          if (!isSaleAuction(recordText) || isLease(recordText)) continue;
          resultRefs.push({
            text: recordText,
            pdf_url: pdfUrl,
            auction_date: card.publishedFrom,
          });
          continue;
        }
        if (!isAnnouncement(recordText) || !isSaleAuction(recordText) || isLease(recordText)) continue;
        for (const parsed of parseAnnouncement(recordText)) {
          const enriched = { ...parsed, detail_url: pdfUrl, source_url: pdfUrl };
          (parsed.kind === 'grunt' ? land : listings).push(enriched);
        }
      }
    }
  }
  console.error(
    `  glogow: official fallback inspected ${fetchedPages} page(s), ${candidates} sale/result candidate card(s)`,
  );
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const knownUrls = await loadKnownSourceUrls('glogow');

  const boardItems = await fetchBoardItems();
  const landComplete = boardItems.length > 0;
  console.error(`  glogow: board has ${boardItems.length} item(s)`);

  if (boardItems.length === 0) {
    console.error('  glogow: archival BIP API unavailable; using bounded official city-portal fallback');
    await crawlOfficialFallback({ listings, land, resultRefs, knownUrls });
  }

  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let processed = 0;
  let skippedQualifiedList = 0;
  for (const item of boardItems) {
    if (isQualifiedBiddersList(buildRecordText({ title: item.title }))) {
      skippedQualifiedList++;
      continue;
    }

    if (processed >= MAX_DETAILS || Date.now() > deadline) {
      console.error(
        `  glogow: crawl budget reached (processed ${processed}/${boardItems.length}); remainder backfills next run`,
      );
      break;
    }
    processed++;

    const meta = await fetchArticleMeta(item.slug);
    if (!meta || !meta.attachments.length) continue;

    const looksLikeResult = /informacj\w*\s+o\s+wynik/i.test(item.title);
    const sourceUrl = meta.fullUrl || articleUrl(item.slug);

    for (const att of meta.attachments) {
      const pdfUrl = pdfDownloadUrl(att.id);
      if (looksLikeResult && knownUrls.has(pdfUrl)) continue;

      const body = await fetchAttachmentText(att.id);
      if (!body) continue;
      const recordText = buildRecordText({ title: meta.title, body });

      if (isResultDoc(recordText)) {
        if (!isSaleAuction(recordText) || isLease(recordText)) continue;
        resultRefs.push({
          text: recordText,
          pdf_url: pdfUrl,
          auction_date: item.publishedFrom ? item.publishedFrom.slice(0, 10) : null,
        });
      } else if (isAnnouncement(recordText)) {
        if (!isSaleAuction(recordText) || isLease(recordText)) continue;
        for (const parsed of parseAnnouncement(recordText)) {
          const enriched = { ...parsed, detail_url: pdfUrl, source_url: pdfUrl };
          (parsed.kind === 'grunt' ? land : listings).push(enriched);
        }
      }
    }
  }
  console.error(`  glogow: skipped ${skippedQualifiedList} qualified-bidders-list notice(s)`);

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeListings = listings.filter((l) => l.auction_date && l.auction_date >= todayIso);
  const activeLand = land.filter((l) => l.auction_date && l.auction_date >= todayIso);

  console.error(
    `  glogow: ${activeListings.length} active flat/unit/garage/house listing(s) (of ${listings.length} parsed), ` +
    `${activeLand.length} active land plot(s) (of ${land.length} parsed), ${resultRefs.length} result record(s)`,
  );
  return { listings: activeListings, land: activeLand, resultRefs, landComplete };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, landComplete } = await crawlPromise;
  return { listings, wykaz: [], land, land_complete: landComplete };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
