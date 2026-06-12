// Gliwice — SECOND source: the City of Gliwice BIP (bip.gliwice.eu), the
// Wydział Gospodarki Nieruchomości / Prezydent Miasta property-sale board. This
// is distinct from the ZGM board (zgm-gliwice.pl) crawled in crawl-active.js:
//   - ZGM      → municipal housing stock, Elementor cards, scanned-PDF results.
//   - city BIP → Prezydent Miasta sales, clean server-rendered HTML detail pages.
//
// The BIP "Sprzedaż nieruchomości i przetargi na wysokość czynszu" board mixes
// three announcement kinds — SPRZEDAŻ (sales), NAJEM (rent auctions) and
// DZIERŻAWA (land leases). We ingest ONLY the SPRZEDAŻ pages, and within those
// only LOKALE (apartments / commercial units / garages) — działki (bare land
// plots) are intentionally skipped (the lokale-only scope decision).
//
// A single SPRZEDAŻ page is usually a BUNDLE: one "Prezydent Miasta Gliwice
// ogłasza … odbędą się przetargi" announcement listing several lokale, each in
// its own block:
//
//   o godz. 9.00 rozpocznie się III ustny przetarg nieograniczony na sprzedaż
//   lokalu mieszkalnego nr 10 usytuowanego w budynku przy ul. … DASZYŃSKIEGO 65
//     POWIERZCHNIA LOKALU: 51,59 m²
//     CENA WYWOŁAWCZA NIERUCHOMOŚCI: 214 080,00 zł
//     …
//
// Some pages are a SINGLE lokal whose address lives only in the page title
// (e.g. Skarb Państwa flats: "… na zbycie prawa własności lokalu mieszkalnego
// nr 11 …" with no inline "przy ul. <addr>"). Those are handled by a
// title-based fallback that emits one listing when address + figures parse
// cleanly, and is silently skipped otherwise (best-effort, never guesses).
//
// Output shape matches the ZGM `crawlActive().listings` contract so the two
// streams merge transparently in buildCityData (see ../../core/build-properties.js).

import { getText } from '../../core/fetch.js';
import { parseAddress } from '../../core/normalize.js';

const LIST_URL = 'https://bip.gliwice.eu/ogloszenia-i-komunikaty?stronicowanie=50';

// bip.gliwice.eu sits behind a WAF that returns an empty shell to a non-browser
// User-Agent, so we crawl it in "browser mode" (real Chrome UA + browser
// headers, see core/fetch.js browserHeaders()).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, 'października': 10, listopada: 11, grudnia: 12,
};
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

// Minimal named-entity map for the few the CMS emits as entities rather than
// UTF-8 (most Polish letters arrive raw). `&sup2;` carries a digit so the
// generic [a-zA-Z]+ rule below can't catch it — handled explicitly.
const NAMED = {
  oacute: 'ó', Oacute: 'Ó', aacute: 'á', ndash: '–', mdash: '—',
  rdquo: '”', ldquo: '„', bdquo: '„', rsquo: '’', lsquo: '‘',
  nbsp: ' ', amp: '&', quot: '"', laquo: '«', raquo: '»',
};

/** Strip tags + decode the entities seen on bip.gliwice.eu into plain text. */
export function stripBip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&sup3;/g, '³')
    .replace(/&([a-zA-Z]+);/g, (m, n) => (NAMED[n] != null ? NAMED[n] : ' '))
    .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(+d); } catch { return ' '; } })
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function iso(d, m, y) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Resolve the auction date. Priority:
//   1. "przetarg DD.MM.YYYY" in the title/url (bundled pages name it there);
//   2. "przetarg-DDMMYYYY" in the slug;
//   3. body "rozpocznie się <DD month YYYY> r." (single-lokal pages);
//   4. body header "<DD month YYYY> r. … odbędą się" (bundle header).
// The word-form patterns are anchored to przetarg context so a stray date
// (e.g. the 1997 gospodarka-nieruchomościami statute, or a prior attempt's
// "poprzedni przetarg odbył się …") never wins.
function resolveDate(text, url, title) {
  const hay = `${title || ''} ${url} ${text.slice(0, 400)}`;
  let m =
    /przetarg[\s\-]*?(\d{1,2})[.\-](\d{1,2})[.\-](20\d{2})/i.exec(hay) ||
    /przetarg-(\d{2})(\d{2})(20\d{2})/i.exec(url);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /rozpocznie się\s+(\d{1,2})\s+([a-zżźćńółęąś]+)\s+(20\d{2})\s*r/i.exec(text);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[1], MONTHS[m[2].toLowerCase()], +m[3]);
  m = /(\d{1,2})\s+([a-zżźćńółęąś]+)\s+(20\d{2})\s*r\.[\s\S]{0,160}?odbęd[ąa]\s+się/i.exec(text);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[1], MONTHS[m[2].toLowerCase()], +m[3]);
  return null;
}

// Pull unit area + starting price out of one lokal block. Area takes the FIRST
// "powierzchnia" match (the lokal itself; a later "POWIERZCHNIA POMIESZCZENIA
// PRZYNALEŻNEGO – piwnica" basement figure must not win). Price tolerates the
// missing-grosze integer form ("180 557 zł") as well as "214 080,00 zł".
function blockFigures(seg) {
  const a =
    /(?:POWIERZCHNIA LOKALU:|POWIERZCHNIA GARAŻU:|o powierzchni(?: użytkowej)?)\s*(\d+(?:[,]\d+)?)\s*m\s?[²2]/i.exec(seg);
  const p =
    /CENA WYWOŁAWCZA[^:\n]*:\s*([\d  .]+?)(?:,\d{2})?\s*z[łl]/i.exec(seg) ||
    /cena wywoławcza[^:\n]*:\s*([\d  .]+?)(?:,\d{2})?\s*z[łl]/i.exec(seg);
  return {
    area_m2: a ? Number(a[1].replace(',', '.')) : null,
    starting_price_pln: p ? Number(p[1].replace(/[  .]/g, '')) : null,
  };
}

function makeListing(addressRaw, kind, date, round, figures, url) {
  return {
    kind,
    address_raw: addressRaw,
    address: parseAddress(addressRaw),
    auction_date: date,
    area_m2: figures.area_m2,
    starting_price_pln: figures.starting_price_pln,
    round: round ?? null,
    detail_url: url,
    source: 'bip', // provenance marker; harmless extra field on the listing.
  };
}

/**
 * Parse one SPRZEDAŻ detail page into 0..N lokale active-listings.
 * Returns [] for działka pages and anything that doesn't parse cleanly.
 * @param {string} html  raw detail-page HTML
 * @param {string} url   detail-page URL (becomes detail_url + a date source)
 * @param {string} [title]  page <title> (carries the date and the single-lokal address)
 * @returns {Array}
 */
export function parseBipSaleDoc(html, url, title) {
  const text = stripBip(html);
  const date = resolveDate(text, url, title);

  // ---- Path A: bundled blocks that name the address inline -----------------
  // "<ROMAN> ustny przetarg … na sprzedaż|zbycie prawa własności
  //  lokalu mieszkalnego|lokalu użytkowego|garażu nr <N> … przy ul. <STREET> <BLDG>"
  //
  // The "przy ul." prefix is spelled case-insensitively as a token set rather
  // than via an /i flag, because Przyjaźni is an aleja written "przy Al."
  // (capitalised) — lowercase-only "ul." silently dropped that unit — while the
  // uppercase-anchored STREET class must stay case-sensitive so the match
  // doesn't run on into following lowercase prose.
  const openRe =
    /([IVX]+)\s+ustny przetarg[^.]*?na (?:sprzedaż|zbycie prawa własności)\s+(lokalu mieszkalnego|lokalu użytkowego|garażu)\s+nr\s+([0-9]+[a-zA-Z]?)\s+(?:usytuowanego[^,]*?)?przy\s+(?:[Uu][Ll]|[Aa][Ll]|[Pp][Ll]|[Oo][Ss])\.\s+([A-ZŁŚŻŹĆĄĘÓŃ][A-ZŁŚŻŹĆĄĘÓŃa-ząćęłńóśźż.\- ]+?)\s+(\d+[A-Za-z]?)(?=[\s,.])/g;
  const hits = [];
  let m;
  while ((m = openRe.exec(text)) !== null) hits.push({ m, start: m.index });

  const out = [];
  for (let i = 0; i < hits.length; i++) {
    const mm = hits[i].m;
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    const seg = text.slice(hits[i].start, end);
    const kindWord = mm[2];
    const lokNr = mm[3];
    const street = mm[4].trim().replace(/\s+/g, ' ');
    const bldg = mm[5];
    const kind = kindWord.includes('mieszkalnego')
      ? 'mieszkalny'
      : kindWord.includes('użytkowego')
        ? 'uzytkowy'
        : 'garaz';
    // parseAddress understands both "<street> <bldg>/<apt>" and the
    // "<street> <bldg> garaż nr <N>" garage form.
    const addrRaw =
      kind === 'garaz' ? `${street} ${bldg} garaż nr ${lokNr}` : `${street} ${bldg}/${lokNr}`;
    const lst = makeListing(addrRaw, kind, date, ROMAN[mm[1]] || null, blockFigures(seg), url);
    if (lst.address) out.push(lst);
  }
  if (out.length) return out;

  // ---- Path B: single-lokal page (address only in the title) ---------------
  const tm =
    /lokal[u]?\s+(mieszkaln\w+|użytkow\w+)\s+(?:przy\s+)?(?:ul|al|pl|os)\.\s+([A-ZŁŚŻŹĆĄĘÓŃ][\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ.\- ]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(title || '');
  if (tm) {
    const kind = /mieszkaln/i.test(tm[1]) ? 'mieszkalny' : 'uzytkowy';
    const rm = /([IVX]+)\s+ustny przetarg/i.exec(text);
    const figures = blockFigures(text);
    const lst = makeListing(
      tm[2].replace(/\s+/g, ' ').trim(), kind, date, rm ? ROMAN[rm[1]] || null : null, figures, url,
    );
    // Only emit when we actually got the money — otherwise it's noise.
    if (lst.address && lst.starting_price_pln != null) return [lst];
  }
  return [];
}

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const SPRZEDAZ_HREF_RE = /href="(https?:\/\/bip\.gliwice\.eu\/sprzedaz-[a-z0-9-]+)"/gi;

/**
 * Crawl the BIP board: list page → SPRZEDAŻ detail pages → lokale listings.
 * @returns {Promise<Array>} active-listing records (lokale only)
 */
export async function crawlBipSales() {
  const listHtml = await getText(LIST_URL, { userAgent: UA });
  const urls = new Set();
  let m;
  SPRZEDAZ_HREF_RE.lastIndex = 0;
  while ((m = SPRZEDAZ_HREF_RE.exec(listHtml)) !== null) urls.add(m[1]);

  const listings = [];
  let lokalePages = 0;
  for (const url of urls) {
    let html;
    try {
      html = await getText(url, { userAgent: UA });
    } catch (err) {
      console.error(`  BIP: fetch failed ${url}: ${err.message}`);
      continue;
    }
    const title = (TITLE_RE.exec(html) || [, ''])[1].replace(/\s+/g, ' ').trim();
    const recs = parseBipSaleDoc(html, url, title);
    if (recs.length) lokalePages++;
    listings.push(...recs);
  }
  console.error(
    `  BIP (bip.gliwice.eu): ${urls.size} sprzedaż pages, ${lokalePages} with lokale → ${listings.length} listings`,
  );
  return listings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const listings = await crawlBipSales();
  process.stdout.write(JSON.stringify(listings, null, 2) + '\n');
  console.error(`Total: ${listings.length} BIP lokale listing(s)`);
}

// ---- BIP/ZGM duplicate folding -------------------------------------------
// ZGM and the city BIP both publish many of the SAME upcoming auctions. When a
// BIP listing names the same unit (building + apt) on the same auction date as
// a ZGM listing — even under a different street spelling (full-vs-short given
// name, genitive-vs-nominative) — it is NOT a separate auction. We keep the ZGM
// row and attach the BIP page as a SECONDARY source (`bip_url`) instead of
// emitting a duplicate row. BIP-only auctions (no ZGM twin) are kept as-is.

const STREET_SUFFIX_SUBS = [
  ['ej$', 'a'], ['iej$', 'a'], ['ego$', 'y'], ['ego$', ''],
  ['skiej$', 'ska'], ['skiego$', 'ski'], ['ckiej$', 'cka'], ['ckiego$', 'cki'],
];
// Street-name spelling variants used only to MATCH a BIP listing to its ZGM
// twin: Polish case-suffix swaps plus dropping a leading given-name token
// ("ignacego daszynskiego" → "daszynskiego"). Mirrors build-properties' own
// fuzzy `variants()`; building + apt + date must also match, so this never
// collapses genuinely different units.
function streetVariants(street) {
  const out = new Set([street]);
  for (const [re, repl] of STREET_SUFFIX_SUBS) {
    const v = street.replace(new RegExp(re), repl);
    if (v !== street) out.add(v);
  }
  const w = street.split(' ').filter(Boolean);
  if (w.length > 1) {
    out.add(w[w.length - 1]);
    if (w.length > 2) out.add(w.slice(-2).join(' '));
  }
  return out;
}

/**
 * Fold BIP listings that duplicate a ZGM listing into a secondary `bip_url`.
 * Input is the COMBINED active array (ZGM first, then BIP). Returns a new array
 * with BIP duplicates removed and their URL attached to the matching ZGM row.
 * @param {Array} listings
 * @returns {Array}
 */
export function foldBipDuplicates(listings) {
  const out = [];
  for (const l of listings) {
    if (l.source !== 'bip' || !l.address) {
      out.push(l);
      continue;
    }
    const vars = streetVariants(l.address.street_norm);
    const twin = out.find(
      (o) =>
        o.source !== 'bip' &&
        o.address &&
        o.auction_date === l.auction_date &&
        o.address.building === l.address.building &&
        (o.address.apt ?? '') === (l.address.apt ?? '') &&
        vars.has(o.address.street_norm),
    );
    if (twin) {
      if (l.detail_url && !twin.bip_url) twin.bip_url = l.detail_url;
      continue; // drop the duplicate BIP row
    }
    out.push(l);
  }
  return out;
}
