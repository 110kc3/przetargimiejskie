// Chełm crawler — lubelskie.pl BIP DataTables API.
//
// The board page (https://umchelm.bip.lubelskie.pl/index.php?id=55) embeds a
// DataTables config with `"ajaxSource":"?id=55&action=list-ajax"`. A POST to
// that endpoint returns ALL records as JSON (sEcho/iTotalRecords format, legacy
// DataTables 1.9 API). Records have:
//   id_dokumentu, tresc (title), data_utworzenia (YYYY-MM-DD), opis (HTML body)
//
// The PDF attachment URL lives on the detail page:
//   GET https://umchelm.bip.lubelskie.pl/index.php?id=55&action=details&document_id=N
//   → HTML with <a href="https://umchelm.bip.lubelskie.pl/upload/pliki/...pdf">
//
// Strategy:
//   1. Fetch ALL records from the list-ajax endpoint (one call, no pagination
//      needed — 796 records fit in one request).
//   2. Filter titles to announcements + result notices (skip wykazy, najem, etc.)
//   3. For each relevant document, fetch the detail page to get the PDF URL.
//   4. Extract PDF text with pdftotext; classify as announcement vs. result from body.
//
// Achieved-price stream is WEAK (~5 result notices in 796 records). This is
// noted in config.js and the spike. The adapter returns what exists.
//
// source:'html' means crawlResultDocs() returns refs already carrying `.text`,
// so refresh.js bypasses the generic PDF-OCR dispatch.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncement,
  isResultNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'https://umchelm.bip.lubelskie.pl';
const BOARD_ID = 55;
const LIST_AJAX_URL = `${ORIGIN}/index.php?id=${BOARD_ID}&action=list-ajax`;
const DETAIL_URL = (docId) => `${ORIGIN}/index.php?id=${BOARD_ID}&action=details&document_id=${docId}`;

// Articles published more than 90 days ago that still lack a parseable auction
// date are treated as stale and stamped with their publish date so they age
// into the archive rather than lingering as perpetually "active" rows.
const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

// ----------------------------------------------------------------- API helpers

/**
 * Fetch all records from the list-ajax endpoint.
 * Returns the raw aaData array (objects with id_dokumentu, tresc, data_utworzenia).
 */
async function fetchAllRecords() {
  // DataTables 1.9 legacy format: POST with draw=1, length=9999 to get everything.
  const body = 'draw=1&start=0&length=9999&order%5B0%5D%5Bcolumn%5D=5&order%5B0%5D%5Bdir%5D=desc';
  let json;
  try {
    const res = await fetch(LIST_AJAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'przetargimiejskie-bot/0.1 (+https://github.com/110kc3/przetargimiejskie)',
      },
      body,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    json = await res.json();
  } catch (err) {
    console.error(`  chelm list-ajax failed: ${err.message}`);
    return [];
  }
  const rows = json?.aaData || json?.data || [];
  console.error(`  chelm list-ajax: ${rows.length} total records (reported: ${json?.iTotalRecords ?? '?'})`);
  return rows;
}

/**
 * Fetch the document detail page and return the first PDF attachment URL, or null.
 */
async function fetchPdfUrl(docId) {
  let html;
  try {
    html = await getText(DETAIL_URL(docId));
  } catch (err) {
    console.error(`  chelm detail fetch failed (doc ${docId}): ${err.message}`);
    return null;
  }
  // <a href="https://umchelm.bip.lubelskie.pl/upload/pliki/....pdf">
  const m = /href="(https?:\/\/[^"]*\.pdf)"/i.exec(html);
  return m ? m[1] : null;
}

// ----------------------------------------------------------------- crawl orchestration

let crawlPromise = null;

async function crawlAll() {
  const listings = [];   // address-keyed active records → properties.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date }

  const rows = await fetchAllRecords();

  // Classify each record by title before fetching PDFs
  const relevant = [];
  for (const row of rows) {
    const title = (row.tresc || '').replace(/\s+/g, ' ').trim();
    const docId = row.id_dokumentu;
    if (!docId || !title) continue;
    if (isSkippableTitle(title)) continue;
    let role = null;
    if (isResultTitle(title)) role = 'result';
    else if (isAnnouncementTitle(title)) role = 'ann';
    else continue; // unclassifiable noise
    relevant.push({ docId, title, published_date: row.data_utworzenia, role });
  }

  const anns = relevant.filter((r) => r.role === 'ann').length;
  const results = relevant.filter((r) => r.role === 'result').length;
  console.error(`  chelm: ${relevant.length} relevant (${anns} announcements, ${results} result titles)`);

  for (const ref of relevant) {
    const pdfUrl = await fetchPdfUrl(ref.docId);
    if (!pdfUrl) {
      console.error(`  chelm: no PDF on doc ${ref.docId} (${ref.title.slice(0, 60)})`);
      continue;
    }
    const detailUrl = DETAIL_URL(ref.docId);

    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  chelm: PDF extract failed ${pdfUrl}: ${err.message}`);
      continue;
    }

    // Body is authoritative: a result notice body overrides a title-classified announcement
    if (isResultNotice(text)) {
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: detailUrl, auction_date: null });
      continue;
    }

    if (ref.role === 'result') {
      // Title said result but body doesn't confirm — treat as noise, skip
      console.error(`  chelm WARN: result title but not result body, skipping doc ${ref.docId}`);
      continue;
    }

    const rec = parseAnnouncement(text);
    if (!rec) {
      console.error(`  chelm WARN: announcement not parsed (doc ${ref.docId}, ${ref.title.slice(0, 60)})`);
      continue;
    }

    // Stale undated records: stamp publish date so they age into archive
    if (!rec.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
      rec.auction_date = ref.published_date;
      rec.auction_date_estimated = true;
    }

    if (rec.kind === 'grunt') {
      // Land parcel — skip (no land.json support in this adapter yet; low volume)
      console.error(`  chelm: land record skipped (doc ${ref.docId})`);
    } else {
      listings.push({ ...rec, detail_url: detailUrl, source_url: pdfUrl });
    }
  }

  console.error(`  chelm: ${listings.length} flat/building listing(s), ${resultRefs.length} result notice(s)`);
  return { listings, resultRefs };
}

/** Result notices (achieved prices) — WEAK stream, see config.js. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
