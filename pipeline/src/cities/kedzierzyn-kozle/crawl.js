// Kędzierzyn-Koźle crawler — server-rendered Logonet BIP (no SPA, no OCR for the
// born-digital text PDFs). See config.js.
//
// Enumeration is anchored on the board-85 YEAR-INDEXED MASTER TABLES (the durable
// index): each table row links a board-127 Ogłoszenie + Wynik article. We collect
// every distinct announcement/result article from all master tables (+ a couple
// of current board-127 index articles as a safety net for brand-new items not yet
// folded into a table), then for each article fetch its HTML, select the NON-skan
// text PDF(s), extract text, and route by the PDF body header (announcement vs
// result — authoritative, like Tarnowskie Góry).
//
// One memoised pass serves both streams: refresh.js calls crawlResultDocs() then
// crawlActive(); both await the same crawl. source:'html' ⇒ result refs already
// carry `.text`.

import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncement, parseResultDoc, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.kedzierzynkozle.pl';

// Board-85 menu(s) that list the year-indexed master tables.
const MASTER_MENUS = ['/artykuly/85/gospodarowanie-w-tym-obrot-nieruchomosciami-gminnymi'];

// Known current master tables — seeds (auto-discovery from MASTER_MENUS adds
// prior-year + sibling tables: flats/commercial and land).
const SEED_TABLES = [
  '/artykul/85/27668/sprzedaz-lokali-mieszkalnych-i-uzytkowych-w-trybie-przetargowym-rok-2025',
  '/artykul/85/27666/sprzedaz-nieruchomosci-gruntowych-w-trybie-przetargowym-rok-2025',
];

// Defensive seeds: the current board-127 index articles (catch brand-new
// announcements/results not yet linked from a master table).
const SEED_ARTICLES = [
  { id: '29229', slug: 'ogloszenia-o-przetargach-ustnych-nieograniczonych' },
  { id: '30095', slug: 'informacje-o-wynikach-przetargow' },
];

const abs = (p) => (/^https?:/.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url));
  } catch (err) {
    console.error(`  kedzierzyn-kozle: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

/** Master-table article paths discovered on a board-85 menu page. */
function discoverMasterTables(html) {
  const out = new Set();
  // Bound the work: only the current + previous year's master tables. Deep
  // historical year-tables (rok-2019, …) would make the crawl fetch+extract a
  // PDF for hundreds of archived articles and blow the 25-min CI job timeout;
  // prior years are already retained in committed data by merge-history.
  const minYear = new Date().getFullYear() - 1;
  const re = /\/artykul\/85\/(\d+)\/([a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!/w-trybie-przetargow|trybie-przetargowym/.test(m[2])) continue;
    const ym = /rok-(\d{4})/.exec(m[2]);
    if (ym && Number(ym[1]) < minYear) continue;
    out.add(`/artykul/85/${m[1]}/${m[2]}`);
  }
  return [...out];
}

/** Distinct board-127 announcement/result articles linked from a master table. */
function articleLinksFromTable(html) {
  const out = [];
  const seen = new Set();
  const re = /\/artykul\/127\/(\d+)\/([a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [id, slug] = [m[1], m[2]];
    if (seen.has(id)) continue;
    if (/wykaz/.test(slug) || /dzierzaw|najem/.test(slug)) continue; // pre-announcements / rentals
    if (!/wynik|ogloszeni|przetarg/.test(slug)) continue;
    seen.add(id);
    out.push({ id, slug });
  }
  return out;
}

/** Non-skan PDF attachments on an article page: [{ url, name }]. The scanned
 *  twin ("… skan.pdf") is dropped — we parse the born-digital text PDF. */
function pdfAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="([^"]*\/attachments\/download\/\d+)"[^>]*>\s*([^<]*?)\s*</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = abs(m[1]);
    const name = (m[2] || '').replace(/\s+/g, ' ').trim();
    if (/skan/i.test(name)) continue; // OCR-garbled scanned twin
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, name });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = []; // address-keyed active records (flats / commercial)
  const land = []; // kind:'grunt' active records → land.json
  const resultRefs = []; // { text, pdf_url, detail_url, auction_date:null }

  // 1) Master tables: seeds + auto-discovery from the board-85 menu(s).
  const tables = new Set(SEED_TABLES);
  for (const menu of MASTER_MENUS) {
    for (const t of discoverMasterTables(await fetchHtml(menu))) tables.add(t);
  }

  // 2) Collect distinct announcement/result articles from every master table.
  const articles = new Map(); // id -> { id, slug }
  for (const t of tables) {
    for (const a of articleLinksFromTable(await fetchHtml(t))) if (!articles.has(a.id)) articles.set(a.id, a);
  }
  for (const a of SEED_ARTICLES) if (!articles.has(a.id)) articles.set(a.id, a);

  // 3) Process each article: select non-skan PDFs, extract text, route by body.
  // Hard bound so the CI job never blows its 25-min timeout (the failure that
  // cancelled refresh #88): a wall-clock budget + an article cap. Recent items
  // (seeds + current-year tables) are processed first; anything not reached
  // backfills on later runs — the text-PDF cache makes those fast and
  // merge-history retains prior results. Override via KK_CRAWL_BUDGET_MS / KK_MAX_ARTICLES.
  const deadline = Date.now() + (Number(process.env.KK_CRAWL_BUDGET_MS) || 12 * 60 * 1000);
  const maxArticles = Number(process.env.KK_MAX_ARTICLES) || 150;
  let processed = 0;
  for (const a of articles.values()) {
    if (processed >= maxArticles || Date.now() > deadline) {
      console.error(`  kedzierzyn-kozle: crawl budget reached (processed ${processed}/${articles.size}); stopping early — remainder backfills next run`);
      break;
    }
    processed++;
    const detail_url = abs(`/artykul/127/${a.id}/${a.slug}`);
    const html = await fetchHtml(detail_url);
    if (!html) continue;
    for (const att of pdfAttachments(html)) {
      let text;
      try {
        text = await pdfText(att.url);
      } catch (err) {
        console.error(`  kedzierzyn-kozle: PDF extract failed ${att.url}: ${err.message}`);
        continue;
      }
      if (isResultNotice(text)) {
        resultRefs.push({ text, pdf_url: att.url, detail_url, auction_date: null });
        continue;
      }
      const rec = parseAnnouncement(text);
      if (!rec) continue;
      const enriched = { ...rec, detail_url, source_url: att.url };
      (rec.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  kedzierzyn-kozle: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

/** Result notices (achieved-price stream). source:'html' ⇒ refs carry `.text`. */
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

if (import.meta.url === `file://${process.argv[1]}`) {
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
