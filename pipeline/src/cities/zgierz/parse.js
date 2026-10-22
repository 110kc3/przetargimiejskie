// Zgierz parsers — handles Nefeni CMS HTML pages and digital PDF notices/results.
//
// Groundtruthed against real notices from zgierz.bip.net.pl:
//   - Active announcement (flats): 5 flats session 2026-11-16 (Dubois 29/48, 31/21, pl. Kilińskiego 7/28, etc.)
//   - Active announcement (flats): 3 flats session 2026-11-16 (Baczyńskiego 1/95, Długa 75/7, 1 Maja 73/7)
//   - Active announcement (land): 2026-10-26 (ul. Wandy Chotomskiej 7, dz. 198/9, 200/9, 201/1)
//   - Active announcement (land): 2026-10-26 (obręb 0010 Dzierżązna, Ostrów, dz. 332/4)
//   - Secondary MPGM announcement: Koszarowa 9/9, 47,80 m², 150 000 zł
//   - Sold flat result: 1 Maja 73/14, 2026-04-08, starting 250 000 zł, final 253 000 zł
//   - Unsold flat results: pl. Kilińskiego 7/28 (2026-09-21, 231 000 zł), Rembowskiego 6/7, Dubois 29/48
//   - Sold land result: dz. 347/2 ul. Jabłoniowa, 2026-09-07, 98 000 zł
//   - Unsold land results: Aleksandrowska 41 (2026-09-14, 610 000 zł), Dzierżązna dz. 332/4 (90 000 zł)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export const PL_MONTHS = {
  stycznia: '01',
  styczen: '01',
  lutego: '02',
  luty: '02',
  marca: '03',
  marzec: '03',
  kwietnia: '04',
  kwiecien: '04',
  maja: '05',
  maj: '05',
  czerwca: '06',
  czerwiec: '06',
  lipca: '07',
  lipiec: '07',
  sierpnia: '08',
  sierpien: '08',
  września: '09',
  wrzesnia: '09',
  wrzesien: '09',
  października: '10',
  pazdziernika: '10',
  pazdziernik: '10',
  listopada: '11',
  listopad: '11',
  grudnia: '12',
  grudzien: '12',
};

export const ROMAN_ROUNDS = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

export function parsePLN(s) {
  if (s == null) return null;
  const str = String(s).trim();
  const withoutGrosze = str.replace(/,\d{2}(?:\s*(?:z[łl]|PLN|\+|$|\b))/i, '');
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
 * Strips municipality prefixes, normalizes "nr X lok. Y" to "X/Y".
 */
export function cleanAddressString(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^Zgierz[,\s]+/i, '');
  s = s.replace(/^w\s+Zgierzu[,\s]+/i, '');
  s = s.replace(/\s+w\s+Zgierzu/i, '');
  s = s.replace(/\b(?:ulic[aye]|ul\.)\s+(?:placu|plac|pl\.)\s+/gi, 'pl. ');
  s = s.replace(/^(?:przy\s+)?(?:ulic[aye]|ul\.)\s*/i, 'ul. ');
  s = s.replace(/^(?:przy\s+)?(?:placu|plac|pl\.)\s*/i, 'pl. ');
  s = s.replace(/\bul\.\s+(pl\.)/gi, '$1');
  s = s.replace(/(?:pl\.\s+)?(?:Jana\s+|J\.\s*)?Kili[ńn]skiego/gi, 'pl. Jana Kilińskiego');
  s = s.replace(/(?:ul\.\s+)?(?:ks\.\s+Sz\.\s+|ks\.\s+)?Rembowskiego/gi, 'ul. ks. Sz. Rembowskiego');
  s = s.replace(/(?:ul\.\s+)?(?:K\.\s*|Krzysztofa\s+Kamila\s+)?Baczy[ńn]skiego/gi, 'ul. Baczyńskiego');
  s = s.replace(/(?:ul\.\s+)?(?:Stanis[łl]awa\s+)?Dubois/gi, 'ul. Dubois');
  s = s.replace(/(?:ul\.\s+)?D[łl]ugi\w*/gi, 'ul. Długa');
  s = s.replace(/(?:ul\.\s+)?Koszarow\w*/gi, 'ul. Koszarowa');
  s = s.replace(/(?:ul\.\s+)?Aleksandrowsk\w*/gi, 'ul. Aleksandrowska');

  // "nr 48 przy ul. Dubois 29" -> "ul. Dubois 29/48"
  const invM = /nr\s+(\d+[A-Za-z]?)\s+(?:przy\s+)?(.+)/i.exec(s);
  if (invM) {
    s = `${invM[2]}/${invM[1]}`;
  }

  s = s.replace(/\bm\.\s*(\d+[A-Za-z]?)/i, '/$1');
  s = s.replace(/\blok\.\s*(\d+[A-Za-z]?)/i, '/$1');
  s = s.replace(/\bnr\s*(\d+)/i, '$1');
  s = s.replace(/\s*\/\s*/g, '/');
  s = s.replace(/[,;.]\s*$/, '');

  if (!/^(?:ul\.|pl\.)/i.test(s) && /^[A-ZŁŚĆĘĄÓŹŻ]/.test(s)) {
    s = `ul. ${s}`;
  }
  return s.trim();
}

/**
 * Format street part and unit number into a clean parsed address object.
 */
export function formatAddress(streetWithBldg, unitNo) {
  let s = (streetWithBldg || '').trim();
  s = s.replace(/^przy\s+/i, '');
  s = s.replace(/^w\s+Zgierzu[,\s]*/i, '');
  s = s.replace(/\s+w\s+Zgierzu/i, '');
  s = s.replace(/\b(?:ulic[aye]|ul\.)\s+(?:placu|plac|pl\.)\s+/gi, 'pl. ');
  s = s.replace(/^(?:ulic[aye]|ul\.)\s*/i, 'ul. ');
  s = s.replace(/^(?:placu|plac|pl\.)\s*/i, 'pl. ');
  s = s.replace(/\bul\.\s+(pl\.)/gi, '$1');
  s = s.replace(/(?:pl\.\s+)?(?:Jana\s+|J\.\s*)?Kili[ńn]skiego/gi, 'pl. Jana Kilińskiego');
  s = s.replace(/(?:ul\.\s+)?(?:ks\.\s+Sz\.\s+|ks\.\s+)?Rembowskiego/gi, 'ul. ks. Sz. Rembowskiego');
  s = s.replace(/(?:ul\.\s+)?(?:K\.\s*|Krzysztofa\s+Kamila\s+)?Baczy[ńn]skiego/gi, 'ul. Baczyńskiego');
  s = s.replace(/(?:ul\.\s+)?(?:Stanis[łl]awa\s+)?Dubois/gi, 'ul. Dubois');
  s = s.replace(/(?:ul\.\s+)?D[łl]ugi\w*/gi, 'ul. Długa');
  s = s.replace(/(?:ul\.\s+)?Koszarow\w*/gi, 'ul. Koszarowa');
  s = s.replace(/(?:ul\.\s+)?Aleksandrowsk\w*/gi, 'ul. Aleksandrowska');
  s = s.replace(/\bnr\s*(\d+)/i, '$1');
  if (!/^(?:ul\.|pl\.)/i.test(s)) {
    s = `ul. ${s}`;
  }
  const full = unitNo ? `${s}/${unitNo}` : s;
  return parseAddress(full);
}

/**
 * Extract address from announcement / result text or fallback title.
 */
export function addressFromText(text, fallbackTitle = '') {
  const combined = `${text || ''} ${fallbackTitle || ''}`;

  // 1. Result notice explicit pattern: "odbył się ... przetarg ... na sprzedaż nw. lokalu mieszkalnego:\n\nZgierz, ul. 3 Maja 34 m. 6 – ..."
  const mRes = /(?:sprzeda[żz]\s+(?:nw\.\s+)?lokalu\s+mieszkalnego|zakup\s+lokalu)[:\s]+(?:Zgierz,\s+)?([^\n–—]+?)(?:\s*[–—]|\s*,\s*KW|\s*\n)/i.exec(text || '');
  if (mRes) {
    const cleaned = cleanAddressString(mRes[1]);
    const addr = parseAddress(cleaned);
    if (addr) return addr;
  }

  // 2. Built property / house pattern: "nieruchomości gruntowej, położonej w ... przy ulicy Aleksandrowskiej 41"
  const mZab = /(?:nieruchomo[śs]ci\s+gruntowej[^\n]*?przy\s+(?:ulicy|ul\.|pl\.)\s*)([A-ZŁŚĆĘĄÓŹŻ][^\n,]+)/i.exec(text || '');
  if (mZab) {
    const cleaned = cleanAddressString(mZab[1]);
    const addr = parseAddress(cleaned);
    if (addr) return addr;
  }

  // 3. General pattern: "położonej w Zgierzu przy ul. ..."
  const mStreet = /(?:położon\w+\s+)?(?:w\s+Zgierzu\s+)?przy\s+(?:ulicy|ul\.|placu|pl\.)?\s*([A-ZŁŚĆĘĄÓŹŻ][^\n,]+)/i.exec(combined);
  if (mStreet) {
    const cleaned = cleanAddressString(mStreet[1]);
    const addr = parseAddress(cleaned);
    if (addr) return addr;
  }

  return null;
}

/**
 * Extract auction date from Polish text, returning 'YYYY-MM-DD' or null.
 * Strictly avoids statutory publication dates like "ustawy z dnia 21 sierpnia 1997 r."
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  // Match the event date sentence: "w dniu <DATE> ... o godz. ... odbędzie się / odbył się"
  const mEvent = /w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{2}\.\d{4})\s*(?:r\.|roku)?(?:\s+o\s+godz|\s+w\s+siedzibie|\s+w\s+sali|[^\n]*?odb[ęe]dzie\s+si[ęe]|[^\n]*?odby[łl]\s+si[ęe])/i.exec(text);
  if (mEvent) {
    const raw = mEvent[1].trim();
    const dot = /^(\d{1,2})\.(\d{2})\.(\d{4})$/.exec(raw);
    if (dot) return `${dot[3]}-${dot[2]}-${dot[1].padStart(2, '0')}`;
    const pl = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/i.exec(raw);
    if (pl) {
      const mon = PL_MONTHS[pl[2].toLowerCase()];
      if (mon) return `${pl[3]}-${mon}-${pl[1].padStart(2, '0')}`;
    }
  }

  // Fallback pattern if "o godz" was omitted
  const mFallback = /(?:w\s+dniu|dnia)\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*(?:r\.|roku)?/gi;
  let m;
  while ((m = mFallback.exec(text)) !== null) {
    // Avoid "ustawy z dnia ...", "rozporządzenia z dnia ...", "zarządzenia ... z dnia ..."
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/ustawy|rozporz[aą]dzenia|zarz[aą]dzenia|kodeksu|uchwa[łl]y/i.test(before)) continue;
    const pl = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/i.exec(m[1].trim());
    if (pl) {
      const mon = PL_MONTHS[pl[2].toLowerCase()];
      if (mon) return `${pl[3]}-${mon}-${pl[1].padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extract auction round number (integer).
 */
export function roundFromText(text) {
  if (!text) return null;
  const m = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X|\d+)\s+(?:przetarg|nieograniczony\s+przetarg)/i.exec(text);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  if (ROMAN_ROUNDS[raw]) return ROMAN_ROUNDS[raw];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Extract starting price (cena wywoławcza) in PLN.
 */
export function startingPriceFromText(text) {
  if (!text) return null;
  const m = /Cena\s+wywo[łl]awcza[^\d]*?(\d[\d\s.,]*)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Extract achieved final price (cena osiągnięta) in PLN.
 */
export function finalPriceFromText(text) {
  if (!text) return null;
  const m = /Najwy[żz]sza\s+osi[ąa]gni[ęe]ta[^\d]*?(\d[\d\s.,]*)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Extract area in m².
 */
export function areaFromText(text) {
  if (!text) return null;
  // Usable area of flat
  const mFlat = /Powierzchnia\s+u[żz]ytkowa\s+lokalu[:\s]*([\d\s.,]+)\s*m/i.exec(text) ||
    /powierzchnia\s+u[żz]ytk?\.?\s*([\d\s.,]+)\s*m/i.exec(text) ||
    /powierzchni\s+u[żz]ytkowej\s*([\d\s.,]+)\s*m/i.exec(text);
  if (mFlat) return parseArea(mFlat[1]);

  // Land / plot area in m2
  const mPlot = /o\s+powierzchni(?:\s+og[óo]lnej)?\s*([\d\s.,]+)\s*m2/i.exec(text) ||
    /Powierzchnia\s+(?:w\s+m2|[łl][ąa]czna|og[óo]lna)[:\s]*([\d\s.,]+)(?:\s*m2)?/i.exec(text);
  if (mPlot) return parseArea(mPlot[1]);

  // Land area in ha (e.g. 0,1119 ha -> 1119 m²)
  const mHa = /pow\.\s*([\d,.]+)\s*ha/i.exec(text) || /obszar[^\d]*([\d,.]+)\s*ha/i.exec(text);
  if (mHa) {
    const haVal = Number(mHa[1].replace(',', '.'));
    if (Number.isFinite(haVal) && haVal > 0) return Math.round(haVal * 10000);
  }

  return null;
}

/**
 * Extract cadastral parcel number (działka nr).
 */
export function parcelFromText(text) {
  if (!text) return null;
  const m = /(?:dzia[łl]ki|dzia[łl]ka)\s*(?:numer\s+ewidencyjny|oznaczonej\s+numerem\s+ewidencyjnym(?:\s+dzia[łl]ki)?|nr)?[:\s]*([0-9/]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

/**
 * Extract precinct (obręb).
 */
export function obrebFromText(text) {
  if (!text) return null;
  const m = /(?:w\s+(\d+|[A-ZŁŚĆĘĄÓŹŻ][a-ząćęłńóśźż]+)\s+obr[ęe]bie|obr[ęe]b(?:ie)?(?:\s+ewidencyjn[ym]+)?[:\s]+([A-Z0-9ŁŚĆĘĄÓŹŻ][^,\n;]+))/i.exec(text);
  if (m) {
    const val = (m[1] || m[2]).trim();
    return val;
  }
  return null;
}

/**
 * Extract auction outcome (sold vs unsold).
 */
export function outcomeFromText(text) {
  if (!text) return { outcome: 'unsold', unsold_reason: 'no_bids' };
  const isUnsold = /wynikiem\s+negatywnym|brak\s+wp[łl]at\s+wadium|nikt\s+si[ęe]\s+nie\s+stawi[łl]|nie\s+wp[łl]yn[ęe][łl]o\s+wadium/i.test(text);
  if (isUnsold) {
    return { outcome: 'unsold', unsold_reason: 'no_bids' };
  }
  const isSold = /Nabywc[ąa]|Najwy[żz]sza\s+osi[ąa]gni[ęe]ta|zosta[łl]\s+uznany\s+za\s+rozstrzygni[ęe]ty/i.test(text);
  if (isSold) {
    return { outcome: 'sold', unsold_reason: null };
  }
  return { outcome: 'unsold', unsold_reason: 'no_bids' };
}

/**
 * Extract article entries from Nefeni category list HTML.
 */
export function parseListPage(html, catFilter = null) {
  if (!html) return [];
  const entries = [];
  const seen = new Set();

  const linkRe = /<a\b([^>]*)href="(\/kategorie\/(\d+)[^"]*\/artykuly\/(\d+)[^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const beforeHref = m[1];
    const path = m[2].replace(/&amp;/g, '&');
    const catId = m[3];
    const id = m[4];
    const afterHref = m[5];
    const linkText = m[6].replace(/<[^>]+>/g, '').trim();

    // Skip global nav links (sygnaliści, mobilny urzędnik)
    if (id === '807' || id === '813') continue;

    if (catFilter && catId !== String(catFilter) && !path.includes(`/kategorie/${catFilter}`)) {
      continue;
    }

    const titleMatch = /title="([^"]*)"/i.exec(beforeHref) || /title="([^"]*)"/i.exec(afterHref);
    const title = titleMatch ? titleMatch[1].trim() : linkText;

    if (!path || seen.has(path)) continue;
    seen.add(path);

    // Look for publication date in vicinity (search up to 1200 characters to cover long titles)
    const snippet = html.slice(m.index, m.index + 1200);
    const dateM = /\(Opublikowano:\s*(\d{4}-\d{2}-\d{2})\)/i.exec(snippet);
    const publishedDate = dateM ? dateM[1] : null;

    entries.push({
      url: `https://zgierz.bip.net.pl${path}`,
      id,
      title,
      published_date: publishedDate,
    });
  }

  return entries;
}

/**
 * Extract detail information (title, date, attachments) from article HTML.
 */
export function parseDetailPage(html, pageUrl = '') {
  if (!html) return { title: null, publishedDate: null, attachments: [] };

  const titleM = /<h3 class="text-primary text-lg[^"]*">([\s\S]*?)<\/h3>/i.exec(html) ||
    /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(html);
  const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : null;

  const dateM = /<div class="text-accent50 text-xs mr-\[20px\][^"]*">([\s\S]*?)<\/div>/i.exec(html) ||
    /datePublished":"([^"]+)"/i.exec(html);
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
      url = `https://zgierz-api.bip.net.pl${url}`;
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

/**
 * Parse an active flats announcement PDF text (which may contain multiple flats).
 */
export function parseAnnouncementFlats(text, fallbackAuctionDate, fallbackRound, detailUrl, sourcePdf) {
  if (!text) return [];
  const auctionDate = auctionDateFromText(text) || fallbackAuctionDate || null;
  const round = roundFromText(text) || fallbackRound || null;
  const sections = text.split(/Przedmiot przetargu:/i);
  const results = [];

  if (sections.length > 1) {
    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      const mAddr = /lokal(?:u)?\s+(?:mieszkalny|użytkowy)?\s*nr\s*(\d+[A-Za-z]?)\s+przy\s+(?:ulicy|ul\.|placu|pl\.)?\s*([^\n,]+)/i.exec(sec);
      if (!mAddr) continue;
      const unitNo = mAddr[1];
      const streetPart = mAddr[2];
      const address = formatAddress(streetPart, unitNo);
      const priceM = startingPriceFromText(sec);
      const areaM = /Powierzchnia\s+u[żz]ytkowa\s+lokalu[:\s]*([\d\s.,]+)\s*m/i.exec(sec);
      results.push({
        kind: 'mieszkalny',
        address,
        address_raw: mAddr[0].trim(),
        auction_date: auctionDate,
        round,
        starting_price_pln: priceM,
        area_m2: parseArea(areaM?.[1]),
        detail_url: detailUrl,
        source_pdf: sourcePdf,
      });
    }
  } else {
    // Single item (e.g. MPGM or single flat notice)
    const mAddr = /(?:samodzielnego\s+)?lokal(?:u)?\s+(?:mieszkalnego|mieszkalny)?\s*nr\s*(\d+[A-Za-z]?).*?przy\s+(?:ul\.|ulicy)?\s*([^\n,]+)/is.exec(text);
    if (mAddr) {
      const unitNo = mAddr[1];
      const streetPart = mAddr[2];
      const address = formatAddress(streetPart, unitNo);
      const priceM = startingPriceFromText(text);
      const areaM = /powierzchni\s+u[żz]ytkowej\s*([\d\s.,]+)\s*m/i.exec(text);
      results.push({
        kind: 'mieszkalny',
        address,
        address_raw: mAddr[0].trim(),
        auction_date: auctionDate,
        round,
        starting_price_pln: priceM,
        area_m2: parseArea(areaM?.[1]),
        detail_url: detailUrl,
        source_pdf: sourcePdf,
      });
    }
  }
  return results;
}

/**
 * Parse an active land announcement PDF text into a land listing record.
 */
export function parseAnnouncementLand(text, fallbackAuctionDate, fallbackRound, detailUrl, sourcePdf) {
  if (!text) return null;
  const auctionDate = auctionDateFromText(text) || fallbackAuctionDate || null;
  const round = roundFromText(text) || fallbackRound || null;
  const startingPrice = startingPriceFromText(text);
  const area = areaFromText(text);
  const dzialka_nr = parcelFromText(text);
  const obreb = obrebFromText(text);

  // Raw address / title location snippet
  const mLoc = /Położenie\s+nieruchomości[:\s]+([^\n]+)/i.exec(text) ||
    /nieruchomości\s+gruntowej\s+położonej\s+([^\n]+)/i.exec(text);
  const address_raw = mLoc ? mLoc[1].trim() : 'Zgierz';

  return {
    kind: 'grunt',
    dzialka_nr,
    obreb,
    address_raw,
    auction_date: auctionDate,
    round,
    starting_price_pln: startingPrice,
    area_m2: area,
    detail_url: detailUrl,
    source_pdf: sourcePdf,
  };
}

/**
 * Parse a result document (PDF text) into result records.
 */
export function parseResultDoc(text, fallbackDate, sourcePdf) {
  if (!text || text.trim().length < 20) return [];

  // Exclude lease results (dzierżawa / najem)
  if (/dzier[żz]aw|najem/i.test(text) && !/sprzeda[żz]/i.test(text)) {
    return [];
  }

  // Exclude public procurement tenders
  if (/zam[oó]wieni[ea]\s+publiczn/i.test(text)) {
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
