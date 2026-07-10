// Proszowice crawler — the "Nieruchomości gminne" news-category board on the
// bespoke ASP city portal (server-rendered HTML, no OCR). See config.js.
//
// PAGINATION (verified live 2026-07-10): the category's own friendly URL
// (`aktualnosci-25-nieruchomosci_gminne.html`) is a single-request "page 1"
// snapshot. Its own in-page "next page" links point at
// `/aktualnosci-lista-strona-N.html`, but that generic path does NOT preserve
// the category filter — fetched directly (even with a cookie jar carried over
// from the category page — the site sets no session cookie at all) it falls
// straight back to the full ~2500-item unfiltered "Aktualności" archive. The
// spike's assumed `aktualnosci-25-nieruchomosci_gminne-N.html` pattern 404s.
// The filter DOES survive as a `?page=N` query string appended to the
// ORIGINAL friendly URL — confirmed by diffing the returned article sets across
// pages 1-15 (page 15 repeats page 14 verbatim: 14 is the true last page as of
// 2026-07-10, ≈126 items). Several items ("promowana" board picks) are pinned
// and repeat on every page — harmless, deduped by href below.
//
// One memoised pass serves both streams (refresh.js calls crawlResultDocs()
// then crawlActive()). source:'html' ⇒ result refs already carry `.text`.
//
// Bounded for CI: a page cap + a wall-clock budget on the index harvest, plus
// an early stop once a page contributes zero NEW candidates (the site clamps
// past the last page instead of 404ing, so this is the only reliable stop
// signal). Incremental: result pages already committed to data/proszowice are
// skipped via loadKnownSourceUrls.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText, isResultTitle, isAnnouncementTitle, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://proszowice.pl';
const CATEGORY = '/aktualnosci-25-nieruchomosci_gminne.html';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = Number(process.env.PROSZOWICE_MAX_PAGES) || 30;
const TIME_BUDGET_MS = Number(process.env.PROSZOWICE_TIME_BUDGET_MS) || 120000;

// Board item: <a target="_self" href="/aktualnosc-NNNN-slug.html"><span
// class="box-left">...<span class="title">TITLE</span>...</span><span
// class="box-right">...a SECOND (duplicate) title + excerpt...</span></a>.
// Only the FIRST <span class="title"> (inside box-left) is captured so a
// title isn't duplicated.
const ITEM_RE = /<a target="_self" href="(\/aktualnosc-\d+-[^"]+\.html)">[\s\S]*?<span class="title">\s*([\s\S]*?)\s*<\/span>/g;

function harvestLinks(html) {
  const out = [];
  let m;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const title = htmlToText(m[2]);
    if (title) out.push({ href: ORIGIN + m[1], title });
  }
  return out;
}

// Isolate the article body (schema.org NewsArticle body), dropping the
// surrounding chrome / share-icons / related-articles sections that follow.
function articleBody(html) {
  const m = /<div[^>]*class="tresc"[^>]*itemprop="articleBody"[^>]*>/i.exec(html);
  if (!m) return '';
  const chunk = html.slice(m.index + m[0].length);
  const end = chunk.search(/<aside\s+class="left"/i);
  return end > 0 ? chunk.slice(0, end) : chunk;
}

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('proszowice');
  const start = Date.now();

  // 1) Harvest candidate (href,title) across the paginated, filtered board;
  //    keep only sale announcements + result notices by title; dedupe by href.
  const seen = new Set();
  const candidates = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  proszowice: index time budget reached at page ${p}`);
      break;
    }
    const url = p === 1 ? `${ORIGIN}${CATEGORY}` : `${ORIGIN}${CATEGORY}?page=${p}`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  proszowice index fetch failed (${url}): ${err.message}`);
      break;
    }
    let added = 0;
    for (const { href, title } of harvestLinks(html)) {
      if (seen.has(href)) continue;
      seen.add(href);
      const isRes = isResultTitle(title);
      const isAnn = !isRes && isAnnouncementTitle(title);
      if (!isRes && !isAnn) continue;
      candidates.push({ href, title, role: isRes ? 'result' : 'ann' });
      added++;
    }
    if (added === 0 && p > 1) {
      console.error(`  proszowice: no new candidates at page ${p}, stopping`);
      break;
    }
  }
  console.error(`  proszowice: ${candidates.length} candidate article(s) (announcements + results)`);

  // 2) Fetch + parse each. Skip result pages already committed to data/proszowice.
  const listings = [];
  const land = [];
  const resultRefs = [];
  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) continue;
    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  proszowice article fetch failed (${c.href}): ${err.message}`);
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
      console.error(`  proszowice WARN: unparsed announcement ${c.href} (${c.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  proszowice: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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

// Live smoke test: `node src/cities/proszowice/crawl.js`.
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
