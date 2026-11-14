
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncementPdf } from './parse.js';

const ORIGIN = 'https://bip.uml.lodz.pl';

const LISTING_PAGES = [
  `${ORIGIN}/urzad-miasta/przetargi/sprzedaz-nieruchomosci/`,
  `${ORIGIN}/urzad-miasta/przetargi/archiwum-przetargow/sprzedaz-nieruchomosci-archiwum/sprzedaz-nieruchomosci-archiwum-2024-r-1-1/`,
];

const ARTICLE_LINK_RE = /href="([^"]*\/ogloszenie[^"]+)"/g;
const ANN_PDF_TITLE_RE = /Tre[śs][ćc]\s+og[łl]oszenia/i;
const RESULT_PDF_TITLE_RE = /Informacja\s+o\s+wynikach/i;

function parseArticleLinks(html) {
  const urls = [];
  const seen = new Set();
  let m;
  ARTICLE_LINK_RE.lastIndex = 0;
  while ((m = ARTICLE_LINK_RE.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, '&');
    const abs = href.startsWith('http') ? href : `${ORIGIN}${href}`;
    if (!seen.has(abs)) { seen.add(abs); urls.push(abs); }
  }
  return urls;
}

export function parsePdfLinks(html) {
  const re = /<a[^>]*href="([^"]*\.pdf)"([^>]*)>([\s\S]{0,300}?)<\/a>/gi;
  let annPdfUrl = null;
  let resultPdfUrl = null;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const label = `${m[2]} ${m[3].replace(/<[^>]+>/g, ' ')}`;
    const abs = href.startsWith('http') ? href : `${ORIGIN}${href}`;
    if (ANN_PDF_TITLE_RE.test(label) && !annPdfUrl) annPdfUrl = abs;
    if (RESULT_PDF_TITLE_RE.test(label) && !resultPdfUrl) resultPdfUrl = abs;
  }
  return { annPdfUrl, resultPdfUrl };
}

let crawlPromise = null;

async function crawlAll() {
  const listings = [];
  const land = [];
  const resultRefs = [];

  const articleUrls = [];
  const seenUrls = new Set();
  for (const listingPage of LISTING_PAGES) {
    let html;
    try {
      html = await getText(listingPage);
    } catch (err) {
      console.error(`  lodz listing fetch failed (${listingPage}): ${err.message}`);
      continue;
    }
    const links = parseArticleLinks(html);
    let added = 0;
    for (const u of links) {
      if (!seenUrls.has(u)) { seenUrls.add(u); articleUrls.push(u); added++; }
    }
    console.error(`  lodz listing ${listingPage}: ${links.length} article link(s) (${added} new)`);
  }
  console.error(`  lodz: ${articleUrls.length} candidate article(s) to inspect`);

  for (const articleUrl of articleUrls) {
    let html;
    try {
      html = await getText(articleUrl);
    } catch (err) {
      console.error(`  lodz article fetch failed (${articleUrl}): ${err.message}`);
      continue;
    }

    const { annPdfUrl, resultPdfUrl } = parsePdfLinks(html);
    if (!annPdfUrl) {
      console.error(`  lodz WARN: no announcement PDF on ${articleUrl}`);
      continue;
    }

    let annText;
    try {
      annText = await pdfText(annPdfUrl);
    } catch (err) {
      console.error(`  lodz ann PDF extract failed (${annPdfUrl}): ${err.message}`);
      continue;
    }

    const annRecords = parseAnnouncementPdf(annText, {
      detail_url: articleUrl,
      source_url: annPdfUrl,
    });
    for (const rec of annRecords) {
      if (rec.kind === 'grunt') land.push(rec);
      else listings.push(rec);
    }

    if (resultPdfUrl) {
      let resultText;
      try {
        resultText = await pdfText(resultPdfUrl);
      } catch (err) {
        console.error(`  lodz result PDF extract failed (${resultPdfUrl}): ${err.message}`);
        continue;
      }
      resultRefs.push({
        text: resultText,
        pdf_url: resultPdfUrl,
        detail_url: articleUrl,
        auction_date: null, // parseResultDoc extracts from the PDF text
      });
    }
  }

  console.error(
    `  lodz: ${listings.length} flat/commercial listing(s), ${land.length} land plot(s), ${resultRefs.length} result notice(s)`,
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
