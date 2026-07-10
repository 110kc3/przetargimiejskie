// Choszczno parsers.
//
// Unlike chełmno's single XML record, one Choszczno "case" (an article at
// /artykul/<slug>) is spread over up to TWO PDF attachments: the announcement
// ("ogloszenie-…pdf", always present, a structured field table) and — once the
// auction has been HELD — the result ("informacja-…pdf", added later, prose).
// crawl.js fetches whichever attachments exist, extracts their text, and
// assembles ONE labelled blob via buildRecordText() below; every parse
// function here reads that blob via section(). The test builds the SAME blob
// from real captured pdftotext output, so the parsers are groundtruthed
// against production data without re-fetching.
//
// Unlike chełmno's single-line XML fields, OGLOSZENIE/INFORMACJA are multi-line
// PDF prose — section() extracts each label's full multi-line body (up to the
// next label or end of blob), not just one line. Field-level regexes below
// then work within that section's text.
//
// All regexes groundtruthed against live records (verified 2026-07-10):
//   FLAT sold (round V):    ul. Rycerska 2/4
//     OGLOSZENIE "1.Miejscowość Choszczno, ul. Rycerska 2/4"; "Typ nieruchomości
//     Lokal mieszkalny"; body "...o łącznej powieizchni 53,73 m2..." (OCR: rz→iz);
//     "Cena wywoławcza (brutto)        230.000,00 zł"; "Pizetarg odbędzie się w
//     dniu 6 marca 2026 r." (OCR: Przetarg→Pizetarg, doesn't affect the anchor).
//     INFORMACJA "ustalono cenę 236.900,00 zł"; "Nabywcą ustaleni zostali
//     Magdalena i Przemysław małż. Pieśkiewicz." (note the internal "małż."
//     abbreviation period — a trap for a naive first-period buyer regex).
//   FLAT unsold (round IV): ul. Rycerska 2/4
//     INFORMACJA "Przetarg rozstrzygnął się wynikiem negatywnym z uwagi na
//     niestawiennictwo oferenta." — no achieved price, no buyer.
//   HOUSE sold (round I):   ul. Fabryczna 5
//     OGLOSZENIE "Typ nieruchomości  Budynek mieszkalny wraz z dwoma budynkami
//     gospodarczymi" (kind 'zabudowana', not a flat); "o pow. użytkowej ok.
//     460,89 m2" THEN a second, later area "97,00 m2" for the outbuildings —
//     the unit-area regex must take the FIRST match. INFORMACJA doesn't restate
//     the street address at all (only "nieruchomości nr 48" + obręb/parcel) —
//     confirms address must come from OGLOSZENIE/TITLE, never INFORMACJA alone.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "230.000,00" / "70.000" / "1 000 000,00" -> integer PLN.
// Dot OR (regular/NBSP) space thousands separator; optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** First "<amount> zł" in a string -> integer PLN, or null. */
function firstPrice(s) {
  if (!s) return null;
  const m = /(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(s);
  return m ? parsePLN(m[1]) : null;
}

// "53,73" / "460,89" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

const SECTION_LABELS = ['TITLE', 'OGLOSZENIE', 'INFORMACJA'];

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * article's <h1> title plus whichever attachment texts it extracted
 * (informacja is '' while the auction is still pending).
 * @param {{title?:string, ogloszenie?:string, informacja?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `TITLE:\n${(f.title || '').trim()}`,
    `OGLOSZENIE:\n${(f.ogloszenie || '').trim()}`,
    `INFORMACJA:\n${(f.informacja || '').trim()}`,
  ].join('\n');
}

/**
 * Read one top-level labelled SECTION's full (multi-line) body from the blob —
 * unlike chełmno's single-line `field()`, a section can span many lines (raw
 * pdftotext prose), so this is a plain string scan (find this label's marker,
 * find the nearest OTHER label's marker after it, slice between) rather than a
 * regex with an ambiguous multiline "end" anchor.
 * @param {string} text @param {'TITLE'|'OGLOSZENIE'|'INFORMACJA'} label
 * @returns {string}
 */
export function section(text, label) {
  if (!text) return '';
  const marker = `${label}:\n`;
  const start = text.indexOf(marker);
  if (start === -1) return '';
  const from = start + marker.length;
  let end = text.length;
  for (const other of SECTION_LABELS) {
    if (other === label) continue;
    const idx = text.indexOf(`\n${other}:\n`, from);
    if (idx !== -1 && idx < end) end = idx;
  }
  return text.slice(from, end).trim();
}

// ----------------------------------------------------------------- doc-type gate

/** A case is CONCLUDED when its INFORMACJA (result) attachment text is
 *  non-empty. (Empty ⇒ only the ogłoszenie exists ⇒ still pending.) */
export function hasResolution(text) {
  return section(text, 'INFORMACJA').length > 0;
}

/** True when this case is a DZIERŻAWA / NAJEM (a lease, not a sale) — checked
 *  on both the title and the announcement body as a defense-in-depth mirror of
 *  crawl.js's title-level pre-filter (which normally skips these before ever
 *  fetching the article). */
export function isLease(text) {
  const t = `${section(text, 'TITLE')} ${section(text, 'OGLOSZENIE')}`;
  return /dzier[żz]aw|\bnajem\b/i.test(t);
}

// ----------------------------------------------------------------- round

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
  'siódm': 7, siodm: 7, 'ósm': 8, osm: 8, 'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XX range used here) -> int, or null if malformed. */
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

/**
 * Auction round from the TITLE's "ogłasza <ORDINAL> przetarg" clause (Roman
 * "IV" or a Polish word ordinal — both forms appear live, sometimes within the
 * same year). The title is live HTML (not OCR'd), so no diacritic-corruption
 * tolerance is needed here. Returns null when unstated.
 */
export function roundFromText(text) {
  const title = section(text, 'TITLE');
  let m = /ogłasza\s+([IVXL]{1,5})\s+przetarg/i.exec(title);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  m = /ogłasza\s+(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg/i.exec(title);
  if (m) {
    const key = m[1].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  }
  return null;
}

// ----------------------------------------------------------------- date

/**
 * Auction date. PRIMARY: OGLOSZENIE's "Pizetarg odbędzie się w dniu 6 marca
 * 2026 r." clause (anchored on "odbędzie się w dniu", immune to the "Przetarg"
 * -> "Pizetarg" OCR slip since that word isn't part of the anchor). FALLBACK 1:
 * two older/free-prose OGŁOSZENIE templates instead label it "Termin i miejsce
 * [części jawnej ]przetargu: 18 września 2023 r." (Ogrodowa land, 2023) or,
 * wrapping onto the next line with no colon at all, "Termin i miejsce części
 * jawnej przetargu\n21 października 2021 r." (Wolności 58/4, 2021) — both
 * anchored the same way here. FALLBACK 2: INFORMACJA's retrospective "w dniu
 * 6 marca 2026 roku ... przeprowadzony" / "przeprowadzonego w dniu 12 maja
 * 2025 r." clause. -> ISO / null.
 */
export function auctionDateFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  let m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(ogl);
  if (!m) m = /Termin\s+i\s+miejsce[^\n]*?przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(ogl);
  if (!m) {
    const info = section(text, 'INFORMACJA');
    m = /\bw\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(info);
  }
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// ----------------------------------------------------------------- prices

/** Starting price. PRIMARY: OGLOSZENIE's structured "Cena wywoławcza (brutto)
 *  230.000,00 zł" field row. FALLBACK: INFORMACJA's restatement ("Cena
 *  wywoławcza do przetargu wynosiła 230.000,00 zł"). Both reads are scoped to
 *  the label's own text LINE, so a same-line trailing "Wadium ... zł" clause
 *  (INFORMACJA sometimes wraps Cena+Wadium onto one physical line) can never
 *  be picked up ahead of the Cena figure — the Cena amount always appears
 *  first on that line. */
export function startingPriceFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  let m = /Cena\s+wywo[łl]awcza\b([^\n]*)/i.exec(ogl);
  if (m) {
    const p = firstPrice(m[1]);
    if (p != null) return p;
  }
  const info = section(text, 'INFORMACJA');
  m = /Cena\s+wywo[łl]awcza\b([^\n]*)/i.exec(info);
  return m ? firstPrice(m[1]) : null;
}

/** Achieved price — from INFORMACJA's "ustalono cenę 236.900,00 zł" clause
 *  (verb-first), OR the reversed-word-order "cena ustalona została na kwotę
 *  141.400,00 zł" phrasing a different clerk/year also uses live (Poziomkowa
 *  4, 2023) — the two phrasings are not interchangeable substrings, so both
 *  are tried. A numeric value ⇒ sold; null ⇒ unsold / not stated.
 *  NOTE: no trailing \b after "cen[ęe]" — JS regex's \w is ASCII-only, so a
 *  word boundary immediately after a diacritic like "ę" silently never
 *  matches (a real bug this test suite caught: \b needs a \w/non-\w
 *  transition, and "ę" is neither, so "cenę " has NO boundary at all there).
 *  The reversed-order pattern's amount can wrap onto the next physical line
 *  ("...na kwotę\n141.400,00 zł..."), so its capture crosses newlines
 *  (bounded, so it can never run away across an entire long document). */
export function achievedPriceFromText(text) {
  const info = section(text, 'INFORMACJA');
  let m = /ustalono\s+cen[ęe]([^\n]*)/i.exec(info);
  if (m) {
    const p = firstPrice(m[1]);
    if (p != null) return p;
  }
  m = /cen[ęa]\s+ustalon\w*\s+zosta[łl]\w*\s+na\s+kwot[ęe]\s*([\s\S]{0,60})/i.exec(info);
  return m ? firstPrice(m[1]) : null;
}

/** True when INFORMACJA explicitly states a negative (unsold/cancelled)
 *  outcome. */
export function isNegativeOutcome(text) {
  const info = section(text, 'INFORMACJA');
  return /wynikiem\s+negatywn|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|odwo[łl]an|nie\s+odnotowano/i.test(info);
}

/** Buyer name(s) from INFORMACJA's "Nabywcą ustalon(e/i/a) zosta(ł/li/ło) …"
 *  clause (ustal-before-zosta word order), OR the reversed "Nabywcą został
 *  ustalony Pan …" order a different clerk/year also uses live (Poziomkowa 4,
 *  2023 — the SAME record whose achieved-price clause is also reversed-order;
 *  the two swaps are independent so both functions carry their own fallback).
 *  Both patterns span to the period that ends the PARAGRAPH (followed by a
 *  blank line or end of text) rather than the first period, for two reasons
 *  seen live: (1) the internal abbreviation period in "małż." (małżonkowie)
 *  must not truncate the match, and (2) a long buyer name (a company name
 *  with the gmina's own registered address style) can wrap onto a second
 *  physical line before the sentence actually ends — Fabryczna 5's buyer
 *  clause does both ("… Transport Eksport - Import\nRoman Kaczmarczyk."). */
export function buyerFromText(text) {
  const info = section(text, 'INFORMACJA');
  let m = /Nabywc[ąa]\s+ustal\w+\s+zosta[łl]\w*\s*:?\s*([\s\S]+?)\.(?=\s*\n\s*\n|\s*$)/i.exec(info);
  if (!m) m = /Nabywc[ąa]\s+zosta[łl]\w*\s+ustalon\w*\s*:?\s*([\s\S]+?)\.(?=\s*\n\s*\n|\s*$)/i.exec(info);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// ----------------------------------------------------------------- kind

/** Kind from OGLOSZENIE's structured "Typ nieruchomości <value>" field row,
 *  falling back to the whole OGLOSZENIE text, then TITLE, then INFORMACJA
 *  (INFORMACJA alone is the weakest signal — e.g. a sold flat's INFORMACJA
 *  says "nieruchomości lokalowej", which classify-kind doesn't recognise). */
export function kindFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  const typM = /Typ\s+nieruchomo[śs]ci\s+(.+)/i.exec(ogl);
  if (typM) {
    const k = classifyKind(typM[1]);
    if (k !== 'unknown') return k;
  }
  let k = classifyKind(ogl);
  if (k !== 'unknown') return k;
  k = classifyKind(section(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(section(text, 'INFORMACJA'));
}

// ----------------------------------------------------------------- address

/** Strip a leading "<locality>, " prefix off a Miejscowość field value,
 *  keeping only the "ul./al./pl./os. …" street clause (or null if the value
 *  has no street token at all — a land/obręb-only case). The period is
 *  OPTIONAL (matching core/normalize.js's own `ul\.?` convention) — a real
 *  live fixture OCR-dropped it ("Choszczno, ul Rycerska 2/4", round IV). */
function stripLocalityPrefix(raw) {
  if (!raw) return null;
  const m = /,\s*((?:ul|al|pl|os)\.?\s+.+)/i.exec(raw);
  if (m) return m[1].trim();
  if (/^\s*(?:ul|al|pl|os)\.?\s/i.test(raw)) return raw.trim();
  return null;
}

/**
 * Raw street address ("ul. Rycerska 2/4"). PRIMARY: OGLOSZENIE's structured
 * "Miejscowość Choszczno, ul. Rycerska 2/4" field. FALLBACK: the TITLE's
 * "… - Choszczno, ul. Fabryczna 5" tail (nominative, reliable, but the trailing
 * clause after the street varies — stop before common trailers so a run-on
 * garage/lease title like "ul. Obrońców Westerplatte na działkach …" doesn't
 * get vacuumed in whole). Returns null for land/obręb-only cases (by design —
 * see config.js scope note).
 * @param {string} text @returns {string|null}
 */
export function addressRawFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  const placeM = /Miejscowo[śs][ćc]\s+(.+)/i.exec(ogl);
  const fromOgl = placeM ? stripLocalityPrefix(placeM[1].trim()) : null;
  if (fromOgl) return fromOgl;

  const title = section(text, 'TITLE');
  const m = /\b((?:ul|al|pl|os)\.?\s+[^,]+?)(?=\s+(?:na\s+dzia[łl]|obr\.|obr[eę]b|gmina\b|stanow|wraz\b)|,|$)/i.exec(title);
  return m ? m[1].trim() : null;
}

// Unit floor area: OGLOSZENIE's free-text prose states it in at least THREE
// live phrasings — "o łącznej powi(e)rzchni 53,73 m2" (flats — sometimes
// OCR-mangled to "powieizchni"), "o pow. użytkowej ok. 460,89 m2" (houses,
// abbreviated, wraps onto the next line before the number), and "pow.
// użytkowej wynoszącej 126,87 m2" (a share-in-building sale, Poziomkowa 4 —
// an extra qualifier word "wynoszącej" between "użytkowej" and the number that
// the first two phrasings don't have). Rather than enumerate every qualifier
// word, the middle group accepts UP TO 3 generic lowercase-Polish-word
// "bridges" (each optionally trailing a period, for "ok.") between "pow…" and
// the number — bounded so it can't run away across unrelated later prose.
// Takes the FIRST overall match: for houses a SECOND, unrelated area
// (outbuilding footprint, e.g. "97,00 m2") follows later in the same clause
// and must not win.
const UNIT_AREA_RE = /\bpow\w*\.?\s*(?:[a-ząćęłńóśźż]+\.?\s+){0,3}?(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of the flat/house, or null. */
export function unitAreaFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  const m = UNIT_AREA_RE.exec(ogl);
  return m ? parseArea(m[1]) : null;
}

// Land parcel number: PRIMARY from the structured field-table row "Nr działki,
// obręb, udział   216, obr. 3, ..." / "Nr działki, obręb/ udział   48, ..."
// (Rycerska/Fabryczna-style template) — anchored on the literal ",obr" that
// immediately follows "działki" in that exact compound label, which a GENERIC
// prose mention of the same two words is very unlikely to reproduce.
// FALLBACK: the free-prose land template's "oznaczona działką nr 121/1" clause
// (Ogrodowa-style, no field table at all) — "nr" itself is optional since some
// titles/prose write "działka 213/5" with no "nr" between the noun and the
// number at all.
//
// Confirmed live (2026-07-10) that a naive "Nr działki" search is NOT safe:
// the wadium-payment instructions boilerplate ("...wpłata dotyczy (nr
// działki). W przypadku...") also contains the bare words "nr działki" and
// will feed a follow-a-newline-style regex complete garbage (a full sentence)
// as the "parcel number" — this is why the PRIMARY pattern requires the
// ",obręb" continuation and does not just look for "Nr działki" alone.
//
// Note: land is out of this adapter's primary scope (see config.js) — the
// live board mixes several PDF template generations for land (this function
// handles two; a multi-parcel numbered-list template seen live, e.g. "1)
// działka nr 1361, obr. 3 ... 2) działka nr 1363 ...", is NOT handled and
// returns null; that case's separate per-parcel result PDFs are also not
// named "informacja…" so crawl.js's routing does not pick them up either).
function parcelFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  let m = /Nr\s+dzia[łl]ki\s*,\s*obr[eę]b[^\n]*?(\d+(?:\/\d+)?)/i.exec(ogl);
  if (m) return m[1];
  m = /dzia[łl]k[ąa]\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)/i.exec(ogl);
  return m ? m[1] : null;
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending — no INFORMACJA yet) blob into a single
 * active record, or null. Land (kind 'grunt') → parcel-keyed record for
 * land.json; flats / houses → address-keyed record.
 * @param {string} text  blob from buildRecordText
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const address_raw = addressRawFromText(text);
    const dzialka_nr = parcelFromText(text);
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      area_m2: null,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED case blob (non-empty INFORMACJA) into a concluded
 * auction record. Returns 0 or 1 record (array = framework interface). Joins
 * its property by address (+ apt) + round in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date fallback (board row's publish date)
 * @param {string} sourceUrl  the informacja (or ogłoszenie) PDF URL — provenance
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!hasResolution(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);
  const buyer = sold ? buyerFromText(text) : null;

  if (kind === 'grunt') {
    const address_raw = addressRawFromText(text);
    const dzialka_nr = parcelFromText(text);
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_pdf: sourceUrl || null,
        kind: 'grunt',
        dzialka_nr,
        area_m2: null,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (negativeStated ? 'wynik negatywny' : 'unknown'),
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl || null,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : (negativeStated ? 'wynik negatywny' : 'unknown'),
      buyer,
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
