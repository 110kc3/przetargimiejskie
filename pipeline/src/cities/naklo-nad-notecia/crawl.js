
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import {
  buildRecordText,
  parseAnnouncement,
  hasResolution,
  isLease,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.gmina-naklo.pl';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';
const FETCH_OPTS = { userAgent: UA, insecureTLS: true };

const MAX_PAGES = 30;

const STALE_DATE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const boardXml = (page) => `${ORIGIN}/przetargi-nieruchomosci/xml/${page}/1`;
const recordXml = (id) => `${ORIGIN}/przetarg-nieruchomosci/xml/${id}/1`;

function tag(xml, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml || '');
  return m ? m[1] : '';
}

export function parseBoardPage(xml) {
  if (!xml) return [];
  const out = [];
  const seen = new Set();
  const re = /<url>\s*(https:\/\/bip\.gmina-naklo\.pl\/przetarg-nieruchomosci\/(\d+)\/[^<\s]+)\s*<\/url>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, url, id] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url });
  }
  return out;
}

async function fetchPageCount() {
  try {
    const xml = await getText(boardXml(1), FETCH_OPTS);
    const m = /<ilosc-stron>(\d+)<\/ilosc-stron>/.exec(xml);
    return { first: xml, pages: m ? Math.min(Number(m[1]), MAX_PAGES) : MAX_PAGES };
  } catch (err) {
    console.error(`  naklo-nad-notecia: board page 1 failed: ${err.message}`);
    return { first: null, pages: 0 };
  }
}

export function resultAttachmentUrl(recordXmlFragment) {
  const re = /<zalacznik>([\s\S]*?)<\/zalacznik>/gi;
  let m;
  let url = null;
  while ((m = re.exec(recordXmlFragment || '')) !== null) {
    const nazwa = tag(m[1], 'nazwa');
    if (/informacja\s+o\s+wyniku/i.test(nazwa)) {
      const u = tag(m[1], 'url').trim();
      if (u) url = u;
    }
  }
  return url;
}

async function fetchRecord(ref) {
  let xml;
  try {
    xml = await getText(recordXml(ref.id), FETCH_OPTS);
  } catch (err) {
    console.error(`  naklo-nad-notecia: record ${ref.id} fetch failed: ${err.message}`);
    return null;
  }
  const art = tag(xml, 'artykul') || xml;
  const fields = {
    adres: tag(art, 'adres-nieruchomosci'),
    rodzaj: tag(art, 'rodzaj-nieruchomosci'),
    cena: tag(art, 'cena-wywolawcza'),
    data: tag(art, 'data-przetargu'),
    typ: tag(art, 'typ-przetargu'),
    przetargNa: tag(art, 'przetarg-na'),
    tresc: tag(art, 'tresc'),
  };

  const preText = buildRecordText(fields);
  if (isLease(preText)) return { text: preText, lease: true };

  const resultUrl = resultAttachmentUrl(art);
  if (resultUrl) {
    let wynik;
    try {
      wynik = await pdfText(resultUrl, FETCH_OPTS);
    } catch (err) {
      try {
        wynik = await docText(resultUrl, FETCH_OPTS);
      } catch (err2) {
        console.error(
          `  naklo-nad-notecia: result attachment extract failed ${resultUrl}: pdf=${err.message} doc=${err2.message}`,
        );
        return null;
      }
    }
    fields.wynik = wynik;
  }

  return { text: buildRecordText(fields) };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const { first, pages } = await fetchPageCount();
  const refs = [];
  const seenIds = new Set();
  for (let page = 1; page <= pages; page++) {
    let xml = page === 1 ? first : null;
    if (!xml) {
      try {
        xml = await getText(boardXml(page), FETCH_OPTS);
      } catch (err) {
        console.error(`  naklo-nad-notecia: board page ${page} failed: ${err.message}`);
        continue;
      }
    }
    const pageRefs = parseBoardPage(xml);
    if (pageRefs.length === 0) break;
    for (const r of pageRefs) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      refs.push(r);
    }
  }

  for (const ref of refs) {
    const rec = await fetchRecord(ref);
    if (!rec || rec.lease) continue;
    const { text } = rec;

    if (hasResolution(text)) {
      resultRefs.push({ text, pdf_url: ref.url, auction_date: auctionDateFromText(text) });
      continue;
    }

    const parsed = parseAnnouncement(text);
    if (!parsed) continue;

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
    `  naklo-nad-notecia: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
