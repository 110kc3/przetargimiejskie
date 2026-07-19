// Lubin parsers.
//
// Every announcement / result is a born-digital text PDF hung off a thin BIP
// stub page (Logonet CMS — see config.js/crawl.js). Groundtruthed against
// REAL `pdftotext -layout` output of live attachments (fetched 2026-07-18,
// still reachable by direct attachment id even though their wrapping BIP
// article/category listing has since aged out — see crawl.js header note):
//   - attachments/9945/download   flat ANNOUNCEMENT, MULTI-lot batch (4 flats:
//     Drzymały 6/13, Kilińskiego 2/6, Kościuszki 23/24, Szkolna 13/12; II
//     przetarg; dated 2015, table-driven price/area)
//   - attachments/10067/download  land ANNOUNCEMENT, single combined lot (2
//     działki 855/246+154/5 sold together; I przetarg; dated 2016)
//   - attachments/10683/download  land ANNOUNCEMENT, MULTI-lot batch (11
//     działki, one price/wadium per działka; IV przetarg; dated 2018-2019)
//   - attachments/9472/download   WYKAZ (pre-auction package designation, 13
//     flats at ul. 1 Maja 11/11A/11B, sold together to ONE investor — an
//     edge-case wykaz shape, not an individual-flat sale wykaz)
//   - a single-lot flat ANNOUNCEMENT format (labelled "Adres lokalu: … ;
//     Powierzchnia użytkowa lokalu: … m2; … Cena wywoławcza: … zł.") is
//     confirmed from the live 2026-03-09 Szkolna 3/8 session via the adradar
//     aggregator's full-text republication (adradar quotes the announcement
//     verbatim) — the ORIGINAL bip.um.lubin.pl attachment for that specific
//     session was already aged out of the board by the time of this build
//     (see crawl.js), so this shape is validated against a faithful copy of
//     the source text, not the original PDF bytes directly.
//
// NOT validated against a real Lubin document (none reachable — the results
// board (informacje-o-wynikach-przetargow) is currently empty and no
// "informacja o wyniku przetargu" URL survives in the live sitemap; see
// crawl.js): parseResultDoc / isResultNotice / achievedPriceFromText /
// negativeOutcomeStated are written to the SAME generic Polish
// municipal-auction result-notice conventions used across this repo (and
// confirmed present in Lubin's OWN announcement boilerplate — e.g. 10067's
// "Cena zakupu nieruchomości osiągnięta w przetargu podlegać będzie zapłacie
// jednorazowo") but are UNVALIDATED live. Flag for re-groundtruthing the
// moment a real result PDF is captured.
//
// Lubin specifics:
//   * Dates are ALWAYS plain numeric DD.MM.YYYY or DD-MM-YYYY (never a Polish
//     month name like jelenia-gora) — no month-name table needed here.
//   * ROUND is stated as a Roman numeral qualifying "nieograniczony przetarg
//     ustny" — but the WORD ORDER is opposite jelenia-gora's: Lubin's
//     announcements say "ogłasza <ROUND> nieograniczony przetarg ustny"
//     (round BEFORE "nieograniczony"), not "<ROUND> przetarg ustny
//     nieograniczony". roundFromText() also tries the jelenia-gora word order
//     as a fallback in case a result notice (unvalidated) phrases it that way
//     instead (a common alternate legal phrasing: "odbył się <round> przetarg
//     ustny nieograniczony").
//   * Some announcement PDFs LETTER-SPACE certain runs (a centered/justified
//     title, or emphasis words like "W a d i u m" / "T e r m i n" /
//     "P r z e t a r g") — pdftotext then emits each letter as its own token
//     (e.g. "sprzedaż l oka l i mi es zk al n yc h poł ożon yc h" for
//     "sprzedaż lokali mieszkalnych położonych"). None of the fields this
//     parser extracts fall inside an observed garbled run (they sit in clean
//     table/prose text elsewhere in the same document), so no de-garbling
//     pass is implemented — documented here as a known risk if a future
//     document garbles a field this parser DOES rely on.
//   * MULTI-lot flat batches carry price/area in a TABLE (not per-lot prose,
//     unlike jelenia-gora): a data row is TWO physical lines in
//     `pdftotext -layout` output — "<street>  <KW>  <geo_nr>  <obreb>
//     <plot_area>  <unit_area>  <share>  <cena_lokalu> zł  <cena_udziału> zł
//     <cena_razem> zł  <wadium> zł" then, on the next line, the wrapped
//     "<bldg>/<apt>" cell. The numbered prose paragraphs below the table
//     ("N) <street> <bldg>/<apt> - lokal mieszkalny …") restate the ADDRESS
//     only (not price/area) — flatTableRows() and splitLots() are joined by
//     the "<bldg>/<apt>" key.
//   * MULTI-lot land batches are a single-line-per-parcel table: "<Lp>.
//     <(intermittently, a wrapped shared "Położenie"/"Obręb" cell)>
//     <dzialka_nr>  <area m2>  <cena netto> zł  <wadium> zł" — landBatchRows().
//     Single/combined-parcel land lots (a "Nr księgi wieczystej | Nr działki |
//     Łączna powierzchnia | Obręb | Położenie | Cena wywoławcza | Wadium"
//     table, occasionally 2+ KW/działka pairs sharing one price) are handled
//     by landSingleFallback() on a best-effort basis (first data line only —
//     a documented simplification, land is the secondary stream here).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// "195.000,00" / "35 500,00 zł" / "1 000 000,00" -> integer PLN. Dot OR space
// thousands separator, optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "27,10" / "5548" / "0,2095" -> number.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/** "IV" -> 4, "III" -> 3. Returns null on a malformed token. */
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

// Polish ordinal STEMS (singular, any case) — fallback path only (Lubin's own
// announcements always use a Roman numeral; word ordinals are a defensive
// fallback for an unvalidated result-notice phrasing).
const WORD_ORDINAL_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piąt', 5], ['piat', 5], ['szóst', 6], ['szust', 6],
  ['siódm', 7], ['siodm', 7], ['ósm', 8], ['osm', 8],
];

/** Round from a Roman numeral (or, as a fallback, a Polish word ordinal)
 *  qualifying the auction phrase. Tries Lubin's own announcement word order
 *  first ("ogłasza <ROUND> nieograniczony przetarg ustny"), then the reverse
 *  order seen elsewhere in this repo ("<ROUND> przetarg ustny
 *  nieograniczony" / "odbył się <round> przetarg ustny nieograniczony") in
 *  case an (unvalidated) result notice phrases it that way instead. */
export function roundFromText(text) {
  const t = text || '';
  const lubinOrder = /ogłasza\s+([IVXLCDM]+)\s+nieograniczon\S*\s+przetarg\S*\s+ustn\S*/i.exec(t);
  if (lubinOrder) {
    const n = romanToInt(lubinOrder[1]);
    if (n) return n;
  }
  const REVERSE_RE = /([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)\s+przetarg\S*\s+ustn\S*\s+nieograniczon\S*/gi;
  let m;
  while ((m = REVERSE_RE.exec(t)) !== null) {
    const token = m[1];
    if (/^[IVXLCDM]+$/.test(token)) {
      const n = romanToInt(token);
      if (n) return n;
      continue;
    }
    const low = token.toLowerCase();
    const hit = WORD_ORDINAL_STEMS.find(([stem]) => low.startsWith(stem));
    if (hit) return hit[1];
  }
  return null;
}

// ---------------------------------------------------------------- doc-type gate

/** Result notice ("Informacja o wyniku przetargu") vs. announcement
 *  ("ogłasza … przetarg"). UNVALIDATED against a real Lubin result doc — see
 *  file header. */
export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wynik\S*\s+przetarg/i.test(text || '');
}

// ----------------------------------------------------------------------- dates

/** Announcement auction date: "Przetarg odbędzie się w siedzibie … dnia
 *  02-10-2015 roku" / "… dnia 17.05.2019 roku" / "… dnia 09.03.2026 r.".
 *  Lubin dates are always plain numeric DD.MM.YYYY or DD-MM-YYYY. */
export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,250}?dnia:?\s*(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i.exec(
    text || '',
  );
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** Result auction date (UNVALIDATED — see file header): anchored on the
 *  "informuję, że w dniu DD.MM.YYYY" clause (the date precedes, not follows,
 *  "odbył się" in this phrasing — same convention as jelenia-gora's
 *  resultDateFromText) so an announcement-date citation elsewhere in the
 *  notice is never picked up instead. */
export function resultDateFromText(text) {
  const m = /informuj\S*\s*,?\s*że\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i.exec(
    text || '',
  );
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// ----------------------------------------------------------------- prices

/** Starting price ("cena wywoławcza"), any labelled form ("Cena wywoławcza:",
 *  "cena wywoławcza netto", "cena wywoławcza nieruchomości netto"). Takes the
 *  first zł amount within a bounded window after the label. Multi-lot flat
 *  batches do NOT restate price in prose (it's table-only — see
 *  flatTableRows()); this is for single-lot flats + land only. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\S*[\s\S]{0,80}?([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices only, UNVALIDATED — see file header):
 *  "cena … osiągnięta w przetargu: 45 200,00 zł". A value ⇒ sold. */
export function achievedPriceFromText(text) {
  const m = /(?:najwy[żz]sza\s+)?cena\s+(?:nabycia\s+|zakupu\s+)?(?:nieruchomo\S*\s+)?osi[ąa]gni[ęe]ta\s+w\s+przetargu\S*\s*:?\s*([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

/** Explicit unsold signal (result notices, UNVALIDATED — see file header):
 *  "zakończony wynikiem negatywnym" / "nie wpłacono wadium". */
export function negativeOutcomeStated(text) {
  return /wynikiem\s+negatywnym|nie\s+(?:zosta[łl]o\s+)?wp[łl]acono\s+wadium|brak\s+wp[łl]aty\s+wadium/i.test(
    text || '',
  );
}

// ----------------------------------------------------------- single-lot flat

/** "Adres lokalu: ul. Szkolna 3/8, Lubin, powiat …;" -> "Szkolna 3/8". */
function singleLotAddressRaw(text) {
  const m = /Adres\s+lokalu\s*:?\s*(?:ul\.?\s*)?([^,;]+?)\s*[,;]/i.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/** "Powierzchnia użytkowa lokalu: 27,47 m2;" -> 27.47. */
function singleLotAreaM2(text) {
  const m = /Powierzchnia\s+u[żz]ytkowa\s+lokalu\S*\s*:?\s*(\d+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(
    text || '',
  );
  return m ? parseNum(m[1]) : null;
}

/** A single-lot flat/commercial announcement in the labelled
 *  "Adres lokalu: … ; Powierzchnia użytkowa lokalu: … m2; …" shape (the
 *  2026-03-09 Szkolna 3/8 format — see file header on its provenance). */
function buildSingleUnitRecord(text) {
  const address_raw = singleLotAddressRaw(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const kind = classifyKind(text.slice(0, 2000));
  return {
    address_raw: `ul. ${address_raw}`,
    address,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    area_m2: singleLotAreaM2(text),
  };
}

// ------------------------------------------------------- multi-lot flat table

/** Table rows for a multi-lot flat batch (see file header for the exact
 *  2-physical-line row shape). Keyed by "<bldg>/<apt>" so splitLots()'s
 *  prose-derived addresses can look up price/area. */
function flatTableRows(text) {
  const RE =
    /^\s*([^\n]+?)\s+(LE1U\/\d+\/\d+)\s+(\d+\/\d+)\s+(\d+)\s+([\d\s]+?)\s+(\d+,\d+)\s+(\d+\/\d+)\s+([\d\s]+,\d{2})\s*z[łl]\s+([\d\s]+,\d{2})\s*z[łl]\s+([\d\s]+,\d{2})\s*z[łl]\s+([\d\s]+,\d{2})\s*z[łl]\s*\n\s*(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/gm;
  const rows = new Map();
  let m;
  while ((m = RE.exec(text)) !== null) {
    const key = `${m[12]}/${m[13]}`;
    rows.set(key, {
      area_m2: parseNum(m[6]),
      starting_price_pln: parsePLN(m[10]),
    });
  }
  return rows;
}

/** Splits a batch flat announcement into its numbered lots: "N) <address> -
 *  lokal …" header lines (dash is a hyphen OR en-dash — both seen live).
 *  Returns null when fewer than 2 numbered headers are found (not a batch). */
function splitLots(text) {
  const re = /(?:^|\n)\s*(\d+)\)\s*([^\n]+?)\s*[-–—]\s*lokal/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ n: m[1], addressRaw: m[2].replace(/\s+/g, ' ').trim() });
  }
  return out.length >= 2 ? out : null;
}

/** One lot from a multi-lot flat batch: address from its "N) <address> -
 *  lokal" header, price/area looked up in the table by the "<bldg>/<apt>"
 *  suffix of that same header. */
function buildLotRecord(lot, table, auction_date, round) {
  const address_raw = `ul. ${lot.addressRaw}`;
  const address = parseAddress(lot.addressRaw);
  if (!address) return null;
  const keyM = /(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)\s*$/.exec(lot.addressRaw);
  const key = keyM ? `${keyM[1]}/${keyM[2]}` : null;
  const priced = key ? table.get(key) : null;
  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: priced ? priced.area_m2 : null,
    starting_price_pln: priced ? priced.starting_price_pln : null,
    auction_date,
    round,
  };
}

// ----------------------------------------------------------------- land

/** Batch land table rows (see file header): one row per działka, each on its
 *  own physical line — "<Lp>. … <dzialka_nr>  <area m2>  <cena netto> zł
 *  <wadium> zł" (a shared "Położenie"/"Obręb" cell may wrap across several
 *  rows' leading whitespace — ignored here, see landLocationFromText()). */
function landBatchRows(text) {
  const RE = /^\s*(\d{1,3})\.\s+.*?(\d+\/\d+)\s{2,}(\d[\d\s]*\d|\d)\s{2,}([\d\s]+,\d{2})\s{2,}([\d\s]+,\d{2})\s*$/gm;
  const out = [];
  let m;
  while ((m = RE.exec(text)) !== null) {
    out.push({
      dzialka_nr: m[2],
      area_m2: parseNum(m[3]),
      starting_price_pln: parsePLN(m[4]),
      wadium: parsePLN(m[5]),
    });
  }
  return out;
}

/** Display-only locality for a land batch/single lot: "przy ulicy
 *  Legnickiej" / "przy ulicy Krzemienieckiej" -> "ul. Legnickiej", or
 *  "Obręb 8 miasta Lubina" -> "obręb 8". */
function landLocationFromText(text) {
  const streetM = /przy\s+ulic[ay]\s+([A-ZŻŹĆŁŚĄĘÓŃ][^\s,.]+)/i.exec(text || '');
  if (streetM) return `ul. ${streetM[1]}`;
  const obrebM = /Obr[ęe]b\s+(\d+)\s+miasta\s+Lubina/i.exec(text || '');
  return obrebM ? `obręb ${obrebM[1]}` : null;
}

/** Single/combined-parcel land lot fallback (best-effort — see file header):
 *  reads only the FIRST data line of the "Nr księgi wieczystej | Nr działki |
 *  Łączna powierzchnia | Obręb | Położenie | Cena wywoławcza | Wadium" table
 *  (a lot combining 2+ działki under one price wraps its 2nd+ KW/działka pair
 *  onto a continuation line, which this simplification does not capture). */
function landSingleFallback(text) {
  const m =
    /^\s*\d+\.\s*LE1U\/\d+\/\d+\s+(\d+\/\d+)\s+([\d\s]+?)\s+(\d+)\s+([^\n]+?)\s+([\d\s]+,\d{2})\s+([\d\s]+,\d{2})\s*$/m.exec(
      text,
    );
  if (!m) return null;
  return {
    kind: 'grunt',
    dzialka_nr: m[1],
    area_m2: parseNum(m[2]),
    obreb: m[3],
    address_raw: landLocationFromText(text) || m[4].replace(/\s+/g, ' ').trim(),
    starting_price_pln: parsePLN(m[5]),
  };
}

/** Loose prose fallback for a land RESULT notice (UNVALIDATED — see file
 *  header): unlike announcements, a result describes a single already-decided
 *  parcel in prose rather than a repeated table, so this reads "działka
 *  (nr|numer) N/M", "Obręb N", "powierzchni N m2" independently rather than
 *  requiring the announcement-table row shape. */
function landResultFallback(text) {
  const dzialkaM = /dzia[łl]k\S*\s*(?:nr|numer)?\s*[:\s]?\s*(\d+\/\d+)/i.exec(text || '');
  const obrebM = /Obr[ęe]b\s+(\d+)/i.exec(text || '');
  const areaM = /powierzchni\S*\s+(\d[\d\s]*)\s*m\s*[²2](?!\d)/i.exec(text || '');
  if (!dzialkaM) return null;
  return {
    dzialka_nr: dzialkaM[1],
    obreb: obrebM ? obrebM[1] : null,
    area_m2: areaM ? parseNum(areaM[1]) : null,
    address_raw: landLocationFromText(text),
  };
}

function parseLandAnnouncement(text, auction_date, round) {
  const rows = landBatchRows(text);
  if (rows.length) {
    const address_raw = landLocationFromText(text);
    return rows.map((row) => ({
      kind: 'grunt',
      dzialka_nr: row.dzialka_nr,
      obreb: (landLocationFromText(text) || '').replace(/^obręb\s*/i, '') || null,
      area_m2: row.area_m2,
      address_raw,
      starting_price_pln: row.starting_price_pln,
      auction_date,
      round,
    }));
  }
  const single = landSingleFallback(text);
  if (single) return [{ ...single, auction_date, round }];
  return [];
}

// ------------------------------------------------------------ announcement parse

/**
 * Parse one ANNOUNCEMENT PDF. Multi-lot flat batch, multi-lot land batch,
 * single-lot flat/commercial, or single/combined-parcel land. One record per
 * lot. Returns [] for anything unrecognised (e.g. a stray non-auction notice
 * filed on the same board).
 * @param {string} text
 * @returns {object[]}
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  if (isResultNotice(t)) return []; // a result notice mis-filed on the announcement board
  const auction_date = auctionDateFromText(t);
  const round = roundFromText(t);

  const lots = splitLots(t);
  if (lots) {
    const table = flatTableRows(t);
    const out = [];
    for (const lot of lots) {
      const rec = buildLotRecord(lot, table, auction_date, round);
      if (rec) out.push(rec);
    }
    if (out.length) return out;
  }

  const kind = classifyKind(t.slice(0, 3000));
  if (kind === 'grunt') return parseLandAnnouncement(t, auction_date, round);

  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  return [{
    ...unit,
    starting_price_pln: startingPriceFromText(t),
    auction_date,
    round,
  }];
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice ("Informacja o wyniku przetargu") into a concluded
 * auction record. UNVALIDATED against a real Lubin result document — see
 * file header. Returns 0 or 1 record (Lubin results are not observed to
 * batch multiple lots in one notice, unlike announcements).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = ['unvalidated: no live Lubin result document was reachable at build time (see parse.js header)'];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negative = negativeOutcomeStated(t);
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  const kind = classifyKind(t.slice(0, 3000));
  if (kind === 'grunt') {
    const single = landSingleFallback(t) || landResultFallback(t);
    const dzialka_nr = single ? single.dzialka_nr : null;
    const address_raw = single ? single.address_raw : landLocationFromText(t);
    if (!dzialka_nr && !address_raw) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb: single ? single.obreb : null,
      area_m2: single ? single.area_m2 : null,
      address_raw,
      round,
      starting_price_pln: starting_price_pln ?? (single ? single.starting_price_pln : null),
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  if (unit.address.warning) notes.push(unit.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: unit.kind,
    address_raw: unit.address_raw,
    address: unit.address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unit.area_m2,
    notes,
  }];
}

// ----------------------------------------------------------------- wykaz

/** A genuine pre-auction SALE wykaz title — "przeznaczonej do sprzedaży" /
 *  "przeznaczonych do zbycia" / "przeznaczonej do łącznej sprzedaży" — as
 *  opposed to dzierżawa (lease) / najem / użyczenie / zamiana (exchange) /
 *  bezprzetargowo, which the wykazy-nieruchomosci board is mostly full of
 *  (see crawl.js — the live board on 2026-07-18 held 7 entries, all
 *  dzierżawa/zamiana, none a genuine flat-sale wykaz). Gated on the BIP
 *  ARTICLE TITLE alone so a non-sale wykaz never costs a PDF fetch. */
export function isGenuineSaleWykazTitle(title) {
  const t = title || '';
  if (/dzier[żz]aw|najem|u[żz]yczeni|zamian|bezprzetargow/i.test(t)) return false;
  return /sprzeda[żz]|zbyci[ae]/i.test(t);
}

/** Package-sale wykaz table row (the 9472 shape — see file header): "<Lp>
 *  <street+bldg/apt>  <położenie w budynku>  <area>,<dd> m2". Each row is its
 *  own flat; the whole package is sold to a single investor (no per-flat
 *  price is stated — see ADAPTER-GUIDE's wykaz convention: no price/date
 *  yet). */
function wykazTableRows(text) {
  const RE = /^\s*(\d+)\s{2,}(.+?)\s{2,}\S.*?\s{2,}([\d\s]+,\d+)\s*m2\s*$/gm;
  const out = [];
  let m;
  while ((m = RE.exec(text)) !== null) {
    out.push({ addressRaw: m[2].trim(), area_m2: parseNum(m[3]) });
  }
  return out;
}

/**
 * A genuine SALE wykaz PDF -> one clean address/parcel-only record per flat
 * (no auction_date/price — ADAPTER-GUIDE wykaz convention). Falls back to a
 * single "przy ul. X" mention when the doc isn't a package table.
 * @param {string} text
 * @param {string|null} pdfUrl
 * @returns {object[]}
 */
export function wykazRecordsFromText(text, pdfUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const rows = wykazTableRows(t);
  if (rows.length) {
    return rows
      .map((row) => {
        const address = parseAddress(row.addressRaw);
        if (!address) return null;
        return {
          kind: 'mieszkalny',
          address_raw: `ul. ${row.addressRaw}`,
          address,
          area_m2: row.area_m2,
          detail_url: pdfUrl,
        };
      })
      .filter(Boolean);
  }
  const single = /przy\s+ul\.?\s+([^\n,;.]+)/i.exec(t);
  if (!single) return [];
  const address = parseAddress(single[1].trim());
  if (!address) return [];
  return [{ kind: 'mieszkalny', address_raw: `ul. ${single[1].trim()}`, address, area_m2: null, detail_url: pdfUrl }];
}
