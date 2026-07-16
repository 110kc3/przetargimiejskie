// Poznań parsers — bip.poznan.pl WGN board. Each notice's board "teaser" HTML
// gives address/parcel/area/date/round; the starting price lives in a linked
// "pełna treść ogłoszenia" PDF (pdfText). Groundtruthed against REAL fixtures
// live-fetched 2026-07-16:
//   - news_id 280244 "Żegrze" — multi-plot land (3 działki), teaser HTML +
//     the real "pełna treść ogłoszenia" PDF (attachment id 545688).
//   - news_id 280233 "Krzyżowniki" — single-plot land, teaser HTML.
//   - news_id 241142 "Grodziska 32/2" — residential flat, teaser HTML
//     (retrieved via the Internet Archive Wayback Machine capture 2024-12-25;
//     the live page has since expired/404 — the CMS purges items ~1-3 weeks
//     after their validity window closes, so it carries no PDF fixture).
//
// Reuses core/finn-bip.js's generic Polish-auction text helpers (htmlToText,
// parsePLN, priceFromText, areaFromText, auctionDateFromText, roundFromText) —
// these are plain string->value helpers already groundtruthed elsewhere in
// this project, not city-specific. Poznań-only quirk: PDF prices are written
// "18 500 000,– zł" (en dash/minus placeholder instead of ",00") —
// normalizePrice() below rewrites that to ",00 zł" before handing the
// text to priceFromText, matching the shared parser's expectations.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  roundFromText,
} from '../../core/finn-bip.js';

export { htmlToText };

// Real open-auction announcements start "PREZYDENT MIASTA POZNANIA ogłasza
// [pierwszy/drugi/...] przetarg ustny nieograniczony na sprzedaż ...". This
// gate LIVE-VERIFIED to admit the 3 real fixtures above and to REJECT the two
// real non-auction notice types seen on the same board: "Informacja o
// zarządzeniu" (a pre-designation, "przeznaczył do sprzedaży w trybie
// przetargu" — sprzedaży precedes przetargu, opposite order) and "Wykaz ...
// przeznaczonych do wynajęcia" (a rental designation, no "sprzeda" at all).
export function isAuctionAnnouncement(text) {
  return /og[łl]asza[\s\S]{0,80}?przetarg[\s\S]{0,120}?sprzeda/i.test(text || '');
}

// Poznań's en dash/minus grosze placeholder ("18 500 000,– zł") ->
// the ",00 zł" form core/finn-bip.js's parsePLN/priceFromText expect.
export function normalizePrice(text) {
  return (text || '').replace(/,\s*[–−-]\s*z[łl]/gi, ',00 zł');
}

export function priceFromNotice(text) {
  return priceFromText(normalizePrice(text));
}

// One land notice can list several "obręb <name> arkusz <N> działka <D>
// (<klasa>) pow. <area> m2" lines (a batch sale of adjoining plots). Extracts
// every one.
const LAND_SEG_RE =
  /obr[ęe]b\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z-]*)\s+arkusz\s+(\d+)\s+dzia[łl]ka\s+(\d+\/\d+)[^)]*\)\s*pow\.\s*([\d\s]+)\s*m\s*2/gi;

export function landSegmentsFromText(text) {
  const t = text || '';
  const out = [];
  let m;
  const re = new RegExp(LAND_SEG_RE.source, LAND_SEG_RE.flags);
  while ((m = re.exec(t)) !== null) {
    out.push({
      obreb: m[1],
      arkusz: m[2],
      dzialka: m[3],
      area_m2: Number(m[4].replace(/\s/g, '')) || null,
    });
  }
  return out;
}

// "powierzchnia łączna: 48 016 m2" — the notice's stated TOTAL across all
// listed plots (present only when there's more than one).
export function totalAreaFromText(text) {
  const m = /powierzchnia\s+[łl][ąa]czna:?\s*([\d\s]+)\s*m\s*2/i.exec(text || '');
  return m ? Number(m[1].replace(/\s/g, '')) || null : null;
}

// "rejon ulic Obodrzyckiej i Garaszewo" / "rejon ulicy X" — best-effort area
// description for land (NOT a keyable street+number; land is parcel-keyed via
// dzialka_nr/obreb, matching krakow/parse.js's landStreet — address_raw is
// supplementary only, no `.address` object is built for land).
export function landAreaDescFromText(text) {
  const m = /rejon\s+ulic?y?:?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z .\-]+?)(?=\s+obr[ęe]b|\s+dzia[łl]k|$)/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+i\s+ul\b.*$/i, '').trim() || null;
}

// "ul. Grodziskiej 32 lokal mieszkalny nr 2" -> {street, building, apt}.
const FLAT_ADDR_RE =
  /ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z .\-]+?)\s+(\d+[A-Za-z]?)\s+lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;
// Fallback for non-flat built units (garage/commercial/house): "ul. Street 12".
const GENERIC_ADDR_RE = /ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z .\-]+?)\s+(\d+[A-Za-z]?)\b/i;

export function builtAddressFromText(text) {
  const t = text || '';
  const flat = FLAT_ADDR_RE.exec(t);
  if (flat) {
    const street = flat[1].replace(/\s+/g, ' ').trim();
    const raw = `ul. ${street} ${flat[2]}/${flat[3]}`;
    const address = parseAddress(raw);
    return address ? { address_raw: raw, address } : null;
  }
  const generic = GENERIC_ADDR_RE.exec(t);
  if (generic) {
    const street = generic[1].replace(/\s+/g, ' ').trim();
    const raw = `ul. ${street} ${generic[2]}`;
    const address = parseAddress(raw);
    return address ? { address_raw: raw, address } : null;
  }
  return null;
}

/**
 * Parse one announcement notice (board teaser text + optional fetched PDF
 * text of the "pełna treść ogłoszenia" attachment) into 0-1 records. Returns
 * null when the notice isn't a real open-auction announcement, or isn't
 * keyable (no parcel/street for land, no street+building for a built unit).
 * @param {string} teaserText  htmlToText(board teaser or detail-page "Treść")
 * @param {string} pdfText  pdftotext output of the linked ogłoszenie PDF, or ''
 * @param {{url?:string, detailUrl?:string}} [opts]
 */
export function parseAnnouncementNotice(teaserText, pdfText = '', opts = {}) {
  const teaser = teaserText || '';
  if (!isAuctionAnnouncement(teaser)) return null;
  const combined = `${teaser}\n${pdfText || ''}`;
  const kind = classifyKind(combined);
  const round = roundFromText(teaser) ?? roundFromText(combined);
  const auction_date = auctionDateFromText(teaser) ?? auctionDateFromText(combined);
  const starting_price_pln = priceFromNotice(combined);
  const { url = null, detailUrl = null } = opts;

  if (kind === 'grunt') {
    const segs = landSegmentsFromText(teaser);
    if (!segs.length) return null;
    const dzialka_nr = segs.map((s) => s.dzialka).join(', ');
    const obreb = segs[0].obreb;
    const area_m2 = totalAreaFromText(teaser) ?? (segs.reduce((sum, s) => sum + (s.area_m2 || 0), 0) || null);
    const streetDesc = landAreaDescFromText(teaser);
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw: streetDesc ? `ul. ${streetDesc}` : null,
      round,
      starting_price_pln,
      auction_date,
      detail_url: detailUrl || url,
      source_url: detailUrl || url,
    };
  }

  const addr = builtAddressFromText(teaser);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(combined),
    round,
    starting_price_pln,
    auction_date,
    detail_url: detailUrl || url,
    source_url: detailUrl || url,
  };
}

// --- Results ("wyniki przetargów", category 8800) --------------------------
//
// Real teaser wording (Wayback capture 2026-07-12 of a live 2026-06-24 result
// notice): "Informacja Prezydenta Miasta Poznania o wynikach przetargów
// przeprowadzonych 24.06.2026 r. na sprzedaż nieruchomości położonych w
// Poznaniu, przy ul. Olgi Sławskiej-Lipczyńskiej." No PDF attachment for any
// real result notice was obtainable during this build (see config.js header)
// — the achieved-price/nabywca extraction below follows the same idiom
// krakow/parse.js already ships ("cena ... została ustalona na kwotę ... zł" /
// "wynikiem negatywnym"), but is UNVERIFIED against a real Poznań result PDF.

export function resultDateFromText(text) {
  const m = /przeprowadzon\w*\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r\.?/i.exec(text || '');
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return auctionDateFromText(text || '');
}

export function achievedPriceFromText(text) {
  const m = /zosta[łl]a?\s+ustalona\s+na\s+kwot[ęe]\s+([\d][\d.,\s-]*?)\s*z[łl]/i.exec(normalizePrice(text || ''));
  return m ? priceFromText(`cena wywoławcza ${m[0]}`) : null;
}

export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym|nie\s+(?:odnotowano|wp[łl]aci[łl]\w*)\s+wadium|nie\s+przyst[ąa]pi[łl]\w*\s+do\s+przetargu/i.test(text || '');
}

/**
 * Parse a result-category notice (board teaser + optional PDF text) into 0-1
 * concluded records. See header note: achieved-price/outcome extraction is
 * real-idiom but not live-verified against a Poznań fixture — re-confirm on
 * first live catch (no PDF attachment was obtainable during this build).
 * @param {string} text  combined teaser + PDF text
 * @param {string|null} fallbackDate
 * @param {string|null} sourceUrl
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text || '');
  if (!/wynik\w*\s+przetarg|o\s+wynik/i.test(t)) return [];
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const kind = classifyKind(t);
  const negative = isNegativeOutcome(t);
  const final_price_pln = negative ? null : achievedPriceFromText(t);
  const outcome = final_price_pln != null ? 'sold' : negative ? 'unsold' : 'unknown';

  let base;
  if (kind === 'grunt') {
    const segs = landSegmentsFromText(t);
    if (!segs.length) return [];
    base = {
      kind: 'grunt',
      dzialka_nr: segs.map((s) => s.dzialka).join(', '),
      obreb: segs[0].obreb,
      area_m2: totalAreaFromText(t) ?? (segs.reduce((sum, s) => sum + (s.area_m2 || 0), 0) || null),
      address_raw: (() => {
        const d = landAreaDescFromText(t);
        return d ? `ul. ${d}` : null;
      })(),
    };
  } else {
    const addr = builtAddressFromText(t);
    if (!addr) return [];
    base = {
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addr.address_raw,
      address: addr.address,
      area_m2: areaFromText(t),
    };
  }

  return [{
    auction_date,
    source_pdf: sourceUrl || null,
    ...base,
    final_price_pln,
    outcome,
    unsold_reason: negative ? 'wynikiem negatywnym' : null,
    notes: [],
  }];
}
