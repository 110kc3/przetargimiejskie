import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTHS = {
  stycznia: 1, styczen: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

export function normPL(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parsePLN(str) {
  if (!str) return null;
  const s = String(str).replace(/\s+/g, '').replace(/\u00a0/g, '');
  const commaDecimal = /^[\d.]+,\d{2}$/.test(s);
  if (commaDecimal) {
    return Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) | 0;
  }
  const digits = s.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(str) {
  if (str == null) return null;
  const n = Number(String(str).replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function stripHtml(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function roundFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\b(pierwsz\w*|i)\s+(?:nieograniczon\w*\s+|ograniczon\w*\s+|ustn\w*\s+)*przetarg\b/i.test(t) || /\bog[łl]asza\s+pierwszy\b/i.test(t)) return 1;
  if (/\b(drug\w*|ii)\s+(?:nieograniczon\w*\s+|ograniczon\w*\s+|ustn\w*\s+)*przetarg\b/i.test(t) || /\bog[łl]asza\s+drugi\b/i.test(t)) return 2;
  if (/\b(trzec\w*|iii)\s+(?:nieograniczon\w*\s+|ograniczon\w*\s+|ustn\w*\s+)*przetarg\b/i.test(t) || /\bog[łl]asza\s+trzeci\b/i.test(t)) return 3;
  if (/\b(czwart\w*|iv)\s+(?:nieograniczon\w*\s+|ograniczon\w*\s+|ustn\w*\s+)*przetarg\b/i.test(t) || /\bog[łl]asza\s+czwarty\b/i.test(t)) return 4;
  if (/\b(pi[ąa]t\w*|v)\s+(?:nieograniczon\w*\s+|ograniczon\w*\s+|ustn\w*\s+)*przetarg\b/i.test(t) || /\bog[łl]asza\s+pi[ąa]ty\b/i.test(t)) return 5;
  const m = /\b([0-9]+)\s*\.?\s*(?:nieograniczon\w*\s+|ograniczon\w*\s+|ustn\w*\s+)*przetarg\b/i.exec(t);
  if (m) return parseInt(m[1], 10);
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const m1Word = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (m1Word) {
    const mo = PL_MONTHS[normPL(m1Word[2])];
    if (mo) return iso(m1Word[3], mo, m1Word[1]);
  }
  const m1Num = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/i.exec(text);
  if (m1Num) return iso(m1Num[3], m1Num[2], m1Num[1]);

  const m2Num = /w\s+dniu\s+(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})(?:[^\n]{0,150})?odby[łl]\s+si[ęe]/i.exec(text)
    || /odby[łl]\s+si[ęe](?:[^\n]{0,150})?w\s+dniu\s+(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/i.exec(text);
  if (m2Num) return iso(m2Num[3], m2Num[2], m2Num[1]);

  const m2Word = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})(?:[^\n]{0,150})?odby[łl]\s+si[ęe]/i.exec(text);
  if (m2Word) {
    const mo = PL_MONTHS[normPL(m2Word[2])];
    if (mo) return iso(m2Word[3], mo, m2Word[1]);
  }

  const mWord = /(?:odb[ęe]dzie\s+si[ęe]\s+w\s+dniu|w\s+dniu|dnia|dn\.)\s*(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (mWord) {
    const mo = PL_MONTHS[normPL(mWord[2])];
    if (mo) return iso(mWord[3], mo, mWord[1]);
  }
  const mNum = /(?:odb[ęe]dzie\s+si[ęe]\s+w\s+dniu|w\s+dniu|dnia|dn\.)\s*(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/i.exec(text);
  if (mNum) return iso(mNum[3], mNum[2], mNum[1]);
  return null;
}

export function isPropertyArticle(title, href) {
  const t = (title + ' ' + (href || '')).toLowerCase();
  if (/odpad|azbest|dostawa|samoch[oó]d|pojazd|namiot|agregat|przyczep|klimatyzat|sprz[eę]t|projektow|swz|przebudow|budowa\s+ul|remont\s+[łl]azien|innowacyjne\s+oze|wodoci[ąa]g|kanalizac|posi[łl]k|dania\s+gor[ąa]c/i.test(t)) {
    return false;
  }
  return /lokal|mieszkan|nieruchomo|dzia[łl]k|grunt|gara[żz]|11\s*listopada|wojska\s*polskiego|dabrowsk|wykaz|wscieklice|sienkiewicza|kasztanow/i.test(t);
}

export function isResultNotice(text) {
  return /informacja\s+o\s+wynik|wynik\w*\s+przetargu/i.test(text || '');
}

export function isResultAttachment(filenameOrText) {
  const norm = normPL(filenameOrText || '');
  return /wynik|rozstrzyg/i.test(norm) && !/otwarcia/i.test(norm);
}

export function parseYearLinks(html, baseUrl, minYear = 2020) {
  const yearLinks = [];
  const origin = new URL(baseUrl).origin;
  const re = /href="([^"]*\/[0-9a-fA-Z_-]+\/)"[^>]*title="Rok\s*(\d{4})"/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const year = parseInt(m[2], 10);
    if (year >= minYear) {
      let href = m[1];
      if (href.startsWith('/')) href = origin + href;
      if (!seen.has(href)) {
        seen.add(href);
        yearLinks.push({ year, url: href });
      }
    }
  }
  return yearLinks;
}

export function parseArticleLinks(html, origin) {
  const articles = [];
  const seen = new Set();
  const re = /<a\s+href="([^"]+\.html?)"[^>]*title="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (href.startsWith('/')) href = origin + href;
    const title = stripHtml(m[2]);
    if (!seen.has(href) && isPropertyArticle(title, href)) {
      seen.add(href);
      articles.push({ url: href, title });
    }
  }
  return articles;
}

export function extractAttachments(html, origin) {
  const attachments = [];
  const seen = new Set();
  const re = /<a[^>]+href="([^"]*(?:\.pdf|\.docx?|\/resource\/[^"]*))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (href.includes('/resource/image/')) continue;
    if (href.startsWith('/')) href = origin + href;
    const text = stripHtml(m[2]);
    if (!seen.has(href)) {
      seen.add(href);
      attachments.push({ url: href, name: text });
    }
  }
  return attachments;
}

export function parseAnnouncementDetail(text, url, title = '') {
  const combined = (title + ' ' + text).replace(/\s+/g, ' ');

  let kind = 'mieszkalny';
  if (/zabudowan\w*\s+budynkiem\s+mieszkaln/i.test(combined)) {
    kind = 'zabudowana';
  } else if (/lokal\s+u[żz]ytkow|gara[żz]/i.test(combined)) {
    kind = 'uzytkowy';
  } else if (/niezabudowan\w*\s+dzia[łl]k|dzia[łl]k[ai]\s+gruntu|grunty/i.test(combined) && !/lokal/i.test(combined)) {
    kind = 'grunt';
  }

  const round = roundFromText(combined);

  let address = null;
  let addressRaw = null;
  const flatM = /lokal(?:u)?\s+mieszkaln\w*\s+nr\s+(\d+[a-zA-Z]?)[^.\n]*?(?:w\s+Kolnie\s+)?przy\s+(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)(?:[,\s]|$)/i.exec(combined)
    || /(?:przy\s+)?(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)[^.\n]*?lokal(?:u)?\s+mieszkaln\w*\s+nr\s+(\d+[a-zA-Z]?)/i.exec(combined);
  if (flatM) {
    let street, bldg, apt;
    if (/^\d+[a-zA-Z]?$/.test(flatM[1])) {
      apt = flatM[1];
      street = flatM[2].trim();
      bldg = flatM[3];
    } else {
      street = flatM[1].trim();
      bldg = flatM[2];
      apt = flatM[3];
    }
    addressRaw = `ul. ${street} ${bldg}/${apt}`;
    address = parseAddress(addressRaw);
  } else {
    const m = /(?:przy\s+)?(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)(?:\/(\d+[a-zA-Z]?))?(?:[,\s]|$)/i.exec(combined);
    if (m) {
      const street = m[1].trim();
      const bldg = m[2];
      const apt = m[3] ? `/${m[3]}` : '';
      addressRaw = `ul. ${street} ${bldg}${apt}`;
      address = parseAddress(addressRaw);
    }
  }

  const areaM = /(?:powierzchni\s+u[żz]ytkowej|pow\.?\s*u[żz]ytkowa)\s*([\d\s,.]+)\s*m\s*(?:2|²)/i.exec(combined)
    || /(?:o\s+powierzchni|o\s+pow\.)\s*([\d\s,.]+)\s*m\s*(?:2|²)/i.exec(combined);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const priceM = /cena\s+wywo[łl]awcza\s*(?:nieruchomo[sś]ci)?\s*:?\s*([\d\s,.]+)\s*z[łl]/i.exec(combined);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  const auction_date = auctionDateFromText(combined);

  return {
    kind,
    address_raw: addressRaw,
    address,
    round,
    area_m2,
    starting_price_pln,
    auction_date,
    detail_url: url,
  };
}

export function parseWykazDetail(text, url, title = '') {
  const combined = (title + ' ' + text).replace(/\s+/g, ' ');

  let date = null;
  const dm = /(?:od\s+dnia|od\s+)(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/i.exec(combined);
  if (dm) date = iso(dm[3], dm[2], dm[1]);

  const results = [];
  const m = /samodzielny\s+lokal\s+mieszkaln\w*\s+nr\s+(\d+[a-zA-Z]?)\s+(?:w\s+budynku\s+)?przy\s+(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)[^.]*?(?:o\s+pow\.\s*u[żz]ytkowej|o\s+pow\.)\s*([\d\s,.]+)\s*m\s*(?:2|²)/i.exec(combined);
  if (m) {
    const apt = m[1];
    const street = m[2].trim();
    const bldg = m[3];
    const area = parseArea(m[4]);
    const addressRaw = `ul. ${street} ${bldg}/${apt}`;
    const address = parseAddress(addressRaw);
    results.push({
      kind: 'mieszkalny',
      address_raw: addressRaw,
      address,
      area_m2: area,
      date,
      detail_url: url,
    });
  }
  return results;
}

export function parseLandParcels(text, url, title = '', round = null, auctionDate = null) {
  const combined = (title + ' ' + text).replace(/\r/g, '');
  const lines = combined.split(/(?=(?:^|\n)\s*\d+\.\s*dzia[łl]k[ai])/i);
  const parcels = [];
  for (const item of lines) {
    const nrM = /dzia[łl]k[ai]\s+nr\s+([0-9/]+)/i.exec(item);
    if (!nrM) continue;
    const nr = nrM[1].trim();
    const areaM = /(?:o\s+pow\.|powierzchni)\s*([\d\s,]+)\s*m/i.exec(item);
    const priceM = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s,.]+)\s*z[łl]/i.exec(item);
    const area = areaM ? parseArea(areaM[1]) : null;
    const price = priceM ? parsePLN(priceM[1]) : null;
    parcels.push({
      kind: 'grunt',
      dzialka_nr: nr,
      area_m2: area,
      starting_price_pln: price,
      auction_date: auctionDate,
      round,
      detail_url: url,
    });
  }
  return parcels;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultNotice(text)) return [];

  const auctionDate = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const isGlobalNegative = /przetarg\s+(?:odby[łl]\s+si[ęe]\s+z\s+wynikiem\s+negatywnym|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym)/i.test(text)
    && !/nabywc[ąa]|zosta[łl]\s+sprzedan/i.test(text);

  const lines = text.split(/(?=(?:^|\n)\s*\d+\.\s*dzia[łl]k[ai])/i);
  const parcelItems = [];
  for (const item of lines) {
    const nrM = /dzia[łl]k[ai]\s+nr\s+([0-9/]+)/i.exec(item);
    if (!nrM) continue;
    const nr = nrM[1].trim();
    const areaM = /(?:o\s+pow\.|powierzchni)\s*([\d\s,]+)\s*m/i.exec(item);
    const priceM = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s,.]+)\s*z[łl]/i.exec(item);
    parcelItems.push({
      nr,
      area_m2: areaM ? parseArea(areaM[1]) : null,
      starting_price_pln: priceM ? parsePLN(priceM[1]) : null,
    });
  }

  if (parcelItems.length > 0) {
    const results = [];
    for (const p of parcelItems) {
      const escapedNr = p.nr.replace('/', '\\/');
      const soldRe = new RegExp(`(?:nabywc[ąa][^\\n]*?dzia[łl]ki[^\\n]*?${escapedNr}[^\\n]*?za\\s+(?:kwot[ęe]|cen[ęe])\\s*(?:netto)?\\s*([\\d\\s,.]+)\\s*z[łl]|dzia[łl]k[ai]\\s+nr\\s+${escapedNr}[^\\n]*?za\\s+(?:kwot[ęe]|cen[ęe])\\s*([\\d\\s,.]+)\\s*z[łl])`, 'i');
      const sm = soldRe.exec(text);

      let finalPrice = null;
      let outcome = 'unsold';
      if (sm) {
        outcome = 'sold';
        finalPrice = parsePLN(sm[1] || sm[2]);
      } else if (text.includes('dla każdej z wymienionych działek') && text.includes(p.nr)) {
        const buyerSection = text.match(/Nabywcą działki[^.]+za cenę\s*([\d\s,.]+)\s*zł\s*netto dla każdej/i);
        if (buyerSection && buyerSection[0].includes(p.nr)) {
          outcome = 'sold';
          finalPrice = parsePLN(buyerSection[1]);
        }
      }

      results.push({
        auction_date: auctionDate,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: p.nr,
        round,
        starting_price_pln: p.starting_price_pln,
        final_price_pln: outcome === 'sold' ? finalPrice : null,
        outcome,
        unsold_reason: outcome === 'unsold' ? 'unknown' : null,
        area_m2: p.area_m2,
        notes: [],
      });
    }
    return results;
  }

  const sellIdx = text.search(/na\s+sprzeda[żz]|sprzeda[żz]\s+na\s+w[łl]asno[sś][ćc]|nieruchomo[sś][ćc]i\s+po[łl]o[żz]on/i);
  const targetText = sellIdx !== -1 ? text.slice(sellIdx) : text;

  let address = null;
  const flatM = /lokal(?:u)?\s+mieszkaln\w*\s+nr\s+(\d+[a-zA-Z]?)[^.\n]*?(?:w\s+Kolnie\s+)?przy\s+(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)(?:[,\s]|$)/i.exec(targetText)
    || /(?:przy\s+)?(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)[^.\n]*?lokal(?:u)?\s+mieszkaln\w*\s+nr\s+(\d+[a-zA-Z]?)/i.exec(targetText);
  let addressRaw = null;
  if (flatM) {
    let street, bldg, apt;
    if (/^\d+[a-zA-Z]?$/.test(flatM[1])) {
      apt = flatM[1];
      street = flatM[2].trim();
      bldg = flatM[3];
    } else {
      street = flatM[1].trim();
      bldg = flatM[2];
      apt = flatM[3];
    }
    addressRaw = `ul. ${street} ${bldg}/${apt}`;
    address = parseAddress(addressRaw);
  } else {
    const addrMatch = /(?:przy\s+)?(?:ul\.\s*|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ0-9][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż0-9\s.-]+?)\s+(\d+[a-zA-Z]?)(?:\/(\d+[a-zA-Z]?))?(?:[,\s]|$)/i.exec(targetText);
    if (addrMatch) {
      const street = addrMatch[1].trim();
      const bldg = addrMatch[2];
      const apt = addrMatch[3] ? `/${addrMatch[3]}` : '';
      addressRaw = `ul. ${street} ${bldg}${apt}`;
      address = parseAddress(addressRaw);
    }
  }

  const singleParcelM = /dzia[łl]k[ai]\s+gruntu\s+nr\s+([0-9/]+)/i.exec(targetText)
    || /dzia[łl]k[ai]\s+nr\s+([0-9/]+)/i.exec(targetText);
  const dzialka_nr = singleParcelM ? singleParcelM[1].trim() : null;

  let kind = classifyKind(targetText);
  if (!address && dzialka_nr) {
    kind = 'grunt';
  }

  const startPriceM = /cena\s+wywo[łl]awcza\s*(?:nieruchomo[sś]ci)?\s*:?\s*([\d\s,.]+)\s*z[łl]/i.exec(text);
  const starting_price_pln = startPriceM ? parsePLN(startPriceM[1]) : null;

  const finalPriceM = /(?:za\s+wylicytowan[ąa]\s+cen[ęe]|za\s+cen[ęe]|za\s+kwot[ęe])\s*(?:netto)?\s*:?\s*([\d\s,.]+)\s*z[łl]/i.exec(text);
  const final_price_pln = finalPriceM ? parsePLN(finalPriceM[1]) : null;

  const outcome = (final_price_pln != null || /nabywc[ąa]|zosta[łl]\s+sprzedan/i.test(text)) && !isGlobalNegative ? 'sold' : 'unsold';

  const areaM = /(?:łączna\s+pow\.?|o\s+powierzchni\s+użytkowej|pow\.?\s*użytkowa|o\s+pow\.)\s*([\d\s,.]+)\s*m\s*(?:2|²)/i.exec(text);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  return [{
    auction_date: auctionDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addressRaw,
    address,
    dzialka_nr: dzialka_nr || undefined,
    round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    outcome,
    unsold_reason: outcome === 'unsold' ? 'unknown' : null,
    area_m2,
    notes: [],
  }];
}
