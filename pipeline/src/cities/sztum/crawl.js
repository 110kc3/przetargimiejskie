// Sztum crawler — crawls the city BIP's single mixed board (bip.sztum.pl/1186.html).
//
// DISCOVERY:
//   Board: https://bip.sztum.pl/1186.html (server-rendered HTML)
//   Attachments: 1186.html?file=NNNNN (born-digital text PDFs)
//
// FORMAT & TLS:
//   Notice PDFs are born-digital text (pdfText).
//   bip.sztum.pl serves an incomplete certificate chain (Certum DV TLS G2 R39 CA);
//   the crawler transparently provides the audited intermediate CA certificate.
//
// ARCHITECTURE:
//   One memoised crawl serves both crawlResultDocs() and crawlActive().
//   Results (INFORMACJA o wyniku...) feed crawlResultDocs().
//   Sale announcements feed crawlActive() (listings for flats/buildings, land for plots).
//   Known result URLs are skipped via loadKnownSourceUrls (safe for concluded results).

import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import { rootCertificates } from 'node:tls';
import { setTimeout as sleep } from 'node:timers/promises';

import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { urlCacheKey } from '../../core/hash.js';
import { isApprovedSourceTlsUrl } from '../../core/source-tls.js';
import { getText as coreGetText } from '../../core/fetch.js';
import { pdfText as corePdfText } from '../../core/pdf-text.js';

import {
  isResultTitle,
  isAnnouncementTitle,
  isWykazTitle,
  isSkippableTitle,
  parseAnnouncement,
  parseWykaz,
  auctionDateFromResult,
} from './parse.js';

const ORIGIN = 'https://bip.sztum.pl';
const BOARD_URL = `${ORIGIN}/1186.html`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_DIR = fileURLToPath(new URL('../../../pdf-text-cache/', import.meta.url));
const CERT_PATH = fileURLToPath(new URL('../../core/certificates/certum-dv-tls-g2-r39-ca.pem', import.meta.url));

// Rate limit: 1 request / second when hitting the network
const MIN_INTERVAL_MS = Number(process.env.FETCH_MIN_INTERVAL_MS) || 1000;
let lastFetchAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastFetchAt);
  if (wait > 0) await sleep(wait);
  lastFetchAt = Date.now();
}

let cachedAgent = null;
function getSztumHttpsAgent() {
  if (!cachedAgent) {
    const ca = readFileSync(CERT_PATH, 'utf8');
    cachedAgent = new https.Agent({
      ca: [...rootCertificates, ca],
      rejectUnauthorized: true,
      keepAlive: false,
    });
  }
  return cachedAgent;
}

export async function fetchText(url) {
  if (isApprovedSourceTlsUrl(url)) {
    return coreGetText(url, { insecureTLS: true, userAgent: BROWSER_UA });
  }
  await throttle();
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        agent: getSztumHttpsAgent(),
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
        },
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`http ${res.statusCode} on ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    ).on('error', reject);
  });
}

export async function fetchPdfText(url) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(url) + '.txt');
  if (existsSync(cachePath)) {
    return readFile(cachePath, 'utf8');
  }

  if (isApprovedSourceTlsUrl(url)) {
    return corePdfText(url, { insecureTLS: true, userAgent: BROWSER_UA });
  }

  await throttle();
  console.error(`  pdf-text: ${url}`);
  const buf = await new Promise((resolve, reject) => {
    https.get(
      url,
      {
        agent: getSztumHttpsAgent(),
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'application/pdf,*/*;q=0.8',
        },
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`http ${res.statusCode} on ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      },
    ).on('error', reject);
  });

  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error(`not a PDF on ${url}`);
  }

  const tmpPdf = join(tmpdir(), `pdftext-${urlCacheKey(url)}.pdf`);
  await writeFile(tmpPdf, buf);
  let text;
  try {
    text = execFileSync('pdftotext', ['-layout', tmpPdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    await rm(tmpPdf, { force: true });
  }
  await writeFile(cachePath, text, 'utf8');
  return text;
}

/**
 * Parse all attachment links from the single mixed board HTML.
 * @param {string} html
 * @returns {Array<{fileId:string, url:string, title:string, published_date:string|null, type:'result'|'announcement'|'wykaz'}>}
 */
export function parseBoard(html) {
  const items = [];
  const seen = new Set();
  const re = /<a[^>]+href=["'](1186\.html\?file=(\d+))["'][^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?:<\/li>|<\/p>|$)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const fileId = m[2];
    if (seen.has(fileId)) continue;
    seen.add(fileId);
    const rawTitle = m[3]
      .replace(/<[^>]+>/g, '')
      .replace(/&ndash;/g, '-')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    const trail = m[4];
    const dateM = /Data dodania:\s*(\d{4}-\d{2}-\d{2})/i.exec(trail);
    const date = dateM ? dateM[1] : null;

    if (isSkippableTitle(rawTitle)) continue;

    let type = null;
    if (isResultTitle(rawTitle)) type = 'result';
    else if (isAnnouncementTitle(rawTitle)) type = 'announcement';
    else if (isWykazTitle(rawTitle)) type = 'wykaz';

    if (!type) continue;

    items.push({
      fileId,
      url: `${ORIGIN}/1186.html?file=${fileId}`,
      title: rawTitle,
      published_date: date,
      type,
    });
  }
  return items;
}

// Stale cutoff: announcements published more than 180 days ago that lack a future
// date are treated as concluded rather than active.
const STALE_CUTOFF = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);

async function crawlAll() {
  console.error(`  fetching Sztum board: ${BOARD_URL}`);
  let html;
  try {
    html = await fetchText(BOARD_URL);
  } catch (err) {
    console.error(`  ERROR fetching Sztum board: ${err.message}`);
    return {
      listings: [],
      wykaz: [],
      land: [],
      valid_empty: false,
      valid_empty_land: false,
      resultRefs: [],
    };
  }

  const allItems = parseBoard(html);
  console.error(`  parsed ${allItems.length} candidate items from board`);

  const knownUrls = await loadKnownSourceUrls('sztum', { includeLand: true });

  const resultItems = allItems.filter((it) => it.type === 'result');
  const annItems = allItems.filter((it) => it.type === 'announcement');
  const wykazItems = allItems.filter((it) => it.type === 'wykaz');

  // 1. Results stream
  const resultRefs = [];
  for (const it of resultItems) {
    if (knownUrls.has(it.url)) continue;
    try {
      const text = await fetchPdfText(it.url);
      const auction_date = auctionDateFromResult(text) || it.published_date || null;
      resultRefs.push({
        pdf_url: it.url,
        auction_date,
        text,
      });
    } catch (err) {
      console.error(`  WARN fetching result ${it.url}: ${err.message}`);
    }
  }

  // 2. Active announcements stream
  const listings = [];
  const land = [];

  // Sort candidate announcements newest first, bounded by publish date
  const candidateAnns = annItems
    .filter((it) => !it.published_date || it.published_date >= STALE_CUTOFF)
    .sort((a, b) => Number(b.fileId) - Number(a.fileId));

  for (const it of candidateAnns) {
    try {
      const text = await fetchPdfText(it.url);
      const rec = parseAnnouncement(text, {
        detail_url: it.url,
        source_url: it.url,
        title: it.title,
      });
      if (!rec) continue;

      const fullRec = {
        ...rec,
        detail_url: it.url,
        source_url: it.url,
      };

      // Keep active if auction date is today or in future, or recent undated
      const isUpcoming = rec.auction_date ? rec.auction_date >= TODAY : true;
      if (!isUpcoming) continue;

      if (rec.kind === 'grunt') {
        land.push(fullRec);
      } else {
        listings.push(fullRec);
      }
    } catch (err) {
      console.error(`  WARN fetching announcement ${it.url}: ${err.message}`);
    }
  }

  // 3. Wykaz stream
  const wykaz = [];
  const candidateWykazy = wykazItems
    .filter((it) => !it.published_date || it.published_date >= STALE_CUTOFF)
    .sort((a, b) => Number(b.fileId) - Number(a.fileId));

  for (const it of candidateWykazy) {
    try {
      const text = await fetchPdfText(it.url);
      const rec = parseWykaz(text, {
        detail_url: it.url,
        source_url: it.url,
        title: it.title,
      });
      if (rec) wykaz.push(rec);
    } catch (err) {
      console.error(`  WARN fetching wykaz ${it.url}: ${err.message}`);
    }
  }

  const valid_empty = listings.length === 0 && allItems.length > 0;
  const valid_empty_land = land.length === 0 && allItems.length > 0;

  console.error(
    `  sztum crawlAll complete: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s), ${resultRefs.length} new result notice(s)`,
  );

  return {
    listings,
    wykaz,
    land,
    valid_empty,
    valid_empty_land,
    resultRefs,
  };
}

let crawlPromise = null;

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz, land, valid_empty, valid_empty_land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, wykaz, land, valid_empty } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        wykaz: wykaz.length,
        results: results.length,
        valid_empty,
        sampleListing: listings[0],
        sampleLand: land[0],
      },
      null,
      2,
    ) + '\n',
  );
}
