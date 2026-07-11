// Środa Wielkopolska parsers.
//
// Source: bip.umsroda.pl — IDcom.pl hosted BIP, server-rendered HTML, same CMS
// family as gniezno/tczew/gizycko. TWO document boards under the same
// department (Wydział Geodezji i Gospodarki Przestrzennej, struktura node
// 2905), both sharing IDENTICAL list markup
// (<p class="title"><a href=".../wiadomosc/ID/slug">TITLE</a></p>):
//   - dokumenty 14926  "Ogłoszenia o przetargach"  (announcements — crawlActive)
//   - dokumenty 14925  "Wyniki przetargów"          (results — crawlResultDocs)
// A third board (dokumenty 14660 "Wykazy nieruchomości…", or the wiadomosci
// dzial/5354 "Wykazy" menu entry) is pre-auction designations — OUT OF SCOPE
// per the task brief ("skip leases/wykazy"); crawlActive() always returns
// wykaz: [].
//
// REAL BUG in the spike doc: it guessed the Wyniki przetargów board lived at
// struktura/1/2911/... or struktura/1/2912/.../dokumenty/14925 (both return
// HTTP 200 but an EMPTY "Brak wiadomości w kategorii: Wyniki przetargów").
// Live-browsing the department page (struktura/1/2905/wydzial_geodezji_i_gosp
// odarki_przestrzennej) shows the real sibling link is
// struktura/1/2905/dokumenty/14925 — same struktura node (2905) as the
// announcements board, just a different dokumenty id. Fixed here.
//
// The announcement/result board is LAND-DOMINATED (mostly "nieruchomość
// niezabudowana" plot sales near ul. Lotnicza) with flats cycling through as
// a minority stream, plus occasional lease notices ("wynajęcie części
// nieruchomości") and procedural notices (qualification lists, cancellations)
// that are NOT sales at all — classifyAnnouncementTitle() filters all of
// this down to just {mieszkalny, grunt} sale announcements before any detail
// page is even fetched.
//
// SOURCE-DATA QUIRK (real, live, not a transcription error): the "Ogłoszenie
// o przetargu … na sprzedaż lokalu mieszkalnego nr 14 … Daszyńskiego 20"
// notice's OPENING sentence reads "…w budynku położonym w Środzie
// Wielkopolskiej przy ulicy Harcerskiej." — the WRONG street (a copy-paste
// leftover from a neighbouring notice). The "Oznaczenie nieruchomości"
// section further down states the correct "przy ul. Daszyńskiego 20"
// consistently. flatAddressFromText() below defends against this by scoping
// address extraction to start AFTER the "Oznaczenie nieruchomości" label,
// which also happens to be the semantically-authoritative section per the
// standard rozporządzenie template — see scopeAfterOznaczenie().
//
// Polish suffix caution: JS `\w` is ASCII-only (it does NOT include
// ą/ć/ę/ł/ń/ó/ś/ź/ż even with the /u flag), so `\w*` silently fails to
// consume a Polish word's diacritic tail. That's harmless for boolean
// .test() substring checks (isLeaseTitle etc.) but breaks any pattern that
// needs a fixed anchor (like whitespace) immediately AFTER the wildcard —
// e.g. matching all six "działk-" case endings (działka/działkę/działki/
// działek/działce/działką — the k→c shift in the locative "działce" also
// means a naive "dzia[łl]k\w*" stem never matches that form at all).
// singleDzialkaFromText() below uses an explicit Polish-letter class instead.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- 0. generic helpers -------------------------------------------------

const PL = 'a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ'; // explicit Polish-letter run (NOT \w — see header note)

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&sect;/gi, '§')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&bdquo;/gi, '„')
    .replace(/&rdquo;/gi, '”')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// "80 000,00" / "200.000,00" / "10.000,00" -> integer PLN, or null.
// Środa Wielkopolska notices mix space-thousands and dot-thousands styles
// (both observed live, sometimes within the SAME flat's different rounds —
// see the test fixtures) — ported verbatim from gniezno/parse.js, which
// already handles both.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function toAsciiPL(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

function iso(y, m, d) {
  return String(y) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function dateFromPolishWords(text) {
  const m = /(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAsciiPL(m[2])];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// Tolerates a stray space before the year — real quirk, live fixture:
// "odbędzie się w dniu 19.12. 2025 r." (Chocicza restricted-auction land).
function dateFromNumeric(text) {
  const m = /(\d{1,2})\.(\d{1,2})\.\s*(\d{4})/.exec(text || '');
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

// Auction date, anchored on "odbędzie/odbędą się w dniu" (future — announce-
// ments) or "odbył/odbyły się w dniu" (past — results). A live fixture
// (Westerplatte 9/13 round II) reads "odbędzie się w dniu 06.03.2026 marca
// 2026 r." — a duplicated numeric+spelled-out date in the SAME sentence
// (source copy/paste artifact); dateFromNumeric matches the numeric form
// first and ignores the redundant trailing " marca 2026".
export function auctionDateFromText(text) {
  const anchorRe = /odb[ęe]d(?:zie|ą)\s+si[ęe]\s+w\s+dniu|odby[łl]y?\s+si[ęe]\s+w\s+dniu/i;
  const am = anchorRe.exec(text || '');
  if (!am) return null;
  const scope = text.slice(am.index, am.index + 80);
  return dateFromNumeric(scope) || dateFromPolishWords(scope);
}

// Round: "ogłasza {roman|ordinal} przetarg" (announcements, future tense) or
// "wyniku {ordinal} przetargu" (results — crawl.js prepends the board-list
// TITLE, which carries the ordinal, ahead of the body text so this same
// regex catches it there too). defaultToOne mirrors gniezno's parseAnnounce-
// ment: a bare "ogłasza przetarg" with no ordinal at all IS round 1; result
// docs are called with defaultToOne=false since an unstated round on a
// result is genuinely unknown, not necessarily 1.
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
function ordinalToRound(word) {
  const w = toAsciiPL(word);
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  if (w.startsWith('pi')) return 5; // piaty/piatego/piatym
  return null;
}
export function roundFromText(text, { defaultToOne = false } = {}) {
  if (!text) return null;
  const romanM = /(?:og[łl]asza|og[łl]osi[łl]|wyniku)\s+(IV|III|II|I|V)\s+(?:publiczny\s+)?przetarg/i.exec(text);
  if (romanM) return ROMAN[romanM[1].toUpperCase()] ?? null;
  const ordM = /(?:og[łl]asza|og[łl]osi[łl]|wyniku)\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+przetarg\w*/i.exec(text);
  if (ordM) return ordinalToRound(ordM[1]);
  if (defaultToOne && /przetarg/i.test(text)) return 1;
  return null;
}

// Scope address/location extraction to AFTER the "Oznaczenie nieruchomości"
// section label — the semantically-authoritative property description, and
// (real, live) the only reliable defense against the Daszyńskiego 20/14
// wrong-street intro-sentence typo documented in the file header. Falls back
// to the full text when the label is absent (result docs don't use it).
export function scopeAfterOznaczenie(text) {
  const t = text || '';
  const idx = t.search(/Oznaczenie\s+nieruchomo[śs]ci/i);
  return idx >= 0 ? t.slice(idx) : t;
}

// ---- 1. board list parser (shared by both boards) + title classifiers ---

// Both bip.umsroda.pl document boards (14926 announcements, 14925 results)
// render the SAME IDcom.pl list markup as gniezno/tczew:
//   <p class="title"><a href=".../wiadomosc/ID/slug">TITLE</a></p>
//   <p class="tresc">teaser…</p>
export function parseBoardList(html) {
  if (!html) return [];
  const out = [];
  const RE = /<p[^>]+class="title"[^>]*>\s*<a[^>]+href="([^"]+\/wiadomosc\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = RE.exec(html)) !== null) {
    out.push({ title: stripTags(m[2]), detail_url: m[1].replace(/&amp;/gi, '&') });
  }
  return out;
}

// Rentals ("wynajęcie części nieruchomości" / najem / dzierżawa) are NOT
// sales — real live examples confirmed on both boards (announcements AND
// their own "Informacja o wyniku … na wynajęcie …" results).
export function isLeaseTitle(title) {
  return /wynaj\w*|najem|dzier[żz]aw/i.test(title || '');
}

// "Lista osób zakwalifikowanych…" (bidder-qualification notices) and
// "Informacja o odwołaniu przetargu…" (cancellations) are procedural, not
// announcements — and critically, several REAL titles of this kind contain
// "niezabudowanej"/"działce", which would otherwise misclassify as a land
// sale via classifyKind (e.g. id 608902, id 839433 — both live fixtures).
export function isProceduralTitle(title) {
  return /zakwalifikowan|odwo[łl]a\w*\s+przetarg|uniewa[żz]nieni/i.test(title || '');
}

/**
 * Classify one board-list TITLE into 'mieszkalny' | 'grunt' | null (skip).
 * @param {string} title
 * @returns {'mieszkalny'|'grunt'|null}
 */
export function classifyAnnouncementTitle(title) {
  if (!title) return null;
  if (isLeaseTitle(title) || isProceduralTitle(title)) return null;
  const k = classifyKind(title);
  return k === 'mieszkalny' || k === 'grunt' ? k : null;
}

// The board-list title suffix "… z DD MMMM YYYY roku" is the notice's
// ISSUANCE/publication date — NOT the auction date (real, live proof:
// Westerplatte 9/13 round II's title ends "z 29 stycznia 2026 roku" while
// its body's auction date is 06.03.2026, a full five weeks later).
export function publishedDateFromTitle(title) {
  const m = /z\s+(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)\s+(\d{4})\s+roku\s*$/i.exec(title || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAsciiPL(m[2])];
  return mon ? iso(m[3], mon, m[1]) : null;
}

// ---- 2. detail-page body extraction (IDcom.pl "wiadomosc" markup) -------

// The notice body lives in <div class="wiadomosc">…<div class="tresc">TEXT
// </div>…</div>, followed by an unrelated "Wiadomości powiązane" (related
// messages) footer that repeats OTHER notices' titles as links — bounded out
// here so it can never pollute field extraction (e.g. its own "z DD MMMM
// YYYY roku" dates could otherwise be mistaken for content).
export function extractDetailText(html) {
  if (!html) return '';
  const startIdx = html.indexOf('<div class="wiadomosc">');
  if (startIdx < 0) return '';
  const rest = html.slice(startIdx);
  const endIdx = rest.search(/Wiadomo[śs]ci\s+powi[ąa]zane|id="Attachments"|Rejestr zmian|id="RightMenu"/i);
  const block = endIdx >= 0 ? rest.slice(0, endIdx) : rest;
  return stripTags(block);
}

// ---- 3. shared field extractors ------------------------------------------

// "lokalu mieszkalnego nr 13" / "Lokal mieszkalny nr 7" -> "13" / "7".
export function aptFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? m[1] : null;
}

// "…w budynku położonym w Środzie Wielkopolskiej przy ul. Westerplatte 9…"
// -> {street:'Westerplatte', building:'9'}. Scoped past "Oznaczenie
// nieruchomości" — see scopeAfterOznaczenie()'s doc + the file header.
// The capture's FIRST character allows a digit too — a live fixture (ul. 20
// Października 42/22) has a street name that literally STARTS with a
// number. Without that, the capture can't start there at all, the "przy
// ul." match attempt fails outright, and .exec() falls through to the NEXT
// "przy ul." occurrence later in the SAME notice — which is the wadium
// payment paragraph's bank address ("z siedzibą przy ul. Księdza P.
// Wawrzyniaka 3 w Śremie", present in EVERY notice) — a real bug caught by
// the live smoke test: the flat was mis-keyed as "Księdza P. Wawrzyniaka
// 3/22" instead of "20 Października 42/22".
export function flatAddressFromText(text) {
  if (!text) return null;
  const scoped = scopeAfterOznaczenie(text);
  const RE = new RegExp(`przy\\s+ul(?:icy|\\.)?\\s+([${PL}0-9][${PL}0-9 .'-]*?)\\s+(\\d+[A-Za-z]?)\\b`, 'i');
  const m = RE.exec(scoped) || RE.exec(text);
  return m ? { street: m[1].trim(), building: m[2] } : null;
}

// The flat's OWN usable area is always the FIRST "X m2" figure mentioned in
// the "Oznaczenie nieruchomości" section, immediately after "Lokal
// mieszkalny nr N" — regardless of whether THIS notice phrases it as the
// full "o powierzchni użytkowej X m2" (Górki/Westerplatte/Sejmikowa style)
// or the abbreviated "o pow. X m2" (Daszyńskiego/20 Października style).
// Every subsequent m2 figure (piwnica/pomieszczenie gospodarcze/korytarz) is
// introduced later via "wraz (z) piwnicą/oraz pomieszczeniem/udział w
// korytarzu". A live bug (caught by the smoke test) is WHY this takes the
// leftmost match rather than preferring the full-phrase pattern: on the
// Daszyńskiego 20/14 and 20 Października 42/22 notices, the CELLAR's area
// happens to use the full "powierzchni użytkowej" phrase while the FLAT's
// own area uses the abbreviated "pow." form — a fixed full-then-abbreviated
// priority order picked the cellar's area for the flat on both.
export function areaM2FromText(text) {
  if (!text) return null;
  const scoped = scopeAfterOznaczenie(text);
  const m = /(\d+(?:[.,]\d+)?)\s*m\s*[²2](?!\d)/.exec(scoped);
  return m ? parseArea(m[1]) : null;
}

// "Cena wywoławcza nieruchomości 80 000,00 zł." / "…: 10.000,00 zł netto." /
// "…– 145.000,00 zł" (en dash — a live fixture confirms this separator too;
// a colon-only optional separator left this null on 2 real listings) /
// "Cena wywoławcza UDZIAŁU nieruchomości 50.000,00 zł" (restricted
// udział/share sales insert an extra word — real live fixture, Niedział-
// kowskiego 3737 — a fixed "nieruchomości"-only gap left this null too).
// The (?:\s+\S+){0,2}? gap tolerates 0-2 words between "wywoławcza" and the
// amount rather than enumerating every qualifier word seen so far.
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza(?:\s+\S+){0,2}?\s*[:–\-]?\s*(\d[\d\s.,]*)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ---- 4. flat announcement parser -----------------------------------------

/**
 * Parse one announcement notice's plain-text body into a flat listing, or
 * null if it doesn't carry a keyable apt + address.
 * @param {string} text
 * @returns {object|null}
 */
export function parseFlatAnnouncement(text) {
  if (!text) return null;
  const apt = aptFromText(text);
  const addr = flatAddressFromText(text);
  if (!apt || !addr) return null;
  const address_raw = `ul. ${addr.street} ${addr.building}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaM2FromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text, { defaultToOne: true }),
  };
}

// ---- 5. land announcement parser (single-parcel + multi-parcel) ---------

// "przy ulicy Strzeleckiej," / "w rejonie ulicy Lotniczej," / "we wsi
// Chocicza, gmina …" -> a descriptive location (street OR village); land has
// no formal building number pre-sale, so this is informational only (the
// parcel number is the real key — see build-land.js's landKey()).
export function landLocationFromText(text) {
  const t = text || '';
  let m = new RegExp(`przy\\s+ulicy\\s+([${PL}][${PL} .'-]*?)(?=[,.]|\\s+stanowi|\\s+oznaczon|\\s+zapisan|$)`, 'i').exec(t);
  if (m) return { street: m[1].trim(), raw: `ul. ${m[1].trim()}` };
  m = new RegExp(`w\\s+rejonie\\s+ulicy\\s+([${PL}][${PL} .'-]*?)(?=[,.]|\\s+zapisan|\\s+stanowi|$)`, 'i').exec(t);
  if (m) return { street: m[1].trim(), raw: `rejon ul. ${m[1].trim()}` };
  m = new RegExp(`we?\\s+wsi\\s+([${PL}][${PL} .'-]*?)\\s*,\\s*gmina`, 'i').exec(t);
  if (m) return { street: null, raw: `wieś ${m[1].trim()}` };
  return { street: null, raw: null };
}

// Single-parcel number: "działkę oznaczoną nr. ewid. 953/44" / "działkę nr
// 265" / "na działce oznaczonej nr. geod. 1099". Uses an explicit Polish-
// letter class (not \w*) so the locative "działce" (k→c stem shift) matches
// too — see the file header's \w caution.
export function singleDzialkaFromText(text) {
  const m = new RegExp(`dzia[łl][${PL}]*\\s+(?:oznaczon[${PL}]*\\s+)?nr\\.?\\s*(?:ewid\\.?|geod\\.?)?\\s*(\\d+(?:\\/\\d+)?)`, 'i').exec(text || '');
  return m ? m[1].trim() : null;
}

// "obszaru 0,0647 ha" -> 647 (m², rounded to 2dp for float safety).
export function haToM2(haStr) {
  const ha = Number(String(haStr).replace(',', '.'));
  return Number.isFinite(ha) ? Math.round(ha * 10000 * 100) / 100 : null;
}
export function areaHaFromText(text) {
  const m = /obszaru\s+(\d+[.,]\d+)\s*ha/i.exec(text || '');
  return m ? haToM2(m[1]) : null;
}

// A handful of older (2021-2023) multi-parcel notices list their parcels as
// bare "niżej wymienione działki: 3689/39 obszaru …, 3689/43 obszaru …" (no
// "nr" before the number) with a shared "PARCEL PRICE zł wadium W zł" price
// list that also skips repeating "cena wywoławcza" per line — real live
// fixture (id 721070) confirmed neither singleDzialkaFromText (needs a
// literal "nr") nor parseMultiParcelLand's price regex (needs a literal
// "cena wywoławcza" per parcel) matches this phrasing, so it's NOT parsed.
// This is a deliberate scope decision, not an oversight: land has no
// building number, so build-land.js's landKey() falls back to the generic
// address_raw ("rejon ul. Lotniczej") when dzialka_nr is null — which would
// silently MERGE several distinct parcels sharing that same generic phrase
// into one fake plot. Requiring a real dzialka_nr (below) makes this
// phrasing variant a clean skip (logged, no record emitted) instead of a
// silent cross-parcel data collision. Revisit if this phrasing turns out to
// still be in current use (all confirmed instances during the build were
// 2021-2023 archive entries).

/** Single-parcel land record, or null if unkeyable (no real parcel number). */
function parseSingleParcelLand(text) {
  const scoped = scopeAfterOznaczenie(text);
  const loc = landLocationFromText(scoped).raw ? landLocationFromText(scoped) : landLocationFromText(text);
  const dzialka_nr = singleDzialkaFromText(scoped) || singleDzialkaFromText(text);
  if (!dzialka_nr) return null;
  return {
    kind: 'grunt',
    dzialka_nr,
    obreb: null,
    address_raw: loc.raw,
    street: loc.street,
    building: null,
    area_m2: areaHaFromText(scoped) ?? areaHaFromText(text),
    zoning: /niezabudowan/i.test(text) ? 'niezabudowana' : null,
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text, { defaultToOne: true }),
  };
}

// Multi-parcel notice: one notice announces SEVERAL separately-priced plots
// in a single document (real live fixture: 17 działki near ul. Lotnicza,
// each with its own "PARCEL cena wywoławcza – PRICE zł, wadium W zł" line
// and its own "PARCEL obszaru AREA ha" line in the "Oznaczenie nieruchomości"
// enumeration). Returns one record per priced parcel, or [] if this notice
// doesn't have the repeating per-parcel-price shape (i.e. it's a single-
// parcel notice, or a "dzialka A i dzialka B" combined-single-price notice).
function parseMultiParcelLand(text) {
  const priceRe = /(\d+\/\d+)\s+cena\s+wywo[łl]awcza\s*[–-]\s*([\d\s.,]+?)\s*z[łl](?:,\s*wadium\s+([\d\s.,]+?)\s*z[łl])?/gi;
  const priceMap = new Map();
  let m;
  while ((m = priceRe.exec(text)) !== null) {
    priceMap.set(m[1], parsePLN(m[2]));
  }
  if (priceMap.size < 2) return []; // not this shape — let single-parcel handle it (or fail)

  const areaRe = /(\d+\/\d+)\s+obszaru\s+(\d+[.,]\d+)\s*ha/gi;
  const areaMap = new Map();
  while ((m = areaRe.exec(text)) !== null) {
    areaMap.set(m[1], haToM2(m[2]));
  }

  const loc = landLocationFromText(scopeAfterOznaczenie(text));
  const auction_date = auctionDateFromText(text);
  const round = roundFromText(text, { defaultToOne: true });
  const zoning = /niezabudowan/i.test(text) ? 'niezabudowana' : null;

  const out = [];
  for (const [parcel, starting_price_pln] of priceMap) {
    out.push({
      kind: 'grunt',
      dzialka_nr: parcel,
      obreb: null,
      address_raw: loc.raw,
      street: loc.street,
      building: null,
      area_m2: areaMap.get(parcel) ?? null,
      zoning,
      starting_price_pln,
      auction_date,
      round,
    });
  }
  return out;
}

/**
 * Parse one land-sale notice's plain-text body into 0..N land records.
 * @param {string} text
 * @returns {Array<object>}
 */
export function parseLandAnnouncement(text) {
  if (!text) return [];
  const multi = parseMultiParcelLand(text);
  if (multi.length) return multi;
  const single = parseSingleParcelLand(text);
  return single ? [single] : [];
}

// ---- 6. result-notice parser (flats only — see crawl.js header) ---------
//
// bip.umsroda.pl's "Informacja o wyniku przetargu" template (§12 rozporzą-
// dzenia) is the SAME national boilerplate gniezno.eu's result notices use,
// down to the "Przetarg zakończył się wynikiem pozytywnym/negatywnym"
// phrase (when stated — see the positive-inference note below) — so the
// outcome/unsold-reason detection is ported from gniezno/parse.js. THREE
// real live fixtures groundtruth both outcomes (see the test file): a sold
// flat (Kilińskiego 20/7), a sold flat whose notice omits the "wynikiem
// pozytywnym" sentence entirely (Sejmikowej 2/5 round II), and a genuinely
// unsold flat, "brak uczestników" (Sejmikowej 2/5 round I).
//
// Land results (the majority of this board) are NOT parsed here — see
// crawl.js's crawlResultDocs(), which filters the results board down to
// classifyKind === 'mieszkalny' titles only before ever fetching a detail
// page. Revisit if per-parcel achieved-price coverage is wanted later.

export function parseResultNotice(text, sourceUrl) {
  if (!text) return [];
  const apt = aptFromText(text);
  const addr = flatAddressFromText(text);
  if (!apt || !addr) return [];

  const address_raw = `ul. ${addr.street} ${addr.building}/${apt}`;
  const address = parseAddress(address_raw);
  const notes = [];
  if (!address) {
    notes.push('parse: address parse failed');
    return [];
  }
  if (address.warning) notes.push(address.warning);

  const auction_date = auctionDateFromText(text);
  const round = roundFromText(text, { defaultToOne: false });

  const startM = /cena\s+wywo[łl]awcza\s+wynosi[łl]a\s+(\d[\d\s.,]*)\s*z[łl]/i.exec(text);
  const starting_price_pln = startM ? parsePLN(startM[1]) : null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const finalM = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[–-]?\s*(\d[\d\s.,]*)\s*z[łl]/i.exec(text);

  // A real live fixture (Sejmikowej 2/5, round II — id 672257) names a buyer
  // and states a numeric final price but OMITS the "Przetarg zakończył się
  // wynikiem pozytywnym" boilerplate sentence entirely — relying on that
  // literal phrase alone silently mis-marked a confirmed sale as unsold. A
  // stated NUMERIC "najwyższa cena osiągnięta" is itself decisive positive
  // evidence: the genuinely-negative fixture (Sejmikowej round I, id 653123)
  // confirms the distinguishing signal — its equivalent clause reads
  // "Najwyższa cena osiągnięta w przetargu – brak." (literal "brak" = none),
  // so finalM (which requires a leading digit) stays null there and the
  // explicit "wynikiem negatywnym" sentence (present on that one) still
  // classifies it correctly.
  const explicitPositive = /wynikiem\s+pozytywnym/i.test(text);
  const explicitNegative = /wynikiem\s+negatywnym/i.test(text);
  const positive = explicitPositive || finalM != null;
  if (!explicitPositive && !explicitNegative) {
    notes.push(finalM ? 'parse: outcome inferred from stated final price' : 'parse: outcome unclear');
  }

  let unsold_reason = null;
  if (/brak\s+wp[łl]aty\s+wadium/i.test(text) || /brak\s+uczestnik/i.test(text)) {
    unsold_reason = 'brak_uczestnikow';
  } else if (/uniewa[żz]ni/i.test(text)) {
    unsold_reason = 'uniewaznienie';
  }

  const outcome = positive ? 'sold' : 'unsold';
  const final_price_pln = positive && finalM ? parsePLN(finalM[1]) : null;
  if (positive && final_price_pln == null) notes.push('parse: missing final price on positive result');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw,
    address,
    round,
    area_m2: areaM2FromText(text),
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    notes,
  }];
}

// ---- 7. contract entry-point ----------------------------------------------

/**
 * @param {string} text
 * @param {string|null} _fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, _fallbackDate, sourceUrl) {
  return parseResultNotice(text, sourceUrl);
}
