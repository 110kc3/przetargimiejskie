import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncementPdf } from './parse.js';

const ORIGIN = 'https://bip.gdansk.pl';
const INDEX_URL = `${ORIGIN}/urzad-miejski/Ogloszenia-o-przetargach,a,1439`;
const INDEX_PATHNAME = new URL(INDEX_URL).pathname.toLowerCase();
const ANN_LINK_RE =
  /\/urzad-miejski\/(?:OGLOSZENIE|ogloszenie)[^"'\s]*,a,\d+/i;
const PDF_LINK_RE =
  /https?:\/\/download\.cloudgdansk\.pl\/gdansk-pl\/d\/[^"'\s)]+\.pdf/gi;
const ARTICLE_FILE_ANCHOR_RE = /<a\b[^>]*class="[^"]*\barticle-file\b[^"]*"[^>]*>/gi;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: BROWSER_UA };

export function parseIndexLinks(html) {
  const seen = new Set();
  const out = [];
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/gi, '&');
    if (!ANN_LINK_RE.test(href)) continue;
    if (!/^https?:/i.test(href)) href = ORIGIN + (href.startsWith('/') ? '' : '/') + href;
    try {
      const candidate = new URL(href);
      if (candidate.origin === ORIGIN && candidate.pathname.toLowerCase() === INDEX_PATHNAME) {
        continue;
      }
    } catch {
      continue;
    }
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

export function parsePdfUrl(html) {
  const source = String(html || '');
  for (const anchor of source.match(ARTICLE_FILE_ANCHOR_RE) || []) {
    const pdf = anchor.match(PDF_LINK_RE)?.[0];
    if (pdf) return pdf;
  }
  const pdfs = source.match(PDF_LINK_RE) || [];
  return pdfs.find((url) => /\/ogloszeni[^/]*przetarg/i.test(url)) || null;
}

export async function crawlActive() {
  const listings = [];

  let indexHtml;
  try {
    indexHtml = await getText(INDEX_URL, FETCH_OPTS);
  } catch (err) {
    console.error(`  gdansk index fetch failed: ${err.message}`);
    return { listings, wykaz: [], land: [] };
  }
  const articleUrls = parseIndexLinks(indexHtml);
  console.error(`  gdansk: ${articleUrls.length} announcement article(s) on index`);

  for (const articleUrl of articleUrls) {
    let articleHtml;
    try {
      articleHtml = await getText(articleUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  gdansk article fetch failed (${articleUrl}): ${err.message}`);
      continue;
    }
    const pdfUrl = parsePdfUrl(articleHtml);
    if (!pdfUrl) {
      console.error(`  gdansk WARN: no PDF attachment on ${articleUrl}`);
      continue;
    }
    let text;
    try {
      text = await pdfText(pdfUrl, FETCH_OPTS);
    } catch (err) {
      console.error(`  gdansk PDF extract failed (${pdfUrl}): ${err.message}`);
      continue;
    }
    const recs = parseAnnouncementPdf(text, {
      detail_url: articleUrl,
      source_url: pdfUrl,
    });
    if (recs.length === 0) {
      console.error(`  gdansk WARN: 0 properties parsed from ${pdfUrl}`);
    }
    listings.push(...recs);
    console.error(`  gdansk: ${recs.length} propert(y/ies) parsed from ${pdfUrl}`);
  }

  console.error(
    `  gdansk: ${listings.length} total listing(s) from ${articleUrls.length} article(s)`,
  );
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ count: listings.length, listings }, null, 2) + '\n');
}
