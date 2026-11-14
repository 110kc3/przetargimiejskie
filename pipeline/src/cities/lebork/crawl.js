
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  buildRecordText,
  parseAnnouncement,
  isSaleAuction,
  isLease,
  isRokowania,
  isCancelled,
  isResultDoc,
  auctionDateFromText,
  stripHtml,
} from './parse.js';

const ORIGIN = 'https://bip.um.lebork.pl';
const BOARD = `${ORIGIN}/artykul/sprzedaz-i-dzierzawa-nieruchomosci-przetargi`;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_YEARS = 2;
const MAX_DEPTH = 4;
const MAX_FETCHES = 400;
const MAX_LEAVES = 300;

function articleRegion(html) {
  if (!html) return '';
  const i = html.indexOf('<article');
  if (i < 0) return html;
  const j = html.indexOf('</article>', i);
  return j > i ? html.slice(i, j) : html.slice(i);
}

const decodeHref = (h) => h.replace(/&amp;/gi, '&');

export function parseListRows(html) {
  const region = articleRegion(html);
  const out = [];
  const seen = new Set();
  const re = /<td><a\s+href="(\/artykul\/[^"]+)"[^>]*>([\s\S]*?)<\/td>\s*<td>([^<]*)<\/td>/gi;
  let m;
  while ((m = re.exec(region)) !== null) {
    const href = decodeHref(m[1].trim());
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({
      href,
      title: stripHtml(m[2]),
      date: (m[3].trim().match(/\d{4}-\d{2}-\d{2}/) || [''])[0],
    });
  }
  return out;
}

export function extractBody(html) {
  let txt = stripHtml(articleRegion(html));
  const head = txt.lastIndexOf('Czytaj tekst');
  if (head >= 0) txt = txt.slice(head + 'Czytaj tekst'.length).trim();
  const foot = txt.indexOf('Metadane');
  if (foot >= 0) txt = txt.slice(0, foot).trim();
  return txt;
}

let crawlPromise = null;

async function collectLeaves() {
  const leaves = [];
  const state = { fetches: 0 };
  const seen = new Set();

  async function walk(url, depth, rowTitle, rowDate) {
    if (depth > MAX_DEPTH) return;
    if (state.fetches >= MAX_FETCHES || leaves.length >= MAX_LEAVES) return;
    if (seen.has(url)) return;
    seen.add(url);

    let html;
    try {
      state.fetches++;
      html = await getText(url, { userAgent: UA });
    } catch (err) {
      console.error(`  lebork: fetch failed (${url}): ${err.message}`);
      return;
    }

    let rows = parseListRows(html);
    if (depth === 0) rows = rows.slice(0, MAX_YEARS);

    if (rows.length && depth < MAX_DEPTH) {
      for (const r of rows) {
        await walk(`${ORIGIN}${r.href}`, depth + 1, r.title, r.date);
        if (state.fetches >= MAX_FETCHES || leaves.length >= MAX_LEAVES) break;
      }
      return;
    }

    const body = extractBody(html);
    if (body) leaves.push({ url, title: rowTitle || '', date: rowDate || null, body });
  }

  await walk(BOARD, 0, '', null);
  console.error(`  lebork: walked ${state.fetches} node(s) → ${leaves.length} leaf notice(s)`);
  return leaves;
}

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const today = new Date().toISOString().slice(0, 10);

  const leaves = await collectLeaves();
  for (const leaf of leaves) {
    const text = buildRecordText({ title: leaf.title, body: leaf.body });

    if (isCancelled(text)) continue;
    if (isResultDoc(text)) {
      resultRefs.push({ text, pdf_url: leaf.url, auction_date: auctionDateFromText(text) || leaf.date || null });
      continue;
    }
    if (!isSaleAuction(text)) continue;
    if (isLease(text) || isRokowania(text)) continue;

    for (const rec of parseAnnouncement(text)) {
      if (rec.auction_date && rec.auction_date < today) continue;
      const enriched = { ...rec, detail_url: leaf.url, source_url: leaf.url, published_date: leaf.date };
      (rec.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  lebork: ${listings.length} flat/unit listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
        sampleResult: results[0] && { ...results[0], text: `[${results[0].text.length} chars]` },
      },
      null,
      2,
    ) + '\n',
  );
}
