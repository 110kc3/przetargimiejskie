// Kolbuszowa crawler — `bip.kolbuszowa.pl` (Pro3W CMS).
//
// DISCOVERY (confirmed live 2026-07-12):
//   1. Fetch the board index `/63-przetargi.html`. Its nav tree lists tender
//      categories grouped parent-then-years; the parent "Sprzedaż nieruchomości"
//      (id 3669) owns one per-year child category `/63-przetargi/<ID>-YYYY-r.html`.
//      The IDs are NOT derivable (each year gets a fresh one — 2025 is 13508,
//      2026 is 16729), so discoverSprzedazYearCats() reads them from the tree by
//      slug: a "sprzedaz-nieruchomosci" parent node turns collection ON, each
//      following "<id>-YYYY-r" node is one of its year categories. New years are
//      picked up automatically; the two sibling parents ("Zamówienia Publiczne",
//      "Pozostałe przetargi") are never collected.
//   2. Each year category is paginated `?strona=N` (0-indexed; N past the last
//      page CLAMPS to the last, so pagination stops when a page's article-id set
//      repeats — collectArticleUrls()). Article hrefs are
//      `/63-przetargi/<catId>-YYYY-r/<artId>-<slug>.html`.
//
// DETAIL FETCHING is bounded (see config.js SCOPE): a detail page is fetched for
//   - every FLAT article (slug contains "lokal…mieszkaln") across the whole
//     recent-year window — this is the flat listing AND flat result stream, and
//     it is tiny (~1 flat/year); the slug is used ONLY to pick the fetch bucket,
//     never to decide kind (parse.js classifies on the BODY, per ADAPTER-GUIDE),
//   - every CURRENT-YEAR article (any kind) — to catch active LAND auctions for
//     land.json without OCR (their bodies are inline HTML).
// Historical land details are NOT fetched (concluded; land achieved-prices are
// out of scope — OCRing ~180 scanned land result PDFs per run is infeasible on
// the Pi). One request/second is enforced by getText's throttle in core/fetch.js.
//
// RESULTS: each concluded flat's detail page carries a scanned "Informacja o
// wyniku przetargu" / "Wynik przetargu" PDF. crawlResultDocs() finds it
// (findResultPdfHref), OCRs it via core/ocr-pdf.js (tesseract -l pol @300dpi —
// the embedded text layer is garbled, fresh OCR is clean), and hands the text to
// parseResultDoc through `ref.text` (source: 'html').

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseAnnouncement, findResultPdfHref } from './parse.js';

const HOST = 'https://bip.kolbuszowa.pl';
const BOARD_URL = `${HOST}/63-przetargi.html`;

// Recency window + safety caps. Results floor is the pipeline's 2020 (see
// refresh.js); 6 years back from the current year covers it plus every active
// auction. Pagination and detail counts are bounded so the CI job can't hang on
// a runaway archive.
const YEARS_BACK = 6;
const MAX_PAGES_PER_YEAR = 12;
const MAX_DETAILS = 100;

const FLAT_SLUG_RE = /lokal\w*-mieszkaln|lokalu-mieszkaln/i;

/**
 * Read the "Sprzedaż nieruchomości" per-year category pages out of the board
 * index nav tree.
 * @param {string} html
 * @returns {Array<{year:number, id:number, url:string}>}
 */
export function discoverSprzedazYearCats(html) {
  const byYear = new Map();
  let inSprzedaz = false;
  for (const m of (html || '').matchAll(/href="(\/63-przetargi\/(\d+)-([^"]*?))\.html"/gi)) {
    const path = m[1];
    const id = Number(m[2]);
    const slug = m[3];
    const yearM = /^(\d{4})-r$/.exec(slug);
    if (yearM) {
      if (inSprzedaz && !byYear.has(Number(yearM[1]))) {
        byYear.set(Number(yearM[1]), { year: Number(yearM[1]), id, url: `${HOST}${path}.html` });
      }
    } else {
      // A parent/category node — flip collection on iff it's the sales parent.
      inSprzedaz = /sprzedaz-nieruchomosci/i.test(slug);
    }
  }
  return [...byYear.values()];
}

/**
 * Paginate one year category, collecting its article URLs. Stops at the clamp
 * (a repeated article set) or the page cap.
 * @param {{year:number, id:number}} cat
 * @returns {Promise<Array<{id:number, url:string, year:number, isFlat:boolean}>>}
 */
async function collectArticleUrls(cat) {
  const arts = new Map();
  let prevSig = null;
  const re = new RegExp(`/63-przetargi/${cat.id}-${cat.year}-r/(\\d+)-[^"]*?\\.html`, 'g');
  for (let p = 0; p < MAX_PAGES_PER_YEAR; p++) {
    const url = `${HOST}/63-przetargi/${cat.id}-${cat.year}-r.html?strona=${p}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  kolbuszowa: year ${cat.year} page ${p} fetch failed: ${err.message}`);
      break;
    }
    const found = [...html.matchAll(re)];
    const ids = found.map((f) => f[1]).sort();
    const sig = ids.join(',');
    if (ids.length === 0 || sig === prevSig) break; // empty or clamped → done
    prevSig = sig;
    for (const f of found) {
      const id = Number(f[1]);
      if (arts.has(id)) continue;
      const artUrl = `${HOST}${f[0]}`;
      arts.set(id, { id, url: artUrl, year: cat.year, isFlat: FLAT_SLUG_RE.test(artUrl) });
    }
  }
  return [...arts.values()];
}

// ---------------------------------------------------------------------------
// Memoized discovery — crawlActive() and crawlResultDocs() are each called once
// per refresh.js run and share this single fetch+parse pass.
// ---------------------------------------------------------------------------

let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;
  const currentYear = new Date().getFullYear();

  let boardHtml;
  try {
    boardHtml = await getText(BOARD_URL);
  } catch (err) {
    console.error(`  kolbuszowa: board index fetch failed (${BOARD_URL}): ${err.message}`);
    _cache = [];
    return _cache;
  }
  const cats = discoverSprzedazYearCats(boardHtml)
    .filter((c) => c.year >= currentYear - YEARS_BACK)
    .sort((a, b) => b.year - a.year);
  console.error(`  kolbuszowa: ${cats.length} Sprzedaż-nieruchomości year categor(y/ies) in window [${cats.map((c) => c.year).join(',')}]`);

  const articles = [];
  for (const cat of cats) {
    const arts = await collectArticleUrls(cat);
    articles.push(...arts);
  }

  // Fetch details: all flats first (guaranteed within the cap), then this year's
  // articles (active-land coverage). See file header for the rationale.
  const flatArts = articles.filter((a) => a.isFlat);
  const currentYearArts = articles.filter((a) => !a.isFlat && a.year === currentYear);
  const toFetch = [...flatArts, ...currentYearArts].slice(0, MAX_DETAILS);
  console.error(
    `  kolbuszowa: ${articles.length} article(s) discovered; fetching ${toFetch.length} detail(s) ` +
    `(${flatArts.length} flat-tagged + ${currentYearArts.length} current-year land/other)`,
  );

  const records = [];
  for (const a of toFetch) {
    let html;
    try {
      html = await getText(a.url);
    } catch (err) {
      console.error(`  kolbuszowa detail fetch failed (${a.url}): ${err.message}`);
      continue;
    }
    const parsed = parseAnnouncement(html, a.url);
    if (parsed.cancelled) {
      console.error(`  kolbuszowa cancelled, skipping: ${a.url}`);
      continue;
    }
    const resultPdfHref = findResultPdfHref(html);
    // Drop a subject-less record UNLESS it's a flat whose result PDF we can still
    // OCR: the older flat announcements ship their body only as a PDF (empty
    // inline text → no inline subject), but the concluded "Informacja o wyniku"
    // PDF carries the full address, so parseResultDoc recovers it downstream.
    if (!parsed.address && !parsed.dzialka_nr && !(a.isFlat && resultPdfHref)) {
      console.error(`  kolbuszowa no subject (kind=${parsed.kind}): ${a.url}`);
      continue;
    }
    records.push({ ...a, ...parsed, resultPdfHref });
  }
  console.error(`  kolbuszowa: ${records.length} record(s) parsed`);
  _cache = records;
  return records;
}

// ---------------------------------------------------------------------------
// crawlActive()
// ---------------------------------------------------------------------------

/** @returns {Promise<{ listings: Array<object>, wykaz: [], land: [] }>} */
export async function crawlActive() {
  const today = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();

  const listings = [];
  for (const r of records) {
    if (!r.auction_date || r.auction_date < today) continue; // only genuinely upcoming
    if (!r.address && !r.dzialka_nr) continue; // skip subject-less (PDF-only) records kept for the result stream
    listings.push({
      kind: r.kind,
      address_raw: r.address_raw,
      address: r.address,
      dzialka_nr: r.dzialka_nr,
      obreb: r.obreb,
      area_m2: r.area_m2,
      starting_price_pln: r.starting_price_pln,
      auction_date: r.auction_date,
      round: r.round,
      detail_url: r.detail_url,
      published_date: r.published_date,
    });
  }
  console.error(`  kolbuszowa active: ${listings.length} upcoming listing(s)`);
  // grunt records ride along in `listings`; refresh.js partitions them → land.json.
  return { listings, wykaz: [], land: [] };
}

// ---------------------------------------------------------------------------
// crawlResultDocs() — flat achieved-price stream (OCR)
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:string|null}>>}
 */
export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = [];
  for (const r of records) {
    if (r.kind !== 'mieszkalny' || !r.resultPdfHref) continue; // flats with a result PDF only
    const pdfUrl = r.resultPdfHref.startsWith('http') ? r.resultPdfHref : `${HOST}${r.resultPdfHref}`;
    let text;
    try {
      text = await ocrPdf(pdfUrl);
    } catch (err) {
      console.error(`  kolbuszowa result OCR failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    refs.push({ text, pdf_url: pdfUrl, auction_date: r.auction_date });
  }
  console.error(`  kolbuszowa crawlResultDocs: ${refs.length} flat result doc(s)`);
  return refs;
}

// ---------------------------------------------------------------------------
// CLI harness (manual testing: node crawl.js [active|results])
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n');
  } else {
    const { listings } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s)`);
  }
}
