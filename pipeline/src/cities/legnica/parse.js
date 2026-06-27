// Legnica parsers.
//
// Two roles:
//   1. parseAnnouncement(text) — extracts area_m2 / starting_price_pln /
//      auction_date / round from a .docx announcement attachment (converted
//      by core/doc-text.js's OOXML unzip path). Used by crawl.js's enrichActive().
//      Groundtruthed against the REAL .docx for ul. Anielewicza 3b/8 (2026-06-27):
//        area_m2 = 46.10, starting_price_pln = 170000,
//        auction_date = '2026-07-20', round = 7.
//
//   2. parseResultDoc(text, fallbackDate, sourceUrl) — extracts achieved-price
//      records from a .doc "INFORMACJA dotycząca rozstrzygnięcia przetargu"
//      attachment. One record per flat. Groundtruthed against the REAL .doc for
//      ul. Nowy Świat 2 (INFORMACJA.doc, 2026-03-24):
//        address: 'Nowy Świat 2/6', area_m2=48.78, starting_price_pln=150000,
//        final_price_pln=151500, outcome='sold'.
//
// Both parsers tolerate catdoc's flat text output (for legacy .doc) and the
// OOXML unzip path (for .docx — predominant on this board).
//
// Announcement format (Legnica .docx, table-based):
//   "Adres nieruchomości  Legnica, ul. Anielewicza 3 b"
//   "Numer i położenie lokalu  Lokal mieszkalny nr 8, położony na IV piętrze"
//   "Powierzchnia  46,10 m² i 1,96 m²"
//   "Cena lokalu  170 000,00 zł, w tym grunt: 5 400,00 zł"
//   "Przetarg odbędzie się 20.07. 2026 r. o godz. 10:30"
//   History: "Pierwszy przetarg odbył się 22.11.2024 r., …, szósty 20.03.2026 r."
//
// Result format (Legnica .doc / OLE, table-based, converted by libreoffice/catdoc):
//   "INFORMACJA dotycząca rozstrzygnięcia przetargu"
//   "Legnica ul. Nowy Świat 2" (city + address in single cell)
//   "Lokal mieszkalny nr 6 na IV"
//   "Powierzchnia 48,78 m2 i 5,10 m2"
//   "150 000,00 zł /7 100,00 zł/"
//   "Cena nieruchomości osiągnięta w wyniku przetargu: 151.500,00 zł"
//   "Na nabywcę nieruchomości ustalono Aleksandra Piaskowego z Legnicy"

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- Shared helpers ---------------------------------------------------------

const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9,
  'wrzesnia': 9,
  października: 10, październik: 10,
  'pazdziernika': 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "150 000,00 zł" / "151.500,00 zł" / "170000" → integer PLN
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s| /g, '');
  // Try canonical "NNN.NNN,NN" or "NNN NNN,NN"
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  // Fallback: strip dots (thousands), drop ,xx cents
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "46,10" / "46.10" → 46.1
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s| /g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---- Announcement parser helpers -------------------------------------------

// Ordinal → round. Legnica announcements list history as:
//   "Pierwszy przetarg odbył się 22.11.2024 r., drugi 14.02.2025 r., …, szósty 20.03.2026 r."
// and open with "PREZYDENT … ogłasza, że 20.07.2026 r. odbędzie się przetarg …"
// (no explicit ordinal for the current round in the opener). We count how many
// past-round ordinals appear in the history clause and add 1.
const ORDINAL_HISTORY = [
  /\bpierwsz\w+\s+przetarg\s+odby[łl]/i,
  /\bdrug\w+\s+(?:\d|przetarg\s+odby)/i,
  /\btrzeci\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bczwart\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bpi[ąa]t\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bsz[oó]st\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bsi[oó]dm\w*\s+(?:\d|przetarg\s+odby)/i,
  /\b[oó]sm\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bdzi[eę]wi[ąa]t\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bdziesi[ąa]t\w*\s+(?:\d|przetarg\s+odby)/i,
];

// Also parse comma-separated history list like "piaty 18.12.2025 r. , szósty 20.03.2026 r."
// which appears as a flat list without "przetarg odbył się" for rounds 2+.
const ORDINAL_LIST = [
  { re: /\bpierwsz\w+\s+\d/, v: 1 },
  { re: /\bdrug\w+\s+\d/, v: 2 },
  { re: /\btrzeci\w*\s+\d/, v: 3 },
  { re: /\bczwart\w*\s+\d/, v: 4 },
  { re: /\bpi[ąa]t\w*\s+\d/, v: 5 },
  { re: /\bsz[oó]st\w*\s+\d/, v: 6 },
  { re: /\bsi[oó]dm\w*\s+\d/, v: 7 },
  { re: /\b[oó]sm\w*\s+\d/, v: 8 },
  { re: /\bdzi[eę]wi[ąa]t\w*\s+\d/, v: 9 },
  { re: /\bdziesi[ąa]t\w*\s+\d/, v: 10 },
];

export function roundFromText(text) {
  if (!text) return null;
  const t = text;
  // Count how many past rounds appear in the history sentence starting with
  // "Pierwszy przetarg odbył się"
  const histStart = t.search(/Pierwszy\s+przetarg\s+odby[łl]/i);
  if (histStart >= 0) {
    const hist = t.slice(histStart);
    let maxOrdinal = 0;
    for (let i = 0; i < ORDINAL_LIST.length; i++) {
      if (ORDINAL_LIST[i].re.test(hist)) maxOrdinal = ORDINAL_LIST[i].v;
    }
    if (maxOrdinal > 0) return maxOrdinal + 1;
  }
  // Fallback: explicit ordinal before "przetarg" (without history context)
  if (/\bpierwsz\w+\s+przetarg/i.test(t)) return 1;
  if (/\bdrug\w+\s+przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/i.test(t)) return 3;
  // Bare "przetarg" in the opener without any ordinal history → first round
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

// Flat/usable area. Legnica .docx table:
//   "Powierzchnia  46,10 m² i 1,96 m²"   (flat + cellar; take the FIRST/larger)
// We look for the "Powierzchnia" label and take the first m² value after it.
// We explicitly exclude the cellar/piwnica second value (after " i ").
export function areaFromText(text) {
  if (!text) return null;
  // 1) Prefer "Powierzchnia" labelled — the flat's own area is the first value
  const labelled = /Powierzchni\w*\s+([\d][\d\s.,]*)\s*m\s*[²2²]/i.exec(text);
  if (labelled) {
    const v = parseArea(labelled[1]);
    if (v && v > 0) return v;
  }
  // 2) "powierzchni użytkowej … m²" (prose form in some notices)
  const uzytkowej = /powierzchni\w*\s+u[żz]ytkow\w*\s+([\d][\d.,]*)\s*m\s*[²2²]/i.exec(text);
  if (uzytkowej) {
    const v = parseArea(uzytkowej[1]);
    if (v && v > 0) return v;
  }
  // 3) Generic fallback: take the largest m² that is NOT a parcel or cellar
  const M2 = /([\d][\d.,]*)\s*m\s*[²2²](?!\d)/gi;
  const cands = [];
  let m;
  M2.lastIndex = 0;
  while ((m = M2.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (/dzia[łl]k|grunt/i.test(before)) continue;      // parcel
    if (/piwnic|kom[óo]rk|przynale[żz]/i.test(before)) continue; // cellar
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

// Starting price. Legnica .docx: "Cena lokalu  170 000,00 zł, w tym grunt …"
// In the result .doc it's "150 000,00 zł /7 100,00 zł/" (cell-separated).
export function priceFromText(text) {
  if (!text) return null;
  // "Cena lokalu  NNN" or "Cena wywoławcza  NNN"
  const labelled = /[Cc]ena\s+(?:lokalu|wywo[łl]awcza)\s+([\d][\d\s.,]*)\s*z[łl]/i.exec(text);
  if (labelled) return parsePLN(labelled[1]);
  // Generic: first "<num> zł" in "cena" context
  const start = text.search(/\bcena\b/i);
  if (start >= 0) {
    const region = text.slice(start, start + 200);
    const m = /([\d][\d\s.,]*)\s*z[łl]/i.exec(region);
    if (m) return parsePLN(m[1]);
  }
  return null;
}

// Auction date. Two forms in Legnica announcements:
//   "20.07. 2026 r." (numeric with optional space before year)
//   "20 lipca 2026 r." (spelled month)
// Anchored on future-tense "odbędzie się" where possible.
export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]dzie\s+si[ęe]\s+([\s\S]{0,60})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  // Numeric: "20.07. 2026" or "20.07.2026"
  const num = /(\d{1,2})\.\s*(\d{2})\.\s*(\d{4})/.exec(scope);
  if (num) return iso(num[3], num[2], num[1]);
  // Spelled: "20 lipca 2026"
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  // Fallback: search the whole text
  if (anchor) {
    const num2 = /(\d{1,2})\.\s*(\d{2})\.\s*(\d{4})/.exec(text);
    if (num2) return iso(num2[3], num2[2], num2[1]);
  }
  return null;
}

// ---- parseAnnouncement ------------------------------------------------------

/**
 * Extract fields from the .docx announcement text (converted by doc-text.js).
 * @param {string} text  docx-extracted text
 * @returns {{ round:number|null, auction_date:string|null, area_m2:number|null, starting_price_pln:number|null }}
 */
export function parseAnnouncement(text) {
  return {
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
  };
}

// ---- parseResultDoc ---------------------------------------------------------

// "Cena nieruchomości osiągnięta w wyniku przetargu: 151.500,00 zł"
function finalPriceFromText(text) {
  const m = /[Cc]ena\s+nieruchomo[śs]ci\s+osi[ąa]gni[ęe]ta\s+w\s+wyniku\s+przetargu[^0-9]{0,20}([\d][\d .,]*)\s*z[łl]/i.exec(text);
  if (m) return parsePLN(m[1]);
  // Broader: "osiągnięta … przetargu: NNN zł"
  const m2 = /osi[ąa]gni[ęe]ta[^0-9]{0,80}([\d][\d .,]*)\s*z[łl]/i.exec(text);
  if (m2) return parsePLN(m2[1]);
  return null;
}

// "Legnica ul. Nowy Świat 2" → "Nowy Świat 2"  (strip city prefix)
function stripCity(s) {
  return (s || '').replace(/^\s*Legnica\s+/i, '').trim();
}

// Auction date from result body: "16 marca 2026 r. odbył się … przetarg"
function resultDateFromText(text) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s+r?\./i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// Starting price from result table: "150 000,00 zł /7 100,00 zł/" — the first
// PLN value before the slash-delimited ground share.
function startingPriceFromResultText(text) {
  // Look for "Cena lokalu" label first (table header)
  const lab = /[Cc]ena\s+lokalu[^0-9]{0,30}([\d][\d .,]*)\s*z[łl]/i.exec(text);
  if (lab) return parsePLN(lab[1]);
  // Fallback: first "<num> zł" not immediately preceded by "osiągnięta"
  const priceRe = /([\d][\d .,]*)\s*z[łl]/gi;
  let m;
  while ((m = priceRe.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/osi[ąa]gni[ęe]ta/i.test(before)) continue;
    const v = parsePLN(m[1]);
    if (v && v >= 10000) return v; // realistic floor
  }
  return null;
}

/**
 * Parse a Legnica "INFORMACJA dotycząca rozstrzygnięcia przetargu" .doc result.
 * The .doc contains a table with one row per property.
 *
 * @param {string} text     extracted .doc text (catdoc or libreoffice)
 * @param {string|null} fallbackDate  ISO auction date from the crawl ref
 * @param {string}      sourceUrl     the /download/… URL (provenance)
 * @returns {Array<object>}           result records (framework shape)
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  // Guard: must look like a Legnica result notice
  if (!/INFORMACJA\s+dotycz[ąa]ca\s+rozstrzygni[ęe]cia/i.test(text) &&
      !/rozstrzygni[ęe]cia\s+przetargu/i.test(text)) {
    return [];
  }

  const t = text.replace(/\r/g, '');

  // Auction date: from body text "16 marca 2026 r. odbył się … przetarg"
  const auctionDate = resultDateFromText(t) || fallbackDate || null;

  // The Legnica result table format (from libreoffice conversion):
  //   Line containing city+street: "Legnica ul. Nowy Świat 2"
  //   Then apt: "Lokal mieszkalny nr 6 na IV"
  //   Then area: "Powierzchnia  48,78 m2 i 5,10 m2" (or just numbers)
  //   Then starting price: "150 000,00 zł /7 100,00 zł/"
  //   Then: "Cena nieruchomości osiągnięta w wyniku przetargu: 151.500,00 zł"
  //   Then: "Na nabywcę nieruchomości ustalono … z Legnicy"

  // Split into blocks at each city-address line ("Legnica ul./al./pl. …")
  const blockRe = /Legnica\s+(?:ul|al|pl|os)\.?\s+[A-ZŻŹĆŁŚĄĘÓŃ]/gi;
  const blockStarts = [];
  let bm;
  while ((bm = blockRe.exec(t)) !== null) blockStarts.push(bm.index);

  // Fallback: if no "Legnica ul." pattern, treat entire text as one block
  if (blockStarts.length === 0) blockStarts.push(0);

  const out = [];
  for (let i = 0; i < blockStarts.length; i++) {
    const block = t.slice(blockStarts[i], blockStarts[i + 1] ?? t.length);
    const notes = [];

    // Address: "Legnica ul. Nowy Świat 2" → street + building
    const addrLineM = /Legnica\s+((?:ul|al|pl|os)\.?\s+[^\n]+)/.exec(block);
    if (!addrLineM) continue;
    const addrLine = addrLineM[1].replace(/\s+/g, ' ').trim();

    // Apt number: "Lokal mieszkalny nr 6" or "Lokal nr 6"
    const aptM = /[Ll]okal\s+(?:mieszkaln\w+|u[żz]ytkow\w+|)?\s*nr\s+(\d+[a-z]?)/i.exec(block);
    if (!aptM) continue;
    const apt = aptM[1];

    // Build full address "ul. Nowy Świat 2/6" and parse it
    const addressRaw = `${addrLine}/${apt}`;
    const address = parseAddress(addressRaw);
    if (!address) {
      notes.push(`parse: could not parse address from '${addressRaw}'`);
      continue;
    }
    if (address.warning) notes.push(address.warning);

    // Kind: classify from the lokal block line
    const kind = classifyKind(block.slice(0, 200));

    // Area: the result table has a "Powierzchnia" header followed by the flat
    // area then the cellar ("48,78 m2 i 5,10 m2"). The parcel ("Dz. nr … 253 m2")
    // appears earlier. Take the FIRST m² value found after "Powierzchnia".
    let area_m2 = null;
    const powierzchniaIdx = block.search(/\bPowierzchnia\b/i);
    if (powierzchniaIdx >= 0) {
      const afterPow = block.slice(powierzchniaIdx);
      const areaM = /([\d][\d.,]*)\s*m\s*[²2²](?!\d)/i.exec(afterPow);
      area_m2 = areaM ? parseArea(areaM[1]) : null;
    } else {
      // Fallback: skip values preceded by "Dz. nr" (parcel abbreviation)
      const areaM2Re = /([\d][\d.,]*)\s*m\s*[²2²](?!\d)/gi;
      let am;
      while ((am = areaM2Re.exec(block)) !== null) {
        const before = block.slice(Math.max(0, am.index - 30), am.index);
        if (/Dz\.\s*nr\s*\d|dzia[łl]k|grunt/i.test(before)) continue;
        area_m2 = parseArea(am[1]);
        break;
      }
    }

    // Starting price
    const starting_price_pln = startingPriceFromResultText(block);
    if (starting_price_pln == null) notes.push('parse: missing starting price');

    // Achieved price
    const final_price_pln = finalPriceFromText(block);

    // Negative outcome: no achieved price AND no buyer mentioned
    const negative =
      /negatywn|nie\s+wy[łl]oniono|nie\s+dosz[łl]o\s+do/i.test(block) ||
      (final_price_pln == null && !/nabywc/i.test(block));

    if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

    out.push({
      auction_date: auctionDate,
      source_pdf: sourceUrl,  // keeping the key name consistent with other adapters
      kind,
      address_raw: addressRaw,
      address,
      round: null,  // Legnica result docs don't state the round number explicitly
      starting_price_pln,
      final_price_pln: negative ? null : final_price_pln,
      outcome: negative ? 'unsold' : 'sold',
      unsold_reason: negative ? 'unknown' : null,
      area_m2,
      notes,
    });
  }

  return out;
}
