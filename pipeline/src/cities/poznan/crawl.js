// Poznań crawler — bip.poznan.pl WGN board. LIVE-VERIFIED 2026-07-16.
//
// Uses the department's JSON API (works fine with a browser UA + the default
// browser-mode Accept header politeGet already sends — the spike's earlier
// probe returned empty because it lacked a browser UA):
//   https://bip.poznan.pl/api-json/bip/wydzial-gospodarki-nieruchomosciami,24/news/
// Each item gives nw_title/nw_text (board teaser HTML, real address/parcel/
// area/date but NO price) + id/or_id, from which a stable "print" detail URL
// is constructed (`news.html?co=print&id=<id>&or_id=<or_id>`) — LIVE-VERIFIED
// to render the same "Treść" + "Załączniki" (PDF attachment list) as the
// friendly slug URL, without needing to reproduce the CMS's slugification.
// The starting price lives in the "pełna treść ogłoszenia" PDF attachment
// (born-digital — confirmed live on a real 275KB PDF, no OCR needed).
//
// Results ("wyniki przetargów") use the SAME JSON API mechanism against the
// sitewide category 8800: https://bip.poznan.pl/api-json/bip/news/-,c,8800/
// — a real, confirmed, recurring category (Wayback: ~15 notices 2020-2026)
// that happened to be EMPTY at build time (items are purged from the live
// CMS ~1-3 weeks after posting). See config.js header for the full note.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { htmlToText, parseAnnouncementNotice, parseResultDoc } from './parse.js';

const ORIGIN = 'https://bip.poznan.pl';
const DEPT_NEWS_JSON = `${ORIGIN}/api-json/bip/wydzial-gospodarki-nieruchomosciami,24/news/`;
const RESULTS_CATEGORY_JSON = `${ORIGIN}/api-json/bip/news/-,c,8800/`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

// The department board is thin (single digits of items, per the spike + this
// build's live check) and the CMS purges expired items outright (404), so
// there is no deep archive to page into — one JSON call covers the live set.
function itemsFromApiJson(json) {
  const data = json?.['bip.poznan.pl']?.data?.[0];
  if (!data) return [];
  const key = Object.keys(data)[0];
  const wrap = key ? data[key] : null;
  if (!wrap || !Array.isArray(wrap.items) || !wrap.items.length) return [];
  const first = wrap.items[0];
  if (!first || typeof first !== 'object') return []; // empty category -> items:[""]
  return Array.isArray(first.komunikat_ogloszenie) ? first.komunikat_ogloszenie : [];
}

async function fetchApiItems(url, label) {
  let raw;
  try {
    raw = await getText(url, FETCH_OPTS);
  } catch (err) {
    console.error(`  poznan ${label} fetch failed (${url}): ${err.message}`);
    return [];
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`  poznan ${label} JSON parse failed (${url}): ${err.message}`);
    return [];
  }
  return itemsFromApiJson(json);
}

function printUrl(item) {
  return `${ORIGIN}/bip/news.html?co=print&id=${item.id}&instance=${item.instance || 1056}&lang=pl&parent=0&category=null&or_id=${item.or_id ?? ''}`;
}

// Scoped to the "Załączniki" section (stops at the next <h3>) so a link from
// the unrelated "Komunikat w dziale" list below it can never be picked up.
// Prefers the attachment labelled "ogłoszenie" (the full notice); falls back
// to the first attachment found (e.g. when the label wording drifts) rather
// than skipping the notice's price entirely.
function extractAttachmentPdfUrl(detailHtml) {
  const m = /Za[łl][ąa]czniki[\s\S]*?<\/h3>([\s\S]*?)(?:<h3|$)/i.exec(detailHtml || '');
  const section = m ? m[1] : '';
  const items = section.split(/<li[^>]*>/i).slice(1).map((chunk) => chunk.split(/<\/li>/i)[0]);
  let fallback = null;
  for (const chunk of items) {
    const hrefM = /href="([^"]*attachments\.att[^"]*)"/i.exec(chunk);
    if (!hrefM) continue;
    const href = hrefM[1].replace(/&amp;/g, '&');
    const url = href.startsWith('http') ? href : ORIGIN + href;
    if (!fallback) fallback = url;
    if (/ogłosz/i.test(htmlToText(chunk))) return url;
  }
  return fallback;
}

async function fetchOgloszeniePdfText(detailUrl) {
  let html;
  try {
    html = await getText(detailUrl, FETCH_OPTS);
  } catch (err) {
    console.error(`  poznan detail fetch failed (${detailUrl}): ${err.message}`);
    return '';
  }
  const pdfUrl = extractAttachmentPdfUrl(html);
  if (!pdfUrl) return '';
  try {
    return await pdfText(pdfUrl, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  poznan pdf-text failed (${pdfUrl}): ${err.message}`);
    return '';
  }
}

export async function crawlActive() {
  const items = await fetchApiItems(DEPT_NEWS_JSON, 'dept-24-board');
  const listings = [];
  const land = [];
  let skipped = 0;

  for (const item of items) {
    const teaser = htmlToText(item.nw_text || '');
    const titleAndTeaser = `${item.nw_title || ''}\n${teaser}`;
    if (!/og[łl]asza[\s\S]{0,80}?przetarg/i.test(titleAndTeaser)) { skipped++; continue; }

    const detailUrl = printUrl(item);
    const pdf = await fetchOgloszeniePdfText(detailUrl);
    let rec;
    try {
      rec = parseAnnouncementNotice(teaser, pdf, { url: detailUrl, detailUrl });
    } catch (err) {
      console.error(`  poznan parse failed (${detailUrl}): ${err.message}`);
      continue;
    }
    if (!rec) {
      console.error(`  poznan WARN: unkeyable/non-auction notice ${detailUrl} (${(item.nw_title || '').slice(0, 70)})`);
      continue;
    }
    if (rec.kind === 'grunt') land.push(rec);
    else listings.push(rec);
  }

  console.error(
    `  poznan active: ${listings.length} flat/built listing(s), ${land.length} land plot(s) (${skipped} non-auction notice(s) skipped)`,
  );
  return { listings, wykaz: [], land };
}

export async function crawlResultDocs() {
  const items = await fetchApiItems(RESULTS_CATEGORY_JSON, 'results-8800');
  const refs = [];
  for (const item of items) {
    const teaser = htmlToText(item.nw_text || '');
    const detailUrl = printUrl(item);
    const pdf = await fetchOgloszeniePdfText(detailUrl);
    refs.push({ text: `${teaser}\n${pdf}`, pdf_url: detailUrl, detail_url: detailUrl, auction_date: null });
  }
  console.error(`  poznan results (category 8800): ${refs.length} result notice(s)`);
  return refs;
}

export { parseResultDoc };
