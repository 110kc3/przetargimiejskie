// Lipsko parsers — samorzad.gov.pl (national govpl / Liferay BIP template).
//
// The adapter feeds these parsers PLAIN TEXT that crawl.js has already
// extracted from one article, either:
//   * INLINE — stripped from `<div class="editor-content">` (older notices), or
//   * OCR    — core/ocr-pdf.js on the scanned `/attachment/<uuid>` PDF (2025+
//              notices; pdftotext yields nothing — no font layer).
// Both arrive here as the same shape: Polish prose. So the field extractors
// below are source-agnostic; only crawl.js knows inline-vs-PDF.
//
// TWO BODY-SCAN TRAPS this build hit live and guards against (both = "an
// incidental mention elsewhere in the body outranks the real subject"):
//
//   1. classify-on-SUBJECT, never the whole body. The real land notice for
//      dz. 1332/2 describes an incidental "garaż typu blaszak" standing on the
//      plot; classifyKind(fullBody) hits GARAGE_RE (which precedes LAND_RE) and
//      mislabels the whole land sale 'garaz'. classifyLipsko() classifies only
//      the "na sprzedaż <subject>" clause ("nieruchomości gruntowej
//      niezabudowanej…"), which names the actual asset → 'grunt'.
//
//   2. rental filter on the przetarg TYPE, not any "dzierżawa" token. The same
//      land notice says the plot is "objęta umową dzierżawy" (currently leased)
//      — instrumental case, incidental. A genuine rental notice says
//      "przetarg … na dzierżawę / na najem" (accusative, the sale purpose).
//      RENTAL_RE requires the na/w/do + rental-noun adjacency, so the
//      incidental lease of a plot being SOLD is not mistaken for a rental.
//
// Field patterns are groundtruthed on real fetched text (2026-07-12, Pi Polish
// IP) — see parse-lipsko.test.js for the verbatim fixtures + provenance.
// Closest analogs: wolow (single-host discovery + parcel/address subject split)
// and brzeg (the real "Informacja o wyniku" achieved-price parser).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  sect: '§', ndash: '–', mdash: '—', hellip: '…',
  oacute: 'ó', Oacute: 'Ó', aacute: 'á', eacute: 'é', sup2: '²',
  laquo: '«', raquo: '»', bdquo: '„', rdquo: '”', ldquo: '“',
};

/** Strip HTML tags + decode the entities that appear in this source's inline
 *  notices (govpl editor content uses &sect; &oacute; &nbsp; + numeric refs). */
export function stripTags(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m))
    .replace(/​/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Polish-diacritic-safe lowercase fold so keyword regexes can use plain ASCII
 *  (JS \w is ASCII-only; ą/ć/ę/ł/… would break word tests otherwise). 1:1 char
 *  substitution, so indices into the folded string map back to the original. */
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// Polish price string -> integer PLN. "56 600 zł" (space thousands),
// "4200,00 zł" (comma grosze), "4.250,00", "57 170". Ported from the
// wolow/olesno family; tolerant of the documented source typos there.
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "0,1723" / "0.0018" -> number
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, wrzesnia_: 9, pazdziernika: 10,
  listopada: 11, grudnia: 12,
  // nominative, ascii-folded — defensive
  styczen: 1, luty: 2, marzec: 3, kwiecien: 4, maj: 5, czerwiec: 6,
  lipiec: 7, sierpien: 8, wrzesien: 9, pazdziernik: 10, listopad: 11, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "16.07.2024" / "16.07.2024r." OR "04 listopada 2025" -> ISO, else null. */
export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) {
    const d = Number(num[1]), mo = Number(num[2]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return iso(num[3], mo, num[1]);
    return null;
  }
  const word = /(\d{1,2})\s+([A-Za-zŁŚŻŹĆŃÓĄĘłśżźćńóąę]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[toAscii(word[2])];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Article HTML structure (govpl / Liferay BIP template)
// ---------------------------------------------------------------------------

/** The notice title from the article's <h2>. @returns {string|null} */
export function extractTitle(html) {
  if (!html) return null;
  const m = /<article[^>]*class="article-area__article[^"]*"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html)
    || /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

/** "Pierwsza publikacja: DD.MM.YYYY HH:MM" -> ISO date. @returns {string|null} */
export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /Pierwsza\s+publikacja:[\s\S]{0,40}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(html);
  return m ? iso(m[3], m[2], m[1]) : null;
}

const MIN_INLINE_CHARS = 40;

/**
 * The inline notice prose from `<div class="editor-content">`, up to the
 * following attachments (`<h3>Materiały`) or publication-metrics block. PDF
 * -attachment articles carry an EMPTY editor-content (`<div></div>`) → returns
 * '' so crawl.js knows to fetch + OCR the attachment instead.
 * @param {string} html @returns {string}
 */
export function extractInlineBody(html) {
  if (!html) return '';
  const m = /<div class="editor-content"[^>]*>([\s\S]*?)(?:<h3[^>]*>\s*Materia|<div class="metrics")/i.exec(html);
  if (!m) return '';
  const text = stripTags(m[1]);
  return text.length >= MIN_INLINE_CHARS ? text : '';
}

const HOST = 'https://samorzad.gov.pl';

/** The first `/attachment/<uuid>` file-download href, absolutised. */
export function extractAttachmentUrl(html) {
  if (!html) return null;
  const m = /href="(\/attachment\/[0-9a-fA-F-]+)"/i.exec(html);
  return m ? HOST + m[1] : null;
}

// ---------------------------------------------------------------------------
// 2. Classification / gating (SUBJECT-scoped — see file header traps)
// ---------------------------------------------------------------------------

/** The "na sprzedaż <…>" sale-subject clause (up to the first sentence end /
 *  ~140 chars). Empty for rentals (they say "na dzierżawę/najem"). */
function saleSubject(text) {
  const m = /na\s+sprzeda[żz]\s+([\s\S]{0,140})/i.exec(text || '');
  if (!m) return '';
  return m[1].split(/[.\n]/)[0];
}

/**
 * Kind from the sale-subject clause (never the whole body — see trap #1).
 * Falls back to the title, then the whole body, only if the subject clause is
 * inconclusive.
 * @param {string} body @param {string} [title] @returns {string}
 */
export function classifyLipsko(body, title) {
  const subj = saleSubject(body) || saleSubject(title || '');
  if (subj) {
    const k = classifyKind(subj);
    if (k !== 'unknown') return k;
  }
  const kt = classifyKind(title || '');
  if (kt !== 'unknown') return kt;
  return classifyKind(body || '');
}

// Rental notice: przetarg/wykaz whose PURPOSE is dzierżawa/najem/użyczenie —
// requires the na/w/do + rental-noun adjacency so an incidental "umową
// dzierżawy" on a plot being SOLD is NOT filtered (trap #2).
const RENTAL_RE = /\b(?:na|w|do)\s+(?:dzier[żz]aw|najem|najmu|u[żz]yczeni)/i;

/** @param {string} text (title and/or body) */
export function isRental(text) {
  return RENTAL_RE.test(text || '');
}

// Cancellation / annulment. TITLE-scoped (an announcement's boilerplate
// reserves the mayor's "prawo odwołania przetargu" — the standing right to
// cancel — which a body-wide "odwołan…przetarg" scan false-positives on, the
// same wolow trap). For results (no title) the body opens "Informacja o
// odwołaniu…", matched by the anchored alternative.
export function isCancelled(text) {
  const t = toAscii(text || '');
  // "…o odwołaniu [II] przetargu…" — the standalone preposition "o" is the
  // notice-heading signal; the boilerplate "prawo odwołania przetargu" has no
  // standalone "o" before "odwołania", so it does NOT match here.
  return /\bo\s+odwolan\w+\s+(?:[ivx]+\s+)?przetarg|uniewazni\w*\s+(?:[ivx]+\s+)?przetarg/.test(t);
}

// ---------------------------------------------------------------------------
// 3. Round
// ---------------------------------------------------------------------------

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
const WORD_ROUND = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5 };

/** Round from "I/II/III przetarg[u]" (roman before przetarg) or the word form
 *  "pierwszy/drugi/… przetarg". @returns {number|null} */
export function roundFrom(text) {
  const t = toAscii(text || '');
  const r = /\b(iii|iv|ii|v|i)\s+przetarg/.exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  const w = /\b(pierwsz|drug|trzeci|czwart|piat)\w*\s+przetarg/.exec(t);
  if (w) return WORD_ROUND[w[1]] ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// 4. Subject (parcel-keyed grunt vs address-keyed flat/house/commercial)
// ---------------------------------------------------------------------------

// "działka [ewid.] nr 1332/2" / "działkę o numer 392/3" — parcel number.
const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:ewid\.?\s+)?(?:o\s+)?(?:numer|nr\.?)\s*(\d+(?:\/\d+)?)/i;

/** @returns {string|null} */
export function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1] : null;
}

// "w obrębie geodezyjnym 0001 Lipsko" / "… 0035 Wola Solecka Wólka" — the
// obręb NAME (a numeric obręb code may precede it). Best-effort disambiguator;
// core/build-land keys on dzialka_nr, so a miss is harmless.
const OBREB_RE = /w\s+obr[ęe]bie\s+(?:geodezyjnym\s+)?(?:\d{3,4}\s+)?([A-ZŁŚŻŹĆŃÓĄĘ][^.,\n]*?)(?=[.,]|\s+Dla\b|\s+urz[ąa]dzon|\s+o\s+pow|$)/;

/** @returns {string|null} */
export function extractObreb(body) {
  const m = OBREB_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

// Address-kind helpers (best-effort — see extractSubject note). "ul. Street 12".
const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';
const STREET_RE = new RegExp(`\\bul\\.?\\s+([${PL_UP}][${PL_UP}${PL_LOW}.\\s]{0,40}?)\\s+(\\d+[A-Za-z]?)\\b`);
const LOKAL_NR_RE = /\blokal\w*\s+(?:mieszkaln\w+\s+|u[żz]ytkow\w+\s+|niemieszkaln\w+\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;

/**
 * @param {string} body @param {string} kind
 * @returns {{address_raw:string|null, address:object|null, dzialka_nr:string|null, obreb:string|null}}
 */
export function extractSubject(body, kind) {
  const dzialka_nr = extractDzialkaNr(body);
  const obreb = extractObreb(body);
  if (kind === 'grunt') {
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return { address_raw: parts.length ? parts.join(', ') : null, address: null, dzialka_nr, obreb };
  }
  // Address-kinds: NO live flat/house auction exists in the current source
  // (flats appear only via the bezprzetargowa tenant wykazy — out of scope;
  // see crawl.js header), so this path is defensive/UNVERIFIED. An
  // unparseable address falls back to null (build-properties tolerates it).
  const s = STREET_RE.exec(body || '');
  if (!s) return { address_raw: null, address: null, dzialka_nr, obreb: null };
  const street = s[1].trim().replace(/\s+/g, ' ');
  const building = s[2];
  const aptM = LOKAL_NR_RE.exec(body || '');
  const apt = aptM ? aptM[1] : null;
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address_raw: raw, address: parseAddress(raw), dzialka_nr: null, obreb: null };
}

// ---------------------------------------------------------------------------
// 5. Area / price / date
// ---------------------------------------------------------------------------

/** Land states hectares ("o powierzchni 0,0018 ha" → ×10000 = m²); an
 *  address-kind states m² directly. @returns {number|null} */
export function extractAreaM2(body, kind) {
  const b = body || '';
  if (kind === 'grunt') {
    const ha = /o\s+pow(?:ierzchni)?\.?\s*(\d+[.,]\d+|\d+)\s*ha\b/i.exec(b);
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
  }
  const m2 = /o\s+pow(?:ierzchni)?(?:\s+u[żz]ytkowej)?\.?\s*(\d[\d.,]*)\s*m\s*[²2]/i.exec(b);
  return m2 ? parseArea(m2[1]) : null;
}

// Price after a labelled anchor. `label` is a folded-ascii regex source; the
// price is read from the ORIGINAL body at the same index (toAscii is 1:1).
function priceAfter(body, label) {
  const t = toAscii(body || '');
  const idx = t.search(label);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 200);
  const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/** "Cena wywoławcza nieruchomości wynosi[ła] 4200,00 zł". @returns {number|null} */
export function extractStartingPrice(body) {
  return priceAfter(body, /cena\s+wywolawcza/);
}

/** "cena osiągnięta w przetargu: 57 170 zł netto". @returns {number|null} */
export function extractFinalPrice(body) {
  return priceAfter(body, /cena\s+osiagnieta/);
}

// Auction date anchored on "… o godz[inie]" (both a future "Przetarg odbędzie
// się w dniu D (wtorek) o godzinie …" announcement and a past "Dnia D o godz.
// … został przeprowadzony" result put the auction date immediately before the
// time-of-day). The "o godz" anchor deliberately skips the boilerplate law
// citation "…z dnia 14 września 2004 r. w sprawie…" (followed by "w sprawie",
// never "o godz").
export function extractAuctionDate(body) {
  const re = /(?:w\s+dniu|dnia)\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\s+[A-Za-złśżźćńóąęŁŚŻŹĆŃÓĄĘ]{3,}\s+\d{4})\s*r?\.?\s*(?:\([^)]{0,25}\)\s*)?o\s+godz/i;
  const m = re.exec(body || '');
  return m ? parseDateText(m[1]) : null;
}

// ---------------------------------------------------------------------------
// 6. Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one "Ogłoszenie o … przetargu … na sprzedaż …" announcement.
 * @param {string} body  already-extracted plain text (inline or OCR)
 * @param {string} [title]  the clean article <h2> (round + classify fallback)
 * @returns {object|null}  null for a rental; {cancelled:true} for a cancellation
 */
export function parseAnnouncement(body, title) {
  const b = body || '';
  const t = title || '';
  if (isRental(t) || isRental(b)) return null;
  if (isCancelled(t)) return { cancelled: true };
  const kind = classifyLipsko(b, t);
  const subject = extractSubject(b, kind);
  return {
    kind,
    round: roundFrom(t) ?? roundFrom(b),
    cancelled: false,
    ...subject,
    area_m2: extractAreaM2(b, kind),
    starting_price_pln: extractStartingPrice(b),
    auction_date: extractAuctionDate(b),
  };
}

/**
 * Parse one "Informacja o wyniku przetargu …" result into the achieved-price
 * record shape. `text` is the already-extracted plain body (inline or OCR);
 * refresh.js passes it straight through for source==='html' cities.
 * @param {string} text
 * @param {string|null} fallbackDate  (article publication date, from crawl.js)
 * @param {string} sourceUrl  the article URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  // Defensive: crawl.js passes plain text, but tolerate raw HTML too.
  const body = /<(?:div|p|span|article|h2)\b/i.test(text) ? stripTags(text) : text;
  if (!body.trim()) return [];
  if (isRental(body) || isCancelled(body)) return [];

  const folded = toAscii(body);
  const looksResult =
    /informacj\w*\s+o\s+wynik/.test(folded) ||
    /cena\s+osiagnieta/.test(folded) ||
    /wynik\w*\s+negatywn/.test(folded) ||
    /zostal\s+przeprowadzon|przeprowadzono/.test(folded);
  if (!looksResult) return [];

  const kind = classifyLipsko(body, '');
  const subject = extractSubject(body, kind);
  if (!subject.address && !subject.dzialka_nr) return [];

  const starting_price_pln = extractStartingPrice(body);
  const final_price_pln = extractFinalPrice(body);
  const negative =
    /wynik\w*\s+negatywn|zakonczy\w*\s+(?:sie\s+)?wynikiem\s+negatywn|nie\s+wplacono\s+wadium|nikt\s+nie\s+przystapi|brak\s+(?:oferent|uczestnik|wplat)/.test(folded);
  const outcome = negative ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'open') notes.push('parse: result notice without an achieved price or negative marker');

  return [{
    auction_date: extractAuctionDate(body) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    dzialka_nr: subject.dzialka_nr,
    obreb: subject.obreb,
    round: roundFrom(body),
    starting_price_pln,
    final_price_pln: final_price_pln ?? null,
    outcome,
    unsold_reason: negative ? 'wynik negatywny' : null,
    area_m2: extractAreaM2(body, kind),
    notes,
  }];
}
