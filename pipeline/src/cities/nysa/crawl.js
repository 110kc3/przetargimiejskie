// Nysa crawler — bip.nysa.pl, Sputnik Software BIP (server-rendered HTML).
//
//   LIST:    GET /?c=280  (Sprzedaż, dzierżawa nieruchomości — active/current)
//            GET /?c=318  (Archiwum – sprzedaż — completed auctions)
//              → HTML with <li><a href="?a={id}" class="blue">title</a></li>
//   ARTICLE: GET /?a={id}
//              → HTML with an attachment table:
//                  attachmentTableColumn1 = filename (label)
//                  attachmentTableColumn3 = show link (?p=document&action=show&id=…)
//              PDF attachment URLs: ?p=document&action=show&id={docId}&bar_id={artId}
//   FILE:    GET /?p=document&action=show&id={docId}&bar_id={artId}
//              → born-digital text PDF (pdftotext -layout, no OCR needed)
//
// One memoised crawl over both boards (active c=280, archive c=318) serves
// both streams:
//   - crawlResultDocs() → result notices ("Informacja o wyniku przetargu") —
//     the achieved-price stream; source:'html' means each ref carries `.text`.
//   - crawlActive()     → { listings, wykaz:[], land:[] } — active flat auctions.
//
// Both streams are flat-only (lokal mieszkalny). The crawl skips land/ground
// articles by title filter to avoid fetching large PDFs for non-flats.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  isSkippableTitle,
  isFlatSaleTitle,
  isResultNotice,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://bip.nysa.pl';
// Active listings + archive boards. Both serve flat auction articles.
const BOARDS = [
  { cat: 280, label: 'active' },
  { cat: 318, label: 'archive' },
];

const boardUrl = (cat) => `${ORIGIN}/?c=${cat}`;
const articleUrl = (id) => `${ORIGIN}/?a=${id}`;
const docUrl = (docId, artId) =>
  `${ORIGIN}/?p=document&action=show&id=${docId}&bar_id=${artId}`;

/**
 * Extract article ids + titles from a board's HTML listing.
 * The board renders as: <li><a href="?a={id}" class="blue">title</a></li>
 * @param {string} html
 * @returns {Array<{id:string, title:string}>}
 */
export function parseArticleList(html) {
  const out = [];
  const seen = new Set();
  // Match all blue-class article links
  const re = /href="\?a=(\d+)"[^>]*class="blue"[^>]*>([^<]+)</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const title = m[2].trim();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title });
  }
  return out;
}

/**
 * Extract all PDF "show" links from an article's attachment table.
 * Returns [{docId, label}] for each PDF attachment (icon_pdf_show.gif).
 * The "show" href pattern is: ?p=document&action=show&id={docId}&bar_id={artId}
 * Only attachments with a show link (icon_pdf_show) are returned — saves,
 * doc-only, and zip entries are skipped.
 * @param {string} html
 * @param {string} artId
 * @returns {Array<{docId:string, label:string}>}
 */
export function parsePdfAttachments(html, artId) {
  const out = [];
  // Each attachment row has three tds: label, save-link, show-link.
  // Match rows that have icon_pdf_show (text PDFs we can read).
  const rowRe =
    /<td[^>]*attachmentTableColumn1[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*attachmentTableColumn3[^>]*>[\s\S]*?action=show&(?:amp;)?id=(\d+)&(?:amp;)?bar_id=(\d+)/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const label = m[1].replace(/\s*\(\d+[^)]*\)\s*$/, '').trim(); // strip "(111.5kB)"
    const docId = m[2];
    const barId = m[3];
    if (barId !== artId) continue; // safety: bar_id must match the article
    out.push({ docId, label });
  }
  return out;
}

/**
 * Classify an attachment label as 'result', 'announcement', or 'skip'.
 * @param {string} label  e.g. "Informacja o wyniku kolejnego przetargu"
 * @returns {'result'|'announcement'|'skip'}
 */
export function classifyAttachmentLabel(label) {
  const l = label || '';
  if (/informacja\s+o\s+wyniku/i.test(l)) return 'result';
  if (/og[łl]oszenie/i.test(l)) return 'announcement';
  // Everything else (e.g. "wersja do odczytu" = .doc version) → skip
  return 'skip';
}

// One memoised pass over both boards.
let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  const seenArticles = new Set();

  for (const board of BOARDS) {
    let html;
    try {
      html = await getText(boardUrl(board.cat));
    } catch (err) {
      console.error(`  nysa board c=${board.cat} fetch failed: ${err.message}`);
      continue;
    }

    const articles = parseArticleList(html);
    const flatArticles = articles.filter((a) => {
      if (isSkippableTitle(a.title)) return false;
      // We fetch even "unknown" titles for flat-like articles since the title
      // is often too brief ("Nysa przy ul. Mariackiej nr 21/3 - lokal mieszkalny");
      // isFlatSaleTitle is the positive gate; unknown titles are dropped.
      return isFlatSaleTitle(a.title);
    });

    console.error(
      `  nysa board c=${board.cat} (${board.label}): ${articles.length} articles, ${flatArticles.length} flat candidates`,
    );

    for (const art of flatArticles) {
      if (seenArticles.has(art.id)) continue;
      seenArticles.add(art.id);

      let artHtml;
      try {
        artHtml = await getText(articleUrl(art.id));
      } catch (err) {
        console.error(`  nysa article ?a=${art.id} fetch failed: ${err.message}`);
        continue;
      }

      const attachments = parsePdfAttachments(artHtml, art.id);
      if (attachments.length === 0) {
        console.error(`  nysa: no PDF attachments on article ?a=${art.id} (${art.title.slice(0, 60)})`);
        continue;
      }

      for (const att of attachments) {
        const role = classifyAttachmentLabel(att.label);
        if (role === 'skip') continue;

        const pdfUrl = docUrl(att.docId, art.id);
        let text;
        try {
          text = await pdfText(pdfUrl);
        } catch (err) {
          console.error(`  nysa: PDF extract failed ${pdfUrl}: ${err.message}`);
          continue;
        }

        if (isResultNotice(text)) {
          resultRefs.push({
            text,
            pdf_url: pdfUrl,
            detail_url: articleUrl(art.id),
            auction_date: null,
          });
          continue;
        }

        if (role === 'announcement') {
          const rec = parseAnnouncement(text);
          if (!rec) {
            console.error(
              `  nysa WARN: announcement not parsed (article ?a=${art.id}, ${art.title.slice(0, 60)})`,
            );
            continue;
          }
          listings.push({
            ...rec,
            detail_url: articleUrl(art.id),
            source_url: pdfUrl,
          });
        }
      }
    }
  }

  console.error(
    `  nysa: ${listings.length} flat listing(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, resultRefs };
}

/** Result notices (achieved prices) found on both boards. */
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
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
