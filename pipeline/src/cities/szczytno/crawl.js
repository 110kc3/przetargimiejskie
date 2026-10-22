// Szczytno crawler — city BIP bip.um.szczytno.pl (Bootstrap + DataTables vendor CMS).
//
// Boards crawled:
//   - Active announcements:  https://bip.um.szczytno.pl/artykul/ogloszenia-o-przetargach
//   - Wykaz designations:    https://bip.um.szczytno.pl/artykul/wykaz-nieruchomosci-2
//   - Results stream:        https://bip.um.szczytno.pl/artykul/informacja-o-wynikach-przetargow
//
// Host returns 403 to default bot UA; all requests pass BROWSER_UA via FETCH_OPTS.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseBoardTable,
  extractTresc,
  extractAttachmentUrls,
  isSkippableTitle,
  isBezprzetargowyTitle,
  parseAnnouncement,
  parseWykaz,
} from './parse.js';

const ORIGIN = 'https://bip.um.szczytno.pl';
const BOARD_ANNOUNCEMENTS = `${ORIGIN}/artykul/ogloszenia-o-przetargach`;
const BOARD_WYKAZ = `${ORIGIN}/artykul/wykaz-nieruchomosci-2`;
const BOARD_RESULTS = `${ORIGIN}/artykul/informacja-o-wynikach-przetargow`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FETCH_OPTS = { userAgent: BROWSER_UA };

/**
 * Fetch detail HTML and any attached .doc/.docx/.pdf text.
 * @param {string} url
 * @param {string} title
 * @returns {Promise<string>}
 */
async function fetchFullArticleText(url, title = '') {
  let html = '';
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    console.error(`  szczytno: failed to fetch ${url}: ${err.message}`);
    return title;
  }

  const tresc = extractTresc(html);
  const attUrls = extractAttachmentUrls(html, ORIGIN);

  let attText = '';
  for (const attUrl of attUrls) {
    try {
      if (/\.(?:doc|docx)$/i.test(attUrl) || attUrl.includes('.doc')) {
        const txt = await docText(attUrl, FETCH_OPTS);
        if (txt) attText += `\n${txt}`;
      } else if (/\.pdf$/i.test(attUrl) || attUrl.includes('.pdf')) {
        const txt = await pdfText(attUrl, FETCH_OPTS);
        if (txt) attText += `\n${txt}`;
      }
    } catch (err) {
      console.error(`  szczytno: failed to extract attachment ${attUrl}: ${err.message}`);
    }
  }

  return `${title}\n${tresc}\n${attText}`.trim();
}

/**
 * Crawl active auction announcements and pre-auction wykaz designations.
 * @returns {Promise<{ listings: Array, wykaz: Array, land: Array, valid_empty: boolean, valid_empty_land: boolean }>}
 */
export async function crawlActive() {
  const listings = [];
  const land = [];
  const wykaz = [];

  let announcementsChecked = false;
  let wykazChecked = false;

  // 1. Announcements board
  try {
    const annHtml = await getText(BOARD_ANNOUNCEMENTS, FETCH_OPTS);
    const annItems = parseBoardTable(annHtml, ORIGIN);
    announcementsChecked = annItems.length > 0;

    for (const item of annItems) {
      if (isSkippableTitle(item.title)) continue;
      const fullText = await fetchFullArticleText(item.url, item.title);
      const recs = parseAnnouncement(fullText, item.url);
      for (const rec of recs) {
        if (!rec) continue;
        if (rec.kind === 'grunt') {
          land.push(rec);
        } else {
          listings.push(rec);
        }
      }
    }
  } catch (err) {
    console.error(`  szczytno crawlActive announcements failed: ${err.message}`);
  }

  // 2. Wykaz board (only properties: flats, commercial, buildings with address)
  try {
    const wykazHtml = await getText(BOARD_WYKAZ, FETCH_OPTS);
    const wykazItems = parseBoardTable(wykazHtml, ORIGIN);
    wykazChecked = wykazItems.length > 0;

    for (const item of wykazItems) {
      if (isSkippableTitle(item.title) || isBezprzetargowyTitle(item.title)) continue;
      // Skip pure land parcels from wykaz (land is not address-keyed)
      if (!/lokal|mieszka|zabudow/i.test(item.title)) continue;

      const fullText = await fetchFullArticleText(item.url, item.title);
      const rec = parseWykaz(fullText, item.url);
      if (rec && rec.address) {
        wykaz.push(rec);
      }
    }
  } catch (err) {
    console.error(`  szczytno crawlActive wykaz failed: ${err.message}`);
  }

  const valid_empty = listings.length === 0 && announcementsChecked;
  const valid_empty_land = land.length === 0 && announcementsChecked;

  console.error(
    `  szczytno crawlActive: ${listings.length} property listing(s), ${wykaz.length} wykaz, ${land.length} land plot(s)`,
  );

  return {
    listings,
    wykaz,
    land,
    valid_empty,
    valid_empty_land,
  };
}

/**
 * Crawl concluded auction result notices (achieved-price stream).
 * @returns {Promise<Array<{ text: string, pdf_url: string, auction_date: string|null }>>}
 */
export async function crawlResultDocs() {
  const resultRefs = [];

  let knownUrls;
  try {
    knownUrls = await loadKnownSourceUrls('szczytno', { includeLand: true });
  } catch {
    knownUrls = new Set();
  }

  try {
    const html = await getText(BOARD_RESULTS, FETCH_OPTS);
    const items = parseBoardTable(html, ORIGIN);

    for (const item of items) {
      if (isSkippableTitle(item.title)) continue;
      if (knownUrls.has(item.url)) continue;

      let detailHtml = '';
      try {
        detailHtml = await getText(item.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  szczytno result fetch failed for ${item.url}: ${err.message}`);
        continue;
      }

      const tresc = extractTresc(detailHtml);
      const attUrls = extractAttachmentUrls(detailHtml, ORIGIN);

      let attText = '';
      for (const attUrl of attUrls) {
        try {
          if (/\.(?:doc|docx)$/i.test(attUrl) || attUrl.includes('.doc')) {
            const txt = await docText(attUrl, FETCH_OPTS);
            if (txt) attText += `\n${txt}`;
          } else if (/\.pdf$/i.test(attUrl) || attUrl.includes('.pdf')) {
            const txt = await pdfText(attUrl, FETCH_OPTS);
            if (txt) attText += `\n${txt}`;
          }
        } catch (err) {
          console.error(`  szczytno: failed to extract result attachment ${attUrl}: ${err.message}`);
        }
      }

      const fullText = `${item.title}\n${tresc}\n${attText}`.trim();
      const fallbackDate = item.date ? item.date.slice(0, 10) : null;

      resultRefs.push({
        text: fullText,
        pdf_url: item.url,
        auction_date: fallbackDate,
      });
    }
  } catch (err) {
    console.error(`  szczytno crawlResultDocs failed: ${err.message}`);
  }

  console.error(`  szczytno crawlResultDocs: ${resultRefs.length} result doc ref(s)`);
  return resultRefs;
}
