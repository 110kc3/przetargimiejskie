
import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';

export const MSIP_JSON_URL =
  'https://msip.gliwice.eu/pobierz-dane.php?idlang=0&id=1400002263&code=d1d58634a2b70ed6b4dd9781e274c86b&type=json';

export const MSIP_OFFERS_URL =
  'https://msip.gliwice.eu/oferta-nieruchomosci-nieruchomosci-niezabudowane';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BIP_PRICE_CAP = Number(process.env.GLIWICE_BIP_PRICE_CAP) || 80;

export function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/z[łl].*/i, '');
  const m = /^([\d]+)(?:[.,]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1]);
  const m2 = /^([\d]{1,3}(?:[. ][\d]{3})*)(?:[,]\d{2})?$/.exec(String(s).replace(/z[łl].*/i, '').trim());
  if (m2) return Number(m2[1].replace(/[. ]/g, ''));
  return null;
}

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
 * Extract the starting price (cena wywoławcza) from the *stripped* text of a
 * bip.gliwice.eu działka detail page. Returns null when no price is present.
 * Exported so the parser is unit-tested directly (no network) and so the test
 * and the live path can never drift apart.
 *
 * Two patterns, tried in order:
 *   1. Colon-anchored (primary). The price sits right after the label's colon,
 *      e.g. "Cena wywoławcza nieruchomości (brutto): 2 370 000,00 zł". The colon
 *      anchor means a digit *inside* the label (e.g. "… działki 389:") is part of
 *      [^:] and can't be mistaken for the amount.
 *   2. Keyword-anchored fallback (no colon). Some pages phrase it
 *      "… brutto 2 370 000,00 zł" or "… wynosi 2 370 000,00 zł". We require a
 *      brutto/netto/wynosi keyword immediately before the number and forbid any
 *      digit between the label and that keyword ([^:0-9]) so a label number can
 *      never leak in. Without this guard a bare-number fallback would risk
 *      grabbing a parcel number or the wadium.
 * @param {string} text  HTML-stripped page text
 * @returns {number|null}
 */
export function priceFromBipText(text) {
  if (!text) return null;
  const primary =
    /[Cc]ENA\s+WYWO[ŁL]AWCZA[^:]{0,60}:\s*([\d][\d\s.]*(?:[,]\d{2})?)\s*z[łl]/i.exec(text);
  if (primary) return parsePLN(primary[1].trim() + ' zł');
  const fallback =
    /[Cc]ENA\s+WYWO[ŁL]AWCZA[^:0-9]{0,60}?(?:brutto|netto|wynosi)\s+([\d][\d\s.]*(?:[,]\d{2})?)\s*z[łl]/i.exec(text);
  if (fallback) return parsePLN(fallback[1].trim() + ' zł');
  return null;
}

export async function fetchBipPrice(url) {
  try {
    const html = await getText(url, { userAgent: UA });
    return priceFromBipText(stripHtml(html));
  } catch {
    return null;
  }
}

export function isBipDetailUrl(url) {
  return typeof url === 'string' &&
    /^https?:\/\/bip\.gliwice\.eu\/sprzedaz-dzialka-/i.test(url);
}

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
    status:              (r.UWAGI ?? '').trim() || null,
    detail_url:          r.LINK || null,
    source_url:          MSIP_OFFERS_URL,  // human portal page, not the JSON export
  };
}

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
    if (!r.NR_DZ && !r.ADRES) {
      console.error(`  gliwice MSIP land: unkeyable record, skipping`);
      continue;
    }

    let price = null;
    if (isBipDetailUrl(r.LINK) && pricesFetched < BIP_PRICE_CAP) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const land = await crawlMsipLand();
  process.stdout.write(JSON.stringify(land, null, 2) + '\n');
  console.error(`Total: ${land.length} land plot(s)`);
}
