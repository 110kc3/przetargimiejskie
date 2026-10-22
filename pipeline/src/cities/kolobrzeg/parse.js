// Kołobrzeg parsers.
//
// Extracts property records from BIP announcements, wykazy, and result protocols
// published by Urząd Miasta Kołobrzeg (Prezydent Miasta Kołobrzeg).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROUND_MAP = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8,
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, 'piąty': 5, piaty: 5,
  szósty: 6, szosty: 6, siódmy: 7, siodmy: 7, ósmy: 8, osmy: 8,
};

/** Normalize whitespace */
export function normalizeWs(s) {
  return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
}

/** Parse Polish date string into ISO YYYY-MM-DD */
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

/** Parse Polish currency string to integer PLN */
export function parsePLN(str) {
  if (str == null) return null;
  const cleaned = String(str)
    .replace(/z[łl]/gi, '')
    .replace(/[\s\u00a0.]/g, '')
    .replace(/,\d{2}$/, '')
    .replace(/,-$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse decimal number to float */
export function parseNum(str) {
  if (str == null) return null;
  const n = Number(String(str).replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Check if text relates to residential premises */
export function isFlat(text) {
  return /lokal\w*\s+mieszkaln|nieruchomo[śs]c\w*\s+lokalow/i.test(text || '');
}

/** Check if text relates to land plots */
export function isLand(text) {
  return /(?:niezabudowan\w*|dzia[łl]k\w*)/i.test(text || '');
}

/** Check if item is explicitly skippable (leases, non-property announcements) */
export function isSkippable(text) {
  const t = String(text || '').toLowerCase();
  return (
    /(?:dzier[żz]aw|najem|kwiat[óo]w|zniczy|sezonow|cmentarz|odwo[łl]uje|lista\s+os[óo]b\s+zakwalifikowanych)/i.test(t) &&
    !isFlat(t)
  );
}

/** Extract auction round */
export function extractRound(text) {
  if (!text) return null;
  const rm =
    /(?:rozstrzygni[eę]cie|wyniku?)\s+(\d+)\s+przetargu/i.exec(text) ||
    /(\d+)\s+(?:ustn\w+\s+)?(?:przetarg|rokowa)/i.exec(text) ||
    /(I{1,3}|IV|V|VI|VII|VIII|pierwszy|drugi|trzeci|czwarty|pi[ąa]ty|sz[óo]sty)\s+(?:ustn\w+\s+)?(?:przetarg|rokowa)/i.exec(text);
  if (rm) {
    const raw = rm[1].toLowerCase();
    return Number(rm[1]) || ROUND_MAP[raw] || null;
  }
  return null;
}

/** Extract auction date */
export function extractAuctionDate(text, fallbackDate = null) {
  if (!text) return fallbackDate;
  const norm = normalizeWs(text);

  const dm =
    /przetarg\s+odb[eę]dzie\s+si[eę]\s+w\s+dniu\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm) ||
    /w\s+dniu\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})[^\n]*?odb[eę]dzie\s+si[eę]/i.exec(norm) ||
    /Termin:\s*(?:dnia\s*)?(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm) ||
    /w\s+dniu\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})[^\n]*?przeprowadzony\s+zosta[łl]/i.exec(norm) ||
    /przeprowadzony\s+zosta[łl][^\n]*?w\s+dniu\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm);

  if (dm) {
    const parsed = parsePolishDate(dm[1]);
    if (parsed) return parsed;
  }
  return fallbackDate;
}

/** Extract wadium deadline */
export function extractWadiumDeadline(text) {
  if (!text) return null;
  const norm = normalizeWs(text);
  const wm =
    /wadium[^\n]*?do\s+dnia\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})/i.exec(norm) ||
    /do\s+dnia\s+(\d{1,2}(?:\.|\s+)[a-ząćęłńóśźż\d]+(?:\.|\s+)\d{4})[^\n]*?wadium/i.exec(norm);
  return wm ? parsePolishDate(wm[1]) : null;
}

/** Extract property address from document or hint */
export function extractAddress(text, hintTitle = '') {
  // Check attachment metadata or hint title first
  const attM = /\[ATTACHMENT:\s*([^\]]+)\]/i.exec(text);
  const candidateTexts = [attM?.[1], hintTitle, text].filter(Boolean);

  for (const candidate of candidateTexts) {
    // 1. Check for: ul. Street Building/Apt
    const directM = /ul\.\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\.\d-]+?\s+\d+[a-zA-Z]?\s*\/\s*\d+[a-zA-Z]?)/i.exec(candidate);
    if (directM && !/ratuszow/i.test(directM[1])) {
      const p = parseAddress('ul. ' + directM[1].trim());
      if (p) return p;
    }

    // 2. Check for: ul. Street Building and lokal nr Apt
    const stM = /ul\.\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\.\d-]+?\s+\d+[a-zA-Z]?)/i.exec(candidate);
    const aptM = /lokal\w*\s+mieszkaln\w*\s+(?:nr\s+)?(\d+[a-zA-Z]?)/i.exec(candidate);
    if (stM && aptM && !/ratuszow/i.test(stM[1])) {
      const p = parseAddress(`ul. ${stM[1].trim()}/${aptM[1]}`);
      if (p) return p;
    }
  }

  // 3. Fallback to clean document body (ignoring municipal seat Ratuszowa 13)
  const bodyClean = text.replace(/ul\.\s*Ratuszow\w*\s*\d+/gi, '');
  const bodyDirect = /ul\.\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\.\d-]+?\s+\d+[a-zA-Z]?\s*\/\s*\d+[a-zA-Z]?)/i.exec(bodyClean);
  if (bodyDirect) {
    const p = parseAddress('ul. ' + bodyDirect[1].trim());
    if (p) return p;
  }
  const bodySt = /ul\.\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\.\d-]+?\s+\d+[a-zA-Z]?)/i.exec(bodyClean);
  const bodyApt = /lokal\w*\s+mieszkaln\w*\s+(?:nr\s+)?(\d+[a-zA-Z]?)/i.exec(bodyClean);
  if (bodySt) {
    const apt = bodyApt ? `/${bodyApt[1]}` : '';
    const p = parseAddress(`ul. ${bodySt[1].trim()}${apt}`);
    if (p) return p;
  }

  return null;
}

/** Extract unit area in m2 */
export function extractArea(text) {
  if (!text) return null;
  const norm = normalizeWs(text);
  const am =
    /powierzchni\s+u[żz]ytkowej\s+(\d+(?:[.,]\d+)?)\s*(?:m[2²\?ż]|mkw|\s)/i.exec(norm) ||
    /(\d+(?:[.,]\d+)?)\s*(?:m[2²\?ż]|mkw)\s+wraz\s+z/i.exec(norm) ||
    /pow\.\s*(?:u[żz]ytkowa|lokalu)?:?\s*(\d+(?:[.,]\d+)?)/i.exec(norm);
  return am ? parseNum(am[1]) : null;
}

/** Extract starting price */
export function extractStartingPrice(text) {
  if (!text) return null;
  const norm = normalizeWs(text);
  const spM =
    /Cena\s+wywo[łl]awcza[^\n]*?(\d{2,3}[.\s]\d{3}(?:,\d{2}|,-))/i.exec(norm) ||
    /(\d{2,3}[.\s]\d{3}(?:,\d{2}|,-))\s*(?:z[łl]|brutto|\(zw)/i.exec(norm) ||
    /(\d{2,3}[.\s]\d{3}(?:,\d{2}|,-))/i.exec(norm);
  return spM ? parsePLN(spM[1]) : null;
}

/** Extract wadium amount */
export function extractWadium(text, startingPrice = null) {
  if (!text) return null;
  // In Kołobrzeg tables: "... (Dz. U. ...)\t<WADIUM>\t<POSTĄPIENIE>\n\nPrzetarg odbędzie"
  const tabM = /(\d{1,3}[.\s]\d{3},\d{2})\s*\t\s*\d{1,3}[.\s]\d{3},\d{2}\s*\n+Przetarg odb/i.exec(text);
  if (tabM) {
    const val = parsePLN(tabM[1]);
    if (val) return val;
  }
  const wm = /Wadium\s*(?:w\s*z[łl])?[^\n]*?(\d{1,3}[.\s]\d{3}(?:,\d{2}|,-))/i.exec(text);
  if (wm) {
    const val = parsePLN(wm[1]);
    if (val && (!startingPrice || val < startingPrice)) return val;
  }
  // Standard 10% default if indicated in text
  if (startingPrice && /wadium.*10%/i.test(text)) {
    return Math.round(startingPrice * 0.1);
  }
  return null;
}

/** Extract wykaz reference number */
export function extractWykazNo(text) {
  if (!text) return null;
  const m = /GN\.6840\.[0-9a-zA-Z\.\/-]+/i.exec(text) || /Nr\s+(\d+\/\d+)/i.exec(text);
  return m ? m[0].trim() : null;
}

/**
 * Parse one announcement document (.doc / .pdf text).
 * @param {string} text Extracted document text
 * @param {object} meta Metadata: { title, publishDate, detail_url, source_url }
 * @returns {Array<object>} Parsed listing records
 */
export function parseAnnouncement(text, meta = {}) {
  const combined = `${meta.title || ''}\n${text || ''}`;
  const titleKind = meta.title ? classifyKind(meta.title) : 'unknown';
  const kind = titleKind !== 'unknown' ? titleKind : classifyKind(combined);
  const isLandPlot = kind === 'grunt';

  const address = extractAddress(text, meta.title || '');
  if (!address && !isLandPlot) return [];

  const auction_date = extractAuctionDate(text);
  const round = extractRound(meta.title) || extractRound(text);
  const area_m2 = extractArea(text);
  const starting_price_pln = extractStartingPrice(text);
  const wadium_pln = extractWadium(text, starting_price_pln);
  const wadium_deadline = extractWadiumDeadline(text);

  if (isLandPlot) {
    const dzM = /dzia[łl][kc]\w*(?:[\s\S]{0,50}?)\bnr(?::|\.)?\s*([0-9]+(?:\/[0-9]+)?(?:\s*(?:,|i)\s*[0-9]+(?:\/[0-9]+)?)*)/i.exec(combined);
    const dzialka_nr = dzM ? dzM[1].replace(/\s+i\s+/g, ', ').replace(/\s+/g, ' ').trim() : null;
    const obM = /obr(?:[ęe]b\w*|\.)\s*(\d+)/i.exec(combined);
    const obreb = obM ? obM[1] : null;

    return [
      {
        kind: 'grunt',
        dzialka_nr,
        obreb,
        address_raw: address?.street ? `ul. ${address.street}` : null,
        address: address || null,
        area_m2,
        starting_price_pln,
        wadium_pln,
        wadium_deadline,
        auction_date,
        round,
        detail_url: meta.detail_url || null,
        source_url: meta.source_url || null,
      },
    ];
  }

  return [
    {
      kind,
      address,
      area_m2,
      starting_price_pln,
      wadium_pln,
      wadium_deadline,
      auction_date,
      round,
      detail_url: meta.detail_url || null,
      source_url: meta.source_url || null,
    },
  ];
}

/**
 * Parse one wykaz designation item.
 * @param {string} text Extracted document text
 * @param {object} meta Metadata: { title, publishDate, detail_url, source_url }
 * @returns {Array<object>}
 */
export function parseWykazItem(text, meta = {}) {
  const address = extractAddress(text, meta.title || '');
  if (!address) return [];

  return [
    {
      address,
      published_date: meta.publishDate ? meta.publishDate.slice(0, 10) : null,
      wykaz_no: extractWykazNo(text),
      detail_url: meta.detail_url || null,
      source_url: meta.source_url || null,
    },
  ];
}

/**
 * Framework entry point: parse one result notice document into result records.
 * @param {string} text pdftotext/OCR text of the result notice
 * @param {string|null} fallbackDate fallback ISO auction date
 * @param {string} sourceUrl the PDF / attachment URL
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const norm = normalizeWs(text);

  // Guard: must be a result notice
  if (!/informacja\s+o\s+wyniku|rozstrzygni[eę]cie|protok[óo][łl]\s+z\s+przetargu/i.test(norm)) {
    return [];
  }

  const address = extractAddress(text);
  if (!address) return [];

  const auction_date = extractAuctionDate(text, fallbackDate);
  const round = extractRound(text);
  let starting_price_pln = extractStartingPrice(text);
  const area_m2 = extractArea(text);

  // Outcome detection
  const isNegative =
    /brak\s+ofert|nie\s+wy[łl]oniono\s+nabywcy|brak\s+uczestnik[óo]w|nie\s+przyst[ąa]pi[łl]|wynikiem\s+negatywnym|\bbrak\b/i.test(
      norm,
    ) || /[-–=]\s+[-–=]\s+[-–=]/.test(text);

  // Sold detection: buyer statement or achieved price
  let buyer = null;
  const buyerM = /(?:Pan|Pani|Sp\.|Sp[óo][łl]ka)\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s-]+?)(?:\n|\r|\.|$)/i.exec(text);
  if (buyerM) {
    let b = buyerM[0].trim();
    const parts = b.split(/\s+/);
    if (parts.length === 2 && /^(?:Pan|Pani)$/i.test(parts[0])) {
      const lines = text.split('\n');
      const idx = lines.findIndex((l) => l.includes(b));
      if (idx !== -1 && lines[idx + 1]) {
        const lastWord = lines[idx + 1].trim().split(/\s+/).pop();
        if (/^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+$/.test(lastWord) && !/^(?:Kołobrzeg|VAT|lokal|gruntu|lokali)$/i.test(lastWord)) {
          b = `${b} ${lastWord}`;
        }
      }
    }
    buyer = b;
  }

  let final_price_pln = null;

  // 1. Two consecutive prices in table row: e.g. "500.000,00 505.000,00 1 - Pan Rafał"
  const rowPricesM = /(\d{2,3}[.\s]\d{3},\d{2})\s+(\d{2,3}[.\s]\d{3},\d{2})/i.exec(text);
  if (rowPricesM) {
    const p1 = parsePLN(rowPricesM[1]);
    const p2 = parsePLN(rowPricesM[2]);
    if (p1 && p2 && p2 >= p1) {
      if (!starting_price_pln) starting_price_pln = p1;
      final_price_pln = p2;
    }
  }

  // 2. Explicit "Cena wylicytowana" or "wylicytował"
  if (!final_price_pln) {
    const soldPriceM =
      /Cena\s+wylicytowana[^\n]*\n[^\n]*?(\d{2,3}[.\s]\d{3},\d{2})/i.exec(text) ||
      /wylicytowan\w*\s+za\s+cen[eę]\s+(\d{2,3}[.\s]\d{3}(?:,\d{2}|,-))/i.exec(text);
    if (soldPriceM) {
      final_price_pln = parsePLN(soldPriceM[1]);
    }
  }

  const sold = Boolean(buyer || (final_price_pln != null && final_price_pln >= (starting_price_pln || 0)));

  return [
    {
      auction_date,
      round,
      kind: 'mieszkalny',
      address,
      starting_price_pln,
      final_price_pln: sold ? final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : isNegative ? 'brak ofert' : 'unknown',
      buyer: sold ? buyer : null,
      area_m2,
      source_pdf: sourceUrl || null,
      notes: [],
    },
  ];
}
