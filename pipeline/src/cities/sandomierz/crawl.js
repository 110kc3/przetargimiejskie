
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText } from '../../core/finn-bip.js';
import { isAnnouncementTitle, isResultTitle, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.um.sandomierz.pl';
const BOARD_PATH = '/67/sprzedaz-i-dzierzawa-mienia-komunalnego.html';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = Number(process.env.SANDOMIERZ_MAX_PAGES) || 70;
const TIME_BUDGET_MS = Number(process.env.SANDOMIERZ_TIME_BUDGET_MS) || 180000;

const ITEM_RE = /<a href="(https:\/\/bip\.um\.sandomierz\.pl\/\d+\/(?:132\/)?[^"]+)">([^<]+)<\/a><\/h2>\s*<div class="pageOnPagePreambule"><p>([^<]*)<\/p>/g;

function decodeEntities(s) {
  return (s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeArticleUrl(url) {
  return String(url || '').replace(/(bip\.um\.sandomierz\.pl\/\d+)\/132\//i, '$1/');
}

export function harvestItems(html) {
  const out = [];
  let m;
  ITEM_RE.lastIndex = 0;
  while ((m = ITEM_RE.exec(html)) !== null) {
    out.push({ href: normalizeArticleUrl(m[1]), title: decodeEntities(m[2]), preambule: decodeEntities(m[3]) });
  }
  return out;
}

function articleBody(html) {
  const m = /<div[^>]*class="bip-page__content"[^>]*>/i.exec(html);
  if (!m) return html;
  const chunk = html.slice(m.index + m[0].length);
  const end = chunk.search(/<div[^>]*class="bip-page__footer"/i);
  return end > 0 ? chunk.slice(0, end) : chunk;
}

function candidateRole(title) {
  if (isResultTitle(title)) return 'result';
  if (isAnnouncementTitle(title)) return 'ann';
  return null;
}

let crawlPromise = null;

async function crawlAll() {
  const known = new Set(
    [...await loadKnownSourceUrls('sandomierz')].map(normalizeArticleUrl),
  );
  const start = Date.now();

  const seen = new Set();
  const candidates = [];
  let prevHrefsKey = '';
  for (let p = 1; p <= MAX_PAGES; p++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  sandomierz: index time budget reached at page ${p}`);
      break;
    }
    const url = p === 1 ? `${ORIGIN}${BOARD_PATH}` : `${ORIGIN}${BOARD_PATH}?Page=${p}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  sandomierz index fetch failed (${url}): ${err.message}`);
      break;
    }
    const items = harvestItems(html);
    if (items.length === 0) break;
    const hrefsKey = items.map((i) => i.href).join('|');
    if (hrefsKey === prevHrefsKey) {
      console.error(`  sandomierz: page ${p} repeats page ${p - 1} — end of board reached`);
      break;
    }
    prevHrefsKey = hrefsKey;
    for (const { href, title, preambule } of items) {
      if (seen.has(href)) continue;
      seen.add(href);
      const role = candidateRole(title);
      if (!role) continue;
      candidates.push({ href, title, preambule, role });
    }
  }
  console.error(`  sandomierz: ${candidates.length} candidate article(s) (announcements + results)`);

  const listings = [];
  const land = [];
  const resultRefs = [];
  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) continue;
    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  sandomierz article fetch failed (${c.href}): ${err.message}`);
      continue;
    }
    const body = articleBody(html);
    if (c.role === 'result') {
      resultRefs.push({
        text: `${c.title}. ${htmlToText(body)}`,
        pdf_url: c.href, detail_url: c.href, auction_date: null,
      });
      continue;
    }
    const rec = parseAnnouncement(c.title, body, c.href);
    if (!rec) {
      console.error(`  sandomierz WARN: unparsed announcement ${c.href} (${c.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  sandomierz: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
