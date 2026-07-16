// Włocławek crawler — single board on the extranet "BIP w JST" CMS
// bip.wloclawek.eu (see config.js for the full rationale).
//
//   harvestNotices() [memoized] — crawls the board /2730/... (paginated
//     ?Page=N, bounded), then fetches + parses each notice page ONCE. Shared by
//     both entry points so one refresh run fetches each notice HTML a single
//     time.
//
//   crawlActive() — sale notices, address-keyed kinds only (flats/zabudowana
//     share/commercial/garaż): metadata + title + body prose drive
//     kind/round/price/date/address/area (no PDF needed — see parse.js). Land
//     (grunt) and lease (najem/dzierżawa) are detected and skipped.
//     Returns { listings, wykaz: [], land: [] }.
//
//   crawlResultDocs() — sale notices carrying a result attachment: extract its
//     text (docText for .docx — preferred, born-digital; pdfText for .pdf,
//     falling back to ocrPdf on a near-empty/\f-only extraction — the
//     documented scanned-PDF gotcha, confirmed live on Jagiellońska 2/4's
//     fixture) and return refs with ref.text (source:'html' -> refresh.js reads
//     ref.text directly). Returns Array<{ text, pdf_url, auction_date }>.
//
// No insecureTLS/browser-UA workaround needed — bip.wloclawek.eu serves the
// project's plain bot UA fine (confirmed live 2026-07-16, unlike e.g.
// bip.miastozabrze.pl/bip.gmina-sepolno.pl).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { parseNotice, parseResultDoc } from './parse.js';

const PORTAL = 'https://bip.wloclawek.eu';
const BOARD = `${PORTAL}/2730/ogloszenia-o-przetargach-nieruchomosci.html`;
const BOARD_DOCID = '2730'; // the board's own self-link — never a notice
const MAX_PAGES = 20; // observed ~9 pages / 81 items (2026-07); safety margin for growth

// Below this many non-whitespace chars, treat pdftotext output as a scanned
// PDF with no text layer (the \f-only junk the memory note warns about) and
// fall back to OCR.
const MIN_PDF_TEXT_CHARS = 40;

// Address-keyed kinds we emit as listings; grunt (parcel-keyed land) is
// skipped in v1 (see config.js scope note).
const LISTING_KINDS = new Set(['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz']);

/**
 * Extract notice-detail links from one board-index page.
 * Notice URL: /<docid>/726/<slug>.html (absolute or root-relative). Skips the
 * board's own self-link (docid 2730 / slug
 * "ogloszenia-o-przetargach-nieruchomosci.html").
 * @param {string} html @returns {Array<{docid:string, url:string}>}
 */
export function parseBoardLinks(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"]+)?\/(\d+)\/726\/([^"]+\.html))"/gi;
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

/**
 * Extract a result-attachment's text, born-digital first: a .docx via
 * docText (preferred — Kilińskiego 12A/1 carries a "dokument dostępny cyfrowo"
 * DOCX twin), else pdfText with an OCR fallback on a near-empty extraction
 * (Jagiellońska 2/4's attachment is a SCANNED pdf despite its "dokument
 * dostępny cyfrowo" filename — never trust the label, check the byte output).
 * @param {string} url @returns {Promise<string>}
 */
export async function extractResultText(url) {
  if (/\.docx?$/i.test(url)) {
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

// ---------------------------------------------------------------- harvest (memoized)

let noticesPromise = null;

async function harvestNotices() {
  // 1. Paginate the board, collecting unique notice links.
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
    if (added === 0) break; // no new notices on this page — stop paginating
  }
  console.error(`  wloclawek: ${links.length} notice link(s) across board`);

  // 2. Fetch + parse each notice page once.
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

// ---------------------------------------------------------------- crawlActive

export async function crawlActive() {
  const notices = await getNotices();
  const listings = [];

  for (const n of notices) {
    if (!n.is_sale) continue;
    if (!LISTING_KINDS.has(n.kind)) continue; // grunt/unknown -> skipped (see config.js)

    listings.push({
      kind: n.kind,
      address_raw: n.address_raw,
      address: n.address, // may be null — pipeline drops it
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

// ---------------------------------------------------------------- crawlResultDocs

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

// ---------------------------------------------------------------- CLI smoke test

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
