// Braniewo parsers.
//
// Every notice is a born-digital text PDF (pdftotext -layout). Announcements are
// a TABLE (Położenie / area / KW / cena wywoławcza / wadium) + prose; result
// notices are prose. All regexes groundtruthed against real extracted text
// (verified live 2026-07-05):
//
//   ANNOUNCEMENT flat (round I) — article 2833, attachment 4802:
//     "Burmistrz Miasta Braniewa ogłasza PIERWSZY PRZETARG USTNY NIEOGRANICZONY"
//     "ul. Krasickiego 12 m. 3  Lokal 48,73  EL1B/00010738/5  170 000,00  25 000,00"
//     "Sprzedaż lokalu mieszkalnego nr 3 położonego przy ul. Krasickiego 12 …
//      o powierzchni użytkowej 48,73 m²"
//     "Przetarg odbędzie się dnia 12.06.2026 roku o godz. 10ºº"
//
//   RESULT flat UNSOLD (round I) — article 2930, attachment 5023:
//     "o wyniku PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO … lokalu
//      mieszkalnego nr 3 … ul. Krasickiego 12. który odbył się w dniu 12.06.2026 r."
//     "cena wywoławcza 170 000,00 zł … najwyższa cena osiągnięta w przetargu - BRAK"
//
//   RESULT flat SOLD (round II, ograniczony) — article 2795, attachment 4729:
//     "o wyniku DRUGIEGO PRZETARGU USTNEGO OGRANICZONEGO … lokalu nr 8 …
//      przy ul. Plac Wolności 18 … który odbył się w dniu 04.03.2026 r."
//     "cena wywoławcza 18 000,00 zł … najwyższa cena osiągnięta w przetargu – 18 190,00 zł"
//
//   RESULT flat SOLD (round III) — article 2760, attachment 4681:
//     "o wyniku TRZECIEGO PRZETARGU … spółdzielczego własnościowego prawa do
//      lokalu mieszkalnego nr 9 … ul. Hozjusza 5 … odbył się w dniu 20.02.2026 r."
//     "cena wywoławcza 138 500,00 zł … najwyższa cena osiągnięta w przetargu – 192 000,00 zł"
//
//   Land (grunt) uses the same shapes — announcement table + prose result with
//   "działka nr N/M powierzchnia 0,1088 ha" parcels (article 2828/2911).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// Money token: strict spaced/NBSP thousands groups + ",NN" grosze, e.g.
// "170 000,00", "18 190,00", "48,73". The strict 3-digit grouping stops a run of
// layout spaces from bridging a stray digit into the amount (e.g. the KW's
// trailing "5" and the price cell).
const MONEY = '\\d{1,3}(?:[\\u00a0 ]\\d{3})*,\\d{2}';

// "170 000,00" / "18 190,00 zł" -> integer PLN. Spaced (regular + NBSP) or
// dotted thousands, ",00" grosze tail dropped.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "48,73" / "46,40" / "48.73" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- title routing
//
// The board mixes sale ANNOUNCEMENTS, published RESULT notices, and noise
// (rentals, wykazy, qualified-person lists, corrections, cancellations,
// rokowania). These title rules only decide which articles are worth fetching;
// the PDF body header re-confirms announcement-vs-result in crawl.js.

/** True for an item to SKIP outright (never a municipal SALE PDF). */
export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /lista\s+(?:os[óo]b|zakwalifikowan)/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(^|\W)wykaz\b|wywieszeniu\s+wykazu/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

/** True when the title looks like a published RESULT notice ("wynik(u) …
 *  przetargu"). Braniewo titles read "Wynik I przetargu ustnego …". */
export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /\bwynik\w*\b/i.test(s) && /przetarg/i.test(s);
}

/** True when the title looks like a municipal SALE AUCTION announcement. */
export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/og[łl]oszenie/i.test(s) && /przetarg/i.test(s)) return true;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal|dzia[łl]k|grunt/i.test(s)) return true;
  return false;
}

// ------------------------------------------------------------------- body gates

/** Is this attachment text a blank "ZGŁOSZENIE UDZIAŁU W PRZETARGU" application
 *  form (bundled alongside the real ogłoszenie)? Those must be skipped. */
export function isApplicationForm(text) {
  return /zg[łl]oszenie\s+udzia[łl]u\s+w\s+przetargu/i.test(text || '') &&
    !/og[łl]oszenie\s+burmistrza|informacj\S*\s+o\s+wynik/i.test(text || '');
}

/** Is this attachment text a published result notice (vs. a sale announcement)?
 *  The body header "Informację o wyniku …" is the authoritative signal. */
export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wynik/i.test(text || '');
}

// ----------------------------------------------------------------- shared fields

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

/** Round from a word ordinal qualifying "przetarg" — announcements use the
 *  nominative ("PIERWSZY PRZETARG"), results the genitive ("PIERWSZEGO
 *  PRZETARGU"); both start with the same stem. Returns null when unstated. */
export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(text || '');
  if (!m) return null;
  return ROUND_WORDS[m[1].toLowerCase()] ?? null;
}

/** Announcement auction date: "Przetarg odbędzie się dnia 12.06.2026 roku".
 *  -> ISO or null. */
export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+(?:dnia\s+)?(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
}

/** Result-notice auction date: "który odbył się w dniu 12.06.2026 r." Anchored
 *  on "odbył się" so the rozporządzenie citation ("z dnia 14 września 2004 r.")
 *  and the "Braniewo, dnia DD.MM.YYYY" publication stamp can't win. -> ISO/null. */
export function resultDateFromText(text) {
  const t = text || '';
  let m = /odby[łl]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
  // Word-form fallback: "odbył się w dniu DD <miesiąc> YYYY".
  m = /odby[łl]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

// Street + (optional) building from the notice header. Phrasings seen live:
//   "położonego przy ul. Krasickiego 12"       -> { street:'Krasickiego', building:'12' }
//   "położonego przy ul. Plac Wolności 18"      -> { street:'Plac Wolności', building:'18' }
//   "położonego ul. Hozjusza 5."                -> { street:'Hozjusza', building:'5' }
//   "przy ul. Aleja Wojska Polskiego w obrębie" -> { street:'Aleja Wojska Polskiego', building:null }
// The building number is OPTIONAL (land often has none); the street stops at the
// number, a comma/period, or " w obrębie"/" w Braniewie".
const STREET_HEADER_RE =
  /(?:przy\s+)?ul(?:ic[yaą])?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?))?\s*(?:\.|,|\s+m\.|\s+w\s+obr[ęe]b|\s+w\s+Braniew|\n|$)/i;

/** { street, building|null } from the header, or null. */
export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

// Flat/unit number: "lokalu mieszkalnego nr 3", "lokalu nr 8", "prawa do lokalu
// mieszkalnego nr 9".
const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+\s+|niemieszkaln\w+\s+|u[żz]ytkow\w+\s+)?nr\s+(\d+[A-Za-z]?)/i;

/** Build the "ul. <street> <bldg>[/<apt>]" raw address for a flat/unit.
 *  Returns null without a usable street + building number. */
export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

// Usable floor area of the unit: "o powierzchni użytkowej 48,73 m²". First match
// wins (the flat area precedes any attached "piwnicy o powierzchni użytkowej …").
const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of a flat/unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

/** Starting price from the PROSE label ("cena wywoławcza 170 000,00 zł") used by
 *  result notices and land announcements. -> PLN or null. */
export function startingPriceFromText(text) {
  const m = new RegExp(`cena\\s+wywo[łl]awcza\\s+(${MONEY})\\s*z[łl]`, 'i').exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Starting price from the announcement TABLE data row. The row begins with the
 *  address ("ul. …" / "Plac …" / "Aleja …") and carries [area,] cena wywoławcza,
 *  wadium as money tokens; cena is the first amount ≥ 1000 (the flat's "48,73"
 *  area token is < 1000). -> PLN or null. */
export function tablePriceFromText(text) {
  const re = new RegExp(MONEY, 'g');
  for (const line of String(text || '').split('\n')) {
    if (!/^\s*(?:ul\.|al\.|aleja|plac|pl\.|os\.)/i.test(line)) continue;
    for (const m of line.matchAll(re)) {
      const v = parsePLN(m[0]);
      if (v != null && v >= 1000) return v;
    }
  }
  return null;
}

/** Achieved price (result notices only): "najwyższa cena osiągnięta w przetargu
 *  – 18 190,00 zł". A numeric value => sold; "– BRAK" / no match => unsold.
 *  -> PLN or null (null means unsold). */
export function achievedPriceFromText(text) {
  const m = new RegExp(
    `cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetargu\\s*[–\\-:]?\\s*(${MONEY})\\s*z[łl]`,
    'i',
  ).exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// obręb (cadastral precinct) — Braniewo uses a number: "w obrębie nr 6".
export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+nr\s+(\d+)/i.exec(text || '');
  return m ? `nr ${m[1]}` : null;
}

/** Land parcels + total plot area (m2). Phrasings: "działka nr 180/17
 *  powierzchnia 0,1088 ha", "działka o numerze ewidencyjnym 169/3". Hectares ->
 *  m2 (x10 000). @returns {{dzialka_nr:string|null, area_m2:number|null}} */
export function landPlotFromText(text) {
  const s = String(text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  let sumHa = 0;
  const re = /dzia[łl]k\w*\s+(?:o\s+)?(?:numer\w*\s+ewidencyjn\w*\s+|numer\w*\s+|nr\s+)(\d+(?:\/\d+)?)(?:\s+(?:o\s+)?(?:powierzchni\w*)\s+(\d+[.,]\d+)\s*ha\b)?/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    parcels.add(m[1]);
    if (m[2]) sumHa += Number(m[2].replace(',', '.'));
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  const area_m2 = sumHa > 0 ? Math.round(sumHa * 10000) : null;
  return { dzialka_nr, area_m2 };
}

// Kind from the "na sprzedaż <asset> …" clause (the header boilerplate before it
// is generic, so classify the sale clause, not the whole head).
function kindFromText(text) {
  const m = /na\s+sprzeda[zż]\s*([\s\S]{0,400})/i.exec(text || '');
  return classifyKind(m ? m[1] : (text || '').slice(0, 400));
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT PDF (a flat / unit — address-keyed — or a land parcel
 * set — kind:'grunt' → land.json). Single-property: returns ONE record or null.
 * @param {string} text  extracted attachment text (pdftotext -layout)
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const isLand = kind === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t) ?? tablePriceFromText(t);

  if (isLand) {
    const h = streetFromHeader(t);
    const plot = landPlotFromText(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2, // PLOT area (m2) — land has no usable floor area
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  // Flat / unit (address-keyed).
  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice ("Informację o wyniku … przetargu") into a concluded
 * auction record. Single-property; joins its announcement by address (+ flat-no)
 * + round in build-properties.
 *
 * @param {string} text       extracted attachment text (pdftotext -layout)
 * @param {string|null} fallbackDate  ISO date from the crawl ref
 * @param {string} sourceUrl  the attachment URL (provenance)
 * @returns {Array<object>}   0 or 1 record (array = framework interface)
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t) ?? tablePriceFromText(t);
  const achieved = achievedPriceFromText(t);
  // SOLD <=> an achieved price is published; otherwise "– BRAK" / "nabywca … BRAK".
  const sold = achieved != null;
  const negativeStated =
    /osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[–\-:]?\s*BRAK/i.test(t) ||
    /nabywca\s+nieruchomo[śs]ci\s*[–\-:]?\s*BRAK/i.test(t) ||
    /wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium/i.test(t) ||
    /brak\s+oferent/i.test(t);

  const kind = kindFromText(t);
  const isLand = kind === 'grunt';

  if (isLand) {
    const h = streetFromHeader(t);
    const plot = landPlotFromText(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        obreb: obrebFromText(t),
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

  // Flat / unit (address-keyed).
  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    },
  ];
}
