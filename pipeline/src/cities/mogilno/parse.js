// Mogilno parsers — handles Nefeni CMS HTML pages and scanned/text PDF notices.
//
// Groundtruthed against real notices from bip.mogilno.pl:
//   - Active announcement (residential): Wyrobki nr 7 (dz. 19/13, lokal 39,41 m², cena 44 000 zł)
//   - Spike reference: Wasielewko nr 18 lok. 3 (lokal 48,20 m², cena 65 000 zł, II przetarg)
//   - Result notice (sold land): dz. 416/3 obręb Mogilno, 16 000 zł, nabywcy Woźniak
//   - Result notice (unsold land): dz. 179/1 obręb Chabsko, 120 000 zł, nikt się nie stawił

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export const PL_MONTHS = {
  stycznia: '01',
  luty: '02',
  lutego: '02',
  marca: '03',
  kwietnia: '04',
  maja: '05',
  czerwca: '06',
  lipca: '07',
  sierpnia: '08',
  września: '09',
  wrzesnia: '09',
  października: '10',
  pazdziernika: '10',
  listopada: '11',
  grudnia: '12',
};

export function parsePLN(s) {
  if (s == null) return null;
  const str = String(s).trim();
  const withoutGrosze = str.replace(/,\d{2}(?:\s*(?:z[lł]|PLN|\+|$|\b))/i, '');
  const digits = withoutGrosze.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/\s+/g, '').replace(/,/g, '.');
  const m = /^(\d+(?:\.\d+)?)/.exec(cleaned);
  if (!m) return null;
  const val = Number(m[1]);
  return Number.isFinite(val) && val > 0 ? val : null;
}

/**
 * Clean an address string before passing to core/normalize.js parseAddress.
 * Strips municipality prefixes and normalizes "nr X lok. Y" to "X/Y".
 */
export function cleanAddressString(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip city/prefix
  s = s.replace(/^(?:w\s+miejscowo[śs]ci|w\s+m\.|w\s+Mogilnie)\s+/i, '');
  s = s.replace(/^(?:Mogilno|Mogilnie)[,\s]+(?:przy\s+)?/i, '');
  s = s.replace(/^przy\s+/i, '');
  // "nr 18 lok. 3" -> "18/3", "nr 18 m. 3" -> "18/3"
  s = s.replace(/\bnr\s*(\d+[A-Za-z]?)\s*(?:lok\.|lokalu|m\.)\s*(\d+[A-Za-z]?)/i, '$1/$2');
  // "nr 7" -> "7"
  s = s.replace(/\bnr\s*(\d+[A-Za-z]?)/i, '$1');
  // Strip trailing punctuation
  s = s.replace(/[,;.]\s*$/, '');
  return s.trim();
}

/**
 * Extract address from announcement / result text or fallback title.
 */
export function addressFromText(text, fallbackTitle = '') {
  const combined = `${text || ''} ${fallbackTitle || ''}`;
  // 1. "położonej w miejscowości <Village> nr <Bldg> [lok. <Apt>]"
  const mLoc = /po[lł]o[zż]on\w+\s+w\s+miejscowo[śs]ci\s+([A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+(?:\s+nr\s*\d+[A-Za-z]?(?:\s*(?:lok\.|lokalu|m\.)\s*\d+)?)?)/i.exec(combined);
  if (mLoc) {
    const cleaned = cleanAddressString(mLoc[1]);
    const addr = parseAddress(cleaned);
    if (addr) return addr;
  }

  // 2. "położonej w Mogilnie przy ul. <Street> <Bldg>[/<Apt>]"
  const mStreet = /(?:w\s+Mogilnie\s+)?przy\s+(?:ul\.|al\.|os\.|pl\.)?\s*([A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+)?\s+\d+[A-Za-z]?(?:[/\\]\d+)?)/i.exec(combined);
  if (mStreet) {
    const cleaned = cleanAddressString(mStreet[1]);
    const addr = parseAddress(cleaned);
    if (addr) return addr;
  }

  // 3. Table row: "Położenie nieruchomości ... Wyrobki nr 7" or "położenie: Wyrobki 7"
  const mRow = /Po[lł]o[zż]eni[ea](?:\s+nieruchomo[śs]ci)?\s*[:\s]+(?:w\s+miejscowo[śs]ci\s+)?([A-ZŁŚĆĘĄÓŹŻ][^\n\r]+)/i.exec(text || '');
  if (mRow) {
    const rawVal = mRow[1].trim().replace(/\s+/g, ' ');
    const cleaned = cleanAddressString(rawVal);
    const addr = parseAddress(cleaned);
    if (addr) return addr;
  }

  // 4. Try from fallback title
  if (fallbackTitle) {
    const mTitleLoc = /w\s+miejscowo[śs]ci\s+([A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+(?:\s+nr\s*\d+[A-Za-z]?(?:\s*(?:lok\.|lokalu|m\.)\s*\d+)?)?)/i.exec(fallbackTitle);
    if (mTitleLoc) {
      const cleaned = cleanAddressString(mTitleLoc[1]);
      const addr = parseAddress(cleaned);
      if (addr) return addr;
    }
    const mTitleStreet = /przy\s+(?:ul\.|al\.|os\.|pl\.)?\s*([A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+)?\s+\d+[A-Za-z]?(?:[/\\]\d+)?)/i.exec(fallbackTitle);
    if (mTitleStreet) {
      const cleaned = cleanAddressString(mTitleStreet[1]);
      const addr = parseAddress(cleaned);
      if (addr) return addr;
    }
  }

  return null;
}

/**
 * Extract auction date from text.
 * Prefers explicit auction date phrases to avoid publication/citation decoy dates.
 */
export function auctionDateFromText(text) {
  if (!text) return null;

  // Pattern with spelled out Polish month: "odbył/odbędzie się ... w dniu DD miesiąc YYYY"
  const mWord = /(?:odby[lł]\s+si[eę]|odb[eę]dzie\s+si[eę]|termin\s+przetargu)[\s\S]{0,60}?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (mWord) {
    const mon = PL_MONTHS[mWord[2].toLowerCase()];
    if (mon) {
      return `${mWord[3]}-${mon}-${mWord[1].padStart(2, '0')}`;
    }
  }

  // Pattern with dotted/dashed date: "odbył/odbędzie się ... w dniu DD.MM.YYYY"
  const mNum = /(?:odby[lł]\s+si[eę]|odb[eę]dzie\s+si[eę]|termin\s+przetargu)[\s\S]{0,60}?w\s+dniu\s+(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text);
  if (mNum) {
    return `${mNum[3]}-${mNum[2].padStart(2, '0')}-${mNum[1].padStart(2, '0')}`;
  }

  // General "w dniu DD.MM.YYYY r. o godz." (common in announcements)
  const mGen = /w\s+dniu\s+(\d{1,2})[.-](\d{1,2})[.-](\d{4})\s*r\.\s*(?:o\s*godz\.)?/i.exec(text);
  if (mGen) {
    return `${mGen[3]}-${mGen[2].padStart(2, '0')}-${mGen[1].padStart(2, '0')}`;
  }

  // General "dnia DD.MM.YYYY r."
  const mDnia = /dnia\s+(\d{1,2})[.-](\d{1,2})[.-](\d{4})\s*r\./i.exec(text);
  if (mDnia) {
    return `${mDnia[3]}-${mDnia[2].padStart(2, '0')}-${mDnia[1].padStart(2, '0')}`;
  }

  return null;
}

/**
 * Extract tender round from text or title.
 */
export function roundFromText(text) {
  if (!text) return 1;
  const roman = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(text);
  if (roman) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const val = ROMAN[roman[1].toLowerCase()];
    if (val) return val;
  }
  if (/\bpierwszy\s+przetarg/i.test(text)) return 1;
  if (/\bdrugi\s+przetarg/i.test(text)) return 2;
  if (/\btrzeci\s+przetarg/i.test(text)) return 3;
  if (/\bczwarty\s+przetarg/i.test(text)) return 4;
  return 1;
}

/**
 * Extract starting price from announcement or result text.
 */
export function startingPriceFromText(text) {
  if (!text) return null;
  const m = /Cena\s+wywo[lł]awcza(?:[^\n\r\d]*)([\d][\d\s.,]*)(?:,\d{2})?\s*(?:z[lł]|PLN|\+)/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p) return p;
  }
  // Table fallback: "44.000,00"
  const mTable = /(\d{1,3}(?:\.\d{3})+,\d{2})\s*(?:HAR|-|z[lł]|PLN)/i.exec(text);
  if (mTable) {
    const p = parsePLN(mTable[1]);
    if (p) return p;
  }
  return null;
}

/**
 * Extract final achieved price from result text.
 */
export function finalPriceFromText(text) {
  if (!text) return null;
  // If result is negative / no buyer / unsold, return null
  if (/nierozstrzygni[eę]t|wynikiem\s+negatywnym|nikt\s+si[eę]\s+nie\s+stawi[lł]/i.test(text)) {
    return null;
  }
  const m = /(?:Najwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta|Cena\s+osi[aą]gni[eę]ta)[\s\S]{0,80}?([\d][\d\s.,]*)(?:,\d{2})?\s*(?:z[lł]|PLN)/i.exec(text);
  if (m) {
    return parsePLN(m[1]);
  }
  return null;
}

/**
 * Extract usable area in m² from text.
 */
export function areaFromText(text) {
  if (!text) return null;
  // Residential flat area: "lokal: 39,41 m2" or "powierzchnia użytkowa lokalu: 39,41 m2"
  const mLocal = /(?:lokal(?:u)?:\s*|Powierzchnia\s+u[zż]ytkowa\s+lokalu\s+(?:wynosi\s*)?)([\d.,]+)\s*m/i.exec(text);
  if (mLocal) {
    return parseArea(mLocal[1]);
  }
  // General area in m2
  const mPow = /pow(?:ierzchnia)?(?:\s+u[zż]ytkowa)?\s*[:\-–]?\s*([\d.,]+)\s*m[2²]/i.exec(text);
  if (mPow) {
    return parseArea(mPow[1]);
  }
  // Land area in ha: "pow. 0,1383 ha" -> convert to m2
  const mHa = /pow(?:ierzchni)?\.?\s*([\d.,]+)\s*ha/i.exec(text);
  if (mHa) {
    const ha = parseArea(mHa[1]);
    if (ha) return Math.round(ha * 10000);
  }
  return null;
}

/**
 * Extract cadastral parcel number for land.
 */
export function parcelFromText(text) {
  if (!text) return null;
  const m = /(?:dzia[lł]k[ai]|dz\.?)\s*(?:nr\.?\s*)?(\d+(?:\/\d+)?)/i.exec(text);
  return m ? m[1] : null;
}

/**
 * Extract cadastral precinct (obręb) for land.
 */
export function obrebFromText(text) {
  if (!text) return null;
  const m = /obr[eę]b(?:ie)?(?:\s+ewidencyjn[ym]+)?[:\s]+([A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+|\d+)/i.exec(text);
  return m ? m[1].trim() : null;
}

/**
 * Extract auction outcome (sold vs unsold).
 */
export function outcomeFromText(text) {
  if (!text) return { outcome: 'unsold', unsold_reason: 'no_buyer' };
  const isUnsold = /nierozstrzygni[eę]t|wynikiem\s+negatywnym|nikt\s+si[eę]\s+nie\s+stawi[lł]|nie\s+wp[lł]yn[eę][lł]o\s+wadium/i.test(text);
  if (isUnsold) {
    return { outcome: 'unsold', unsold_reason: 'no_buyer' };
  }
  const isSold = /Nieruchomo[śs][ćc]\s+naby[lł][ia]?|Nabywc[aą]/i.test(text) ||
    /zosta[lł]\s+uznany\s+za\s+rozstrzygni[eę]ty/i.test(text);
  if (isSold) {
    return { outcome: 'sold', unsold_reason: null };
  }
  return { outcome: 'unsold', unsold_reason: 'no_buyer' };
}

/**
 * Parse a result document (OCR or PDF text) into result records.
 * Returns an array of records matching the pipeline result schema.
 */
export function parseResultDoc(text, fallbackDate, sourcePdf) {
  if (!text || text.trim().length < 20) return [];

  // Exclude lease results (dzierżawa)
  if (/dzier[żz]aw/i.test(text) && !/sprzeda[żz]/i.test(text)) {
    return [];
  }

  // Exclude public procurement tenders (zamówienia publiczne / budowa drogi / etc.)
  if (/zam[oó]wieni[ea]\s+publiczn|post[eę]powani[ea]\s+o\s+udzielenie\s+zam[oó]wienia/i.test(text)) {
    return [];
  }

  const kind = classifyKind(text);
  if (kind === 'unknown') return [];

  const auctionDate = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const startingPrice = startingPriceFromText(text);
  const { outcome, unsold_reason } = outcomeFromText(text);
  let finalPrice = outcome === 'sold' ? finalPriceFromText(text) : null;
  if (outcome === 'sold' && !finalPrice && startingPrice) {
    finalPrice = startingPrice;
  }
  const area = areaFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const obreb = obrebFromText(text);
    return [{
      kind: 'grunt',
      outcome,
      unsold_reason,
      auction_date: auctionDate,
      round,
      starting_price_pln: startingPrice,
      final_price_pln: finalPrice,
      area_m2: area,
      dzialka_nr,
      obreb,
      source_pdf: sourcePdf,
    }];
  }

  const address = addressFromText(text);
  return [{
    kind,
    outcome,
    unsold_reason,
    auction_date: auctionDate,
    round,
    starting_price_pln: startingPrice,
    final_price_pln: finalPrice,
    area_m2: area,
    address,
    source_pdf: sourcePdf,
  }];
}

/**
 * Extract article entries from Nefeni category list HTML.
 * Optionally filter by category ID prefix (e.g. '98' or '101') to exclude global nav links.
 */
export function parseListPage(html, catFilter = null) {
  if (!html) return [];
  const entries = [];
  const seen = new Set();

  // Pattern 1: HTML links inside article list
  const linkRe = /<a\b([^>]*)href="(\/kategorie\/(\d+)[^"]*\/artykuly\/(\d+)[^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const beforeHref = m[1];
    const path = m[2].replace(/&amp;/g, '&');
    const catId = m[3];
    const id = m[4];
    const afterHref = m[5];
    const linkText = m[6].replace(/<[^>]+>/g, '').trim();

    if (catFilter && catId !== String(catFilter) && !path.includes(`/kategorie/${catFilter}`)) {
      continue;
    }

    const titleMatch = /title="([^"]*)"/i.exec(beforeHref) || /title="([^"]*)"/i.exec(afterHref);
    const title = titleMatch ? titleMatch[1].trim() : linkText;

    if (!path || seen.has(path)) continue;
    seen.add(path);

    // Look for publication date in vicinity
    const snippet = html.slice(m.index, m.index + 600);
    const dateM = /\(Opublikowano:\s*(\d{4}-\d{2}-\d{2})\)/i.exec(snippet);
    const publishedDate = dateM ? dateM[1] : null;

    entries.push({
      url: `https://bip.mogilno.pl${path}`,
      id,
      title,
      published_date: publishedDate,
    });
  }

  // Pattern 2: Next.js RSC items fallback if HTML didn't yield items
  if (entries.length === 0) {
    const itemRe = /"displayText":"([^"]+)","title":"[^"]*","url":"[^"]*","slug":"([^"]+)","target":\d+,"publishedDate":"([^"]+)"/g;
    let im;
    while ((im = itemRe.exec(html)) !== null) {
      const title = im[1].replace(/\\"/g, '"');
      const slug = im[2];
      const pubDate = im[3].slice(0, 10);
      const url = `https://bip.mogilno.pl/${slug}?lang=PL`;
      const catMatch = slug.match(/kategorie\/(\d+)/);
      const catId = catMatch ? catMatch[1] : null;

      if (catFilter && catId !== String(catFilter) && !slug.includes(`kategorie/${catFilter}`)) {
        continue;
      }

      if (!seen.has(url)) {
        seen.add(url);
        entries.push({
          url,
          id: slug.match(/artykuly\/(\d+)/)?.[1] || null,
          title,
          published_date: pubDate,
        });
      }
    }
  }

  return entries;
}

/**
 * Extract detail information (title, date, attachment URLs) from article HTML.
 */
export function parseDetailPage(html, pageUrl = '') {
  if (!html) return { title: null, publishedDate: null, attachments: [] };

  // Title: <h3> heading inside article content
  const titleM = /<h3 class="text-primary text-lg[^"]*">([\s\S]*?)<\/h3>/i.exec(html) ||
    /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(html);
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : null;

  // Published date
  const dateM = /<div class="text-accent50 text-xs mr-\[20px\][^"]*">([\s\S]*?)<\/div>/i.exec(html) ||
    /datePublished":"([^"]+)"/i.exec(html);
  let publishedDate = null;
  if (dateM) {
    const raw = dateM[1].trim();
    const isoM = /(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (isoM) publishedDate = isoM[1];
  }

  // Attachments
  const attachments = [];
  const attachRe = /href="([^"]*api\/attachments\/\d+[^"]*)"[^>]*title="([^"]+)"/gi;
  let am;
  while ((am = attachRe.exec(html)) !== null) {
    let url = am[1].replace(/&amp;/g, '&');
    if (!url.startsWith('http')) {
      url = `https://bip.mogilno.pl${url}`;
    }
    const name = am[2].trim();
    attachments.push({ url, name });
  }

  return {
    title,
    publishedDate,
    attachments,
  };
}
