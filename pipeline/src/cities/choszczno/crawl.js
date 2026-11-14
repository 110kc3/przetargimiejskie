import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { buildRecordText, parseAnnouncement, hasResolution } from './parse.js';

const ORIGIN = 'https://bip.choszczno.pl';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

const YEARS_BACK = 8;
const WALL_CLOCK_BUDGET_MS = 10 * 60 * 1000;

const LEASE_TITLE_RE = /dzier[żz]aw|\bnajem\b/i;
const STREET_TITLE_RE = /\b(?:ul|al|pl|os)\.?\s+\S/i;

export function parseListRows(html) {
  if (!html) return [];
  const out = [];
  const tbodyM = /<tbody>([\s\S]*?)<\/tbody>/i.exec(html);
  const body = tbodyM ? tbodyM[1] : html;
  const re = /<tr>\s*<td>\s*<a href="([^"]+)">([\s\S]*?)<\/td>\s*<td>\s*([^<]*?)\s*<\/td>/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    const href = m[1];
    const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const publishedRaw = m[3].trim();
    out.push({
      href: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      title,
      published_at: publishedRaw ? publishedRaw.slice(0, 10) : null,
    });
  }
  return out;
}

export function parseYearLinks(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"/]+)?\/artykul\/ogloszenia-(\d{4})-r)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, href, year] = m;
    if (seen.has(year)) continue;
    seen.add(year);
    out.push({ year: Number(year), url: href.startsWith('http') ? href : `${ORIGIN}${href}` });
  }
  return out.sort((a, b) => b.year - a.year);
}

export function findPrzetargiHref(rows) {
  const row = rows.find((r) => /^przetargi$/i.test(r.title));
  return row ? row.href : null;
}

export function parseAttachments(html) {
  if (!html) return [];
  const out = [];
  const re = /<a href="(\/pliki\/[^"]+\.pdf)"[^>]*class="download"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    out.push({ url: `${ORIGIN}${href}`, filename: href.split('/').pop() });
  }
  return out;
}

function h1Title(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
}

async function attachmentText(url) {
  try {
    const t = await pdfText(url, { userAgent: BROWSER_UA });
    if (t.replace(/\s+/g, '').length >= 60) return t;
  } catch {}
  try {
    return await ocrPdf(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  choszczno: OCR failed on ${url}: ${err.message}`);
    return '';
  }
}

async function fetchCase(row) {
  let html;
  try {
    html = await getText(row.href, FETCH_OPTS);
  } catch (err) {
    console.error(`  choszczno: article fetch failed (${row.href}): ${err.message}`);
    return null;
  }
  const title = h1Title(html) || row.title;
  const attachments = parseAttachments(html);
  const oglAtt = attachments.filter((a) => /^ogloszenie/i.test(a.filename));
  const infAtt = attachments.filter((a) => /^informacja/i.test(a.filename));
  if (oglAtt.length === 0 && infAtt.length === 0) {
    console.error(`  choszczno: no ogłoszenie/informacja attachment on ${row.href}`);
    return null;
  }

  let ogloszenie = '';
  for (const a of oglAtt) ogloszenie += (ogloszenie ? '\n' : '') + (await attachmentText(a.url));
  let informacja = '';
  for (const a of infAtt) informacja += (informacja ? '\n' : '') + (await attachmentText(a.url));

  const text = buildRecordText({ title, ogloszenie, informacja });
  const pdf_url = infAtt[0]?.url || oglAtt[0]?.url || row.href;
  return { text, articleUrl: row.href, pdf_url };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];
  const started = Date.now();

  let yearLinks;
  try {
    const html = await getText(`${ORIGIN}/artykul/ogloszenia`, FETCH_OPTS);
    yearLinks = parseYearLinks(html).slice(0, YEARS_BACK);
  } catch (err) {
    console.error(`  choszczno: year index fetch failed: ${err.message}`);
    return { listings, land, resultRefs };
  }

  for (const { year, url } of yearLinks) {
    if (Date.now() - started > WALL_CLOCK_BUDGET_MS) {
      console.error('  choszczno: wall-clock budget reached, stopping year walk');
      break;
    }
    let yearHtml;
    try {
      yearHtml = await getText(url, FETCH_OPTS);
    } catch (err) {
      console.error(`  choszczno: year ${year} fetch failed: ${err.message}`);
      continue;
    }
    const przetargiHref = findPrzetargiHref(parseListRows(yearHtml));
    if (!przetargiHref) {
      console.error(`  choszczno: year ${year} has no "Przetargi" sub-board`);
      continue;
    }
    let boardHtml;
    try {
      boardHtml = await getText(przetargiHref, FETCH_OPTS);
    } catch (err) {
      console.error(`  choszczno: przetargi board fetch failed (year ${year}): ${err.message}`);
      continue;
    }

    for (const row of parseListRows(boardHtml)) {
      if (LEASE_TITLE_RE.test(row.title)) continue;
      if (!STREET_TITLE_RE.test(row.title)) continue;

      const rec = await fetchCase(row);
      if (!rec) continue;
      const { text, articleUrl, pdf_url } = rec;

      if (hasResolution(text)) {
        resultRefs.push({ text, auction_date: row.published_at, pdf_url });
        continue;
      }

      const parsed = parseAnnouncement(text);
      if (!parsed) continue;
      const enriched = { ...parsed, detail_url: articleUrl, source_url: articleUrl };
      (parsed.kind === 'grunt' ? land : listings).push(enriched);
    }
  }

  console.error(
    `  choszczno: ${listings.length} flat/building listing(s), ${land.length} land plot(s), ${resultRefs.length} result record(s)`,
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
      { listings: listings.length, land: land.length, results: results.length, sampleListing: listings[0], sampleResult: results[0] },
      null,
      2,
    ) + '\n',
  );
}
