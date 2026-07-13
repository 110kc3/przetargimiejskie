// Kłobuck crawler — gminaklobuck.pl, a bespoke PHP portal consumed as plain
// server HTML (browser UA; no SPA, no PDF, no OCR). See config.js.
//
// ⚠️ Śląskie = PUBLIC-TIER: this crawl must NOT throw and must stay well under a
// 20-min CI step. Every fetch is in a try/catch; the walk is triple-bounded
// (MAX_PAGES listing depth, MAX_DETAILS notice fetches, MAX_FETCHES hard ceiling).
//
// SHAPE: `/ogloszenia?page=N` is a MIXED board (sales, leases, wykazy, konkursy,
// obwieszczenia) of `/ogloszenie/<slug>-<id>` detail pages. The detail page's
// <h1> is a USELESS generic "Ogłoszenie", so routing keys on the URL SLUG (which
// carries the real title: "…oglasza-trzeci-przetarg-…-sprzedaz-lokalu-…" /
// "informacja-o-wyniku-…-przetargu-…"). We fetch ONLY the sale-announcement and
// result detail pages — leases/wykazy/konkursy/cancellations are dropped by slug
// before any detail fetch. The asset KIND is still classified on the body
// (parse.js), never the slug.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  extractBodyText, extractAuctionDate,
  isResultTitle, isAnnouncementTitle, isLeaseTitle, isCancelled,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://gminaklobuck.pl';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Bounds (public-tier CI safety). The board is ~26 pages of 6; sale/result notices
// are a low-volume subset, so at ~1 req/s a full run is ~26 list + ~30 detail
// fetches (~1 min). The ceilings are slack above that, never a functional cap.
const MAX_PAGES = 30;      // listing pages walked
const MAX_DETAILS = 90;    // sale/result detail pages fetched
const MAX_FETCHES = 160;   // hard ceiling on total HTTP requests per run

/** URL slug → space-joined real title (the detail <h1> is a generic "Ogłoszenie"). */
function slugTitleFromUrl(url) {
  const slug = String(url)
    .replace(/^.*\/ogloszenie\//, '')
    .replace(/[#?].*$/, '')
    .replace(/-\d+$/, '');
  return slug.replace(/-/g, ' ');
}

/** Route a slug to a stream, or null to skip (lease / wykaz / konkurs / cancel). */
function routeSlug(st) {
  if (isCancelled(st) || isLeaseTitle(st)) return null;
  if (/\bwykaz|konkurs|obwieszczeni|zam[óo]wien|nab[óo]r|bezprzetarg|linii\s+kolejow/i.test(st)) return null;
  if (isResultTitle(st)) return 'result';
  if (isAnnouncementTitle(st)) return 'announce';
  return null;
}

let crawlPromise = null;

/** Walk the paginated board, collecting every /ogloszenie/<slug>-<id> link once. */
async function collectLinks(state) {
  const links = [];
  const seen = new Set();
  for (let p = 1; p <= MAX_PAGES; p++) {
    if (state.fetches >= MAX_FETCHES) break;
    let html;
    try {
      state.fetches++;
      html = await getText(`${ORIGIN}/ogloszenia?page=${p}`, { userAgent: UA });
    } catch (err) {
      console.error(`  klobuck: list page ${p} failed: ${err.message}`);
      continue;
    }
    const re = /href="(https:\/\/gminaklobuck\.pl\/ogloszenie\/[^"]+)"/gi;
    let m;
    let fresh = 0;
    while ((m = re.exec(html)) !== null) {
      const url = m[1].replace(/&amp;/gi, '&');
      if (seen.has(url)) continue;
      seen.add(url);
      links.push(url);
      fresh++;
    }
    if (fresh === 0 && p > 1) break; // past the last populated page
  }
  return links;
}

/** Fetch + route every sale/result notice once (memoised per run). */
async function crawlAll() {
  const listings = []; // address-keyed active flats/units → properties.json
  const land = [];     // kind:'grunt' active plots → land.json
  const resultRefs = []; // { text, pdf_url, auction_date } for parseResultDoc
  const today = new Date().toISOString().slice(0, 10);
  const state = { fetches: 0 };

  const links = await collectLinks(state);
  let details = 0;
  for (const url of links) {
    if (details >= MAX_DETAILS || state.fetches >= MAX_FETCHES) break;
    const route = routeSlug(slugTitleFromUrl(url));
    if (!route) continue;

    let html;
    try {
      state.fetches++;
      details++;
      html = await getText(url, { userAgent: UA });
    } catch (err) {
      console.error(`  klobuck: detail failed (${url}): ${err.message}`);
      continue;
    }

    if (route === 'result') {
      const text = extractBodyText(html);
      if (text) resultRefs.push({ text, pdf_url: url, auction_date: extractAuctionDate(text) || null });
      continue;
    }

    // announcement
    let rec;
    try {
      rec = parseAnnouncement(html, url);
    } catch (err) {
      console.error(`  klobuck: parse failed (${url}): ${err.message}`);
      continue;
    }
    if (!rec || rec.cancelled) continue;
    if (!rec.address_raw && !rec.dzialka_nr) continue; // nothing usable extracted
    // Active = genuinely upcoming (or dateless); concluded ones ride the result stream.
    if (rec.auction_date && rec.auction_date < today) continue;
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  klobuck: ${listings.length} listing(s), ${land.length} land plot(s), ${resultRefs.length} result(s) [${state.fetches} fetches]`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleResult: results[0] && { ...results[0], text: `[${results[0].text.length} chars]` },
      },
      null,
      2,
    ) + '\n',
  );
}
