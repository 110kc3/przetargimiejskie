
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

const ORIGIN = 'https://www.bip.staszow.pl';
const YEAR_CAT_IDS = [1293, 1261];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

function catUrl(catId) {
  return `${ORIGIN}/index.php?option=com_content&view=category&id=${catId}&Itemid=506`;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  let allParsed = true;
  const seenArticleUrls = new Set();

  for (const catId of YEAR_CAT_IDS) {
    const listUrl = catUrl(catId);
    let html;
    try {
      html = await getText(listUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  staszow: failed to fetch category ${catId}: ${err.message}`);
      allParsed = false;
      continue;
    }

    const re = new RegExp(
      `<a[^>]+href="([^"]*view=article[^"]*catid=${catId}[^"]*Itemid=506)"[^>]*>([\\s\\S]*?)<\\/a>`,
      'gi',
    );
    let m;
    const articles = [];
    while ((m = re.exec(html)) !== null) {
      const href = m[1].replace(/&amp;/g, '&');
      const title = cleanText(m[2]);
      if (href && title && !/drukuj/i.test(title) && !seenArticleUrls.has(href)) {
        seenArticleUrls.add(href);
        articles.push({ href, title });
      }
    }

    console.error(`  staszow: found ${articles.length} article(s) in category ${catId}`);

    for (const art of articles) {
      const isAnn = isAnnouncementTitle(art.title);
      const isRes = isResultTitle(art.title);
      if (!isAnn && !isRes) continue;

      const artUrl = art.href.startsWith('http') ? art.href : `${ORIGIN}${art.href.startsWith('/') ? '' : '/'}${art.href}`;
      let artHtml;
      try {
        artHtml = await getText(artUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  staszow: failed to fetch ${artUrl}: ${err.message}`);
        allParsed = false;
        continue;
      }

      const pdfMatches = artHtml.match(/href="([^"]*\/pliki\/[^"]*\.pdf)"/gi) || [];
      const pdfUrls = [];
      for (const pm of pdfMatches) {
        const u = pm.replace(/^href="|"$|'/gi, '');
        const fullUrl = u.startsWith('http') ? u : `${ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`;
        const encodedUrl = encodeURI(fullUrl);
        if (!pdfUrls.includes(encodedUrl)) pdfUrls.push(encodedUrl);
      }

      for (const pdfUrl of pdfUrls) {
        let docText;
        try {
          docText = await pdfText(pdfUrl, FETCH_OPTS);
        } catch (err) {
          console.error(`  staszow: failed to parse pdf ${pdfUrl}: ${err.message}`);
          allParsed = false;
          continue;
        }

        if (!docText || docText.trim().length < 50) continue;

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
    `  staszow: ${activeListings.length} active flat listing(s), ${activeLand.length} active land, ` +
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
