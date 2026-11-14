
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { parseAnnouncement, findResultPdfHref } from './parse.js';

const HOST = 'https://bip.kolbuszowa.pl';
const BOARD_URL = `${HOST}/63-przetargi.html`;

const YEARS_BACK = 6;
const MAX_PAGES_PER_YEAR = 12;
const MAX_DETAILS = 100;

const FLAT_SLUG_RE = /lokal\w*-mieszkaln|lokalu-mieszkaln/i;

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
      inSprzedaz = /sprzedaz-nieruchomosci/i.test(slug);
    }
  }
  return [...byYear.values()];
}

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
    if (ids.length === 0 || sig === prevSig) break;
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


export async function crawlActive() {
  const today = new Date().toISOString().slice(0, 10);
  const records = await discoverAll();

  const listings = [];
  for (const r of records) {
    if (!r.auction_date || r.auction_date < today) continue;
    if (!r.address && !r.dzialka_nr) continue;
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
  return { listings, wykaz: [], land: [] };
}


export async function crawlResultDocs() {
  const records = await discoverAll();
  const refs = [];
  for (const r of records) {
    if (r.kind !== 'mieszkalny' || !r.resultPdfHref) continue;
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
