// Sandomierz crawler — the mixed "Sprzedaż i dzierżawa mienia komunalnego"
// board (category 132), server-rendered HTML, no OCR. See config.js.
//
// The board is a flat, paginated article list (`?Page=N`, ~590 results / ~66
// pages, newest first). Each item is a `pageOnPageElement` `<li>` carrying an
// (href, title, preambule) triple. We harvest candidates by TITLE ONLY
// (isAnnouncementTitle/isResultTitle — see parse.js for why the preambule
// blurb is not trusted for the sale-vs-rental call), fetch each candidate's
// detail page, and let parseAnnouncement's body-level isSaleBody gate make
// the authoritative sale/rental decision. One memoised pass serves both
// streams (refresh.js calls crawlResultDocs() then crawlActive()).
// source:'html' ⇒ result refs already carry `.text`.
//
// Pagination quirk (verified live): `?Page=N` past the last page does NOT
// 404 or return an empty list — it clamps to the last valid page (page 67
// returns byte-identical content to page 66). So the loop stops when a page's
// item hrefs are identical to the previous page's, not on an empty page.
//
// Bounded for CI: a page cap + a wall-clock budget on the index harvest so
// the 25-min refresh job can't stall on the ~66-page archive. Incremental:
// result pages already committed to data/sandomierz are skipped via
// loadKnownSourceUrls.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText } from '../../core/finn-bip.js';
import { isAnnouncementTitle, isResultTitle, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.um.sandomierz.pl';
const BOARD_PATH = '/67/132/sprzedaz-i-dzierzawa-mienia-komunalnego.html';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const MAX_PAGES = Number(process.env.SANDOMIERZ_MAX_PAGES) || 70;
const TIME_BUDGET_MS = Number(process.env.SANDOMIERZ_TIME_BUDGET_MS) || 180000;

// Board item: <h2 class="pageOnPageHeader"><a href="...">TITLE</a></h2>
//             <div class="pageOnPagePreambule"><p>PREAMBULE</p></div>
const ITEM_RE = /<a href="(https:\/\/bip\.um\.sandomierz\.pl\/\d+\/132\/[^"]+)">([^<]+)<\/a><\/h2>\s*<div class="pageOnPagePreambule"><p>([^<]*)<\/p>/g;

function decodeEntities(s) {
  return (s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function harvestItems(html) {
  const out = [];
  let m;
  ITEM_RE.lastIndex = 0;
  while ((m = ITEM_RE.exec(html)) !== null) {
    out.push({ href: m[1], title: decodeEntities(m[2]), preambule: decodeEntities(m[3]) });
  }
  return out;
}

// Isolate the article body (the page's content div), dropping the
// surrounding chrome / attachment-list-adjacent footer. The end marker is the
// FULL opening tag `<div ... class="bip-page__footer"`, not just the bare
// class-name substring: searching for the substring alone cuts mid-tag
// (right after the preceding `<div class="` fragment that immediately
// precedes it in the real markup, `...</div>\n<div class="bip-page__footer">`),
// leaking a dangling unclosed `<div class="` into the sliced chunk — verified
// live, htmlToText can't strip an unterminated tag (its tag-stripper requires
// a closing `>`), so that fragment would otherwise survive into the parsed
// text of every single article.
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
  const known = await loadKnownSourceUrls('sandomierz');
  const start = Date.now();

  // 1) Harvest candidate (href,title) across the paginated board; keep sale
  //    announcements + result notices by TITLE, then fetch each article and
  //    parse its body. Stop when a page repeats the previous one (the CMS
  //    clamps out-of-range `?Page=N` to the last valid page).
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

  // 2) Fetch + parse each. Skip result pages already committed to data/sandomierz.
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
      // Fold the title into the text so round/kind detection is robust.
      resultRefs.push({
        text: `${c.title}. ${htmlToText(body)}`,
        pdf_url: c.href, detail_url: c.href, auction_date: null,
      });
      continue;
    }
    const rec = parseAnnouncement(c.title, body, c.href);
    if (!rec) {
      // Expected for the rental/tenant-sale titles the cheap title-gate lets
      // through (isSaleBody / kind-key gates reject them) — not necessarily a
      // parser bug, just noise-suppressed here as INFO-level via console.error.
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
