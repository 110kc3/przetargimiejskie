// Strzelce Krajeńskie crawler — one board on bip.strzelce.pl (SYSTEMDOBIP.PL /
// E-LINE, same engine as gorzow-wielkopolski and miedzyrzecz), live-verified
// 2026-07-11:
//
//   /przetargi/29/status/0/   ACTIVE (ogłoszone)        — crawlActive()
//   /przetargi/29/status/1/   RESOLVED (rozstrzygnięte) — crawlResultDocs()
//   /przetargi/29/status/2/   INVALIDATED (unieważnione) — not crawled
//
// Board SHAPE matches miedzyrzecz exactly: the SAME 7-column table (Lp / Data
// ogłoszenia / Data i godzina przetargu / Dotyczy / Cena wywoławcza / Wynik /
// Załączniki), same td-date-1/td-date-2/td-title-1(x2)/td-title-2/
// td-attachments-1 classes, same page-number-before-status pagination
// (/przetargi/29/{page}/status/{n}/). BUT the CONTENT behaves like
// gorzow-wielkopolski, not miedzyrzecz:
//
//   * "Cena wywoławcza" is almost always the placeholder "informacja w
//     załączniku" — real numbers live in the attached announcement PDF (one
//     bare inline exception observed live: an older Długie row, GPM-28/2025,
//     "125.000,00zł" — parse.js's startingPriceFromText tries the row's own
//     cenaText too, so that path still works when it happens).
//   * "Wynik" is UNIFORMLY "Brak wyniku" on EVERY row ever observed —
//     verified across the active board + 5 pages of the resolved archive
//     (2026-07-11), including a flat that failed FOUR consecutive rounds
//     (ul. Ludowej 9/4, GPM-30/2024→GPM-18/2025 rokowania) and never got a
//     populated Wynik cell or a "wynik"-named attachment. This confirms the
//     spike's "weak/absent achieved-price stream" call.
//
// Consequently:
//   * crawlActive() reads status=0 rows, gates each on isInScopeRow() (kind
//     mieszkalny/grunt via the shared classifyKind — see parse.js's bug note
//     on Ogardy 52's "lokal niemieszkalny" — minus dzierżawa/najem/rokowania)
//     BEFORE fetching anything, then fetches+parses ONE PDF per surviving row
//     (the announcement — price/area/wadium usually live only there). This is
//     a fetch per LISTING (like gorzow's batch PDFs), not per FLAT — but
//     unlike Gorzów's batch PDFs (many flats in one document), every Strzelce
//     announcement observed live describes exactly one property.
//   * crawlResultDocs() can't trust the inline "Wynik" cell (see above) so it
//     detects a result document by ATTACHMENT FILENAME instead: any
//     attachment whose filename contains "wynik" (case-insensitive; verified
//     live: "GPM_wynik_przetargu_Wielislawice.pdf", "Wynik_przetarg.pdf",
//     "informacja_o_wyniku.pdf" — the latter two both belong to a movable-
//     property sale [kamień brukowcowy], correctly filtered out downstream by
//     parseResultDoc's own kind gate, same as Wielisławice's 'zabudowana'
//     school building). Casts a wide net on the resolved board; parseResultDoc
//     decides in-scope-or-not from the document's own text.
//
// See spike: spikes/lubuskie/powiat-strzelecko-drezdenecki/strzelce-krajenskie.md

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { parseAnnouncement, isInScopeRow, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.strzelce.pl';
// SYSTEMDOBIP.PL boards on this same voivodeship (gorzow-wielkopolski,
// miedzyrzecz) both gate the default bot UA — a browser UA is reliable.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Page caps (env-overridable for backfills). Boards hold 10 rows/page; live
// volume is low (spike: "a handful of property auctions/year"), so these caps
// are generous headroom, not a real constraint.
const MAX_ACTIVE_PAGES = Number(process.env.STRZELCE_KRAJENSKIE_MAX_ACTIVE_PAGES) || 3;
const MAX_RESOLVED_PAGES = Number(process.env.STRZELCE_KRAJENSKIE_MAX_RESOLVED_PAGES) || 10;
const ROWS_PER_PAGE = 10;
const CRAWL_BUDGET_MS = Number(process.env.STRZELCE_KRAJENSKIE_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

// ── HTML helpers (same shape as miedzyrzecz's own board parser) ────────────

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
    ? `${ORIGIN}/przetargi/29/status/${status}/`
    : `${ORIGIN}/przetargi/29/${page}/status/${status}/`;
}

/**
 * Parse one board page (status=0 or status=1 — same table shape) into row
 * objects. Both "Dotyczy" and "Wynik" cells share the CSS class "td-title-1"
 * (Dotyczy first, Wynik second) — extracted positionally, matching
 * miedzyrzecz's own parser for this identical markup.
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

/** The main announcement PDF for a row: the first attachment that isn't a
 *  generic bid-submission form / lease-contract template ("Wzor_zgloszenia",
 *  "umowa_dzierzawy" — verified live filenames). */
function pickAnnouncementAttachment(attachments) {
  return (
    (attachments || []).find(
      (a) => /\.pdf(?:$|[?&])/i.test(a.filename || a.url) && !/wzor|zgloszenia|umow[ay]/i.test(a.filename || a.url),
    ) || null
  );
}

/** Any attachment whose filename flags it as a result notice (see file header
 *  — the inline "Wynik" cell is never populated, so this is the only signal). */
function pickWynikAttachment(attachments) {
  return (attachments || []).find((a) => /wynik/i.test(a.filename || a.url)) || null;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    return await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  strzelce-krajenskie: page fetch failed (${url}): ${err.message}`);
    return null;
  }
}

/**
 * Extract a PDF's text: pdftotext first, OCR fallback (psm 1 — same
 * defensive default gorzow-wielkopolski/miedzyrzecz use for their own
 * rotated/scanned documents; no scan has been observed live here yet, every
 * fixture fetched 2026-07-11 was born-digital, but the fallback costs nothing
 * when unused).
 * @param {string} pdfUrl
 * @param {(text:string) => boolean} usable
 * @returns {Promise<string|null>}
 */
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

// ── crawlActive ──────────────────────────────────────────────────────────────

/**
 * Crawl the ACTIVE board (status=0). Rows are gated by isInScopeRow() (kind +
 * lease/rokowania exclusion) on the row title BEFORE any fetch; each
 * surviving row's announcement PDF is then fetched once (price/area usually
 * only live there — see file header) and handed to parseAnnouncement().
 * @returns {Promise<{ listings: object[], wykaz: [], land: object[] }>}
 */
export async function crawlActive() {
  const listings = [];
  const land = [];
  const seenDetails = new Set();
  const seenPdfs = new Set();

  for (let page = 1; page <= MAX_ACTIVE_PAGES; page++) {
    const html = await fetchPage(boardUrl(0, page));
    if (!html) break;
    const rows = parseBoardPage(html);
    if (rows.length === 0) break;

    const fresh = rows.filter((r) => r.detailUrl && !seenDetails.has(r.detailUrl));
    if (fresh.length === 0) break;
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
      if (!rec) continue;
      if (rec.kind === 'grunt') land.push(rec);
      else listings.push(rec);
    }

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  console.error(`  strzelce-krajenskie crawlActive: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
  return { listings, wykaz: [], land };
}

// ── crawlResultDocs ──────────────────────────────────────────────────────────

/**
 * Crawl the RESOLVED board (status=1). The inline "Wynik" cell is never
 * populated (see file header) so a result document is detected by attachment
 * FILENAME instead ("wynik" substring) — cast a wide net here; parseResultDoc
 * applies its own kind gate (mieszkalny/grunt only) and returns [] for
 * anything else (a real live example: Wielisławice's wynik doc, a
 * 'zabudowana' school building — correctly excluded downstream, not here).
 * @returns {Promise<Array<{text:string, pdf_url:string, detail_url:string, auction_date:string|null}>>}
 */
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

    if (rows.length < ROWS_PER_PAGE) break; // short page = last page
  }

  if (skippedKnown) console.error(`  strzelce-krajenskie: skipped ${skippedKnown} already-known result doc(s)`);
  console.error(`  strzelce-krajenskie crawlResultDocs: ${refs.length} result ref(s)`);
  return refs;
}

// ── CLI smoke test ───────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  process.stdout.write(
    JSON.stringify({ listings: listings.length, land: land.length, sampleListing: listings[0], sampleLand: land[0] }, null, 2) + '\n',
  );
  console.error(`Total: ${listings.length} flat listing(s), ${land.length} land parcel(s)`);
}
