// Scrapes the four "currently active" pages on zgm-gliwice.pl:
//   /przetargi-lokale-mieszkalne/   (residential apartments)
//   /przetargi-garaze/              (garages)
//   /przetargi-lokale-uzytkowe/     (commercial/utility)
//   /wykaz-lokali-przeznaczonych-do-sprzedazy-w-przetargu/  (announced but not yet scheduled)
//
// Active pages use Elementor "image box" cards with one consistent text format:
//   "<address> - <DD.MM.YYYY> r. <area> m2 - <price> zł"
// The wykaz page uses a different template — short entries with "wykaz nr X address".

import { getText } from '../../core/fetch.js';
import { parseAddress } from '../../core/normalize.js';

const PAGES = {
  mieszkalny: 'https://zgm-gliwice.pl/przetargi-lokale-mieszkalne/',
  garaz:      'https://zgm-gliwice.pl/przetargi-garaze/',
  uzytkowy:   'https://zgm-gliwice.pl/przetargi-lokale-uzytkowe/',
};
const WYKAZ_URL = 'https://zgm-gliwice.pl/wykaz-lokali-przeznaczonych-do-sprzedazy-w-przetargu/';

/**
 * @typedef {object} ActiveListing
 * @property {'mieszkalny'|'garaz'|'uzytkowy'} kind
 * @property {string} address_raw
 * @property {ReturnType<typeof parseAddress>|null} address
 * @property {string|null} auction_date     ISO YYYY-MM-DD
 * @property {number|null} area_m2
 * @property {number|null} starting_price_pln
 * @property {string} detail_url
 */

/**
 * @typedef {object} WykazEntry
 * @property {string} wykaz_no              e.g. "ZGM/DS/66/2026"
 * @property {string} address_raw
 * @property {ReturnType<typeof parseAddress>|null} address
 * @property {string|null} published_date   ISO YYYY-MM-DD
 */

// ImageBox content block (Elementor). Capture inner HTML, then we strip tags.
const BOX_RE =
  /<div class="elementor-image-box-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
const HREF_RE = /href="([^"]+)"/i;

const CARD_TEXT_RE =
  /^(.+?)\s+-\s+(\d{2})\.(\d{2})\.(\d{4})\s*r\.\s+([\d.,]+)\s*m[2²]\s*-\s*([\d.,:;\s]+)\s*z[łl]/i;

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = numStr.replace(/[:;]/g, '.').replace(/\s+/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.](\d{2}))?$/.exec(cleaned);
  if (!m) return null;
  return Number(m[1].replace(/[.,]/g, ''));
}

function parseArea(numStr) {
  if (!numStr) return null;
  // Polish decimal comma: "86,79"
  const n = Number(numStr.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** @param {string} html @param {ActiveListing['kind']} kind @returns {ActiveListing[]} */
function parseActivePage(html, kind) {
  const out = [];
  BOX_RE.lastIndex = 0;
  let m;
  while ((m = BOX_RE.exec(html)) !== null) {
    const inner = m[1];
    const text = stripTags(inner);
    const hrefM = HREF_RE.exec(inner);
    const detailUrl = hrefM ? hrefM[1] : '';
    const cm = CARD_TEXT_RE.exec(text);
    if (!cm) continue; // skip non-listing image boxes (page headers etc.)
    const [, addressRaw, dd, mm, yyyy, areaStr, priceStr] = cm;
    out.push({
      kind,
      address_raw: addressRaw.trim(),
      address: parseAddress(addressRaw),
      auction_date: `${yyyy}-${mm}-${dd}`,
      area_m2: parseArea(areaStr),
      starting_price_pln: parsePLN(priceStr),
      detail_url: detailUrl,
    });
  }
  return out;
}

// Wykaz entries look like a series of "wykaz nr <NO> <ADDRESS>" lines in
// content blocks. There's no auction date or price yet — these are
// pre-announcements. We pull addr + wykaz no for cross-referencing.
const WYKAZ_BLOCK_RE =
  /element\s+element_1641892132879[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
const WYKAZ_LINE_RE = /wykaz\s+nr\s+(\S+)\s+(.+?)$/i;

function parseWykazPage(html) {
  const out = [];
  WYKAZ_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = WYKAZ_BLOCK_RE.exec(html)) !== null) {
    const text = stripTags(m[1]);
    const wm = WYKAZ_LINE_RE.exec(text);
    if (!wm) continue;
    const wykazNo = wm[1].trim();
    const addressRaw = wm[2].trim();
    const publishedDate = null; // sibling-div date not extracted in v0.1
    out.push({
      wykaz_no: wykazNo,
      address_raw: addressRaw,
      address: parseAddress(addressRaw),
      published_date: publishedDate,
    });
  }
  return out;
}

function polishMonthToNum(m) {
  const map = {
    'stycznia':1,'styczeń':1,
    'lutego':2,'luty':2,
    'marca':3,'marzec':3,
    'kwietnia':4,'kwiecień':4,
    'maja':5,'maj':5,
    'czerwca':6,'czerwiec':6,
    'lipca':7,'lipiec':7,
    'sierpnia':8,'sierpień':8,
    'września':9,'wrzesień':9,
    'października':10,'październik':10,
    'listopada':11,'listopad':11,
    'grudnia':12,'grudzień':12,
  };
  return map[m.toLowerCase()] || null;
}

/** @returns {Promise<{ listings: ActiveListing[], wykaz: WykazEntry[] }>} */
export async function crawlActive() {
  const listings = [];
  for (const [kind, url] of Object.entries(PAGES)) {
    const html = await getText(url);
    const parsed = parseActivePage(html, kind);
    console.error(`  ${kind}: ${parsed.length} listings`);
    listings.push(...parsed);
  }
  const wykazHtml = await getText(WYKAZ_URL);
  const wykaz = parseWykazPage(wykazHtml);
  console.error(`  wykaz: ${wykaz.length} entries`);
  return { listings, wykaz };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings, wykaz } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, wykaz }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active listing(s), ${wykaz.length} wykaz entries`);
}
