// Zduńska Wola crawler — server-rendered Logonet BIP consumed via its clean
// XML feed (no SPA, no OCR, no TLS workaround). See config.js.
//
// Enumeration walks the paginated board XML:
//   https://bip.zdunskawola.pl/przetargi-nieruchomosci/xml/{page}/1
// whose <ilosc-stron> gives the page count (1 page / 2 records live as of
// 2026-07-11 — see config.js for why this board's window is so small) and
// whose <artykul><url> entries give each record id. For every record we fetch
// the per-record XML:
//   https://bip.zdunskawola.pl/przetarg-nieruchomosci/xml/{id}/1
// extract its fields (adres, rodzaj, cena, data, przetarg-na, rozstrzygniecie,
// tresc), skip anything isSkippable (defense-in-depth — see parse.js), and
// build the parse blob via buildRecordText(). Routing is by <rozstrzygniecie>:
//   non-empty/present → concluded → resultRefs (crawlResultDocs, achieved price)
//   empty/absent      → pending   → parseAnnouncement → listings / land
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  hasResolution,
  isSkippable,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.zdunskawola.pl';

// A browser UA — other Logonet hosts in this family serve the XML feed to the
// bot UA too, but a browser UA is the safe default for municipal WAFs
// (harmless if unneeded; matches Chełmno/Nakło).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';

// Hard cap so a broken feed can never loop forever. The board is 1 page / ~2
// records as of 2026-07-11 (this city's window is much smaller than Chełmno/
// Nakło's multi-year archives — see config.js) but bounded generously in case
// that changes.
const MAX_PAGES = 30;

// CI budget guard: age dateless pending announcements older than this into the
// archive via their auction date (see below). 90 days mirrors the analogs.
const STALE_DATE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const boardXml = (page) => `${ORIGIN}/przetargi-nieruchomosci/xml/${page}/1`;
const recordXml = (id) => `${ORIGIN}/przetarg-nieruchomosci/xml/${id}/1`;

/** Extract one XML tag's inner text (CDATA-aware, first match). */
function tag(xml, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml || '');
  return m ? m[1] : '';
}

/** Record ids + canonical human URLs from one board XML page. */
export function parseBoardPage(xml) {
  if (!xml) return [];
  const out = [];
  const seen = new Set();
  const re = /<url>\s*(https:\/\/bip\.zdunskawola\.pl\/przetarg-nieruchomosci\/(\d+)\/[^<\s]+)\s*<\/url>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, url, id] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url });
  }
  return out;
}

/** Total board pages from page-1's <ilosc-stron>, bounded by MAX_PAGES. */
async function fetchPageCount() {
  try {
    const xml = await getText(boardXml(1), { userAgent: UA });
    const m = /<ilosc-stron>(\d+)<\/ilosc-stron>/.exec(xml);
    return { first: xml, pages: m ? Math.min(Number(m[1]), MAX_PAGES) : MAX_PAGES };
  } catch (err) {
    console.error(`  zdunska-wola: board page 1 failed: ${err.message}`);
    return { first: null, pages: 0 };
  }
}

/** Fetch + field-extract one record; returns the parse blob, or null. */
async function fetchRecord(ref) {
  let xml;
  try {
    xml = await getText(recordXml(ref.id), { userAgent: UA });
  } catch (err) {
    console.error(`  zdunska-wola: record ${ref.id} fetch failed: ${err.message}`);
    return null;
  }
  const art = tag(xml, 'artykul') || xml;
  const fields = {
    adres: tag(art, 'adres-nieruchomosci'),
    rodzaj: tag(art, 'rodzaj-nieruchomosci'),
    cena: tag(art, 'cena-wywolawcza'),
    data: tag(art, 'data-przetargu'),
    rozstrzygniecie: tag(art, 'rozstrzygniecie'),
    przetargNa: tag(art, 'przetarg-na'),
    tresc: tag(art, 'tresc'),
  };
  return { text: buildRecordText(fields) };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, auction_date }

  const { first, pages } = await fetchPageCount();
  const refs = [];
  const seenIds = new Set();
  for (let page = 1; page <= pages; page++) {
    let xml = page === 1 ? first : null;
    if (!xml) {
      try {
        xml = await getText(boardXml(page), { userAgent: UA });
      } catch (err) {
        console.error(`  zdunska-wola: board page ${page} failed: ${err.message}`);
        continue;
      }
    }
    const pageRefs = parseBoardPage(xml);
    if (pageRefs.length === 0) break; // past the last page
    for (const r of pageRefs) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      refs.push(r);
    }
  }

  for (const ref of refs) {
    const rec = await fetchRecord(ref);
    if (!rec) continue;
    const { text } = rec;

    if (isSkippable(text)) continue; // najem/dzierżawa/bonifikata — never a sale (defense-in-depth)

    if (hasResolution(text)) {
      resultRefs.push({ text, pdf_url: ref.url, auction_date: auctionDateFromText(text) });
      continue;
    }

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

    // Stale, dateless pending announcements → age into the archive via their
    // auction date (already parsed above when present). Harmless when dated.
    if (!parsed.auction_date) {
      const d = auctionDateFromText(text);
      if (d && d < STALE_DATE_CUTOFF) {
        parsed.auction_date = d;
        parsed.auction_date_estimated = true;
      }
    }

    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  zdunska-wola: ${listings.length} flat listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
  );
  return { listings, land, resultRefs };
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
