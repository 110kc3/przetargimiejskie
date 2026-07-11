// Wschowa crawler — one board on bip.gminawschowa.pl, live-verified 2026-07-11:
//
//   /przetargi/29/status/0/   ACTIVE (Ogłoszone)        — crawlActive()
//   /przetargi/29/status/1/   RESOLVED (Rozstrzygnięte) — crawlResultDocs()
//   /przetargi/29/status/2/   INVALIDATED (Unieważnione) — not crawled (see below)
//
// Pagination puts the page number BEFORE the status segment, same shape as
// gorzow-wielkopolski/miedzyrzecz (all three are the SystemDoBIP/E-LINE
// engine): /przetargi/29/{page}/status/{n}/. Both boards render the SAME
// 7-column HTML table (Lp / Data ogłoszenia / Data i godzina przetargu /
// Dotyczy / Cena wywoławcza / Wynik / Załączniki), 10 rows/page. Live counts
// at verification time: status=0 → 1 row (1 page); status=1 → 118 rows across
// 12 pages (11 full + an 8-row last page); status=2 → 7 rows (1 page).
//
// SAME ENGINE SHAPE AS MIĘDZYRZECZ (inline-column, NOT Gorzów's batch-PDF-per-
// announcement engine): a row already carries "Cena wywoławcza" + "Wynik"
// (Pozytywny/Negatywny/Brak wyniku) inline, so:
//   * crawlActive() reads status=0 rows ONLY — no document fetch needed, every
//     field an active listing/land record needs is already inline text.
//   * crawlResultDocs() reads status=1 rows and only fetches a document for
//     POSITIVE (Pozytywny/sold) rows; a NEGATIVE row's result record is built
//     straight from its own row text (buildNegativeResultText, parse.js) —
//     zero extra HTTP calls, same convention as miedzyrzecz. A row whose
//     Wynik is "Brak wyniku" (this board genuinely leaves some past-date rows
//     without a recorded outcome — e.g. the live Dworcowa 1/5 row, Lp10,
//     auction date 2025-08-18 — long past, still "Brak wyniku") is skipped
//     quietly: truly unresolved, not an error.
//   * status=2 (Unieważnione — cancelled auctions, not a sold/unsold outcome)
//     is left uncrawled, matching gorzow-wielkopolski/miedzyrzecz's own
//     convention of excluding "unieważnione" from the data entirely.
//
// THE WRINKLE NEITHER ANALOG HAS: a single row's "Cena wywoławcza" cell can
// BUNDLE several lots (flats and/or land parcels) as a newline-separated
// numbered list. cellText() below preserves the cell's real embedded
// newlines (stripTags() collapses them for every other field, which is fine
// — none of Dotyczy/Wynik/dates are ever bundled); parse.js's
// splitNumberedItems() + recordsFromActiveRow() do the actual splitting.
//
// The board gates the default bot UA (HTTP 403, confirmed live); a browser UA
// is required — same as gorzow-wielkopolski/miedzyrzecz.
//
// Wynik attachments: a Pozytywny row's document is sometimes a born-digital
// DOCX (e.g. INFORMACJA_Boczna.docx) and sometimes a born-digital text PDF
// (e.g. INFORMACJA_O_WYNIKACH_PRZETARGU-_Kilinskiego_11.pdf — confirmed
// pdftotext-clean, no OCR needed) — OCR is kept as a defensive fallback only
// (psm 1, same rotated-scan rationale gorzow-wielkopolski/miedzyrzecz use)
// for whichever future scan doesn't have a text layer.
//
// source:'html' (config.js) ⇒ refresh.js hands each crawlResultDocs() ref's
// `.text` straight to parseResultDoc() — no re-fetch there.
//
// See spike: spikes/lubuskie/powiat-wschowski/wschowa.md

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
// The BIP 403s the default bot UA (confirmed live); a browser UA is reliable.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Page caps (env-overridable for backfills). Boards hold 10 rows/page; the
// resolved board is 12 pages today (a little headroom for future growth).
const MAX_ACTIVE_PAGES = Number(process.env.WSCHOWA_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.WSCHOWA_MAX_RESOLVED_PAGES) || 14;
const ROWS_PER_PAGE = 10;
// Wall-clock budget for the result-document fetch/extract loop (only positive
// rows fetch a document, so this rarely matters, but it's the same safety net
// gorzow-wielkopolski/miedzyrzecz use for a cold first run).
const CRAWL_BUDGET_MS = Number(process.env.WSCHOWA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

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

// Preserves the cell's embedded newlines (a bundled "Cena wywoławcza" cell is
// plain text with REAL "\n" between numbered lots — see parse.js's
// splitNumberedItems), unlike stripTags() above which collapses all
// whitespace. Drops the leading label <div> (e.g. "<div>Cena
// wywoławcza</div>"), decodes entities, collapses horizontal whitespace and
// blank-line runs, but keeps single line breaks intact.
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
    ? `${ORIGIN}/przetargi/29/status/${status}/`
    : `${ORIGIN}/przetargi/29/${page}/status/${status}/`;
}

/**
 * Parse one board page (status=0 or status=1 — same table shape) into row
 * objects. Both "Dotyczy" and "Wynik" cells share the CSS class "td-title-1"
 * (Dotyczy is first, Wynik second) — extracted positionally, same as
 * miedzyrzecz.
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
    const cenaText = cenaM ? cellText(cenaM[1]) : '';

    // Two cells share class "td-title-1": [0] Dotyczy (has the <a>), [1]
    // Wynik. Both carry a leading "<div>Dotyczy</div>"/"<div>Wynik</div>"
    // label right in front of the value (confirmed live: the raw cell is
    // "<div>Wynik</div>Negatywny") — dropped here so wynikText is the bare
    // value ("Negatywny"/"Pozytywny"/"Brak wyniku"), not "Wynik Negatywny".
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

/** Prefer a DOCX "wynik"/"informacja" attachment; fall back to its PDF twin. */
function pickResultAttachment(attachments) {
  const candidates = (attachments || []).filter((a) => /informacj|wynik/i.test(a.filename || a.url));
  const docx = candidates.find((a) => /\.docx(?:$|[?&])/i.test(a.filename || a.url));
  if (docx) return docx;
  return candidates[0] || null;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wschowa: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

/**
 * Extract a wynik attachment's text: PDF (pdftotext first, OCR fallback for
 * scans) or DOCX/legacy-DOC (docText() auto-detects OOXML-vs-OLE via magic
 * bytes — see core/doc-text.js).
 * @param {{url:string, filename:string}} att
 * @returns {Promise<string|null>}
 */
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
    // psm 1 (auto + orientation detection) — defensive default, same
    // rationale gorzow-wielkopolski/miedzyrzecz use for their own scans.
    const ocr = await ocrPdf(att.url, { userAgent: BROWSER_UA, psm: 1 });
    if (ocr) return ocr;
  } catch (err) {
    console.error(`  wschowa: OCR fallback failed (${att.url}): ${err.message}`);
  }
  return text || null;
}

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Crawl the ACTIVE board only (status=0). Every field a listing/land record
 * needs is already inline in the row text, so this makes zero PDF/DOCX/OCR
 * fetches — just the board page(s) themselves.
 * @returns {Promise<{ listings: object[], wykaz: [], land: object[] }>}
 */
export async function crawlActive() {
  const listings = [];
  const land = [];
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
      const { listings: l, land: g } = recordsFromActiveRow(row);
      listings.push(...l);
      land.push(...g);
    }

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  console.error(`  wschowa crawlActive: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
  return { listings, wykaz: [], land };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Crawl the RESOLVED board (status=1), flats only (see parse.js file header
 * SCOPE NOTE). Negative rows become result refs straight from their own list-
 * row text (no fetch); positive rows fetch the "wynik"/"informacja"
 * attachment to recover the achieved price; "Brak wyniku" rows are skipped
 * (genuinely unresolved on this board — not an error). `source:'html'`
 * (config.js) means refresh.js hands each ref's `.text` straight to
 * parseResultDoc() — no re-fetch there.
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
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
      if (!/^pozytywny/i.test(wynik)) continue; // "Brak wyniku" — unresolved, skip quietly

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

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  if (skippedKnown) console.error(`  wschowa: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  wschowa crawlResultDocs: ${refs.length} result ref(s) (${negativeCount} no-fetch negative)`);
  return refs;
}

// ── live smoke test (`node crawl.js`) ───────────────────────────────────────

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
