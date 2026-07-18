// Jelenia Góra parsers.
//
// Every announcement / result is a born-digital text PDF hung off a thin BIP
// stub page (Logonet CMS). Closest analog: Kędzierzyn-Koźle / Tarnowskie Góry
// (same CMS vendor), but Jelenia Góra's own quirk is that ONE announcement PDF
// can cover MULTIPLE flats at once (simultaneous auctions batched into a single
// notice) — see splitLots(). Result notices are always single-property, even
// when the originating announcement was a batch (each lot gets its own result
// article, disambiguated with a "(2)"/"(3)" suffix on the notice number).
//
// All regexes below were groundtruthed against REAL `pdftotext -layout` output
// of live attachments (verified 2026-07-18):
//   - download/51538  flat ANNOUNCEMENT single-lot (82/2026, ul. Długa 14/2,
//     IV przetarg, 195.000,00 zł, future date 03.09.2026)
//   - download/51354  flat ANNOUNCEMENT multi-lot,   3 flats (69/2026,
//     Juszczaka 4/6, Jana Sobieskiego 21/6, Łabska 6/3, CZWARTE/4th round)
//   - download/51539  land ANNOUNCEMENT single-lot   (83/2026, ul. Gabrieli
//     Zapolskiej, dz. 116/4, III przetarg, 490.000,00 zł)
//   - download/51528  RESULT sold      (62/2026, lokal użytkowy nr U1, ul.
//     1 Maja 46 of, V przetarg, wywoławcza 36.050 → osiągnięta 36.420 zł)
//   - download/51496  RESULT unsold    (48/2026, dz. 116/4, drugi przetarg,
//     wywoławcza 490.000 zł, wynikiem negatywnym)
//
// Jelenia Góra specifics:
//   * ROUND is stated EITHER as a Roman numeral ("IV PRZETARG USTNY
//     NIEOGRANICZONY" / "odbył się V przetarg ustny nieograniczony") OR as a
//     Polish word ordinal, singular or plural ("CZWARTE PRZETARGI USTNE
//     NIEOGRANICZONE" / "odbył się drugi przetarg ustny nieograniczony").
//     roundFromText() scans for the phrase and validates the token immediately
//     before it against BOTH vocabularies, skipping non-ordinal words (e.g.
//     "OGŁASZA PRZETARG …", "Poprzednie przetargi …") until a real token
//     is found — first valid hit wins (recap sentences always follow it).
//   * PRICES use DOT thousands + comma grosze ("195.000,00 zł").
//   * Flat/commercial addresses: single-lot notices give the address as
//     "… w budynku [przy ul.] <Street> <Bldg> o ogólnej powierzchni …" (the
//     "ul."/"przy" prefix is sometimes present, sometimes not); multi-lot
//     notices instead number each lot "N) ul. <Street> <Bldg>" with the flat's
//     own "Lokal … nr <unit>" following in that lot's body.
//   * A commercial unit's number can be "U1"-style ("lokal użytkowy nr U1").
//     core/normalize.js's apt regex only accepts digit-led tokens
//     (`[0-9]+[A-Za-z]?`), so "U1" is rewritten to "1U" before building the
//     address (normalizeUnitToken) — same key space, just digit-first so the
//     shared parser (which we must not modify) can read it.
//   * An occasional "<bldg> of" suffix marks an oficyna (rear annex building) —
//     stripped before parseAddress (its regex has no notation for it); this is
//     a known, accepted simplification (front/rear annex collapse to the same
//     building key), documented rather than silently handled.
//   * Land: "Nieruchomość … przy ul. <Street> stanowiąca/oznaczona … działk[ęa]
//     (gruntu) (nr|numer) <N> o powierzchni <ha> ha, obręb <code>, <Name>, …".

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "195.000,00" / "68.000,00 zł" / "36 420,00" -> integer PLN. Dot OR space
// thousands separator, optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "39,60" / "0,2095" / "1 050" -> number.
function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------- round

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/** "IV" -> 4, "III" -> 3. Returns null on a malformed token. */
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

// Polish ordinal STEMS (singular/plural, any case — matched via a lowercased
// startsWith). Covers the rounds actually seen (I-V) plus a few further out
// for re-auctioned lots.
const WORD_ORDINAL_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piąt', 5], ['piat', 5], ['szóst', 6], ['szust', 6],
  ['siódm', 7], ['siodm', 7], ['ósm', 8], ['osm', 8],
];

// Token (Roman OR word-ordinal) immediately qualifying "przetarg(i) ustn(y|e)
// nieograniczon(y|e)", scanned globally so a non-ordinal word right before the
// phrase (e.g. "OGŁASZA PRZETARG …") is skipped in favour of the real token
// that follows (e.g. "III PRZETARG …"). Case-insensitive throughout — Jelenia
// Góra states the round in ALL CAPS in announcement headers and lower-case in
// result-notice prose.
const ROUND_PHRASE_RE =
  /([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)\s+przetarg\S*\s+ustn\S*\s+nieograniczon\S*/gi;

/** Round from EITHER a Roman numeral or a Polish word ordinal qualifying
 *  "przetarg(i) ustn(y|e) nieograniczon(y|e)". First valid token wins. */
export function roundFromText(text) {
  const t = text || '';
  ROUND_PHRASE_RE.lastIndex = 0;
  let m;
  while ((m = ROUND_PHRASE_RE.exec(t)) !== null) {
    const token = m[1];
    if (/^[IVXLCDM]+$/.test(token)) {
      const n = romanToInt(token);
      if (n) return n;
      continue;
    }
    const low = token.toLowerCase();
    const hit = WORD_ORDINAL_STEMS.find(([stem]) => low.startsWith(stem));
    if (hit) return hit[1];
  }
  return null;
}

// ---------------------------------------------------------------- doc-type gate

/** Result notice ("Informacja o wyniku przetargu") vs. announcement
 *  ("OGŁOSZENIE NR …"). The body header is authoritative. */
export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wyniku\s+przetarg/i.test(text || '');
}

// ----------------------------------------------------------------------- dates

/** Announcement auction date: "który odbędzie się w dniu 03 września 2026
 *  roku" / "które odbędą się w dniu 13 sierpnia 2026 roku" / "odbędzie się
 *  dnia 7 października 2026 roku" (land — no "w dniu"). -> ISO or null. */
export function auctionDateFromText(text) {
  const m = /odb[ęe]d\S*\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** Result auction date: "informuję, że w dniu 7 lipca 2026 roku …" / "informuję,
 *  że dnia 2 lipca 2026 roku …". Anchored on the "informuję, że" clause so the
 *  announcement-date citation ("z dnia 22 maja 2026 r.") is never picked up.
 *  -> ISO or null. */
export function resultDateFromText(text) {
  const m = /informuj\S*\s*,\s*że\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// ----------------------------------------------------------------- prices

/** Starting price ("cena wywoławcza"), any of its labelled forms ("cena
 *  wywoławcza nieruchomości:", "… netto:", bare "Cena wywoławcza:" in result
 *  notices). Takes the first zł amount within a bounded window after the
 *  label. -> integer PLN or null. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\S*[\s\S]{0,80}?([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices only): "Najwyższa cena osiągnięta w
 *  przetargu: 36.420,00 zł". A value ⇒ sold. -> PLN or null. */
export function achievedPriceFromText(text) {
  const m = /(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu:?\s*([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Explicit unsold signal beyond "no achieved price": "Przetarg zakończony
 *  został wynikiem negatywnym." / "OSOBA USTALONA JAKO NABYWCA
 *  NIERUCHOMOŚCI: brak." */
export function negativeOutcomeStated(text) {
  return /wynikiem\s+negatywnym|OSOBA\s+USTALONA\s+JAKO\s+NABYWCA\s+NIERUCHOMOŚCI\s*:\s*brak/i.test(
    text || '',
  );
}

// ----------------------------------------------------------------- land fields

/** obręb (cadastral precinct): "obręb 0013, Sobieszów II, dla której …" /
 *  "obręb 0004, Cieplice IV, AM-5, księga …". Display-only. */
export function obrebFromText(text) {
  const m = /obr[ęe]b\S*\s*[:]?\s*([\s\S]{1,60}?)(?:,?\s*(?:dla\s+kt[óo]rej|ksi[ęe]g\S*))/i.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim().replace(/,\s*$/, '') : null;
}

/** Parcel number + area (m2). "stanowiąca niezabudowaną działkę gruntu numer
 *  116/4 o powierzchni 0,2095 ha" / "oznaczonej geodezyjnie jako działka
 *  gruntu numer 116/4 o powierzchni 0,2095 ha". Hectares -> m2 (×10 000). */
export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  let dzialka_nr = null;
  const nm = /dzia[łl]k\S*\s+(?:gruntu\s+)?(?:nr|numer)\s+([\d/]+(?:\s*(?:,|i|oraz)\s*[\d/]+)*)/i.exec(s);
  if (nm) {
    const nums = nm[1].split(/\s*(?:,|i|oraz)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
    if (nums.length) dzialka_nr = nums.join(', ');
  }
  let area_m2 = null;
  const am = /o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(s);
  if (am) {
    const ha = Number(am[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr, area_m2 };
}

/** Land street: "przy ul. Gabrieli Zapolskiej stanowiąca …" / "przy ul.
 *  Gabrieli Zapolskiej oznaczonej …". Display-only (land is parcel-keyed). */
export function landStreetFromText(text) {
  const m = /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^\n,]+?)\s+(?:stanowi\S*|oznaczon\S*)/i.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// ----------------------------------------------------------- unit / area

/** Usable overall floor area: "o ogólnej powierzchni wynoszącej 39,60 m2".
 *  Anchored on "ogólnej" so a sub-area ("powierzchni użytkowej …") or the
 *  cellar ("piwnicy … m2") is never picked up. */
export function unitAreaFromText(text) {
  const m = /o\s+og[óo]lnej\s+powierzchni\S*\s+wynosz\S*\s+(\d+[.,]\d+|\d+)\s*m\s*[²2](?!\d)/i.exec(
    text || '',
  );
  return m ? parseNum(m[1]) : null;
}

// "Lokal mieszkalny nr 6" / "Lokal użytkowy nr U1" / "lokal niemieszkalny nr 3".
const UNIT_RE = /Lokal\S*\s+(mieszkaln\S*|u[żz]ytkow\S*|niemieszkaln\S*)\s+nr\s+(\S+?)[\s,.]/i;

/** core/normalize.js's apt regex only accepts digit-led tokens
 *  (`[0-9]+[A-Za-z]?`) — a commercial "U1"-style unit number is rewritten to
 *  "1U" (same information, digit-first) so it parses. */
function normalizeUnitToken(unit) {
  const m = /^[Uu](\d+)$/.exec(unit);
  return m ? `${m[1]}U` : unit;
}

/** Street + building for a SINGLE-lot flat/commercial unit: "… w budynku
 *  [przy] [ul.] <Street> <Bldg> o ogólnej powierzchni …". Strips a trailing
 *  " of" (oficyna/annex marker) — see file header note. */
function singleLotStreetBuilding(text) {
  const m = /w\s+budynku\s+(?:przy\s+)?(?:ul\.?\s*)?([^\n,]+?)\s+o\s+og[óo]lnej/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').replace(/\s+of\b\.?$/i, '').trim();
}

// ------------------------------------------------------------- multi-lot split

/** Splits a batch announcement into its numbered lots: "N) ul. <Street>
 *  <Bldg>" header lines, each owning the text up to the next header (or end of
 *  document). Returns null when the doc isn't a multi-lot batch (fewer than 2
 *  numbered headers found). */
function splitLots(text) {
  const re = /(?:^|\n)[ \t]*(\d+)\)[ \t]*((?:ul\.?|al\.?|pl\.?|plac)\s+[^\n]+?)\s*\n/gi;
  const headers = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    headers.push({ start: m.index, bodyStart: re.lastIndex, addressRaw: m[2].replace(/\s+/g, ' ').trim() });
  }
  if (headers.length < 2) return null;
  const lots = [];
  for (let i = 0; i < headers.length; i++) {
    const end = i + 1 < headers.length ? headers[i + 1].start : text.length;
    lots.push({ addressRaw: headers[i].addressRaw, body: text.slice(headers[i].bodyStart, end) });
  }
  return lots;
}

// --------------------------------------------------------------- record builders

function buildLandRecord(text, auction_date, round) {
  const plot = plotFromText(text);
  const street = landStreetFromText(text);
  const address_raw = street ? `ul. ${street}` : null;
  if (!plot.dzialka_nr && !address_raw) return null;
  return {
    kind: 'grunt',
    dzialka_nr: plot.dzialka_nr,
    obreb: obrebFromText(text),
    area_m2: plot.area_m2,
    address_raw,
    starting_price_pln: startingPriceFromText(text),
    auction_date,
    round,
  };
}

/** One lot from a multi-lot batch: address from the "N) ul. …" header +
 *  unit from "Lokal … nr <unit>" within that lot's own body slice. */
function buildLotRecord(headerAddr, body, auction_date, round) {
  const unitM = UNIT_RE.exec(body);
  if (!unitM) return null;
  const unit = normalizeUnitToken(unitM[2].replace(/[.,]$/, ''));
  const address_raw = `${headerAddr}/${unit}`.replace(/\s+of\b\.?(?=\/)/i, '');
  const address = parseAddress(address_raw);
  if (!address) return null;
  const kind = classifyKind(unitM[0]);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(body),
    starting_price_pln: startingPriceFromText(body),
    auction_date,
    round,
  };
}

/** A single-lot flat/commercial announcement or result: address from "…
 *  w budynku [przy ul.] <Street> <Bldg> o ogólnej powierzchni …" + unit from
 *  "Lokal … nr <unit>". */
function buildSingleUnitRecord(text) {
  const unitM = UNIT_RE.exec(text);
  if (!unitM) return null;
  const streetBldg = singleLotStreetBuilding(text);
  if (!streetBldg) return null;
  const unit = normalizeUnitToken(unitM[2].replace(/[.,]$/, ''));
  const address_raw = `ul. ${streetBldg}/${unit}`;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const kind = classifyKind(unitM[0]);
  return {
    address_raw,
    address,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    area_m2: unitAreaFromText(text),
  };
}

// ------------------------------------------------------------ announcement parse

/**
 * Parse one ANNOUNCEMENT PDF. Single-lot (one flat/commercial unit, or one
 * land parcel) or multi-lot (several simultaneous flat/commercial auctions
 * batched in one PDF — one record per lot). Land is never batched in practice
 * but is handled defensively inside buildLotRecord's caller path too.
 * @param {string} text
 * @returns {object[]}
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromText(t);
  const round = roundFromText(t);

  const lots = splitLots(t);
  if (lots) {
    const out = [];
    for (const lot of lots) {
      const kind = classifyKind(lot.body.slice(0, 800));
      let rec;
      if (kind === 'grunt') {
        const landRec = buildLandRecord(lot.body, auction_date, round);
        rec = landRec ? { ...landRec, address_raw: lot.addressRaw || landRec.address_raw } : null;
      } else {
        rec = buildLotRecord(lot.addressRaw, lot.body, auction_date, round);
      }
      if (rec) out.push(rec);
    }
    return out;
  }

  const kind = classifyKind(t.slice(0, 1600));
  if (kind === 'grunt') {
    const rec = buildLandRecord(t, auction_date, round);
    return rec ? [rec] : [];
  }
  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  return [{
    ...unit,
    starting_price_pln: startingPriceFromText(t),
    auction_date,
    round,
  }];
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice ("Informacja o wyniku przetargu") into a concluded
 * auction record. Always single-property (even lots from a batched
 * announcement get their own separate result article). Joins its announcement
 * by address (+ unit) + round in build-properties. Returns 0 or 1 record.
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negative = negativeOutcomeStated(t);
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  const kind = classifyKind(t.slice(0, 1600));
  if (kind === 'grunt') {
    const plot = plotFromText(t);
    const street = landStreetFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [{
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
    }];
  }

  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  if (unit.address.warning) notes.push(unit.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: unit.kind,
    address_raw: unit.address_raw,
    address: unit.address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unit.area_m2,
    notes,
  }];
}
