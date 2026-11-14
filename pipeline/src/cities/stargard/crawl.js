
import { getText } from '../../core/fetch.js';
import { parseTbsDetail, parseTbsLandDetail, parseBipResultList } from './parse.js';

const TBS_ORIGIN = 'https://tbs.stargard.pl';
const TBS_ARCHIVE = '/rodzaj-nieruchomosci/przetargi';
const BIP_RESULTS = 'https://bip.stargard.eu/22358';
const BIP_ORIGIN = 'https://bip.stargard.eu';

const MAX_TBS_PAGES = 15;
const MAX_BIP_PAGES = 10;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };


function harvestTbsPosts(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="(https?:\/\/tbs\.stargard\.pl\/ogloszenia\/[^"]+)"/gi)) {
    const url = m[1].replace(/\?.*$/, '').replace(/\/$/, '') + '/';
    out.add(url);
  }
  return [...out];
}

async function crawlTbsListings() {
  const postUrls = new Set();

  for (let page = 1; page <= MAX_TBS_PAGES; page++) {
    const url = page === 1
      ? `${TBS_ORIGIN}${TBS_ARCHIVE}/`
      : `${TBS_ORIGIN}${TBS_ARCHIVE}/page/${page}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/http 404|http 40[013]|ECONNREFUSED|ENOTFOUND/i.test(err.message)) break;
      console.error(`  stargard TBS page ${page} fetch failed: ${err.message}`);
      break;
    }
    const links = harvestTbsPosts(html);
    if (links.length === 0) break;
    let added = 0;
    for (const u of links) { if (!postUrls.has(u)) { postUrls.add(u); added++; } }
    if (added === 0) break;
  }

  console.error(`  stargard: ${postUrls.size} TBS post(s) to inspect`);

  const land = [];
  const byKey = new Map();

  for (const url of postUrls) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  stargard TBS post fetch failed (${url}): ${err.message}`);
      continue;
    }
    land.push(...parseTbsLandDetail(html, url));
    const rec = parseTbsDetail(html, url);
    if (!rec || rec.kind === 'grunt') continue;

    const key = rec.address?.key;
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, rec);
    } else {
      const newRound = rec.round ?? 0;
      const existRound = existing.round ?? 0;
      if (newRound > existRound) byKey.set(key, rec);
    }
  }

  const listings = [...byKey.values()];
  console.error(`  stargard: ${listings.length} flat listing(s) from TBS`);
  return { listings, land };
}


async function crawlBipResultPages() {
  const all = [];
  const seenSymbols = new Set();

  for (let page = 1; page <= MAX_BIP_PAGES; page++) {
    const url = page === 1 ? BIP_RESULTS : `${BIP_RESULTS}/strona/${page}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      if (/http 404|http 40[013]/i.test(err.message)) break;
      console.error(`  stargard BIP results page ${page} fetch failed: ${err.message}`);
      break;
    }
    const items = parseBipResultList(html, BIP_ORIGIN);
    if (items.length === 0) break;

    let added = 0;
    for (const it of items) {
      if (seenSymbols.has(it.symbol)) continue;
      seenSymbols.add(it.symbol);
      all.push(it);
      added++;
    }
    if (added === 0) break;
  }

  console.error(`  stargard: ${all.length} flat/commercial BIP result notice(s)`);
  return all;
}

// Exported crawl functions (adapter contract)

export async function crawlActive() {
  const { listings, land } = await crawlTbsListings();
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  const notices = await crawlBipResultPages();
  return notices.map((n) => ({
    text: n.text,
    date: n.date,
    url: n.href,
  }));
}
