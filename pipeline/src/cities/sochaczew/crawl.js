// Sochaczew crawler — bip.sochaczew.pl
//
// Walks /aktualnosci/ feed on 2ClickPortal BIP.
// Downloads attachment PDFs and extracts text with pdfText() (falling back to ocrPdf()).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  cleanText,
  isAnnouncementTitle,
  isResultTitle,
  isFlat,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.sochaczew.pl';
const MAX_PAGES = 5;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

function pageUrl(page) {
  if (page === 1) return `${ORIGIN}/aktualnosci/`;
  return `${ORIGIN}/aktualnosci/${page}.html`;
}

async function extractDocText(pdfUrl) {
  try {
    const text = await pdfText(pdfUrl, FETCH_OPTS);
    if (text && text.trim().length >= 50) {
      return text;
    }
  } catch (err) {
    // fall through to OCR
  }
  try {
    const text = await ocrPdf(pdfUrl, FETCH_OPTS);
    return text || '';
  } catch (err) {
    console.error(`  sochaczew: OCR failed for ${pdfUrl}: ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  let allParsed = true;
  const seenArticleUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const listUrl = pageUrl(page);
    let html;
    try {
      html = await getText(listUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  sochaczew: failed to fetch page ${listUrl}: ${err.message}`);
      allParsed = false;
      break;
    }

    const linkRe = /<a[^>]+href="(\/aktualnosci\/[^"]+\.html)"[^>]*title="([^"]*)"/gi;
    let m;
    const articles = [];
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1];
      const title = cleanText(m[2].replace(/^Kliknij aby przejść do\s+/i, ''));
      if (href && title && !seenArticleUrls.has(href)) {
        seenArticleUrls.add(href);
        articles.push({ href, title });
      }
    }

    if (!articles.length) break;
    console.error(`  sochaczew: page ${page} has ${articles.length} article(s)`);

    for (const art of articles) {
      const isAnn = isAnnouncementTitle(art.title);
      const isRes = isResultTitle(art.title);
      if (!isAnn && !isRes) continue;

      const artUrl = `${ORIGIN}${art.href}`;
      let artHtml;
      try {
        artHtml = await getText(artUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  sochaczew: failed to fetch ${artUrl}: ${err.message}`);
        allParsed = false;
        continue;
      }

      // Attachments
      const pdfMatches = artHtml.match(/href="([^"]*(?:files|zalaczniki)[^"]*\.pdf)"/gi) || [];
      const pdfUrls = [];
      for (const pm of pdfMatches) {
        const u = pm.replace(/^href="|"$|'/gi, '');
        const fullUrl = u.startsWith('http') ? u : `${ORIGIN}/${u.startsWith('/') ? u.slice(1) : u}`;
        if (!pdfUrls.includes(fullUrl)) pdfUrls.push(fullUrl);
      }

      for (const pdfUrl of pdfUrls) {
        const docText = await extractDocText(pdfUrl);
        if (!docText) continue;

        if (isRes || isResultTitle(pdfUrl)) {
          resultRefs.push({
            text: docText,
            pdf_url: pdfUrl,
            title: art.title,
            auction_date: null,
          });
        } else if (isAnn) {
          const rec = parseAnnouncement(docText, art.title, artUrl);
          if (rec && rec.price) {
            if (isFlat(art.title, docText)) {
              listings.push(rec);
            } else {
              land.push(rec);
            }
          }
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeListings = listings.filter((l) => !l.auction_date || l.auction_date >= today);
  const activeLand = land.filter((l) => !l.auction_date || l.auction_date >= today);

  console.error(
    `  sochaczew: ${activeListings.length} active flat listing(s), ${activeLand.length} active land, ` +
    `${resultRefs.length} result doc(s)`,
  );

  return {
    listings: activeListings,
    land: activeLand,
    resultRefs,
    valid_empty: allParsed && activeListings.length === 0,
    valid_empty_land: allParsed && activeLand.length === 0,
  };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const res = await crawlPromise;
  return {
    listings: res.listings,
    wykaz: [],
    land: res.land,
    valid_empty: res.valid_empty,
    valid_empty_land: res.valid_empty_land,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  const res = await crawlPromise;
  return res.resultRefs;
}

export function parseResultDoc(ref) {
  return parseResultDocFn(ref);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sample: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
