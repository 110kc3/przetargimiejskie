// Bochnia crawler — the WordPress "Komunikaty i ogłoszenia" category archive
// (server-rendered HTML, no OCR). See config.js.
//
// The archive is a MIXED, paginated list (107 pages: auctions, results,
// ostrzeżenia, wykazy, konkursy). Each post is a full HTML article at
// https://bochnia.eu/<slug>/. We harvest (href,title) pairs from the archive
// pages, keep only sale announcements + result notices by TITLE, then fetch each
// article and parse its cs-post-content body.
//
// One memoised pass serves both streams (refresh.js calls crawlResultDocs() then
// crawlActive()). source:'html' ⇒ result refs already carry `.text`.
//
// Bounded for CI: a page cap + a wall-clock budget on the index harvest so the
// 25-min refresh job can't stall on the 107-page archive. Incremental: result
// pages already committed to data/bochnia are skipped via loadKnownSourceUrls.
//
// NOTE (confirm on first CI refresh): the archive markup + pagination depth were
// inferred from the live pages; the body parsers are groundtruthed.

import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText } from '../../core/finn-bip.js';
import { isAnnouncementTitle, isResultTitle, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bochnia.eu';
const CATEGORY = '/kategorie/komunikaty-i-ogloszenia/';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = Number(process.env.BOCHNIA_MAX_PAGES) || 40;
const TIME_BUDGET_MS = Number(process.env.BOCHNIA_TIME_BUDGET_MS) || 120000;

// A post permalink is a single-segment slug: https://bochnia.eu/<slug>/ (no
// further "/"). Multi-segment paths (/kategorie/…/page/N/, /en/…, /wp-…) are
// excluded because the slug char class forbids "/". Harvest (href,title) — the
// thumbnail anchor wraps an <img> (title flattens to empty → dropped).
const POST_RE = /<a[^>]+href="(https:\/\/bochnia\.eu\/[a-z0-9][a-z0-9-]{15,}\/)"[^>]*>([\s\S]*?)<\/a>/gi;

function harvestLinks(html) {
  const out = [];
  let m;
  while ((m = POST_RE.exec(html)) !== null) {
    const href = m[1];
    const title = htmlToText(m[2]);
    if (title && title.length > 10) out.push({ href, title });
  }
  return out;
}

// Isolate the article body (the WordPress post content div), dropping the
// surrounding chrome / social / related-posts sections.
function articleBody(html) {
  const m = /<[^>]*class="cs-post-content"[^>]*>/i.exec(html);
  if (!m) return html;
  const chunk = html.slice(m.index + m[0].length);
  const end = chunk.search(/cs-single-post-controls|cs-related|<footer/i);
  return end > 0 ? chunk.slice(0, end) : chunk;
}

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('bochnia');
  const start = Date.now();

  // 1) Harvest candidate (href,title) across the paginated archive; keep sale
  //    announcements + result notices by title; dedupe by href.
  const seen = new Set();
  const candidates = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.error(`  bochnia: index time budget reached at page ${p}`);
      break;
    }
    const url = p === 1 ? `${ORIGIN}${CATEGORY}` : `${ORIGIN}${CATEGORY}page/${p}/`;
    let html;
    try {
      html = await getText(url, FETCH_OPTS);
    } catch (err) {
      // 404 past the last archive page → stop paging.
      if (!/\b404\b/.test(err.message)) {
        console.error(`  bochnia index fetch failed (${url}): ${err.message}`);
      }
      break;
    }
    for (const { href, title } of harvestLinks(html)) {
      if (seen.has(href)) continue;
      seen.add(href);
      const isRes = isResultTitle(title);
      const isAnn = !isRes && isAnnouncementTitle(title);
      if (!isRes && !isAnn) continue;
      candidates.push({ href, title, role: isRes ? 'result' : 'ann' });
    }
  }
  console.error(`  bochnia: ${candidates.length} candidate article(s) (announcements + results)`);

  // 2) Fetch + parse each. Skip result pages already committed to data/bochnia.
  const listings = [];
  const land = [];
  const resultRefs = [];
  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) continue;
    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  bochnia article fetch failed (${c.href}): ${err.message}`);
      continue;
    }
    const body = articleBody(html);
    if (c.role === 'result') {
      // Fold the title into the text so round/kind detection is robust (the
      // body repeats "o wyniku … przetargu", but the round ordinal is clearest
      // in the title).
      resultRefs.push({
        text: `${c.title}. ${htmlToText(body)}`,
        pdf_url: c.href, detail_url: c.href, auction_date: null,
      });
      continue;
    }
    const rec = parseAnnouncement(c.title, body, c.href);
    if (!rec) {
      console.error(`  bochnia WARN: unparsed announcement ${c.href} (${c.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  bochnia: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
