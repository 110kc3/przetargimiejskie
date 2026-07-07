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

import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { getText } from '../../core/fetch.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseNode, parseLandNode, parseListingNode, isFlat, htmlToText, field } from './parse.js';

const ORIGIN = 'https://bielsko-biala.pl';
const INDEX = `${ORIGIN}/gielda-nieruchomosci`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// The browser-like UA is sent on EVERY node + index fetch (some municipal WAFs
// 403 the default bot UA); core/fetch.js fans these into full browser headers.
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = 20; // safety cap; the live giełda is ~1 page (~24 offers)
const NODE_FETCH_ATTEMPTS = 3; // local retry on top of core/fetch's own retries

/**
 * Fetch one node's HTML with a small extra retry/backoff. `getText` already
 * retries 5xx/429/connection errors internally, but the live giełda
 * intermittently refuses the CI fetcher with a hard 403/closed-connection that
 * the inner loop surfaces as a throw; a couple of extra spaced-out attempts
 * recover those (Wyspiańskiego 32/9, Botaniczna 5, 11 Listopada 23/12 were live
 * but dropped to a single transient failure). Throws only if every attempt fails.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchNode(url) {
  let lastErr;
  for (let attempt = 1; attempt <= NODE_FETCH_ATTEMPTS; attempt++) {
    try {
      return await getText(url, FETCH_OPTS);
    } catch (err) {
      lastErr = err;
      if (attempt === NODE_FETCH_ATTEMPTS) break; // out of attempts — don't sleep for nothing
      const backoff = 500 * attempt; // 500ms, 1000ms
      console.error(
        `  bielsko node fetch failed (${url}): ${err.message}; retry ${attempt + 1}/${NODE_FETCH_ATTEMPTS} in ${backoff}ms`,
      );
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// Index/node category chips (Drupal taxonomy term) → kind, used ONLY as a
// fallback when the structured `Rodzaj nieruchomości` field is absent. Order
// matters: "Lokale użytkowe" must beat the generic "Lokale" prefix, and the
// land terms ("Działki" / "Grunty") are checked before "Domy" so a developed-
// plot listing isn't mis-stamped. We do this LOCALLY (not in core) because the
// chip vocabulary is Bielsko-specific.
const CHIP_KIND = [
  [/lokale?\s+u[żz]ytkow/i, 'uzytkowy'],
  [/lokale?\s+niemieszkaln/i, 'uzytkowy'],
  [/mieszkani|lokale?\s+mieszkaln/i, 'mieszkalny'],
  [/dzia[łl]k|grunt/i, 'grunt'],
  [/dom[ye]?\b|domy/i, 'zabudowana'],
  [/gara[żz]/i, 'garaz'],
];

/**
 * Derive a kind for a node whose `Rodzaj nieruchomości` field is empty/unknown
 * (live example: ul. Andrzeja Frycza Modrzewskiego 2/5, 768 080 zł — no Rodzaj
 * field, but the body reads "Lokal mieszkalny… Powierzchnia użytkowa… 130,21 m2").
 * Without this the offer hits no branch in crawlActive() and is silently dropped.
 *
 * Strategy, first hit wins:
 *   1) the node/index category chip (Mieszkania→flat, Domy→house,
 *      Lokale użytkowe→commercial, Działki→land);
 *   2) the title + body prose, via the shared classifier (read-only).
 * Returns 'unknown' only when neither yields a kind.
 *
 * @param {string} text  flattened node text (htmlToText output)
 * @returns {'mieszkalny'|'zabudowana'|'uzytkowy'|'garaz'|'grunt'|'unknown'}
 */
export function classifyFallback(text) {
  const t = text || '';
  // 1) category chip — match against the whole flattened node (the chip is a
  //    short taxonomy label, e.g. "Kategoria: Mieszkania" / a "Mieszkania" link).
  const chip = /kategor\w*\s*:?\s*([^.]{0,40})/i.exec(t);
  const chipText = chip ? chip[1] : t;
  for (const [re, kind] of CHIP_KIND) {
    if (re.test(chipText)) return kind;
  }
  // 2) title + body prose — classifyKind nests the Polish phrases correctly
  //    ("lokalu mieszkalnego" beats "budynek mieszkalny", land beats house, etc.).
  return classifyKind(t);
}

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

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  const nodeUrls = await crawlIndex();
  console.error(`  bielsko: ${nodeUrls.length} giełda offer(s) to inspect`);

  const listings = []; // address-keyed: flats + houses + commercial
  const land = [];      // parcel-keyed: działki / grunty → land.json
  let flats = 0;
  let houses = 0;
  let commercial = 0;
  for (const url of nodeUrls) {
    let html;
    try {
      html = await fetchNode(url); // local retry/backoff over core/fetch's own
    } catch (err) {
      console.error(`  bielsko node fetch gave up (${url}): ${err.message}`);
      continue;
    }
    // Classify on the node's own `Rodzaj nieruchomości` and route. Every parse
    // is wrapped so one malformed offer can never abort the whole crawl.
    const text = htmlToText(html);
    const rodzaj = field(text, 'Rodzaj nieruchomości');
    let kind = classifyKind(rodzaj || '');
    // FALLBACK: when the structured Rodzaj field is absent (→ 'unknown'), derive
    // the kind from the category chip / title+body prose so the offer isn't
    // silently dropped by the if/else chain below (see classifyFallback).
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
        // Flat path UNCHANGED (parseNode) so existing output stays byte-identical
        // for offers that DO carry the `Rodzaj nieruchomości` field.
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
        // Address-keyed listing. `kind === 'mieszkalny'` reaches here only via the
        // missing-Rodzaj fallback (parseNode would reject it for lack of the
        // field), so it is parsed through parseListingNode like houses/commercial
        // but emitted with the same shape as the parseNode flat path above.
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

/**
 * The Bielsko giełda publishes no concluded-auction / sold-price stream (only
 * current + pending offers). Returning [] keeps the refresh loop's OCR/parse
 * phase a no-op for this city.
 * @returns {Promise<Array>}
 */
export async function crawlResultDocs() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total: ${listings.length} listing(s), ${land.length} land plot(s)`);
}
