// Wołów parsers — SkyCMS (netkoncept.com) city portal `wolow.pl`.
//
// Roles:
//   1. extractArticleText / extractTitle / extractPublishedDate
//        — pull the article body / heading / "Data publikacji" out of one
//          wolow.pl page. Container classes (confirmed live, 2026-07-11):
//          <h1 class="pageHeader">TITLE</h1> ... <div class="sub-page__content
//          mt-4">BODY</div> ... <footer class="sub-page__footer"> ...
//          <span class="pageDatetimeCreate">Data publikacji:&nbsp;DD-MM-YYYY
//          HH:MM</span>. NOTE: this is NOT Olesno's `bip-page__content` — a
//          different skyCMS template (city-portal, not BIP) is in play here.
//
//   2. extractSubject   — the hard part. Every announcement/wykaz opens with
//      "...na sprzedaż [lokalu mieszkalnego|nieruchomości] położon(ej|ego) w
//      <LOCATIVE town>[.,]? <NOMINATIVE town restated>[, ul. <Street> <Bldg>]
//      [Lokal mieszkalny nr <N>] | [Działka [niezabudowana] nr <parcel> Am
//      <sheet>]". Confirmed live on 6+ real fixtures (Wołów/Lubiąż in-town
//      streets, Pełczyn/Prawików bare village+number rural addresses, both
//      undeveloped ("niezabudowana") and built ("zabudowana") parcels). Two
//      distinct output shapes:
//        - address-keyed (mieszkalny/zabudowana/uzytkowy/garaz): {address_raw,
//          address} via core/normalize.js parseAddress — apartment number is
//          extracted SEPARATELY from "Lokal (mieszkalny )?nr N" and appended
//          (the source states street+building and flat number as separate
//          facts, same convention as the Olesno analog), because the source
//          inconsistently spells the same flat's bldg/apt separator as BOTH
//          "17/3" (slash, canonical — confirmed on the wykaz page) and
//          "17-3" (hyphen, confirmed on the round-I announcement page for the
//          IDENTICAL flat) — the street regex deliberately captures the bare
//          building number only and discards a trailing "-N"/"/N", so the
//          apartment always comes from the separate, unambiguous "Lokal...nr"
//          match instead of trying to disambiguate a hyphen.
//        - parcel-keyed (grunt): {dzialka_nr, obreb, address_raw} — obręb is
//          the nominative-restated town/village name (best-effort text
//          extraction, NOT grammatically de-inflected; may be null on a
//          layout this build didn't see, in which case core/build-land.js
//          still keys correctly on dzialka_nr alone).
//
//   3. parseAnnouncement — one "[I-V] ustny przetarg[u] nieograniczony(m) na
//      sprzedaż..." detail page → current-cycle fields (used by crawlActive).
//
//   4. parseWykaz        — one "wykaz nieruchomości przeznaczonych do
//      sprzedaży/zbycia" pre-announcement page → clean address, no date
//      (ADAPTER-GUIDE §5.5: wykaz = pre-auction designation, never a
//      scheduled auction).
//
//   5. parseResultDoc    — the achieved-price stream. IMPORTANT RESIDUAL: this
//      build could NOT find a "informacja o wyniku przetargu" / "protokół"
//      content type anywhere on wolow.pl (exhaustive sitemap keyword sweep:
//      wynik, protokół, rozstrzygnięcie, zakończony, pozytywny, negatywny,
//      wygrał, sprzedano, zbyto, ustalono, zarządzenie+przetarg — all empty;
//      cross-checked live). A widely-quotable "Prawików, wylicytowano
//      84 200 zł" figure traces to `bip.powiatwolowski.pl` — the COUNTY
//      (Starostwo Powiatowe) board, a different JST, correctly out of scope
//      per this city's own spike note. `bip.wolow.pl` (the gmina's BIP
//      mirror) is a client-rendered React SPA (empty /sitemap.xml,
//      /robots.txt both serve the JS app shell) — out of reach without
//      core/render.js, which ADAPTER-GUIDE says to avoid when a
//      server-rendered source already covers the data (it does, here).
//      So: crawlResultDocs (see crawl.js) forwards only CONFIRMED-superseded
//      rounds — i.e. round K's own announcement, when round K+1 for the same
//      subject was also found live — and parseResultDoc parses round K's own
//      real fields (address/area/price/date) but can never learn the hammer
//      price (not published), so every record here is `outcome: 'unsold'`
//      with `final_price_pln: null`. This is a documented, deliberate
//      residual (ADAPTER-GUIDE §7 test-tier), not a bug.
//
// Fixture groundtruth (real fetches, 2026-07-11, from this Pi's Polish IP):
//   Pełczyn 26, lokal mieszkalny nr 2, 61,25 m²:
//     round I  announce  wolow.pl/3475  cena wywoławcza 140 000 zł,
//                         auction 13.01.2026, published 27-11-2025
//     round II announce  wolow.pl/3866  cena wywoławcza 130 000 zł,
//                         auction 15.06.2026, published 27-04-2026 — body
//                         self-reports "I przetarg przeprowadzono 13.01.2026"
//                         (round I therefore CONFIRMED unsold)
//   Wołów, ul. Komuny Paryskiej 41/1, lokal mieszkalny nr 1, 39,47 m²:
//     round I  announce  wolow.pl/3909  cena wywoławcza 88 500 zł,
//                         auction 30.06.2026, published 15-05-2026
//   Wołów, ul. Polna, dz. nr 8/12, Am 25 (grunt, niezabudowana, 0,1565 ha):
//     round I  announce  wolow.pl/801   cena wywoławcza (from body,
//                         see test), no "Am"-confirmed obręb issue.
//   Prawików, dz. nr 156/4 Am 1 (grunt, niezabudowana, 0,1296 ha):
//     round II  announce wolow.pl/1100  cena wywoławcza 29 500 zł,
//                         auction 16.12.2021, published — body states
//                         "I przetarg ... przeprowadzono 07.09.2021r."
//     round III announce wolow.pl/1281  cena wywoławcza 28 000 zł,
//                         auction 01.03.2022 — body states both "I ...
//                         07.09.2021r." and "a drugi 16.12.2021r." (round II
//                         is therefore ALSO confirmed unsold from round III's
//                         own existence, independent of the self-report text).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Polish-diacritic-safe lowercase-and-fold, so keyword regexes can use plain
// ASCII \w / literal alternatives instead of tripping over JS's ASCII-only
// \w on ą/ć/ę/ł/ń/ó/ś/ź/ż declensions (KNOWN BUG CLASS — see olesno/przemysl).
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// Polish price string -> integer PLN. Handles "48.000,00 złotych", "50 000
// złotych" (space-thousands), "53.197.50" (a mistyped extra dot instead of a
// comma — the {1,3} leading group + repeating 3-digit groups only capture
// "53.197", leaving a well-formed optional ".50" grosze tail unconsumed by
// the capture, so it resolves to 53197 PLN, NOT 5319750), and "23.290,00-"
// (trailing dash typo — falls to the strip-and-truncate fallback: strip dots,
// cut at the comma -> "23290"). Ported verbatim from the olesno/przemysl
// analog family and re-verified against both documented source typos above.
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "0,1296" / "0.1296" -> 0.1296
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, styczen: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3, kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9, pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11, grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "07.09.2021" / "07.09.2021r." -> "2021-09-07". Guards the source's own
// blank-template typo ("……..01.2026r." — day literally unfilled dots, seen
// live on wolow.pl/3537 and /3538): a non-numeric day/month never matches
// \d{1,2}, so this correctly returns null instead of fabricating a date.
function dateFromNumeric(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return iso(m[3], mon, day);
}

// ---------------------------------------------------------------------------
// 1. Article HTML structure (skyCMS city-portal template)
// ---------------------------------------------------------------------------

/** @param {string} html @returns {string} */
export function extractArticleText(html) {
  if (!html) return '';
  const m = /<div class="sub-page__content[^"]*">([\s\S]*?)<footer class="sub-page__footer/i.exec(html);
  if (m) return stripTags(m[1]);
  // Fallback for a layout variant this build didn't see live.
  const articleM = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainM = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  const raw = articleM ? articleM[1] : mainM ? mainM[1] : html;
  return stripTags(raw);
}

/** @param {string} html @returns {string|null} */
export function extractTitle(html) {
  if (!html) return null;
  const m = /<h1 class="pageHeader">([\s\S]*?)<\/h1>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

/** "Data publikacji: DD-MM-YYYY HH:MM" -> ISO date. @returns {string|null} */
export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /pageDatetimeCreate">.*?&nbsp;(\d{1,2})-(\d{1,2})-(\d{4})/i.exec(html);
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

// ---------------------------------------------------------------------------
// 2. Round / cancellation classification
// ---------------------------------------------------------------------------

// "I/II/III/IV/V ustny(m) przetarg(u)" — declension-tolerant (matches both
// "ustny przetarg" [announcement subject] and "ustnym przetargu" [object
// case, used in "ogłoszenie o I ustnym przetargu..." phrasing]).
export function roundFromTitle(text) {
  const t = toAscii(text || '');
  const m = /\b(i|ii|iii|iv|v)\s+ustn\w*\s+przetarg\w*/.exec(t);
  if (!m) return null;
  const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
  return ROMAN[m[1]] ?? null;
}

// Cancelled / invalidated notice — never a live listing, never a confirmed
// result (crawl.js already filters these out at discovery via the URL slug;
// this is a defensive second check against the fetched TITLE only). Deliberately
// title-scoped and anchored: every announcement's BOILERPLATE body carries the
// standing clause "Zastrzega się prawo odwołania przetargu" (the mayor
// RESERVES THE RIGHT to cancel — not a notice that it WAS cancelled), which a
// loose "odwołania...przetargu" body-wide scan false-positives on for every
// single announcement (confirmed live) — so only the title, which for an
// actual cancellation notice starts with "Ogłoszenie o odwołan.../unieważnien...",
// is checked.
export function isCancelled(title) {
  const t = toAscii(title || '').trim();
  return /^ogloszenie\s+o\s+odwolan|^odwolanie\s+przetarg|^uniewazni/.test(t);
}

// ---------------------------------------------------------------------------
// 3. Subject extraction (address-keyed vs parcel-keyed)
// ---------------------------------------------------------------------------

const AFTER_POLOZ_RE = /po[łl]o[żz]on\w*\s+w\s+/i;

/** The ~300-char window right after "położon... w " where the source states
 *  the (locative) town, then restates it (nominative) plus street/number or
 *  village+number, before the parcel/lokal details begin. @returns {string} */
function locationWindow(body) {
  const m = AFTER_POLOZ_RE.exec(body || '');
  if (!m) return '';
  return body.slice(m.index + m[0].length, m.index + m[0].length + 300);
}

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

// "ul. Street Name 40" / "ul. Willmanna 17" — captures street name + BARE
// building number only; a trailing "-3" or "/3" (apartment, spelled either
// way on this source for the identical flat) is deliberately NOT captured
// here (see file header) — extractLokalNr() below gets the apartment. The
// street-name group is length-capped ({0,40}? not the unbounded *?): a real
// live fixture (wolow.pl/3950, "ul. Ogrodowa Działka oznaczona w Księdze
// Wieczystej oraz w ewidencji gruntów i budynków jako działka nr 627/5...")
// has NO building number directly after the street — an unbounded lazy
// quantifier walks the WHOLE descriptive clause looking for the first digit
// it can find (the parcel number, 40+ chars away) and mis-captures it all as
// the "street name". 40 chars comfortably covers the longest real street
// name seen live ("Księcia Bolesława Wysokiego", 27 chars) while refusing to
// cross a whole sentence; past that, extraction correctly fails to null
// (extractSubject still keeps dzialka_nr from the separate parcel regex) —
// a silently-dropped address is far safer than a corrupted one (see
// core/build-properties.js's own "an occasional unparseable address is
// fine" tolerance).
const STREET_RE = new RegExp(
  `\\bul\\.?\\s+([${PL_UP}][${PL_UP}${PL_LOW}.\\s]{0,40}?)\\s+(\\d+[A-Za-z]?)(?:[-\\/]\\d+[A-Za-z]?)?\\b`,
);

// Bare "Village 26" / "Village nr 26" (no "ul." — most villages in this
// gmina have no named streets, just sequential house numbers). Single
// capitalized word only: applied to the RAW window (locative mention still
// present) when nominativeWindow() below could not confidently skip past
// it — the source's own locative-then-nominative restatement pattern with
// NO separating punctuation ("Pełczynie Pełczyn 26...", round-I flat
// announcements only) would otherwise greedily swallow BOTH town mentions
// into one bogus two-word "street" — see file header.
const RURAL_RE = new RegExp(`\\b([${PL_UP}][${PL_LOW}]+)\\s+(?:nr\\.?\\s+)?(\\d+[A-Za-z]?)\\b`);

// Two-word-capable variant — safe ONLY once nominativeWindow() has already
// excised the locative sentence, so there is no earlier town mention left to
// accidentally fuse in. Needed for real two-word village names (confirmed
// live: "Moczydlnica Dworska", wolow.pl/2546 — a round-I "udział" share sale
// whose LOCATIVE form even carries its own trailing house number,
// "Moczydlnicy Dworskiej 22.", so a single-word match landing on the
// locative's second word "Dworskiej 22" is not just incomplete but WRONG).
const RURAL_RE_MULTI = new RegExp(
  `\\b([${PL_UP}][${PL_LOW}]+(?:\\s+(?!Dzia[łl]\\w*\\b|Nieruchomo\\w*\\b|Lokal\\w*\\b|Am\\b)[${PL_UP}][${PL_LOW}]+)?)\\s+(?:nr\\.?\\s+)?(\\d+[A-Za-z]?)\\b`,
);

// "Lokal (mieszkalny |użytkowy )?nr N" — the apartment/unit number, stated
// separately from the street+building (never inline as "street bldg/apt").
const LOKAL_NR_RE = /\bLokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+)?\s*nr\.?\s*(\d+[A-Za-z]?)/i;

/** @param {string} body @returns {string|null} */
function extractLokalNr(body) {
  const m = LOKAL_NR_RE.exec(body || '');
  return m ? m[1] : null;
}

// The locative mention closes with "." within this many chars on most
// "nieruchomości"-template fixtures seen live ("Wołowie." = 8, "Prawikowie."
// = 11, "Moczydlnicy Dworskiej 22." = 25) but the "lokalu mieszkalnego"
// round-I flat template's first period (if any) lands much further out
// (~49 chars into "Pełczynie Pełczyn 26 Lokal mieszkalny nr 2 o pow.") — so
// this threshold reliably tells the two templates apart when there is no
// self-report sentence to anchor on instead (see SELF_REPORT_RE).
const LOCATIVE_MAX_CHARS = 30;

// A round-II+ self-report sentence: "[roman] przetarg [na sprzedaż
// nieruchomości] (przeprowadzono|został przeprowadzony) DATE[, a <drugi/
// trzeci/...> DATE]*". BOTH the impersonal ("przeprowadzono", confirmed on
// Pełczyn/Prawików) and passive ("został przeprowadzony", confirmed on
// wolow.pl/3876, a "przetarg ograniczony" restricted-tender variant) verb
// forms are matched. Deliberately searched (not `^`-anchored): this sentence
// sometimes follows the locative mention's OWN closing period ("Prawikowie.
// I przetarg …") and sometimes runs on with no punctuation at all
// ("Wołowie I przetarg został przeprowadzony …", confirmed live) — searching
// lets ONE pattern skip past the locative word AND the self-report sentence
// together regardless of which punctuation style separates them.
const SELF_REPORT_RE =
  /[IVX]+\s+przetarg\w*(?:\s+na\s+sprzeda[żz]\s+nieruchomo[śs]ci)?\s+(?:przeprowadzono|zosta[łl]\s+przeprowadzony)\s+\d{1,2}\.\d{1,2}\.\d{4}\s*r\.?(?:,?\s*a\s+\w+\s+\d{1,2}\.\d{1,2}\.\d{4}\s*r\.?)*\.?\s*/i;

/**
 * Skip the locative mention's own sentence, landing on the nominative
 * restatement onward. Shared by extractObreb and extractStreetAddress so
 * both agree on where the REAL (nominative) address text starts.
 * @param {string} body @returns {{rest:string, skipped:boolean}}
 */
function nominativeWindow(body) {
  const window = locationWindow(body);
  const srM = SELF_REPORT_RE.exec(window);
  if (srM && srM.index <= LOCATIVE_MAX_CHARS) {
    return { rest: window.slice(srM.index + srM[0].length), skipped: true };
  }
  const dot = window.search(/\./);
  const skipped = dot >= 0 && dot <= LOCATIVE_MAX_CHARS;
  const rest = skipped ? window.slice(dot + 1).replace(/^\s+/, '') : window;
  return { rest, skipped };
}

/** @param {string} body @returns {{street:string, building:string}|null} */
function extractStreetAddress(body) {
  const window = locationWindow(body);
  const s = STREET_RE.exec(window) || STREET_RE.exec(body);
  if (s) return { street: s[1].trim().replace(/\s+/g, ' '), building: s[2] };
  const { rest, skipped } = nominativeWindow(body);
  const r = skipped ? RURAL_RE_MULTI.exec(rest) : RURAL_RE.exec(rest);
  if (r) return { street: r[1].trim().replace(/\s+/g, ' '), building: r[2] };
  return null;
}

// "działka(ę/i/ce) [niezabudowana] (numer|nr) 156/4[, 156/5 i 156/6]" /
// "na działce numer 170 Am 21" — parcel number(s), comma/"i"/"oraz"-joined.
const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:niezabudowan\w*\s+)?(?:o\s+)?(?:numer|nr\.?)\s*(\d+(?:\/\d+)?(?:\s*(?:i|,|oraz)\s*\d+(?:\/\d+)?)*)/i;

/** @param {string} body @returns {string|null} */
function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// "Am 25" / "AM-34" / "Am. 1" — the mapa (cadastral sheet) number. Kept as
// part of the parcel identity where present (disambiguates a reused plot
// number across sheets); optional, never blocks extraction when absent.
const AM_RE = /\bAm\.?[\s-]*(\d+)\b/i;

/** @param {string} body @returns {string|null} */
function extractAmSheet(body) {
  const m = AM_RE.exec(body || '');
  return m ? m[1] : null;
}

// The nominative-restated town/village name. The source states the town
// TWICE: once locative ("położonej w Wołowie") then immediately restated
// nominative ("Wołów, ul. Polna" / "Prawików Działka...") — EXCEPT a round
// II+ announcement inserts a whole extra self-report sentence in between
// ("położonej w Prawikowie. I przetarg na sprzedaż nieruchomości
// przeprowadzono 07.09.2021r. Prawików Działka..." — confirmed live on
// wolow.pl/1100), which nominativeWindow() also strips. Grunt-kind text
// always uses the period-separated "nieruchomości" template (confirmed on
// every grunt fixture live), so nominativeWindow() always skips here. Takes
// the town word(s) up to the first of "ul./Działka/Nieruchomość zabudowan(a)".
// Best-effort (obręb is a nice-to-have disambiguator, not load-bearing —
// core/build-land.js keys primarily on dzialka_nr).
function extractObreb(body) {
  const { rest } = nominativeWindow(body);
  const stopM = /Dzia[łl]\w*|Nieruchomo[śs][ćc]\s+zabudowan\w*|\bul\.?\s/i.exec(rest);
  const span = (stopM ? rest.slice(0, stopM.index) : rest).trim();
  const m = new RegExp(
    `^[${PL_UP}][${PL_LOW}]+(?:\\s+(?!Dzia[łl]\\w*\\b|Nieruchomo\\w*\\b)[${PL_UP}][${PL_LOW}]+)?`,
  ).exec(span);
  return m ? m[0].trim() : null;
}

/**
 * @param {string} body
 * @param {string} kind
 * @returns {{address_raw:string|null, address:object|null, dzialka_nr:string|null, obreb:string|null}}
 */
function extractSubject(body, kind) {
  const dzialka_nr = extractDzialkaNr(body);
  if (kind === 'grunt') {
    const obreb = extractObreb(body);
    const am = extractAmSheet(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null, am ? `Am ${am}` : null].filter(Boolean);
    return { address_raw: parts.length ? parts.join(', ') : null, address: null, dzialka_nr, obreb };
  }
  const found = extractStreetAddress(body);
  if (!found) return { address_raw: null, address: null, dzialka_nr, obreb: null };
  const apt = extractLokalNr(body);
  const raw = apt ? `${found.street} ${found.building}/${apt}` : `${found.street} ${found.building}`;
  const address = parseAddress(raw);
  return { address_raw: raw, address, dzialka_nr, obreb: null };
}

// ---------------------------------------------------------------------------
// 4. Area / price / date extraction
// ---------------------------------------------------------------------------

/**
 * Area, kind-aware: flats/houses/commercial state a m² figure ("o pow.
 * użytkowej 61,25 m2" / "o powierzchni 712 m²" — nb some announcements use a
 * "." decimal separator, e.g. "0.0794 ha", instead of the usual ","); land
 * usually states hectares ("o pow. 0,1296 ha", converted x10000) but a built
 * parcel sold as a whole property can also state m² directly.
 * @param {string} body @param {string} kind @returns {number|null}
 */
function extractAreaM2(body, kind) {
  if (kind === 'grunt') {
    const ha = /o\s+pow(?:ierzchni)?\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(body);
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
    const m2 = /o\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
    return m2 ? parseArea(m2[1]) : null;
  }
  // Flat/house/commercial: prefer the labelled "powierzchni(a)"/"pow." +
  // "użytkow(a/ej)" figure — the source spells this BOTH as the full word
  // ("powierzchni użytkowej", olesno-style) AND abbreviated ("o pow.
  // użytkowej", confirmed live on wolow.pl/3909's flat) — the stem + optional
  // period covers both; fall back to the first bare "o pow. X m2" (covers
  // "Lokal mieszkalny nr N o pow. 61,25 m2" phrasing, which skips the
  // "użytkowej" qualifier entirely).
  const labelled = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*[^\d]{0,20}([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (labelled) return parseArea(labelled[1]);
  const bare = /\bo\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  return bare ? parseArea(bare[1]) : null;
}

/** "Cena wywoławcza – 140.000,00 zł" (announcements). @returns {number|null} */
function extractStartingPrice(body) {
  const t = toAscii(body);
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 200);
  const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/** "Cena nieruchomości – 88.500,00 zł" (wykaz notices). @returns {number|null} */
function extractWykazPrice(body) {
  const t = toAscii(body);
  const idx = t.search(/cena\s+nieruchomosci/);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 150);
  const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/**
 * "Przetarg ... odbędzie się DD.MM.YYYYr." Returns null (not a fabricated
 * guess) when the source itself left the day blank — a real, live template
 * typo confirmed on wolow.pl/3537 + /3538 ("odbędzie się ……..01.2026r.").
 * @param {string} body @returns {string|null}
 */
function extractAuctionDate(body) {
  const idx = body.search(/odb[ęe]dzie\s+si[ęe]/i);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 60);
  return dateFromNumeric(region);
}

// ---------------------------------------------------------------------------
// 5. Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one "[I-V] ustny przetarg[u] ... na sprzedaż ..." announcement page.
 * @param {string} html @param {string} url (kept for signature parity; the
 *   caller attaches provenance via detail_url) @returns {object}
 */
export function parseAnnouncement(html, url) {
  const body = extractArticleText(html);
  const title = extractTitle(html) || '';
  const kind = classifyKind(body || title);
  const round = roundFromTitle(title) ?? roundFromTitle(body);
  const cancelled = isCancelled(title);
  const subject = extractSubject(body, kind);
  return {
    kind,
    round,
    cancelled,
    area_m2: extractAreaM2(body, kind),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    ...subject,
  };
}

/**
 * Parse one "wykaz nieruchomości przeznaczonych do sprzedaży/zbycia"
 * pre-announcement page. No auction date (ADAPTER-GUIDE §5.5).
 * @param {string} html @param {string} url @returns {object}
 */
export function parseWykaz(html, url) {
  const body = extractArticleText(html);
  const kind = classifyKind(body);
  const subject = extractSubject(body, kind);
  return {
    kind,
    published_date: extractPublishedDate(html),
    starting_price_pln: extractWykazPrice(body),
    area_m2: extractAreaM2(body, kind),
    wykaz_no: null,
    ...subject,
  };
}

/**
 * Parse one CONFIRMED-superseded round's own announcement text into the
 * achieved-price-stream shape. `text` is that round's OWN body/html (crawl.js
 * only calls this on a round it has proven superseded — see crawl.js header);
 * `sourceUrl` is that round's own URL. There is no sold/hammer-price
 * document reachable from this source (see file header) — every record here
 * is `outcome: 'unsold'`, `final_price_pln: null`.
 * @param {string} text @param {string|null} fallbackDate @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const body = /<[a-z][\s\S]*>/i.test(text) ? extractArticleText(text) : text;
  if (!body || !body.trim()) return [];
  const title = extractTitle(text) || '';
  const kind = classifyKind(body || title);
  if (isCancelled(title)) return [];
  const subject = extractSubject(body, kind);
  if (!subject.address && !subject.dzialka_nr) return [];

  const auction_date = extractAuctionDate(body) || fallbackDate || null;
  const round = roundFromTitle(title) ?? roundFromTitle(body);
  const starting_price_pln = extractStartingPrice(body);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  notes.push('parse: no achieved-price document exists on this source (see parse.js header) — outcome inferred from the next round being published, not a source-stated result');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    dzialka_nr: subject.dzialka_nr,
    obreb: subject.obreb,
    round,
    starting_price_pln,
    final_price_pln: null,
    outcome: 'unsold',
    unsold_reason: 'superseded_by_next_round',
    area_m2: extractAreaM2(body, kind),
    notes,
  }];
}
