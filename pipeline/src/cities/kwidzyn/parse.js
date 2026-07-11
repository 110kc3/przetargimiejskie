// Kwidzyn parsers — BIP `bip.kwidzyn.pl` (Madkom "nowoczesny BIP", nv.pl domain).
// crawl.js drives the JSON API, downloads each notice's attached PDF, and — since
// those PDFs are the Burmistrz's SIGNED PAPER SCANS (image-only; pdftotext yields
// only \f) — OCRs them with core/ocr-pdf.js `ocrPdf` (tesseract -l pol). These
// parsers consume that OCR TEXT.
//
// Two document families, frequently BOTH on the same article's attachments:
//   * "… ogłasza <ordinal> przetarg ustny [nie]ograniczony na sprzedaż lokalu
//     mieszkalnego nr N … przy ul. X" (flat) / "… na sprzedaż nieruchomości
//     gruntowej niezabudowanej … przy ul. X" (land)  → announcement.
//   * "Informacja o wyniku przetargu" (a form with "cena wywoławcza" /
//     "najwyższa cena osiągnięta" / a "wynikiem negatywnym" line)  → result
//     (the achieved-price stream).
//
// KIND is decided by classifyKind(BODY), never a title/slug (ADAPTER-GUIDE §5):
// Kwidzyn sells FLATS (lokal mieszkalny → mieszkalny, address-keyed) and LAND
// (działki → grunt, parcel-keyed). Cloned from the `jarocin` analog; the generic
// Polish-notice helpers are ported and re-tuned to Kwidzyn's OCR reality:
//   - PRICES print with a dash for zero grosze — "400.000,- zł", "74.300, - zł"
//     (OCR sometimes spaces it) — so amountBeforeZl tolerates an optional ",-".
//   - AREA superscripts OCR unreliably ("116,70 m²" → "m?" / "m\"" / "m*"), so
//     the flat-area match keys off "pow. użytkowej <decimal>" and never requires
//     the ² glyph.
//   - The FLAT ADDRESS is taken from the BODY (both announcement and result
//     bodies write "przy ul. Chopina 34" + "lokal … nr 8"), NOT the article
//     title: the title is nominative ("Malborska 59/3") but the body is genitive
//     ("Malborskiej 59"), and only body-vs-body keys match so build-properties
//     can merge an announcement with its later result.
//   - RESULT auction dates sit in a scan table with no "w dniu" lead (flats:
//     "…przeprowadzonego przetargu: 27.03.2026"; land: "na dzień 29.05.2026"),
//     while "Wywieszono w dniu 03.04.2026" is only the posting date — so the
//     result-date anchors are explicit and never grab the posting date.
//
// Fixture groundtruth — real live scans OCR'd 2026-07-11 (see
// tests/parse-kwidzyn.test.js):
//   Chopina 34/8 (flat, round I): cena wyw. 400.000, auction 2026-03-27; its
//     round-I result = negatywny (brak chętnych); round-II result (2026-06-12)
//     also negatywny.
//   Malborska 59/3 (flat, round I): cena wyw. 74.300; result SOLD — osiągnięta
//     75.050, nabywca named.
//   Graniczna (land, round I): grunt niezabudowana, auction 2026-05-29.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Generic text helpers (ported from the jarocin/wolow analog family)
// ---------------------------------------------------------------------------

/** Diacritic-safe lowercase-fold so keyword regexes stay ASCII. */
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

/**
 * Polish price string → integer PLN. Handles space-thousands ("150 000"),
 * dot-thousands + comma-grosze ("320.800,00"), NBSP, and the dash-grosze form
 * ("400.000,-"). @param {string} s @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "0,0316" / "116,70" / "894" → number, or null. */
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Polish month names → number (genitive + nominative, diacritic + ASCII).
const PL_MONTHS = {
  stycznia: 1, styczen: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8, sierpień: 8,
  wrzesnia: 9, września: 9, wrzesien: 9, wrzesień: 9,
  pazdziernika: 10, października: 10, pazdziernik: 10, październik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * "27.03.2026" / "27.03.2026r." / "27 marca 2026" / "29 maja 2026 r." → ISO, or
 * null. A non-numeric / non-month token never matches, so a blank/garbled date
 * resolves to null rather than a fabricated guess. @param {string} s
 * @returns {string|null}
 */
export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) {
    const d = Number(num[1]), m = Number(num[2]);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return iso(num[3], m, d);
  }
  const word = /(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()] ?? PL_MONTHS[toAscii(word[2])];
    const d = Number(word[1]);
    if (mon && d >= 1 && d <= 31) return iso(word[3], mon, d);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Round + document classification
// ---------------------------------------------------------------------------

const PL_ORDINALS = { pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5, szost: 6 };
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

/**
 * Round of a przetarg, from a Polish ordinal word ("ogłasza PIERWSZY przetarg",
 * "TRZECIM przetargu", plural "TRZECICH przetargach") or a Roman numeral right
 * before "przetarg" ("II przetargu"). Word form is tried first (dominant on this
 * source); the Roman fallback is anchored just before "przetarg" so the Polish
 * conjunction "i" (and) can't be misread as Roman 1. @param {string} s
 * @returns {number|null}
 */
export function roundFromText(s) {
  const t = toAscii(s || '');
  const w = /\b(pierwsz|drug|trzec|czwart|piat|szost)\w*\s+przetarg/.exec(t);
  if (w) return PL_ORDINALS[w[1]] ?? null;
  const r = /\b(iv|iii|ii|vi|v|i)\s+przetarg/.exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  return null;
}

/** A cancellation ("… o odwołaniu przetargu") — never a listing/result.
 *  crawl.js already filters these by title; defensive here too. NB: the standing
 *  "Zastrzega się prawo odwołania przetargu" clause on EVERY announcement is not
 *  a cancellation, so we require the noun "odwołaniu/odwołany/odwołania" to be
 *  the SUBJECT ("o odwołaniu"/"odwołany"), not the reserved-right clause. */
export function isCancellation(title) {
  const t = toAscii(title || '');
  if (/zastrzega\s+si[ea]\s+prawo\s+odwolania/.test(t)) return false;
  return /o\s+odwolaniu|odwolan\w*\s+przetarg|uniewazni/.test(t);
}

// ---------------------------------------------------------------------------
// Subject extraction — flat (address) vs land (parcel)
// ---------------------------------------------------------------------------

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

// Street+building from the notice BODY: "…przy ul. Chopina 34 w Kwidzynie" /
// "ul. Malborskiej 59". Street group is lazy so the trailing building binds
// tightly; the "ul."/"przy ul." lead is dropped by core/normalize parseAddress.
const FLAT_SLASH_RE = new RegExp(
  `(?:przy\\s+ul\\.?|ul\\.|ulicy|Os\\.|Osiedle)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9.\\s]*?)\\s+(\\d+[A-Za-z]?)\\s*/\\s*(\\d+[A-Za-z]?)\\b`,
);
const FLAT_NOSLASH_RE = new RegExp(
  `(?:przy\\s+ul\\.?|ul\\.|ulicy|Os\\.|Osiedle)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9.\\s]*?)\\s+(\\d+[A-Za-z]?)\\b`,
);
// Apartment from the separate "lokal[u] [mieszkaln…] nr N" phrase.
const LOKAL_NR_RE = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;

/**
 * Flat address from the BODY (see file header for why not the title). Prefers a
 * "przedmiotem przetargu"/"lokal mieszkaln" window so the property street wins
 * over the office address ("ul. Warszawska 19"); falls back to a whole-body
 * scan. @param {string} text @returns {{address_raw:string, address:object}|null}
 */
function extractFlatAddress(text) {
  const body = String(text || '');
  // Restrict to the region from the first "lokal"/"nieruchomość" mention up to
  // (but not through) the auction-venue sentence, so "ul. Warszawska 19"
  // (venue) and the bank address are excluded.
  const start = body.search(/lokal|nieruchomo[śs]/i);
  const venue = body.search(/w\s+sali|siedzib\w*\s+urz[ęe]du|urz[ęe]du\s+miejskiego/i);
  const region = start >= 0
    ? body.slice(start, venue > start ? venue : start + 600)
    : body;

  for (const src of [region, body]) {
    const slash = FLAT_SLASH_RE.exec(src);
    if (slash) {
      const raw = `${slash[1].trim().replace(/\s+/g, ' ')} ${slash[2]}/${slash[3]}`;
      const address = parseAddress(raw);
      if (address) return { address_raw: raw, address };
    }
    const m = FLAT_NOSLASH_RE.exec(src);
    if (m) {
      const apt = (LOKAL_NR_RE.exec(src) || LOKAL_NR_RE.exec(body) || [])[1] || null;
      const street = m[1].trim().replace(/\s+/g, ' ');
      const raw = apt ? `${street} ${m[2]}/${apt}` : `${street} ${m[2]}`;
      const address = parseAddress(raw);
      if (address) return { address_raw: raw, address };
    }
  }
  return null;
}

// Town (nominative, best-effort) from "obręb <Name>" or "położonej w <Town>".
const OBREB_LABEL_RE = new RegExp(`obr[ęe]b\\w*\\s+([${PL_UP}][${PL_LOW}]+)`);
const POLOZ_TOWN_RE = new RegExp(`po[łl]o[żz]on\\w*\\s+w\\s+([${PL_UP}][${PL_LOW}]+)`);
function extractObreb(text) {
  const lbl = OBREB_LABEL_RE.exec(text);
  if (lbl) return lbl[1];
  const m = POLOZ_TOWN_RE.exec(text);
  return m ? m[1] : null;
}

// First/primary parcel: "działka nr 289/5", "działki: 373/12". Optional "a)"
// list-item / "ewidencyjn*" / "nr"/"numer". Kwidzyn land notices are scan
// TABLES whose parcel numbers OCR unreliably and often sit far from the word
// "działka" — so this can legitimately return null for land (documented; such
// records self-drop, they never enter land.json as garbage).
const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:ewidencyjn\w*\s+)?(?:nr\.?|numer)?\s*:?\s*(?:[-–]\s*|[a-z]\)\s*)?(\d+(?:\/\d+)?)/i;

/** @returns {{dzialka_nr:string|null, count:number}} */
function extractDzialki(text) {
  const first = DZIALKA_RE.exec(text);
  if (!first) return { dzialka_nr: null, count: 0 };
  const all = new Set();
  for (const m of text.matchAll(/\b(\d{1,4}\/\d{1,4})\b/g)) all.add(m[1]);
  return { dzialka_nr: first[1], count: Math.max(all.size, 1) };
}
// NB: extractDzialki anchors on the word "działka", so a KW number like
// "GD11/00007594/4" is never mistaken for a "289/5"-style parcel.

// ---------------------------------------------------------------------------
// Area / price / date fields
// ---------------------------------------------------------------------------

/**
 * Area in m². Flats: the labelled "pow. użytkowej <decimal>" (never requires the
 * OCR-mangled ² glyph). Land: "o pow. X ha" ×10000, else best-effort "X m²",
 * else null (Kwidzyn land tables frequently defeat OCR). @returns {number|null}
 */
function extractArea(text, kind) {
  if (kind === 'grunt') {
    const ha = /o\s+pow\w*\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(text);
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
    const m2 = /o\s+pow\w*\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
    return m2 ? parseArea(m2[1]) : null;
  }
  // Flat / house / commercial — the "łączna pow. użytkowa <decimal>" figure.
  const uzyt = /u[żz]ytkow\w*[^\d]{0,12}(\d+[.,]\d+)/i.exec(text);
  if (uzyt) return parseArea(uzyt[1]);
  const bare = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?[^\d]{0,12}(\d+[.,]\d+)/i.exec(text);
  return bare ? parseArea(bare[1]) : null;
}

/** Amount immediately before "zł", tolerating a "…,- " dash-grosze form. */
function amountBeforeZl(region) {
  const m = /([\d][\d\s.,]*\d|\d)\s*(?:[,.]\s*-)?\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/** "Cena wywoławcza … wynosi 400.000,- zł" (flat) / "1) cena wywoławcza 1)
 *  74.300,- zł" (result) / "…150 000 zł" (land table). @returns {number|null} */
function extractStartingPrice(text) {
  const t = toAscii(text);
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx >= 0) {
    const p = amountBeforeZl(text.slice(idx, idx + 160));
    if (p != null) return p;
  }
  return null;
}

/** "najwyższa cena osiągnięta … 75.050,- zł" — the hammer price when it sold.
 *  @returns {number|null} */
function extractFinalPrice(text) {
  const t = toAscii(text);
  let idx = t.search(/najwy[żz]sza\s+cena\s+osiagni[ea]t/);
  if (idx < 0) idx = t.search(/cena\s+osiagni[ea]t/);
  if (idx < 0) idx = t.search(/uzyskano\s+cen\w*\s+w\s+wysokosci/);
  if (idx < 0) return null;
  return amountBeforeZl(text.slice(idx, idx + 120));
}

/** Announcement auction date. Flats say "…do wzięcia udziału w przetargu w dniu
 *  <date>"; land says "Przetarg odbędzie się [w dniu] <date>". Both are anchored
 *  explicitly so the wadium deadline / viewing date / pre-emption deadline never
 *  win. @returns {string|null} */
function extractAnnounceDate(text) {
  const flat = /w\s+przetargu\s+w\s+dniu\b/i.exec(text);
  if (flat) {
    const d = parseDateText(text.slice(flat.index, flat.index + 60));
    if (d) return d;
  }
  const land = /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]/i.exec(text);
  if (land) {
    const d = parseDateText(text.slice(land.index, land.index + 60));
    if (d) return d;
  }
  return null;
}

/** Result auction date. Flat result table: "…rodzaj przeprowadzonego przetargu:
 *  27.03.2026"; land result: "na dzień 29.05.2026". Never "Wywieszono w dniu
 *  03.04.2026" (the posting date). @returns {string|null} */
function extractResultDate(text) {
  const naDzien = /na\s+dzie[ńn]\s/i.exec(text);
  if (naDzien) {
    const d = parseDateText(text.slice(naDzien.index, naDzien.index + 40));
    if (d) return d;
  }
  const przepr = /przeprowadzonego/i.exec(text);
  if (przepr) {
    const d = parseDateText(text.slice(przepr.index, przepr.index + 60));
    if (d) return d;
  }
  return null;
}

// Unsold markers (any → outcome unsold) + reason. "wynikiem negatywnym" and
// "brak chętnych" are the Kwidzyn forms; the rest are generic backstops.
const UNSOLD_RE = /wynik\w*\s+negatywn|brak\s+ch[ęe]tnych|nie\s+wy[łl]oniono|niewstawieni|nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik)|nikt\s+nie\s+przyst/i;

// ---------------------------------------------------------------------------
// Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one announcement PDF's OCR TEXT into a listing record. `title` is the
 * article title (used only as a round fallback + carried as a note-free hint);
 * `sourceUrl` is the attachment PDF's URL. @returns {object}
 */
export function parseAnnouncement(text, title, sourceUrl) {
  const body = String(text || '');
  const kind = classifyKind(body || title || '');
  const round = roundFromText(body) ?? roundFromText(title);
  const area_m2 = extractArea(body, kind);
  const starting_price_pln = extractStartingPrice(body);
  const auction_date = extractAnnounceDate(body);

  if (kind === 'grunt') {
    const { dzialka_nr, count } = extractDzialki(body);
    const obreb = extractObreb(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    const notes = count > 1 ? [`parse: multi-parcel notice (${count} działki) — primary parcel only`] : [];
    return {
      kind, address_raw: parts.length ? parts.join(', ') : null, address: null,
      dzialka_nr, obreb, area_m2, starting_price_pln, auction_date, round,
      detail_url: sourceUrl, notes,
    };
  }
  // Flat / house / commercial — address-keyed, from the BODY.
  const found = extractFlatAddress(body);
  return {
    kind,
    address_raw: found ? found.address_raw : null,
    address: found ? found.address : null,
    dzialka_nr: null,
    obreb: null,
    area_m2, starting_price_pln, auction_date, round,
    detail_url: sourceUrl,
    notes: [],
  };
}

/**
 * Parse one "Informacja o wyniku przetargu" PDF's OCR TEXT into result
 * record(s) — the achieved-price stream. Registry contract:
 * (text, fallbackDate, sourceUrl). Returns [] for a non-result / cancellation /
 * empty input, or a subject-less record (e.g. an OCR-garbled land table).
 * @param {string} text @param {string|null} fallbackDate @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const body = String(text || '');
  if (!body.trim()) return [];
  const isResult =
    /informacj\w*\s+o\s+wynik/i.test(body) ||
    /cena\s+osi[ąa]gni[ęe]t/i.test(body) ||
    UNSOLD_RE.test(body);
  if (!isResult) return [];
  if (isCancellation(body.slice(0, 400))) return [];

  const kind = classifyKind(body);
  const round = roundFromText(body);
  const auction_date = extractResultDate(body) || fallbackDate || null;
  const starting_price_pln = extractStartingPrice(body);
  const final_price_pln = extractFinalPrice(body);
  const unsold = UNSOLD_RE.test(body);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/brak\s+ch[ęe]tnych/i.test(body) ? 'brak chętnych'
      : /wadium/i.test(body) && /brak\s+wp[łl]at|nie\s+wp[łl]ac/i.test(body) ? 'brak wpłaty wadium'
      : /niewstawieni|nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik)/i.test(body) ? 'brak uczestników'
      : 'wynik negatywny')
    : null;

  let address = null, address_raw = null, dzialka_nr = null, obreb = null;
  if (kind === 'grunt') {
    const d = extractDzialki(body);
    dzialka_nr = d.dzialka_nr;
    obreb = extractObreb(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    address_raw = parts.length ? parts.join(', ') : null;
  } else {
    const found = extractFlatAddress(body);
    if (found) { address = found.address; address_raw = found.address_raw; }
  }
  if (!address && !dzialka_nr) return [];

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    kind, address_raw, address, dzialka_nr, obreb,
    area_m2: extractArea(body, kind),
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    auction_date, round, outcome, unsold_reason,
    source_pdf: sourceUrl,
    notes,
  }];
}
