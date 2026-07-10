// Chodzież crawler — bip.chodziez.pl (WOKISS BIP), plain server-rendered
// HTML, no JS render needed. See config.js + parse.js for the full write-up.
//
// crawlActive():
//   For the current + previous year, fetches the "Ogłoszenia o przetargach"
//   board, harvests detail links, fetches each detail page and parses it into
//   0+ listing/land records (a single notice can cover several lokale). Also
//   scans the "Wykazy" board for genuine pre-auction sale designations
//   (isWykazSaleTitle filters out the bezprzetargowa/dzierżawa/użyczenie
//   items that currently make up 100% of that board — see parse.js). Bounded:
//   2 board fetches (ogloszenia + wykazy) x 2 years, plus one detail fetch per
//   harvested announcement link (observed volume: single digits/year).
//
// crawlResultDocs():
//   For the current + previous year, fetches the "Wyniki przetargów" board
//   and returns each item's page as a {text, date, url} ref for
//   parseResultDoc. The board is confirmed EMPTY as of 2026-07-10 for
//   2022-2026 (statutory ~7-day posting window) — poll weekly (per the
//   spike) to actually catch one inside its window.
//
// Bounds: MAX_LINKS_PER_BOARD guards against an unexpected board-layout
// change flooding the crawl; observed real boards carry well under 10 items.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseBoardPage, parseAnnouncementPage, isWykazSaleTitle, baseStreetAddress, stripTags } from './parse.js';
import { parseAddress } from '../../core/normalize.js';

const ORIGIN = 'https://bip.chodziez.pl';
const BASE_PATH = '/chodziezm/';
const SECTION =
  'bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomosciami';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const MAX_LINKS_PER_BOARD = 60; // safety cap; real boards carry single digits

function boardUrl(year, board) {
  return `${ORIGIN}${BASE_PATH}${SECTION}/${year}/${board}.html`;
}

// Years to scan: current + previous (an item can be posted late one year with
// its auction/removal spanning into the next; matches the brzeg/bochnia
// convention). Boards are "current-only" — older years are not an archive.
function yearsToScan() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

async function fetchBoardLinks(year, board) {
  const url = boardUrl(year, board);
  let html;
  try {
    html = await getText(url, FETCH_OPTS);
  } catch (err) {
    if (/\b404\b/.test(err.message)) return []; // no board for this year — normal
    console.error(`  chodziez: board fetch failed (${url}): ${err.message}`);
    return [];
  }
  return parseBoardPage(html, `${ORIGIN}${BASE_PATH}`).slice(0, MAX_LINKS_PER_BOARD);
}

// ---------------------------------------------------------------------------
// crawlActive
// ---------------------------------------------------------------------------

async function crawlAnnouncements() {
  const listings = [];
  const land = [];
  const seenUrls = new Set();

  for (const year of yearsToScan()) {
    const links = await fetchBoardLinks(year, 'ogloszenia-o-przetargach');
    for (const link of links) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);

      let html;
      try {
        html = await getText(link.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  chodziez: announcement fetch failed (${link.url}): ${err.message}`);
        continue;
      }

      const records = parseAnnouncementPage(html, link.url);
      if (records.length === 0) {
        console.error(`  chodziez WARN: unparsed announcement ${link.url} (${link.title.slice(0, 70)})`);
        continue;
      }
      for (const rec of records) {
        (rec.kind === 'grunt' ? land : listings).push(rec);
      }
    }
  }
  return { listings, land };
}

// Genuine pre-auction wykaz designations (see parse.js isWykazSaleTitle) —
// address derived straight from the board title (no date/price expected for
// a wykaz; matches the ADAPTER-GUIDE convention). No detail fetch needed.
async function crawlWykaz() {
  const wykaz = [];
  const seenUrls = new Set();

  for (const year of yearsToScan()) {
    const links = await fetchBoardLinks(year, 'wykazy');
    for (const link of links) {
      if (seenUrls.has(link.url) || !isWykazSaleTitle(link.title)) continue;
      seenUrls.add(link.url);

      const base = baseStreetAddress(link.title);
      if (!base) continue;
      const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s+(\d+[A-Za-z]?)/i.exec(stripTags(link.title));
      const apt = aptM ? aptM[1] : null;
      const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
      wykaz.push({
        kind: 'mieszkalny',
        address_raw: `ul. ${addressStr}`,
        address: parseAddress(addressStr),
        detail_url: link.url,
      });
    }
  }
  return wykaz;
}

export async function crawlActive() {
  const [{ listings, land }, wykaz] = await Promise.all([crawlAnnouncements(), crawlWykaz()]);
  console.error(
    `  chodziez crawlActive: ${listings.length} flat listing(s), ${land.length} land plot(s), ${wykaz.length} wykaz item(s)`,
  );
  return { listings, wykaz, land };
}

// ---------------------------------------------------------------------------
// crawlResultDocs
// ---------------------------------------------------------------------------

export async function crawlResultDocs() {
  const resultRefs = [];
  const seenUrls = new Set();

  for (const year of yearsToScan()) {
    const links = await fetchBoardLinks(year, 'wyniki-przetargow');
    for (const link of links) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);

      let html;
      try {
        html = await getText(link.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  chodziez: result fetch failed (${link.url}): ${err.message}`);
        continue;
      }
      resultRefs.push({ text: html, date: null, url: link.url });
    }
  }
  console.error(`  chodziez crawlResultDocs: ${resultRefs.length} result doc(s)`);
  return resultRefs;
}

// ---------------------------------------------------------------------------
// CLI smoke test
// ---------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land, wykaz } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land, wykaz }, null, 2) + '\n');
  console.error(`Total active: ${listings.length} listing(s), ${land.length} land, ${wykaz.length} wykaz`);
}
