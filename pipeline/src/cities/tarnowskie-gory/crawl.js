// Tarnowskie Góry crawler — the city BIP's two property-sale boards behind a
// clean JSON API (no SPA render, no OCR, no TLS workaround — see config.js):
//
//   LIST:    GET /api/menu/<id>/articles?limit=&offset=&archived=true
//   ARTICLE: GET /api/articles/<id>   →  { attachments:[{ id, extension, link }] }
//   FILE:    /e,pobierz,get.html?id=<attId>   (the per-announcement text PDF)
//
// Boards: 5217 (buildings + flats + their result notices), 5216 (land + its
// result notices). One pass per board serves BOTH streams: each article's PDF
// is either a sale ANNOUNCEMENT (active listing / land plot) or a published
// RESULT notice ("INFORMACJA o wyniku …" — the achieved-price stream). The
// title decides what to fetch (skip rentals/wykazy/lists/corrections); the PDF
// BODY decides announcement-vs-result (the body header is authoritative, robust
// to the board's letter-spaced / truncated titles).
//
// The `archived` query flag does NOT partition this API — `archived=false` and
// `archived=true` both return the FULL board in one response (verified live:
// 291 on 5217, 199 on 5216). So we fetch each board ONCE with archived=true +
// a high limit and dedupe by id; pagination (limit/offset) is implemented
// defensively in case a future board exceeds the page size.
//
// Like Zabrze, refresh.js calls crawlResultDocs() then crawlActive(); both
// await the SAME memoised crawl, so the throttled per-article fetches happen
// exactly once per run. source:'html' ⇒ result refs already carry `.text`.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  parseAnnouncement,
  isResultNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from './parse.js';

const ORIGIN = 'https://bip.tarnowskiegory.pl';
// 5217 = nieruchomości zabudowane (budynki + lokale); 5216 = niezabudowane (land).
const BOARDS = [
  { id: 5217, isLandBoard: false },
  { id: 5216, isLandBoard: true },
];
const PAGE = 500; // the API returns the whole board well within one page today

// Articles published more than this long ago that still lack a parseable auction
// date are treated as concluded: we stamp their publish date as the auction date
// so they age into the ARCHIVE rather than lingering as dateless "current" rows.
// (Recent undated ones keep a null date and stay active, so a genuinely upcoming
// auction whose date we failed to parse is never wrongly hidden.) The BIP returns
// the whole archive on both archived flags, so without this most "active" rows
// would be auctions held a year or two ago.
const STALE_CUTOFF = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);

const listApi = (menuId, offset) =>
  `${ORIGIN}/api/menu/${menuId}/articles?limit=${PAGE}&offset=${offset}&archived=true`;
const articleApi = (id) => `${ORIGIN}/api/articles/${id}`;
const fileUrl = (attId) => `${ORIGIN}/e,pobierz,get.html?id=${attId}`;

/** Title from an article-list item (aliasFields carries a clean `title`). */
function listItemTitle(a) {
  const f = (a?.aliasFields || []).find((x) => x.alias === 'title');
  return (f?.value || '').trim();
}

/** Publish date (YYYY-MM-DD) from an article-list item's columnFields. */
function listItemPubDate(a) {
  for (const c of a?.columnFields || []) {
    const v = (c?.value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  }
  return null;
}

/**
 * Map one board's article-list payload to the items worth fetching.
 * @param {object} json   parsed { total, articles:[…] }
 * @returns {Array<{id:string, title:string, published_date:string|null, role:'result'|'ann'}>}
 */
export function selectArticles(json) {
  const arts = Array.isArray(json?.articles) ? json.articles : [];
  const out = [];
  const seen = new Set();
  for (const a of arts) {
    const id = a?.id;
    if (!id || seen.has(id)) continue;
    const title = listItemTitle(a);
    const slug = a?.link || '';
    if (isSkippableTitle(title, slug)) continue;
    let role = null;
    if (isResultTitle(title, slug)) role = 'result';
    else if (isAnnouncementTitle(title, slug)) role = 'ann';
    else continue; // unclassifiable noise — skip
    seen.add(id);
    out.push({ id, title, published_date: listItemPubDate(a), role });
  }
  return out;
}

/** Fetch every (non-skipped) article ref on a board, paginating defensively. */
async function listBoard(board) {
  const refs = [];
  let offset = 0;
  for (;;) {
    let json;
    try {
      json = JSON.parse(await getText(listApi(board.id, offset)));
    } catch (err) {
      console.error(`  tarnowskie-gory board ${board.id} list failed (offset ${offset}): ${err.message}`);
      break;
    }
    const selected = selectArticles(json);
    for (const s of selected) refs.push({ ...s, board: board.id, isLandBoard: board.isLandBoard });
    const total = Number(json?.total) || 0;
    const returned = Array.isArray(json?.articles) ? json.articles.length : 0;
    offset += PAGE;
    // Stop when we've covered `total`, the page wasn't full, or nothing came back.
    if (returned === 0 || returned < PAGE || offset >= total) break;
  }
  return refs;
}

/**
 * PDF attachment URL + canonical human page for an article, via the article API.
 * @returns {Promise<{pdfUrl:string, detailUrl:string}|null>}
 */
async function articleAssets(id) {
  let json;
  try {
    json = JSON.parse(await getText(articleApi(id)));
  } catch (err) {
    console.error(`  tarnowskie-gory article ${id} fetch failed: ${err.message}`);
    return null;
  }
  const att = (json?.attachments || []).find(
    (x) => !x?.deleted && String(x?.extension || '').toLowerCase() === 'pdf',
  );
  if (!att) return null;
  // The API gives a relative link ("e,pobierz,get.html?id=<attId>"); prefer the
  // attachment id (stable) to build the absolute URL.
  const pdfUrl = att.id != null ? fileUrl(att.id) : `${ORIGIN}/${String(att.link).replace(/^\/+/, '')}`;
  // Canonical article page = the API's own `link` (a,<id>,<slug>.html — the SPA
  // route the BIP itself links to). The guessed /Article/id,N.html is NOT a real
  // SPA route: it returns the 200 shell but the client router shows an in-app
  // 404, so it must never be used. Fall back to the article API URL when the
  // slug is missing (same shape as the Sosnowiec adapter on this vendor).
  const detailUrl = json?.link
    ? `${ORIGIN}/${String(json.link).replace(/^\/+/, '')}`
    : `${ORIGIN}/api/articles/${id}`;
  return { pdfUrl, detailUrl };
}

// One memoised pass over both boards — see the file header.
let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats + buildings)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, auction_date, isLandBoard }

  for (const board of BOARDS) {
    const refs = await listBoard(board);
    const anns = refs.filter((r) => r.role === 'ann').length;
    const results = refs.filter((r) => r.role === 'result').length;
    console.error(
      `  tarnowskie-gory board ${board.id}: ${refs.length} relevant article(s) (${anns} announcement, ${results} result)`,
    );

    for (const ref of refs) {
      const assets = await articleAssets(ref.id);
      if (!assets) {
        console.error(`  tarnowskie-gory: no PDF attachment on article ${ref.id} (${ref.title.slice(0, 60)})`);
        continue;
      }
      const { pdfUrl, detailUrl } = assets;
      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  tarnowskie-gory: PDF extract failed ${pdfUrl}: ${err.message}`);
        continue;
      }

      // The body header is the authority for announcement-vs-result (more
      // reliable than the noisy title). A result notice → the achieved-price
      // stream; everything else → an active announcement.
      if (isResultNotice(text)) {
        resultRefs.push({ text, pdf_url: pdfUrl, detail_url: detailUrl, auction_date: null, isLandBoard: ref.isLandBoard });
        continue;
      }

      const rec = parseAnnouncement(text, { board: ref.id, isLandBoard: ref.isLandBoard });
      if (!rec) {
        console.error(`  tarnowskie-gory WARN: announcement not parsed (article ${ref.id}, ${ref.title.slice(0, 60)})`);
        continue;
      }
      // Stale, dateless tenders → age into the archive via their publish date
      // (see STALE_CUTOFF). The auction date stays authoritative when parsed.
      if (!rec.auction_date && ref.published_date && ref.published_date < STALE_CUTOFF) {
        rec.auction_date = ref.published_date;
        rec.auction_date_estimated = true;
      }
      if (rec.kind === 'grunt') {
        land.push({ ...rec, detail_url: detailUrl, source_url: pdfUrl });
      } else {
        listings.push({ ...rec, detail_url: detailUrl, source_url: pdfUrl });
      }
    }
  }

  console.error(
    `  tarnowskie-gory: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved prices) found on both boards — see crawlAll(). */
export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

/** @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>} */
export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, land } = await crawlPromise;
  return { listings, wykaz: [], land };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings, land } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
