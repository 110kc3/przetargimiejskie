// Pszczyna parsers. bip.pszczyna.pl (ESC S.A. / VelaBIP) renders each notice as
// `<article id="cnt" class="document"><header><h2>TITLE</h2></header>
//  <article class="lead">…</article><article class="content">BODY</article>
//  … <h3>Pliki do pobrania</h3><ul class="attach_show_list">…</ul> …`.
// Reuses core/finn-bip.js body helpers (htmlToText, parsePLN, priceFromText,
// auctionDateFromText, roundFromTitle, resolveKind); the extraction below is
// Pszczyna-specific. Groundtruthed against REAL live bodies (verified
// 2026-07-10, see pipeline/tests/parse-pszczyna.test.js for the fixtures):
//   flat announcement (PDF-extracted) — Bednarska 21/4, VIII przetarg,
//     28,97 m2, 47.000 zł, przetarg 2025-07-09
//   flat result SOLD  — Korfantego 27/1, 258.000 -> 273.000 zł,
//     nabywca "BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie"
//   flat result SOLD  — Szymanowskiego 22/5, II, 250.000 -> 252.500 zł,
//     nabywca "Justyna i Szymon JENCZURA"
//   land announcement — Braci Jędrysików dz. 6602/65 (+udział 6603/65),
//     126 850 zł, przetarg 2023-01-25
//   land result SOLD    — dr. Witolda Antesa, dz. 464/12, 280.000 -> 430.000,
//     nabywca "Grzegorz Prokopowicz"
//   land result UNSOLD  — ul. Katowicka, dz. 5959/513 i in., "zakończył się
//     wynikiem negatywnym, z braku chętnych na jej nabycie" (no table, no price)
//
// REAL PARSER BUGS (found + fixed here, none present/fixable in the shared,
// do-not-modify core/finn-bip.js helpers):
//   1. AREA — a multi-unit building's announcement states the WHOLE BUILDING's
//      combined usable area ("w którym mieści się siedem (7) lokali
//      mieszkalnych o łącznej powierzchni użytkowej 401,66 m2" / "10 … lokali
//      … łączna powierzchnia użytkowa 508,02 m2") BEFORE it states THIS flat's
//      own area ("Lokal mieszkalny nr 3 składa się z … 41,06 m2" /
//      "samodzielny lokal mieszkalny nr 21/4 …, o powierzchni użytkowej
//      28,97 m2"). core/finn-bip.js's areaFromText scans left-to-right and
//      would return the building TOTAL, not the flat's own area — wrong by
//      10-20x. Fixed by unitAreaFromText: anchor on "nr <thisFlatId>"
//      appearing shortly before the area figure; fall back to the smallest
//      plausible value.
//   2. PRICE — a malformed-but-real amount format on an older announcement
//      combines BOTH grosze-as-digits AND a redundant trailing dash in one
//      ("23.290,00- zł", not the standard "23.290,-" OR "23.290,00" — each of
//      which core/finn-bip.js's parsePLN parses correctly on its own).
//      parsePLN's two grosze-stripping passes are mutually exclusive (",-+$"
//      OR ",\d{1,2}$", never both), so neither strips the trailing "-" once
//      "00" has already been consumed as decimal digits — parsePLN("23.290,00-")
//      returns 2329000 (100x too high: only the "." thousands-separator gets
//      dropped, "00-" survives as extra trailing digits). Fixed by
//      fixMalformedGrosze: strip a redundant trailing "-" that directly
//      follows 2 grosze digits, BEFORE the text ever reaches priceFromText.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText, parsePLN, priceFromText, auctionDateFromText, roundFromTitle, resolveKind,
} from '../../core/finn-bip.js';

export { htmlToText };

const ORIGIN = 'https://bip.pszczyna.pl';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

// See file header bug #2. Strips a redundant trailing "-" that directly
// follows 2 grosze digits ("23.290,00-" -> "23.290,00"), so parsePLN sees
// only the standard decimal form. Leaves the far more common bare ",-" form
// (no digits before the dash) untouched — parsePLN already handles that one.
function fixMalformedGrosze(text) {
  return (text || '').replace(/(,\d{2})-(?=\s|[,.]|$)/g, '$1');
}

// ---------------------------------------------------------------- title routing

export function isResultTitle(title) {
  return /informacj[\węi]*\s+o\s+wynik|^\s*wynik(?:i)?\s+\w*\s*przetarg/i.test(title || '');
}

export function isLeaseTitle(title) {
  const t = (title || '').toLowerCase();
  return /wydzier[żz]awi|dzier[żz]aw|\bnajem\b|najmu|wynajem|u[żz]yczeni/.test(t);
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(t)) return false;
  if (isLeaseTitle(t)) return false;
  if (/bezprzetarg/.test(t)) return false;
  if (/\bwykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

// ------------------------------------------------------------- detail extraction

const H2_RE = /<h2[^>]*>([\s\S]*?)<\/h2>/i;
const CONTENT_RE = /<article\s+class="content">([\s\S]*?)<\/article>/i;
// Aria-label carries "Pobierz załącznik: <name> w formacie <ext> o rozmiarze …"
// ahead of the href — more robust than the visible link text (which some old
// docs wrap across a line break before the href attribute).
const ATTACH_RE =
  /<a\s+aria-label="Pobierz\s+za[łl][ąa]cznik:\s*([^"]*?)\s+w\s+formacie\s+(\w+)[^"]*"\s+href="([^"]+)"/gi;

/**
 * Locate the `<article id="cnt">` document region and pull title / inline
 * content (raw HTML + flattened text) / attachment refs out of it. Returns
 * null if the page doesn't look like a VelaBIP document at all (defends
 * against the shared multi-tenant list-cache cross-contamination the spike
 * flagged). `contentHtml` is scoped to JUST the `<article class="content">`
 * div (not the whole page/region) so a result doc's achieved-price `<table>`
 * can never be confused with the page footer's unrelated "Historia dokumentu"
 * version-history `<table>` — both would otherwise be in scope.
 * @param {string} html
 * @returns {{title:string, contentHtml:string, contentText:string, attachments:Array<{name:string,format:string,url:string}>}|null}
 */
export function extractDetail(html) {
  const cntIdx = (html || '').indexOf('id="cnt"');
  if (cntIdx < 0) return null;
  const region = html.slice(cntIdx);

  const h2 = H2_RE.exec(region);
  const title = h2 ? htmlToText(h2[1]) : '';

  const contentM = CONTENT_RE.exec(region);
  const contentHtml = contentM ? contentM[1] : '';
  const contentText = contentHtml ? htmlToText(contentHtml) : '';

  const attachments = [];
  const filesIdx = region.indexOf('Pliki do pobrania');
  const attachRegion = filesIdx >= 0 ? region.slice(filesIdx, filesIdx + 8000) : '';
  let am;
  ATTACH_RE.lastIndex = 0;
  while ((am = ATTACH_RE.exec(attachRegion)) !== null) {
    const url = am[3].startsWith('http') ? am[3] : `${ORIGIN}${am[3].startsWith('/') ? '' : '/'}${am[3]}`;
    attachments.push({ name: am[1].trim(), format: am[2].toLowerCase(), url });
  }

  return { title, contentHtml, contentText, attachments };
}

// ------------------------------------------------------------ result table (HTML)

/**
 * Extract the structured SOLD-result table:
 *   [Dopuszczona | Niedopuszczona | Wywoławcza w zł | Osiągnięta w zł | Nabywca]
 * from the raw content HTML (cell text may or may not include "zł" / may use
 * ",-" or ",00" grosze — parsePLN handles both). Returns null when there is no
 * table (negative/unsold notices are prose-only, no table at all).
 * @param {string} contentHtml
 * @returns {{dopuszczona:number, niedopuszczona:number, starting_price_pln:number|null, final_price_pln:number|null, buyer:string|null}|null}
 */
export function resultTableFromHtml(contentHtml) {
  const tableM = /<table[^>]*>([\s\S]*?)<\/table>/i.exec(contentHtml || '');
  if (!tableM) return null;
  const rows = [...tableM[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (!rows.length) return null;
  const dataRow = rows[rows.length - 1][1];
  const cells = [...dataRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlToText(m[1]));
  if (cells.length < 5) return null;
  const [dopuszczona, niedopuszczona, wywolawcza, osiagnieta, nabywca] = cells;
  return {
    dopuszczona: Number(dopuszczona) || 0,
    niedopuszczona: Number(niedopuszczona) || 0,
    starting_price_pln: parsePLN(fixMalformedGrosze(wywolawcza)),
    final_price_pln: parsePLN(fixMalformedGrosze(osiagnieta)),
    buyer: nabywca && nabywca.trim() ? nabywca.trim() : null,
  };
}

/** Prose-only negative-outcome phrasing (no table published at all). */
export function isNegativeOutcome(text) {
  return /wynik\w*\s+negatywn\w*|zako[ńn]czy[łl]\s+si[ęe]\s+negatywnie|brak\s+(?:ofert|oferent|uczestnik|ch[ęe]tnych)|nikt\s+nie\s+przyst[ąa]pi[łl]|nie\s+wp[łl]aci[łl]a?o?\s+wadium/i.test(
    text || '',
  );
}

// RESULT auction date: "…wyznaczony na dzień <date> r. w Urzędzie…" (distinct
// from the ANNOUNCEMENT phrasing "Przetarg odbędzie się w dniu <date>", which
// core auctionDateFromText already anchors on).
export function resultDateFromText(text) {
  const t = text || '';
  const m = /wyznaczon\w*\s+na\s+dzie[ńn]\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return auctionDateFromText(t);
}

// ----------------------------------------------------------------- flat address

/** "lokal(u)? mieszkaln(y|ego) nr <ID>" -> the raw ID string ("3", "27/1", "21/4"). */
export function flatIdFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+(?:\/\d+)?)/i.exec(text || '');
  return m ? m[1] : null;
}

const RYNEK_RE = /^rynku$/i;

/**
 * Build the keyed flat address. The street's own number (possibly a range,
 * "19-35" / "20-22-24") comes from "przy [ul.] <Street> <Nr[-Nr…]>"; the flat's
 * own id comes from flatIdFromText. When the flat id already carries a slash
 * ("27/1"), it IS the building/apt pair (drop the street's range number — see
 * config.js header). When it's bare ("3"), combine it with the street's own
 * number as the apt ("Rynek 22/3"). A "Rynku" (locative, "Rynek" the square)
 * mention is normalised to the nominative "Rynek".
 * @param {string} title
 * @param {string} text  flattened body
 * @returns {{address_raw:string, address:object}|null}
 */
export function flatAddressFromText(title, text) {
  const src = `${title} ${text}`;
  const flatId = flatIdFromText(src);
  if (!flatId) return null;

  const STREET_RE =
    /przy\s+(?:ul\.?\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+(?:\s*[\-–]\s*\d+)*)/g;
  let m;
  let street = null;
  let streetNr = null;
  while ((m = STREET_RE.exec(src)) !== null) {
    const candStreet = m[1].replace(/\s+/g, ' ').trim();
    const candNr = m[2].replace(/\s+/g, '');
    // Skip the office's own address ("Urząd Miejski … Rynek 2") when a
    // different, real candidate is available elsewhere in the text.
    if (RYNEK_RE.test(candStreet) === false || candNr.split(/[\-–]/)[0] !== '2') {
      street = RYNEK_RE.test(candStreet) ? 'Rynek' : candStreet;
      streetNr = candNr;
      break;
    }
  }
  if (!street) return null;

  const raw = flatId.includes('/') ? `${street} ${flatId}` : `${street} ${streetNr.split(/[\-–]/)[0]}/${flatId}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

/**
 * Flat usable area, anchored to THIS flat's own id so a multi-unit building's
 * combined total ("7 lokali … łącznej powierzchni użytkowej 401,66 m2") can't
 * win over the specific flat's own figure (see file header — a real bug).
 * @param {string} text
 * @param {string|null} flatId
 * @returns {number|null}
 */
export function unitAreaFromText(text, flatId) {
  if (!text) return null;
  const AREA_RE = /(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*\s*([\d][\d.,\s]*)\s*m\s*[²2]/gi;
  const idRe = flatId ? new RegExp(`nr\\.?\\s*${flatId.replace(/\//g, '\\/')}\\b`, 'i') : null;
  const candidates = [];
  let m;
  while ((m = AREA_RE.exec(text)) !== null) {
    const v = Number(String(m[1]).replace(/[\s ]/g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) continue;
    const before = text.slice(Math.max(0, m.index - 170), m.index);
    candidates.push({ v, near: idRe ? idRe.test(before) : false });
  }
  if (!candidates.length) return null;
  const nearHit = candidates.find((c) => c.near);
  if (nearHit) return nearHit.v;
  const plausible = candidates.filter((c) => c.v >= 8 && c.v <= 300);
  if (plausible.length) return Math.min(...plausible.map((c) => c.v));
  return candidates[0].v;
}

// ----------------------------------------------------------------- land helpers

// "nr"/"nr:" is usually present ("działką nr 6602/65", "działkami nr: A, B i
// C") but NOT always — a real result notice reads "oznaczonej działką 464/12"
// with no "nr" label at all. Both are covered by making the label optional;
// a plausibility guard (>=2 digits or has a "/") stops the no-label path from
// mis-capturing a stray single digit out of an adjacent decimal area figure
// ("powierzchni działki 0,0918 ha" must never yield parcel "0").
//
// REAL BUG: plain `\w*` right after the "działk" stem does NOT match the
// instrumental-case ending "ą" (JS `\w` is ASCII-only) — "oznaczona jest
// działką nr …" (a very common legal phrasing) silently failed to match at
// all, because `\w*` matched zero chars, leaving the following `\s*` facing
// "ą" instead of whitespace. Fixed with an explicit Polish-letter class.
const DZIALKA_STEM = 'dzia[łl]k[\\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*\\s*(?:(?:ewidencyjn\\w*\\s*)?nr\\.?:?\\s*)?';
function plausibleParcel(v) {
  return /\//.test(v) || v.length >= 2;
}

/** All distinct "działka [nr] N[/M]" numbers, including a trailing comma/i/oraz
 *  list right after one label (Katowicka: "działkami nr: A, B i C"). The list
 *  continuation is only ever attempted immediately after an already-PLAUSIBLE
 *  hit (anchored at that match's own end) — never independently re-derived —
 *  so a decimal fraction elsewhere ("powierzchni działki 0,0918 ha") can't be
 *  misread as a comma-separated list continuation ("0" + ",0918" -> "0918"). */
export function parcelFromText(text) {
  const full = text || '';
  // Servitude/easement clauses ("służebność …") name OTHER parcels (the
  // burdened access strip, or a neighbour's benefiting parcel) that are never
  // the sale subject — scope the scan to before the first such clause so they
  // can't pollute dzialka_nr. REAL live example (crawl.js smoke test,
  // 2026-07-10): Braci Jędrysików's servitude clauses reference parcels
  // 4381/62 and 6596/65, belonging to neighbouring landowners, well after the
  // real subject parcels (6602/65, 6603/65) are already declared in point 1 —
  // an unscoped scan picked up all four.
  const cut = full.search(/słu[żz]ebno[śs]/i);
  const t = cut >= 0 ? full.slice(0, cut) : full;
  const seen = new Set();
  const nums = [];
  const RE = new RegExp(`${DZIALKA_STEM}(\\d+(?:\\/\\d+)?)`, 'gi');
  const CONT_RE = /^(?:\s*(?:,|i|oraz)\s*\d+(?:\/\d+)?)+/;
  let m;
  while ((m = RE.exec(t)) !== null) {
    if (!plausibleParcel(m[1])) continue;
    if (!seen.has(m[1])) { seen.add(m[1]); nums.push(m[1]); }
    const contM = CONT_RE.exec(t.slice(RE.lastIndex));
    if (!contM) continue;
    for (const tok of contM[0].split(/\s*(?:,|i|oraz)\s*/)) {
      const v = tok.trim();
      if (v && plausibleParcel(v) && !seen.has(v)) { seen.add(v); nums.push(v); }
    }
  }
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/.exec(text || '');
  return m ? m[1].trim() : null;
}

/** A standalone "Łączna powierzchnia [nieruchomości] wynosi X ha" sentence — no
 *  leading "o", "wynosi" between the noun and the figure — used when a
 *  multi-parcel land notice lists each parcel's own area first (real live
 *  example: Katowicka II re-announcement, 4 parcels @ 0,0732/0,0380/0,0860/
 *  0,0385 ha each, THEN "Łączna powierzchnia nieruchomości wynosi 0,2357 ha.").
 *  Preferred over the generic ha match below so the combined total wins over
 *  a single parcel's own figure. */
function totalHaFromText(text) {
  const m = /[łl][ąa]czn\w*\s+powierzchni\w*(?:\s+nieruchomo[śs]ci|\s+dzia[łl]ek)?\s+wynosi\s*:?\s*(\d+[.,]\d+|\d+)\s*ha\b/i.exec(
    text || '',
  );
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return v > 0 ? Math.round(v * 10000) : null;
}

/** Plot area in m2: prefers an explicit "Łączna powierzchnia … wynosi" total,
 *  then the ha-primary "o [łącznej] powierzchni … ha" form, then a bare m2 form. */
export function plotAreaFromText(text) {
  const t = text || '';
  const total = totalHaFromText(t);
  if (total != null) return total;
  const ha = /o\s+(?:[łl][ąa]czn\w+\s+)?(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+(?:[łl][ąa]czn\w+\s+)?(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(t);
  if (m2) { const v = Number(m2[1].replace(/[\s ]/g, '')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

const OFFICE_STREET_RE = /^rynek$/i; // "ul. Rynek 2" — Urząd Miejski

/** Land's own street/place name from "przy ul. X" / "przy X" (no trailing
 *  number expected — undeveloped land is referenced by street/area, not a
 *  building number). Also matches bare village names ("położonej w Czarkowie"
 *  handled by the caller via a village fallback, not here). */
export function landStreetFromText(text) {
  const re =
    /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=\s*[,;.]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+obr[ęe]b|\s+oznaczon|\s+ksi|\n|$)/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (s && !OFFICE_STREET_RE.test(s)) return s;
  }
  return null;
}

/** Village/place fallback for land NOT on a street ("położonej w Czarkowie"). */
export function landPlaceFromText(text) {
  const m = /po[łl]o[żz]on\w+\s+w\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-ząćęłńóśźż]+)(?=[\s,.]|$)/.exec(text || '');
  return m ? m[1].trim() : null;
}

// --------------------------------------------------------------------- parsers

// classifyKind (shared, do-not-modify — core/classify-kind.js) checks GARAGE
// before LAND, so a buried "garaż" mention inside MPZP zoning boilerplate
// ("garaż wbudowany w budynek usługowy lub gospodarczy" — a PERMITTED future
// use, not what's being sold) can hijack an undeveloped-LAND announcement into
// 'garaz', losing the whole record (buildLandRecord never runs). REAL live
// example (found via the crawl.js smoke test, 2026-07-10): the Katowicka II
// re-announcement lists permitted zoning uses including that exact garaż
// phrase ~2600 chars into the body; classifyKind(title+text) returns 'garaz'.
// Guarded here: the OPERATIVE "na sprzedaż <subject>" clause always states the
// true kind nearby — when it says "niezabudowanej"/"nieruchomości gruntowej",
// that wins over classifyKind's keyword-anywhere-in-the-document fallback.
const LAND_SUBJECT_RE = /na\s+sprzeda[żz][\s\S]{0,80}?(?:niezabudowan|nieruchomo[śs]ci\s+gruntow)/i;

function resolveKindPszczyna(title, text) {
  const fromTitle = classifyKind(title);
  if (fromTitle !== 'unknown') return fromTitle;
  if (LAND_SUBJECT_RE.test(`${title} ${text}`)) return 'grunt';
  return resolveKind(title, text);
}

function buildLandRecord({ text, url, starting_price_pln, auction_date, round }) {
  const dzialka_nr = parcelFromText(text);
  const street = landStreetFromText(text);
  const place = street ? null : landPlaceFromText(text);
  if (!dzialka_nr && !street && !place) return null;
  const address_raw = street ? `ul. ${street}` : place || null;
  return {
    kind: 'grunt',
    dzialka_nr,
    obreb: obrebFromText(text),
    area_m2: plotAreaFromText(text),
    address_raw,
    address: address_raw ? parseAddress(address_raw) : null,
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
    source_url: url,
  };
}

/**
 * Parse one ANNOUNCEMENT (offer-side) body — inline HTML text already
 * flattened, or PDF/DOC-extracted plain text (both pass through htmlToText
 * harmlessly; plain text has no tags to strip).
 * @param {string} title
 * @param {string} bodyText  already-flattened text (see extractDetail / pdfText)
 * @param {string} url
 * @returns {object|null}
 */
export function parseAnnouncement(title, bodyText, url) {
  const text = fixMalformedGrosze(htmlToText(bodyText));
  if (isLeaseTitle(title) || isLeaseTitle(text.slice(0, 400))) return null;
  const kind = resolveKindPszczyna(title, text);
  const round = roundFromTitle(title);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    return buildLandRecord({ text, url, starting_price_pln, auction_date, round });
  }

  const addr = flatAddressFromText(title, text);
  if (!addr) return null;
  const flatId = flatIdFromText(`${title} ${text}`);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: unitAreaFromText(text, flatId),
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
  };
}

/**
 * Parse one RESULT notice. `text` is the inline content text (or, if a result
 * ever ships with an empty inline body, PDF/DOC-extracted text — same shape).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = fixMalformedGrosze(htmlToText(text));
  if (!/informacj[\węi]*\s+o\s+wynik|wynik\w*\s+przetarg|cena\s+osi[ąa]gni[ęe]ta|wynik\w*\s+negatywn/i.test(t)) return [];
  if (isLeaseTitle(t.slice(0, 400))) return [];

  const table = resultTableFromHtml(text);
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromTitle(t);
  const negativeStated = isNegativeOutcome(t);
  const sold = Boolean(table && table.final_price_pln != null);
  const starting_price_pln = table ? table.starting_price_pln : priceFromText(t);
  const kind = resolveKindPszczyna('', t);
  const notes = [];

  if (kind === 'grunt') {
    const rec = buildLandRecord({ text: t, url: sourceUrl, starting_price_pln, auction_date, round });
    if (!rec) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      ...rec,
      source_pdf: sourceUrl,
      final_price_pln: sold ? table.final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : negativeStated ? 'wynik negatywny' : 'unknown',
      buyer: table ? table.buyer : null,
      notes,
    }];
  }

  const addr = flatAddressFromText('', t);
  if (!addr) return [];
  const flatId = flatIdFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: unitAreaFromText(t, flatId),
    starting_price_pln,
    final_price_pln: sold ? table.final_price_pln : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : negativeStated ? 'wynik negatywny' : 'unknown',
    buyer: table ? table.buyer : null,
    auction_date,
    round,
    source_pdf: sourceUrl,
    notes,
  }];
}
