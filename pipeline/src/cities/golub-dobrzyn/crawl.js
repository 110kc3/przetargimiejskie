// Golub-Dobrzyń crawler — dual-publisher bip.net 7.32 (extranet.pl), consumed as
// server HTML (powiat) + born-digital PDF (miasto). See config.js.
//
//   POWIAT (bip.golub-dobrzyn.com.pl): the general board 824 (Informacje i
//     ogłoszenia) is paginated (?news_page=N) and mixes everything — road
//     obwieszczenia, job vacancies, MOVABLE-property tenders, land + FLAT
//     auctions. Each item's "Czytaj więcej" link is `redir,<id>` (302 →
//     `<id>,<slug>`) and its aria-label carries the full title, so titles are
//     PRE-FILTERED to property auctions before any detail fetch. Each detail
//     page's prose is INLINE HTML in `id="PageContent"` (up to the metryka
//     footer). Routed by CONTENT: result → crawlResultDocs, sale → crawlActive.
//
//   MIASTO (bip.golub-dobrzyn.pl): notices are born-digital PDF attachments
//     (`plik,<id>,…pdf`) shown inline on the "Sprzedaż nieruchomości" board (760)
//     + the two most recent "Ogłoszenia Burmistrza" year boards. PDFs whose file
//     name marks a property auction are extracted via pdfText (OCR fallback) and
//     routed through the SAME parsers. Bounded best-effort (see MAX_* budget) —
//     deep miasto menu-tree history is a documented v1 limitation; the powiat
//     feed is the primary, fully-verified achieved-price stream.
//
// source:'html' ⇒ result refs already carry `.text` (the built blob), which
// refresh.js hands straight to parseResultDoc.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isResultDoc,
  isRealEstateSale,
  isLease,
  auctionDateFromText,
} from './parse.js';

const POWIAT_ORIGIN = 'https://www.bip.golub-dobrzyn.com.pl';
const POWIAT_BOARD = '824,informacje-i-ogloszenia';
const MIASTO_ORIGIN = 'https://bip.golub-dobrzyn.pl';
const MIASTO_SALE_BOARD = '760,sprzedaz-nieruchomosci';

// A browser UA — the safe default for municipal WAFs / CI egress (harmless if
// unneeded; both hosts answered a plain fetch fine live).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Bounds so a broken/looping board can never blow the 25-min CI job (ADAPTER-
// GUIDE §5.1). Live volume is low (7 board pages, ~50 property docs total).
const MAX_POWIAT_PAGES = Number(process.env.GD_MAX_PAGES) || 12;
const MAX_MIASTO_YEARS = 2;
const MAX_DOCS = Number(process.env.GD_MAX_DOCS) || 220;
const DEADLINE_MS = Number(process.env.GD_BUDGET_MS) || 12 * 60 * 1000;

// Titles worth a detail fetch (property auctions) vs obvious non-property noise.
const KEEP_TITLE = /przetarg|sprzeda[żz]|nieruchomo|lokal|dzia[łl]k|wynik/i;
const SKIP_TITLE = /ruchom|samoch|ci[ąa]gnik|nab[oó]r|obwieszcz|zawiadom|deklaracj|petycj|bud[żz]et|zam[oó]wien|zapytani|konkurs|koncesj/i;
const keepPowiatTitle = (t) => KEEP_TITLE.test(t) && !SKIP_TITLE.test(t);

function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&nbsp;/gi, ' ');
}

async function fetchHtml(url) {
  try {
    return await getText(url, { userAgent: UA });
  } catch (err) {
    console.error(`  golub-dobrzyn: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

/** {id, title} refs from a board page's "Czytaj więcej: <title>" links. */
export function parseBoardRefs(html) {
  const out = [];
  const seen = new Set();
  const re = /href="[^"]*\/redir,(\d+)"[^>]*aria-label="Czytaj więcej:\s*([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title: decodeEntities(m[2]).replace(/\s+/g, ' ').trim() });
  }
  return out;
}

const CONTENT_START = 'id="PageContent"';
const CONTENT_END_MARKERS = ['metryka_przycisk_wrapper', 'id="wstecz_link'];

/** Plain-text BODY + metryka "Data publikacji" (fallback date) from a bip.net
 *  detail page. Cuts at the metryka footer so page chrome never leaks into BODY;
 *  backs the cut up to a clean tag boundary when the marker lands mid-attribute. */
export function extractDoc(html) {
  const i = html.indexOf(CONTENT_START);
  if (i < 0) return { body: '', publishDate: null };
  let end = -1;
  for (const mk of CONTENT_END_MARKERS) {
    const j = html.indexOf(mk, i);
    if (j >= 0 && (end < 0 || j < end)) end = j;
  }
  if (end < 0) end = i + 30000;
  let region = html.slice(i, end);
  const lastLt = region.lastIndexOf('<');
  if (lastLt >= 0 && region.indexOf('>', lastLt) < 0) region = region.slice(0, lastLt);

  const dm = /Data publikacji\s*<\/span><span class="system_metryka_wartosc">(\d{4}-\d{2}-\d{2})/i.exec(
    html.slice(i, i + 40000),
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
    .trim()
    .replace(/^id="PageContent">\s*/, '');

  return { body, publishDate: dm ? dm[1] : null };
}

function makeBudget() {
  const deadline = Date.now() + DEADLINE_MS;
  let processed = 0;
  return {
    over: () => processed >= MAX_DOCS || Date.now() > deadline,
    count: () => { processed += 1; },
    get processed() { return processed; },
  };
}

/** Route one built blob into the right stream. */
function routeDoc(blob, url, fallbackDate, buckets) {
  if (isResultDoc(blob)) {
    buckets.resultRefs.push({
      text: blob,
      pdf_url: url,
      auction_date: auctionDateFromText(blob) || fallbackDate || null,
    });
    return;
  }
  if (!isRealEstateSale(blob) || isLease(blob)) return;
  for (const rec of parseAnnouncement(blob)) {
    const enriched = { ...rec, detail_url: url, source_url: url };
    (rec.kind === 'grunt' ? buckets.land : buckets.listings).push(enriched);
  }
}

// --------------------------------------------------------------------- powiat

async function crawlPowiat(buckets, budget) {
  const refs = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_POWIAT_PAGES; page++) {
    if (budget.over()) break;
    const url = page === 1
      ? `${POWIAT_ORIGIN}/${POWIAT_BOARD}`
      : `${POWIAT_ORIGIN}/${POWIAT_BOARD}?news_page=${page}`;
    const html = await fetchHtml(url);
    if (!html) break;
    let added = 0;
    for (const ref of parseBoardRefs(html)) {
      if (seen.has(ref.id)) continue;
      seen.add(ref.id);
      if (!keepPowiatTitle(ref.title)) continue;
      refs.push(ref);
      added++;
    }
    // Board pages always list SOME "Czytaj więcej" items; a page that yields no
    // new ids at all means we've walked off the end — stop paginating.
    if (parseBoardRefs(html).length === 0) break;
    if (added === 0 && page > 1) { /* keep going a little — mixed board */ }
  }
  console.error(`  golub-dobrzyn(powiat): ${refs.length} property-title notice(s) to fetch`);

  for (const ref of refs) {
    if (budget.over()) break;
    budget.count();
    const url = `${POWIAT_ORIGIN}/redir,${ref.id}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const { body, publishDate } = extractDoc(html);
    if (!body) continue;
    const blob = buildRecordText({ title: ref.title, body });
    routeDoc(blob, url, publishDate, buckets);
  }
}

// ---------------------------------------------------------------------- miasto

/** PDF file names worth extracting: a property (real-estate) auction, not the
 *  bidders list / a movable-property / lease / tenant-bezprzetargowa notice. */
function keepMiastoPdf(name) {
  const n = String(name || '').toLowerCase();
  if (!/przetarg/.test(n)) return false;
  if (/lista-?os[oó]b|zakwalifikowan|bezprzetargow|ruchom|samoch|dzier|najem|wykaz|klauzul|rodo/.test(n)) return false;
  return /sprzeda|wynik|oglasza|ogloszenie|nieruchomosci|lokal|dzialk/.test(n);
}

function parseMiastoPdfLinks(html) {
  const out = [];
  const seen = new Set();
  const re = /href="([^"]*\/?plik,(\d+),([^"]+\.pdf))"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    let url = m[1];
    if (!/^https?:\/\//i.test(url)) url = `${MIASTO_ORIGIN}/${url.replace(/^\.?\//, '')}`;
    out.push({ url, name: m[3] });
  }
  return out;
}

async function crawlMiasto(buckets, budget) {
  if (budget.over()) return;
  const boards = new Set([MIASTO_SALE_BOARD]);
  const saleHtml = await fetchHtml(`${MIASTO_ORIGIN}/${MIASTO_SALE_BOARD}`);
  if (saleHtml) {
    const years = [...saleHtml.matchAll(/href="\.?\/?(\d+),(ogloszenia-(\d{4})-rok)"/gi)]
      .map((m) => ({ slug: `${m[1]},${m[2]}`, year: Number(m[3]) }))
      .sort((a, b) => b.year - a.year)
      .slice(0, MAX_MIASTO_YEARS);
    for (const y of years) boards.add(y.slug);
  }

  let miastoDocs = 0;
  for (const slug of boards) {
    if (budget.over()) break;
    const html = slug === MIASTO_SALE_BOARD && saleHtml ? saleHtml : await fetchHtml(`${MIASTO_ORIGIN}/${slug}`);
    if (!html) continue;
    for (const pdf of parseMiastoPdfLinks(html)) {
      if (budget.over()) break;
      if (!keepMiastoPdf(pdf.name)) continue;
      budget.count();
      let txt;
      try {
        txt = (await pdfText(pdf.url, { userAgent: UA })).replace(/\f/g, ' ');
        if (txt.replace(/\s+/g, '').length < 40) {
          txt = (await ocrPdf(pdf.url, { userAgent: UA })).replace(/\f/g, ' ');
        }
      } catch (err) {
        console.error(`  golub-dobrzyn(miasto): pdf ${pdf.url} extract failed: ${err.message}`);
        continue;
      }
      if (!txt || txt.replace(/\s+/g, '').length < 40) continue;
      const blob = buildRecordText({ title: pdf.name.replace(/[-_]/g, ' ').replace(/\.pdf$/i, ''), body: txt });
      routeDoc(blob, pdf.url, null, buckets);
      miastoDocs++;
    }
  }
  console.error(`  golub-dobrzyn(miasto): ${miastoDocs} property PDF(s) processed`);
}

// ------------------------------------------------------------------ entry points

let crawlPromise = null;

async function crawlAll() {
  const buckets = { listings: [], land: [], resultRefs: [] };
  const budget = makeBudget();
  await crawlPowiat(buckets, budget);
  await crawlMiasto(buckets, budget);
  if (budget.over()) {
    console.error(`  golub-dobrzyn: crawl budget reached (processed ${budget.processed}) — remainder backfills next run`);
  }
  console.error(
    `  golub-dobrzyn: ${buckets.listings.length} flat/unit listing(s), ${buckets.land.length} land plot(s), ${buckets.resultRefs.length} result document(s)`,
  );
  return buckets;
}

/** Concluded records (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
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
  const records = results.flatMap((r) => parseResultDoc(r.text, r.auction_date, r.pdf_url));
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        land: land.length,
        results: results.length,
        resultRecords: records.length,
        sampleListing: listings[0],
        sampleResult: records.find((r) => r.outcome === 'sold') || records[0],
      },
      null,
      2,
    ) + '\n',
  );
}
