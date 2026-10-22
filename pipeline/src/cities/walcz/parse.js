// Wałcz notice & result document parsers.
//
// Analyzes:
//   1. Category article lists from Joomla / GovArticle tables
//   2. Notice detail pages (attachments block)
//   3. Born-digital notice PDFs (cena wywoławcza, powierzchnia, wadium, termin, adres)
//   4. Achieved-price result notices / PDFs ("Informacja o wyniku przetargu")

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: '01', styczeń: '01', styczen: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecień: '04', kwiecien: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpień: '08', sierpien: '08',
  września: '09', wrzesnia: '09', wrzesień: '09', wrzesien: '09',
  października: '10', pazdziernika: '10', październik: '10', pazdziernik: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzień: '12', grudzien: '12',
};

export function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[^\d,.-]/g, '').trim();
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) {
    const val = Number(m[1].replace(/[.,]/g, ''));
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  const fallback = Number(cleaned.replace(/\./g, '').replace(/,.*/, ''));
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const cleaned = String(numStr).replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function polishDateToIso(str) {
  if (!str) return null;
  const numM = /(\d{1,2})[.-](\d{1,2})[.-](\d{4})/.exec(str);
  if (numM) {
    const d = numM[1].padStart(2, '0');
    const m = numM[2].padStart(2, '0');
    const y = numM[3];
    return `${y}-${m}-${d}`;
  }
  const wordM = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/iu.exec(str);
  if (wordM) {
    const d = wordM[1].padStart(2, '0');
    const mon = PL_MONTHS[wordM[2].toLowerCase()];
    if (mon) return `${wordM[3]}-${mon}-${d}`;
  }
  return null;
}

export function extractRound(title, text) {
  const combined = `${title || ''} ${text || ''}`;
  const romanM = /\b(IV|III|II|I|V)\s+(?:ustny\s+)?przetarg/iu.exec(combined);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  const wordM = /\b(pierwszy|drugi|trzeci|czwarty|pi[aą]ty)\s+(?:ustny\s+)?przetarg/iu.exec(combined);
  if (wordM) {
    const w = wordM[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzec')) return 3;
    if (w.startsWith('czwart')) return 4;
    if (w.startsWith('pi')) return 5;
  }
  return null;
}

export function extractAuctionDate(title, text) {
  // 1. In title: "termin przetargu 18.11.2026 r."
  if (title) {
    const tM = /termin\s+przetargu\s+(\d{1,2}[.-]\d{1,2}[.-]\d{4})/iu.exec(title);
    if (tM) return polishDateToIso(tM[1]);
  }
  // 2. In text: "Przetarg odbędzie się w dniu 18 listopada 2026 r."
  if (text) {
    const bodyM = /(?:przetarg\s+odb[eę]dzie\s+si[eę]\s+w\s+dniu|w\s+dniu)\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}[.-]\d{1,2}[.-]\d{4})/iu.exec(text);
    if (bodyM) return polishDateToIso(bodyM[1]);
  }
  return null;
}

export function extractStartingPrice(text) {
  if (!text) return null;
  const m = /Cena\s+wywo[łl]awcza[^\n\d]*?([0-9]{1,3}(?:[ .\s][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/iu.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function extractDeposit(text) {
  if (!text) return null;
  const m = /Wadium\s+(?:wynosi|w\s+wysoko[śs]ci)[\s\S]{0,30}?([0-9]{1,3}(?:[ .\s][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/iu.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function extractWadiumDeadline(text) {
  if (!text) return null;
  const m = /wadium[\s\S]{0,400}najp[oó][zź]niej\s+(?:do\s+)?dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}[.-]\d{1,2}[.-]\d{4})/iu.exec(text);
  return m ? polishDateToIso(m[1]) : null;
}

export function extractFlatArea(text) {
  if (!text) return null;
  // Look for unit area in notice lead: "o powierzchni [użytkowej] 44,43 m2"
  const m = /o\s+powierzchni(?:\s+u[żz]ytkowej)?\s*([0-9]+(?:[.,][0-9]+)?)\s*m\s*[2²]/iu.exec(text);
  return m ? parseArea(m[1]) : null;
}

export function extractLandArea(title, text) {
  const combined = `${title || ''} ${text || ''}`;
  // Hectares e.g. "0,1496 ha" -> convert to m2
  const haM = /pow\.?\s*([0-9]+(?:[.,][0-9]+)?)\s*ha/iu.exec(combined);
  if (haM) {
    const val = Number(haM[1].replace(',', '.'));
    if (Number.isFinite(val) && val > 0) return Math.round(val * 10000);
  }
  // Direct m2 e.g. "1496 m2"
  const m2M = /pow\.?\s*([0-9]+(?:[.,][0-9]+)?)\s*m\s*[2²]/iu.exec(combined);
  if (m2M) {
    return parseArea(m2M[1]);
  }
  return null;
}

export function extractParcels(title, text) {
  for (const src of [title, text]) {
    if (!src) continue;
    const m = /dzia[łl][\s\S]*?(?:geodezyjn\w*|nr)\s+([\s\S]*?)(?=\s+o\s+(?:[łl][aą]cznej\s+)?pow|\s+po[łl]o[żz]on|\s+stanowi|$)/iu.exec(src);
    if (m) {
      const matches = [...m[1].matchAll(/\b\d+(?:\/\d+)?\b/g)].map((x) => x[0]);
      if (matches.length) return matches.join(', ');
    }
  }
  return null;
}

export function extractAddress(title, text) {
  const sources = [title || '', text || ''];
  for (const src of sources) {
    // 1. Match "przy ul. Bydgoskiej nr 3, oznaczonego numerem 6"
    const m1 = /(?:przy\s+)?(?:ulicy|ul\.)\s+([\p{L}\d\s.-]+?)(?:\s+nr)?\s+(\d+[A-Za-z]?)(?:,\s*|\s+)oznaczonego numerem\s*(\d+[A-Za-z]?)/iu.exec(src);
    if (m1) {
      const street = m1[1].trim().replace(/\s+/g, ' ');
      const parsed = parseAddress(`ul. ${street} ${m1[2]}/${m1[3]}`);
      if (parsed) return parsed;
    }
    // 2. Match "przy ulicy Chełmińskiej 29 lok. nr 31" or "przy ulicy Bydgoskiej 3 lok. nr 6"
    const m2 = /(?:przy\s+)?(?:ulicy|ul\.)\s+([\p{L}\d\s.-]+?)(?:\s+nr)?\s+(\d+[A-Za-z]?)(?:\s*,)?\s*(?:lok\.|lokalu)?(?:\s*nr)?\s*(\d+[A-Za-z]?)(?:\s*[,.]|$|\s+termin|\s+o\s+pow)/iu.exec(src);
    if (m2) {
      const street = m2[1].trim().replace(/\s+/g, ' ');
      const parsed = parseAddress(`ul. ${street} ${m2[2]}/${m2[3]}`);
      if (parsed) return parsed;
    }
    // 3. Fallback: "ul. Street 12/3" standard format
    const m3 = /(?:przy\s+)?(?:ulicy|ul\.)\s+([\p{L}\d\s.-]+?)\s+(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/iu.exec(src);
    if (m3) {
      const street = m3[1].trim().replace(/\s+/g, ' ');
      const parsed = parseAddress(`ul. ${street} ${m3[2]}/${m3[3]}`);
      if (parsed) return parsed;
    }
  }
  return null;
}

export function extractLandStreet(title, text) {
  for (const src of [title, text]) {
    if (!src) continue;
    const m = /(?:przy\s+)?(?:ulicy|ul\.)\s+([\p{L}\s.-]+?)(?:\s*[.,]|\s+termin|\s+opis|\s+stanowi|\s*$)/iu.exec(src);
    if (m) {
      const s = m[1].replace(/\s+/g, ' ').trim();
      if (s.length > 2 && !/^\d+$/.test(s)) return 'ul. ' + s;
    }
  }
  return null;
}

export function parseBoardArticles(html, baseUrl = 'https://bip.walcz.pl') {
  if (!html) return [];
  const items = [];
  const rowRe = /<tr[^>]*class="[^"]*cat-list-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const linkMatch = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(rowHtml);
    if (!linkMatch) continue;
    const href = linkMatch[1].replace(/&amp;/g, '&');
    const title = cleanText(linkMatch[2]);
    const dateMatch = /<td[^>]*class="[^"]*list-date[^"]*"[^>]*>([\s\S]*?)<\/td>/i.exec(rowHtml);
    const publishDate = dateMatch ? polishDateToIso(cleanText(dateMatch[1])) : null;
    const url = new URL(href, baseUrl).toString();
    items.push({ url, title, publishDate });
  }
  // Fallback if table was missing or structured differently
  if (items.length === 0) {
    const linkRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(html)) !== null) {
      const href = lm[1].replace(/&amp;/g, '&');
      if (
        (href.includes('/przetargi-aktualne/') && !href.endsWith('/przetargi-aktualne')) ||
        (href.includes('/przetargi-zakonczone/') && !href.endsWith('/przetargi-zakonczone')) ||
        (href.includes('/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy/') && !href.endsWith('/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy'))
      ) {
        const title = cleanText(lm[2]);
        if (title.length > 5) {
          const url = new URL(href, baseUrl).toString();
          items.push({ url, title, publishDate: null });
        }
      }
    }
  }
  return items;
}

export function extractAttachments(html, baseUrl = 'https://bip.walcz.pl') {
  if (!html) return [];
  const attachments = [];
  const seen = new Set();
  const linkRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const rawHref = m[1].replace(/&amp;/g, '&');
    if (
      rawHref.includes('task=article.downloadAttachment') ||
      rawHref.toLowerCase().includes('.pdf')
    ) {
      // Exclude generic non-notice assets like ewidencja zabytków
      if (/gminna_ewidencja_zabytkow/i.test(rawHref)) continue;
      const url = new URL(rawHref, baseUrl).toString();
      if (seen.has(url)) continue;
      seen.add(url);
      const text = cleanText(m[2]);
      attachments.push({ url, text });
    }
  }
  return attachments;
}

export function pickAnnouncementPdf(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const preferred = attachments.find((a) =>
    /og[łl]oszenie|przetarg/iu.test(a.text || a.url)
  );
  return preferred ? preferred.url : attachments[0].url;
}

export function pickResultPdf(attachments) {
  if (!attachments || attachments.length === 0) return null;
  const preferred = attachments.find((a) =>
    /wynik|informacja/iu.test(a.text || a.url)
  );
  return preferred ? preferred.url : attachments[0].url;
}

export function parseAnnouncementNotice({ title, html, pdfText, detailUrl, pdfUrl }) {
  let kind = classifyKind(title);
  if (kind === 'unknown' && pdfText) {
    kind = classifyKind(pdfText.slice(0, 1500));
  }
  const round = extractRound(title, pdfText);
  const auction_date = extractAuctionDate(title, pdfText);
  const starting_price_pln = extractStartingPrice(pdfText);
  const deposit_pln = extractDeposit(pdfText);
  const wadium_deadline = extractWadiumDeadline(pdfText);

  if (kind === 'grunt') {
    const dzialka_nr = extractParcels(title, pdfText);
    const area_m2 = extractLandArea(title, pdfText);
    const address_raw = extractLandStreet(title, pdfText);
    return {
      id: detailUrl,
      kind: 'grunt',
      title,
      dzialka_nr,
      address_raw,
      round,
      starting_price_pln,
      deposit_pln,
      wadium_deadline,
      area_m2,
      auction_date,
      detail_url: detailUrl,
      source_pdf: pdfUrl || null,
      outcome: 'active',
    };
  }

  const address = extractAddress(title, pdfText);
  const area_m2 = extractFlatArea(pdfText);
  const address_raw = address ? `ul. ${address.street} ${address.building}/${address.apt || ''}`.replace(/\/$/, '') : null;

  return {
    id: detailUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    title,
    address_raw,
    address,
    round,
    starting_price_pln,
    deposit_pln,
    wadium_deadline,
    viewing_date: null,
    area_m2,
    auction_date,
    detail_url: detailUrl,
    source_pdf: pdfUrl || null,
    outcome: 'active',
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const clean = text.replace(/\r/g, '').replace(/\s+/g, ' ');

  // Require result markers
  const isResult =
    /informacja\s+o\s+wyniku|wynik\s+przetargu|przetarg\s+zako[ńn]czy[łl]\s+si[ęe]/iu.test(clean) ||
    /nabywc[aą]|najwy[żz]sza\s+cena/iu.test(clean);
  if (!isResult) return [];

  const address = extractAddress(clean, clean);
  if (!address) return [];

  const round = extractRound(clean, clean);
  const auction_date = extractAuctionDate(clean, clean) || fallbackDate || null;
  const starting_price_pln = extractStartingPrice(clean);
  const area_m2 = extractFlatArea(clean);

  // Negative / unsold markers
  const isNegative =
    /wynik\w*\s+negatywn/iu.test(clean) ||
    /nie\s+wp[łl]yn[ęe][łl]o\s+wadium/iu.test(clean) ||
    /brak\s+ofert/iu.test(clean) ||
    /brak\s+uczestnik/iu.test(clean) ||
    /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/iu.test(clean);

  let outcome, final_price_pln, unsold_reason;
  if (isNegative) {
    outcome = 'unsold';
    final_price_pln = null;
    unsold_reason = 'no_buyer';
  } else {
    // Sold: extract highest achieved price
    const finalM =
      /(?:cena\s+osi[aą]gni[eę]ta|najwy[żz]sza\s+cena)[^\n\d]*?([0-9]{1,3}(?:[ .\s][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/iu.exec(clean) ||
      /(?:za\s+kwot[eę]|za\s+cen[eę])[^\n\d]*?([0-9]{1,3}(?:[ .\s][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/iu.exec(clean);
    final_price_pln = finalM ? parsePLN(finalM[1]) : null;
    outcome = final_price_pln != null ? 'sold' : 'unsold';
    unsold_reason = outcome === 'unsold' ? 'no_buyer' : null;
  }

  return [
    {
      address,
      kind: 'mieszkalny',
      auction_date,
      round,
      area_m2,
      starting_price_pln,
      outcome,
      unsold_reason,
      final_price_pln,
      source_pdf: sourceUrl || null,
      notes: null,
    },
  ];
}
