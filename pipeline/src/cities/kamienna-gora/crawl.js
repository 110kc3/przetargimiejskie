// Kamienna Góra crawler — bip.kamiennagora.pl (slug-based BIP; browser-UA-gated).
//
// DISCOVERY. Primary source is the site's OWN sitemap (robots.txt →
// /sitemap.xml → the `site.xml` sub-sitemap), which lists every article on the
// BIP (~1200 URLs, ~120 of them flat-sale) as stable, resolvable links. We keep
// only FLAT-SALE announcement slugs ("[N] przetarg ustny … na zbycie lokalu
// mieszkalnego …"), excluding najem/dzierżawa (rent/lease), odwołanie/
// unieważnienie (cancelled) and the land/commercial/garage variants. The slug
// filter ONLY bounds which pages get fetched — parse.js classifyKind(BODY) is
// what actually decides kind.
//
// The sitemap truncates very long slugs at ~90 chars, but the CMS resolves a
// truncated slug to the right article (confirmed live on a spread of 8 → all
// 200 + correct H1), so the URLs are safe. We deliberately do NOT use the
// `/<YEAR>.html` year-index pages as the primary source: their URLs are
// context-unstable (2024's real index is `762-2024.html`; the bare `2024.html`
// is an empty stub; the nav emits different numeric-prefixed variants per page).
// As cheap insurance against any sitemap lag, we DO union in the current + next
// year's bare index (`<YYYY>.html`, which works for the recent years), so a
// just-published upcoming auction is caught even if the sitemap hasn't refreshed
// (confirmed: all 10 live 2026 flat auctions were already in the sitemap).
//
// PER PAGE. Each flat-sale page carries the notice text ONLY as born-digital
// PDF attachments (`files/file_add/download/<id>_<name>.pdf`) — never inline
// HTML. We download every non-image, non-floorplan attachment, pdftotext it,
// and route by BODY:
//   • "INFORMACJA O WYNIKU … PRZETARGU"        → RESULT  (achieved-price stream)
//   • "Burmistrz … ogłasza N przetarg …"       → ANNOUNCE (active-listing stream)
// A page typically has one of each (the round's own ogłoszenie + its post-
// auction wynik); floor plans ("…rzut…") and photos (.png/.jpg) are skipped by
// name so we don't fetch them.
//
// BOT-BLOCK: the bare bot UA gets an EMPTY 199-byte body from this host; a
// browser UA returns the real HTML/PDF. EVERY getText/pdfText below passes
// BROWSER_UA (config.js documents the caveat). We never modify core/.
//
// One request per second (core/fetch.js throttle). Content-addressed pdf-text
// cache means committed runs never re-extract.

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
const MAX_CANDIDATES = 300; // safety ceiling; live flat-sale set is ~120 pages

function toAsciiSlug(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

const EXCLUDE_RE = /najem|dzierzaw|odwolan|uniewazni|wykaz/;

/** True for a flat-SALE przetarg slug (not rent/lease/cancel, not land/
 *  commercial/garage). Handles the source's occasional concatenated slugs
 *  ("...nazbycie-lokalu-mieszkalnego..."). */
export function isFlatSaleSlug(slug) {
  const s = toAsciiSlug(slug);
  if (!s.includes('przetarg')) return false;
  if (EXCLUDE_RE.test(s)) return false;
  if (!(s.includes('zbycie') || s.includes('sprzedaz'))) return false;
  return /lokal\w*-?mieszkaln/.test(s);
}

const YEAR_URL = (year) => `${ORIGIN}/${year}.html`;

/** Absolute-ise a year-index href (relative, sometimes numeric-id-prefixed,
 *  sometimes with a trailing "?"). */
function absoluteUrl(href) {
  if (/^https?:\/\//i.test(href)) return href.replace(/\?+$/, '');
  return `${ORIGIN}/${href.replace(/^\/+/, '').replace(/\?+$/, '')}`;
}

/** Parse a year-index page → flat-sale announcement page URLs (in page order). */
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

/** Fetch the site's sitemap index → its `site.xml` sub-sitemap → every article
 *  <loc> URL on the BIP. */
async function fetchSitemapUrls() {
  const index = await getText(SITEMAP_URL, { userAgent: BROWSER_UA });
  const siteM = /<loc>([^<]*\/site\.xml)<\/loc>/i.exec(index);
  const siteUrl = siteM ? siteM[1] : `${ORIGIN}/pl/sitemap/site.xml`;
  const xml = await getText(siteUrl, { userAgent: BROWSER_UA });
  const urls = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1]);
  return urls;
}

/** Keep + absolute-ise the flat-sale announcement URLs from a sitemap URL list. */
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

/** Current + next calendar year's bare index pages (fresh-auction insurance —
 *  see file header). Best-effort: a stub/404 year just yields nothing. */
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

/** Discover all flat-sale announcement page URLs (sitemap ∪ recent year index). */
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

// A notice PDF attachment (skip images + floor plans/photos by name).
const PDF_HREF_RE = /href="(\/?files\/file_add\/download\/\d+_[^"]+\.pdf)"/gi;
const SKIP_FILE_RE = /(rzut|mapa|mapka|szkic|zdjec|foto|klauzula|rodo)/i;

/** Extract candidate notice-PDF URLs from a detail page's HTML. */
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

// ---------------------------------------------------------------------------
// Shared, memoized fetch-and-classify pass (crawlActive + crawlResultDocs are
// each called once per refresh.js run — this never double-fetches).
// ---------------------------------------------------------------------------

let _cache = null;

/**
 * @returns {Promise<{announcements: object[], results: object[]}>}
 *   announcements: parseAnnouncement() records (with detail_url)
 *   results:       { text, pdf_url, detail_url } refs for crawlResultDocs
 */
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
      // else: floor plan / unrelated PDF — ignore.
    }
  }
  console.error(`  kamienna-gora: ${announcements.length} announcement(s), ${results.length} result notice(s)`);
  _cache = { announcements, results };
  return _cache;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Active flat listings = announcement notices whose auction is still upcoming.
 * @returns {Promise<{ listings: object[], wykaz: object[], land: object[] }>}
 */
export async function crawlActive() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { announcements } = await discoverAll();
  const listings = [];
  for (const a of announcements) {
    if (!a.auction_date || a.auction_date < todayIso) continue; // only genuinely upcoming
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

/**
 * Result notices = the "INFORMACJA O WYNIKU" PDFs. source:'html' → each ref
 * carries `.text`; refresh.js calls parseResultDoc(ref.text, ref.auction_date,
 * ref.pdf_url). auction_date is null (parseResultDoc reads it from the body).
 * @returns {Promise<Array<{text:string, pdf_url:string, auction_date:null}>>}
 */
export async function crawlResultDocs() {
  const { results } = await discoverAll();
  const refs = results.map((r) => ({ text: r.text, pdf_url: r.pdf_url, auction_date: null }));
  console.error(`  kamienna-gora crawlResultDocs: ${refs.length} result notice(s)`);
  return refs;
}

// ---------------------------------------------------------------------------
// CLI harness (manual testing: node crawl.js [active|results])
// ---------------------------------------------------------------------------
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
