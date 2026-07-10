// Międzyrzecz crawler — one board on bip.miedzyrzecz.pl, live-verified
// 2026-07-10:
//
//   /przetargi/0/status/0/   ACTIVE (ogłoszone)      — crawlActive()
//   /przetargi/0/status/1/   RESOLVED (rozstrzygnięte) — crawlResultDocs()
//   /przetargi/0/status/2/   INVALIDATED (unieważnione) — not crawled (see below)
//
// Pagination puts the page number BEFORE the status segment, same shape as
// gorzow-wielkopolski: /przetargi/0/{page}/status/{n}/. Both boards render the
// SAME 7-column HTML table (Lp / Data ogłoszenia / Data i godzina przetargu /
// Dotyczy / Cena wywoławcza / Wynik / Załączniki), 30 rows/page.
//
// UNLIKE Gorzów (whose /przetargi/320/ engine carries announcements only, with
// results on a wholly separate /509/ archive), Międzyrzecz's ONE table is both
// engines at once — a resolved row already states "Cena wywoławcza" and
// "Wynik" (Pozytywny/Negatywny) inline. So:
//   * crawlActive() reads status=0 rows ONLY — status=1 rows are results, not
//     announcements, and must never be double-counted as active listings.
//   * crawlResultDocs() reads status=1 rows and only does an HTTP+OCR/DOCX
//     fetch for POSITIVE (Pozytywny/sold) rows, which are the only rows with
//     an achieved price to recover; a NEGATIVE row's result record is built
//     straight from its own list-row text (see parse.buildNegativeResultText).
//   * status=2 (unieważnione — cancelled auctions, not a sold/unsold outcome)
//     is left uncrawled, matching gorzow-wielkopolski's own convention of
//     excluding "unieważn…" rows from the data entirely.
//
// The board gates the default bot UA (HTTP 403); a browser UA is required —
// confirmed live, same as gorzow-wielkopolski.
//
// Attachments: a row's "wynik" doc is sometimes a born-digital DOCX (older
// listings, e.g. Kursko 28a/1, WGM.6840.31.2016/2021) and sometimes a SCANNED
// PDF with no text layer (recent listings, e.g. Mieszka I 88/5,
// WGM.6840.11.2025/2025 — Canon iR-ADV / RICOH scanner output). DOCX is
// preferred when both exist; PDF falls back to OCR (psm 1 — verified clean on
// a real Międzyrzecz scan; Gorzów's rotated-scan rationale for psm 1 applies
// here defensively even though this scan wasn't visibly rotated).
//
// MTBS (bip.mtbs.miedzyrzecz.pl/przetargi/29/, same CMS/engine, confirmed live
// 2026-07-10) is a secondary flat-seller (Międzyrzeckie TBS) the spike flags
// as a low-volume bonus source. NOT crawled here — out of scope for this
// build; a future agent can add it as a second announcer id on this same
// engine with minimal new code.
//
// See spike: spikes/lubuskie/powiat-miedzyrzecki/miedzyrzecz.md

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
// The BIP 403s the default bot UA (confirmed live); a browser UA is reliable.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Page caps (env-overridable for backfills). Boards hold 30 rows/page; the
// resolved board currently spans 12 pages of history.
const MAX_ACTIVE_PAGES = Number(process.env.MIEDZYRZECZ_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.MIEDZYRZECZ_MAX_RESOLVED_PAGES) || 12;
const ROWS_PER_PAGE = 30;
// Wall-clock budget for the result-document fetch/extract loop (only positive
// rows fetch a document, so this rarely matters, but it's the same safety net
// gorzow-wielkopolski uses for a cold first run).
const CRAWL_BUDGET_MS = Number(process.env.MIEDZYRZECZ_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

// ── HTML helpers ─────────────────────────────────────────────────────────────

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

// ── Board ────────────────────────────────────────────────────────────────────

/** Board URL for a given status (0 active, 1 resolved, 2 invalidated) and 1-based page. */
export function boardUrl(status, page) {
  return page <= 1
    ? `${ORIGIN}/przetargi/0/status/${status}/`
    : `${ORIGIN}/przetargi/0/${page}/status/${status}/`;
}

/**
 * Parse one board page (status=0 or status=1 — same table shape) into row
 * objects. Both "Dotyczy" and "Wynik" cells share the CSS class "td-title-1"
 * (Dotyczy is first, Wynik second) — extracted positionally, not by class
 * alone.
 * @param {string} html
 * @returns {import('./parse.js').BoardRow[]}
 */
export function parseBoardPage(html) {
  const out = [];
  const rowRe = /<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html || '')) !== null) {
    const row = rm[1];

    const d1 = /td-date-1"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);
    const d2 = /td-date-2"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/.exec(row);

    const dotyczyM = /class="td-title-1"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(row);
    if (!dotyczyM) continue; // no detail link — not a real row (defensive)
    const detailUrl = deamp(dotyczyM[1]);
    const dotyczyText = stripTags(dotyczyM[2]);

    const cenaM = /class="td-title-2"[^>]*>([\s\S]*?)<\/td>/.exec(row);
    const cenaText = cenaM ? stripTags(cenaM[1]) : '';

    // Two cells share class "td-title-1": [0] Dotyczy (has the <a>), [1] Wynik.
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

/** Prefer a DOCX "wynik" attachment (born-digital); fall back to its PDF twin. */
function pickWynikAttachment(attachments) {
  const wynikLinks = (attachments || []).filter((a) => /wynik/i.test(a.filename || a.url));
  const docx = wynikLinks.find((a) => /\.docx(?:$|[?&])/i.test(a.filename || a.url));
  if (docx) return docx;
  return wynikLinks.find((a) => /\.pdf(?:$|[?&])/i.test(a.filename || a.url)) || wynikLinks[0] || null;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  miedzyrzecz: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

/**
 * Extract a wynik attachment's text: DOCX (born-digital, preferred) or PDF
 * (pdftotext first, OCR fallback for scans — Międzyrzecz mixes both eras).
 * @param {{url:string, filename:string}} att
 * @returns {Promise<string|null>}
 */
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
    // psm 1 (auto + orientation detection) — verified clean on a real
    // Międzyrzecz scan (informacja o wyniku, Mieszka I 88/5); kept as the
    // default the same defensive way gorzow-wielkopolski does for its own
    // rotated EZD scans.
    const ocr = await ocrPdf(att.url, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr) return ocr;
  } catch (err) {
    console.error(`  miedzyrzecz: OCR fallback failed (${att.url}): ${err.message}`);
  }
  return text || null;
}

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Crawl the ACTIVE board only (status=0). Every field an active listing needs
 * is already inline in the row text, so this makes zero PDF/DOCX/OCR fetches
 * — just the board page(s) themselves.
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
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

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  console.error(`  miedzyrzecz crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Crawl the RESOLVED board (status=1). Negative rows become result refs
 * straight from their own list-row text (no fetch); positive rows fetch the
 * "wynik" attachment (DOCX preferred, PDF+OCR fallback) to recover the
 * achieved price. `source:'html'` (config.js) means refresh.js hands each
 * ref's `.text` straight to parseResultDoc — no re-fetch there.
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
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
      if (!isPositiveOutcome(row.wynikText)) continue; // "Brak wyniku" — shouldn't occur on status=1, skip defensively

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

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  if (skippedKnown) console.error(`  miedzyrzecz: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  miedzyrzecz crawlResultDocs: ${refs.length} result ref(s) (${negativeCount} no-fetch negative)`);
  return refs;
}
