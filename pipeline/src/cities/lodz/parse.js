// Łódź parsers — born-digital PDF tables.
//
// ANNOUNCEMENT PDF (groundtruthed against ZNN_przetarg_Plocka_Jaracza_inne_20260624.pdf,
// fetched live 2026-06-27):
//
//   Header: "OGŁOSZENIE PREZYDENTA MIASTA ŁODZI … ogłasza ustne przetargi
//            nieograniczone (licytacje) na sprzedaż samodzielnych lokali
//            mieszkalnych i …"
//   Table rows (pdftotext -layout produces one run-on line per lot):
//     "1. ul. Płocka 16 lokal mieszkalny nr 1A* KW LD1M/00087425/2 … G-5 126 748
//      17,64 / 2,19 ____________ 1983/36423 1 pokój, WC … parter 45 000 9 000 450"
//   Auction date: "Przetargi odbędą się w dniu 13 sierpnia 2026 r., o godz. 10:00"
//   Round info: "Termin przetargów zakończonych wynikiem negatywnym dla lokali
//                będących przedmiotem przetargów - 09.04.2026r." (prior round date)
//   Prior round: the negative-result date on point 20 implies this is a subsequent
//                round; the round ordinal is NOT stated in the announcement body
//                (unlike Tarnowskie Góry) — round stays null / 1.
//
// RESULT PDF (groundtruthed against ZNN_wyniki_Rybna-7_Lagiewnicka-89A_inne_20260625.pdf,
// fetched live 2026-06-27):
//
//   Header: "INFORMACJA o wynikach ustnych przetargów nieograniczonych
//            (licytacjach) przeprowadzonych w dniu 11 czerwca 2026 r."
//   Per-lot block:
//     "1. ul. Rybna 7A lokal mieszkalny nr 50 KW LD1M/00046221/3 B-46 280 963
//      29,31 ____________ 0,009 200 000
//      Liczba osób dopuszczonych do przetargu: 0 …
//      Z uwagi na brak osób dopuszczonych do przetargu, przetarg zakończył się
//      wynikiem negatywnym."
//     "7. ul. Prezydenta Gabriela Narutowicza 89 lokal użytkowy - garaż nr 6U
//      … 190 000
//      Liczba osób dopuszczonych do przetargu: 1 …
//      Cena lokalu uzyskana w przetargu została ustalona na kwotę w wysokości
//      191 900 zł brutto …
//      Nabywcą lokalu został Pan Wojciech Palenik."
//
// Each lot is identified by: street + building + unit number (and kind).
// The "udział w częściach wspólnych" fractional share is just a land share —
// the flat price is "cena wywoławcza łączna" (unit + land share together).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function isoFrom(d, mo, y) {
  const m = PL_MONTH[String(mo).toLowerCase()];
  return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}

/**
 * Parse a spaced-thousands PLN amount to integer.
 * "191 900" → 191900, "45 000" → 45000, "200000" → 200000.
 * @param {string} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  // Remove spaces (regular + non-breaking), dots used as thousands separators,
  // and any ",00" grosze tail.
  const cleaned = String(s).replace(/[\s .]/g, '').replace(/,\d{1,2}$/, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse a decimal area string: "17,64" or "29,31" → number.
 * @param {string} s
 * @returns {number|null}
 */
export function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- ANNOUNCEMENT

/**
 * Parse a price line like "45 000 9 000 450" or "180 000 36 000 1 800"
 * into an array of integers [cena_wywolawcza, wadium, min_postapienie].
 * Tokenises left-to-right, grouping consecutive digit tokens where the
 * first is 1–3 digits and the next is exactly 3 digits (thousands).
 * @param {string} line
 * @returns {number[]}
 */
function _parsePriceLine(line) {
  const tokens = (line || '').trim().split(/\s+/);
  const prices = [];
  let i = 0;
  while (i < tokens.length) {
    const cur = tokens[i];
    if (!/^\d+$/.test(cur)) { i++; continue; }
    if (
      i + 1 < tokens.length &&
      /^\d{1,3}$/.test(cur) &&
      /^\d{3}$/.test(tokens[i + 1])
    ) {
      // Two-token number: e.g. "45 000", "9 000", "1 550"
      prices.push(Number(cur + tokens[i + 1]));
      i += 2;
    } else {
      prices.push(Number(cur));
      i++;
    }
  }
  return prices;
}

/**
 * Auction date from the announcement body.
 * "Przetargi odbędą się w dniu 13 sierpnia 2026 r." or
 * "Przetarg odbędzie się w dniu 13 sierpnia 2026 r."
 * → "2026-08-13" or null.
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromAnn(text) {
  const m =
    /Przetarg[iy]?\s+odb[ęe]d[ąa]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || '')
    || /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  return isoFrom(m[1], m[2], m[3]);
}

/**
 * Split announcement PDF text into per-lot segments.
 * Each lot starts with a row number "N." at line start (after pdftotext flattens
 * the layout). We keep only segments that contain a KW number (confirms it's a
 * lot row, not a footnote or boilerplate item).
 * @param {string} text
 * @returns {string[]}
 */
export function splitLots(text) {
  const t = (text || '').replace(/\r/g, '');
  // Split on numbered list markers at line start (1. 2. … 20.)
  const parts = t.split(/^(\d{1,2})\.\s+/m);
  // parts = [ preamble, '1', segment1text, '2', segment2text, ... ]
  const segs = [];
  for (let i = 1; i < parts.length; i += 2) {
    const seg = (parts[i + 1] || '').trim();
    // Keep only lot segments — must contain a KW number "LD1M/..."
    if (/LD\d[A-Z]\/\d{8}\/\d/.test(seg)) segs.push(seg);
  }
  return segs;
}

/**
 * Extract the lot-row fields from one segment of the announcement PDF.
 * The pdftotext -layout output merges everything into a run-on text block.
 * Fields we extract:
 *   - street + unit from the opening phrase "ul. X N lokal [mieszkalny|użytkowy] nr N"
 *   - area_m2: first decimal before "/__________" (udział share separator)
 *   - starting_price_pln: last big round number in the row (after min. kwota postąpienia)
 *   - wadium: second-to-last big number
 *
 * @param {string} seg
 * @returns {object|null}
 */
export function parseLotSegment(seg) {
  if (!seg) return null;

  // --- Street + building + unit + kind ---
  // Pattern: "ul. Płocka 16 lokal mieszkalny nr 1A"
  //          "ul. Stefana Jaracza 23 lokal mieszkalny nr 15"
  //          "ul. Juliana Tuwima 6 lokal użytkowy nr 6U"
  //          "ul. Prezydenta Gabriela Narutowicza 89 lokal użytkowy - garaż nr 6U"
  //          "ul. Rybnej 7A lokal mieszkalny nr 50" (result PDF uses genitive)
  //          "ul. Marcina Kasprzaka 19/21 lokal mieszkalny nr 2" (compound building)
  //
  // Notes:
  //   - Building allows an optional "/NN" suffix for compound addresses (e.g. "19/21").
  //   - "lokal[^0-9\n]{0,40}?" matches "lokal użytkowy", "lokal użytkowy - garaż", etc.
  //     because Polish chars like "ż" are not in \w; [^0-9\n] avoids crossing digit lines.
  const addrRe =
    /(?:ul\.|al\.|pl\.|os\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- '"]+?)\s+(\d+(?:\/\d+)?[A-Za-z]?)\s+(lokal[^0-9\n]{0,40}?)\s+nr\s+(\d+[A-Za-z]*)/i;
  const addrM = addrRe.exec(seg);
  if (!addrM) return null;

  const street = addrM[1].replace(/\s+/g, ' ').trim();
  const buildingFull = addrM[2].toUpperCase(); // may be "19/21"
  const kindPhrase = addrM[3].replace(/\s+/g, ' ').trim();
  const apt = addrM[4].toUpperCase();

  // classifyKind('lokal użytkowy - garaż') returns 'uzytkowy' because COMMERCIAL_RE
  // matches before GARAGE_RE. Override: if kindPhrase explicitly names a garaż, use garaz.
  const kind = /gara[żz]/i.test(kindPhrase) ? 'garaz' : classifyKind(kindPhrase);

  // Build display address including compound building (e.g. "ul. Kasprzaka 19/21/2").
  const address_raw = `ul. ${street} ${buildingFull}/${apt}`;
  // For parseAddress key, use only the primary building number (before any "/")
  // so that "19/21/2" doesn't confuse the street→building→apt parser.
  const buildingMain = buildingFull.split('/')[0];
  const address = parseAddress(`ul. ${street} ${buildingMain}/${apt}`);
  if (!address) return null;

  // --- Area (m2) ---
  // The area appears as "17,64 / 2,19" (flat / przynależne) or just "37,34".
  // Extract the first decimal number in the segment — it's always the flat area.
  const areaM = /(\d{1,3},\d{2})\s*(?:\/|_)/.exec(seg);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  // --- Prices ---
  // Announcement table ends each lot with a line: "Cena wywoławcza  Wadium  Min.postąpienie"
  // e.g. "45 000 9 000 450" or "180 000 36 000 1 800".
  // Scan from the END of the segment for the last line that is purely digits + spaces
  // (avoids being tripped up by appended footnotes like "*1/ Dotyczy…").
  const lines = seg.split('\n').map(l => l.trim()).filter(Boolean);
  let priceLine = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[\d\s]+$/.test(lines[i])) { priceLine = lines[i]; break; }
  }
  const priceNums = _parsePriceLine(priceLine);
  const starting_price_pln = priceNums.length >= 1 ? priceNums[0] : null;
  const wadium_pln = priceNums.length >= 2 ? priceNums[1] : null;

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    wadium_pln,
  };
}

/**
 * Parse a full Łódź announcement PDF text into an array of lot records.
 * Each record is suitable for use as a listing entry.
 *
 * @param {string} text   extracted pdftotext -layout text
 * @param {{ detail_url?: string, source_url?: string }} [ctx]
 * @returns {object[]}
 */
export function parseAnnouncementPdf(text, ctx = {}) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromAnn(t);
  const segs = splitLots(t);
  const out = [];
  for (const seg of segs) {
    const rec = parseLotSegment(seg);
    if (!rec) continue;
    out.push({
      ...rec,
      auction_date,
      round: null, // Łódź announcements don't state the round ordinal in the body
      detail_url: ctx.detail_url || null,
      source_url: ctx.source_url || null,
    });
  }
  return out;
}

// ----------------------------------------------------------------- RESULT PDF

/**
 * Auction date from the result PDF header.
 * "przeprowadzonych w dniu 11 czerwca 2026 r." → "2026-06-11"
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromResult(text) {
  const m = /przeprowadzonych\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s*r\./i.exec(text || '');
  if (!m) return null;
  return isoFrom(m[1], m[2], m[3]);
}

/**
 * Split a result PDF text into per-lot blocks.
 * Same row-number splitting as splitLots but keeps segments containing
 * "Liczba osób dopuszczonych" (confirms it's a result lot, not boilerplate).
 * @param {string} text
 * @returns {string[]}
 */
export function splitResultLots(text) {
  const t = (text || '').replace(/\r/g, '');
  const parts = t.split(/^(\d{1,2})\.\s+/m);
  const segs = [];
  for (let i = 1; i < parts.length; i += 2) {
    const seg = (parts[i + 1] || '').trim();
    if (/Liczba\s+os[óo]b\s+dopuszczonych/i.test(seg)) segs.push(seg);
  }
  return segs;
}

/**
 * Parse one result-PDF lot segment into a concluded-auction record.
 * @param {string} seg
 * @param {string|null} auction_date
 * @param {string} sourceUrl
 * @returns {object|null}
 */
export function parseResultSegment(seg, auction_date, sourceUrl) {
  if (!seg) return null;

  // Street + building + unit (same pattern as announcement, but text uses
  // nominative/genitive mixed — "ul. Rybnej 7A" vs "ul. Rybna 7A").
  // Handles compound buildings ("19/21") and Polish kind phrases ("lokal użytkowy - garaż").
  const addrRe =
    /(?:ul\.|al\.|pl\.|os\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- '"]+?)\s+(\d+(?:\/\d+)?[A-Za-z]?)\s+(lokal[^0-9\n]{0,40}?)\s+nr\s+(\d+[A-Za-z]*)/i;
  const addrM = addrRe.exec(seg);
  if (!addrM) return null;

  const street = addrM[1].replace(/\s+/g, ' ').trim();
  const buildingFull = addrM[2].toUpperCase(); // may be "19/21"
  const kindPhrase = addrM[3].replace(/\s+/g, ' ').trim();
  const apt = addrM[4].toUpperCase();
  // Same garaż override as in parseLotSegment (COMMERCIAL_RE beats GARAGE_RE in classifyKind).
  const kind = /gara[żz]/i.test(kindPhrase) ? 'garaz' : classifyKind(kindPhrase);

  const address_raw = `ul. ${street} ${buildingFull}/${apt}`;
  const buildingMain = buildingFull.split('/')[0];
  const address = parseAddress(`ul. ${street} ${buildingMain}/${apt}`);
  if (!address) return null;

  // Starting price: the lone large number that appears AFTER the udział share
  // fraction ("0,0XX") and BEFORE "Liczba osób dopuszczonych".
  // That number is always on its own line, e.g. "200 000" or "210 000".
  const beforeResult = seg.replace(/Liczba\s+os[óo]b[\s\S]*/i, '');
  // Strip everything up to and including the udział decimal (e.g. "0,020")
  const afterShare = beforeResult.replace(/^[\s\S]*\b0,\d+\s*/m, '');
  const priceMatch = /(\d[\d ]*\d{3}|\d{3,})/g.exec(afterShare);
  const starting_price_pln = priceMatch ? parsePLN(priceMatch[1].replace(/\s/g, '')) : null;

  // Area: first decimal in the segment
  const areaM = /(\d{1,3},\d{2})\s*(?:\/|_)/.exec(seg);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  // Achieved price: "Cena lokalu uzyskana w przetargu została ustalona na kwotę
  //                  w wysokości 191 900 zł brutto"
  const soldM = /ustalona\s+na\s+kwot[ęe]\s+w\s+wysoko[śs]ci\s+([\d\s]+)\s*z[łl]/i.exec(seg);
  const final_price_pln = soldM ? parsePLN(soldM[1].replace(/\s/g, '')) : null;
  const sold = final_price_pln != null;

  // Negative outcome phrases:
  //   "przetarg zakończył się wynikiem negatywnym"
  //   "Z uwagi na brak osób dopuszczonych …"
  //   "Z uwagi na brak postąpienia powyżej ceny wywoławczej …"
  const negativeStated = /wynikiem\s+negatywnym/i.test(seg)
    || /brak\s+os[óo]b\s+dopuszczonych/i.test(seg)
    || /brak\s+posta[ąa]pienia/i.test(seg);

  const notes = [];
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return {
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    final_price_pln: sold ? final_price_pln : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    round: null,
    notes,
  };
}

/**
 * Parse a Łódź result PDF ("INFORMACJA o wynikach …") into concluded-auction records.
 * Called by refresh.js via the adapter contract.
 *
 * @param {string} text        extracted pdftotext text (from ref.text)
 * @param {string|null} fallbackDate  ISO date from crawl ref (unused — PDF has its own)
 * @param {string} sourceUrl   the result PDF URL (provenance)
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  if (!/INFORMACJA\s+o\s+wynikach/i.test(t)) return [];

  const auction_date = auctionDateFromResult(t) || fallbackDate || null;
  const segs = splitResultLots(t);
  const out = [];
  for (const seg of segs) {
    const rec = parseResultSegment(seg, auction_date, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}
