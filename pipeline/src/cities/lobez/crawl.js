// Łobez crawler — bip.lobez.pl
//
// Walks year subcategories (/1508-2026.html, /1286-2025.html) of /342-zbycie.html.
// Downloads e-signed text-PDF attachments and extracts text via pdfText().

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  cleanText,
  isAnnouncementTitle,
  isResultTitle,
  isFlat,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.lobez.pl';
const YEAR_PATHS = ['/1508-2026.html', '/1286-2025.html'];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  let allParsed = true;
  const seenArticleUrls = new Set();

  for (const yearPath of YEAR_PATHS) {
    let html;
    try {
      html = await getText(`${ORIGIN}${yearPath}`, FETCH_OPTS);
    } catch (err) {
      console.error(`  lobez: failed to fetch year page ${yearPath}: ${err.message}`);
      allParsed = false;
      continue;
    }

    const linkRe = /<a[^>]+href="([^"]*\.html\??)"[^>]*class="[^"]*registry__table_row_name[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const articles = [];
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1].replace(/\?$/, '');
      const title = cleanText(m[2]);
      if (href && title && !seenArticleUrls.has(href)) {
        seenArticleUrls.add(href);
        articles.push({ href, title });
      }
    }

    console.error(`  lobez: found ${articles.length} article(s) in ${yearPath}`);

    for (const art of articles) {
      const artUrl = art.href.startsWith('http') ? art.href : `${ORIGIN}/${art.href}`;
      let artHtml;
      try {
        artHtml = await getText(artUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lobez: failed to fetch ${artUrl}: ${err.message}`);
        allParsed = false;
        continue;
      }

      // Collect attachments
      const pdfRe = /<a[^>]+href="([^"]*files\/file_add\/download\/[^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
      let pm;
      const pdfs = [];
      while ((pm = pdfRe.exec(artHtml)) !== null) {
        const href = pm[1];
        const desc = cleanText(pm[2]);
        const fullPdfUrl = href.startsWith('http') ? href : `${ORIGIN}/${href}`;
        pdfs.push({ url: fullPdfUrl, desc });
      }

      for (const pdf of pdfs) {
        let text;
        try {
          text = await pdfText(pdf.url, FETCH_OPTS);
        } catch (err) {
          console.error(`  lobez: failed to parse pdf ${pdf.url}: ${err.message}`);
          allParsed = false;
          continue;
        }

        if (!text || text.trim().length < 50) continue;

        if (isResultTitle(pdf.desc) || isResultTitle(pdf.url)) {
          resultRefs.push({
            text,
            pdf_url: pdf.url,
            title: pdf.desc || art.title,
            auction_date: null,
          });
        } else if (isAnnouncementTitle(pdf.desc) || isAnnouncementTitle(art.title)) {
          const rec = parseAnnouncement(text, pdf.desc || art.title, artUrl);
          if (rec && rec.price) {
            if (isFlat(art.title, text)) {
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
    `  lobez: ${activeListings.length} active flat listing(s), ${activeLand.length} active land, ` +
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
