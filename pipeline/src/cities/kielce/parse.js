// Kielce parsers.
//
// Two roles:
//
//   1. parseListPage — extracts announcement items from a board listing page.
//      Kielce's SmartSite CMS emits a server-rendered <ul> of <li> items where
//      EVERY field (round, address, apt number, area) lives in the <h2><a> title.
//      There is no inline price or auction date on the listing — those live in
//      the PDF/DOCX attachments on the detail page. We extract what we can from
//      the title, which is enough to identify flats and key them by address.
//
//   2. parseResultDoc — extracts auction outcome from a DOCX result notice
//      ("Informacja o wyniku przetargu"). The DOCX body (converted by
//      core/doc-text.js) contains:
//        - auction date (from the preamble "przeprowadzonego dnia DD ..."),
//        - what was sold (address, parcel, area),
//        - "Cena wywoławcza: N zł"
//        - "Najwyższa cena osiągnięta w przetargu: N zł" (achieved price)
//        - "Nabywcą ... został ustalony: ..."  (buyer, confirms positive outcome)
//        - or "przetarg zakończył się wynikiem negatywnym" for unsold.
//
// Groundtruthed on live fixtures (2026-06-27):
//   - Board page 1 of bipum.kielce.eu (10 items, 2 flat auctions confirmed)
//   - DOCX: /resource/9092/informacja+o+wyniku+przetargu+Orl%C4%85t+Lwowskich.docx
//     (land auction result, but same DOCX template as flat results)
//
// NOTE: the Orląt Lwowskich result DOCX is a *land* sale (działka gruntowa
// niezabudowana). Flat result DOCXes follow the identical template. The parser
// handles both; crawlResultDocs() filters for flat-related result pages by title.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- helpers ----------------------------------------------------------------

const PL_MONTHS = {
  stycznia: 1, styczen: 1,
  lutego: 2, luty: 2,
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

function normPL(s) {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ł/g, 'l').replace(/ń/g, 'n');
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "2 300 000,00 zł" / "85.000,00 zł" / "85000" → integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr).replace(/\s/g, '');
  // Detect dot-thousands vs decimal separator by looking at what follows the last separator:
  // if last separator is "," with exactly 2 digits after, treat "." as thousands.
  const commaDecimal = /^[\d.]+,\d{2}$/.test(s);
  if (commaDecimal) {
    return Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) | 0;
  }
  const digits = s.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "18,21" / "18.21" → 18.21
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripHtmlTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

// Polish ordinal → round number. Matches "pierwsz/drug/trzeci..." preceding or
// following "przetarg" in the title or body. History-clause guard: skip ordinals
// followed by past-tense verbs "odbył/zakończył".
const ORDINAL_RE =
  /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,40}))/g;
const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };
// Roman numerals before "przetarg" in the title ("II przetarg", "III przetarg")
const ROMAN_PRE_RE = /\b(II{0,3}|IV|VI?I?I?|IX|X)\s+przetarg/i;
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const t = (text || '');
  // Roman numeral prefix first (common in Kielce titles: "o II przetargu", "o III przetargu")
  const rm = ROMAN_PRE_RE.exec(t);
  if (rm) {
    const r = ROMAN_MAP[rm[1].toUpperCase()];
    if (r) return r;
  }
  ORDINAL_RE.lastIndex = 0;
  let m;
  while ((m = ORDINAL_RE.exec(t)) !== null) {
    if (/\b(?:odby[łl]|zako[ńn]czy[łl])/.test(m[2] || '')) continue; // history clause
    const stem = normPL(m[1]).replace(/[\wąćęłńóśźż]+$/, '');
    for (const [key, val] of Object.entries(ORDINALS)) {
      if (normPL(m[1]).startsWith(key)) return val;
    }
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

// ---- title parsing ----------------------------------------------------------
//
// Kielce titles follow a consistent template:
//   "Ogłoszenie Prezydenta Miasta Kielce o [trzecim] przetargu ustnym
//    nieograniczonym na sprzedaż lokalu mieszkalnego, oznaczonego numerem 11,
//    położonego w budynku przy ul. Dąbrowskiej 5 w Kielcach, o powierzchni
//    użytkowej 18,21 m2 wraz z udziałem w nieruchomości wspólnej."
//
//   "Ogłoszenie Prezydenta Miasta Kielce o II przetargu ustnym nieograniczonym
//    na sprzedaż lokalu mieszkalnego, oznaczonego numerem 20, położonego w
//    budynku przy ul. Dąbrowskiej 5 w Kielcach, o powierzchni użytkowej 21,19m2
//    wraz z udziałem w nieruchomości wspólnej."
//
// Fields extractable from the title:
//   - round: ordinal word or Roman numeral before "przetargu"
//   - apt number: "numerem <N>" (the apartment number within the building)
//   - street + building: "przy ul. <street> <bldg>"
//   - area: "powierzchni użytkowej <N> m2"
//   - kind: "lokalu mieszkalnego" → mieszkalny

/** Extract apt number from "numerem 11" / "numerem 20" in the title. */
function aptFromTitle(title) {
  const m = /numerem\s+(\d+[A-Za-z]?)/i.exec(title || '');
  return m ? m[1] : null;
}

/** Extract usable area from "powierzchni użytkowej 18,21 m2" / "21,19m2". */
export function areaFromTitle(title) {
  const m = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?([\d]+[.,][\d]+)\s*m/i.exec(title || '');
  if (m) return parseArea(m[1]);
  // Fallback: first standalone "<N,NN> m2" token
  const fb = /([\d]+[.,][\d]+)\s*m\s*2/i.exec(title || '');
  return fb ? parseArea(fb[1]) : null;
}

/** Extract street + building from "przy ul. <Street> <bldg> w Kielcach". */
function addressFromTitle(title, aptOverride) {
  // "przy ul. Dąbrowskiej 5 w Kielcach" → street=Dąbrowskiej bldg=5
  const m = /przy\s+(?:ul|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^,\n]+?)\s+(\d+[A-Za-z]?)\s+w\s+Kielcach/i.exec(title || '');
  if (!m) return null;
  const street = m[1].trim();
  const bldg = m[2];
  const apt = aptOverride || null;
  const raw = `ul. ${street} ${bldg}${apt ? '/' + apt : ''}`;
  return parseAddress(raw);
}

// ---- list-page parser -------------------------------------------------------

/**
 * Parse one SmartSite BIP listing page HTML into announcement items.
 * Each item is a <li class="component-item"> with a <h2><a href="...">TITLE</a></h2>
 * and a <div class="news-date">Data publikacji: DD.MM.YYYY ...</div>.
 * We keep only items whose title signals a flat auction.
 *
 * @param {string} html raw HTML of a board listing page
 * @param {string} [base] base URL for resolving relative hrefs (default: BOARD_BASE)
 * @returns {Array<{title:string, detail_url:string, published_date:string|null, kind:string, round:number|null, area_m2:number|null, address:object|null, address_raw:string|null}>}
 */
export function parseListPage(html, base = 'https://bipum.kielce.eu') {
  const out = [];
  // Split on <li class="component-item"
  const itemRe = /<li[^>]*class="[^"]*component-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const li = m[1];
    // Extract the <h2><a href="...">TITLE</a></h2>
    const linkM = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    if (!linkM) continue;

    let href = linkM[1].replace(/&amp;/gi, '&');
    const titleRaw = stripHtmlTags(linkM[2]);

    // Resolve relative URLs
    if (href.startsWith('/')) href = base + href;

    // Filter: must be a flat sale announcement.
    // "lokal mieszkalny" in the title is the reliable discriminator per the spike.
    const kind = classifyKind(titleRaw);
    if (kind !== 'mieszkalny') continue;
    // Also skip result notices on the same board ("Informacja o wyniku")
    if (/informacja\s+o\s+wyniku/i.test(titleRaw)) continue;

    // Published date from "Data publikacji: DD.MM.YYYY"
    const dateM = /Data\s+publikacji:\s*(\d{2})\.(\d{2})\.(\d{4})/i.exec(li);
    const published_date = dateM ? iso(dateM[3], dateM[2], dateM[1]) : null;

    const round = roundFromText(titleRaw);
    const area_m2 = areaFromTitle(titleRaw);
    const apt = aptFromTitle(titleRaw);
    const address = addressFromTitle(titleRaw, apt);
    const address_raw = address
      ? `ul. ${address.street} ${address.building}${apt ? '/' + apt : ''}`
      : null;

    out.push({
      title: titleRaw,
      detail_url: href,
      published_date,
      kind,
      round,
      area_m2,
      address,
      address_raw,
    });
  }
  return out;
}

// ---- result-page title filter -----------------------------------------------

/**
 * True when a listing-page title is a result notice ("Informacja o wyniku").
 * Used by crawl.js to route the detail page to parseResultDoc instead of
 * treating it as an active listing.
 */
export function isResultNoticeTitle(title) {
  return /informacja\s+o\s+wyniku\s+przetargu/i.test(title || '');
}

// ---- attachment URL extraction from a detail page --------------------------

/**
 * Extract DOCX (preferred) or PDF attachment URL from a detail page's HTML.
 * SmartSite renders attachments as:
 *   <a href="/resource/<id>/<filename>.docx" ...>label</a>
 *   <a href="/resource/<id>/<filename>.pdf" ...>label</a>
 * For result pages: prefer DOCX (has the structured outcome data); fall back to PDF.
 *
 * @param {string} html detail page HTML
 * @param {string} [base] base URL (default: bipum.kielce.eu)
 * @returns {string|null} absolute URL or null
 */
export function attachmentUrlFromDetail(html, base = 'https://bipum.kielce.eu') {
  if (!html) return null;
  // Prefer DOCX (result notices) — same pattern as Bytom
  const docx = /href="([^"]+\.docx(?:\?[^"]*)?)"/i.exec(html);
  if (docx) {
    const u = docx[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  // Fall back to PDF (any href ending in .pdf — SmartSite uses /resource/<id>/<name>.pdf)
  const pdf = /href="([^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html);
  if (pdf) {
    const u = pdf[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  return null;
}

// ---- result DOCX parser -----------------------------------------------------
//
// Groundtruthed on /resource/9092/informacja+o+wyniku+przetargu+Orl%C4%85t+Lwowskich.docx
// (land sale, same template as flat results). The DOCX body (after unzip XML
// extraction) produces text like:
//
//   INFORMACJA O WYNIKU PRZETARGU
//   ustnego nieograniczonego, przeprowadzonego dnia 28 czerwca 2022 r. w Urzędzie ...
//   ... położonej w Kielcach przy ulicy Orląt Lwowskich, ... o pow. 0,3571 ha, ...
//   Cena wywoławcza:   2 300 000,00 zł
//   Najwyższa cena osiągnięta w przetargu:   3 250 000,00 zł
//   Nabywcą nieruchomości został ustalony: PB CHAŁUPKA 2 ...
//
// For flat results the address pattern will be:
//   "... lokalu mieszkalnego ... przy ul. Dąbrowskiej 5/11 ..."
//   or spelled out: "... nr 11 ... przy ulicy Dąbrowskiej 5 ..."
//
// NOTE: Kielce result DOCXes do NOT state the round number in the preamble —
// it must be inferred from context (crawl.js passes the round from the list page).

/** True when the extracted DOCX text is a Kielce result notice. */
export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIKU\s+PRZETARGU/i.test(text || '');
}

/** Auction date from "przeprowadzonego dnia DD <month> YYYY r." */
export function auctionDateFromResultText(text) {
  if (!text) return null;
  // "przeprowadzonego dnia 28 czerwca 2022 r."
  const spM = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (spM) {
    const mo = PL_MONTHS[normPL(spM[2])];
    if (mo) return iso(spM[3], mo, spM[1]);
  }
  // Numeric fallback "DD.MM.YYYY r."
  const numM = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  return null;
}

/** Starting price from "Cena wywoławcza: N zł" in result DOCX. */
export function startingPriceFromResultText(text) {
  if (!text) return null;
  const m = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price from "Najwyższa cena osiągnięta w przetargu: N zł". */
export function achievedPriceFromResultText(text) {
  if (!text) return null;
  const m = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/** True when the result was negative (no buyer). */
function isNegativeOutcome(text) {
  return /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy/i.test(text || '');
}

/** Address from result DOCX body.
 *  Pattern: "przy ul. Dąbrowskiej 5/11" or "przy ulicy Dąbrowskiej 5 ... nr 11"
 *  or just "przy ul. <street> <bldg>" when no apt is in the body (we then use
 *  the fallback address passed in from the crawl context). */
export function addressFromResultText(text) {
  if (!text) return null;
  // "przy ul. Dąbrowskiej 5/11" — street + building/apt
  const m = /przy\s+(?:ul|ulicy|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^,\n]{2,60}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?/i.exec(text);
  if (!m) return null;
  const apt = m[3] || null;
  return parseAddress(`ul. ${m[1].trim()} ${m[2]}${apt ? '/' + apt : ''}`);
}

/**
 * Parse one result DOCX text into a concluded auction record.
 * @param {string} text  extracted DOCX text (from core/doc-text.js)
 * @param {string|null} fallbackDate  ISO date (passed from crawl context if text has no date)
 * @param {string} sourceUrl  the /resource/... URL (provenance)
 * @returns {Array<{auction_date, source_pdf, kind, address_raw, address, round, starting_price_pln, final_price_pln, outcome, unsold_reason, area_m2, notes}>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');

  const notes = [];
  const auctionDate = auctionDateFromResultText(t) || fallbackDate || null;
  const starting_price_pln = startingPriceFromResultText(t);
  const final_price_pln = achievedPriceFromResultText(t);
  const negative = isNegativeOutcome(t) || (!final_price_pln && !/nabywc/i.test(t));

  const address = addressFromResultText(t);
  if (!address) notes.push('parse: address not found in result text');

  const kind = classifyKind(t);

  // Area from "pow. N,NN m2" or "o pow. N,NNNN ha" (for flat results only the m² form matters)
  const areaM = /(?:lokalu|mieszkaln\w+)[^.]{0,60}?(\d+[,.]\d+)\s*m\s*[²2]/i.exec(t)
    || /o\s+powierzchni\s+u[żz]ytkow\w*\s+([\d]+[,.]\d+)\s*m/i.exec(t);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  const addressRaw = address ? `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}` : null;

  return [{
    auction_date: auctionDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addressRaw,
    address,
    round: null, // Kielce result DOCXes don't state the round — inferred from history
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: negative ? null : (final_price_pln ?? null),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2,
    notes,
  }];
}
