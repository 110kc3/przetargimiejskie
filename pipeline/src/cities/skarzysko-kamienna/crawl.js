
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

const MAX_PAGES = 100;

const STALE_DATE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const listUrl = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/10`;
const xmlUrl  = (page) => `${ORIGIN}/przetargi-nieruchomosci/xml/${page}/1`;

async function fetchPageCount() {
  try {
    const xml = await getText(xmlUrl(1));
    const m = /<ilosc-stron>(\d+)<\/ilosc-stron>/.exec(xml);
    return m ? Math.min(Number(m[1]), MAX_PAGES) : MAX_PAGES;
  } catch {
    return MAX_PAGES;
  }
}

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

function tableAuctionDate(bodyText) {
  const m = /Data\s+przetargu\D{0,20}(\d{2})\.(\d{2})\.(\d{4})/i.exec(bodyText || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

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
    if (refs.length === 0) break;

    for (const ref of refs) {
      if (seenIds.has(ref.id)) continue;
      seenIds.add(ref.id);

      if (isSkippableTitle('', ref.slug)) continue;
      const isResult = isResultTitle('', ref.slug);
      const isAnn = !isResult && isAnnouncementTitle('', ref.slug);


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

      if (isResult) continue;

      const rec = parseAnnouncement(text);
      if (!rec) {
        if (isAnn) {
          console.error(`  skarzysko-kamienna WARN: announcement not parsed (id ${ref.id}, ${ref.slug.slice(0, 60)})`);
        }
        continue;
      }

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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
