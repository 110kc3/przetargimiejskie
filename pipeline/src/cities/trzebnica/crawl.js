import { pathToFileURL, fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { urlCacheKey } from '../../core/hash.js';
import {
  buildRecordText,
  parseAnnouncement,
  isLease,
  isResultNotice,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.trzebnica.pl';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';
const FETCH_OPTS = { userAgent: UA };

const MAX_BOARD_PAGES = 20;

const CRAWL_BUDGET_MS = Number(process.env.TRZEBNICA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;
const MAX_RECORDS = Number(process.env.TRZEBNICA_MAX_RECORDS) || 500;
const MAX_HISTORICAL_ATTACHMENTS = 12;
const TEXT_CACHE_DIRS = ['pdf-text-cache', 'doc-text-cache']
  .map((name) => fileURLToPath(new URL(`../../../${name}/`, import.meta.url)));
const attachmentCached = (url) => TEXT_CACHE_DIRS.some((directory) => existsSync(join(directory, `${urlCacheKey(url)}.txt`)));

const ACTIVE_SLACK_DAYS = 3;
const activeCutoff = () => new Date(Date.now() - ACTIVE_SLACK_DAYS * 864e5).toISOString().slice(0, 10);

const boardXml = (page) => `${ORIGIN}/przetargi-nieruchomosci/xml/${page}/1`;
const recordXml = (id) => `${ORIGIN}/przetarg-nieruchomosci/xml/${id}/1`;

function tag(xml, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml || '');
  return m ? m[1] : '';
}

export function parseBoardPage(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const urlM = /<url>\s*([^<\s]+)\s*<\/url>/i.exec(block);
    if (!urlM) continue;
    const idM = /\/przetarg-nieruchomosci\/(\d+)\//.exec(urlM[1]);
    if (!idM) continue;
    out.push({
      id: idM[1],
      url: urlM[1].trim(),
      adres: tag(block, 'adres-nieruchomosci'),
      rodzaj: tag(block, 'rodzaj-nieruchomosci'),
      cena: tag(block, 'cena-wywolawcza'),
      data: tag(block, 'data-przetargu'),
      typ: tag(block, 'typ-przetargu'),
      przetargNa: tag(block, 'przetarg-na'),
    });
  }
  return out;
}

async function fetchBoard(fetchText = getText) {
  const refs = [];
  refs.complete = false;
  const seen = new Set();
  for (let page = 1; page <= MAX_BOARD_PAGES; page++) {
    let xml;
    try {
      xml = await fetchText(boardXml(page), FETCH_OPTS);
    } catch (err) {
      console.error(`  trzebnica: board page ${page} failed: ${err.message}`);
      break;
    }
    const pageRefs = parseBoardPage(xml);
    const totalPages = Number(/<ilosc-stron>(\d+)</i.exec(xml)?.[1]);
    const sourcePage = Number(/<strona>(\d+)</i.exec(xml)?.[1]);
    const sourceCount = Number(/<ilosc-rekordow>(\d+)</i.exec(xml)?.[1]);
    const rawCount = [...xml.matchAll(/<artykul>/gi)].length;
    if (sourcePage !== page || !Number.isInteger(totalPages) || totalPages < page
      || sourceCount !== rawCount || rawCount !== pageRefs.length
      || pageRefs.some((ref) => seen.has(ref.id))) {
      console.error(`  trzebnica: incomplete or changed board page ${page}; empty-stream proof withheld`);
      break;
    }
    for (const r of pageRefs) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      refs.push(r);
    }
    if (page === totalPages) { refs.complete = true; break; }
    if (pageRefs.length === 0) break;
  }
  return refs;
}

function pickAttachments(recordXmlText) {
  const out = { announcement: null, result: null };
  const re = /<zalacznik>([\s\S]*?)<\/zalacznik>/gi;
  let m;
  while ((m = re.exec(recordXmlText || '')) !== null) {
    const block = m[1];
    const url = tag(block, 'url').trim();
    const nazwa = tag(block, 'nazwa').trim();
    if (!url) continue;
    if (/informacj\w*\s+o\s+wynik/i.test(nazwa)) {
      out.result = { url, nazwa };
      continue;
    }
    if (/[śs]wiadectwo|o[śs]wiadczenie|sprostowanie|odwo[łl]anie|wypis|wyrys|^mapa|fragment\s+mapy/i.test(nazwa)) continue;
    if (!out.announcement) out.announcement = { url, nazwa };
  }
  return out;
}

async function extractAttachment(url) {
  try {
    return await pdfText(url, FETCH_OPTS);
  } catch (err) {
    if (/not a PDF/i.test(err.message)) return docText(url, FETCH_OPTS);
    throw err;
  }
}

let crawlPromise = null;

export async function crawlAll({ fetchText = getText, knownUrls, extractText = extractAttachment, cutoff = activeCutoff() } = {}) {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const refs = await fetchBoard(fetchText);
  let sourceComplete = refs.complete;
  console.error(`  trzebnica: ${refs.length} board record(s) enumerated`);

  const known = knownUrls ?? await loadKnownSourceUrls('trzebnica', { includeLand: true, resolvedOnly: true });
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let historicalProcessed = 0;
  let historicalAttachments = 0;
  let uncachedHistoricalAttachments = 0;
  let budgetHit = false;

  for (const ref of refs) {
    const baseFields = {
      adres: ref.adres, rodzaj: ref.rodzaj, cena: ref.cena,
      data: ref.data, typ: ref.typ, przetargNa: ref.przetargNa,
    };
    const preText = buildRecordText(baseFields);
    if (isLease(preText)) continue;

    const boardDate = auctionDateFromText(preText);
    const isActive = !boardDate || boardDate >= cutoff;

    if (!isActive) {
      if (known.has(ref.url)) continue;
      if (!budgetHit && (historicalProcessed >= MAX_RECORDS || Date.now() > deadline)) {
        budgetHit = true;
        sourceComplete = false;
        console.error(
          `  trzebnica: historical-backfill budget reached (processed ${historicalProcessed}); remainder backfills next run`,
        );
      }
      if (budgetHit) continue;
      historicalProcessed++;
    }

    let recXml;
    try {
      recXml = await fetchText(recordXml(ref.id), FETCH_OPTS);
    } catch (err) {
      console.error(`  trzebnica: record ${ref.id} fetch failed: ${err.message}`);
      sourceComplete = false;
      continue;
    }
    const detailRefs = parseBoardPage(recXml);
    if (detailRefs.length !== 1 || detailRefs[0].id !== ref.id) {
      sourceComplete = false;
      console.error(`  trzebnica: record ${ref.id} returned an unrecognized detail response`);
      continue;
    }
    const atts = pickAttachments(recXml);

    let wynik = '';
    if (atts.result) {
      try {
        const t = await extractText(atts.result.url);
        if (isResultNotice(t)) {
          wynik = t;
        } else {
          console.error(
            `  trzebnica: attachment named "informacja o wyniku" but body isn't one (record ${ref.id}, ${atts.result.url}) — mislabeled, skipping as result`,
          );
        }
      } catch (err) {
        console.error(`  trzebnica: result attachment extract failed ${atts.result.url}: ${err.message}`);
        sourceComplete = false;
      }
    }

    if (wynik) {
      const fullText = buildRecordText({ ...baseFields, wynik });
      resultRefs.push({ text: fullText, pdf_url: atts.result.url, detail_url: ref.url, auction_date: null });
      continue;
    }

    let ogloszenie = '';
    if (isActive && atts.announcement) {
      try {
        ogloszenie = await extractText(atts.announcement.url);
      } catch (err) {
        console.error(`  trzebnica: announcement attachment extract failed ${atts.announcement.url}: ${err.message}`);
        sourceComplete = false;
      }
    }

    let rec = parseAnnouncement(buildRecordText({ ...baseFields, ogloszenie }));
    if (!rec && !isActive && atts.announcement
      && (attachmentCached(atts.announcement.url) || uncachedHistoricalAttachments < MAX_HISTORICAL_ATTACHMENTS)
      && Date.now() <= deadline) {
      historicalAttachments++;
      if (!attachmentCached(atts.announcement.url)) uncachedHistoricalAttachments++;
      try {
        ogloszenie = await extractText(atts.announcement.url);
        rec = parseAnnouncement(buildRecordText({ ...baseFields, ogloszenie }));
      } catch (err) {
        sourceComplete = false;
        console.error(`  trzebnica: historical identity extraction failed for ${ref.id}: ${err.message}`);
      }
    }
    if (!rec) { sourceComplete = false; continue; }

    if (!isActive) {
      rec.auction_date = rec.auction_date || boardDate || null;
      rec.auction_date_estimated = true;
    }

    const enriched = { ...rec, detail_url: ref.url, source_url: atts.announcement?.url || ref.url };
    (rec.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  trzebnica: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s); ${historicalAttachments} historical identity attachment(s), ${uncachedHistoricalAttachments} uncached`,
  );
  resultRefs.complete = sourceComplete;
  return {
    listings, land, resultRefs, land_complete: false,
    valid_empty: sourceComplete && listings.length === 0,
    valid_empty_land: sourceComplete && land.length === 0,
  };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz: [], land, valid_empty, valid_empty_land, land_complete: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
