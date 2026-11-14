import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { urlCacheKey } from '../../core/hash.js';
import { parseAddress } from '../../core/normalize.js';

const SITEMAP_URL = 'https://zgm-gliwice.pl/wp-sitemap-posts-post-1.xml';
const CACHE_DIR = fileURLToPath(new URL('../../../detail-cache/', import.meta.url));
const DETAIL_URL_RE = /-\d{2}-\d{2}-\d{4}-r\/?$/;

const TITLE_RE = /<title>([^<]+)<\/title>/i;
const AREA_RE =
  /POWIERZCHNIA\s+LOKALU\s*:?\s*(\d{1,4}(?:[,.]\d{1,3})?)\s*m[²2]/i;
const WADIUM_RE =
  /wniesienie\s+do\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*wadium/i;
const AUCTION_DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;


function addressFromTitle(title) {
  const decoded = title.replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
  const m = /^(.+?)\s+[–—]\s/.exec(decoded) || /^(.+?)\s+-\s/.exec(decoded);
  return m ? m[1].trim() : null;
}

function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(numStr.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

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
      if (!keyToArea.has(rec.key)) keyToArea.set(rec.key, rec.area_m2);
    }
  }
  console.error(
    `  detail-page summary: fetched ${fetched}, cached ${cached}, with area ${withArea}, unparseable key ${withoutKey}`,
  );
  console.error(`  ${keyToArea.size} unique property keys with area data\n`);
  return keyToArea;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const map = await crawlDetailAreas();
  process.stdout.write(
    JSON.stringify(Object.fromEntries(map.entries()), null, 2) + '\n',
  );
}
