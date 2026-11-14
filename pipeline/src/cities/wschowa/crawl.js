import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { docText } from '../../core/doc-text.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  recordsFromActiveRow,
  isFlatSaleRow,
  isResultNotice,
  buildNegativeResultText,
  dateOnly,
} from './parse.js';

const ORIGIN = 'https://bip.gminawschowa.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_ACTIVE_PAGES = Number(process.env.WSCHOWA_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.WSCHOWA_MAX_RESOLVED_PAGES) || 14;
const ROWS_PER_PAGE = 10;
const CRAWL_BUDGET_MS = Number(process.env.WSCHOWA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


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

function cellText(s) {
  return (s || '')
    .replace(/^\s*<div>[\s\S]*?<\/div>/i, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*\n+/g, '\n')
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
    ? `${ORIGIN}/przetargi/29/status/${status}/`
    : `${ORIGIN}/przetargi/29/${page}/status/${status}/`;
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
    const cenaText = cenaM ? cellText(cenaM[1]) : '';

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

function pickResultAttachment(attachments) {
  const candidates = (attachments || []).filter((a) => /informacj|wynik/i.test(a.filename || a.url));
  const docx = candidates.find((a) => /\.docx(?:$|[?&])/i.test(a.filename || a.url));
  if (docx) return docx;
  return candidates[0] || null;
}


async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wschowa: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

async function extractAttachment(att) {
  const isPdf = /\.pdf(?:$|[?&])/i.test(att.filename || att.url);
  if (!isPdf) {
    try {
      const text = await docText(att.url, { userAgent: BROWSER_UA });
      if (text) return text;
    } catch (err) {
      console.error(`  wschowa: docText failed (${att.url}): ${err.message}`);
    }
    return null;
  }
  let text = null;
  try {
    text = await pdfText(att.url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wschowa: pdftotext failed (${att.url}): ${err.message}`);
  }
  if (text && isResultNotice(text)) return text;
  try {
    const ocr = await ocrPdf(att.url, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr) return ocr;
  } catch (err) {
    console.error(`  wschowa: OCR fallback failed (${att.url}): ${err.message}`);
  }
  return text || null;
}


export async function crawlActive({ getPage = fetchPage } = {}) {
  const listings = [];
  const land = [];
  const seenDetails = new Set();
  let verifiedEmpty = false;

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    const html = await getPage(boardUrl(0, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) {
      const activeTab = /<a\b[^>]*id="tab-0"[^>]*>/i.exec(html)?.[0] || '';
      const content = html.slice(html.indexOf('id="search-heading"'));
      verifiedEmpty = page === 1
        && activeTab.includes(`href="${boardUrl(0, 1)}"`)
        && /aria-selected="true"/i.test(activeTab)
        && /<div\b[^>]*role="status"[^>]*>\s*Brak informacji spełniających kryteria\.\s*<\/div>/i.test(content)
        && !/<tr\b|\/przetargi\/29\/\d+\//i.test(content);
      break;
    }

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      const { listings: l, land: g } = recordsFromActiveRow(row);
      listings.push(...l);
      land.push(...g);
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  console.error(`  wschowa crawlActive: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
  return { listings, wykaz: [], land, valid_empty: verifiedEmpty, valid_empty_land: verifiedEmpty };
}


export async function crawlResultDocs() {
  const refs = [];
  const seenDetails = new Set();
  const known = await loadKnownSourceUrls('wschowa');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skippedKnown = 0;
  let negativeCount = 0;

  for (let page = 1; page <= MAX_RESOLVED_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  wschowa: result-crawl budget exhausted — stopping early');
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
      if (/^negatywny/i.test(wynik)) {
        negativeCount++;
        refs.push({
          text: buildNegativeResultText(row),
          pdf_url: row.detailUrl,
          detail_url: row.detailUrl,
          auction_date: dateOnly(row.auctionDateRaw),
        });
        continue;
      }
      if (!/^pozytywny/i.test(wynik)) continue;

      const att = pickResultAttachment(row.attachments);
      if (!att) {
        console.error(`  wschowa: positive result with no wynik attachment (${row.detailUrl}) — skipped`);
        continue;
      }
      if (known.has(att.url)) {
        skippedKnown++;
        continue;
      }

      const text = await extractAttachment(att);
      if (!text) {
        console.error(`  wschowa: no usable text for ${att.url} — skipped`);
        continue;
      }
      refs.push({
        text,
        pdf_url: att.url,
        detail_url: row.detailUrl,
        auction_date: dateOnly(row.auctionDateRaw),
      });
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  if (skippedKnown) console.error(`  wschowa: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  wschowa crawlResultDocs: ${refs.length} result ref(s) (${negativeCount} no-fetch negative)`);
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
        sampleListing: listings[0] || null,
        sampleLand: land[0] || null,
        sampleResult: results[0]
          ? { pdf_url: results[0].pdf_url, detail_url: results[0].detail_url, auction_date: results[0].auction_date }
          : null,
      },
      null,
      2,
    ) + '\n',
  );
}
