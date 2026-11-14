import { getText } from '../../core/fetch.js';
import { parseAnnouncement } from './parse.js';

const ORIGIN = 'https://umig.olkusz.pl';
const ARCHIVES = ['/index.php/author/adminolkusz', '/index.php/author/beata-sobon'];
const MAX_PAGES = 22;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

function harvestPosts(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="(?:https?:\/\/umig\.olkusz\.pl)?(\/index\.php\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/?)"/gi)) out.add(m[1]);
  return [...out];
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];

  const seen = new Set();
  const posts = [];
  for (const archive of ARCHIVES) {
    for (let p = 1; p <= MAX_PAGES; p++) {
      const url = `${ORIGIN}${archive}/page/${p}/`;
      let html;
      try {
        html = await getText(url, FETCH_OPTS);
      } catch (err) {
        break;
      }
      let added = 0;
      for (const path of harvestPosts(html)) { if (!seen.has(path)) { seen.add(path); posts.push(path); added++; } }
      if (added === 0) break;
    }
  }
  console.error(`  olkusz: ${posts.length} candidate post(s) to inspect`);

  for (const path of posts) {
    const url = `${ORIGIN}${path}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  olkusz post fetch failed (${url}): ${err.message}`);
      continue;
    }
    const rec = parseAnnouncement(path, html, url);
    if (!rec) continue;
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(`  olkusz: ${listings.length} flat/building listing(s), ${land.length} land plot(s)`);
  return { listings, land };
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}
