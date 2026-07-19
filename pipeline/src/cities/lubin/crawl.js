// Lubin crawler — server-rendered Logonet BIP (v5.7.0), no SPA, no auth.
// See config.js for the CMS-vendor note.
//
// TLS: bip.um.lubin.pl serves an incomplete certificate chain ("unable to get
// local issuer certificate" — live-verified 2026-07-18, same class of issue as
// zabrze); `insecureTLS: true` on every fetch.
//
// Boards (slugs, not numeric ids — see spikes/dolnoslaskie/powiat-lubinski/
// lubin.md + mapa-serwisu, live-verified 2026-07-18):
//   ogloszenia-o-przetargach          — announcements (flats + land)
//   informacje-o-wynikach-przetargow  — result notices (achieved price)
//   wykazy-nieruchomosci              — pre-auction wykaz designations
//   postepowania-przetargowe-2009-2020 — closed historical archive, OUT OF
//     SCOPE (name says it all; not crawled)
//
// ENUMERATION: unlike jelenia-gora (same CMS VENDOR, older v2.9.0 install),
// this install's `/artykuly/xml/<board>/<page>/<size>` feed 404s — confirmed
// live 2026-07-18 on several id/slug variants. Board pages are ordinary
// server-rendered HTML instead: `<main id="main-content" data-category=NNN>`
// wraps zero or more `<article><h2><a href="/artykul/<slug>">Title</a>` items
// plus a `?page=N` pagination nav (confirmed live: aktualnosci-i-ogloszenia
// spans 4 pages). We paginate that instead of using a feed.
//
// LIVE FINDING (2026-07-18) — both `ogloszenia-o-przetargach` (announcements)
// and `informacje-o-wynikach-przetargow` (results) are CURRENTLY EMPTY (0
// <article> items, page 1 of 1) even though the spike documented an active
// multi-year flat-auction stream (sessions in 2015/2016/2018-19/2022/2023,
// a ≥8-lot batch on 2025-09-16, a single-lot session on 2026-03-09). Historical
// PDFs are still directly reachable by attachment id even after their
// wrapping article page ages out of the board and the sitemap (attachment ids
// 9945/10067/10683/9472, all fetched live 2026-07-18, groundtruth this
// adapter's parsers — see parse.js). This is the SAME short-retention pattern
// jelenia-gora's build discovered on its results board, but here it applies to
// the ANNOUNCEMENTS board too: whatever isn't captured by a run before the
// board prunes it is permanently lost to this pipeline, so a tight refresh
// cadence (the normal CI cadence) is the only mitigation, same as
// jelenia-gora. `wykazy-nieruchomosci` (274) currently holds 7 entries, all
// dzierżawa (lease) or zamiana (exchange) — none is a genuine flat-SALE wykaz
// (see parse.js's isGenuineSaleWykazTitle gate).
//
// Politeness: this build kept live fetches to bip.um.lubin.pl well under the
// ~40-fetch budget (a past agent's ~150 research requests got a host
// rate-limited); the crawl itself is bounded below by page/article caps + a
// wall-clock budget so a CI job can't time out even if the boards fill back
// up.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isResultNotice,
  isGenuineSaleWykazTitle,
  wykazRecordsFromText,
} from './parse.js';

const ORIGIN = 'https://bip.um.lubin.pl';
const FETCH_OPTS = { insecureTLS: true };
const ANNOUNCEMENTS_URL = `${ORIGIN}/artykuly/ogloszenia-o-przetargach`;
const RESULTS_URL = `${ORIGIN}/artykuly/informacje-o-wynikach-przetargow`;
const WYKAZ_URL = `${ORIGIN}/artykuly/wykazy-nieruchomosci`;

/** The `<main id="main-content">…</main>` slice of a page — attachment/article
 *  links are scoped to this region so the site-wide footer boilerplate link
 *  (a fixed "Raport dostępności" PDF present on EVERY page) is never picked up
 *  as a content attachment. Falls back to the whole page defensively. */
function mainContent(html) {
  const start = html.indexOf('<main id="main-content"');
  if (start === -1) return html;
  const end = html.indexOf('</main>', start);
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

/** Article list items on a board page: [{ url, title }]. */
function boardArticles(html) {
  const main = mainContent(html);
  const out = [];
  const re = /<article[^>]*>[\s\S]*?<a\s+href="(\/artykul\/[^"]+)"\s*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(main)) !== null) {
    out.push({ url: ORIGIN + m[1], title: m[2].trim() });
  }
  return out;
}

/** Distinct PDF attachment URLs on a detail (article) page, scoped to the
 *  main content region — see mainContent(). Normalises the encoded-filename
 *  suffix away (the same id resolves at the bare `/download` URL — confirmed
 *  live). */
function pdfAttachments(html) {
  const main = mainContent(html);
  const out = [];
  const seen = new Set();
  const re = /href="[^"]*\/attachments\/(\d+)\/download[^"]*"/g;
  let m;
  while ((m = re.exec(main)) !== null) {
    const url = `${ORIGIN}/attachments/${m[1]}/download`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Fetches every page of a board (bounded by a page cap + shared deadline),
 *  returning the concatenated article list. Stops on an empty page (Logonet
 *  doesn't 404 past the last page — it just renders zero <article>s). */
async function fetchBoardArticles(boardUrl, { maxPages, deadline, label }) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    if (Date.now() > deadline) {
      console.error(`  lubin: ${label} crawl budget reached at page ${page}`);
      break;
    }
    let html;
    try {
      html = await getText(`${boardUrl}?page=${page}`, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: ${label} board page ${page} fetch failed: ${err.message}`);
      break;
    }
    const articles = boardArticles(html);
    if (!articles.length) break;
    out.push(...articles);
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats/commercial)
  const land = []; // kind:'grunt' active records → land.json
  const wykaz = []; // pre-auction designations (no date/price yet)
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date: null }

  const known = await loadKnownSourceUrls('lubin');

  // Defensive bounds: board enumeration itself is cheap (a handful of page
  // fetches), but each article costs a detail fetch + a PDF fetch, so a
  // budget guards against unexpected corpus growth blowing past the CI job's
  // window. Boards are CURRENTLY empty (see file header) so in practice this
  // first run barely touches its budget — the caps exist for when a live
  // session is posted.
  const deadline = Date.now() + (Number(process.env.LUBIN_CRAWL_BUDGET_MS) || 10 * 60 * 1000);
  const maxArticles = Number(process.env.LUBIN_MAX_ARTICLES) || 100;
  const maxPages = Number(process.env.LUBIN_MAX_PAGES) || 5;
  let processed = 0;

  // ---- announcements ----
  const annArticles = await fetchBoardArticles(ANNOUNCEMENTS_URL, {
    maxPages,
    deadline,
    label: 'announcements',
  });
  for (const art of annArticles) {
    if (processed >= maxArticles || Date.now() > deadline) {
      console.error(`  lubin: crawl budget reached (${processed}/${annArticles.length} announcements processed); remainder backfills next run`);
      break;
    }
    processed++;
    let html;
    try {
      html = await getText(art.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: announcement detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lubin: PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      if (isResultNotice(text)) continue; // stray result mis-filed on this board
      for (const rec of parseAnnouncement(text)) {
        const enriched = { ...rec, detail_url: art.url, source_url: pdfUrl };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      }
    }
  }

  // ---- results ----
  const resArticles = await fetchBoardArticles(RESULTS_URL, {
    maxPages,
    deadline,
    label: 'results',
  });
  for (const art of resArticles) {
    if (known.has(art.url)) continue; // already-committed concluded result
    let html;
    try {
      html = await getText(art.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: result detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      if (known.has(pdfUrl)) continue;
      let text;
      try {
        text = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lubin: result PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: art.url, auction_date: null });
    }
  }

  // ---- wykaz (pre-auction designations; gated on TITLE so a non-sale
  // dzierżawa/zamiana wykaz never costs a PDF fetch — see parse.js) ----
  const wykazArticles = await fetchBoardArticles(WYKAZ_URL, {
    maxPages,
    deadline,
    label: 'wykaz',
  });
  for (const art of wykazArticles) {
    if (!isGenuineSaleWykazTitle(art.title)) continue;
    let html;
    try {
      html = await getText(art.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  lubin: wykaz detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl, FETCH_OPTS);
      } catch (err) {
        console.error(`  lubin: wykaz PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      for (const rec of wykazRecordsFromText(text, pdfUrl)) {
        wykaz.push({ ...rec, detail_url: art.url });
      }
    }
  }

  console.error(
    `  lubin: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, wykaz, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, wykaz } = await crawlPromise;
  return { listings, wykaz, land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land, wykaz } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        wykaz: wykaz.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleWykaz: wykaz[0],
      },
      null,
      2,
    ) + '\n',
  );
}
