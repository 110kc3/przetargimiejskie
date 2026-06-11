// Sosnowiec crawler — the city BIP's "Przetargi" board.
//
//   LIST (JSON API):  https://www.bip.um.sosnowiec.pl/api/menu/6339/articles?limit=&offset=&archived=
//   ARTICLE (JSON):   https://www.bip.um.sosnowiec.pl/api/articles/<id>
//
// bip.um.sosnowiec.pl is a React SPA; the served HTML is a shell. The article
// list comes from a JSON API on menu 6339 ("Przetargi"): `archived=0` = current,
// `archived=1` = the (retained, ~500-item) archive. Each list item carries the
// title (aliasFields[alias=title]) + publish date (columnFields) + an `id`. The
// per-article JSON (`/api/articles/<id>`) holds the full announcement as inline
// HTML `content` — for flats that's all we need (price/area/date/round), no PDF.
//
// We keep only open `przetarg ustny … na sprzedaż lokalu mieszkalnego` auctions
// (~37 in the archive). The city's far more numerous land/działka auctions and
// its bezprzetargowe tenant flat sales are skipped (see SPIKE-WAVE2.md). One flat
// per announcement → one active listing carrying round + auction date + the
// article page as detail_url. build-properties classifies past-dated ones
// `archived`. crawlResultDocs() walks the sibling "Wyniki przetargów" board
// (menu 7043) for the achieved-price stream — see the function below.

import { getText } from '../../core/fetch.js';
import { isFlatAuction, parseAnnouncement, isFlatResult, htmlToText } from './parse.js';

const ORIGIN = 'https://www.bip.um.sosnowiec.pl';
const MENU_ID = 6339; // "Przetargi"
const RESULTS_MENU_ID = 7043; // "Wyniki przetargów" (sibling of Przetargi)
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };
const PAGE = 200;

const listApi = (archived, limit, offset) =>
  `${ORIGIN}/api/menu/${MENU_ID}/articles?limit=${limit}&offset=${offset}&archived=${archived}`;
const articleApi = (id) => `${ORIGIN}/api/articles/${id}`;

function aliasValue(article, alias) {
  return (article?.aliasFields || []).find((f) => f.alias === alias)?.value || '';
}
function publishedDate(article) {
  const v = (article?.columnFields || [])
    .map((f) => f.value)
    .find((x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x));
  return v ? v.slice(0, 10) : null;
}

/**
 * Map one list-API page to {id, title, published_date, detail_url} refs.
 * @param {object} json  parsed { articles:[ {id, link, aliasFields, columnFields} ], total }
 */
export function parseList(json) {
  const arts = json?.articles;
  if (!Array.isArray(arts)) return { refs: [], total: 0 };
  const refs = arts.map((a) => ({
    id: a.id,
    title: aliasValue(a, 'title') || '',
    published_date: publishedDate(a),
    detail_url: a.link ? `${ORIGIN}/${a.link}` : `${ORIGIN}/api/articles/${a.id}`,
  }));
  return { refs, total: json.total ?? refs.length };
}

/** Fetch every article ref for one archived flag (paginated). Tags each ref
 *  with `archived` (0 = current proceeding, 1 = concluded/historical). */
async function fetchAllRefs(archived) {
  const all = [];
  for (let offset = 0; offset < 5000; offset += PAGE) {
    let json;
    try {
      json = JSON.parse(await getText(listApi(archived, PAGE, offset), FETCH_OPTS));
    } catch (err) {
      console.error(`  sosnowiec list (archived=${archived}) failed at offset ${offset}: ${err.message}`);
      break;
    }
    const { refs, total } = parseList(json);
    for (const r of refs) r.archived = archived;
    all.push(...refs);
    if (all.length >= total || refs.length === 0) break;
  }
  return all;
}

/** @returns {Promise<{ listings: object[], wykaz: object[] }>} */
export async function crawlActive() {
  // Current + archived announcements; dedupe by id.
  const seen = new Set();
  const refs = [];
  for (const archived of [0, 1]) {
    for (const r of await fetchAllRefs(archived)) {
      if (r.id && !seen.has(r.id)) {
        seen.add(r.id);
        refs.push(r);
      }
    }
  }

  const flatRefs = refs.filter((r) => isFlatAuction(r.title));
  console.error(`  sosnowiec: ${refs.length} announcements, ${flatRefs.length} flat auction(s)`);

  const listings = [];
  for (const r of flatRefs) {
    let article;
    try {
      article = JSON.parse(await getText(articleApi(r.id), FETCH_OPTS));
    } catch (err) {
      console.error(`  sosnowiec article ${r.id} fetch failed: ${err.message}`);
      continue;
    }
    const parsed = parseAnnouncement(r.title, article?.content || '');
    if (!parsed) {
      console.error(`  sosnowiec WARN: unkeyable flat auction ${r.id} (${r.title.slice(0, 60)})`);
      continue;
    }
    // A concluded (archived) auction whose date didn't parse must still count as
    // PAST — otherwise build-properties classifies it 'active' (null date isn't
    // < today) and it pollutes the live popup. Fall back to its publish date
    // (always past). Current proceedings keep their (possibly null) parsed date.
    const auction_date =
      parsed.auction_date || (r.archived ? r.published_date : null);
    listings.push({
      kind: parsed.kind,
      address_raw: parsed.address_raw,
      address: parsed.address,
      auction_date,
      published_date: r.published_date,
      round: parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: parsed.starting_price_pln,
      detail_url: r.detail_url,
    });
  }

  console.error(`  sosnowiec active: ${listings.length} flat listing(s) from ${flatRefs.length} announcement(s)`);
  return { listings, wykaz: [] };
}

/**
 * Sosnowiec's achieved-price stream: the "Wyniki przetargów" board (menu
 * 7043, same JSON API shape — 182+ archived notices, mostly land/dzierżawa).
 * We keep only flat-sale results (isFlatResult) and hand each one to
 * parse.js parseResultDoc as `"<title>\n<flattened body>"` — title carries
 * the address, the body carries date / starting / achieved price / buyer.
 * @returns {Promise<Array<{text:string, auction_date:string|null, pdf_url:string}>>}
 */
export async function crawlResultDocs() {
  const resultsListApi = (archived, limit, offset) =>
    `${ORIGIN}/api/menu/${RESULTS_MENU_ID}/articles?limit=${limit}&offset=${offset}&archived=${archived}`;

  const refs = [];
  const seen = new Set();
  for (const archived of [0, 1]) {
    for (let offset = 0; offset < 5000; offset += PAGE) {
      let json;
      try {
        json = JSON.parse(await getText(resultsListApi(archived, PAGE, offset), FETCH_OPTS));
      } catch (err) {
        console.error(`  sosnowiec results list (archived=${archived}) failed at offset ${offset}: ${err.message}`);
        break;
      }
      const { refs: pageRefs, total } = parseList(json);
      let added = 0;
      for (const r of pageRefs) {
        if (r.id && !seen.has(r.id)) {
          seen.add(r.id);
          refs.push(r);
          added++;
        }
      }
      if (seen.size >= total || pageRefs.length === 0 || added === 0) break;
    }
  }

  const flatRefs = refs.filter((r) => isFlatResult(r.title));
  console.error(`  sosnowiec results: ${refs.length} notices, ${flatRefs.length} flat result(s)`);

  const out = [];
  for (const r of flatRefs) {
    let article;
    try {
      article = JSON.parse(await getText(articleApi(r.id), FETCH_OPTS));
    } catch (err) {
      console.error(`  sosnowiec result article ${r.id} fetch failed: ${err.message}`);
      continue;
    }
    out.push({
      text: `${r.title}\n${htmlToText(article?.content || '')}`,
      auction_date: r.published_date || null, // parse prefers the body date
      pdf_url: r.detail_url,
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
