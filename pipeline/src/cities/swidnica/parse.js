// Świdnica parsers. Groundtruthed against REAL fetched fixtures (2026-07-19,
// bip.swidnica.nv.pl JSON API, board menu id 11962 "Sprzedaż i dzierżawa
// nieruchomości"):
//   - id 131222 (SOLD, Al. Niepodległości 17/5, round I, P-43/VI/26):
//     "Najwyższa cena osiągnięta w przetargu: 352 000,00 zł. Osoba ustalona
//     jako nabywca nieruchomości: Dawid Konrad Orzech ." / "Cena wywoławcza
//     do przetargu wynosi - 310 000,00 zł" / "Przetarg Nr P-43/VI/26
//     odbędzie się w dniu 25-06-2026 r." / "łącznej powierzchni użytkowej
//     101,80 m²".
//   - id 131223 (SOLD, ulicy Wałbrzyskiej nr 6/6, title "Kolejny przetarg",
//     P-44/VI/26): "... osiągnięta w przetargu: 60 600,00 zł. Osoba
//     ustalona jako nabywca nieruchomości: Dariusz Michał Sidoruk ." — a
//     single-room studio where only "pokoju o powierzchni 30,60 m²" is
//     given (no explicit "użytkowa" label); the flat's own price recap
//     ("Cena lokalu mieszkalnego o powierzchni 30,60 m²") confirms 30,60 is
//     the whole flat's area.
//   - id 131224 (UNSOLD despite 1 wadium payer — placeholder "Najwyższa cena
//     osiągnięta w przetargu: ….----…. zł.", ulicy Grodzkiej nr 16-18/6,
//     title "Kolejny przetarg", P-45/VI/26, area 82,61 m² labelled
//     "użytkowej").
//   - id 131297 (SOLD to TWO buyers, ulicy Komunardów nr 18/5, title
//     "Kolejny przetarg", P-50/VII/26): "Osoba ustalona jako nabywca
//     nieruchomości: Roman Gałafin, Urszula Gałafin ."
//   - id 131298 (UNSOLD, no wadium paid, ulicy Środkowej nr 7A/7, title
//     "Kolejny przetarg", P-51/VII/26).
//   - id 131299 (UNSOLD commercial unit "lokalu użytkowego nr 01", ulicy
//     Kraszowickiej nr 55, title "II przetarg", P-52/VII/26 — a stray
//     "lok. 01 m²" fragment in the source HTML floats a bare "m²" with no
//     real number before it; the plausibility floor (>=8 m²) in
//     core/finn-bip's areaFromText fallback rejects it and correctly picks
//     the real 86,48 m² room total instead).
//   - id 131390 (LAND, "ograniczony" auction, P-58/VIII/26) — out of scope,
//     groundtruths titleInScopeKind's land exclusion.
//   - id 131198 (archived wykaz/dzierżawa notice, land lease) — out of
//     scope, groundtruths isOutOfScopeTitle.
//
// Reuses core/finn-bip.js's generic Polish auction-text helpers
// (priceFromText, areaFromText, parsePLN, shareFromTitle) — Świdnica's price/
// area vocabulary ("Cena wywoławcza ... wynosi ... zł", "powierzchni
// użytkowej ... m²") matches FINN-BIP's. Address extraction, the auction
// date and the round marker are Świdnica-specific (own functions below)
// because: (a) Świdnica's address phrasing always inserts "nr" between the
// street and the building number ("przy ulicy Kraszowickiej nr 55" —
// FINN-BIP's addressFrom has no "nr" handling and mis-captures the literal
// "nr" as part of the street name); (b) its scheduling dates are numeric
// dash-separated ("25-06-2026", not FINN-BIP's dotted "25.06.2026" or
// Sopot's spelled-month format) — though the article body ALSO contains
// spelled-month dates for the HISTORY of prior rounds ("I przetarg odbył się
// w dniu 12 stycznia 2026 r."), which the strict numeric regex safely never
// matches, always landing on the real (numeric) current-round date further
// down the same text.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, priceFromText, areaFromText, parsePLN, shareFromTitle } from '../../core/finn-bip.js';

export { htmlToText };

// ---- title-level filters (cheap — no fetch needed) -------------------------

/** Rentals/leases (dzierżawa/najem/wynajem) and wykaz pre-announcements —
 *  never a keyable SALE auction on this board (e.g. id 131198: "... wykazu
 *  nieruchomości gruntowych przeznaczonych do wydzierżawienia ..."). */
export function isOutOfScopeTitle(title) {
  const t = (title || '').toLowerCase();
  if (/dzier[żz]aw|najem|wynajem/.test(t)) return true;
  if (/^\s*wykaz/.test(t)) return true;
  if (/rokowa/.test(t) && !/przetarg/.test(t)) return true;
  return false;
}

/** "(ODWOŁANY)" / "[UNIEWAŻNIONY]" — the round never happened. */
export function isCancelledTitle(title) {
  return /odwo[łl]an|uniewa[żz]ni/i.test(title || '');
}

/** Cheap pre-fetch kind guess from the board-list TITLE alone — Świdnica
 *  titles always state the kind explicitly ("... lokalu mieszkalnego nr
 *  X ...", "... lokalu użytkowego nr Y ...", "... nieruchomości gruntowej
 *  ..."). Null means land/other, out of scope for this build. */
export function titleInScopeKind(title) {
  const kind = classifyKind(title || '');
  return kind === 'mieszkalny' || kind === 'zabudowana' || kind === 'uzytkowy' || kind === 'garaz' ? kind : null;
}

/** Must read "... przetarg ... na sprzedaż ..." somewhere in the title. */
export function isSaleTitle(title) {
  const t = (title || '').toLowerCase();
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

// ---- text-level classification ----------------------------------------------

/**
 * The city PREPENDS a "... informację o wyniku ..." block (and always fills
 * in — real or placeholder — the "Najwyższa cena osiągnięta w przetargu"
 * template line) to the SAME article once a round concludes; the title is
 * never updated to say "wynik". These two anchors are the only reliable
 * "already concluded" signal. The generic "zakończeniu przetargu wynikiem
 * negatywnym" phrase is NOT usable on its own — it's boilerplate T&C present
 * in every article regardless of outcome (see config.js header).
 * @param {string} text
 * @returns {boolean}
 */
export function isResultText(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wyniku/i.test(t) ||
    /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu/i.test(t)
  );
}

/**
 * "Najwyższa cena osiągnięta w przetargu: 352 000,00 zł." → 352000. A
 * negative round leaves the amount as placeholder punctuation
 * ("….----…. zł.") — no digit present → null (unsold).
 * @param {string} text
 * @returns {number|null}
 */
export function achievedPriceFromText(text) {
  const m = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:\s*([^.]+?)\s*z[łl]\.?/i.exec(text || '');
  if (!m || !/\d/.test(m[1])) return null;
  return parsePLN(m[1]);
}

/**
 * "Osoba ustalona jako nabywca nieruchomości: Dawid Konrad Orzech ." A
 * negative round leaves the name blank ("….----…. .") — no letter present
 * → null. Multiple buyers ("Roman Gałafin, Urszula Gałafin") pass through
 * as one comma-joined string.
 * @param {string} text
 * @returns {string|null}
 */
export function buyerFromText(text) {
  const m = /Osoba\s+ustalona\s+jako\s+nabywca\s+nieruchomo[śs]ci\s*:\s*([^.]+?)\s*\./i.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  if (!/[A-ZŻŹĆŁŚĄĘÓŃ]/.test(raw)) return null;
  return raw.replace(/\s+/g, ' ').trim();
}

export function unsoldReasonFromText(text) {
  const t = text || '';
  if (/wp[łl]aci[łl][ao]?\s+0\s+os[oó]b/i.test(t)) return 'no_wadium';
  if (/dopuszczon\w*\s+0\s+os[oó]b/i.test(t)) return 'no_participants';
  return 'unknown';
}

// ---- round --------------------------------------------------------------------

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const WORD_ROUND_MAP = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, pi: 5 };
// Anchored at the string start: a concluded multi-round article's body
// recaps EVERY prior round's own past-tense sentence ("Pierwszy przetarg
// odbył się w dniu 22 stycznia 2026 roku.") further down the SAME text — an
// unanchored search would find that word-spelled history mention before
// ever reaching the real leading "Kolejny przetarg ..." marker (confirmed
// live: id 131297, a "Kolejny" round whose body recaps an earlier
// "Pierwszy przetarg odbył się ..."). Anchoring guarantees only the
// marker actually describing THIS round (title, or body position 0, which
// always repeats the title) can match.
const WORD_ROUND_RE = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i;

/**
 * Round from the TITLE (or the body, which always leads with the same
 * marker — see header): "I przetarg ...", "II przetarg ...", "Pierwszy
 * przetarg ...". "Kolejny przetarg" ("next/subsequent") is Świdnica's own
 * generic re-run marker — live data shows it used interchangeably with an
 * explicit "II" for a repeat round, so it's read as round 2 (ADAPTER-GUIDE
 * only cares that ≥II signals a property that keeps failing to sell).
 * @param {string} titleOrText
 * @returns {number|null}
 */
export function roundFrom(titleOrText) {
  const t = titleOrText || '';
  const w = WORD_ROUND_RE.exec(t);
  if (w) return WORD_ROUND_MAP[w[1].toLowerCase()] ?? null;
  if (/^\s*kolejny\b/i.test(t)) return 2;
  // Case-SENSITIVE, anchored at the start: a lowercase "i" is the Polish
  // conjunction, not a numeral, and every real title/body leads with the
  // marker (never mid-sentence).
  const m = /^\s*(I{1,3}|IV|V)\s+przetarg/.exec(t);
  if (m) return ROMAN[m[1]] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}

// ---- address ------------------------------------------------------------------
//
// Świdnica always inserts "nr" between the street and the building number
// ("przy ulicy Kraszowickiej nr 55", "przy Alei Niepodległości nr 17") —
// consistent across every live sample, title AND body. The property address
// is always mentioned in the title (prepended to the search text below) or,
// for a body-only lookup, in the wynik preamble's own recap sentence, BEFORE
// any later mention of the city hall's own address ("Urząd Miejski ... przy
// ulicy Armii Krajowej 49") — so the first regex match always wins safely.

// The prefix alternation intentionally does NOT use a blanket /i flag: that
// would also case-fold the street capture's `[A-ZŻŹĆŁŚĄĘÓŃ]` uppercase-start
// guard, letting a lowercase prose word be mistaken for a street name. Only
// "Al./Alei" is spelled with a capital live ("przy Alei Niepodległości nr
// 17" — id 131222); "ul./ulicy" is always lowercase mid-sentence.
const ADDRESS_RE =
  /przy\s+(?:ul\.?|ulicy|[Aa]l\.?|[Aa]lei|placu|pl\.?|os\.?|osiedlu)\s+([A-ZŻŹĆŁŚĄĘÓŃ][\p{L}.\- ]+?)\s+nr\.?\s*(\d+(?:[-/]\d+)?[A-Za-z]?)\b/u;
const APT_RE = /lokal\w*\s+(?:mieszkaln\w*|niemieszkaln\w*|u[żz]ytkow\w*)\s+nr\.?\s*(\d+[A-Za-z]?)/i;

/**
 * @param {string} title
 * @param {string} text
 * @returns {{address_raw:string, address:object}|null}
 */
export function addressFrom(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const m = ADDRESS_RE.exec(src);
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const building = m[2].toUpperCase();
  const aptM = APT_RE.exec(src);
  const apt = aptM ? aptM[1] : null;
  const raw = apt ? `ul. ${street} ${building}/${apt}` : `ul. ${street} ${building}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

/** Garage fallback ("sprzedaż garażu nr N przy ul. X nr Y") — not seen live
 *  on this board yet, but classifyKind can return 'garaz' from generic
 *  vocabulary, so keep parity with the flat/commercial path. */
export function garageAddressFrom(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const noM = /gara[żz]u?\s*nr\.?\s*(\d+)/i.exec(src);
  if (!noM) return null;
  const streetM = ADDRESS_RE.exec(src);
  if (!streetM) return null;
  const street = streetM[1].replace(/\s+/g, ' ').trim();
  const building = streetM[2].toUpperCase();
  const raw = `ul. ${street} ${building} garaż nr ${noM[1]}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

function resolveAddress(title, text, kind) {
  if (kind === 'garaz') return garageAddressFrom(title, text) || addressFrom(title, text);
  return addressFrom(title, text);
}

// ---- kind -----------------------------------------------------------------------
//
// core/classify-kind.js's generic classifyKind is title-first and correct
// when run on the TITLE alone (titleInScopeKind above) — but every Świdnica
// article's FULL BODY also carries a fixed legal-basis boilerplate sentence
// ("... zasad sprzedaży LOKALI MIESZKALNYCH i użytkowych jako odrębnych
// nieruchomości ...") that cites BOTH kinds generically regardless of which
// one is actually being sold. Since classifyKind checks its FLAT pattern
// first, running it on the full body would misclassify every commercial-
// unit result as 'mieszkalny' (confirmed live on id 131299, a "lokalu
// użytkowego nr 01" sale). A land announcement can independently trip
// classifyKind's GARAGE pattern (checked before LAND) if "garaż" appears
// anywhere in its boilerplate. Both collisions are avoided by resolving the
// kind from the SPECIFIC "<lokal-kind> nr <N>" / "garaż nr <N>" phrase
// first (unambiguous — an apartment/garage number is only ever attached to
// the actual unit being sold, never to the generic legal citation), falling
// back to a land keyword check, and only then to classifyKind for
// anything else (e.g. a genuine 'zabudowana' house sale).
function kindFromSpecificUnitPhrase(text) {
  const t = text || '';
  if (/lokal\w*\s+mieszkaln\w*\s+nr\.?\s*\d+[A-Za-z]?/i.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+(?:niemieszkaln\w*|u[żz]ytkow\w*)\s+nr\.?\s*\d+[A-Za-z]?/i.test(t)) return 'uzytkowy';
  if (/gara[żz]\w*\s+nr\.?\s*\d+/i.test(t)) return 'garaz';
  return null;
}

function resolveKind(title, text) {
  const src = `${title || ''} ${text || ''}`;
  const specific = kindFromSpecificUnitPhrase(src);
  if (specific) return specific;
  if (/nieruchomo[śs]ci\s+gruntow|niezabudowan|dzia[łl]k\w*\s+po[łl]o[żz]on/i.test(src)) return 'grunt';
  return classifyKind(src);
}

// ---- date -----------------------------------------------------------------------

/**
 * "Przetarg Nr P-43/VI/26 odbędzie się w dniu 25-06-2026 r." (future,
 * pending) / "I przetarg odbył się w dniu 25-06-2026 roku." (past,
 * concluded) — both numeric DD-MM-YYYY dash-separated, present in every
 * article regardless of state (a concluded article keeps the original
 * announcement sentence intact after the wynik preamble). A concluded
 * multi-round article's body ALSO recaps prior rounds in spelled-month form
 * ("I przetarg odbył się w dniu 12 stycznia 2026 r.") — those never satisfy
 * the strict numeric group here, so the regex safely skips past them to the
 * real (numeric) current-round date.
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromText(text) {
  const m = /odb[yę][a-ząćęłńóśźż]*\s+si[ęe][^0-9]{0,60}?(\d{1,2})[.-](\d{1,2})[.-](\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// ---- record builders --------------------------------------------------------------

/**
 * Build one ACTIVE-listing record from a still-pending announcement's
 * extracted text. Returns null when the record isn't keyable (no usable
 * address, or the kind is out of scope).
 * @param {string} title
 * @param {string} text
 * @param {string} url
 * @returns {object|null}
 */
export function buildAnnouncementRecord(title, text, url) {
  const kind = resolveKind(title, text);
  if (kind === 'grunt' || kind === 'unknown') return null;
  const addr = resolveAddress(title, text, kind);
  if (!addr) return null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFrom(title),
    auction_date: auctionDateFromText(text),
    detail_url: url,
    source_url: url,
    share: shareFromTitle(title, text),
  };
}

/**
 * Build one RESULT record from an already-concluded article's full text
 * (crawl.js hands the article's whole `content` field through unchanged —
 * source:'html' contract). This is the ONLY place a result record is
 * assembled; parseResultDoc (the adapter's contract entry point) calls this
 * at refresh-time. No title is available here (matches the 3-arg
 * parseResultDoc contract) — Świdnica's wynik preamble always recaps the
 * address in the body itself, so title-less extraction still works.
 * @param {string} text
 * @param {string} url
 * @returns {object|null}
 */
export function buildResultRecord(text, url) {
  if (!text) return null;
  const kind = resolveKind('', text);
  if (kind === 'grunt' || kind === 'unknown') return null;
  const addr = resolveAddress('', text, kind);
  if (!addr) return null;
  const achieved = achievedPriceFromText(text);
  const buyer = achieved != null ? buyerFromText(text) : null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    round: roundFrom(text),
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    final_price_pln: achieved,
    outcome: achieved != null ? 'sold' : 'unsold',
    unsold_reason: achieved != null ? null : unsoldReasonFromText(text),
    source_pdf: url,
    notes: buyer ? [`nabywca: ${buyer}`] : [],
  };
}

/**
 * Adapter contract entry point: parse one already-extracted result text
 * (crawl.js's ref.text) into an array of result records.
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {object[]}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const rec = buildResultRecord(text, sourceUrl);
  if (!rec) return [];
  if (!rec.auction_date) rec.auction_date = fallbackDate || null;
  return [rec];
}
