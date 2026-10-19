// Trzebnica crawler — server-rendered Logonet BIP consumed via its clean XML
// feed (no SPA, no OCR-by-default, no TLS workaround). See config.js/parse.js
// for the full CMS-shape writeup + the corrected clone lineage (naklo-nad-
// notecia, not tarnowskie-gory — verified live 2026-07-11).
//
// Enumeration walks the paginated BOARD XML:
//   https://bip.trzebnica.pl/przetargi-nieruchomosci/xml/{page}/1
// whose <ilosc-stron> gives the page count (4 pages / 366 records as of
// 2026-07-11). UNLIKE naklo, the board XML already embeds every record's
// core fields (adres/rodzaj/cena/data/typ/przetarg-na) — enumerating the
// whole board costs only a handful of requests, no per-record fetch needed
// just to see what's on it.
//
// A per-record fetch (https://bip.trzebnica.pl/przetarg-nieruchomosci/xml/
// {id}/1) is still needed to reach <zalaczniki> (the attachment list), which
// is where: (a) the DEEP fields (usable floor area for flats; parcel number +
// plot area for land) live — only in the announcement PDF, never in the
// board XML or its free-text summary; and (b) a (rare) published result
// attachment is discoverable. To keep this affordable at 1 req/sec:
//   - Records with NO auction_date or a date within the last few days
//     ("ACTIVE") always get the per-record fetch + announcement-PDF fetch —
//     cheap, only a handful open at any time (4 as of 2026-07-11).
//   - Older records are the candidate pool for the achieved-price stream.
//     ACHIEVED-PRICE STREAM IS VERY SPARSE (2/366 confirmed live) but the
//     ONLY way to find a result is to check every record's <zalaczniki> for
//     an "informacja o wyniku"-named attachment — so, matching the
//     kedzierzyn-kozle / bialystok precedent (ADAPTER-GUIDE §5.1) for a big
//     archive, this pool is walked under a wall-clock BUDGET + a record CAP,
//     newest-first (the board XML already returns newest-first), so a
//     timeout only ever truncates the OLDEST tail — that remainder backfills
//     on the next run (merge-history retains prior results either way).
//     loadKnownSourceUrls() skips already-captured resolved outcomes. Archived
//     announcements remain eligible for later result attachments; current
//     records are always checked (ADAPTER-GUIDE §4).
//
// A found "informacja o wyniku"-NAMED attachment is fetched and body-checked
// (isResultNotice) before ever being trusted — one such attachment (Kobylice
// GGN P/9/2026) turned out to be a mislabeled re-upload of the announcement
// text; treating the <nazwa> label as authoritative would have silently
// fabricated a false result.
//
// source:'html' ⇒ result refs already carry `.text`, which refresh.js hands
// straight to parseResultDoc.

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

// A browser UA — harmless if unneeded, the safe default for municipal WAFs
// (matches naklo-nad-notecia on the same CMS family).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';
const FETCH_OPTS = { userAgent: UA };

// The board is 4 pages (~366 records) as of 2026-07-11, growing ~50-75/year
// (spike estimate) — bounded well above that for headroom.
const MAX_BOARD_PAGES = 20;

// Wall-clock budget + record cap for the historical-backfill pool (achieved-
// price discovery — see file header). Overridable for local runs; CI uses the
// defaults. At 1 req/sec, 366 records ≈ 6 min of record-XML fetches alone;
// 10 min / 500 records comfortably covers the full live archive plus a few
// years of growth in one pass.
const CRAWL_BUDGET_MS = Number(process.env.TRZEBNICA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;
const MAX_RECORDS = Number(process.env.TRZEBNICA_MAX_RECORDS) || 500;
// Recover missing historical identities from their own announcements, in small
// uncached slices. Cached documents remain eligible without consuming the cap,
// so permanently unsupported rows cannot starve later unseen documents.
const MAX_HISTORICAL_ATTACHMENTS = 12;
const TEXT_CACHE_DIRS = ['pdf-text-cache', 'doc-text-cache']
  .map((name) => fileURLToPath(new URL(`../../../${name}/`, import.meta.url)));
const attachmentCached = (url) => TEXT_CACHE_DIRS.some((directory) => existsSync(join(directory, `${urlCacheKey(url)}.txt`)));

// A record with no parseable date, or a date within this many days in the
// past, is still treated as ACTIVE (always gets the deep-field fetch — a
// przetarg can be postponed/relisted with the same date lingering briefly).
// Anything older is historical-backfill territory.
const ACTIVE_SLACK_DAYS = 3;
const activeCutoff = () => new Date(Date.now() - ACTIVE_SLACK_DAYS * 864e5).toISOString().slice(0, 10);

const boardXml = (page) => `${ORIGIN}/przetargi-nieruchomosci/xml/${page}/1`;
const recordXml = (id) => `${ORIGIN}/przetarg-nieruchomosci/xml/${id}/1`;

/** Extract one XML tag's inner text (first match) from a fragment. */
function tag(xml, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml || '');
  return m ? m[1] : '';
}

/**
 * One board page's records — id/url + every inline field, no per-record
 * fetch needed (see file header).
 * @param {string} xml
 * @returns {Array<{id:string, url:string, adres:string, rodzaj:string,
 *   cena:string, data:string, typ:string, przetargNa:string}>}
 */
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

/** Every board record across all pages (bounded, deduped by id). */
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

/** The main announcement attachment (first substantive one, skipping known
 *  ancillary docs) + a "informacja o wyniku"-NAMED attachment, if any, from
 *  one record's <zalaczniki>. Body-confirmation of the result happens later
 *  (see crawlAll) — the <nazwa> match here only decides what's WORTH fetching. */
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
      out.result = { url, nazwa }; // last such match wins (rare to have >1)
      continue;
    }
    if (/[śs]wiadectwo|o[śs]wiadczenie|sprostowanie|odwo[łl]anie|wypis|wyrys|^mapa|fragment\s+mapy/i.test(nazwa)) continue;
    if (!out.announcement) out.announcement = { url, nazwa };
  }
  return out;
}

/** pdfText first (everything observed live is a born-digital PDF); docText
 *  as a defensive fallback for a legacy .doc/.docx the census didn't catch. */
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
  const listings = []; // address-keyed active records (flats / built / commercial)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date:null }

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
    if (isLease(preText)) continue; // defensive — none observed live (see parse.js)

    const boardDate = auctionDateFromText(preText);
    const isActive = !boardDate || boardDate >= cutoff;

    if (!isActive) {
      if (known.has(ref.url)) continue; // already captured in committed data
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

    // 1) Result attachment, if named as one — body-confirm before trusting it.
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
      continue; // concluded — not also an active listing
    }

    // 2) No confirmed result → an announcement (possibly stale). Only fetch
    // the announcement PDF for ACTIVE records — that's where the deep fields
    // (area_m2 / dzialka_nr) actually matter; historical dateless backfill
    // still yields a record from the board-XML fields alone (price/date/
    // round/kind/address), just without area/parcel enrichment.
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
      // Stale, no confirmed result → age into the archive via the board date
      // (STALE_CUTOFF pattern shared with tarnowskie-gory/naklo) so it never
      // lingers as a dateless "current" row.
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

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land, valid_empty, valid_empty_land } = await crawlPromise;
  // Known historical rows are skipped and source boards prune old notices.
  // Preserve land history through the same incremental merge as property history.
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
