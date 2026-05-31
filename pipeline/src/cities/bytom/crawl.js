// Bytom crawler (v2) — primary source is the city BIP's server-rendered sales
// list; the i-BIIP catalog is kept only as a price/area enrichment.
//
//   PRIMARY:  https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie
//   ENRICH:   https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html
//
// Why this layout (see SPIKE-WAVE2.md "Update — bytom.pl/bip is server-rendered"):
//   - The BIP list is NOT a JS SPA. It's plain server-rendered HTML, paginated
//     `?strona=N` (~10 items/page, ~4 pages), each item a
//     `<li class="aktualnosc__item">` with a publication date, a title link to
//     a real per-property page (`…/idn:<id>`), and a one-line description that
//     states the round ("drugi/trzeci przetarg"). This gives us:
//       * a proper detail-page URL (fixes the v1 ".doc download" link),
//       * the relisting round,
//       * broader coverage than the catalog (more flats).
//   - BUT the BIP list/detail pages carry NO inline price or area (those live
//     only inside the attached .doc). So we still read the i-BIIP catalog and
//     join by address key to fill starting_price_pln + area_m2 + auction_date.
//   - Bytom publishes NO achieved sale prices and the list only spans the last
//     ~few months, so there is still no sold-price history — every listing is
//     `outcome: 'active'`. crawlResultDocs() stays [].
//
// IMPORTANT: bytom.pl serves an EMPTY body to the default bot User-Agent
// (that's why plain web_fetch saw "JS-rendered" — it wasn't). We pass a
// browser-like UA for these fetches. Confirmed in a browser network trace, but
// not runnable from the CI sandbox (its DNS can't reach bytom.pl) — validate on
// the first real refresh.
//
// We keep only `lokal mieszkalny` / `lokal użytkowy` (flats + commercial, with
// a keyable "<street> <bldg>/<apt>" address) and skip every land parcel.

import { getText } from '../../core/fetch.js';
import { parseAddress } from '../../core/normalize.js';
import { docText } from '../../core/doc-text.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAnnouncement } from './parse.js';

const BIP_BASE =
  'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/nieruchomosci-wszystkie';
const CATALOG_URL =
  'https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html';

// A real browser UA — bytom.pl gates the default bot UA to an empty body.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MAX_PAGES = 10; // safety cap; real list is ~4 pages

/**
 * @typedef {object} ActiveListing
 * @property {'mieszkalny'|'uzytkowy'} kind
 * @property {string} address_raw
 * @property {ReturnType<typeof parseAddress>|null} address
 * @property {string|null} auction_date     ISO — from the i-BIIP catalog (BIP list has none)
 * @property {string|null} published_date   ISO — when the BIP announcement was posted
 * @property {number|null} round
 * @property {number|null} area_m2
 * @property {number|null} starting_price_pln
 * @property {string} detail_url            the real BIP per-property page (…/idn:N)
 * @property {string} doc_url               the .doc announcement (from the catalog)
 */

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const digits = numStr.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(numStr.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Polish ordinal in the announcement text → round number. Bare "przetarg"
// (no ordinal) is the first auction.
function roundFromText(txt) {
  const t = (txt || '').toLowerCase();
  if (/\bpierwsz/.test(t)) return 1;
  if (/\bdrug/.test(t)) return 2;
  if (/\btrzeci/.test(t)) return 3;
  if (/\bczwart/.test(t)) return 4;
  if (/\bpiąt|\bpiat/.test(t)) return 5;
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}

// Announcement description → property kind, or null to skip (land etc.).
function kindFromText(txt) {
  const t = (txt || '').toLowerCase();
  if (/niemieszkaln/.test(t)) return 'uzytkowy'; // "lokalu niemieszkalnego"
  if (/mieszkaln/.test(t)) return 'mieszkalny'; // "lokalu mieszkalnego"
  return null; // "nieruchomości gruntowej / zabudowanej", "działkę", garaże…
}

// ---- i-BIIP catalog (price/area/auction_date enrichment) -----------------

const CAT = {
  adres: /ADRES\s*:?\s*([\s\S]*?)\s*TYP\s*:/i,
  termin: /TERMIN\s+PRZETARGU\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
  cena: /CENA\s+WYWO[ŁL]AWCZA\s*:?\s*([\d .,]+)/i,
  powierzchnia: /POWIERZCHNIA\s*:?\s*([\d.,]+)/i,
};

/**
 * Parse the i-BIIP catalog into a Map<address.key, {auction_date, area_m2,
 * starting_price_pln, doc_url}>. Records are delimited by the "ADRES:" label.
 * @param {string} html
 * @returns {Map<string, {auction_date:string|null, area_m2:number|null, starting_price_pln:number|null, doc_url:string}>}
 */
export function parseCatalog(html) {
  const starts = [];
  const adresRe = /ADRES\s*:?/gi;
  let m;
  while ((m = adresRe.exec(html)) !== null) starts.push(m.index);

  const byKey = new Map();
  for (let i = 0; i < starts.length; i++) {
    const chunk = html.slice(starts[i], starts[i + 1] ?? html.length);
    const text = stripTags(chunk);
    const addrRaw = CAT.adres.exec(text)?.[1]?.trim();
    if (!addrRaw || /\bdz\.?\s*\d/i.test(addrRaw)) continue;
    const address = parseAddress(addrRaw);
    if (!address) continue;
    const hrefM = /href="([^"]+\.doc[^"]*)"/i.exec(chunk);
    byKey.set(address.key, {
      auction_date: CAT.termin.exec(text)?.[1] ?? null,
      area_m2: parseArea(CAT.powierzchnia.exec(text)?.[1]),
      starting_price_pln: parsePLN(CAT.cena.exec(text)?.[1]),
      doc_url: hrefM ? hrefM[1].replace(/&amp;/gi, '&') : '',
    });
  }
  return byKey;
}

// ---- BIP list (primary: detail_url + round + coverage) -------------------

/**
 * Parse one BIP sales-list page into raw items.
 * @param {string} html
 * @returns {Array<{address_raw:string, address:object|null, kind:string|null, round:number|null, published_date:string|null, detail_url:string}>}
 */
export function parseBipList(html) {
  const out = [];
  const itemRe = /<li[^>]*class="[^"]*aktualnosc__item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const li = m[1];
    const date = /class="aktualnosci__data"[^>]*>\s*(\d{4}-\d{2}-\d{2})/i.exec(li)?.[1] ?? null;
    const linkM = /<a[^>]*href="([^"]*\/idn:\d+)"[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    if (!linkM) continue;
    const detailUrl = linkM[1].replace(/&amp;/gi, '&');
    const addrRaw = stripTags(linkM[2]);
    const descM = /class="aktualnosci__tresc"[^>]*>([\s\S]*?)<\/p>/i.exec(li);
    const desc = stripTags(descM?.[1] || '');

    const kind = kindFromText(desc);
    if (!kind) continue; // land / garages / leases
    if (/\bdz\.?\s*\d|działk/i.test(addrRaw)) continue; // plot in title → skip
    const address = parseAddress(addrRaw);
    if (!address) continue;

    out.push({
      address_raw: addrRaw,
      address,
      kind,
      round: roundFromText(desc),
      published_date: date,
      detail_url: detailUrl,
    });
  }
  return out;
}

/** Crawl every page of the BIP sales list. */
async function crawlBipList() {
  const items = [];
  const seenKeys = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BIP_BASE : `${BIP_BASE}?strona=${page}`;
    let html;
    try {
      html = await getText(url, { userAgent: BROWSER_UA });
    } catch (err) {
      console.error(`  bytom BIP page ${page} fetch failed: ${err.message}`);
      break;
    }
    const pageItems = parseBipList(html);
    if (pageItems.length === 0) break; // past the last page
    let added = 0;
    for (const it of pageItems) {
      if (seenKeys.has(it.address.key)) continue; // newest round wins (page 1 first)
      seenKeys.add(it.address.key);
      items.push(it);
      added++;
    }
    console.error(`  bytom BIP page ${page}: ${pageItems.length} items (${added} new flats/commercial)`);
    // The list has a hard last page; stop once a page yields no *new* keys too.
  }
  return items;
}

/** @returns {Promise<{ listings: ActiveListing[], wykaz: object[] }>} */
export async function crawlActive() {
  // Enrichment map (price/area/auction_date) from i-BIIP — best-effort.
  let catByKey = new Map();
  try {
    catByKey = parseCatalog(await getText(CATALOG_URL));
  } catch (err) {
    console.error(`  bytom i-BIIP catalog fetch failed (enrichment skipped): ${err.message}`);
  }

  const bip = await crawlBipList();

  // BIP list is the spine (gives the real per-property page URL + round);
  // the i-BIIP catalog enriches with price/area/auction_date.
  const allBip = bip.map((it) => {
    const c = catByKey.get(it.address.key);
    return {
      kind: it.kind,
      address_raw: it.address_raw,
      address: it.address,
      auction_date: c?.auction_date ?? null,
      published_date: it.published_date,
      round: it.round,
      area_m2: c?.area_m2 ?? null,
      starting_price_pln: c?.starting_price_pln ?? null,
      detail_url: it.detail_url, // real per-property BIP page
      doc_url: c?.doc_url ?? '',
    };
  });
  // Listings the catalog can't enrich (null price/area/date) are concluded
  // auctions that have rolled off the i-BIIP catalog but still linger on the BIP
  // list; their figures live only inside the per-property .doc. We DON'T drop
  // them here — enrichActive() (below) fetches each one's .doc, parses it, and
  // fills the fields; only the rows still empty after that are dropped.
  const listings = allBip;

  // Fallback: if the BIP crawl returned nothing (e.g. UA gate / outage) but the
  // catalog worked, emit catalog-only listings so we never regress to empty.
  if (listings.length === 0 && catByKey.size > 0) {
    console.error('  bytom: BIP list empty — falling back to i-BIIP catalog only');
    for (const [key, c] of catByKey) {
      const [street_norm] = key.split('|');
      listings.push({
        kind: 'mieszkalny',
        address_raw: street_norm,
        address: { key, street: street_norm, street_norm, building: key.split('|')[1], apt: key.split('|')[2] || null, warning: null },
        auction_date: c.auction_date,
        published_date: null,
        round: null,
        area_m2: c.area_m2,
        starting_price_pln: c.starting_price_pln,
        detail_url: CATALOG_URL,
        doc_url: c.doc_url,
      });
    }
  }

  console.error(`  bytom active: ${listings.length} listings (BIP ${bip.length}, catalog ${catByKey.size})`);
  return { listings, wykaz: [] };
}

// Find the announcement attachment URL on a per-property (/idn:N) page. Bytom
// links a .doc (and occasionally a .pdf); prefer .doc. Hrefs may be relative or
// absolute — resolve against www.bytom.pl.
export function attachmentUrlFromDetail(html) {
  const doc = /href="([^"]+\.docx?(?:\?[^"]*)?)"/i.exec(html || '');
  const pdf = /href="([^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html || '');
  const href = (doc && doc[1]) || (pdf && pdf[1]);
  if (!href) return null;
  const clean = href.replace(/&amp;/gi, '&');
  if (/^https?:\/\//i.test(clean)) return clean;
  try {
    return new URL(clean, 'https://www.bytom.pl/').href;
  } catch {
    return null;
  }
}

/**
 * Recover price / area / auction-date / round for listings the i-BIIP catalog
 * couldn't enrich (concluded auctions that rolled off the catalog but still hang
 * on the BIP list). For each such listing we open its /idn page, find the .doc
 * announcement, convert it (catdoc, via core/doc-text.js) and parse the figures
 * out. Rows still empty afterwards (no .doc, or unparseable) are dropped in place
 * so the build never sees data-less listings.
 *
 * Mutates `active` in place (the refresh loop passes the same array on to the
 * build — see refresh.js). A past `auction_date` recovered here is what lets
 * build-properties classify the listing `archived`, populating the archive.
 * @param {ActiveListing[]} active
 */
export async function enrichActive(active) {
  let recovered = 0;
  for (const l of active) {
    const hasData =
      l.starting_price_pln != null || l.area_m2 != null || l.auction_date != null;
    if (hasData) continue; // catalog already filled it

    // Need the announcement URL. Catalog-enriched rows carry doc_url; these
    // don't, so read it off the per-property page.
    let docUrl = l.doc_url;
    if (!docUrl && l.detail_url) {
      try {
        const html = await getText(l.detail_url, { userAgent: BROWSER_UA });
        docUrl = attachmentUrlFromDetail(html);
        if (docUrl) l.doc_url = docUrl;
      } catch (err) {
        console.error(`  bytom enrich: detail fetch failed (${l.address_raw}): ${err.message}`);
      }
    }
    if (!docUrl) continue;

    try {
      const text = /\.pdf(\?|$)/i.test(docUrl)
        ? await pdfText(docUrl, { userAgent: BROWSER_UA })
        : await docText(docUrl, { userAgent: BROWSER_UA });
      const f = parseAnnouncement(text);
      if (l.auction_date == null) l.auction_date = f.auction_date;
      if (l.area_m2 == null) l.area_m2 = f.area_m2;
      if (l.starting_price_pln == null) l.starting_price_pln = f.starting_price_pln;
      if (l.round == null) l.round = f.round;
      if (f.auction_date || f.area_m2 != null || f.starting_price_pln != null) recovered++;
    } catch (err) {
      console.error(`  bytom enrich: .doc parse failed (${l.address_raw}): ${err.message}`);
    }
  }

  // Drop rows still without any data (no recoverable .doc / unparseable).
  const before = active.length;
  for (let i = active.length - 1; i >= 0; i--) {
    const l = active[i];
    if (l.starting_price_pln == null && l.area_m2 == null && l.auction_date == null) {
      active.splice(i, 1);
    }
  }
  const dropped = before - active.length;
  console.error(
    `  bytom enrich: recovered ${recovered} from .doc, dropped ${dropped} still-empty listing(s)`,
  );
}

/**
 * Bytom publishes no machine-readable sold-price results — returning []
 * keeps the refresh loop's OCR/parse phase a no-op for this city.
 * @returns {Promise<Array<{ pdf_url: string, auction_date: string|null }>>}
 */
export async function crawlResultDocs() {
  return [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { listings } = await crawlActive();
  process.stdout.write(JSON.stringify({ listings }, null, 2) + '\n');
  console.error(`Total: ${listings.length} active listing(s)`);
}
