import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Shared helpers ─────────────────────────────────────────────────────────

const PL_MONTH = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04',
  maja: '05', czerwca: '06', lipca: '07', sierpnia: '08',
  'września': '09', wrzesnia: '09',
  'października': '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

// "39.000" / "39 000" / "215.000" → integer PLN
// Gorzów uses dot-thousands in announcements ("39.000") and spaces in results.
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s| /g, '').replace(/\.(?=\d{3}(?:[.,]|$))/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "19,43" / "19.43" → 19.43
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s| /g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Matches an address at the start of a trimmed line, followed by 2+ spaces or EOL.
// Handles both standalone ("Grobla 22/12") and inline layout ("Fabryczna 53/9   budynku…").
const ADDRESS_START_RE = /^([A-ZĄĘÓŚŻŹĆŁŃ][a-zA-ZĄĘÓŚŻŹĆŁŃąęóśżźćłń .''\-]+?\d+(?:\/\d+)?)(?:\s{2,}|$)/;

// Row-opener in announcement PDFs: "  N.  drugi …"
const ROW_START_RE = /^\s{0,10}(\d{1,2})\.\s+(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*/im;

// Lines to skip when parsing announcement text
const ANN_SKIP_RE =
  /^(terminy|po[łl]o[żz]enie|przeprowadzenia|lp\.\s+przetarg|poprzednich|ksi[ęe]ga|przetarg[óo]w|opis i prze|PREZYDENT|Miasta Gor|Og[łl]oszenie|Prezydenta|z dnia|Og[łl]aszam|stanowi|udzia[łl]|cena|wadium|nieruchomo[śs]ci,|numer [śs]wiad)/i;

// Dot-thousands price, excluding fraction denominators preceded by /
const DOT_PRICE_RE = /(?<!\/)\b(\d{2,3}\.\d{3})\b(?!\/\d)/g;

// Space-thousands price e.g. "162 000"
const SPC_PRICE_RE = /(?<![\d.])(\d{3})\s(\d{3})(?!\d)/g;

const AREA_RE = /lokal\w*\s+mieszkaln\w*\s+o\s+pow\.\s*([\d,]+)\s*m\s*[²2]/i;

/** First big dot-thousands price in text; falls back to space-thousands */
function firstBigPrice(text) {
  DOT_PRICE_RE.lastIndex = 0;
  const m = DOT_PRICE_RE.exec(text);
  if (m) return parsePLN(m[1]);
  SPC_PRICE_RE.lastIndex = 0;
  const m2 = SPC_PRICE_RE.exec(text);
  if (m2) return parsePLN(m2[1] + m2[2]);
  return null;
}

// ── Round ──────────────────────────────────────────────────────────────────

function stemToRound(s) {
  if (!s) return null;
  const n = s.toLowerCase().replace(/ą/g, 'a').replace(/ó/g, 'o');
  if (n.startsWith('pierwsz')) return 1;
  if (n.startsWith('drug')) return 2;
  if (n.startsWith('trzeci')) return 3;
  if (n.startsWith('czwart')) return 4;
  if (n.startsWith('piat') || n.startsWith('pi')) return 5;
  if (n.startsWith('szost') || n.startsWith('sz')) return 6;
  if (n.startsWith('siodm') || n.startsWith('si')) return 7;
  return null;
}

/**
 * Round number from Polish ordinal word preceding "przetarg".
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  if (!text) return null;
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm)\w*\s+przetarg/i.exec(text);
  if (!m) return null;
  return stemToRound(m[1]);
}

// ── Auction date (announcement body) ──────────────────────────────────────

/**
 * Batch auction date from announcement body.
 * Phrase: "Przetargi odbędą się 9 października 2025r."
 * @param {string} text
 * @returns {string|null} ISO date
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  const m =
    /(?:przetargi?\s+odb[ęe]d[ąa]\s+si[ęe]|przetarg\w*\s+odb[ęe]dzie\s+si[ęe])[^.]*?(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}`;
}

// ── Previous-round dates (announcement) ───────────────────────────────────

/**
 * Extract previous-round dates from the "terminy poprzednich przetargów" column.
 * "I – 21.08.2025r." → { round:1, date:'2025-08-21' }
 * @param {string} cell
 * @returns {Array<{round:number, date:string}>}
 */
export function prevRoundsFromCell(cell) {
  if (!cell) return [];
  const re = /([IVX]+)\s*[-–]\s*(\d{1,2})\.(\d{2})\.(\d{4})r?\.?/gi;
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  const out = [];
  let m;
  while ((m = re.exec(cell)) !== null) {
    const round = ROMAN[m[1].toUpperCase()] ?? null;
    if (round == null) continue;
    const date = `${m[4]}-${m[3]}-${String(m[2]).padStart(2, '0')}`;
    out.push({ round, date });
  }
  return out;
}

// ── Address from announcement table cell ──────────────────────────────────

/**
 * Extract street address from the "położenie" cell (first non-empty line).
 * @param {string} cell
 * @returns {string|null}
 */
export function addressFromPozycjaCell(cell) {
  if (!cell) return null;
  const lines = cell.split(/\n|\r|\s{2,}/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const raw = lines[0].replace(/^ul\.\s*/i, '').trim();
  return raw ? `ul. ${raw}` : null;
}

// ── Area from opis cell ───────────────────────────────────────────────────

export function areaFromOpis(opis) {
  if (!opis) return null;
  const m = AREA_RE.exec(opis);
  return m ? parseArea(m[1]) : null;
}

// ── Announcement parser ───────────────────────────────────────────────────
//
// pdftotext -layout renders the batch table as fixed-width columns.
// In Gorzów PDFs, the address line often appears BEFORE its row-number line because
// the address column is to the right of the round-ordinal column. Strategy:
//
//   Pass 1: Collect all address-line positions (ADDRESS_START_RE).
//   Pass 2: For each address, build a block spanning from it to the next address,
//           PLUS up to 5 pre-lines (stopping at a ROW_START or prior address)
//           to capture the area description which precedes the address in the layout.

/**
 * Parse a Gorzów batch announcement PDF into individual flat records.
 * @param {string} text  pdftotext -layout output
 * @param {{ pdfUrl?: string, detailUrl?: string, fallbackAuctionDate?: string }} [ctx]
 * @returns {Array<object>}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromText(t) || ctx.fallbackAuctionDate || null;

  const lines = t.split('\n');

  // Pass 1: find all address line positions
  const addrPositions = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l || ANN_SKIP_RE.test(l)) continue;
    if (/^GW\d/i.test(l) || /^SCHE\//i.test(l)) continue;
    const addrM = ADDRESS_START_RE.exec(l);
    if (addrM) addrPositions.push({ i, addr: addrM[1] });
  }

  const out = [];
  for (let bi = 0; bi < addrPositions.length; bi++) {
    const { i: addrI, addr } = addrPositions[bi];
    const nextAddrI =
      bi + 1 < addrPositions.length ? addrPositions[bi + 1].i : lines.length;

    // Pre-lines: scan backward from addrI-1, stop at ROW_START or another address
    const preLines = [];
    for (let j = addrI - 1; j >= Math.max(0, addrI - 5); j--) {
      const l = lines[j].trim();
      if (!l) continue;
      if (/^GW\d/i.test(l) || /^SCHE\//i.test(l)) continue;
      if (ANN_SKIP_RE.test(l)) break;
      if (ROW_START_RE.test(lines[j])) break;
      if (ADDRESS_START_RE.exec(l)) break;
      preLines.unshift(lines[j]);
    }

    const blockLines = [...preLines, ...lines.slice(addrI, nextAddrI)];
    const blockText = blockLines.join('\n');

    // Round: extracted directly from ROW_START ordinal word ("drugi" → 2)
    const rowStartM = ROW_START_RE.exec(blockText);
    const round = rowStartM ? stemToRound(rowStartM[2]) : (roundFromText(blockText) ?? null);

    const area_m2 = areaFromOpis(blockText);

    // Starting price: first dot-thousands number not part of a fraction (e.g. not "5.126/124.339")
    const starting_price_pln = firstBigPrice(blockText);

    const address_raw = `ul. ${addr.replace(/^ul\.\s*/i, '').trim()}`;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const kind = classifyKind(blockText.slice(0, 300)) || 'mieszkalny';

    out.push({
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    });
  }

  return out;
}

// ── Result PDF helpers ─────────────────────────────────────────────────────

/**
 * Guard: is this PDF text a Gorzów result notice?
 * @param {string} text
 * @returns {boolean}
 */
export function isResultNotice(text) {
  return /Informacja\s+o\s+wynik(?:u|ach)\s+przetarg/i.test(text || '');
}

/**
 * Auction date from result body text.
 * "przeprowadzonych dnia 5 lutego 2026 r." (plural) or
 * "przeprowadzonego dnia 12 września 2024r." (singular genitive)
 * @param {string} text
 * @returns {string|null} ISO date
 */
export function resultDateFromText(text) {
  if (!text) return null;
  const m = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}`;
}

/**
 * Starting price from a result row block.
 * Tries keyword match first; falls back to first big number.
 * @param {string} text
 * @returns {number|null}
 */
export function startingPriceFromResult(text) {
  if (!text) return null;
  const kw = /cena\s+(?:netto\s+)?wywo[łl]awcza[^0-9]{0,30}([\d][.\d\s]*)/i.exec(text);
  if (kw) return parsePLN(kw[1].trim().split(/\s/)[0]);
  return firstBigPrice(text);
}

/**
 * Achieved price from a result row block.
 * Tries keyword match first; falls back to second big dot-thousands number
 * (first = starting price, second = achieved price in the table layout).
 * @param {string} text
 * @returns {number|null}
 */
export function achievedPriceFromResult(text) {
  if (!text) return null;
  const kw =
    /osi[ąa]gni[ęe]ta\s+w\s+(?:przetargu|rokowaniach)[^\d]{0,50}([\d][.\d\s]*)/i.exec(text);
  if (kw) return parsePLN(kw[1].trim().split(/\s/)[0]);
  // Positional: second distinct dot-thousands price in the block
  DOT_PRICE_RE.lastIndex = 0;
  const prices = [];
  let m;
  while ((m = DOT_PRICE_RE.exec(text)) !== null) {
    const n = parsePLN(m[1]);
    if (n != null) prices.push(n);
  }
  if (prices.length >= 2) return prices[1];
  // If only one dot-thousands found, check for space-thousands as second
  SPC_PRICE_RE.lastIndex = 0;
  const spcPrices = [];
  while ((m = SPC_PRICE_RE.exec(text)) !== null) {
    const n = parsePLN(m[1] + m[2]);
    if (n != null) spcPrices.push(n);
  }
  if (prices.length === 1 && spcPrices.length >= 1) return spcPrices[0];
  return null;
}

/**
 * Detect "przetarg zakończył się wynikiem negatywnym" in a row block.
 * @param {string} text
 * @returns {boolean}
 */
export function isNegative(text) {
  return /wynikiem\s+negatywnym|przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(text || '');
}

// Boilerplate lines to skip in result PDFs
const RES_SKIP_RE =
  /^(lp\.|Informacja|Na podstawie|Przedmiotem|Wyniki\s+przetarg|opis i prze|nr i pow|w\s+cz[ęe][śs]ciach|udzia[łl]|przetargu|Gorzów|Kierownik|Dyrektor|Referatu|Obrotu|Wioleta|podpisano|Potwierdzam|Identyfikator|Nazwa|Tytu[łl]|Sygnatura|Data|Skr[óo]t|Wersja|Rodzaj|Autor|EZD|zbycie)/i;

/**
 * Parse a Gorzów result PDF into concluded auction records (one per flat).
 *
 * @param {string} text           pdftotext -layout output
 * @param {string|null} fallbackDate  ISO date (from crawl ref, used if body has no date)
 * @param {string} sourceUrl      PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const auction_date = resultDateFromText(t) || fallbackDate || null;

  const lines = t.split('\n');
  const rowBlocks = [];
  let current = null;

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (RES_SKIP_RE.test(l)) continue;
    if (/^\d{4}-\d{2}-\d{2}/.test(l)) continue;
    if (/\[zł\]|\[m2\]|\[\s*\]|łącznie|wspólnych|wieczysta|dopuszczonych|budynku i gruncie/i.test(l)) continue;

    const addrM = ADDRESS_START_RE.exec(l);
    if (addrM) {
      if (current) rowBlocks.push(current);
      current = { addressLine: addrM[1].trim(), lines: [l] };
    } else if (current) {
      current.lines.push(l);
    }
  }
  if (current) rowBlocks.push(current);

  const out = [];
  for (const block of rowBlocks) {
    const blockText = block.lines.join('\n');
    const notes = [];

    const address_raw = `ul. ${block.addressLine.replace(/^ul\.\s*/i, '').trim()}`;
    const address = parseAddress(address_raw);
    if (!address) {
      notes.push(`parse: could not parse address from '${address_raw}'`);
      continue;
    }
    if (address.warning) notes.push(address.warning);

    const kind = classifyKind(blockText.slice(0, 400));
    const area_m2 = areaFromOpis(blockText);
    const starting_price_pln = startingPriceFromResult(blockText);
    if (starting_price_pln == null) notes.push('parse: missing starting price');

    const final_price_pln = achievedPriceFromResult(blockText);
    const negative = isNegative(blockText);
    const sold = !negative && final_price_pln != null;

    if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

    out.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    });
  }

  return out;
}
