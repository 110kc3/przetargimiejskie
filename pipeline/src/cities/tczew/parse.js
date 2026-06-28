// Tczew parsers.
//
// parseResultDoc: extracts achieved-price outcome from the "wynik" result PDF.
//
// Result PDF text -- groundtruthed against LIVE fixture (2026-06-27):
//   URL: bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/871415/files/ogloszenie_o_wyniku_przetargu.pdf
//   Auction: I przetarg, Elzbiety 4/5, 2026-03-10, cena wywolawcza 150 000 zl, wynik negatywny
//
// pdftotext -layout output (actual), table rows (layout-aligned):
//   Polozenie lokalu       Tczew, ul. Elzbiety 4/5
//   pow. lokalu -          33,09 m2
//   pow. piwnicy -          7,41 m2
//   Cena wywolawcza        150.000,00 zl
//   Najwyzsza cena...      ---          (unsold) | 175.000,00 zl (sold)
//   Imie, nazwisko...      Nie wplynelo wadium, przetarg zakonczyl sie wynikiem negatywnym
//
// VALIDATE: only the unsold fixture has been live-confirmed (wynik negatywny).
// The sold-outcome price regex follows the same table pattern.

import { parseAddress } from '../../core/normalize.js';

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

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Auction date from result PDF.
 * Avoids picking up legal-citation dates like "z dnia 14.09.2004 r. w sprawie".
 * @param {string} text
 * @returns {string|null} ISO date or null
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  // Header: "Tczew, dnia DD-MM-YYYY r."
  const headerM = /Tczew,\s*dnia\s+(\d{1,2})-(\d{1,2})-(\d{4})/i.exec(text);
  if (headerM) return iso(headerM[3], headerM[2], headerM[1]);
  // Body anchored on przetarg context (avoids legal citation dates)
  const bodyM =
    /(?:informuje|odby[lł]\s+si[eę])[\s\S]{0,50}dnia\s+(\d{1,2})-(\d{1,2})-(\d{4})/i.exec(text) ||
    /(?:informuje|odby[lł]\s+si[eę])[\s\S]{0,50}dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (bodyM) return iso(bodyM[3], bodyM[2], bodyM[1]);
  // Spelled-out month anchored on auction context
  const wordM = /(?:informuje|odby[lł]\s+si[eę])[\s\S]{0,50}dnia\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mon = PL_MONTHS[wordM[2].toLowerCase()];
    if (mon) return iso(wordM[3], mon, wordM[1]);
  }
  return null;
}

/**
 * Address from table row "Polozenie lokalu  Tczew, ul. <Street> <Bldg>/<Apt>"
 * The pdftotext -layout output uses wide whitespace between label and value.
 * Handles Polish "Polozenie" with or without diacritics.
 * @param {string} text
 * @returns {import('../../core/normalize.js').ParsedAddress|null}
 */
export function addressFromResultText(text) {
  if (!text) return null;
  // Match label "Polozenie lokalu" (with or without diacritics) then value
  const m = /Po[lł]o[zż]enie\s+lokalu[\s\S]{0,100}Tczew,\s*(?:ul\.|os\.|al\.|pl\.)?\s*([A-ZŁŚĆĘĄÓŹŻ][^\n\r]+)/i.exec(text);
  if (!m) return null;
  const raw = m[1].trim().replace(/\s+/g, ' ');
  return parseAddress(raw);
}

/**
 * Starting price from "Cena wywolawcza   150.000,00 zl"
 * @param {string} text
 * @returns {number|null}
 */
export function startingPriceFromText(text) {
  if (!text) return null;
  // "Cena wywoławcza" = "Cena wywoławcza"
  const m = /Cena\s+wywo[lł]awcza[\s\S]{0,100}?([\d][\d .,]*)(?:,\d{2})?\s*z[lł]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Flat usable area from "pow. lokalu - NN,NN m2"
 * (NOT the cellar "pow. piwnicy" which follows on the next line)
 * @param {string} text
 * @returns {number|null}
 */
export function areaFromText(text) {
  if (!text) return null;
  // "pow. lokalu - 33,09 m2"
  const labM = /pow(?:ierzchnia)?\.\s+lokalu\s*-\s*([\d.,]+)\s*m2/i.exec(text);
  if (labM) return parseArea(labM[1]);
  // "Powierzchnia lokalu ... NN,NN m2"
  const altM = /Powierzchnia\s+lokalu[\s\S]{0,80}?([\d.,]+)\s*m\s*2/i.exec(text);
  if (altM) return parseArea(altM[1]);
  return null;
}

/**
 * Achieved price from "Najwyzsza cena osiagnieta ... NN.NNN,NN zl"
 * Returns null for "---" (unsold).
 * @param {string} text
 * @returns {number|null}
 */
export function finalPriceFromText(text) {
  if (!text) return null;
  // "Najwyższa" = "Najwyzsza/Najwyższa", "osiągnięta" = "osiagnieta/osiągnięta"
  const m = /Najwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta[\s\S]{0,120}?([\d][\d .,]*)(?:,\d{2})?\s*z[lł]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Round from result PDF body text.
 * "odbyl sie pierwszy przetarg" / "I przetarg nieograniczony"
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  if (!text) return null;
  // Roman numeral: "I przetarg", "II przetarg"
  const roman = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(text);
  if (roman) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
    const val = ROMAN[roman[1].toLowerCase()];
    if (val) return val;
  }
  const t = text.toLowerCase();
  if (/\bpierwszy/.test(t)) return 1;
  if (/\bdrugi/.test(t)) return 2;
  if (/\btrzeci/.test(t)) return 3;
  if (/\bczwarty/.test(t)) return 4;
  if (/\bpi[aą]ty/.test(t)) return 5;
  return null;
}

// ---- main result parser -----------------------------------------------------

const RESULT_GUARD_RE = /(?:wynik|przetarg|Prezydent\s+Miasta\s+Tczewa)/i;

/**
 * Parse one result PDF pdftotext output into a result record.
 * @param {string} text    pdftotext -layout output
 * @param {string|null} fallbackDate  publication date from detail page (ISO)
 * @param {string} sourceUrl  original PDF URL
 * @returns {Array} 0 or 1 result records
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !RESULT_GUARD_RE.test(text)) return [];

  const auctionDate = auctionDateFromText(text) || fallbackDate || null;
  const address = addressFromResultText(text);
  if (!address) return [];

  const startingPrice = startingPriceFromText(text);
  const areaMqm = areaFromText(text);
  const round = roundFromText(text);

  // "wynik\u* negatywn" = "wynik negatywny/wynikiem negatywnym"
  // "Nie wpłynęło wadium" = "Nie wplynelo wadium"
  const negative =
    /wynik\w*\s+negatywn/i.test(text) ||
    /Nie\s+wp[lł]yn[eę][lł]o\s+wadium/i.test(text) ||
    /brak\s+ofert/i.test(text) ||
    /przetarg\s+zako[nń]czy[lł]\s+si[eę]\s+wynikiem\s+negatywnym/i.test(text);

  let outcome, finalPrice, unsoldReason;
  if (negative) {
    outcome = 'unsold';
    finalPrice = null;
    unsoldReason = 'no_buyer';
  } else {
    finalPrice = finalPriceFromText(text);
    outcome = finalPrice != null ? 'sold' : 'unsold';
    unsoldReason = outcome === 'unsold' ? 'no_buyer' : null;
  }

  return [{
    address,
    kind: 'mieszkalny',
    auction_date: auctionDate,
    round,
    area_m2: areaMqm,
    starting_price_pln: startingPrice,
    outcome,
    unsold_reason: unsoldReason,
    final_price_pln: finalPrice,
    source_pdf: sourceUrl,
    notes: null,
  }];
}
