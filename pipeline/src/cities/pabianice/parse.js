// Pabianice parsers.
//
// parseResultDoc() is the one parser called by refresh.js. It receives the
// pdftotext -layout output of a "Rozstrzygnięcie przetargu" PDF attachment.
//
// Active-listing metadata (address, starting price, auction date) comes from
// the inline HTML table on the list/detail page — no announcement-PDF parser
// is needed here; crawl.js reads those fields directly.
//
// Pabianice result-PDF format (standard Logonet BIP 2.9.0 boilerplate):
//
//   INFORMACJA O WYNIKU PRZETARGU
//   Data i miejsce przetargu: 22 maja 2026 r., sala konferencyjna ...
//   Przedmiot przetargu: lokal mieszkalny nr 7 przy ul. Pomorskiej 20 w Pabianicach
//   Cena wywoławcza: 53 000,00 zł
//   Najwyższa cena osiągnięta w przetargu: 55 000,00 zł
//   Nabywca: Jan Kowalski ...
//
// VALIDATE against real pdftotext output of attachments/download/43139 on first CI run.

import { parseAddress } from '../../core/normalize.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "53 000,00 zł" / "55.000,00" / "55000" -> integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s ]/g, '').replace(/\./g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "37,70" / "37.70" -> number (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- type gate

export function isResultNotice(text) {
  // Matches "Informacja o wyniku przetargu" AND
  // "Informacja o wyniku drugiego/trzeciego/... przetargu"
  return /informacj\w*\s+o\s+wyniku\s+(?:\w+\s+)?przetarg/i.test(text || '');
}

// ----------------------------------------------------------------- round

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4,
};

export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(text || '');
  if (!m) return null;
  return ROUND_WORDS[m[1].toLowerCase()] ?? null;
}

// ----------------------------------------------------------------- dates

export function resultDateFromText(text) {
  const t = text || '';
  const forms = [
    /Data\s+(?:i\s+miejsce\s+)?przetargu\s*:\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i,
    /dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\./i,
    /Data\s+(?:i\s+miejsce\s+)?przetargu[^0-9]*(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
  ];
  for (const re of forms) {
    const m = re.exec(t);
    if (m) {
      if (isNaN(Number(m[2]))) {
        const mo = PL_MONTH[m[2].toLowerCase()];
        if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
      } else {
        return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------- prices

export function startingPriceFromText(text) {
  const t = text || '';
  const m = /cena\s+wywo[łl]awcza[\s\S]{0,80}?(\d[\d\s .,]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  const m = /(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*(\d[\d\s .,]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- address

// The result notice states the property in a line like:
//   "Przedmiot przetargu: lokal mieszkalny nr 7 przy ul. Pomorskiej 20 w Pabianicach"
// or in the header sentence:
//   "... na sprzedaz lokalu mieszkalnego nr 7 przy ul. Pomorskiej 20 ..."
//
// Compound units (e.g. "nr 64/65") key on the first number as apt because
// parseAddress cannot handle triple-slash "ul. X 3/64/65".

export function addressRawFromResultText(text) {
  const t = text || '';
  // "Przedmiot przetargu: ..." line carries the most reliable address.
  const prefM = /Przedmiot\s+przetargu\s*:\s*([^\n]{5,120})/i.exec(t);
  const source = prefM ? prefM[1] : t;

  // Unit number: "nr 7" / "nr 64/65"
  const unitRawM = /\bnr\s+(\d+(?:\/\d+)?[A-Za-z]?)/i.exec(source);
  let unitNo = null;
  if (unitRawM) {
    const compound = /^(\d+)\/(\d+)$/.exec(unitRawM[1]);
    unitNo = compound ? compound[1] : unitRawM[1];
  }

  // Street + building after "przy ul."
  const streetM = /przy\s+(?:ul|al|os|pl)\.?\s+(.+)/i.exec(source);
  if (!streetM) return null;

  // Strip trailing city name (" w Pabianicach"), clause openers, newlines.
  const streetFull = streetM[1]
    .replace(/[,\n].*$/, '')
    .replace(/\s+wraz\b.*$/i, '')
    .replace(/\s+w\s+[A-ZŻŹĆŁŚĄĘÓŃ]\w+\b.*$/i, '')
    .trim();

  // Building number = last numeric token.
  const bldgM = /^(.+?)\s+(\d+[A-Za-z]?)\s*$/.exec(streetFull);
  if (!bldgM) return null;

  const streetName = bldgM[1].trim();
  const building = bldgM[2];

  return unitNo
    ? `ul. ${streetName} ${building}/${unitNo}`
    : `ul. ${streetName} ${building}`;
}

// ----------------------------------------------------------------- area

export function unitAreaFromText(text) {
  const m = /powierzchni\w*\s+u[żz]ytkow\w*\s+([\d.,]+)\s*m\s*[²2](?!\d)/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// ----------------------------------------------------------------- result parse

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  const sold = achieved != null;
  const negativeStated =
    /wynikiem\s+negatywnym/i.test(t) ||
    /brak\s+(?:uczestnik|ofert|wp[łl]at\s+wadi)/i.test(t) ||
    /nie\s+(?:odnotowano\s+wp[łl]at|wp[łl]yn[ęe][łl]o|przyst[ąa]pi[łl])/i.test(t);

  const address_raw = addressRawFromResultText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    },
  ];
}
