// Wałcz crawler — bip.walcz.pl (Joomla / GovArticle BIP template).
//
// Boards:
//   ANNOUNCEMENTS (Przetargi aktualne):
//     https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne
//   RESULTS (Przetargi zakończone):
//     https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-zakonczone
//   WYKAZ (Wykaz nieruchomości przeznaczonych do sprzedaży):
//     https://bip.walcz.pl/nieruchomosci/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy
//
// Fetches use `insecureTLS: true` with a browser User-Agent because bip.walcz.pl
// omits its intermediate CA (Certum DV TLS G2) on the wire.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  parseBoardArticles,
  extractAttachments,
  pickAnnouncementPdf,
  pickResultPdf,
  parseAnnouncementNotice,
  extractAddress,
  extractAuctionDate,
} from './parse.js';

const ORIGIN = 'https://bip.walcz.pl';
const ACTIVE_BOARD_URL = `${ORIGIN}/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne`;
const RESULTS_BOARD_URL = `${ORIGIN}/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-zakonczone`;
const WYKAZ_BOARD_URL = `${ORIGIN}/nieruchomosci/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy`;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const FETCH_OPTS = {
  insecureTLS: true,
  userAgent: BROWSER_UA,
};

async function getDocText(pdfUrl) {
  if (!pdfUrl) return '';
  try {
    const text = await pdfText(pdfUrl, FETCH_OPTS);
    if (text && text.trim().length > 100) return text;
  } catch (err) {
    console.error(`  walcz: pdfText failed on ${pdfUrl} (${err.message}), falling back to OCR`);
  }
  try {
    return await ocrPdf(pdfUrl, FETCH_OPTS);
  } catch (err) {
    console.error(`  walcz: OCR failed on ${pdfUrl} (${err.message})`);
    return '';
  }
}

export async function crawlActive() {
  const listings = [];
  const land = [];
  const wykaz = [];

  // 1. Crawl announcements board
  let activeHtml = '';
  try {
    activeHtml = await getText(`${ACTIVE_BOARD_URL}?limit=100`, FETCH_OPTS);
  } catch (err) {
    console.error(`  walcz: failed to fetch active board: ${err.message}`);
    throw err;
  }

  const activeArticles = parseBoardArticles(activeHtml, ORIGIN);
  console.error(`  walcz: found ${activeArticles.length} active announcement article(s)`);

  for (const item of activeArticles) {
    let detailHtml = '';
    try {
      detailHtml = await getText(item.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  walcz: failed to fetch detail page ${item.url}: ${err.message}`);
      continue;
    }

    const attachments = extractAttachments(detailHtml, ORIGIN);
    const pdfUrl = pickAnnouncementPdf(attachments);
    let docContent = '';
    if (pdfUrl) {
      docContent = await getDocText(pdfUrl);
    }

    const record = parseAnnouncementNotice({
      title: item.title,
      html: detailHtml,
      pdfText: docContent,
      detailUrl: item.url,
      pdfUrl,
    });

    if (record.kind === 'grunt') {
      land.push(record);
    } else {
      listings.push(record);
    }
  }

  // 2. Crawl wykaz board
  try {
    const wykazHtml = await getText(`${WYKAZ_BOARD_URL}?limit=100`, FETCH_OPTS);
    const wykazArticles = parseBoardArticles(wykazHtml, ORIGIN);
    for (const wItem of wykazArticles) {
      const kind = classifyKind(wItem.title);
      // Skip out-of-scope bezprzetargowe land plots
      if (kind === 'grunt' || /bezprzetargow/iu.test(wItem.title)) continue;

      let wDetailHtml = '';
      try {
        wDetailHtml = await getText(wItem.url, FETCH_OPTS);
      } catch {
        // proceed with title info
      }
      const address = extractAddress(wItem.title, wDetailHtml);
      if (address) {
        wykaz.push({
          address,
          kind: kind === 'unknown' ? 'mieszkalny' : kind,
          published_date: wItem.publishDate || null,
          price_pln: null,
          area_m2: null,
          detail_url: wItem.url,
          notes: null,
        });
      }
    }
  } catch (err) {
    console.error(`  walcz: failed to fetch wykaz board: ${err.message}`);
  }

  const valid_empty = listings.length === 0 && activeArticles.length > 0;
  const valid_empty_land = land.length === 0 && activeArticles.length > 0;

  console.error(`  walcz active crawl summary: ${listings.length} flat(s), ${land.length} land plot(s), ${wykaz.length} wykaz`);

  return {
    listings,
    wykaz,
    land,
    valid_empty,
    valid_empty_land,
  };
}

export async function crawlResultDocs() {
  let resultsHtml = '';
  try {
    resultsHtml = await getText(`${RESULTS_BOARD_URL}?limit=100`, FETCH_OPTS);
  } catch (err) {
    console.error(`  walcz: failed to fetch results board: ${err.message}`);
    return [];
  }

  const resultArticles = parseBoardArticles(resultsHtml, ORIGIN);
  if (resultArticles.length === 0) {
    return [];
  }

  const refs = [];
  for (const item of resultArticles) {
    let detailHtml = '';
    try {
      detailHtml = await getText(item.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  walcz: failed to fetch result detail page ${item.url}: ${err.message}`);
      continue;
    }

    const attachments = extractAttachments(detailHtml, ORIGIN);
    const pdfUrl = pickResultPdf(attachments);
    let text = '';
    if (pdfUrl) {
      text = await getDocText(pdfUrl);
    } else {
      text = detailHtml;
    }

    refs.push({
      text,
      pdf_url: pdfUrl || item.url,
      auction_date: extractAuctionDate(item.title, text),
      detail_url: item.url,
    });
  }

  return refs;
}
