
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

const MAX_LINKS_PER_BOARD = 60;

function boardUrl(year, board) {
  return `${ORIGIN}${BASE_PATH}${SECTION}/${year}/${board}.html`;
}

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
    if (/\b404\b/.test(err.message)) return [];
    console.error(`  chodziez: board fetch failed (${url}): ${err.message}`);
    return [];
  }
  return parseBoardPage(html, `${ORIGIN}${BASE_PATH}`).slice(0, MAX_LINKS_PER_BOARD);
}


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
      resultRefs.push({ text: html, auction_date: null, pdf_url: link.url });
    }
  }
  console.error(`  chodziez crawlResultDocs: ${resultRefs.length} result doc(s)`);
  return resultRefs;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land, wykaz } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings, land, wykaz }, null, 2) + '\n');
  console.error(`Total active: ${listings.length} listing(s), ${land.length} land, ${wykaz.length} wykaz`);
}
