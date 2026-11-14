
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'https://bip.wegrow.com.pl';
const CATEGORY = 345;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) przetargimiejskie-bot/0.1';
const FETCH_OPTS = { userAgent: UA };

const MAX_PAGES = 30;

const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const MIN_TEXT_LEN = 40;

const boardXmlUrl = (page) => `${ORIGIN}/artykuly/xml/${CATEGORY}/${page}/1`;

function xmlDateToIso(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function parseBoardPage(xml) {
  if (!xml) return [];
  const out = [];
  const seen = new Set();
  const re = /<artykul>\s*<url>([^<]+)<\/url>\s*<tytul>([^<]*)<\/tytul>\s*<data>([^<]*)<\/data>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, url, tytul, data] = m;
    const idMatch = /\/artykul\/\d+\/(\d+)\//.exec(url);
    const id = idMatch ? idMatch[1] : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url: url.trim(), tytul: tytul.trim(), published_date: xmlDateToIso(data) });
  }
  return out;
}

async function fetchPageCount() {
  try {
    const xml = await getText(boardXmlUrl(1), FETCH_OPTS);
    const m = /<ilosc-stron>(\d+)<\/ilosc-stron>/.exec(xml);
    return { first: xml, pages: m && Number(m[1]) > 0 ? Math.min(Number(m[1]), MAX_PAGES) : 1 };
  } catch (err) {
    console.error(`  wegrow: board page 1 failed: ${err.message}`);
    return { first: null, pages: 0 };
  }
}

export function primaryAttachmentUrl(html, tytul) {
  const sec = /<section id="attachments"[^>]*>([\s\S]*?)<\/section>/i.exec(html || '');
  const scope = sec ? sec[1] : html || '';
  const re = /<a id="attachments-title"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  let first = null;
  const wantedNorm = (tytul || '').replace(/\s+/g, ' ').trim().toLowerCase();
  while ((m = re.exec(scope)) !== null) {
    const url = m[1];
    const label = m[2].replace(/\s+/g, ' ').trim();
    if (!first) first = url;
    if (wantedNorm && label.toLowerCase() === wantedNorm) return url;
  }
  return first;
}

async function extractPdfText(url) {
  try {
    const t = await pdfText(url, FETCH_OPTS);
    if (t && t.trim().length >= MIN_TEXT_LEN) return t;
  } catch {
    // not a text PDF (or not a PDF at all) — fall through to OCR
  }
  return ocrPdf(url, FETCH_OPTS);
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
        xml = await getText(boardXmlUrl(page), FETCH_OPTS);
      } catch (err) {
        console.error(`  wegrow: board page ${page} failed: ${err.message}`);
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

  let skippedTitle = 0;
  for (const ref of refs) {
    if (isSkippableTitle(ref.tytul)) { skippedTitle++; continue; }
    let role = null;
    if (isResultTitle(ref.tytul)) role = 'result';
    else if (isAnnouncementTitle(ref.tytul)) role = 'ann';
    if (!role) {
      console.error(`  wegrow: unclassified title, skipping (article ${ref.id}): ${ref.tytul.slice(0, 80)}`);
      continue;
    }

    let html;
    try {
      html = await getText(ref.url, FETCH_OPTS);
    } catch (err) {
      console.error(`  wegrow: article ${ref.id} fetch failed: ${err.message}`);
      continue;
    }
    const attUrl = primaryAttachmentUrl(html, ref.tytul);
    if (!attUrl) {
      console.error(`  wegrow: no attachment found on article ${ref.id} (${ref.tytul.slice(0, 60)})`);
      continue;
    }
    let body;
    try {
      body = await extractPdfText(attUrl);
    } catch (err) {
      console.error(`  wegrow: attachment extract failed ${attUrl}: ${err.message}`);
      continue;
    }
    const text = buildRecordText({ title: ref.tytul, body });

    if (role === 'result') {
      resultRefs.push({ text, pdf_url: ref.url, auction_date: ref.published_date });
      continue;
    }

    const parsed = parseAnnouncement(text);
    if (!parsed) {
      console.error(`  wegrow WARN: announcement not parsed (article ${ref.id}, ${ref.tytul.slice(0, 60)})`);
      continue;
    }
    if (!parsed.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
      parsed.auction_date = ref.published_date;
      parsed.auction_date_estimated = true;
    }
    const enriched = { ...parsed, detail_url: ref.url, source_url: ref.url };
    (parsed.kind === 'grunt' ? land : listings).push(enriched);
  }

  console.error(
    `  wegrow: ${listings.length} flat/house listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s), ${skippedTitle} wykaz/skip title(s)`,
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
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0] && { pdf_url: results[0].pdf_url, auction_date: results[0].auction_date },
      },
      null,
      2,
    ) + '\n',
  );
}
