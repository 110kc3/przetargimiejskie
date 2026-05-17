// Parses OCR text of a single result PDF into structured records.
//
// The PDFs have two sections — "INFORMACJA O WYNIKU..." (auctions that ran)
// and "INFORMACJA O WYNIKACH POSTĘPOWAŃ..." (auctions that didn't because no
// bidder, bidder withdrew, or bidder didn't show). See SPIKE.md for samples.

import { parseAddress } from './normalize.js';

/**
 * @typedef {'sold'|'unsold'|'no_winner'} ResultOutcome
 * @typedef {'no_deposits'|'bidder_withdrew'|'bidder_noshow'|'unknown'} UnsoldReason
 *
 * @typedef {object} ParsedAuctionRecord
 * @property {string} auction_date         ISO YYYY-MM-DD
 * @property {string} source_pdf
 * @property {'mieszkalny'|'uzytkowy'|'garaz'|'unknown'} kind
 * @property {string} address_raw
 * @property {ReturnType<typeof parseAddress>|null} address
 * @property {number|null} round           Roman numeral I/II/III/... as integer
 * @property {number|null} starting_price_pln
 * @property {number|null} final_price_pln
 * @property {ResultOutcome} outcome
 * @property {UnsoldReason|null} unsold_reason
 * @property {string[]} notes              parser warnings worth surfacing
 */

const ROMAN = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };

/** Strip OCR-corrupted whitespace/noise and split into the two sections. */
function splitSections(rawText) {
  const text = rawText.replace(/\r/g, '');
  // The unsold section starts with "INFORMACJA O WYNIKACH POSTĘPOWAŃ" (note ń at the end).
  // The sold section uses "INFORMACJA O WYNIKU POSTĘPOWANIA" or "WYNIKACH POSTĘPOWANIA"
  // (singular vs plural depending on how many auctions ran). To disambiguate we anchor
  // on the *unsold* header literally and split on it.
  const unsoldRe = /INFORMACJA\s+O\s+(?:WYNIKACH\s+POST[ĘE]POWA[ŃN]\s+DOTYCZ[ĄA]CYCH|WYNIKU\s+POST[ĘE]POWANIA\s+DOTYCZ[ĄA]CEGO)/i;
  const m = unsoldRe.exec(text);
  if (m) {
    return {
      sold: text.slice(0, m.index),
      unsold: text.slice(m.index),
    };
  }
  // No unsold section in this PDF.
  return { sold: text, unsold: '' };
}

const KIND_RE = /\b(mieszkaln\w*|u[żz]ytkow\w*|gara[żz]\w*)/i;
/** @param {string} s @returns {ParsedAuctionRecord['kind']} */
function classifyKind(s) {
  const m = KIND_RE.exec(s);
  if (!m) return 'unknown';
  const w = m[1].toLowerCase();
  if (w.startsWith('mieszkal')) return 'mieszkalny';
  if (w.startsWith('uzyt') || w.startsWith('użyt')) return 'uzytkowy';
  if (w.startsWith('gara')) return 'garaz';
  return 'unknown';
}

/** "253.620,00" -> 253620 (PLN), tolerates ':' for '.'. */
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = numStr.replace(/[:;]/g, '.').replace(/\s+/g, '');
  // expect "DDD.DDD,DD" with optional ",DD"
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.](\d{2}))?$/.exec(cleaned);
  if (!m) {
    // fallback: strip thousand separators, take int part
    const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
    const n = Number(fallback);
    return Number.isFinite(n) ? n : null;
  }
  const intPart = m[1].replace(/[.,]/g, '');
  return Number(intPart);
}

const PRICE_LINE_START =
  /Cena\s+wywoławcza[^0-9]+([\d.,:;\s]+)\s*z[łl]/i;
const PRICE_LINE_FINAL =
  /Cena[^.]*?(?:osi[ąa]gni[ęe]ta|uzyskan\w*)[^0-9]+([\d.,:;\s]+)\s*z[łl]/i;

const ROUND_RE = /\b(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s+ustny\s+przetarg/i;

const ADDR_FROM_SOLD =
  /przy\s+ul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃa-zżźćłśąęóń.\- ]+?\s+\d+[A-Za-z]?(?:\s*[\/\\]\s*\d+[A-Za-z]?)?)/;

const PARA_SPLIT_SOLD =
  /\n(?=\s*(?:w\s+dniu|o\s+godz\.?|w\s+dniu\.?)\s+)/i;

/**
 * Parse the "sold" section into one record per auction paragraph.
 * @param {string} sold
 * @param {string} auctionDate
 * @param {string} sourcePdf
 * @returns {ParsedAuctionRecord[]}
 */
function parseSoldSection(sold, auctionDate, sourcePdf) {
  if (!sold) return [];
  // Each auction starts on its own line beginning "w dniu DD.MM.YYYY r. odbył się"
  // or "o godz. HH.MM odbył się" (older format).
  const paras = sold.split(PARA_SPLIT_SOLD);
  const out = [];
  for (const para of paras) {
    if (!/odby[łl]\s+si[ęe]/.test(para)) continue;
    const kind = classifyKind(para);
    const addrM = ADDR_FROM_SOLD.exec(para);
    const addressRaw = addrM ? addrM[1].trim().replace(/\s+/g, ' ') : '';
    const address = addressRaw ? parseAddress(addressRaw) : null;
    const startM = PRICE_LINE_START.exec(para);
    const finalM = PRICE_LINE_FINAL.exec(para);
    const startingPrice = startM ? parsePLN(startM[1].trim()) : null;
    const finalPrice = finalM ? parsePLN(finalM[1].trim()) : null;
    const roundM = ROUND_RE.exec(para);
    const round = roundM ? ROMAN[roundM[1].toUpperCase()] ?? null : null;
    /** @type {ResultOutcome} */
    let outcome = 'sold';
    /** @type {UnsoldReason|null} */
    let unsoldReason = null;
    if (!finalPrice) {
      // Paragraph in sold section but no final price -> no winner emerged
      outcome = 'no_winner';
    }
    const notes = [];
    if (!addressRaw) notes.push('parse: missing address');
    if (startingPrice === null) notes.push('parse: missing starting price');
    if (address?.warning) notes.push(address.warning);
    out.push({
      auction_date: auctionDate,
      source_pdf: sourcePdf,
      kind,
      address_raw: addressRaw,
      address,
      round,
      starting_price_pln: startingPrice,
      final_price_pln: finalPrice,
      outcome,
      unsold_reason: unsoldReason,
      notes,
    });
  }
  return out;
}

const UNSOLD_ITEM_RE =
  /\bul\.\s+([^\n]+?)\s+-\s+sprzeda[żz]\s+([^\n]+?)(?=\n|$)/g;

/**
 * Parse the "unsold" section. Each item is "ul. <addr> - sprzedaż <kind>..."
 * Possibly followed by a closing reason paragraph; the reason can apply to
 * the immediately preceding item OR cover several items at once. We bucket
 * items until the next reason paragraph appears and apply it backwards.
 *
 * @param {string} unsold
 * @param {string} auctionDate
 * @param {string} sourcePdf
 * @returns {ParsedAuctionRecord[]}
 */
function parseUnsoldSection(unsold, auctionDate, sourcePdf) {
  if (!unsold) return [];
  const records = [];
  // Walk the text top-down, tracking the last reason seen and the items it covers.
  // Simpler approach: split into blocks separated by the Komisja-stwierdziła paragraphs.
  const reasonRe =
    /Komisja\s+przetargowa\s+stwierdzi[łl]a[\s\S]+?(?=\n\s*ul\.|\n\s*$|$)/gi;
  let cursor = 0;
  let bucket = [];
  let m;
  while ((m = reasonRe.exec(unsold)) !== null) {
    const before = unsold.slice(cursor, m.index);
    const reason = classifyUnsoldReason(m[0]);
    const items = extractUnsoldItems(before, auctionDate, sourcePdf, reason);
    records.push(...items);
    cursor = m.index + m[0].length;
  }
  // Any trailing items with no reason paragraph -> unknown reason
  const tail = unsold.slice(cursor);
  records.push(...extractUnsoldItems(tail, auctionDate, sourcePdf, 'unknown'));
  return records;
}

/** @param {string} reasonPara @returns {UnsoldReason} */
function classifyUnsoldReason(reasonPara) {
  const p = reasonPara.toLowerCase();
  if (/odst[ąa]pi[łl]/.test(p)) return 'bidder_withdrew';
  if (/nie\s+stawi[łl]\s+si[ęe]/.test(p)) return 'bidder_noshow';
  if (/nie\s+odnotowano\s+wp[łl]at/.test(p)) return 'no_deposits';
  if (/brak\s+ofert/.test(p)) return 'no_deposits';
  return 'unknown';
}

/** @returns {ParsedAuctionRecord[]} */
function extractUnsoldItems(chunk, auctionDate, sourcePdf, reason) {
  const items = [];
  UNSOLD_ITEM_RE.lastIndex = 0;
  let m;
  while ((m = UNSOLD_ITEM_RE.exec(chunk)) !== null) {
    const addressRaw = m[1].trim().replace(/\s+/g, ' ');
    const tail = m[2];
    const kind = classifyKind(tail);
    // For garages the addr is "Kurpiowska 16" and the description is "garażu nr 1"
    // We treat garaż-with-nr separately so the join key is street+building+null.
    const address = parseAddress(addressRaw);
    // Price line appears later in the surrounding text — search a window after the match
    const after = chunk.slice(m.index, m.index + 600);
    const priceM = PRICE_LINE_START.exec(after);
    const startingPrice = priceM ? parsePLN(priceM[1].trim()) : null;
    const notes = [];
    if (!address) notes.push('parse: address unparsed: ' + addressRaw);
    if (startingPrice === null) notes.push('parse: missing starting price');
    if (address?.warning) notes.push(address.warning);
    items.push({
      auction_date: auctionDate,
      source_pdf: sourcePdf,
      kind,
      address_raw: addressRaw,
      address,
      round: null,
      starting_price_pln: startingPrice,
      final_price_pln: null,
      outcome: 'unsold',
      unsold_reason: reason,
      notes,
    });
  }
  return items;
}

/**
 * Parse one PDF's OCR text into records.
 * @param {string} ocrText
 * @param {string} auctionDate
 * @param {string} sourcePdf
 * @returns {ParsedAuctionRecord[]}
 */
export function parseResultPdf(ocrText, auctionDate, sourcePdf) {
  const { sold, unsold } = splitSections(ocrText);
  const soldRecs = parseSoldSection(sold, auctionDate, sourcePdf);
  const unsoldRecs = parseUnsoldSection(unsold, auctionDate, sourcePdf);
  return [...soldRecs, ...unsoldRecs];
}
