import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseActiveRow,
  parseResultDoc,
  buildNegativeResultText,
  isFlatSaleRow,
  isPositiveOutcome,
  isNegativeOutcome,
  isResultNotice,
  dateOnly,
} from './parse.js';

const ORIGIN = 'https://bip.miedzyrzecz.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_ACTIVE_PAGES = Number(process.env.MIEDZYRZECZ_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.MIEDZYRZECZ_MAX_RESOLVED_PAGES) || 12;
const ROWS_PER_PAGE = 30;
const CRAWL_BUDGET_MS = Number(process.env.MIEDZYRZECZ_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const deamp = (u) => (u || '').replace(/&amp;/g, '&');

function parseAttachments(rowHtml) {
  const out = [];
  const ulM = /<ul class="attachments">([\s\S]*?)<\/ul>/i.exec(rowHtml || '');
  if (!ulM) return out;
  const linkRe = /<a\s+href="([^"]+)"/gi;
  let m;
  while ((m = linkRe.exec(ulM[1])) !== null) {
    const url = deamp(m[1]);
    let filename = '';
    try {
      filename = new URL(url).searchParams.get('plik') || '';
    } catch {
    }
    out.push({ url, filename });
  }
  return out;
}


export function boardUrl(status, page) {
  return page <= 1
    ? `${ORIGIN}/przetargi/0/status/${status}/`
    : `${ORIGIN}/przetargi/0/${page}/status/${status}/`;
}

export function parseBoardPage(html) {
  const out = [];
  const rowRe = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html || '')) !== null) {
    const row = rm[1];

    const d1 = /td-date-1"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);
    const d2 = /td-date-2"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);

    const dotyczyM = /class="td-title-1"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(row);
    if (!dotyczyM) continue;
    const detailUrl = deamp(dotyczyM[1]);
    const dotyczyText = stripTags(dotyczyM[2]);

    const cenaM = /class="td-title-2"[^>]*>([\s\S]*?)<\/td>/.exec(row);
    const cenaText = cenaM ? stripTags(cenaM[1]) : '';

    const title1All = [...row.matchAll(/class="td-title-1"[^>]*>([\s\S]*?)<\/td>/g)];
    const wynikText = title1All.length > 1 ? stripTags(title1All[1][1]) : '';

    out.push({
      detailUrl,
      dotyczyText,
      cenaText,
      wynikText,
      announcedDate: d1 ? d1[1] : null,
      auctionDateRaw: d2 ? d2[1] : null,
      attachments: parseAttachments(row),
    });
  }
  return out;
}

function pickWynikAttachment(attachments) {
  const wynikLinks = (attachments || []).filter((a) => /wynik/i.test(a.filename || a.url));
  const docx = wynikLinks.find((a) => /\.docx(?:$|[?&])/i.test(a.filename || a.url));
  if (docx) return docx;
  return wynikLinks.find((a) => /\.pdf(?:$|[?&])/i.test(a.filename || a.url)) || wynikLinks[0] || null;
}


async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  miedzyrzecz: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

async function extractAttachment(att) {
  if (/\.docx(?:$|[?&])/i.test(att.filename || att.url)) {
    try {
      const text = await docText(att.url, { userAgent: BROWSER_UA });
      if (text) return text;
    } catch (err) {
      console.error(`  miedzyrzecz: docText failed (${att.url}): ${err.message}`);
    }
    return null;
  }
  let text = null;
  try {
    text = await pdfText(att.url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  miedzyrzecz: pdftotext failed (${att.url}): ${err.message}`);
  }
  if (text && isResultNotice(text)) return text;
  try {
    const ocr = await ocrPdf(att.url, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr) return ocr;
  } catch (err) {
    console.error(`  miedzyrzecz: OCR fallback failed (${att.url}): ${err.message}`);
  }
  return text || null;
}


export async function crawlActive() {
  const listings = [];
  const seenDetails = new Set();

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    const html = await fetchPage(boardUrl(0, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      const rec = parseActiveRow(row);
      if (rec) listings.push(rec);
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  console.error(`  miedzyrzecz crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const refs = [];
  const seenDetails = new Set();
  const known = await loadKnownSourceUrls('miedzyrzecz');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skippedKnown = 0;
  let negativeCount = 0;

  for (let page = 1; page <= MAX_RESOLVED_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  miedzyrzecz: result-crawl budget exhausted — stopping early');
      break;
    }
    const html = await fetchPage(boardUrl(1, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      if (Date.now() > deadline) break;
      if (!isFlatSaleRow(row.dotyczyText)) continue;

      if (isNegativeOutcome(row.wynikText)) {
        negativeCount++;
        refs.push({
          text: buildNegativeResultText(row),
          pdf_url: row.detailUrl,
          detail_url: row.detailUrl,
          auction_date: dateOnly(row.auctionDateRaw),
        });
        continue;
      }
      if (!isPositiveOutcome(row.wynikText)) continue;

      const wynikAtt = pickWynikAttachment(row.attachments);
      if (!wynikAtt) {
        console.error(`  miedzyrzecz: positive result with no wynik attachment (${row.detailUrl}) — skipped`);
        continue;
      }
      if (known.has(wynikAtt.url)) {
        skippedKnown++;
        continue;
      }

      const text = await extractAttachment(wynikAtt);
      if (!text) {
        console.error(`  miedzyrzecz: no usable text for ${wynikAtt.url} — skipped`);
        continue;
      }
      refs.push({
        text,
        pdf_url: wynikAtt.url,
        detail_url: row.detailUrl,
        auction_date: dateOnly(row.auctionDateRaw),
      });
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  if (skippedKnown) console.error(`  miedzyrzecz: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  miedzyrzecz crawlResultDocs: ${refs.length} result ref(s) (${negativeCount} no-fetch negative)`);
  return refs;
}
