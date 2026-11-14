import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isFlatSaleRow,
  isResultNotice,
  buildResultText,
  buildNegativeResultText,
  dateOnly,
} from './parse.js';

const ORIGIN = 'https://bip.krosnoodrzanskie.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_ACTIVE_PAGES = Number(process.env.KROSNO_ODRZANSKIE_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.KROSNO_ODRZANSKIE_MAX_RESOLVED_PAGES) || 40;
const ROWS_PER_PAGE = 10;
const CRAWL_BUDGET_MS = Number(process.env.KROSNO_ODRZANSKIE_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


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
  const scope = ulM ? ulM[1] : rowHtml || '';
  const linkRe = /<a\s+href="([^"]+)"/gi;
  let m;
  while ((m = linkRe.exec(scope)) !== null) {
    const url = deamp(m[1]);
    if (!/pobierz\.php|\/obj\/|\.pdf|\.docx?/i.test(url)) continue;
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
    ? `${ORIGIN}/przetargi/202/status/${status}/`
    : `${ORIGIN}/przetargi/202/${page}/status/${status}/`;
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
    const cenaText = cenaM ? stripTags(cenaM[1].replace(/^\s*<div>[\s\S]*?<\/div>/i, '')) : '';

    const title1All = [...row.matchAll(/class="td-title-1"[^>]*>(?:<div>[^<]*<\/div>)?([\s\S]*?)<\/td>/g)];
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


const ANN_RE = /ogloszenie|og[łl]oszenie|na_sprzeda|przetarg/i;
const RESULT_RE = /wynik|informacj/i;
const NOISE_RE = /map|rzut|formularz|zg[łl]oszen|\.jpe?g|\.png|\.gif|piwnic/i;

const isPdf = (a) => /\.pdf(?:$|[?&])/i.test(a.filename || a.url);

function pickAnnouncementAttachment(attachments) {
  const pdfs = (attachments || []).filter((a) => isPdf(a) && !NOISE_RE.test(a.filename || a.url));
  return pdfs.find((a) => !RESULT_RE.test(a.filename || a.url) && ANN_RE.test(a.filename || a.url)) || null;
}

function pickResultAttachment(attachments) {
  const pdfs = (attachments || []).filter((a) => isPdf(a) && !NOISE_RE.test(a.filename || a.url));
  return pdfs.find((a) => RESULT_RE.test(a.filename || a.url)) || null;
}


async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  krosno-odrzanskie: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

const hasText = (t) => (t || '').replace(/[\s\f]/g, '').length > 20;

async function extractPdf(att, expectResult = false) {
  let text = null;
  try {
    text = await pdfText(att.url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  krosno-odrzanskie: pdftotext failed (${att.url}): ${err.message}`);
  }
  const usable = hasText(text) && (!expectResult || isResultNotice(text));
  if (usable) return text;
  try {
    const ocr = await ocrPdf(att.url, { userAgent: BROWSER_UA, psm: 1 });
    if (hasText(ocr)) return ocr;
  } catch (err) {
    console.error(`  krosno-odrzanskie: OCR fallback failed (${att.url}): ${err.message}`);
  }
  return hasText(text) ? text : null;
}


export async function crawlActive() {
  const listings = [];
  const seenDetails = new Set();
  const deadline = Date.now() + CRAWL_BUDGET_MS;

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    if (Date.now() > deadline) break;
    const html = await fetchPage(boardUrl(0, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      if (!isFlatSaleRow(row.dotyczyText)) continue;
      const att = pickAnnouncementAttachment(row.attachments);
      const body = att ? await extractPdf(att, false) : null;
      const listing = parseAnnouncement(row, body, att ? att.url : row.detailUrl);
      if (listing) listings.push(listing);
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  console.error(`  krosno-odrzanskie crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const refs = [];
  const seenDetails = new Set();
  const known = await loadKnownSourceUrls('krosno-odrzanskie');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skippedKnown = 0;

  for (let page = 1; page <= MAX_RESOLVED_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  krosno-odrzanskie: result-crawl budget exhausted — stopping early');
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

      const wynik = (row.wynikText || '').trim();
      if (/brak\s+wyniku/i.test(wynik) || (!/pozytywny/i.test(wynik) && !/negatywny/i.test(wynik))) {
        continue;
      }

      const att = pickResultAttachment(row.attachments);
      if (att) {
        if (known.has(att.url)) {
          skippedKnown++;
          continue;
        }
        const body = await extractPdf(att, true);
        refs.push({
          text: buildResultText(row.dotyczyText, row.cenaText, body || ''),
          pdf_url: att.url,
          detail_url: row.detailUrl,
          auction_date: dateOnly(row.auctionDateRaw),
        });
      } else if (/negatywny/i.test(wynik)) {
        refs.push({
          text: buildNegativeResultText(row),
          pdf_url: row.detailUrl,
          detail_url: row.detailUrl,
          auction_date: dateOnly(row.auctionDateRaw),
        });
      }
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  if (skippedKnown) console.error(`  krosno-odrzanskie: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  krosno-odrzanskie crawlResultDocs: ${refs.length} result ref(s)`);
  return refs;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        results: results.length,
        sampleListing: listings[0] || null,
        sampleResult: results[0]
          ? { pdf_url: results[0].pdf_url, detail_url: results[0].detail_url, auction_date: results[0].auction_date }
          : null,
      },
      null,
      2,
    ) + '\n',
  );
}
