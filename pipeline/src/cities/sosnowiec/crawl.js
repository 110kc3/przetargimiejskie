// Sosnowiec crawler
import { getText } from '../../core/fetch.js';
import { classifyKind } from '../../core/classify-kind.js';
import { isFlatAuction, parseAnnouncement, isLandAuction, parseLandAnnouncement, isFlatResult, htmlToText } from './parse.js';

const ORIGIN = 'https://www.bip.um.sosnowiec.pl';
const MENU_ID = 6339;
const RESULTS_MENU_ID = 7043;
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

export async function crawlActive() {
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
  const landRefs = refs.filter((r) => !isFlatAuction(r.title) && isLandAuction(r.title));
  console.error(
    `  sosnowiec: ${refs.length} announcements, ${flatRefs.length} flat auction(s), ${landRefs.length} land auction(s)`,
  );

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

  const land = [];
  for (const r of landRefs) {
    let article;
    try {
      article = JSON.parse(await getText(articleApi(r.id), FETCH_OPTS));
    } catch (err) {
      console.error(`  sosnowiec land article ${r.id} fetch failed: ${err.message}`);
      continue;
    }
    let records;
    try {
      records = parseLandAnnouncement(r.title, article?.content || '', r.detail_url);
    } catch (err) {
      console.error(`  sosnowiec land parse failed (${r.id}): ${err.message}`);
      continue;
    }
    if (!records || records.length === 0) {
      console.error(`  sosnowiec WARN: unkeyable land article ${r.id} (${r.title.slice(0, 60)})`);
      continue;
    }
    for (const rec of records) {
      if (!rec.auction_date && r.archived) rec.auction_date = r.published_date;
      land.push(rec);
    }
  }

  console.error(
    `  sosnowiec active: ${listings.length} flat listing(s); ${land.length} land plot record(s)`,
  );
  return { listings, wykaz: [], land };
}

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
      auction_date: r.published_date || null,
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
