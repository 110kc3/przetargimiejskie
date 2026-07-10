// Pułtusk parsers.
//
// pultusk.pl (WordPress/Gutenberg) publishes every przetarg notice as ONE
// post whose body is: an intro paragraph/heading (address/parcel + KW nr),
// then a Gutenberg `<table>` with the actual figures (cena wywoławcza,
// wadium, area, ...), then legal boilerplate. Column layout is NOT fixed —
// it varies by notice (a flat table has an "Opis lokalu" column carrying the
// area; a land table has "Powierzchnia ha[ łącznie]" + "Godzina przetargu"
// [+ sometimes a trailing "Decyzja o warunkach zabudowy" column]) — so every
// column is located by matching its HEADER cell text, never by a fixed
// index (findPricedTable/findCol below).
//
// Real fixtures (all fetched live from pultusk.pl 2026-07-10):
//
//   FLAT pending (round III): https://pultusk.pl/ogloszenie-z-dnia-26-03-2026-r/
//     "OGŁOSZENIE z dnia 26.03.2026 r. BURMISTRZ MIASTA PUŁTUSK OGŁASZA III
//     PRZETARG USTNY NIEOGRANICZONY" — ul. Na Skarpie 3/25, 73,00 m²,
//     300 000,00 zł / wadium 30 000,00 zł, przetarg 05.05.2026, KW
//     OS1U/00044602/6. QUIRK: this post's round (III) is stated ONLY in the
//     TITLE — unlike the land fixtures below, the body never restates
//     "ogłasza ... przetarg" (it opens directly with "Na sprzedaż lokalu
//     mieszkalnego..."), so roundFromText needs the title fallback exactly
//     like namyslow's roundFromTitle pattern (see parseFlatAnnouncement).
//     Two PRIOR rounds are named in the boilerplate ("Przeprowadzone w
//     dniach 25.11.2025 r. i 24.02.2026 r. ... zakończyły się wynikiem
//     negatywnym"), independently corroborating round 3.
//
//   LAND pending (round I, obręb 20): https://pultusk.pl/ogloszenie-o-i-przetargu/
//     "OGŁOSZENIE O I PRZETARGACH" — 3-row table, ONE parcel per row (58/18,
//     58/19, 58/20), a 7th "Decyzja o warunkach zabudowy" column this table
//     has that the obręb-28 table (below) doesn't, price cells carry an
//     inline "zł" suffix + `&nbsp;` thousands separator ("262 000,00 zł").
//
//   LAND pending (round III, obręb 28): https://pultusk.pl/ogloszenie-o-iii-przetargach/
//     "OGŁOSZENIE O III PRZETARGACH" — 2-row table, TWO parcels bundled per
//     row ("122/6 121/5" / "122/7 120/5" — one shared price/wadium per
//     bundle, not per parcel), 6 columns (no decyzja column), price cells
//     are BARE numbers with no "zł" suffix ("105 000,00"). Round is stated
//     in an <h1> inside the body ("BURMISTRZ MIASTA PUŁTUSK OGŁASZA III
//     PRZETARGI..."), unlike the flat fixture. Two prior negative rounds
//     named (03.03.2026, 21.04.2026) — the SAME two parcel-bundles at
//     PROGRESSIVELY LOWER prices each round (223 860→150 000→105 000 for
//     122/6+121/5) — real fixtures for round I
//     (https://pultusk.pl/sprzedaz-nieruchomosci-niezabudowanych-polozonych-w-obrebie-28-w-pultusku-ogloszenie/,
//     "Burmistrz Miasta Pułtusk ogłasza I PRZETARGI..." as a body PARAGRAPH,
//     not an <h1> — a 3rd real title/structure shape) and round II
//     (https://pultusk.pl/ii-przetargi-ustne-w-pultusku-nieruchomosci-gminne-na-sprzedaz/)
//     both fetched live and used in tests too, to groundtruth round
//     extraction across all 3 real body shapes + the dedupe-to-latest-round
//     behaviour in crawl.js.
//
//   LEASE (must be skipped): https://pultusk.pl/nabor-wnioskow-o-najem-lokalu-mieszkalnego-w-budynku-przy-al-tysiaclecia-2a/
//     "Nabór wniosków o najem lokalu mieszkalnego w budynku przy Al.
//     Tysiąclecia 2A" — an application-window notice for a MUNICIPAL LEASE,
//     not a sale (classifyKind alone would read 'mieszkalny' since it never
//     encodes sale-vs-lease — isLeaseTitle is the explicit guard, same
//     pattern as namyslow's LEASE_RE / naklo's isLease).
//
//   WYKAZ (excluded — no scheduled date, contract allows wykaz: []):
//     https://pultusk.pl/wykaz-nieruchomosci-przeznaczonej-do-sprzedazy-polozonej-w-miejscowosci-glowno/
//     carries a price but NO auction date/round (pre-auction designation
//     only) — isWykazTitle excludes every "WYKAZ ..." post up front.
//
//   RESULTS: searched live 2026-07-10 ("informacja o wyniku") — 0 relevant
//   hits (the 3 raw hits are unrelated city communications, not przetarg
//   results). No achieved-price stream exists on pultusk.pl today — matches
//   the spike. parseResultDoc is a registry-contract stub; crawlResultDocs
//   (crawl.js) returns [].

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "300 000,00" / "262 000,00 zł" / "105 000,00" -> integer PLN, or null.
// Pułtusk uses (regular/NBSP-already-spaced) space thousands + comma grosze,
// with an inline "zł" suffix on SOME tables (obręb 20) but not others (obręb
// 28) — the optional suffix is stripped before the numeric parse either way.
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).trim().replace(/z[łl]\.?\s*$/i, '').trim();
  cleaned = cleaned.replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "73,00" / "0,0953" -> float, or null.
export function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "0,0953 ha" -> 953 (m²). Land tables state area in hectares. */
export function haToM2(cellText) {
  const m = /(\d+[.,]\d+)\s*ha/i.exec(cellText || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Round (Roman numeral in an "ogłasza <N> przetarg(i)" clause, an "O <N>
// PRZETARGACH" title, a "<N> przetargi ..." title-start, or a word ordinal)
// ---------------------------------------------------------------------------

const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50 };

/** Roman numeral -> int, or null if malformed / out of the sane 1-39 range. */
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VAL[up[i]];
    const next = ROMAN_VAL[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

const WORD_ORDINAL = { pierwsz: 1, drugi: 2, trzeci: 3, czwart: 4, piat: 5, 'piąt': 5 };

/**
 * Auction/przetarg round. Tried in order against the given text:
 *   1. "ogłasza <ROMAN> przetarg(i)" — the body <h1>/paragraph opener (land
 *      fixtures: obręb 20 round I, obręb 28 rounds I-III).
 *   2. "O <ROMAN> PRZETARGACH" — the "OGŁOSZENIE O III PRZETARGACH"-style
 *      title (also matches "ogłasza ... o ..." mid-sentence defensively).
 *   3. "<ROMAN> przetarg..." at the very start (a bare "II Przetarg Ustny
 *      Nieograniczony ..." teaser title).
 *   4. a word ordinal ("pierwszy/drugi/trzeci/... przetarg") anywhere.
 * Callers try the post BODY first, then the TITLE as a fallback (the flat
 * round-III fixture states its round ONLY in the title — see file header).
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  if (!text) return null;
  const t = String(text);
  let m = /og[łl]asza\s+([IVXL]{1,4})\s+przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /\bo\s+([IVXL]{1,4})\s+przetarg\w*/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /^\s*([IVXL]{1,4})\s+przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /(pierwsz\w*|drugi\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+przetarg/i.exec(t);
  if (m) {
    const key = m[1].toLowerCase();
    for (const [pfx, n] of Object.entries(WORD_ORDINAL)) if (key.startsWith(pfx)) return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auction date — "odbędzie się w dniu DD.MM.YYYY" (flat) / "przeprowadzone
// zostaną [w dniu] DD.MM.YYYY" (land; the "w dniu" is present on some
// notices, absent on others — both real, see file header). A third, shorter
// announcement shape puts the date BEFORE "odbędzie się" instead of after it
// ("... w dniu 25.11.2025 r. o godz. 10:00 ... odbędzie się pierwszy
// przetarg..." — real fixture, https://pultusk.pl/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-na-skarpie-3-2/,
// the round-I predecessor of the Na Skarpie 3/25 flat; this particular post
// carries no price table so it never reaches parseFlatAnnouncement, but the
// date phrasing is real and worth handling). The third pattern's gap uses
// `[\s\S]` (ANY char, including the "godz." period) rather than `[^\d]` —
// a `[^.]`-style gap would break on that literal period.
// ---------------------------------------------------------------------------

export function auctionDateFromText(text) {
  const t = String(text || '');
  let m = /odb[ęe]dzie\s+si[ęe][^\d]{0,20}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return iso(m[3], m[2], m[1]);
  m = /przeprowadzon\w*\s+zostan[ąa][^\d]{0,20}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return iso(m[3], m[2], m[1]);
  m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})[\s\S]{0,90}?odb[ęe]dzie\s+si[ęe]/i.exec(t);
  if (m) return iso(m[3], m[2], m[1]);
  return null;
}

// ---------------------------------------------------------------------------
// KW (księga wieczysta) number — "księgę wieczystą nr X" (flat intro) OR the
// abbreviated "KW nr X" (land intro). NB: explicit ę/ą character classes,
// NOT a \w* suffix — Polish diacritics (ę, ą, ł, ż, ...) are NOT `\w` in a
// plain (non-/u) JS regex, so "księg\w*\s+wieczyst\w*" silently fails to
// match "księgę wieczystą" (found + fixed live during this build: \w* can't
// consume the trailing ę/ą, then the following \s+ has no whitespace to
// match yet). Mirrors namyslow's kwNumberFromText for the same reason.
// ---------------------------------------------------------------------------

export function kwNumberFromText(text) {
  const m = /(?:ksi[ęe]g[ęe]\s+wieczyst[ąa]\s+nr\.?|KW\s+nr\.?)\s*([A-Za-z0-9]+\/\d+\/\d+)/i.exec(text || '');
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Land: obręb (cadastral precinct) number — "położonych w obrębie 28 miasta
// Pułtusk" -> "28".
// ---------------------------------------------------------------------------

export function obrebFromText(text) {
  const m = /w\s+obr[ęe]bie\s+(\S+)\s+miasta\s+Pu[łl]tusk/i.exec(text || '');
  return m ? m[1].replace(/[,.]$/, '') : null;
}

// ---------------------------------------------------------------------------
// Flat: apartment number + street/building
// ---------------------------------------------------------------------------

/** "lokalu mieszkalnego nr 25" -> "25". */
export function aptFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? m[1] : null;
}

/** "przy ulicy Na Skarpie 3 w Pułtusku" -> "Na Skarpie 3". Anchored on the
 *  "... w Pułtusku" tail so it can't run past the actual street+building. */
export function streetBuildingFromText(text) {
  const m = /przy\s+(?:ulicy|ul\.?)\s+(.+?)\s+w\s+Pu[łl]tusku/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').replace(/[,.;]+$/, '').trim() || null;
}

/** Usable floor area from the flat table's "Opis lokalu" cell: "Lokal
 *  mieszkalny o powierzchni 73,00 m2, mieści się ..." -> 73. (No "użytkowej"
 *  qualifier on this source, unlike namyslow/naklo — "powierzchni" alone.) */
export function areaFromDescCell(cellText) {
  const m = /powierzchni\s+(\d+[.,]\d+)\s*m\s*[²2]/i.exec(cellText || '');
  return m ? parseArea(m[1]) : null;
}

// ---------------------------------------------------------------------------
// Land: parcel numbers from a table cell — "122/6 121/5" (space-separated,
// bundled under one shared price/wadium) or a single "58/18".
// ---------------------------------------------------------------------------

export function parcelsFromCell(cellText) {
  const out = [];
  const re = /\d+\/\d+/g;
  let m;
  while ((m = re.exec(cellText || '')) !== null) out.push(m[0]);
  return out;
}

// ---------------------------------------------------------------------------
// Title guards (checked BEFORE any field parsing — cheap, avoids ever
// mis-slotting a lease/wykaz post as a scheduled sale)
// ---------------------------------------------------------------------------

/** True for a lease/rental notice ("Nabór wniosków o najem ..."). Sale-vs-
 *  lease isn't something classifyKind encodes, so this is an explicit guard
 *  — same convention as namyslow's LEASE_RE / naklo's isLease. */
export function isLeaseTitle(title) {
  return /najem|dzier[żz]aw|wynaj/i.test(title || '');
}

/** True for a "WYKAZ NIERUCHOMOŚCI ..." pre-auction designation — no
 *  scheduled date/round, so it never becomes a crawlActive listing/land
 *  record (contract explicitly allows wykaz: [] for this city). */
export function isWykazTitle(title) {
  return /^\s*wykaz\b/i.test(title || '');
}

// ---------------------------------------------------------------------------
// Table extraction (regex-based — no DOM parser dependency in this repo)
// ---------------------------------------------------------------------------

/** Every `<table>` in the HTML as an array of rows, each row an array of
 *  tag-stripped cell strings. Row 0 of a table is its header. */
export function extractTables(html) {
  const tables = [];
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;
  while ((tm = tableRe.exec(html || '')) !== null) {
    const rows = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(tm[1])) !== null) {
      const cells = [];
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cm;
      while ((cm = cellRe.exec(rm[1])) !== null) cells.push(stripTags(cm[1]));
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

function findCol(header, re) {
  return header.findIndex((h) => re.test(h));
}

/**
 * The first table whose header row has a "Cena wywoławcza" column — the
 * standard Pułtusk przetarg table (flat OR land; every OTHER column varies
 * by notice, see file header, so callers locate their own columns by name
 * via findCol on the returned header).
 * @param {string} html
 * @returns {{header:string[], dataRows:string[][], priceCol:number, wadiumCol:number}|null}
 */
export function findPricedTable(html) {
  const tables = extractTables(html);
  for (const rows of tables) {
    const header = rows[0] || [];
    const priceCol = findCol(header, /cena\s+wywo[łl]awcza/i);
    if (priceCol === -1) continue;
    return { header, dataRows: rows.slice(1), priceCol, wadiumCol: findCol(header, /wadium/i) };
  }
  return null;
}

/** Tag-stripped text of everything BEFORE the first `<table>` — the intro
 *  heading/paragraph(s) that carry the flat's apt/street/KW or the land's
 *  obręb/KW (the table itself holds the per-row figures). */
function introText(html) {
  const idx = (html || '').search(/<table[\s>]/i);
  const head = idx === -1 ? html : String(html).slice(0, idx);
  return stripTags(head);
}

/** First `.pdf` link in the post body — the (scanned, see config.js) mirror
 *  kept only for provenance (`detail_pdf`), never text-extracted. */
function pdfLinkFromHtml(html) {
  const m = /<a[^>]+href="([^"]+\.pdf)"/i.exec(html || '');
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Flat announcement
// ---------------------------------------------------------------------------

/**
 * Parse one flat-sale post into a listing record, or null.
 * @param {{title:string, content:string, date:string, link:string}} post
 * @returns {object|null}
 */
export function parseFlatAnnouncement(post) {
  if (!post) return null;
  const title = stripTags(post.title || '');
  const content = post.content || '';
  const intro = introText(content);
  const bodyText = stripTags(content);

  const table = findPricedTable(content);
  if (!table) return null;
  const descCol = findCol(table.header, /opis\s+lokalu/i);
  if (descCol === -1) return null; // not a flat-shaped table (land has no "Opis lokalu")
  const row = table.dataRows[0];
  if (!row) return null;

  const apt = aptFromText(intro);
  const streetBuilding = streetBuildingFromText(intro);
  if (!apt || !streetBuilding) return null;

  const address_raw = `${streetBuilding}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const starting_price_pln = parsePLN(row[table.priceCol]);
  if (starting_price_pln == null) return null; // no real price -> teaser post, not the full notice

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaFromDescCell(row[descCol]),
    starting_price_pln,
    wadium_pln: table.wadiumCol !== -1 ? parsePLN(row[table.wadiumCol]) : null,
    auction_date: auctionDateFromText(bodyText),
    round: roundFromText(intro) ?? roundFromText(title),
    kw_nr: kwNumberFromText(intro),
    published_date: (post.date || '').slice(0, 10) || null,
    detail_url: post.link || null,
    detail_pdf: pdfLinkFromHtml(content),
  };
}

// ---------------------------------------------------------------------------
// Land announcement(s) — one table can bundle several parcel-rows, each its
// own land.json record (kind: 'grunt', parcel-keyed via dzialka_nr)
// ---------------------------------------------------------------------------

/**
 * Parse one land-sale post into 0+ land records (one per priced table row).
 * @param {{title:string, content:string, date:string, link:string}} post
 * @returns {object[]}
 */
export function parseLandAnnouncements(post) {
  if (!post) return [];
  const title = stripTags(post.title || '');
  const content = post.content || '';
  const intro = introText(content);
  const bodyText = stripTags(content);

  const table = findPricedTable(content);
  if (!table) return [];
  const parcelCol = findCol(table.header, /nr\s*ewid|dzia[łl]ek|oznaczenie/i);
  if (parcelCol === -1) return [];
  const areaCol = findCol(table.header, /powierzchni/i);

  const obreb = obrebFromText(intro);
  const address_raw = obreb ? `obręb ${obreb} m. Pułtusk` : null;
  const auction_date = auctionDateFromText(bodyText);
  const round = roundFromText(intro) ?? roundFromText(title);
  const kw_nr = kwNumberFromText(intro);
  const published_date = (post.date || '').slice(0, 10) || null;
  const detail_pdf = pdfLinkFromHtml(content);

  const out = [];
  for (const row of table.dataRows) {
    const parcels = parcelsFromCell(row[parcelCol]);
    if (!parcels.length) continue;
    const starting_price_pln = parsePLN(row[table.priceCol]);
    if (starting_price_pln == null) continue; // no real price -> skip this row
    out.push({
      kind: 'grunt',
      dzialka_nr: parcels.join(', '),
      area_m2: areaCol !== -1 ? haToM2(row[areaCol]) : null,
      address_raw,
      starting_price_pln,
      wadium_pln: table.wadiumCol !== -1 ? parsePLN(row[table.wadiumCol]) : null,
      auction_date,
      round,
      kw_nr,
      published_date,
      detail_url: post.link || null,
      detail_pdf,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Top-level dispatcher — used by crawl.js. Routes on title guards then
// classifyKind of the full (title + body) text; a land post can yield
// several records, a flat post at most one, anything else [].
// ---------------------------------------------------------------------------

/**
 * @param {{title:string, content:string, date:string, link:string}} post
 * @returns {object[]}
 */
export function parseAnnouncementPost(post) {
  if (!post) return [];
  const title = stripTags(post.title || '');
  if (isWykazTitle(title)) return [];
  if (isLeaseTitle(title)) return [];

  const kind = classifyKind(`${title} ${stripTags(post.content || '')}`);
  if (kind === 'mieszkalny') {
    const rec = parseFlatAnnouncement(post);
    return rec ? [rec] : [];
  }
  if (kind === 'grunt') {
    return parseLandAnnouncements(post);
  }
  return [];
}

// ---------------------------------------------------------------------------
// parseResultDoc — registry contract stub (see file header: no results stream)
// ---------------------------------------------------------------------------

/**
 * @param {string} _text
 * @param {string|null} _fallbackDate
 * @param {string} _sourceUrl
 * @returns {Array}
 */
export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
