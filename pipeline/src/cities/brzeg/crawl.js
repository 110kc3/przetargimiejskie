import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { directFetch, getText, politeGet, snapshot } from '../../core/fetch.js';
import { isChallengePage } from '../../core/challenge-page.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseListingPage, parseBipIndexMonth, parseBipItemPage, parseResultDoc } from './parse.js';

const LISTING_URL = 'https://brzeg.pl/gminne-nieruchomosci-do-sprzedazy/';
const BIP_BASE = 'https://bip.brzeg.pl';
const BIP_TYPE_PATH = '/przetargi,9_1';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FETCH_OPTS = { userAgent: BROWSER_UA };

const WAITING_ROOM_TITLE_RE = /<title[^>]*>[^<]*prosz[eę]\s*czeka[cć][^<]*<\/title>/i;
const WAITING_ROOM_RELOAD_RE = /setTimeout\s*\([\s\S]{0,200}?location\s*\.\s*reload/i;
const WAITING_ROOM_RETRIES = 3;
const WAITING_ROOM_DELAY_MS = 6000;

export function isWaitingRoom(html) {
  return Boolean(html) && (
    (WAITING_ROOM_TITLE_RE.test(html) && WAITING_ROOM_RELOAD_RE.test(html)) ||
    isChallengePage(html)
  );
}

function harvestCookies(res, jar) {
  const lines = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of lines) {
    const pair = line.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function fetchListingHtml() {
  const res = await politeGet(LISTING_URL, FETCH_OPTS);
  if (!res.ok) throw new Error(`http ${res.status} on ${LISTING_URL}`);
  let html = await res.text();
  snapshot(LISTING_URL, html, true);
  if (!isWaitingRoom(html)) return html;

  const jar = new Map();
  harvestCookies(res, jar);

  for (let attempt = 1; attempt <= WAITING_ROOM_RETRIES; attempt++) {
    console.error(
      `  brzeg: anti-DDoS waiting room served (attempt ${attempt}/${WAITING_ROOM_RETRIES}) — ` +
      `retrying in ${WAITING_ROOM_DELAY_MS}ms${jar.size ? ' with challenge cookie' : ''}`,
    );
    await sleep(WAITING_ROOM_DELAY_MS);
    const retry = await directFetch(LISTING_URL, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
        ...(jar.size ? { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      },
      redirect: 'follow',
    });
    harvestCookies(retry, jar);
    if (!retry.ok) continue;
    html = await retry.text();
    snapshot(LISTING_URL, html, true);
    if (!isWaitingRoom(html)) return html;
  }

  const err = new Error(
    `fetch failed: brzeg.pl anti-DDoS waiting room ('Proszę czekać…') still served ` +
    `after ${WAITING_ROOM_RETRIES} retries on ${LISTING_URL}`,
  );
  err.waitingRoom = true;
  throw err;
}

function yearsToScan() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);


export async function crawlActive() {
  let html;
  try {
    html = await fetchListingHtml();
  } catch (err) {
    if (err.waitingRoom) throw err;
    console.error(`  brzeg: listing page fetch failed (${LISTING_URL}): ${err.message}`);
    return { listings: [], wykaz: [] };
  }

  const listings = parseListingPage(html);
  console.error(`  brzeg crawlActive: ${listings.length} flat listing(s) from brzeg.pl`);
  return { listings, wykaz: [] };
}


async function collectActiveItemUrls(year, month) {
  const url = `${BIP_BASE}${BIP_TYPE_PATH}-${year}-${month}`;
  let html;
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    if (!/\b404\b/.test(err.message)) {
      console.error(`  brzeg BIP month ${year}-${month} fetch failed: ${err.message}`);
    }
    return [];
  }
  return parseBipIndexMonth(html);
}

export async function crawlResultDocs() {
  const resultDocs = [];

  for (const year of yearsToScan()) {
    for (const month of ALL_MONTHS) {
      const activeItems = await collectActiveItemUrls(year, month);
      if (activeItems.length === 0) continue;

      console.error(`  brzeg BIP ${year}-${month}: ${activeItems.length} active item(s)`);

      for (const item of activeItems) {
        if (!/lokal\s+mieszkaln/i.test(item.title)) continue;

        let pageHtml;
        try {
          pageHtml = await getText(item.url, FETCH_OPTS);
        } catch (err) {
          console.error(`  brzeg BIP item fetch failed (${item.url}): ${err.message}`);
          continue;
        }

        const parsed = parseBipItemPage(pageHtml, item.url);
        if (!parsed || !parsed.resultPdf) continue;

        let text;
        try {
          text = await pdfText(parsed.resultPdf, FETCH_OPTS);
        } catch (err) {
          console.error(`  brzeg result PDF text failed (${parsed.resultPdf}): ${err.message}`);
          continue;
        }

        resultDocs.push({
          text,
          date: parsed.publishedDate,
          url: parsed.resultPdf,
        });
        console.error(`  brzeg: found result doc for "${parsed.title.slice(0, 60)}"`);
      }
    }
  }

  console.error(`  brzeg crawlResultDocs: ${resultDocs.length} result doc(s) found`);
  return resultDocs;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
