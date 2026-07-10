// Poddębice parsers — devcomm "bipv45" board (single mixed board, id=102).
//
// Every announcement PDF (born-digital text, pdftotext -layout) follows the
// same standard Poddębice template: a title clause stating the sale type
// (lokalowej=flat / gruntowej=land, zabudowanej/niezabudowanej optional), a
// "Wykaz nieruchomości ..." table (Lp | Położenie | Numer działki/lokalu |
// Pow. w m2 | Nr KW | Opis | Przeznaczenie | Cena | Wadium | Postąpienie),
// then prose stating "Przetarg odbędzie się w dniu D MONTH YYYY roku" and a
// wadium-payment clause naming each item + its wadium (10% of price, exact
// across every real example seen — see below).
//
// GROUNDTRUTHED live 2026-07-10 against 4 real fetched+pdftotext'd PDFs
// (bip.poddebice.pl/upload/pliki/*.pdf):
//   - Przejazd 18 (p2=10065722, ogł. 29.05.2026): FLAT, single item.
//       "• dla lokalu nr 28 przy ulicy Przejazd 18 – 28.500,00 zł" — wadium
//       bullet carries apt+street+building. Table cell "43,54        4354/…"
//       — area sits directly before the udział-w-gruncie fraction, no unit
//       suffix on the cell itself. Przetarg 7 lipca 2026. Cena 285.000,00 zł
//       (= wadium × 10, exact).
//   - Dzierzązna (p2=10056362, ogł. 22.09.2025): LAND, 4-item multi-parcel
//       notice (182/3, 182/5, [183/4 + 182/4 combo], 311), one bullet each:
//       "- dla działki nr 182/3 - 4.460,00 zł (słownie: ...)" / "- dla
//       działki nr 183/4 i nr 182/4 - 4.760,00 zł". Cena = wadium × 10 exact
//       for all 4. Table area cells (1093/1115/996/232/1228-combo-total/2470
//       m2) can't be reliably zipped to the right bullet — pdftotext -layout
//       drops one row's area onto a wrapped follow-line, and a combo item has
//       BOTH a sub-area and a combined total in the token stream — so
//       multi-item land notices leave area_m2 null rather than risk a wrong
//       value (same "best-effort, often null" stance as naklo-nad-notecia's
//       land parser).
//   - obr. 1 dz. 122/2 (p2=10066232, ogł. 15.06.2026): LAND, "gruntowej
//       zabudowanej" (has an old outbuilding — no street address, still
//       parcel/obręb-identified like every other Poddębice land item — see
//       kindFromTitle). Single item, NO wadium bullet — instead a plain
//       "... t.j. 2.000,00 zł" clause. Table has exactly one "54 m2" token
//       (single-item land area IS trustworthy). Cena 20.000,00 zł = wadium ×
//       10 exact.
//   - Poddębice obr. 6, dz. 5/5+5/6+5/7+5/8 (p2=10064614, ogł. 08.05.2026):
//       LAND, one combo item, a THIRD wadium phrasing: "t.j. dla działek Nr
//       5/5, Nr 5/6, Nr 5/7, Nr 5/8 m. Poddębice obręb Nr 6 - 512.000,00 zł"
//       — no bullet, but DOES name every parcel inline. Cena 5.120.000,00 zł
//       = wadium × 10 exact.
//   (skipped-lease fixture, real title, not fetched as a PDF since it's out
//   of scope by title alone): p2=10014817 "... o przetargu ustnym
//   nieograniczonym dot. oddanie w najem lokalu użytkowego - garażu ...".
//
// The wadium-is-exactly-10%-of-price relationship held on EVERY item across
// all 4 real fixtures (7 items total) — Poddębice always rounds cena to a
// value with an exact 10% wadium, per the cited Rozporządzenie RM z dnia 14
// września 2004 r. So `starting_price_pln = wadium * 10` is used throughout
// rather than parsing the (harder to align) "Cena" table column directly.
//
// No live "informacja o wyniku przetargu" example exists for this city (see
// config.js) — parseResultDoc follows the same standard template used by
// tczew/naklo-nad-notecia (which cite the identical Rozporządzenie) but is
// UNGROUNDTRUTHED against real Poddębice text.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9,
  pazdziernika: 10, 'października': 10, listopada: 11, grudnia: 12,
};

// "285.000,00" / "20.000,00" -> integer PLN. Poddębice always uses
// dot-thousands + comma-grosze (no space-thousands observed); the space
// strip is defensive.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/\./g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "43,54" / "1093" -> number. Used for both flat usable area and plot area.
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ------------------------------------------------------------------- title gates

/**
 * A scheduled-auction SALE announcement — the only title shape crawlActive()
 * should fetch a PDF for. Matches both the flat phrasing ("w sprawie
 * przeprowadzenia przetargu ustnego nieograniczonego na sprzedaż
 * nieruchomości lokalowej ...") and the land phrasing ("w sprawie ogłoszenia
 * i przeprowadzenia [II/III] przetargu ustnego ograniczonego na sprzedaż
 * nieruchomości gruntowej ..."). Deliberately excludes: wykaz-only
 * pre-announcements (no committed date/price yet — "ustalenia/podania do
 * publicznej wiadomości wykazu ..."), results, cancellations, and leases (see
 * isLeaseTitle — checked separately by callers since a title can theoretically
 * carry both signals).
 * @param {string} title
 * @returns {boolean}
 */
export function isAuctionSaleTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  if (!/przetarg/.test(t)) return false;
  if (!/ustn\w+/.test(t)) return false; // ustnego / ustnych / ustny
  if (!/nieograniczon\w*|ograniczon\w*/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false; // sprzedaż
  if (/wynik|rozstrzygni[eę]|odwo[łl]a|uniewa[żz]ni|wykaz/.test(t)) return false;
  return true;
}

/** Lease/rental — "skip rentals" per ADAPTER-GUIDE. Real fixture (2022,
 *  p2=10014817): "... o przetargu ustnym nieograniczonym dot. oddanie w
 *  najem lokalu użytkowego - garażu ...". Checked independently of
 *  isAuctionSaleTitle so parse.js stays self-contained/testable even though
 *  crawl.js's title gate already excludes these via the same check.
 * @param {string} title
 * @returns {boolean}
 */
export function isLeaseTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return /dzier[żz]aw|\bnajem\b/.test(t);
}

/** Roman numeral (or, defensively, a Polish ordinal word) immediately before
 *  "przetarg" in the title. Round 1 is never spelled out on this board (only
 *  II/III+ repeats are), so an unmatched title returns null rather than
 *  assuming 1 — same convention as gizycko/tczew/naklo-nad-notecia.
 * @param {string} title
 * @returns {number|null}
 */
export function roundFromTitle(title) {
  if (!title) return null;
  const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
  const roman = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(title);
  if (roman) {
    const val = ROMAN[roman[1].toLowerCase()];
    if (val) return val;
  }
  const t = title
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
  if (/\bpierwsz\w*\s+przetarg/.test(t)) return 1;
  if (/\bdrugi\w*\s+przetarg/.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/.test(t)) return 3;
  if (/\bczwart\w*\s+przetarg/.test(t)) return 4;
  return null;
}

/** "w obrębie geodezyjnym nr 1" -> "1"; "w obrębie geodezyjnym Dzierzązna" ->
 *  "Dzierzązna". Land items' only location signal on this board (no street).
 * @param {string} title
 * @returns {string|null}
 */
export function obrebFromTitle(title) {
  if (!title) return null;
  const m = /w\s+obr[eę]bie(?:\s+geodezyjnym)?\s+(?:nr\s+)?([^\s,]+)/i.exec(title);
  return m ? m[1].replace(/[.,;]+$/, '') : null;
}

/** "przy ulicy Przejazd 18" (title fallback address, used only when the body
 *  wadium-bullet didn't already carry street+building).
 * @param {string} title
 * @returns {{street: string, building: string}|null}
 */
export function streetFromTitle(title) {
  if (!title) return null;
  const m = /przy\s+ulicy\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\d]*?)\s+(\d+[A-Za-z]?)/i.exec(title);
  return m ? { street: m[1].trim().replace(/\s+$/, ''), building: m[2] } : null;
}

// ---------------------------------------------------------------- body: date

/** "Przetarg odbędzie się w dniu 7 lipca 2026 roku /wtorek/ ..." -> ISO date.
 *  The only date phrasing observed across every fixture.
 * @param {string} text  pdftotext -layout output
 * @returns {string|null}
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  const m = /Przetarg\s+odb[eę]dzie\s+si[eę]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s+roku/i.exec(text);
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// --------------------------------------------------------- body: item extraction

// Per-item wadium bullet, e.g.:
//   "• dla lokalu nr 28 przy ulicy Przejazd 18 – 28.500,00 zł"
//   "- dla działki nr 182/3 - 4.460,00 zł"
//   "- dla działki nr 183/4 i nr 182/4 - 4.760,00 zł"      (2-parcel combo)
const BULLET_RE =
  /[•\-]\s*dla\s+(lokalu|dzia[łl]ki)\s+nr\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)(?:\s+i\s+nr\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?))?(?:\s+przy\s+ulicy\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\d]*?)\s+(\d+[A-Za-z]?))?\s*[-–]\s*([\d][\d.\s]*,\d{2})\s*z[łl]/gi;

// A 4th observed wadium phrasing (multi-obręb land notice, e.g. "... w
// obrębie geodezyjnym nr 11 i w obrębie Antonina" — two obręby, one parcel
// sold from each): "- dla działki nr 84/8 obręb nr 11 w Poddębicach
// 1.600,-zł" / "- dla działki nr 112/2 obręb Antonina 1.000,-zł". Two things
// BULLET_RE doesn't handle: (a) the amount's grosze marker is a literal
// dash, not "00" ("1.600,-zł" = 1600,00 PLN, no separate "- " lead-in before
// the number itself), and (b) each item names its OWN obręb inline, which
// can differ per item on a multi-obręb notice — so this path also captures
// obręb per item rather than relying on the one shared title-derived value.
// A bounded [\s\S]{0,60}? (not [^\d]*?) bridges the "obręb nr 11 w
// Poddębicach" clause, which contains its own digits (the obręb number) that
// a digit-excluding class can't skip past.
const OBREB_BULLET_RE =
  /-\s*dla\s+dzia[łl]ki\s+nr\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)([\s\S]{0,60}?)([\d][\d.\s]*)(?:,-|,\d{2})\s*z[łl]/gi;
const OBREB_IN_SPAN_RE = /obr[eę]b\w*\s+(?:nr\s+)?([^\s,]+)/i;

// Fallback for single-item notices that state the wadium inline instead of a
// bullet list, e.g.:
//   "... t.j. 2.000,00 zł (słownie: ...)"                                  (plain)
//   "... t.j. dla działek Nr 5/5, Nr 5/6, Nr 5/7, Nr 5/8 m. Poddębice
//        obręb Nr 6 - 512.000,00 zł"                                      (combo)
// Bounded lazy window after "t.j." so it can bridge the "dla działek Nr …"
// combo clause (which contains its own periods/digits) without running away
// across the whole document.
const INLINE_WADIUM_RE = /t\.?\s*j\.?([\s\S]{0,200}?)([\d][\d.\s]*,\d{2})\s*z[łl]/i;
const PARCEL_NR_RE = /\bnr\.?\s*(\d+[A-Za-z]?\/\d+[A-Za-z]?)\b/gi;
const SINGLE_PARCEL_INLINE_RE = /dzia[łl]k[eę]\s+(\d+[A-Za-z]?\/\d+[A-Za-z]?)\b/i;

/**
 * @typedef {object} WadiumItem
 * @property {string[]} ids     apt number (flats) or parcel number(s) (land)
 * @property {string|null} street
 * @property {string|null} building
 * @property {string|null} [obreb]  per-item obręb override (multi-obręb notices only)
 * @property {number|null} wadium  PLN
 */

/**
 * Split a notice body into its per-item wadium entries. Multi-item notices
 * (several flats, or several parcels) use one bullet per item; single-item
 * notices sometimes skip the bullet and state the wadium inline instead
 * (see INLINE_WADIUM_RE above) — both are groundtruthed live (see file
 * header). Returns [] when none of the observed shapes are found.
 * @param {string} text
 * @param {boolean} isFlat
 * @returns {WadiumItem[]}
 */
export function extractItems(text, isFlat) {
  if (!text) return [];
  const items = [];
  BULLET_RE.lastIndex = 0;
  let m;
  while ((m = BULLET_RE.exec(text)) !== null) {
    const [, , id1, id2, street, building, wadiumStr] = m;
    items.push({
      ids: [id1, id2].filter(Boolean),
      street: street ? street.trim() : null,
      building: building || null,
      wadium: parsePLN(wadiumStr),
    });
  }
  if (items.length) return items;

  if (!isFlat) {
    OBREB_BULLET_RE.lastIndex = 0;
    while ((m = OBREB_BULLET_RE.exec(text)) !== null) {
      const [, id, span, amountStr] = m;
      const om = OBREB_IN_SPAN_RE.exec(span);
      items.push({
        ids: [id],
        street: null,
        building: null,
        obreb: om ? om[1].replace(/[.,;]+$/, '') : null,
        wadium: parsePLN(amountStr),
      });
    }
    if (items.length) return items;
  }

  const wm = INLINE_WADIUM_RE.exec(text);
  if (!wm) return [];
  const wadium = parsePLN(wm[2]);
  if (isFlat) return [{ ids: [], street: null, building: null, wadium }];

  const between = wm[1];
  const ids = [];
  PARCEL_NR_RE.lastIndex = 0;
  let pm;
  while ((pm = PARCEL_NR_RE.exec(between)) !== null) ids.push(pm[1]);
  if (ids.length === 0) {
    const sm = SINGLE_PARCEL_INLINE_RE.exec(text);
    if (sm) ids.push(sm[1]);
  }
  return [{ ids, street: null, building: null, wadium }];
}

// Flat usable-area table cell sits directly before the fractional
// udział-w-gruncie column, no unit suffix of its own:
//   "43,54        4354/186867 w      SR2L/..."
// Denominator gated to >=3 digits so a small "udział 1/2" share fraction
// elsewhere in the prose (land notices) can never be mistaken for this.
// Same-line only ([ \t] not \s) so it can't bridge across an unrelated
// wrapped table cell.
const FLAT_AREA_RE = /(\d{1,3}[.,]\d{1,2})[ \t]+\d+\/\d{3,}\b/g;

// Land plot area: the only "<number> m2" tokens on the notice. Same-line
// only — with \s* here (matching across pdftotext's wide inter-column
// padding) a real false positive was observed live: "... geodezyjnym nr 1"
// on one line, unrelated "... m2" from a wrapped different-column cell many
// lines later, bridged only because \s matches newlines too.
const LAND_AREA_RE = /(\d+(?:[.,]\d+)?)[ \t]*m\s*2\b/g;

/**
 * All area tokens found on the notice, in document order. Only trustworthy
 * to use when there is exactly ONE item on the notice — see file header for
 * why multi-item notices leave area_m2 null instead of risking a
 * mis-associated value.
 * @param {string} text
 * @param {boolean} isFlat
 * @returns {number[]}
 */
export function areaTokens(text, isFlat) {
  if (!text) return [];
  const re = isFlat ? FLAT_AREA_RE : LAND_AREA_RE;
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(parseArea(m[1]));
  return out;
}

// ------------------------------------------------------------------- kind

// REAL PARSER BUG, found + fixed while groundtruthing this adapter (live
// 2026-07-10): the shared core/classify-kind.js FLAT_RE requires "lokal" and
// "mieszkalny" to sit ADJACENT ("lokal\w*\s+mieszkaln"/"lokalu\s+mieszkaln").
// Poddębice's standard flat-sale title phrasing is "... na sprzedaż
// nieruchomości LOKALOWEJ usytuowanej w budynku MIESZKALNYM wielorodzinnym
// ..." (confirmed on every real flat title fetched: Przejazd 18, Południowa
// 1A, Targowa 16/18, Grunwaldzka 2/Narutowicza 6-8, Przejazd 12/16) — the two
// words describe DIFFERENT nouns ("lokalowej" the unit-type property,
// "mieszkalnym" the residential building it sits in) and are never adjacent,
// so classifyKind(title) alone misclassifies every real Poddębice flat title
// as non-flat (verified: returns 'grunt'/'unknown', never 'mieszkalny').
// core/ is shared and must not be edited for a city build (ADAPTER-GUIDE §4)
// — handled here instead, checking Poddębice's own "nieruchomości
// lokalowej/lokalowych" term-of-art BEFORE falling back to the shared
// classifier for the land/other split.
const NIERUCHOMOSC_LOKALOWA_RE = /nieruchomo[śs]ci\s+lokalow\w*/i;

/**
 * mieszkalny -> flat (address-keyed). Everything else (grunt / zabudowana /
 * unknown) -> land (parcel-keyed). Poddębice's board only ever sells flats
 * (always street-addressed) or land / land-with-a-structure (always
 * parcel+obręb-identified, never a plain street address — confirmed on the
 * live "gruntowej zabudowanej" fixture, obr. 1 dz. 122/2, whose only location
 * is "Poddębice obr. 1", not a ul. address) — so routing anything that isn't
 * 'mieszkalny' to the land stream is correct here even where classifyKind()
 * can't resolve a specific kind (some titles, e.g. the obr. 6 combo lot,
 * state neither "gruntowej" nor "zabudowanej/niezabudowanej" and classify as
 * 'unknown'). Pushing a 'zabudowana'/'unknown' record into land.json is also
 * safe downstream: build-land.js normalizes every entry's kind to 'grunt'
 * unconditionally.
 * @param {string} title
 * @returns {'mieszkalny'|'grunt'}
 */
export function kindFromTitle(title) {
  if (!title) return 'grunt';
  if (NIERUCHOMOSC_LOKALOWA_RE.test(title)) return 'mieszkalny';
  return classifyKind(title) === 'mieszkalny' ? 'mieszkalny' : 'grunt';
}

// -------------------------------------------------------------- main: active

/**
 * Parse one announcement PDF (+ its title) into 0+ active listing/land
 * records. A notice can list several items (several flats, or several
 * parcels) — one record per item, per ADAPTER-GUIDE §5.5.
 * @param {string} text        pdftotext -layout output
 * @param {string} title       board list title (JSON row, or detail page)
 * @param {string|null} fallbackDate  ISO published date (JSON row date)
 * @param {string} sourceUrl   the source PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseAnnouncementPdf(text, title, fallbackDate, sourceUrl) {
  if (!text || !title) return [];
  if (isLeaseTitle(title)) return [];

  const kind = kindFromTitle(title);
  const isFlat = kind === 'mieszkalny';
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromTitle(title);

  const items = extractItems(text, isFlat);
  if (items.length === 0) return [];

  // Area is only trustworthy when there is exactly one item — see
  // areaTokens() header comment.
  const tokens = items.length === 1 ? areaTokens(text, isFlat) : [];
  const singleArea = tokens.length ? tokens[0] : null;

  const titleStreet = isFlat ? streetFromTitle(title) : null;
  // Shared per-notice fallback obręb (from the title). A multi-obręb notice
  // (e.g. "... w obrębie geodezyjnym nr 11 i w obrębie Antonina") overrides
  // this per item via item.obreb (see extractItems' OBREB_BULLET_RE path) —
  // the title regex only ever captures the FIRST-named obręb.
  const titleObreb = !isFlat ? obrebFromTitle(title) : null;
  const addressRawFor = (obreb) =>
    obreb ? (/^\d+$/.test(obreb) ? `Poddębice, obręb ${obreb}` : obreb) : null;

  const out = [];
  for (const item of items) {
    const starting_price_pln = item.wadium != null ? item.wadium * 10 : null;

    if (isFlat) {
      const street = item.street || titleStreet?.street || null;
      const building = item.building || titleStreet?.building || null;
      if (!street || !building) continue; // can't key a property without one
      const apt = item.ids[0] || null;
      const address_raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
      const address = parseAddress(address_raw);
      if (!address) continue;
      out.push({
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2: singleArea,
        starting_price_pln,
        auction_date,
        round,
        detail_url: sourceUrl,
      });
    } else {
      const dzialka_nr = item.ids.length ? item.ids.join(', ') : null;
      const obreb = item.obreb || titleObreb;
      const address_raw = addressRawFor(obreb);
      if (!dzialka_nr && !address_raw) continue; // nothing to key this land record on
      out.push({
        kind: 'grunt',
        dzialka_nr,
        obreb,
        address_raw,
        area_m2: singleArea,
        starting_price_pln,
        auction_date,
        round,
        detail_url: sourceUrl,
      });
    }
  }
  return out;
}

// ------------------------------------------------------------- main: results

// No live result notice exists for Poddébice to groundtruth against (see
// config.js/crawl.js) — this mirrors tczew/naklo-nad-notecia's standard
// "cena osiągnięta" / "wynikiem negatywnym" template, which cites the same
// Rozporządzenie RM z dnia 14 września 2004 r. that every real Poddębice
// announcement PDF fetched for this build also cites. Kept implemented (not
// stubbed to a bare []) per the adapter contract, in case a result notice is
// ever published on this board.
const RESULT_GUARD_RE = /wynik|Burmistrz\s+Poddębic/i;

/**
 * @param {string} text        pdftotext -layout output
 * @param {string|null} fallbackDate  ISO date fallback
 * @param {string} sourceUrl   source PDF URL
 * @returns {Array<object>} 0 or 1 result record
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !RESULT_GUARD_RE.test(text)) return [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;

  const negative =
    /wynik\w*\s+negatywn/i.test(text) ||
    /nie\s+wp[lł]yn[eę][lł]o\s+wadium/i.test(text) ||
    /brak\s+ofert/i.test(text);

  const priceM = /(?:cena\s+osi[aą]gni[eę]ta|za\s+cen[eę])[\s\S]{0,60}?([\d][\d.\s]*,\d{2})\s*z[łl]/i.exec(text);
  const startM = /cena\s+wywo[łl]awcza[\s\S]{0,100}?([\d][\d.\s]*,\d{2})\s*z[łl]/i.exec(text);

  const finalPrice = negative ? null : (priceM ? parsePLN(priceM[1]) : null);
  const outcome = finalPrice != null ? 'sold' : 'unsold';

  // Not enough signal to build even a bare record (no address/parcel, no
  // price at all) — better to return [] than a near-empty phantom row.
  if (finalPrice == null && !startM) return [];

  return [{
    kind: 'unknown',
    auction_date,
    outcome,
    unsold_reason: outcome === 'unsold' ? 'unknown' : null,
    starting_price_pln: startM ? parsePLN(startM[1]) : null,
    final_price_pln: finalPrice,
    source_pdf: sourceUrl,
    notes: ['poddebice: parseResultDoc is ungroundtruthed — no live result notice exists for this city'],
  }];
}
