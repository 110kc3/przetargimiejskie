// Braniewo crawler — the city BIP's single property-sale board (node 120,
// "Nieruchomości do sprzedaży") on an older server-rendered Logonet variant.
// See config.js.
//
//   LIST (xml):  http://bip.braniewo.pl/artykuly/xml/120/{page}/1  (100 recs/page)
//   ARTICLE:     http://bip.braniewo.pl/artykul/120/{id}/{slug}     (HTML stub)
//   FILE:        http://bip.braniewo.pl/attachments/download/{attId}  (text PDF)
//
// The XML feed enumerates every article (url + tytuł + data). We route each by
// title (skip rentals/wykazy/lists/corrections; else result vs announcement),
// fetch the article HTML, pick its notice PDF (skipping the blank "ZGŁOSZENIE
// UDZIAŁU W PRZETARGU" application form bundled with announcements), extract its
// text (pdf-text.js), then re-confirm announcement-vs-result from the PDF body.
//
// source:'html' ⇒ result refs already carry `.text`; refresh.js calls
// crawlResultDocs() then crawlActive(), both awaiting one memoised crawl.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncement,
  isResultNotice,
  isApplicationForm,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'http://bip.braniewo.pl';
const BOARD = 120;

// Hard page cap so we never loop forever if the feed's <ilosc-stron> is missing
// (the board is ~2 pages of 100 today and grows a few records/year).
const MAX_PAGES = 20;

// Articles published more than this long ago that still lack a parseable auction
// date are treated as concluded: their publish date is stamped as the auction
// date so they age into the ARCHIVE instead of lingering as "current" rows.
const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const xmlUrl = (page) => `${ORIGIN}/artykuly/xml/${BOARD}/${page}/1`;
const fileUrl = (attId) => `${ORIGIN}/attachments/download/${attId}`;

/** Total number of XML pages from the feed (page 1). Falls back to MAX_PAGES. */
function pageCountFromXml(xml) {
  const m = /<ilosc-stron>\s*(\d+)\s*<\/ilosc-stron>/i.exec(xml || '');
  return m ? Math.min(Number(m[1]), MAX_PAGES) : 1;
}

/** Article refs { id, url, title, published_date } from one XML feed page. */
export function parseXmlPage(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let block;
  while ((block = re.exec(xml)) !== null) {
    const b = block[1];
    const url = (/<url>\s*([^<]+?)\s*<\/url>/i.exec(b) || [])[1] || '';
    const title = (/<tytul>\s*([\s\S]*?)\s*<\/tytul>/i.exec(b) || [])[1] || '';
    const dm = /<data>\s*(\d{2})\.(\d{2})\.(\d{4})\s*<\/data>/i.exec(b);
    const published_date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null;
    const idm = /\/artykul\/\d+\/(\d+)\//.exec(url);
    if (!idm) continue;
    out.push({ id: idm[1], url, title: title.trim(), published_date });
  }
  return out;
}

/** Attachment download URLs from an article HTML stub, in document order. */
export function attachmentUrls(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /attachments\/download\/(\d+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(fileUrl(m[1]));
  }
  return out;
}

/**
 * The notice PDF for an article: fetch each attachment's text and return the
 * first that is a real notice (announcement OR result), skipping the blank
 * ZGŁOSZENIE application form. @returns {Promise<{pdfUrl,text}|null>}
 */
async function articleNotice(id, url) {
  let html;
  try {
    html = await getText(url);
  } catch (err) {
    console.error(`  braniewo: article ${id} fetch failed: ${err.message}`);
    return null;
  }
  for (const pdfUrl of attachmentUrls(html)) {
    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  braniewo: PDF extract failed ${pdfUrl}: ${err.message}`);
      continue;
    }
    if (!text || isApplicationForm(text)) continue;
    return { pdfUrl, text };
  }
  return null;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats/units)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date }

  // Enumerate all articles via the XML feed.
  let refs = [];
  let firstXml;
  try {
    firstXml = await getText(xmlUrl(1));
  } catch (err) {
    console.error(`  braniewo: XML feed page 1 failed: ${err.message}`);
    return { listings, land, resultRefs };
  }
  const totalPages = pageCountFromXml(firstXml);
  refs = parseXmlPage(firstXml);
  for (let page = 2; page <= totalPages; page++) {
    try {
      refs = refs.concat(parseXmlPage(await getText(xmlUrl(page))));
    } catch (err) {
      console.error(`  braniewo: XML feed page ${page} failed: ${err.message}`);
      break;
    }
  }

  const seen = new Set();
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    if (isSkippableTitle(ref.title, ref.url)) continue;
    // A relevant article is a result OR an announcement; skip pure noise.
    if (!isResultTitle(ref.title, ref.url) && !isAnnouncementTitle(ref.title, ref.url)) continue;

    const notice = await articleNotice(ref.id, ref.url);
    if (!notice) {
      console.error(`  braniewo: no notice PDF on article ${ref.id} (${ref.title.slice(0, 60)})`);
      continue;
    }
    const { pdfUrl, text } = notice;

    // The PDF body header is authoritative for announcement-vs-result.
    if (isResultNotice(text)) {
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: ref.url, auction_date: null });
      continue;
    }

    const rec = parseAnnouncement(text);
    if (!rec) {
      console.error(`  braniewo WARN: announcement not parsed (article ${ref.id}, ${ref.title.slice(0, 60)})`);
      continue;
    }
    // Stale, dateless tenders → age into the archive via their publish date.
    if (!rec.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
      rec.auction_date = ref.published_date;
      rec.auction_date_estimated = true;
    }
    const enriched = { ...rec, detail_url: ref.url, source_url: pdfUrl };
    (rec.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  braniewo: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0]?.pdf_url },
      null,
      2,
    ) + '\n',
  );
}
