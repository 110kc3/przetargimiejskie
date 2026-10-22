// Kluczbork crawler — bip.net v7.33 (Extranet) server HTML + born-digital PDF.
//
// Boards:
// - Announcements (452): https://www.bip.kluczbork.eu/452,przetargi-na-sprzedaz-i-dzierzawe-nieruchomosci
// - Results (690):       https://www.bip.kluczbork.eu/690,informacje-o-wynikach-przetargow
//
// Sub-pages: redir,452?tresc=NNNNN / redir,690?tresc=NNNNN
// PDF attachments: plik,NNNNN,slug.pdf
//
// source: 'html' ⇒ result refs carry `.text` (extracted via pdfText).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isCancellation,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://www.bip.kluczbork.eu';
const ANNOUNCE_BOARD_URL = `${ORIGIN}/452,przetargi-na-sprzedaz-i-dzierzawe-nieruchomosci`;
const RESULTS_BOARD_URL = `${ORIGIN}/690,informacje-o-wynikach-przetargow`;

const MIN_HISTORY_YEAR = 2020;
const CURRENT_YEAR = new Date().getFullYear();
const ANNOUNCE_MIN_YEAR = CURRENT_YEAR - 2; // Crawl active/recent announcements (2024-2026)

/**
 * Extract article links from a board page: Array<{ tresc, title, url }>
 */
export function parseBoardArticles(html, boardId) {
  const articles = [];
  const re = new RegExp(String.raw`<a[^>]*href="([^"]*redir,${boardId}\?tresc=(\d+))"[^>]*>([\s\S]*?)<\/a>`, 'gi');
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const tresc = m[2];
    if (seen.has(tresc)) continue;
    seen.add(tresc);
    const title = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const url = `${ORIGIN}/redir,${boardId}?tresc=${tresc}`;
    articles.push({ tresc, title, url });
  }
  return articles;
}

/**
 * Extract publication date from article HTML metryka.
 */
export function extractPublishDate(html) {
  const m = /data_publikacji[\s\S]*?<span class="system_metryka_wartosc">(\d{4}-\d{2}-\d{2})/i.exec(html);
  return m ? m[1] : null;
}

/**
 * Extract PDF attachment links from article HTML: Array<{ href, url, name }>
 */
export function parseArticlePdfLinks(html) {
  const pdfs = [];
  const re = /<a[^>]*href="([^"]*plik,(\d+),([^"]+\.pdf))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const href = m[1].replace(/^\.\//, '');
    const plikId = m[2];
    if (seen.has(plikId)) continue;
    seen.add(plikId);
    const rawName = m[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const url = href.startsWith('http') ? href : `${ORIGIN}/${href}`;
    pdfs.push({ url, name: rawName, filename: m[3] });
  }
  return pdfs;
}

/**
 * Select the main announcement PDF (skips auxiliary forms, regulations, maps).
 */
export function selectAnnouncementPdf(pdfs) {
  // Ignore auxiliary boilerplate files
  const filtered = pdfs.filter(
    (p) => !/oswiadczenie|o[śs]wiadczenie|regulamin|mapka|wypis|wipis|zalacznik|za[łl][ąa]cznik/i.test(p.filename),
  );
  // Match announcement PDF
  const main = filtered.find((p) => /ogloszen|og[łl]oszen|przetarg/i.test(p.filename));
  return main || filtered[0] || null;
}

/**
 * Select the main result PDF.
 */
export function selectResultPdf(pdfs) {
  const main = pdfs.find((p) => /wynik|informacja-o-wyniku|gnp-6840/i.test(p.filename));
  return main || pdfs[0] || null;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  let boardAnnReached = false;
  let boardResReached = false;

  // 1. Crawl announcements board (452)
  console.error('  kluczbork: fetching announcement board ...');
  const annBoardHtml = await getText(ANNOUNCE_BOARD_URL);
  if (annBoardHtml) {
    boardAnnReached = true;
    const allArticles = parseBoardArticles(annBoardHtml, '452');
    const saleArticles = allArticles.filter((a) => {
      if (isLease(a.title) || isCancellation(a.title)) return false;
      const yrMatch = a.title.match(/20(2[0-9]|1[0-9])/);
      const yr = yrMatch ? parseInt('20' + yrMatch[1], 10) : null;
      if (yr && yr < ANNOUNCE_MIN_YEAR) return false;
      return isSaleAuction(a.title) || /lokal|mieszka|dzia[łl]k|nieruchomo/i.test(a.title);
    });

    console.error(`  kluczbork: found ${saleArticles.length} candidate announcement article(s)`);

    for (const art of saleArticles) {
      try {
        const pageHtml = await getText(art.url);
        if (!pageHtml) continue;
        const publishDate = extractPublishDate(pageHtml);
        const pdfs = parseArticlePdfLinks(pageHtml);
        const annPdf = selectAnnouncementPdf(pdfs);
        if (!annPdf) continue;

        let txt = await pdfText(annPdf.url);
        if (!txt || txt.replace(/\s+/g, '').length < 40) {
          txt = await ocrPdf(annPdf.url);
        }
        if (!txt || txt.length < 50) continue;

        const recs = parseAnnouncement(txt, {
          source_url: annPdf.url,
          detail_url: art.url,
          publishDate,
        });

        for (const r of recs) {
          if (r.kind === 'grunt') {
            land.push(r);
          } else {
            listings.push(r);
          }
        }
      } catch (err) {
        console.error(`  kluczbork: error processing announcement ${art.url}: ${err.message}`);
      }
    }
  }

  // 2. Crawl results board (690)
  console.error('  kluczbork: fetching results board ...');
  const resBoardHtml = await getText(RESULTS_BOARD_URL);
  if (resBoardHtml) {
    boardResReached = true;
    const knownUrls = await loadKnownSourceUrls('kluczbork', { includeLand: true }).catch(() => new Set());
    const allArticles = parseBoardArticles(resBoardHtml, '690');
    const resultArticles = allArticles.filter((a) => {
      if (isLease(a.title) || /lista\s+os[oó]b\s+zakwalifikowanych/i.test(a.title)) return false;
      const yrMatch = a.title.match(/20(2[0-9]|1[0-9])/);
      const yr = yrMatch ? parseInt('20' + yrMatch[1], 10) : null;
      if (yr && yr < MIN_HISTORY_YEAR) return false;
      return true;
    });

    console.error(`  kluczbork: found ${resultArticles.length} result article(s) (>= ${MIN_HISTORY_YEAR})`);

    for (const art of resultArticles) {
      if (knownUrls.has(art.url)) continue;
      try {
        const pageHtml = await getText(art.url);
        if (!pageHtml) continue;
        const pdfs = parseArticlePdfLinks(pageHtml);
        const resPdf = selectResultPdf(pdfs);
        if (!resPdf) continue;
        if (knownUrls.has(resPdf.url)) continue;

        let txt = await pdfText(resPdf.url);
        if (!txt || txt.replace(/\s+/g, '').length < 40) {
          txt = await ocrPdf(resPdf.url);
        }
        if (!txt || txt.length < 50) continue;
        const auctionDate = auctionDateFromText(txt);

        resultRefs.push({
          text: txt,
          source_url: art.url,
          pdf_url: resPdf.url,
          auction_date: auctionDate,
        });
      } catch (err) {
        console.error(`  kluczbork: error processing result doc ${art.url}: ${err.message}`);
      }
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeUpcoming = listings.filter((l) => !l.auction_date || l.auction_date >= todayIso);
  const landUpcoming = land.filter((l) => !l.auction_date || l.auction_date >= todayIso);

  const valid_empty = Boolean(boardAnnReached && activeUpcoming.length === 0);
  const valid_empty_land = Boolean(boardAnnReached && landUpcoming.length === 0);

  console.error(
    `  kluczbork: ${listings.length} flat listing(s) (${activeUpcoming.length} upcoming, valid_empty=${valid_empty}), ${land.length} land plot(s), ${resultRefs.length} result document(s)`,
  );

  return {
    listings,
    wykaz: [],
    land,
    resultRefs,
    valid_empty,
    valid_empty_land,
  };
}

/** Concluded records (achieved-price stream). */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const { resultRefs } = await crawlPromise;
  return resultRefs;
}

/** Active listings + wykaz stream. */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return {
    listings,
    wykaz,
    land,
    valid_empty,
    valid_empty_land,
  };
}

export { parseResultDoc };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listingsCount: active.listings.length,
        landCount: active.land.length,
        validEmpty: active.valid_empty,
        validEmptyLand: active.valid_empty_land,
        resultsCount: results.length,
        sampleListing: active.listings[0],
        sampleLand: active.land[0],
        sampleResult: results[0] ? { ...results[0], text: results[0].text.slice(0, 200) } : null,
      },
      null,
      2,
    ) + '\n',
  );
}
