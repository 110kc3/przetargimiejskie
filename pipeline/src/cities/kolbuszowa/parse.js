// Kolbuszowa parsers — Pro3W CMS town BIP `bip.kolbuszowa.pl`.
//
// Two input shapes:
//   1. ANNOUNCEMENT (inline HTML) — one "/63-przetargi/<cat>/<id>-…-ustny-
//      przetarg…" detail page. Fields are server-rendered prose inside
//      <div class="art-body clearfix"> … <div id="akapitBody">…</div>, with the
//      attachment list split off into a trailing <!--ZALACZNIKI--> block.
//      parseAnnouncement() extracts them. Groundtruthed live (2026-07-12) on the
//      2022 flat (ul. Targowej 8) and 2025 flat (ul. Kolejowej 12) plus a 2026
//      land plot (Kupno).
//   2. RESULT (OCR text) — the "Informacja o wyniku przetargu" / "Wynik
//      przetargu" scanned PDF attached to a concluded flat's own detail page,
//      run through core/ocr-pdf.js (tesseract -l pol). parseResultDoc() extracts
//      the achieved price / buyer / outcome. Groundtruthed on the real fresh-OCR
//      output of the 2021 / 2022 / 2025 flat results (all SOLD).
//
// KIND is decided by core/classifyKind on the document body+title, NEVER the URL
// slug (the slug mangles addresses — e.g. "…pilsudskiego-610…" is really
// "Piłsudskiego 6/10"). Order in classifyKind makes "lokal mieszkalny" win over
// the "działka" (land share) that every flat notice also mentions.
//
// FIELD GRAMMAR (Kolbuszowa-specific, confirmed live — differs from the wolow
// analog it was cloned from):
//   - price:  "Cena wywoławcza nieruchomości wynosi 102 990,00 złotych brutto"
//             (spelled "złotych", space-thousands) — the result PDF drops
//             "wynosi" and uses an em-dash: "Cena wywoławcza … — 102 990,00 …".
//   - final:  "Najwyższa cena osiągnięta w przetargu — 172 000,00 złotych".
//   - date:   SPELLED-OUT Polish "w dniu 7 grudnia 2022 r." (announcement:
//             "Przetarg odbędzie się … w dniu …"; result: "który odbył się w
//             dniu …"). The VIEWING dates use the plural "w dniach 17 i 24
//             listopada" — matching the singular "w dniu" avoids them.
//   - round:  "I publiczny przetarg ustny nieograniczony" (roman then, unlike
//             wolow, an intervening "publiczny").
//   - flat address: anchored on "…w budynku wielorodzinnym w <Town> przy ulicy
//             <Street> <bldg>" so it can never grab the OFFICE address on the
//             same page ("…odbędzie się … przy ul. Obrońców Pokoju 21"): the flat
//             uses the full word "ulicy", the office the abbreviated "ul.". The
//             apartment number is taken SEPARATELY from "Lokal mieszkalny nr N".

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
    .replace(/&ndash;/gi, '–')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// Polish-diacritic-safe fold, so keyword regexes can use plain ASCII literals
// instead of tripping over JS's ASCII-only \w on ą/ć/ę/ł/ń/ó/ś/ź/ż declensions.
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// Polish price string -> integer PLN. Handles "102 990,00" (space-thousands +
// comma-grosze), "1 200,00 zł", plain "88500". Ported from the wolow/olesno
// family and re-verified on Kolbuszowa's live prices.
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "0,1257" / "24,60" / "0.0322" -> Number
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Genitive + nominative Polish month names (diacritic and ASCII-folded).
const PL_MONTHS = {
  stycznia: 1, styczen: 1, lutego: 2, luty: 2, marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8, wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10, listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const W_DNIU_RE = /w\s+dniu\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/;

function isoFromWDniu(m) {
  if (!m) return null;
  const day = Number(m[1]);
  const mon = PL_MONTHS[m[2]];
  if (!mon || day < 1 || day > 31) return null;
  return iso(m[3], mon, day);
}

// The auction date, "w dniu 7 grudnia 2022 r." (spelled-out). Anchored on the
// AUCTION verb so it can't be confused with (a) the plural "w dniach 17 i 24
// listopada …" viewing dates, or (b) — on a round-II+ notice — the PRIOR round's
// own "…przetarg odbył się w dniu 8 maja 2026 r. i zakończył się wynikiem
// negatywnym…" self-report: an announcement's real date follows the FUTURE
// "odbędzie się", a result's follows the PAST "odbył się". Preference order
// (odbędzie → odbył → first "w dniu") makes one function serve both inputs.
export function extractAuctionDate(text) {
  const t = toAscii(text || '');
  const anchor = /odb[ęe]dzie\s+si[ęe]/.exec(t) || /odby[łl]\w*\s+si[ęe]/.exec(t);
  if (anchor) {
    const m = W_DNIU_RE.exec(t.slice(anchor.index));
    const d = isoFromWDniu(m);
    if (d) return d;
  }
  return isoFromWDniu(W_DNIU_RE.exec(t));
}

// ---------------------------------------------------------------------------
// 1. Article HTML structure (Pro3W CMS)
// ---------------------------------------------------------------------------

/** The announcement prose, WITHOUT the trailing attachment list. @returns {string} */
export function extractArticleText(html) {
  if (!html) return '';
  const m = /<div class="art-body[^"]*">([\s\S]*?)(?:<!--\s*ZALACZNIKI\s*-->|<div class="attachments)/i.exec(html);
  if (m) return stripTags(m[1]);
  const m2 = /<div class="art-body[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i.exec(html);
  return m2 ? stripTags(m2[1]) : '';
}

/** The announcement title (Pro3W puts the full first paragraph in <title>,
 *  behind a "Przetargi - YYYY r. - " breadcrumb prefix). @returns {string} */
export function extractTitle(html) {
  if (!html) return '';
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return '';
  return stripTags(m[1]).replace(/^Przetargi\s*-\s*\d{4}\s*r\.\s*-\s*/i, '').trim();
}

/** "Data publikacji: <strong>YYYY-MM-DD …" -> ISO date. @returns {string|null} */
export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /Data\s+publikacji\s*:\s*<strong>\s*(\d{4})-(\d{2})-(\d{2})/i.exec(html);
  return m ? iso(m[1], Number(m[2]), Number(m[3])) : null;
}

// ---------------------------------------------------------------------------
// 2. Round / cancellation
// ---------------------------------------------------------------------------

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

// "I/II/III/IV/V (publiczny )?przetarg ustny" — the roman round marker, tolerant
// of the "publiczny" that Kolbuszowa inserts between the numeral and "przetarg".
export function roundFromText(text) {
  const t = toAscii(text || '');
  const m = /\b(i{1,3}|iv|v)\s+(?:publiczn\w+\s+)?przetarg\w*\s+ustn/.exec(t);
  return m ? ROMAN[m[1]] ?? null : null;
}

// Cancellation / invalidation notice — title-scoped (the standing body clause
// "zastrzega sobie prawo odwołania przetargu" is NOT a cancellation). A real
// cancellation title reads "Informacja o odwołaniu przetargów…".
export function isCancelled(title) {
  const t = toAscii(title || '');
  return /\bodwolan|uniewazni|\bodwoluje\b/.test(t);
}

// ---------------------------------------------------------------------------
// 3. Subject extraction
// ---------------------------------------------------------------------------

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

// Flat address, anchored on "…budynku wielorodzinnym w <Town> przy ulicy
// <Street> <bldg>" (see file header — the anchor makes it impossible to capture
// the office address that shares the "przy ul." shape further down the page).
// The building captures the BARE number; a trailing "/N" or "-N" (which on this
// source is a compound building id, not the apartment) is discarded — the
// apartment comes from "Lokal … nr N" instead.
const FLAT_ADDR_RE = new RegExp(
  `budynku\\s+wielorodzinnym\\s+w\\s+[${PL_UP}][${PL_LOW}]+\\s+przy\\s+ul(?:icy|\\.)?\\s+` +
  `([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)\\s+(\\d+[A-Za-z]?)(?:[\\/-]\\d+[A-Za-z]?)?`,
  'i',
);

// "(Samodzielny )?Lokal mieszkalny nr N" / "lokalu mieszkalnego nr N".
const LOKAL_NR_RE = /\blokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

/** @returns {{address_raw:string|null, address:object|null}} */
function extractFlatAddress(body) {
  const sm = FLAT_ADDR_RE.exec(body || '');
  if (!sm) return { address_raw: null, address: null };
  const street = sm[1].trim().replace(/\s+/g, ' ');
  const building = sm[2];
  const aptM = LOKAL_NR_RE.exec(body || '');
  const apt = aptM ? aptM[1] : null;
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

// "oznaczon… nr ew. działki/działek[:] 1125/147 i 2030" — parcel number(s).
// The optional colon covers the "działek: 1125/43, 1125/164, 1422/7" multi-lot form.
const DZIALKA_RE = /nr\s+ew\.?\s+dzia[łl]\w*\s*:?\s*((?:\d+\/\d+|\d+)(?:\s*(?:i|,|oraz)\s*(?:\d+\/\d+|\d+))*)/i;

/** @returns {string|null} */
function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// The (locative) obręb/town for a land plot: "…nieruchomość gruntowa położona w
// Kupnie, …". Best-effort disambiguator only (core/build-land keys on parcel).
// NB: NOT case-insensitive on purpose — the captured town word(s) must be
// genuinely upper-case-initial, so a real two-word village ("Kolbuszowej Dolnej",
// "Hucie Przedborskiej") is kept whole while the lower-case "przy" in
// "…w Kolbuszowej przy ulicy Błonie…" is correctly excluded.
function extractObreb(body) {
  const m = new RegExp(
    `gruntowa\\s+po[łl]o[żz]on\\w*\\s+w\\s+([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)`,
  ).exec(body || '');
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// 4. Area / price extraction
// ---------------------------------------------------------------------------

/** Area, kind-aware. Flats: "o powierzchni użytkowej 24,60 m 2" (the source puts
 *  a space before the superscript). Land: "o (łącznej) powierzchni 0,1257 ha"
 *  (converted ×10000 to m²). @returns {number|null} */
export function extractAreaM2(body, kind) {
  if (kind === 'grunt') {
    const ha = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(body || '');
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
    return null;
  }
  const m = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*[^\d]{0,12}([\d][\d.,]*)\s*m\s*[²2]/i.exec(body || '');
  if (m) return parseArea(m[1]);
  const bare = /\bo\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(body || '');
  return bare ? parseArea(bare[1]) : null;
}

// Grab the first PLN amount inside `region` (a slice starting at a price label).
function plnFromRegion(region) {
  const m = /([\d][\d\s .,]*(?:,\d{2})?)\s*z[łl]/i.exec(region || '');
  return m ? parsePLN(m[1]) : null;
}

/** "Cena wywoławcza nieruchomości (wynosi|—) 102 990,00 złotych …". Takes the
 *  TOTAL (first amount after the label), not the "cena lokalu/cena udziału"
 *  breakdown that follows. @returns {number|null} */
export function extractStartingPrice(body) {
  const t = toAscii(body || '');
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 220);
  const zl = plnFromRegion(region);
  if (zl != null) return zl;
  // Fallback for amounts NOT followed by "złotych" — e.g. a VAT-bearing land
  // plot: "…wynosi: 300 000,00 (brutto, w tym podatek VAT 23%)". Match the first
  // grosze-bearing amount (,NN), which skips the "23%" / any year that follows.
  const m = /(\d{1,3}(?:[\s ]\d{3})+,\d{2}|\d+,\d{2})/.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/** "Najwyższa cena osiągnięta w przetargu — 172 000,00 złotych" (result PDFs).
 *  @returns {number|null} */
export function extractFinalPrice(text) {
  const t = toAscii(text || '');
  // "cena osiagnieta" matches inside the full "najwyzsza cena osiagnieta w przetargu".
  const idx = t.search(/cena\s+osiagnieta/);
  if (idx < 0) return null;
  return plnFromRegion(text.slice(idx, idx + 120));
}

// Sold ↔ unsold classification for a result notice.
const UNSOLD_RE = /wynik\w*\s+negatywn|zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynikiem\s+negatywn|nie\s+wy[łl]oniono|brak\s+(?:oferent|uczestnik|wp[łl]at|wadium|nabywc)|nikt\s+nie\s+(?:przyst[ąa]pi|wp[łl]aci)/i;

// The "Informacja o wyniku przetargu" / "Wynik przetargu" PDF attachment on a
// concluded flat's detail page (vs the "Ogłoszenie o przetargu" announcement
// PDF). Returns the RELATIVE href, or null. @returns {string|null}
export function findResultPdfHref(html) {
  if (!html) return null;
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (/wynik/i.test(stripTags(m[2]))) return m[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one inline-HTML announcement page.
 * @param {string} html
 * @param {string} url  provenance (attached by the caller as detail_url)
 * @returns {object}
 */
export function parseAnnouncement(html, url) {
  const body = extractArticleText(html);
  const title = extractTitle(html);
  const round = roundFromText(title) ?? roundFromText(body);
  const cancelled = isCancelled(title);
  let kind = classifyKind(`${title}\n${body}`);

  // Address-keyed kinds must carry a street address ("…przy ulicy <Street>
  // <bldg>"). A flat always does; a "zabudowana/niezabudowana nieruchomość
  // gruntowa" plot is identified only by parcel number + village, so when an
  // address-kind yields no street it is really parcel-keyed LAND — reroute it to
  // 'grunt' (→ land.json) rather than dropping it. Flats (mieszkalny) are never
  // rerouted: their anchored extractor is reliable and a rare miss should surface
  // as a dropped record, not be mis-filed as land.
  const flatAddr = kind !== 'grunt' ? extractFlatAddress(body) : { address_raw: null, address: null };
  const dzialka_nr = extractDzialkaNr(body);
  if (kind !== 'grunt' && !flatAddr.address && kind !== 'mieszkalny' && dzialka_nr) {
    kind = 'grunt';
  }

  const base = {
    round,
    cancelled,
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    detail_url: url,
  };

  if (kind === 'grunt') {
    const obreb = extractObreb(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return {
      ...base, kind, area_m2: extractAreaM2(body, 'grunt'),
      address_raw: parts.join(', ') || null, address: null, dzialka_nr, obreb,
    };
  }
  return {
    ...base, kind, area_m2: extractAreaM2(body, kind),
    address_raw: flatAddr.address_raw, address: flatAddr.address, dzialka_nr: null, obreb: null,
  };
}

/**
 * Parse one "Informacja o wyniku przetargu" result — `text` is the OCR of the
 * scanned result PDF (crawl.js runs core/ocr-pdf.js first). Flats only.
 * @param {string} text
 * @param {string|null} fallbackDate  ISO auction date carried on the ref
 * @param {string} sourceUrl  absolute URL of the result PDF
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  // Gate: must look like a result notice for a flat.
  const looksResult = /o\s+wyniku\s+przetarg|cena\s+osi[ąa]gni[ęe]ta|wynikiem\s+negatywn/i.test(t);
  if (!looksResult) return [];
  const kind = classifyKind(t);
  if (kind !== 'mieszkalny') return []; // flat achieved-price stream only
  if (isCancelled(t)) return [];

  const addr = extractFlatAddress(t);
  if (!addr.address) return [];

  const starting_price_pln = extractStartingPrice(t);
  const final_price_pln = extractFinalPrice(t);
  const unsold = UNSOLD_RE.test(t);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'open') notes.push('parse: result notice with neither an achieved price nor an unsold marker');

  return [{
    auction_date: extractAuctionDate(t) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round: roundFromText(t),
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    area_m2: null, // flat result notices state only the land-share ha, not the flat's m²
    notes,
  }];
}
