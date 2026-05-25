// Backfills per-property unit area (POWIERZCHNIA LOKALU) by walking the
// WordPress posts sitemap to enumerate every property detail page, then
// fetching each page once and parsing both the canonical address (from the
// page <title>, which is more reliable than the slug) and the unit area.
//
// Results are cached one JSON per URL in pipeline/detail-cache/, committed to
// the repo so CI never re-fetches a known URL. The cache file is tiny
// (~200 bytes per page) and immutable: a property's unit area doesn't change.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getText } from '../../core/fetch.js';
import { urlCacheKey } from '../../core/hash.js';
import { parseAddress } from '../../core/normalize.js';

const SITEMAP_URL = 'https://zgm-gliwice.pl/wp-sitemap-posts-post-1.xml';
const CACHE_DIR = fileURLToPath(new URL('../../../detail-cache/', import.meta.url));
const DETAIL_URL_RE = /-\d{2}-\d{2}-\d{4}-r\/?$/;

const TITLE_RE = /<title>([^<]+)<\/title>/i;
const AREA_RE =
  /POWIERZCHNIA\s+LOKALU\s*:?\s*(\d{1,4}(?:[,.]\d{1,3})?)\s*m[²2]/i;
// Deposit (wadium) deadline: e.g. "wniesienie do 23.06.2026 r. wadium na konto ZGM"
const WADIUM_RE =
  /wniesienie\s+do\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*wadium/i;
// Auction date is in the page title already, but also extractable from body
// for redundancy: e.g. "Zwycięstwa 45/7 – 29.06.2026 r. –"
const AUCTION_DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;

/**
 * @typedef {object} DetailRecord
 * @property {string} url
 * @property {string|null} address_raw    parsed from page title
 * @property {string|null} key            normalized property key
 * @property {number|null} area_m2
 * @property {string|null} fetched_at     ISO timestamp
 */

/** @param {string} title */
function addressFromTitle(title) {
  const decoded = title.replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
  // "Zwycięstwa 45/7 – 29.06.2026 r. – Zakład Gospodarki Mieszkaniowej"
  const m = /^([^–—\-]+?)\s+[–—-]/.exec(decoded);
  return m ? m[1].trim() : null;
}

/** @param {string} numStr — "64,78" or "47.5" */
function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(numStr.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** @returns {Promise<string[]>} list of detail-page URLs */
async function listDetailUrls() {
  const xml = await getText(SITEMAP_URL);
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (DETAIL_URL_RE.test(m[1])) urls.push(m[1]);
  }
  return urls;
}

/** @param {string} url @returns {Promise<DetailRecord>} */
async function fetchOne(url) {
  const html = await getText(url);
  const titleM = TITLE_RE.exec(html);
  const addressRaw = titleM ? addressFromTitle(titleM[1]) : null;
  const parsed = addressRaw ? parseAddress(addressRaw) : null;
  const flat = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const areaM = AREA_RE.exec(flat);
  const wadM = WADIUM_RE.exec(flat);
  const wadiumDeadline = wadM
    ? `${wadM[3]}-${wadM[2].padStart(2, '0')}-${wadM[1].padStart(2, '0')}`
    : null;
  // Auction date from title (always present as "<addr> – DD.MM.YYYY r. –")
  let auctionDate = null;
  if (titleM) {
    const decoded = titleM[1].replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
    const ad = AUCTION_DATE_RE.exec(decoded);
    if (ad) auctionDate = `${ad[3]}-${ad[2].padStart(2, '0')}-${ad[1].padStart(2, '0')}`;
  }
  return {
    url,
    address_raw: addressRaw,
    key: parsed?.key || null,
    area_m2: areaM ? parseArea(areaM[1]) : null,
    auction_date: auctionDate,
    wadium_deadline: wadiumDeadline,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Walk the sitemap and fetch each detail page once. Returns a Map
 * from property key → area, suitable for direct merge into properties.json.
 * @returns {Promise<Map<string, number>>}
 */
export async function crawlDetailAreas() {
  await mkdir(CACHE_DIR, { recursive: true });
  console.error('Crawling detail-page sitemap ...');
  const urls = await listDetailUrls();
  console.error(`  ${urls.length} detail URLs in sitemap`);

  const keyToArea = new Map();
  let fetched = 0;
  let cached = 0;
  let withArea = 0;
  let withoutKey = 0;
  for (const url of urls) {
    const cachePath = join(CACHE_DIR, urlCacheKey(url) + '.json');
    /** @type {DetailRecord|null} */
    let rec = null;
    if (existsSync(cachePath)) {
      try {
        rec = JSON.parse(await readFile(cachePath, 'utf8'));
        cached++;
      } catch {}
    }
    if (!rec) {
      try {
        rec = await fetchOne(url);
        await writeFile(cachePath, JSON.stringify(rec, null, 2));
        fetched++;
        console.error(`  fetched: ${url} → ${rec.key || '?'} ${rec.area_m2 || '?'} m²`);
      } catch (err) {
        console.error(`  ERROR ${url}: ${err.message}`);
        continue;
      }
    }
    if (!rec.key) {
      withoutKey++;
      continue;
    }
    if (rec.area_m2 != null) {
      withArea++;
      // First non-null area wins. Multiple URLs can map to the same property
      // when it has been re-listed; we trust the first since the unit doesn't
      // physically change.
      if (!keyToArea.has(rec.key)) keyToArea.set(rec.key, rec.area_m2);
    }
  }
  console.error(
    `  detail-page summary: fetched ${fetched}, cached ${cached}, with area ${withArea}, unparseable key ${withoutKey}`,
  );
  console.error(`  ${keyToArea.size} unique property keys with area data\n`);
  return keyToArea;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const map = await crawlDetailAreas();
  process.stdout.write(
    JSON.stringify(Object.fromEntries(map.entries()), null, 2) + '\n',
  );
}
