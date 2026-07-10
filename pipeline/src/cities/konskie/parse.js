// Końskie parsers — operate on pdftotext -layout output (born-digital PDFs;
// no OCR needed, confirmed live). Both announcement and result HTML detail
// pages on bip.umkonskie.pl are cover sheets only (title + "Data wytworzenia
// dokumentu" + one PDF attachment link) — ALL substance (address, area,
// price, date, round, outcome) lives in the PDF. See crawl.js for the fetch
// orchestration; every function here is a pure text -> record transform.
//
// Board 5027 mixes lokal mieszkalny (flat), nieruchomość niezabudowana/
// zabudowana (land/house) and dzierżawa (lease) notices in one chronological
// feed — the title alone never states the kind ("Informacja o wynikach
// przetargu - ul. Mieszka I" could be either). classifyKind() on the PDF text
// is therefore the authoritative flat/non-flat gate, applied in both
// parseAnnouncement and parseResultDoc (and again, cheaply, by crawl.js
// before it bothers building a ref/record) — matching the shared-util
// convention documented in ADAPTER-GUIDE.md and used by chelmno's parser.
//
// Groundtruthed LIVE 2026-07-10 against FIVE real PDFs (2 announcements, 3
// results) spanning TWO properties and THREE sentence templates for the
// address+apartment clause:
//
//   Mieszka I 3/43 (spółdzielcze udział 1/2, coop-share flat):
//     ogłoszenie (id 882606, wytworzono 2026-05-11):
//       "Przedmiotem sprzedaży jest spółdzielcze własnościowe prawo do lokalu
//        mieszkalnego nr 43 o powierzchni użytkowej 46,94 m², położonego w
//        budynku wielorodzinnym przy ul. Mieszka I 3 w Końskich, ...
//        w udziale wynoszącym 1/2 części. Cena wywoławcza lokalu wynosi –
//        105.500,00 złotych. ... Pierwszy przetarg ustny nieograniczony ...
//        odbędzie się dnia 23 czerwca 2026 roku o godz. 10:00."
//     informacja o wynikach (id 891845, wytworzono 2026-07-02):
//       "... informacje o wynikach pierwszego przetargu ustnego
//        nieograniczonego przeprowadzonego w dniu 23 czerwca 2026 roku ...
//        Przedmiotem przetargu było spółdzielcze własnościowe prawo do lokalu
//        mieszkalnego nr 43 o powierzchni użytkowej 46,94 m² ... przy ul.
//        Mieszka I 3 w Końskich ... Cena wywoławcza lokalu wynosiła –
//        105.500,00 złotych. ... na konto urzędu nie wpłynęło żadne wadium.
//        ... przetarg zakończył się wynikiem negatywnym." (UNSOLD)
//
//   Warsztatowa 2B/4 (round 1 -> round 2, price cut 109 000 -> 85 000):
//     ogłoszenie round 2 (id 868285, wytworzono 2026-02-20):
//       "OGŁOSZENIE O DRUGIM PRZETARGU ... ogłasza drugi przetarg ustny
//        nieograniczony na zbycie nieruchomości lokalowej ... Pierwszy
//        przetarg został przeprowadzony w dniu 29 października 2025 roku.
//        [^ HISTORY clause — must not be read as the operative round/date.]
//        Przedmiotem sprzedaży jest lokal mieszkalny nr 4 położony w
//        Końskich przy ulicy Warsztatowej 2B. ... Cena nieruchomości wynosi -
//        85.000,00 złotych ... Opis nieruchomości: lokal mieszkalny numer 4 o
//        powierzchni użytkowej 53,00 m², położony na poddaszu w budynku przy
//        ul. Warsztatowej 2B ... Drugi przetarg ... odbędzie się dnia 25
//        marca 2026 roku o godz. 10:00."
//     informacja o wynikach round 1 (id 849424, wytworzono 2025-11-06):
//       "... wynikach pierwszego przetargu ustnego nieograniczonego
//        przeprowadzonego w dniu 29 października 2025 roku ... Przedmiotem
//        przetargu był lokal mieszkalny położony na poddaszu w budynku przy
//        ulicy Warsztatowej 2B, oznaczony numerem 4 o powierzchni użytkowej
//        53,00 m². ... Cena wywoławcza nieruchomości wynosiła 109.000,00
//        złotych brutto. ... nie wpłynęło żadne wadium ... wynikiem
//        negatywnym." (UNSOLD)
//     informacja o wynikach round 2 (id 875621, wytworzono 2026-04-02):
//       "... wynikach drugiego przetargu ustnego nieograniczonego
//        przeprowadzonego w dniu 25 marca 2026 roku ... Przedmiotem przetargu
//        był lokal mieszkalny położony w Końskich przy ulicy Warsztatowej 2B,
//        oznaczony numerem 4 o powierzchni użytkowej 53,00 m². ... Cena
//        wywoławcza lokalu wynosiła 85.000,00 złotych. ... na konto urzędu
//        wpłynęło jedno wadium ... Osoba dopuszczona nie stawiła się na
//        przetargu ... wynikiem negatywnym." (UNSOLD — bidder no-show)
//
// VALIDATE: all 5 live fixtures are UNSOLD (0 sales fell inside this crawl's
// window). achievedPriceFromText() is EXTRAPOLATED from the §12 rozporządzenie
// Rady Ministrów template's mandatory wording ("najwyższą cenę osiągniętą w
// przetargu") plus the "nabywcą ... za cenę N zł" clause confirmed live in
// other cities (chelmno, tczew) — NOT live-confirmed for Końskie. Tczew's
// parser shipped with the same caveat (see its parse.js header); flag any
// 'sold' record from this parser for a manual spot-check the first time one
// actually appears.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// classifyKind() false-positive guard (adapter-level — core/classify-kind.js
// is shared and must not be modified). A "zabudowana działka" (built plot /
// whole-house) notice can ALSO mention "lokale mieszkalne" purely to
// describe units INSIDE the building, often explicitly qualified as NOT
// independent/for-sale units — classifyKind's FLAT_RE fires on that
// substring even though the notice's own SALE-OBJECT clause ("na zbycie
// zabudowanej działki") says the whole plot is being sold, not a flat.
// CONFIRMED LIVE 2026-07-10 (case GN.6840.6.2025.IG, ul. Strażacka 26):
// "W budynku znajduje się sześć lokali mieszkalnych, nie stanowiących
// samodzielnych lokali w świetle przepisów prawa." classifyKind alone
// returns 'mieszkalny' for that text; flatKindFromText downgrades it to
// 'zabudowana' so it's excluded from this flats-only adapter exactly like
// any other non-flat kind (see crawl.js's kind gate).
const SALE_OBJECT_IS_PLOT_RE = /(?:zbycie|sprzeda[żz]\w*)\s+zabudowan\w*\s+dzia[łl]k/i;
export function flatKindFromText(text) {
  const k = classifyKind(text);
  if (k === 'mieszkalny' && SALE_OBJECT_IS_PLOT_RE.test(text || '')) return 'zabudowana';
  return k;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "105.500,00" / "85.000,00" / "1 000 000,00" -> integer PLN.
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "46,94" / "53,00" -> number.
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Collapse pdftotext -layout's justified line-wrapping to one space-joined
 *  line so every regex below can assume a single line (street names and
 *  labelled values both wrap mid-token between the announcement and result
 *  templates — see e.g. "ul. Mieszka\nI 3" in the result PDF). */
export function normalizeText(raw) {
  return (raw || '').replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------- field extractors
// All operate on an already-normalizeText()-ed single-line string.

// Apartment/unit number: "lokalu mieszkalnego nr 43" / "lokal mieszkalny
// numer 4" / "oznaczony numerem 4". Anchored on "lokal...mieszkaln" or
// "oznaczony" so it never picks up an unrelated "nr"/"numer" elsewhere (parcel
// "działki nr 1009/14", KW "księgę wieczystą numer KI1K/...", which also
// starts with letters so \d+ wouldn't match it anyway).
const APT_RE = /(?:lokal\w*\s+mieszkaln\w*\s+(?:nr|numer)|oznaczon\w*\s+numerem)\s+(\d+[A-Za-z]?)/i;
export function aptFromText(text) {
  const m = APT_RE.exec(text || '');
  return m ? m[1] : null;
}

// Street + building: "przy ul. Mieszka I 3" / "przy ulicy Warsztatowej 2B".
// MUST be anchored on a preceding "położon(y/ego/ej)" (located) — every result
// document's OPENING paragraph names the auction VENUE first ("w siedzibie
// Urzędu Miasta i Gminy w Końskich przy ul. Partyzantów 1", the city hall's
// own address, with no "położon..." nearby), and that "przy ul." occurs
// BEFORE the actual property's "przy ul." later in the same document — a
// bare "przy ul(icy)?" search (no anchor) matches the venue instead (real bug
// caught against the live RES_MIESZKA_I/RES_WARSZTATOWA fixtures, both of
// which state the venue before the property — see the test file). The gap is
// generous (60 chars) since "położonego" and "przy ul." are separated by a
// varying clause across templates ("w budynku wielorodzinnym", "na poddaszu
// w budynku", or nothing at all). Street capture is lazy and non-digit so it
// stops at the building number regardless of what follows.
const STREET_BUILDING_RE = /po[łl]o[żz]on\w*[^.]{0,60}?przy\s+(?:ul\.|ulicy)\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\d,.]+?)\s+(\d+[A-Za-z]?)\b/i;
export function streetBuildingFromText(text) {
  const m = STREET_BUILDING_RE.exec(text || '');
  if (!m) return null;
  return { street: m[1].replace(/\s+/g, ' ').trim(), building: m[2] };
}

export function addressRawFromText(text) {
  const sb = streetBuildingFromText(text);
  if (!sb) return null;
  const apt = aptFromText(text);
  return apt ? `${sb.street} ${sb.building}/${apt}` : `${sb.street} ${sb.building}`;
}

export function addressFromText(text) {
  const raw = addressRawFromText(text);
  return raw ? parseAddress(raw) : null;
}

// "o powierzchni użytkowej 46,94 m²" / "53,00 m²" — identical phrase across
// both templates.
const AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w*\s+(\d+[.,]\d+)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// Starting price. Label varies across fixtures ("Cena wywoławcza lokalu
// wynosi(ła)", "Cena wywoławcza nieruchomości wynosiła", "Cena nieruchomości
// wynosi") — anchored loosely on "Cena ... wynosi(ła)" with at most one filler
// word, so it never crosses into the "Wadium wynosi ..." sentence that follows
// it (that phrase starts with "Wadium", not "Cena"). The filler-word group
// uses `\S` (not `\w`) — plain `\w` in a non-unicode JS regex is ASCII-only
// and does NOT match Polish diacritics, so it silently failed to consume
// "nieruchomości" (real bug: broke "Cena nieruchomości wynosi" — caught
// against the live WARSZTATOWA_ANN_R2/RES_WARSZTATOWA_R1 fixtures).
const START_PRICE_RE = /Cena\s+(?:wywo[łl]awcza\s+)?(?:\S+\s+)?wynosi(?:[łl]a)?\s*[-–]?\s*(\d[\d\s.,]*?)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = START_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Achieved (sold) price — EXTRAPOLATED, see file header VALIDATE note.
// Case endings are flexible (nominative "Najwyższa cena osiągnięta" as a
// standalone clause, or accusative "najwyższą cenę osiągniętą" as a noun
// phrase) since which one a real Końskie sold notice uses is unconfirmed.
const ACHIEVED_PRICE_RE = /Najwy[żz]sz[ąa]\s+cen[ęa]\s+osi[ąa]gni[ęe]t[ąa][\s\S]{0,60}?(\d[\d\s.,]*?)\s*z[łl]/i;
const BUYER_PRICE_RE = /nabywc[ąa][\s\S]{0,150}?za\s+cen[ęe]\s+(\d[\d\s.,]*?)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  let m = ACHIEVED_PRICE_RE.exec(text || '');
  if (m) return parsePLN(m[1]);
  m = BUYER_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Negative (unsold) outcome — confirmed live in all 3 result fixtures
// ("przetarg zakończył się wynikiem negatywnym").
const NEGATIVE_RE = /wynik\w*\s+negatywn|nie\s+wy[łl]oniono\s+nabywcy|nikt\s+nie\s+przyst[ąa]pi[łl]/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

// Round. Two operative anchors, tried in order:
//   announcement: "ogłasza <ordinal> przetarg" (word ordinal or Roman)
//   result:       "wynikach <ordinal-genitive> przetargu"
// Both are anchored on the OPERATIVE clause, not a bare ordinal-word search,
// so the round-2 announcement's history sentence ("Pierwszy przetarg został
// przeprowadzony w dniu ...") can never win — the same trap chelmno's
// roundFromText guards against.
const ROUND_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4], ['piąt', 5], ['piat', 5],
];
function roundFromStem(word) {
  const w = (word || '').toLowerCase();
  for (const [stem, val] of ROUND_STEMS) if (w.startsWith(stem)) return val;
  return null;
}
const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VAL[up[i]];
    const next = ROMAN_VAL[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}
const ANNOUNCE_ROUND_RE = /og[łl]asza\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|[IVXL]{1,4})\s+przetarg/i;
const RESULT_ROUND_RE = /wynikach\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+przetarg/i;
export function roundFromText(text) {
  const t = text || '';
  let m = ANNOUNCE_ROUND_RE.exec(t);
  if (m) {
    const word = m[1];
    const r = /^[IVXL]+$/i.test(word) ? romanToInt(word) : roundFromStem(word);
    if (r) return r;
  }
  m = RESULT_ROUND_RE.exec(t);
  if (m) {
    const r = roundFromStem(m[1]);
    if (r) return r;
  }
  return null;
}

// Auction date. TWO separate anchors tried in PRIORITY order, not document
// order:
//   1. "odbędzie się dnia/w dniu ..." — the SCHEDULED (future) date. Only
//      announcements say this, and always for the operative round.
//   2. "przeprowadzon(ego/y) dnia/w dniu ..." — the HELD (past) date. Only
//      results say this — for the operative round, since results have no
//      other auction to describe.
// Trying (1) as a complete, independent match FIRST is load-bearing: a
// round->=2 ANNOUNCEMENT also narrates the PRIOR round's history ("Pierwszy
// przetarg został przeprowadzony w dniu 29 października 2025 roku") BEFORE
// stating the current round's schedule ("... odbędzie się dnia 25 marca 2026
// roku") later in the same PDF. A single combined regex scanning left-to-
// right would match that history clause first (real bug caught against the
// live Warsztatowa round-2 announcement fixture below — see the test file).
// Falling back to (2) only when (1) found nothing keeps results (which never
// say "odbędzie się") working the same as before.
// Both also guard the wadium deadline ("do dnia 17 czerwca 2026 roku") and
// legal citation dates ("ustawy z dnia 21 sierpnia 1997 r. ...") elsewhere in
// the same PDF via the tight anchor + `[^.]{0,40}?` gap.
const DATE_SCHEDULED_RE = /odb[ęe]dzie\s+si[ęe][^.]{0,40}?(?:dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i;
const DATE_HELD_RE = /przeprowadzon\w*[^.]{0,40}?(?:dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i;
export function auctionDateFromText(text) {
  const t = text || '';
  const m = DATE_SCHEDULED_RE.exec(t) || DATE_HELD_RE.exec(t);
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// Fractional co-op share ("w udziale wynoszącym 1/2 części") — flags the
// Mieszka I coop-share sale so downstream zł/m² sanity checks know the price
// covers only a fraction of the unit's area (ADAPTER-GUIDE §5 "edge cases").
const SHARE_RE = /udziale?\s+wynosz[ąa]cym\s+(\d+\/\d+)\s+cz[ęe][śs]ci/i;
export function shareFromText(text) {
  const m = SHARE_RE.exec(text || '');
  return m ? m[1] : null;
}

// ---- detail-page (cover sheet) helpers --------------------------------------

// "Data wytworzenia dokumentu: <span>DD.MM.YYYY</span>" — dot-separated on
// Końskie's BIP (confirmed live; Tczew/Giżycko use dashes — different sites).
export function publishedDateFromDetail(html) {
  if (!html) return null;
  const m = /Data wytworzenia dokumentu:\s*<span>(\d{2})\.(\d{2})\.(\d{4})<\/span>/i.exec(html);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const PL_MONTHS_GEN = { ...PL_MONTHS };
  const m2 = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(html);
  if (m2) {
    const mon = PL_MONTHS_GEN[m2[2].toLowerCase()];
    if (mon) return iso(m2[3], mon, m2[1]);
  }
  return null;
}

// First bip-v1-files.idcom-jst.pl PDF attachment link on a detail page.
export function attachmentPdfUrlFromDetail(html) {
  if (!html) return null;
  const m = /href="(https?:\/\/bip-v1-files\.idcom-jst\.pl[^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

// ------------------------------------------------------------- top-level parsers

/**
 * Parse one ANNOUNCEMENT PDF's pdftotext output into a fully-formed active
 * listing, or null (non-flat kind / unparseable address). Called directly by
 * crawl.js's crawlActive() — the registry contract has no separate "parse"
 * step for active listings (unlike results).
 * @param {string} rawText  pdftotext -layout output
 * @param {{detailUrl?: string, publishedDate?: string|null}} [meta]
 * @returns {object|null}
 */
export function parseAnnouncement(rawText, meta = {}) {
  const text = normalizeText(rawText);
  if (!text) return null;
  if (flatKindFromText(text) !== 'mieszkalny') return null;
  const address = addressFromText(text);
  if (!address) return null;
  const share = shareFromText(text);
  return {
    kind: 'mieszkalny',
    address_raw: addressRawFromText(text),
    address,
    area_m2: areaFromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text),
    detail_url: meta.detailUrl ?? null,
    published_date: meta.publishedDate ?? null,
    ...(share ? { share } : {}),
  };
}

/**
 * Parse one RESULT PDF's pdftotext output into 0 or 1 result record (array =
 * framework interface, matches tczew/chelmno). Returns [] for non-flat kind
 * or an unparseable address.
 * @param {string} rawText     pdftotext -layout output
 * @param {string|null} fallbackDate  ISO date from the crawl ref (published_date)
 * @param {string} sourceUrl   the PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(rawText, fallbackDate, sourceUrl) {
  const text = normalizeText(rawText);
  if (!text) return [];
  if (flatKindFromText(text) !== 'mieszkalny') return [];
  const address = addressFromText(text);
  if (!address) return [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const negative = isNegativeOutcome(text);
  const achieved = negative ? null : achievedPriceFromText(text);
  const sold = achieved != null;
  const share = shareFromText(text);

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
    address,
    kind: 'mieszkalny',
    address_raw: addressRawFromText(text),
    auction_date,
    round,
    area_m2: areaFromText(text),
    starting_price_pln,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'no_buyer',
    final_price_pln: sold ? achieved : null,
    source_pdf: sourceUrl,
    notes,
    ...(share ? { share } : {}),
  }];
}
