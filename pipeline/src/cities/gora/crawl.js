import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { docText } from '../../core/doc-text.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAnnouncement, isResultNotice } from './parse.js';

const ORIGIN = 'https://bip.gora.com.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ANN_BOARD = '/233-przetargi.html';
const RES_BOARD = '/wyniki-przetargow.html';

const CRAWL_BUDGET_MS = Number(process.env.GORA_CRAWL_BUDGET_MS) || 10 * 60 * 1000;

const abs = (p) => (/^https?:/i.test(p) ? p : `${ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`);

async function fetchHtml(url) {
  try {
    return await getText(abs(url), { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gora: board fetch failed ${url}: ${err.message}`);
    return '';
  }
}

export function harvestAttachments(html) {
  const byId = new Map();
  const re = /href="([^"]*files\/file_add\/download\/(\d+)_([^"?]*?)\.(pdf|docx|doc)\b[^"]*)"/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const href = m[1].replace(/&amp;/gi, '&');
    const id = Number(m[2]);
    if (!byId.has(id)) {
      byId.set(id, { url: abs(href), id, slug: m[3].toLowerCase(), ext: m[4].toLowerCase() });
    }
  }
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

export function isFlatSlug(slug) {
  return classifyKind(String(slug || '').replace(/[-_]+/g, ' ')) === 'mieszkalny';
}

async function extractText(att) {
  try {
    return att.ext === 'pdf'
      ? await pdfText(att.url, { userAgent: BROWSER_UA })
      : await docText(att.url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  gora: extract failed ${att.url}: ${err.message}`);
    return '';
  }
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const resultRefs = [];
  const deadline = Date.now() + CRAWL_BUDGET_MS;

  const resAtts = harvestAttachments(await fetchHtml(RES_BOARD)).filter((a) => isFlatSlug(a.slug));
  for (const att of resAtts) {
    if (Date.now() > deadline) { console.error('  gora: crawl budget reached (results)'); break; }
    const text = await extractText(att);
    if (!text || !isResultNotice(text)) continue;
    resultRefs.push({ text, pdf_url: att.url, detail_url: att.url, auction_date: null });
  }

  const annHtml = await fetchHtml(ANN_BOARD);
  const annAtts = harvestAttachments(annHtml).filter((a) => isFlatSlug(a.slug));
  let annParsedAll = true;
  for (const att of annAtts) {
    if (Date.now() > deadline) {
      console.error('  gora: crawl budget reached (announcements)');
      annParsedAll = false;
      break;
    }
    const text = await extractText(att);
    if (!text) {
      annParsedAll = false;
      continue;
    }
    const rec = parseAnnouncement(text, att.url);
    if (rec) listings.push(rec);
  }

  console.error(`  gora: ${listings.length} flat listing(s), ${resultRefs.length} flat result notice(s)`);
  const valid_empty = Boolean(annHtml && annParsedAll && listings.length === 0);
  const valid_empty_land = false;
  return { listings, resultRefs, valid_empty, valid_empty_land };
}

export async function crawlResultDocs() {
  crawlPromise ??= crawlAll();
  return (await crawlPromise).resultRefs;
}

export async function crawlActive() {
  crawlPromise ??= crawlAll();
  const { listings, valid_empty, valid_empty_land } = await crawlPromise;
  return { listings, wykaz: [], land: [], valid_empty: Boolean(valid_empty), valid_empty_land: Boolean(valid_empty_land) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      {
        listings: listings.length,
        results: results.length,
        sampleListing: listings[0] || null,
        sampleResult: results[0]
          ? { pdf_url: results[0].pdf_url, text: results[0].text.slice(0, 100) + '…' }
          : null,
      },
      null,
      2,
    ) + '\n',
  );
}
