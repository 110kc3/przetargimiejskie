
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseNode, parseLandNode, parseListingNode, isFlat, htmlToText, field } from './parse.js';

const ORIGIN = 'https://bielsko-biala.pl';
const INDEX = `${ORIGIN}/gielda-nieruchomosci`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = 20;
const NODE_FETCH_ATTEMPTS = 3;

async function fetchNode(url) {
  let lastErr;
  for (let attempt = 1; attempt <= NODE_FETCH_ATTEMPTS; attempt++) {
    try {
      return await getText(url, FETCH_OPTS);
    } catch (err) {
      lastErr = err;
      if (attempt === NODE_FETCH_ATTEMPTS) break;
      const backoff = 500 * attempt;
      console.error(
        `  bielsko node fetch failed (${url}): ${err.message}; retry ${attempt + 1}/${NODE_FETCH_ATTEMPTS} in ${backoff}ms`,
      );
      await sleep(backoff);
    }
  }
  throw lastErr;
}

const CHIP_KIND = [
  [/lokale?\s+u[żz]ytkow/i, 'uzytkowy'],
  [/lokale?\s+niemieszkaln/i, 'uzytkowy'],
  [/mieszkani|lokale?\s+mieszkaln/i, 'mieszkalny'],
  [/dzia[łl]k|grunt/i, 'grunt'],
  [/dom[ye]?\b|domy/i, 'zabudowana'],
  [/gara[żz]/i, 'garaz'],
];

export function classifyFallback(text) {
  const t = text || '';
  const chip = /kategor\w*\s*:?\s*([^.]{0,40})/i.exec(t);
  const chipText = chip ? chip[1] : t;
  for (const [re, kind] of CHIP_KIND) {
    if (re.test(chipText)) return kind;
  }
  return classifyKind(t);
}

export function parseIndexLinks(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"\/]+)?\/nieruchomosc\/[^"#?\s]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/gi, '&');
    if (!/^https?:/i.test(href)) href = ORIGIN + href;
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

async function crawlIndex() {
  const urls = [];
  const seen = new Set();
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = page === 0 ? INDEX : `${INDEX}?page=${page}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  bielsko index page ${page} fetch failed: ${err.message}`);
      break;
    }
    const links = parseIndexLinks(html);
    let added = 0;
    for (const u of links) {
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      added++;
    }
    console.error(`  bielsko index page ${page}: ${links.length} node link(s) (${added} new)`);
    if (added === 0) break;
  }
  return urls;
}

export async function crawlActive() {
  const nodeUrls = await crawlIndex();
  console.error(`  bielsko: ${nodeUrls.length} giełda offer(s) to inspect`);

  const listings = [];
  const land = [];
  let flats = 0;
  let houses = 0;
  let commercial = 0;
  for (const url of nodeUrls) {
    let html;
    try {
      html = await fetchNode(url);
    } catch (err) {
      console.error(`  bielsko node fetch gave up (${url}): ${err.message}`);
      continue;
    }
    const text = htmlToText(html);
    const rodzaj = field(text, 'Rodzaj nieruchomości');
    let kind = classifyKind(rodzaj || '');
    if (kind === 'unknown') {
      kind = classifyFallback(text);
      if (kind !== 'unknown') {
        console.error(`  bielsko: missing/blank Rodzaj on ${url} → classified '${kind}' via fallback`);
      }
    }
    try {
      if (kind === 'grunt') {
        const lr = parseLandNode(html, url);
        if (lr) land.push(lr);
      } else if (isFlat(rodzaj)) {
        const parsed = parseNode(html);
        if (parsed) {
          flats++;
          listings.push({
            kind: parsed.kind,
            address_raw: parsed.address_raw,
            address: parsed.address,
            auction_date: parsed.auction_date,
            published_date: null,
            round: parsed.round,
            area_m2: parsed.area_m2,
            starting_price_pln: parsed.starting_price_pln,
            detail_url: url,
          });
        } else {
          console.error(`  bielsko WARN: unkeyable flat offer ${url}`);
        }
      } else if (kind === 'mieszkalny' || kind === 'zabudowana' || kind === 'uzytkowy') {
        const node = parseListingNode(html, url, kind);
        if (node) {
          if (kind === 'mieszkalny') flats++;
          else if (kind === 'zabudowana') houses++;
          else commercial++;
          listings.push({
            kind: node.kind,
            address_raw: node.address_raw,
            address: node.address,
            auction_date: node.auction_date,
            published_date: null,
            round: node.round,
            area_m2: node.area_m2,
            starting_price_pln: node.starting_price_pln,
            detail_url: url,
          });
        }
      }
      // garaż / unknown → skipped (the giełda rarely lists standalone garages).
    } catch (err) {
      console.error(`  bielsko node parse failed (${url}): ${err.message}`);
    }
  }

  console.error(
    `  bielsko active: ${flats} flat, ${houses} house, ${commercial} commercial listing(s); ${land.length} land plot(s)`,
  );
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} listing(s), ${land.length} land plot(s)`);
}
