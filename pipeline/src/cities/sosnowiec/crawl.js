// Sosnowiec crawler
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  isFlatAuction,
  isCommercialAuction,
  isBuildingAuction,
  isGenericSaleAuction,
  isSaleAuctionTitle,
  parseAnnouncement,
  parsePropertyAnnouncement,
  isLandAuction,
  parseLandAnnouncement,
  isSaleResult,
  htmlToText,
} from './parse.js';

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

  // Title-confident classes (decidable from the title alone):
  //   flat        — "lokal(u) mieszkalny(ego)" / co-op with the full phrase
  //   commercial  — "lokal(u) użytkowy(ego)"            → property record, kind 'uzytkowy'
  //   building    — "nieruchomość zabudowana"           → property record, kind 'zabudowana'
  //   land        — "niezabudowana / działka / grunt"   → land record(s)
  // Anything else that still looks like a sale auction (a truncated co-op title,
  // or a generic "…na sprzedaż nieruchomości…") is ambiguous and resolved from
  // the body below, so no sale announcement is silently dropped.
  const flatRefs = refs.filter((r) => isFlatAuction(r.title));
  const commercialRefs = refs.filter((r) => !isFlatAuction(r.title) && isCommercialAuction(r.title));
  const buildingRefs = refs.filter(
    (r) => !isFlatAuction(r.title) && !isCommercialAuction(r.title) && isBuildingAuction(r.title),
  );
  const landRefs = refs.filter(
    (r) =>
      !isFlatAuction(r.title) &&
      !isCommercialAuction(r.title) &&
      !isBuildingAuction(r.title) &&
      isLandAuction(r.title),
  );
  const classified = new Set([...flatRefs, ...commercialRefs, ...buildingRefs, ...landRefs]);
  // Sale auctions the title alone couldn't classify: a truncated co-op title
  // ("…prawo do lokalu poł. przy…", lokal present but no "mieszkalny/użytkowy") or
  // a generic "…na sprzedaż nieruchomości…". Both carry the disambiguator only in
  // the body, so they get one body fetch and are routed from there.
  const ambiguousRefs = refs.filter(
    (r) =>
      !classified.has(r) &&
      isSaleAuctionTitle(r.title) &&
      (/lokal/i.test(r.title) || isGenericSaleAuction(r.title)),
  );
  console.error(
    `  sosnowiec: ${refs.length} announcements, ${flatRefs.length} flat, ` +
      `${commercialRefs.length} commercial, ${buildingRefs.length} building, ` +
      `${landRefs.length} land, ${ambiguousRefs.length} body-classified auction(s)`,
  );

  const listings = [];
  const land = [];

  const fetchArticle = async (r, label) => {
    try {
      return JSON.parse(await getText(articleApi(r.id), FETCH_OPTS));
    } catch (err) {
      console.error(`  sosnowiec ${label} article ${r.id} fetch failed: ${err.message}`);
      return null;
    }
  };

  // Property record (flat / commercial / building) → listings (properties.json).
  const pushProperty = (r, parsed) => {
    if (!parsed) {
      console.error(`  sosnowiec WARN: unkeyable ${parsed?.kind || 'property'} auction ${r.id} (${r.title.slice(0, 60)})`);
      return false;
    }
    listings.push({
      kind: parsed.kind,
      address_raw: parsed.address_raw,
      address: parsed.address,
      auction_date: parsed.auction_date || (r.archived ? r.published_date : null),
      published_date: r.published_date,
      round: parsed.round,
      area_m2: parsed.area_m2,
      starting_price_pln: parsed.starting_price_pln,
      detail_url: r.detail_url,
      ...(parsed.dzialka_nr ? { dzialka_nr: parsed.dzialka_nr } : {}),
      ...(parsed.obreb ? { obreb: parsed.obreb } : {}),
      ...(parsed.plot_area_m2 != null ? { plot_area_m2: parsed.plot_area_m2 } : {}),
    });
    return true;
  };

  // Land record(s) → land (land.json).
  const pushLand = (r, content) => {
    let records;
    try {
      records = parseLandAnnouncement(r.title, content, r.detail_url);
    } catch (err) {
      console.error(`  sosnowiec land parse failed (${r.id}): ${err.message}`);
      return false;
    }
    if (!records || records.length === 0) {
      console.error(`  sosnowiec WARN: unkeyable land article ${r.id} (${r.title.slice(0, 60)})`);
      return false;
    }
    for (const rec of records) {
      if (!rec.auction_date && r.archived) rec.auction_date = r.published_date;
      land.push(rec);
    }
    return true;
  };

  for (const r of flatRefs) {
    const article = await fetchArticle(r, 'flat');
    if (!article) continue;
    pushProperty(r, parseAnnouncement(r.title, article.content || ''));
  }
  for (const r of commercialRefs) {
    const article = await fetchArticle(r, 'commercial');
    if (!article) continue;
    pushProperty(r, parsePropertyAnnouncement(r.title, article.content || '', 'uzytkowy'));
  }
  for (const r of buildingRefs) {
    const article = await fetchArticle(r, 'building');
    if (!article) continue;
    pushProperty(r, parsePropertyAnnouncement(r.title, article.content || '', 'zabudowana'));
  }
  for (const r of landRefs) {
    const article = await fetchArticle(r, 'land');
    if (!article) continue;
    pushLand(r, article.content || '');
  }

  // Body-driven pass for ambiguous sale auctions (truncated co-op / generic).
  for (const r of ambiguousRefs) {
    const article = await fetchArticle(r, 'sale');
    if (!article) continue;
    const content = article.content || '';
    const body = htmlToText(content);
    if (isFlatAuction(r.title, body)) {
      pushProperty(r, parseAnnouncement(r.title, content)); // co-op flat → mieszkalny
    } else if (isCommercialAuction(r.title)) {
      pushProperty(r, parsePropertyAnnouncement(r.title, content, 'uzytkowy'));
    } else if (isLandAuction(r.title, body)) {
      pushLand(r, content); // generic sale with a działka in the body → land
    } else if (/(?<!nie)zabudowan/i.test(body)) {
      pushProperty(r, parsePropertyAnnouncement(r.title, content, 'zabudowana'));
    } else {
      console.error(`  sosnowiec WARN: unclassified sale auction ${r.id} (${r.title.slice(0, 60)})`);
    }
  }

  const byKind = listings.reduce((m, l) => ((m[l.kind] = (m[l.kind] || 0) + 1), m), {});
  console.error(
    `  sosnowiec active: ${listings.length} property listing(s) ${JSON.stringify(byKind)}; ${land.length} land plot record(s)`,
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

  // Keep flat, commercial and built-property sale results (parseResultDoc stamps
  // the kind); lease/land results are excluded by isSaleResult.
  const saleRefs = refs.filter((r) => isSaleResult(r.title));
  console.error(`  sosnowiec results: ${refs.length} notices, ${saleRefs.length} sale result(s)`);

  const out = [];
  for (const r of saleRefs) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} flat listing(s)`);
}
