// Kalisz parsers — bip.kalisz.pl WGM "Sprzedaż, dzierżawa nieruchomości"
// board. Both announcements and results are born-digital PDF prose in the
// SAME house style (both cite "rozporządzenia Rady Ministrów z dnia 14
// września 2004 roku w sprawie sposobu i trybu przeprowadzania przetargów
// oraz rokowań na zbycie nieruchomości"), so one shared field-extraction
// layer covers both, gated by isAnnouncement()/isResultNotice().
//
// Groundtruthed against REAL fixtures live-fetched 2026-07-16:
//   - ul. Górnośląska 42/11A — flat, II przetarg ustny OGRANICZONY (po
//     obniżonej cenie), area 14,63 m², price 43.000,00 zł, auction
//     2026-07-30. "o powierzchni" precedes the street clause.
//   - ul. Kazimierza Pułaskiego 14/2 — flat, I przetarg ustny nieograniczony
//     (the spike's own cited fixture, still live), area 43,60 m², price
//     130.000,00 zł, auction 2024-08-22. Street clause precedes "o
//     powierzchni" — the OPPOSITE order from Górnośląska, which is why
//     addressFromText() and areaFromText() (core/finn-bip.js) are each
//     independent, order-agnostic scans rather than one fixed-order regex.
//   - ul. Garncarska 9A — RESULT notice, kind zabudowana (a built property,
//     not a flat: "zabudowanej nieruchomości", no "lokal mieszkalny"), I
//     przetarg ustny nieograniczony, cena wywoławcza 350.000,00 zł, SOLD
//     above asking at 353.500,00 zł ("Najwyższa cena osiągnięta w przetargu
//     wyniosła"), "Przetarg zakończył się wynikiem pozytywnym."
//
// The mirror NEGATIVE-outcome sentence ("Przetarg zakończył się wynikiem
// negatywnym.") was NOT independently live-caught this build (none of the
// ~18 live board entries were an unsold flat/built result) — it is inferred
// from the CONFIRMED positive-outcome fixture above: both are the same
// office's fixed fill-in-the-blank template mandated by the same regulation,
// and "wynikiem negatywnym" is also the nationwide-standard idiom already
// live-verified in this project's other cities (see kamienna-gora/parse.js,
// glubczyce/parse.js) AND explicitly noted as a real, observed Kalisz risk in
// the spike itself (spikes/wielkopolskie/kalisz/kalisz.md §4). Re-confirm
// against a real Kalisz negatywny result on first live CI catch.
//
// Land/grunt items ARE classified (classifyKind) so they don't get
// mis-parsed as flats/houses, but are NOT deep-parsed by this build (see
// config.js header for the scope decision) — parseAnnouncement/parseResultDoc
// return null/[] for kind 'grunt'.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText as finnAuctionDateFromText,
  parsePLN,
} from '../../core/finn-bip.js';

export { htmlToText };

// --- notice-type discriminators (run on the fetched PDF BODY — the board's
// own title/teaser text can be stale/mismatched to its linked PDF; see
// crawl.js header) --------------------------------------------------------

// "przetargu ustnego" / "przetarg ustny" in EITHER order. Deliberately does
// NOT exclude on any bare "dzierżaw"/"najem" substring: every real Kalisz
// notice's footer boilerplate points readers back to the board's own section
// name ("w zakładce ogłoszenia sprzedaż dzierżawa nieruchomości"), which
// false-positived an earlier draft of this gate on BOTH real flat-announcement
// fixtures. Requiring "sprzeda" (below) already excludes pure lease/wykaz
// documents, which in the live corpus never use the word at all.
const AUCTION_ANCHOR_RE = /przetarg\w*\s+ustn\w*|ustn\w*\s+przetarg\w*/i;

export function isAuctionSaleDoc(text) {
  const t = text || '';
  if (!AUCTION_ANCHOR_RE.test(t)) return false;
  return /sprzeda/i.test(t);
}

export function isResultNotice(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && /informacj\w*\s+o\s+wyniku|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(t);
}

export function isAnnouncement(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && !isResultNotice(t) && /og[łl]asza/i.test(t);
}

// --- subject-clause scoping --------------------------------------------
//
// Kalisz PDFs are multi-page: "ogłasza"/"informacja o wyniku" opens the
// SUBJECT clause (what's being sold, where), followed by "I. Termin i
// miejsce przetargu" / "I. Miejsce i termin przetargu", then a much longer
// "II. Dane dotyczące nieruchomości" body, and every document (announcement
// AND result) ends with a fixed RODO/data-processing clause that lists the
// CITY'S SOFTWARE VENDORS' office addresses ("Logotec Enterprise S.A. ...
// ulicy Aleksandra Ostrowskiego 7", "Asseco Data System S.A. ... ulicy
// Podolskiej 21", "Systherm Info ... ulicy Złotowskiej 27") — real "przy
// ulicy <street> <number>" text that is NOT the property's address.
//
// LIVE-CAUGHT this build (full 18-item board smoke test, not the curated
// fixtures): a village/gmina property notice (Janków Drugi, no city street)
// has NO real "przy ul." anywhere near its subject, so an unscoped
// addressFromText() fell through hundreds of lines to the RODO vendor
// address and fabricated a bogus "ul. Aleksandra Ostrowskiego 7" record. A
// second land notice (Rusinowo, multi-parcel) got misclassified 'zabudowana'
// because classifyKind() on the FULL text hit an unrelated positive
// "zabudowana" deep in body section II (a small utility pump-station on part
// of the plot), outranking the subject's own "niezabudowanych" — then hit
// the SAME vendor-address bug once past the (wrongly passed) kind gate.
//
// Fix: classifyKind() and address extraction below both run ONLY on the
// bounded SUBJECT window — from the "ogłasza"/"informacja o wyniku" anchor
// up to the next "I. " Roman-numeral section header (or a hard char cap) —
// never on the full multi-page body. A subject with no real street nearby
// (the village case) then correctly yields no address (null), instead of
// fabricating one from unrelated boilerplate.
const SECTION_HEADER_RE = /\n\s*I\.\s+[A-ZŁŚŻŹĆŃÓĄĘ]/;
const SUBJECT_WINDOW_CAP = 900;

/** @param {string} text @returns {string} the bounded subject-clause window */
export function subjectWindow(text) {
  const t = text || '';
  const anchorM = /og[łl]asza|informacj\w*\s+o\s+wyniku/i.exec(t);
  const rest = anchorM ? t.slice(anchorM.index) : t;
  const sectionM = SECTION_HEADER_RE.exec(rest.slice(10));
  const end = sectionM ? Math.min(10 + sectionM.index, SUBJECT_WINDOW_CAP) : SUBJECT_WINDOW_CAP;
  return rest.slice(0, end);
}

// --- field extractors ------------------------------------------------------

// Apartment number: "lokalu mieszkalnego nr 11A" / "lokal mieszkalny nr 2".
const APT_RE = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;
// Street+building: "przy ul./ulicy/pl./placu/al./alei/os./osiedlu <STREET> <BLDG>".
// STREET is a run of non-digit, non-comma characters (street names here carry
// no Arabic digit), so the first number after it is the building — order-
// agnostic w.r.t. where "o powierzchni"/apt clauses fall (see header note).
const STREET_RE =
  /przy\s+(?:ul\.|ulic\w+|pl\.|plac\w*|al\.|alei|alej\w+|os\.|osiedl\w+)\s+([^\d,]{2,60}?)\s+(\d+[A-Za-z]?)\b/i;

/**
 * @param {string} text  full document text — internally scoped to
 *   subjectWindow() so boilerplate elsewhere (RODO vendor addresses, section
 *   II incidental mentions) can never be picked up (see header note above).
 * @returns {{address_raw:string, address:object}|null}
 */
export function addressFromText(text) {
  const w = subjectWindow(text);
  const sm = STREET_RE.exec(w);
  if (!sm) return null;
  const street = sm[1].trim().replace(/\s+/g, ' ');
  const building = sm[2];
  const am = APT_RE.exec(w);
  const apt = am ? am[1] : null;
  const raw = `ul. ${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

// Round: announcements state it as a WORD ordinal near "ogłasza" ("ogłasza
// drugi przetarg ustny ograniczony"); results state it near "wyniku"/"odbył
// się" ("o wyniku pierwszego przetargu"). Roman-numeral fallback covers the
// board's OWN teaser wording ("II przetargu") in case a future fixture's PDF
// body uses it too.
const ORDINAL = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5,
  'szóst': 6, szost: 6, 'siódm': 7, siodm: 7, 'ósm': 8, osm: 8,
  'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/** @param {string} text @returns {number|null} */
export function roundFromText(text) {
  const t = text || '';
  const m =
    /(?:og[łl]asza|wynik\w*|odby[łl]\s+si[ęe])[\s\S]{0,50}?(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+przetarg/i.exec(
      t,
    );
  if (m) {
    const word = m[1].toLowerCase();
    for (const [stem, n] of Object.entries(ORDINAL)) {
      if (word.startsWith(stem)) return n;
    }
  }
  const rm = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg/.exec(t);
  if (rm) return ROMAN[rm[1]] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9, pazdziernika: 10,
  'października': 10, listopada: 11, grudnia: 12,
};

/**
 * Auction date. Announcements use finn-bip's proven future-tense "odbędzie
 * się <D miesiąca RRRR>" extractor. Result notices are past-tense ("w dniu
 * <D miesiąca RRRR> r. ... został przeprowadzony ..." / "... odbył się ...
 * przetarg"), which finn-bip's extractor doesn't cover (it's announcement-
 * only) — handled here.
 * @param {string} text @returns {string|null} ISO date
 */
export function auctionDateFromText(text) {
  const fromAnnouncement = finnAuctionDateFromText(text);
  if (fromAnnouncement) return fromAnnouncement;
  const m =
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,150}?(?:zosta[łl]\s+przeprowadzon\w*|odby[łl]\s+si[ęe])\s+\w*\s*przetarg/i.exec(
      text || '',
    );
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** "Najwyższa cena osiągnięta w przetargu wyniosła 353.500,00 zł" → 353500. */
export function achievedPriceFromText(text) {
  const m = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t\w*[\s\S]{0,60}?([\d][\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** "Przetarg zakończył się wynikiem pozytywnym." — sold. */
export function isPositiveOutcome(text) {
  return /wynikiem\s+pozytywnym/i.test(text || '');
}

/** "Przetarg zakończył się wynikiem negatywnym." / "nie wyłoniono nabywcy" /
 *  "nie odnotowano wpłaty wadium" — unsold. See header: not yet live-caught
 *  against a real Kalisz fixture this build. */
export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy|nie\s+(?:odnotowano|wp[łl]aci[łl]\w*)\s+wadium/i.test(
    text || '',
  );
}

// --- top-level parsers -------------------------------------------------

/**
 * Parse one announcement PDF's text into 0-1 active-listing records. Returns
 * null when the text isn't a real open-auction sale announcement, is a land
 * ('grunt') notice (out of scope this build), or isn't keyable (no street +
 * building found).
 * @param {string} text  pdftotext output
 * @param {{url?:string}} [opts]
 */
export function parseAnnouncement(text, opts = {}) {
  const t = text || '';
  if (!isAnnouncement(t)) return null;
  const kind = classifyKind(subjectWindow(t)); // scoped — see subjectWindow() header note
  if (kind === 'grunt') return null; // land: parcel-keyed, out of scope (see header)
  const addr = addressFromText(t);
  if (!addr) return null;
  const { url = null } = opts;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(t),
    round: roundFromText(t),
    starting_price_pln: priceFromText(t),
    auction_date: auctionDateFromText(t),
    detail_url: url,
    source_url: url,
  };
}

/**
 * Parse one result ("Informacja o wyniku ... przetargu") PDF's text into the
 * achieved-price-stream record(s). Returns [] when the text isn't a real
 * result notice, is a land ('grunt') notice (out of scope this build), or
 * isn't keyable.
 * @param {string} text  pdftotext output (source:'html' ⇒ ref.text)
 * @param {string|null} fallbackDate  ISO date from the crawl ref
 * @param {string} sourceUrl  the result PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  if (!isResultNotice(t)) return [];
  const kind = classifyKind(subjectWindow(t)); // scoped — see subjectWindow() header note
  if (kind === 'grunt') return []; // land: out of scope (see header)
  const addr = addressFromText(t);
  if (!addr) return [];

  const positive = isPositiveOutcome(t);
  const negative = isNegativeOutcome(t);
  const final_price_pln = positive ? achievedPriceFromText(t) : null;
  const outcome = final_price_pln != null ? 'sold' : negative ? 'unsold' : 'unknown';

  const notes = [];
  if (addr.address.warning) notes.push(addr.address.warning);
  if (positive && final_price_pln == null) notes.push('parse: sold notice but no achieved price found');

  return [{
    auction_date: auctionDateFromText(t) || fallbackDate || null,
    source_pdf: sourceUrl || null,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round: roundFromText(t),
    area_m2: areaFromText(t),
    starting_price_pln: priceFromText(t),
    final_price_pln,
    outcome,
    unsold_reason: negative ? 'wynikiem negatywnym' : null,
    notes,
  }];
}
