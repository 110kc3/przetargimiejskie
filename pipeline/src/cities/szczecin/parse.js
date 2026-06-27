// Szczecin parsers — bip.um.szczecin.pl / chapter_131207.
//
// Two page shapes, both server-rendered HTML:
//
//   ANNOUNCEMENT (przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego)
//   ------------------------------------------------------------------------------
//   The detail page carries an <h2> title then "Rodzaj: Lokale" then a <table>
//   with one data row per flat (almost always 1 flat per announcement):
//     col 1  Lp.
//     col 2  "Polozenie i opis lokalu"  -> address in <strong>, floor, room count
//     col 3  Nr dzialki / Obreb
//     col 4  Pow. lokalu w m2 / Pow. dzialki w m2
//     col 5  Przeznaczenie nieruchomosci
//     col 6  Udzial w czesiach wspolnych
//     col 7  Cena wywolawcza (zl)
//     col 8  Wadium (zl)
//   The auction date appears in prose after the table:
//     "Przetarg odbedzie sie w dniu DD.MM.YYYY r."
//   The round appears in the <h2> title:
//     "Drugi przetarg ...", "Trzeci przetarg ...", "Czwarty przetarg ..."
//     or bare "Przetarg ..." / "Ogloszenie o przetargu ..." (first auction).
//
//   RESULT NOTICE (Informacja o wyniku ...)
//   -----------------------------------------
//   The detail page carries "INFORMACJA O WYNIKU ..." in bold text and a
//   different <table> with one row per flat:
//     col 2  "Adres (ulica)"         -> address in <strong>
//     col 4  Pow. lokalu [m2] / Pow. dzialki [m2]
//     col 7  Cena wywolawcza [zl]
//     col 8  Cena osiagnieta w przetargu [zl]
//     col 9  Nabywca nieruchomosci   -> blank = unsold; non-blank = sold
//   The auction date appears in the header prose:
//     "PRZEPROWADZONEGO W DNIU DD.MM.YYYY r."
//   The round appears in the <h2> title or header prose:
//     "DRUGIEGO PRZETARGU", "TRZECIEGO PRZETARGU", ...
//
// All fixtures groundtruthed against live pages fetched 2026-06-27.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// --- shared helpers ----------------------------------------------------------

const HTML_ENTITIES = {
  'oacute': 'ó', 'Oacute': 'Ó',
  'aacute': 'á', 'eacute': 'é', 'iacute': 'í', 'uacute': 'ú',
  'Aacute': 'Á', 'Eacute': 'É', 'Iacute': 'Í', 'Uacute': 'Ú',
  'agrave': 'à', 'egrave': 'è', 'nbsp': ' ', 'amp': '&',
  'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
  'sup2': '²', 'sup3': '³', 'ndash': '–', 'mdash': '—',
};

function decodeHtml(s) {
  return (s || '').replace(/&([a-zA-Z0-9]+);/g, (_, name) => HTML_ENTITIES[name] ?? '');
}

/** Strip all HTML tags and decode entities; collapse whitespace. */
function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeHtml(s);
  return s.replace(/\s+/g, ' ').trim();
}

/** Extract all <td> cell texts from a <tr> block. */
function cellsFromRow(trHtml) {
  const cells = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = re.exec(trHtml)) !== null) {
    cells.push(htmlToText(m[1]));
  }
  return cells;
}

/** Extract all <tr> blocks from a <table>. */
function rowsFromTable(tableHtml) {
  const rows = [];
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(tableHtml)) !== null) {
    rows.push(m[1]);
  }
  return rows;
}

/**
 * True when a table row is a pure header row -- all non-empty cells are wrapped
 * exclusively in <em> or <th>. Data rows may also CONTAIN <em> (e.g. the
 * price cell has "<em>(slownie ...)</em>"), so we cannot simply test for <em>.
 */
function isHeaderRow(rowHtml) {
  if (/<th/i.test(rowHtml)) return true;
  // Count cells that have meaningful text outside of <em>
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  let totalCells = 0;
  let emOnlyCells = 0;
  while ((m = cellRe.exec(rowHtml)) !== null) {
    const inner = m[1];
    // Strip tags entirely to get plain text
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!text) { emOnlyCells++; totalCells++; continue; }
    // Remove <em>...</em> content and see if anything non-trivial is left
    const withoutEm = inner.replace(/<em[^>]*>[\s\S]*?<\/em>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    totalCells++;
    if (!withoutEm) emOnlyCells++;
  }
  // Header row: all cells are either empty or <em>-only
  return totalCells > 0 && emOnlyCells === totalCells;
}

/**
 * Parse "215 400,00" or "215.400,00" or "215400" -> integer PLN.
 * Handles multi-paragraph cell text: takes the FIRST valid Polish money
 * pattern ("<digits><sep><digits>,<cents>") to avoid grabbing subsequent
 * breakdown lines ("135 100,00 lokal mieszkalny  80 300,00 udzial...").
 */
function parsePLN(s) {
  if (!s) return null;
  // First try: canonical "NNN NNN,DD" or "NNN.NNN,DD" or "NNNNNN,DD"
  const m = /([\d][\d\s.]*,\d{2})/.exec(String(s));
  if (m) {
    const cleaned = m[1].replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  // Fallback: bare integer (no decimal)
  const n = Number(String(s).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse "31,40" or "31.40" -> 31.4 */
function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'wrzesnia': 9, 'pazdziernika': 10,
  listopada: 11, grudnia: 12,
};

/** "DD.MM.YYYY" -> "YYYY-MM-DD" */
function parseDateDMY(dmy) {
  if (!dmy) return null;
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(dmy);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// --- title helpers -----------------------------------------------------------

const ORDINAL_MAP = {
  'pierwsz': 1, 'drug': 2, 'trzeci': 3, 'czwart': 4,
  'piat': 5, 'szost': 6,
};

/**
 * Round number from title / header text.
 * Matches "Drugi przetarg ...", "DRUGIEGO PRZETARGU ...", bare "Przetarg ..." -> 1.
 */
export function roundFromText(text) {
  if (!text) return null;
  // Normalize Polish diacritics for matching
  const t = text.toLowerCase()
    .replace(/ą/g, 'a').replace(/ó/g, 'o').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ś/g, 's').replace(/ź/g, 'z')
    .replace(/ż/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n')
    .replace(/ó/g, 'o');
  if (!t) return null;
  for (const [stem, n] of Object.entries(ORDINAL_MAP)) {
    if (t.includes(stem)) return n;
  }
  if (/przetarg/.test(t)) return 1;
  return null;
}

/**
 * True when the RSS title is a flat sale announcement (not a result notice,
 * not a commercial/land/non-flat sale).
 */
export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (!t) return false;
  // Exclude result notices
  if (/informacja\s+o\s+wyniku|wynik\s+przetargu/.test(t)) return false;
  // Must be a sale ("sprzedaz") auction
  if (!/przetarg|og.oszenie/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  // Must involve a residential flat (lokal mieszkalny / lokalu mieszkalnego)
  if (!/lokal\w*\s+mieszkaln/.test(t)) return false;
  // Exclude commercial / non-residential units
  if (/niemieszkał|niemieszkala|lokal\w*\s+u[zz]ytkow|pomieszczen\w*\s+gospodarcz/.test(t)) return false;
  return true;
}

/**
 * True when the RSS title is a result notice for a flat sale.
 */
export function isResultTitle(title) {
  const t = (title || '').toLowerCase();
  if (!t) return false;
  if (!/informacja\s+o\s+wyniku|wynik\s+przetargu/.test(t)) return false;
  // Filter to flat results only (exclude commercial/non-residential)
  if (/lokal\w*\s+niemieszkał|lokal\w*\s+niemieszkala|lokal\w*\s+u[zz]ytkow|pomieszczen\w*\s+gospodarcz/.test(t)) return false;
  return true;
}

// --- announcement detail parser ----------------------------------------------

/**
 * Auction date from announcement body prose.
 * "Przetarg odbedzie sie w dniu 17.11.2025 r."
 * Also handles "Przetarg odbedzie sie 17 listopada 2025 r."
 */
export function auctionDateFromText(text) {
  const t = (text || '');
  // DD.MM.YYYY form
  const m1 = /odb[eę]dzie\s+si[eę](?:\s+w\s+dniu)?\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  // "DD miesiac YYYY" form (normalized month names)
  const tNorm = t.toLowerCase()
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ń/g, 'n').replace(/ą/g, 'a').replace(/ł/g, 'l');
  const m2 = /odb[e]dzie\s+si[e](?:\s+w\s+dniu)?\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(tNorm);
  if (m2) {
    const mo = PL_MONTHS[m2[2]];
    if (mo) return `${m2[3]}-${String(mo).padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Parse one announcement detail page HTML into a flat listing record.
 * Returns null if the page is not parseable (e.g., wrong type, no table).
 *
 * @param {string} html  Full detail page HTML
 * @param {string} detailUrl  The ?soid= URL (used as detail_url)
 * @param {string} rssTitle   The RSS item title (used for round detection)
 * @param {string|null} rssDate  ISO published date from RSS (fallback)
 * @returns {object|null}
 */
export function parseAnnouncementPage(html, detailUrl, rssTitle, rssDate) {
  if (!html) return null;

  // Confirm it's a flat sale announcement (belt-and-suspenders beyond RSS filter)
  const h2Match = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  const h2Text = htmlToText(h2Match ? h2Match[1] : '');
  if (!isAnnouncementTitle(h2Text) && !isAnnouncementTitle(rssTitle)) return null;

  // Strip to content region only (after id="tresc")
  const contentStart = html.indexOf('id="tresc"');
  const content = contentStart >= 0 ? html.slice(contentStart) : html;

  // Find the first <table> in the content (the property table)
  const tableMatch = /<table[\s\S]*?<\/table>/i.exec(content);
  if (!tableMatch) return null;
  const tableHtml = tableMatch[0];

  // Extract the data rows (skip header rows)
  const rows = rowsFromTable(tableHtml);
  const dataRows = rows.filter(function(r) { return /<td/i.test(r) && !isHeaderRow(r); });
  if (dataRows.length === 0) return null;

  // Use first data row
  const cells = cellsFromRow(dataRows[0]);
  // col indices (0-based): 0=Lp, 1=Polozenie/opis, 2=Nr dzialki/Obreb, 3=Pow lokalu/dzialki,
  //                         4=Przeznaczenie, 5=Udzial, 6=Cena wywolawcza, 7=Wadium
  if (cells.length < 4) return null;

  // Address: in the "Polozenie i opis lokalu" cell (index 1).
  // The address is at the top of the cell, typically bold in the HTML:
  // "<strong>Ul. Krzemienna 28/4</strong>\n1 pietro\nOpis: ..."
  const posCell = cells[1] || '';
  const addrRaw = extractAddressFromCell(posCell);
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) return null;

  // Area: "Pow. lokalu w m2" is first numeric value in col 3 (before slash or newline).
  const areaCell = cells[3] || '';
  const area_m2 = parseArea(areaCell.split(/\s/)[0]);

  // Starting price: col 6 (Cena wywolawcza) -- use parsePLN which grabs first money pattern
  const priceCell = cells[6] || '';
  const starting_price_pln = parsePLN(priceCell);

  // Auction date from prose after the table
  const afterTable = content.slice(tableMatch.index + tableMatch[0].length);
  const auction_date = auctionDateFromText(afterTable);

  // Round from RSS title or h2
  const round = roundFromText(rssTitle || h2Text);

  // Kind: this board is "Lokale" (flat); confirm via content check
  const fullText = htmlToText(content);
  const kind = classifyKind(fullText);

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addrRaw,
    address,
    auction_date,
    published_date: rssDate || null,
    round,
    area_m2,
    starting_price_pln,
    detail_url: detailUrl,
  };
}

/**
 * Extract the address from the "Polozenie i opis lokalu" HTML cell text.
 * The cell text (after tag stripping) is like:
 *   "Ul. Krzemienna 28/4 1 pietro Opis: 1 pokoj, ..."
 *   "Pocztowa 30/16 3 pietro Opis: ..."
 *
 * Strategy: take the first token that looks like "<street> <bldg>/<apt>"
 * or "<street> <bldg>", before floor descriptor keywords.
 */
export function extractAddressFromCell(cellText) {
  if (!cellText) return null;
  const t = cellText.replace(/\s+/g, ' ').trim();

  // Split at floor/room descriptor keywords (Polish, including diacritics)
  const splitRe = /\b(?:parter|pi[eę]tro|Opis:|opis:|piwnic|suteren)/i;
  const chunk = t.split(splitRe)[0].trim();

  // Match: optional "ul./al./pl./os." prefix, then street+bldg+apt
  const streetRe = /^(?:(?:ul|al|pl|os)\.?\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ .'''\-]{1,50}?\s+\d+(?:[A-Za-z])?(?:\s*\/\s*\d+[A-Za-z]?)?)/i;
  const m = streetRe.exec(chunk);
  if (!m) return null;

  // Reconstruct with "ul." prefix if the original cell text had one
  const hasPrefix = /^(?:ul|al|pl|os)\.?\s/i.test(t);
  const prefixMatch = hasPrefix ? t.match(/^((?:ul|al|pl|os)\.?)\s*/i) : null;
  const prefix = prefixMatch ? prefixMatch[1] + ' ' : '';
  return (prefix + m[1]).replace(/\s+/g, ' ').trim();
}

// --- result notice parser ----------------------------------------------------

/**
 * True when the detail page HTML is a result notice (vs. an announcement).
 */
export function isResultNotice(html) {
  return /INFORMACJA\s+O\s+WYNIKU/i.test(html || '');
}

/**
 * Auction date from result notice prose.
 * "PRZEPROWADZONEGO W DNIU 27.03.2024 r."
 */
export function auctionDateFromResultText(text) {
  const t = text || '';
  const m = /(?:PRZEPROWADZONEGO|przeprowadzonego)\s+W\s+DNIU\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // "w dniu DD miesiac YYYY roku" normalized form
  const tNorm = t.toLowerCase()
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ń/g, 'n').replace(/ą/g, 'a').replace(/ł/g, 'l');
  const m2 = /w\s+dniu\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(tNorm);
  if (m2) {
    const mo = PL_MONTHS[m2[2]];
    if (mo) return `${m2[3]}-${String(mo).padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Parse one result notice detail page HTML into an array of concluded auction
 * records (one per flat row in the result table).
 *
 * @param {string} html        Full detail page HTML
 * @param {string|null} fallbackDate  ISO date from RSS pubDate (rarely needed)
 * @param {string} sourceUrl   The ?soid= URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(html, fallbackDate, sourceUrl) {
  if (!isResultNotice(html)) return [];

  const contentStart = html.indexOf('id="tresc"');
  const content = contentStart >= 0 ? html.slice(contentStart) : html;
  const fullText = htmlToText(content);

  // Auction date from prose before the table
  const auction_date = auctionDateFromResultText(fullText) || fallbackDate || null;

  // Round from prose or h2 title
  const h2Match = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(content);
  const h2Text = htmlToText(h2Match ? h2Match[1] : '');
  const round = roundFromText(h2Text) || roundFromText(fullText);

  // Find the first <table> (the result table)
  const tableMatch = /<table[\s\S]*?<\/table>/i.exec(content);
  if (!tableMatch) return [];
  const tableHtml = tableMatch[0];

  const rows = rowsFromTable(tableHtml);
  const dataRows = rows.filter(function(r) { return /<td/i.test(r) && !isHeaderRow(r); });

  const out = [];
  for (const rowHtml of dataRows) {
    const cells = cellsFromRow(rowHtml);
    // Result table col layout:
    //   0=Lp, 1=Adres(ulica), 2=Nr dzialki(obreb), 3=Pow lokalu/dzialki,
    //   4=Liczba oferentow, 5=Liczba niedopuszczonych,
    //   6=Cena wywolawcza, 7=Cena osiagnieta, 8=Nabywca
    if (cells.length < 7) continue;

    // Address from col 1 (bold address in cell)
    const addrRaw = extractAddressFromCell(cells[1] || '');
    if (!addrRaw) continue;
    const address = parseAddress(addrRaw);
    if (!address) continue;

    // Area from col 3 -- first numeric value (flat area, before plot area)
    const areaCell = cells[3] || '';
    const areaFirst = areaCell.replace(/,/g, '.').match(/\d[\d.]*/);
    const area_m2 = parseArea(areaFirst ? areaFirst[0] : null);

    // Starting price from col 6
    const starting_price_pln = parsePLN(cells[6]);

    // Achieved price from col 7 (may be empty for unsold)
    const finalStr = (cells[7] || '').trim();
    const final_price_pln = finalStr ? parsePLN(finalStr) : null;

    // Outcome: sold when final_price_pln is present (achieved price published);
    // or when the nabywca cell carries a buyer name.
    // The Szczecin result table sometimes leaves the Nabywca cell blank even on
    // sold auctions (privacy), so final_price_pln is the primary sold signal.
    const nabywca = (cells[8] || '').trim();
    const outcome = (final_price_pln != null || (nabywca && nabywca !== '&nbsp;')) ? 'sold' : 'unsold';
    const unsold_reason = outcome === 'unsold' ? 'unknown' : null;

    // Kind -- result notice body always describes a flat on this board
    const blockText = cells.join(' ');
    const kind = classifyKind(blockText);

    out.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addrRaw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2,
      notes: [],
    });
  }
  return out;
}
