// Skarżysko-Kamienna crawler — server-rendered Logonet BIP (no SPA, no OCR,
// no TLS workaround). See config.js.
//
// Enumeration is anchored on the paginated listing board:
//   https://bip.skarzysko.pl/przetargi-nieruchomosci/{page}/10
// Each page carries up to 10 records (announcement OR result notice) as
// <a href="/przetarg-nieruchomosci/{id}/{slug}"> links. Total ~240 records
// across 24 pages (2017–2026); the XML feed (przetargi-nieruchomosci/xml/{page}/1)
// confirms page count and is used to bound the loop.
//
// For each record URL we fetch the HTML, extract the body text via
// extractBodyText(), and route by isResultNotice():
//   result notice → resultRefs (crawlResultDocs stream)
//   announcement  → parseAnnouncement → listings/land
//
// source:'html' ⇒ result refs already carry `.text`.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  parseAnnouncement,
  parseResultDoc,
  isResultNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  extractBodyText,
} from './parse.js';

const ORIGIN = 'https://bip.skarzysko.pl';

// How many listing pages to walk. The XML feed reports the total page count;
// we set a generous hard cap (100) so we never run forever if the feed is
// unavailable. The board has 24 pages as of 2026-06-29 and grows slowly
// (~2–4 lokal mieszkalny/year across ~10 new records/year total).
const MAX_PAGES = 100;

// CI budget: skip articles older than this when we're running late.
// Unlike KK we don't have a hard article cap — the board is small enough.
const STALE_DATE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const listUrl = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/10`;
const xmlUrl  = (page) => `${ORIGIN}/przetargi-nieruchomosci/xml/${page}/1`;

/** Total number of listing pages from the XML feed (page 1). Falls back to MAX_PAGES. */
async function fetchPageCount() {
  try {
    const xml = await getText(xmlUrl(1));
    const m = /<ilosc-stron>(\d+)<\/ilosc-stron>/.exec(xml);
    return m ? Math.min(Number(m[1]), MAX_PAGES) : MAX_PAGES;
  } catch {
    return MAX_PAGES;
  }
}

/** Article IDs + detail URLs from one listing page HTML. */
export function parseListingPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /href="(https:\/\/bip\.skarzysko\.pl\/przetarg-nieruchomosci\/(\d+)\/([^"]+))"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, url, id, slug] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url, slug });
  }
  return out;
}

/** Data przetargu from the structured table on a record page, as ISO date or null. */
function tableAuctionDate(bodyText) {
  const m = /Data\s+przetargu\D{0,20}(\d{2})\.(\d{2})\.(\d{4})/i.exec(bodyText || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats + built)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, source_url, auction_date:string|null }

  const totalPages = await fetchPageCount();
  const seenIds = new Set();

  for (let page = 1; page <= totalPages; page++) {
    let html;
    try {
      html = await getText(listUrl(page));
    } catch (err) {
      console.error(`  skarzysko-kamienna: listing page ${page} failed: ${err.message}`);
      continue;
    }

    const refs = parseListingPage(html);
    if (refs.length === 0) break; // past last page

    for (const ref of refs) {
      if (seenIds.has(ref.id)) continue;
      seenIds.add(ref.id);

      // Quick slug-based route: skip obviously irrelevant records
      if (isSkippableTitle('', ref.slug)) continue;
      const isResult = isResultTitle('', ref.slug);
      const isAnn = !isResult && isAnnouncementTitle('', ref.slug);

      // If neither result nor announcement we still fetch — the body is
      // authoritative (some slugs are bare address strings).

      let recordHtml;
      try {
        recordHtml = await getText(ref.url);
      } catch (err) {
        console.error(`  skarzysko-kamienna: record ${ref.id} fetch failed: ${err.message}`);
        continue;
      }

      const text = extractBodyText(recordHtml);
      if (!text) continue;

      if (isResultNotice(text)) {
        const auctionDate = tableAuctionDate(text);
        resultRefs.push({ text, source_url: ref.url, auction_date: auctionDate });
        continue;
      }

      if (isResult) continue; // slug said result but body disagrees → skip noise

      const rec = parseAnnouncement(text);
      if (!rec) {
        if (isAnn) {
          console.error(`  skarzysko-kamienna WARN: announcement not parsed (id ${ref.id}, ${ref.slug.slice(0, 60)})`);
        }
        continue;
      }

      // Stale dateless announcements → age via tableAuctionDate (already in text)
      if (!rec.auction_date) {
        const td = tableAuctionDate(text);
        if (td && td < STALE_DATE_CUTOFF) {
          rec.auction_date = td;
          rec.auction_date_estimated = true;
        }
      }

      const enriched = { ...rec, detail_url: ref.url, source_url: ref.url };
      (rec.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  skarzysko-kamienna: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
