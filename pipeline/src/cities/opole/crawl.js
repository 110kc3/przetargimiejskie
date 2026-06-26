// Opole crawler — bip.um.opole.pl (SISCO). The board LIST is SPA-rendered, so we
// walk the year→month index pages (/przetargi,9_<year>-<month>) and harvest the
// SSR article ids (/przetargi,9_<year>-<month>_<id>), then fetch + parse each
// server-rendered article. Announcement-only (no result stream).
//
// NOTE (confirm on first CI refresh): if the month index pages are themselves
// SPA-rendered to the fetcher, this harvest yields nothing — the first run will
// reveal it and the SISCO AJAX list endpoint (or id-probing) can be wired in.

import { getText } from '../../core/fetch.js';
import { parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.um.opole.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const YEAR = new Date().getFullYear();
const YEARS = [YEAR, YEAR - 1, YEAR - 2];

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];

  const seen = new Set();
  const articleUrls = [];
  for (const y of YEARS) {
    for (let mo = 1; mo <= 12; mo++) {
      const url = `${ORIGIN}/przetargi,9_${y}-${mo}`;
      let html;
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        continue;
      }
      for (const m of html.matchAll(/przetargi,9_(\d{4}-\d+_\d+)/g)) {
        const u = `${ORIGIN}/przetargi,9_${m[1]}`;
        if (!seen.has(u)) { seen.add(u); articleUrls.push(u); }
      }
    }
  }
  console.error(`  opole: ${articleUrls.length} candidate article(s) to inspect`);

  for (const url of articleUrls) {
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  opole article fetch failed (${url}): ${err.message}`);
      continue;
    }
    const rec = parseAnnouncement('', html, url);
    if (!rec) continue;
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  opole: ${listings.length} flat/building listing(s), ${land.length} land plot(s)`);
  return { listings, land };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}
