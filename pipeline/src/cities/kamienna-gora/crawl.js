import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import {
  normalizeBody,
  isResultNotice,
  isAnnouncement,
  parseAnnouncement,
} from './parse.js';

const ORIGIN = 'https://bip.kamiennagora.pl';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;
const MAX_CANDIDATES = 300;

function toAsciiSlug(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

const EXCLUDE_RE = /najem|dzierzaw|odwolan|uniewazni|wykaz/;

export function isFlatSaleSlug(slug) {
  const s = toAsciiSlug(slug);
  if (!s.includes('przetarg')) return false;
  if (EXCLUDE_RE.test(s)) return false;
  if (!(s.includes('zbycie') || s.includes('sprzedaz'))) return false;
  return /lokal\w*-?mieszkaln/.test(s);
}

const YEAR_URL = (year) => `${ORIGIN}/${year}.html`;

function absoluteUrl(href) {
  if (/^https?:\/\//i.test(href)) return href.replace(/\?+$/, '');
  return `${ORIGIN}/${href.replace(/^\/+/, '').replace(/\?+$/, '')}`;
}

export function parseYearIndex(html) {
  const urls = [];
  const seen = new Set();
  const re = /href="([^"]+\.html)\??"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!isFlatSaleSlug(m[1])) continue;
    const url = absoluteUrl(m[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

async function fetchSitemapUrls() {
  const index = await getText(SITEMAP_URL, { userAgent: BROWSER_UA });
  const siteM = /<loc>([^<]*\/site\.xml)<\/loc>/i.exec(index);
  const siteUrl = siteM ? siteM[1] : `${ORIGIN}/pl/sitemap/site.xml`;
  const xml = await getText(siteUrl, { userAgent: BROWSER_UA });
  const urls = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1]);
  return urls;
}

export function sitemapFlatUrls(allUrls) {
  const out = [];
  const seen = new Set();
  for (const u of allUrls) {
    const slug = u.replace(/^https?:\/\/[^/]+\//, '');
    if (!isFlatSaleSlug(slug)) continue;
    const url = absoluteUrl(slug);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function recentYearIndexUrls() {
  const now = new Date().getFullYear();
  const out = [];
  for (const year of [now, now + 1]) {
    try {
      out.push(...parseYearIndex(await getText(YEAR_URL(year), { userAgent: BROWSER_UA })));
    } catch (err) {
      console.error(`  kamienna-gora year ${year}: ${err.message}`);
    }
  }
  return out;
}

async function discoverCandidatePages() {
  const pages = [];
  const seen = new Set();
  const add = (url) => { if (!seen.has(url)) { seen.add(url); pages.push(url); } };

  let sitemapUrls = [];
  try {
    sitemapUrls = sitemapFlatUrls(await fetchSitemapUrls());
  } catch (err) {
    console.error(`  kamienna-gora sitemap: ${err.message}`);
  }
  for (const u of sitemapUrls) add(u);
  for (const u of await recentYearIndexUrls()) add(u);

  const bounded = pages.slice(0, MAX_CANDIDATES);
  console.error(
    `  kamienna-gora: ${bounded.length} flat-sale page(s) ` +
    `(${sitemapUrls.length} sitemap + recent-year index${pages.length > bounded.length ? `, capped from ${pages.length}` : ''})`,
  );
  return bounded;
}

const PDF_HREF_RE = /href="(\/?files\/file_add\/download\/\d+_[^"]+\.pdf)"/gi;
const SKIP_FILE_RE = /(rzut|mapa|mapka|szkic|zdjec|foto|klauzula|rodo)/i;

export function parseAttachmentUrls(html) {
  const urls = [];
  const seen = new Set();
  let m;
  while ((m = PDF_HREF_RE.exec(html)) !== null) {
    const rel = m[1];
    if (SKIP_FILE_RE.test(rel)) continue;
    const url = `${ORIGIN}/${rel.replace(/^\/+/, '')}`;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}


let _cache = null;

async function discoverAll() {
  if (_cache) return _cache;
  const pages = await discoverCandidatePages();
  const announcements = [];
  const results = [];

  for (const pageUrl of pages) {
    let html;
    try {
      html = await getText(pageUrl, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  kamienna-gora page ${pageUrl}: ${err.message}`);
      continue;
    }
    for (const pdfUrl of parseAttachmentUrls(html)) {
      let text;
      try {
        text = await pdfText(pdfUrl, { userAgent: BROWSER_UA });
      } catch (err) {
        console.error(`  kamienna-gora pdf ${pdfUrl}: ${err.message}`);
        continue;
      }
      const body = normalizeBody(text);
      if (isResultNotice(body)) {
        results.push({ text, pdf_url: pdfUrl, detail_url: pageUrl });
      } else if (isAnnouncement(body)) {
        const a = parseAnnouncement(text, pageUrl);
        if (a.address) announcements.push(a);
        else console.error(`  kamienna-gora announce no address: ${pdfUrl}`);
      }
    }
  }
  console.error(`  kamienna-gora: ${announcements.length} announcement(s), ${results.length} result notice(s)`);
  _cache = { announcements, results };
  return _cache;
}


export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { announcements } = await discoverAll();
  const listings = [];
  for (const a of announcements) {
    if (!a.auction_date || a.auction_date < todayIso) continue;
    listings.push({
      kind: a.kind,
      address_raw: a.address_raw,
      address: a.address,
      obreb: a.obreb,
      area_m2: a.area_m2,
      starting_price_pln: a.starting_price_pln,
      auction_date: a.auction_date,
      round: a.round,
      detail_url: a.detail_url,
      published_date: a.published_date,
    });
  }
  console.error(`  kamienna-gora active: ${listings.length} upcoming flat listing(s)`);
  return { listings, wykaz: [], land: [] };
}

export async function crawlResultDocs() {
  const { results } = await discoverAll();
  const refs = results.map((r) => ({ text: r.text, pdf_url: r.pdf_url, auction_date: null }));
  console.error(`  kamienna-gora crawlResultDocs: ${refs.length} result notice(s)`);
  return refs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? 'active';
  if (mode === 'results') {
    const refs = await crawlResultDocs();
    process.stdout.write(
      JSON.stringify(refs.map((r) => ({ ...r, text: `[${r.text.length} chars]` })), null, 2) + '\n',
    );
  } else {
    const { listings, wykaz } = await crawlActive();
    process.stdout.write(JSON.stringify({ listings, wykaz }, null, 2) + '\n');
    console.error(`Total: ${listings.length} active listing(s), ${wykaz.length} wykaz`);
  }
}
