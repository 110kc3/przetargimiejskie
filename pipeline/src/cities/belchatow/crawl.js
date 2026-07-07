// Bełchatów crawler.
//
// Reads belchatow.pl through the WordPress REST API (belchatow.pl/wp-json/wp/v2),
// which returns clean JSON and sidesteps the tagDiv theme's AJAX-hydrated
// category loop (that loop renders "Brak postów" server-side when idle). See
// config.js for the channel map (formal stubs in cat 220/221 vs. parseable
// prose in the news category 215).
//
// crawlActive():
//   Collects candidate posts from the dedicated flat category (220 "mieszkania")
//   plus a handful of REST full-text searches, dedupes by post id, keeps only
//   genuine flat-SALE announcements (isFlatSaleAnnouncement — must quote a
//   "cena wywoławcza"), and parses each prose body. Returns { listings, wykaz:[] }.
//
// crawlResultDocs():
//   Searches the same site for "informacja o wyniku …" flat result posts. None
//   are published on belchatow.pl today (achieved-price notices live only on
//   belchatow.bip.gov.pl), so this returns [] in practice; the wiring +
//   parse.js parseResultDoc are ready for when a result post appears.
//
// Volume: ~1–2 municipal flat auctions/year — low-frequency polling.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAnnouncementPost, stripTags, isFlatSaleAnnouncement } from './parse.js';

const API = 'https://belchatow.pl/wp-json/wp/v2';

// Dedicated flat subcategory ("Mieszkania", child of "Przetargi").
const CAT_MIESZKANIA = 220;

// Full-text search terms that surface flat-sale announcements (the news prose
// posts live in the large "Aktualności" category, not under przetargi).
const SEARCH_TERMS = ['mieszkanie sprzedaż', 'lokalu mieszkalnego', 'licytacja mieszkanie'];

// Result-notice search terms.
const RESULT_TERMS = ['informacja o wyniku', 'wyniku przetargu lokal'];

const PER_PAGE = 30;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

async function apiPosts(query) {
  const url = `${API}/posts?${query}`;
  let raw;
  try {
    raw = await getText(url, FETCH_OPTS);
  } catch (err) {
    // WordPress returns HTTP 400 for an empty search / unknown category rather
    // than an empty array — treat as "no posts", not a hard failure.
    if (/\bhttp\s+400\b/i.test(err.message)) return [];
    console.error(`  belchatow: REST fetch failed (${url}): ${err.message}`);
    return [];
  }
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    console.error(`  belchatow: REST returned non-JSON for ${url}`);
    return [];
  }
}

// Collect posts from a category + several searches, deduped by id.
async function collectCandidates(terms, categoryId) {
  const byId = new Map();
  const add = (posts) => {
    for (const p of posts) if (p && p.id != null && !byId.has(p.id)) byId.set(p.id, p);
  };

  if (categoryId != null) {
    add(await apiPosts(`categories=${categoryId}&per_page=${PER_PAGE}&orderby=date&order=desc`));
  }
  for (const term of terms) {
    add(await apiPosts(`search=${encodeURIComponent(term)}&per_page=${PER_PAGE}&orderby=date&order=desc`));
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
// crawlActive
// ---------------------------------------------------------------------------

export async function crawlActive() {
  const candidates = await collectCandidates(SEARCH_TERMS, CAT_MIESZKANIA);
  console.error(`  belchatow crawlActive: ${candidates.length} candidate post(s)`);

  const listings = [];
  const seenKeys = new Set();
  for (const p of candidates) {
    const rec = parseAnnouncementPost(postToInput(p));
    if (!rec || !rec.address) continue;
    // Dedupe by address key + auction date (news + formal stub of same auction).
    const k = `${rec.address.key}|${rec.auction_date ?? ''}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    listings.push(rec);
  }

  console.error(`  belchatow crawlActive: ${listings.length} flat listing(s) parsed`);
  return { listings, wykaz: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  const candidates = await collectCandidates(RESULT_TERMS, null);

  const docs = [];
  const seen = new Set();
  for (const p of candidates) {
    const title = stripTags(p?.title?.rendered ?? '');
    const body = stripTags(p?.content?.rendered ?? '');
    const t = `${title} ${body}`.toLowerCase();
    // Keep only flat-sale result notices; drop dzierżawa/najem/działka results.
    if (!/informacj\w*\s+o\s+wynik|cena\s+osi[ąa]gni|wynik\w*\s+negatywn/.test(t)) continue;
    if (!/lokal\w*\s+mieszkaln|mieszkani/.test(t)) continue;
    if (/dzier[żz]aw|najem|wynaj|dzia[łl]k|lokal\w*\s+u[żz]ytkow/.test(t)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    docs.push({ text: body, date: (p.date || '').slice(0, 10) || null, url: p.link || null });
  }

  console.error(`  belchatow crawlResultDocs: ${docs.length} result doc(s)`);
  return docs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total active: ${listings.length}`);
}
