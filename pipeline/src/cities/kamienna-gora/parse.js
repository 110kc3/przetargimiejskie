// Kamienna Góra parsers — born-digital PDF notices from bip.kamiennagora.pl.
//
// Both streams are single-column NARRATIVE PDFs (pdftotext -layout → clean
// prose, no OCR, no column table), written by the same office in one fixed
// house style. An ANNOUNCEMENT ("...ogłoszenie") and, once the auction has
// happened, a RESULT ("INFORMACJA O WYNIKU ... PRZETARGU") share the SAME
// subject sentence, so one shared extractor covers both:
//
//   "...na zbycie lokalu mieszkalnego nr <APT> położon.. w obrębie [nr] <OBRĘB>
//    miasta Kamienna Góra przy (ul|pl|al). <STREET> <BLDG>"
//
// plus:
//   area  — "lokal mieszkalny nr <APT> o pow. <A,AA> m2"
//   price — "Cena wywoławcza ... wynosi/wynosiła: <N NNN,NN> zł"
//   date  — announcement "Przetarg odbędzie się <D miesiąca RRRR>",
//           result       "...w dniu <D miesiąca RRRR> ... odbył się ... przetarg"
//   round — announcement "ogłasza I przetarg" (Roman) / result title
//           "O WYNIKU DRUGIEGO PRZETARGU" + body "odbył się drugi przetarg"
//           (word ordinal) — roundFromText() handles BOTH.
//
// The RESULT PDF additionally carries the achieved-price outcome:
//   sold   — "Najwyższa cena osiągnięta w przetargu wyniosła: <N> zł" +
//            "Nabywcą ... został ..." + "przetarg zakończył się wynikiem pozytywnym"
//   unsold — "W wyniku przetargu nie wyłoniono nabywcy nieruchomości." +
//            "przetarg zakończył się wynikiem negatywnym"
//
// Groundtruthed live (2026-07-11, this Pi's Polish IP) on 5 real PDFs:
//   ul. Tadeusza Kościuszki 20/8  ogłoszenie  I  48,45 m²  120 000 zł  auction 2022-11-04
//   ul. Tadeusza Kościuszki 20/8  wynik NEG   I            120 000 zł  → negatywny
//   ul. Mostowej 6/10             wynik POZ   II 17,35 m²   39 000→39 400 zł  → Grzegorz Grobel
//   ul. Wiejskiej 4/17A           wynik POZ   I  21,05 m²   51 000→51 510 zł  → Daniel Dąbrowski
//   pl. Wolności 22/5A            wynik NEG   IV 12,95 m²   21 000 zł  auction 2025-09-03 → negatywny
//
// Buyer NAMES are deliberately NOT stored (privacy + no field in the record
// contract, matching walbrzych/wolow).
//
// classifyKind is always run on the PDF BODY, never the URL slug (ADAPTER-GUIDE
// §5.3); the crawl-side slug filter only bounds WHICH pages get fetched.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Diacritic-fold + lowercase so ASCII \w regexes survive Polish declensions. */
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

/** Collapse ALL whitespace (incl. pdftotext line breaks) to single spaces.
 *  Safe here: every notice is single-column prose, so a street name split
 *  across two lines ("ul. Tadeusza\n Kościuszki 20") must be rejoined before
 *  the field regexes run. */
export function normalizeBody(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** "120 000,00 zł" / "39 400,00" / "51 510" → integer PLN, or null. Ported
 *  from the wolow/olesno family (space- and dot-thousands, optional grosze). */
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fb = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fb);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "48,45" / "17.35" → 48.45 / 17.35, or null. */
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Polish text-month → ISO. Keyed by diacritic-folded genitive month names (the
// form that appears in "4 listopada 2022 r." / "3 września 2025 r.").
const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/** "4 listopada 2022" → "2022-11-04"; null for a non-month or absent date. */
export function textMonthDate(seg) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(seg || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAscii(m[2])];
  if (!mon) return null;
  const d = Number(m[1]);
  if (d < 1 || d > 31) return null;
  return `${m[3]}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
const ORDINAL = {
  pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5,
  szost: 6, siodm: 7, osm: 8, dziewiat: 9, dziesiat: 10,
};

/** Round (I/II/III…) from a notice's text. Announcements state it as a Roman
 *  numeral ("ogłasza I przetarg"); result notices state it as a WORD ordinal
 *  ("O WYNIKU DRUGIEGO PRZETARGU" / "odbył się drugi przetarg"). Try Roman
 *  first, then the ordinal. @returns {number|null} */
export function roundFromText(text) {
  const t = toAscii(text || '');
  const rm = /\b([ivx]{1,4})\s+przetarg/.exec(t);
  if (rm && ROMAN[rm[1]]) return ROMAN[rm[1]];
  const wm = /(pierwsz|drug|trzec|czwart|piat|szost|siodm|osm|dziewiat|dziesiat)\w*\s+przetarg/.exec(t);
  if (wm) return ORDINAL[wm[1]] ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// Notice-type discriminators (run on the normalized BODY)
// ---------------------------------------------------------------------------

/** A "INFORMACJA O WYNIKU ... PRZETARGU" achieved-price notice. */
export function isResultNotice(text) {
  const t = normalizeBody(text);
  return /informacj\w*\s+o\s+wyniku/i.test(t)
    || /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+(pozytywn|negatywn)/i.test(t);
}

/** A "Burmistrz ... ogłasza N przetarg ..." sale announcement (and NOT a
 *  result). */
export function isAnnouncement(text) {
  const t = normalizeBody(text);
  if (isResultNotice(t)) return false;
  if (/og[łl]asza\s+[ivx]{1,4}\s+przetarg/i.test(t)) return true;
  return /cena\s+wywo[łl]awcz/i.test(t) && /odb[ęe]dzie\s+si[ęe]/i.test(t);
}

// ---------------------------------------------------------------------------
// Field extractors (all expect a normalized single-spaced body)
// ---------------------------------------------------------------------------

// Apartment number: "lokalu mieszkalnego nr 17A" / "lokal mieszkalny nr 8" /
// "lokali mieszkalnych nr 5 i 7" (plural combined lot → the first, nr 5).
const APT_RE = /lokal\w*\s+mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;
// Subject street+building: anchored to the sale clause, then "przy <TYPE>
// <STREET> <BLDG>". TYPE is spelled in FULL on announcements ("przy ulicy …" /
// "przy placu …" — locative) and ABBREVIATED on result notices ("przy ul. …" /
// "przy pl. …"); accept both — abbrevType() folds the token to the ul./pl./al./
// os. form core/normalize.js strips. STREET is a run of NON-DIGITS (street names
// here carry no Arabic digit — "Papieża Jana Pawła II" uses a Roman II), so the
// FIRST number after the name is the building, with no reliance on a trailing
// period (an announcement's subject runs straight into "Przetarg odbędzie się…"
// with no period after the building number). The sale-clause opener accepts
// SINGULAR ("lokalu mieszkalnego") AND PLURAL ("lokali mieszkalnych nr 5 i 7" —
// two flats sold as one lot; keyed on the first).
const SUBJECT_RE =
  /(?:zbycie|sprzeda\w+)\s+lokal\w+\s+mieszkaln\w+[\s\S]{0,240}?przy\s+(ul\.|ulic\w+|pl\.|plac\w*|al\.|alei|aleja|alej\w+|os\.|osiedl\w+)\s+([^\d]{2,50}?)\s+(\d+[A-Za-z]?)\b/i;
// Obręb (cadastral precinct) number — metadata, not load-bearing.
const OBREB_RE = /w\s+obr[ęe]bie\s+(?:nr\s+)?(\d+)\s+miasta/i;

/** Fold a street-type token (full or abbreviated) to the ul./pl./al./os.
 *  abbreviation that core/normalize.js's STRIP_LEAD recognises. */
function abbrevType(t) {
  const s = (t || '').toLowerCase();
  if (s.startsWith('pl')) return 'pl';
  if (s.startsWith('al')) return 'al';
  if (s.startsWith('os')) return 'os';
  return 'ul';
}

/**
 * @param {string} body normalized
 * @returns {{address:object|null, address_raw:string|null, apt:string|null, obreb:string|null}}
 */
export function extractSubject(body) {
  const aptM = APT_RE.exec(body);
  const apt = aptM ? aptM[1].toUpperCase() : null;
  const obrM = OBREB_RE.exec(body);
  const obreb = obrM ? obrM[1] : null;
  const sbM = SUBJECT_RE.exec(body);
  if (!sbM) return { address: null, address_raw: null, apt, obreb };
  const street = sbM[2].trim().replace(/\s+/g, ' ');
  const building = sbM[3].toUpperCase();
  const raw = `${abbrevType(sbM[1])}. ${street} ${building}${apt ? '/' + apt : ''}`;
  return { address: parseAddress(raw), address_raw: raw, apt, obreb };
}

/** Flat area in m²: "lokal mieszkalny nr <APT> o pow. <A,AA> m2". */
export function extractAreaM2(body) {
  const m = /lokal\w*\s+mieszkaln\w+\s+nr\s+\d+[A-Za-z]?\s+o\s+pow\w*\.?\s+([\d]+[,.]\d+)\s*m/i.exec(body);
  return m ? parseArea(m[1]) : null;
}

// A monetary amount inside a price region. Currency-word-AGNOSTIC: some 2023
// notices render the currency defectively ("99 000,00 bru o" — the "zł" dropped
// and "brutto" mangled), so we key off the amount SHAPE, not a trailing "zł".
// Requiring a thousands separator OR a ,NN grosze tail keeps it from matching a
// bare building number ("20"), an "11,8%" udział, or an "o pow. 48,45 m2" area.
const AMOUNT_RE = /(\d{1,3}(?:[ .]\d{3})+(?:,\d{2})?|\d+,\d{2})/;

/** First amount after the label `re`, within `span` chars. @returns {number|null} */
function priceAfter(body, re, span) {
  const i = body.search(re);
  if (i < 0) return null;
  const m = AMOUNT_RE.exec(body.slice(i, i + span));
  return m ? parsePLN(m[1]) : null;
}

/** "Cena wywoławcza ... wynosi/wynosiła: 120 000,00 zł" → 120000. */
export function extractStartingPrice(body) {
  return priceAfter(body, /cena\s+wywo[łl]awcz\w+/i, 260);
}

/** "Najwyższa cena osiągnięta w przetargu wyniosła: 39 400,00 zł" → 39400
 *  (result notices only; null on an unsold/negatywny notice). */
export function extractAchievedPrice(body) {
  return priceAfter(body, /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t\w+/i, 220);
}

/** Auction date. Announcement: "Przetarg odbędzie się <D miesiąca RRRR>".
 *  Result: "...w dniu <D miesiąca RRRR> ... odbył się ... przetarg" (the
 *  auction date — NOT the "Kamienna Góra, dnia …" publication date, which uses
 *  "dnia" not "w dniu"). @returns {string|null} ISO */
export function extractAuctionDate(body) {
  let i = body.search(/odb[ęe]dzie\s+si[ęe]/i);
  if (i >= 0) {
    const d = textMonthDate(body.slice(i, i + 70));
    if (d) return d;
  }
  i = body.search(/\bw\s+dniu\b/i);
  if (i >= 0) {
    const d = textMonthDate(body.slice(i, i + 50));
    if (d) return d;
  }
  return null;
}

/** Publication date from the "Kamienna Góra, dnia <D miesiąca RRRR> r." header
 *  (best-effort provenance). @returns {string|null} ISO */
export function extractPublishedDate(body) {
  const m = /,\s*dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(body);
  return m ? textMonthDate(m[1]) : null;
}

/** Sold vs unsold from a RESULT notice. @returns {'sold'|'unsold'|null} */
export function extractOutcome(body) {
  if (/wynikiem\s+pozytywnym/i.test(body)) return 'sold';
  if (/wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy/i.test(body)) return 'unsold';
  return null;
}

// ---------------------------------------------------------------------------
// Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one sale-announcement ("...ogłoszenie") PDF text → the current-cycle
 * fields crawlActive() turns into an active listing.
 * @param {string} text pdftotext output
 * @param {string} url  the detail page URL (provenance)
 * @returns {object}
 */
export function parseAnnouncement(text, url) {
  const body = normalizeBody(text);
  const kind = classifyKind(body);
  const subject = extractSubject(body);
  return {
    kind,
    round: roundFromText(body),
    area_m2: extractAreaM2(body),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(body),
    detail_url: url,
    address: subject.address,
    address_raw: subject.address_raw,
    obreb: subject.obreb,
  };
}

/**
 * Parse one result ("INFORMACJA O WYNIKU ... PRZETARGU") PDF text into the
 * achieved-price-stream record(s). One flat per notice.
 * @param {string}      text         pdftotext output (source:'html' → ref.text)
 * @param {string|null} fallbackDate ISO date from the crawl ref
 * @param {string}      sourceUrl    the result PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const body = normalizeBody(text);
  if (!body || !isResultNotice(body)) return [];

  const kind = classifyKind(body);
  const subject = extractSubject(body);
  if (!subject.address) return []; // a flat result with no parseable address is dropped, not fabricated

  const outcome = extractOutcome(body) || 'unsold';
  const sold = outcome === 'sold';
  const achieved = sold ? extractAchievedPrice(body) : null;
  const starting_price_pln = extractStartingPrice(body);

  const notes = [];
  if (subject.address.warning) notes.push(subject.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold notice but no achieved price found');

  return [{
    auction_date: extractAuctionDate(body) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    obreb: subject.obreb,
    round: roundFromText(body),
    area_m2: extractAreaM2(body),
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome,
    unsold_reason: sold ? null : 'negatywny',
    notes,
  }];
}
