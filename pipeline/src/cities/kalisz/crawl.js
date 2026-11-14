
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText, parseAnnouncement, parseResultDoc } from './parse.js';

const ORIGIN = 'https://bip.kalisz.pl';
const BOARD_URL = 'https://www.bip.kalisz.pl/index.php?id=1400&s=1418&file=disp_o.php&r_ogl=SN';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const ARCHIVE_MAX_PAGES = 10;

function archiveUrl(year, page) {
  return `${ORIGIN}/index.php?id=1400&s=1418&file=archiwum_o.php&r_ogl=SN&rok=${year}` +
    `&nr_porcji=${page}&sorttype=asc&arch=1`;
}

const ITEM_START_RE = /<td width=25><font color=.#000080.><strong>(\d+)\.<\/strong><\/font><\/td><td>/g;
const TITLE_RE = /<\/strong><\/font><\/td><td>([\s\S]*?)<br \/><br \/><\/td>/;
const HREF_RE = /href="(\.\/ogloszenia\/sn\/[^"]+)"/;
const REF_RE = /Na podstawie:.*?<span[^>]*>([^<]*)<\/span>/;

export function itemsFromBoardHtml(html) {
  const marks = [...(html || '').matchAll(ITEM_START_RE)];
  const archIdx = html.indexOf('Archiwum dzia');
  const items = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : archIdx > 0 ? archIdx : html.length;
    const chunk = html.slice(start, end);
    const hrefM = HREF_RE.exec(chunk);
    if (!hrefM) continue;
    const titleM = TITLE_RE.exec(chunk);
    const refM = REF_RE.exec(chunk);
    items.push({
      title: titleM ? htmlToText(titleM[1]).trim() : '',
      pdfUrl: ORIGIN + hrefM[1].slice(1), // "./ogloszenia/sn/x.pdf" -> origin + "/ogloszenia/sn/x.pdf"
      ref: refM ? refM[1].trim() : null,
    });
  }
  return items;
}

export function itemsFromArchiveHtml(html) {
  const marks = [...(html || '').matchAll(/<div class="DivBipRow-1">/g)];
  const items = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : html.length;
    const chunk = html.slice(start, end);
    const titleM = /<div class="DivBipCell-70[^>]*>([\s\S]*?)<\/div>/.exec(chunk);
    const hrefM = HREF_RE.exec(chunk);
    if (!titleM || !hrefM) continue;
    const refM = REF_RE.exec(chunk);
    items.push({
      title: htmlToText(titleM[1]).trim(),
      pdfUrl: ORIGIN + hrefM[1].slice(1),
      ref: refM ? refM[1].trim() : null,
      archived: true,
    });
  }
  return items;
}

async function loadCurrentYearArchive() {
  const year = new Date().getFullYear();
  const items = [];
  const seen = new Set();
  for (let page = 1; page <= ARCHIVE_MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(archiveUrl(year, page), FETCH_OPTS);
    } catch (err) {
      console.error(`  kalisz archive ${year} page ${page} failed: ${err.message}`);
      break;
    }
    const found = itemsFromArchiveHtml(html);
    let added = 0;
    for (const item of found) {
      if (seen.has(item.pdfUrl)) continue;
      seen.add(item.pdfUrl);
      items.push(item);
      added++;
    }
    if (added === 0) break;
  }
  console.error(`  kalisz: ${items.length} document(s) discovered in the ${year} archive`);
  return items;
}

let crawlPromise = null;

async function crawlAll() {
  let html;
  try {
    html = await getText(BOARD_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  kalisz board fetch failed (${BOARD_URL}): ${err.message}`);
    return { listings: [], resultRefs: [] };
  }

  const currentItems = itemsFromBoardHtml(html);
  const archiveItems = await loadCurrentYearArchive();
  const known = await loadKnownSourceUrls('kalisz');
  const items = [];
  const seenPdfUrls = new Set();
  for (const item of [...currentItems, ...archiveItems]) {
    if (seenPdfUrls.has(item.pdfUrl)) continue;
    seenPdfUrls.add(item.pdfUrl);
    if (item.archived && known.has(item.pdfUrl)) continue;
    items.push(item);
  }
  console.error(
    `  kalisz: ${currentItems.length} current + ${archiveItems.length} archived document(s), ` +
      `${items.length} need classification`,
  );
  const listings = [];
  const resultRefs = [];
  let skipped = 0;
  let fetchedDocs = 0;

  for (const item of items) {
    let text;
    try {
      text = await pdfText(item.pdfUrl, { userAgent: BROWSER_UA });
      fetchedDocs++;
    } catch (err) {
      console.error(`  kalisz pdf-text failed (${item.pdfUrl} — "${item.title.slice(0, 60)}"): ${err.message}`);
      continue;
    }

    const rec = parseAnnouncement(text, { url: item.pdfUrl });
    if (rec) {
      listings.push(rec);
      continue;
    }
    const results = parseResultDoc(text, null, item.pdfUrl);
    if (results.length) {
      resultRefs.push({ text, pdf_url: item.pdfUrl, detail_url: item.pdfUrl, auction_date: null });
      continue;
    }
    skipped++;
  }

  console.error(
    `  kalisz: ${listings.length} listing(s), ${resultRefs.length} result notice(s) ` +
      `(${skipped} non-auction/land/unkeyable item(s) skipped of ${items.length})`,
  );
  return {
    listings,
    resultRefs,
    validEmpty: listings.length === 0
      && resultRefs.length === 0
      && (items.length === 0 || fetchedDocs > 0),
  };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, validEmpty } = await crawlPromise;
  return { listings, wykaz: [], land: [], valid_empty: validEmpty };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export { parseResultDoc };
