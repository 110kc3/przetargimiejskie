// Strzelce Opolskie parsers — GZMK BIP `gzmk.pl` (bespoke fast4net server-HTML).
//
// GZMK (Gminny Zarząd Mienia Komunalnego) — the dedicated municipal property
// manager for Gmina Strzelce Opolskie — publishes every "przetarg na sprzedaż
// nieruchomości" (flats + land + buildings) on a SINGLE board (id 14) at
// gzmk.pl. Each notice is server-rendered XHTML whose body carries a clean
// STRUCTURED field block rendered as label/value <div> pairs, e.g. (live,
// confirmed 2026-07-12):
//
//   <div class="mar3"><b>Status:</b></div>
//   <div class="mar10"><span class="col_green">ogłoszony</span></div>
//   <div class="mar3"><b>Adres:</b></div><div class="mar10">Krakowska, 47-100 Strzelce Opolskie</div>
//   <div class="mar3"><b>Nr działki:</b></div><div class="mar10">294/7</div>
//   <div class="mar3"><b>Powierzchnia:</b></div><div class="mar10">0,1660 ha</div>
//   <div class="mar3"><b>Cena wywoławcza (netto):</b></div><div class="mar10">110 000,00 zł</div>
//   <div class="mar3"><b>Data przetargu:</b></div><div class="mar10">12 sierpień 2026</div>
//
// all inside <div id="text_content"> ... </div>. When the auction concludes the
// SAME notice body gains a prose "ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH"
// block that states the outcome INLINE — either a sale ("Za nabywcę ... uznano
// Pana <name>, za cenę 90.000 zł.") or a negative result ("... zakończył się
// wynikiem negatywnym." / "nie zostało wpłacone żadne wadium.") — so results
// never need a separate board or PDF. The HTML body mirrors the attached born-
// digital PDF completely; the PDF (download.php?id=…) is only ever needed as a
// FALLBACK for a flat's usable m² on a still-open announcement (see crawl.js).
//
// KIND is decided by classifyKind() on the BODY text (never the URL slug —
// confirmed live that slugs and titles both carry the kind, but per house rules
// classification is body-driven): land ("działka…") → grunt (parcel-keyed via
// core/build-land.js), flats ("lokal mieszkalny…") → mieszkalny, whole built
// property ("nieruchomość zabudowana…") → zabudowana (both address-keyed).
//
// Fixture groundtruth (real fetches from this Pi, 2026-07-12; ids are the
// gzmk.pl article ids in the `,14,<id>` URL tail):
//   x,14,1000 Kalinowice dz. 294/7 (grunt) — LIVE announce, Status: ogłoszony,
//             0,1660 ha, cena wyw. 110 000 zł netto, auction 12.08.2026, round I
//   x,14,900  Krakowska 13/6 (lokal mieszkalny nr 6, 46,42 m²) — round I,
//             cena wyw. 180 000 zł, auction 12.07.2023, INLINE result: negatywny
//   x,14,911  Krakowska 13/6 — round II (18.09.2023), INLINE result: negatywny
//   x,14,992  Kalinowice dz. 294/7 (grunt) — round I (12.05.2026), INLINE
//             result: negatywny (żadne wadium)
//   x,14,986  Szymiszów dz. 861/1 (grunt) — round I (15.01.2026), INLINE result:
//             SOLD, "za cenę 90.000 zł" (cena wyw. 85 000 → osiągnięta 90 000)
//   x,14,985  Grodzisko dz. 174/2 (grunt, przetarg OGRANICZONY) — SOLD, 3.300 zł
//   x,14,991  Rozmierka ul. Strzelecka 33 (zabudowana, byłe przedszkole) —
//             round I (27.05.2026), INLINE result: negatywny

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Strip tags + decode the few entities GZMK emits, collapse whitespace. */
export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&sup2;|&#178;/gi, '²')
    .replace(/&quot;/gi, '"')
    .replace(/&rsaquo;/gi, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Polish-diacritic-safe fold to ASCII lowercase (so keyword scans don't trip
 *  over JS's ASCII-only \w on ą/ć/ę/ł/ń/ó/ś/ź/ż declensions). */
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// Polish price string -> integer PLN. "110 000,00 zł" -> 110000, "3.300 zł" ->
// 3300, "90.000" -> 90000, "180.000zł" -> 180000. Ported from the wolow analog
// family (space-thousands OR dot/comma-thousands, optional 2-digit grosze tail).
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "0,1660" / "0.1660" / "46,42" -> Number, or null.
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Polish month name -> number, keyed on the DIACRITIC-FOLDED (toAscii) form so a
// single table covers nominative ("sierpien", used in the structured "Data
// przetargu" field), genitive ("sierpnia", used in prose), and every declension
// GZMK mixes across the two.
const PL_MONTHS = {
  styczen: 1, stycznia: 1,
  luty: 2, lutego: 2,
  marzec: 3, marca: 3,
  kwiecien: 4, kwietnia: 4,
  maj: 5, maja: 5,
  czerwiec: 6, czerwca: 6,
  lipiec: 7, lipca: 7,
  sierpien: 8, sierpnia: 8,
  wrzesien: 9, wrzesnia: 9,
  pazdziernik: 10, pazdziernika: 10,
  listopad: 11, listopada: 11,
  grudzien: 12, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "12 sierpień 2026" / "12 lipiec 2023, 10:00" / "12 maja 2026 r." -> ISO, or
// null. Diacritics folded so the month lookup is ASCII.
function dateFromWords(s) {
  const m = /(\d{1,2})\s+([A-Za-ząćęłńóśźż]{3,})\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAscii(m[2])];
  if (!mon) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  return iso(m[3], mon, day);
}

// "12.07.2023" / "12.07.2023r." -> ISO, or null (rejects an out-of-range
// day/month rather than fabricating a date).
function dateFromNumeric(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return iso(m[3], mon, day);
}

/** Parse either the spelled-out or the numeric Polish date form. */
export function parseDateText(s) {
  return dateFromWords(s) ?? dateFromNumeric(s);
}

// ---------------------------------------------------------------------------
// 1. Page-structure extraction (fast4net article shell)
// ---------------------------------------------------------------------------

/** The article body: everything inside <div id="text_content"> up to the
 *  attachment table / registry block. Returns flattened plain text. */
export function extractTextContent(html) {
  if (!html) return '';
  const m = /<div id="text_content">([\s\S]*?)(?:<div class="table_file"|<div id="div_up"|<div id="foot")/i.exec(html);
  if (m) return stripTags(m[1]);
  // Fallback: the whole <div id="tresc"> content wrapper.
  const t = /<div id="tresc"[^>]*>([\s\S]*?)<div id="foot"/i.exec(html);
  return t ? stripTags(t[1]) : stripTags(html);
}

/** The notice title — the heading that precedes the "Status:" field in the body
 *  (falls back to the <title> tag, minus the board prefix/suffix). */
export function extractTitle(html) {
  const body = extractTextContent(html);
  const m = /^(.*?)\s*Status\s*:/is.exec(body);
  if (m && m[1].trim()) return m[1].trim();
  const t = /<title>([^<]*)<\/title>/i.exec(html || '');
  if (!t) return null;
  return t[1]
    .replace(/^\s*Przetargi na sprzeda[żz] nieruchomo[śs]ci\s*-\s*/i, '')
    .replace(/\s*-\s*BIP GZMK.*$/i, '')
    .trim();
}

/** Publication date — from the registry footer ("Informację wprowadził(a): …
 *  (YYYY-MM-DD HH:MM:SS)") or the file "Data opublikowania: YYYY-MM-DD". */
export function extractPublishedDate(html) {
  if (!html) return null;
  const reg = /Informacj[eę]\s+wprowadzi[łl]\([^)]*\)\s*:[^(]*\((\d{4})-(\d{2})-(\d{2})/i.exec(stripTags(html));
  if (reg) return `${reg[1]}-${reg[2]}-${reg[3]}`;
  const pub = /Data\s+opublikowania\s*:\s*(\d{4})-(\d{2})-(\d{2})/i.exec(stripTags(html));
  if (pub) return `${pub[1]}-${pub[2]}-${pub[3]}`;
  return null;
}

// ---------------------------------------------------------------------------
// 2. Structured label:value field block
// ---------------------------------------------------------------------------

// Lookahead marking where any one field value ends (the next label, the prose
// ZAWIADOMIENIE — which the source sometimes spaces out letter-by-letter, "Z A
// W I A D O M I E N I E" — or the attachments heading).
const NEXT_LABEL =
  '(?=Status\\s*:|Adres\\s*:|Nr dzia|Nr ks|Powierzchnia|Plan zagosp|Cena wyw|Data przetargu|Kwota wadium|Data wniesienia|Z\\s?A\\s?W\\s?I\\s?A\\s?D|ZAWIADOM|Pliki do pobrania|metryczka|$)';

/** Value of one structured field. `labelRe` is a regex fragment matching the
 *  bold label (without the trailing colon). */
function field(body, labelRe) {
  const re = new RegExp('(?:' + labelRe + ')\\s*:\\s*(.*?)\\s*' + NEXT_LABEL, 'is');
  const m = re.exec(body || '');
  return m ? m[1].trim() : null;
}

/** 'ogloszony' (open) | 'rozstrzygniety' (resolved) | null. Folded to ASCII. */
export function extractStatus(body) {
  const v = field(body, 'Status');
  if (!v) return null;
  return toAscii(v).replace(/[^a-z].*$/, '') || null;
}

// ---------------------------------------------------------------------------
// 3. Round / kind
// ---------------------------------------------------------------------------

// "I/II/III/IV/V ustny(m) przetarg(u)" — declension-tolerant. Notices phrased
// only "Przetarg nieograniczony …" (no roman, no "ustny") carry no explicit
// round → null (build-properties derives it from history).
export function roundFromTitle(text) {
  const t = toAscii(text || '');
  const m = /\b(i|ii|iii|iv|v)\s+ustn\w*\s+przetarg\w*/.exec(t);
  if (!m) return null;
  return { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }[m[1]] ?? null;
}

// ---------------------------------------------------------------------------
// 4. Subject extraction (address-keyed vs parcel-keyed)
// ---------------------------------------------------------------------------

/** Split the "Adres:" field into {street, building, city}. Forms seen live:
 *  "ul. Strzelecka 33, 47-100 Rozmierka" | "Krakowska, 47-100 Strzelce Opolskie"
 *  | ", 47-100 Grodzisko" (land — empty street) | "1-go Maja, 47-100 Szymiszów". */
function parseAdresField(adres) {
  if (!adres) return { street: null, building: null, city: null };
  const left = adres.split(',')[0].trim().replace(/^ul\.?\s+/i, '');
  const cityM = /\d{2}-\d{3}\s+(.+?)\s*$/.exec(adres);
  const city = cityM ? cityM[1].trim() : null;
  const bm = /^(.*?\S)\s+(\d+[A-Za-z]?)$/.exec(left);
  if (bm) return { street: bm[1].trim(), building: bm[2], city };
  return { street: left || null, building: null, city };
}

// First parcel id from the "Nr działki:" field. "294/7" | "nr 102/4, nr 101/2…"
// | "1897/8 i 1897/7" | "1897/8 w udziale 1043/10.000cz. 1897/7 …" → "294/7"
// etc. Takes the first \d+/\d+ (or bare \d+) token.
function extractDzialkaNr(body) {
  const v = field(body, 'Nr dzia[łl]ki');
  if (!v) return null;
  const m = /(\d+(?:\/\d+)?)/.exec(v);
  return m ? m[1] : null;
}

/** Flat/house/commercial address. Street comes from the (nominative, clean)
 *  Adres field; the building number and apartment come from the Adres field or,
 *  failing that, the title/prose — GZMK states the building both as a trailing
 *  Adres number and inline in the title ("przy ul. Krakowskiej 13"), and the
 *  apartment as "lokalu mieszkalnego nr N" or a "13/6" bldg/apt token. */
function extractStreetAddress(body, title) {
  const adres = field(body, 'Adres');
  const a = parseAdresField(adres);
  const hay = `${title || ''} ${body || ''}`;

  let street = a.street;
  let building = a.building;
  if (!building) {
    const bm = /\bul\.?\s+[A-Za-ząćęłńóśźż.]+\s+(\d+[A-Za-z]?)\b/i.exec(hay);
    if (bm) building = bm[1];
  }
  if (!street) {
    const sm = /\bul\.?\s+([A-Za-ząćęłńóśźż.]+?)\s+\d/i.exec(hay);
    if (sm) street = sm[1];
  }
  if (!street || !building) return null;

  // Apartment: explicit "lokal(u) (mieszkaln…) nr N", else a "<bldg>/<apt>" tail.
  let apt = null;
  const am = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)?\s*nr\.?\s*(\d+[A-Za-z]?)/i.exec(hay);
  if (am) apt = am[1];
  else {
    const slashM = new RegExp('\\b' + building.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*/\\s*(\\d+[A-Za-z]?)').exec(hay);
    if (slashM) apt = slashM[1];
  }

  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

/**
 * @returns {{address_raw:string|null, address:object|null, dzialka_nr:string|null, obreb:string|null}}
 */
function extractSubject(body, title, kind) {
  const dzialka_nr = extractDzialkaNr(body);
  if (kind === 'grunt') {
    const obreb = parseAdresField(field(body, 'Adres')).city;
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return { address_raw: parts.length ? parts.join(', ') : null, address: null, dzialka_nr, obreb };
  }
  const found = extractStreetAddress(body, title);
  if (!found) return { address_raw: null, address: null, dzialka_nr, obreb: null };
  return { address_raw: found.address_raw, address: found.address, dzialka_nr, obreb: null };
}

// ---------------------------------------------------------------------------
// 5. Area / price / date
// ---------------------------------------------------------------------------

/** Kind-aware area in m². Land/houses use the structured "Powierzchnia" field
 *  ("0,1660 ha" ×10000, or a bare "712 m²"); flats/commercial use the prose
 *  usable area ("pow. użytkowej 46,42 m²") — the structured Powierzchnia for a
 *  flat is the parcel SHARE, not the flat, so it is deliberately ignored. A
 *  flat announcement that carries no prose area yet returns null (crawl.js may
 *  then fall back to the born-digital PDF). */
export function extractAreaM2(body, kind) {
  if (kind === 'mieszkalny' || kind === 'uzytkowy' || kind === 'garaz') {
    const m = /u[żz]ytkow\w*\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2]?/i.exec(body || '');
    return m ? parseArea(m[1]) : null;
  }
  const pow = field(body, 'Powierzchnia');
  if (!pow) return null;
  const ha = /([\d]+(?:[.,]\d+)?)\s*ha\b/i.exec(pow);
  if (ha) {
    const v = parseArea(ha[1]);
    return v == null ? null : Math.round(v * 10000);
  }
  const m2 = /([\d]+(?:[.,]\d+)?)\s*m\s*[²2]?/i.exec(pow);
  return m2 ? parseArea(m2[1]) : null;
}

/** "Cena wywoławcza (netto): 110 000,00 zł" -> 110000. */
export function extractStartingPrice(body) {
  const m = /Cena\s+wywo[łl]awcza\s*(?:\(netto\))?\s*:\s*([\d\s.,]+?)\s*z[łl]/i.exec(body || '');
  return m ? parsePLN(m[1]) : null;
}

/** "Data przetargu: 12 sierpień 2026" / "… 12 lipiec 2023, 10:00" -> ISO. */
export function extractAuctionDate(body) {
  const v = field(body, 'Data przetargu');
  return v ? parseDateText(v) : null;
}

// ---------------------------------------------------------------------------
// 6. Inline result (ZAWIADOMIENIE) outcome
// ---------------------------------------------------------------------------

// SOLD: "Za nabywcę nieruchomości będącej przedmiotem przetargu uznano Pana
//        <name>, za cenę 90.000 zł." — the hammer price follows "za cenę". Also
//        accept the spike-quoted "cena osiągnięta …" phrasing defensively.
const SOLD_PRICE_RE = /nabywc[aeęą][\s\S]{0,220}?za\s+cen[eę]\s*([\d\s.,]+?)\s*z[łl]/i;
const CENA_OSIAG_RE = /cena\s+osi[ąa]gni[eę]ta\s*[:\-]?\s*([\d\s.,]+?)\s*z[łl]/i;
// NEGATIVE: "zakończył się wynikiem negatywnym" / "nie zostało wpłacone żadne
//           wadium" / "nikt nie przystąpił".
const NEGATIVE_RE = /wynikiem\s+negatywnym|nie\s+zosta[łl]o\s+wp[łl]acone\s+[żz]adne\s+wadium|nie\s+wp[łl]yn[eę][łl]o\s+[żz]adne\s+wadium|nikt\s+nie\s+przyst[ąa]pi[łl]/i;

/** {outcome, final_price_pln, unsold_reason} from the notice body. */
export function extractOutcome(body) {
  const b = body || '';
  const soldM = SOLD_PRICE_RE.exec(b) || CENA_OSIAG_RE.exec(b);
  if (soldM) {
    return { outcome: 'sold', final_price_pln: parsePLN(soldM[1]), unsold_reason: null };
  }
  if (NEGATIVE_RE.test(b)) {
    const reason = /[żz]adne\s+wadium/i.test(b) ? 'brak wadium' : 'wynik negatywny';
    return { outcome: 'unsold', final_price_pln: null, unsold_reason: reason };
  }
  return { outcome: 'open', final_price_pln: null, unsold_reason: null };
}

// ---------------------------------------------------------------------------
// 7. Top-level parsers
// ---------------------------------------------------------------------------

/**
 * Parse one GZMK notice's fetched HTML into a normalised record.
 * @param {string} html @param {string} url @returns {object}
 */
export function parseNotice(html, url) {
  const body = extractTextContent(html);
  const title = extractTitle(html) || '';
  const kind = classifyKind(body || title);
  const status = extractStatus(body);
  const subject = extractSubject(body, title, kind);
  return {
    kind,
    status,
    round: roundFromTitle(title) ?? roundFromTitle(body),
    area_m2: extractAreaM2(body, kind),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    detail_url: url,
    ...subject,
  };
}

/**
 * Registry contract. `text` is a RESOLVED (Status: rozstrzygnięty) notice's own
 * fetched HTML (crawl.js only forwards resolved notices); returns the inline
 * result record(s), or [] when the notice is not actually a concluded result.
 * @param {string} text @param {string|null} fallbackDate @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const html = String(text);
  const body = /<[a-z][\s\S]*>/i.test(html) ? extractTextContent(html) : html;
  if (!body.trim()) return [];
  const title = extractTitle(html) || '';
  const status = extractStatus(body);
  const { outcome, final_price_pln, unsold_reason } = extractOutcome(body);
  // Gate: a concluded result must be a resolved notice with a stated outcome.
  if (status !== 'rozstrzygniety' && outcome === 'open') return [];

  const kind = classifyKind(body || title);
  const subject = extractSubject(body, title, kind);
  if (!subject.address && !subject.dzialka_nr) return [];

  return [{
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    dzialka_nr: subject.dzialka_nr,
    obreb: subject.obreb,
    round: roundFromTitle(title) ?? roundFromTitle(body),
    area_m2: extractAreaM2(body, kind),
    starting_price_pln: extractStartingPrice(body),
    final_price_pln,
    auction_date: extractAuctionDate(body) || fallbackDate || null,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}
