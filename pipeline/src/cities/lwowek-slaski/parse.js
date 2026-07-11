// Lwówek Śląski parsers.
//
// Gmina i Miasto Lwówek Śląski (Burmistrz Gminy i Miasta Lwówek Śląski) sells
// municipal property — predominantly undeveloped land parcels (działki
// niezabudowane), plus the occasional flat / commercial unit / built property —
// at `<ROMAN> przetarg ustny nieograniczony na sprzedaż` and publishes them on
// its IDcom.pl BIP `bip.lwowekslaski.pl` (see config.js / crawl.js for the
// source-platform story). crawl.js fetches each article's TITLE (detail-page
// <h2 class="header">) and its born-digital PDF body (`pdfText`) and assembles
// them into ONE labelled blob via buildRecordText(); every parser below reads
// that blob. The test builds the SAME blob from real captured title + PDF text,
// so the parsers are groundtruthed against live data.
//
// All regexes groundtruthed against LIVE documents (verified 2026-07-11):
//   LAND announcement (wiadomosc 884419): TITLE "Ogłoszenie o IV przetargu
//     ustnym nieograniczonym na sprzedaż nieruchomości niezabudowanej,
//     oznaczonej ewidencyjnie nr 35/1 o powierzchni 0,3617 ha, położonej w
//     obrębie 1 miasta Lwówek Śląski." + PDF "IV przetarg ustny nieograniczony
//     na sprzedaż nieruchomości niezabudowanej, oznaczonej ewidencyjnie nr 35/1
//     o powierzchni 0,3617 ha, położonej w obrębie 1 miasta Lwówek Śląski. …
//     Dla nieruchomości … wyznaczone były terminy poprzednich przetargów: I
//     przetarg- 26.01.2026 r., II przetarg- 13.03.2026 r., III przetarg-
//     15.05.2026 r. … Cena wywoławcza nieruchomości wynosi: 225.000,00 zł
//     Przetarg odbędzie się dnia 03.07.2026 r. o godz. 0930 …" — the prior-round
//     history uses a bare "I przetarg-" with NO "ustny", so it can't win the
//     round anchor; those numeric dates are not on the "Przetarg odbędzie się
//     dnia" anchor, so they can't win the auction date.
//   COMMERCIAL announcement (wiadomosc 848589): "II przetarg ustny
//     nieograniczony na sprzedaż lokalu niemieszkalnego położonego na parterze
//     budynku mieszkalno- użytkowego przy ul. Krótkiej nr 1 w Lwówku Śląskim o
//     powierzchni użytkowej 45,90 m2, … Z przedmiotowym lokalem wiąże się
//     udział … w częściach wspólnych budynku i działce nr 201/1 o powierzchni
//     0,0376 ha … Cena wywoławcza nieruchomości wynosi: 140.000,00 zł …
//     Przetarg odbędzie się dnia 12.12.2025 r. …" — the udział "działce nr
//     201/1 o powierzchni 0,0376 ha" is NOT the unit area (that is the "45,90
//     m2" użytkowa) and a uzytkowy unit is address-keyed, never parcel-keyed.
//   LAND result SOLD (wiadomosc 884607): "INFORMACJĘ O WYNIKU PRZETARGU W dniu
//     15.05.2026 roku … przeprowadziła III przetarg ustny nieograniczony na
//     sprzedaż niezabudowanej działki oznaczonej ewidencyjnie nr 718/3,
//     położonej w obrębie 2 miasta Lwówek Śląski. … Cena wywoławcza
//     nieruchomości wynosiła: 96.000,00 zł Cena osiągnięta w przetargu:
//     97.000,00 zł netto. … Łączna cena nabycia wynosi 119.310,00 zł brutto …
//     Nabywcą w/w nieruchomości zostali ustaleni Państwo …" — the achieved
//     price is the "Cena osiągnięta w przetargu" (97.000) NET amount, NOT the
//     "Łączna cena nabycia … brutto" (119.310) VAT-inclusive total.
//   FLAT result TITLE-ONLY (wiadomosci 841002 / 840998): the article body is an
//     empty <div class="wiadomosc"></div> with NO PDF attachment, so the blob
//     is TITLE-only: "Informacja o wyniku przetargu_na sprzedaż lokalu
//     mieszkalnego nr 1 położonego przy ulicy Orzeszkowej 32-36 we Lwówku
//     Śląskim" / "… lokalu mieszkalnego nr 3 położonego w miejscowości Gaszów nr
//     30." — address + round survive; there is NO price/outcome (→ outcome
//     'unsold' + a "no achieved price and no explicit negative outcome" note).
//   BUILT rural (wiadomosc 884410, Niwnice 105): "II przetarg ustny
//     nieograniczony na sprzedaż nieruchomości zabudowanej budynkiem
//     mieszkalno- gospodarczym nr 105 … położonej w obrębie Niwnice …" — kind
//     'zabudowana' (address-keyed) but the address is a bare "nr 105 … w obrębie
//     Niwnice" with no "przy ul." / "w miejscowości … nr", so addressRawFromText
//     returns null and parseAnnouncement DROPS it rather than fabricate an
//     address (accepted gap for this rare rural-built case).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// Polish letters allowed inside a street / village name (letters, spaces, dots
// and hyphens — never digits, so the building number always terminates it).
const NAME_CHARS = 'A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\\- ';

// "225.000,00" / "96 000" / "119.310,00" / "1 500 000,00" -> integer PLN.
// Space OR dot thousands separator; optional ",NN" grosze tail (dropped — every
// adapter in this repo stores whole złoty).
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "45,90" / "0,3617" / "149,50" -> number. Comma OR dot decimal; space stripped.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------- record text blob

/** Collapse an HTML fragment (or a plain title / pdftotext body) to a single
 *  line of plain text. `pdftotext -layout` output is mostly plain already; the
 *  entity map covers the article TITLE (HTML-escaped in the detail page). */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#8221;|&#8222;|&#8220;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assemble the labelled text blob every parser reads. crawl.js passes the
 * article TITLE + the born-digital PDF body (or '' for a title-only notice);
 * the test passes the raw captured strings and lets stripHtml run. One line per
 * field so `^LABEL:` (multiline) reads each.
 * @param {{title?:string, body?:string}} f
 * @returns {string}
 */
export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

/** Read a single labelled line's value from the blob. The inter-label gap is
 *  matched with [ \t]* (NOT \s*) so an EMPTY field can't let the match slide
 *  across the newline and capture the next label's line. */
function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

/** TITLE + BODY concatenated — the searchable surface for anchored regexes. */
function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'BODY')}`.trim();
}

// ----------------------------------------------------------------- doc-type gates

/** True when this notice is a SALE auction ("… przetarg … na sprzedaż …").
 *  Excludes the board's lease notices (which say "na oddanie w dzierżawę")
 *  and — combined with isResultDoc — routes announcements vs results. */
export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

/** True when this is a DZIERŻAWA / NAJEM lease (rent), not a sale — skipped.
 *  The Przetargi board carries "… przetarg na oddanie w dzierżawę części
 *  nieruchomości …" items that share "przetarg" but are not property sales. */
export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|oddanie\s+w\s+dzier/i.test(t);
}

/** True when this is a result / outcome notice: "Informacja o wyniku
 *  przetargu", "Informacja o nabywcy …", or a body that reports a concluded
 *  "przeprowadzono/przeprowadziła … przetarg". Announcements ("Ogłoszenie o …
 *  przetargu") do NOT match. */
export function isResultDoc(text) {
  const t = whole(text);
  return /informacj\w*\s+o\s+wyniku|informacj\w*\s+o\s+nabywc|wyniku\s+przetargu|\bnabywc\w*/i.test(t) &&
    !/^\s*og[łl]oszenie\s+o\b/i.test(field(text, 'TITLE'));
}

/** True when the resolution explicitly states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium|nie\s+wp[łl]yn[ęe][łl]o\s+wadium|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nie\s+odby[łl]\s+si[ęe]/i.test(t);
}

// ----------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XXXIX range used here) -> int, or null if malformed. */
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
 * Auction round. Anchored on "<ROMAN> przetarg ustn…" (Lwówek always writes the
 * round as "IV przetarg ustny nieograniczony" — ROMAN, then "przetarg ustny").
 * The prior-round history ("terminy poprzednich przetargów: I przetarg-
 * 26.01.2026 r., II przetarg- …") uses a bare "przetarg" with NO "ustny"
 * following, so it never matches. Returns null when unstated.
 */
export function roundFromText(text) {
  const m = /\b([IVXL]{1,5})\s+przetarg\w*\s+ustn\w*/i.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}

// ----------------------------------------------------------------- date

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

/**
 * Auction date. PRIMARY (announcement): "Przetarg odbędzie się dnia 03.07.2026
 * r. o godz. …" — anchored on the literal "Przetarg odbędzie się dnia" label,
 * distinct from the doc-date footer ("Lwówek Śląski Dnia: 19.05.2026 r."), the
 * wadium deadline ("w terminie do dnia 29.06.2026 r."), and the prior-round
 * history dates. FALLBACK (result): "W dniu 15.05.2026 roku … przeprowadziła …
 * przetarg" — the concluded auction date. -> ISO / null.
 */
export function auctionDateFromText(text) {
  const t = whole(text);
  let m = /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+dnia\s+([\s\S]{0,16})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /\bW\s+dniu\s+([\s\S]{0,24}?)\s*(?:r\.|roku)/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. Anchored on the NOMINATIVE "cena wywoławcza …" (announcement
 *  "Cena wywoławcza nieruchomości wynosi: 225.000,00 zł"; result "… wynosiła:
 *  96.000,00 zł") — the FIRST amount after it. The wadium clause uses the
 *  GENITIVE "…w wysokości 10 ceny wywoławczej tj. kwoty: 22.500,00 zł" ("ceny",
 *  not "cena"), so the `cena` literal never anchors there. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz[ae]\w*[^0-9]{0,40}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price — ONLY when a buyer is named ("… Nabywcą …"), anchored on
 *  "Cena osiągnięta w przetargu: <amount> zł" — the NET hammer price. The
 *  "Łączna cena nabycia … brutto" VAT-inclusive total is a different phrase and
 *  never wins. A numeric value ⇒ sold; null ⇒ unsold / not stated. */
export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /cena\s+osi[ąa]gni[ęe]t\w*\s+w\s+przetargu[^0-9]{0,20}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind

/** Kind from the TITLE (the unambiguous sale-object phrase) first, falling back
 *  to the full text — matching the zlotoryja/chelmno family. Uses document text
 *  (title + PDF body), NEVER the URL slug. "lokalu niemieszkalnego" → uzytkowy;
 *  "lokalu mieszkalnego" → mieszkalny; "nieruchomości niezabudowanej" / "działki
 *  … niezabudowanej" → grunt; "nieruchomości zabudowanej budynkiem" →
 *  zabudowana. */
export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(whole(text));
}

// ----------------------------------------------------------------- address (units)

// Property street+building for FLATS / COMMERCIAL / built units. Two live
// forms, tried in order:
//   a. "… położonego … przy ul. Krótkiej nr 1 w Lwówku Śląskim"  (the "nr" is
//      OPTIONAL) / "… przy ulicy Orzeszkowej 32-36 we Lwówku …" ("ulicy" full
//      word). building may be a range "32-36".
//   b. "… lokalu mieszkalnego nr 3 położonego w miejscowości Gaszów nr 30."
//      (a rural village + house number, no street).
// Deliberately NOT matching the office address ("w Urzędzie Gminy i Miasta …
// pok. nr 4") or the letterhead "Al. Wojska Polskiego 25A" — neither uses the
// "przy ul(icy)" / "w miejscowości … nr" anchors.
const UNIT_ADDR_PATTERNS = [
  new RegExp(`przy\\s+ul(?:\\.|icy)\\s+([${NAME_CHARS}]+?)\\s+(?:nr\\s+)?(\\d+(?:-\\d+)?[A-Za-z]?)\\b`, 'i'),
  new RegExp(`w\\s+miejscowo[śs]ci\\s+([${NAME_CHARS}]+?)\\s+nr\\s+(\\d+(?:-\\d+)?[A-Za-z]?)\\b`, 'i'),
];

/** Flat / commercial unit number from "lokal(u) (nie)mieszkaln… nr <N>". A
 *  commercial "lokalu niemieszkalnego położonego …" with no number yields null
 *  (the unit is keyed on its street address alone). */
function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

/** "<street/village> <bldg>[/<apt>]" raw address for a flat / commercial /
 *  built unit, or null. */
export function addressRawFromText(text) {
  const t = whole(text);
  let m = null;
  for (const re of UNIT_ADDR_PATTERNS) {
    m = re.exec(t);
    if (m) break;
  }
  if (!m) return null;
  const street = m[1].trim().replace(/\s+/g, ' ');
  const building = m[2];
  const apt = unitNoFromText(text);
  return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
}

// Usable floor area of a UNIT: "o powierzchni użytkowej 45,90 m2". Anchored on
// "użytkowej" so a land / udział parcel area ("działce nr 201/1 o powierzchni
// 0,0376 ha") is never taken.
const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w*\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m²) of the unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

// ----------------------------------------------------------------- land

// Parcel number(s): "oznaczonej ewidencyjnie nr 35/1" (primary Lwówek form) or
// "niezabudowanej działki … nr 718/3" or "działce nr 201/1"; handles the
// multi-parcel " i " list ("506/1 i 506/2"). Parcels use "/" in the PDF body
// (titles occasionally use "." — normalised to "/" on read).
function landParcelFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const re = /(?:ewidencyjnie\s+nr|dzia[łl]k\w*(?:\s+oznaczon\w*\s+ewidencyjnie)?\s+nr|dzia[łl]ce\s+nr)\s+(\d+(?:[\/.]\d+)?(?:\s+i\s+\d+(?:[\/.]\d+)?)*)/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    for (const p of m[1].split(/\s+i\s+/)) {
      const norm = p.trim().replace(/\./g, '/');
      if (norm && !seen.has(norm)) { seen.add(norm); parcels.push(norm); }
    }
  }
  return parcels.length ? parcels.join(', ') : null;
}

// Obręb (cadastral district): "w obrębie 1 miasta Lwówek Śląski" -> "1";
// "w obrębie Niwnice" -> "Niwnice".
function obrebFromText(text) {
  const m = new RegExp(`w\\s+obr[ęe]bie\\s+(\\d+|[A-ZŁŚŻŹĆĘÓŃĄ][a-ząćęłńóśźż]+)`).exec(whole(text));
  return m ? m[1] : null;
}

// Parcel area for LAND: "o powierzchni 0,3617 ha" / "o łącznej powierzchni
// 0,0812 ha" -> m² (ha × 10000). Anchored on "ha" so a unit's "m2" area (a
// zabudowana with a built-area "m2") is not taken here.
const LAND_AREA_RE = /(?:[łl][ąa]cznej\s+)?powierzchni\s+(\d+(?:[.,]\d+)?)\s*ha\b/i;

function landAreaFromText(text) {
  const m = LAND_AREA_RE.exec(whole(text));
  if (!m) return null;
  const val = parseNum(m[1]);
  return val == null ? null : Math.round(val * 10000);
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT ("Ogłoszenie o … przetargu … na sprzedaż") blob into a
 * single active record, or null. Undeveloped land (kind 'grunt') → parcel-keyed
 * record for land.json; flats / commercial / built units → address-keyed
 * record. A unit whose address can't be located returns null (never fabricated).
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
    const dzialka_nr = landParcelFromText(text);
    const obreb = obrebFromText(text);
    if (!dzialka_nr && !obreb) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(text),
      address_raw: obreb,
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
 * Parse one CONCLUDED result blob ("Informacja o wyniku przetargu" /
 * "Informacja o nabywcy …") into a result record. Returns 0 or 1 record (array
 * = framework interface). Self-gates on isResultDoc/isSaleAuction/isLease so it
 * is safe against a lease or a stray announcement. Land (grunt) →
 * parcel-keyed; flats / commercial / built → address-keyed. A title-only flat
 * result (no PDF body) still yields address + round; with no achieved price and
 * no explicit negative outcome it is 'unsold' + a diagnostic note.
 * @param {string} text       blob from buildRecordText
 * @param {string|null} fallbackDate  ISO date captured during the crawl
 * @param {string} sourceUrl  the canonical document URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  if (isLease(text)) return [];
  if (!isSaleAuction(text)) return [];

  const kind = kindFromText(text);
  if (kind === 'unknown') return [];

  const notes = [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(text);
    const obreb = obrebFromText(text);
    if (!dzialka_nr && !obreb) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2: landAreaFromText(text),
        address_raw: obreb,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (negativeStated ? 'no_buyer' : 'unknown'),
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
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : (negativeStated ? 'no_buyer' : 'unknown'),
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
