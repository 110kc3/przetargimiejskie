// Nakło nad Notecią crawler — server-rendered Logonet BIP consumed via its
// clean XML feed (no SPA, no OCR-by-default, no TLS workaround). See config.js.
//
// Enumeration walks the paginated board XML:
//   https://bip.gmina-naklo.pl/przetargi-nieruchomosci/xml/{page}/1
// whose <ilosc-stron> gives the page count (1 page / 96 records as of
// 2026-07-10) and whose <artykul><url> entries give each record id. For every
// record we fetch the per-record XML:
//   https://bip.gmina-naklo.pl/przetarg-nieruchomosci/xml/{id}/1
// and extract its fields (adres, rodzaj, cena, data, typ, przetarg-na, tresc).
//
// UNLIKE Chełmno, there is no inline <rozstrzygniecie> — Nakło publishes the
// achieved-price / negative-outcome notice as a SEPARATE attachment named
// "Informacja o wyniku przetargu" / "... rokowań" / "... drugich rokowań",
// listed in the record's <zalaczniki> and served as a mix of .pdf and .docx
// (Content-Type verified live: application/pdf for some, OOXML .docx for
// others — no way to tell from the XML alone, hence the pdfText→docText
// fallback below, same pattern as Zabrze). Routing:
//   isLease(preText)          → skip (dzierżawa/najem — never a sale; checked
//                                BEFORE fetching any result attachment so a
//                                lease's attachment is never wastefully fetched)
//   result attachment found + extracts → resultRefs (crawlResultDocs stream)
//   result attachment found but extract fails → skip (can't tell sold/unsold;
//                                safer than mis-slotting it as still-pending)
//   no result attachment      → pending → parseAnnouncement → listings / land
//
// source:'html' ⇒ result refs already carry `.text` (the built blob, WYNIK
// pre-filled), which refresh.js hands straight to parseResultDoc.

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

// A browser UA — the Logonet host serves the XML feed to the bot UA too, but a
// browser UA is the safe default for municipal WAFs (harmless if unneeded).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';
const FETCH_OPTS = { userAgent: UA };

// Hard cap so a broken feed can never loop forever. The board is 1 page / ~96
// records as of 2026-07-10 and grows a handful a year.
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

/** Total board pages from page-1's <ilosc-stron>, bounded by MAX_PAGES. */
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

/** The LAST "Informacja o wyniku ..." attachment URL in a record's
 *  <zalaczniki> (przetargu / rokowań / drugich rokowań all match), or null. */
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

/**
 * Fetch + field-extract one record.
 * @returns {Promise<{text:string, lease?:boolean}|null>} null on fetch failure
 *   or an unreadable result attachment (skip); `.lease` true ⇒ caller skips.
 */
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

  // Lease gate BEFORE fetching a result attachment — saves a request for the
  // najem/dzierżawa "Nieruchomość zabudowana" records, which are never a sale.
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
        // Neither a text PDF nor a .doc/.docx — can't tell sold vs unsold.
        // Skip rather than mis-slot it as still-pending (its date has passed
        // and a result WAS posted, we just couldn't read it).
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
  const listings = []; // address-keyed active records (flats + built)
  const land = [];     // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, auction_date }

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
    if (pageRefs.length === 0) break; // past the last page
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
    `  naklo-nad-notecia: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
