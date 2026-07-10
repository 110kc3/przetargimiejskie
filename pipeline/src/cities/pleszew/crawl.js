// Pleszew crawler — bip.pleszew.pl (WOKISS BIP), plain server-rendered HTML,
// no JS render needed. See config.js + parse.js for the full source-shape
// write-up and the two real bugs caught while groundtruthing the field
// extractors.
//
// Both crawlActive() and crawlResultDocs() are backed by ONE shared,
// memoized crawl of the SAME consolidated year-board pages (current +
// previous year) — unlike chodziez (separate ogloszenia/wyniki/wykazy
// boards), Pleszew mixes announcements, results and wykazy into a single
// page per year, so there is no benefit to fetching it twice (mirrors the
// naklo-nad-notecia crawlPromise memoization pattern).
//
// Per entry, routing is:
//   1. isSkippableEntryText -> drop (dzierżawa/najem/użyczenie/
//      bezprzetargowo/aport), regardless of "Wykaz"/"Ogłoszenie" title.
//   2. title starts "Wykaz" -> isGenuineSaleWykazText -> wykazRecordFromEntry
//      (no PDF fetch — the board teaser alone has enough to key it).
//   3. otherwise, isSaleAnnouncementText:
//        - a "Informacja o wyniku przetargu"-labeled link is ALSO present in
//          this entry -> the announcement is CONCLUDED (a real correctness
//          trap: the board is an archive, so a long-resolved, often-unsold
//          announcement's teaser stays live forever) -> excluded from
//          listings/land; its result PDF is fetched instead (see below).
//        - no result link -> fetch the announcement PDF (pdfText, cached)
//          and parseAnnouncementPage it -> listings / land.
//   4. ANY entry (regardless of 1-3, EXCEPT skippable ones) carrying a
//      "Informacja o wyniku przetargu"-labeled link -> fetch that PDF
//      (pdfText, cached) -> a crawlResultDocs() ref.
//
// Year-board URL discovery: slugs are irregular across years (2025 carries
// a comma: "ogloszenia,-decyzje-2025.html"; 2013/2014/2016/2017 carry a
// trailing "1") — rather than hardcode a per-year map, discoverYearUrls()
// reads the live "Ogłoszenia dot. nieruchomości" hub page's own nav list
// (title="Ogłoszenia <YYYY>") once per run and falls back to the plain
// "ogloszenia-<YYYY>.html" template for any year missing from that list
// (transient hub-fetch failure, or a future year not yet in the nav).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseYearBoard,
  parseAnnouncementPage,
  wykazRecordFromEntry,
  isSkippableEntryText,
  isSaleAnnouncementText,
  isGenuineSaleWykazText,
  isResultLabel,
} from './parse.js';

const ORIGIN = 'https://bip.pleszew.pl';
const BASE_PATH = '/pleszewm/';
const HUB_URL = `${ORIGIN}${BASE_PATH}bip/ogloszenia-20131/ogloszenia-dot.-nieruchomosci.html`;
const BOARD_DIR = `${ORIGIN}${BASE_PATH}bip/ogloszenia-20131/ogloszenia-dot.-nieruchomosci/`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Safety cap on entries processed per year-board — real boards carry ~30-110
// entries/year (mostly wykaz noise); this guards against an unexpected
// layout change flooding the crawl.
const MAX_ENTRIES_PER_BOARD = 300;

function yearsToScan() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

const HUB_LINK_RE = /<a\s+href="([^"]+)"\s+title="Ogłoszenia\s+(\d{4})"/g;

/** Discover the live year->board-URL map from the hub page's own nav list
 *  (handles the irregular per-year slugs). Falls back to {} on fetch
 *  failure — callers then use the plain template. */
async function discoverYearUrls() {
  let html;
  try {
    html = await getText(HUB_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  pleszew: hub fetch failed (${HUB_URL}): ${err.message}`);
    return new Map();
  }
  const map = new Map();
  HUB_LINK_RE.lastIndex = 0;
  let m;
  while ((m = HUB_LINK_RE.exec(html)) !== null) {
    const href = m[1].trim();
    const url = /^https?:\/\//i.test(href) ? href : `${ORIGIN}${BASE_PATH}${href}`;
    map.set(Number(m[2]), url);
  }
  return map;
}

async function fetchYearBoard(year, yearUrls) {
  const url = yearUrls.get(year) || `${BOARD_DIR}ogloszenia-${year}.html`;
  try {
    const html = await getText(url, FETCH_OPTS);
    return { html, url };
  } catch (err) {
    if (/\b404\b/.test(err.message)) return { html: null, url }; // no board for this year — normal
    console.error(`  pleszew: board fetch failed (${url}): ${err.message}`);
    return { html: null, url };
  }
}

// ---------------------------------------------------------------------------
// The shared crawl — memoized so crawlActive() and crawlResultDocs() (called
// separately by refresh.js) never re-fetch the same year boards / PDFs.
// ---------------------------------------------------------------------------

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];
  const seenPdf = new Set(); // dedupe: the II-przetarg entry's own announcement
  // PDF can, in principle, resurface verbatim if a year board is re-listed
  // under two URLs; also guards a single result PDF linked from >1 entry.

  const yearUrls = await discoverYearUrls();

  for (const year of yearsToScan()) {
    const { html, url: boardUrl } = await fetchYearBoard(year, yearUrls);
    if (!html) continue;
    const base = `${ORIGIN}${BASE_PATH}`;
    const entries = parseYearBoard(html, base).slice(0, MAX_ENTRIES_PER_BOARD);

    for (const entry of entries) {
      if (isSkippableEntryText(entry.bodyText)) continue;

      const resultLink = entry.pdfLinks.find((l) => isResultLabel(l.label));
      const otherLinks = entry.pdfLinks.filter((l) => !isResultLabel(l.label));

      // --- result stream: any entry (sale-shaped or wykaz-shaped) that
      // already carries a labeled result link contributes to
      // crawlResultDocs(), independent of the routing below.
      if (resultLink && !seenPdf.has(resultLink.url)) {
        seenPdf.add(resultLink.url);
        try {
          const text = await pdfText(resultLink.url, FETCH_OPTS);
          // Field names matter: refresh.js's result loop reads `ref.pdf_url`
          // (source:'html' → also used verbatim as parseResultDoc's
          // sourceUrl arg) and `ref.auction_date` (fallbackDate) — NOT
          // `url`/`date`. parseResultDoc reliably finds its own date inside
          // every real fixture, so auction_date is left null here.
          resultRefs.push({ text, auction_date: null, pdf_url: resultLink.url });
        } catch (err) {
          console.error(`  pleszew: result PDF fetch failed (${resultLink.url}): ${err.message}`);
        }
      }

      if (entry.title.startsWith('Wykaz')) {
        if (!isGenuineSaleWykazText(entry.bodyText)) continue;
        const pdfUrl = otherLinks[0]?.url ?? null;
        const rec = wykazRecordFromEntry(entry.bodyText, pdfUrl);
        if (rec) wykaz.push(rec);
        continue;
      }

      if (!isSaleAnnouncementText(entry.bodyText)) continue;
      if (resultLink) continue; // concluded — handled via the result stream above, not a pending listing

      const annLink = otherLinks[0];
      if (!annLink || seenPdf.has(annLink.url)) continue;
      seenPdf.add(annLink.url);

      let text;
      try {
        text = await pdfText(annLink.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  pleszew: announcement PDF fetch failed (${annLink.url}): ${err.message}`);
        continue;
      }
      const recs = parseAnnouncementPage(text, annLink.url);
      if (recs.length === 0) {
        console.error(`  pleszew WARN: unparsed announcement ${annLink.url} (${entry.title})`);
        continue;
      }
      for (const rec of recs) (rec.kind === 'grunt' ? land : listings).push(rec);
    }

    console.error(`  pleszew: board ${year} (${boardUrl}) — ${entries.length} entr(y/ies) scanned`);
  }

  console.error(
    `  pleszew crawlAll: ${listings.length} flat listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s), ${resultRefs.length} result doc(s)`,
  );
  return { listings, land, wykaz, resultRefs };
}

// ---------------------------------------------------------------------------
// Registry contract
// ---------------------------------------------------------------------------

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, wykaz } = await crawlPromise;
  return { listings, wykaz, land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

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
        sampleListing: listings[0] ?? null,
        sampleLand: land[0] ?? null,
        sampleWykaz: wykaz[0] ?? null,
      },
      null,
      2,
    ) + '\n',
  );
  console.error(
    `Total active: ${listings.length} listing(s), ${land.length} land, ${wykaz.length} wykaz, ${results.length} result doc(s)`,
  );
}
