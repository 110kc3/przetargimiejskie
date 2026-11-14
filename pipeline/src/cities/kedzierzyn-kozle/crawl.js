
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncement, parseResultDoc, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.kedzierzynkozle.pl';

const MASTER_MENUS = ['/artykuly/85/gospodarowanie-w-tym-obrot-nieruchomosciami-gminnymi'];

const SEED_TABLES = [
  '/artykul/85/27668/sprzedaz-lokali-mieszkalnych-i-uzytkowych-w-trybie-przetargowym-rok-2025',
  '/artykul/85/27666/sprzedaz-nieruchomosci-gruntowych-w-trybie-przetargowym-rok-2025',
];

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

function discoverMasterTables(html) {
  const out = new Set();
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

function articleLinksFromTable(html) {
  const out = [];
  const seen = new Set();
  const re = /\/artykul\/127\/(\d+)\/([a-z0-9-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [id, slug] = [m[1], m[2]];
    if (seen.has(id)) continue;
    if (/wykaz/.test(slug) || /dzierzaw|najem/.test(slug)) continue;
    if (!/wynik|ogloszeni|przetarg/.test(slug)) continue;
    seen.add(id);
    out.push({ id, slug });
  }
  return out;
}

function pdfAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="([^"]*\/attachments\/download\/\d+)"[^>]*>\s*([^<]*?)\s*</gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = abs(m[1]);
    const name = (m[2] || '').replace(/\s+/g, ' ').trim();
    if (/skan/i.test(name)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, name });
  }
  return out;
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const tables = new Set(SEED_TABLES);
  for (const menu of MASTER_MENUS) {
    for (const t of discoverMasterTables(await fetchHtml(menu))) tables.add(t);
  }

  const articles = new Map();
  for (const t of tables) {
    for (const a of articleLinksFromTable(await fetchHtml(t))) if (!articles.has(a.id)) articles.set(a.id, a);
  }
  for (const a of SEED_ARTICLES) if (!articles.has(a.id)) articles.set(a.id, a);

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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleLand: land[0] },
      null,
      2,
    ) + '\n',
  );
}
