// Szczecinek parsers.
//
// Every article page's body sits in <section class="wysiwyg">…</section>
// (extractBodyText below); crawl.js hands that plain text here (or, for a
// results-board article that has a PDF attachment, the PDF's extracted text
// instead — see crawl.js header). All regexes were groundtruthed against REAL
// live pages/PDFs fetched 2026-07-10/11 (article ids + PDF attachment ids are
// cited inline below and in the test file).
//
//   ANNOUNCEMENT flat (round III, article 645/7273):
//     "Burmistrz Miasta Szczecinek ogłasza: III przetarg ustny nieograniczony
//      na sprzedaż wolnego lokalu mieszkalnego nr 9 o powierzchni użytkowej
//      29,49 m2 położonego … przy ul. Narutowicza 3E w Szczecinku. …
//      Cena wywoławcza – 130.000,00 zł netto … Przetarg zostanie
//      przeprowadzony w dniu 28.04.2026 r. …"
//
//   ANNOUNCEMENT land (article 645/7276, word-month date — NOTE: the same
//   office uses a numeric DD.MM.YYYY date for flats but a word-month date for
//   land in the very same board):
//     "przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej
//      oznaczonej jako działki nr : 466/2, 465/3 i 465/4 o łącznej pow.
//      1,0698 ha, położonej w obrębie 07 przy ul. Kołobrzeskiej … Cena
//      wywoławcza – 2.700.000,00 zł netto … przeprowadzony w dniu 03 czerwca
//      2026 r. …"
//
//   RESULT, land batch, PDF table (attachment 13801, article 338/7156): a
//   single PDF can carry SEVERAL parcels from one przetarg session, each its
//   own table row — "1.  21.01.2026 r.  przetarg ustny nieograniczony  …
//   działki 1448/7 … 110.000,00 … [no cena osiągnięta] … wynikiem negatywnym
//   - nikt nie wpłacił wymaganego wadium" (unsold) vs row 2 "… działki 1448/11
//   … 120.000,00  121.200,00  Ilona i Bartosz Pytlak" (sold — TWO amounts:
//   wywoławcza then osiągnięta, in that column order).
//
//   RESULT, flat, STUB (article 338/7239, NO PDF attachment — confirmed on
//   repeat fetch, byte-identical): the HTML body is nothing but "Burmistrz …
//   podaje do publicznej wiadomości informację o wyniku przetargu z dnia
//   19.02.2026r. na sprzedaż lokalu mieszkalnego nr 9 położonego w budynku
//   przy ul. Narutowicza 3E" — no price, no outcome word, anywhere. Confirmed
//   the SAME for every solo-flat result sampled (6797/6905/7035/7239/7310/
//   7368) — this office simply doesn't publish a table for a single flat.
//
// Both shapes are handled by ONE row parser (parseResultRow): a stub becomes
// a single implicit "row" (the whole boilerplate sentence); a table PDF is
// split into N rows first (splitResultRows). A stub row naturally yields
// starting_price_pln: null, final_price_pln: null, outcome: 'unsold' (best
// effort) with diagnostic notes — never a fabricated price.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "130.000,00" / "2.700.000,00" / "120.000.00" (grosze rendered with "." on
// some result-table rows — a font/kerning artifact, not a real decimal) ->
// integer PLN. The LAST 2-digit group (comma OR dot separated) is always
// grosze; everything before it is thousands groups (dot, space or NBSP).
function parsePLN(numStr) {
  if (!numStr) return null;
  let s = String(numStr).trim();
  s = s.replace(/[,.]-$/, ''); // older dash-grosze marker, defensive
  s = s.replace(/[,.](\d{2})$/, ''); // trailing grosze group, comma OR dot
  s = s.replace(/[\s., ]/g, ''); // remaining separators are thousands groups
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "29,49" / "127,60" / "757" -> number (m2 or ha, caller converts ha).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- doc-type gate
//
// NOTE: "informacj[a-ząćęłńóśźż]*" — NOT "informacj\w*". JS's \w is ASCII-only
// (no unicode flag changes that), so it can't consume the accusative "ę" in
// this office's real phrasing ("…publicznej wiadomości informację o wyniku
// przetargu…"). A bare \w* here (the TG/Skarżysko pattern) silently fails to
// match every real result page on this host — verified against live text
// before shipping; see the test file's regression case.

/** Result notice ("…informację/informacja o wyniku…") vs. sale announcement. */
export function isResultNotice(text) {
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(text || '');
}

// ------------------------------------------------------------- title routing
//
// Checked against the article SLUG (board list pages carry no separate title
// text here) — slugs are ASCII-transliterated by the CMS, so \w* is safe in
// this section specifically (unlike isResultNotice above, which reads the
// accented body text).

/** True for items to SKIP outright: rentals (dzierżawa/najem), wykazy
 *  (pre-auction designations), cancellations, corrections, complaint
 *  rulings, rokowania (negotiations), qualified-person lists. */
export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /(^|\W)wykaz\b/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s) ||
    /lista\s+os[óo]b/i.test(s)
  );
}

/** True when the title/slug looks like a published result notice. */
export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /informacj\w*\s+o\s+wynik/i.test(s) || /\bwynik\w*\s+przetarg/i.test(s);
}

/** True when the title/slug looks like a municipal sale-auction announcement
 *  ("Ogłoszenie o przetargu na zbycie …", a bare "Przetarg na sprzedaż …",
 *  the plural "Przetargi na sprzedaż … (batch of several plots)"). */
export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal/i.test(s)) return true;
  return false;
}

// ----------------------------------------------------------------- rounds
//
// The CURRENT attempt is a ROMAN NUMERAL immediately before "przetarg"
// ("III przetarg ustny nieograniczony …"); PRIOR attempts are narrated
// separately in past tense with a WORD ordinal ("Pierwszy przetarg odbył się
// w dniu …", "Drugi przetarg odbył się w dniu …"), later in the same body.
// Roman numerals are matched case-SENSITIVE (no /i): Polish "i" ("and") is
// extremely common right before other words, and a case-insensitive bare "I"
// would false-fire on "… wadium i przetarg …"-shaped prose. Roman is tried
// first (longest alternatives first, so "III"/"II" aren't cut short by "I")
// so the CURRENT round always wins over a later historical word-ordinal
// mention — the bug a borrowed word-ordinal-only regex (TG/Skarżysko) would
// have: it would silently grab round 1 from "Pierwszy przetarg odbył się"
// instead of the true current round.
const ROMAN_ROUND = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROUND_WORD_PREFIX = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

/** Round from the current-attempt Roman numeral, falling back to a word
 *  ordinal qualifying "przetarg" (used when no Roman marker is present, e.g.
 *  an un-numbered first attempt that also lacks any "Pierwszy" narration).
 *  Returns null when neither is found — never assumes round 1. */
export function roundFromText(text) {
  const t = text || '';
  const rm = /\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\s+przetarg/.exec(t);
  if (rm) return ROMAN_ROUND[rm[1]] ?? null;
  const wm = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)[a-ząćęłńóśźż]*\s+przetarg/i.exec(t);
  if (wm) return ROUND_WORD_PREFIX[wm[1].toLowerCase()] ?? null;
  return null;
}

// ----------------------------------------------------------------- dates

/** DD.MM.YYYY or "DD <miesiąc> YYYY" starting at the given match position's
 *  capture chunk -> ISO date, or null. Both shapes are used interchangeably
 *  by this office (numeric for flats, word-month for land — sometimes both
 *  in the same document for different clauses). */
function parseDateChunk(chunk) {
  const t = chunk || '';
  let m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** Announcement auction date: "Przetarg [na sprzedaż w/w nieruchomości]
 *  zostanie przeprowadzony w dniu <date> r." (both date shapes — see
 *  parseDateChunk). Anchored on the future-tense "zostanie przeprowadzony" /
 *  "odbędzie się" so a PRIOR round's past-tense "odbył się w dniu …" is never
 *  picked up. -> ISO or null. */
export function auctionDateFromText(text) {
  const m = /(?:zostanie\s+przeprowadzon[a-ząćęłńóśźż]+|odb[ęe]dzie\s+si[ęe])\s+w\s+dniu\s+([\s\S]{0,40}?)(?:r\.|roku|$)/i.exec(
    text || '',
  );
  return m ? parseDateChunk(m[1]) : null;
}

/** Result-notice auction date, from the HTML boilerplate sentence common to
 *  EVERY result article (stub or PDF-backed): "…informację o wyniku
 *  przetargu z dnia DD.MM.YYYY[r]. na sprzedaż …". This is the ONLY place the
 *  date lives for a stub result; a PDF's own table carries a per-row date
 *  instead (see splitResultRows), since the PDF text never restates "z dnia".
 *  -> ISO or null. */
export function resultDateFromText(text) {
  const m = /przetargu\s+z\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r\.?/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// ----------------------------------------------------------------- prices

/** Starting price from ANNOUNCEMENT prose: "Cena wywoławcza – 130.000,00 zł
 *  netto" (en-dash connector; also tolerates a plain hyphen or colon). */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\s*(?:-|–|:)?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// PLN-shaped, thousands-grouped amount: requires at least one "<sep><3
// digits>" thousands group (dot or whitespace), optional trailing 2-digit
// grosze (comma OR dot). Deliberately does NOT match bare small numbers
// (room/parcel areas like "757 m2", parcel numbers "1448/7", hectare areas
// "0,0854 ha" — those have a comma+4-digits shape, never a thousands group).
// The leading (?<![\d.]) blocks the match from starting mid-way through an
// UNRELATED dotted digit run — without it, a citation date elsewhere in the
// row's prose like “z dn. 07.02.2017r.” gets misread starting at its MONTH
// (“02.201” from “02.2017”, discarding the day and the year's last digit) as
// a bogus “2 201 zł” amount. Caught live groundtruthing the Bartoszewskiego
// result row (a genuinely unsold parcel came back “sold” for 2 201 zł); see
// the test file's regression case.
const AMOUNT_RE = /(?<![\d.])\d{1,3}(?:[.\s  ]\d{3})+(?:[,.]\d{2})?/g;

/** All PLN-shaped amounts appearing in a result-table row, in reading order.
 *  This office's table renders "Cena wywoławcza" then "Cena osiągnięta" left
 *  to right on the row's first line, so amounts[0] is always the starting
 *  price and amounts[1] (when present — omitted, not "-", when unsold) is
 *  the achieved price. */
export function amountsInChunk(text) {
  const out = [];
  let m;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(text || '')) !== null) {
    const v = parsePLN(m[0]);
    if (v != null) out.push(v);
  }
  return out;
}

// ----------------------------------------------------------------- address

// Flat/unit number: "lokalu mieszkalnego nr 9" / "lokal mieszkalny nr 2".
const UNIT_NO_RE = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;

// Street + optional building from "… przy ul. Narutowicza 3E w Szczecinku"/
// "… przy ul. Kołobrzeskiej w Szczecinku" (land, no building number)/
// "… przy ul. Władysława Bartoszewskiego 12." (multi-word patron street)/
// "… przy ul. Władysława Bartoszewskiego 12 wpisanej do księgi wieczystej…"
// (results-table prose — an open-ended "what follows the building number"
// clause, unlike the announcements' terse period/comma). The alternation is
// deliberately split in two: when a BUILDING NUMBER is present, capturing it
// is itself a sufficient, self-terminating stop (whatever follows a digit is
// never part of the street name, so nothing more needs to be anticipated —
// this is what "wpisanej" needed, caught live groundtruthing the Bartoszewskiego
// result row: the original terminator list didn't include it and the whole
// match failed, silently dropping the record). Only the NO-building case (a
// bare street — land with no address, or a results-stub that ends right
// after the street) falls back to the explicit period/comma/keyword list,
// since there a stop signal has to come from somewhere.
const STREET_HEADER_RE =
  /przy\s+ul(?:icy|\.)?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęńŻŹĆŁŚĄĘŃ.'’\- ]+?)(?:\s+(\d+[A-Za-z]?)\b|\s*(?:,|\.|w\s+Szczecin|wraz\b|oraz\b|w\s+obr[ęe]bie|\n|$))/i;

/** { street, building|null } from the header, or null. */
export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

/** "ul. <street> <bldg>[/<apt>]" raw address. Null without a street+building
 *  (a bare street with no number, e.g. land, can't be address-keyed). */
export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

// Usable floor area of the unit. Two phrasings seen live:
//   (a) "lokalu mieszkalnego nr 9 o powierzchni użytkowej 29,49 m2" — the
//       area directly qualifies the flat-number clause.
//   (b) "Lokal o pow. 127,60 m² składa się z: …" — a separate sentence
//       giving the flat's OWN area (room-by-room breakdown sums to it, cellar
//       excluded) ahead of a LATER "Łączna powierzchnia lokalu wraz z
//       powierzchnią piwnic wynosi …" total that must NOT be taken instead.
// Both are anchored on the exact word "lokal" (word-boundary both sides), so
// neither can match "Do lokalu przynależy piwnica o pow. 5,08 m2" (subject is
// "piwnica", and "lokalu" i.e. inflected, doesn't satisfy \blokal\b) nor the
// "łącznej" total (different anchor word entirely).
const UNIT_AREA_RE =
  /lokal\w*\s+mieszkaln\w*\s+nr\s+\d+[a-z]?\s+o\s+powierzchni\s+u[żz]ytkow\w+\s+([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;
const UNIT_AREA_ALT_RE = /\blokal\b\s+o\s+pow\.?\s+([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;

/** Usable floor area (m2) of a flat, or null. */
export function unitAreaFromText(text) {
  const t = text || '';
  const m = UNIT_AREA_RE.exec(t) || UNIT_AREA_ALT_RE.exec(t);
  return m ? parseArea(m[1]) : null;
}

// obręb here is a bare NUMBER ("w obrębie 09" / "obr. 13" — the abbreviated
// form has no diacritic at all, so it needs its own alternative, not just an
// optional "ie" suffix on "obręb").
const OBREB_RE = /\bobr(?:[ęe]b(?:ie)?\.?|\.)\s*(\d+)/i;

/** obręb number (string, leading zero preserved), or null. */
export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1] : null;
}

/**
 * Parcel number(s) + area (m2) of a land property. Two independent shapes,
 * checked only when the text mentions "działk" at all (cheap guard against
 * accidental matches elsewhere):
 *   (a) ONE parcel with its OWN area already in m2 — "numerem działki 1448/7
 *       o pow. 757 m2" (word order is numer-FIRST on the results-table PDFs,
 *       opposite of the announcements' "działki nr … o łącznej pow. … ha", so
 *       this does NOT require "działk" to precede "numer" — see below).
 *   (b) a parcel LIST (2+, joined by "," / "i") sharing one "łącznej pow. …
 *       ha" total — "działki numer 214/10 i 214/11 o łącznej pow. 0,0854 ha"
 *       (announcement order) AND "numerami działek : 466/2, 465/3 i 465/4 o
 *       łącznej pow. 1,0698 ha" (results-table order — numer-word first).
 * Deliberately word-order-agnostic (no "działk…numer" adjacency requirement)
 * because the two document types on this host use OPPOSITE orders for the
 * same information — an order-anchored regex (the TG pattern) would only
 * catch one of the two and silently return no parcel for the other.
 * @returns {{ dzialka_nr: string|null, area_m2: number|null }}
 */
export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  const parcelArea = new Map();
  let total = null;

  // REGRESSION: "dzia[łl]k" alone misses the genitive plural "działek"
  // ("numerami działek : 466/2…" — a real, common phrasing on the
  // results-table PDFs) — Polish's "ruchome e" (mobile e) inserts a vowel
  // before the final consonant in this inflection, so the bare stem "dział"
  // (without requiring a "k" immediately after) is the only guard that's
  // inflection-proof. Broader than strictly necessary (also passes on
  // unrelated words like "działalność" elsewhere in the boilerplate), but
  // harmlessly — the guard only gates whether the extraction regexes run at
  // all; they still require an actual parcel-shaped match to produce data.
  if (/dzia[łl]/i.test(s)) {
    const m1 = /(\d+(?:\/\d+)?)\s+o\s+(?:pow\.?|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(s);
    if (m1) {
      parcels.add(m1[1]);
      const a = parseArea(m1[2]);
      if (a) parcelArea.set(m1[1], a);
    }

    const listRe =
      /((?:\d+(?:\/\d+)?\s*(?:,|i)\s*)+\d+(?:\/\d+)?)\s+o\s+[łl][ąa]cznej\s+(?:pow\.?|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*ha\b/i;
    const lm = listRe.exec(s);
    if (lm) {
      for (const p of lm[1].split(/\s*(?:,|i)\s*/)) {
        if (/^\d+(?:\/\d+)?$/.test(p.trim())) parcels.add(p.trim());
      }
      const a = Number(lm[2].replace(',', '.'));
      if (a > 0) total = Math.round(a * 10000);
    }
    if (total == null) {
      const lm2 = /[łl][ąa]cznej\s+(?:pow\.?|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*ha\b/i.exec(s);
      if (lm2) {
        const a = Number(lm2[1].replace(',', '.'));
        if (a > 0) total = Math.round(a * 10000);
      }
    }
  }

  let area_m2 = total;
  if (area_m2 == null && parcelArea.size) {
    let sum = 0;
    for (const a of parcelArea.values()) sum += a;
    area_m2 = Math.round(sum);
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  return { dzialka_nr, area_m2 };
}

// Header window for kind classification: comfortably covers the opening
// "ogłasza: [round] przetarg … na sprzedaż <asset>" clause (longest real
// sample ~500 chars) without scanning the whole legal boilerplate. Safe even
// when a flat's own text later mentions its underlying parcel ("działka
// gruntu nr 168/2…") — classifyKind checks FLAT_RE before LAND_RE, so the
// flat match wins regardless of where within the window it occurs.
function kindFromHeader(text) {
  return classifyKind((text || '').slice(0, 700));
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT body (flat, built property, or land parcel-set).
 * Single-property per article on this board. Land records carry
 * kind:'grunt' + dzialka_nr/obreb (-> land.json); flats/buildings carry an
 * address (-> properties.json).
 * @param {string} text  extracted HTML body text (extractBodyText)
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kindHeader = kindFromHeader(t);
  const isLand = kindHeader === 'grunt';

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
      area_m2: plot.area_m2, // PLOT area — land has no usable floor area
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
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

// Splits a table-of-parcels result PDF into per-Lp-row chunks, keyed on the
// row-start marker "N.  DD.MM.YYYY r." (any run of whitespace between the two
// due to pdftotext -layout's column padding). A boilerplate-only stub (no
// table at all) has no such marker, so it degrades to ONE implicit row
// spanning the whole text — the same row parser below handles both shapes.
// The row-start marker is anchored at start-of-line specifically so it can
// never match a legal-citation date elsewhere in the prose (those are always
// word-month "14 września 2004r.", never "N. DD.MM.YYYY"). The marker itself
// is EXCLUDED from the returned row text (sliced from its end, not its
// start) — its own date is captured separately into `date`, and leaving the
// digits in the text is a real hazard: "21.01.2026" is itself shaped enough
// like a thousands-grouped amount ("...01.202|6") to falsely feed
// amountsInChunk — caught live while groundtruthing this adapter (every row
// of a real fixture came back with a bogus leading "1202" starting price
// until this was fixed; see the test file's regression case).
const ROW_START_RE = /(?:^|\n)\s*(\d{1,2})\.\s+(\d{2})\.(\d{2})\.(\d{4})\s*r\.?/g;

/** @returns {Array<{date:string|null, text:string}>} */
export function splitResultRows(text) {
  const t = (text || '').replace(/\r/g, '');
  const starts = [];
  let m;
  ROW_START_RE.lastIndex = 0;
  while ((m = ROW_START_RE.exec(t)) !== null) {
    starts.push({ index: m.index, end: m.index + m[0].length, date: `${m[4]}-${m[3]}-${m[2]}` });
  }
  if (!starts.length) return [{ date: null, text: t }];
  return starts.map((s, i) => ({
    date: s.date,
    text: t.slice(s.end, i + 1 < starts.length ? starts[i + 1].index : t.length),
  }));
}

// pdftotext -layout renders each results-table row across several physical
// LINES, one per column's line-wrap. The narrow "Data i miejsce"/"Rodzaj
// przetargu" columns finish after 2-3 lines — just "Urząd Miasta", the town
// name, and "ustny"/"nieograniczony" (+ an optional round marker, handled by
// roundFromText separately) — while the much wider "Oznaczenie nieruchomości"
// column keeps wrapping for many more. Collapsing all whitespace (including
// newlines) to reconstruct one flowing sentence — which every other field
// extractor in this file expects — therefore INTERLEAVES those short
// columns' leftover words into the middle of the long column's wrapped
// sentence (e.g. a parcel list wrapped as "466/2, 465/3" / "i 465/4" comes
// back as "466/2, 465/3 Szczecinek nieograniczony i 465/4", silently
// breaking the parcel-list regex; a wrapped "przy ul." / "Władysława
// Bartoszewskiego 12" comes back with "Urząd Miasta ustny" spliced between
// them, breaking the street regex). Fixed by stripping this small, fixed,
// predictable column vocabulary — never meaningful property content — before
// any other extractor sees the text. Confirmed live: without this, BOTH the
// Kołobrzeska (land) and Bartoszewskiego (building) real result rows lost
// their parcel/street entirely and the record was dropped — see the test
// file's regression cases.
function dewrapTableRow(text) {
  return (text || '')
    .replace(/\bUrz[ąa]d\s+Miasta\b/gi, ' ')
    .replace(/\bSzczecinek\b/g, ' ')
    .replace(/\bustny\b/gi, ' ')
    .replace(/\bnieograniczon\w*\b/gi, ' ');
}

/** Parse one result row (a table row, or the whole stub sentence) into a
 *  concluded-auction record, or null if it carries no usable address/parcel. */
function parseResultRow(rawRowText, auction_date, sourceUrl) {
  const rowText = dewrapTableRow(rawRowText);
  const notes = [];
  const round = roundFromText(rowText);
  const amounts = amountsInChunk(rowText);
  const starting_price_pln = amounts[0] ?? null;
  const achieved = amounts.length > 1 ? amounts[1] : null;
  const sold = achieved != null;
  const negativeStated = /wynikiem\s+negatywnym/i.test(rowText);

  const kindHeader = kindFromHeader(rowText);
  const isLand = kindHeader === 'grunt';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  if (isLand) {
    const plot = plotFromText(rowText);
    const obreb = obrebFromText(rowText);
    const h = streetFromHeader(rowText);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb,
      area_m2: plot.area_m2,
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    };
  }

  const address_raw = addressRawFromText(rowText);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);
  const area_m2 = unitAreaFromText(rowText);
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  // A building/zabudowana result (e.g. Bartoszewskiego 12) has no usable-UNIT
  // area (unitAreaFromText requires "lokal", which a whole building never
  // matches) — fall back to the plot area, same as parseAnnouncement, so
  // zł/m² is never computed against a building's floor area from here. Was
  // missing entirely until caught by the test file's Bartoszewskiego case
  // (land_area_m2 silently came back undefined for every building result).
  const plot = plotFromText(rowText);
  return {
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
  };
}

/**
 * Parse one RESULT document — a bare HTML stub (0 or 1 record) or a
 * multi-parcel results-table PDF (0..N records, one per row; up to 7 seen
 * live in one PDF). Joins its announcement by address(+flat-no)/dzialka_nr +
 * round in build-properties.
 * @param {string} text       extracted text — HTML body (stub) or PDF text (table)
 * @param {string|null} fallbackDate  ISO date from the crawl ref
 * @param {string} sourceUrl  the PDF attachment URL, or the article page URL
 *   when the result has no PDF (see crawl.js)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  // The HTML boilerplate (present on every result article, stub or not)
  // reliably carries "z dnia D.M.Y"; a pure PDF-table text never restates it
  // (the date lives in each row instead) — resultDateFromText simply returns
  // null there and the per-row date wins.
  const boilerplateDate = resultDateFromText(t);
  const rows = splitResultRows(t);
  const out = [];
  for (const row of rows) {
    const rec = parseResultRow(row.text, row.date || boilerplateDate || fallbackDate || null, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}

// ----------------------------------------------------------------- HTML extraction

/** Extract the plain-text body of a BIP article page: the content of
 *  <section class="wysiwyg">…</section> (not the later "content_legal"
 *  Metryczka section, and not the "attachments" section). */
export function extractBodyText(html) {
  if (!html) return '';
  const h = html.replace(/\r/g, '');
  const m = /<section class="wysiwyg"[^>]*>([\s\S]*?)<\/section>/i.exec(h);
  if (!m) return '';
  let text = m[1].replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/g, ' ');
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}
