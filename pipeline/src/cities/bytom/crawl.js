// Bytom crawler — the city's "Katalog nieruchomości do zbycia" on i-BIIP.
//
//   https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html
//
// This single server-rendered HTML page lists every currently-offered sale
// auction as a repeated block of labelled fields:
//
//   ADRES:            pl. Akademicki 11/12
//   TYP:              lokal mieszkalny
//   ETAP SPRZEDAŻY:   III Przetarg
//   TERMIN PRZETARGU: 2026-06-15
//   CENA WYWOŁAWCZA:  97000
//   POWIERZCHNIA:     76.14
//   LINK:             https://www.bytom.pl/bip/download/Ogloszenie-…-11-12,23604.doc
//
// Everything the active-listing record needs is already in the catalog — round
// (I/II/III Przetarg, the relisting signal), ISO auction date, starting price
// and area — so no per-listing detail crawl or OCR is needed. The LINK is a
// .doc announcement, kept as `detail_url`.
//
// Scope (v1): active/upcoming auctions only. Bytom does publish auction
// *results* ("Informacja o wyniku przetargu") on www.bytom.pl/bip, but those
// pages are JavaScript-rendered (plain fetch returns an empty shell — same wall
// the Sosnowiec/Katowice spikes hit). Recovering sold-price history is a
// documented follow-up (headless browser, or .doc parsing of the announcements)
// — hence crawlResultDocs() returns [] for now and the adapter is active-only.
//
// We deliberately keep only `lokal mieszkalny` and `lokal użytkowy` (flats and
// commercial units, which carry a real "<street> <bldg>/<apt>" address the
// normalizer can key on) and skip every `grunt…` land parcel — those are sold
// by plot number (`dz. 5742/32`) and don't fit the street|building|apt model
// the flat-flipper product is built around (same call Gliwice/Katowice make).

import { getText } from '../../core/fetch.js';
import { parseAddress } from '../../core/normalize.js';

const CATALOG_URL =
  'https://i-biip.um.bytom.pl/katalog-nieruchomosci-do-zbycia.html';

/**
 * @typedef {object} ActiveListing
 * @property {'mieszkalny'|'uzytkowy'} kind
 * @property {string} address_raw
 * @property {ReturnType<typeof parseAddress>|null} address
 * @property {string|null} auction_date     ISO YYYY-MM-DD
 * @property {number|null} round            1 = first auction, 2 = second, …
 * @property {number|null} area_m2
 * @property {number|null} starting_price_pln
 * @property {string} detail_url
 */

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// "97000", "1 500 000", "12.400" → 12400 (PLN, no grosze in this catalog).
function parsePLN(numStr) {
  if (!numStr) return null;
  const digits = numStr.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

// "76.14" / "76,14" → 76.14
function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(numStr.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// "III Przetarg" / "II Przetarg" / "I Przetarg" → 3 / 2 / 1.
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
function parseRound(etap) {
  if (!etap) return null;
  const m = /\b(VI{0,3}|IV|I{1,3}|V)\b/.exec(etap.toUpperCase());
  return m ? ROMAN[m[1]] ?? null : null;
}

// "lokal mieszkalny" → mieszkalny; "lokal użytkowy" → uzytkowy; everything
// else (grunty…, grunt pod garażami) → null = skip (not a keyable address).
function kindFromTyp(typ) {
  const t = (typ || '').toLowerCase();
  if (t.includes('mieszkaln')) return 'mieszkalny';
  if (t.includes('użytkow') || t.includes('uzytkow')) return 'uzytkowy';
  return null;
}

const LABELS = {
  adres: /ADRES\s*:?\s*([\s\S]*?)\s*TYP\s*:/i,
  typ: /TYP\s*:?\s*([\s\S]*?)\s*ETAP\s+SPRZEDA[ŻZ]Y\s*:/i,
  etap: /ETAP\s+SPRZEDA[ŻZ]Y\s*:?\s*([\s\S]*?)\s*TERMIN\s+PRZETARGU\s*:/i,
  termin: /TERMIN\s+PRZETARGU\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
  cena: /CENA\s+WYWO[ŁL]AWCZA\s*:?\s*([\d .,]+)/i,
  powierzchnia: /POWIERZCHNIA\s*:?\s*([\d.,]+)/i,
};

/**
 * Parse the catalog HTML into active-listing records. Records are delimited by
 * the "ADRES:" label; each chunk is parsed both as raw HTML (to recover the
 * .doc href) and as tag-stripped text (for the labelled field values).
 * @param {string} html
 * @returns {ActiveListing[]}
 */
export function parseCatalog(html) {
  // Split the document into one chunk per record at each "ADRES" label. The
  // label only appears once per record in the catalog body (nav/footer carry
  // no "ADRES:" text), so consecutive "ADRES" starts bound each record.
  const starts = [];
  const adresRe = /ADRES\s*:?/gi;
  let mm;
  while ((mm = adresRe.exec(html)) !== null) starts.push(mm.index);
  if (starts.length === 0) return [];

  const out = [];
  const seen = new Set();
  for (let i = 0; i < starts.length; i++) {
    const chunk = html.slice(starts[i], starts[i + 1] ?? html.length);
    const text = stripTags(chunk);

    const typ = LABELS.typ.exec(text)?.[1]?.trim();
    const kind = kindFromTyp(typ);
    if (!kind) continue; // skip land / unkeyable parcels

    const addrRaw = LABELS.adres.exec(text)?.[1]?.trim();
    if (!addrRaw) continue;
    // Defensive: a flat/commercial address with a plot suffix ("dz. 1234/5")
    // would mis-key — drop it.
    if (/\bdz\.?\s*\d/i.test(addrRaw)) continue;
    const address = parseAddress(addrRaw);
    if (!address) continue;

    const auctionDate = LABELS.termin.exec(text)?.[1] ?? null;
    const round = parseRound(LABELS.etap.exec(text)?.[1]);
    const startingPrice = parsePLN(LABELS.cena.exec(text)?.[1]);
    const areaM2 = parseArea(LABELS.powierzchnia.exec(text)?.[1]);

    // .doc announcement link lives in the raw chunk.
    const hrefM = /href="([^"]+\.doc[^"]*)"/i.exec(chunk);
    const detailUrl = hrefM ? hrefM[1].replace(/&amp;/gi, '&') : '';

    // De-dup on (address.key, auction_date) — the catalog occasionally repeats
    // a row across re-renders.
    const dedup = `${address.key}|${auctionDate ?? ''}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    out.push({
      kind,
      address_raw: addrRaw,
      address,
      auction_date: auctionDate,
      round,
      area_m2: areaM2,
      starting_price_pln: startingPrice,
      detail_url: detailUrl,
    });
  }
  return out;
}

/** @returns {Promise<{ listings: ActiveListing[], wykaz: object[] }>} */
export async function crawlActive() {
  const html = await getText(CATALOG_URL);
  const listings = parseCatalog(html);
  console.error(`  bytom catalog: ${listings.length} flat/commercial listings`);
  return { listings, wykaz: [] };
}

/**
 * Bytom has no machine-readable sold-price results stream we can reach without
 * a headless browser (see header). Returning [] keeps the refresh loop's
 * OCR/parse phase a no-op for this city — properties are built from the active
 * catalog alone.
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
