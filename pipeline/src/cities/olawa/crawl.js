import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  cleanText,
  isAnnouncement,
  isResult,
  isFlat,
  parseAnnouncement,
  parseResultDoc as parseResultDocFn,
} from './parse.js';

const ORIGIN = 'https://bip.um.olawa.pl';
const API = `${ORIGIN}/api`;
const MENU_ID = 258;
const PAGE_LIMIT = 50;
const MAX_PAGES = 4;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

function listUrl(offset, archived) {
  const p = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    offset: String(offset),
    archived: archived ? '1' : '0',
  });
  return `${API}/menu/${MENU_ID}/articles?${p.toString()}`;
}

const articleUrl = (id) => `${API}/articles/${id}`;
const downloadUrl = (link) => (link.startsWith('http') ? link : `${ORIGIN}/${link}`);

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  let allParsed = true;
  const seenArticleIds = new Set();

  for (const archived of [0, 1]) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = listUrl(page * PAGE_LIMIT, archived);
      let json;
      try {
        json = JSON.parse(await getText(url, FETCH_OPTS));
      } catch (err) {
        console.error(`  olawa: failed to fetch list page ${url}: ${err.message}`);
        allParsed = false;
        break;
      }

      const articles = Array.isArray(json?.articles) ? json.articles : [];
      if (!articles.length) break;

      console.error(`  olawa: found ${articles.length} article(s) on page ${page} (archived=${archived})`);

      for (const art of articles) {
        if (!art?.id || seenArticleIds.has(art.id)) continue;
        seenArticleIds.add(art.id);

        let artDetails;
        try {
          artDetails = JSON.parse(await getText(articleUrl(art.id), FETCH_OPTS));
        } catch (err) {
          console.error(`  olawa: failed to fetch article ${art.id}: ${err.message}`);
          allParsed = false;
          continue;
        }

        const title = artDetails.title || '';
        const attachments = Array.isArray(artDetails.attachments) ? artDetails.attachments : [];
        const pdfAtts = attachments.filter(
          (a) => a?.link && String(a?.extension || '').toLowerCase() === 'pdf',
        );

        for (const att of pdfAtts) {
          const fileUrl = downloadUrl(att.link);
          let text;
          try {
            text = await pdfText(fileUrl, FETCH_OPTS);
          } catch (err) {
            console.error(`  olawa: failed to parse pdf ${att.id}: ${err.message}`);
            allParsed = false;
            continue;
          }

          if (!text || text.trim().length < 50) continue;

          const isRes = isResult(att.name) || isResult(title);
          const isAnn = isAnnouncement(att.name) || isAnnouncement(title);

          if (isRes) {
            resultRefs.push({
              text,
              pdf_url: fileUrl,
              title: att.name || title,
              auction_date: null,
            });
          } else if (isAnn) {
            const artPageUrl = artDetails.link ? `${ORIGIN}/${artDetails.link}` : fileUrl;
            const rec = parseAnnouncement(text, title, artPageUrl);
            if (rec && rec.price) {
              if (isFlat(title, text)) {
                listings.push(rec);
              } else {
                land.push(rec);
              }
            }
          }
        }
      }

      const total = Number(json?.total) || 0;
      if ((page + 1) * PAGE_LIMIT >= total) break;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeListings = listings.filter((l) => !l.auction_date || l.auction_date >= today);
  const activeLand = land.filter((l) => !l.auction_date || l.auction_date >= today);

  console.error(
    `  olawa: ${activeListings.length} active flat listing(s), ${activeLand.length} active land, ` +
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
