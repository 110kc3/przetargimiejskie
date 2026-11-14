import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { parseAnnouncement, parseResultDoc, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.glubczyce.pl';

const ANN_BOARDS = [
  '/144/ogloszenia-burmistrza-glubczyc-o-przetargach-i-rokowaniach-na-sprzedaz-nieruchomosci.html',
];
const RES_BOARDS = [
  '/145/informacje-o-wynikach-przetargow-na-sprzedaz-i-oddanie-w-dzierzawenajem-nieruchomosci.html',
];

const abs = (p) => (/^https?:/i.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url));
  } catch (err) {
    console.error(`  glubczyce: fetch failed ${url}: ${err.message}`);
    return '';
  }
}

export function harvestAttachments(html) {
  const byId = new Map();
  const re = /href="([^"]+?)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/gi, '&');
    const mm = /\/download\/(?:attachment\/)?\/?(\d+)\/[^?"]*?\.(pdf|docx|doc)\b/i.exec(href);
    if (!mm) continue;
    const id = Number(mm[1]);
    if (!byId.has(id)) byId.set(id, { url: abs(href), id, ext: mm[2].toLowerCase() });
  }
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

async function extractText(att) {
  try {
    return att.ext === 'pdf' ? await pdfText(att.url) : await docText(att.url);
  } catch (err) {
    console.error(`  glubczyce: extract failed ${att.url}: ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const deadline = Date.now() + (Number(process.env.GBZ_CRAWL_BUDGET_MS) || 12 * 60 * 1000);
  const perBoard = Number(process.env.GBZ_MAX_DOCS) || 50;

  let annAtts = [];
  for (const b of ANN_BOARDS) annAtts.push(...harvestAttachments(await fetchHtml(b)));
  annAtts = dedupe(annAtts).slice(0, perBoard);
  for (const att of annAtts) {
    if (Date.now() > deadline) {
      console.error(`  glubczyce: crawl budget reached (announcements); remainder backfills next run`);
      break;
    }
    const text = await extractText(att);
    if (!text || isResultNotice(text)) continue;
    const rec = parseAnnouncement(text, att.url);
    if (!rec) continue;
    const enriched = { ...rec, detail_url: att.url, source_url: att.url };
    (rec.kind === 'grunt' ? land : listings).push(enriched);
  }

  let resAtts = [];
  for (const b of RES_BOARDS) resAtts.push(...harvestAttachments(await fetchHtml(b)));
  resAtts = dedupe(resAtts).slice(0, perBoard);
  for (const att of resAtts) {
    if (Date.now() > deadline) {
      console.error(`  glubczyce: crawl budget reached (results); remainder backfills next run`);
      break;
    }
    const text = await extractText(att);
    if (!text || !isResultNotice(text)) continue;
    resultRefs.push({ text, pdf_url: att.url, detail_url: att.url, auction_date: null });
  }

  console.error(
    `  glubczyce: ${listings.length} flat/house/commercial listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
  );
  return { listings, land, resultRefs };
}

function dedupe(atts) {
  const seen = new Set();
  const out = [];
  for (const a of atts.sort((x, y) => y.id - x.id)) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
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
        sampleResult: results[0] && { ...results[0], text: results[0].text.slice(0, 120) + '…' },
      },
      null,
      2,
    ) + '\n',
  );
}
