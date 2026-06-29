// Nowa Sol parsers.
//
// parseIndexPage(html) -- extract flat-auction links from the paginated
//   WordPress index at nowasol.pl/przetargi[/page/N].  Collects all <li>
//   entries inside the "Aktualne przetargi:" list; each is an <a> with the
//   title text and a /przetargi/przetarg/{slug}/{YYYY-MM-DD} href.
//   Filters to lokal mieszkalny items only; returns
//     Array<{ url: string, title: string, published_date: string|null }>.
//
// parseDetailPage(html, pageUrl) -- extract structured auction data from one
//   individual listing page (the /przetargi/przetarg/... URL).
//   Parses the HTML <table> columns:
//     Lp. | KW Nr | Opis nieruchomosci | Opis lokalu |
//     Cena wywolawcza | Wadium
//   Returns an object matching the crawlActive listing contract, or null if
//   the page is not a flat-sale notice.
//
// parseResultDoc -- registry contract stub.  The achieved-price stream via
//   bip.nowasol.pl is not yet confirmed (BIP returns empty body on direct
//   fetch; likely JS-gated).  Returns [] on every call until the stream is
//   confirmed and implemented.  crawlResultDocs() likewise returns [].
//   See config.js + the spike notes for the fallback strategy.
//
// Groundtruthed against live pages fetched 2026-06-29:
//   - https://nowasol.pl/przetargi (index, page 1)
//   - https://nowasol.pl/przetargi/przetarg/...glogowskiej/25-06-2026
//   - https://nowasol.pl/przetargi/przetarg/...chrobrego/22-06-2026

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
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "105 000,00 zl" / "105000" -> integer PLN, or null.
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "35,57" / "35.57" -> float m2, or null.
export function parseArea(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Polish month-name -> number.  Both diacritic and ASCII-stripped forms.
const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// Also handle diacritics in month names
const PL_MONTHS_DIACRITIC_MAP = {
  'września': 9, 'października': 10,
};

function plMonthNum(word) {
  const lower = word.toLowerCase();
  return PL_MONTHS[lower] ?? PL_MONTHS_DIACRITIC_MAP[lower] ?? null;
}

// Parse Polish date texts:
//   "30 lipca 2026" / "30 lipca 2026 r." -> "2026-07-30"
//   "25-06-2026" / "25.06.2026" -> "2026-06-25"
export function parseDateText(s) {
  if (!s) return null;
  // Numeric: DD.MM.YYYY or DD-MM-YYYY
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  // Spelled-out: "30 lipca 2026"
  const word = /(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = plMonthNum(word[2]);
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

// Extract publication date from a URL slug ending ".../{DD-MM-YYYY}".
// e.g. "/przetargi/przetarg/.../25-06-2026" -> "2026-06-25"
export function dateFromUrl(url) {
  const m = /\/(\d{2})-(\d{2})-(\d{4})\s*$/.exec((url || '').trim());
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

// ---------------------------------------------------------------------------
// Index page parser
// ---------------------------------------------------------------------------

// The index page at nowasol.pl/przetargi renders a <ul> list under the
// "Aktualne przetargi:" heading.  Each <li> contains one <a> element whose
// href is the detail URL and whose text is the auction title.
// Below the <a> is a <span> or plain text: "Data publikacji: DD miesiaca YYYY".
//
// Live-verified structure (2026-06-29):
//   <li>
//     <a href="https://nowasol.pl/przetargi/przetarg/.../25-06-2026">
//       Przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego nr 4 ...
//     </a>
//     <span class="data">Data publikacji: 25 czerwca 2026</span>
//   </li>
//
// We filter to links whose title contains "lokal mieszkaln" (classifyKind
// returns 'mieszkalny') -- this excludes dzialki gruntowe, nieruchomosci
// zabudowane, lokale uzytkowe, etc.

const INDEX_LINK_RE = /href="(https?:\/\/nowasol\.pl\/przetargi\/przetarg\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const PUB_DATE_RE = /Data\s+publikacji\s*:\s*([^<\n]+)/i;

/**
 * Parse the przetargi index HTML and return flat-sale listing links.
 * @param {string} html
 * @returns {Array<{ url: string, title: string, published_date: string|null }>}
 */
export function parseIndexPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  let m;
  while ((m = INDEX_LINK_RE.exec(html)) !== null) {
    const url = m[1].trim();
    if (seen.has(url)) continue;
    const title = stripTags(m[2]);
    // Only flat-sale items (classifyKind returns 'mieszkalny')
    if (classifyKind(title) !== 'mieszkalny') continue;
    seen.add(url);
    // Try to extract published date from the surrounding li context.
    // Grab a window after the match, look for "Data publikacji:".
    const context = html.slice(m.index, m.index + 500);
    const dateM = PUB_DATE_RE.exec(context);
    const published_date = dateM
      ? parseDateText(dateM[1].trim())
      : dateFromUrl(url);
    out.push({ url, title, published_date });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Detail page parser
// ---------------------------------------------------------------------------

// Each individual listing page contains one HTML <table> with these columns
// (live-verified 2026-06-29, two different listings checked):
//
//   Col 0: Lp. (row number -- always 1)
//   Col 1: KW Nr (e.g. "ZG1N/00004654/2")
//   Col 2: Opis nieruchomosci -- address block:
//           "ul. Glogowska 28" / "ul. Boleslawa Chrobrego 34" + dzialka info
//   Col 3: Opis lokalu -- "lokal mieszkalny nr 4" + area, rooms, floor
//   Col 4: Cena wywolawcza -- "105 000,00 zl"  (split across DOM nodes)
//   Col 5: Wadium -- "10 000,00 zl"  (link tag contains the value)
//
// Auction date is in prose body text:
//   "Przetarg odbedzie sie 30 lipca 2026 r. o godzinie 10..."
// Round: from "Poprzednie przetargi" count in body text.
//
// NOTE on price cell splitting: the price cell renders as two DOM nodes
// "105" + "000,00 zl" joined as "105 000,00 zl" after stripTags.
// Wadium follows in the next cell with the same pattern, so we take
// the FIRST match (cena wywolawcza is always left of wadium in the table).

const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };
const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I)\b/;

function roundFromTitle(title) {
  const m = ROMAN_RE.exec((title || '').toUpperCase());
  if (m) return ROMAN_MAP[m[1]] ?? 1;
  const nm = /\b([1-9])\s+przetarg/i.exec(title || '');
  if (nm) return Number(nm[1]);
  return null; // let buildCityData derive from history
}

// Count how many previous auctions are mentioned (for round detection fallback).
// "Poprzednie przetargi na sprzedaz przedmiotowej nieruchomosci odbyly sie w dniach:"
// followed by "- DD miesiaca YYYY r." lines.
function countPreviousRounds(text) {
  const m = /Poprzednie przetargi[\s\S]*?odby[lł]y\s+si[eę]\s+w\s+dniach\s*:([\s\S]*?)(?=Wadium|Przetarg\s+odb|$)/i.exec(text);
  if (!m) return 0;
  // Count dash/en-dash lines: "- 2 marca 2026 r."
  const dashCount = (m[1].match(/[–\-]\s+\d/g) || []).length;
  return dashCount;
}

/**
 * Parse one detail listing page.
 * @param {string} html
 * @param {string} pageUrl  absolute URL (for detail_url + published_date fallback)
 * @returns {object|null}  listing record or null if not a flat-sale
 */
export function parseDetailPage(html, pageUrl) {
  if (!html) return null;

  const text = stripTags(html);

  // Gate: must be a flat-sale notice
  if (classifyKind(text) !== 'mieszkalny') return null;

  // Publication date from URL slug
  const published_date = dateFromUrl(pageUrl);

  // Title from <h2> inside <main> (second heading after "Przetargi")
  // Use lokal\w*\s+mieszkaln to match both "lokal mieszkalny" and "lokalu mieszkalnego"
  let title = '';
  const h2M = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi;
  let hm;
  while ((hm = h2M.exec(html)) !== null) {
    const t = stripTags(hm[1]);
    if (/lokal\w*\s+mieszkaln/i.test(t)) {
      title = t;
      break;
    }
  }

  // ---- Parse the structured <table> ----
  // Extract the raw <table>...</table> block
  const tableM = /<table[\s\S]*?<\/table>/i.exec(html);
  if (!tableM) return null;
  const tableText = stripTags(tableM[0]);

  // KW number: "ZG1N/00004654/2" -- alphanumeric prefix (letters+digits, e.g.
  // ZG1N, SZ1S) + slash + 5-9 digits + slash + 1+ digits.
  // [A-Z][A-Z0-9]{1,5} handles mixed letter/digit prefixes like "ZG1N".
  const kwM = /([A-Z][A-Z0-9]{1,5}\/\d{5,9}\/\d+)/.exec(tableText);
  const kw_nr = kwM ? kwM[1] : null;

  // Address: "ul. [StreetName] [BldgNo]"
  // The table "Opis nieruchomosci" column contains "ul. Glogowska 28" or
  // "ul. Boleslawa Chrobrego 34".
  const addrM = /ul\.\s+([\wÀ-ž\s.]+?\s+\d+[A-Za-z]?)(?=\s+(?:\d|nr|o\s+pow|obr[eę]b|dzia[lł]|udzia[lł]|lok|Lp\.|$))/i.exec(tableText);
  const addressRaw = addrM ? 'ul. ' + addrM[1].trim() : null;

  // Lokal number: "lokal mieszkalny nr N"
  const lokalM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(tableText);
  const localNo = lokalM ? lokalM[1] : null;

  // Build full address string for parseAddress: "StreetName BldgNo/AptNo"
  let address = null;
  if (addressRaw && localNo) {
    address = parseAddress(`${addressRaw}/${localNo}`);
  } else if (addressRaw) {
    address = parseAddress(addressRaw);
  }

  // Area m2: "35,57 m" / "51,94" in the Opis lokalu cell
  // The table text has fragments like "35,57 m" (the superscript "2" is often stripped)
  const areaM = /(\d+[,.]\d+)\s*m/.exec(tableText);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  // Cena wywolawcza: look for a number followed by "000,00" pattern.
  // The price cell renders split: "105" + "000,00 zl" in two DOM nodes, joined
  // as "105 000,00 zl" after stripTags. Wadium (the next table cell) has the
  // same pattern, so take the FIRST match only -- cena wywolawcza always appears
  // before wadium in the column order (col 4 before col 5).
  const priceM = /(\d[\d\s]*)000,00/i.exec(tableText);
  let starting_price_pln = null;
  if (priceM) {
    starting_price_pln = parsePLN(priceM[1].replace(/\s/g, '') + '000');
  }

  // Auction date: "Przetarg odbedzie sie 30 lipca 2026 r."
  const auctionRe = /Przetarg\s+odb[eę]dzie\s+si[eę]\s+(\d{1,2}\s+[a-zA-ZÀ-ž]+\s+\d{4})/i;
  const auctionM = auctionRe.exec(text);
  const auction_date = auctionM ? parseDateText(auctionM[1]) : null;

  // Round: from title ("I przetarg", "II przetarg"), or from previous-rounds count + 1
  let round = roundFromTitle(title);
  if (round == null) {
    const prev = countPreviousRounds(text);
    if (prev > 0) round = prev + 1;
  }

  return {
    kind: 'mieszkalny',
    title,
    kw_nr: kw_nr ?? null,
    address_raw: addressRaw ?? title,
    address,
    area_m2: area_m2 ?? null,
    round: round ?? null,
    starting_price_pln: starting_price_pln ?? null,
    auction_date,
    published_date,
    detail_url: pageUrl,
  };
}

// ---------------------------------------------------------------------------
// parseResultDoc -- registry contract stub
// ---------------------------------------------------------------------------
// The achieved-price stream via bip.nowasol.pl could not be confirmed live
// (BIP returns empty body -- likely JS-gated).  This function is a stub that
// returns [] on every call.  crawlResultDocs() also returns [].
//
// To implement: when the BIP becomes accessible or result notices appear as
// separate "informacja o wyniku" posts on nowasol.pl/przetargi, implement:
//   1. A crawlResultDocs() that scans the same index for result posts, OR
//      fetches bip.nowasol.pl/przetargi.html with a headless pass.
//   2. parseResultDoc below, following the standard Polish template
//      (see brzeg/parse.js for a proven reference implementation).
//
// NOTE: Confirm on first live CI refresh whether result notices appear in
// the WordPress /przetargi listing (title containing "informacja o wyniku"
// or "wynik przetargu").

/**
  * Parse a "Informacja o wynikach przetargu" text.
 * STUB -- returns [] until the result stream is confirmed.
 * @param {string} _text
 * @param {string|null} _fallbackDate
 * @param {string} _sourceUrl
 * @returns {Array}
 */
export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
