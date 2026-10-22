// Kluczbork parser.
//
// Extracts residential flats and land plots auctioned by Gmina Kluczbork
// (Extranet bip.net v7.33 CMS).
//
// Document types:
// 1. Announcements (board 452) — "OGŁOSZENIE o przetargu ustnym nieograniczonym...",
//    typically a multi-lot document with Roman-numeral round sections (I, II, III...)
//    and numbered property items.
// 2. Results (board 690) — "Informacja o wyniku przetargu...", standard § 12
//    Rozporządzenia RM format with items headed by "[0-9lI]. Oznaczenie nieruchomości...".
//
// Character artifacts:
// - Extracted text often has letter 'l' (lowercase L) or 'I' (capital i) instead of digit '1'.
// - Polish diacritics may be dropped in PDF text layer (e.g. wywolawcza, osignita).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN_ROUNDS = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};

const WORD_ROUNDS = [
  [/^pierwsz/i, 1],
  [/^drug/i, 2],
  [/^trzec/i, 3],
  [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5],
  [/^sz[óo]st/i, 6],
  [/^si[óo]dm/i, 7],
  [/^[óo]sm/i, 8],
  [/^dziewi[ąa]t/i, 9],
  [/^dziesi[ąa]t/i, 10],
];

/** Parse PLN monetary string into integer. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const withoutGrosze = String(numStr).trim().replace(/[.,]\d{2}$/, '');
  const cleaned = withoutGrosze.replace(/[\s.,\u00a0]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse decimal number string. */
export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Strip HTML/PDF formatting artifacts. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\u00ad/g, '') // soft hyphen
    .replace(/(\d)\(\)(\d)/g, '$10$2') // font artifact 2()23 -> 2023
    .replace(/\(\),/g, '0,') // font artifact (),1401 -> 0,1401
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build standard record text. */
export function buildRecordText(f = {}) {
  return [`TITLE: ${stripHtml(f.title)}`, `BODY: ${stripHtml(f.body)}`].join('\n');
}

export function whole(text) {
  if (!text) return '';
  if (typeof text === 'object') return [text.title, text.body].filter(Boolean).join(' ');
  return String(text)
    .replace(/(\d)\(\)(\d)/g, '$10$2')
    .replace(/\(\),/g, '0,');
}

/** Is this a concluded result notice? */
export function isResultDoc(text) {
  const t = whole(text);
  if (/lista\s+os[oó]b\s+zakwalifikowanych/i.test(t)) return false;
  return /informacj\w*\s+o\s+wynik\w*\s+przetargu|wynik\w*\s+przetargu|wynik\w*\s+rokowa[ńn]|odby[łl]\s+si[ęe]\s+w\s+dniu/i.test(t);
}

/** Is this a lease tender rather than sale? */
export function isLease(text) {
  const t = whole(text);
  if (/sprzeda[żz]/i.test(t)) return false;
  return /dzier[żz]aw|najm|6845/i.test(t);
}

/** Is this a real-estate sale tender? */
export function isSaleAuction(text) {
  const t = whole(text);
  return /sprzeda[żz]|6840/i.test(t);
}

/** Is this an auction cancellation notice? */
export function isCancellation(text) {
  const t = whole(text);
  return /odwo[łl]ani\w*[\s\S]{0,60}?przetarg|odwo[łl]uj[ęe]\s*[:\s]+[-–\s]*(?:I|II|III|IV|V)?\s*przetarg|uniewa[żz]nieni\w*[\s\S]{0,60}?przetarg/i.test(t);
}

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** Extract auction date in ISO YYYY-MM-DD. */
export function auctionDateFromText(text) {
  const t = whole(text);

  // 1. Scheduled future auction date in announcement: "Przetarg odbędzie się w dniu 30 listopada 2023r."
  const futureWordM = /odb[ęe]dzie\s+si[ęe][\s\S]{0,100}?(?:w\s+dniu|dnia)\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (futureWordM) {
    const mo = PL_MONTH[futureWordM[2].toLowerCase()];
    if (mo) return toIso(futureWordM[1], mo, futureWordM[3]);
  }
  const futureNumM = /odb[ęe]dzie\s+si[ęe][\s\S]{0,100}?(?:w\s+dniu|dnia)\s*(\d{1,2})[\.\s]+(\d{1,2})[\.\s]+(\d{4})/i.exec(t);
  if (futureNumM) return toIso(futureNumM[1], futureNumM[2], futureNumM[3]);

  // 2. Concluded auction date in result: "odbył się w dniu 29.09.2026r." / "przeprowadzonym w dniu..."
  const pastNumM = /(?:odby[łl]\s+si[ęe]|przeprowadzon\w*)[\s\S]{0,100}?(?:w\s+dniu|dnia)\s*(\d{1,2})[\.\s]+(\d{1,2})[\.\s]+(\d{4})/i.exec(t);
  if (pastNumM) return toIso(pastNumM[1], pastNumM[2], pastNumM[3]);

  const pastWordM = /(?:odby[łl]\s+si[ęe]|przeprowadzon\w*)[\s\S]{0,100}?(?:w\s+dniu|dnia)\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (pastWordM) {
    const mo = PL_MONTH[pastWordM[2].toLowerCase()];
    if (mo) return toIso(pastWordM[1], mo, pastWordM[3]);
  }

  // 3. Title termin: "termin przetargu: 29.09.2026r."
  const termM = /termin\s+przetargu\s*:?\s*(\d{1,2})[\.\s]+(\d{1,2})[\.\s]+(\d{4})/i.exec(t);
  if (termM) return toIso(termM[1], termM[2], termM[3]);

  return null;
}

/** Parse round number from text (e.g. "I przetarg" -> 1). */
export function roundFromText(text) {
  const t = whole(text);
  const mRoman = /\b([IVX]+)\s+przetarg\s+ustny/i.exec(t);
  if (mRoman) {
    const r = ROMAN_ROUNDS[mRoman[1].toUpperCase()];
    if (r) return r;
  }
  const mWord = /\b([a-ząćęłńóśźż]+)\s+przetarg\s+ustny/i.exec(t);
  if (mWord) {
    for (const [re, val] of WORD_ROUNDS) {
      if (re.test(mWord[1])) return val;
    }
  }
  return 1;
}

const AMOUNT_RE = String.raw`(\d{1,3}(?:[.\s\u00a0]\d{3})*(?:,\d{2})?)`;

/** Starting price from item text. */
export function startingPriceFromText(text) {
  // Line bulleted with hyphen/dash: "- cena wywoławcza: 187 400,00 zł"
  const mBullet = new RegExp(String.raw`[-–]\s*cena\s+wywo[łl]awcz\w*[^\n\r]*?[:–\-]?\s*${AMOUNT_RE}\s*(?:z[łlt]|xl)`, 'i').exec(text);
  if (mBullet) return parsePLN(mBullet[1]);

  // General pattern: "Cena wywoławcza ... 187 400,00 zł"
  const mGen = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[\s\S]{0,120}?(?:brutto\s*[:\-]?)?\s*${AMOUNT_RE}\s*(?:z[łlt]|xl)`, 'i').exec(text);
  return mGen ? parsePLN(mGen[1]) : null;
}

/** Achieved price from result item text. */
export function achievedPriceFromText(text) {
  // Line: "- najwyższa cena osiągnięta w przetargu: 35 000,00 zł."
  const m = /[-–]\s*najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t\w*[^\n\r]*?[:–\-]\s*([^\n\r]+)/i.exec(text);
  if (!m) return null;
  const line = m[1].trim();
  if (/nie dotyczy|brak|negatywn/i.test(line)) return null;
  const numM = new RegExp(AMOUNT_RE + String.raw`\s*z[łlt]`, 'i').exec(line);
  return numM ? parsePLN(numM[1]) : null;
}

/** Buyer name from result item text (null if unsold/negative). */
export function buyerName(text) {
  const m = /nabywc\w*[\s\S]{0,120}?[:–\-]\s*([^\n\r]+)/i.exec(text);
  if (!m) return null;
  const val = m[1].replace(/^[0-9\)\.\-\s]+/, '').trim();
  if (/negatywn|nikt|nie dotyczy|brak/i.test(val)) return null;
  return val.length > 2 ? val : null;
}

/** Unit area of a flat/premises in m². */
export function unitAreaFromText(text) {
  const m = /(?:lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr\s*\w+\s+)?o\s+pow\w*\.?|powierzchnia\s+u[żz]ytkowa|o\s+pow\w*\.?\s*u[żz]ytkowej)\s*([0-9]+(?:[,\.][0-9]+)?)\s*m\s*[2²]/i.exec(text);
  return m ? parseNum(m[1]) : null;
}

/** Land plot cadastral number and area. */
export function landPlotFromText(text) {
  let dzialka_nr = null;
  let area_m2 = null;

  // Parcel number: "działka nr 78/8" / "działki nr 523/3 i 523/4" / "działka nr 358/2"
  const dm = /dzia[łl]k[ai]?\s*(?:budowlan[ae])?\s*(?:nr\s*)?([0-9]+(?:\/[0-9]+)?(?:(?:\s+i\s+|\s*,\s*)[0-9]+(?:\/[0-9]+)?)*)/i.exec(text);
  if (dm) dzialka_nr = dm[1].trim();

  // Area in ha -> m²
  const haM = /o\s+pow\w*\.?\s*([0-9]+(?:[,\.][0-9]+)?)\s*ha/i.exec(text);
  if (haM) {
    const haVal = parseNum(haM[1]);
    if (haVal != null) area_m2 = Math.round(haVal * 10000);
  } else {
    // Area in m²
    const m2M = /o\s+pow\w*\.?\s*([0-9]+(?:[,\.][0-9]+)?)\s*m\s*[2²]/i.exec(text);
    if (m2M) area_m2 = parseNum(m2M[1]);
  }

  return { dzialka_nr, area_m2 };
}

/**
 * Extract raw address string from item text.
 * Returns e.g. "ul. Zamkowa 15/14", "ul. Drzymały 8/1".
 */
export function flatAddressRaw(text) {
  let street = null;
  let building = null;
  let apt = null;

  // First check if parcel 179/1
  if (/179\/1|OP1U\/00061267\/4/i.test(text) && !/ul\./i.test(text)) {
    street = 'Damrota';
    building = '15';
  } else {
    // Match street and building
    const sm = /(?:ul\.|u\.|ulicy)\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż.\s-]+?)[,\s-]+([0-9]+[a-zA-Z]?(?:\/[0-9]+)?|[lI])(?=[,\s-]+(?:ark|dzia[łl]k|lokal|KW|o\s+pow|\.|-|$))/iu.exec(text);
    if (sm) {
      street = sm[1].trim().replace(/^ul\.\s*/i, '');
      building = sm[2].trim().replace(/^[lI]$/, '1');
    } else {
      const sm2 = /(?:ul\.|u\.|ulicy)\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż.\s-]+?)[,\s-]+(\d+[a-zA-Z]?(?:\/\d+)?)/iu.exec(text);
      if (sm2) {
        street = sm2[1].trim().replace(/^ul\.\s*/i, '');
        building = sm2[2].trim();
      }
    }
  }

  // Match flat unit number: "lokal mieszkalny nr 14", "lokal nr 1", "lokal mieszkalny nr l"
  const am = /lokal\w*\s+(?:mieszkaln\w*\s+)?(?:nr\s*)?([0-9lI]+)/i.exec(text);
  if (am) {
    apt = am[1].replace(/^[lI]$/, '1');
  }

  if (!street || !building) return null;
  if (building.includes('/')) return `ul. ${street} ${building}`;
  return apt ? `ul. ${street} ${building}/${apt}` : `ul. ${street} ${building}`;
}

/** Classify item into asset class. */
export function kindFromText(text) {
  if (/lokal\w*\s+mieszkaln|lokalu\s+mieszkaln|mieszkanie/i.test(text)) return 'mieszkalny';
  if (/lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)|budyn\w*\s+niemieszkaln/i.test(text)) return 'uzytkowy';
  if (/budynek\s+mieszkaln|budynkiem\s+mieszkaln/i.test(text)) return 'zabudowana';
  if (/w\s+udziale/i.test(text) && /(?:ul\.|u\.|ulicy)\s*[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]/i.test(text)) return 'mieszkalny';
  if (/zabudowan/i.test(text)) return 'zabudowana';
  if (/dzia[łl]k|grunt|niezabudowan/i.test(text) && !/lokal/i.test(text)) return 'grunt';
  return classifyKind(text);
}

// ------------------------------------------------------------- Section Parsing

/**
 * Split an announcement document into individual item blocks with associated round numbers.
 */
function splitAnnouncementItems(fullText) {
  // Cut off administrative footer after "Przetarg odbędzie się"
  const cutoffIdx = fullText.search(/Przetarg\s+odb[ęe]dzie\s+si[ęe]/i);
  const itemsSection = cutoffIdx > 0 ? fullText.slice(0, cutoffIdx) : fullText;

  const roundRe = /(?:^|\n)\s*([IVX]+|\b(?:pierwszy|drugi|trzeci|czwarty|pi[ąa]ty|sz[óo]sty)\b)\s+przetarg\s+ustny\s+(?:nieograniczony|ograniczony)/gi;
  const roundMatches = [...itemsSection.matchAll(roundRe)];

  const itemRe = /(?:^|\n)\s*([0-9lI])\s*[\.\)]\s+([A-Z\p{L}][^\n]{0,60})/giu;
  const itemMatches = [...itemsSection.matchAll(itemRe)];

  if (itemMatches.length === 0) {
    // If no numbered items, treat entire items section as 1 item
    return [{ text: itemsSection, round: roundFromText(fullText) }];
  }

  const items = [];
  for (let i = 0; i < itemMatches.length; i++) {
    const start = itemMatches[i].index;
    const end = i + 1 < itemMatches.length ? itemMatches[i + 1].index : itemsSection.length;
    const blockText = itemsSection.slice(start, end).trim();

    // Determine round from the last round heading preceding this item
    const precedingRounds = roundMatches.filter((r) => r.index < start);
    let round = 1;
    if (precedingRounds.length > 0) {
      const rStr = precedingRounds[precedingRounds.length - 1][1];
      round = ROMAN_ROUNDS[rStr.toUpperCase()] || 1;
    } else {
      round = roundFromText(fullText);
    }

    items.push({ text: blockText, round });
  }

  return items;
}

/**
 * Split a result document into individual item blocks with associated round numbers.
 */
function splitResultItems(fullText) {
  const roundRe = /(?:^|\n)\s*([IVX]+|\b(?:pierwszy|drugi|trzeci|czwarty|pi[ąa]ty|sz[óo]sty)\b)\s+przetarg\s+ustny\s+(?:nieograniczony|ograniczony)/gi;
  const roundMatches = [...fullText.matchAll(roundRe)];

  const itemRe = /(?:^|\n)\s*([0-9lI])\s*[\.\)]\s*Oznaczenie\s+nieruchomo[^\n]*/gi;
  const itemMatches = [...fullText.matchAll(itemRe)];

  if (itemMatches.length === 0) {
    return [{ text: fullText, round: roundFromText(fullText) }];
  }

  const items = [];
  for (let i = 0; i < itemMatches.length; i++) {
    const start = itemMatches[i].index;
    const end = i + 1 < itemMatches.length ? itemMatches[i + 1].index : fullText.length;
    const blockText = fullText.slice(start, end).trim();

    const precedingRounds = roundMatches.filter((r) => r.index < start);
    let round = 1;
    if (precedingRounds.length > 0) {
      const rStr = precedingRounds[precedingRounds.length - 1][1];
      round = ROMAN_ROUNDS[rStr.toUpperCase()] || 1;
    } else {
      round = roundFromText(fullText);
    }

    items.push({ text: blockText, round });
  }

  return items;
}

// ------------------------------------------------------------- Announcement Parse

/**
 * Parse one ANNOUNCEMENT document into 0..N records.
 * Returns array of active/pending property or land records.
 */
export function parseAnnouncement(text, metadata = {}) {
  const t = whole(text);
  if (!t || !isSaleAuction(t) || isLease(t) || isCancellation(t)) return [];

  const auction_date = auctionDateFromText(t) || metadata.publishDate || null;
  const source_url = metadata.source_url || null;
  const detail_url = metadata.detail_url || source_url;

  const items = splitAnnouncementItems(t);
  const records = [];

  for (const item of items) {
    const kind = kindFromText(item.text);
    const starting_price_pln = startingPriceFromText(item.text);

    if (kind === 'grunt') {
      const plot = landPlotFromText(item.text);
      if (!plot.dzialka_nr && plot.area_m2 == null) continue;
      records.push({
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw: null,
        starting_price_pln,
        auction_date,
        round: item.round,
        source_url,
        detail_url,
      });
      continue;
    }

    const address_raw = flatAddressRaw(item.text);
    const address = address_raw ? parseAddress(address_raw) : null;
    const plot = landPlotFromText(item.text);

    if (!address && !plot.dzialka_nr && plot.area_m2 == null) continue;

    const rec = {
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: address_raw || null,
      address: address || null,
      dzialka_nr: plot.dzialka_nr || null,
      area_m2: unitAreaFromText(item.text) || plot.area_m2 || null,
      starting_price_pln,
      auction_date,
      round: item.round,
      source_url,
      detail_url,
    };
    if (address?.warning) rec.notes = [address.warning];
    records.push(rec);
  }

  return records;
}

// ------------------------------------------------------------- Result Parse

/**
 * Parse one CONCLUDED result document into 0..N result records.
 */
export function parseResultDoc(textOrRef, fallbackDate, sourceUrl) {
  let text = '';
  let fallback = fallbackDate;
  let url = sourceUrl;

  if (typeof textOrRef === 'object' && textOrRef !== null) {
    text = textOrRef.text || '';
    fallback = fallbackDate || textOrRef.auction_date;
    url = sourceUrl || textOrRef.pdf_url || textOrRef.source_url;
  } else {
    text = textOrRef || '';
  }

  const t = whole(text);
  if (!t || !isResultDoc(t) || isLease(t)) return [];

  const docAuctionDate = auctionDateFromText(t) || fallback || null;
  const items = splitResultItems(t);
  const records = [];

  for (const item of items) {
    const kind = kindFromText(item.text);
    const starting_price_pln = startingPriceFromText(item.text);
    const achieved = achievedPriceFromText(item.text);
    const buyer = buyerName(item.text);
    const buyerNamed = Boolean(buyer);
    const negativeStated = /negatywn|nikt|nie przyst[ąa]pi[łl]/i.test(item.text);

    const notes = [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (buyerNamed && achieved == null) notes.push('parse: buyer named but achieved price not found');
    if (!buyerNamed && !negativeStated) notes.push('parse: no buyer and no explicit negative outcome');

    if (kind === 'grunt') {
      const plot = landPlotFromText(item.text);
      if (!plot.dzialka_nr && plot.area_m2 == null) continue;
      records.push({
        auction_date: docAuctionDate,
        source_url: url,
        source_pdf: url,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw: null,
        round: item.round,
        starting_price_pln,
        final_price_pln: buyerNamed ? achieved : null,
        outcome: buyerNamed ? 'sold' : 'unsold',
        unsold_reason: buyerNamed ? null : (negativeStated ? 'no_bids' : 'unknown'),
        buyer: buyerNamed ? buyer : null,
        notes,
      });
      continue;
    }

    const address_raw = flatAddressRaw(item.text);
    const address = address_raw ? parseAddress(address_raw) : null;
    const plot = landPlotFromText(item.text);

    if (!address && !plot.dzialka_nr && plot.area_m2 == null) continue;
    if (address?.warning) notes.push(address.warning);

    records.push({
      auction_date: docAuctionDate,
      source_url: url,
      source_pdf: url,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: address_raw || null,
      address: address || null,
      dzialka_nr: plot.dzialka_nr || null,
      round: item.round,
      starting_price_pln,
      final_price_pln: buyerNamed ? achieved : null,
      outcome: buyerNamed ? 'sold' : 'unsold',
      unsold_reason: buyerNamed ? null : (negativeStated ? 'no_bids' : 'unknown'),
      buyer: buyerNamed ? buyer : null,
      area_m2: unitAreaFromText(item.text) || plot.area_m2 || null,
      notes,
    });
  }

  return records;
}
