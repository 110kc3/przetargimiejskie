// Nidzica parsers — announcement (.doc/.docx/HTML) and result documents.
//
// BIP Nidzica (bip.nidzica.pl) publishes announcements and result notices
// on its structured tender module (/przetargi/257/) and article board (/258/).
// Documents attached as .doc / .docx are extracted via docText before parsing.
//
// Groundtruthed against real municipal documents:
//   Flats:
//     - ul. Brzozowa 8/2 (lokal mieszkalny nr 2, 24.00 m², round 1 rokowania 78 000 zł, earlier round II unsold)
//     - ul. Warszawska 4A/16 (lokal mieszkalny nr 16, 29.90 m², II przetarg 160 000 zł, sold)
//     - ul. Warszawska 4A/1 (lokal mieszkalny nr 1, 30.70 m², I przetarg 130 000 zł, sold)
//     - Aleja Wojska Polskiego 9/1 (lokal mieszkalny nr 1, 48.70 m², II rokowania 150 000 zł, sold)
//     - Dobrzyń 31/3 (lokal mieszkalny nr 3, 83.4 m², II przetarg 35 000 zł)
//     - Zagrzewo 21/3 (lokal mieszkalny po świetlicy, 88.06 m², I przetarg)
//   Land:
//     - ul. Polna, dz. 166/26 (obręb 2 m. Nidzica, 0.1064 ha, II przetarg sold 108 000 -> 117 000 zł, buyer Marek Wasiołkowski)
//     - Jabłonka, dz. 247/4 i 247/6 (obręb Jabłonka, II przetarg active)
//     - Napiwoda, dz. 162/106 (obręb Napiwoda, I przetarg active)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Whitespace & folding helpers ─────────────────────────────────────────────

export function norm(text) {
  return String(text == null ? '' : text)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function foldPl(s) {
  return norm(s)
    .toLowerCase()
    .replace(/[ąà]/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/[óò]/g, 'o')
    .replace(/ś/g, 's')
    .replace(/[żź]/g, 'z');
}

// ── Numbers & PLN ────────────────────────────────────────────────────────────

/**
 * "78 000,00 zł" / "160.000,00" / "117 000 zł" -> integer PLN.
 * @param {string|number} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (s == null) return null;
  const str = norm(s);
  if (!str || /brak/i.test(str)) return null;
  const cleaned = str
    .replace(/z[łl](?:otych)?\.?/gi, '')
    .replace(/[\s\u00a0]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const m = /^(\d+(?:\.\d+)?)/.exec(cleaned);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * "0,1064 ha" -> float ha.
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
 * "24,00 m2" / "88,06 m²" -> float m2.
 * @param {string|number} s
 * @returns {number|null}
 */
export function parseAreaM2(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/m2|m²/gi, '').trim().replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

// ── Polish months & dates ────────────────────────────────────────────────────

const PL_MONTHS = {
  stycznia: '01', styczen: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecien: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpien: '08',
  wrzesnia: '09', wrzesien: '09',
  pazdziernika: '10', pazdziernik: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzien: '12',
};

export function monthNum(word) {
  if (!word) return null;
  return PL_MONTHS[foldPl(word)] || null;
}

/**
 * Parse date string from text into ISO YYYY-MM-DD.
 * Handles "2026-10-28 11:00:00", "07 października 2026", "26.02.2014".
 * @param {string} text
 * @returns {string|null}
 */
export function parseDate(text) {
  if (!text) return null;
  const t = norm(text);

  // ISO timestamp: "2026-10-28 11:00:00" or "2026-10-28"
  const isoM = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoM) return `${isoM[1]}-${isoM[2]}-${isoM[3]}`;

  // Polish words: "07 października 2026" / "dnia 26 lutego 2014 roku" / "w dniu 22 października 2025 r."
  const wordM = t.match(/(?:w\s+dniu|dnia)?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(20\d{2})/i);
  if (wordM) {
    const mo = monthNum(wordM[2]);
    if (mo) return `${wordM[3]}-${mo}-${String(wordM[1]).padStart(2, '0')}`;
  }

  // Dotted: "26.02.2014" or "02.12.2025"
  const dotM = t.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (dotM) {
    return `${dotM[3]}-${String(dotM[2]).padStart(2, '0')}-${String(dotM[1]).padStart(2, '0')}`;
  }

  return null;
}

/** ISO auction date from an announcement body. */
export function announceDateFromText(text) {
  const t = norm(text);
  const m =
    /(?:przetarg|rokowania)\s+(?:odb[ęe]dzie\s+si[ęe]|odb[ęe]d[ąa]\s+si[ęe])[^.\n]*?(?:dnia|w\s+dniu)?\s*(\d{1,2}\s+[a-ząćęłńóśźż]+\s+20\d{2}|\d{1,2}\.\d{1,2}\.20\d{2}|20\d{2}-\d{2}-\d{2})/i.exec(
      t,
    ) ||
    /termin\s+przetargu[^.\n]*?(?:w\s+dniu)?\s*(\d{1,2}\s+[a-ząćęłńóśźż]+\s+20\d{2}|\d{1,2}\.\d{1,2}\.20\d{2}|20\d{2}-\d{2}-\d{2})/i.exec(
      t,
    );
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  return parseDate(t);
}

/** ISO auction date from a result notice. */
export function resultDateFromText(text) {
  const t = norm(text);
  const m =
    /w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+20\d{2}|\d{1,2}\.\d{1,2}\.20\d{2})\s*(?:r\.?|roku)?.{0,250}?\b(?:odby[łl]\s+si[ęe]|przeprowadzono)/i.exec(
      t,
    ) ||
    /(?:przeprowadzonego|odby[łl]\s+si[ęe])\s+w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+20\d{2}|\d{1,2}\.\d{1,2}\.20\d{2})/i.exec(
      t,
    );
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  return parseDate(t);
}

// ── Round extraction ─────────────────────────────────────────────────────────

const ROMAN_VALUES = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

export function roundFromText(text) {
  const t = norm(text);

  // Roman numeral przetarg: "II przetarg", "I przetargu"
  const romM = /\b(I|II|III|IV|V|VI)\s+przetarg/i.exec(t);
  if (romM) return ROMAN_VALUES[romM[1].toUpperCase()] || null;

  // Word ordinal: "pierwszy przetarg", "drugi przetarg"
  const f = foldPl(t);
  if (/pierwsz\w*\s+przetarg/i.test(f)) return 1;
  if (/drug\w*\s+przetarg/i.test(f)) return 2;
  if (/trzeci\w*\s+przetarg/i.test(f)) return 3;
  if (/czwart\w*\s+przetarg/i.test(f)) return 4;
  if (/kolejny\s+\(czwarty\)\s+przetarg/i.test(f)) return 4;
  if (/kolejnym\s+\(trzecim\)\s+przetargu/i.test(f)) return 3;

  // Rokowania (negotiations)
  if (/czwart\w*\s+rokowan/i.test(f) || /IV\s+rokowan/i.test(f)) return 4;
  if (/trzeci\w*\s+rokowan/i.test(f) || /III\s+rokowan/i.test(f)) return 3;
  if (/drug\w*\s+rokowan/i.test(f) || /II\s+rokowan/i.test(f)) return 2;
  if (/rokowani|rokowan/i.test(f)) return 1;

  return null;
}

// ── Gates & Filters ──────────────────────────────────────────────────────────

/** Excludes leases / rentals (dzierżawa, najem). */
export function isLease(text) {
  return /oddani[ae]\s+w\s+dzier[żz]aw|przetarg\s+(?:ustny\s+)?(?:nieograniczony\s+)?na\s+dzier[żz]aw|na\s+oddanie\s+w\s+dzier[żz]aw|najem\s+lokalu|\bogrodk[óo]w\s+gastronomiczn/i.test(
    text || '',
  );
}

/** Check if document or text is a result notice. */
export function isResultNotice(text) {
  const f = foldPl(text);
  return (
    /informacj\w*\s+o\s+wynik|ogloszenie\s+o\s+wyniku|wynik\s+(?:i|ii|iii|iv|\d+)?\s*ustnego|wynik\s+przetargu:/i.test(
      f,
    ) || /podaje\s+informacj[ęe]\s+o\s+wyniku/i.test(text || '')
  );
}

/** Check if outcome is negative (unsold). */
export function isNegativeOutcome(text) {
  const f = foldPl(text);
  return (
    /wynik(?:iem)?\s+negatywn/i.test(f) ||
    /wynik\s+przetargu:\s*negatywny/i.test(f) ||
    /zaden\s+oferent\s+nie\s+wplacil\s+wadium/i.test(f) ||
    /nie\s+odnotowano\s+wplaty\s+wadium/i.test(f) ||
    /brak\s+oferentow/i.test(f) ||
    /brak\s+nabywcy/i.test(f) ||
    /nie\s+wyloniono\s+nabywcy/i.test(f) ||
    /zamkniety\s+bez\s+wylonienia/i.test(f)
  );
}

/** Check if auction was cancelled / void. */
export function isCancelled(text) {
  const f = foldPl(text);
  return (
    /informacja\s+o\s+(?:odwolaniu|uniewaznieniu)\s+przetargu/i.test(f) ||
    /ogloszenie\s+o\s+(?:odwolaniu|uniewaznieniu)\s+przetargu/i.test(f) ||
    /przetarg\s+zostal\s+(?:odwolany|uniewazniony)/i.test(f)
  );
}

// ── Village & Location Normalization ─────────────────────────────────────────

const VILLAGE_MAP = {
  dobrzyniu: 'Dobrzyń',
  dobrzyn: 'Dobrzyń',
  zagrzewie: 'Zagrzewo',
  zagrzewo: 'Zagrzewo',
  muszakach: 'Muszaki',
  muszaki: 'Muszaki',
  bartoszkach: 'Bartoszki',
  bartoszki: 'Bartoszki',
  napiwodzie: 'Napiwoda',
  napiwoda: 'Napiwoda',
  jablonce: 'Jabłonka',
  jablonka: 'Jabłonka',
  waszulkach: 'Waszulki',
  waszulki: 'Waszulki',
  wiknie: 'Wikno',
  wikno: 'Wikno',
  kanigowie: 'Kanigowo',
  kanigowo: 'Kanigowo',
};

export function normalizeVillage(name) {
  if (!name) return name;
  const f = foldPl(name);
  return VILLAGE_MAP[f] || name;
}

// ── Property details extraction ──────────────────────────────────────────────

/**
 * Extract flat address from text.
 * @param {string} text
 * @returns {string|null}
 */
export function extractFlatAddressRaw(text) {
  const t = norm(text);

  // Apt number: "lokal mieszkalny nr 2", "lokal nr 3", "lokalu mieszkalnego nr 16", "m.16"
  const aptM =
    t.match(/lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr|oznaczony\s+nr)?\s*(\d+[A-Za-z]?)/i) ||
    t.match(/(?:m\.|lok\.)\s*(\d+[A-Za-z]?)/i);
  const apt = aptM ? aptM[1] : null;

  // 1. Street in Nidzica: "przy ul. Brzozowej 8", "przy ul. Warszawskiej 4A", "przy ul. Aleja Wojska Polskiego 9"
  const streetM =
    t.match(/przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)\s+(\d+[A-Za-z]?)(?:\s+w\s+Nidzicy|\s*,|\s*\.|\s+nr\s+KW|\s+obręb)/i) ||
    t.match(/przy\s+(Alej\w*\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)\s+(\d+[A-Za-z]?)(?:\s+w\s+Nidzicy|\s*,|\s*\.|\s+nr\s+KW|\s+obręb)/i);
  if (streetM) {
    let street = streetM[1].trim();
    const bldg = streetM[2].trim();
    if (/Alej/i.test(street) && !street.startsWith('ul.')) {
      street = 'ul. ' + street;
    }
    return apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
  }

  // 2. Village building: "w budynku nr 31 w Dobrzyniu" or "w budynku nr 21 w miejscowości i obrębie Zagrzewo"
  const villageBldgM =
    t.match(/w\s+budynku\s+(?:nr\s+)?(\d+[A-Za-z]?)\s+w\s+(?:miejscowości\s+(?:i\s+obrębie\s+)?)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i) ||
    t.match(/w\s+miejscowości\s+(?:i\s+obrębie\s+)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)[^.\n]*?w\s+budynku\s+(?:nr\s+)?(\d+[A-Za-z]?)/i);
  if (villageBldgM) {
    let village;
    let bldg;
    if (/^\d/.test(villageBldgM[1])) {
      bldg = villageBldgM[1].trim();
      village = normalizeVillage(villageBldgM[2].trim());
    } else {
      village = normalizeVillage(villageBldgM[1].trim());
      bldg = villageBldgM[2].trim();
    }
    return apt ? `${village} ${bldg}/${apt}` : `${village} ${bldg}`;
  }

  // 3. Village with direct number: "w Dobrzyniu 31", "w miejscowości Dobrzyniu 31", "w Muszakach 36B/9"
  const directM = t.match(/w\s+(?:miejscowości\s+(?:i\s+obrębie\s+)?)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i);
  if (directM && !/Nidzic/i.test(directM[1])) {
    const village = normalizeVillage(directM[1].trim());
    let spec = directM[2].trim();
    if (apt && !spec.includes('/')) spec += `/${apt}`;
    return `${village} ${spec}`;
  }

  // 4. Street fallback from title
  const titleStreetM = t.match(/ul\.\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)\s+(\d+[A-Za-z]?)/i);
  if (titleStreetM) {
    const street = `ul. ${titleStreetM[1].trim()}`;
    const bldg = titleStreetM[2].trim();
    return apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
  }

  return null;
}

/** Area in m2 from text. */
export function extractAreaM2(text) {
  const t = norm(text);

  // Flat usable area: "o powierzchni użytkowej 24,00 m2", "o pow. użytkowej 88,06 m2"
  const flatM =
    t.match(/o\s+pow(?:ierzchni|\.)?\s+u[żz]ytkowej\s*(\d+(?:[.,]\d+)?)\s*(m2|m²)/i) ||
    t.match(/powierzchnia\s+u[żz]ytkowa[^\n]*?wynosi\s*(\d+(?:[.,]\d+)?)\s*(m2|m²)/i) ||
    t.match(/lokal[^\n]*?o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*(m2|m²)/i);
  if (flatM) return parseAreaM2(flatM[1]);

  // Land area: "o pow. 0,1064 ha" or "o pow. 1513 m2"
  const landHaM = t.match(/o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*ha/i);
  if (landHaM) return haToM2(landHaM[1]);

  const landM2M = t.match(/o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*(m2|m²)/i);
  if (landM2M) return parseAreaM2(landM2M[1]);

  return null;
}

/** Starting price from text. */
export function startingPriceFromText(text) {
  const t = norm(text);
  const m =
    t.match(/Cena\s+wywo[łl]awcza[^\n]*?(?:wynosi|wynosi[łl]a)?(?:\s*:\s*|\s*)([0-9.,\s\u00a0]+?)\s*z[łl]/i) ||
    t.match(/Cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci[^\n]*?([0-9.,\s\u00a0]+?)\s*z[łl]/i);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved (final) price from result text. */
export function achievedPriceFromText(text) {
  const t = norm(text);
  const m =
    t.match(/Najwy[żz]sza\s+cena[^\n]*?wynios[łl]a\s*([0-9.,\s\u00a0]+?)\s*z[łl]/i) ||
    t.match(/Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu[^\n]*?(?:wynios[łl]a)?(?:\s*:\s*|\s*)([0-9.,\s\u00a0]+?)\s*z[łl]/i) ||
    t.match(/za\s+kwot[ęe]\s+([0-9.,\s\u00a0]+?)\s*z[łl]/i);
  return m ? parsePLN(m[1]) : null;
}

/** Buyer name from result text. */
export function buyerFromText(text) {
  const t = norm(text);
  const m =
    t.match(/(?:osoby\s+ustalonej\s+jako\s+)?nabywc[aą](?:\s+nieruchomo[śs]ci)?\s*:\s*([^\n\r.]+)/i) ||
    t.match(/zamkni[ęe]ty\s+z\s+wy[łl]onieniem\s+nabywcy\s*(?::\s*|\s+)([^\n\r.]+)/i);
  if (!m) return null;
  const raw = m[1].trim();
  if (/brak|nie\s+wy[łl]oniono/i.test(raw)) return null;
  return raw;
}

/** Extract parcel numbers for land. */
export function extractParcel(text) {
  const t = norm(text);
  const m =
    t.match(/(?:dzia[łl]k[ai]\s+(?:nr\s+|numer\s+|oznaczon\w+\s+numer\w*\s*:\s*)|oznaczon\w*(?:\s+jako\s+dzia[łl]k[ai])?\s+numer\w*\s*:\s*|oznaczon\w*\s+numerami\s*:\s*|oznaczon\w*\s+numerem\s+)([0-9\/\s,i]+?)(?:\s+o\s+pow|\s+wraz|\s+KW|\s*\.|\n|$)/i) ||
    t.match(/dzia[łl]k\w*\s+(?:nr\s+|numer\s+)([0-9]+(?:\/[0-9]+)?)/i);
  return m ? m[1].trim().replace(/\s+i\s+/g, ', ') : null;
}

/** Extract precinct / village for land. */
export function extractPrecinct(text) {
  const t = norm(text);
  const m =
    t.match(/obr[ęe]b(?:ie)?\s+([0-9]+(?:\s+m\.\s+Nidzica)?)/i) ||
    t.match(/obr[ęe]b(?:ie)?\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i);
  return m ? m[1].trim() : null;
}

// ── Announcement Parser ──────────────────────────────────────────────────────

/**
 * Parse announcement text into listing or land records.
 * @param {string} text
 * @param {{ detailUrl?: string, sourceUrl?: string, fallbackAuctionDate?: string|null }} [ctx]
 * @returns {Array<object>}
 */
export function parseAnnouncement(text, ctx = {}) {
  const t = norm(text);
  if (!t || isCancelled(t) || isLease(t)) return [];

  const round = roundFromText(t);
  const auction_date = ctx.fallbackAuctionDate || announceDateFromText(t) || null;
  const starting_price_pln = startingPriceFromText(t);

  // Check if flat
  const isFlat =
    /lokal\w*\s+mieszkaln|nieruchomo[śs]ci\s+lokalowej/i.test(t) ||
    (/lokal/i.test(t) && /lokal\s+mieszkalny|przebudowy.*na\s+lokal\s+mieszkalny/i.test(t));

  if (isFlat) {
    const address_raw = extractFlatAddressRaw(t);
    if (!address_raw) return [];
    const address = parseAddress(address_raw);
    if (!address) return [];

    const area_m2 = extractAreaM2(t);

    return [
      {
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2,
        starting_price_pln,
        auction_date,
        round,
        detail_url: ctx.detailUrl || null,
        source_url: ctx.sourceUrl || ctx.detailUrl || null,
      },
    ];
  }

  // Land / plots
  const isLand = /dzia[łl]k|grunt|niezabudowan/i.test(t);
  if (!isLand) return [];

  const dzialka_nr = extractParcel(t);
  const obreb = extractPrecinct(t);
  const area_m2 = extractAreaM2(t);

  // Extract street if present (e.g. "ul. Polna")
  const stM = t.match(/(?:przy\s+ul\.|ul\.)\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)(?:,|\.|\s+w\s+Nidzicy|$)/i);
  const street = stM ? `ul. ${stM[1].trim()}` : null;
  const location = street || obreb || 'Nidzica';
  const address_raw = dzialka_nr ? `${location}, dz. ${dzialka_nr}` : location;

  return [
    {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.sourceUrl || ctx.detailUrl || null,
    },
  ];
}

// ── Result Parser ────────────────────────────────────────────────────────────

/**
 * Parse one result document or resolved tender record into concluded auction records.
 * @param {string} text
 * @param {string|null} [fallbackDate]
 * @param {string|null} [sourceUrl]
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  const t = norm(text);
  if (!t || isCancelled(t) || isLease(t)) return [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  // Determine outcome
  const negative = isNegativeOutcome(t);
  const achieved = negative ? null : achievedPriceFromText(t);
  const buyer = negative ? null : buyerFromText(t);
  const positiveSignal = /wynik\s+przetargu:\s*pozytywny/i.test(t) || /zamkni[ęe]ty\s+z\s+wy[łl]onieniem\s+nabywcy/i.test(t);
  const sold = !negative && (achieved != null || buyer != null || positiveSignal);

  const notes = [];
  if (buyer) notes.push(`nabywca: ${buyer}`);
  if (sold && achieved == null && positiveSignal) {
    notes.push('wynik: pozytywny (rozstrzygnięty)');
  }

  // Is residential flat or land?
  const isFlat =
    /lokal\w*\s+mieszkaln|nieruchomo[śs]ci\s+lokalowej/i.test(t) ||
    (/lokal/i.test(t) && /lokal\s+mieszkalny|przebudowy.*na\s+lokal\s+mieszkalny/i.test(t));

  if (isFlat) {
    const address_raw = extractFlatAddressRaw(t);
    if (!address_raw) return [];
    const address = parseAddress(address_raw);
    if (!address) return [];

    const area_m2 = extractAreaM2(t);

    return [
      {
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'negative_no_bidders',
        auction_date,
        source_pdf: sourceUrl,
        notes,
      },
    ];
  }

  // Land / plot
  const isLand = /dzia[łl]k|grunt|niezabudowan/i.test(t);
  if (!isLand) return [];

  const dzialka_nr = extractParcel(t);
  const obreb = extractPrecinct(t);
  const area_m2 = extractAreaM2(t);

  const stM = t.match(/(?:przy\s+ul\.|ul\.)\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)(?:,|\.|\s+w\s+Nidzicy|$)/i);
  const street = stM ? `ul. ${stM[1].trim()}` : null;
  const location = street || obreb || 'Nidzica';
  const address_raw = dzialka_nr ? `${location}, dz. ${dzialka_nr}` : location;

  return [
    {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'negative_no_bidders',
      auction_date,
      source_pdf: sourceUrl,
      notes,
    },
  ];
}
