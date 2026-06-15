// Gliwice — THIRD source: the City of Gliwice MSIP portal (msip.gliwice.eu)
// "Nieruchomości niezabudowane" (undeveloped land plots offered for sale by the
// Prezydent Miasta Gliwice / Wydział Zarządzania Nieruchomościami).
//
// Source discovery:
//   INDEX PAGE: https://msip.gliwice.eu/oferta-nieruchomosci-nieruchomosci-niezabudowane
//   JSON EXPORT: https://msip.gliwice.eu/pobierz-dane.php?idlang=0&id=1400002263&code=d1d58634a2b70ed6b4dd9781e274c86b&type=json
//
// The JSON export is the preferred path. It returns all 76 land plots in one
// request with clean structured fields. No HTML scraping required.
//
// JSON record shape (confirmed against live data 2026-06-15):
//   geometry  — WKT polygon string (ignored — geoportal link below is better)
//   TYP       — "nieruchomość niezabudowana" (constant, for validation)
//   DATA_OGL  — auction date "YYYY.MM.DD" or null ("oferta do wznowienia")
//   UWAGI     — status: "przetarg ogłoszony" | "przetarg wkrótce" | "oferta do wznowienia"
//   ADRES     — location string ("ul. Chmielna", "rejon ul. Radomskiej", …)
//   NR_DZ     — parcel number(s), e.g. "1312/2", "263/2, 263/6"
//   OBREB     — cadastral district name, e.g. "Bojków"
//   KW        — land register number (rarely present)
//   POW_DZ    — plot area in m² (integer)
//   PRZEZN    — MPZP zoning, e.g. "mieszkaniowe", "usługowe"
//   PLAN      — link to MPZP plan PDF (not the BIP sale announcement)
//   TELEFON   — contact phone number
//   LINK      — BIP sale-announcement URL (bip.gliwice.eu/sprzedaz-dzialka-*
//               or a PDF when no BIP page exists yet)
//   ZDJECIE1  — optional aerial photo URL
//
// The JSON has NO starting_price_pln. Prices are on BIP detail pages. We
// attempt to scrape price from the BIP page when LINK is a sprzedaz-dzialka URL
// (i.e. the plot is "przetarg ogłoszony" or "przetarg wkrótce" with a real BIP
// page). For "oferta do wznowienia" plots (LINK is a PDF or old page), price is
// emitted as null. This is intentional and acceptable — the extension shows
// "—" when price is null.
//
// Robustness: if the MSIP JSON fetch fails the function returns []. The caller
// (index.js crawlActive) catches this and the ZGM flat/commercial/garage crawl
// is not affected.

import { getText } from '../../core/fetch.js';

export const MSIP_JSON_URL =
  'https://msip.gliwice.eu/pobierz-dane.php?idlang=0&id=1400002263&code=d1d58634a2b70ed6b4dd9781e274c86b&type=json';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// "2026.06.16" → "2026-06-16"  /  null/empty → null
export function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// Parse integer PLN from price strings seen on bip.gliwice.eu działka pages.
//   "691 100,00 zł"  →  691100
//   "691 100 zł"     →  691100
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/z[łl].*/i, '');
  const m = /^([\d]+)(?:[.,]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1]);
  // Thousand-separated with dots: "691.100"
  const m2 = /^([\d]{1,3}(?:[. ][\d]{3})*)(?:[,]\d{2})?$/.exec(String(s).replace(/z[łl].*/i, '').trim());
  if (m2) return Number(m2[1].replace(/[. ]/g, ''));
  return null;
}

// Minimal HTML stripper (same approach as crawl-bip.js stripBip).
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&sup2;/g, '²')
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(+d); } catch { return ' '; } })
    .replace(/&([a-zA-Z]+);/g, (_, n) =>
      ({ oacute: 'ó', Oacute: 'Ó', amp: '&', quot: '"', nbsp: ' ', ndash: '–', mdash: '—' }[n] ?? ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Attempt to scrape starting_price_pln from a bip.gliwice.eu działka detail
 * page. Returns null on any fetch/parse failure — never throws.
 * @param {string} url  bip.gliwice.eu/sprzedaz-dzialka-* URL
 * @returns {Promise<number|null>}
 */
export async function fetchBipPrice(url) {
  try {
    const html = await getText(url, { userAgent: UA });
    const text = stripHtml(html);
    // "Cena wywoławcza nieruchomości (brutto): 691 100,00 zł"
    // "Cena wywoławcza: 200 000,00 zł"
    // "CENA WYWOŁAWCZA NIERUCHOMOŚCI: 214 080,00 zł"
    const m =
      /[Cc]ENA\s+WYWO[ŁL]AWCZA[^:]{0,60}:\s*([\d][\d\s.]*(?:[,]\d{2})?)\s*z[łl]/i.exec(text);
    if (m) return parsePLN(m[1].trim() + ' zł');
    return null;
  } catch {
    return null;
  }
}

// True for confirmed BIP sale-announcement pages (not PDF, not geoportal PDF).
export function isBipDetailUrl(url) {
  return typeof url === 'string' &&
    /^https?:\/\/bip\.gliwice\.eu\/sprzedaz-dzialka-/i.test(url);
}

// "przetarg ogłoszony" → round 1 (auction is announced and scheduled).
// Anything else (wkrótce / do wznowienia) → null (no confirmed round yet).
function roundFromUwagi(uwagi) {
  if (/ogłoszony/i.test(uwagi || '')) return 1;
  return null;
}

/**
 * Parse one MSIP JSON record into a land record ready for buildLand.
 * Exported for unit tests.
 * @param {object} r     raw MSIP JSON object (NR_DZ, OBREB, POW_DZ, …)
 * @param {number|null} price  starting price (fetched separately from BIP)
 * @returns {object}
 */
export function parseMsipRecord(r, price = null) {
  return {
    kind: 'grunt',
    dzialka_nr:          (r.NR_DZ  ?? '').trim() || null,
    obreb:               (r.OBREB  ?? '').trim() || null,
    zoning:              (r.PRZEZN ?? '').trim() || null,
    area_m2:             typeof r.POW_DZ === 'number' && r.POW_DZ > 0 ? r.POW_DZ : null,
    address_raw:         (r.ADRES  ?? '').trim() || null,
    street:              null,   // ADRES is a location hint, not a full street address
    starting_price_pln:  price,
    auction_date:        parseDate(r.DATA_OGL),
    round:               roundFromUwagi(r.UWAGI),
    detail_url:          r.LINK || null,
    source_url:          MSIP_JSON_URL,
  };
}

/**
 * Crawl the MSIP land-plot JSON export and, for announced auctions, attempt to
 * fetch the starting price from the BIP detail page.
 * @returns {Promise<Array>}  land records (kind 'grunt'); empty array on failure.
 */
export async function crawlMsipLand() {
  let raw;
  try {
    const res = await fetch(MSIP_JSON_URL, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, */*',
        'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    raw = await res.json();
  } catch (err) {
    console.error(`  gliwice MSIP land: JSON fetch failed (${err.message}); skipping land crawl`);
    return [];
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    console.error(`  gliwice MSIP land: empty or unexpected JSON response`);
    return [];
  }

  console.error(`  gliwice MSIP land: ${raw.length} record(s) from JSON export`);

  const land = [];
  let pricesFetched = 0;

  for (const r of raw) {
    // Skip records that can't be keyed by buildLand (no parcel AND no address text).
    if (!r.NR_DZ && !r.ADRES) {
      console.error(`  gliwice MSIP land: unkeyable record, skipping`);
      continue;
    }

    // Fetch price from BIP for records with a proper BIP announcement URL.
    // Throttle: fetch.js already enforces 1 req/s; cap at 30 BIP fetches per
    // refresh to avoid long runs when many auctions are active simultaneously.
    let price = null;
    if (isBipDetailUrl(r.LINK) && pricesFetched < 30) {
      price = await fetchBipPrice(r.LINK);
      pricesFetched++;
    }

    try {
      land.push(parseMsipRecord(r, price));
    } catch (err) {
      console.error(`  gliwice MSIP land: parse error on NR_DZ=${r.NR_DZ}: ${err.message}`);
    }
  }

  const withPrice = land.filter((l) => l.starting_price_pln != null).length;
  console.error(
    `  gliwice MSIP land: ${land.length} land plot(s) parsed, ${withPrice} with price from BIP`,
  );
  return land;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const land = await crawlMsipLand();
  process.stdout.write(JSON.stringify(land, null, 2) + '\n');
  console.error(`Total: ${land.length} land plot(s)`);
}
