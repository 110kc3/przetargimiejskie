import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAddress } from '../../core/normalize.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import { isResultNotice, parseResultDoc } from './parse.js';

const ORIGIN = 'https://bip.um.walbrzych.pl';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';


const PER_PAGE = 25;
const MAX_PAGES = 60;

const boardUrl = (page) => `${ORIGIN}/przetargi-nieruchomosci/${page}/${PER_PAGE}`;

export function normalizeBoardAddress(raw) {
  return String(raw || '')
    .trim()
    .replace(/^Wa[łl]brzych,?\s*/i, '')
    .replace(/^przy\s+/i, '')
    .replace(/\s*,?\s*obr[eę]b\b.*$/i, '')
    .replace(/^ul\.\s+gen\.\s+(?:W\.\s*)?Andersa\b/i, 'ul. Andersa')
    .trim();
}

export function parseBoardPage(html) {
  const results = [];


  const articleRe = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[0];

    const hrefM = /href="(?:https?:\/\/[^"\/]+)?(\/przetarg-nieruchomosci\/[^"]+)"/.exec(block);
    if (!hrefM) continue;
    const detailUrl = ORIGIN + hrefM[1];

    const kindM = /Rodzaj nieruchomo[śs]ci<\/[^>]+>\s*<[^>]+>([^<]+)</.exec(block);
    const sourceKind = kindM ? kindM[1].trim().toLowerCase() : '';
    if (!sourceKind.includes('lokal mieszkalny')) continue;
    const kind = 'mieszkalny';

    const addrM = /Adres nieruchomo[śs]ci<\/[^>]+>\s*<[^>]+><a[^>]*>([^<]+)<\/a>/.exec(block);
    const addrRaw = addrM ? normalizeBoardAddress(addrM[1]) : '';

    const priceM = /Cena wywo[łl]awcza<\/[^>]+>\s*<[^>]+>([^<]+)</.exec(block);
    const priceStr = priceM ? priceM[1].trim() : '';
    const priceNum = priceStr ? Number(priceStr.replace(/[\s.]/g, '').replace(',', '.').replace(/[^0-9.]/g, '')) : null;
    const starting_price_pln = Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum) : null;

    const dateM = /Data przetargu[\s\S]{0,200}?<strong>(\d{2})\.(\d{2})\.(\d{4})<\/strong>/.exec(block);
    const auction_date = dateM ? `${dateM[3]}-${dateM[2]}-${dateM[1]}` : null;

    const address = parseAddress(addrRaw);
    results.push({ detail_url: detailUrl, address, address_raw: addrRaw, kind, starting_price_pln, auction_date });
  }

  return results;
}

async function crawlListings() {
  const listings = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      html = await getText(boardUrl(page), { userAgent: BROWSER_UA, retries: 1 });
    } catch (err) {
      console.error(`  walbrzych board page ${page}: ${err.message}`);
      break;
    }
    const cards = parseBoardPage(html);
    if (cards.length === 0) break;
    for (const c of cards) listings.push(c);
    if (cards.length < PER_PAGE && !html.includes('następna strona')) break;
  }
  console.error(`  walbrzych: ${listings.length} active flat listing(s) found`);
  return listings;
}


const YEAR_PAGES = [
  { year: 2026, url: `${ORIGIN}/artykuly/3300/2026-rok` },
  { year: 2025, url: `${ORIGIN}/artykuly/3128/2025-rok` },
  { year: 2024, url: `${ORIGIN}/artykuly/2893/2024-rok` },
  { year: 2023, url: `${ORIGIN}/artykuly/2631/2023-rok` },
  { year: 2022, url: `${ORIGIN}/artykuly/2370/2022-rok` },
];

export function parseMonthUrls(html) {
  const urls = [];
  const re = /href="(?:https?:\/\/[^"\/]+)?(\/artykuly\/\d+\/(?:styczen|luty|marzec|kwiecien|maj|czerwiec|lipiec|sierpien|wrzesien|pazdziernik|listopad|grudzien))"/gi;
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = ORIGIN + m[1];
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

export function parseArticleUrls(html) {
  const urls = [];
  const re = /href="(?:https?:\/\/[^"\/]+)?(\/artykul\/\d+\/\d+\/[^"]+)"/gi;
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = ORIGIN + m[1];
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

export function parsePdfUrl(html) {
  const tagged = /<a\b(?=[^>]*\bid="attachments-title")[^>]*\bhref="(?:https?:\/\/[^"\/]+)?(\/attachments\/download\/\d+)"/i.exec(html);
  if (tagged) return ORIGIN + tagged[1];

  const headingAt = (html || '').search(/<h2[^>]*>\s*Za[łl][ąa]czniki\s*<\/h2>/i);
  if (headingAt >= 0) {
    const section = html.slice(headingAt, headingAt + 20_000);
    const inSection = /href="(?:https?:\/\/[^"\/]+)?(\/attachments\/download\/\d+)"/i.exec(section);
    if (inSection) return ORIGIN + inSection[1];
  }

  const legacy = /href="(?:https?:\/\/[^"\/]+)?(\/attachments\/download\/\d+)"[^>]*>[^<]*<\/a>\s*pdf,/i.exec(html);
  return legacy ? ORIGIN + legacy[1] : null;
}

async function crawlResultDocs() {
  const refs = [];
  refs.complete = true;
  const started = Date.now();
  const budget = Number(process.env.WALBRZYCH_CRAWL_BUDGET_MS) || 120000;
  const overBudget = () => Date.now() - started >= budget;
  const known = await loadKnownSourceUrls('walbrzych');
  const seenMonthUrls = new Set();
  const seenArticleUrls = new Set();
  const seenPdfUrls = new Set();

  years: for (const { year, url: yearUrl } of YEAR_PAGES) {
    if(overBudget()){refs.complete=false;break;}
    let yearHtml;
    try {
      yearHtml = await getText(yearUrl, { userAgent: BROWSER_UA, retries: 1 });
    } catch (err) {
      refs.complete=false;
      console.error(`  walbrzych year ${year}: ${err.message}`);
      continue;
    }

    const monthUrls = parseMonthUrls(yearHtml);
    if (monthUrls.length === 0) {
      refs.complete=false;
      console.error(`  walbrzych year ${year}: no month pages found`);
      continue;
    }

    for (const monthUrl of monthUrls) {
      if(overBudget()){refs.complete=false;break years;}
      if (seenMonthUrls.has(monthUrl)) continue;
      seenMonthUrls.add(monthUrl);
      let monthHtml;
      try {
        monthHtml = await getText(monthUrl, { userAgent: BROWSER_UA, retries: 1 });
      } catch (err) {
        refs.complete=false;
        console.error(`  walbrzych month ${monthUrl}: ${err.message}`);
        continue;
      }

      const articleUrls = parseArticleUrls(monthHtml);
      for (const articleUrl of articleUrls) {
        if(overBudget()){refs.complete=false;break years;}
        if (seenArticleUrls.has(articleUrl) || known.has(articleUrl)) continue;
        seenArticleUrls.add(articleUrl);
        let articleHtml;
        try {
          articleHtml = await getText(articleUrl, { userAgent: BROWSER_UA, retries: 1 });
        } catch (err) {
          refs.complete=false;
          console.error(`  walbrzych article ${articleUrl}: ${err.message}`);
          continue;
        }

        const pdfUrl = parsePdfUrl(articleHtml);
        if (!pdfUrl) {
          console.error(`  walbrzych: no PDF attachment on ${articleUrl}`);
          continue;
        }
        if (seenPdfUrls.has(pdfUrl) || known.has(pdfUrl)) continue;
        seenPdfUrls.add(pdfUrl);

        let text;
        try {
          text = await pdfText(pdfUrl, { userAgent: BROWSER_UA, retries: 1 });
          if (!text.trim()) text = await ocrPdf(pdfUrl, { userAgent: BROWSER_UA });
        } catch (err) {
          refs.complete=false;
          console.error(`  walbrzych: PDF extract failed ${pdfUrl}: ${err.message}`);
          continue;
        }

        if (!isResultNotice(text)) {
          refs.complete=false;
          console.error(`  walbrzych: unexpected non-result PDF at ${pdfUrl} — skipped`);
          continue;
        }

        refs.push({ text, pdf_url: pdfUrl, detail_url: articleUrl, auction_date: null });
      }
    }
  }

  console.error(`  walbrzych: ${refs.length} result notice PDF(s) found; complete=${refs.complete}`);
  return refs;
}


export async function crawlActive() {
  const listings = await crawlListings();
  return { listings, wykaz: [], land: [] };
}

export { crawlResultDocs };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  const results = await crawlResultDocs();
  process.stdout.write(
    JSON.stringify(
      { listings: listings.length, results: results.length, sampleListing: listings[0] },
      null,
      2,
    ) + '\n',
  );
}
