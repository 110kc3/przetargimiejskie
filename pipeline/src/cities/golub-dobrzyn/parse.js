// Golub-Dobrzyń parsers (dual-publisher, bip.net 7.32 — see config.js).
//
// Every notice arrives as ONE labelled text blob built by buildRecordText():
//   TITLE: <board/attachment headline>
//   BODY:  <extracted text — inline PageContent HTML (powiat) or PDF text (miasto)>
// Every parser reads that blob via whole() (TITLE+BODY concatenated). The test
// builds the SAME blob from real captured title+body strings, so the parsers are
// groundtruthed against live data.
//
// crawl.js splits announcement vs result by CONTENT (isResultDoc), never by the
// slug — the CMS is id-addressed and slugs are cosmetic. classifyKind runs on the
// BODY too.
//
// Regexes groundtruthed against LIVE documents (verified 2026-07):
//   FLAT RESULT, round III, SOLD — powiat notice 8339:
//     "Informacja o wyniku trzeciego ustnego nieograniczonego przetargu na
//      sprzedaż nieruchomości … przy ulicy PTTK 5, lokal mieszkalny nr 3. …
//      1. Trzeci przetarg ustny nieograniczony odbył się dnia 30 kwietnia 2026 r.
//      … lokal o powierzchni użytkowej 31,91m² … piwnicy o pow. 5,11m². …
//      4. Cena wywoławcza nieruchomości: 81.000,00zł (netto). Najwyższa cena
//      osiągnięta w przetargu: 81.810,00zł. 5. Nabywcą nieruchomości został/ła –
//      Andrzej Jankowski."
//   FLAT RESULT, round II, SOLD — powiat 8173 (81 810 zł, Hanna Piotrowska-Werner)
//   FLAT ANNOUNCEMENT, round III — powiat 8268 (TABLE layout; price/wadium far
//     from the "Cena wywoławcza" header; "Przetarg odbędzie się dnia 30 kwietnia
//     2026 r.")
//   LAND RESULT, round III, UNSOLD (multi-parcel table, Kowalewo) — powiat 8440:
//     "… Nabywcą nieruchomości został – ------------------------- …" (dash
//      placeholder ⇒ no buyer ⇒ unsold; the table's "0,00 zł" osiągnięta columns
//      never become a price).
//   LAND RESULT (miasto PDF), SOLD — działka nr 375 obręb VIII:
//     "… odbył się w dniu 10 września 2025 r. … nabywcą została: 1) Hurtownia
//      Olejów i Paliw Gabriel Kropkowski … Cena wywoławcza nieruchomości wynosiła
//      18.400,00 zł netto … Najwyższa cena osiągnięta w przetargu wyniosła
//      55.570,00 zł netto".
//
// Two real traps handled:
//   * The result boilerplate ALWAYS says "informację o wyniku PIERWSZEGO ustnego
//     przetargu:" regardless of the real round — so roundFromText anchors on the
//     FIRST "<ordinal> … przetarg" match, which is the TITLE's correct ordinal
//     ("trzeciego …"/"drugiego …"), placed before the boilerplate.
//   * The office address "przy ulicy Plac Tysiąclecia 25" / "ul. Plac 1000-lecia
//     25" is skipped by flatStreetBuilding (OFFICE_RE), so the property street
//     (which always appears first anyway) is the one taken.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// Polish word ordinal ROOT → int (declension-tolerant).
const WORD_ORDINAL = [
  [/^pierwsz/i, 1], [/^drug/i, 2], [/^trzec/i, 3], [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5], [/^sz[óo]st/i, 6], [/^si[óo]dm/i, 7], [/^[óo]sm/i, 8],
  [/^dziewi[ąa]t/i, 9], [/^dziesi[ąa]t/i, 10],
];

// "81.000,00" / "1 500 000,00" / "55.570,00" -> integer PLN. The grosze tail
// (the LAST ".NN"/",NN" of exactly two digits) is stripped first, then every
// remaining space/dot/comma is a thousands separator. "0,00" -> null (>0 gate).
export function parsePLN(numStr) {
  if (!numStr) return null;
  const withoutGrosze = String(numStr).trim().replace(/[.,]\d{2}$/, '');
  const cleaned = withoutGrosze.replace(/[\s., ]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "31,91" / "0,2608" / "835" -> number. Comma OR dot decimal; space/NBSP stripped.
export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML/PDF fragment to a single line of plain text. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/­/g, '') // soft hyphen (born-digital PDF artifact)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads.
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [`TITLE: ${stripHtml(f.title)}`, `BODY: ${stripHtml(f.body)}`].join('\n');
}

/** Read one labelled line's value. Gap after the label is [ \t]* so an empty
 *  field can't slide the match across the newline into the next label. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/** TITLE + BODY concatenated — the searchable surface for anchored regexes. An
 *  unlabelled input is returned as-is. */
export function whole(text) {
  const t = String(text || '');
  const title = field(t, 'TITLE');
  const body = field(t, 'BODY');
  if (!title && !body) return t.trim();
  return `${title} ${body}`.trim();
}

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a REAL-ESTATE sale przetarg (not movable property /
 *  a vehicle / a tenant bezprzetargowa disposal). */
export function isRealEstateSale(text) {
  const t = whole(text);
  if (!/przetarg/i.test(t)) return false;
  if (!/(sprzeda[żz]|zbyci)/i.test(t)) return false;
  if (/bezprzetargow/i.test(t)) return false;
  if (/majątk\w*\s+ruchom|ruchom\w+\s+majątk|sk[łl]adnik\w*\s+rzeczow/i.test(t)) return false;
  if (/samoch[oó]d|samochodu|ci[ąa]gnik|pojazd/i.test(t)) return false;
  return true;
}

/** True when the auction PURPOSE is a lease (dzierżawa / najem / użyczenie),
 *  not a sale. */
export function isLease(text) {
  const t = whole(text);
  return /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem|u[żz]yczeni\w*)/i.test(t)
    || /\bna\s+(?:dzier[żz]aw\w*|najem)\b/i.test(t)
    || /\bw\s+dzier[żz]aw[ęe]\b/i.test(t)
    || /czynsz\w*\s+dzier[żz]aw/i.test(t);
}

/** True when this is an "Informacja o wyniku …" result notice. Anchored on the
 *  "o wynik…" title/body phrase, or the past-tense held-clause ("przeprowadzono"
 *  / "odbył się w/dnia …") common to every result template. Announcements use
 *  the FUTURE "Przetarg odbędzie się …" and never satisfy either. */
export function isResultDoc(text) {
  const t = whole(text);
  if (/informacj\w*\s+o\s+wynik/i.test(t)) return true;
  return /przetarg/i.test(t)
    && (/przeprowadzon\w*/i.test(t) || /odby[łl]\s+si[ęe]\s+(?:w\s+dniu|dnia)/i.test(t));
}

/** True when the notice explicitly states a negative (unsold) outcome. The
 *  "dopuszczono : 0 osób" signal excludes the neutral "nie dopuszczono: 0". */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+negatywn|brak\s+ofert|nikt\s+nie\s+(?:zosta[łl]|wp[łl]aci|przyst[ąa]pi|z[łl]o[żz]y)|nie\s+wp[łl]yn[ęe][łl]a?\s+[żz]adna\s+wp[łl]ata|nie\s+odnotowano\s+wp[łl]aty|uniewa[żz]ni|(?<!nie\s)dopuszczono\s*:?\s*0\s+os[óo]b/i.test(t);
}

// ----------------------------------------------------------------- round

/**
 * Auction round from the word ordinal ("trzeci przetarg", "drugiego ustnego
 * nieograniczonego przetargu"). Anchored on the FIRST "<ordinal> … przetarg"
 * match (≤3 adjective fillers between), which is the TITLE's correct ordinal —
 * this structurally excludes the result-template boilerplate "informację o
 * wyniku PIERWSZEGO ustnego przetargu:" that always says "pierwszego". Returns
 * null when unstated (real for some miasto notices).
 */
export function roundFromText(text) {
  const t = whole(text);
  const m = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+(?:(?:ustn\w*|nieograniczon\w*|ograniczon\w*|pisemn\w*|publiczn\w*)\s+){0,3}przetarg/i.exec(t);
  if (!m) return null;
  for (const [re, n] of WORD_ORDINAL) if (re.test(m[1])) return n;
  return null;
}

// ----------------------------------------------------------------- date

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** "30 kwietnia 2026" (word month) or "30.04.2026" (numeric) -> ISO, or null. */
function parseDatePhrase(phrase) {
  const s = String(phrase || '').trim();
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(s);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(s);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

const DATE_TOKEN = String.raw`(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})`;

/**
 * Auction date. ANNOUNCEMENT: "Przetarg odbędzie się dnia 30 kwietnia 2026 r.".
 * RESULT: "… odbył się dnia 30 kwietnia 2026 r." (powiat) / "… odbył się w dniu
 * 10 września 2025 r." (miasto) / "… przeprowadzono w dniu …". The wadium
 * deadline "najpóźniej do dnia 24.04.2026 r." is outside every anchor. -> ISO.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  const patterns = [
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`odby[łl]\s+si[ęe]\s+(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`przeprowadzon\w*\s+(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`\bw\s+dniu\s+${DATE_TOKEN}\s+o\s+godz`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) {
      const iso = parseDatePhrase(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}

// ----------------------------------------------------------------- prices

// "81.000,00" / "18.400,00" / "1 500 000,00" — dot/space thousands with an
// optional ",00" grosze tail.
const AMOUNT = String.raw`(\d{1,3}(?:[.\s ]\d{3})*(?:,\d{2})?)`;

/** Starting price ("cena wywoławcza … <amount> zł"). PERMISSIVE gap (up to 600
 *  chars, no zł in between in the observed data) so it reaches the value across
 *  the announcement TABLE's own header→value distance, then takes the FIRST
 *  well-formed money amount after the label. */
export function startingPriceFromText(text) {
  const m = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[\s\S]{0,600}?${AMOUNT}\s*z[łl]`, 'i').exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** The named buyer, or null. SOLD results state "Nabywcą … został/ła – <Name>"
 *  / "nabywcą została: 1) <Entity>"; UNSOLD results put a dash placeholder
 *  ("został – -------") or "Nikt nie został nabywcą". A capture that is only
 *  dashes/whitespace ⇒ null (unsold). */
export function buyerName(text) {
  const t = whole(text);
  const m = /nabywc\p{L}*(?:\s+\p{L}+){0,3}?\s+zosta\p{L}*(?:\s*\/\s*\p{L}+)?\s*[:–\-]*\s*(.*?)(?=\s{2,}|\bLp\b|\bCena\b|\bStarosta\b|\bLicz\p{L}+\b|\bBUR\b|\bZ\s+up\b|[.\n]|$)/iu.exec(t);
  if (!m) return null;
  const cand = m[1].replace(/^\s*\d+\)\s*/, '').trim();
  if (/^[\s–\-]*$/.test(cand)) return null;
  if (/^nikt\b/i.test(cand)) return null;
  if (!/\p{L}{2,}/u.test(cand)) return null;
  return cand;
}

/** Achieved price — ONLY when a buyer is actually named AND an "osiągnięt…
 *  <amount> zł" figure sits within 40 chars of the keyword (inline prose). The
 *  short gap keeps a multi-parcel land-result TABLE (where the amount is far
 *  from the "osiągnięta" header) from producing a bogus price; such a doc is
 *  unsold anyway (no named buyer). */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!buyerName(t)) return null;
  const m = new RegExp(
    String.raw`(?:osi[ąa]gni[ęe]t\w*|uzyskan\w*|wynios[łl]\w*)[\s\S]{0,40}?${AMOUNT}\s*z[łl]`, 'i',
  ).exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Notice-level kind, classified on the whole document (never the slug). */
export function kindFromText(text) {
  return classifyKind(whole(text));
}

// ----------------------------------------------------------------- flat address

// The Starostwo / Urząd Miasta office, never a property street.
const OFFICE_RE = /tysi[ąa]clecia|1000-?lecia/i;
// A capitalised street word ("PTTK", "Sportowa", "Prusa"); a "1000-lecia" style
// numeric commemorative token is allowed as a CONTINUATION so the office
// "Plac 1000-lecia" is captured whole and rejected by OFFICE_RE.
const STREET_TOKEN = '[A-ZŁŚŻŹĆŃÓĄĘ][\\p{L}.\\-]*';
const STREET_CONT = `(?:${STREET_TOKEN}|\\d{3,4}-?lecia)`;
const STREET_BLDG_SRC =
  `(?:przy\\s+ulic\\w+|(?:^|\\s)ul\\.)\\s+(${STREET_TOKEN}(?:\\s+${STREET_CONT}){0,2})\\s+(\\d+[A-Za-z]?)\\b`;

/** First non-office "przy ulic… / ul. <STREET> <BLDG>" → {street, building}. */
export function flatStreetBuilding(text) {
  const re = new RegExp(STREET_BLDG_SRC, 'giu');
  const t = whole(text);
  let m;
  while ((m = re.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_RE.test(street)) continue;
    return { street, building: m[2] };
  }
  return null;
}

const UNIT_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

/** Flat/unit number ("lokal mieszkalny nr 3"), or null. */
export function unitFromText(text) {
  const m = UNIT_RE.exec(whole(text));
  return m ? m[1] : null;
}

/** "<street> <bldg>[/<apt>]" raw address for a flat/commercial unit, or null. */
export function flatAddressRaw(text) {
  const sb = flatStreetBuilding(text);
  if (!sb) return null;
  const unit = unitFromText(text);
  return unit ? `${sb.street} ${sb.building}/${unit}` : `${sb.street} ${sb.building}`;
}

// Usable floor area — "powierzchni użytkowej 31,91m²". Anchored on "użytkowej"
// so the piwnica ("o pow. 5,11m²") and działka areas are never taken.
const UNIT_AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]?/i;

/** Usable floor area (m²) of a flat, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// ----------------------------------------------------------------- land fields

/** Parcels + area for a LAND record. Parcels from "działka/nr geod./nr ewid.
 *  <N>[/<M>]"; area from the first "o pow(ierzchni) <N> ha|m²". */
export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const add = (p) => { if (p && !seen.has(p)) { seen.add(p); parcels.push(p); } };
  const reP = /(?:dzia[łl]k\w*|nr\s+geod\w*\.?|nr\s+ewid\w*\.?)\s*:?\s*(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) add(m[1]);

  let area_m2 = null;
  // "o pow. 0,2608ha" (ha) OR "o powierzchni 835 m2" (m²/m2 — no \b after "m",
  // since "m2" is a single word token with no boundary between "m" and "2").
  const am = /o\s+(?:[łl][ąa]cznej\s+)?(?:powierzchni|pow\.?)\s*(\d+(?:[.,]\d+)?)\s*(ha|m)/i.exec(t);
  if (am) {
    const v = parseNum(am[1]);
    if (v != null) area_m2 = /ha/i.test(am[2]) ? Math.round(v * 10000) : Math.round(v);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT blob into 0..1 active record(s). Land (kind 'grunt') →
 * one parcel-keyed record for land.json; a flat/commercial notice → one
 * address-keyed record. An address-keyed notice whose street/building can't be
 * resolved is DROPPED.
 * @param {string} text  blob from buildRecordText
 * @returns {object[]}
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    if (!plot.dzialka_nr && plot.area_m2 == null) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: null,
      starting_price_pln,
      auction_date,
      round,
    }];
  }

  const address_raw = flatAddressRaw(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  const rec = {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
  if (address.warning) rec.notes = [address.warning];
  return [rec];
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one CONCLUDED "Informacja o wyniku …" blob into 0..1 result record(s).
 * Land → one parcel-keyed record; a flat result → one address-keyed record.
 * Sold ⇔ a buyer is named; final_price_pln is the achieved figure (may be null
 * if a named-buyer table hides the amount — recorded sold with a note, never a
 * wrong price).
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultDoc(text) || isLease(text)) return [];
  const kind = kindFromText(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const buyerNamed = Boolean(buyerName(text));
  const negativeStated = isNegativeOutcome(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (buyerNamed && achieved == null) notes.push('parse: buyer named but achieved price not found');
  if (!buyerNamed && !negativeStated) notes.push('parse: no buyer and no explicit negative outcome');

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    if (!plot.dzialka_nr && plot.area_m2 == null) return [];
    return [{
      auction_date,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: null,
      round,
      starting_price_pln,
      final_price_pln: buyerNamed ? achieved : null,
      outcome: buyerNamed ? 'sold' : 'unsold',
      unsold_reason: buyerNamed ? null : 'unknown',
      notes,
    }];
  }

  const address_raw = flatAddressRaw(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  return [{
    auction_date,
    source_url: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: buyerNamed ? achieved : null,
    outcome: buyerNamed ? 'sold' : 'unsold',
    unsold_reason: buyerNamed ? null : 'unknown',
    area_m2: unitAreaFromText(text),
    notes,
  }];
}
