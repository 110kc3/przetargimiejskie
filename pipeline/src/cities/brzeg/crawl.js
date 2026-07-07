// Brzeg crawler.
//
// Two-source strategy (see config.js + spikes/opolskie/powiat-brzeski/brzeg.md):
//
// crawlActive():
//   Fetches brzeg.pl/gminne-nieruchomosci-do-sprzedazy/ (WordPress, server-
//   rendered; since 2026-07-07 the host serves an anti-DDoS waiting room to
//   GH-runner IPs — see the waiting-room section below).  Parses inline fields
//   (address, kind, round, cena wywoławcza, termin, BIP link).  Returns
//   { listings, wykaz:[] }.
//
// crawlResultDocs():
//   Polls the BIP year+month hierarchy at bip.brzeg.pl/przetargi,9_1-YYYY-M
//   for the current year + previous year, collecting active item pages
//   (href=/przetargi,9_1-YYYY-M_NNN — NOT yet archived to /archiwum,7_5_NNN).
//   Each active page is fetched; if it contains a "Informacja o wyniku…" PDF
//   attachment, that PDF URL is returned as a result document.
//   Returns Array<{text, date, url}> suitable for parseResultDoc.
//
// Architecture note:
//   Active items stay at /przetargi,9_1-YYYY-M_NNN while the przetarg is open
//   or its result PDF has just been attached.  Once "archived" by the BIP admin,
//   they move to /archiwum,7_5_NNN where content is hidden ("Zawartość ukryta").
//   We therefore never fetch /archiwum pages for result data.
//
// NOTE (confirm on first CI refresh):
//   - The result-PDF text parser (parse.js parseResultDoc) was not verified
//     against a live PDF during the spike.  Validate on first run.
//   - The brzeg.pl listing page is manually maintained and may lag behind BIP.
//     It is the crawlActive() source only; BIP drives crawlResultDocs().

import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { getText, politeGet, proxyFetch, snapshot } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseListingPage, parseBipIndexMonth, parseBipItemPage, parseResultDoc } from './parse.js';

const LISTING_URL = 'https://brzeg.pl/gminne-nieruchomosci-do-sprzedazy/';
const BIP_BASE = 'https://bip.brzeg.pl';
const BIP_TYPE_PATH = '/przetargi,9_1'; // ustny nieograniczony

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// Anti-DDoS waiting room (brzeg.pl listing page, first seen 2026-07-07)
// ---------------------------------------------------------------------------
//
// The brzeg.pl WordPress host serves GH-runner (Azure) IPs an ~12 KB challenge
// page — <title>Proszę czekać…</title> plus a setTimeout(() =>
// location.reload(), 5000) script — instead of the real ~726 KB listing page.
// The loader has no JS computation, so a cookie/time-based gate may pass on a
// plain refetch: we retry a few times, forwarding any cookie the challenge
// response set. If the waiting room persists, we THROW with a network-style
// message ("fetch failed" matches triage's NETWORK_RE) so CI classifies the
// run source-unreachable — refresh.js preserves last-good data — instead of
// layout-change (the parser is fine; it never saw the real page).

const WAITING_ROOM_TITLE_RE = /<title[^>]*>[^<]*prosz[eę]\s*czeka[cć][^<]*<\/title>/i;
const WAITING_ROOM_RELOAD_RE = /setTimeout\s*\([\s\S]{0,200}?location\s*\.\s*reload/i;
const WAITING_ROOM_RETRIES = 3;
const WAITING_ROOM_DELAY_MS = 6000; // the challenge reloads itself after 5 s

/** True when `html` is the waiting-room challenge page, not real content. */
export function isWaitingRoom(html) {
  return Boolean(html) && WAITING_ROOM_TITLE_RE.test(html) && WAITING_ROOM_RELOAD_RE.test(html);
}

// Accumulate name=value pairs from a response's Set-Cookie headers into `jar`.
function harvestCookies(res, jar) {
  const lines = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of lines) {
    const pair = line.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

// Fetch the listing page, passing the waiting room if one is served.
// The first request goes through politeGet (throttle + retry + browser
// headers; it returns the raw Response, so Set-Cookie is readable). Challenge
// retries can't use politeGet (it has no way to send a Cookie header), so they
// go through proxyFetch — the same egress as attempt 0 when FETCH_PROXY_URL is
// set — sending politeGet's browser-mode header fingerprint plus the cookie.
// Every received body (first response and each retry) is snapshot()ted so the
// DEBUG_FETCH_DIR triage artifact preserves exactly what the crawler saw.
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
    const retry = await proxyFetch(LISTING_URL, {
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
    if (!retry.ok) continue; // gate hosts can 5xx mid-challenge — just retry
    html = await retry.text();
    snapshot(LISTING_URL, html, true);
    if (!isWaitingRoom(html)) return html;
  }

  // Still gated after every retry: surface it as a NETWORK failure. "fetch
  // failed" matches triage-report.js NETWORK_RE → source-unreachable.
  const err = new Error(
    `fetch failed: brzeg.pl anti-DDoS waiting room ('Proszę czekać…') still served ` +
    `after ${WAITING_ROOM_RETRIES} retries on ${LISTING_URL}`,
  );
  err.waitingRoom = true;
  throw err;
}

// Years to scan when harvesting result docs: current + previous.
function yearsToScan() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

// All month numbers 1-12.
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// ---------------------------------------------------------------------------
// crawlActive — brzeg.pl listing page
// ---------------------------------------------------------------------------

export async function crawlActive() {
  let html;
  try {
    html = await fetchListingHtml();
  } catch (err) {
    // A persistent waiting room must ABORT the city (refresh.js's per-city
    // catch emits TRIAGE kind=throw → source-unreachable); anything else keeps
    // the old behavior: log and return empty (preserve-on-empty covers it).
    if (err.waitingRoom) throw err;
    console.error(`  brzeg: listing page fetch failed (${LISTING_URL}): ${err.message}`);
    return { listings: [], wykaz: [] };
  }

  const listings = parseListingPage(html);
  console.error(`  brzeg crawlActive: ${listings.length} flat listing(s) from brzeg.pl`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs — BIP year+month scan for result PDFs
// ---------------------------------------------------------------------------

// Fetch one BIP month-index page and collect active item page URLs.
async function collectActiveItemUrls(year, month) {
  const url = `${BIP_BASE}${BIP_TYPE_PATH}-${year}-${month}`;
  let html;
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    // 404 = no items for this month+year — normal, not an error.
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
        // Only process flat-sale przetarg items (filter by title)
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

        // Fetch and extract text from the result PDF
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

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
