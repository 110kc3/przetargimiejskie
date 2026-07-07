// Ostrołęka crawler — the city BIP's single "przetargi nieruchomości" board
// (Logonet CMS, server-rendered HTML, no auth/bot block). One memoised pass:
//
//   LIST:    /przetargi-nieruchomosci/<page>/10   (12 pages × 10, ~119 rows)
//   DETAIL:  /przetarg-nieruchomosci/<id>/<slug>  (metadata table + attachments)
//   FILE:    /attachments/download/<attId>         (scanned announcement/result PDF)
//
// We enumerate the listing, keep only `Rodzaj nieruchomości = lokal mieszkalny`,
// then fetch each flat's detail page. Each detail carries an announcement PDF and
// (once concluded) a result PDF:
//   - result attachment present ⇒ the achieved-price stream. Emit a result ref
//     {pdf_url, auction_date}; refresh.js OCRs it (source:'pdf') and hands the
//     text to parseResultDoc. This is the authoritative per-flat record.
//   - no result yet ⇒ a currently-open (or recently-closed) auction. Emit an
//     active listing from the HTML metadata (+ announcement OCR for round/area).
//     Below the history floor (year < MIN_YEAR) we skip these — they're old
//     concluded auctions whose result was never posted (pre-2020 noise), and the
//     city re-spelled the same street over the years (fragmentation risk).
//
// refresh.js calls crawlResultDocs() then crawlActive(); both await the SAME
// memoised crawl, so each page/detail is fetched (and each announcement OCR'd)
// exactly once per run.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  parseMetaTable,
  parseAttachments,
  isResultAttachment,
  isAnnouncementAttachment,
  buildActiveListing,
} from './parse.js';

const ORIGIN = 'https://bip.um.ostroleka.pl';
const MAX_PAGES = 15; // 12 today; a small margin for growth (bounded loop)
// Announcement-only flats older than this are skipped (see file header). The
// result stream carries everything for concluded flats worth keeping.
const MIN_YEAR = 2020;

const listUrl = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/10`;
const detailUrl = (id, slug) => `${ORIGIN}/przetarg-nieruchomosci/${id}/${slug}`;

/** Enumerate the listing, returning the flat (`lokal mieszkalny`) detail refs. */
async function listFlatDetails() {
  const seen = new Set();
  const flats = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    let html;
    try {
      html = await getText(listUrl(p));
    } catch (err) {
      console.error(`  ostroleka: listing page ${p} failed (${err.message})`);
      break;
    }
    // Each auction is one `table table-borderless` card.
    const cards = html.split('table table-borderless').slice(1);
    if (cards.length === 0) break;
    let addedOnPage = 0;
    for (const card of cards) {
      const link = /przetarg-nieruchomosci\/(\d+)\/([a-z0-9\-]+)/i.exec(card);
      if (!link) continue;
      const rodzaj = /Rodzaj nieruchomości<\/th>\s*<td>([^<]+)/i.exec(card);
      addedOnPage++;
      if (!rodzaj || !/lokal\s+mieszkalny/i.test(rodzaj[1])) continue;
      const id = link[1];
      if (seen.has(id)) continue;
      seen.add(id);
      flats.push({ id, slug: link[2], url: detailUrl(id, link[2]) });
    }
    if (addedOnPage === 0) break; // ran past the last populated page
  }
  console.error(`  ostroleka: ${flats.length} lokal-mieszkalny detail page(s) found`);
  return flats;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];

  const flats = await listFlatDetails();
  for (const flat of flats) {
    let html;
    try {
      html = await getText(flat.url);
    } catch (err) {
      console.error(`  ostroleka: detail ${flat.id} failed (${err.message})`);
      continue;
    }
    const meta = parseMetaTable(html);
    const atts = parseAttachments(html);
    const resultAtt = atts.find((a) => isResultAttachment(a.label));
    const annAtt =
      atts.find((a) => isAnnouncementAttachment(a.label)) ||
      atts.find((a) => !isResultAttachment(a.label)) ||
      null;

    if (resultAtt) {
      // Concluded → achieved-price stream. refresh.js OCRs pdf_url.
      resultRefs.push({
        pdf_url: resultAtt.url,
        auction_date: meta.auction_date,
        detail_url: flat.url,
      });
      continue;
    }

    // No result yet → an active (or recently-closed) auction.
    const year = meta.auction_date ? Number(meta.auction_date.slice(0, 4)) : null;
    if (year != null && year < MIN_YEAR) continue; // pre-floor announcement-only noise

    let ocrText = '';
    if (annAtt) {
      try {
        ocrText = await ocrPdf(annAtt.url);
      } catch (err) {
        console.error(`  ostroleka: announcement OCR failed ${annAtt.url} (${err.message})`);
      }
    }
    const rec = buildActiveListing(meta, {
      ocrText,
      label: annAtt?.label || '',
      detailUrl: flat.url,
    });
    if (rec) listings.push(rec);
    else console.error(`  ostroleka WARN: could not build active listing for ${flat.url}`);
  }

  console.error(
    `  ostroleka: ${listings.length} active listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, resultRefs };
}

/** Result notices (achieved-price stream). source:'pdf' ⇒ refresh.js OCRs each. */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings } = await crawlPromise;
  return { listings, wykaz: [], land: [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = await crawlResultDocs();
  const { listings } = await crawlActive();
  process.stdout.write(
    JSON.stringify(
      { results: results.length, listings: listings.length, sampleResult: results[0], sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
