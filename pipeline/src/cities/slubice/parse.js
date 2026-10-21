// Słubice parsers.
//
// Extracts structured property and auction fields from BIP Słubice Next.js HTML
// pages and attached announcement/result documents (scanned copier PDFs converted via ocrPdf).
//
// Groundtruthed against real fixtures from bip.slubice.pl (Category 193 "Sprzedaż mienia - przetargi"):
// - 2622: II przetarg, ul. Żeromskiego 18/8 (43.68 m², 165 000 zł, wadium 15 000 zł, auction 2026-07-16)
// - 2625: II przetarg, ul. Daszyńskiego 20/3 (37.44 m², 145 000 zł, wadium 14 000 zł, auction 2026-07-17)
// - 2626: II przetarg, ul. Wojska Polskiego 53/3 (30.49 m², 115 000 zł, wadium 10 000 zł, auction 2026-07-17)

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

export function extractTableFields(text) {
  if (!text) return null;
  // Match row in table: pow. lokalu, udzial, cena wywolawcza, wadium
  // E.g. | 43,68 0,07 165 000 15 000
  // or   | 30,49 7,30 0,104 115000 | 10000
  const m = /\|\s*(\d+[,.]\d+)(?:\s+[\d,.]+)?\s+([01][,\.]\d+)\s+((?:\d{1,3}\s+)?\d{3,6})\s*(?:\|\s*)?((?:\d{1,3}\s+)?\d{3,6})/.exec(text);
  if (m) {
    return {
      area_m2: parseArea(m[1]),
      udzial: parseArea(m[2]),
      starting_price_pln: parsePLN(m[3]),
      wadium_pln: parsePLN(m[4]),
    };
  }
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  // "Przetarg odbędzie się 16 lipca 2026 r. o godzinie 1109"
  const m1 = /przetarg\s+odb[ęe]dzie\s+si[ęe][\s\S]{0,60}?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${mon}-${m1[1].padStart(2, '0')}`;
  }
  // "data przetargu: 16 lipca 2026 r." / "termin przetargu: ..."
  const m2 = /(?:data|termin)\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  // Dotted: "16.07.2026"
  const m3 = /(?:data|termin)\s+przetargu\s*:?\s*(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text);
  if (m3) {
    return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  }
  return null;
}

export function auctionDateFromResult(text) {
  if (!text) return null;
  // "w dniu 16 lipca 2026 roku ... odbył się ... przetarg"
  const m1 = /(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r(?:oku)?[\s\S]{0,100}?odby[łl]\s+si[ęe]/i.exec(text);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${mon}-${m1[1].padStart(2, '0')}`;
  }
  // "odbył się ... w dniu 16 lipca 2026"
  const m2 = /odby[łl]\s+si[ęe][\s\S]{0,100}?(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

export function publishedDateFromText(text) {
  if (!text) return null;
  // "Przetarg ogłoszono 11 czerwca 2026 r."
  const m1 = /przetarg\s+og[łl]oszono\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${mon}-${m1[1].padStart(2, '0')}`;
  }
  // "ogłoszony w dniu 10 kwietnia 2026 r."
  const m2 = /og[łl]oszon\w*\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

export function roundFromText(text) {
  if (!text) return null;
  const t = text.replace(/&nbsp;/g, ' ');
  // Specific Polish ordinal words
  if (/\bdrugi\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 2;
  if (/\bpierwsz\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 1;
  if (/\btrzeci\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 3;
  if (/\bczwart\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 4;
  if (/\bpi[ąa]t\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 5;

  // Roman numerals
  const romanM = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s*(?:ustn\w*\s+)?przeta\w+/i.exec(t);
  if (romanM) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const val = ROMAN[romanM[1].toLowerCase()];
    if (val) return val;
  }

  return null;
}

export function addressFromText(text) {
  if (!text) return null;
  const clean = text.replace(/&nbsp;/g, ' ').replace(/\r/g, '');

  // 1. Street and building/apartment: "ul. <Street> <Bldg>/<Apt>" across possible OCR line-breaks
  // Matches "ul. Żeromskiego 18/8", "ul. Daszyńskiego 20/3", "ul. Wojska\nPolskiego 53/3"
  const m1 = /(?:ul\.|ulicy)\s*\n?\s*([A-ZŁŚĆĘĄÓŹŻŃ][a-ząćęłńóśźżA-ZŁŚĆĘĄÓŹŻŃ\s-]+?)\s*\n?\s*(\d+[A-Za-z]?\/\d+[A-Za-z]?)/i.exec(clean);
  if (m1) {
    const street = m1[1].replace(/\s+/g, ' ').trim();
    const bldgApt = m1[2].trim();
    return parseAddress(`ul. ${street} ${bldgApt}`);
  }

  // 2. Pattern: "lokalu ... nr <Apt> ... przy ul. <Street> <Bldg>"
  const aptM = /lokal\w*\s+(?:mieszkaln\w*\s+)?nr\s*(\d+[A-Za-z]?)/i.exec(clean);
  const streetM = /przy\s+ul\.\s+([A-ZŁŚĆĘĄÓŹŻŃ][a-ząćęłńóśźżA-ZŁŚĆĘĄÓŹŻŃ\s-]+?)\s+(\d+[A-Za-z]?)/i.exec(clean);
  if (streetM) {
    const street = streetM[1].replace(/\s+/g, ' ').trim();
    const bldg = streetM[2].trim();
    const apt = aptM ? aptM[1] : null;
    return parseAddress(apt ? `ul. ${street} ${bldg}/${apt}` : `ul. ${street} ${bldg}`);
  }

  // 3. Fallback for title strings: "Słubice, ul. <Street> <Bldg>/<Apt>"
  const m3 = /S[łl]ubice[,\s]+(?:ul\.\s+)?([A-ZŁŚĆĘĄÓŹŻŃ][a-ząćęłńóśźżA-ZŁŚĆĘĄÓŹŻŃ\s-]+?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(clean);
  if (m3) {
    const street = m3[1].replace(/\s+/g, ' ').trim();
    const bldgApt = m3[2].trim();
    return parseAddress(`ul. ${street} ${bldgApt}`);
  }

  return null;
}

export function areaFromText(text) {
  if (!text) return null;
  const table = extractTableFields(text);
  if (table && table.area_m2) return table.area_m2;

  const m =
    /pow(?:ierzchnia)?\s+(?:u[żz]ytkowa\s+)?lokalu[^\d]{0,30}(\d+[,.]\d+)/i.exec(text) ||
    /pow(?:ierzchnia)?\.\s*lokalu[^\d]{0,30}(\d+[,.]\d+)/i.exec(text) ||
    /powierzchni\s+(?:u[żz]ytkowej\s+)?(\d+[,.]\d+)\s*m/i.exec(text) ||
    /powierzchnia\s+(\d+[,.]\d+)\s*m/i.exec(text) ||
    /powierzchni\s+(\d+[,.]\d+)\s*m/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

export function startingPriceFromText(text) {
  if (!text) return null;
  const table = extractTableFields(text);
  if (table && table.starting_price_pln) return table.starting_price_pln;

  const m =
    /cen[ay]\s+wywo[łl]awcz\w*[^\d]{0,50}?([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function finalPriceFromText(text) {
  if (!text) return null;
  const m =
    /najwy[żz]sz[ąa]\s+cen[ęe]\s+osi[ąa]gni[ęe]t[ąa][\s\S]{0,40}?([\d\s.,]+)\s*z[łl]/i.exec(text) ||
    /cena\s+osi[ąa]gni[ęe]ta[\s\S]{0,40}?([\d\s.,]+)\s*z[łl]/i.exec(text) ||
    /sprzedan\w*\s+za[\s\S]{0,40}?([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function isAnnouncement(title, summary) {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  if (!/przetarg|licytacj/i.test(combined)) return false;
  if (!/sprzeda[żz]|zbyci/i.test(combined)) return false;

  const isResidential =
    /lokal\w*\s+mieszkaln/i.test(combined) ||
    /sprzeda[żz]\s+lokal/i.test(combined) ||
    /lokal\w*\s+(?:nr|nt)\s*\d+/i.test(combined) ||
    /budyn\w*\s+mieszkaln/i.test(combined);
  if (!isResidential) return false;

  if (/najem|dzier[żz]aw/i.test(combined)) return false;
  if (/gara[żz]|boksu|motocykl/i.test(combined)) return false;
  if (/^wynik\b|informacja\s+o\s+wynik|wynik\w*\s+przetarg/i.test(combined)) return false;

  return true;
}

export function isResultNotice(title, summary) {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  const isResult =
    /wynik/i.test(combined) ||
    /rozstrzyg/i.test(combined) ||
    /informacja\s+(?:z|o)\s+przetarg/i.test(combined);
  if (!isResult) return false;

  const isResidential =
    /lokal\w*\s+mieszkaln/i.test(combined) ||
    /sprzeda[żz]\s+lokal/i.test(combined) ||
    /lokal\w*\s+(?:nr|nt)\s*\d+/i.test(combined) ||
    /budyn\w*\s+mieszkaln/i.test(combined);
  if (!isResidential) return false;

  if (/najem|dzier[żz]aw/i.test(combined)) return false;
  if (/gara[żz]|boksu|motocykl/i.test(combined)) return false;

  return true;
}

export function parseListPage(html, origin = 'https://bip.slubice.pl') {
  if (!html) return [];
  const items = [];
  const seen = new Set();

  // 1. Match HTML links: <a ... href="/kategorie/.../artykuly/<id>-<slug>">Title</a>
  const linkRe = /<a\s+[^>]*href="([^"]*\/artykuly\/(\d+)-[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/g, '&');
    if (!href.startsWith('http')) href = new URL(href, origin).href;
    if (seen.has(href)) continue;
    seen.add(href);
    const id = m[2];
    const title = cleanHtml(m[3]);
    items.push({ id, url: href, title });
  }

  // 2. Also check RSC flight stream JSON chunks for items
  const flightMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
  for (const fm of flightMatches) {
    let chunk = fm[1];
    try {
      chunk = JSON.parse(`"${chunk}"`);
    } catch {}
    const itemRe = /"id":(\d+)[^}]*?"displayText":"([^"]+)"[^}]*?"slug":"([^"]*artykuly\/[^"]*)"(?:[^}]*?"publishedDate":"([^"]*)")?/g;
    let im;
    while ((im = itemRe.exec(chunk)) !== null) {
      const id = im[1];
      const title = im[2];
      const slug = im[3];
      const published_date = im[4] ? im[4].split('T')[0] : null;
      let url = slug.startsWith('/') ? slug : '/' + slug;
      if (!url.startsWith('http')) url = new URL(url, origin).href;
      if (seen.has(url)) continue;
      seen.add(url);
      items.push({ id, url, title, published_date });
    }
  }

  return items;
}

export function attachmentPdfFromDetail(html, origin = 'https://bip.slubice.pl') {
  if (!html) return null;
  // 1. Direct attachment API link: /api/attachments/<id>
  const attM = /href="(\/api\/attachments\/\d+[^"]*)"/i.exec(html) ||
               /href="(https?:\/\/bip-api\.slubice\.pl\/api\/attachments\/\d+[^"]*)"/i.exec(html) ||
               /href="(https?:\/\/bip-docrepo-api\.slubice\.pl\/api\/files\/\d+[^"]*)"/i.exec(html);
  if (attM) {
    const href = attM[1].replace(/&amp;/g, '&');
    if (href.startsWith('http')) return href;
    return `https://bip-docrepo-api.slubice.pl/api/files/${href.replace('/api/attachments/', '')}`;
  }

  // 2. General .pdf link
  const pdfM = /href="([^"]+\.pdf[^"]*)"/i.exec(html);
  if (pdfM) {
    let href = pdfM[1].replace(/&amp;/g, '&');
    if (href.startsWith('http')) return href;
    return new URL(href, origin).href;
  }

  return null;
}

export function parseAnnouncementDetail(detailHtml, docText, context = {}) {
  const htmlClean = cleanHtml(detailHtml);
  const fullText = `${context.title || ''} ${context.summary || ''} ${htmlClean} ${docText || ''}`;
  const address = addressFromText(fullText);
  if (!address) return [];

  const round = context.round ?? roundFromText(fullText);
  const published_date = publishedDateFromText(fullText) || context.published_date || null;
  const auction_date = auctionDateFromText(fullText);
  const area_m2 = areaFromText(fullText);
  const starting_price_pln = startingPriceFromText(fullText);
  const detail_url = context.url || null;

  return [
    {
      kind: 'mieszkalny',
      address,
      address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
      auction_date,
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
  if (!/(?:wynik|odby[łl]\s+si[ęe]|Burmistrz\s+S[łl]ubic|informacja\s+o\s+wynik)/i.test(text)) {
    return [];
  }
  if (!/lokal\w*\s+mieszkaln|budyn\w*\s+mieszkaln/i.test(text)) {
    return [];
  }

  const address = addressFromText(text);
  if (!address) return [];

  const auctionDate = auctionDateFromResult(text) || auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const area_m2 = areaFromText(text);

  const negative =
    /wynik\w*\s+negatywn/i.test(text) ||
    /nikt\s+nie\s+przyst[ąa]pi[łl]/i.test(text) ||
    /brak\s+(?:ofert|wp[łl]aty\s+wadium)/i.test(text) ||
    /nie\s+(?:odnotowano|wp[łl]acono)\s+wadium/i.test(text);

  let outcome, final_price_pln, unsold_reason;
  if (negative) {
    outcome = 'unsold';
    final_price_pln = null;
    if (/nikt\s+nie\s+przyst/i.test(text) || /brak\s+ofert/i.test(text)) {
      unsold_reason = 'no_bids';
    } else if (/wadium/i.test(text)) {
      unsold_reason = 'no_deposit';
    } else {
      unsold_reason = 'unknown';
    }
  } else {
    final_price_pln = finalPriceFromText(text);
    const hasBuyer = /Nabywc[ąa]\s+zosta[łl]/i.test(text) || final_price_pln != null;
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
      address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
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
