// Bartoszyce parsers — announcement PDFs + result ("informacja o wyniku przetargu") PDFs.
// Both are published on the city BIP (bip.bartoszyce.pl/160/).
//
// Groundtruthed against real municipal documents:
//   Flats:
//     - ul. Generała Bema 57/2 (I przetarg, 2026-04-16, 49.80 m2, sold 96 000 -> 96 960 zł, buyer Michał Andruszkiewicz)
//     - ul. Warszawska 14/3 (II przetarg, 2024-07-04, 42.06 m2, cena 120 000 zł)
//     - ul. Słowackiego 28/50 (I przetarg, 2025-06-12, 36.06 m2, cena 120 000 zł)
//     - ul. Konopnickiej 6/4A (I przetarg, 2023-09-07, 39.40 m2, cena 99 000 zł)
//   Land:
//     - ul. Rotmistrza Witolda Pileckiego (dz. 454..458, round II unsold, round III active 2026-11-25)
//     - ul. Gdańska (dz. 431 i 432, round I, 2026-10-01, sold 363 000 -> 366 630 zł, buyers Arkadiusz i Izabela Gołombiewscy)
//     - ul. Topolowa i Poprzeczna (dz. 409 sold 74 000 -> 80 000 zł, dz. 410 sold 73 000 -> 74 000 zł, 2026-03-05)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── folding / numbers ────────────────────────────────────────────────────────

function foldPl(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

/**
 * "96.000,00 zł" / "96 960,00 zł." / "120.000,00" -> integer PLN.
 * Handles space/NBSP/dot as thousands separator and comma as decimal separator.
 * @param {string} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s)
    .replace(/z[łl]\.?/gi, '')
    .replace(/[\s ]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * "0,1629 ha" / "0.7183" -> float ha.
 * @param {string} s
 * @returns {number|null}
 */
export function parseHa(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/ha/gi, '').trim().replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Hectares string -> integer m2. */
export function haToM2(s) {
  const ha = parseHa(s);
  return ha != null ? Math.round(ha * 10000) : null;
}

/**
 * "49,80 m2" / "42,06" -> float m2.
 * @param {string} s
 * @returns {number|null}
 */
export function parseAreaM2(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/m2|m²/gi, '').trim().replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function monthNum(word) {
  return PL_MONTHS[foldPl(word)] || null;
}

// ── round ────────────────────────────────────────────────────────────────────

const ROMAN_VALUES = { I: 1, V: 5, X: 10 };
function romanToRound(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VALUES[up[i]];
    const next = ROMAN_VALUES[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 20 ? total : null;
}

const ROUND_WORD_PREFIXES = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piat', 5], ['szost', 6], ['siodm', 7], ['osm', 8],
];
function wordToRound(word) {
  const f = foldPl(word);
  for (const [prefix, n] of ROUND_WORD_PREFIXES) {
    if (f.startsWith(prefix)) return n;
  }
  return null;
}

const ANNOUNCE_ROUND_RE =
  /\b([IVXivx]+|pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*)\s+przetarg/i;

export function announceRoundFromText(text) {
  const m = ANNOUNCE_ROUND_RE.exec(text || '');
  if (!m) return null;
  const token = m[1];
  return /^[IVXivx]+$/.test(token) ? romanToRound(token) : wordToRound(token);
}

// ── dates ────────────────────────────────────────────────────────────────────

// "Przetarg odbędzie się dnia 16 kwietnia 2026 r." / "dnia 12.06.2025 r."
const ANNOUNCE_DATE_RE =
  /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:dnia|w\s+dniu)\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i;

export function announceDateFromText(text) {
  const m = ANNOUNCE_DATE_RE.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  const dotM = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotM) {
    return `${dotM[3]}-${dotM[2].padStart(2, '0')}-${dotM[1].padStart(2, '0')}`;
  }
  const wordM = raw.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/);
  if (wordM) {
    const mo = monthNum(wordM[2]);
    return mo ? `${wordM[3]}-${String(mo).padStart(2, '0')}-${wordM[1].padStart(2, '0')}` : null;
  }
  return null;
}

// "przeprowadzonego w dniu 16 kwietnia 2026 r." / "w dniu 1 października 2026 r."
const RESULT_DATE_RE =
  /(?:przeprowadzonego\s+)?w\s+dniu\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*r/i;

export function resultDateFromText(text) {
  const m = RESULT_DATE_RE.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  const dotM = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotM) {
    return `${dotM[3]}-${dotM[2].padStart(2, '0')}-${dotM[1].padStart(2, '0')}`;
  }
  const wordM = raw.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/);
  if (wordM) {
    const mo = monthNum(wordM[2]);
    return mo ? `${wordM[3]}-${String(mo).padStart(2, '0')}-${wordM[1].padStart(2, '0')}` : null;
  }
  return null;
}

// ── gates ────────────────────────────────────────────────────────────────────

/** Excludes leases / rentals (dzierżawa, ogródki gastronomiczne, najem stoisk). */
export function isLease(text) {
  return /dzier[żz]aw|najem\s+lokalu|\bogrodk[óo]w\s+gastronomiczn/i.test(text || '');
}

/** Check if document is a result notice. */
export function isResultNotice(text) {
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(text || '');
}

/** Check if document is an auction announcement. */
export function isAnnouncementNotice(text) {
  return /og[łl]oszenie\s+o\s+przetargu|og[łl]asza\s+.*przetarg/i.test(text || '');
}

/** Check if result row / doc is an unsold outcome. */
export function isNegativeOutcome(text) {
  return /nie\s+zosta[łl]a\s+zbyta|brak\s+nabywcy|wynikiem\s+negatywnym|brak\s+wp[łl]aty\s+wadium/i.test(text || '');
}

// ── announcement flat address ────────────────────────────────────────────────

export function announceFlatAddressRaw(text) {
  const t = text || '';
  const lokalNrM = t.match(/lokal\s+mieszkaln\w*\s+Nr\s*(\d+[A-Za-z]?)/i);
  const streetM = t.match(/przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)\s+(\d+[\d,\s]*)/i);
  if (!streetM) return null;

  const entranceM = t.match(/w\s+wej[śs]ciu\s+oznaczonym\s+Nr\s*(\d+[A-Za-z]?)/i);
  let bldg = streetM[2].trim();
  if (entranceM) {
    bldg = entranceM[1];
  } else if (bldg.includes(',')) {
    bldg = bldg.split(',')[0].trim();
  }

  const apt = lokalNrM ? lokalNrM[1] : '';
  const street = streetM[1].trim();
  return apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
}

export function flatAreaFromText(text) {
  const m =
    (text || '').match(/lokal[^\n]*?o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*m2/i) ||
    (text || '').match(/powierzchnia\s+lokalu\s+wynosi\s*(\d+(?:[.,]\d+)?)\s*m2/i);
  return m ? parseAreaM2(m[1]) : null;
}

export function startingPriceFromText(text) {
  const m = (text || '').match(/Cena\s+wywo[łl]awcza[^\n]*?(\d{1,3}(?:[\s . ]\d{3})*,\d{2})\s*z[łl]/i);
  return m ? parsePLN(m[1]) : null;
}

// ── announcement parser ──────────────────────────────────────────────────────

/**
 * Parse one announcement PDF text into listing or land records.
 * @param {string} text
 * @param {{ pdfUrl?: string, detailUrl?: string, fallbackAuctionDate?: string|null }} [ctx]
 * @returns {Array<object>}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text) return [];
  if (isLease(text)) return [];

  const round = announceRoundFromText(text);
  const auction_date = ctx.fallbackAuctionDate || announceDateFromText(text) || null;
  const isFlat = /lokal\s+mieszkaln|nieruchomo[śs]ci\s+lokalowej/i.test(text);

  if (isFlat) {
    const addressRaw = announceFlatAddressRaw(text);
    if (!addressRaw) return [];
    const address = parseAddress(addressRaw);
    if (!address) return [];
    const area_m2 = flatAreaFromText(text);
    const starting_price_pln = startingPriceFromText(text);

    return [{
      kind: 'mieszkalny',
      address_raw: addressRaw,
      address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    }];
  }

  // Land / plots
  const isLand = /dzia[łl]k|grunt|niezabudowan/i.test(text);
  if (!isLand) return [];

  // Check multi-parcel land table (e.g. Pileckiego: 5 parcels)
  const tablePartM = text.match(/I\.\s+Oznaczenie[\s\S]*?(?=II\.|\n[A-Z]{2,}\.|$)/i);
  if (tablePartM) {
    const tablePart = tablePartM[0];
    const rows = [...tablePart.matchAll(/^\s*(\d+)\s+(\d+(?:\/\d+)?)\s+(\d+[.,]\d+)\s*ha\s+([\s\S]*?)(ul\.[^\n]+?)\s+(\d{1,3}(?:[\s . ]\d{3})*,\d{2})\s*z[łl]/gm)];
    if (rows.length > 0) {
      const records = [];
      for (const r of rows) {
        const dzialka_nr = r[2].trim();
        const ha = r[3].trim();
        let street = r[5].trim();
        // If street was cut like "ul. Rotmistrza Witolda", expand from full doc if known
        if (/Rotmistrza\s+Witolda/i.test(street) && !/Pileckiego/i.test(street)) {
          street = 'ul. Rotmistrza Witolda Pileckiego';
        }
        records.push({
          kind: 'grunt',
          dzialka_nr,
          obreb: null,
          area_m2: haToM2(ha),
          address_raw: `${street}, dz. ${dzialka_nr}`,
          starting_price_pln: parsePLN(r[6]),
          auction_date,
          round,
          detail_url: ctx.detailUrl || null,
          source_url: ctx.pdfUrl || null,
        });
      }
      if (records.length > 0) return records;
    }
  }

  // Single plot or two-parcel plot (e.g. Gdańska 431 i 432)
  const singleDzM = text.match(/dzia[łl]k\w*\s+Nr\s*([0-9a-zA-Z\s\/i]+?)(?=\s+(?:o\s+)?pow|\s+ul|\s+KW|\s*,|\n)/i);
  const singleHaM = text.match(/(\d+[.,]\d+)\s*ha/i);
  const singleStreetM = text.match(/przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?:\s+w\s+Bartoszycach|\s*,|\s+KW|\n)/i) ||
                        text.match(/(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?:\s+\d{1,3}(?:[\s . ]\d{3})*,\d{2}\s*z[łl]|\s+KW)/i);
  const singlePrice = startingPriceFromText(text);

  if (singleDzM && singlePrice != null) {
    const dzialka_nr = singleDzM[1].trim();
    const street = singleStreetM ? singleStreetM[1].trim() : 'Bartoszyce';
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: null,
      area_m2: singleHaM ? haToM2(singleHaM[1]) : null,
      address_raw: `${street}, dz. ${dzialka_nr}`,
      starting_price_pln: singlePrice,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    }];
  }

  return [];
}

// ── result parser ────────────────────────────────────────────────────────────

/**
 * Parse one "informacja o wyniku przetargu" PDF text into concluded auction records.
 * @param {string} text
 * @param {string|null} [fallbackDate]
 * @param {string|null} [sourceUrl]
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  if (isLease(text)) return [];

  const auction_date = resultDateFromText(text) || fallbackDate || null;

  // Find column headers in table:
  // "Lp.   Oznaczenie nieruchomości wg     Liczba osób dopuszczonych i    Cena wywoławcza      Najwyższa cena      Imię i nazwisko osoby"
  const lines = text.split('\n');
  const headerLineIdx = lines.findIndex((l) => l.includes('Oznaczenie'));
  if (headerLineIdx === -1) return [];

  const headerLine = lines[headerLineIdx];
  const cLiczba = headerLine.indexOf('Liczba');
  const cCena = headerLine.indexOf('Cena');
  const cNajwyzsza = headerLine.indexOf('Najwyższa');
  const cImie = headerLine.indexOf('Imię');

  if (cLiczba === -1 || cCena === -1) return [];

  let endIdx = lines.findIndex((l, i) => i > headerLineIdx && /Informacj[ęe]\s+wywieszono/i.test(l));
  if (endIdx === -1) endIdx = lines.length;

  const rowChunks = [];
  let curRow = null;

  for (let i = headerLineIdx + 1; i < endIdx; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.includes('katastru') || line.includes('przetargu')) continue;

    const rowStart = line.match(/^\s*(\d+)\.\s*/);
    if (rowStart) {
      if (curRow) rowChunks.push(curRow);
      curRow = {
        lp: rowStart[1],
        oznaczenie: '',
        liczba: '',
        cenaWyw: '',
        najwyzsza: '',
        imie: '',
      };
    }
    if (curRow) {
      // Find boundary before "Osoby dopuszczone" in this line if present
      const osobyIdx = line.search(/Osoby\s+dopuszczone|Osoby\s+nie\s+dopuszczone/i);
      const col1End = osobyIdx > -1 ? osobyIdx : cLiczba;

      curRow.oznaczenie += ' ' + line.slice(0, col1End).replace(/^\s*\d+\.\s*/, '').trim();
      curRow.liczba += ' ' + line.slice(col1End, cCena).trim();
      curRow.cenaWyw += ' ' + line.slice(cCena, cNajwyzsza > -1 ? cNajwyzsza : line.length).trim();
      if (cNajwyzsza > -1 && cImie > -1) {
        curRow.najwyzsza += ' ' + line.slice(cNajwyzsza, cImie).trim();
        curRow.imie += ' ' + line.slice(cImie).trim();
      } else if (cNajwyzsza > -1) {
        curRow.najwyzsza += ' ' + line.slice(cNajwyzsza).trim();
      }
    }
  }
  if (curRow) rowChunks.push(curRow);

  const records = [];

  // Extract header street / location as fallback
  const hdrStreetM = text.match(/(?:po[łl]o[żz]on\w*\s+)?(?:w\s+budynku\s+)?przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?:\s+w\s+Bartoszycach|\s*,|\n)/i);
  const fallbackStreet = hdrStreetM ? hdrStreetM[1].trim() : null;

  for (const r of rowChunks) {
    const oznaczenie = r.oznaczenie.replace(/\s+/g, ' ').trim();
    const cenaWywStr = r.cenaWyw.replace(/\s+/g, ' ').trim();
    const najwyzszaStr = r.najwyzsza.replace(/\s+/g, ' ').trim();
    const imieStr = r.imie.replace(/\s+/g, ' ').trim();

    const startPrice = parsePLN(cenaWywStr);
    const achievedPrice = parsePLN(najwyzszaStr);
    const negative = isNegativeOutcome(oznaczenie + ' ' + imieStr + ' ' + najwyzszaStr) ||
                     (achievedPrice == null && !imieStr);
    const sold = !negative && achievedPrice != null;

    const isFlat = /lokal\s+mieszkaln/i.test(oznaczenie) || /lokal\s+mieszkaln/i.test(text.slice(0, headerLineIdx));

    if (isFlat) {
      // Flat address
      let addrRaw = null;
      const addrM = oznaczenie.match(/(?:przy\s+)?(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i);
      if (addrM) {
        addrRaw = addrM[1].trim();
      } else if (fallbackStreet) {
        addrRaw = fallbackStreet;
      }
      if (!addrRaw) continue;

      const address = parseAddress(addrRaw);
      if (!address) continue;

      const areaM = oznaczenie.match(/o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*m2/i);
      const area_m2 = areaM ? parseAreaM2(areaM[1]) : null;

      records.push({
        auction_date,
        source_pdf: sourceUrl,
        kind: 'mieszkalny',
        address_raw: addrRaw,
        address,
        round: null,
        starting_price_pln: startPrice,
        final_price_pln: sold ? achievedPrice : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        area_m2,
        notes: [],
      });
    } else {
      // Land
      const dzM = oznaczenie.match(/dzia[łl]k\w*\s+nr\.?\s*([0-9a-zA-Z\s\/i]+?)(?=\s+(?:o\s+)?pow|\s+ul|\s+KW|\s*,|\n|$)/i);
      const haM = oznaczenie.match(/(\d+[.,]\d+)\s*ha/i);
      const streetM = oznaczenie.match(/(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?=\s+KW|\s+pow|\s+Osoby|\s+\d|\n|$)/i);

      let street = streetM ? streetM[1].trim() : fallbackStreet || 'Bartoszyce';
      // Normalize wrapped street name
      if (/Rotmistrza\s+Witolda/i.test(street) && !/Pileckiego/i.test(street)) {
        street = 'ul. Rotmistrza Witolda Pileckiego';
      }

      const dzialka_nr = dzM ? dzM[1].trim() : null;
      const address_raw = dzialka_nr ? `${street}, dz. ${dzialka_nr}` : street;

      records.push({
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        area_m2: haM ? haToM2(haM[1]) : null,
        address_raw,
        round: null,
        starting_price_pln: startPrice,
        final_price_pln: sold ? achievedPrice : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes: [],
      });
    }
  }

  return records;
}
