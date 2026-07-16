// Grudziądz crawler — city BIP "Sprzedaż nieruchomości" board.
//
//   Board:  https://bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci
//   Detail: https://bip.grudziadz.pl/artykul/<slug>
//
// DISCOVERY (LIVE-VERIFIED 2026-07-16 — corrects the spike's pagination call):
//   The board renders a plain `<table class="lista_artykuly">` wired to
//   DataTables with `"paging": true, "iDisplayLength": 25` for the in-browser
//   UI, but WITHOUT `"serverSide": true` / an `"ajax"` option — every row is
//   already present in the server-rendered HTML on a single GET (~620 rows,
//   back to 2008, confirmed against the spike's "614 entries" count). No
//   `?strona=N` param, no API, no headless Chromium: one fetch harvests the
//   WHOLE archive. (The spike's "JS-controlled pagination … browser automation
//   required" note was based on the client-side paging CONTROLS, not on how
//   the data actually gets there.)
//
// ROUTING (by row title, since the board mixes announcements, results,
// cancellations and unrelated pre-auction "kwalifikacja" eligibility notices):
//   - kind = mieszkalny (classifyKind on the title) AND not cancelled AND not a
//     result notice → active announcement (crawlActive).
//   - title matches "przeprowadzon… przetarg…" (e.g. "INFORMACJA Z
//     PRZEPROWADZONYCH PRZETARGÓW NA SPRZEDAŻ …") → result notice
//     (crawlResultDocs). NOTE: this is DISTINCT from the much more common
//     "Informacja z przeprowadzonej KWALIFIKACJI do uczestnictwa …" rows
//     (pre-auction bidder-eligibility notices for RESTRICTED auctions — no
//     price data, not a result) — the regex requires "przeprowadzon…" to be
//     immediately followed by "przetarg…", which the kwalifikacja wording
//     never is (it's followed by "kwalifikacji"). Across the FULL live board
//     (~620 rows, 2008–2026) exactly ONE row matched the result pattern
//     (2024-09-18, ul. Libelta 10/4 — a negative/unsold outcome); the
//     achieved-price stream is real but extremely thin.
//   - title matches "odwołuj…"/"unieważni…" → cancelled, skipped entirely.
//
// ATTACHMENTS: every detail page's `<a class="download" href="/pliki/…">`
// (one per page in all fixtures seen) is either a born-digital `.doc`
// announcement (→ core/doc-text.js, catdoc) or a SCANNED `.pdf` result notice
// (pdftotext on the one real result fixture returned a single `\f` byte — the
// scanned-PDF gotcha from CLAUDE.md — so results go through core/ocr-pdf.js,
// never core/pdf-text.js).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { docText } from '../../core/doc-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAnnouncement, parseResultDoc } from './parse.js';

const ORIGIN = 'https://bip.grudziadz.pl';
const BOARD_URL = `${ORIGIN}/artykul/sprzedaz-nieruchomosci`;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse the board's `<table class="lista_artykuly">` into row objects. Every
 * row is already in the HTML (see file header) — no pagination to walk.
 * NOTE: the site leaves the row's `<a href="…">` anchor UNCLOSED (no `</a>`
 * before `</td>`) — real, LIVE-VERIFIED markup, not a fetch artefact.
 * @param {string} html
 * @returns {Array<{ detailUrl:string, title:string, publishedDate:string|null }>}
 */
export function parseBoardTable(html) {
  const anchor = html.indexOf('lista_artykuly');
  if (anchor < 0) return [];
  const tbStart = html.indexOf('<tbody>', anchor);
  const tbEnd = html.indexOf('</tbody>', tbStart);
  if (tbStart < 0 || tbEnd < 0) return [];
  const tbody = html.slice(tbStart, tbEnd);

  const out = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(tbody)) !== null) {
    const rowM = /<td><a href="([^"]+)">([\s\S]*?)<\/td>\s*<td>([^<]*)<\/td>/.exec(m[1]);
    if (!rowM) continue;
    const href = rowM[1].replace(/&amp;/gi, '&');
    out.push({
      detailUrl: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      title: stripTags(rowM[2]),
      publishedDate: (rowM[3] || '').trim().slice(0, 10) || null,
    });
  }
  return out;
}

/** First `.doc`/`.docx`/`.pdf` download link on a detail page, or null. */
export function attachmentUrlFromDetail(html) {
  const m = /<a href="([^"]+\.(?:docx?|pdf))"\s+class="download"/i.exec(html || '');
  if (!m) return null;
  const href = m[1].replace(/&amp;/gi, '&');
  return href.startsWith('http') ? href : `${ORIGIN}${href}`;
}

export function isCancelled(title) {
  return /odwo[łl]uj|uniewa[żz]ni/i.test(title || '');
}

// See file header: "przeprowadzon…" immediately followed by "przetarg…" only
// matches an actual result-of-a-concluded-auction notice, never the far more
// common pre-auction "kwalifikacji" eligibility notices.
export function isResultNotice(title) {
  return /przeprowadzon\w*\s+przetarg/i.test(title || '');
}

async function fetchAttachmentText(url) {
  return /\.pdf(\?|$)/i.test(url)
    ? await ocrPdf(url, FETCH_OPTS)
    : await docText(url, FETCH_OPTS);
}

// ---- crawlActive ------------------------------------------------------------

/**
 * @returns {Promise<{ listings: object[], wykaz: [], land: [] }>}
 */
export async function crawlActive() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  const rows = parseBoardTable(html);
  console.error(`  grudziadz board: ${rows.length} row(s)`);

  const listings = [];
  for (const row of rows) {
    if (isResultNotice(row.title)) continue;
    if (isCancelled(row.title)) continue;
    if (classifyKind(row.title) !== 'mieszkalny') continue;

    let detailHtml;
    try {
      detailHtml = await getText(row.detailUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  grudziadz: detail fetch failed (${row.detailUrl}): ${err.message}`);
      continue;
    }
    const attUrl = attachmentUrlFromDetail(detailHtml);
    if (!attUrl) {
      console.error(`  grudziadz: no attachment on ${row.detailUrl}`);
      continue;
    }

    let text;
    try {
      text = await fetchAttachmentText(attUrl);
    } catch (err) {
      console.error(`  grudziadz: attachment fetch/convert failed (${attUrl}): ${err.message}`);
      continue;
    }

    const lots = parseAnnouncement(text);
    if (lots.length === 0) {
      console.error(`  grudziadz: 0 lots parsed from ${attUrl} (${row.title.slice(0, 80)})`);
      continue;
    }
    for (const lot of lots) {
      listings.push({
        kind: 'mieszkalny',
        address_raw: lot.address_raw,
        address: lot.address,
        auction_date: lot.auction_date,
        published_date: row.publishedDate,
        round: lot.round,
        area_m2: lot.area_m2,
        starting_price_pln: lot.starting_price_pln,
        detail_url: row.detailUrl,
        doc_url: attUrl,
      });
    }
  }
  console.error(`  grudziadz active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---- crawlResultDocs --------------------------------------------------------

/**
 * @returns {Promise<Array<{ text:string, pdf_url:string, auction_date:string|null, detail_url:string }>>}
 */
export async function crawlResultDocs() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  const rows = parseBoardTable(html);

  const refs = [];
  for (const row of rows) {
    if (!isResultNotice(row.title)) continue;

    let detailHtml;
    try {
      detailHtml = await getText(row.detailUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  grudziadz result: detail fetch failed (${row.detailUrl}): ${err.message}`);
      continue;
    }
    const attUrl = attachmentUrlFromDetail(detailHtml);
    if (!attUrl) {
      console.error(`  grudziadz result: no attachment on ${row.detailUrl}`);
      continue;
    }

    let text;
    try {
      text = await fetchAttachmentText(attUrl);
    } catch (err) {
      console.error(`  grudziadz result: attachment fetch/convert failed (${attUrl}): ${err.message}`);
      continue;
    }

    refs.push({
      text,
      pdf_url: attUrl,
      auction_date: null, // parseResultDoc re-extracts from the body text
      detail_url: row.detailUrl,
    });
  }
  console.error(`  grudziadz crawlResultDocs: ${refs.length} result doc(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(
      JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n',
    );
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
