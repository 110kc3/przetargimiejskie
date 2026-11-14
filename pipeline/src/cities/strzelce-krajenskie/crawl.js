
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isInScopeRow, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.strzelce.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_ACTIVE_PAGES = Number(process.env.STRZELCE_KRAJENSKIE_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.STRZELCE_KRAJENSKIE_MAX_RESOLVED_PAGES) || 10;
const ROWS_PER_PAGE = 10;
const CRAWL_BUDGET_MS = Number(process.env.STRZELCE_KRAJENSKIE_CRAWL_BUDGET_MS) || 10 * 60 * 1000;


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
      /* malformed URL — leave filename blank, callers just get no match */
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

function pickAnnouncementAttachment(attachments) {
  return (
    (attachments || []).find(
      (a) => /\.pdf(?:$|[?&])/i.test(a.filename || a.url) && !/wzor|zgloszenia|umow[ay]/i.test(a.filename || a.url),
    ) || null
  );
}

function pickWynikAttachment(attachments) {
  return (attachments || []).find((a) => /wynik/i.test(a.filename || a.url)) || null;
}


async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  strzelce-krajenskie: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

async function extractPdf(pdfUrl, usable) {
  let text = null;
  try {
    text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  strzelce-krajenskie: pdftotext failed (${pdfUrl}): ${err.message}`);
  }
  if (text && usable(text)) return text;
  try {
    const ocr = await ocrPdf(pdfUrl, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr && usable(ocr)) return ocr;
  } catch (err) {
    console.error(`  strzelce-krajenskie: OCR fallback failed (${pdfUrl}): ${err.message}`);
  }
  return text || null;
}


export async function crawlActive() {
  const listings = [];
  const land = [];
  const seenDetails = new Set();
  const seenPdfs = new Set();
  let complete = false;
  let allParsed = true;

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    const html = await fetchPage(boardUrl(0, page));
    if (!html) {
      allParsed = false;
      break;
    }
    const rows = parseBoardPage(html);
    if (rows.length === 0) {
      if (page === 1) complete = true;
      break;
    }

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) {
      complete = true;
      break;
    }
    for (const r of fresh) seenDetails.add(r.detailUrl);

    for (const row of fresh) {
      if (!isInScopeRow(row.dotyczyText)) continue;

      const att = pickAnnouncementAttachment(row.attachments);
      let pdfBodyText = null;
      let pdfUrl = null;
      if (att && !seenPdfs.has(att.url)) {
        seenPdfs.add(att.url);
        pdfUrl = att.url;
        pdfBodyText = await extractPdf(att.url, (s) => Boolean(s) && s.length > 80);
        if (!pdfBodyText) {
          console.error(`  strzelce-krajenskie: no usable text for ${att.url} — falling back to row title only`);
        }
      }

      const rec = parseAnnouncement(row, pdfBodyText, pdfUrl);
      if (!rec) {
        allParsed = false;
        continue;
      }
      if (rec.kind === 'grunt') land.push(rec);
      else listings.push(rec);
    }

    if (rows.length < ROWS_PER_PAGE) {
      complete = true;
      break;
    }
  }

  console.error(`  strzelce-krajenskie crawlActive: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
  return {
    listings,
    wykaz: [],
    land,
    valid_empty: complete && allParsed && listings.length === 0,
    valid_empty_land: complete && allParsed && land.length === 0,
  };
}


export async function crawlResultDocs() {
  const refs = [];
  const seenDetails = new Set();
  const seenPdfs = new Set();
  const known = await loadKnownSourceUrls('strzelce-krajenskie');
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  let skippedKnown = 0;

  for (let page = 1; page <= MAX_RESOLVED_PAGES; page++) {
    if (Date.now() > deadline) {
      console.error('  strzelce-krajenskie: result-crawl budget exhausted — stopping early');
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
      const wynikAtt = pickWynikAttachment(row.attachments);
      if (!wynikAtt || seenPdfs.has(wynikAtt.url)) continue;
      seenPdfs.add(wynikAtt.url);
      if (known.has(wynikAtt.url)) {
        skippedKnown++;
        continue;
      }

      const text = await extractPdf(wynikAtt.url, isResultNotice);
      if (!text) {
        console.error(`  strzelce-krajenskie: no usable text for result ${wynikAtt.url} — skipped`);
        continue;
      }
      refs.push({
        text,
        pdf_url: wynikAtt.url,
        detail_url: row.detailUrl,
        auction_date: /^(\d{4}-\d{2}-\d{2})/.exec(row.auctionDateRaw || '')?.[1] || null,
      });
    }

    if (rows.length < ROWS_PER_PAGE) break;
  }

  if (skippedKnown) console.error(`  strzelce-krajenskie: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  strzelce-krajenskie crawlResultDocs: ${refs.length} result ref(s)`);
  return refs;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, land: land.length, sampleListing: listings[0], sampleLand: land[0] }, null, 2) + '\n',
  );
  console.error(`Total: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
}
