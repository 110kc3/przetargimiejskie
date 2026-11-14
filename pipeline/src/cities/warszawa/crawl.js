import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseEtoListPage,
  isResultNoticeTitle,
  articleTextFromHtml,
  parseDetailText,
  attachmentUrlFromEtoDetail,
  parseAmwPdfText,
} from './parse.js';

const ETO_LIST_URL = 'https://eto.um.warszawa.pl/category/165/announcement';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  let listHtml;
  try {
    listHtml = await getText(ETO_LIST_URL, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error('  warszawa: ETO list fetch failed: ' + err.message);
    return { listings, resultRefs };
  }

  const items = parseEtoListPage(listHtml);
  console.error('  warszawa: ETO list returned ' + items.length + ' items');

  const knownUrls = await loadKnownSourceUrls('warszawa');
  const seenUrls = new Set();

  for (const item of items) {
    const url = item.detail_url;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    if (isResultNoticeTitle(item.title)) {
      if (knownUrls.has(url)) {
        console.error('  warszawa result: already captured ' + url + ' -- skipping');
        continue;
      }
      let detailHtml = '';
      try {
        detailHtml = await getText(url, { userAgent: BROWSER_UA, retries: 1 });
      } catch (err) {
        console.error('  warszawa result detail fetch failed (' + url + '): ' + err.message);
        continue;
      }
      const text = articleTextFromHtml(detailHtml) || '';
      if (!text) {
        console.error('  warszawa result: no article text found on ' + url);
        continue;
      }
      resultRefs.push({ text, pdf_url: url, auction_date: null });
      console.error('  warszawa result: captured "' + item.title.slice(0, 60) + '"');
      continue;
    }

    if (item.kind && item.kind !== 'mieszkalny') {
      console.error('  warszawa: skipping non-flat "' + item.title.slice(0, 60) + '" (kind=' + item.kind + ')');
      continue;
    }

    if (item.is_eto_hosted) continue;

    let detailHtml = '';
    try {
      detailHtml = await getText(url, { userAgent: BROWSER_UA, retries: 1 });
    } catch (err) {
      console.error('  warszawa detail fetch failed (' + url + '): ' + err.message);
      listings.push({
        kind: item.kind ?? 'mieszkalny',
        address_raw: item.title,
        address: null,
        auction_date: null,
        published_date: item.published_from,
        round: null,
        area_m2: null,
        starting_price_pln: null,
        detail_url: url,
        eto_nr: item.eto_nr,
        source: 'city',
      });
      continue;
    }

    const articleText = articleTextFromHtml(detailHtml);
    const parsed = parseDetailText(articleText);

    listings.push({
      kind: item.kind ?? 'mieszkalny',
      address_raw: parsed.address_raw ?? item.title,
      address: parsed.address,
      auction_date: parsed.auction_date,
      published_date: item.published_from,
      round: parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: null,
      detail_url: url,
      eto_nr: item.eto_nr,
      source: 'city',
    });
    console.error(
      '  warszawa: "' + item.title.slice(0, 55) + '" -> ' + (parsed.address_raw ?? 'no address'),
    );
  }

  console.error(
    '  warszawa: ' + listings.length + ' active listing(s), ' +
    resultRefs.length + ' result notice(s) captured',
  );
  return { listings, resultRefs };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [] };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
  console.error('Total: ' + listings.length + ' active listing(s)');
}
