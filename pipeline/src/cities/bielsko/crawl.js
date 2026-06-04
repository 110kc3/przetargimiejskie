// Bielsko-Biała crawler — the city's Giełda Nieruchomości (Drupal marketplace).
//
//   INDEX:  https://bielsko-biala.pl/gielda-nieruchomosci   (?page=N for the pager)
//   NODE:   https://bielsko-biala.pl/nieruchomosc/<slug>
//
// The index lists every current/pending sale offer (Domy / Działki / Mieszkania
// / Lokale użytkowe / Garaże / …) and links each to a `/nieruchomosc/<slug>`
// detail node. The category chips / taxonomy tagging are inconsistent (a flat
// can be untagged), so we DON'T trust them: crawl the whole giełda, follow every
// node, and classify by the node's own `Rodzaj nieruchomości` field
// (parse.isFlat). We keep only `lokal mieszkalny` and emit one active listing per
// flat. See parse.js + SPIKE-WAVE2.md.
//
// Fully server-rendered HTML — no PDF/DOC/RTF/OCR. We pass a browser-like UA
// defensively (matches the other html-source adapters). The giełda shows only
// current + pending offers (no concluded-auction archive / sold prices), so
// crawlResultDocs() returns []; build-properties marks any past-dated offer
// `archived`.
//
// ⚠️ The live site is unreachable from the CI sandbox; the index-link regex and
// pager loop are written to the documented structure. VALIDATE on first refresh.

import { getText } from '../../core/fetch.js';
import { parseNode, isFlat, htmlToText, field } from './parse.js';

const ORIGIN = 'https://bielsko-biala.pl';
const INDEX = `${ORIGIN}/gielda-nieruchomosci`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = 20; // safety cap; the live giełda is ~1 page (~24 offers)

/** Extract unique `/nieruchomosc/<slug>` paths from one index page's HTML. */
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

/** Walk the giełda pager, collecting every node URL (deduped across pages). */
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
    if (added === 0) break; // no new offers → past the last page
  }
  return urls;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  const nodeUrls = await crawlIndex();
  console.error(`  bielsko: ${nodeUrls.length} giełda offer(s) to inspect`);

  const listings = [];
  let flats = 0;
  for (const url of nodeUrls) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  bielsko node fetch failed (${url}): ${err.message}`);
      continue;
    }
    // Quick pre-filter to skip the obvious non-flats cheaply, but the real
    // decision is parseNode (which re-checks Rodzaj).
    const rodzaj = field(htmlToText(html), 'Rodzaj nieruchomości');
    if (rodzaj && !isFlat(rodzaj)) continue;

    const parsed = parseNode(html);
    if (!parsed) {
      if (isFlat(rodzaj)) {
        console.error(`  bielsko WARN: unkeyable flat offer ${url}`);
      }
      continue;
    }
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
  }

  console.error(`  bielsko active: ${listings.length} flat listing(s) from ${flats} flat offer(s)`);
  return { listings, wykaz: [] };
}

/**
 * The Bielsko giełda publishes no concluded-auction / sold-price stream (only
 * current + pending offers). Returning [] keeps the refresh loop's OCR/parse
 * phase a no-op for this city.
 * @returns {Promise<Array>}
 */
export async function crawlResultDocs() {
  return [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
