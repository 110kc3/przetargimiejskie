
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { buildRecordText, parseAnnouncement, parseResultDoc, isSaleAuction, isLease } from './parse.js';

const ORIGIN = 'https://bip.rawamazowiecka.pl';
const HUB_URL = `${ORIGIN}/1311,przetargi`;

const ANNOUNCE_MENU_ANCHOR = '1311,przetargi';
const RESULT_MENU_ANCHOR = '1312,wyniki-przetargow';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - (Number(process.env.RAWA_CRAWL_YEARS) || 6);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DEADLINE_MS = Number(process.env.RAWA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;
const MAX_DOCS = Number(process.env.RAWA_MAX_DOCS) || 250;

async function fetchHtml(url) {
  try {
    return await getText(url, { userAgent: UA });
  } catch (err) {
    console.error(`  rawa-mazowiecka: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

export function discoverBoards(hubHtml, anchor, slugPattern) {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const link = new RegExp(`<a\\b[^>]*\\bhref=["']/?${escaped}["'][^>]*>`, 'i').exec(hubHtml);
  if (!link) return [];
  const afterLink = hubHtml.slice(link.index + link[0].length);
  const close = afterLink.indexOf('</a>');
  if (close < 0) return [];
  const submenu = /^\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/i.exec(afterLink.slice(close + 4));
  if (!submenu) return [];
  const tail = submenu[1];
  const out = [];
  const re = new RegExp(slugPattern.source, 'gi');
  let m;
  while ((m = re.exec(tail)) !== null) {
    const year = Number(m[2]);
    if (Number.isFinite(year) && year >= MIN_YEAR) out.push({ id: m[1], year });
  }
  return out.sort((a, b) => b.year - a.year);
}

const boardUrl = (id, slug) => `${ORIGIN}/${id},${slug}`;
const docUrl = (boardId, tresc) => `${ORIGIN}/redir,${boardId}?tresc=${tresc}`;

export function parseBoardRefs(html, boardId) {
  const re = new RegExp(`redir,${boardId}\\?tresc=(\\d+)`, 'g');
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(m[1]);
  }
  return out;
}

const CONTENT_START = 'id="PageContent"';
const CONTENT_END_MARKERS = ['metryka_przycisk_wrapper', 'id="wstecz_link'];

export function extractDoc(html) {
  const i = html.indexOf(CONTENT_START);
  if (i < 0) return { body: '', attach: '', publishDate: null };
  let end = -1;
  for (const marker of CONTENT_END_MARKERS) {
    const j = html.indexOf(marker, i);
    if (j >= 0 && (end < 0 || j < end)) end = j;
  }
  if (end < 0) end = i + 25000;
  let region = html.slice(i, end);
  const lastLt = region.lastIndexOf('<');
  if (lastLt >= 0 && region.indexOf('>', lastLt) < 0) region = region.slice(0, lastLt);

  const attach = [];
  const attRe = /class="pliki_nazwa">([^<]*)</gi;
  let am;
  while ((am = attRe.exec(region)) !== null) {
    const name = am[1].trim();
    if (name) attach.push(name);
  }

  const dm = /Data publikacji\s*<\/span><span class="system_metryka_wartosc">(\d{4}-\d{2}-\d{2})/i.exec(
    html.slice(i, i + 30000),
  );

  const body = region
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { body, attach: attach.join('; '), publishDate: dm ? dm[1] : null };
}

async function fetchDoc(boardId, tresc) {
  const url = docUrl(boardId, tresc);
  const html = await fetchHtml(url);
  if (!html) return null;
  const { body, attach, publishDate } = extractDoc(html);
  if (!body) return null;
  return { text: buildRecordText({ body, attach }), url, publishDate };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const hubHtml = await fetchHtml(HUB_URL);
  if (!hubHtml) {
    console.error('  rawa-mazowiecka: hub page fetch failed — cannot discover year boards');
    return { listings, land, resultRefs };
  }

  const announceBoards = discoverBoards(hubHtml, ANNOUNCE_MENU_ANCHOR, /href="(\d+),przetargi-(\d{4})"/);
  const resultBoards = discoverBoards(hubHtml, RESULT_MENU_ANCHOR, /href="(\d+),(\d{4})"/);
  console.error(
    `  rawa-mazowiecka: discovered ${announceBoards.length} announcement board(s) [${announceBoards.map((b) => b.year).join(',')}], ${resultBoards.length} result board(s) [${resultBoards.map((b) => b.year).join(',')}]`,
  );

  const deadline = Date.now() + DEADLINE_MS;
  let processed = 0;
  const overBudget = () => processed >= MAX_DOCS || Date.now() > deadline;

  for (const b of announceBoards) {
    if (overBudget()) break;
    const html = await fetchHtml(boardUrl(b.id, `przetargi-${b.year}`));
    if (!html) continue;
    for (const tresc of parseBoardRefs(html, b.id)) {
      if (overBudget()) break;
      processed++;
      const doc = await fetchDoc(b.id, tresc);
      if (!doc) continue;
      if (!isSaleAuction(doc.text) || isLease(doc.text)) continue;
      for (const rec of parseAnnouncement(doc.text)) {
        const enriched = { ...rec, detail_url: doc.url, source_url: doc.url };
        (rec.kind === 'grunt' ? land : listings).push(enriched);
      }
    }
  }

  for (const b of resultBoards) {
    if (overBudget()) break;
    const html = await fetchHtml(boardUrl(b.id, `${b.year}`));
    if (!html) continue;
    for (const tresc of parseBoardRefs(html, b.id)) {
      if (overBudget()) break;
      processed++;
      const doc = await fetchDoc(b.id, tresc);
      if (!doc) continue;
      resultRefs.push({ text: doc.text, source_url: doc.url, auction_date: doc.publishDate });
    }
  }

  if (processed >= MAX_DOCS || Date.now() > deadline) {
    console.error(`  rawa-mazowiecka: crawl budget reached (processed ${processed}) — remainder backfills next run`);
  }
  console.error(
    `  rawa-mazowiecka: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result document(s)`,
  );
  return { listings, land, resultRefs };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

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
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        sampleListing: listings[0],
        sampleLand: land[0],
        sampleResult: results[0],
      },
      null,
      2,
    ) + '\n',
  );
}
