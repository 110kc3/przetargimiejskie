// Toruń crawler.
//
// PRIMARY FLOW (crawlActive):
//   1. Fetch the XML export: https://bip.torun.pl/przetargi-nieruchomosci/xml/1/200
//      — one call returns ALL records (~100 currently). Fields: url, address,
//      przetarg-na, rodzaj-nieruchomosci, cena-wywolawcza, data-przetargu.
//   2. Parse XML into raw records via parseXmlFeed().
//   3. Keep only `Lokal mieszkalny` kind; emit as active listings. Other kinds
//      (niezabudowana, zabudowana, użytkowy) are dropped (out of scope for the
//      flat-auction pipeline).
//   4. Resolved records ("lokal sprzedany" slug/address) are included — the
//      refresh loop keeps them in the archive so result docs can fold prices in.
//
// RESULT DOCS FLOW (crawlResultDocs):
//   1. Walk all resolved flat records (url contains "lokal-sprzedany" OR
//      address contains "lokal sprzedany").
//   2. For each: fetch the detail page, find "info o wyniku przetargu" DOCX
//      attachments, download + unpack each via docText(), return as refs with
//      .text already set.
//   3. parseResultDoc() (via index.js) processes each ref.
//
// The two passes share one memoised XML fetch (crawlAll()), so the XML is
// fetched exactly once per refresh run.

import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';
import { parseXmlFeed, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.torun.pl';
// One call returns the full index. Per-page 200 is a safe upper bound.
// If the archive ever exceeds 200 records, bump to 500 (the CMS has no
// hard cap observed in the spike — the XML endpoint honoured /xml/1/100
// returning 97 records as of 2026-06-27).
const XML_URL = `${ORIGIN}/przetargi-nieruchomosci/xml/1/200`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// Attachment name pattern for result notices: "info o wyniku przetargu …"
const RESULT_NOTICE_RE = /info\s+o\s+wyniku|wynik\w*\s+przetarg/i;

/**
 * Extract all attachment URLs from a detail page HTML.
 * Returns an array of { url, label } objects.
 * The CMS renders attachments as:
 *   <a id="attachments-title" title="Plik do pobrania"
 *      href="https://bip.torun.pl/attachments/download/59378">
 *   info o wyniku przetargu 19.05.2026r.
 *   docx, 15 kB
 */
export function attachmentsFromDetailHtml(html) {
  const out = [];
  // Match each <a id="attachments-title" …> block and capture the href + the
  // text content that follows it up to the next significant tag.
  const blockRe =
    /<a[^>]*id="attachments-title"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)(?=<a[^>]*id="attachments-title"|<\/div>|<input\b)/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/gi, '&').trim();
    // Extract text label: strip tags, collapse whitespace.
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const url = /^https?:\/\//.test(href) ? href : ORIGIN + href;
    out.push({ url, label });
  }
  return out;
}

/**
 * Filter attachments to only result-notice .docx files.
 * Toruń labels these "info o wyniku przetargu {date}r." or similar.
 */
export function resultDocAttachments(attachments) {
  return attachments.filter(
    (a) => RESULT_NOTICE_RE.test(a.label) && /\bdocx?\b/i.test(a.label),
  );
}

// ── Shared crawl state ────────────────────────────────────────────────────────

let crawlPromise = null;

async function crawlAll() {
  let xml;
  try {
    xml = await getText(XML_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  torun XML fetch failed: ${err.message}`);
    return { listings: [], resultRefs: [] };
  }

  const records = parseXmlFeed(xml);
  console.error(`  torun XML: ${records.length} total records`);

  // Keep only residential flats.
  const flatRecords = records.filter((r) => r.kind === 'mieszkalny');
  console.error(`  torun: ${flatRecords.length} lokal mieszkalny records`);

  // Active listings: all flat records (both active and resolved).
  // The refresh loop's past-date filter hides already-held auctions in the UI;
  // result-doc prices are folded in by build-properties.
  const listings = flatRecords.map((r) => {
    const address = parseAddress(r.address_raw);
    return {
      kind: r.kind,
      address_raw: r.address_raw,
      address,
      auction_date: r.auction_date,
      round: r.round,
      area_m2: null, // not in the XML feed; available on the detail page HTML
      starting_price_pln: r.starting_price_pln,
      detail_url: r.detail_url,
    };
  });

  // Result refs: resolved flat records → fetch detail page → find result DOCXs.
  const resolvedFlats = flatRecords.filter((r) => r.resolved);
  console.error(`  torun: ${resolvedFlats.length} resolved flat(s) to check for result docs`);

  const resultRefs = [];
  for (const rec of resolvedFlats) {
    let detailHtml;
    try {
      detailHtml = await getText(rec.detail_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  torun detail fetch failed ${rec.detail_url}: ${err.message}`);
      continue;
    }

    const allAttachments = attachmentsFromDetailHtml(detailHtml);
    const resultAtts = resultDocAttachments(allAttachments);
    if (resultAtts.length === 0) {
      console.error(`  torun: no result-doc attachments on ${rec.detail_url}`);
      continue;
    }

    for (const att of resultAtts) {
      let text;
      try {
        text = await docText(att.url, FETCH_OPTS);
      } catch (err) {
        console.error(`  torun DOCX extract failed ${att.url}: ${err.message}`);
        continue;
      }
      if (!isResultNotice(text)) {
        console.error(`  torun: attachment is not a result notice: ${att.url}`);
        continue;
      }
      resultRefs.push({
        text,
        pdf_url: att.url,
        auction_date: rec.auction_date,
        label: att.label,
      });
    }
  }

  console.error(`  torun: ${listings.length} flat listings, ${resultRefs.length} result doc(s)`);
  return { listings, wykaz: [], resultRefs };
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

/** @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>} */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
