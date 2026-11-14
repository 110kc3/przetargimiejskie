import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { parseNotice, parseResultDoc } from './parse.js';

const PORTAL = 'https://bip.wloclawek.eu';
const BOARD = `${PORTAL}/2730/ogloszenia-o-przetargach-nieruchomosci.html`;
const BOARD_DOCID = '2730';
const MAX_PAGES = 20;

const MIN_PDF_TEXT_CHARS = 40;

const LISTING_KINDS = new Set(['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz']);

export function parseBoardLinks(html) {
  const out = [];
  const seen = new Set();
  const re = /<div[^>]*class="cct-item__name"[^>]*>\s*<a href="((?:https?:\/\/[^"]+)?\/(\d+)\/(?:726\/)?([^"]+\.html))"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const docid = m[2];
    const slug = m[3];
    if (docid === BOARD_DOCID || /^ogloszenia-o-przetargach-nieruchomosci\.html/i.test(slug)) continue;
    if (seen.has(docid)) continue;
    seen.add(docid);
    let url = m[1];
    if (!/^https?:\/\//i.test(url)) url = PORTAL + url;
    out.push({ docid, url });
  }
  return out;
}

export async function extractResultText(url) {
  if (/\.docx?(?:[?#]|$)/i.test(url)) {
    return docText(url);
  }
  try {
    const text = await pdfText(url);
    if (text && text.trim().length >= MIN_PDF_TEXT_CHARS) return text;
    console.error(`  wloclawek: pdfText near-empty for ${url} — trying OCR`);
  } catch (err) {
    console.error(`  wloclawek: pdfText failed (${url}): ${err.message} — trying OCR`);
  }
  try {
    return await ocrPdf(url);
  } catch (err) {
    console.error(`  wloclawek: OCR failed (${url}): ${err.message}`);
    return '';
  }
}


let noticesPromise = null;

async function harvestNotices() {
  const links = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BOARD : `${BOARD}?Page=${page}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  wloclawek: board page ${page} fetch failed (${url}): ${err.message}`);
      break;
    }
    const found = parseBoardLinks(html);
    let added = 0;
    for (const l of found) {
      if (seen.has(l.docid)) continue;
      seen.add(l.docid);
      links.push(l);
      added++;
    }
    if (added === 0) break;
  }
  console.error(`  wloclawek: ${links.length} notice link(s) across board`);

  const notices = [];
  for (const l of links) {
    let html;
    try {
      html = await getText(l.url);
    } catch (err) {
      console.error(`  wloclawek: notice fetch failed (${l.url}): ${err.message}`);
      continue;
    }
    notices.push(parseNotice(html, l.url));
  }
  return notices;
}

function getNotices() {
  noticesPromise ??= harvestNotices();
  return noticesPromise;
}


export async function crawlActive() {
  const notices = await getNotices();
  const listings = [];

  for (const n of notices) {
    if (!n.is_sale) continue;
    if (!LISTING_KINDS.has(n.kind)) continue;

    listings.push({
      kind: n.kind,
      address_raw: n.address_raw,
      address: n.address,
      round: n.round,
      starting_price_pln: n.starting_price_pln,
      auction_date: n.auction_date,
      area_m2: n.area_m2,
      published_year: n.published_year,
      detail_url: n.url,
    });
  }

  console.error(`  wloclawek crawlActive: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const notices = await getNotices();
  const refs = [];

  for (const n of notices) {
    if (!n.is_sale || !LISTING_KINDS.has(n.kind) || !n.resultDocUrl) continue;
    let text;
    try {
      text = await extractResultText(n.resultDocUrl);
    } catch (err) {
      console.error(`  wloclawek: result doc failed (${n.resultDocUrl}): ${err.message}`);
      continue;
    }
    if (!text || !text.trim()) continue;
    refs.push({ text, pdf_url: n.resultDocUrl, auction_date: n.auction_date });
  }

  console.error(`  wloclawek crawlResultDocs: ${refs.length} result doc(s)`);
  return refs;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const refs = await crawlResultDocs();
  const records = refs.flatMap((r) => parseResultDoc(r.text, r.auction_date, r.pdf_url));
  process.stdout.write(JSON.stringify({
    listings: listings.length,
    resultDocs: refs.length,
    resultRecords: records.length,
    sampleListing: listings[0],
    sampleResult: records[0],
  }, null, 2) + '\n');
}
