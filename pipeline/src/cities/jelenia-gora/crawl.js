// Jelenia Góra crawler — server-rendered Logonet BIP (no SPA, no OCR for the
// born-digital text PDFs, no auth). See config.js.
//
// Boards (see spikes/dolnoslaskie/jelenia-gora/jelenia-gora.md):
//   126  sprzedaz-uzytkowanie-wieczyste       — announcements (flats, land,
//        commercial); paginated HTML at /artykuly/126/{page}/{size}/…
//   321  informacje-o-wyniku-przetargu        — result notices (achieved
//        price / bezskuteczny); same URL shape, board id 321.
//   322  listy-osob-zakwalifikowanych…        — restricted-auction qualifier
//        lists (secondary stream, out of scope, never crawled).
//
// ENUMERATION QUIRK (live-verified 2026-07-18): each board also exposes an XML
// feed at /artykuly/xml/{board}/{page}/{size} — but the {page}/{size} path
// segments are IGNORED by the server: /xml/126/1/1, /xml/126/2/10 and
// /xml/126/7/10 all returned the byte-identical FULL 64-record corpus. This
// makes enumeration a SINGLE cheap fetch per board (no HTML-pagination walk,
// no page-cap/timeout risk for discovery) — we just fetch the XML feed once
// per board and take every <artykul> it lists.
//
// A second live finding shapes the result-side design: individual result
// articles get REMOVED from the CMS after a few weeks (a URL cited by the
// spike on 2026-06-27, https://bip.jeleniagora.pl/artykul/321/25507/52-2026-2,
// now 404s three weeks later, and board 321's XML feed itself reports only 2
// current records vs. the ~53 the spike saw). So Jelenia Góra's achieved-price
// history is NOT durably re-crawlable — whatever isn't captured before a
// result notice is pruned is permanently lost to this pipeline. This makes
// running the crawl on a tight, frequent cadence (the normal CI refresh
// cadence already does this) the only mitigation; loadKnownSourceUrls still
// lets us skip re-fetching results already captured in a prior run.
//
// Each detail page ("stub") carries ONE born-digital PDF attachment at
// /attachments/download/<id> (same attachment-URL shape as Kędzierzyn-Koźle —
// no scanned twin observed here).
//
// `source: 'html'` — the adapter fetches the article HTML + attachment PDF
// itself; crawlResultDocs() returns refs that already carry `.text` (the
// refresh loop's OCR/pdf-text dispatch is bypassed, like Kędzierzyn-Koźle /
// Tarnowskie Góry / Skarżysko-Kamienna).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.jeleniagora.pl';
const ANNOUNCEMENTS_XML = `${ORIGIN}/artykuly/xml/126/1/1`;
const RESULTS_XML = `${ORIGIN}/artykuly/xml/321/1/1`;

/** Parse one board's XML feed into [{ url, title, date }]. */
function parseXmlArticles(xml) {
  const out = [];
  const re = /<artykul>\s*<url>([^<]*)<\/url>\s*<tytul>([^<]*)<\/tytul>\s*<data>([^<]*)<\/data>/g;
  let m;
  while ((m = re.exec(xml || '')) !== null) {
    const url = m[1].trim();
    if (url) out.push({ url, title: m[2].trim(), date: m[3].trim() });
  }
  return out;
}

/** Distinct PDF attachment URLs on a detail (stub) page. */
function pdfAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="(https:\/\/bip\.jeleniagora\.pl\/attachments\/download\/\d+)"/g;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(m[1]);
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats / commercial)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date: null }

  const known = await loadKnownSourceUrls('jelenia-gora');

  // Defensive bounds even though enumeration itself is a single fetch per
  // board (the XML feed dumps the whole corpus at once, ~64 announcements as
  // of 2026-07-18) — processing each article still costs a detail fetch + a
  // PDF fetch, so a budget guards against unexpected corpus growth blowing
  // past the CI job's 25-minute window.
  const deadline = Date.now() + (Number(process.env.JG_CRAWL_BUDGET_MS) || 15 * 60 * 1000);
  const maxArticles = Number(process.env.JG_MAX_ARTICLES) || 150;
  let processed = 0;

  // ---- announcements (board 126) ----
  let annXml = '';
  try {
    annXml = await getText(ANNOUNCEMENTS_XML);
  } catch (err) {
    console.error(`  jelenia-gora: announcements XML feed failed: ${err.message}`);
  }
  const annArticles = parseXmlArticles(annXml);

  for (const art of annArticles) {
    if (processed >= maxArticles || Date.now() > deadline) {
      console.error(`  jelenia-gora: crawl budget reached (${processed}/${annArticles.length} announcements processed); remainder backfills next run`);
      break;
    }
    processed++;
    let html;
    try {
      html = await getText(art.url);
    } catch (err) {
      console.error(`  jelenia-gora: announcement detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  jelenia-gora: PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      // The announcement board occasionally carries non-auction items (case
      // decisions, procedural notices) that share the numbering scheme but
      // aren't "OGŁOSZENIE" auction notices; parseAnnouncement already
      // returns [] for anything it can't extract a property from, so no
      // separate title-based filter is needed. A stray result notice
      // mis-filed here is skipped explicitly.
      if (isResultNotice(text)) continue;
      for (const rec of parseAnnouncement(text)) {
        const enriched = { ...rec, detail_url: art.url, source_url: pdfUrl };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      }
    }
  }

  // ---- results (board 321) ----
  let resXml = '';
  try {
    resXml = await getText(RESULTS_XML);
  } catch (err) {
    console.error(`  jelenia-gora: results XML feed failed: ${err.message}`);
  }
  const resArticles = parseXmlArticles(resXml);

  for (const art of resArticles) {
    if (known.has(art.url)) continue; // already-committed concluded result
    let html;
    try {
      html = await getText(art.url);
    } catch (err) {
      console.error(`  jelenia-gora: result detail fetch failed ${art.url}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of pdfAttachments(html)) {
      if (known.has(pdfUrl)) continue;
      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  jelenia-gora: result PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: art.url, auction_date: null });
    }
  }

  console.error(
    `  jelenia-gora: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
