// Węgorzewo parsers — pure text -> field extraction, no HTTP/HTML here (see
// crawl.js for board/detail fetching + extractTrescDiv/stripTags, which turn
// each IDcom detail page into the clean text blob every function below
// reads). crawl.js always passes `${title}\n${body}` as `fullText` so a
// field stated only in the title (e.g. the flat's address on most
// announcements) or only in the body (e.g. the Kal-2019 notice, whose title
// is a bare "... na sprzedaż lokalu mieszkalnego" with no address at all —
// see addressFromText pattern C) is found either way.
//
// Groundtruthed against live bip.wegorzewo.pl fixtures (fetched 2026-07-10/11
// — see tests/parse-wegorzewo.test.js for the exact captured strings):
//   PENDING flat (village, no round stated):  wiadomosc/616337  Sztynort Mały 3/6
//   PENDING flat (town street, round I):      wiadomosc/801593  Armii Krajowej 42/3
//   PENDING flat (village "we wsi", no round): wiadomosc/822001  Pniewo 5/4
//   PENDING flat (village "w miejscowości",
//     round III via "(III przetarg)"):         wiadomosc/403110  Węgielsztyn 37/4
//   PENDING flat (title has NO address at all,
//     village name only in BODY, locative
//     "w Kalu"):                                wiadomosc/501783  Kalu 38/2
//   PENDING land (multi-parcel notice — only
//     the FIRST działka is extracted, same
//     simplification gizycko's own multi-flat
//     nr 53/2025 fixture uses):                 wiadomosc/886596  Słowackiego, dz. 636/36
//   RESULT flat SOLD (inline HTML, no PDF):     wiadomosc/14619/830000  Pniewo 5/4
//   RESULT flat SOLD (inline HTML, no PDF):     wiadomosc/14619/809365  Armii Krajowej 42/3
//   RESULT land UNSOLD ("nie wyłoniono
//     nabywcy", round V):                       wiadomosc/14619/783284  Kal, dz. 132/45
//   LEASE (dzierżawa, skipped):                 wiadomosc/563781  Reymonta 4 (ograniczony + dzierżawę)
//
// *** SOURCE CORRECTION vs the spike ***: the spike (and the gizycko analog)
// expected scanned-PDF result documents needing OCR. Live verification
// (10+ result detail pages sampled across 2021-2026, all property kinds)
// found EVERY "informacja o wyniku przetargu" notice is plain inline HTML
// with a structured "cena wywoławcza / najwyższa cena osiągnięta / nabywca"
// block — NO PDF attachment, hence no OCR needed for any result observed so
// far. parseResultDoc below is a REAL parser (not gizycko's always-[] stub).
// crawl.js still defensively tries pdfText/ocrPdf if a FUTURE result ever
// ships as a PDF attachment instead (see crawl.js's fetchResultText).
//
// Also note: results live on a SEPARATE IDcom category (14619, "Informacje o
// wynikach przetargów") from announcements (category 3, "Przetargi") — unlike
// gizycko, where both share one board.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ------------------------------------------------------------------ numbers

function toAsciiPL(s) {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "60.000" / "91 000" / "12 000" -> integer PLN. The grosze/dash tail is
 *  already stripped by PRICE_NUM_RE before this runs (see firstPriceInWindow),
 *  so this only ever needs to drop thousands separators (dot or space). */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------------- prices
//
// Wegorzewo mixes THREE price notations across live documents: dot-thousands
// with a dash-for-grosze ("60.000,-zł", Węgielsztyn 2017), space-thousands
// with ",00" grosze and sometimes a stray space BEFORE the comma
// ("12 000, 00 zł", Słowackiego 2024 — a human typo in the source itself),
// and the usual dot-thousands ",00 zł" ("39.400,00 zł"). The label and the
// number are also inconsistently separated by ":" or "–" (dash) or nothing.
// Rather than parse the separator, this scans forward from the label for the
// first bare "<digits>[,(grosze|-)] zł" token — agnostic to what (if
// anything) sits between the label and the number.

const PRICE_NUM_RE = /(\d[\d\s.]*?)\s*(?:,\s*(?:\d{2}|-))?\s*z[łl]/i;

function firstPriceInWindow(text, anchorAsciiRe, windowSize = 250) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const start = t.search(anchorAsciiRe);
  if (start < 0) return null;
  const region = text.slice(start, start + windowSize);
  const m = PRICE_NUM_RE.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/** "cena wywoławcza [za nieruchomość/nieruchomości/lokalu ...]: NUM zł". */
export function startingPriceFromBody(text) {
  return firstPriceInWindow(text, /cena\s+wywolawcza/i);
}

/** Achieved (hammer) price — ONLY present in result docs, following
 *  "najwyższa cena osiągnięta w przetargu". Absent/no "zł" nearby (the
 *  unsold form states "- 0" with no currency at all) -> null, i.e. unsold. */
export function achievedPriceFromBody(text) {
  return firstPriceInWindow(text, /najwyzsza\s+cena\s+osiagnieta/i);
}

/** True when a result doc explicitly states a negative (unsold) outcome —
 *  "zakończył się wynikiem negatywnym" and/or "nie wyłoniono nabywcy". */
export function isNegativeOutcome(text) {
  const t = toAsciiPL(text);
  return /wynikiem\s+negatywnym|nie\s+wyloniono\s+nabywcy/.test(t);
}

// -------------------------------------------------------------------- round

// Stem-prefix match (works across any Polish declension: "pierwszy",
// "pierwszego", "pierwsza", ...) up to 10th, mirroring naklo-nad-notecia's
// ROUND_WORDS table. Węgorzewo's Kal parcel 132/4x/5x is confirmed live to
// have run to a VI (szósty) przetarg, so 1-5 (gizycko's ceiling) is not
// enough headroom here.
const ROUND_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piat', 5], ['szost', 6], ['siodm', 7], ['osm', 8],
  ['dziewiat', 9], ['dziesiat', 10],
];
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

/** Auction round from a title OR a result body — "(III przetarg)" /
 *  "III przetarg", or a Polish ordinal word in any declension ("pierwszy
 *  przetarg", "informacji o wyniku pierwszego przetargu", "piąty przetarg").
 *  Returns null when unstated (a first-time announcement often omits the
 *  ordinal entirely — confirmed live on Sztynort Mały 3/6 and Pniewo 5/4). */
export function roundFromText(text) {
  if (!text) return null;
  const romanM = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(text);
  if (romanM) {
    const val = ROMAN[romanM[1].toLowerCase()];
    if (val) return val;
  }
  const t = toAsciiPL(text);
  for (const [stem, val] of ROUND_STEMS) {
    if (new RegExp(`\\b${stem}`, 'i').test(t)) return val;
  }
  return null;
}

// --------------------------------------------------------------------- date

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/** Auction date. Anchors on "odbędzie się" (future, announcements) / "odbył
 *  się" (past, results), then scans a wide window (some notices interpose a
 *  long venue description — "w siedzibie Urzędu Miejskiego ... w sali narad
 *  – II piętro" — between the anchor and the actual date, confirmed live on
 *  the Słowackiego land notice) for the first date, numeric "DD.MM.YYYY"
 *  preferred, falling back to the Polish word form "D MONTH YYYY". */
export function auctionDateFromBody(text) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const anchorM = /odbedzie\s+sie|odbyl\s+sie/.exec(t);
  const scope = anchorM ? text.slice(anchorM.index, anchorM.index + 220) : text.slice(0, 500);
  const numM = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(scope);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  const wordM = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (wordM) {
    const mon = PL_MONTH[toAsciiPL(wordM[2])];
    if (mon) return iso(wordM[3], mon, wordM[1]);
  }
  return null;
}

// --------------------------------------------------------------------- area

// Anchored on "lokal[u] [(nie)mieszkalny/użytkowy] [nr N] ... o [łącznej] pow
// [ierzchni] [użytkowej] NUM m2" — covers every phrasing observed live:
// "o powierzchni użytkowej 89,20 m²" (Kal), "o pow. 109,03 m2" (Węgielsztyn,
// no "użytkowej"), "o pow. 14,30m2" (Armii Krajowej, no space before "m2"),
// "o powierzchni użytkowej 33,20 m2" (Pniewo). The lokal-kind qualifier is
// optional so the SAME regex also reads a lokal niemieszkalny/użytkowy
// (commercial) unit's area, e.g. "lokalu niemieszkalnego nr 5 o pow. 97,43 m2".
const UNIT_AREA_RE =
  /lokal\w*(?:\s+(?:nie)?mieszkaln\w*|\s+u[żz]ytkow\w*)?(?:\s+nr\.?\s*\d+[A-Za-z]?)?[^.]{0,40}?o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*(?:u[żz]ytkow\w+\s*)?(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of a flat/commercial unit, or null. */
export function areaFromBody(text) {
  if (!text) return null;
  const m = UNIT_AREA_RE.exec(text);
  return m ? parseArea(m[1]) : null;
}

// ------------------------------------------------------------------ address
//
// Three title shapes + one body-only fallback, tried in order:
//   A. town street:   "lokal mieszkalny nr APT poł. w MIASTO przy ul. STREET BLDG"
//   B. village:        "lokal mieszkalny nr APT poł. we wsi/w miejscowości VILLAGE BLDG"
//   C. body fallback (title carries no address at all — confirmed live on
//      the Kal-2019 notice, whose title is just "... na sprzedaż lokalu
//      mieszkalnego"): pulls the apt number from "lokal[u] mieszkalne[go]
//      Nr/nr N" and the building+village from "budynku ... Nr N ... w/we
//      VILLAGE" anywhere in the body. VILLAGE may be in the LOCATIVE case
//      ("w Kalu" for nominative "Kal") — kept as captured, same policy this
//      codebase already applies to genitive street names (see
//      core/normalize.js header) rather than guessing at Polish declension.

/** @returns {{apt:string, street:string, building:string}|null} */
export function addressFromText(text) {
  if (!text) return null;

  // The lokal-kind qualifier is optional and also accepts (nie)mieszkalny /
  // użytkowy — confirmed live: "lokalu niemieszkalnego nr 5 poł. w
  // Radziejach przy ul. Węgorzewskiej 25" (a commercial unit auctioned on
  // the SAME board as the flats) has no address at all without this, since
  // "niemieszkalny" doesn't match a bare "mieszkaln" stem.
  const LOKAL_KIND = /lokal\w*(?:\s+(?:nie)?mieszkaln\w*|\s+u[żz]ytkow\w*)?/;

  // Patterns A/B tolerate an optional short clause between "nr APT" and
  // "poł." — announcement TITLES have them adjacent ("nr 4 poł. we wsi ..."),
  // but result documents restate an area clause in between ("nr 4 o pow.
  // 33,20m2, poł. w miejscowości ..." — confirmed live on the Pniewo 5/4
  // result), so the gap can't be assumed to be zero-width. The gap uses a
  // plain `.` (not `[^.]`): "o pow." itself contains a period (the "pow."
  // abbreviation), so excluding periods from the gap makes it un-crossable
  // and the match never reaches the real "poł." token later in the sentence
  // (confirmed live — this broke the Armii Krajowej 42/3 result).
  const patA = new RegExp(
    LOKAL_KIND.source + '\\s+nr\\.?\\s*(\\d+[A-Za-z]?).{0,40}?\\s*po[łl]\\.?\\s+w\\s+\\S+\\s+przy\\s+ul\\.?\\s*([A-ZŁŚĆĄĘŃÓŹŻ][^\\d,]+?)\\s+(\\d+[A-Za-z]?)\\b',
    'i',
  );
  const mA = patA.exec(text);
  if (mA) return { apt: mA[1], street: mA[2].trim(), building: mA[3] };

  const patB = new RegExp(
    LOKAL_KIND.source + '\\s+nr\\.?\\s*(\\d+[A-Za-z]?).{0,40}?\\s*po[łl]\\.?\\s+we?\\s+(?:wsi|miejscowo[śs]ci)\\s+([A-ZŁŚĆĄĘŃÓŹŻ][^\\d,]+?)\\s+(\\d+[A-Za-z]?)\\b',
    'i',
  );
  const mB = patB.exec(text);
  if (mB) return { apt: mB[1], street: mB[2].trim(), building: mB[3] };

  // Body-only fallback (title/heading carries no address at all — confirmed
  // live on the Kal-2019 notice). Skips the "wsi"/"miejscowości" stopword so
  // it captures the actual village name after it, not the stopword itself.
  const aptM = new RegExp(LOKAL_KIND.source + '\\s+(?:nr\\.?\\s*)?(\\d+[A-Za-z]?)', 'i').exec(text);
  const bldgVillM =
    /budynk\w*[^.]{0,40}?[Nn]r\.?\s*(\d+[A-Za-z]?)[^.]{0,40}?\bwe?\s+(?:wsi\s+|miejscowo[śs]ci\s+)?([A-ZŁŚĆĄĘŃÓŹŻ][\wŁŚĆĄĘŃÓŹŻłśćąęńóźż]*)\b/i.exec(text);
  if (aptM && bldgVillM) {
    return { apt: aptM[1], street: bldgVillM[2], building: bldgVillM[1] };
  }
  return null;
}

// --------------------------------------------------------------------- land
//
// Land notices (kind 'grunt') carry a cadastral parcel number instead of a
// street address. A single notice can list SEVERAL parcels (confirmed live,
// Słowackiego 636/36 + 636/38 + 636/40 in one notice) — only the FIRST is
// extracted per record, the same simplification gizycko's own multi-flat
// nr 53/2025 fixture already applies (see gizycko/parse.js test comments).

/** First cadastral parcel number ("numerem 383/2" / "numerem: 132/31" /
 *  "Działka nr: 636/36" / "nr ewid. 1061/18"), or null. */
export function landParcelFromText(text) {
  if (!text) return null;
  const m = /(?:numer(?:em)?|nr\.?(?:\s+ewid\.?)?)\s*:?\s*(\d+(?:\/\d+)?)/i.exec(text);
  return m ? m[1] : null;
}

/** Plot area in m2 from a hectare figure — "o pow. 0,0886ha" / "o łącznej
 *  pow.: 1,3778ha" / the label form "Powierzchnia: 0,0023ha" (Słowackiego's
 *  per-parcel breakdown, which drops the "o ... pow" prose entirely). */
export function landAreaFromText(text) {
  if (!text) return null;
  const m =
    /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?:?\s*(\d+[.,]\d+)\s*ha/i.exec(text) ||
    /\bpowierzchnia\s*:?\s*(\d+[.,]\d+)\s*ha/i.exec(text);
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

/** Best-effort obręb/locality name, used only to disambiguate the SAME
 *  parcel number across districts in build-land.js's landKey. Optional —
 *  a miss just falls back to a plain `dz|<parcel>` key. */
export function obrebFromText(text) {
  if (!text) return null;
  const m = /obr[eę]b(?:ie)?\.?\s*(?:geod\.?)?\s*\d*\s*([A-ZĄĆĘŁŃÓŚŹŻ][\wĄĆĘŁŃÓŚŹŻąćęłńóśźż]*)/i.exec(text);
  return m ? m[1] : null;
}

// -------------------------------------------------------------------- gates

/** A property SALE announcement (flat, commercial unit, or land) — NOT a
 *  lease, NOT a restricted (ograniczony) auction, NOT a result notice, and
 *  NOT one of the unrelated procurement/works tenders that share this same
 *  IDcom category (e.g. "Przetarg na przygotowywanie i wydawanie gorących
 *  posiłków ...", "Ogłoszenie o zamówieniu - budowa kanalizacji ..." — both
 *  confirmed live; neither states "sprzedaż"/"zbycie", which is why that's
 *  required as the positive signal rather than "przetarg" alone). */
export function isSaleAuctionTitle(title) {
  if (!title) return false;
  const t = toAsciiPL(title);
  if (!/przetarg|obwieszczeni|ogloszeni/.test(t)) return false;
  if (/wynik|informacj\w*\s+o\s+wyniku/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/dzierzaw|najem|uzyczeni/.test(t)) return false;
  if (/sprzedaz|zbycie|zbyci/.test(t)) return true;
  return false;
}

/** A property-sale RESULT notice on the wyniki board (category 14619, which
 *  also carries lease results, e.g. "informacja o wyniku przetargu na
 *  dzierżawę targowiska miejskiego" — confirmed live, excluded here). */
export function isResultTitle(title) {
  if (!title) return false;
  const t = toAsciiPL(title);
  if (!/wynik/.test(t)) return false;
  if (/dzierzaw|najem|uzyczeni/.test(t)) return false;
  if (/sprzedaz|zbycie|zbyci/.test(t)) return true;
  return false;
}

// ----------------------------------------------------------------- kind

/**
 * classifyKind, with one Węgorzewo-specific correction: core/classify-kind.js
 * checks GARAGE_RE (any "garaż" mention) BEFORE LAND_RE, so an undeveloped
 * PARCEL whose zoning text happens to mention a garage misclassifies as
 * 'garaz' (address-keyed) instead of 'grunt' (parcel-keyed) — confirmed live
 * on TWO independent notices: ul. Teatralnej "działek gruntu nr ewid. 1100 ...
 * przeznaczonych pod zabudowę garażową" and ul. Słowackiego "działek ...”
 * whose warunki-zabudowy decision cites "budowie budynku garażowego". Both
 * are land sales (the grammatical object of "na sprzedaż" is "działek"/
 * "nieruchomości niezabudowanej"), not an existing garage for sale — core/
 * cannot be modified (ADAPTER-GUIDE §4), so the correction lives here.
 * @param {string} text
 */
function resolveKind(text) {
  const kind = classifyKind(text);
  if (kind !== 'garaz') return kind;
  if (
    /nieruchomo[śs]ci?\s+niezabudowan|nieruchom\w*\s+grunto\w*\s+niezabudowan|na\s+sprzeda[żz]\s+(?:ni[żz]ej\s+wymienionych\s+)?dzia[łl]|sprzeda[żz]\s+dzia[łl]|dzia[łl]ek?\s+gruntu\s+nr/i.test(
      text,
    )
  ) {
    return 'grunt';
  }
  return kind;
}

// ----------------------------------------------------------------- records

/**
 * Parse one PENDING announcement (title + detail body already joined by the
 * caller as `${title}\n${body}`) into an active listing (flat/commercial,
 * address-keyed) or land record (parcel-keyed), or null if no usable address
 * / parcel could be found. `kind` is decided from title+body together (the
 * title alone can miss it — classifyKind's LAND_RE doesn't match the plural
 * "działek", only body's singular "Działka nr:" phrasing catches it).
 * @param {string} fullText
 * @param {string} detailUrl
 * @returns {object|null}
 */
export function parseAnnouncement(fullText, detailUrl) {
  if (!fullText) return null;
  const kind = resolveKind(fullText);
  const round = roundFromText(fullText);
  const auction_date = auctionDateFromBody(fullText);
  const starting_price_pln = startingPriceFromBody(fullText);

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(fullText);
    const obreb = obrebFromText(fullText);
    if (!dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(fullText),
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl,
      source_url: detailUrl,
    };
  }

  const addr = addressFromText(fullText);
  if (!addr) return null;
  const address = parseAddress(`${addr.street} ${addr.building}/${addr.apt}`);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `${addr.street} ${addr.building}/${addr.apt}`,
    address,
    area_m2: areaFromBody(fullText),
    starting_price_pln,
    auction_date,
    round,
    detail_url: detailUrl,
    source_url: detailUrl,
  };
}

/**
 * Parse one CONCLUDED result document into a 0- or 1-element array (the
 * adapter-contract shape). `text` is the plain body text crawl.js extracted
 * from the detail page (source:'html' — no OCR dispatch; see crawl.js for
 * the defensive PDF/OCR fallback that exists but has never been exercised by
 * a live fixture).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const kind = resolveKind(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromBody(text) || fallbackDate || null;
  const starting_price_pln = startingPriceFromBody(text);
  const achieved = achievedPriceFromBody(text);
  const negativeStated = isNegativeOutcome(text);
  const sold = achieved != null && !negativeStated;
  const notes = [];

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(text);
    const obreb = obrebFromText(text);
    if (!dzialka_nr) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(text),
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const addr = addressFromText(text);
  if (!addr) return [];
  const address_raw = `${addr.street} ${addr.building}/${addr.apt}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
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
    area_m2: areaFromBody(text),
    notes,
  }];
}
