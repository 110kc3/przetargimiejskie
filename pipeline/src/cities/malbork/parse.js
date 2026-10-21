// Malbork parsers.
//
// Burmistrz Miasta Malborka sells municipal residential properties (nieruchomości lokalowe)
// at "ustny przetarg nieograniczony na sprzedaż" via the city BIP (bip.malbork.pl).
// Both announcement and result documents are born-digital text PDFs extracted
// via core's pdfText() (pdftotext).
//
// Document shapes:
//   ANNOUNCEMENTS ("Ogłoszenie Burmistrza Miasta Malborka z ... o przetargu na sprzedaż nieruchomości"):
//     - Header: "ogłasza w dniu <DATE> o godz. <TIME> <ROUND> ustny przetarg nieograniczony
//       na sprzedaż nieruchomości lokalowej [or lokalowych]..."
//     - Section 1 "Opis nieruchomości": prose description + property table:
//       "l.p.  adres  Pow. lokalu  Nr działki  pow. działki  udział w działce  Cena wywoławcza lokalu (VAT zw)"
//       Can list a single flat (e.g. ul. Wiosenna 31/2, ul. Mickiewicza 36/2, ul. Grunwaldzka 22/1)
//       or multiple flats in one batch (e.g. ul. 17 Marca 21/4, 21/6).
//     - Section 3 "Warunki nabycia nieruchomości": wadium deadline ("płatne najpóźniej do <DATE> r.").
//
//   RESULTS ("Informacja o wynikach przetargu przeprowadzonego w dniu <DATE> r. na sprzedaż nieruchomości lokalowej"):
//     - Published under two boards:
//       * Menu 180 (rozstrzygnięte): sales concluded (nabywca wyłoniony, cena wylicytowana).
//       * Menu 203 (nierozstrzygnięte): negative outcomes (brak uczestników / nie wyłoniono nabywcy).
//     - Section 2: property table with address, area and starting price.
//     - Section 3: participant statement ("Do przetargu przystąpił jeden uczestnik" / "nie przystąpił żaden uczestnik").
//     - Section 4: outcome clause:
//       * Sold: "W wyniku przetargu wyłoniono nabywcę... za cenę <FINAL> zł" or
//         "wylicytował lokal za cenę <FINAL> zł po udzieleniu bonifikaty...".
//         In multi-flat auctions: bulleted per-unit lines ("- lokal 17 Marca 21/7 za cenę 905 210 zł").
//       * Unsold: "W wyniku przetargu nie wyłoniono nabywcy nieruchomości".

import { parseAddress } from '../../core/normalize.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROUND_MAP = {
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, 'piąty': 5, piaty: 5,
  'szósty': 6, szosty: 6, 'siódmy': 7, siodmy: 7, 'ósmy': 8, osmy: 8,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8,
};

/** Parse Polish currency string (e.g. "909 080 zł", "518 479,00 zł") to integer PLN. */
export function parsePLN(str) {
  if (str == null) return null;
  const cleaned = String(str)
    .replace(/z[łl]/gi, '')
    .replace(/[\s\u00a0.]/g, '')
    .replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse decimal number string (comma or dot) into float. */
export function parseNum(str) {
  if (str == null) return null;
  const n = Number(String(str).replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Normalize whitespace. */
export function normalizeWs(s) {
  return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
}

/** Parse a Polish date string (DD.MM.YYYY or DD Month YYYY) into ISO YYYY-MM-DD. */
export function parsePolishDate(str) {
  if (!str) return null;
  const dm = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(str);
  if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  const wm = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(str);
  if (wm) {
    const mo = PL_MONTH[wm[2].toLowerCase()];
    if (mo) return `${wm[3]}-${String(mo).padStart(2, '0')}-${wm[1].padStart(2, '0')}`;
  }
  return null;
}

/** Check if text describes a flat sale (lokal mieszkalny / nieruchomość lokalowa). */
export function isFlat(text) {
  return /lokal\w*\s+mieszkaln|nieruchomo[śs]c\w*\s+lokalow/i.test(text || '');
}

/** Check if title or attachment name is explicitly skippable (leases, seasonal sales, flowers). */
export function isSkippable(text) {
  const t = String(text || '').toLowerCase();
  return (
    /dzier[żz]aw|najem|kwiat[óo]w|zniczy|sezonow|roln\w*\s+obr|cmentarz/i.test(t) &&
    !/lokal\w*\s+mieszkaln|nieruchomo[śs]c\w*\s+lokalow/i.test(t)
  );
}

/** Extract auction date from notice text or fallback date. */
export function extractAuctionDate(text, fallbackDate = null) {
  const norm = normalizeWs(text);
  // Announcement pattern: "ogłasza w dniu <DATE> ... przetarg"
  const am = /og[łl]asza\s+w\s+dniu\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm);
  if (am) {
    const d = parsePolishDate(am[1]);
    if (d) return d;
  }
  // Result pattern: "przeprowadzonego w dniu <DATE> ... na sprzedaż"
  const rm = /przeprowadzon\w*\s+w\s+dniu\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm);
  if (rm) {
    const d = parsePolishDate(rm[1]);
    if (d) return d;
  }
  return fallbackDate;
}

/** Extract round ordinal number from announcement text. */
export function extractRound(text) {
  const norm = normalizeWs(text);
  const m = /og[łl]asza[\s\S]{0,120}?(pierwszy|drugi|trzeci|czwarty|pi[ąa]ty|sz[óo]sty|si[óo]dmy|[ivx]+)\s+ustny\s+przetarg/i.exec(norm);
  if (m) {
    const word = m[1].toLowerCase();
    if (ROUND_MAP[word]) return ROUND_MAP[word];
  }
  return 1;
}

/** Extract wadium deadline date from announcement text. */
export function extractWadiumDeadline(text) {
  const norm = normalizeWs(text);
  const m = /wadium[\s\S]{0,600}?p[łl]atne[\s\S]{0,600}?do\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm);
  if (m) return parsePolishDate(m[1]);
  return null;
}

/**
 * Extract flat table rows from announcement or result notice text.
 * Each row returns { addressRaw, area_m2, starting_price_pln }.
 */
export function extractTableRows(text) {
  const rows = [];
  const lines = String(text || '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Standard row: "[1.] ul. Street 12/3  120,66 m2 ... 518 479 zł"
    const m = /(?:^\s*\d+\.?\s+)?(ul\.\s+[A-ZĄĆĘŁŃÓŚŹŻ0-9][^,\n]+?\s+\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s+(\d+(?:[.,]\d+)?)\s*m[2²][\s\S]*?(\d{1,3}(?:[ \u00a0]\d{3})*)\s*z[łl]/i.exec(line);
    if (m) {
      rows.push({
        addressRaw: m[1].trim(),
        area_m2: parseNum(m[2]),
        starting_price_pln: parsePLN(m[3]),
      });
      continue;
    }

    // Split line row (where building/apt is placed on next line below street):
    // Line i:   "ul. Poczty Gdańskiej   126,38 m2 98/19 0.0178 0,261 542 029 zł"
    // Line i+1: "        20/2                                 ha"
    const mSplit = /(?:^\s*\d+\.?\s+)?(ul\.\s+[A-ZĄĆĘŁŃÓŚŹŻ0-9][^\n]+?)\s+(\d+(?:[.,]\d+)?)\s*m[2²][\s\S]*?(\d{1,3}(?:[ \u00a0]\d{3})*)\s*z[łl]/i.exec(line);
    if (mSplit && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const bldgAptM = /^\s*(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\b/.exec(nextLine);
      if (bldgAptM) {
        rows.push({
          addressRaw: `${mSplit[1].trim()} ${bldgAptM[1]}`,
          area_m2: parseNum(mSplit[2]),
          starting_price_pln: parsePLN(mSplit[3]),
        });
        i++;
        continue;
      }
    }
  }

  // Fallback: single-flat announcement where table header is missing or non-tabular
  if (rows.length === 0) {
    const norm = normalizeWs(text);
    const addrM = /po[łl]o[żz]ona\s+w\s+budynku\s+przy\s+(ul\.\s+[A-ZĄĆĘŁŃÓŚŹŻ0-9][^,]+?\s+\d+[a-zA-Z]?)/i.exec(norm);
    const flatM = /lokal\s+(?:mieszkalny\s+)?nr\s+(\d+[a-zA-Z]?)/i.exec(norm);
    const areaM = /(\d+(?:[.,]\d+)?)\s*m[2²]/i.exec(norm);
    const priceM = /cena\s+wywo[łl]awcza[\s\S]{0,50}?(\d{1,3}(?:[ \u00a0]\d{3})*)\s*z[łl]/i.exec(norm);
    if (addrM && priceM) {
      const bldg = addrM[1].trim();
      const addrRaw = flatM ? `${bldg}/${flatM[1]}` : bldg;
      rows.push({
        addressRaw: addrRaw,
        area_m2: areaM ? parseNum(areaM[1]) : null,
        starting_price_pln: parsePLN(priceM[1]),
      });
    }
  }

  return rows;
}

/**
 * Extract mapping of sold flats to achieved prices from Section 4 of result notice.
 * Returns Map<flatIdentifier, pricePLN>.
 */
export function extractSoldMap(text, rows) {
  const soldMap = new Map();
  const s4Idx = text.search(/4\.\s*W\s+wyniku\s+przetargu/i);
  if (s4Idx < 0) return soldMap;
  const s4Text = text.slice(s4Idx);

  // If explicit negative outcome stated across the board
  if (/nie\s+wy[łl]oniono\s+nabywcy/i.test(s4Text)) {
    return soldMap;
  }

  // Case 1: Bulleted list of sold flats (e.g. 17 Marca 21)
  // e.g. "- lokal 17 Marca 21/7 za cenę 905 210 zł"
  const bulletRe = /[-–]\s*lokal\s+(?:(?:przy\s+ul\.\s+)?[^–\n]+?\s+)?(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*(?:[-–]\s*)?za\s+cen[ęe]\s*(\d[\d\s\u00a0]*)\s*z[łl]/gi;
  let bm;
  while ((bm = bulletRe.exec(s4Text)) !== null) {
    const ref = bm[1].trim();
    const price = parsePLN(bm[2]);
    soldMap.set(ref, price);
  }

  // Case 2: Named flat in prose:
  // e.g. "wyłoniono nabywcę dla nieruchomości lokalowej przy ul. 17 Marca 22/2 – Arkadiusz Kisiel wylicytował lokal za cenę 350 970zł"
  const proseRe = /przy\s+ul\.\s+[^–\n]+?\s+(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s*[–-][^–\n]+?(?:wylicytowa[łl]\w*(?:\s+lokal)?\s+za\s+cen[ęe]|za\s+cen[ęe])\s*(\d[\d\s\u00a0]*)\s*z[łl]/gi;
  let pm;
  while ((pm = proseRe.exec(s4Text)) !== null) {
    const ref = pm[1].trim();
    const price = parsePLN(pm[2]);
    soldMap.set(ref, price);
  }

  // Case 3: Single flat auction where buyer is declared
  if (rows.length === 1 && soldMap.size === 0 && /wy[łl]oniono\s+nabywc[ęe]/i.test(s4Text)) {
    const sm = /(?:wylicytowa[łl]\w*(?:\s+lokal)?\s+za\s+cen[ęe]|za\s+cen[ęe])\s*(\d[\d\s\u00a0]*)\s*z[łl]/i.exec(s4Text);
    if (sm) {
      const price = parsePLN(sm[1]);
      const rowRef = rows[0].addressRaw;
      soldMap.set(rowRef, price);
      const addr = parseAddress(rowRef);
      if (addr) {
        soldMap.set(`${addr.building}/${addr.apt || ''}`.replace(/\/$/, ''), price);
        if (addr.apt) soldMap.set(addr.apt, price);
      }
    }
  }

  return soldMap;
}

/**
 * Parse an announcement PDF into listing records.
 * @param {string} pdfTextRaw   pdftotext text of the announcement PDF
 * @param {string} detailUrl    article URL on the BIP
 * @param {string} sourcePdf    direct PDF download URL
 * @param {string} [attName]    attachment file name (optional hint)
 * @returns {object[]} array of active listing objects
 */
export function parseAnnouncement(pdfTextRaw, detailUrl, sourcePdf, attName = '') {
  if (!isFlat(pdfTextRaw) && !isFlat(attName)) return [];

  const auction_date = extractAuctionDate(pdfTextRaw);
  const round = extractRound(pdfTextRaw);
  const wadium_deadline = extractWadiumDeadline(pdfTextRaw);
  const rows = extractTableRows(pdfTextRaw);
  const listings = [];

  for (const row of rows) {
    const address = parseAddress(row.addressRaw);
    if (!address) continue;
    listings.push({
      kind: 'mieszkalny',
      address_raw: row.addressRaw,
      address,
      area_m2: row.area_m2,
      starting_price_pln: row.starting_price_pln,
      auction_date,
      round,
      wadium_deadline,
      detail_url: detailUrl,
      source_pdf: sourcePdf,
    });
  }

  return listings;
}

/**
 * Framework entry point: parse one result notice PDF into result records.
 * @param {string} text pdftotext text of the result notice PDF
 * @param {string|null} fallbackDate fallback ISO auction date
 * @param {string} sourceUrl the PDF download URL
 * @returns {object[]} array of result records
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isFlat(text)) return [];

  const auction_date = extractAuctionDate(text, fallbackDate);
  const rows = extractTableRows(text);
  if (!rows.length) return [];

  const soldMap = extractSoldMap(text, rows);
  const isGlobalNegative =
    /nie\s+wy[łl]oniono\s+nabywcy|nie\s+przyst[ąa]pi[łl]\s+[żz]aden\s+uczestnik|brak\s+uczestnik[óo]w|brak\s+oferent[óo]w|wynikiem\s+negatywnym/i.test(text) &&
    !/wy[łl]oniono\s+nabywc[ęe]/i.test(text);

  const out = [];

  for (const row of rows) {
    const address = parseAddress(row.addressRaw);
    if (!address) continue;

    const bldgApt = `${address.building}/${address.apt || ''}`.replace(/\/$/, '');
    const aptOnly = address.apt;

    let final_price_pln =
      soldMap.get(row.addressRaw) ??
      soldMap.get(bldgApt) ??
      (aptOnly ? soldMap.get(aptOnly) : null);

    const sold = final_price_pln != null && !isGlobalNegative;

    let unsold_reason = null;
    if (!sold) {
      if (/nie\s+przyst[ąa]pi[łl]\s+[żz]aden\s+uczestnik|brak\s+uczestnik[óo]w|brak\s+oferent[óo]w/i.test(text)) {
        unsold_reason = 'no_participants';
      } else if (/wadium/i.test(text) && /nie\s+wp[łl]yn[ęe][łl]o|brak\s+wp[łl]at/i.test(text)) {
        unsold_reason = 'no_wadium';
      } else if (soldMap.size > 0) {
        unsold_reason = 'no_bids';
      } else {
        unsold_reason = 'negative';
      }
    }

    const notes = [];
    if (address.warning) notes.push(address.warning);
    if (row.starting_price_pln == null) notes.push('parse: missing starting price');

    out.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw: row.addressRaw,
      address,
      round: null,
      starting_price_pln: row.starting_price_pln,
      final_price_pln: sold ? final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : unsold_reason,
      area_m2: row.area_m2,
      notes,
    });
  }

  return out;
}
