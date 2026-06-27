// Torun parsers.
// Polish diacritics used freely in comments and string values.
// Regex literals use only ASCII character classes (Node v22 compatibility).
//
// Two responsibilities:
//   1. parseXmlFeed  — BIP XML export (/przetargi-nieruchomosci/xml/1/{per_page})
//   2. parseResultDoc — DOCX result notices (one per concluded auction date)
//
// DOCX layout (groundtruthed 2026-06-27 on IDs 55913, 58022, 59378):
//   Table rows are extracted as tab-separated lines with embedded \n for
//   paragraph breaks inside cells. Each data record spans 2-3 lines:
//     e.g. "ul. Slusarska 5 \tNr 5A 23,87m2\t104/2 ob. 17"
//          "\t\tTO1T/...\t\tbrak\t175.000,00 zl\t-\t0/0\t"
//   Strategy: group consecutive lines into per-record blocks (new block starts
//   when line begins with a street address), flatten \n to \t within each block,
//   then anchor from the RIGHT using the X/Y count column.
//
//   Right-anchored layout:
//     count_idx - 2 = Cena wywolawcza  (starting price)
//     count_idx - 1 = Cena wylicytowana (achieved price or "-")
//     count_idx     = X/Y count
//     count_idx + 1+ = Nabywca (may absorb signature lines, that's OK)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// Polish month names (genitive).
const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Public XML helpers
// ---------------------------------------------------------------------------

/** "08     .09     .2026  godz. 10:00" -> "2026-09-08" */
export function parseDateField(raw) {
  if (!raw) return null;
  const s = raw.replace(/\s+/g, '');
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

/**
 * "140.000,00 zl; wadium 14.000,00 zl" -> 140000
 * "od 585.000,00 zl do 760.000,00 zl"  -> null  (range)
 * Handles both ASCII "zl" and real Unicode zl character (U+0142).
 */
export function parsePriceField(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/\bod\b.*\bdo\b/i.test(s)) return null;
  const priceRe = /([\d][\d .,]*)[\s]*z[łl]/gi;
  const hits = [];
  let m;
  while ((m = priceRe.exec(s)) !== null) {
    const n = _parsePLN(m[1]);
    if (n != null) hits.push(n);
  }
  if (hits.length === 1) return hits[0];
  if (hits.length === 2 && /wadium/i.test(s)) return hits[0];
  return null;
}

/** "140.000,00" / "194.930,00" / "138 000" -> integer PLN (or null). */
function _parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(s);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = s.replace(/[.,]\d{2}$/, '').replace(/[.,]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Determine auction round from the <przetarg-na> text.
 * Returns null when no "przetarg" word is present (unknown, not first).
 */
export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  if (/kolejn/i.test(t)) return null;
  if (/\bdrugi[eaim]?\b|\bdrugich\b/i.test(t)) return 2;
  if (/\btrzeci[cha]?\b/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  if (/\bpi[a-z]{2}t/i.test(t)) return 5;
  if (/\bpierwsz/i.test(t)) return 1;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

/** "lokal sprzedany" / "lokale sprzedane" -> resolved. */
export function isResolved(text) {
  return /lokal\w*\s+sprzeda[ny]/i.test(text || '');
}

// ---------------------------------------------------------------------------
// XML feed parser
// ---------------------------------------------------------------------------

function _xmlText(xml, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m
    ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
    : '';
}

/**
 * Parse the BIP XML export into raw listing records.
 * @param {string} xml  raw XML from /przetargi-nieruchomosci/xml/1/{per_page}
 * @returns {Array<object>}
 */
export function parseXmlFeed(xml) {
  if (!xml) return [];
  const out = [];
  const itemRe = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block          = m[1];
    const url            = _xmlText(block, 'url');
    const adresRaw       = _xmlText(block, 'adres-nieruchomosci');
    const przetargNa     = _xmlText(block, 'przetarg-na');
    const rodzaj         = _xmlText(block, 'rodzaj-nieruchomosci');
    const cenaRaw        = _xmlText(block, 'cena-wywolawcza');
    const dataRaw        = _xmlText(block, 'data-przetargu');

    if (!url || !adresRaw) continue;

    const idM  = /\/przetarg-nieruchomosci\/(\d+)\//.exec(url);
    const id   = idM ? idM[1] : null;

    const resolved = isResolved(adresRaw) || isResolved(url);

    const adresClean = adresRaw
      .replace(/\s*[-–]\s*lokal\w*\s+sprzeda\w*/i, '')
      .replace(/\s+lokal\w*\s+sprzeda\w*/i, '')
      .trim();

    const kind               = classifyKind(rodzaj + ' ' + przetargNa);
    const auction_date       = parseDateField(dataRaw);
    const starting_price_pln = parsePriceField(cenaRaw);
    const round              = roundFromText(przetargNa);

    out.push({
      id, detail_url: url, address_raw: adresClean,
      rodzaj, przetarg_na: przetargNa,
      kind, auction_date, starting_price_pln, round, resolved,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Result notice (DOCX) parser
// ---------------------------------------------------------------------------

/** Is this text a Torun result notice? */
export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIK/i.test(text || '');
}

// "przeprowadzonych w dniu 19 maja 2026r." -> "2026-05-19"
function _resultDate(text) {
  const m =
    /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? iso(m[3], mo, m[1]) : null;
}

// Column-header keywords — used to skip the header line.
const _HDR = /Pol[oa][zz]enie|Lokal.*pow|Dzia[ll]ka|Ksiega|MPZP|Cena\s+wywo|Cena\s+wylic|Ilos[cc]|Nabywca/i;

// A data record begins with a street address.
// Matches: "ul. Foo 5 ..." or "Wielkie Garbary 5 ..."
const _STARTS_RECORD = /^(ul\.|[A-Za-z][a-zA-Z]+\s+[A-Za-z]?[a-zA-Z]*\s*\d)/;

function _startsRecord(line) {
  return _STARTS_RECORD.test(line.trim());
}

function _extractArea(s) {
  const m = /([\d]+[,.]?[\d]*)\s*m\s*2/.exec(s);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

/**
 * Parse one grouped record block (2-3 lines joined by \n).
 */
function _parseBlock(block, auctionDate, sourceUrl) {
  // Flatten embedded paragraph breaks to tabs.
  const flat = block.replace(/\n/g, '\t');
  const cols = flat.split('\t');

  const loc = (cols[0] || '').trim();
  if (!loc || _HDR.test(loc)) return null;

  // Find count anchor (X/Y) scanning from the right.
  let ci = -1;
  for (let i = cols.length - 1; i >= 2; i--) {
    if (/^\d+\/\d+$/.test(cols[i].trim())) { ci = i; break; }
  }
  if (ci < 3) return null;

  const startingRaw = cols[ci - 2].trim();
  const achievedRaw = cols[ci - 1].trim();
  const buyer       = cols.slice(ci + 1).map((c) => c.trim()).filter(Boolean).join(' ');

  // Unit number and area from col[1] (and possibly col[2] for split cells).
  const unitRaw = (cols[1] || '').trim();
  const areaRaw = (cols[2] || '').trim();
  const unitM   = /Nr\s+(\d+)(?:\s*([A-Za-z])(?!\d))?/i.exec(unitRaw);
  const unitNo  = unitM ? (unitM[1] + (unitM[2] || '')).trim() : null;
  const area_m2 = _extractArea(unitRaw) || _extractArea(areaRaw) || null;

  let address_raw = loc;
  if (unitNo) {
    const already = new RegExp(`/${unitNo}\\b`, 'i').test(address_raw);
    if (!already) address_raw = `${address_raw}/${unitNo}`;
  }

  const address = parseAddress(address_raw);
  if (!address) return null;

  // Prices — regex handles both "zl" and real zl glyph (U+0142).
  const startM          = /([\d][\d .,]*)[\s]*z[łl]/i.exec(startingRaw);
  const starting_price_pln = startM ? _parsePLN(startM[1]) : null;

  const negative =
    /^-+$/.test(achievedRaw) || achievedRaw === '' || /nie\s+dosz/i.test(achievedRaw);
  const finalM          = !negative ? /([\d][\d .,]*)[\s]*z[łl]/i.exec(achievedRaw) : null;
  const final_price_pln = finalM ? _parsePLN(finalM[1]) : null;

  return {
    auction_date: auctionDate,
    kind: 'mieszkalny',
    address_raw: address_raw.trim(),
    address,
    area_m2,
    starting_price_pln,
    final_price_pln,
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    buyer: buyer || null,
    notes: [],
    source_pdf: sourceUrl,
  };
}

/**
 * Parse one result-notice DOCX text into concluded auction records.
 * @param {string|null} text         extracted DOCX text (doc-text.js)
 * @param {string|null} fallbackDate ISO date from crawl ref
 * @param {string}      sourceUrl    attachment URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];

  const t           = (text || '').replace(/\r/g, '');
  const auctionDate = _resultDate(t) || fallbackDate || null;

  const out   = [];
  const lines = t.split('\n');
  let pending = null;

  const flush = () => {
    if (pending === null) return;
    const row = _parseBlock(pending, auctionDate, sourceUrl);
    if (row) out.push(row);
    pending = null;
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    if (_startsRecord(line)) {
      flush();
      pending = line;
    } else if (pending !== null) {
      pending = pending + '\n' + line;
    }
    // pre-record header/date text — ignored (pending is null)
  }
  flush();

  return out;
}
