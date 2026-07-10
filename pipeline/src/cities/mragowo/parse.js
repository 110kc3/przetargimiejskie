// Mrągowo parsers.
//
// Every notice (sale announcement AND result) is inline HTML prose in the
// article's `<div class="post-body ...">` — no PDF, no attachment. crawl.js
// strips that div to plain text (stripTags, below) and every parser here
// reads that plain text.
//
// All regexes groundtruthed against REAL articles fetched live from
// bipmragowo.warmia.mazury.pl (verified 2026-07-10):
//
//   ANNOUNCEMENT flat (round I) — article 8288:
//     "BURMISTRZ MIASTA MRĄGOWA ogłasza pierwszy przetarg ustny nieograniczony
//      na sprzedaż gminnego lokalu mieszkalnego nr 5 położonego w budynku przy
//      ul. Mrongowiusza 31 w Mrągowie ... o łącznej powierzchni użytkowej
//      35,45 m2 ... Cena wywoławcza nieruchomości lokalowej wynosi 210.000 zł
//      ... PRZETARG ODBĘDZIE SIĘ W DNIU 8 stycznia 2026 r."
//   RESULT flat UNSOLD (round I) — article 8340 (result of 8288):
//     "INFORMACJA O WYNIKU PRZETARGU ... został przeprowadzony pierwszy
//      przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5
//      położonego w budynku przy ul. Mrongowiusza 31 w Mrągowie ... Cena
//      wywoławcza nieruchomości wynosiła 210.000 zł ... Z powodu braku
//      uczestników przetarg zakończył się wynikiem negatywnym."
//   RESULT flat UNSOLD (round III, price stepped down) — article 8499:
//     same flat, "trzeci przetarg", "Cena wywoławcza nieruchomości wynosiła
//      160.000 zł ... Z powodu braku uczestników przetarg zakończył się
//      wynikiem negatywnym."
//   ANNOUNCEMENT flat (round I, 2022, different era/format) — article 6841:
//     "ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż gminnego
//      lokalu mieszkalnego nr 5 położonego w budynku przy ul. Królewieckiej 16
//      w Mrągowie ... o łącznej powierzchni użytkowej 29,2 m2 ... Cena
//      wywoławcza nieruchomości wynosi 75.000 zł."
//   ANNOUNCEMENT flat (round IV, history-recap trap) — article 8080:
//     "ogłasza czwarty przetarg ... nr 12 ... ul. Wolności 20D ... Pierwszy
//      przetarg przeprowadzono w dniu 21 października 2024 r. Drugi ...
//      17 stycznia 2025 r. Trzeci ... 8 kwietnia 2025 r. ... PRZETARG ODBĘDZIE
//      SIĘ W DNIU 24 czerwca 2025 r." — round/date must come from the
//      "ogłasza czwarty" / "ODBĘDZIE SIĘ" anchors, not the history recap.
//   RESULT flat UNSOLD (rounds I/II/IV, 3 separate reason-clause wordings) —
//     articles 7859 ("braku oferentów"), 7968 ("braku oferentów"), 8113
//     ("braku uczestników przetargu") — all for Wolności 20D/12; every reason
//     clause differs but all end "przetarg zakończył się wynikiem negatywnym".
//   ANNOUNCEMENT flat (2016, oldest-format, split use-wieczyste price) —
//     article 5099: "ogłasza II przetarg ustny nieograniczony na sprzedaż
//      wolnego lokalu mieszkalnego nr 1, położonego w budynku przy ul.
//      Mrongowiusza 75 w Mrągowie ... o powierzchni użytkowej 63,25m2 ...
//      Cena wywoławcza nieruchomości wynosi 90.000 zł (w tym: ...)."
//   LAND SOLD/UNSOLD results — articles 8545 (sold, 185 000→187 000),
//     8536 (sold, 185 000→199 800), 8544 (unsold, "braku postąpienia"), 8112
//     (sold, round II, 8 000→8 200): "Najwyższa cena osiągnięta w przetargu:
//      N złotych. Nabywcą nieruchomości został/zostali: NAME." is the shared
//      achieved-price phrase used for BOTH land and flats (same
//      rozporządzenie governs both; flat SOLD not directly observed live in
//      this research pass — every flat result found was unsold — but the
//      phrase is boilerplate mandated by the cited regulation and appears
//      verbatim, kind-independent, in every result notice read).
//   LAND ANNOUNCEMENT — article 8512: "Ogłasza I przetarg ustny nieograniczony
//      na sprzedaż prawa własności nieruchomości gruntowej niezabudowanej ...
//      przy ulicy Niedźwiedziej, oznaczonej w ewidencji gruntów obrębu nr 10
//      jako działka nr 40/10 o powierzchni 0,1001 ha ... Cena wywoławcza
//      nieruchomości wynosi 185.000 złotych ... PRZETARG ODBĘDZIE SIĘ W DNIU
//      17 lipca 2026 roku."
//
// Money is DOT-thousands with no grosze in every sample seen ("210.000 zł",
// "51.876zł", "199.800 złotych") — never spaced/NBSP-thousands like Braniewo.
// Currency word varies (zł / złotych) independent of announcement-vs-result;
// parsePLN and the price regexes below accept both.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// --------------------------------------------------------------- HTML → text

/** Collapse one article body's HTML to plain text (tags dropped, block-level
 *  tags become newlines, entities decoded). The CNT CMS renders notices as
 *  Word-exported HTML with heavy nested <span> styling — only the entities
 *  actually observed live are decoded explicitly; anything else falls back to
 *  the generic numeric-entity decoder. */
export function stripTags(html) {
  if (!html) return '';
  let s = String(html).replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d|\/ul|\/ol)\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  return s
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&oacute;/g, 'ó')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&minus;/gi, '-')
    .replace(/&plus;/gi, '+')
    .replace(/&sect;/gi, '§')
    .replace(/&quot;/gi, '"')
    .replace(/&sup2;/gi, '²')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// "210.000" / "51.876zł" / "199.800 złotych" / "160.000,00" -> integer PLN.
// Dot-thousands (the only convention seen live), optional ",NN" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{1,2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "35,45" / "63,25" / "29,2" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- title routing
//
// The board mixes sale ANNOUNCEMENTS, RESULT notices, and a lot of noise: a
// large volume of "wykaz ... w drodze bezprzetargowej na rzecz najemcy" rows
// (direct sale to the sitting tenant — NOT an open auction), pre-auction
// "wykaz" designations (no date/price yet), administrative "zarządzenie"
// orders (pierwokup decisions, czynsz rate schedules), and unrelated
// przetargi (garage/stall/kiosk rentals). These title rules only decide which
// articles are worth fetching; the body is re-confirmed in crawl.js.

/** True for an item to SKIP outright (never a municipal SALE notice). */
export function isSkippableTitle(title) {
  const s = title || '';
  return (
    /bezprzetargow/i.test(s) || // direct-to-tenant sale, not an auction
    /\bnajem\b|wynaj[ęe]|dzier[żz]aw|czynsz/i.test(s) || // lease/rental (incl. its own przetarg+wynik notices)
    /(^|\W)wykaz\b/i.test(s) || // pre-auction designation (no date/price)
    /oferta\s+inwestycyjna/i.test(s) ||
    /zarz[ąa]dzeni/i.test(s) || // administrative orders (pierwokup, warunki sprzedaży, stawki)
    /regulamin/i.test(s) ||
    /pierwokup/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /odwo[łl]ani|uniewa[żz]ni/i.test(s) ||
    /lista\s+(?:os[oó]b|zakwalifikowan)/i.test(s) ||
    /rokowani/i.test(s) ||
    /stoisk/i.test(s) || // market-stall lease results
    /wypo[żz]yczalni/i.test(s) || // equipment-rental business tender
    /stacj\w*\s+[łl]adowania/i.test(s) // EV charging station tender
  );
}

/** True when the title looks like a published RESULT notice. Mrągowo titles
 *  read "Informacja o wyniku przetargu" / "Informacja o negatywnym wyniku
 *  przetargu" (generic — no address, body is authoritative). */
export function isResultTitle(title) {
  const s = title || '';
  return /\bwynik\w*\b/i.test(s) && /przetarg/i.test(s);
}

/** True when the title looks like a municipal SALE AUCTION announcement. */
export function isAnnouncementTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal|dzia[łl]k|grunt/i.test(s);
}

// ------------------------------------------------------------------- body gates

/** Is this article body actually about a LEASE (garaż/stoisko/lokal-na-najem)
 *  rather than a SALE? A safety net behind title filtering: true when
 *  najem/wynajęcie/dzierżawa is mentioned and "sprzedaż" never is. */
export function isLeaseNotice(text) {
  const t = text || '';
  return (/\bnajem\b|wynaj[ęe]c\w*|dzier[żz]aw/i.test(t)) && !/sprzeda[żz]/i.test(t);
}

/** Is this article body a published RESULT notice? The header "INFORMACJA O
 *  (NEGATYWNYM) WYNIKU PRZETARGU" is authoritative (re-confirms/overrides
 *  title-based routing, same convention as every sibling CNT-BIP adapter). */
export function isResultNotice(text) {
  return /informacj\S*\s+o\s+(?:negatywnym\s+)?wynik/i.test(text || '');
}

// ----------------------------------------------------------------- shared fields

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};
const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral (I..XX range used here) -> int, or null if malformed. */
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

// Anchored ONLY on "ogłasza <round> przetarg" (announcements) or "został
// przeprowadzony <round> przetarg" (results) — both flat and land phrase the
// round this way. Round-recap history sentences elsewhere in the body
// ("Pierwszy przetarg przeprowadzono w dniu ...", "Drugi przetarg ...") use a
// DIFFERENT verb ("przeprowadzono" vs "został przeprowadzony") so they never
// match this anchor — the same history-sentence trap chełmno/braniewo guard
// against (see article 8080's groundtruth above).
const ROUND_ANCHOR_RE =
  /(?:og[łl]asza|zosta[łl]\s+przeprowadzony)\s+(?:([ivxl]{1,4})\b|([a-ząćęłńóśźż]+))\s+przetarg/i;

/** Auction round from the "ogłasza"/"został przeprowadzony" anchor. Returns
 *  null when unstated. Works for both flat and land text. */
export function roundFromText(text) {
  const m = ROUND_ANCHOR_RE.exec(text || '');
  if (!m) return null;
  if (m[1]) return romanToInt(m[1]);
  if (m[2]) {
    const key = m[2].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) {
      if (key.startsWith(prefix)) return val;
    }
  }
  return null;
}

/** Announcement auction date: "PRZETARG ODBĘDZIE SIĘ W DNIU 8 stycznia 2026
 *  r." (also seen "... roku", and without a space before "r."). -> ISO/null.
 *  Anchored on "odbędzie się", so a round-history recap ("Pierwszy przetarg
 *  przeprowadzono w dniu ...") can never win — different verb entirely. */
export function auctionDateFromText(text) {
  const m = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r/i.exec(
    text || '',
  );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Result-notice session date: "W dniu 8 stycznia 2026 r. w Urzędzie Miejskim
 *  w Mrągowie został przeprowadzony ...". Anchored on "w dniu ... został
 *  przeprowadzony" (not just "w dniu") so the "Podano do publicznej
 *  wiadomości na okres: od dnia .../ do dnia ..." publication-window dates
 *  (a different preposition, "od/do dnia" not "w dniu") can't win. -> ISO/null. */
export function resultDateFromText(text) {
  // The gap between the year and "został przeprowadzony" is "r."/"roku" plus
  // "w Urzędzie Miejskim w Mrągowie " (~35-40 chars) — a generous lazy window
  // skips over it without needing to explicitly delimit the r./roku token
  // (which is more fragile: it sits between two non-word characters in the
  // "r." case, so a trailing \b anchor there only resolves via backtracking).
  const m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})[\s\S]{0,60}?zosta[łl]\s+przeprowadzon/i.exec(
    text || '',
  );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Starting price: "Cena wywoławcza nieruchomości [lokalowej] wynosi[ła] N
 *  zł/złotych" — present tense in announcements, past tense ("wynosiła") in
 *  results; "lokalowej" appears for flats only. -> PLN or null. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci(?:\s+lokalowej)?\s+wynosi(?:[łl]a)?\s+(\d[\d.\s]*(?:,\d+)?)\s*z[łl]\w*/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices only): "Najwyższa cena osiągnięta w
 *  przetargu: N złotych." A numeric value => sold. No match => unsold/unstated.
 *  -> PLN or null. */
export function achievedPriceFromText(text) {
  // Wildcard word-endings (cen\w*, osi...t\w*), not a rigid case class: the
  // real phrase is nominative "Najwyższa CENA osiągnięta w przetargu: N zł"
  // (a label, not a verb object) — an earlier accusative-only ([ęe]) version
  // of this regex silently never matched, which mis-marked every SOLD result
  // as unsold. Caught live against article 8545 (Niedźwiedzia dz. 40/26,
  // sold 185 000 -> 187 000) before this file's test suite was written.
  const m = /Najwy[żz]sz\w*\s+cen\w*\s+osi[ąa]gni[ęe]t\w*\s+w\s+przetargu\s*[:\-–]?\s*(\d[\d.\s]*(?:,\d+)?)\s*z[łl]\w*/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

/** True when the result body explicitly states a negative (unsold) outcome.
 *  The reason clause varies ("braku uczestników" / "braku oferentów" /
 *  "braku postąpienia przez uczestnika") but the closing "przetarg zakończył
 *  się wynikiem negatywnym" does not — anchor on that suffix only. */
export function isNegativeOutcome(text) {
  return /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/i.test(text || '');
}

// -------------------------------------------------------------- flat address
//
// Both announcements and results share ONE clause shape for a flat:
//   "<ogłasza|został przeprowadzony> <round> przetarg ustny (nie)ograniczony
//    na sprzedaż [gminnego|wolnego] lokalu mieszkalnego nr <apt>[,]?
//    położonego w budynku przy ul. <street> <bldg> w Mrągowie"
// This single anchor gives apt+street+building in one shot and, because it
// requires "lokalu mieszkalnego", never fires on land text.

const FLAT_HEADER_RE =
  /(?:og[łl]asza|zosta[łl]\s+przeprowadzony)\s+(?:[ivxl]{1,4}|[a-ząćęłńóśźż]+)\s+przetarg\s+ustny\s+(?:nie)?ograniczony\s+na\s+sprzeda[żz]\s+(?:gminnego\s+|wolnego\s+)?lokalu\s+mieszkaln\w*\s+nr\s+(\w+)[,]?\s*po[łl]o[żz]on\w*\s+w\s+budynku\s+przy\s+ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-ZŻŹĆŁŚĄĘÓŃ.\- ]*?)\s+(\d+[A-Za-z]?)\s+w\s+Mr[ąa]gowie/i;

/** { apt, street, building } from the shared flat header clause, or null. */
export function flatHeaderFromText(text) {
  const m = FLAT_HEADER_RE.exec(text || '');
  if (!m) return null;
  return {
    apt: m[1].toUpperCase(),
    street: m[2].replace(/\s+/g, ' ').trim(),
    building: m[3].toUpperCase(),
  };
}

/** "ul. <street> <bldg>/<apt>" raw address for a flat, or null. */
export function flatAddressRawFromText(text) {
  const h = flatHeaderFromText(text);
  return h ? `ul. ${h.street} ${h.building}/${h.apt}` : null;
}

// Usable floor area of the unit: "o łącznej powierzchni użytkowej 35,45 m2" /
// "o powierzchni użytkowej 63,25m2". First match wins — the flat's own area
// always precedes any attached piwnica/wc "o powierzchni użytkowej" clause in
// every notice seen live. Result notices don't restate area at all (null).
const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of the flat, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// -------------------------------------------------------------- land address

/** Street from "przy ulicy <street>," (land's own phrasing — "ulicy", not
 *  the flat clause's "ul."). Some land notices use "na osiedlu <name>"
 *  instead, which this does not match (address_raw falls back to null,
 *  dzialka_nr still keys the record). */
export function landStreetFromText(text) {
  const m = /przy\s+ulicy\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-ZŻŹĆŁŚĄĘÓŃ.\- ]*?)(?:,|\s+oznaczon|\s+w\s+Mr[ąa]gowie|\.|;)/i.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/** obręb (cadastral precinct): "obrębu nr 10". */
export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+nr\s+(\d+)/i.exec(text || '');
  return m ? `nr ${m[1]}` : null;
}

/** Land parcel(s) + total plot area (m2): "działka nr 40/26 o powierzchni
 *  0,1008 ha". Hectares -> m2 (x10 000). */
export function landPlotFromText(text) {
  const s = String(text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  let sumHa = 0;
  const re = /dzia[łl]k\w*\s+(?:nr\s+)?(\d+(?:\/\d+)?)(?:\s+o\s+powierzchni\w*\s+(\d+[.,]\d+)\s*ha\b)?/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    parcels.add(m[1]);
    if (m[2]) sumHa += Number(m[2].replace(',', '.'));
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  const area_m2 = sumHa > 0 ? Math.round(sumHa * 10000) : null;
  return { dzialka_nr, area_m2 };
}

// ----------------------------------------------------------------------- kind

// Kind from the "na sprzedaż <asset> …" clause (the header boilerplate before
// it is generic, so classify the sale clause, not the whole head).
function kindFromText(text) {
  const m = /na\s+sprzeda[żz]\s*([\s\S]{0,300})/i.exec(text || '');
  return classifyKind(m ? m[1] : (text || '').slice(0, 300));
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT body (a flat — address-keyed — or a land parcel —
 * kind:'grunt' → land.json). Single-property: returns ONE record or null.
 * @param {string} text  stripped article body text
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const t = String(text).replace(/\r/g, '');
  const kind = kindFromText(t);
  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  if (kind === 'grunt') {
    const street = landStreetFromText(t);
    const plot = landPlotFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2, // PLOT area (m2) — land has no usable floor area
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const h = flatHeaderFromText(t);
  if (!h) return null;
  const address_raw = `ul. ${h.street} ${h.building}/${h.apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(t),
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice ("Informacja o (negatywnym) wyniku przetargu") into
 * a concluded auction record. Single-property; joins its announcement by
 * address (+ flat-no) + round in build-properties.
 *
 * @param {string} text       stripped article body text
 * @param {string|null} fallbackDate  ISO date from the crawl ref (published_date)
 * @param {string} sourceUrl  the article URL (provenance)
 * @returns {Array<object>}   0 or 1 record (array = framework interface)
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = String(text).replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(t);
  const kind = kindFromText(t);

  if (kind === 'grunt') {
    const street = landStreetFromText(t);
    const plot = landPlotFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
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
      },
    ];
  }

  const h = flatHeaderFromText(t);
  if (!h) return [];
  const address_raw = `ul. ${h.street} ${h.building}/${h.apt}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(t),
      notes,
    },
  ];
}
