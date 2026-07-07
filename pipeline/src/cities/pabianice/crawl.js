// Pabianice crawler — Logonet BIP 2.9.0, server-rendered HTML.
//
// BOARD:  https://bip.um.pabianice.pl/przetargi-nieruchomosci/{page}/{perPage}
//   page 1 = newest, 48 pages total (10 items/page by default).
//   Each item is a <table> block with rows: Adres nieruchomości | Przetarg na |
//   Typ przetargu | Rodzaj nieruchomości | Cena wywoławcza | Data przetargu.
//   All metadata needed for the active listing is INLINE — no PDF fetch required
//   for crawlActive(). Filter: Typ = "ustny nieograniczony" AND Rodzaj = "lokal
//   mieszkalny".
//
// DETAIL: https://bip.um.pabianice.pl/przetarg-nieruchomosci/{id}/{slug}
//   Carries the same structured table plus attachment links. Result PDF is the
//   attachment labelled "Rozstrzygnięcie przetargu".
//
// RESULTS: crawlResultDocs() paginates the same board, fetches each listing's
//   detail page, plucks the "Rozstrzygnięcie przetargu" PDF URL, extracts text,
//   and returns refs. source:'html' => refs carry `.text` so refresh.js passes
//   text directly to parseResultDoc without another fetch.
//
// MAX_PAGES: routine CI cap (~60 most-recent listings).
// Full backfill: set env PABIANICE_MAX_PAGES=48.

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { parseAddress } from '../../core/normalize.js';

const ORIGIN = 'https://bip.um.pabianice.pl';
const LIST_BASE = `${ORIGIN}/przetargi-nieruchomosci`;
const PER_PAGE = 10;
const MAX_PAGES = Number(process.env.PABIANICE_MAX_PAGES) || 6;

// ---- HTML text utilities ---------------------------------------------------

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// "53.000 zl" / "820.000 zl" -> integer PLN (dot = thousands separator in BIP list).
function parsePLN(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\./g, '').replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "14.05.2026 godz. 09:40" -> "2026-05-14" ISO. Returns null on failure.
function parseAuctionDate(raw) {
  if (!raw) return null;
  const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(raw);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// ---- Address parsing from BIP title ----------------------------------------
//
// BIP list/detail address text:
//   "lokal mieszkalny nr 7 przy ul. Pomorskiej 20"
//   "lokal mieszkalny nr 6 przy ul. Boleslawa Nawrockiego 4A"
//   "lokal mieszkalny nr 64/65 przy ul. Wyszynskiego 3"
//   "lokal mieszkalny nr 9/10 przy ul. Pomorskiej 20"
//
// Compound units (merged flats) like "nr 64/65" key on the first number as apt
// because parseAddress cannot handle triple-slash ("ul. X 3/64/65").

export function parseAddressFromBipTitle(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // Unit number: "nr 7" / "nr 64/65" / "nr 9/10"
  const unitRawM = /\bnr\s+(\d+(?:\/\d+)?[A-Za-z]?)/i.exec(s);
  let unitNo = null;
  if (unitRawM) {
    const raw2 = unitRawM[1];
    // Compound units like "64/65": use only the first number as apt key.
    const compound = /^(\d+)\/(\d+)$/.exec(raw2);
    unitNo = compound ? compound[1] : raw2;
  }

  // Street + building after "przy ul." / "przy al." / "przy os."
  const streetM = /przy\s+(?:ul|al|os|pl)\.?\s+(.+)/i.exec(s);
  if (!streetM) return null;

  const streetPart = streetM[1].trim();
  // Building number = last numeric token (possibly with letter suffix).
  const bldgM = /^(.+?)\s+(\d+[A-Za-z]?)\s*$/.exec(streetPart);
  if (!bldgM) return null;

  const streetName = bldgM[1].trim();
  const building = bldgM[2];

  const normalized = unitNo
    ? `ul. ${streetName} ${building}/${unitNo}`
    : `ul. ${streetName} ${building}`;

  return parseAddress(normalized);
}

// ---- List-page parser ------------------------------------------------------
//
// Each entry on the board is a <table> block with labelled rows.
// Verified against live HTML 2026-06-27.

export function parseListPage(html) {
  const out = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = tableRe.exec(html)) !== null) {
    const tbl = m[0];

    // Build label->value map from rows.
    const rows = {};
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let r;
    while ((r = rowRe.exec(tbl)) !== null) {
      const cells = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let c;
      while ((c = cellRe.exec(r[1])) !== null) {
        cells.push(stripTags(c[1]));
      }
      if (cells.length >= 2) {
        rows[cells[0].replace(/\s+/g, ' ').trim()] = cells[1];
      }
    }

    // Filter: must be lokal mieszkalny + przetarg ustny nieograniczony.
    const typ = (rows['Typ przetargu'] || '').toLowerCase();
    const rodzaj = (rows['Rodzaj nieruchomosci'] || rows['Rodzaj nieruchomości'] || '').toLowerCase();
    if (!typ.includes('ustny nieograniczony')) continue;
    if (rodzaj !== 'lokal mieszkalny') continue;

    // Extract the detail URL from the "Adres nieruchomości" cell raw HTML.
    // Live Logonet markup renders the label as <th scope="row"> (not <td>),
    // so accept either closing tag before the value cell.
    const adresCellM = /Adres\s+nieruchomo[śs]ci\s*<\/t[dh]>\s*<td[^>]*>([\s\S]*?)<\/td>/i.exec(tbl);
    if (!adresCellM) continue;
    const adresCellHtml = adresCellM[1];

    const linkM = /href="([^"]*\/przetarg-nieruchomosci\/(\d+)\/([^"?#]+))[^"]*"/i.exec(adresCellHtml);
    if (!linkM) continue;

    const hrefRaw = linkM[1].replace(/&amp;/gi, '&');
    const detail_url = /^https?:\/\//i.test(hrefRaw)
      ? hrefRaw
      : `${ORIGIN}${hrefRaw.startsWith('/') ? '' : '/'}${hrefRaw}`;
    const id = linkM[2];
    const slug = linkM[3];
    const address_raw = stripTags(adresCellHtml);

    const starting_price_pln = parsePLN(rows['Cena wywoławcza'] || rows['Cena wywolawcza']);
    const auction_date = parseAuctionDate(rows['Data przetargu']);

    out.push({ id, slug, address_raw, detail_url, starting_price_pln, auction_date });
  }
  return out;
}

// ---- Detail-page parser (for result PDF URL) --------------------------------

export function resultPdfUrlFromDetail(html) {
  const re = /href="([^"]*\/attachments\/download\/\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    const linkText = stripTags(m[2]);
    if (/rozstrzygni[ęe]cie/i.test(linkText)) {
      const href = m[1].replace(/\s+/g, '').replace(/&amp;/gi, '&');
      if (/^https?:\/\//i.test(href)) return href;
      return `${ORIGIN}${href.startsWith('/') ? '' : '/'}${href}`;
    }
  }
  return null;
}

// ---- Shared detail-page cache ----------------------------------------------

const _detailHtmlCache = new Map();

async function fetchDetailHtml(id, url) {
  if (_detailHtmlCache.has(id)) return _detailHtmlCache.get(id);
  let html = '';
  try {
    html = await getText(url);
    _detailHtmlCache.set(id, html);
  } catch (err) {
    console.error(`  pabianice: detail fetch failed (id ${id}): ${err.message}`);
  }
  return html;
}

// ---- Active listings crawl -------------------------------------------------

export async function crawlActive() {
  const listings = [];
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${LIST_BASE}/${page}/${PER_PAGE}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  pabianice: list page ${page} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListPage(html);
    let added = 0;
    for (const it of items) {
      if (seenIds.has(it.id)) continue;
      seenIds.add(it.id);

      const address = parseAddressFromBipTitle(it.address_raw);
      if (!address) {
        console.error(`  pabianice: could not parse address from "${it.address_raw}" — skipped`);
        continue;
      }

      listings.push({
        kind: 'mieszkalny',
        address_raw: it.address_raw,
        address,
        starting_price_pln: it.starting_price_pln,
        auction_date: it.auction_date,
        round: null,
        area_m2: null,
        detail_url: it.detail_url,
        source_url: it.detail_url,
      });
      added++;
    }
    console.error(
      `  pabianice: page ${page}: ${items.length} lokal mieszkalny (ustny) item(s), ${added} new`,
    );

    if (!/<table/i.test(html)) break;
  }

  console.error(`  pabianice active: ${listings.length} listing(s)`);
  return { listings, wykaz: [], land: [] };
}

// ---- Result-docs crawl -----------------------------------------------------

export async function crawlResultDocs() {
  const refs = [];
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${LIST_BASE}/${page}/${PER_PAGE}`;
    let html;
    try {
      html = await getText(url);
    } catch (err) {
      console.error(`  pabianice: results crawl list page ${page} fetch failed: ${err.message}`);
      break;
    }

    const items = parseListPage(html);
    for (const it of items) {
      if (seenIds.has(it.id)) continue;
      seenIds.add(it.id);

      const detailHtml = await fetchDetailHtml(it.id, it.detail_url);
      if (!detailHtml) continue;

      const pdfUrl = resultPdfUrlFromDetail(detailHtml);
      if (!pdfUrl) continue;

      let text;
      try {
        text = await pdfText(pdfUrl);
      } catch (err) {
        console.error(`  pabianice: result PDF extract failed (${pdfUrl}): ${err.message}`);
        continue;
      }

      refs.push({ text, pdf_url: pdfUrl, detail_url: it.detail_url, auction_date: it.auction_date });
    }

    if (!/<table/i.test(html)) break;
  }

  console.error(`  pabianice: ${refs.length} result notice(s) found`);
  return refs;
}

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
