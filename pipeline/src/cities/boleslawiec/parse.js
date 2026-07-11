// Bolesławiec parsers. See config.js/crawl.js for the two-source shape.
//
// Three entry points used by crawl.js:
//   parseActiveTitle(title, tableText)  — one "sp-estate" RSS item -> a listing
//                                          (address-keyed) or a land record.
//   parseWykazTitle(title, bodyText, pubDateIso) — one "przetargi-planowane"
//                                          RSS item -> a wykaz entry (address-
//                                          keyed only — wykaz[] has no land path).
//   parseResultDoc(text, fallbackDate, sourceUrl) — one BIP result PDF -> result
//                                          record(s) (framework contract).
//
// KIND ROUTING (deliberate, see long rationale in crawl.js): an item identified
// by "Lokal ... nr N" (a numbered UNIT) is always address-keyed. An item
// identified by "działka nr N" (a PARCEL) is land-keyed (kind 'grunt' in
// land.json) EVEN when classifyKind() would call it 'zabudowana' (a built-up
// plot, e.g. "Zabudowana działka nr 478" / Plac Piastowski) — UNLESS a clean
// street+number address is independently resolvable (the RSS table's
// "Położenie nieruchomości: Plac Piastowski nr 16" cell, or the wykaz title's
// own "...nr 16."), in which case it's kept address-keyed so the round history
// stays on one property. The BIP result-doc template for this same plot never
// states a building number (only "ul. Plac Piastowski" + "działka nr 478") —
// structurally detected via the "Nr działki" table header — so that stream
// falls back to land-keyed. Real, source-driven asymmetry, not a bug: see the
// dz.478/Plac-Piastowski fixture in the test file.
//
// GROUNDTRUTHED (2026-07-11) against:
//   RSS: xn--bolesawiec-e0b.pl/index.php/mig/sp-estate/lokale-mieszkalne?format=feed&type=rss
//        (+ działki-mieszkaniowe, działki-usługowe-przemysłowe, lokale-budynki-użytkowe,
//        przetargi-planowane/* mirrors)
//   PDF: www.um.boleslawiec.bip-gov.pl/public/getFile?id=251620 (Plac Piastowski dz.478, unsold)
//        .../getFile?id=251548 (ul. Tadeusza Kościuszki dz.23/1, unsold)
//        .../getFile?id=251418 (ul. Warszawska 1 lok.10, unsold — wadium not paid)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ------------------------------------------------------------------ text utils

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&oacute;/gi, 'ó')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Flatten an HTML fragment (the RSS <description> CDATA body) to plain text. */
export function stripHtml(html) {
  if (!html) return '';
  const withBreaks = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/tr|\/td|\/li|\/h\d)\s*\/?>/gi, ' \n ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(withBreaks).replace(/[ \t]+/g, ' ').replace(/\n[ \t]*\n+/g, '\n').trim();
}

// --------------------------------------------------------------- number utils

// Polish price string -> integer PLN. Handles "48.000,00 złotych", "50 000
// złotych" (space-thousands), "53.197.50" (a mistyped extra dot instead of a
// comma) and "350.000,- zł" / "23.290,00-" (dash-for-grosze typos). Ported
// verbatim from the olesno/przemysl/wolow analog family (see wolow/parse.js) —
// the guard the ADAPTER-GUIDE's bug-class (b) warns about.
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "26,21" / "0,4498" -> float. Comma or dot decimal.
export function parseAreaNum(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** hectares -> whole m² (land plots are reported in ha; everything downstream is m²). */
export function haToM2(ha) {
  return ha == null ? null : Math.round(ha * 10000);
}

// ---------------------------------------------------------------- date utils

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "14 lipca 2026" / "25 czerwca 2026 r." / "...roku" -> "2026-07-14", else null.
 *  No trailing "r."/"roku" requirement: callers capture just the "DD month
 *  YYYY" span (their OWN anchor regex already confirms it's a real date
 *  sentence — see RESULT_AUCTION_DATE_RE/TABLE_DATE_RE/WYKAZ_PUBLISHED_RE), so
 *  requiring it again here only rejected otherwise-valid captures. */
export function polishDateToIso(s) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(s || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// RSS <pubDate> is RFC-2822 ("Tue, 09 Jun 2026 08:35:13 +0200"). Extracted by
// regex (not `new Date()`) so the calendar day is never shifted by a UTC
// timezone conversion.
const RFC_MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
export function pubDateToIso(s) {
  const m = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mon = RFC_MONTHS[m[2]];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// ---------------------------------------------------------------- round util

// Case-SENSITIVE on purpose: the roman numeral is always capitalised in these
// notices ("II przetarg"), while lowercase "i" is the common Polish
// conjunction "and" — a case-insensitive match would false-positive constantly.
// \w{0,3} after "przetarg" is ASCII-only but safe here: every real suffix seen
// (przetargu / przetargiem / bare) is plain ASCII, no Polish diacritics.
const ROUND_RE = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\s+przetarg\w{0,3}\b/;
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/** First (leftmost) "<roman> przetarg…" mention -> integer round, else null. */
export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? ROMAN[m[1]] ?? null : null;
}

// ------------------------------------------------------------- address utils

// "Placu Piastowskim" -> "Plac Piastowski" (locative -> nominative). Scoped
// narrowly to the "Plac(u) <Name>" phrase only — never applied to arbitrary
// street tokens — so it can't mis-fold an unrelated word.
function placToNominative(name) {
  return name
    .trim()
    .replace(/^Placu\b/, 'Plac')
    .replace(/\b([A-ZŻŹĆŁŃÓŚĄĘ][a-ząćęłńóśźż]*?)(sk|ck)im\b/, '$1$2i')
    .replace(/\b([A-ZŻŹĆŁŃÓŚĄĘ][a-ząćęłńóśźż]*?)(sk|ck)ą\b/, '$1$2a');
}

// A trailing "N/M" building token (e.g. "Rynek 29/30", a merged-parcel Rynek
// building) would collide with parseAddress's own "/apt" splitting if handed
// through unchanged (it would read "29" as building and "30" as apt). Encode
// it as "29-30" instead — parseAddress's building group already accepts a
// hyphenated range — before appending the REAL apartment/lokal number.
function safeBuildingToken(building) {
  return building.replace(/\//g, '-');
}

// ------------------------------------------------------ ACTIVE ("sp-estate") title

// NOTE: every "\S*" below (not "\w*") is deliberate — JS's \w is ASCII-only
// and would truncate mid-word on a Polish inflectional ending that lands on
// ą/ć/ę/ł/ń/ó/ś/ź/ż (e.g. "wywoławczą", "użytkową" — genitive/accusative
// declensions). \S* (any non-space) safely consumes the whole word instead.
const LOKAL_UNIT_RE = /Lokal\S*\s+mieszkaln\S*\s+nr\s+(\d+(?:\s*(?:i|,|oraz)\s*\d+)*)/i;
const LOKAL_UZYTKOWY_RE = /Lokal\S*\s+(?:u[żz]ytkow\S*|niemieszkaln\S*)\s+nr\s+(\d+(?:\s*(?:i|,|oraz)\s*\d+)*)/i;
const STREET_UL_RE = /przy\s+ul\.?\s*([^\n,]+?)\s*[Nn]r\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
// Captures the "Plac(u)" word INTO group 1 (unlike ul., where the prefix is
// dropped): for a square the word "Plac" is part of the street name
// ("Plac Piastowski"), so placToNominative can fold the locative "Placu
// Piastowskim" -> "Plac Piastowski" and the key matches the active-side table
// cell ("Plac Piastowski nr 16"). Dropping it produced a key mismatch
// ("piastowski|16|" vs "plac piastowski|16|") that split the property.
const STREET_PLAC_RE = /przy\s+(Placu?\s+[^\n,]+?)\s*[Nn]r\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
// Table cell (sp-estate RSS description, flattened): "Położenie nieruchomości: X nr N".
const TABLE_POSITION_RE = /Po[łl]o[żz]enie\s+nieruchomo[śs]ci\s*:?\s*([^\n]+?)\s*[Nn]r\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
const AREA_UNIT_RE = /Powierzchnia\s+u[żz]ytkow\S*\s+mieszkania(?:\s+nr\s+(\d+))?\s*-\s*([\d]+(?:[.,]\d+)?)\s*m/gi;
const TABLE_AREA_LOKAL_RE = /Powierzchnia\s+lokalu\s*:?\s*([\d]+(?:[.,]\d+)?)\s*m/i;
const TABLE_PRICE_RE = /Cena\s+wywo[łl]awcza(?:\s+brutto)?\s*:?\s*([\d][\d\s.,]*)\s*z[łl]/i;
const TABLE_DATE_RE = /Przetarg\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*r\.?/i;
// "działka nr 478 o pow. 0,0703 ha" AND "działka nr 54/4 - 0,1092 ha" (the
// combined-lot form elides "o pow." to a bare dash for every parcel after the
// first) — both punctuation shapes accepted.
const LAND_PLOT_RE = /dzia[łl]k[aię]?\s+nr\s+(\d+(?:\/\d+)?)\s*(?:o\s+pow\.?|[-–])\s*([\d]+(?:[.,]\d+)?)\s*ha/gi;
const LAND_STREET_UL_RE = /przy\s+ul\.?\s*([^\n,.\-]+)/i;
const LAND_STREET_PLAC_RE = /przy\s+Placu?\s+([^\n,.\-]+)/i;
const IS_ZABUDOWANA_RE = /zabudowan/i;

/**
 * Parse ONE "sp-estate" (active auction) RSS item into a listing (address-
 * keyed) or a land record. Returns { listings: [], land: [] } (each 0 or 1
 * entries — never both).
 * @param {string} title        RSS <title> (plain text)
 * @param {string} descriptionHtml  RSS <description> CDATA body (HTML)
 * @param {string} detailUrl    RSS <link>
 * @returns {{ listings: object[], land: object[] }}
 */
export function parseActiveItem(title, descriptionHtml, detailUrl) {
  const t = title || '';
  const tableText = stripHtml(descriptionHtml);
  const starting_price_pln = parsePLN((TABLE_PRICE_RE.exec(tableText) || [])[1]);
  const dateM = TABLE_DATE_RE.exec(tableText);
  const auction_date = dateM ? polishDateToIso(dateM[1]) : null;
  const round = roundFromText(t);

  // ---- lokal (unit-numbered) -> always address-keyed
  const lokalM = LOKAL_UNIT_RE.exec(t) || LOKAL_UZYTKOWY_RE.exec(t);
  if (lokalM) {
    const kind = classifyKind(t) === 'unknown' ? 'mieszkalny' : classifyKind(t);
    const nrs = lokalM[1].split(/\s*(?:i|,|oraz)\s*/i).map((s) => s.trim()).filter(Boolean);
    const streetM = STREET_UL_RE.exec(t) || TABLE_POSITION_RE.exec(tableText);
    if (!streetM) return { listings: [], land: [] };
    const street = streetM[1].trim();
    const building = safeBuildingToken(streetM[2]);
    const areas = {};
    let am;
    AREA_UNIT_RE.lastIndex = 0;
    while ((am = AREA_UNIT_RE.exec(t)) !== null) {
      if (am[1]) areas[am[1]] = parseAreaNum(am[2]);
    }
    const tableArea = parseAreaNum((TABLE_AREA_LOKAL_RE.exec(tableText) || [])[1]);
    const listings = [];
    for (const nr of nrs) {
      const address_raw = `${street} ${building}/${nr}`;
      const address = parseAddress(address_raw);
      if (!address) continue;
      listings.push({
        kind,
        address_raw,
        address,
        auction_date,
        round,
        area_m2: areas[nr] ?? tableArea,
        starting_price_pln,
        detail_url: detailUrl || null,
      });
    }
    return { listings, land: [] };
  }

  // ---- działka (parcel-numbered)
  const parcels = [];
  let pm;
  LAND_PLOT_RE.lastIndex = 0;
  while ((pm = LAND_PLOT_RE.exec(t)) !== null) parcels.push({ nr: pm[1], area_ha: parseAreaNum(pm[2]) });

  if (parcels.length) {
    // A built-up plot ("Zabudowana działka") WITH a resolvable street+number
    // (the RSS table's "Położenie nieruchomości: X nr N" cell) stays address-
    // keyed so it links to the same property across runs — see file header.
    if (IS_ZABUDOWANA_RE.test(t)) {
      const posM = TABLE_POSITION_RE.exec(tableText);
      if (posM) {
        const street = posM[1].trim();
        const building = safeBuildingToken(posM[2]);
        const address_raw = `${street} ${building}`;
        const address = parseAddress(address_raw);
        if (address) {
          return {
            listings: [{
              kind: 'zabudowana',
              address_raw,
              address,
              auction_date,
              round,
              area_m2: null,
              land_area_m2: haToM2(parcels.reduce((s, p) => s + (p.area_ha || 0), 0)) || null,
              starting_price_pln,
              detail_url: detailUrl || null,
            }],
            land: [],
          };
        }
      }
    }
    // Bare land (or an unresolvable zabudowana plot) -> land.json.
    const streetM = LAND_STREET_UL_RE.exec(t) || LAND_STREET_PLAC_RE.exec(t) ||
      TABLE_POSITION_RE.exec(tableText) || /po[łl]o[żz]on\S*\s+przy\s+ulicy\s+([^\n<]+)/i.exec(tableText);
    const street = streetM ? streetM[1].trim() : null;
    const dzialka_nr = parcels.map((p) => p.nr).join(', ');
    const totalHa = parcels.reduce((s, p) => s + (p.area_ha || 0), 0);
    return {
      listings: [],
      land: [{
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        area_m2: haToM2(totalHa) || null,
        address_raw: street ? `ul. ${street}` : null,
        auction_date,
        round,
        starting_price_pln,
        detail_url: detailUrl || null,
      }],
    };
  }

  return { listings: [], land: [] };
}

// ---------------------------------------------------- WYKAZ ("przetargi-planowane")

const WYKAZ_PUBLISHED_RE = /W\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*r\.?\s+zosta[łl]/i;
const WYKAZ_NO_RE = /zarz[ąa]dzenie\s+nr\s+([\d\/]+)/i;

/**
 * Parse ONE "przetargi-planowane" (wykaz / pre-auction designation) RSS item.
 * wykaz[] is address-keyed only (buildCityData has no land path for it — see
 * file header) so a bare-land wykaz entry (no resolvable street+number) is
 * intentionally dropped here; it still surfaces once it reaches "sp-estate"
 * (crawlActive's `land` array) or the results board.
 * @param {string} title
 * @param {string} descriptionHtml
 * @param {string} pubDateRfc822   RSS <pubDate>, used only as a date fallback
 * @returns {object[]}  0 or more wykaz entries (usually 1; 2 for a shared notice)
 */
export function parseWykazItem(title, descriptionHtml, pubDateRfc822) {
  const t = title || '';
  const body = stripHtml(descriptionHtml);
  const published_date = polishDateToIso((WYKAZ_PUBLISHED_RE.exec(body) || [])[1]) || pubDateToIso(pubDateRfc822);
  const wykaz_no = (WYKAZ_NO_RE.exec(body) || [])[1] || null;

  const lokalM = LOKAL_UNIT_RE.exec(t) || LOKAL_UZYTKOWY_RE.exec(t);
  // Resolve street unambiguously by which pattern matched (rather than
  // re-testing the whole title, which mis-fires when both ul. and Plac appear):
  // ul. drops the prefix; Plac keeps it and gets locative->nominative folding.
  const ulM = STREET_UL_RE.exec(t);
  const placM = ulM ? null : STREET_PLAC_RE.exec(t);
  if (!ulM && !placM) return [];
  const street = ulM ? ulM[1].trim() : placToNominative(placM[1].trim());
  const building = safeBuildingToken((ulM || placM)[2]);

  if (lokalM) {
    const nrs = lokalM[1].split(/\s*(?:i|,|oraz)\s*/i).map((s) => s.trim()).filter(Boolean);
    const areas = {};
    let am;
    AREA_UNIT_RE.lastIndex = 0;
    while ((am = AREA_UNIT_RE.exec(t)) !== null) {
      if (am[1]) areas[am[1]] = parseAreaNum(am[2]);
    }
    const singleArea = parseAreaNum((/Powierzchnia\s+u[żz]ytkow\S*\s+mieszkania\s*-\s*([\d]+(?:[.,]\d+)?)\s*m/i.exec(t) || [])[1]);
    const kind = classifyKind(t) === 'unknown' ? 'mieszkalny' : classifyKind(t);
    const out = [];
    for (const nr of nrs) {
      const address_raw = `${street} ${building}/${nr}`;
      const address = parseAddress(address_raw);
      if (!address) continue;
      out.push({ address, address_raw, kind, area_m2: areas[nr] ?? singleArea, published_date, wykaz_no });
    }
    return out;
  }

  // Non-lokal wykaz entry (e.g. "Nieruchomość zabudowana, stanowiąca działkę nr
  // 478 ... przy Placu Piastowskim nr 16.") with a resolvable street+number ->
  // still address-keyed, consistent with the active-side "zabudowana" branch.
  const address_raw = `${street} ${building}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  const kind = classifyKind(t) === 'unknown' ? 'zabudowana' : classifyKind(t);
  return [{ address, address_raw, kind, area_m2: null, published_date, wykaz_no }];
}

// ------------------------------------------------------------- RESULT (BIP PDF)

const IS_RESULT_RE = /informacj[ęe]\s+o\s+wyniku/i;
// Structural signal: the "table" result template (land / built-up-plot sales)
// vs. the "prose" template (lokal sales) — see file header rationale.
const IS_PLOT_TABLE_RE = /Nr\s+dzia[łl]ki\b/i;

const RESULT_AUCTION_DATE_RE = /Na\s+dzie[ńn]\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i;
const PLOT_NR_RE = /Nr\s+dzia[łl]ki\s+(\d+(?:\/\d+)?)/i;
const PLOT_AREA_HA_RE = /Powierzchnia\s+dzia[łl]ki\s*\(ha\)\s+([\d]+(?:[.,]\d+)?)/i;
const OBREB_RE = /Obr[ęe]b:?\s*(\d+)/i;
const PLOT_POSITION_RE = /Po[łl]o[żz]enie\s+(?:ul\.?\s*)?([^\n,]+?)(?:,\s*Obr[ęe]b|\s*$)/im;
const PLOT_STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s+brutto\s+([\d][\d\s.,]*)\s*z[łl]/i;
const PLOT_ACHIEVED_RE = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+([\d][\d\s.,]*?)\s+brutto/i;
const PLOT_BUYER_RE = /Nabywca\s+nieruchomo[śs]ci\s+([^\n]+)/i;
const PLOT_ADMITTED_RE = /Liczba\s+os[óo]b\s+dopuszczonych\s+do\s+przetargu\s+(\d+)/i;

const LOKAL_RESULT_UNIT_RE = /lokal\S*\s+mieszkaln\S*\s+nr\s+(\d+[a-zA-Z]?)/i;
const LOKAL_RESULT_STREET_RE = /przy\s+ul\.?\s*([^\n,]+?)\s+Nr\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
const LOKAL_RESULT_AREA_RE = /nr\s+\d+[a-zA-Z]?\s+o\s+pow\.?\s+([\d]+(?:[.,]\d+)?)\s*m/i;
const LOKAL_RESULT_PRICE_RE = /[Cc]en[ąa]\s+wywo[łl]awcz\S*\s+lokalu(?:\s+do\s+[IVX]+\s+przetargu)?\s+by[łl]a\s+kwota\s+([\d][\d\s.,-]*)\s*z[łl]/i;
const NEGATIVE_RE = /wynikiem\s+negatywnym|nikt\s+nie\s+wp[łl]aci[łl]\s+wadium|nie\s+wp[łl]acono\s+wadium/i;

/**
 * Parse one BIP result PDF (text already extracted by crawl.js's pdfText call).
 * @param {string} text         extracted PDF text (pdftotext -layout)
 * @param {string|null} fallbackDate  ISO date from the crawl ref (title-derived)
 * @param {string} sourceUrl    the /public/getFile?id=N URL
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !IS_RESULT_RE.test(text)) return [];
  const t = text.replace(/\r/g, '');
  const round = roundFromText(t);
  const auctionDateM = RESULT_AUCTION_DATE_RE.exec(t);
  const auction_date = (auctionDateM && polishDateToIso(auctionDateM[1])) || fallbackDate || null;
  const notes = [];

  if (IS_PLOT_TABLE_RE.test(t)) {
    const dzialka_nr = (PLOT_NR_RE.exec(t) || [])[1] || null;
    const area_m2 = haToM2(parseAreaNum((PLOT_AREA_HA_RE.exec(t) || [])[1]));
    const obreb = (OBREB_RE.exec(t) || [])[1] || null;
    const posM = PLOT_POSITION_RE.exec(t);
    let street = posM ? posM[1].replace(/^ul\.?\s*/i, '').trim() : null;
    const address_raw = street ? `ul. ${street}` : null;
    const starting_price_pln = parsePLN((PLOT_STARTING_PRICE_RE.exec(t) || [])[1]);
    const achievedRaw = (PLOT_ACHIEVED_RE.exec(t) || [])[1];
    const achieved = achievedRaw != null ? parsePLN(achievedRaw) : null;
    const buyer = ((PLOT_BUYER_RE.exec(t) || [])[1] || '').trim();
    const noBuyer = !buyer || /^brak\b/i.test(buyer);
    const sold = achieved != null && achieved > 0 && !noBuyer;
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    let unsold_reason = null;
    if (!sold) {
      if (noBuyer && /^0$/.test((PLOT_ADMITTED_RE.exec(t) || [])[1] || '')) unsold_reason = 'brak uczestników';
      else if (noBuyer) unsold_reason = 'brak nabywcy';
      else unsold_reason = 'unknown';
    }
    if (!dzialka_nr && !address_raw) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw,
      auction_date,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason,
      source_pdf: sourceUrl,
      notes,
    }];
  }

  // ---- prose-style lokal result
  const unitM = LOKAL_RESULT_UNIT_RE.exec(t);
  const streetM = LOKAL_RESULT_STREET_RE.exec(t);
  if (!unitM || !streetM) {
    notes.push('parse: could not resolve lokal/address from result text');
    return [];
  }
  const street = streetM[1].trim();
  const building = safeBuildingToken(streetM[2]);
  const nr = unitM[1];
  const address_raw = `${street} ${building}/${nr}`;
  const address = parseAddress(address_raw);
  if (!address) {
    notes.push(`parse: could not parse address from '${address_raw}'`);
    return [];
  }
  if (address.warning) notes.push(address.warning);
  const kind = classifyKind(t) === 'unknown' ? 'mieszkalny' : classifyKind(t);
  const area_m2 = parseAreaNum((LOKAL_RESULT_AREA_RE.exec(t) || [])[1]);
  const starting_price_pln = parsePLN((LOKAL_RESULT_PRICE_RE.exec(t) || [])[1]);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  const negativeStated = NEGATIVE_RE.test(t);
  // No positive-outcome phrasing observed live yet for this template (all 3
  // real fixtures are unsold) — guard on the explicit negative marker; a sold
  // notice would need re-verification against a live "nabywcą został…" fixture.
  const sold = !negativeStated && /nabywc[ąa]\s+(?:nieruchomo[śs]ci\s+)?(?:zosta[łl]|ustalono)/i.test(t);
  let final_price_pln = null;
  if (sold) {
    const m = /(?:nabywc[ąa][\s\S]{0,120}?|cen[ąa]\s+osi[ąa]gni[ęe]t[ąa][\s\S]{0,40}?)([\d][\d\s.,]*)\s*z[łl]/i.exec(t);
    final_price_pln = m ? parsePLN(m[1]) : null;
  }
  return [{
    kind,
    address_raw,
    address,
    round,
    auction_date,
    starting_price_pln,
    final_price_pln,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : (negativeStated ? 'brak wpłaty wadium' : 'unknown'),
    area_m2,
    source_pdf: sourceUrl,
    notes,
  }];
}
