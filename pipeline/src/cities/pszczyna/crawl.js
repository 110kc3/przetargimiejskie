// Pszczyna crawler — bip.pszczyna.pl (ESC S.A. / VelaBIP), server-rendered HTML,
// no OCR needed (all attachments are born-digital). See config.js for the CMS
// shape + the two load-bearing deviations from a plain HTML board (mixed
// inline/PDF announcement bodies; the search endpoint as the real discovery
// path instead of the thin "Przetargi" category board).
//
// DISCOVERY: the BIP's own site-search (`/szukaj//<phrase>[////<page>]`,
// 10 results/page, newest first) is queried for two phrases that between them
// cover the whole flat + land auction history (verified live 2026-07-10):
//   "sprzedaż lokalu mieszkalnego"        -> 268 hits / 27 pages
//   "sprzedaż nieruchomości niezabudowanej" -> 220 hits / 22 pages
// Each hit is title-routed (announcement / result / lease-skip) exactly like
// the "Przetargi" board would be, just with full historical coverage. Bounded
// by an index-harvest time budget (mirrors bochnia) AND a separate
// article-fetch wall-clock budget + item cap (mirrors kedzierzyn-kozle) so a
// cold first run can't blow the 25-min CI job — unprocessed candidates simply
// backfill on the next run (results already committed are also skipped via
// loadKnownSourceUrls).
//
// PER-ARTICLE BODY: announcements try the inline `<article class="content">`
// text first; when that's empty/too short (the modern norm — verified live),
// fall back to the first .pdf/.doc(x) attachment (pdfText/docText). Results
// keep the RAW content HTML (not pre-stripped) so parse.js's
// resultTableFromHtml can find the achieved-price `<table>` when present.
//
// One memoised pass serves both streams (refresh.js calls crawlResultDocs()
// then crawlActive()). source:'html' => result refs already carry `.text`.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { htmlToText, isAnnouncementTitle, isResultTitle, isLeaseTitle, extractDetail, parseAnnouncement } from './parse.js';

const ORIGIN = 'https://bip.pszczyna.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Between them these two phrases cover the full flat + land auction history
// (both announcements AND results use "sprzedaż …" in their title/lead).
const QUERIES = ['sprzedaż lokalu mieszkalnego', 'sprzedaż nieruchomości niezabudowanej'];

// Bounded to 8 (was 30): each ~3.2MB page is ~6s, and with 2 queries a 30-page
// cap let the harvest alone run ~12 min → the whole refresh blew past both a Pi
// baseline run AND risked CI's 20-min step timeout. 8 pages/query captures the
// recent/current auctions (newest first); older items backfill over subsequent
// runs (loadKnownSourceUrls skips already-committed pages) — see the CI-safety
// note on ARTICLE_BUDGET_MS below.
const MAX_PAGES_PER_QUERY = Number(process.env.PSZCZYNA_MAX_PAGES) || 8;
// PER-QUERY budget (see harvestCandidates) — each ~3.2MB search-result page
// (the platform ships the whole sidebar nav tree on every page, see config.js)
// measured ~5-7s real-world to fetch, not the ~1s the fetch.js throttle alone
// implies, so a single SHARED budget starves the second query: a live smoke
// run (2026-07-10) spent the whole default 120s on page 17/27 of the FIRST
// query alone and never even started the land query (land: 0 that run). Each
// query now gets its own timer so land is never starved by a slow flats query.
// CI-safety budget (city job step timeout is 20 min in refresh.yml): with the
// 8-page cap the index is ~2 min and the article pass is bounded to 8 min / 150
// docs, so a full refresh finishes in ~10 min with headroom. Any remainder
// backfills on the next run — the daily cron converges the archive over a few
// days rather than in one over-long crawl.
const INDEX_BUDGET_MS = Number(process.env.PSZCZYNA_INDEX_BUDGET_MS) || 3 * 60 * 1000;
const ARTICLE_BUDGET_MS = Number(process.env.PSZCZYNA_ARTICLE_BUDGET_MS) || 8 * 60 * 1000;
const MAX_ARTICLES = Number(process.env.PSZCZYNA_MAX_ARTICLES) || 150;

export function searchUrl(phrase, page) {
  const q = encodeURIComponent(phrase).replace(/%20/g, '+');
  return page <= 1 ? `${ORIGIN}/szukaj//${q}` : `${ORIGIN}/szukaj//${q}////${page}`;
}

// Search-result list items: <h3><a class="jstree-draggable document-title" …
//   href="/<slug>#cnt">TITLE</a></h3>  (href is root-relative).
const ITEM_RE = /document-title[^>]*href="([^"#]+)#cnt">([\s\S]*?)<\/a>/gi;

export function harvestSearchItems(html) {
  const out = [];
  let m;
  ITEM_RE.lastIndex = 0;
  while ((m = ITEM_RE.exec(html)) !== null) {
    const href = m[1].startsWith('http') ? m[1] : `${ORIGIN}${m[1].startsWith('/') ? '' : '/'}${m[1]}`;
    const title = htmlToText(m[2]);
    if (title) out.push({ href, title });
  }
  return out;
}

/** Paginate every query, title-route each hit, dedupe by href. Each query gets
 *  its OWN wall-clock budget + a page cap (a slow/large first query must never
 *  starve a later one of any budget at all — see INDEX_BUDGET_MS). */
async function harvestCandidates() {
  const seen = new Set();
  const candidates = [];
  for (const phrase of QUERIES) {
    const start = Date.now();
    for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
      if (Date.now() - start > INDEX_BUDGET_MS) {
        console.error(`  pszczyna: index time budget reached (query "${phrase}", page ${page})`);
        break;
      }
      let html;
      try {
        html = await getText(searchUrl(phrase, page), FETCH_OPTS);
      } catch (err) {
        console.error(`  pszczyna index fetch failed ("${phrase}" p${page}): ${err.message}`);
        break;
      }
      const items = harvestSearchItems(html);
      if (!items.length) break; // "Nie znaleziono dokumentów" / past the last page
      for (const { href, title } of items) {
        if (seen.has(href)) continue;
        seen.add(href);
        if (isLeaseTitle(title)) continue;
        const isRes = isResultTitle(title);
        const isAnn = !isRes && isAnnouncementTitle(title);
        if (!isRes && !isAnn) continue;
        candidates.push({ href, title, role: isRes ? 'result' : 'ann' });
      }
      if (items.length < 10) break; // short page = last page of this query
    }
  }
  return candidates;
}

/** First .pdf (preferred) or .doc(x) attachment, or null. */
export function pickAttachment(attachments) {
  return (
    attachments.find((a) => a.format === 'pdf' || /\.pdf$/i.test(a.name)) ||
    attachments.find((a) => /docx?$/i.test(a.format) || /\.docx?$/i.test(a.name)) ||
    null
  );
}

/** Resolve an announcement's body text: inline content first, PDF/DOC fallback
 *  when inline is empty/too short (the modern norm on this BIP — see config.js). */
async function resolveAnnouncementBody(detail, href) {
  if (detail.contentText && detail.contentText.replace(/\s+/g, '').length >= 40) {
    return detail.contentText;
  }
  const att = pickAttachment(detail.attachments);
  if (!att) return null;
  try {
    return /\.pdf$/i.test(att.format) || /\.pdf$/i.test(att.name) ? await pdfText(att.url) : await docText(att.url);
  } catch (err) {
    console.error(`  pszczyna attachment extract failed (${att.url}, from ${href}): ${err.message}`);
    return null;
  }
}

let crawlPromise = null;

async function crawlAll() {
  const known = await loadKnownSourceUrls('pszczyna');
  const candidates = await harvestCandidates();
  console.error(`  pszczyna: ${candidates.length} candidate article(s) (announcements + results)`);

  const listings = [];
  const land = [];
  const resultRefs = [];
  const deadline = Date.now() + ARTICLE_BUDGET_MS;
  let processed = 0;
  let skippedKnown = 0;

  for (const c of candidates) {
    if (c.role === 'result' && known.has(c.href)) { skippedKnown++; continue; } // already committed
    if (processed >= MAX_ARTICLES || Date.now() > deadline) {
      console.error(
        `  pszczyna: article budget reached (processed ${processed}/${candidates.length - skippedKnown} remaining); remainder backfills next run`,
      );
      break;
    }
    processed++;

    let html;
    try {
      html = await getText(c.href, FETCH_OPTS);
    } catch (err) {
      console.error(`  pszczyna article fetch failed (${c.href}): ${err.message}`);
      continue;
    }
    // Defensive: the multi-tenant shared list endpoint can (per the spike)
    // return cross-tenant cached content — skip anything that doesn't even
    // mention Pszczyna rather than risk a bad record.
    if (!/Pszczy/i.test(html)) {
      console.error(`  pszczyna WARN: fetched page doesn't look like Pszczyna content, skipping (${c.href})`);
      continue;
    }

    const detail = extractDetail(html);
    if (!detail) {
      console.error(`  pszczyna WARN: could not locate document body (${c.href})`);
      continue;
    }

    if (c.role === 'result') {
      // Keep the RAW content HTML (not pre-stripped) so parse.js's
      // resultTableFromHtml can find the achieved-price <table> when present;
      // fall back to the attachment text on the rare empty-inline result.
      let bodyForText = detail.contentHtml;
      if (!detail.contentText || detail.contentText.replace(/\s+/g, '').length < 20) {
        const att = pickAttachment(detail.attachments);
        if (att) {
          try {
            bodyForText = /\.pdf$/i.test(att.format) || /\.pdf$/i.test(att.name) ? await pdfText(att.url) : await docText(att.url);
          } catch (err) {
            console.error(`  pszczyna result attachment extract failed (${att.url}, from ${c.href}): ${err.message}`);
          }
        }
      }
      resultRefs.push({
        text: `${detail.title}. ${bodyForText}`,
        pdf_url: c.href,
        detail_url: c.href,
        auction_date: null,
      });
      continue;
    }

    // Announcement.
    let bodyText;
    try {
      bodyText = await resolveAnnouncementBody(detail, c.href);
    } catch (err) {
      console.error(`  pszczyna announcement body resolve failed (${c.href}): ${err.message}`);
      continue;
    }
    if (!bodyText) {
      console.error(`  pszczyna WARN: empty body + no usable attachment (${c.href})`);
      continue;
    }
    let rec;
    try {
      rec = parseAnnouncement(detail.title, bodyText, c.href);
    } catch (err) {
      console.error(`  pszczyna announcement parse failed (${c.href}): ${err.message}`);
      continue;
    }
    if (!rec) {
      console.error(`  pszczyna WARN: unparsed announcement (${c.href}) (${detail.title.slice(0, 70)})`);
      continue;
    }
    (rec.kind === 'grunt' ? land : listings).push(rec);
  }

  console.error(
    `  pszczyna: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s) (${skippedKnown} known result(s) skipped)`,
  );
  return { listings, land, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  // No live, easily-parseable current "wykaz" board was found live (2026-07-10)
  // — the historical wykaz notices on this BIP are legacy/one-off documents,
  // not a maintained current-designation stream. Matches the majority
  // convention (bochnia/olkusz) of an empty wykaz[] until one surfaces.
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
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0] && { pdf_url: results[0].pdf_url, text: String(results[0].text).slice(0, 200) },
      },
      null,
      2,
    ) + '\n',
  );
}
