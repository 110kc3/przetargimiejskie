// Złotów parsers — handles Nefeni BIPv2 HTML pages and PDF notices.
//
// Groundtruthed against real notices from bip.zlotow.pl:
// - 2021: Lokal mieszkalny nr 6 przy ul. Wojska Polskiego 17 (29,14 m², 72 850 zł, przetarg 2025-05-08)
// - 2094: Wynik: Lokal mieszkalny nr 6 przy ul. Wojska Polskiego 17 (sprzedany, 73 580 zł, Patryk Imosa)
// - 2959: Nieruchomości zabudowane: ul. Podolska 4 (95 m², 425 000 zł) oraz ul. Wawrzyniaka 13 (77 m², 430 000 zł)
// - 2994: Działki budowlane (17/1, 15/6+17/3, 24/15, 24/21, 24/26) przy ul. Chojnickiej
// - 1249: Wynik: Lokal mieszkalny nr 3 przy ul. Mikołaja Kopernika 1 (sprzedany, 161 600 zł)
// - 904:  Wynik: Lokal mieszkalny nr 5 przy al. Mickiewicza 13a (sprzedany, 61 000 zł)
// - 906:  Wynik: Lokal mieszkalny nr 3 przy ul. ks. dr B. Domańskiego 16 (sprzedany, 40 400 zł)
// - 2606: Wynik negatywny (brak wpłaty wadium, dz. 97/2 i in. przy ul. Domańskiego)
// - 2930: Wynik pozytywny (działka nr 68/2, ENEA OPERATOR Sp. z o.o.)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export const PL_MONTHS = {
  stycznia: '01', styczen: '01', styczeń: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecien: '04', kwiecień: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpien: '08', sierpień: '08',
  wrzesnia: '09', wrzesień: '09', września: '09',
  pazdziernika: '10', pazdziernik: '10', październik: '10', października: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzien: '12', grudzień: '12',
};

export function cleanHtml(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(s) {
  if (s == null) return null;
  const str = String(s).trim();
  const firstSegment = str.split(/[,;]|\bwadium\b|\+/i)[0];
  const withoutGrosze = firstSegment.replace(/,\d{2}(?:\s*(?:z[lł]|PLN|\+|$|\b))/i, '');
  const digits = withoutGrosze.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const str = String(s).trim().replace(/\s+/g, '');
  const noUnits = str.replace(/(?:m[2²]|ha).*$/i, '');
  // Thousands separator with dot: '6.176' or '1.291'
  if (/^\d{1,3}\.\d{3}$/.test(noUnits)) {
    return Number(noUnits.replace('.', ''));
  }
  const cleaned = noUnits.replace(',', '.');
  const m = /^(\d+(?:\.\d+)?)/.exec(cleaned);
  if (!m) return null;
  const val = Number(m[1]);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function cleanAddressString(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^(?:w\s+miejscowo[śs]ci|w\s+m\.|w\s+Z[łl]otowie)\s+/i, '');
  s = s.replace(/^(?:Z[łl]ot[oó]w|Z[łl]otowie)[,\s]+(?:przy\s+)?/i, '');
  s = s.replace(/^przy\s+/i, '');
  s = s.replace(/\b(?:nr|lokalu|m\.)\s*(\d+[A-Za-z]?)\s*(?:lok\.|lokalu|m\.)\s*(\d+[A-Za-z]?)/i, '$1/$2');
  s = s.replace(/\bnr\s*(\d+[A-Za-z]?)/i, '$1');
  s = s.replace(/[,;.]\s*$/, '');
  return s.trim();
}

/**
 * Extract address from text or title.
 */
export function addressFromText(text, fallbackTitle = '') {
  const combined = `${text || ''} ${fallbackTitle || ''}`;

  // 1. Apartment pattern: lokal ... nr <Apt> ... przy (ul.|al.) <Street> [nr] <Bldg>
  const mApt = /lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr|Nr\.?)\s*(\d+[A-Za-z]?)[\s\S]{0,120}?przy\s+(?:ul\.|al\.|pl\.|os\.)\s*([A-ZŁŚĆĘĄÓŹŻŃ][a-ząćęłńóśźżA-ZŁŚĆĘĄÓŹŻŃ\s.-]+?)\s*(?:\bnr\.?\s*|\bNr\.?\s*)?(\d+[A-Za-z]?)(?:\s*(?:w\s+Z[łl]otowie|\/|\b))/i.exec(combined);
  if (mApt) {
    const apt = mApt[1].trim();
    const street = mApt[2].trim().replace(/\s+/g, ' ');
    const bldg = mApt[3].trim();
    const parsed = parseAddress(`ul. ${street} ${bldg}/${apt}`);
    if (parsed) return parsed;
  }

  // 2. Street pattern: (?:ul\.|al\.) <Street> [nr] <Bldg>[/<Apt>]
  const mStreet = /(?:przy\s+)?(?:ul\.|al\.|pl\.|os\.)\s*([A-ZŁŚĆĘĄÓŹŻŃ][a-ząćęłńóśźżA-ZŁŚĆĘĄÓŹŻŃ\s.-]+?)\s*(?:\bnr\.?\s*|\bNr\.?\s*)?(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(combined);
  if (mStreet) {
    const street = mStreet[1].trim().replace(/\s+/g, ' ');
    const bldgApt = mStreet[2].trim();
    const parsed = parseAddress(`ul. ${street} ${bldgApt}`);
    if (parsed) return parsed;
  }

  // 3. Fallback title apartment pattern
  if (fallbackTitle) {
    const mTitleApt = /lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr|Nr\.?)\s*(\d+[A-Za-z]?)[\s\S]{0,80}?przy\s+(?:ul\.|al\.|pl\.|os\.)\s*([A-ZŁŚĆĘĄÓŹŻŃ][a-ząćęłńóśźżA-ZŁŚĆĘĄÓŹŻŃ\s.-]+?)\s*(?:\bnr\.?\s*|\bNr\.?\s*)?(\d+[A-Za-z]?)/i.exec(fallbackTitle);
    if (mTitleApt) {
      const parsed = parseAddress(`ul. ${mTitleApt[2].trim()} ${mTitleApt[3].trim()}/${mTitleApt[1].trim()}`);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extract auction date from announcement or result text.
 */
export function auctionDateFromText(text) {
  if (!text) return null;

  // Pattern with spelled out Polish month
  const mWord = /(?:w\s+dniu|na\s+dzie[ńn]|termin\s+przetargu|odby[łl]\s+si[ęe]|odb[ęe]dzie\s+si[ęe]|zaplanowan\w+)[\s\S]{0,60}?(?:w\s+dniu|na\s+dzie[ńn])?\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (mWord) {
    const mon = PL_MONTHS[mWord[2].toLowerCase()];
    if (mon) return `${mWord[3]}-${mon}-${mWord[1].padStart(2, '0')}`;
  }

  // Pattern with numeric date
  const mNum = /(?:w\s+dniu|na\s+dzie[ńn]|termin\s+przetargu|odby[łl]\s+si[ęe]|odb[ęe]dzie\s+si[ęe]|zaplanowan\w+)[\s\S]{0,60}?(?:w\s+dniu|na\s+dzie[ńn])?\s+(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text);
  if (mNum) {
    return `${mNum[3]}-${mNum[2].padStart(2, '0')}-${mNum[1].padStart(2, '0')}`;
  }

  // Spelled out date anywhere: "dnia DD miesiąc YYYY"
  const mDniaWord = /dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r/i.exec(text);
  if (mDniaWord) {
    const mon = PL_MONTHS[mDniaWord[2].toLowerCase()];
    if (mon) return `${mDniaWord[3]}-${mon}-${mDniaWord[1].padStart(2, '0')}`;
  }

  // Dotted date anywhere: "dnia DD.MM.YYYY r." or "z dnia DD.MM.YYYY r."
  const mDniaNum = /(?:dnia|z\s+dnia)\s+(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text);
  if (mDniaNum) {
    return `${mDniaNum[3]}-${mDniaNum[2].padStart(2, '0')}-${mDniaNum[1].padStart(2, '0')}`;
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
  if (/\bpierwsz\w*\s+przetarg/i.test(text)) return 1;
  if (/\bdrugi\w*\s+przetarg/i.test(text)) return 2;
  if (/\btrzeci\w*\s+przetarg/i.test(text)) return 3;
  if (/\bczwart\w*\s+przetarg/i.test(text)) return 4;
  return 1;
}

/**
 * Extract starting price from announcement or result text.
 */
export function startingPriceFromText(text) {
  if (!text) return null;
  const m = /Cena\s+wywo[łl]awcza(?:[^\n\r\d]*)([\d][\d\s.,]*)(?:,\d{2})?\s*(?:z[łl]|PLN|\+)/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p) return p;
  }
  return null;
}

/**
 * Extract final achieved price from result text.
 */
export function finalPriceFromText(text) {
  if (!text) return null;
  if (/nie\s+ustalono\s+nabywcy|odst[aą]pi[łl]|brak\s+wp[łl]aty\s+wadium|nikt\s+si[ęe]|wynik\s+negatywny/i.test(text)) {
    return null;
  }
  const m = /(?:cena\s+uzyskana|najwy[żz]sza\s+cena|cena\s+osi[ąa]gni[ęe]ta)[\s\S]{0,60}?([\d][\d\s.,]*)(?:,\d{2})?\s*(?:z[łl]|PLN)/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p && p > 0) return p;
  }
  return null;
}

/**
 * Extract usable area in m² from text.
 */
export function areaFromText(text) {
  if (!text) return null;

  // 1. Usable area (lokal / budynek): "powierzchni użytkowej lokalu 29,14 m2", "o powierzchni użytkowej około 95 m2"
  const mLocal = /(?:lokal(?:u)?:\s*|powierzchni(?:a)?\s+u[żz]ytkow\w*\s*(?:lokalu|budynku)?\s*(?:wynosi\s*|oko[łl]o\s*)?)([\d.,]+)\s*m/i.exec(text);
  if (mLocal) {
    return parseArea(mLocal[1]);
  }

  // 2. General area in m2
  const mPow = /pow(?:ierzchnia|ierzchni)?(?:\s+u[żz]ytkowa)?\s*[:\-–]?\s*(?:oko[łl]o\s*)?([\d.,]+)\s*m[2²]/i.exec(text);
  if (mPow) {
    return parseArea(mPow[1]);
  }

  // 3. Land area in ha
  const mHa = /pow(?:ierzchni)?\.?\s*([\d.,]+)\s*ha/i.exec(text);
  if (mHa) {
    const ha = parseArea(mHa[1]);
    if (ha) return Math.round(ha * 10000);
  }

  return null;
}

/**
 * Extract parcel numbers for land.
 */
export function parcelFromText(text) {
  if (!text) return null;
  const m = /(?:dzia[łl]k[ai]|dzia[łl]ek|nr)\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*(?:nr\s*)?\d+(?:\/\d+)?)*)/i.exec(text);
  return m ? m[1].replace(/\bnr\s*/gi, '').trim() : null;
}

/**
 * Extract cadastral precinct (obręb).
 */
export function obrebFromText(text) {
  if (!text) return null;
  const m = /obr[eę]b(?:ie)?(?:\s+ewidencyjn[ym]+)?[:\s]+([A-ZŁŚĆĘĄÓŹŻŃ\d]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

/**
 * Extract auction outcome (sold vs unsold).
 */
export function outcomeFromText(text) {
  if (!text) return { outcome: 'unsold', unsold_reason: 'no_buyer' };
  const isUnsold = /nie\s+ustalono\s+nabywcy|odst[aą]pi[łl]|brak\s+wp[łl]aty\s+wadium|nikt\s+si[ęe]|nierozstrzygni[ęe]t|wynikiem\s+negatywnym|cena\s+uzyskana[^\n]*\b[0O]\s*z[łl]/i.test(text);
  if (isUnsold) {
    return { outcome: 'unsold', unsold_reason: 'no_buyer' };
  }
  const isSold = /nabywc[aą]\s+ustalono\s*-\s*[A-ZŁŚĆĘĄÓŹŻŃ]|nabywc[aą]\s*[:\-–]\s*[A-ZŁŚĆĘĄÓŹŻŃ]|zosta[łl]\s+uznany\s+za\s+rozstrzygni[ęe]ty/i.test(text);
  if (isSold) {
    return { outcome: 'sold', unsold_reason: null };
  }
  return { outcome: 'unsold', unsold_reason: 'no_buyer' };
}

/**
 * Split multi-item announcement document into separate item texts.
 */
export function splitNumberedItems(text) {
  if (!text) return [];
  const parts = text.split(/\n(?=\d+\.\s*(?:ul\.|godz\.|rejon|obr|dzia|lokal|nr\b))/i);
  if (parts.length > 1) {
    return parts.slice(1);
  }
  return [text];
}

/**
 * Split multi-item result notice into separate item sections with preamble attached.
 */
export function splitResultSections(text) {
  if (!text) return [];
  const parts = text.split(/\n(?=-\s*(?:dzia[łl]k[ai]|lokal|nieruchomo[śs][ćc]))/i);
  if (parts.length > 2) {
    const preamble = parts[0];
    return parts.slice(1).map((p) => `${preamble}\n${p}`);
  }
  return [text];
}

export function isAnnouncement(title, summary = '') {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  if (!/przetarg|licytacj/i.test(combined)) return false;
  if (/wynik|rozstrzygni|informacja\s+o\s+wynik/i.test(combined)) return false;
  if (/dzier[żz]aw|najem/i.test(combined) && !/sprzeda[żz]/i.test(combined)) return false;
  return true;
}

export function isResultNotice(title, summary = '') {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  return /wynik|rozstrzygni/i.test(combined);
}

export function isWykaz(title, summary = '') {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  return /wykaz/i.test(combined) && !/przetarg|wynik/i.test(combined);
}

/**
 * Extract article entries from Nefeni category list HTML.
 */
export function parseListPage(html, origin = 'https://bip.zlotow.pl') {
  if (!html) return [];
  const entries = [];
  const seen = new Set();

  const linkRe = /<a\b([^>]*)href="(\/kategorie\/(\d+)[^"]*\/artykuly\/(\d+)[^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const beforeHref = m[1];
    const path = m[2].replace(/&amp;/g, '&');
    const id = m[4];
    const afterHref = m[5];
    const linkText = m[6].replace(/<[^>]+>/g, '').trim();

    // Skip navigation/system articles
    if (path.includes('podstawowe-informacje') || path.includes('pomoc') || path.includes('deklaracja-dostepnosci')) {
      continue;
    }

    const titleMatch = /title="([^"]*)"/i.exec(beforeHref) || /title="([^"]*)"/i.exec(afterHref);
    const title = titleMatch ? titleMatch[1].trim() : linkText;

    if (!path || seen.has(path)) continue;
    seen.add(path);

    const snippet = html.slice(m.index, m.index + 600);
    const dateM = /\(Opublikowano:\s*(\d{4}-\d{2}-\d{2})\)/i.exec(snippet);
    const publishedDate = dateM ? dateM[1] : null;

    entries.push({
      url: origin + (path.startsWith('/') ? path : `/${path}`),
      id,
      title,
      published_date: publishedDate,
    });
  }

  return entries;
}

/**
 * Extract detail information (title, date, attachment URLs) from article HTML.
 */
export function parseDetailPage(html, pageUrl = '') {
  if (!html) return { title: null, publishedDate: null, attachments: [] };

  const titleM = /<h3 class="text-primary text-lg[^>]*>([\s\S]*?)<\/h3>/i.exec(html) ||
    /<meta property="og:title" content="([^"]+)"/i.exec(html);
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : null;

  const dateM = /<div class="text-accent50 text-xs mr-\[20px\][^>]*>([\s\S]*?)<\/div>/i.exec(html) ||
    /publishedDate":"([^"T]+)/i.exec(html);
  let publishedDate = null;
  if (dateM) {
    const raw = dateM[1].trim();
    const isoM = /(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (isoM) publishedDate = isoM[1];
  }

  const attachments = [];
  const attachRe = /href="([^"]*api\/attachments\/\d+[^"]*)"[^>]*title="([^"]+)"/gi;
  let am;
  while ((am = attachRe.exec(html)) !== null) {
    let url = am[1].replace(/&amp;/g, '&');
    if (!url.startsWith('http')) {
      url = `https://bip-api.zlotow.pl${url.startsWith('/') ? url : `/${url}`}`;
    }
    const name = am[2].trim();
    attachments.push({ url, name });
  }

  return { title, publishedDate, attachments };
}

/**
 * Parse an announcement document (from PDF text or HTML title fallback) into listings and land records.
 */
export function parseAnnouncementDoc(docText, title, publishedDate, detailUrl, sourcePdf) {
  const listings = [];
  const land = [];

  // Exclude lease / tenancy
  if (/dzier[żz]aw|najem/i.test(title) && !/sprzeda[żz]/i.test(title)) {
    return { listings, land };
  }

  const items = docText ? splitNumberedItems(docText) : [title];

  for (const item of items) {
    const combined = `${title} ${item}`;
    let kind = classifyKind(combined);
    if (kind === 'unknown') {
      kind = classifyKind(`${title} ${docText || ''}`);
    }

    const round = roundFromText(`${title} ${docText || ''}`);
    const auctionDate = auctionDateFromText(docText || '') || auctionDateFromText(item) || null;
    const startingPrice = startingPriceFromText(item) || startingPriceFromText(docText || '');
    const area = areaFromText(item) || areaFromText(docText || '');

    if (kind === 'grunt') {
      const dzialka_nr = parcelFromText(`${item} ${title}`);
      const obreb = obrebFromText(`${item} ${docText || ''} ${title}`);
      land.push({
        kind: 'grunt',
        dzialka_nr,
        obreb,
        address_raw: title,
        auction_date: auctionDate,
        published_date: publishedDate,
        round,
        starting_price_pln: startingPrice,
        area_m2: area,
        detail_url: detailUrl,
        source_pdf: sourcePdf,
      });
    } else if (['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz'].includes(kind)) {
      const address = addressFromText(item, title);
      listings.push({
        kind,
        address,
        address_raw: title,
        auction_date: auctionDate,
        published_date: publishedDate,
        round,
        starting_price_pln: startingPrice,
        area_m2: area,
        detail_url: detailUrl,
        source_pdf: sourcePdf,
      });
    }
  }

  return { listings, land };
}

/**
 * Parse a result document (PDF text) into result records.
 */
export function parseResultDoc(text, fallbackDate, sourcePdf) {
  if (!text || text.trim().length < 20) return [];
  if (/dzier[żz]aw/i.test(text) && !/sprzeda[żz]/i.test(text)) return [];
  if (/zam[oó]wieni[ea]\s+publiczn|post[eę]powani[ea]\s+o\s+udzielenie\s+zam[oó]wienia/i.test(text)) return [];

  const sections = splitResultSections(text);
  const results = [];

  for (const sec of sections) {
    const kind = classifyKind(sec);
    if (kind === 'unknown') continue;

    const auctionDate = auctionDateFromText(sec) || fallbackDate || null;
    const round = roundFromText(sec);
    const startingPrice = startingPriceFromText(sec);
    const { outcome, unsold_reason } = outcomeFromText(sec);
    let finalPrice = outcome === 'sold' ? finalPriceFromText(sec) : null;
    if (outcome === 'sold' && !finalPrice && startingPrice) finalPrice = startingPrice;
    const area = areaFromText(sec);

    if (kind === 'grunt') {
      const dzialka_nr = parcelFromText(sec);
      const obreb = obrebFromText(sec);
      results.push({
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
      });
    } else {
      const address = addressFromText(sec);
      results.push({
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
      });
    }
  }

  return results;
}
