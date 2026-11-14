
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

const MAX_PAGES = 30;
const MAX_DETAILS = 90;
const MAX_FETCHES = 160;

function slugTitleFromUrl(url) {
  const slug = String(url)
    .replace(/^.*\/ogloszenie\//, '')
    .replace(/[#?].*$/, '')
    .replace(/-\d+$/, '');
  return slug.replace(/-/g, ' ');
}

function routeSlug(st) {
  if (isCancelled(st) || isLeaseTitle(st)) return null;
  if (/\bwykaz|konkurs|obwieszczeni|zam[óo]wien|nab[óo]r|bezprzetarg|linii\s+kolejow/i.test(st)) return null;
  if (isResultTitle(st)) return 'result';
  if (isAnnouncementTitle(st)) return 'announce';
  return null;
}

let crawlPromise = null;

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
    if (fresh === 0 && p > 1) break;
  }
  return links;
}

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
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

    let rec;
    try {
      rec = parseAnnouncement(html, url);
    } catch (err) {
      console.error(`  klobuck: parse failed (${url}): ${err.message}`);
      continue;
    }
    if (!rec || rec.cancelled) continue;
    if (!rec.address_raw && !rec.dzialka_nr) continue;
    if (rec.auction_date && rec.auction_date < today) continue;
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  klobuck: ${listings.length} listing(s), ${land.length} land plot(s), ${resultRefs.length} result(s) [${state.fetches} fetches]`,
  );
  return { listings, land, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

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
