// Kościerzyna parsers.
//
// Extracts structured property and auction fields from INTERmedi@ CMS-BIP HTML
// pages and attached announcement/result documents (text PDFs converted via pdfText,
// with ocrPdf fallback).
//
// Groundtruthed against live fixtures from bip.koscierzyna.gda.pl:
// - Announcements (per-year cid boards, e.g. 557, 501, 454, 437):
//   - WGN/4/2026 (id 1912): ul. Sikorskiego 6 m. 7 (52.13 m², 170 000 zł, auction 2026-07-31, round 2)
//   - WGN/2/2026 (id 1873): ul. Sikorskiego 6 m. 7 (52.13 m², 200 000 zł, auction 2026-05-22, round 1)
//   - WGN/5/2024 (id 1567): ul. Świętojańska 14 m. 5 (15.94 m², 50 750 zł, auction 2024-09-12, round 1)
//   - WGN/1/2024 (id 1427): Multi-flat: ul. Sikorskiego 6 m. 7 (47.10 m², 175 000 zł)
//     + ul. dr. Leona Heykego 1/C/11 (25.63 m², 120 000 zł), auction 2024-04-04, round 2
// - Results:
//   - WGN/7/2024 (id 1591): Informacja o wynikach przetargu (Wyniki przetargu PDF)
//   - WGN/11/2025 (id 1734): Informacja o wynikach przetargu (Wyniki przetargu PDF)

import { parseAddress } from '../../core/normalize.js';

export const PL_MONTHS = {
  stycznia: '01', styczen: '01', styczeń: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecien: '04', kwiecień: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpien: '08', sierpień: '08',
  września: '09', wrzesnia: '09', wrzesien: '09', wrzesień: '09',
  października: '10', pazdziernika: '10', pazdziernik: '10', październik: '10',
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
  if (!s) return null;
  const clean = String(s)
    .replace(/\s/g, '')
    .replace(/[zZ][łŁ]/gi, '')
    .trim();
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(clean);
  if (m) {
    const val = Number(m[1].replace(/[.,]/g, ''));
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  const fallback = clean.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const clean = String(s).replace(/\s/g, '').replace(',', '.');
  const m = /(\d+[\d.]*)/.exec(clean);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function cleanAddrStr(raw) {
  return (raw || '')
    .replace(/\s+/g, ' ')
    .replace(/(\d+)\s*\/\s*([A-Za-z])\s*\/\s*(\d+)/g, '$1$2/$3')
    .replace(/(\d+[A-Za-z]?)\s*,\s*klatka\s*([A-Za-z])\s*(?:lokal\s+(?:nr|nt)?|m\.?)\s*(\d+)/gi, '$1$2/$3')
    .replace(/(\d+[A-Za-z]?)\s*,\s*klatka\s*[A-Za-z]/gi, '$1')
    .replace(/(\d+[A-Za-z]?)\s*(?:lokal\s+(?:nr|nt)?|m\.?)\s*(\d+)/gi, '$1/$2')
    .replace(/,\s*lokal\s+(?:nr|nt)?\s*(\d+)/gi, '/$1');
}

export function auctionDateFromAnnouncement(text) {
  if (!text) return null;
  // "przetarg ... odbędzie się w dniu 31 lipca 2026 r." / "przetargi odbędą się w dniu 4 kwietnia 2024 r."
  const m1 = /(?:przetarg|przetargi)\s+(?:odb[ęe]d[ąa]\s+si[ęe]|odb[ęe]dzie\s+si[ęe])\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${mon}-${m1[1].padStart(2, '0')}`;
  }
  // "data przetargu: 8 grudnia 2026 r." / "termin przetargu: 10 września 2021 r."
  const m2 = /(?:data|termin)\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  // Dotted: "12.09.2024"
  const m3 = /(?:data|termin)\s+przetargu\s*:?\s*(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text);
  if (m3) {
    return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  }
  return null;
}

export function auctionDateFromResult(text) {
  if (!text) return null;
  // "w dniu 5 marca 2026 roku ... odbył się ... przetarg"
  const m1 = /(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r(?:oku)?[\s\S]{0,120}?odby[łl]\s+si[ęe]/i.exec(text);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${mon}-${m1[1].padStart(2, '0')}`;
  }
  // "odbył się ... w dniu 5 marca 2026"
  const m2 = /odby[łl]\s+si[ęe][\s\S]{0,120}?(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  // Table column: Data przetargu followed by date e.g. "5 grudnia 2024 r." or "19 września 2025 r."
  const m3 = /(?:Data\s+przetargu[\s\S]{0,40}?)(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m3) {
    const mon = PL_MONTHS[m3[2].toLowerCase()];
    if (mon) return `${m3[3]}-${mon}-${m3[1].padStart(2, '0')}`;
  }
  return null;
}

export function roundFromText(text) {
  if (!text) return null;
  let r = null;
  if (/\bpierwsz\w*(?:\s+(?:ustn\w*|nieograniczon\w*|ograniczon\w*))*\s+przeta\w+/i.test(text)) r = 1;
  else if (/\bdrugi\w*(?:\s+(?:ustn\w*|nieograniczon\w*|ograniczon\w*))*\s+przeta\w+/i.test(text)) r = 2;
  else if (/\btrzeci\w*(?:\s+(?:ustn\w*|nieograniczon\w*|ograniczon\w*))*\s+przeta\w+/i.test(text)) r = 3;
  else if (/\bczwart\w*(?:\s+(?:ustn\w*|nieograniczon\w*|ograniczon\w*))*\s+przeta\w+/i.test(text)) r = 4;
  else if (/\bpi[ąa]t\w*(?:\s+(?:ustn\w*|nieograniczon\w*|ograniczon\w*))*\s+przeta\w+/i.test(text)) r = 5;

  const romanM = /\b(I{1,3}|IV|V|VI{0,3})\s*(?:ustn\w*\s+)?przeta\w+/i.exec(text);
  if (romanM) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
    r = ROMAN[romanM[1].toLowerCase()] || r;
  }

  // Handle clerical cases in announcements where notice says "pierwszy ... przetarg"
  // but notes that previous round was negative ("wyznaczony/zaplanowany był na ... i zakończył się wynikiem negatywnym")
  if (
    r === 1 &&
    /(?:zaplanowany|wyznaczony|og[łl]oszony)\s+by[łl]\s+na\s+dzie[ńn][\s\S]{0,80}zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/i.test(
      text,
    )
  ) {
    r = 2;
  }
  return r;
}

export function isAnnouncement(title, summary) {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  // Exclude result documents on board
  if (/wynik|rozstrzyg/i.test(combined)) return false;

  // Must be auction / tender
  if (!/przetarg|licytacj/i.test(combined)) return false;
  // Must be sale
  if (!/sprzeda[żz]|zbyci/i.test(combined)) return false;
  // Must target flats / residential property
  const isResidential =
    /lokal\w*\s+miesz/i.test(combined) ||
    /okali\s+miesz/i.test(combined) ||
    /sprzeda[żz]\s+lokal/i.test(combined) ||
    /lokal\w*\s+(?:nr|nt|m\.)\s*\d+/i.test(combined) ||
    /budyn\w*\s+miesz/i.test(combined);
  if (!isResidential) return false;

  // Filter out rentals, leases, land, equipment, and unrelated services
  if (/najem|dzier[żz]aw|konkurs\s+(?:ofert\s+)?na\s+najem/i.test(combined)) return false;
  if (/gara[żz]|boksu|motocykl|reklam/i.test(combined)) return false;
  if (/niezabudowan\w*\s+dzia[łl]k/i.test(combined)) return false;
  if (/lokalu\s+u[żz]ytkow/i.test(combined)) return false;

  return true;
}

export function isResultNotice(title, summary) {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  // Result signals
  const isResult =
    /wynik/i.test(combined) ||
    /rozstrzyg/i.test(combined) ||
    /informacja\s+po\s+przetargu/i.test(combined) ||
    /informacja\s+(?:z\s+|o\s+)[\w\s]{0,25}wynik/i.test(combined);
  if (!isResult) return false;

  // Filter out council voting results or elections
  if (/g[łl]osowa[ńn]|wybor/i.test(combined)) return false;
  // Filter out leases/rentals
  if (/najem|dzier[żz]aw/i.test(combined)) return false;

  return true;
}

export function parseListPage(html, origin = 'https://bip.koscierzyna.gda.pl') {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const blockRe = /<div class="artykul-tlo[\s\S]*?(?=<div class="artykul-tlo|<\/div>\s*<\/div>\s*<div class="stronicowanie|<\/div>\s*<\/div>\s*<div id="stopka|$)/gi;
  let bm;
  while ((bm = blockRe.exec(html)) !== null) {
    const block = bm[0];
    const linkM = /<div class="submenu"><a\s+href="([^"]+)">([\s\S]*?)<\/a><\/div>/i.exec(block);
    if (!linkM) continue;
    let href = linkM[1].replace(/&amp;/g, '&');
    if (!href.startsWith('http')) href = new URL(href, origin).href;
    if (seen.has(href)) continue;
    seen.add(href);

    const title = cleanHtml(linkM[2]);
    const dateM = /Data wytworzenia\s*<span>(\d{4}-\d{2}-\d{2})<\/span>/i.exec(block);
    const published_date = dateM ? dateM[1] : null;
    const skrotM = /<div class="strona-skrot[^"]*">([\s\S]*?)<\/div>/i.exec(block);
    const summary = cleanHtml(skrotM ? skrotM[1] : '');

    out.push({
      url: href,
      published_date,
      title,
      summary,
    });
  }
  return out;
}

export function attachmentPdfsFromDetail(html, origin = 'https://bip.koscierzyna.gda.pl') {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const linkRe = /<a\s+href="([^"]+\.(?:pdf|docx?)(?:\?[^"]*)?)"[^>]*>([\s\S]*?)<\/a>/gi;
  let lm;
  while ((lm = linkRe.exec(html)) !== null) {
    let href = lm[1].replace(/&amp;/g, '&');
    if (href.startsWith('#') || href.includes('cid=39')) continue;
    if (!href.startsWith('http')) href = new URL(href, origin).href;
    if (seen.has(href)) continue;
    seen.add(href);

    const text = cleanHtml(lm[2]);
    const isResult = /wynik|rozstrzyg/i.test(text) || /wynik|rozstrzyg/i.test(href);
    const isAnnouncementAtt = /og[łl]oszen|tre[śs][ćc]/i.test(text) || /ogloszenie|przetarg/i.test(href);

    out.push({
      url: href,
      text,
      isResult,
      isAnnouncement: isAnnouncementAtt && !isResult,
    });
  }
  return out;
}

export function attachmentPdfFromDetail(html, origin = 'https://bip.koscierzyna.gda.pl') {
  const atts = attachmentPdfsFromDetail(html, origin);
  const ann = atts.find((a) => a.isAnnouncement);
  if (ann) return ann.url;
  const nonResult = atts.find((a) => !a.isResult);
  if (nonResult) return nonResult.url;
  return atts[0]?.url || null;
}

export function resultPdfFromDetail(html, origin = 'https://bip.koscierzyna.gda.pl') {
  const atts = attachmentPdfsFromDetail(html, origin);
  const res = atts.find((a) => a.isResult);
  return res ? res.url : null;
}

export function addressFromText(text) {
  if (!text) return null;
  const clean = cleanAddrStr(text);
  const m = /ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃa-ząćęłńóśźż.\s-]+?)\s+(\d+[A-Za-z]?\/\d+[A-Za-z]?)/i.exec(clean);
  if (m) {
    return parseAddress(`ul. ${m[1].trim()} ${m[2].trim()}`);
  }
  // Try pattern with "m." or "lokal"
  const m2 = /ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃa-ząćęłńóśźż.\s-]+?)\s+(\d+[A-Za-z]?)\s*(?:m\.|\/|lokal\s+nr)\s*(\d+[A-Za-z]?)/i.exec(clean);
  if (m2) {
    return parseAddress(`ul. ${m2[1].trim()} ${m2[2].trim()}/${m2[3].trim()}`);
  }
  return null;
}

export function areaFromText(text) {
  if (!text) return null;
  // Single flat: "Powierzchnia użytkowa lokalu w m² 15,94"
  const m1 = /powierzchnia\s+u[żz]ytkowa\s+lokalu\s+(?:w\s+m[²2]\s+)?(\d+[,.]\d{1,2})/i.exec(text);
  if (m1) return parseArea(m1[1]);
  // Table section: Powierzchnia użytkowa ... a) 52,13
  const m2 = /Powierzchnia\s+u[żz]ytkowa[\s\S]*?(?:a\)\s*(\d+[,.]\d{1,2})|(\d+[,.]\d{1,2})\s*(?:m|lokalu))/i.exec(text);
  if (m2) return parseArea(m2[1] || m2[2]);
  // "Pow. w m2 ... lokalu 26,89"
  const m3 = /Pow\.\s*w\s*m2[\s\S]{0,50}?lokalu\s+(\d+[,.]\d{1,2})/i.exec(text);
  if (m3) return parseArea(m3[1]);
  // "powierzchni użytkowej 52,13 m²"
  const m4 = /powierzchni\s+u[żz]ytkowej\s+(\d+[,.]\d{1,2})/i.exec(text);
  if (m4) return parseArea(m4[1]);
  return null;
}

export function startingPriceFromText(text) {
  if (!text) return null;
  // Prefer "c) łącznie ... 170.000,00"
  const m1 = /c\)\s*[łl][ąa]cznie[\s\S]{0,100}?(\d{1,3}(?:\.\d{3})+,\d{2})/i.exec(text);
  if (m1) return parsePLN(m1[1]);
  // "Cena wywoławcza ... 85.000,00 zł"
  const m2 = /cena\s+wywo[łl]awcza[\s\S]{0,150}?(\d{1,3}(?:\.\d{3})+,\d{2})/i.exec(text);
  if (m2) return parsePLN(m2[1]);
  return null;
}

export function finalPriceFromText(text) {
  if (!text) return null;
  // "Osiągnięta cena w przetargu w zł 202.000,00" / "cena osiągnięta ... 2.920.000,00"
  const m1 = /(?:osi[ąa]gni[ęe]ta\s+cena|cena\s+osi[ąa]gni[ęe]ta)[\s\S]{0,50}?(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)/i.exec(text);
  if (m1) return parsePLN(m1[1]);
  // "najwyższa cena osiągnięta ... 97 010 zł"
  const m2 = /najwy[żz]sz[ąa]\s+cen[ęe]\s+osi[ąa]gni[ęe]t[ąa][\s\S]{0,40}?(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)/i.exec(text);
  if (m2) return parsePLN(m2[1]);
  return null;
}

export function parseAnnouncementDetail(detailHtml, docText, context = {}) {
  const htmlClean = cleanHtml(detailHtml);
  const fullText = `${context.title || ''} ${context.summary || ''} ${htmlClean} ${docText || ''}`;
  const auctionDate = auctionDateFromAnnouncement(docText) || auctionDateFromAnnouncement(fullText);
  const round = context.round ?? roundFromText(docText) ?? roundFromText(fullText);
  const published_date = context.published_date || null;
  const detail_url = context.url || null;

  // Extract address block from docText
  const blockM = /(?:Adres lokalu|Położenie i opis lokalu)[\s\S]*?(?=Powierzchnia|Pow\. w m2|Nr księgi|Nr działki)/i.exec(docText || '');
  const addrs = [];
  if (blockM) {
    const cleanedBlock = cleanAddrStr(blockM[0]);
    const addrRe = /ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃa-ząćęłńóśźż.\s-]+?)\s+(\d+[A-Za-z]?\/\d+[A-Za-z]?)/gi;
    let am;
    while ((am = addrRe.exec(cleanedBlock)) !== null) {
      const full = `ul. ${am[1].trim()} ${am[2].trim()}`;
      const parsed = parseAddress(full);
      if (parsed) addrs.push(parsed);
    }
  }

  // If no addresses found in PDF table, fallback to general address parser or HTML
  if (addrs.length === 0) {
    const fallbackAddr = addressFromText(fullText);
    if (fallbackAddr) addrs.push(fallbackAddr);
  }

  if (addrs.length === 0) return [];

  // Multi-flat announcement handling
  if (addrs.length > 1) {
    // Extract per-flat areas from docText
    const areas = [];
    const areaSectionM = /(?:Powierzchnia użytkowa|Pow\.\s*w\s*m2)[\s\S]*?(?=Opis lokalu|Nr księgi|działki|Cena wywoławcza)/i.exec(docText || '');
    if (areaSectionM) {
      const areaLines = areaSectionM[0].split('\n');
      for (const line of areaLines) {
        if (/pomieszczeń|przynależnych|b\)|działki|Udział/i.test(line)) continue;
        const matches = [...line.matchAll(/(\d+[,.]\d{2})/g)];
        if (matches.length > 0 && /a\)|lokalu/i.test(line)) {
          for (const m of matches) areas.push(parseArea(m[1]));
        }
      }
    }

    // Extract per-flat prices from docText
    const prices = [];
    const priceSectionM = /Cena\s+wywo[łl]awcza[\s\S]*?(?=Wadium)/i.exec(docText || '');
    if (priceSectionM) {
      const totalLineM = /c\)\s*[łl][ąa]cznie[^\n]*/i.exec(priceSectionM[0]);
      const target = totalLineM ? totalLineM[0] : priceSectionM[0].split('\n')[0];
      const pMatches = [...target.matchAll(/(\d{1,3}(?:\.\d{3})+,\d{2})/g)];
      for (const pm of pMatches) {
        prices.push(parsePLN(pm[1]));
      }
      if (prices.length === 0) {
        const anyP = [...priceSectionM[0].matchAll(/(\d{1,3}(?:\.\d{3})+,\d{2})/g)];
        for (const pm of anyP) prices.push(parsePLN(pm[1]));
      }
    }

    return addrs.map((address, idx) => ({
      kind: 'mieszkalny',
      address,
      address_raw: `${address.street} ${address.building}/${address.apt || ''}`.replace(/\/$/, ''),
      auction_date: auctionDate,
      published_date,
      round,
      area_m2: areas[idx] ?? null,
      starting_price_pln: prices[idx] ?? null,
      detail_url,
    }));
  }

  // Single-flat announcement handling
  const address = addrs[0];
  const area_m2 = areaFromText(docText) || areaFromText(fullText);
  const starting_price_pln = startingPriceFromText(docText) || startingPriceFromText(fullText);

  return [
    {
      kind: 'mieszkalny',
      address,
      address_raw: `${address.street} ${address.building}/${address.apt || ''}`.replace(/\/$/, ''),
      auction_date: auctionDate,
      published_date,
      round,
      area_m2,
      starting_price_pln,
      detail_url,
    },
  ];
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  // Guard: must relate to auction results
  if (!/(?:informacja\s+o\s+wynik|wynik|odby[łl]\s+si[ęe]|Burmistrz\s+Miasta\s+Kościerzyna)/i.test(text)) {
    return [];
  }
  // Must target residential property / flats / mienie
  if (!/lokal\w*\s+miesz|okali\s+miesz|lokal\w*\s+(?:nr|nt|m\.)\s*\d+|budyn\w*\s+miesz|mienia\s+Gminy/i.test(text)) {
    return [];
  }

  const address = addressFromText(text);
  if (!address) return [];

  const auctionDate = auctionDateFromResult(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const area_m2 = areaFromText(text);

  // Check negative outcome
  const negative =
    /wynik\w*\s+negatywn/i.test(text) ||
    /nikt\s+nie\s+przyst[ąa]pi[łl]/i.test(text) ||
    /nie\s+(?:odnotowano|wp[łl]acono)\s+wadium/i.test(text) ||
    /brak\s+(?:ofert|uczestnik)/i.test(text) ||
    /Ilo[śs][ćc]\s+uczestnik[óo]w\s*:\s*0/i.test(text);

  let outcome, final_price_pln, unsold_reason;
  if (negative) {
    outcome = 'unsold';
    final_price_pln = null;
    if (/wadium\s+(?:wp[łl]yn[ęe][łl]o\s+)?po\s+terminie/i.test(text)) {
      unsold_reason = 'deposit_late';
    } else if (
      /(?:nie\s+(?:odnotowano|wp[łl]acono)|brak)(?:\s+wp[łl]aty)?\s+wadium|wadium\s+(?:nie\s+zosta[łl]o\s+wp[łl]acone|brak)/i.test(
        text,
      )
    ) {
      unsold_reason = 'no_deposit';
    } else if (/nikt\s+nie\s+przyst|brak\s+(?:ofert|uczestnik)|Ilo[śs][ćc]\s+uczestnik[óo]w\s*:\s*0/i.test(text)) {
      unsold_reason = 'no_bids';
    } else {
      unsold_reason = 'unknown';
    }
  } else {
    final_price_pln = finalPriceFromText(text);
    const hasBuyer =
      /nabywc[ąa]/i.test(text) ||
      /Imi[ęe]\s+i\s+nazwisko\s+osoby\s+ustalonej/i.test(text) ||
      final_price_pln != null;
    if (hasBuyer && final_price_pln != null) {
      outcome = 'sold';
      unsold_reason = null;
    } else {
      outcome = 'unsold';
      unsold_reason = 'unknown';
    }
  }

  return [
    {
      address,
      address_raw: `${address.street} ${address.building}/${address.apt || ''}`.replace(/\/$/, ''),
      kind: 'mieszkalny',
      auction_date: auctionDate,
      round,
      area_m2,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      source_pdf: sourceUrl,
      notes: [],
    },
  ];
}
