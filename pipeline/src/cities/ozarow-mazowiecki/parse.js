// Ożarów Mazowiecki parsers.
// Announcements are published on WordPress (ozarow-mazowiecki.pl) with attached
// born-digital PDFs ("Załącznik nr 1 - Ogłoszenie o przetargu").
// The announcement PDF carries core numeric fields (cena wywoławcza, wadium, termin przetargu).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  parsePLN,
  areaFromText,
  auctionDateFromText,
  roundFromTitle,
  roundFromText,
} from '../../core/finn-bip.js';

export { htmlToText };

const OFFICE_STREET_RE = /kolejowa|konotopsk/i; // Urząd: Kolejowa 2, sala: Konotopskiej 4

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function isSaleAuction(title) {
  const t = (title || '').toLowerCase();
  if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni/i.test(t)) {
    return false;
  }
  if (!/przetarg/i.test(t) || /bezprzetarg/i.test(t)) return false;
  if (!/sprzeda/i.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
  return true;
}

export function parseIndexPage(html) {
  const out = [];
  const seen = new Set();

  const articleM = /<article[\s\S]*?<\/article>/i.exec(html || '');
  const scope = articleM ? articleM[0] : html;

  const liMatches = (scope || '').match(/<li[\s\S]*?<\/li>/gi) || [];
  for (const li of liMatches) {
    const hrefM = /href="(https?:\/\/ozarow-mazowiecki\.pl\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"/i.exec(li);
    if (!hrefM) continue;
    let url = hrefM[1].replace(/\/+$/, '');
    if (!url.startsWith('https://') && url.startsWith('http://')) {
      url = 'https://' + url.slice(7);
    }
    const title = htmlToText(li);
    if (!seen.has(url)) {
      seen.add(url);
      out.push({ url, title });
    }
  }

  // Fallback for direct post links on category pages
  const linkMatches = (scope || '').matchAll(/href="(https?:\/\/ozarow-mazowiecki\.pl\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"/gi);
  for (const lm of linkMatches) {
    let url = lm[1].replace(/\/+$/, '');
    if (!url.startsWith('https://') && url.startsWith('http://')) {
      url = 'https://' + url.slice(7);
    }
    if (/bon-zlobkowy|system-informacji|sesji-mlodziezowej|pomocy-prawnej|motyli-zakatek|konkurs-testowy/i.test(url)) {
      continue;
    }
    if (!seen.has(url)) {
      seen.add(url);
      out.push({ url, title: '' });
    }
  }

  return out;
}

export function findAnnouncementPdfUrl(postHtml, postUrl) {
  const pdfs = [];
  const re = /href="([^"]+\.pdf)"/gi;
  let m;
  while ((m = re.exec(postHtml || '')) !== null) {
    let u = m[1];
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = new URL(u, postUrl).href;
    pdfs.push(u);
  }
  if (pdfs.length === 0) return null;

  const ogl = pdfs.find((p) => /zalacznik[-_ ]*(?:nr[-_ ]*)?1|ogloszenie[-_ ]*o[-_ ]*przet/i.test(p));
  if (ogl) return ogl;

  const other = pdfs.find((p) => !/zarzadzenie|regulamin|parter|pietro|rzut/i.test(p));
  if (other) return other;

  return pdfs[0];
}

export function auctionDateFromOzarow(postHtml, pdfText) {
  const p = postHtml || '';
  const pm =
    /PRZETARG\s+([\d]{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(p) ||
    /odb[ęe]dzie\s+si[ęe][^0-9]{0,40}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(p);
  if (pm) {
    const mon = PL_MONTHS[pm[2].toLowerCase()];
    if (mon) return `${pm[3]}-${String(mon).padStart(2, '0')}-${pm[1].padStart(2, '0')}`;
  }

  const fromPdf = auctionDateFromText(pdfText);
  if (fromPdf) return fromPdf;

  return auctionDateFromText(postHtml);
}

export function wadiumDeadlineFromText(text) {
  const m = /Wadium:?[\s\S]{0,400}?do\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function priceFromOzarowText(text) {
  const m = /Cena\s+wywo[łl]awcz\w*[\s\S]{0,500}?wynosi\s*[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  if (m) return parsePLN(m[1]);
  const m2 = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,140}?([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m2 ? parsePLN(m2[1]) : null;
}

export function extractUnitPrices(text) {
  const prices = new Map();
  const p1 = /(?:lokal\s+)?(?:nr|numer)\s*(\d+[A-Za-z]?)\s*[-–—:]\s*([\d][\d.,\s ]*?)\s*z[łl]/gi;
  let m;
  while ((m = p1.exec(text || '')) !== null) {
    const apt = m[1];
    const val = parsePLN(m[2]);
    if (val && !prices.has(apt)) prices.set(apt, val);
  }
  return prices;
}

export function parcelFromOzarowText(text) {
  const m =
    /(?:dzia[łl]k[a-ząćęłńóśźż]*|dz\.)\s*(?:ewidencyjn[a-ząćęłńóśźż]*\s*|\.|\s*ew\.\s*)?(?:nr\.?\s*)?([\d]+(?:\/\d+)?(?:\s*(?:,|i)\s*(?:(?:dzia[łl]k[a-ząćęłńóśźż]*|dz\.)\s*(?:ewidencyjn[a-ząćęłńóśźż]*\s*|\.|\s*ew\.\s*)?(?:nr\.?\s*)?)?[\d]+(?:\/\d+)?)*)/i.exec(
      text || '',
    );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function obrebFromOzarowText(text) {
  const m =
    /(?:z\s+obr[ęe]bu\s+(?:ewidencyjnego\s+)?|w\s+obr[ęe]bie\s+(?:ewidencyjnym\s+)?|obr[ęe]b\s+)([^\n,]+?)(?=\s+w\s+O[żz]arowie|\s+dla|\s*,|\s+o\s+pow)/i.exec(
      text || '',
    );
  return m ? m[1].trim() : null;
}

export function plotAreaFromOzarowText(text) {
  let m = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\w*\.?\s*([0-9.,]+)\s*m[²2]/i.exec(text || '');
  if (m) return Number(m[1].replace(',', '.'));
  m = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\w*\.?\s*([0-9.,]+)\s*ha/i.exec(text || '');
  if (m) {
    const ha = Number(m[1].replace(',', '.'));
    return Math.round(ha * 10000);
  }
  return null;
}

export function titleFromPost(postHtml) {
  const h1M = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(postHtml || '');
  if (h1M) return htmlToText(h1M[1]);
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(postHtml || '');
  if (titleM) {
    const raw = htmlToText(titleM[1]);
    return raw.replace(/\s*:\s*Serwis\s+Gminy.*$/i, '').trim();
  }
  return '';
}

export function parseAnnouncement(postHtml, pdfText, url) {
  const postTitle = titleFromPost(postHtml);
  const pdfHeading = (pdfText || '').slice(0, 800);
  const text = `${pdfText || ''}\n${htmlToText(postHtml || '')}`;
  const round = roundFromTitle(postTitle) ?? roundFromTitle(pdfHeading) ?? roundFromText(pdfHeading) ?? 1;
  const auction_date = auctionDateFromOzarow(postHtml, pdfText);
  const wadium_deadline = wadiumDeadlineFromText(pdfText);

  // 1. Check for multi-unit residential notice
  const multiMatch = [
    ...(pdfText || '').matchAll(
      /(?:^|\n)\s*([a-z]\))\s*(?:lokal\s+)?(?:nr|numer)\s*(\d+[A-Za-z]?)\s+(?:w\s+budynku\s+)?przy\s+(?:ul\.|ulicy)?\s*([^\n,]+?)\s+o\s+pow(?:ierzch\w*)?\.?\s*([\d.,]+)\s*m[²2]/gi,
    ),
  ];

  if (multiMatch.length > 0) {
    const unitPrices = extractUnitPrices(pdfText);
    const results = [];
    for (const mm of multiMatch) {
      const apt = mm[2];
      const streetRaw = mm[3].replace(/^ul\.?\s*(?:ul\.?\s*)?/i, '').trim();
      const area_m2 = Number(mm[4].replace(',', '.'));
      const starting_price_pln = unitPrices.get(apt) || null;
      const address_raw = `ul. ${streetRaw}/${apt}`;
      const address = parseAddress(address_raw);
      if (!address) continue;

      results.push({
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2,
        starting_price_pln,
        round,
        auction_date,
        wadium_deadline,
        detail_url: url,
        source_url: url,
      });
    }
    if (results.length > 0) return results;
  }

  // 2. Check for land plot (grunt) or unaddressed parcel
  const kind = classifyKind(text);
  const isLand = kind === 'grunt' || (/dzia[łl]k/i.test(text) && !/lokal/i.test(text));

  if (isLand) {
    const dzialka_nr = parcelFromOzarowText(pdfText) || parcelFromOzarowText(text);
    const obreb = obrebFromOzarowText(pdfText) || obrebFromOzarowText(text);
    const area_m2 = plotAreaFromOzarowText(pdfText);
    const starting_price_pln = priceFromOzarowText(pdfText);

    return [
      {
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2,
        starting_price_pln,
        round,
        auction_date,
        wadium_deadline,
        detail_url: url,
        source_url: url,
      },
    ];
  }

  // 3. Single-unit residential / property
  const streetM =
    /(?:przy|w\s+budynku\s+przy)\s+ul(?:icy)?\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)/i.exec(
      pdfText || '',
    ) ||
    /(?:przy|w\s+budynku\s+przy)\s+ul(?:icy)?\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)/i.exec(
      text,
    );

  const aptM =
    /lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr|numer)\s*(\d+[A-Za-z]?)/i.exec(pdfText || '') ||
    /lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr|numer)\s*(\d+[A-Za-z]?)/i.exec(text);

  const areaM =
    /o\s+pow(?:ierzchni)?\w*\.?\s*([\d.,]+)\s*m[²2]/i.exec(pdfText || '') ||
    /o\s+pow(?:ierzchni)?\w*\.?\s*([\d.,]+)\s*m[²2]/i.exec(text);

  if (streetM && !OFFICE_STREET_RE.test(streetM[1])) {
    const street = streetM[1].trim();
    const bldg = streetM[2].trim();
    const apt = aptM ? aptM[1] : null;
    const address_raw = `ul. ${street} ${bldg}${apt ? '/' + apt : ''}`;
    const address = parseAddress(address_raw);
    if (address) {
      const area_m2 = areaM ? Number(areaM[1].replace(',', '.')) : areaFromText(text);
      const starting_price_pln = priceFromOzarowText(pdfText);

      return [
        {
          kind: kind === 'unknown' ? 'mieszkalny' : kind,
          address_raw,
          address,
          area_m2,
          starting_price_pln,
          round,
          auction_date,
          wadium_deadline,
          detail_url: url,
          source_url: url,
        },
      ];
    }
  }

  // If no street address could be parsed, check if it's a parcel-only auction (e.g. dz. 156)
  const dzialka_nr = parcelFromOzarowText(pdfText) || parcelFromOzarowText(text);
  if (dzialka_nr) {
    const obreb = obrebFromOzarowText(pdfText) || obrebFromOzarowText(text);
    const area_m2 = plotAreaFromOzarowText(pdfText);
    const starting_price_pln = priceFromOzarowText(pdfText);

    return [
      {
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2,
        starting_price_pln,
        round,
        auction_date,
        wadium_deadline,
        detail_url: url,
        source_url: url,
      },
    ];
  }

  return [];
}

export function parseResultDoc() {
  return [];
}
