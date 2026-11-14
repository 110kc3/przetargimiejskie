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

const MAX_ENTRIES_PER_BOARD = 300;

function yearsToScan() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}

const HUB_LINK_RE = /<a\s+href="([^"]+)"\s+title="Ogłoszenia\s+(\d{4})"/g;

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
    if (/\b404\b/.test(err.message)) return { html: null, url };
    console.error(`  pleszew: board fetch failed (${url}): ${err.message}`);
    return { html: null, url };
  }
}


let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const wykaz = [];
  const resultRefs = [];
  const seenPdf = new Set();

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

      if (resultLink && !seenPdf.has(resultLink.url)) {
        seenPdf.add(resultLink.url);
        try {
          const text = await pdfText(resultLink.url, FETCH_OPTS);
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
      if (resultLink) continue;

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


export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, wykaz } = await crawlPromise;
  return { listings, wykaz, land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
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
