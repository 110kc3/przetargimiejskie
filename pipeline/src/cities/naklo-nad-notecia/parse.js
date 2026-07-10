// Nakło nad Notecią parsers.
//
// Nakło's BIP (Logonet eUrząd, same CMS + URL scheme as Chełmno) exposes every
// auction as a structured XML record: adres-nieruchomosci, przetarg-na (a LONG
// free-text sale description — round, address, area, room breakdown — there is
// no separate short summary), typ-przetargu, rodzaj-nieruchomosci,
// cena-wywolawcza, data-przetargu, and a <zalaczniki> attachment list. UNLIKE
// Chełmno, there is NO inline <rozstrzygniecie> — <tresc> is always empty and
// the achieved-price / negative outcome is published as a SEPARATE attachment
// named "Informacja o wyniku przetargu" / "... rokowań" (crawl.js finds it in
// <zalaczniki>, fetches it — pdfText, falling back to docText for the mixed
// .docx notices — and folds the extracted text into this blob as WYNIK).
// crawl.js assembles every record into ONE labelled text blob via
// buildRecordText() (below); every parse function reads that blob. The test
// builds the SAME blob from the real captured field strings (+ real captured
// result-document text), so the parsers are groundtruthed against live data
// without re-fetching.
//
// Active-vs-concluded is decided by WYNIK: EMPTY while pending (→ announcement
// / active listing — crawl.js only sets it when a result attachment exists),
// FILLED once a result was found and extracted (→ result / achieved price or
// negative outcome).
//
// All regexes groundtruthed against live records (verified 2026-07-10):
//   FLAT pending (round III):  record 7659  ul. gen. H. Dąbrowskiego 29/15
//     przetarg-na "Trzeci przetarg ustny nieograniczony na sprzedaż lokalu
//     mieszkalnego nr 15 położonego przy ulicy Gen. H. Dąbrowskiego 29 w Nakle
//     nad Notecią ... Lokal mieszkalny o powierzchni użytkowej 32,58 m2 ...";
//     cena-wywolawcza "80.945,00 zł"; data-przetargu "31 .07 .2026 godz. 10:00".
//   FLAT unsold (round I):     record 7213  ul. gen. H. Dąbrowskiego 44/6
//     WYNIK (docx) "... stwierdziła, że nie zostało wpłacone w określonej
//     wysokości i terminie wadium ... a więc przetarg zakończył się wynikiem
//     negatywnym."
//   FLAT sold (rokowania II):  record 7418  ul. Działkowa 8/29, Potulice
//     WYNIK (pdf) "Do rokowań przystąpił 1 oferent. ... Cena wywoławcza
//     nieruchomości – 176.738,00 zł. W wyniku przeprowadzonych rokowań
//     nabywcą nieruchomości została: Wiktoria Sobiech która zaproponowała
//     cenę nabycia przedmiotowej nieruchomości w wysokości 177.000,00 zł."
//     (rokowania phrasing: "w wysokości X zł", NOT Chełmno's "za cenę X zł")
//   LAND sold (plain przetarg): record 1570  dz. 1554/5 i in., obręb Paterek
//     WYNIK (pdf) "Cena wywoławcza nieruchomości – 2 302 240,00 złotych. W
//     wyniku licytacji nabywcą nieruchomości został: Przedsiębiorstwo
//     Handlowo-Produkcyjne Eksport-Import Włodzimierz Kawczyński, za cenę
//     2 326 240,00 złotych." (plain-przetarg phrasing: "za cenę X złotych",
//     space-thousands + spelled-out "złotych" rather than the "zł" abbrev)
//   LEASE (najem, skipped): record 3155/3156/4401 "Nieruchomość zabudowana"
//     garaże/pomieszczenia gospodarcze — przetarg-na "... na najem murowanego
//     garażu ...", cena "... zł brutto/rocznie" — never reach parseAnnouncement.
//
// The przetarg-na free text is the ONLY body text Nakło publishes inline (no
// "ogłasza <ORDINAL> przetarg" preamble, no prior-round history trap like
// Chełmno's tresc) — it opens DIRECTLY with the ordinal ("Trzeci przetarg
// ustny nieograniczony na sprzedaż ...", "Drugie rokowania po pierwszych
// rokowaniach zakończonych wynikiem negatywnym ..."), so the round anchor is
// simpler: match the ordinal at the START of the field.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ------------------------------------------------------------------ numbers

// "70.000" / "29.000,00" / "1 000 000,00 zł" / "2 326 240,00" -> integer PLN.
// Dot OR (regular/NBSP) space thousands separator; optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "27,67" / "25,89" / "13.10" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML/CDATA fragment OR a plain extracted-document string to a
 *  single line of plain text. Safe to run on already-plain text (pdftotext /
 *  docText output) — the HTML-specific replacements are harmless no-ops there,
 *  and the whitespace/newline collapse is exactly what's needed so a WYNIK
 *  value (which is a multi-paragraph document) survives as one blob line. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * already-stripped field strings (+ the fetched result-attachment text as
 * `wynik`, only when a result was found); the test passes the raw captured
 * strings and lets stripHtml run. One line per field so `^LABEL:` (multiline)
 * reads each. `tresc` is folded into the PRZETARGNA line (Nakło's <tresc> is
 * observed always-empty, but kept defensively rather than dropped).
 * @param {{adres?:string, rodzaj?:string, cena?:string, data?:string,
 *   typ?:string, wynik?:string, przetargNa?:string, tresc?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  const przetargNa = [stripHtml(f.przetargNa), stripHtml(f.tresc)].filter(Boolean).join(' ');
  return [
    `ADRES: ${stripHtml(f.adres)}`,
    `RODZAJ: ${stripHtml(f.rodzaj)}`,
    `CENA: ${stripHtml(f.cena)}`,
    `DATA: ${stripHtml(f.data)}`,
    `TYP: ${stripHtml(f.typ)}`,
    `WYNIK: ${stripHtml(f.wynik)}`,
    `PRZETARGNA: ${przetargNa}`,
  ].join('\n');
}

/** Read a single labelled line's value from the blob. The inter-label gap is
 *  matched with [ \t]* (NOT \s*) so an EMPTY field can't let the match slide
 *  across the newline and capture the next label's line. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

// ----------------------------------------------------------------- doc-type gate

/** A record is CONCLUDED when its WYNIK (the fetched "Informacja o wyniku ..."
 *  attachment text) is non-empty. crawl.js only populates WYNIK when it found
 *  such an attachment AND extracted it successfully — so empty ⇒ either still
 *  pending, or no result has been posted yet. */
export function hasResolution(text) {
  return field(text, 'WYNIK').length > 0;
}

/** True when this record is a DZIERŻAWA / NAJEM (a lease, not a sale) — the
 *  "Nieruchomość zabudowana" garaże/pomieszczenia gospodarcze records observed
 *  so far are all multi-year najem/dzierżawa with a "zł .../rocznie" or
 *  "zł ... miesięcznie" price. Skipped in crawl (checked before the result
 *  attachment is even fetched). */
export function isLease(text) {
  const t = text || '';
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$|rocznie\s*$/im.test(t);
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

/** Map a captured ordinal token (Roman OR a Polish word, any declension) to a
 *  round number via prefix match, or null. */
function ordinalToRound(token) {
  const r = romanToInt(token);
  if (r) return r;
  const key = token.toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  return null;
}

/**
 * Auction/rokowania round. PRIMARY: Nakło's przetarg-na usually opens DIRECTLY
 * with the ordinal ("Trzeci przetarg ustny nieograniczony na sprzedaż ...",
 * "Drugie rokowania po pierwszych rokowaniach ..." — no "ogłasza" preamble and
 * no prior-round history trap like Chełmno's tresc), so the anchor is simply
 * "^<ORDINAL> (przetarg|rokowani)" — Roman numeral first, then the word
 * ordinal (both masculine "drugi przetarg" and neuter/plural "drugie
 * rokowania" forms match via the shared prefix). FALLBACK: some
 * przetarg-na openers don't state a round at all ("Z zasobu nieruchomości,
 * stanowiących własność Gminy ... przeznacza się do sprzedaży ..." — observed
 * on land records) — WYNIK (once concluded) restates it in a "przeprowadzony
 * został <ORDINAL> przetarg" / "przeprowadzone zostały <ORDINAL> rokowania"
 * clause, which we anchor on instead. Returns null when unstated everywhere.
 */
export function roundFromText(text) {
  const na = field(text, 'PRZETARGNA');
  let m = /^\s*([IVXL]{1,5})\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  m = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  const wynik = field(text, 'WYNIK');
  m = /przeprowadzon\w*\s+zosta[łl]\w*\s+([IVXL]{1,5}|pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+(?:przetarg|rokowani)/i.exec(wynik);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  return null;
}

// ----------------------------------------------------------------- date

/**
 * Auction date. PRIMARY: the structured data-przetargu field ("31
 * .07                        .2026  godz. 10:00" — same spaced-dot format as
 * Chełmno). FALLBACK: a "w dniu D month YYYY" clause in przetarg-na, if ever
 * present (not observed live — Nakło's przetarg-na does not restate the date
 * in prose — kept defensively). -> ISO / null.
 */
export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const na = field(text, 'PRZETARGNA');
  m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(na);
  if (m) {
    const PL_MONTH = {
      stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
      lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
      'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
    };
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. PRIMARY: the LEADING number in the structured
 *  cena-wywolawcza field — the currency suffix is inconsistent across records
 *  ("80.945,00 zł" / "731.800,00 zł brutto" both have it, but older land
 *  records observed live have "212.085,60" bare or "182.615,00 brutto" / "277
 *  894,00 brutto" with NO "zł" at all) so the number is anchored at the START
 *  of the field rather than requiring a "zł" terminator. Nakło's przetarg-na
 *  free text does NOT state "Cena wywoławcza wynosi X" inline like Chełmno's
 *  tresc does, so the field is the reliable source either way. FALLBACK: a
 *  "cena wywoławcza wynosi X zł" clause in przetarg-na, kept defensively in
 *  case a record ever states it inline. */
export function startingPriceFromText(text) {
  const cena = field(text, 'CENA');
  let m = /^(\d[\d. ]*(?:,\d{2})?)/.exec(cena);
  if (m) return parsePLN(m[1]);
  const na = field(text, 'PRZETARGNA');
  m = /cena\s+wywo[łl]awcza[^.]{0,20}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(na);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY from WYNIK, and ONLY when a buyer is named
 *  ("nabywcą ... został/-a ..."). Nakło uses TWO phrasings depending on the
 *  track: plain przetarg — "za cenę 2 326 240,00 złotych" / "za cenę: 900
 *  000,00 złotych" (space-thousands, spelled-out "złotych"; the colon is
 *  sometimes present, sometimes not — both observed live); rokowania — "...
 *  w wysokości 177.000,00 zł" (after "zaproponowała cenę nabycia ..."). A
 *  numeric value ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (!/nabywc/i.test(wynik)) return null;
  let m = /za\s+cen[ęe]\s*:?\s*(\d[\d.,\s]*\d)\s*z[łl]\w*/i.exec(wynik);
  if (!m) m = /w\s+wysoko[śs]ci\s*:?\s*(\d[\d.,\s]*\d)\s*z[łl]\w*/i.exec(wynik);
  return m ? parsePLN(m[1]) : null;
}

/** True when WYNIK explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const wynik = field(text, 'WYNIK');
  return /wynikiem\s+negatywnym|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano/i.test(wynik);
}

// ----------------------------------------------------------------- kind

/** Kind from the "Rodzaj nieruchomości" field, falling back to the przetarg-na
 *  sale clause. "Nieruchomość niezabudowana" → grunt (land.json); "Lokal
 *  mieszkalny" → mieszkalny; "Nieruchomość zabudowana" → zabudowana (built
 *  property — in practice always a lease here, filtered by isLease first). */
export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  return classifyKind(field(text, 'PRZETARGNA'));
}

// ----------------------------------------------------------------- address

/** Clean the raw adres-nieruchomosci to a "<street> <bldg>[/<apt>]" string.
 *  Unlike Chełmno (a single-town gmina where the city name is stripped by
 *  name), Nakło is a gmina miejsko-wiejska whose flats sit in the town itself
 *  OR in villages (Potulice, Paterek, ...) — every observed address value has
 *  the shape "<street details>, <locality>" (locality ALWAYS last, after the
 *  final comma: "ul. gen. H. Dąbrowskiego 29/15, Nakło nad Notecią" / "ul.
 *  Szkolna 3/27, Potulice" / "ul. Działkowa 8, 89-120 Potulice" — postcode
 *  included), so dropping everything from the LAST comma onward removes the
 *  locality regardless of which village it names, with no per-village list to
 *  maintain. (Land's free-text addresses can put the locality FIRST instead —
 *  harmless there since land is keyed by dzialka_nr, not this display string;
 *  see landPlotFromText.) */
function cleanAdres(raw) {
  let s = raw || '';
  const lastComma = s.lastIndexOf(',');
  if (lastComma !== -1) s = s.slice(0, lastComma);
  s = s
    .replace(/\b\d{2}-\d{3}\b/g, ' ')
    .replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;.\-]+|[\s,;.\-]+$/g, '')
    .trim();
  return s;
}

/** Flat/unit number from the przetarg-na ("lokalu mieszkalnego nr 9"). */
function flatNoFromText(text) {
  const s = field(text, 'PRZETARGNA');
  const m = /lokal\w*\s+mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(s);
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat / built property, or null. */
export function addressRawFromText(text) {
  const cleaned = cleanAdres(field(text, 'ADRES'));
  if (!cleaned) return null;
  // Already carries an inline apartment ("Dąbrowskiego 29/15").
  if (/\d+[A-Za-z]?\s*\/\s*\d+/.test(cleaned)) return cleaned;
  const flat = flatNoFromText(text);
  return flat ? `${cleaned}/${flat}` : cleaned;
}

// Usable floor area of the unit: "Lokal mieszkalny o powierzchni użytkowej
// 32,58 m2" / "Lokal mieszkalny o pow. użytkowej 30,95 m2" / "Lokal mieszkalny
// o powierzchni 23,41 m2" (no "użytkowej"). Anchored on the unit noun so a
// room breakdown ("dwóch pokoi 10,89 m2 i 3,42 m2") is not taken (the FIRST
// area after the unit noun is the total).
const UNIT_AREA_RE =
  /(?:lokal\w*\s+mieszkaln\w+|lokal\w*\s+u[żz]ytkow\w+|pomieszcz\w+\s+przynale[żz]n\w+)[\s\S]{0,80}?o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(field(text, 'PRZETARGNA'));
  return m ? parseArea(m[1]) : null;
}

// Plot parcel(s) + area for LAND records. Parcels come from the ADRES field,
// which lists them as "dz. ewid. nr 2564/17, ul. Młyńska, Nakło nad Notecią" /
// "Gorzeń, dz. ewid. nr 95/54" / "dz. nr 97/20 obręb Paterek" / "Działka nr
// 544/11 położona w obrębie Paterek ..." — an optional "ewid." token can sit
// between "dz." and "nr" (absent from Chełmno's phrasing, so the upstream
// regex needs that one extra optional group). Area is the total ha from
// PRZETARGNA when stated there (Nakło's land tresc/przetarg-na is often empty
// too — land announcements mostly live in the PDF attachment, out of scope for
// this adapter's area figure; area_m2 is best-effort and frequently null).
function landPlotFromText(text) {
  const adres = field(text, 'ADRES');
  const parcels = [];
  const seen = new Set();
  const reP = /\bdz(?:ia[łl]k\w*)?\.?\s*(?:ewid\.?\s*)?(?:nr\s*)?(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(adres)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const ah = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+[.,]\d+)\s*ha\b/i.exec(field(text, 'PRZETARGNA'));
  if (ah) {
    const ha = Number(ah[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT (pending auction) record blob into a single active
 * record, or null. Land (kind 'grunt') → parcel-keyed record for land.json;
 * flats / built properties → address-keyed record.
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
    const plot = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
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
 * Parse one CONCLUDED record blob (non-empty WYNIK) into a concluded auction
 * record. Returns 0 or 1 record (array = framework interface). Joins its
 * property by address (+ flat-no) + round in build-properties.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date from the crawl ref (data-przetargu)
 * @param {string} sourceUrl  the canonical record URL (provenance)
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

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
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
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
