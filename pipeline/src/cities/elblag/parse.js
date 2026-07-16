// Elbląg parsers.
//
// Two document families, both groundtruthed against REAL extracted text
// (verified live 2026-07-16):
//   - ANNOUNCEMENT (one property per PDF, prose): attachment 14800
//     "2025-10-27 - Mickiewicza.pdf" (flat, ul. Adama Mickiewicza 29/2, I
//     przetarg, 160.000 zł, area 31,60 m2, obręb 16 działka 355); attachment
//     17827 "Dębowa usługa.pdf" (nieruchomość zabudowana, ul. Dębowa, no usable
//     building/apt number — a real edge case the parser must SKIP, not guess).
//   - RESULT (BATCH table, one document can cover several properties decided
//     the same day): attachment 18396/18393 "informacja o wynikach przetargów -
//     06.07.2026.doc" (Legionów I przetarg ograniczony — SOLD, single admitted
//     bidder wins at the cena wywoławcza; Dębowa x2 I przetarg nieograniczony —
//     both UNSOLD, "Brak wpłaty wadium").
//   - TENANT-SALE WYKAZ (excluded, NOT an auction): attachment 18374 "ZPME nr
//     273_2026 - wersja edytowalna.pdf" — "Wykaz lokali mieszkalnych
//     przeznaczonych do sprzedaży w trybie bezprzetargowym na rzecz ich
//     najemców" — a ZARZĄDZENIE (mayoral order) with a bonifikata table, no
//     "cena wywoławcza" / "przetarg ustny" anywhere. See config.js header.
//
// Most announcement FIELDS (kind, round, cena wywoławcza, auction date) come
// from the per-item HTML "Szczegóły" table (see crawl.js) — this file's
// PDF-text extractors fill in only what the HTML table omits: the exact
// building/apt number, usable floor area, and dzialka_nr/obręb/plot-area.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// Word-ordinal → round, used by the RESULT batch doc's section headers
// ("Pierwszy ustny przetarg ograniczony"). The HTML "Przetarg na" field (used
// for ANNOUNCEMENTS) instead uses a Roman numeral — see romanToInt/roundFromRoundField.
const ORDINAL_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

// "225.000" / "2.043.200" (dot thousands, no grosze — Elbląg's standard money
// format in both the HTML "Cena wywoławcza" field and the PDF/table bodies) or
// "225.000,00" (dot thousands + comma grosze, seen in some result rows) ->
// integer PLN. -> null on empty/zero/garbage (incl. the table's "------" /
// "-----" placeholder for "not applicable").
export function parsePLN(numStr) {
  if (!numStr) return null;
  // Extract the leading digit-group (drops a trailing " zł" / any other unit
  // text — e.g. "160.000 zł" -> "160.000 "); "-----" / "------" table
  // placeholders have no digit at all and fall through to null.
  const m = /(\d[\d\s.,]*)/.exec(String(numStr));
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, '').replace(/,\d{2}$/, '').replace(/\./g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "0,1177" / "0,0345" (hectares, comma decimal) -> number, or null.
function parseHa(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).trim().replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "31,60" / "43,20" (m2, comma decimal) -> number, or null.
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).trim().replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------------ doc gates
//
// BEZPRZETARGOWO (tenant-sale) exclusion — the load-bearing correctness
// requirement for this city (see config.js). Real signature phrases from the
// ZPME nr 273/2026 fixture: the header is a "ZARZĄDZENIE" (mayoral order, not an
// "OGŁOSZENIE"/"INFORMACJA" auction notice), and the body states outright
// "sprzedaży w trybie bezprzetargowym na rzecz ich najemców" / the ZARZĄDZENIE
// subject line reads "…wykazu lokali mieszkalnych przeznaczonych do sprzedaży
// na rzecz najemców…". Either phrase alone is enough to exclude the document;
// this check is called from BOTH parseAnnouncement and parseResultDoc so no
// text of this shape can ever produce a fake auction record, regardless of
// which board a future crawl change might pull it from.
export function isBezprzetargowoDoc(text) {
  const t = text || '';
  return (
    /bezprzetargow/i.test(t) ||
    /sprzeda[żz]y\s+na\s+rzecz\s+najemc[óo]w/i.test(t) ||
    /na\s+rzecz\s+najemc[óo]w\s+oraz\s+udzielenia\s+bonifikat/i.test(t)
  );
}

// RESULT batch-doc header: "Informacja o wynikach przetargów przeprowadzonych
// w dniu …". Plural "wynikach"/"przetargów" (batch), distinct from a single
// "Informacja o wyniku przetargu" prose notice (not seen live for this city,
// but the regex tolerates the singular form too — see the ADAPTER-GUIDE §5.3
// generic "Result" signature).
export function isResultDoc(text) {
  return /informacj\w*\s+o\s+wynik\w*\s+przetarg/i.test(text || '');
}

// ANNOUNCEMENT PDF header: "PREZYDENT MIASTA ELBLĄG ogłasza … przetarg …".
export function isAnnouncementDoc(text) {
  return /ogłasza[\s\S]{0,80}przetarg/i.test(text || '');
}

// ------------------------------------------------------------------- rounds

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/** "III" -> 3, "V" -> 5. Returns null on a malformed/empty token. */
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/i.test(s)) return null;
  const up = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

/** Round from the HTML "Przetarg na" field: "I przetarg nieograniczony" -> 1,
 *  "V Przetarg nieograniczony" -> 5, "III ustny przetarg ograniczony" -> 3. The
 *  Roman numeral is always the leading token, case-insensitive on "przetarg". */
export function roundFromRoundField(text) {
  const m = /^\s*([IVXLCDM]+)\b/i.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}

/** Round from a RESULT batch doc's section header: "Pierwszy ustny przetarg
 *  ograniczony" -> 1, "Drugi ustny przetarg nieograniczony" -> 2. Word ordinal
 *  (unlike the HTML Roman-numeral field), matching the real fixture text. */
export function roundFromSectionHeader(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+(?:ustny|pisemny)\s+przetarg/i.exec(text || '');
  return m ? ORDINAL_WORDS[m[1].toLowerCase()] ?? null : null;
}

// ------------------------------------------------------------------- dates

/** DD.MM.YYYY -> ISO, or null. Used for the HTML "Data przetargu" field when no
 *  machine-readable <time datetime> attribute was captured by crawl.js. */
export function ddmmyyyyToIso(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** Announcement auction date from PDF prose: "przetarg odbędzie się w dniu 27
 *  października 2025 r." Anchored on "przetarg odbędzie się w dniu" (not a bare
 *  "odbędzie się", which also appears in unrelated uzbrojenie boilerplate — see
 *  the real Dębowa fixture, point 4/5 vs point 9). Fallback only: the HTML
 *  <time datetime> field (see crawl.js) is the primary source. -> ISO or null. */
export function auctionDateFromText(text) {
  const m = /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** RESULT batch-doc date: "przeprowadzonych w dniu 6 lipca 2026 r." (the header
 *  line, applies to every row in the document — Elbląg batches results by day).
 *  -> ISO or null. */
export function resultDateFromText(text) {
  const m = /przeprowadzon\w*\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// ---------------------------------------------------------------- addresses

// "1. Lokalizacja: Elbląg, ul. Adama Mickiewicza 29/2." -> street/building/apt.
// "1. Lokalizacja: Elbląg, ul. Dębowa." (no building number — a bare service
// plot address) -> street only, building/apt null (addressRawFromText then
// returns null: an address-keyed kind needs a building number to join on).
const LOKALIZACJA_RE =
  /Lokalizacja:\s*Elbl[ąa]g,\s*ul\.\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]*?)(?:\s+(\d+[A-Za-z]?)(?:\/(\S+?))?)?\s*\./;

/** { street, building|null, apt|null } from the "Lokalizacja:" line, or null. */
export function lokalizacjaFromText(text) {
  const m = LOKALIZACJA_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  if (!street) return null;
  return { street, building: m[2] || null, apt: m[3] || null };
}

/** "ul. <street> <bldg>[/<apt>]" raw address for a flat/unit/building. Returns
 *  null without a usable street + building number (e.g. the real Dębowa
 *  "nieruchomość zabudowana" fixture, whose Lokalizacja line carries no building
 *  number — the item is a service-pavilion PLOT, not an addressed building; the
 *  caller then routes it as a skip, matching Tarnowskie Góry's convention for an
 *  address-keyed kind with no resolvable address). */
export function addressRawFromText(text) {
  const h = lokalizacjaFromText(text);
  if (!h || !h.building) return null;
  return h.apt ? `ul. ${h.street} ${h.building}/${h.apt}` : `ul. ${h.street} ${h.building}`;
}

// --------------------------------------------------------------------- plot

// "obręb 16, działka\n   nr 355 o powierzchni 0,2777 ha." (flat, no dot in
// "obręb") / "obr. 24, działka\n   nr 238/2 o pow. 0,1177 ha." (building, dotted
// abbreviation + "o pow." short form). Elbląg's obręb is a NUMBER (unlike
// Tarnowskie Góry/Kędzierzyn-Koźle's named obręb) — matches the real fixtures.
const DZIALKA_RE =
  /obr(?:ęb|\.)\s*(\d+)\s*,\s*dzia[łl]k\w*\s*nr\s*(\d+(?:\/\d+)?)\s*o\s*(?:pow\.|powierzchni)\s*([\d,.]+)\s*ha/i;

/** { obreb, dzialka_nr, area_m2 } (plot area, ha -> m2) from the "Oznaczenie
 *  nieruchomości …" line, or all-null fields when absent. */
export function dzialkaFromText(text) {
  const m = DZIALKA_RE.exec((text || '').replace(/\s+/g, ' '));
  if (!m) return { obreb: null, dzialka_nr: null, area_m2: null };
  const ha = parseHa(m[3]);
  return {
    obreb: m[1],
    dzialka_nr: m[2],
    area_m2: ha != null ? Math.round(ha * 10000) : null,
  };
}

// Usable floor area of a flat/unit: "…przedpokoju o łącznej powierzchni\n
// użytkowej 31,60 m2. Do lokalu przynależy piwnica o powierzchni użytkowej 3,3
// m2." Anchored on "łącznej powierzchni użytkowej" so the attached CELLAR
// ("piwnica o powierzchni użytkowej …", no "łącznej") is never taken.
const UNIT_AREA_RE = /[łl][ąa]cznej\s+powierzchni\s+u[żz]ytkow\w+\s+([\d.,\s]+?)\s*m\s*[²2](?!\d)/i;

/** Usable floor area (m2) of a flat/unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec((text || '').replace(/\s+/g, ' '));
  return m ? parseArea(m[1]) : null;
}

// ------------------------------------------------------------------ header window

// Header window for kind classification when only prose is available (the
// RESULT batch table has no "Rodzaj nieruchomości" column at all — see
// rowAddressAndKind below). Announcements primarily classify from the HTML
// "Rodzaj nieruchomości" field (see crawl.js); this is a defensive fallback.
function kindFromHeader(text) {
  return classifyKind((text || '').slice(0, 600));
}

// -------------------------------------------------------------- announcement

/**
 * Parse one ANNOUNCEMENT (HTML "Szczegóły" fields + the linked PDF's text).
 * Single-property. Returns null for: a bezprzetargowo document (defense in
 * depth), or an address-keyed kind (mieszkalny/uzytkowy/zabudowana/garaz)
 * lacking a resolvable building number (e.g. the real Dębowa "zabudowana" fixture).
 *
 * @param {object} fields
 * @param {string} fields.kindText     HTML "Rodzaj nieruchomości" (e.g. "lokal
 *   mieszkalny" / "nieruchomość niezabudowana")
 * @param {string} [fields.roundText]  HTML "Przetarg na" (e.g. "I przetarg nieograniczony")
 * @param {string} [fields.priceText]  HTML "Cena wywoławcza" (e.g. "225.000 zł")
 * @param {string} [fields.auctionDateIso]  ISO date from the HTML <time datetime>
 * @param {string} fields.pdfText      extracted text of the "wersja edytowalna" attachment
 * @returns {object|null}
 */
export function parseAnnouncement(fields = {}) {
  const pdfText = fields.pdfText || '';
  if (!pdfText || isBezprzetargowoDoc(pdfText)) return null;

  const kind = fields.kindText ? classifyKind(fields.kindText) : kindFromHeader(pdfText);
  const round = fields.roundText ? roundFromRoundField(fields.roundText) : null;
  const starting_price_pln = fields.priceText != null
    ? parsePLN(fields.priceText)
    : (() => {
        const m = /Cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci:?\s*([\d.\s]+)\s*z[łl]/i.exec(pdfText);
        return m ? parsePLN(m[1]) : null;
      })();
  const auction_date = fields.auctionDateIso || auctionDateFromText(pdfText);
  const plot = dzialkaFromText(pdfText);

  if (kind === 'grunt') {
    const h = lokalizacjaFromText(pdfText);
    const address_raw = h ? `ul. ${h.street}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2, // PLOT area — land has no usable floor area
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  // Flat / commercial unit / building (address-keyed): needs a building number.
  const address_raw = addressRawFromText(pdfText);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(pdfText);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}

// -------------------------------------------------------------------- results
//
// RESULT batch-doc row parser. Real shape (catdoc -a -d utf-8 of the "wersja
// edytowalna" .doc, blank lines collapsed — see crawl.js):
//
//   Lp.\tAdres\tDane geodezyjne(KW\tObręb\tNr działki\tPow. w ha)\tLiczba osób
//   dopuszczonych\tLiczba osób niedopuszczonych\tCena wywoławcza netto\t
//   Najwyższa zaoferowana cena netto\tOsoba wyłoniona jako nabywca nieruchomości
//   ...
//   \t1.\tLegionów \t115189/0\t5\t795/4\t0,0345\t1\t-----\t50.500\t------\tDanuta i
//   Michał Dąbrowscy\nIndywidualna Specjalistyczna Praktyka Lekarska Danuta Dąbrowska
//   ...
//   \tPierwszy ustny przetarg nieograniczony
//   Lp. ... \t1.\tDębowa\t114259/5\t24\t230/2\t0,0545\t----\t-----\t145.000\t------\tBrak
//   wpłaty wadium
//   2.\tDębowa\t114259/5\t24\t238/2\t0,1177\t-----\t------\t225.000\t------\tBrak
//   wpłaty wadium
//
// A row's Lp. cell is the reliable anchor (leading tab is OPTIONAL — catdoc
// drops it inconsistently between rows depending on the preceding cell's
// wrapping). The Nabywca cell — the row's last field — can itself span several
// soft-wrapped lines; it is bounded by the NEXT row's Lp. anchor, the NEXT
// section's round header, or the end of the document.
const ROW_RE =
  /\n\t?(\d+)\.\t([^\t\n]+?)\s*\t(\S+)\t(\S+)\t(\S+)\t([\d.,]+)\t(\S+)\t(\S+)\t([\d.,]+|-+)\t([\d.,]+|-+)\t([\s\S]*?)(?=\n\t?\d+\.\t|\n\t?(?:pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+(?:ustny|pisemny)\s+przetarg|$)/gi;

/** Sold/unsold + achieved price from a row's raw Nabywca cell text + the row's
 *  "Najwyższa zaoferowana cena" column. "Brak wpłaty wadium" / "wynikiem
 *  negatywnym" / no admitted bidders -> unsold. A numeric "najwyższa cena" ->
 *  sold at that price. A named buyer with NO numeric "najwyższa cena" (the real
 *  Legionów row: a single admitted bidder in a przetarg OGRANICZONY wins at the
 *  cena wywoławcza itself, with no competitive raise recorded) -> sold at the
 *  starting price, flagged with a note. */
function outcomeFromRow(nabywcaRaw, najwyzszaCenaRaw, startingPricePln) {
  const nabywca = (nabywcaRaw || '').replace(/\s+/g, ' ').trim();
  const negative = /brak\s+wp[łl]aty\s+wadium|wynikiem\s+negatywnym|brak\s+ofert|nie\s+wy[łl]oniono/i.test(nabywca);
  const najwyzsza = parsePLN(najwyzszaCenaRaw);
  if (negative || !nabywca) {
    return { outcome: 'unsold', final_price_pln: null, notes: [] };
  }
  if (najwyzsza != null) {
    return { outcome: 'sold', final_price_pln: najwyzsza, notes: [] };
  }
  // Named buyer, no numeric "najwyższa cena" — single-bidder sale at the
  // starting price (see the real Legionów fixture: 1 admitted bidder, "------"
  // in the najwyższa-cena column, a named buyer).
  return {
    outcome: 'sold',
    final_price_pln: startingPricePln,
    notes: startingPricePln != null ? ['parse: sold at cena wywoławcza (single admitted bidder, no recorded raise)'] : ['parse: sold but no achieved or starting price recorded'],
  };
}

/** Kind + address/dzialka routing for a RESULT row. The batch table carries NO
 *  "Rodzaj nieruchomości" column, so kind is inferred from the row's own Adres
 *  cell shape: an apartment suffix ("/N") -> mieszkalny; a bare building number
 *  with no apt -> zabudowana; a bare street name (the real Dębowa/Legionów rows)
 *  -> grunt, parcel-keyed via the row's own KW/Obręb/Nr działki/Pow columns
 *  (always present regardless of kind, since even a flat's row carries its
 *  building's underlying plot). */
function rowAddressAndKind(streetCellRaw) {
  const cell = (streetCellRaw || '').replace(/\s+/g, ' ').trim();
  const m = /^([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]*?)\s+(\d+[A-Za-z]?)(?:\/(\S+))?$/.exec(cell);
  if (!m) return { kind: 'grunt', address_raw: cell ? `ul. ${cell}` : null, address: null };
  const [, street, building, apt] = m;
  const address_raw = apt ? `ul. ${street} ${building}/${apt}` : `ul. ${street} ${building}`;
  const address = parseAddress(address_raw);
  const kind = apt ? 'mieszkalny' : 'zabudowana';
  return { kind, address_raw, address };
}

/**
 * Parse a RESULT batch document into 0+ concluded-auction records — one per
 * table row (see ADAPTER-GUIDE §5.5 "a single notice can list several
 * properties"). Guards: not a result doc, or a bezprzetargowo document (defense
 * in depth) -> [].
 *
 * @param {string} text        extracted text (pdftotext for a PDF result doc,
 *   catdoc/doc-text for the .doc "wersja edytowalna" — see crawl.js)
 * @param {string|null} fallbackDate  ISO date from the crawl ref (rarely needed
 *   — the batch header carries its own date)
 * @param {string} sourceUrl   the attachment URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultDoc(text) || isBezprzetargowoDoc(text)) return [];
  const t = text.replace(/\r/g, '').replace(/\n{2,}/g, '\n');
  const docDate = resultDateFromText(t) || fallbackDate || null;

  // Track the current round by scanning section headers in document order —
  // every row up to the next section header belongs to the round it names.
  const sectionRe =
    /\n\t?((?:pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+(?:ustny|pisemny)\s+przetarg\s+\w+)/gi;
  const sections = [];
  let sm;
  while ((sm = sectionRe.exec(t)) !== null) {
    sections.push({ index: sm.index, round: roundFromSectionHeader(sm[1]) });
  }
  const roundAt = (idx) => {
    let round = null;
    for (const s of sections) {
      if (s.index <= idx) round = s.round;
      else break;
    }
    return round;
  };

  const out = [];
  let rm;
  ROW_RE.lastIndex = 0;
  while ((rm = ROW_RE.exec(t)) !== null) {
    const [, , streetCellRaw, , obrebCell, dzialkaCell, powCellHa, , , cenaWywRaw, najwyzszaRaw, nabywcaRaw] = rm;
    const { kind, address_raw, address } = rowAddressAndKind(streetCellRaw);
    const starting_price_pln = parsePLN(cenaWywRaw);
    const { outcome, final_price_pln, notes } = outcomeFromRow(nabywcaRaw, najwyzszaRaw, starting_price_pln);
    const round = roundAt(rm.index);
    const ha = parseHa(powCellHa);
    const area_m2 = ha != null ? Math.round(ha * 10000) : null;

    if (kind === 'grunt') {
      if (!address_raw && !dzialkaCell) continue;
      out.push({
        auction_date: docDate,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: /^\d+(?:\/\d+)?$/.test(dzialkaCell) ? dzialkaCell : null,
        obreb: /^\d+$/.test(obrebCell) ? obrebCell : null,
        area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln,
        outcome,
        unsold_reason: outcome === 'unsold' ? 'unknown' : null,
        notes,
      });
      continue;
    }

    if (!address) continue;
    out.push({
      auction_date: docDate,
      source_pdf: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason: outcome === 'unsold' ? 'unknown' : null,
      area_m2,
      notes,
    });
  }
  return out;
}
