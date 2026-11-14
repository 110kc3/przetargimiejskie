
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { parseAnnouncement, parseResultDoc as _parseResultDoc } from './parse.js';
import { classifyKind } from '../../core/classify-kind.js';
import { parseAddress } from '../../core/normalize.js';

const ORIGIN = 'https://bip.wejherowo.pl';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const RESULT_YEARS_BACK = 1;

function currentYear() {
  return new Date().getFullYear();
}

function annualPageUrl(year) {
  return `${ORIGIN}/artykul/przetargi-${year}-r`;
}


const ARTYKUL_LINK_RE = /<a\s[^>]*?href="(\/artykul\/[^"]+)"[^>]*>([^<]*)/gi;
const DATE_AFTER_RE = /(\d{4}-\d{2}-\d{2})/;

export function parseListPage(html) {
  if (!html) return [];
  ARTYKUL_LINK_RE.lastIndex = 0;
  const out = [];
  let m;
  while ((m = ARTYKUL_LINK_RE.exec(html)) !== null) {
    const href = m[1];
    const title = stripTags(m[2]);
    const afterPos = m.index + m[0].length;
    const rest = html.slice(afterPos, afterPos + 500);
    const dm = DATE_AFTER_RE.exec(rest);
    out.push({ href, title, published_date: dm ? dm[1] : null });
  }
  return out;
}


const ATTACH_RE = /href="(\/pliki\/wejherowo\/zalaczniki\/[^"]+\.pdf)"[^>]*>([^<]*)/gi;

export function resultPdfUrlFromArticle(html, base = ORIGIN) {
  ATTACH_RE.lastIndex = 0;
  let m;
  while ((m = ATTACH_RE.exec(html)) !== null) {
    const path = m[1];
    const label = m[2].toLowerCase();
    if (/wyniki/i.test(path) || /wyniki/i.test(label)) {
      return base + path;
    }
  }
  return null;
}


function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFlatTitle(title) {
  return /lokal\w*\s+mieszkaln/i.test(title);
}

function isSkippableTitle(title) {
  if (/nieruchomo[śs][śc][iy]\s+gruntow|dzia[łl][ck]|grunt/i.test(title) &&
      !/lokal\w*\s+mieszkaln/i.test(title)) return true;
  if (/najem|dzier[żz]aw|u[żz]ytkow[yea]/i.test(title) &&
      !/lokal\w*\s+mieszkaln/i.test(title)) return true;
  return false;
}

function isResolved(title) {
  return /przetarg\s+rozstrzygni[eę]t/i.test(title);
}


const ORDINAL_RE =
  /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t|sz[oó]st|si[oó]dm|[oó]sm|dziewi[ąa]t|dziesi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,50}))/g;
const ORDINAL_MAP = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4,
  'piąt': 5, piat: 5, 'sząst': 6, szost: 6, 'szóst': 6,
  'siódm': 7, siodm: 7, ósmm: 8, osm: 8,
  'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};

export function roundFromTitle(title) {
  const t = (title || '').toLowerCase();
  const m = /^(?:\[.*?\]\s*-?\s*)?(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[oó]st|si[oó]dm|[oó]sm)/i.exec(t);
  if (!m) return 1;
  const stem = m[1].toLowerCase()
    .replace(/ą/g, 'a').replace(/ó/g, 'o').replace(/ę/g, 'e');
  if (/^pierwsz/.test(stem)) return 1;
  if (/^drug/.test(stem)) return 2;
  if (/^trzeci/.test(stem)) return 3;
  if (/^czwart/.test(stem)) return 4;
  if (/^piat|^piąt/.test(stem)) return 5;
  if (/^szost|^szóst|^szosc/.test(stem)) return 6;
  if (/^siodm|^siódm/.test(stem)) return 7;
  if (/^osm|^ósm/.test(stem)) return 8;
  return 1;
}


const ADDR_FROM_TITLE_RE =
  /przy\s+(?:ul\.\s*|os\.\s*|Osiedlu\s+|al\.\s*|pl\.\s*)?(.+?)\s+(?:w\s+Wejherowie|,\s*o\s+powierzchni|i\s+gruntu)/i;

export function addressRawFromTitle(title) {
  const clean = title.replace(/^\[.*?\]\s*-?\s*/i, '').trim();
  const m = ADDR_FROM_TITLE_RE.exec(clean);
  if (!m) return null;
  const rawAddr = m[1].replace(/,\s*$/, '').trim();
  return rawAddr;
}

export function aptFromTitle(title) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(title);
  return m ? m[1] : null;
}


async function fetchAnnualPage(year) {
  const url = annualPageUrl(year);
  let html;
  try {
    html = await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wejherowo: annual page ${year} fetch failed: ${err.message}`);
    return [];
  }
  const stubs = parseListPage(html);
  const flat = stubs.filter(s => /przetarg/i.test(s.href) && !isSkippableTitle(s.title));
  console.error(`  wejherowo: ${year} page — ${stubs.length} total, ${flat.length} after filter`);
  return flat;
}

async function fetchArticle(stub) {
  const url = ORIGIN + stub.href;
  let html;
  try {
    html = await getText(url, { userAgent: BROWSER_UA });
  } catch (err) {
    console.error(`  wejherowo: article fetch failed (${stub.href}): ${err.message}`);
    return null;
  }

  const bodyText = stripTags(html);
  const parsed = parseAnnouncement(bodyText);

  let address = parsed.address;
  if (!address) {
    const aptNo = aptFromTitle(stub.title);
    const addrRaw = addressRawFromTitle(stub.title);
    if (addrRaw && aptNo) {
      address = parseAddress(`${addrRaw}/${aptNo}`);
      if (!address) address = parseAddress(addrRaw);
    }
  }
  if (!address) {
    console.error(`  wejherowo: could not parse address from "${stub.title.slice(0, 80)}"`);
    return null;
  }

  const kind = classifyKind(stub.title);
  const resolved = isResolved(stub.title);
  const pdfUrl = resolved ? resultPdfUrlFromArticle(html) : null;

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: stub.title,
    address,
    round: parsed.round ?? roundFromTitle(stub.title),
    published_date: stub.published_date,
    auction_date: parsed.auction_date,
    area_m2: parsed.area_m2,
    starting_price_pln: parsed.starting_price_pln,
    detail_url: url,
    result_pdf_url: pdfUrl,
  };
}


export async function crawlActive() {
  const year = currentYear();
  const stubs = await fetchAnnualPage(year);

  const listings = [];
  for (const stub of stubs) {
    if (isResolved(stub.title)) continue;
    const rec = await fetchArticle(stub);
    if (rec) listings.push(rec);
  }

  console.error(`  wejherowo active: ${listings.length} active listing(s)`);
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  const year = currentYear();
  const refs = [];

  for (let y = year; y >= year - RESULT_YEARS_BACK; y--) {
    const stubs = await fetchAnnualPage(y);
    const resolved = stubs.filter(s => isResolved(s.title));

    for (const stub of resolved) {
      const url = ORIGIN + stub.href;
      let html;
      try {
        html = await getText(url, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  wejherowo: result article fetch failed (${stub.href}): ${err.message}`);
        continue;
      }

      const pdfUrl = resultPdfUrlFromArticle(html);
      if (!pdfUrl) continue;

      const bodyText = stripTags(html);
      const parsed = parseAnnouncement(bodyText);

      refs.push({
        pdfUrl,
        date: parsed.auction_date ?? stub.published_date,
        sourceUrl: url,
      });
    }
  }

  console.error(`  wejherowo: ${refs.length} result doc ref(s) found`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active listing(s)`);
}
