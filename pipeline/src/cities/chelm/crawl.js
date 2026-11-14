
import { pathToFileURL } from 'node:url';
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

const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);


async function fetchAllRecords() {
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

async function fetchPdfUrl(docId) {
  let html;
  try {
    html = await getText(DETAIL_URL(docId));
  } catch (err) {
    console.error(`  chelm detail fetch failed (doc ${docId}): ${err.message}`);
    return null;
  }
  const m = /href="(https?:\/\/[^"]*\.pdf)"/i.exec(html);
  return m ? m[1] : null;
}


let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  const rows = await fetchAllRecords();

  const relevant = [];
  for (const row of rows) {
    const title = (row.tresc || '').replace(/\s+/g, ' ').trim();
    const docId = row.id_dokumentu;
    if (!docId || !title) continue;
    if (isSkippableTitle(title)) continue;
    let role = null;
    if (isResultTitle(title)) role = 'result';
    else if (isAnnouncementTitle(title)) role = 'ann';
    else continue;
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

    if (isResultNotice(text)) {
      resultRefs.push({ text, pdf_url: pdfUrl, detail_url: detailUrl, auction_date: null });
      continue;
    }

    if (ref.role === 'result') {
      console.error(`  chelm WARN: result title but not result body, skipping doc ${ref.docId}`);
      continue;
    }

    const rec = parseAnnouncement(text);
    if (!rec) {
      console.error(`  chelm WARN: announcement not parsed (doc ${ref.docId}, ${ref.title.slice(0, 60)})`);
      continue;
    }

    if (!rec.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
      rec.auction_date = ref.published_date;
      rec.auction_date_estimated = true;
    }

    if (rec.kind === 'grunt') {
      console.error(`  chelm: land record skipped (doc ${ref.docId})`);
    } else {
      listings.push({ ...rec, detail_url: detailUrl, source_url: pdfUrl });
    }
  }

  console.error(`  chelm: ${listings.length} flat/building listing(s), ${resultRefs.length} result notice(s)`);
  return { listings, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
