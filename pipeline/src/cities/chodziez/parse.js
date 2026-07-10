// Chodzież parsers. bip.chodziez.pl (WOKISS BIP) serves full-HTML prose
// announcement/result pages directly — no PDF, no OCR. See config.js.
//
// Groundtruthed against REAL live pages fetched 2026-07-10:
//   - .../obrot-nieruchomosciami/2026/ogloszenia-o-przetargach.html (board)
//   - .../2026/ogloszenia-o-przetargach/ogloszenie-iii-przetargu-ustnego-
//     nieograniczonego-na-sprzedaz-lokali-mieszkalnych-polozonych-w-chodziezy-
//     przy-ul.adama-mickiewicza-4/3-oraz-4/6.html
//       (TWO flats, ONE shared cena wywoławcza: lokal nr 3 65,50 m2 + lokal nr 6
//        67,64 m2, III przetarg, 340.000,00 zł, 2026-08-05)
//   - .../2026/ogloszenia-o-przetargach/ogloszenie-i-przetargu-ustnego-
//     nieograniczonego-na-sprzedaz-lokalu-mieszkalnego-nr-8-polozonego-w-
//     chodziezy-przy-ul.-ignacego-daszynskiego-12.html
//       (single flat, lokal nr 8, 21,03 m2, I przetarg, 49.000,00 zł, 2026-08-05)
//   - .../2026/ogloszenia-o-przetargach/ogloszenie-i-przetargu-ustnego-
//     nieograniczonego-na-sprzedaz-dzialki-nr-917/1-polozonej-w-chodziezy-
//     przy-ul.-kwiatowej.html
//       (land, dz. 917/1, 0,0037 ha, I przetarg, 10.500,00 zł brutto — note the
//        source text itself says "5 SIERPNIA 2025 R." for a notice living on the
//        2026 board; kept as-is, we parse what the document states)
//
// parseResultDoc is NOT verified against a real live chodziez result page —
// wyniki-przetargow.html was confirmed EMPTY for 2022-2026 on 2026-07-10 (the
// statutory ~7-day posting window had already elapsed for both 2026 rounds).
// It is written against the standard Polish municipal result-notice template
// (same "Cena wywoławcza"/"przetarg ustny nieograniczony" vocabulary this
// city's own announcements use, plus the nationwide "cena osiągnięta" /
// "wynikiem negatywnym" result phrasing seen across other cities' fixtures).
// VALIDATE on first live CI refresh that catches a result inside its window.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared text helpers
// ---------------------------------------------------------------------------

export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "340.000,00 zł" / "10.500,00" / "49.000,00" -> integer PLN, or null.
// Chodzież uses DOT as the thousands separator and comma as the decimal mark
// (unlike the space-thousands convention seen in some other cities).
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, ''); // strip trailing decimal fraction
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "65,50" / "0,0037" -> float, or null.
export function parseArea(s) {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "5 sierpnia 2026" / "5 SIERPNIA 2026 R." / "05.08.2026" -> ISO date, or null.
export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Field extractors — operate on tag-stripped plain text
// ---------------------------------------------------------------------------

const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

// Round from the operative declaration sentence: "…ogłasza III przetarg ustny
// nieograniczony…" (every ANNOUNCEMENT uses this verb). Case-sensitive on the
// roman numeral (properly capitalised by the source) and on "ogłasza"
// (always lower-case mid-sentence in every fixture seen) so a bare
// lower-case "i" (the Polish conjunction "and") can never false-match.
//
// RESULT notices don't "ogłasza" (that's specifically the announcement verb;
// results report what "odbył się" / "przeprowadzono") — a body-anchored
// fallback catches those: "<ROMAN> przetarg... ustn...", still case-sensitive
// on the roman numeral for the same lower-case-"i" reason.
export function roundFromText(text) {
  const t = text || '';
  const m = /ogłasza\s+(I{1,3}|IV|VI{0,3}|IX)\s+przetarg/.exec(t);
  if (m) return ROMAN_MAP[m[1]] ?? null;
  const body = /\b(VIII|VII|VI|IX|IV|I{1,3})\s+przetarg\w*\s+ustn/.exec(t);
  return body ? ROMAN_MAP[body[1]] ?? null : null;
}

// Auction date from "PRZETARG ODBĘDZIE SIĘ W DNIU <D> <miesiąc> <YYYY> R. …"
// (always present, always upper-case in the fixtures seen — matched
// case-insensitively since a differently-cased future notice is plausible).
export function auctionDateFromText(text) {
  const m = /PRZETARG\s+ODB[ĘE]DZIE\s+SI[ĘE]\s+W\s+DNIU\s+(\d{1,2})\s+([A-ZŻŹĆŁŚĄĘÓŃa-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
    text || '',
  );
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

// Starting price from "Cena wywoławcza w <round> przetargu wynosi <kwota> zł".
export function startingPriceFromText(text) {
  const m = /Cena\s+wywo[łl]awcza\s+w\s+\S+\s+przetargu\s+wynosi\s*:?\s*([\d.,\s]+?)\s*z[łl]/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

// The Urząd Miejski's own street (termin-i-miejsce-przetargu section: "W
// URZĘDZIE MIEJSKIM W CHODZIEŻY PRZY UL. IGNACEGO JANA PADEREWSKIEGO 2") must
// never be mistaken for the property's street when scanning for "ul. …".
const OFFICE_STREET_RE = /paderewskiego/i;

const STREET_BUILDING_RE =
  /ul\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*)*)\s+(\d+[A-Za-z]?)\b/gi;

// First "ul. <Street Name(s)> <bldg>" match that isn't the office address.
// Returns { street, building } or null (land notices have no building number
// on the street — the parcel is the address; see parcelFromText/obrebFromText).
export function baseStreetAddress(text) {
  const t = text || '';
  STREET_BUILDING_RE.lastIndex = 0;
  let m;
  while ((m = STREET_BUILDING_RE.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return { street, building: m[2].toUpperCase() };
  }
  return null;
}

// Multi-flat notices: ALL "lokal nr N o pow. XX,XX m2" pairs (each lokal's
// own apt number + usable area, scoped tightly enough to skip the "piwnica o
// powierzchni …" room-breakdown sentence that follows each lokal — that
// sentence never starts with "lokal nr N o pow").
export function flatUnitsFromText(text) {
  const re = /lokal\s+nr\s+(\d+[A-Za-z]?)\s+o\s+pow\.?\s+(\d+[,.]\d+)\s*m/gi;
  const out = [];
  let m;
  while ((m = re.exec(text || '')) !== null) {
    out.push({ apt: m[1], area_m2: parseArea(m[2]) });
  }
  return out;
}

// Single-flat notices: apt number from "lokalu mieszkalnego nr N" / "lokal
// mieszkalny … oznaczony numerem N", area from the first "o powierzchni
// XX,XX m2" (single-flat notices in this city state the lokal's own area
// once, before any other "powierzchni" mention — see Daszyńskiego fixture).
export function singleFlatUnitFromText(text) {
  const t = text || '';
  const aptM = /lokal\w*\s+mieszkaln\w*(?:,?\s+oznaczon\w*\s+numerem|\s+nr\.?)\s+(\d+[A-Za-z]?)/i.exec(t);
  if (!aptM) return null;
  const areaM = /o\s+powierzchni\.?\s+(\d+[,.]\d+)\s*m/i.exec(t);
  return { apt: aptM[1], area_m2: areaM ? parseArea(areaM[1]) : null };
}

// ---- land helpers ----

export function parcelFromText(text) {
  const m = /dzia[łl]k\w*\s+nr\.?\s+(\d+(?:\/\d+)?)/i.exec(text || '');
  return m ? m[1] : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\s+\d+\s+(?:Miasto\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ]*)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

// Land notices name a street with NO building number ("położona w Chodzieży
// przy ul. Kwiatowej, oznaczona w ewidencji …") — baseStreetAddress (which
// requires a trailing building number) never matches that shape, so land
// gets its own extractor: the first "przy ul(icy) <Name>" street name up to
// the next comma/stop-word, skipping the office address. NOTE: deliberately
// NOT anchored to "położon…" immediately before "przy" — the real phrasing
// inserts "w Chodzieży" between them ("położona w Chodzieży przy ul. …"), so
// anchoring on adjacency missed the match entirely (caught empirically
// against the live Kwiatowa fixture — see the test file).
// Word-count is capped ({0,2} extra words, i.e. max 3 words total) rather
// than an unbounded non-greedy scan: this document's <h1> repeats the same
// "przy ul. Kwiatowej" phrase WITHOUT a trailing comma (the title just ends
// there), so an unbounded capture ran straight through the h1/body boundary
// and swallowed the next paragraph's prose ("Kwiatowej Burmistrz Miasta
// Chodzieży ogłasza …") before finally hitting a comma. Capping the word
// count makes that first (unterminated) occurrence fail the lookahead
// entirely, so exec() falls through to the body's properly comma-terminated
// occurrence instead. (Caught empirically against the live Kwiatowa fixture.)
export function landStreetFromText(text) {
  const re =
    /przy\s+ul(?:icy)?\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*){0,2})(?=\s*[,;.]|\s+oznaczon|\s+obr[ęe]b|\s+w\s+rejonie|$)/gi;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return street;
  }
  return null;
}

// "o pow. 0,0037 ha" -> m2 (rounded), or null.
export function plotAreaFromText(text) {
  const ha = /o\s+pow(?:ierzchni)?\.?\s+(\d+[,.]\d+)\s*ha\b/i.exec(text || '');
  if (ha) {
    const v = Number(ha[1].replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  return null;
}

// ---------------------------------------------------------------------------
// parseAnnouncementPage — registry-shaped active-listing extraction
// ---------------------------------------------------------------------------

/**
 * Parse one announcement detail page into 0+ listing/land records. A single
 * notice may cover several lokale (one record per lokal, sharing the
 * notice's round/date/starting_price — the source states one combined cena
 * wywoławcza for the whole notice, not a per-lokal split).
 * @param {string} html
 * @param {string} url  absolute detail-page URL
 * @returns {Array<object>}
 */
export function parseAnnouncementPage(html, url) {
  const text = stripTags(html);
  if (!text) return [];

  const kind = classifyKind(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return [];
    const address_raw = street ? `ul. ${street}` : null;
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(text),
      area_m2: plotAreaFromText(text),
      address_raw,
      // Land street names carry no building number, so parseAddress (which
      // requires one) resolves to null here — address_raw is the usable
      // human-readable field for land; dzialka_nr is the real join key.
      address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln,
      auction_date,
      round,
      detail_url: url,
    }];
  }

  const base = baseStreetAddress(text);
  if (!base) return [];

  const units = flatUnitsFromText(text);
  if (units.length > 0) {
    return units.map(({ apt, area_m2 }) => {
      const address = parseAddress(`${base.street} ${base.building}/${apt}`);
      return {
        kind: 'mieszkalny',
        address_raw: `ul. ${base.street} ${base.building}/${apt}`,
        address,
        area_m2,
        starting_price_pln,
        auction_date,
        round,
        detail_url: url,
      };
    });
  }

  const single = singleFlatUnitFromText(text);
  const apt = single?.apt ?? null;
  const area_m2 = single?.area_m2 ?? null;
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  const address = parseAddress(addressStr);
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `ul. ${addressStr}`,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
  }];
}

// ---------------------------------------------------------------------------
// parseBoardPage — board index -> detail links
// ---------------------------------------------------------------------------

// Board pages (ogloszenia-o-przetargach.html / wyniki-przetargow.html /
// wykazy.html) render one <ul class="listastronul"> with one <li><a
// href="…" title="…">…</a></li> per item. hrefs are relative (resolved
// against the BIP's <base href="/chodziezm/" />) and may contain raw
// (non-percent-encoded) Polish diacritics — Node's fetch() percent-encodes
// those automatically, so plain string concatenation with `base` is safe.
const BOARD_LINK_RE = /<li[^>]*>\s*<a\s+href="([^"]+)"\s+title="([^"]*)"[^>]*>/gi;

/**
 * @param {string} html  board page HTML
 * @param {string} base  absolute origin+base-path to resolve relative hrefs against,
 *   e.g. "https://bip.chodziez.pl/chodziezm/"
 * @returns {Array<{ url: string, title: string }>}
 */
export function parseBoardPage(html, base) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  let m;
  BOARD_LINK_RE.lastIndex = 0;
  while ((m = BOARD_LINK_RE.exec(html)) !== null) {
    const href = m[1].trim();
    if (seen.has(href)) continue;
    seen.add(href);
    const url = /^https?:\/\//i.test(href) ? href : base + href;
    out.push({ url, title: stripTags(m[2]) });
  }
  return out;
}

// True when a "Wykazy" board title represents a genuine pre-auction
// designation that could later go to przetarg (i.e. NOT a bezprzetargowa
// tenant sale, NOT a dzierżawa/najem lease, NOT a użyczenie loan-for-use —
// all three appear on this city's Wykazy board and are explicitly out of
// scope for an auction tracker). Currently every 2026 wykaz item is one of
// those three, so this filter yields zero matches today — kept for when a
// genuine auction-track wykaz appears.
export function isWykazSaleTitle(title) {
  const t = (title || '').toLowerCase();
  if (!/wykaz/.test(t)) return false;
  if (/bezprzetargow/.test(t)) return false;
  if (/dzier[żz]aw|najem|najmu/.test(t)) return false;
  if (/u[żz]yczeni/.test(t)) return false;
  return /sprzeda/.test(t);
}

// ---------------------------------------------------------------------------
// parseResultDoc — registry contract (UNVERIFIED against a live page — see
// the file header + config.js for why)
// ---------------------------------------------------------------------------

function addressFromResultText(text) {
  const base = baseStreetAddress(text);
  if (!base) return null;
  const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s+(\d+[A-Za-z]?)/i.exec(text || '');
  const apt = aptM ? aptM[1] : null;
  return parseAddress(apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`);
}

/**
 * Parse a "wynik przetargu" notice (HTML page or its stripped text) into
 * result record(s). Template-groundtruthed only — see file header.
 * @param {string} text  raw HTML or already-stripped text
 * @param {string|null} fallbackDate  ISO date fallback (e.g. from a board/RSS pubDate)
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = /<[a-z][\s\S]*>/i.test(text) ? stripTags(text) : String(text);

  const isResultNotice =
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynik\w*\s+przetargu/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /wynikiem\s+negatywnym/i.test(t);
  if (!isResultNotice) return [];

  const kind = classifyKind(t);
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  const achievedM = /cena\s+osi[ąa]gni[ęe]ta[\s\S]{0,40}?([\d][\d.,\s]*)\s*z[łl]/i.exec(t);
  const buyerM = /nabywc[ąa][\s\S]{0,60}?zosta[łl][\s\S]{0,60}?(?:za\s+cen[ęe])?\s*([\d][\d.,\s]*)\s*z[łl]/i.exec(t);
  const achieved = achievedM ? parsePLN(achievedM[1]) : buyerM ? parsePLN(buyerM[1]) : null;

  const unsold = /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi[łl]|brak\s+(?:ofert|oferent|uczestnik|wp[łl]aty\s+wadium)/i.test(t);
  const outcome = unsold ? 'unsold' : achieved != null ? 'sold' : 'open';

  // Result-notice date phrasing — "w dniu <date> odbył się …" / "z dnia
  // <date> przeprowadzonego …" (past tense — results report what already
  // happened) — tried before the announcement-style future-tense "PRZETARG
  // ODBĘDZIE SIĘ W DNIU …" (a result notice might repeat the original
  // announcement text verbatim), then the caller's fallback (e.g. a
  // board/RSS pubDate).
  const resultDateM = /(?:w\s+dniu|z\s+dnia)\s+(\d{1,2}\s+[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})/i.exec(t);
  const auction_date = (resultDateM && parseDateText(resultDateM[1])) ?? auctionDateFromText(t) ?? fallbackDate ?? null;

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const street = landStreetFromText(t);
    if (!dzialka_nr && !street) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plotAreaFromText(t),
      address_raw: street ? `ul. ${street}` : null,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason: unsold ? 'wynik negatywny' : null,
      auction_date,
      source_pdf: sourceUrl,
    }];
  }

  const address = addressFromResultText(t);
  if (!address) return [];
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    auction_date,
    source_pdf: sourceUrl,
  }];
}
