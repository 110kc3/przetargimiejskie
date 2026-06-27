// Nysa parsers -- announcement PDFs and result notice PDFs from bip.nysa.pl.
//
// ANNOUNCEMENT PDF (real fixture: Moniuszki 1/27, id=22892, verified 2026-06-27):
//   "przy ul. Moniuszki 1/27"  -- address with apt embedded
//   "Lokal mieszkalny nr 27 o lacznej powierzchni uzytkowej 33,10 m2"
//   "Cena wywolawcza nieruchomosci wynosi: 145.000,00 zl"  (dot-thousands)
//   "Przetarg odbedzie sie w dniu 17 grudnia 2024 r."
//
// RESULT PDF (real fixture: id=23554, verified 2026-06-27):
//   pdftotext -layout table -- two PLN amounts on same data row:
//   "145.000,00 zl       165.000,00 zl"
//   Column header "Cena osiagnieta w / przetargu" is split across two lines
//   and far from the data values; cannot anchor on it to find the price.
//
// Mariackiej 21/3 (id=29480 ann + id=30096 result, verified 2026-06-27):
//   "przy ul. Mariackiej nr 21/3"  -- optional "nr" before bldg/apt stripped

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// All PLN amounts in text in order. Supports dot-thousands and space-thousands.
function allPLNAmounts(text) {
  const re = /((?:\d{1,3}[. ])*\d{1,3},\d{2})\s*z[lł]/gi;
  const results = [];
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const v = parsePLN(m[1]);
    if (v != null) results.push(v);
  }
  return results;
}

// Normalize Polish diacritics for month lookup
function normalizePL(s) {
  return s.toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ż/g, 'z').replace(/ź/g, 'z')
    .replace(/ć/g, 'c').replace(/ł/g, 'l').replace(/ń/g, 'n');
}

// ----------------------------------------------------------------- round

export function roundFromText(text) {
  const t = text || '';
  // Strip history-list lines ("- I przetarg ... 27.11.2025 r.") so prior-round
  // references don't masquerade as the current round's ordinal.
  const cleaned = t.split('\n')
    .filter((line) => !/^\s*[-–]\s+\S+\s+przetarg/i.test(line))
    .join('\n');

  // Word ordinal: "drugi przetarg", "pierwszego przetargu"
  const mw = /\b(pierwsz|drug|trzeci|czwart|pi[aoą]t|sz[oóo]st|si[oó]dm|[oó]sm|dziewi[aoą]t)\w*\s+przetarg/i.exec(cleaned);
  if (mw) {
    const stem = normalizePL(mw[1]);
    const map = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5, szost: 6, siodm: 7, osm: 8, dziewiat: 9 };
    for (const [key, val] of Object.entries(map)) {
      if (stem.startsWith(key)) return val;
    }
  }
  // Roman numeral prefix: "I przetarg", "II przetarg", etc.
  const mr = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg/i.exec(cleaned);
  if (mr) {
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    const v = roman[mr[1].toUpperCase()];
    if (v != null) return v;
  }
  return null;
}

// ----------------------------------------------------------------- dates

export function auctionDateFromText(text) {
  const t = text || '';
  let m = /odb[eę]dzie\s+si[eę]\s+w\s+dniu\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  if (!m) m = /odb[eę]dzie\s+si[eę]\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  if (!m) return null;
  const mo = PL_MONTH[normalizePL(m[2].replace(/[.,;r]+$/, ''))];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  const t = text || '';
  let m = /przeprowadzonego\s+w\s+dniu\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[normalizePL(m[2].replace(/[.,;r]+$/, ''))];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /(\d{1,2})-(\d{2})-(\d{4})\s*r\./.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
  return null;
}

// ----------------------------------------------------------------- address

// Header: "przy ul. Moniuszki 1/27" or "przy ul. Mariackiej nr 21/3"
// Optional "nr" before the building/apt number is stripped.
const HEADER_ADDR_RE =
  /przy\s+ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'' -]+?)\s+(?:nr\s+)?((?:\d+[A-Za-z]?\/)?\d+[A-Za-z]?)\s*[.,;\n]/i;

const UNIT_NO_BODY_RE = /Lokal\s+mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;

export function addressRawFromText(text) {
  const t = (text || '').replace(/\r/g, '');
  const hm = HEADER_ADDR_RE.exec(t);
  if (hm) {
    const street = hm[1].replace(/\s+/g, ' ').trim();
    const combined = hm[2];
    if (combined.includes('/')) return `ul. ${street} ${combined}`;
    const um = UNIT_NO_BODY_RE.exec(t);
    if (um) return `ul. ${street} ${combined}/${um[1]}`;
    return `ul. ${street} ${combined}`;
  }
  const um = UNIT_NO_BODY_RE.exec(t);
  const streetBodyRe =
    /Lokal\s+mieszkaln\w+\s+nr\s+\d+[A-Za-z]?[^.]*przy\s+ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'' -]+?)\s+(?:nr\s+)?(\d+[A-Za-z]?)\s*[.,\n]/i;
  const sm = streetBodyRe.exec(t);
  if (sm) {
    const street = sm[1].replace(/\s+/g, ' ').trim();
    if (um) return `ul. ${street} ${sm[2]}/${um[1]}`;
    return `ul. ${street} ${sm[2]}`;
  }
  return null;
}

// ----------------------------------------------------------------- area

// [\s\S]{0,200} bridges the pdftotext line-break between "powierzchni" and
// "uzytkowej" in fixed-width result-table columns.
export function unitAreaFromText(text) {
  const t = text || '';
  const re =
    /Lokal\s+mieszkaln\w+\s+(?:nr\s+\d+[A-Za-z]?\s+)?o\s+(?:\S+\s+)?powierzchni[\s\S]{0,200}?u[zż]ytkow\w+\s+([\d.,]+)\s*m[2²]/i;
  const m = re.exec(t);
  return m ? parseArea(m[1]) : null;
}

// ----------------------------------------------------------------- prices

export function startingPriceFromText(text) {
  const t = text || '';
  const ann = /wynosi\s*:?\s*((?:\d{1,3}[. ])*\d{1,3},\d{2})\s*z[lł]/i.exec(t);
  if (ann) return parsePLN(ann[1]);
  const amounts = allPLNAmounts(t);
  return amounts.length > 0 ? amounts[0] : null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  for (const line of t.split('\n')) {
    const amounts = allPLNAmounts(line);
    if (amounts.length >= 2) return amounts[1];
  }
  const amounts = allPLNAmounts(t);
  return amounts.length >= 2 ? amounts[1] : null;
}

// ----------------------------------------------------------------- result detector

export function isResultNotice(text) {
  return /Informacja\s+o\s+wyniku\s+przetargu/i.test(text || '');
}

// ----------------------------------------------------------------- title filters

export function isSkippableTitle(title) {
  const t = title || '';
  return (
    /\bnajem\b|dzier[zż]aw/i.test(t) ||
    /\bniezabudowan/i.test(t) ||
    /\bdzia[lł]k/i.test(t) ||
    /\bgruntow/i.test(t) ||
    /\bsprzeda[zż]\s+drewna\b/i.test(t) ||
    /\bsprzeda[zż][:\s]+(?:autobus|pojazd|samoch)/i.test(t) ||
    /\bzapytanie\s+ofertow/i.test(t) ||
    /\bnieruchomo[sś][cć]\s+gruntow/i.test(t) ||
    (/\bobr[eę]b\b/i.test(t) && !/lokal/i.test(t)) ||
    (/\bdz\.\s*nr\b/i.test(t) && !/lokal/i.test(t))
  );
}

export function isFlatSaleTitle(title) {
  return /lokal\s+mieszkaln/i.test(title || '');
}

// ----------------------------------------------------------------- announcement parse

export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  if (isResultNotice(t)) return null;

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const kindRaw = classifyKind(t.slice(0, 400));
  const kind = kindRaw === 'unknown' ? 'mieszkalny' : kindRaw;
  const area_m2 = unitAreaFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const auction_date = auctionDateFromText(t);
  const round = roundFromText(t);

  return { kind, address_raw, address, area_m2, starting_price_pln, auction_date, round };
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
    /wynik\w*\s+negatywn|nie\s+wy[lł]oniono|brak\s+(?:uczestnik|ofert)/i.test(t);

  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  const area_m2 = unitAreaFromText(t);
  const kind = 'mieszkalny';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2,
    notes,
  }];
}
