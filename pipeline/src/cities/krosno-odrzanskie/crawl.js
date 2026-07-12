// Krosno Odrzańskie crawler — one board on bip.krosnoodrzanskie.pl, live-
// verified 2026-07-12:
//
//   /przetargi/202/status/0/   ACTIVE (Ogłoszone)        — crawlActive()
//   /przetargi/202/status/1/   RESOLVED (Rozstrzygnięte) — crawlResultDocs()
//   /przetargi/202/status/2/   INVALIDATED (Unieważnione) — not crawled
//
// Pagination puts the page number BEFORE the status segment, same shape as the
// wschowa / strzelce-krajenskie / gorzow / miedzyrzecz siblings (all the
// SYSTEMDOBIP.PL/E-LINE engine): /przetargi/202/{page}/status/{n}/. Both boards
// render the SAME 7-column table (Lp / Data ogłoszenia / Data i godzina
// przetargu / Dotyczy / Cena wywoławcza / Wynik / Załączniki), 10 rows/page.
// Live at verification: status=0 → 1 land row (1 page); status=1 → a deep
// archive (~54 pages) mixing land / commercial / flats — bounded below.
//
// INLINE-COLUMN like WSCHOWA: the row already carries a real "Cena wywoławcza"
// and a populated "Wynik" (Pozytywny/Negatywny/Brak wyniku). The krosno
// difference is that the flat AREA + canonical street live only in the
// born-digital PDF, so:
//   * crawlActive() fetches the ANNOUNCEMENT pdf per flat row (area + canonical
//     address); every field still has a board-row fallback if the fetch fails.
//   * crawlResultDocs() reads status=1, flats only; for a Pozytywny/Negatywny
//     row it fetches the "Informacja o wyniku przetargu" attachment and hands
//     parseResultDoc a composed text (buildResultText) that anchors the kind on
//     the board "Dotyczy" (defeats the real "lokal użytkowy" mislabel — see
//     parse.js). A "Brak wyniku" row is skipped (genuinely unresolved). A
//     negative row with NO wynik attachment (rare) is built from its own row.
//
// The board GATES the default bot UA (HTTP 403, confirmed live); a browser UA
// is required — same as wschowa/gorzow/miedzyrzecz.
//
// The PDF download endpoint (/system/pobierz.php?plik=…&id=…) 301-redirects to
// /system/obj/NNNNN_…pdf; core/fetch.js follows redirects, so pdfText()/ocrPdf()
// resolve it transparently. PDFs are born-digital (pdftotext-clean); OCR is a
// defensive fallback only.
//
// source:'html' (config.js) ⇒ refresh.js hands each crawlResultDocs() ref's
// `.text` straight to parseResultDoc() — no re-fetch there.
//
// See spike: spikes/lubuskie/powiat-krosnienski/krosno-odrzanskie.md

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
// The BIP 403s the default bot UA (confirmed live); a browser UA is reliable.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Page caps (env-overridable for a deeper cold backfill). Boards hold 10
// rows/page. The active board is tiny; the resolved board is a big mixed
// archive, but flats are sparse and document fetches only happen for flat rows,
// so the wall-clock budget is the real guard — the page cap just stops an
// unbounded walk.
const MAX_ACTIVE_PAGES = Number(process.env.KROSNO_ODRZANSKIE_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.KROSNO_ODRZANSKIE_MAX_RESOLVED_PAGES) || 40;
const ROWS_PER_PAGE = 10;
const CRAWL_BUDGET_MS = Number(process.env.KROSNO_ODRZANSKIE_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

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
      /* malformed URL — leave filename blank */
    }
    out.push({ url, filename });
  }
  return out;
}

// ── Board ────────────────────────────────────────────────────────────────────

/** Board URL for a given status (0 active, 1 resolved, 2 invalidated) and 1-based page. */
export function boardUrl(status, page) {
  return page <= 1
    ? `${ORIGIN}/przetargi/202/status/${status}/`
    : `${ORIGIN}/przetargi/202/${page}/status/${status}/`;
}

/**
 * Parse one board page (status=0 or status=1 — same table shape) into row
 * objects. Two cells share class "td-title-1" ([0] Dotyczy with the detail <a>,
 * [1] Wynik), extracted positionally — same shape as wschowa/miedzyrzecz.
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
    if (!dotyczyM) continue; // no detail link — not a real data row
    const detailUrl = deamp(dotyczyM[1]);
    const dotyczyText = stripTags(dotyczyM[2]);

    const cenaM = /class="td-title-2"[^>]*>([\s\S]*?)<\/td>/.exec(row);
    const cenaText = cenaM ? stripTags(cenaM[1].replace(/^\s*<div>[\s\S]*?<\/div>/i, '')) : '';

    // [0] Dotyczy (has the <a>), [1] Wynik — drop each cell's leading
    // "<div>Dotyczy</div>"/"<div>Wynik</div>" label so wynikText is the bare
    // value ("Negatywny"/"Pozytywny"/"Brak wyniku").
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

// ── Attachment picking ───────────────────────────────────────────────────────

const ANN_RE = /ogloszenie|og[łl]oszenie|na_sprzeda|przetarg/i;
const RESULT_RE = /wynik|informacj/i;
// Floor plans, maps, forms, photos — never the announcement/result body.
const NOISE_RE = /map|rzut|formularz|zg[łl]oszen|\.jpe?g|\.png|\.gif|piwnic/i;

const isPdf = (a) => /\.pdf(?:$|[?&])/i.test(a.filename || a.url);

/** The announcement-scan attachment for a flat row (area + canonical address). */
function pickAnnouncementAttachment(attachments) {
  const pdfs = (attachments || []).filter((a) => isPdf(a) && !NOISE_RE.test(a.filename || a.url));
  return pdfs.find((a) => !RESULT_RE.test(a.filename || a.url) && ANN_RE.test(a.filename || a.url)) || null;
}

/** The "Informacja o wyniku przetargu" attachment for a resolved row. */
function pickResultAttachment(attachments) {
  const pdfs = (attachments || []).filter((a) => isPdf(a) && !NOISE_RE.test(a.filename || a.url));
  return pdfs.find((a) => RESULT_RE.test(a.filename || a.url)) || null;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  krosno-odrzanskie: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

const hasText = (t) => (t || '').replace(/[\s\f]/g, '').length > 20;

/**
 * Extract a PDF's text: pdftotext first (born-digital), OCR fallback for a
 * would-be scan (empty/garbage pdftotext). `expectResult` gates the OCR
 * fallback on a result-signal for wynik docs, mirroring the sibling adapters.
 * @param {{url:string, filename:string}} att
 * @param {boolean} [expectResult]
 * @returns {Promise<string|null>}
 */
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

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Crawl the ACTIVE board (status=0), flats only. Fetches the announcement PDF
 * per flat row for the area + canonical address (board-row fallback on failure).
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
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

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  console.error(`  krosno-odrzanskie crawlActive: ${listings.length} flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Crawl the RESOLVED board (status=1), flats only. Negative/positive rows fetch
 * the "Informacja o wyniku" attachment; a negative row with no attachment is
 * built from its own row; "Brak wyniku" rows are skipped (unresolved). Each ref
 * carries the composed text refresh.js hands to parseResultDoc().
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
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
        continue; // unresolved / unknown outcome — skip quietly
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
        // No wynik document (rare) — build the negative result from the row.
        refs.push({
          text: buildNegativeResultText(row),
          pdf_url: row.detailUrl,
          detail_url: row.detailUrl,
          auction_date: dateOnly(row.auctionDateRaw),
        });
      } // positive with no attachment: can't recover achieved price — skip
    }

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  if (skippedKnown) console.error(`  krosno-odrzanskie: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  krosno-odrzanskie crawlResultDocs: ${refs.length} result ref(s)`);
  return refs;
}

// ── live smoke test (`node crawl.js`) ───────────────────────────────────────

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
