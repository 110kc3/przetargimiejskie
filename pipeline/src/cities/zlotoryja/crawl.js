// Złotoryja crawler.
//
// *** SOURCE CORRECTION (read this first) ***
// The spike (spikes/dolnoslaskie/powiat-zlotoryjski/zlotoryja.md) profiled
// `zlotoryja.bip.info.pl` — a server-HTML bip.info.pl BIP, same CMS family as
// the Zgorzelec adapter, with Przetargi at idmp=74 and Zakończone at idmp=1.
// Re-verified live on 2026-07-10 before building: that host is now DEAD.
// Every board/document path (query-string AND comma-path forms, http AND
// https, with AND without a browser UA) returns a genuine nginx-level 404 —
// not the app-level "Strona nie istnieje" the spike's bot-UA quirk describes,
// but no backend behind the vhost at all (no X-Powered-By, no PHP session
// cookie — contrast a live bip.info.pl host like zgorzelec.bip.info.pl, which
// still answers normally). Google's index still has old zlotoryja.bip.info.pl
// pages cached (confirming the spike's fetch was genuine at the time), but
// the live site has since migrated.
//
// The city's OWN current website (zlotoryja.pl, redirecting to
// www.xn--zotoryja-6ob.pl) links to the real, live BIP at **bip.zlotoryja.pl**
// — a modern Angular SPA (no server HTML — the raw document is a bare
// `<app-root>` shell) backed by a JSON:API-shaped REST API under `/api/fo/`.
// This adapter targets THAT host/API instead of the dead legacy one.
//
// Reverse-engineered API shape (from the compiled Angular bundles + live
// probing, verified 2026-07-10):
//   GET /api/fo/articles?page=P&count=N&path=<any-valid-page-path>
//       [&category=<id>] [&filter={"title":"<substring>"}]
//     -> { meta:{pages}, data:[{ id, attributes:{ slug, title, ... category:
//          {id, attributes:{title, slug}} } }] }   (list; NO body/content)
//   GET /api/fo/articles/<slug>
//     -> { data:{ attributes:{ title, content (HTML), fullUrl, category,
//          publishedAt, ... } } }                   (single article; full body)
//
// The legacy idmp taxonomy SURVIVED the migration verbatim as category ids:
//   category "przedmiotowe74" == "Przetargi"   (title/slug confirmed live)
//   category "przedmiotowe1"  == "Zakończone"
// BUT — checked live — "Zakończone" (przedmiotowe1) turned out to just
// re-list PAST-DATE announcements with no outcome text appended (verified by
// fetching a full article: no "Nabywcą"/"wynikiem negatywnym" anywhere). The
// real "Informacja o wyniku przetargu" result notices instead live in the
// general **"Ogłoszenia"** board, category id **"przedmiotowe5"**, which also
// carries unrelated notices (job-posting/works-contract "wyniku" results)
// sharing the "wyniku" keyword. So: crawlActive() reads "Przetargi"
// (przedmiotowe74) directly (a clean, dedicated board); crawlResultDocs()
// reads "Ogłoszenia" (przedmiotowe5) filtered server-side to titles
// containing "wyniku", then gates each candidate through
// isResultDoc/isSaleAuction/isLease (see parse.js) to drop the non-property
// noise.
//
// The host ships an INCOMPLETE TLS certificate chain (missing intermediate
// CA — `curl` needs `-k`; Node needs `insecureTLS`), same class of issue as
// bip.miastozabrze.pl (see core/fetch.js's header comment). The data is
// public/read-only, so verification is relaxed for this host only. NO
// browser UA is required (unlike the spike's note, which was specific to the
// now-dead legacy host) — verified live with the plain bot UA.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isResultDoc,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.zlotoryja.pl';
const API_ARTICLES = `${ORIGIN}/api/fo/articles`;

const CATEGORY_PRZETARGI = 'przedmiotowe74'; // "Przetargi" — active announcements
const CATEGORY_OGLOSZENIA = 'przedmiotowe5'; // "Ogłoszenia" — general board carrying "Informacja o wyniku przetargu" results

// Required by the list endpoint (breadcrumb/page context for the FO app);
// verified live that any valid page path satisfies it — reuse the
// Ogłoszenia page's own path.
const LIST_PATH = '/ogloszenia-5';

const COUNT = 30;
// Bound the walk so a growing archive can never spin forever (ADAPTER-GUIDE
// §5.1). Live volumes at build time: Przetargi 5 items (1 page); the
// "wyniku"-filtered Ogłoszenia slice ~90 items (3 pages) — both bounds leave
// generous headroom for growth.
const MAX_PAGES_ACTIVE = 10;
const MAX_PAGES_RESULTS = 20;

// bip.zlotoryja.pl's TLS chain is missing the intermediate CA (see header
// comment) — relax verification for this public, read-only host. No custom
// User-Agent is required (verified live with the plain bot UA), but one is
// sent anyway as a harmless defensive default against municipal WAFs, same
// rationale as the zgorzelec adapter.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { insecureTLS: true, userAgent: UA };

function listUrl({ category, page, filter }) {
  const params = new URLSearchParams({ page: String(page), count: String(COUNT), path: LIST_PATH });
  if (category) params.set('category', category);
  if (filter) params.set('filter', JSON.stringify(filter));
  return `${API_ARTICLES}?${params.toString()}`;
}

function articleUrl(slug) {
  return `${API_ARTICLES}/${slug}`;
}

/** One bounded, paginated walk of the articles list endpoint (list view only
 *  — slug + title, no body). Stops at maxPages, or as soon as a page returns
 *  no items, or once `meta.pages` is reached. */
async function fetchListItems({ category, filter, maxPages }) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    let json;
    try {
      const text = await getText(listUrl({ category, page, filter }), FETCH_OPTS);
      json = JSON.parse(text);
    } catch (err) {
      console.error(`  zlotoryja: list page ${page} (category=${category || '-'}) failed: ${err.message}`);
      break;
    }
    const data = Array.isArray(json?.data) ? json.data : [];
    if (!data.length) break;
    items.push(...data);
    const totalPages = json?.meta?.pages || 1;
    if (page >= totalPages) break;
  }
  return items;
}

/** Fetch one article's full body by slug -> { text, url } or null. */
async function fetchArticle(slug) {
  let json;
  try {
    const text = await getText(articleUrl(slug), FETCH_OPTS);
    json = JSON.parse(text);
  } catch (err) {
    console.error(`  zlotoryja: article ${slug} fetch failed: ${err.message}`);
    return null;
  }
  const a = json?.data?.attributes;
  if (!a) return null;
  const text = buildRecordText({ title: a.title, body: a.content });
  const url = a.fullUrl ? `${ORIGIN}${a.fullUrl}` : articleUrl(slug);
  return { text, url };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats)
  const land = [];     // kind:'grunt' active records -> land.json
  const resultRefs = []; // { text, source_url, auction_date }

  // ---- Przetargi board (category=przedmiotowe74): active announcements ----
  const activeItems = await fetchListItems({ category: CATEGORY_PRZETARGI, maxPages: MAX_PAGES_ACTIVE });
  for (const item of activeItems) {
    const slug = item?.attributes?.slug;
    if (!slug) continue;
    const rec = await fetchArticle(slug);
    if (!rec) continue;
    const { text } = rec;
    if (!isSaleAuction(text)) continue; // defensive: board is dedicated, but skip any non-sale item
    if (isLease(text)) continue;        // dzierżawa / najem

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

    const enriched = { ...parsed, detail_url: rec.url, source_url: rec.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  // ---- Ogłoszenia board (category=przedmiotowe5), filtered to "wyniku" ----
  // titles: the achieved-price stream (see header comment for why NOT the
  // "Zakończone" board). Noisy source -> parseResultDoc() self-gates on
  // isResultDoc/isSaleAuction/isLease/kind, so pushing every candidate here
  // and letting the parser (and its test) own the filtering logic is safe.
  const resultItems = await fetchListItems({
    category: CATEGORY_OGLOSZENIA,
    filter: { title: 'wyniku' },
    maxPages: MAX_PAGES_RESULTS,
  });
  for (const item of resultItems) {
    const slug = item?.attributes?.slug;
    if (!slug) continue;
    const rec = await fetchArticle(slug);
    if (!rec) continue;
    const { text } = rec;
    if (!isResultDoc(text)) continue;
    if (!isSaleAuction(text)) continue;
    if (isLease(text)) continue;
    resultRefs.push({
      text,
      source_url: rec.url,
      auction_date: auctionDateFromText(text) || null,
    });
  }

  console.error(
    `  zlotoryja: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
