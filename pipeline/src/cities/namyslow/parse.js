// Namysłów (ZAN) parsers.
//
// The board (zan-namyslow.pl/przetargi/) is a WordPress/Divi post list. Each
// article has a title link + a short "post-meta" line (author | published
// date | categories). Flat-sale posts and unrelated notices (procurement
// RFQs, garage-rental przetargi, building-renovation tenders + their award
// notices) share the SAME board/category — parseBoardPage extracts every
// post; isFlatSaleTitle (title-only, classifyKind + lease guard) is the
// filter crawl.js applies before ever fetching a detail page.
//
// Each detail page's <div class="entry-content"> holds the FULL notice as
// plain <p>/<br> prose (no table), e.g. (real fixture, live 2026-07-10,
// https://zan-namyslow.pl/iv-publiczny-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-jana-pawla-ii-5a-2-w-namyslowie/):
//
//   ZARZĄD ZAKŁADU ADMINISTRACJI NIERUCHOMOŚCI „ZAN” SPÓŁKA Z OGRANICZONĄ
//   ODPOWIEDZIALNOŚCIĄ ogłasza IV publiczny przetarg ustny nieograniczony na
//   sprzedaż lokalu mieszkalnego nr 2 o powierzchni użytkowej 60,12 m2
//   stanowiącego własność „ZAN” Sp. z o. o. w Namysłowie położonego przy ul.
//   Jana Pawła II 5A w Namysłowie. cena wywoławcza – 160.000,00 zł. [...]
//   Dla przedmiotowego lokalu Sąd Rejonowy w Kluczborku Wydział IV Ksiąg
//   Wieczystych prowadzi księgę wieczystą nr OP1U/00069839/1. [...]
//   Przetarg odbędzie się w dniu 30 lipca 2026r. o godz. 11:00 [...]
//
// plus two PDF links: "Ogłoszenie o przetargu" (the born-digital backup of
// the SAME prose — used as a fallback when the inline parse is incomplete,
// via crawl.js + core/pdf-text.js) and "Regulamin sprzedaży" (sale rules —
// never parsed).
//
// QUIRK (groundtruthed live, not a transcription error): the inline HTML for
// the round IV post literally reads "ogłasza I V publiczny przetarg" — a
// stray space inside the Roman numeral itself (the PDF backup does NOT have
// this quirk: "IV publiczny przetarg"). roundFromText tolerates optional
// whitespace between Roman-numeral letters for this reason.
//
// Two other real fixtures (also live 2026-07-10) confirm the pattern holds
// across posts:
//   III publiczny przetarg [...] lokalu mieszkalnego nr 8 o powierzchni
//     użytkowej wraz z powierzchnią przynależną 38,11 m2 [...] położonego
//     przy ul. Bohaterów Warszawy 7 w Namysłowie. cena wywoławcza –
//     105.000,00 zł. [...] księgę wieczystą nr OP1U/00086457/4.
//   III publiczny przetarg [...] lokalu mieszkalnego nr 2 [...] ul. Jana
//     Pawła II 5A w Namysłowie [...] 160.000,00 zł [...] w dniu 12 czerwca
//     2026r. — the ROUND-III predecessor of the 5A/2 flat above (still
//     published, past-dated: the round that failed and led to round IV).

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

// "160.000,00 zł" / "105.000,00" / "70000" -> integer PLN, or null.
// ZAN uses dot-thousands + comma-grosze ("160.000,00 zł"); this also
// tolerates plain space-thousands defensively.
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// "60,12" / "38.11" -> float m2, or null.
export function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const PL_MONTH_ABBR = {
  sty: 1, lut: 2, mar: 3, kwi: 4, maj: 5, cze: 6,
  lip: 7, sie: 8, wrz: 9, 'paź': 10, paz: 10, lis: 11, gru: 12,
};

// ---------------------------------------------------------------------------
// Roman numeral round
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

/**
 * Auction round, anchored on "ogłasza <ROMAN> [publiczny] przetarg" so it
 * can't be confused by any other Roman numeral in the notice (e.g. "Wydział
 * IV Ksiąg Wieczystych"). Tolerates an internal space inside the numeral
 * itself (the real "I V" quirk documented in the file header) via the
 * `(?:\s*[IVXL])` repetition, stripped before conversion.
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  const m = /og[łl]asza\s+([IVXL](?:\s*[IVXL]){0,4})\s+(?:publiczny\s+)?przetarg/i.exec(text || '');
  if (!m) return null;
  return romanToInt(m[1].replace(/\s+/g, ''));
}

/**
 * Round from a post TITLE ("II publiczny przetarg ustny nieograniczony na
 * sprzedaż lokalu mieszkalnego nr 9 przy ul. Armii Krajowej 4 w Namysłowie"),
 * anchored at the start. Used as a fallback in parseDetailPage: a handful of
 * older posts (real fixture: the Armii Krajowej 4/9 announcement, live
 * 2026-07-10) render their opening paragraph — "ZARZĄD ... ogłasza II
 * publiczny przetarg ..." — with CSS/manual letter-spacing baked into the
 * text ("o g ł a s z a I I p u b l i c z n y ..."), which defeats
 * roundFromText's literal "ogłasza"/"przetarg" anchors even though the rest
 * of the notice (address/area/price/date) parses normally. The <h1> title is
 * never letter-spaced on any fixture seen, so it's a safe fallback source.
 * @param {string} title
 * @returns {number|null}
 */
export function roundFromTitle(title) {
  const m = /^\s*([IVXL](?:\s*[IVXL]){0,4})\s+publiczny\s+przetarg/i.exec(title || '');
  return m ? romanToInt(m[1].replace(/\s+/g, '')) : null;
}

// ---------------------------------------------------------------------------
// Auction date
// ---------------------------------------------------------------------------

/**
 * "Przetarg odbędzie się w dniu 30 lipca 2026r. o godz. 11:00" -> ISO date.
 * Anchored on "odbędzie się w dniu" (future tense) so it can't match a past
 * "poprzedni przetarg odbył się ..." sentence (ZAN notices don't currently
 * carry that history sentence, but the anchor is kept precise regardless).
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTHS[m[2].toLowerCase()];
  return mo ? iso(m[3], mo, m[1]) : null;
}

/** Board "post-meta" published date: "cze 15, 2026" -> "2026-06-15". */
export function parsePublishedShort(s) {
  const m = /([a-ząćęłńóśźż]{3})\s+(\d{1,2}),\s*(\d{4})/i.exec(s || '');
  if (!m) return null;
  const mo = PL_MONTH_ABBR[m[1].toLowerCase()];
  return mo ? iso(m[3], mo, m[2]) : null;
}

// ---------------------------------------------------------------------------
// Price / area / KW / address fields
// ---------------------------------------------------------------------------

/** "cena wywoławcza – 160.000,00 zł." -> 160000. Exact nominative wording
 *  ("cena wywoławcza", not the wadium clause's genitive "ceny wywoławczej")
 *  so the 10%-wadium sentence is never matched. */
export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\s*[–‒\-:]?\s*(\d[\d.,\s]*)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Usable floor area: "o powierzchni użytkowej [wraz z powierzchnią
 *  przynależną] 60,12 m2" -> 60.12. The bounded gap tolerates the optional
 *  "wraz z ..." clause seen on some posts (e.g. Boh. Warszawy 7/8). */
export function areaM2FromText(text) {
  const m = /powierzchni\s+u[żz]ytkow\w*[\s\S]{0,60}?(\d+[.,]\d+)\s*m\s*[²2]/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

/** "księgę wieczystą nr OP1U/00069839/1" -> "OP1U/00069839/1". */
export function kwNumberFromText(text) {
  const m = /ksi[ęe]g[ęe]\s+wieczyst[ąa]\s+nr\.?\s*([A-Z0-9]+\/\d+\/\d+)/i.exec(text || '');
  return m ? m[1] : null;
}

/** Apartment/unit number: "lokalu mieszkalnego nr 2" -> "2" (also "nr 1A"). */
export function aptFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? m[1] : null;
}

/** "<street> <bldg>" from "położonego przy ul. Jana Pawła II 5A w
 *  Namysłowie" -> "Jana Pawła II 5A". Anchored on "położon... przy" so the
 *  earlier "... w Namysłowie" (ZAN's own registered-seat mention) can't be
 *  matched instead of the property's. */
export function streetBuildingFromText(text) {
  const m = /po[łl]o[żz]on\w*\s+przy\s+(?:ul\.?\s*)?(.+?)\s+w\s+Namys[łl]owie/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').replace(/[,.;]+$/, '').trim() || null;
}

// ---------------------------------------------------------------------------
// Combined notice-text parser (works on inline-HTML text OR pdfText output)
// ---------------------------------------------------------------------------

/**
 * Parse one flat-sale notice's plain-text prose into a listing record, or
 * null if it doesn't look like a (still-parseable) flat-sale announcement.
 * Shared by parseDetailPage (inline HTML) and the PDF fallback in crawl.js —
 * both hand this the SAME kind of already-tag-stripped text.
 * @param {string} text
 * @returns {object|null}
 */
export function parseNoticeText(text) {
  if (!text) return null;
  if (classifyKind(text) !== 'mieszkalny') return null; // defense in depth vs a title-filter miss

  const apt = aptFromText(text);
  const streetBuilding = streetBuildingFromText(text);
  if (!apt || !streetBuilding) return null;

  const address_raw = `${streetBuilding}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaM2FromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text),
    kw_nr: kwNumberFromText(text),
  };
}

// ---------------------------------------------------------------------------
// Board (index) page parser
// ---------------------------------------------------------------------------

/** True when a rentals-not-sales title slips past classifyKind's 'mieszkalny'
 *  bucket (classifyKind only tells kind, not sale-vs-lease transaction type).
 *  Not currently needed for any live ZAN flat post, but kept as the cheap
 *  guard ADAPTER-GUIDE calls for. */
const LEASE_RE = /\bnajem\b|dzier[żz]aw|wynajem/i;

/**
 * True when a board-post TITLE looks like a flat-SALE announcement worth
 * fetching. classifyKind('lokal mieszkalny...') separates flat sales from
 * garage rentals ('garaz'), procurement/renovation notices ('zabudowana' or
 * 'unknown' — "budynku mieszkalnego" is a BUILDING, not a flat), and land.
 * @param {string} title
 * @returns {boolean}
 */
export function isFlatSaleTitle(title) {
  if (!title) return false;
  if (LEASE_RE.test(title)) return false;
  return classifyKind(title) === 'mieszkalny';
}

/**
 * Parse one zan-namyslow.pl/przetargi/[page/N/] board page into post refs.
 * @param {string} html
 * @returns {Array<{url:string, title:string, published_date:string|null}>}
 */
export function parseBoardPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const artRe = /<article\s+id="post-\d+"\s+class="et_pb_post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let am;
  while ((am = artRe.exec(html)) !== null) {
    const block = am[1];
    const linkM = /<h2 class="entry-title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/i.exec(block);
    if (!linkM) continue;
    const url = linkM[1].trim();
    if (seen.has(url)) continue;
    seen.add(url);
    const title = stripTags(linkM[2]);
    const pubM = /<span class="published">([^<]+)<\/span>/i.exec(block);
    const published_date = pubM ? parsePublishedShort(pubM[1]) : null;
    out.push({ url, title, published_date });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Detail page parser
// ---------------------------------------------------------------------------

// Bounded by the single <article>...</article> that wraps the whole detail
// post (WordPress/Divi single-post template) — a generous, reliable bound
// that also happens to sweep in the sidebar search/archive widgets living
// inside the SAME entry-content div on this theme; harmless, since every
// field regex here is anchored on specific notice phrases those widgets
// never contain (groundtruthed live 2026-07-10).
function entryContentBlock(html) {
  const m = /<div class="entry-content">([\s\S]*?)<\/article>/i.exec(html);
  return m ? m[1] : html;
}

// PDF links inside the entry-content block: [{url, text}], in document order.
function pdfLinksFromBlock(block) {
  const out = [];
  const re = /<a href="([^"]+\.pdf)"[^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi;
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push({ url: m[1], text: stripTags(m[2]) });
  }
  return out;
}

// The post <h1> title, sitting OUTSIDE entry-content (post header) — used
// only as the roundFromTitle fallback source (see roundFromTitle's doc).
function titleFromHtml(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  return m ? stripTags(m[1]) : null;
}

/**
 * Parse one ZAN detail page (a single /przetargi/ post permalink).
 * @param {string} html
 * @param {string} pageUrl
 * @returns {object|null}  listing record (+ detail_url, detail_pdf), or null
 */
export function parseDetailPage(html, pageUrl) {
  if (!html) return null;
  const block = entryContentBlock(html);
  const text = stripTags(block);
  const rec = parseNoticeText(text);
  if (!rec) return null;

  // A handful of older posts letter-space their opening paragraph, which
  // defeats roundFromText's "ogłasza ... przetarg" anchor even though the
  // rest of the notice parses fine — fall back to the (never letter-spaced)
  // <h1> title. See roundFromTitle's doc for the real fixture that needs this.
  const round = rec.round ?? roundFromTitle(titleFromHtml(html));

  const pdfs = pdfLinksFromBlock(block);
  const detail_pdf =
    pdfs.find((p) => /og[łl]oszeni/i.test(p.text))?.url ??
    pdfs.find((p) => !/regulamin/i.test(p.text))?.url ??
    null;

  return { ...rec, round, detail_url: pageUrl, detail_pdf };
}

// ---------------------------------------------------------------------------
// parseResultDoc — registry contract stub
// ---------------------------------------------------------------------------
// ZAN publishes no dedicated flat-sale RESULTS board (its "zawiadomienie o
// wyborze oferty" posts are renovation-contractor procurement awards, not
// flat outcomes — see spikes/opolskie/powiat-namyslowski/namyslow.md §4).
// crawlResultDocs() (crawl.js) returns [] and this is never actually called;
// it exists to satisfy the adapter contract. Revisit if ZAN ever posts a
// "wynik przetargu" notice for a flat on this board.

/**
 * @param {string} _text
 * @param {string|null} _fallbackDate
 * @param {string} _sourceUrl
 * @returns {Array}
 */
export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
