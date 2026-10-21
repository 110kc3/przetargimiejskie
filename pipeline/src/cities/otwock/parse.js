// Otwock parsers.
//
// Extracts structured property and auction fields from INTERmedi@ CMS-BIP HTML
// pages and attached announcement/result documents (scanned PDFs converted via ocrPdf).
//
// Groundtruthed against live fixtures from bip.otwock.pl:
// - Announcements (menu 1018):
//   - ID 30906: III przetarg, ul. Stanisława Wyspiańskiego 6/27 (49.42 m², 440 000 zł, auction 2026-12-08)
//   - ID 30905: III przetarg, ul. gen. Władysława Sikorskiego 1/13 (56.00 m², 470 000 zł, auction 2026-12-03)
//   - ID 21975: Multi-flat announcement, ul. Poniatowskiego 29G (lokale nr 1, 5, 9, auction 2021-09-10)
// - Results (menu 1039):
//   - ID 30005: IV przetarg, ul. Józefa Ignacego Kraszewskiego 76/17 (sold, final 97 010 zł, starting 89 000 zł, auction 2026-03-05)
//   - ID 26313: I przetarg, ul. Marii Dąbrowskiej 17/9 (sold, final 550 800 zł, starting 540 000 zł, auction 2023-12-07)
//   - ID 30743: II przetarg, ul. Stanisława Wyspiańskiego 6/27 (unsold, nikt nie przystąpił, auction 2026-07-30)
//   - ID 28862: I przetarg, ul. Józefa Ignacego Kraszewskiego 76/17 (unsold, wadium po terminie, auction 2025-06-26)

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

export function auctionDateFromAnnouncement(text) {
  if (!text) return null;
  // "data przetargu: 8 grudnia 2026 r." / "termin przetargu: 10 września 2021 r."
  const m1 = /(?:data|termin)\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${mon}-${m1[1].padStart(2, '0')}`;
  }
  // "przetarg ... odbędzie się ... w dniu 3 grudnia 2026 r."
  const m2 = /(?:odb[ęe]dzie\s+si[ęe]|przeprowadzony\s+zostanie)[\s\S]{0,150}?(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m2) {
    const mon = PL_MONTHS[m2[2].toLowerCase()];
    if (mon) return `${m2[3]}-${mon}-${m2[1].padStart(2, '0')}`;
  }
  // Dotted: "data przetargu: 08.12.2026"
  const m3 = /(?:data|termin)\s+przetargu\s*:?\s*(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text);
  if (m3) {
    return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  }
  return null;
}

export function auctionDateFromResult(text) {
  if (!text) return null;
  // "w dniu 5 marca 2026 roku ... odbył się ... przetarg"
  const m1 = /(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r(?:oku)?[\s\S]{0,120}?odby[łl]\s+si[ęe]/i.exec(text);
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
  return null;
}

export function roundFromText(text) {
  if (!text) return null;
  const t = text.replace(/&nbsp;/g, ' ');
  // Specific OCR misread: "ITUstny" -> II
  if (/\bITUstn/i.test(t)) return 2;
  // Roman numerals before ustny przetarg / przetarg (handling OCR typos like "przetatg")
  const romanM = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s*(?:ustn\w*\s+)?przeta\w+/i.exec(t);
  if (romanM) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const val = ROMAN[romanM[1].toLowerCase()];
    if (val) return val;
  }
  // Polish ordinal words
  if (/\bpierwsz\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 1;
  if (/\bdrugi\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 2;
  if (/\btrzeci\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 3;
  if (/\bczwart\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 4;
  if (/\bpi[ąa]t\w*\s+(?:ustn\w*\s+)?przeta\w+/i.test(t)) return 5;

  return null;
}

export function isAnnouncement(title, summary) {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  // Must be auction / tender
  if (!/przetarg|licytacj/i.test(combined)) return false;
  // Must be sale
  if (!/sprzeda[żz]|zbyci/i.test(combined)) return false;
  // Must target flats / residential property
  const isResidential =
    /lokal\w*\s+mieszkaln/i.test(combined) ||
    /sprzeda[żz]\s+lokal/i.test(combined) ||
    /lokal\w*\s+(?:nr|nt)\s*\d+/i.test(combined) ||
    /budyn\w*\s+mieszkaln/i.test(combined);
  if (!isResidential) return false;

  // Filter out rentals, leases, equipment, and service contracts
  if (/najem|dzier[żz]aw|konkurs\s+(?:ofert\s+)?na\s+najem/i.test(combined)) return false;
  if (/gara[żz]|boksu|motocykl/i.test(combined)) return false;
  if (/\bruchomo[śs]c/i.test(combined) && !/nieruchomo/i.test(combined)) return false;
  if (/inwentaryzacj|operat|opr[óo][żz]nianie|odpad|remondis/i.test(combined)) return false;
  // Results on announcement board
  if (/^wynik\b|informacja\s+o\s+wynik/i.test(combined)) return false;

  return true;
}

export function isResultNotice(title, summary) {
  const combined = `${title || ''} ${summary || ''}`.toLowerCase();
  // Result signals
  const isResult =
    /wynik/i.test(combined) ||
    /informacja\s+po\s+przetargu/i.test(combined) ||
    /informacja\s+(?:z\s+|o\s+)[\w\s]{0,25}przetarg/i.test(combined);
  if (!isResult) return false;

  // Must target flats / residential property
  const isResidential =
    /lokal\w*\s+mieszkaln/i.test(combined) ||
    /sprzeda[żz]\s+lokal/i.test(combined) ||
    /lokal\w*\s+(?:nr|nt)\s*\d+/i.test(combined) ||
    /budyn\w*\s+mieszkaln/i.test(combined);
  if (!isResidential) return false;

  // Filter out lease, land, equipment, services
  if (/najem|dzier[żz]aw/i.test(combined)) return false;
  if (/gara[żz]|boksu|motocykl/i.test(combined)) return false;
  if (/inwentaryzacj|operat|opr[óo][żz]nianie|odpad/i.test(combined)) return false;

  return true;
}

export function parseListPage(html, origin = 'https://bip.otwock.pl') {
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

export function attachmentPdfFromDetail(html, origin = 'https://bip.otwock.pl') {
  if (!html) return null;
  // Match link to PDF or DOCX attachment
  const m = /href="([^"]+\.(?:pdf|docx?)(?:\?[^"]*)?)"/i.exec(html);
  if (!m) return null;
  let href = m[1].replace(/&amp;/g, '&');
  if (href.startsWith('http')) return href;
  return new URL(href, origin).href;
}

export function addressFromText(text) {
  if (!text) return null;
  const clean = text
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/—|–/g, '-');

  // Extract apt number from "lokal(u) (mieszkalny) nr/nt <N>"
  const aptM = /lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr|nt)\s*(\d+[A-Za-z]?)/i.exec(clean);
  const apt = aptM ? aptM[1] : null;

  // Extract street + building number
  const streetRe =
    /(?:przy\s+(?:ul\.?|yl\.?|ulicy)|w\s+Warszawie\s+przy\s+ul\.)\s+((?:gen\.\s+|al\.\s+|pl\.\s+)?[A-ZŁŚĆĘĄÓŹŻŃ][^,.:;\n]+?)\s+(\d+[A-Za-z]?(?:\s+[A-Za-z])?)(?:\s*(?:w\s+Otwocku|w\s+Warszawie|,|\.|\/|$|\s+stanowi|\s+Prezydent|\s+wraz|\s+z\s+udzia))/i;
  const m = streetRe.exec(clean);
  if (!m) return null;

  let street = m[1].trim().replace(/\s*-\s*/g, '-');
  const building = m[2].trim().replace(/\s+/g, '');
  if (!/^(?:ul\.|al\.|pl\.|os\.|plac)/i.test(street)) {
    street = `ul. ${street}`;
  }

  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return parseAddress(raw);
}

export function areaFromText(text) {
  if (!text) return null;
  const m =
    /powierzchnia\s+u[żz]ytkowa\s+lokalu\s+wynosi\s+(\d+[,.]\d+)/i.exec(text) ||
    /(?:powierzchnia\s+u[żz]ytkowa|pow\.\s*u[żz]ytkowa)[^0-9]{0,30}?(\d+[,.]\d+)\s*m/i.exec(text) ||
    /powierzchni\s+u[żz]ytkowej\s+(\d+[,.]\d+)\s*m/i.exec(text) ||
    /Lokal\s+nr\s+\d+[A-Za-z]?\s+pow\.\s*(\d+[,.]\d+)\s*m/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

export function startingPriceFromText(text) {
  if (!text) return null;
  const m =
    /cena\s+wywo[łl]awcza\s*(?:nieruchomo[śs]ci|lokalu|lokalu\s+mieszkalnego)?\s*:?\s*(?:zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+w\s+wysoko[śs]ci\s+)?([\d\s.,]+)\s*z[łl]/i.exec(
      text,
    ) ||
    /cena\s+wywo[łl]awcza\s+([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function finalPriceFromText(text) {
  if (!text) return null;
  const m =
    /najwy[żz]sz[ąa]\s+cen[ęe]\s+osi[ąa]gni[ęe]t[ąa]\s+w\s+przetargu\s+(?:tj\.\s*)?([\d\s.,]+)\s*z[łl]/i.exec(
      text,
    ) ||
    /sprzedany\s+za\s+(?:kwot[ęe]\s+|najwy[żz]sz[ąa]\s+cen[ęe]\s+osi[ąa]gni[ęe]t[ąa]\s+w\s+przetargu\s+tj\.\s*)?([\d\s.,]+)\s*z[łl]/i.exec(
      text,
    );
  return m ? parsePLN(m[1]) : null;
}

export function parseAnnouncementDetail(detailHtml, docText, context = {}) {
  const htmlClean = cleanHtml(detailHtml);
  const fullText = `${context.title || ''} ${context.summary || ''} ${htmlClean} ${docText || ''}`;
  const round = context.round ?? roundFromText(fullText);
  const published_date = context.published_date || null;
  const detail_url = context.url || null;

  // Check for multi-flat announcement (e.g. ID 21975)
  const blockRe = /Lokal\s+nr\s+(\d+[A-Za-z]?)\s+(?:pow\.?\s*)?(\d+[,.]\d+)\s*m/gi;
  const hits = [];
  let bm;
  while ((bm = blockRe.exec(fullText)) !== null) {
    hits.push({ apt: bm[1], area: parseArea(bm[2]), idx: bm.index });
  }

  if (hits.length > 1) {
    // Multi-lokal announcement
    const baseAddr = addressFromText(fullText);
    if (!baseAddr) return [];

    const out = [];
    for (let i = 0; i < hits.length; i++) {
      const end = i + 1 < hits.length ? hits[i + 1].idx : fullText.length;
      const seg = fullText.slice(hits[i].idx, end);

      const price = startingPriceFromText(seg) || startingPriceFromText(fullText);
      const auctionDate = auctionDateFromAnnouncement(seg) || auctionDateFromAnnouncement(fullText);
      const flatAddr = parseAddress(`ul. ${baseAddr.street} ${baseAddr.building}/${hits[i].apt}`);
      if (!flatAddr) continue;

      out.push({
        kind: 'mieszkalny',
        address: flatAddr,
        address_raw: `${flatAddr.street} ${flatAddr.building}/${flatAddr.apt}`,
        auction_date: auctionDate,
        published_date,
        round,
        area_m2: hits[i].area,
        starting_price_pln: price,
        detail_url,
      });
    }
    return out;
  }

  // Single-lokal announcement
  const address = addressFromText(fullText);
  if (!address) return [];

  const area_m2 = areaFromText(fullText);
  const starting_price_pln = startingPriceFromText(fullText);
  const auction_date = auctionDateFromAnnouncement(fullText);

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
  // Guard: must relate to auction outcome
  if (!/(?:wynik|odby[łl]\s+si[ęe]|Prezydent\s+Miasta\s+Otwocka)/i.test(text)) return [];
  // Must target flats / residential
  if (!/lokal\w*\s+mieszkaln|lokal\w*\s+(?:nr|nt)\s*\d+|budyn\w*\s+mieszkaln/i.test(text)) {
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
    /wadium\s+wp[łl]yn[ęe][łl]o\s+po\s+terminie/i.test(text) ||
    /nie\s+(?:odnotowano|wp[łl]acono)\s+wadium/i.test(text);

  let outcome, final_price_pln, unsold_reason;
  if (negative) {
    outcome = 'unsold';
    final_price_pln = null;
    if (/nikt\s+nie\s+przyst/i.test(text)) {
      unsold_reason = 'no_bids';
    } else if (/po\s+terminie/i.test(text)) {
      unsold_reason = 'deposit_late';
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
