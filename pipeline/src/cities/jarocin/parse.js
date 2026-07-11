// Jarocin parsers — WOKISS BIP (`bip2.wokiss.pl/jarocin`, mirror
// `www.wokiss.pl/jarocin`). The board `Przetargi na sprzedaż nieruchomości`
// is a year-indexed HTML menu; each notice is a `?pid=N` page whose real
// content is a single attached **born-digital text PDF** (pdftotext -layout,
// no OCR — confirmed live 2026-07-11 on 6 real PDFs). crawl.js fetches the
// PDFs (core/pdf-text.js `pdfText`) and hands their TEXT to these parsers.
//
// Two document families on the same board:
//   * "Ogłoszenie [o] <ordinal> przetargu ustnym [nie]ograniczonym na sprzedaż
//     nieruchomości ..."  → announcement (crawlActive listings).
//   * "Informacja o wyniku [<ordinal>] przetargu ..."           → result
//     (the achieved-price stream — parseResultDoc).
// Skipped upstream in crawl.js: "Informacja o odwołaniu ..." (cancellation),
// "Ogłoszenie kwalifikacyjne ..." (restricted-tender qualification list).
//
// KIND is decided by classifyKind(BODY), never the title/URL slug (per
// ADAPTER-GUIDE §5): the gmina sells mostly LAND (grunt — działki, one notice
// can list 20+ parcels) with the occasional flat (nieruchomość lokalowa →
// mieszkalny, address-keyed). For land, the record is parcel-keyed on the
// FIRST/primary działka + obręb (build-land.js keys primarily on dzialka_nr;
// a multi-parcel notice yields one representative record + a `notes` marker —
// a documented residual, not a bug).
//
// Round is a Polish ORDINAL WORD ("OGŁASZA TRZECI PRZETARG", "przeprowadzony
// został pierwszy przetarg") more often than a Roman numeral ("wyniku I
// przetargu") — roundFromText handles both. Dates come BOTH as Polish month
// words ("8 maja 2025 r.", announcements) and numeric ("w dniu 20.03.2025 r.",
// results) — parseDateText handles both.
//
// Fixture groundtruth (real live PDFs fetched 2026-07-11 from this Pi's Polish
// IP — see tests/parse-jarocin.test.js):
//   Flat announce (Os. Konstytucji 3 Maja 20/17, 68,30 m², round III):
//     ogloszenie-przetarg-lokal-konstytucji-17.03.2025.pdf — cena wywoławcza
//     320.800,00 zł, auction 8 maja 2025 (later ODWOŁANY — cancellation is a
//     separate pid the crawler skips).
//   Result SOLD (ul. St. Mikołajczyka, dz. 592/42, round I):
//     wynik-przetargu-dz.-592-42-jarocin.pdf — cena wyw. 23.000, osiągnięta
//     23.230, nabywca named, auction 20.03.2025.
//   Result UNSOLD (Witaszyce ul. Słonecznej, dz. 1267/7, round I):
//     informacja-o-wyniku... — cena wyw. 251.300, "wynikiem negatywnym"
//     (niewstawienie się oferenta), auction 29.05.2025.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared text helpers (generic Polish-municipal-notice utilities, ported from
// the wolow/brzeg analog family and re-verified against Jarocin's real PDFs)
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
 * Polish price string → integer PLN. Handles space-thousands ("50 000"),
 * dot-thousands + comma-grosze ("320.800,00", "2.323.300,00"), NBSP, and a
 * trailing grosze fraction. Ported verbatim from the wolow analog.
 * @param {string} s @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "0,1296" / "0.1296" / "68,30" → number, or null. */
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
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
 * "20.03.2025" / "20.03.2025r." / "8 maja 2025" / "27 sierpnia 2025 r." → ISO,
 * or null. A non-numeric / non-month token never matches, so a blank/garbled
 * date resolves to null rather than a fabricated guess.
 * @param {string} s @returns {string|null}
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
 * Round of a przetarg, from a Polish ordinal word ("PIERWSZY/drugiego/trzecim
 * ... przetarg") or a Roman numeral immediately before "przetarg" ("I
 * przetargu"). Word form is tried first (dominant on this source); the Roman
 * fallback is anchored right before "przetarg" so the Polish conjunction "i"
 * (and) can't be misread as Roman 1. @param {string} s @returns {number|null}
 */
export function roundFromText(s) {
  const t = toAscii(s || '');
  const w = /\b(pierwsz|drug|trzec|czwart|piat|szost)\w*\s+przetarg/.exec(t);
  if (w) return PL_ORDINALS[w[1]] ?? null;
  const r = /\b(iv|iii|ii|vi|v|i)\s+przetarg/.exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  return null;
}

/** A cancellation ("Informacja o odwołaniu ...") — never a listing/result.
 *  crawl.js already filters these at discovery via the title; defensive here. */
export function isCancellation(title) {
  return /odwo[łl]a/i.test(title || '');
}

// ---------------------------------------------------------------------------
// Subject extraction — flat (address) vs land (parcel)
// ---------------------------------------------------------------------------

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

// Flat address, e.g. "Os. Konstytucji 3 Maja 20/17" / "przy ul. Kwiatowa 5/2".
// The street name group is lazy so the trailing "<bldg>/<apt>" binds tightly;
// it tolerates an embedded number ("3 Maja"). The "Os."/"ul." lead is dropped
// by core/normalize.js parseAddress (STRIP_LEAD).
const FLAT_SLASH_RE = new RegExp(
  `(?:Os\\.|Osiedle|ul\\.|ulicy|przy\\s+ul\\.?)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9.\\s]*?)\\s+(\\d+[A-Za-z]?)\\s*/\\s*(\\d+[A-Za-z]?)\\b`,
);
// Fallback: street+building with the apartment stated separately as
// "lokal mieszkalny nr N".
const FLAT_NOSLASH_RE = new RegExp(
  `(?:Os\\.|Osiedle|ul\\.|ulicy|przy\\s+ul\\.?)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9.\\s]*?)\\s+(\\d+[A-Za-z]?)\\b`,
);
const LOKAL_NR_RE = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;

/**
 * @param {string} text @returns {{address_raw:string, address:object}|null}
 */
function extractFlatAddress(text) {
  const slash = FLAT_SLASH_RE.exec(text);
  if (slash) {
    const raw = `${slash[1].trim().replace(/\s+/g, ' ')} ${slash[2]}/${slash[3]}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  const m = FLAT_NOSLASH_RE.exec(text);
  if (m) {
    const apt = (LOKAL_NR_RE.exec(text) || [])[1] || null;
    const raw = apt ? `${m[1].trim().replace(/\s+/g, ' ')} ${m[2]}/${apt}` : `${m[1].trim().replace(/\s+/g, ' ')} ${m[2]}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  return null;
}

// Locative → nominative for this gmina's places. Map covers the observed
// towns; ending rules cover the rest; unknown forms fall through as-is (obręb
// is a best-effort disambiguator — build-land.js keys primarily on dzialka_nr).
const TOWN_MAP = {
  jarocinie: 'Jarocin', witaszycach: 'Witaszyce', siedleminie: 'Siedlemin',
  potarzycy: 'Potarzyca', luszczanowie: 'Łuszczanów', wilkowyi: 'Wilkowyja',
  cielczy: 'Cielcza', golinie: 'Golina', bachorzewie: 'Bachorzew',
  mieszkowie: 'Mieszków', roszkowie: 'Roszków', prusach: 'Prusy',
  tarcach: 'Tarce', radlinie: 'Radlin', zakrzewie: 'Zakrzew',
};
function nominativeTown(loc) {
  if (!loc) return null;
  const raw = loc.trim();
  const key = toAscii(raw);
  if (TOWN_MAP[key]) return TOWN_MAP[key];
  if (/inie$/i.test(raw)) return raw.replace(/inie$/i, 'in');
  if (/owie$/i.test(raw)) return raw.replace(/owie$/i, 'ów');
  if (/ycach$/i.test(raw)) return raw.replace(/ycach$/i, 'yce');
  if (/ycy$/i.test(raw)) return raw.replace(/ycy$/i, 'yca');
  return raw;
}

const OBREB_LABEL_RE = new RegExp(`obr[ęe]b\\w*\\s+([${PL_UP}][${PL_LOW}]+)`);
const POLOZ_TOWN_RE = new RegExp(
  `po[łl]o[żz]on\\w*\\s+w\\s+([${PL_UP}][${PL_LOW}]+)`,
);

/** Town (nominative, best-effort) from an explicit "obręb <Name>" label, else
 *  the locative "położonej w <Town>" de-inflected. @returns {string|null} */
function extractObreb(text) {
  const lbl = OBREB_LABEL_RE.exec(text);
  if (lbl) return lbl[1];
  const m = POLOZ_TOWN_RE.exec(text);
  return m ? nominativeTown(m[1]) : null;
}

// First/primary parcel: "działka nr 592/42", "działki: a) 415/3", "działki
// ewidencyjne nr: - 2322/2". Optional "a)" list-item prefix, optional
// "ewidencyjn*", "nr"/"numer".
const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:ewidencyjn\w*\s+)?(?:nr\.?|numer)?\s*:?\s*(?:[-–]\s*|[a-z]\)\s*)?(\d+(?:\/\d+)?)/i;

/** @returns {{dzialka_nr:string|null, count:number}} */
function extractDzialki(text) {
  const first = DZIALKA_RE.exec(text);
  if (!first) return { dzialka_nr: null, count: 0 };
  // Count distinct parcel numbers mentioned (for the multi-parcel note).
  const all = new Set();
  for (const m of text.matchAll(/\b(\d{1,4}\/\d{1,4})\b/g)) all.add(m[1]);
  return { dzialka_nr: first[1], count: Math.max(all.size, 1) };
}

// ---------------------------------------------------------------------------
// Area / price / date fields
// ---------------------------------------------------------------------------

/** @param {string} text @param {string} kind @returns {number|null} */
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
  // Flat/house/commercial: prefer the labelled "Powierzchnia lokalu X m²",
  // else "powierzchni(a) użytkowa X m²", else first bare "X m²".
  const lokal = /powierzchni\w*\s+lokalu\s+([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (lokal) return parseArea(lokal[1]);
  const uzyt = /powierzchni\w*\s+u[żz]ytkow\w*[^\d]{0,20}([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (uzyt) return parseArea(uzyt[1]);
  const bare = /\bo\s+pow\w*\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  return bare ? parseArea(bare[1]) : null;
}

/** Amount immediately before "zł" inside a text region. */
function amountBeforeZl(region) {
  const m = /([\d][\d\s .,]*\d|\d)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/** "cena wywoławcza ... wynosiła: X zł" (results), "CENA WYWOŁAWCZA: X zł"
 *  (land announce), or a bare "Cena ... X zł brutto" (flat announce table). */
function extractStartingPrice(text) {
  const t = toAscii(text);
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx >= 0) {
    const p = amountBeforeZl(text.slice(idx, idx + 140));
    if (p != null) return p;
  }
  const brutto = /([\d][\d\s .,]*\d)\s*z[łl]\s*brutto/i.exec(text);
  return brutto ? parsePLN(brutto[1]) : null;
}

/** "uzyskano cenę w wysokości X zł" / "cena osiągnięta w przetargu wynosi: X
 *  zł" — the hammer price when the auction sold. @returns {number|null} */
function extractFinalPrice(text) {
  const t = toAscii(text);
  let idx = t.search(/uzyskano\s+cen\w*\s+w\s+wysokosci/);
  if (idx < 0) idx = t.search(/cena\s+osiagni[ęe]t\w*/);
  if (idx < 0) idx = t.search(/osiagni[ęe]t\w*\s+cen/);
  if (idx < 0) return null;
  return amountBeforeZl(text.slice(idx, idx + 120));
}

/** Announcement auction date: "Przetarg ... odbędzie się [dnia] <date>" — the
 *  date can sit a line or two away (land template), so scan a wide window and
 *  take the first parseable date. @returns {string|null} */
function extractAnnounceDate(text) {
  const idx = text.search(/odb[ęe]dzie\s+si[ęe]/i);
  if (idx < 0) return null;
  return parseDateText(text.slice(idx, idx + 220));
}

/** Result auction date: "w dniu <date>" in the body, else the title's "z dnia
 *  <date>". A window is sliced and handed to parseDateText, so a dotted
 *  numeric date ("20.03.2025") is captured whole. @returns {string|null} */
function extractResultDate(text, title) {
  const bi = (text || '').search(/w\s+dniu\s/i);
  if (bi >= 0) {
    const d = parseDateText(text.slice(bi, bi + 45));
    if (d) return d;
  }
  const ti = (title || '').search(/z\s+dnia\s/i);
  if (ti >= 0) return parseDateText(title.slice(ti, ti + 45));
  return null;
}

// Unsold markers (any → outcome unsold) + the reason.
const UNSOLD_RE = /wynik\w*\s+negatywn|niewstawieni|nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik|os[óo]b\s+dopuszczon)|nie\s+wp[łl]ac|brak\s+wp[łl]at\s+wadium|nie\s+wy[łl]oniono|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywn/i;

// ---------------------------------------------------------------------------
// Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one announcement PDF's TEXT into a listing record. `title` is the
 * notice title from the year-index list (carries the clean flat address);
 * `sourceUrl` is the PDF's URL. @returns {object}
 */
export function parseAnnouncement(text, title, sourceUrl) {
  const body = String(text || '');
  const kind = classifyKind(body || title || '');
  const round = roundFromText(title) ?? roundFromText(body);
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
  // Flat / house / commercial — address-keyed. Try the title first (cleanest),
  // then the body's "Położenie" line.
  const found = extractFlatAddress(title || '') || extractFlatAddress(body);
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
 * Parse one "Informacja o wyniku przetargu" PDF's TEXT into result record(s)
 * — the achieved-price stream. Registry contract: (text, fallbackDate,
 * sourceUrl). Returns [] for a non-result / cancellation / empty input.
 * @param {string} text @param {string|null} fallbackDate @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const body = String(text || '');
  if (!body.trim()) return [];
  const isResult =
    /informacj\w*\s+o\s+wynik/i.test(body) ||
    /uzyskano\s+cen/i.test(body) ||
    /cena\s+osi[ąa]gni[ęe]t/i.test(body) ||
    UNSOLD_RE.test(body);
  if (!isResult) return [];
  if (isCancellation(body.slice(0, 400))) return [];

  const title = ''; // result title carries no field the body lacks
  const kind = classifyKind(body);
  const round = roundFromText(body);
  const auction_date = extractResultDate(body, title) || fallbackDate || null;
  const starting_price_pln = extractStartingPrice(body);
  const final_price_pln = extractFinalPrice(body);
  const unsold = UNSOLD_RE.test(body);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/wadium/i.test(body) && /brak\s+wp[łl]at|nie\s+wp[łl]ac/i.test(body) ? 'brak wpłaty wadium'
      : /niewstawieni|nie\s+przyst[ąa]pi[łl]/i.test(body) ? 'brak uczestników'
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
  const dcount = extractDzialki(body).count;
  if (dcount > 1) notes.push(`parse: multi-parcel result (${dcount} działki) — primary parcel + first stated price only`);
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
