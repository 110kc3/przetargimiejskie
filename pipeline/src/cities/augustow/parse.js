// Augustów parsers.
//
// Two roles:
//
//   1. parseListPage — extracts announcement items from a SmartSite BIP board
//      listing page (both ogloszenia-aktualne and ogloszenia-nieaktualne boards).
//      Each item is a <li class="component-item clearfix"> with:
//        - <h2><a href="..." title="FULL TITLE">...</a></h2>
//        - <div class="component-excerpt"><div class="component-date-add">YYYY-MM-DD HH:MM:SS</div>
//      We keep only items whose title signals a flat auction (kind='mieszkalny')
//      and skip result notices. Flat titles follow:
//        "Burmistrz Miasta Augustowa ogłasza [N-ty] przetarg ustny nieograniczony
//         na sprzedaż nieruchomości … (lokal mieszkalny Nr 1 i Nr 3)"
//      or single-flat variants:
//        "Burmistrz Miasta Augustowa ogłasza [N-ty] przetarg ustny nieograniczony
//         na sprzedaż lokalu mieszkalnego nr …"
//      Area and starting price are NOT in the list title — they live in the body
//      of the detail page (or in the PDF). Round IS extractable from the title.
//
//   2. parseResultDoc — extracts auction outcome from a result notice PDF
//      ("Informacja o wynikach…"). The PDF (converted by core/pdf-text.js)
//      contains:
//        - auction date (heading: "PRZEPROWADZONEGO W DNIU DD.MM.YYYY R.")
//        - what was sold (address, lokal nr, area)
//        - "CENA WYWOŁAWCZA: N ZŁ" (sometimes "Cena wywoławcza: N zł")
//        - "NAJWYŻSZA CENA OSIĄGNIĘTA W PRZETARGU: N ZŁ" (achieved price)
//        - "NABYWCĄ … ZOSTAŁA USTALONA/USTALONY: …" (confirms positive outcome)
//        - or "PRZETARG ZAKOŃCZYŁ SIĘ WYNIKIEM NEGATYWNYM" for unsold
//
// Groundtruthed on live fixtures (2026-06-29):
//   ANNOUNCEMENT: bip.um.augustow.pl/przetargi/…/ogloszenia-nieaktualne/
//     burmistrz-miasta-augustowa-oglasza-pierwszy-przetarg-ustny-nieograniczony-
//     na-sprzedaz-nieruchomosci-polozonych-w-augustowie-przy-rynku-zygmunta-
//     augusta-16-lokal-mieszkalny-nr-1-i-nr-3-4.html
//     (two flats: lok.1 @ 62.87 m², 280 700 PLN; lok.3 @ 46.05 m², 217 500 PLN)
//   RESULT NOTICE: bip.um.augustow.pl/przetargi/…/ogloszenia-nieaktualne/
//     informacja-o-wynikach-pierwszego-przetargu-nieograniczonego-na-sprzedaz-
//     lokalu-mieszkalnego-nr-1-polozonego-przy-rynku-zygmunta-augusta-16-w-augustowie.html
//     (PDF attachment: /resource/26697/Infromacja+o+wynikach+-+lokal+Nr+1.pdf)
//     Heading only: "PRZEPROWADZONEGO W DNIU 09.09.2024 R." — price in PDF.

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

// "280 700,00 zł" / "280.700,00" / "280700" → integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr).replace(/\s/g, '');
  const commaDecimal = /^[\d.]+,\d{2}$/.test(s);
  if (commaDecimal) {
    return Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) | 0;
  }
  const digits = s.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "62,87" / "62.87" → 62.87
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripHtmlTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

// Polish ordinal before/after "przetarg". Matches "pierwszy/drug/trzeci/czwart/piąt"
// forms. Skips ordinals followed by past-tense "odbył/zakończył" (history clause
// in re-listed announcements). Roman numeral prefix also supported.
const ORDINAL_RE =
  /\b(pierwsz(?!e[nn])|drug|trzeci|czwart|pi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,40}))/g;
const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };
const ROMAN_PRE_RE = /\b(II{0,3}|IV|VI?I?I?|IX|X)\s+przetarg/i;
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const t = (text || '');
  const rm = ROMAN_PRE_RE.exec(t);
  if (rm) {
    const r = ROMAN_MAP[rm[1].toUpperCase()];
    if (r) return r;
  }
  ORDINAL_RE.lastIndex = 0;
  let m;
  while ((m = ORDINAL_RE.exec(t)) !== null) {
    if (/\b(?:odby[łl]|zako[ńn]czy[łl])/.test(m[2] || '')) continue;
    for (const [key, val] of Object.entries(ORDINALS)) {
      if (normPL(m[1]).startsWith(normPL(key))) return val;
    }
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

// ---- list-page parser -------------------------------------------------------

/**
 * Parse one SmartSite BIP listing page HTML into announcement items.
 * Each item is a <li class="component-item clearfix"> with:
 *   <h2><a href="..." title="FULL TITLE">...</a></h2>
 *   <div class="component-excerpt">
 *     <div class="component-date-add">YYYY-MM-DD HH:MM:SS</div>
 *
 * We keep only items whose title signals a flat auction (kind='mieszkalny')
 * and skip result notices ("Informacja o wynikach").
 *
 * @param {string} html raw HTML of a board listing page
 * @param {string} [base] base URL for resolving relative hrefs
 * @returns {Array<{title,detail_url,published_date,kind,round}>}
 */
export function parseListPage(html, base = 'https://bip.um.augustow.pl') {
  const out = [];
  const itemRe = /<li[^>]*class="[^"]*component-item[^"]*clearfix[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const li = m[1];

    // Extract <h2><a href="..." title="..."> — prefer `title` attribute (full title
    // without truncation), fall back to link text.
    const linkM = /<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"(?:[^>]*title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    if (!linkM) continue;

    let href = linkM[1].replace(/&amp;/gi, '&');
    const titleRaw = stripHtmlTags(linkM[2] || linkM[3]);

    if (href.startsWith('/')) href = base + href;

    // Filter: must be a flat sale announcement.
    const kind = classifyKind(titleRaw);
    if (kind !== 'mieszkalny') continue;

    // Skip result notices that also mention "lokal mieszkalny" in their title.
    if (/informacja\s+o\s+wynikach/i.test(titleRaw)) continue;

    // Published date from "component-date-add" div: "YYYY-MM-DD HH:MM:SS"
    const dateM = /<div[^>]*class="[^"]*component-date-add[^"]*"[^>]*>(\d{4}-\d{2}-\d{2})/.exec(li);
    const published_date = dateM ? dateM[1] : null;

    const round = roundFromText(titleRaw);

    out.push({
      title: titleRaw,
      detail_url: href,
      published_date,
      kind,
      round,
    });
  }
  return out;
}

// ---- result-page title filter -----------------------------------------------

/**
 * True when a listing-page title is a result notice.
 * Augustów result titles: "Informacja o wynikach [N-tego] przetargu … lokal mieszkalny …"
 */
export function isResultNoticeTitle(title) {
  return /informacja\s+o\s+wynikach/i.test(title || '');
}

// ---- announcement detail-page parser ----------------------------------------
//
// The list title carries NO address/area/price for Augustów flat announcements —
// those live in the detail page BODY (server-rendered HTML, no PDF needed). The
// body follows a numbered per-lokal template:
//
//   BURMISTRZ MIASTA AUGUSTOWA ogłasza [ordinal] przetarg ustny nieograniczony
//   na sprzedaż nieruchomości położonych w Augustowie, przy Rynku Zygmunta Augusta 16:
//     1) lokal mieszkalny Nr 1 [o|o pow.] 62,87 m kw, … Cena wywoławcza 280 700,00 zł. …
//     2) lokal mieszkalny Nr 3 [o|o pow.] 46,05 m kw, … Cena wywoławcza 217 500,00 zł. …
//   Przetarg odbędzie się dnia 09 września 2024 r. …
//
// So ONE announcement expands into N flat records (one per lokal), each keyed to a
// distinct apt (Nr) so two flats in one building never collide. Groundtruthed on
// four live fixtures (2017/2023/2024, 2–3 lokale each) 2026-07-09.

function htmlToText(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Base street + building from the announcement header
 * "…na sprzedaż nieruchomości położonych w Augustowie, przy Rynku Zygmunta Augusta 16:".
 * Handles "przy Rynku <Name> <bldg>" (Rynek genitive → nominative) and
 * "przy [ul.] <Street> <bldg>". Returns { streetPrefix, building } or null.
 */
export function announcementBaseAddress(text) {
  if (!text) return null;
  const m = /przy\s+(Rynku?\s+[A-ZŻŹĆŁŚĄĘÓŃ][^\n,:(]{2,50}?|(?:ul\.?\s+)?[A-ZŻŹĆŁŚĄĘÓŃ][^\n,:(]{2,50}?)\s+(\d+[A-Za-z]?)\s*[:(,]/i.exec(text);
  if (!m) return null;
  let street = m[1].trim().replace(/^Rynku\b/i, 'Rynek');
  if (!/^(rynek|ul\.|al\.|pl\.|os\.|plac|rynek)/i.test(street)) street = 'ul. ' + street;
  return { streetPrefix: street, building: m[2] };
}

/** Auction date from "Przetarg odbędzie się dnia DD <month> YYYY r." (spelled-out
 *  or numeric "DD.MM.YYYY"). */
export function auctionDateFromAnnouncementText(text) {
  if (!text) return null;
  const numM = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  const wordM = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[normPL(wordM[2])];
    if (mo) return iso(wordM[3], mo, wordM[1]);
  }
  return null;
}

/**
 * Parse an announcement detail page into per-lokal flat records.
 * @param {string} html   raw detail-page HTML
 * @param {{detail_url?:string, published_date?:string, round?:number|null, kind?:string}} [ctx]
 *   context carried from the list page (round/date fall back to body-parsed values)
 * @returns {Array<{kind,address,address_raw,auction_date,published_date,round,area_m2,starting_price_pln,detail_url}>}
 */
export function parseAnnouncementDetail(html, ctx = {}) {
  const text = htmlToText(html);
  const base = announcementBaseAddress(text);
  if (!base) return [];

  const auction_date = auctionDateFromAnnouncementText(text);
  const round = ctx.round ?? roundFromText(text);
  const kind = ctx.kind || 'mieszkalny';
  const detail_url = ctx.detail_url || null;
  const published_date = ctx.published_date || null;

  const out = [];
  // Per-lokal block: "lokal mieszkalny Nr N [o|o pow.] AREA m kw". The piwnica
  // ("piwnicą Nr N o pow. 3,87 m kw") does NOT start with "lokal mieszkaln", so it
  // is never captured as a flat.
  const blockRe = /lokal\s+mieszkaln\w*\s+Nr\s+(\d+[A-Za-z]?)\s+o\s+(?:pow\.?\s*)?(\d+[,.]\d+)\s*m\s*(?:kw|[²2])/gi;
  const hits = [];
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    hits.push({ apt: m[1], area: m[2], idx: m.index });
  }
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].idx : hits[i].idx + 600;
    const seg = text.slice(hits[i].idx, end);
    const pm = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(seg);
    const address = parseAddress(`${base.streetPrefix} ${base.building}/${hits[i].apt}`);
    if (!address) continue;
    out.push({
      kind,
      address,
      address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
      auction_date,
      published_date,
      round: round ?? null,
      area_m2: parseArea(hits[i].area),
      starting_price_pln: pm ? parsePLN(pm[1]) : null,
      detail_url,
    });
  }

  // Single-flat announcement with no numbered list → one record from the body.
  if (out.length === 0) {
    const address = parseAddress(`${base.streetPrefix} ${base.building}`);
    if (address) {
      out.push({
        kind,
        address,
        address_raw: `${address.street} ${address.building}`,
        auction_date,
        published_date,
        round: round ?? null,
        area_m2: areaFromResultText(text),
        starting_price_pln: startingPriceFromResultText(text),
        detail_url,
      });
    }
  }
  return out;
}

// ---- attachment URL extraction from a detail page --------------------------

/**
 * Extract PDF (preferred) or DOCX attachment URL from a detail page HTML.
 * SmartSite Augustów renders:
 *   <a href="/resource/<id>/<filename>.pdf" ...>label</a>
 * Result notices carry a single PDF with the outcome data.
 *
 * @param {string} html detail page HTML
 * @param {string} [base] base URL
 * @returns {string|null} absolute URL or null
 */
export function attachmentUrlFromDetail(html, base = 'https://bip.um.augustow.pl') {
  if (!html) return null;
  // Prefer PDF — Augustów result notices always attach a PDF
  const pdf = /href="([^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html);
  if (pdf) {
    const u = pdf[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  // Fall back to DOCX (future-proofing)
  const docx = /href="([^"]+\.docx?(?:\?[^"]*)?)"/i.exec(html);
  if (docx) {
    const u = docx[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  return null;
}

// ---- result PDF parser ------------------------------------------------------
//
// Groundtruthed heading seen on live page (2026-06-29), PDF not yet fetched.
// The PDF body follows the standard Polish ogłoszenie template for result notices:
//
//   INFORMACJA O WYNIKACH [N-TEGO] PRZETARGU USTNEGO NIEOGRANICZONEGO
//   OGŁOSZONEGO PRZEZ BURMISTRZA MIASTA AUGUSTOWA
//   PRZEPROWADZONEGO W DNIU 09.09.2024 R.   ← auction date
//   W URZĘDZIE MIEJSKIM W AUGUSTOWIE
//   NA SPRZEDAŻ LOKALU MIESZKALNEGO NR 1
//   POŁOŻONEGO PRZY RYNKU ZYGMUNTA AUGUSTA 16
//
//   [participation counts, area, KW number]
//
//   Cena wywoławcza:  280 700,00 zł
//   Najwyższa cena osiągnięta w przetargu:  295 000,00 zł
//   Nabywcą nieruchomości został ustalony: Jan Kowalski …
//
// If unsold:
//   Przetarg zakończył się wynikiem negatywnym.
//
// NOTE: The HTML heading itself already states the date ("PRZEPROWADZONEGO W DNIU
// DD.MM.YYYY R."), so even if PDF extraction fails we can fall back to the
// fallbackDate passed by the crawler (scraped from the page body).

/** True when text is a result notice (PDF or heading text). */
export function isResultNotice(text) {
  return /informacja\s+o\s+wynikach[\s\S]{0,80}przetarg/i.test(text || '');
}

/** Auction date from "PRZEPROWADZONEGO W DNIU DD.MM.YYYY R." (uppercase) or
 *  "przeprowadzonego dnia DD <month> YYYY r." (mixed/lowercase). */
export function auctionDateFromResultText(text) {
  if (!text) return null;
  // Numeric: "09.09.2024 R." or "09.09.2024 r."
  const numM = /przeprowadzon\w*\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text)
    || /przeprowadzon\w*\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  // Spelled-out month: "przeprowadzonego dnia 9 września 2024 r."
  const wordM = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[normPL(wordM[2])];
    if (mo) return iso(wordM[3], mo, wordM[1]);
  }
  return null;
}

/** Starting price from "Cena wywoławcza: N zł" (any case). */
export function startingPriceFromResultText(text) {
  if (!text) return null;
  const m = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price from "Najwyższa cena osiągnięta w przetargu: N zł" (any case). */
export function achievedPriceFromResultText(text) {
  if (!text) return null;
  const m = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

/** True when the result was negative (no buyer). */
function isNegativeOutcome(text) {
  return /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy/i.test(text || '');
}

/** Address from result PDF body.
 *  Typical patterns:
 *    "przy Rynku Zygmunta Augusta 16" (Rynek = Rynek, no ul. prefix)
 *    "przy ul. Polnej 4"
 *    "lokal … nr 1 … przy Rynku Zygmunta Augusta 16"
 *  Returns null if no building number found. */
export function addressFromResultText(text) {
  if (!text) return null;
  // "przy ul./al./pl./os. <Street> <bldg>" (with optional apt "/N")
  const m1 = /przy\s+(?:ul|ulicy|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^,\n]{2,60}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?(?:\s|,|$)/i.exec(text);
  if (m1) {
    const apt = m1[3] || null;
    return parseAddress(`ul. ${m1[1].trim()} ${m1[2]}${apt ? '/' + apt : ''}`);
  }
  // "przy Rynku <Name> <bldg>" — Rynek (market square) without ul. prefix
  const m2 = /przy\s+(Rynku?\s+[A-ZŻŹĆŁŚĄĘÓŃ][^\n,]{2,50}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?(?:\s|,|$)/i.exec(text);
  if (m2) {
    const apt = m2[3] || null;
    return parseAddress(`${m2[1].trim()} ${m2[2]}${apt ? '/' + apt : ''}`);
  }
  return null;
}

/** Area from result PDF: "lokal … o pow. 62,87 m kw" or "62,87 m²". */
export function areaFromResultText(text) {
  if (!text) return null;
  const m = /(?:lokal|mieszkaln)[^.]{0,80}?(\d+[,.]\d+)\s*m\s*(?:[²2kw]|kw)/i.exec(text)
    || /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?([\d]+[,.]\d+)\s*m/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

/**
 * Parse one result PDF text into a concluded auction record.
 * @param {string} text  extracted PDF text (from core/pdf-text.js)
 * @param {string|null} fallbackDate  ISO date (from crawl context)
 * @param {string} sourceUrl  the /resource/... PDF URL (provenance)
 * @returns {Array<object>}
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
  const area_m2 = areaFromResultText(t);

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  const addressRaw = address
    ? `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`
    : null;

  return [{
    auction_date: auctionDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addressRaw,
    address,
    round: roundFromText(t),
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: negative ? null : (final_price_pln ?? null),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2: area_m2 ?? null,
    notes,
  }];
}
