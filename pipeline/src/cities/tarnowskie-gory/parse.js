// Tarnowskie Góry parsers.
//
// Every announcement on boards 5217/5216 is a SINGLE-property text PDF (one
// flat, one building, or one land parcel-set per article — never a multi-flat
// table, unlike Zabrze's flats board). The standard "Burmistrz Miasta …
// ogłasza … przetarg … na sprzedaż …" body carries everything we need:
//
//   header:   "… na sprzedaż wyodrębnionego lokalu mieszkalnego nr 5 w budynku
//              przy ulicy Pokoju 10 w Tarnowskich Górach"
//   parcel:   "działki o numerach ewidencyjnych nr 5200/49, 5246/50 o łącznej
//              powierzchni 0,5299 ha, obręb Tarnowskie Góry"  (whole-property plot)
//   flat:     "Lokal mieszkalny nr 5 o powierzchni użytkowej 37,70 m2 wraz z …
//              piwnicy o powierzchni użytkowej 6,20 m2"        (usable area; cellar excluded)
//   price:    "cena wywoławcza … wynosi 159 000,00 zł"         (spaced thousands)
//   date:     "Drugi przetarg ustny nieograniczony będzie … 14 kwietnia 2026 r."
//   round:    "drugi przetarg" (word ordinal) — also in the title.
//
// Result notices ("INFORMACJA o wyniku … przetargu …") mirror the announcement
// header (street + flat-no + round) and add the achieved price:
//   "Cena wywoławcza: 176 900,00 złotych … Cena osiągnięta w przetargu:
//    178 000,00 złotych … Nabywca nieruchomości: Państwo …"   (⇒ sold)
//   or "Nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym …"  (⇒ unsold)
// The result joins its announcement by address (+ flat-no) + round in
// build-properties — the same key on both sides (e.g. `pokoju|10|5`, round 2).
//
// All regexes below were groundtruthed against real extracted text (articles
// 101179/101732/100411 flat sold+unsold, 100288 building, 101322 + 101729 land).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "159 000,00" / "176 900,00 złotych" / "389000" -> integer PLN. Spaced
// thousands (regular + non-breaking spaces are both used as the separator),
// optional ",00" grosze tail.
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "37,70" / "37.70" / "1 050" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- title routing
//
// The board returns sale ANNOUNCEMENTS, published RESULT notices, and a lot of
// noise (rentals, wykazy, qualified-person lists, corrections, cancellations,
// rokowania). Titles are inconsistent — many are letter-spaced ("o g l a s z a")
// or truncated before the asset word — so the classifier tests the title AND
// the article slug (the slug, e.g. "...-na-sprzedaz-lokalu-...", is never
// spaced). Final routing (announcement vs result) is re-confirmed from the PDF
// body in crawl.js (the body header is the authority); these title rules only
// decide which board items are worth fetching at all.

/** True for an item to SKIP outright (never a municipal SALE PDF): rentals
 *  (najem/dzierżawa), sale-lists (wykazy), qualified-person lists, corrections
 *  (sprostowanie), cancellations (odwołanie/unieważnienie), complaint rulings
 *  (skarga) and post-auction negotiations (rokowania). */
export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /lista\s+os[óo]b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(^|\W)wykaz\b|wywieszeniu\s+wykazu/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

/** True when the title looks like a published RESULT notice ("Informacja(e) o
 *  wyniku/wynikach … przetargu/przetargów …"). Singular + plural. */
export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /informacj\w*\s+o\s+wynik/i.test(s);
}

/** True when the title looks like a municipal SALE AUCTION announcement. Broad
 *  on purpose (all the phrasings: "Burmistrz … ogłasza …", "Ogłoszenie o …
 *  przetargu …", a bare "Pierwszy przetarg … na sprzedaż …", "… zaprasza do
 *  udziału w … przetargu …") — `sprzedaż`/`zbycie`/`nieruchomość` + `przetarg`
 *  catches them all. Call only after isSkippableTitle / isResultTitle. */
export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo/i.test(s)) return true;
  if (/zaprasza.*(uczestnictw|udzia[łl]).*przetarg/i.test(s)) return true;
  return false;
}

/** Is this attachment text a published result notice (vs. a sale announcement)?
 *  The body header is "INFORMACJA o wyniku …" — the authoritative signal. */
export function isResultNotice(text) {
  return /INFORMACJA\s+o\s+wynik/i.test(text || '');
}

// ----------------------------------------------------------------- shared fields

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

/** Round from a word ordinal qualifying "przetarg": "drugi przetarg" -> 2,
 *  "pierwszego przetargu" -> 1. Returns null when unstated. */
export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(text || '');
  if (!m) return null;
  return ROUND_WORDS[m[1].toLowerCase()] ?? null;
}

/**
 * Auction date from an announcement body. The future-tense clause is "Przetarg
 * [ustny nieograniczony] będzie DD <miesiac> YYYY" or "… odbędzie się DD
 * <miesiac> YYYY". Anchored on "będzie"/"odbędzie się" so the PRIOR-round line
 * ("Pierwszy przetarg był 15 października 2025 r.") is never picked up.
 * (Anchor is followed by \s, NOT \b: "się" ends in ę — a non-word char — so a
 * trailing \b never matches there and would silently drop every "odbędzie się
 * DD <miesiąc> YYYY" date, which is how the pisemny tenders phrase it.)
 * -> ISO date or null. (Tolerates "2026r." with no space before "r".)
 */
export function auctionDateFromText(text) {
  const m =
    /(?:przetarg\w*(?:\s+ustn\w+(?:\s+(?:nie)?ograniczon\w+)?)?\s+b[ęe]dzie|odb[ęe]dzie\s+si[ęe])\s[^.]*?(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(
      text || '',
    );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Result-notice auction date. Section 1 reads "DD <miesiac> YYYY r. Urząd
 * Miejski … <round> przetarg ustny …" — anchor on the "… r. Urząd Miejski"
 * tail so the rozporządzenie citation ("z dnia 14 września 2004 roku") can't
 * be mistaken for it. A comma + optional "w" before the office ("… r., Urząd
 * Miejski w …") is common on the land board, so both are tolerated.
 * -> ISO or null.
 */
export function resultDateFromText(text) {
  const m = /(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s*r\.?\s*,?\s+(?:w\s+)?Urz[ąa]d\w*\s+Miejski/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// Street + (optional) building from the announcement/result header line:
// "… przy ulicy Pokoju 10 w Tarnowskich Górach"  -> { street:'Pokoju', building:'10' }
// "… przy ulicy Józefa Rymera 8 i 8A oraz …"      -> { street:'Józefa Rymera', building:'8' }
// "… przy ulicy Józefa Korola."  (land, no number) -> { street:'Józefa Korola', building:null }
// The building number is OPTIONAL and the match STOPS at a period / comma /
// "oraz" / " i " / " w Tarnowskich" / newline so it never swallows a digit from
// the next list item (e.g. land's "1) działka numer …").
const STREET_HEADER_RE =
  /przy\s+ulic[yą]\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?))?\s*(?:\.|,|\s+oraz\b|\s+i\b|\s+w\s+Tarnowskich|\n|$)/i;

/** { street, building|null } from the header, or null. building omitted for land. */
export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

// Flat/commercial unit number: "lokalu mieszkalnego nr 5", "lokal niemieszkalny
// nr 3", "lokalu użytkowego nr 1".
const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

/** Build the "ul. <street> <bldg>[/<apt>]" raw address for a flat/unit/building.
 *  A flat carries a unit number (-> "/N"); a building uses just street +
 *  building. Returns null without a usable street + building number. */
export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null; // address-keyed records need a building number
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

// Usable floor area of the unit: "Lokal mieszkalny nr 5 o powierzchni użytkowej
// 37,70 m2". Anchored on the unit phrase + "powierzchni użytkowej" so the
// attached CELLAR ("piwnicy o powierzchni użytkowej 6,20 m2") is never taken.
const UNIT_AREA_RE =
  /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+\d+[a-z]?\s+o\s+powierzchni\s+u[żz]ytkow\w+\s+([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;

/** Usable floor area (m2) of a flat/unit, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// Starting price: "cena wywoławcza … wynosi 159 000,00 zł" (announcement) or
// "Cena wywoławcza: 176 900,00 złotych" / "cena wywoławcza - 86 000,00 zł netto"
// (result notice). Try the "wynosi …" form first (the announcement separates
// label and amount with a long clause), then the label-then-separator form
// (":", "-" or en-dash).
export function startingPriceFromText(text) {
  const t = text || '';
  let m = /wynosi\s+(\d[\d.,\s ]*?)\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s*[:\-–]?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// Achieved price (result notices only): "Cena osiągnięta w przetargu:
// 178 000,00 złotych" / "cena osiągnięta w przetargu - brak". A numeric value
// => sold; "brak" / no match => unsold.
export function achievedPriceFromText(text) {
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// obreb (cadastral precinct): "obręb Tarnowskie Góry" / "obręb Bobrowniki
// Śląskie" — one or two capitalised words.
const OBREB_RE =
  /obr[ęe]b(?:ie)?\s*:?\s*((?:[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/i;

/** obreb name, or null. */
export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/**
 * Parcels + total plot area (m2) of the property. Phrasings seen live:
 *   - per-parcel:  "działka numer 98 o powierzchni 0,0573 ha"
 *   - per-parcel list: "działka numer 1118/153 o powierzchni 0,0267 ha … 2)
 *      działka numer 3817/153 o powierzchni 0,0419 ha"  /  "działki o numerach
 *      1276/55 o powierzchni 0,0185 ha, oraz 1273/55 o powierzchni 0,0630 ha"
 *   - list+total:  "działki o numerach ewidencyjnych nr 5200/49, 5246/50 o
 *      łącznej powierzchni 0,5299 ha"
 * Each area is keyed to ITS parcel number (so the same parcel restated later in
 * the prose isn't double-counted), then summed; a "łącznej powierzchni …"
 * total, when present, wins. Hectares -> m2 (x10 000, rounded).
 * @returns {{ dzialka_nr: string|null, area_m2: number|null }}
 */
export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  const parcelArea = new Map();

  // (a) per-parcel: "<keyword> <parcel> o powierzchni <area> ha". The keyword is
  // "numer"/"numerze"/"numerach"/"nr" (\w* covers declensions), optionally
  // preceded by "(o) numerach ewidencyjnych [nr]".
  const reSingle =
    /dzia[łl]k\w*\s+(?:gruntow\w+\s+)?(?:o\s+)?(?:numer\w*\s+ewidencyjn\w*\s+(?:nr\s+)?)?(?:numer\w*|nr)\s+(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/gi;
  let m;
  while ((m = reSingle.exec(s)) !== null) {
    parcels.add(m[1]);
    const a = Number(m[2].replace(',', '.'));
    if (a > 0 && !parcelArea.has(m[1])) parcelArea.set(m[1], a);
  }

  // (b) list-continuation parcels each carrying their OWN area, joined by
  // "oraz"/","/"i" ("… 1276/55 o powierzchni 0,0185 ha, oraz 1273/55 o
  // powierzchni 0,0630 ha"); these aren't preceded by "działka numer", so (a)
  // only caught the first. Scan every "<parcel> o powierzchni <area> ha", but
  // ONLY in a "działk…" context so a stray number can't masquerade as a parcel.
  if (/dzia[łl]k/i.test(s)) {
    const reEach = /(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/gi;
    while ((m = reEach.exec(s)) !== null) {
      parcels.add(m[1]);
      const a = Number(m[2].replace(',', '.'));
      if (a > 0 && !parcelArea.has(m[1])) parcelArea.set(m[1], a);
    }
  }

  // (c) a parcel LIST followed by a shared "łącznej powierzchni" total.
  let total = null;
  const reList =
    /dzia[łl]k\w*\s+(?:o\s+numer\w*\s+ewidencyjn\w*\s+(?:nr\s+)?|numer\w*\s+)((?:\d+(?:\/\d+)?\s*(?:,|i)\s*)+\d+(?:\/\d+)?)\s+o\s+[łl][ąa]cznej\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/gi;
  while ((m = reList.exec(s)) !== null) {
    for (const p of m[1].split(/\s*(?:,|i)\s*/)) {
      const v = p.trim();
      if (/^\d+(?:\/\d+)?$/.test(v)) parcels.add(v);
    }
    const a = Number(m[2].replace(',', '.'));
    if (a > 0) total = Math.round(a * 10000);
  }
  // A standalone "łącznej powierzchni …" total (no inline list) as a last resort.
  if (total == null) {
    const lm = /[łl][ąa]cznej\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(s);
    if (lm) {
      const a = Number(lm[1].replace(',', '.'));
      if (a > 0) total = Math.round(a * 10000);
    }
  }

  let area_m2 = total;
  if (area_m2 == null && parcelArea.size) {
    let sum = 0;
    for (const a of parcelArea.values()) sum += a;
    area_m2 = Math.round(sum * 10000);
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  return { dzialka_nr, area_m2 };
}

// Header window for kind classification: the first ~400 chars (the "ogłasza …
// na sprzedaż <asset>" sentence). Using the header — not the whole body — lets
// "nieruchomości gruntowej zabudowanej" (a building) win over a later "lokal"
// mention, and "niezabudowanej" (land) resolve correctly via classify-kind's
// land-before-house ordering.
function kindFromHeader(text) {
  return classifyKind((text || '').slice(0, 400));
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT attachment (a flat, a building/house, or — when called
 * from the land board — a land parcel-set). Single-property: returns ONE record
 * or null. Land records carry kind:'grunt' + dzialka_nr/obreb (-> land.json);
 * flats/buildings carry an address (-> properties.json).
 *
 * @param {string} text  extracted attachment text (pdftotext -layout)
 * @param {{ board?: number, isLandBoard?: boolean }} [ctx]
 * @returns {object|null}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kindHeader = kindFromHeader(t);
  // Board 5216 is land by definition; otherwise trust the header classifier.
  const isLand = ctx.isLandBoard || kindHeader === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const plot = plotFromText(t);
  const obreb = obrebFromText(t);

  if (isLand) {
    const h = streetFromHeader(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb,
      area_m2: plot.area_m2, // PLOT area (m2) — land has no usable floor area
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  // Flat / building (address-keyed).
  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  // A flat reports a usable floor area; a building reports only the plot (ha),
  // which is NOT a unit area — keep it in land_area_m2 so zł/m2 is never
  // computed from a building/plot total (build-properties' healPlotAreas also
  // guards this, but emit it correctly at the source).
  const area_m2 = unitAreaFromText(t);
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  return {
    kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice ("INFORMACJA o wyniku … przetargu …") into a concluded
 * auction record (same shape Zabrze/Katowice emit). Single-property. Joins its
 * announcement by address (+ flat-no) + round in build-properties.
 *
 * @param {string} text       extracted attachment text (pdftotext -layout)
 * @param {string|null} fallbackDate  ISO date from the crawl ref (rarely set)
 * @param {string} sourceUrl  the attachment URL (provenance)
 * @param {{ isLandBoard?: boolean }} [ctx]  (refresh.js calls with 3 args; the
 *   land/flat split then falls back to the body header, which is reliable)
 * @returns {Array<object>}   0 or 1 record (array to match the framework interface)
 */
export function parseResultDoc(text, fallbackDate, sourceUrl, ctx = {}) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  // SOLD <=> an achieved price is published. UNSOLD <=> none (the "Nabywca
  // nieruchomości:" section then states "przetarg zakończył się wynikiem
  // negatywnym …", or section 5 shows "cena osiągnięta … - brak"). The bare
  // word "negatywnym" also appears in the wadium boilerplate, so the
  // achieved-price presence — not a keyword — is the gate.
  const sold = achieved != null;
  const negativeStated =
    /Nabywca[\s\S]{0,400}?(negatywn|nie\s+wy[łl]oniono|brak\s+(?:uczestnik|ofert))/i.test(t) ||
    /osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*brak/i.test(t);

  const obreb = obrebFromText(t);
  const plot = plotFromText(t);
  const kindHeader = kindFromHeader(t);
  const isLand = ctx.isLandBoard || kindHeader === 'grunt';

  if (isLand) {
    const h = streetFromHeader(t);
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
        obreb,
        area_m2: plot.area_m2, // PLOT area for land
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

  // Flat / building (address-keyed).
  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
      notes,
    },
  ];
}
