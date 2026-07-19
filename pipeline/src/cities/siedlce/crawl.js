// Siedlce crawler — siedlce.pl "Aktualności" (Vela/ESC SA CMS), server-rendered
// HTML, no auth/JS gate. See config.js + spikes/mazowieckie/siedlce/siedlce.md.
//
// siedlce.pl has NO dedicated przetarg/nieruchomości index — sale
// announcements are mixed into the general news stream, which is
// month-bucketed (/aktualnosci/<YYYY>/<MM>-<YYYY>/<slug>) but only paginable
// as one flat list (~500 pages deep at the time of writing). Walking that
// archive page-by-page would blow the politeness budget, so this crawler
// instead drives the site's own full-text search
// (/wyniki-wyszukiwania?search=<phrase>), which is relevance-ranked and puts
// every known real-estate-sale announcement on page 1 — LIVE-VERIFIED
// 2026-07-18:
//   "lokalu mieszkalnego"           -> both known flat auctions (Piłsudskiego
//                                       96/16, Jana III Sobieskiego 5/58), 0 noise
//   "zabudowanej nieruchomości"     -> the Świętojańska 4 office-building
//                                       auction (I/II/III przetarg), 1 noise item
//   "nieruchomości niezabudowanej"  -> 0 hits (no land auction live today)
//   "przetarg na sprzedaż działki"  -> 0 hits
//   "informacja o wyniku przetargu" -> 0 hits (achieved prices go on the
//                                       physical noticeboard only — §12 of the
//                                       auction regulation; see spike). Queried
//                                       anyway so a future online result stream
//                                       is picked up without a code change.
//
// bip.siedlce.pl (the "authoritative" board per the regulation text) is
// session-gated — confirmed live, blank body on a direct fetch — and is NOT
// used.
//
// Bounded for CI: each query is capped at a few result pages plus a shared
// wall-clock budget, even though every query above fit on a single page today.
// One memoised pass serves both crawlActive() and crawlResultDocs().

import { getText } from '../../core/fetch.js';
import { htmlToText } from '../../core/finn-bip.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { isAnnouncementTitle, isResultTitle, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://siedlce.pl';
const SEARCH_PATH = '/wyniki-wyszukiwania';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const ANNOUNCEMENT_QUERIES = [
  'lokalu mieszkalnego',
  'zabudowanej nieruchomości',
  'nieruchomości niezabudowanej',
  'przetarg na sprzedaż działki',
];
const RESULT_QUERIES = ['informacja o wyniku przetargu'];

const MAX_PAGES_PER_QUERY = Number(process.env.SIEDLCE_MAX_PAGES) || 3;
const TIME_BUDGET_MS = Number(process.env.SIEDLCE_TIME_BUDGET_MS) || 90000;

// One (href, title) pair per search-result card: an
// `<a href="/aktualnosci/...#nav">` immediately wrapping an `<h3>`.
const ITEM_RE = /<a href="(\/aktualnosci\/[^"]+)#nav"[^>]*>\s*<h3>([\s\S]*?)<\/h3>/gi;

function harvestResults(html) {
  const out = [];
  let m;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const title = htmlToText(m[2]);
    if (title) out.push({ href: ORIGIN + m[1], title });
  }
  return out;
}

// Isolate the article body: from `class="post-content"` to the
// `velacms-widget-tags` sentinel that closes every article (confirmed on 3
// live fixtures: Piłsudskiego, Sobieskiego, Świętojańska).
function articleBody(html) {
  const m = /<div class="post-content">/i.exec(html);
  if (!m) return html;
  const chunk = html.slice(m.index + m[0].length);
  const end = chunk.search(/velacms-widget-tags|<a onclick="goBack/i);
  return end > 0 ? chunk.slice(0, end) : chunk;
}

async function searchQuery(query, deadline) {
  const found = [];
  const seen = new Set();
  for (let p = 1; p <= MAX_PAGES_PER_QUERY; p++) {
    if (Date.now() > deadline) {
      console.error(`  siedlce: time budget reached mid-query "${query}" at page ${p}`);
      break;
    }
    const params = new URLSearchParams({ search: query });
    if (p > 1) params.set('page[wyniki-wyszukiwania]', String(p));
    let html;
    try {
      html = await getText(`${ORIGIN}${SEARCH_PATH}?${params}`, FETCH_OPTS);
    } catch (err) {
      console.error(`  siedlce search fetch failed ("${query}" p${p}): ${err.message}`);
      break;
    }
    const items = harvestResults(html);
    if (items.length === 0) break;
    let addedAny = false;
    for (const item of items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      found.push(item);
      addedAny = true;
    }
    if (!addedAny) break;
  }
  return found;
}

let crawlPromise = null;

async function crawlAll() {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const known = await loadKnownSourceUrls('siedlce');
  const listings = [];
  const land = [];
  const resultRefs = [];
  const seenHref = new Set();

  for (const q of ANNOUNCEMENT_QUERIES) {
    if (Date.now() > deadline) { console.error('  siedlce: overall time budget reached'); break; }
    const items = await searchQuery(q, deadline);
    console.error(`  siedlce search "${q}": ${items.length} result(s)`);
    for (const { href, title } of items) {
      if (seenHref.has(href) || !isAnnouncementTitle(title)) continue;
      seenHref.add(href);
      let html;
      try {
        html = await getText(href, FETCH_OPTS);
      } catch (err) {
        console.error(`  siedlce article fetch failed (${href}): ${err.message}`);
        continue;
      }
      const rec = parseAnnouncement(title, articleBody(html), href);
      if (!rec) {
        console.error(`  siedlce WARN: unparsed announcement ${href} (${title.slice(0, 70)})`);
        continue;
      }
      (rec.kind === 'grunt' ? land : listings).push(rec);
    }
  }

  for (const q of RESULT_QUERIES) {
    if (Date.now() > deadline) break;
    const items = await searchQuery(q, deadline);
    console.error(`  siedlce search "${q}": ${items.length} result(s)`);
    for (const { href, title } of items) {
      if (seenHref.has(href) || !isResultTitle(title) || known.has(href)) continue;
      seenHref.add(href);
      let html;
      try {
        html = await getText(href, FETCH_OPTS);
      } catch (err) {
        console.error(`  siedlce article fetch failed (${href}): ${err.message}`);
        continue;
      }
      resultRefs.push({
        text: `${title}. ${htmlToText(articleBody(html))}`,
        pdf_url: href, detail_url: href, auction_date: null,
      });
    }
  }

  console.error(
    `  siedlce: ${listings.length} listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
