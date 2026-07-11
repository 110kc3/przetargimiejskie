// Bolesławiec crawler — TWO sources (see config.js for the full rationale).
//
//   ACTIVE + WYKAZ — city portal xn--bolesawiec-e0b.pl (Joomla). The article
//   list is a JS SPA, but every category exposes a server-rendered RSS feed
//   (`?format=feed&type=rss`) carrying the full article HTML, so NO Playwright
//   is needed. Two boards:
//     sp-estate           → CURRENT auctions (table: address/area/price/date)  → listings + land
//     przetargi-planowane → WYKAZ pre-auction designations (prose)             → wykaz
//
//   RESULTS — city BIP www.um.boleslawiec.bip-gov.pl board /public/?id=110553
//   ("Wyniki sprzedaży nieruchomości"): plain HTML, one <a /public/getFile?id=N>
//   per born-digital PDF. crawlResultDocs() extracts each PDF's text with
//   pdfText() and attaches it as ref.text (source:'html'), so refresh.js's
//   OCR/parse loop just reads ref.text.
//
// Both hosts need insecureTLS (incomplete cert chain, like bip.miastozabrze.pl).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseActiveItem, parseWykazItem, parseResultDoc, polishDateToIso } from './parse.js';

const PORTAL = 'https://xn--bolesawiec-e0b.pl';
const BIP = 'https://www.um.boleslawiec.bip-gov.pl';
const RESULTS_BOARD = `${BIP}/public/?id=110553`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// Portal serves the RSS fine to the polite bot UA, but the BIP host gates it;
// send a browser UA everywhere for consistency. insecureTLS relaxes the
// incomplete-chain verification (public, read-only data — see core/fetch.js).
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

// sp-estate categories that carry SELLABLE auctions (flats, built property,
// commercial units, land). "dzierżawy" (rental) is intentionally excluded.
const SALE_CATEGORIES = [
  'lokale-mieszkalne',
  'lokale-budynki-użytkowe',
  'działki-mieszkaniowe',
  'działki-mieszkaniowe-2',
  'działki-usługowe-przemysłowe',
  'garaże',
  'inne',
];
// wykaz[] is address-keyed only (buildCityData has no land path for it), so we
// harvest wykaz from the LOKAL categories only — działka wykaz entries would
// produce nothing address-keyable. They still surface once they reach an
// sp-estate auction (crawlActive's `land`).
const WYKAZ_CATEGORIES = ['lokale-mieszkalne', 'lokale-budynki-użytkowe'];

const MAX_ITEMS_PER_FEED = 50; // Joomla RSS caps well below this; a safety bound.

function feedUrl(board, category) {
  return `${PORTAL}/index.php/mig/${board}/${encodeURIComponent(category)}?format=feed&type=rss`;
}

// ---- RSS parsing ------------------------------------------------------------

function decodeXml(s) {
  return (s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Parse an RSS feed body into items. Regex-based (the Joomla output is simple
 * and stable) — no XML dependency.
 * @param {string} xml
 * @returns {Array<{title:string, link:string, description:string, pubDate:string}>}
 */
export function parseRssItems(xml) {
  const out = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null && out.length < MAX_ITEMS_PER_FEED) {
    const block = m[1];
    const title = decodeXml((/<title>([\s\S]*?)<\/title>/i.exec(block) || [])[1] || '').trim();
    const link = ((/<link>([\s\S]*?)<\/link>/i.exec(block) || [])[1] || '').trim();
    let description = (/<description>([\s\S]*?)<\/description>/i.exec(block) || [])[1] || '';
    description = description.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
    const pubDate = ((/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block) || [])[1] || '').trim();
    out.push({ title, link, description, pubDate });
  }
  return out;
}

// ---- results board parsing --------------------------------------------------

/**
 * Extract result-notice refs from the BIP board HTML. Each entry is an
 * <a href="/public/getFile?id=N" …><span>Wynik … z dnia DD month YYYY r. - …</span></a>.
 * @param {string} html
 * @returns {Array<{pdf_url:string, title:string, auction_date:string|null}>}
 */
export function parseResultsBoard(html) {
  const out = [];
  const seen = new Set();
  const linkRe = /<a\s+href="(\/public\/getFile\?id=(\d+))"[\s\S]*?<span>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = decodeXml(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    // Title carries the auction date: "Wynik I przetargu z dnia 25 czerwca 2026 r. - …"
    const dateM = /z\s+dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(title);
    out.push({
      pdf_url: `${BIP}${m[1]}`,
      title,
      auction_date: dateM ? polishDateToIso(dateM[1]) : null,
    });
  }
  return out;
}

// ---- crawlActive ------------------------------------------------------------

let activePromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];

  // sp-estate → active auctions (listings + land)
  for (const category of SALE_CATEGORIES) {
    let xml;
    try {
      xml = await getText(feedUrl('sp-estate', category), FETCH_OPTS);
    } catch (err) {
      console.error(`  boleslawiec sp-estate/${category} feed failed: ${err.message}`);
      continue;
    }
    const items = parseRssItems(xml);
    let addL = 0, addLand = 0;
    for (const it of items) {
      const { listings: ls, land: lands } = parseActiveItem(it.title, it.description, it.link);
      listings.push(...ls); addL += ls.length;
      land.push(...lands); addLand += lands.length;
    }
    if (items.length) console.error(`  boleslawiec sp-estate/${category}: ${items.length} item(s) → ${addL} listing(s), ${addLand} land`);
  }

  // przetargi-planowane → wykaz pre-announcements (address-keyed only)
  for (const category of WYKAZ_CATEGORIES) {
    let xml;
    try {
      xml = await getText(feedUrl('przetargi-planowane', category), FETCH_OPTS);
    } catch (err) {
      console.error(`  boleslawiec przetargi-planowane/${category} feed failed: ${err.message}`);
      continue;
    }
    const items = parseRssItems(xml);
    let addW = 0;
    for (const it of items) {
      const entries = parseWykazItem(it.title, it.description, it.pubDate);
      wykaz.push(...entries); addW += entries.length;
    }
    if (items.length) console.error(`  boleslawiec przetargi-planowane/${category}: ${items.length} item(s) → ${addW} wykaz`);
  }

  console.error(`  boleslawiec crawlActive: ${listings.length} listing(s), ${wykaz.length} wykaz, ${land.length} land`);
  return { listings, wykaz, land };
}

export async function crawlActive() {
  activePromise ??= crawlAll();
  return activePromise;
}

// ---- crawlResultDocs --------------------------------------------------------

/**
 * Fetch the BIP results board, extract each getFile PDF, and return refs with
 * the extracted text attached (source:'html' — refresh.js reads ref.text).
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  let html;
  try {
    html = await getText(RESULTS_BOARD, FETCH_OPTS);
  } catch (err) {
    console.error(`  boleslawiec results board fetch failed: ${err.message}`);
    return [];
  }
  const board = parseResultsBoard(html);
  console.error(`  boleslawiec results board: ${board.length} PDF result notice(s)`);

  const refs = [];
  for (const b of board) {
    let text;
    try {
      text = await pdfText(b.pdf_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  boleslawiec result PDF failed (${b.pdf_url}): ${err.message}`);
      continue;
    }
    refs.push({ text, pdf_url: b.pdf_url, auction_date: b.auction_date });
  }
  return refs;
}

// Manual smoke test: `node src/cities/boleslawiec/crawl.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const active = await crawlActive();
  const refs = await crawlResultDocs();
  const records = refs.flatMap((r) => parseResultDoc(r.text, r.auction_date, r.pdf_url));
  process.stdout.write(JSON.stringify({
    listings: active.listings.length,
    wykaz: active.wykaz.length,
    land: active.land.length,
    resultDocs: refs.length,
    resultRecords: records.length,
    sampleListing: active.listings[0],
    sampleLand: active.land[0],
    sampleResult: records[0],
  }, null, 2) + '\n');
}
