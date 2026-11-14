
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { isAuctionSaleTitle, isLeaseTitle, parseAnnouncementPdf } from './parse.js';

const ORIGIN = 'https://bip.poddebice.pl';
const BOARD_ID = '102';
const LIST_URL = `${ORIGIN}/index.php?id=${BOARD_ID}&akcja=pobierz_dokumenty_ajax&chwila=1`;

const MAX_CANDIDATES = 60;

export function detailUrl(p2) {
  return `${ORIGIN}/index.php?id=${BOARD_ID}&p1=szczegoly&p2=${encodeURIComponent(p2)}`;
}

function currentYear() {
  return new Date().getFullYear();
}

export function parseListJson(jsonText) {
  if (!jsonText) return [];
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    console.error(`  poddebice: list JSON parse failed: ${err.message}`);
    return [];
  }
  const rows = Array.isArray(data?.aaData) ? data.aaData : [];
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 10) continue;
    const title = String(row[2] || '').replace(/\s+/g, ' ').trim();
    const date = row[5] || null;
    const p2 = row[9] != null ? String(row[9]) : null;
    if (!title || !p2 || seen.has(p2)) continue;
    seen.add(p2);
    out.push({ title, date, p2 });
  }
  return out;
}

export function pdfUrlFromDetail(html) {
  if (!html) return null;
  const m = /href="(upload\/pliki\/[^"]+\.pdf)"/i.exec(html);
  if (!m) return null;
  try {
    return new URL(m[1], `${ORIGIN}/`).href;
  } catch {
    return null;
  }
}

function withinActiveWindow(dateStr) {
  if (!dateStr) return false;
  const year = Number(dateStr.slice(0, 4));
  return Number.isFinite(year) && year >= currentYear() - 1;
}

let listPromise = null;
async function fetchListEntries() {
  listPromise ??= (async () => {
    let jsonText;
    try {
      jsonText = await getText(LIST_URL);
    } catch (err) {
      console.error(`  poddebice: list fetch failed: ${err.message}`);
      return [];
    }
    return parseListJson(jsonText);
  })();
  return listPromise;
}

export async function crawlActive() {
  const entries = await fetchListEntries();
  const candidates = entries
    .filter((e) => withinActiveWindow(e.date) && isAuctionSaleTitle(e.title) && !isLeaseTitle(e.title))
    .slice(0, MAX_CANDIDATES);
  console.error(`  poddebice: ${entries.length} board entries, ${candidates.length} active-auction candidate(s)`);

  const listings = [];
  const land = [];
  for (const entry of candidates) {
    let detailHtml;
    try {
      detailHtml = await getText(detailUrl(entry.p2));
    } catch (err) {
      console.error(`  poddebice: detail fetch failed (p2=${entry.p2}): ${err.message}`);
      continue;
    }
    const pdfUrl = pdfUrlFromDetail(detailHtml);
    if (!pdfUrl) {
      console.error(`  poddebice: no PDF link on detail p2=${entry.p2} — "${entry.title.slice(0, 90)}"`);
      continue;
    }
    let text;
    try {
      text = await pdfText(pdfUrl);
    } catch (err) {
      console.error(`  poddebice: pdfText failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    const records = parseAnnouncementPdf(text, entry.title, entry.date, pdfUrl);
    if (records.length === 0) {
      console.error(`  poddebice: parser returned 0 records for p2=${entry.p2} — "${entry.title.slice(0, 90)}"`);
      continue;
    }
    for (const r of records) (r.kind === 'grunt' ? land : listings).push(r);
  }

  console.error(`  poddebice active: ${listings.length} flat listing(s), ${land.length} land record(s)`);
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  const entries = await fetchListEntries();
  const resultEntries = entries.filter((e) => /wynik|rozstrzygni[eę]/i.test(e.title));
  if (resultEntries.length === 0) return [];

  const refs = [];
  for (const entry of resultEntries.slice(0, MAX_CANDIDATES)) {
    let detailHtml;
    try {
      detailHtml = await getText(detailUrl(entry.p2));
    } catch (err) {
      console.error(`  poddebice: result detail fetch failed (p2=${entry.p2}): ${err.message}`);
      continue;
    }
    const pdfUrl = pdfUrlFromDetail(detailHtml);
    if (!pdfUrl) continue;
    refs.push({ pdf_url: pdfUrl, auction_date: entry.date });
  }
  console.error(`  poddebice: ${refs.length} result PDF ref(s) (expected 0 — no result stream on this board)`);
  return refs;
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
