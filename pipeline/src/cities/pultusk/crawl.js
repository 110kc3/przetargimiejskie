import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAnnouncementPost } from './parse.js';

const API = 'https://pultusk.pl/wp-json/wp/v2/posts';

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


async function apiSearch(term) {
  const url = `${API}?search=${encodeURIComponent(term)}&per_page=${PER_PAGE}&orderby=date&order=desc`;
  let raw;
  try {
    raw = await getText(url, FETCH_OPTS);
  } catch (err) {
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


export async function crawlResultDocs() {
  console.error('  pultusk crawlResultDocs: stub — no achieved-price stream found for property auctions on pultusk.pl (see parse.js header)');
  return [];
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land }, null, 2) + '\n');
  console.error(`Total active: ${listings.length} listing(s), ${land.length} land plot(s)`);
}
