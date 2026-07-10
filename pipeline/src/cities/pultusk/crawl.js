// Pułtusk crawler.
//
// Reads pultusk.pl through the WordPress REST API (pultusk.pl/wp-json/wp/v2/
// posts?search=...). Confirmed live 2026-07-10: the SEARCH/list endpoint
// already embeds each post's full `content.rendered` (byte-identical to the
// single-post endpoint), so — unlike namyslow (board HTML + a per-post detail
// fetch) — this crawler never fetches a second page per candidate. Each
// search is one HTTP request; the whole crawl is a handful of requests.
//
// There is no dedicated przetargi/nieruchomości category (see config.js), so
// candidates come from several full-text search terms chosen to cover both
// the flat-sale ("PRZETARG" singular) and land-sale ("PRZETARGI" plural,
// "nieruchomości niezabudowanych") notice families — see spike
// spikes/mazowieckie/powiat-pultuski/pultusk.md §2. parse.js's title guards
// (isWykazTitle/isLeaseTitle) + classifyKind + the "must carry a real price"
// checks in parseFlatAnnouncement/parseLandAnnouncements do the real
// filtering; the search terms just bound the candidate set.
//
// crawlActive():
//   Collects candidates from SEARCH_TERMS (deduped by post id), parses each
//   via parseAnnouncementPost, and partitions the resulting records into
//   listings (kind !== 'grunt') / land (kind === 'grunt'). A recurring
//   przetarg is re-announced per round (I, II, III, ...) as a SEPARATE post
//   each time — round I/II/III of the same flat or the same land parcel-
//   bundle all show up as separate candidates in one crawl — so the results
//   are deduped to the LATEST round per identity key (address.key for
//   flats, dzialka_nr for land) before returning, keeping only the current
//   state of each recurring przetarg. Returns { listings, wykaz: [], land }
//   — wykaz stays empty, see config.js/parse.js (isWykazTitle).
//
// crawlResultDocs():
//   STUB — returns []. No "informacja o wyniku przetargu" stream exists for
//   property auctions on pultusk.pl (searched live 2026-07-10, 0 relevant
//   hits) — see parse.js file header + the spike §4.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAnnouncementPost } from './parse.js';

const API = 'https://pultusk.pl/wp-json/wp/v2/posts';

// Chosen to cover both notice families seen live (spike §2 + build-day
// re-verification): flat notices open "... OGŁASZA <N> PRZETARG USTNY
// NIEOGRANICZONY na sprzedaż lokalu mieszkalnego ..." (singular PRZETARG);
// land notices open "... OGŁASZA <N> PRZETARGI USTNE NIEOGRANICZONE na
// sprzedaż nieruchomości niezabudowanych ..." (plural PRZETARGI). The last
// two terms are a defensive wider net (they also catch WYKAZ/teaser posts —
// harmless, parse.js's guards + "must carry a real price" checks drop them).
const SEARCH_TERMS = [
  'przetarg ustny nieograniczony',
  'przetargi ustne nieograniczone',
  'sprzedaż lokalu mieszkalnego',
  'sprzedaż nieruchomości niezabudowanych',
];

const PER_PAGE = 30;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

async function apiSearch(term) {
  const url = `${API}?search=${encodeURIComponent(term)}&per_page=${PER_PAGE}&orderby=date&order=desc`;
  let raw;
  try {
    raw = await getText(url, FETCH_OPTS);
  } catch (err) {
    // WordPress returns HTTP 400 for an empty search rather than [] — treat
    // as "no posts", not a hard failure (same convention as belchatow).
    if (/\bhttp\s+400\b/i.test(err.message)) return [];
    console.error(`  pultusk: REST search failed ("${term}"): ${err.message}`);
    return [];
  }
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    console.error(`  pultusk: REST search returned non-JSON for "${term}"`);
    return [];
  }
}

async function collectCandidates() {
  const byId = new Map();
  for (const term of SEARCH_TERMS) {
    const posts = await apiSearch(term);
    for (const p of posts) if (p && p.id != null && !byId.has(p.id)) byId.set(p.id, p);
  }
  return [...byId.values()];
}

function postToInput(p) {
  return {
    title: p?.title?.rendered ?? '',
    content: p?.content?.rendered ?? '',
    date: p?.date ?? '',
    link: p?.link ?? '',
  };
}

// ---------------------------------------------------------------------------
// Dedupe recurring rounds: keep only the LATEST round (ties broken by the
// most recent published_date) per identity key.
// ---------------------------------------------------------------------------

function dedupeLatestRound(records, keyFn) {
  const best = new Map();
  for (const r of records) {
    const k = keyFn(r);
    if (!k) continue;
    const prev = best.get(k);
    const better =
      !prev ||
      (r.round ?? 0) > (prev.round ?? 0) ||
      ((r.round ?? 0) === (prev.round ?? 0) && (r.published_date || '') > (prev.published_date || ''));
    if (better) best.set(k, r);
  }
  return [...best.values()];
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

export async function crawlActive() {
  const candidates = await collectCandidates();
  console.error(`  pultusk crawlActive: ${candidates.length} candidate post(s)`);

  let listings = [];
  let land = [];
  for (const p of candidates) {
    const recs = parseAnnouncementPost(postToInput(p));
    for (const r of recs) (r.kind === 'grunt' ? land : listings).push(r);
  }

  listings = dedupeLatestRound(listings, (r) => r.address?.key);
  land = dedupeLatestRound(land, (r) => r.dzialka_nr);

  console.error(`  pultusk crawlActive: ${listings.length} flat listing(s), ${land.length} land plot(s)`);
  return { listings, wykaz: [], land };
}

// ---------------------------------------------------------------------------
// crawlResultDocs — stub (see header note)
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  console.error('  pultusk crawlResultDocs: stub — no achieved-price stream found for property auctions on pultusk.pl (see parse.js header)');
  return [];
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total active: ${listings.length} listing(s), ${land.length} land plot(s)`);
}
