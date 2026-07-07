// Zabrze crawler — the city BIP's "Lokale mieszkalne" sale board.
//
//   LIST (JSON API):  https://bip.miastozabrze.pl/api/v1/document-list/549?q=
//   DOC (HTML):       https://bip.miastozabrze.pl/doc/<id>        (one per announcement)
//   FILE:             https://bip.miastozabrze.pl/attachment/<id> (the per-flat table)
//
// The board page (`…/zabrze_pns_mieszkalne`) is a Vue SPA — its served HTML is a
// shell with no announcements; the Vue app loads them from the JSON API
// `/api/v1/document-list/<categoryId>` (categoryId 549 = "Lokale mieszkalne").
// The API returns ALL items in one call (no pagination): { data: [ { doc_id,
// dscrpt (title), pubdat, … }, … ] }. The title carries the round ("I/II
// ustnych …") and the auction date ("na dzień DD.MM.YYYY r.").
//
// Each announcement's /doc/<id> page IS server-rendered (real HTML, carries the
// title + the /attachment/<id> link). The per-flat rows (address / area /
// starting price) live in that single attachment, which we extract per /doc.
//
// Zabrze is an ACTIVE-listings adapter (like Bytom): each flat becomes an active
// listing carrying the announcement's round + auction date + the /doc page as
// detail_url. crawlResultDocs() is []. The popup's past-date filter hides
// already-held auctions; the archive keeps them.
//
// ⚠️ Unverified pending the first CI run: the attachment is assumed a text PDF
// (pdfText/pdftotext) — see config.js. If it's scanned/DOC, swap the extractor.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import {
  parseAnnouncementText,
  roundFromTitle,
  auctionDateFromTitle,
  auctionDateFromText,
} from './parse.js';

const ORIGIN = 'https://bip.miastozabrze.pl';
// "Lokale mieszkalne" category id, taken from the SPA's API call. Stable per
// category. (The human-facing board is /zabrze/nieruch/um_pnn/zabrze_pn_sprzedaz/zabrze_pns_mieszkalne.)
const LIST_CATEGORY_ID = 549;
const LIST_API = `${ORIGIN}/api/v1/document-list/${LIST_CATEGORY_ID}?q=`;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
// bip.miastozabrze.pl ships an incomplete TLS chain (missing intermediate) —
// Node's fetch fails UNABLE_TO_VERIFY_LEAF_SIGNATURE where browsers succeed. We
// relax chain verification for this host only (public, read-only data). See the
// long note + secure alternative in core/fetch.js.
const FETCH_OPTS = { userAgent: BROWSER_UA, insecureTLS: true };

/**
 * Map the document-list API payload to announcement refs.
 * @param {object} json  parsed { data: [ { doc_id, dscrpt, pubdat } ] }
 * @returns {Array<{doc_url:string, title:string, round:number|null, auction_date:string|null, published_date:string|null}>}
 */
export function parseDocumentList(json) {
  const items = json?.data;
  if (!Array.isArray(items)) return [];
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const id = it?.doc_id;
    const title = it?.dscrpt || '';
    if (!id || seen.has(id)) continue;
    if (!/przetarg|sprzeda|ogłoszenie/i.test(title)) continue;
    seen.add(id);
    out.push({
      doc_url: `${ORIGIN}/doc/${id}`,
      title,
      round: roundFromTitle(title),
      auction_date: auctionDateFromTitle(title),
      published_date: (it?.pubdat || '').slice(0, 10) || null,
    });
  }
  return out;
}

/**
 * Extract the first attachment URL from an announcement /doc page. The /doc
 * HTML is server-rendered and links the attachment as an ABSOLUTE url
 * (href="https://bip.miastozabrze.pl/attachment/<id>"). We match ANY
 * /attachment/<id> reference (with or without an href=, absolute or relative,
 * any quote style) and normalise to absolute — maximally lenient.
 */
export function attachmentUrlFromDoc(html) {
  const m = /((?:https?:\/\/[^"'\s]*?)?\/attachment\/\d+)/i.exec(html);
  if (!m) return null;
  return m[1].startsWith('http') ? m[1] : ORIGIN + m[1];
}

/** Fetch + parse the document-list JSON API (all announcements, one call). */
async function crawlAnnouncements() {
  let json;
  try {
    json = JSON.parse(await getText(LIST_API, FETCH_OPTS));
  } catch (err) {
    console.error(`  zabrze document-list API failed: ${err.message}`);
    return [];
  }
  const anns = parseDocumentList(json);
  console.error(`  zabrze document-list: ${anns.length} announcements`);
  return anns;
}

// ONE pass over the board serves both streams: each /doc's attachment is
// either a sale ANNOUNCEMENT (per-flat active rows) or a published RESULT
// notice ("INFORMACJA O WYNIKU PRZETARGÓW" — Zabrze's achieved-price data,
// parsed by parse.js parseResultDoc). refresh.js calls crawlResultDocs()
// first, then crawlActive() — both await the same memoised crawl, so the
// ~100 throttled doc+attachment fetches happen exactly once per run.
let crawlPromise = null;

async function crawlAll() {
  const announcements = await crawlAnnouncements();
  const listings = [];
  const resultRefs = [];
  for (const ann of announcements) {
    let docHtml;
    try {
      docHtml = await getText(ann.doc_url, FETCH_OPTS);
    } catch (err) {
      console.error(`  zabrze doc fetch failed ${ann.doc_url}: ${err.message}`);
      continue;
    }
    const attUrl = attachmentUrlFromDoc(docHtml);
    if (!attUrl) {
      // Diagnostic (v2): print response size + whether the word "attachment"
      // appears at all. Large + has-attachment ⇒ regex issue; small + none ⇒
      // node received a shell (server serves SSR only to real browsers).
      const hasWord = /attachment/i.test(docHtml);
      console.error(
        `  zabrze: no attachment on ${ann.doc_url} [docLen=${docHtml.length} hasAttachmentWord=${hasWord}]`,
      );
      continue;
    }
    let text = '';
    try {
      // Most attachments are text PDFs (pdftotext). A few older ones are legacy
      // Word .doc — pdfText rejects those cleanly (magic-byte check), so we fall
      // back to catdoc. Either failing just skips this one announcement.
      text = await pdfText(attUrl, FETCH_OPTS);
    } catch (err) {
      try {
        text = await docText(attUrl, FETCH_OPTS);
      } catch (err2) {
        console.error(`  zabrze attachment extract failed ${attUrl}: ${err.message}`);
        continue;
      }
    }
    // Published RESULT notice → the achieved-price stream. The refresh loop
    // hands ref.text to parseResultDoc (source 'html' skips OCR dispatch).
    if (/INFORMACJA\s+O\s+WYNIKU/i.test(text)) {
      resultRefs.push({ text, pdf_url: attUrl, auction_date: null });
      continue;
    }

    const flats = parseAnnouncementText(text);
    if (flats.length === 0) {
      console.error(`  zabrze WARN: 0 flats parsed from ${attUrl} (${ann.title})`);
    }
    // The title often omits the auction date; the body ("Przetargi odbędą się
    // w dniu …") almost always has it. Title first, body as fallback.
    const auctionDate = ann.auction_date || auctionDateFromText(text);
    for (const f of flats) {
      listings.push({
        kind: f.kind,
        address_raw: f.address_raw,
        address: f.address,
        auction_date: auctionDate,
        round: ann.round,
        area_m2: f.area_m2,
        starting_price_pln: f.starting_price_pln,
        detail_url: ann.doc_url,
      });
    }
  }
  console.error(
    `  zabrze: ${listings.length} flats from ${announcements.length} announcements, ${resultRefs.length} result notices`,
  );
  return { listings, wykaz: [], resultRefs };
}

/** Result notices (achieved prices) found on the board — see crawlAll(). */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, wykaz } = await crawlPromise;
  return { listings, wykaz };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
