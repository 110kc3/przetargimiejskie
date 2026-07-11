// Sępólno Krajeńskie parsers — extranet "BIP w JST" (gov.pl-BIP) CMS at
// bip.gmina-sepolno.pl.
//
// Roles:
//   1. extractTitle / extractMetadata / extractAttachments
//        — pull the <h1 class="pageHeader"> title, the structured inline
//          metadata block (repeated
//            <div class="cct-page__name"> LABEL: </div>
//            <div class="cct-page__value"> VALUE </div>
//          pairs), and the /download/attachment/<id>/<name> links out of one
//          notice page. Confirmed live 2026-07-11.
//
//   2. pickAnnouncementPdf / pickResultPdf
//        — choose, from the attachment list, the born-digital ogłoszenie PDF
//          (filename contains "ogloszeni"/"akt-ogl"/"przetarg-na-sprzeda",
//          never an annex "zal-nr-*" or the result notice) and the
//          "informacja o wyniku przetargu" PDF (filename contains "wynik").
//
//   3. parseNotice — assemble one notice's HTML into a listing-shaped record:
//          kind (classifyKind on the metadata "Rodzaj nieruchomości", the CMS's
//          own classification — falls back to the title BODY, never the slug),
//          round (from title), starting_price_pln + auction_date (from the
//          metadata block), address (from "Adres nieruchomości" metadata or the
//          title's "przy ul. <ADDR> w Sępólnie…" clause → core/normalize.js
//          parseAddress). area_m2 is a DEEP field filled by crawl.js from the
//          ogłoszenie PDF (see areaFromAnnouncement).
//
//   4. areaFromAnnouncement — "lokal o powierzchni użytkowej 34,30 m2" from the
//          born-digital ogłoszenie PDF text (pdfText output).
//
//   5. parseResultDoc — the achieved-price stream. The "informacja o wyniku
//          przetargu" PDF follows a fixed numbered template (confirmed live on
//          4 real notices):
//            "... położony w Sępólnie Krajeńskim, ul. Hallera 9/4."
//            "1. Data … przetarg ustny nieograniczony, przeprowadzony w dniu
//                11 października 2023 r. …"
//            "5. Cena wywoławcza nieruchomości: 98 900,00 zł"
//            "6. Najwyższa cena osiągnięta w przetargu: 99 900,00 zł" | "brak"
//            "7. Nabywca nieruchomości: Pani Joanna Jelińska" | "brak"
//          "brak" on lines 6+7 (or a "wynikiem negatywnym" self-report on the
//          NEXT round's ogłoszenie) == unsold.
//
// Fixture groundtruth (real fetches via this Pi, 2026-07-11):
//   Hallera 9/4  lokal mieszkalny nr 4, pow. użytkowa 34,30 m², udział 31/294,
//                KW BY2T/00020115/6, dz. 254 obr. 4, cena wyw. 98 900 zł, I
//                przetarg 11-10-2023 → RESULT sold: cena osiągnięta 99 900 zł,
//                nabywca Pani Joanna Jelińska.
//   Plac Wolności 14/1  lokal mieszkalny nr 1, cena wyw. 69 300 zł, I przetarg
//                11-10-2023 → RESULT negatywny: cena osiągnięta brak, nabywca
//                brak (0 osób dopuszczonych).
//   Plac Wolności 14/2  lokal użytkowy nr 2, pow. użytkowa 28,50 m², II
//                przetarg (I 26-03-2024 "zakończył się wynikiem negatywnym"),
//                cena wyw. 70 000 zł, 12-09-2024 → RESULT sold: cena osiągnięta
//                70 700 zł, nabywca Państwo Izabela i Dariusz Głazik.
//   Osiedle Słowackiego  zabudowana nieruchomość garażem — NO civic
//                street/building number (only działka nr 576) → address
//                unparseable → correctly degrades to no record (kept as a
//                documented residual, not a bug).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PORTAL = 'https://bip.gmina-sepolno.pl';

// --------------------------------------------------------------- shared helpers

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

// Polish-diacritic-safe fold, so keyword regexes can use plain ASCII instead of
// tripping over JS's ASCII-only \w on ą/ć/ę/ł/ń/ó/ś/ź/ż (KNOWN BUG CLASS).
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// Polish price string -> integer PLN. Handles "98 900,00 zł" (space-thousands +
// grosze + trailing zł), "78 100,00" (no zł), "1 234 567,00 zł". Strategy:
// the anchored group captures the well-formed number; the fallback strips
// grouping and cuts the grosze/currency tail.
export function parsePLN(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/[\s  ]/g, '');
  const primary = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?(?:\s*z[łl])?$/i.exec(cleaned);
  if (primary) return Number(primary[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "34,30" / "34.30" -> 34.3 ; "0,0254" -> 0.0254
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

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

// "11-10-2023" (metadata "Data przetargu") -> "2023-10-11". Returns null on a
// non-numeric / malformed value rather than fabricating a date.
export function parseDataPrzetargu(s) {
  const m = /(\d{1,2})[-.](\d{1,2})[-.](\d{4})/.exec(s || '');
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return iso(m[3], mo, m[1]);
}

// "11 października 2023" (result-PDF prose) -> "2023-10-11". Month word is
// diacritic-folded before lookup (pdftotext keeps Polish diacritics).
export function polishDateToIso(s) {
  const m = /(\d{1,2})\s+([A-Za-ząćęłńóśźż]+)\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mo = PL_MONTHS[toAscii(m[2])];
  if (!mo) return null;
  return iso(m[3], mo, m[1]);
}

// Round from the notice title: "Ogłoszenie o II przetargu ustnym…" -> 2, a bare
// "Ogłoszenie o przetargu ustnym…" (no roman before "przetarg") -> 1.
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
export function roundFromTitle(title) {
  const t = toAscii(title || '');
  const m = /\b(vi|v|iv|iii|ii|i)\s+przetarg/.exec(t);
  if (m) return ROMAN[m[1]] ?? 1;
  return 1;
}

// --------------------------------------------------------------- HTML structure

/** <h1 class="pageHeader">TITLE</h1> (falls back to <title> minus the tail). */
export function extractTitle(html) {
  if (!html) return null;
  const m = /<h1[^>]*class="pageHeader"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (m) return stripTags(m[1]);
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (t) return stripTags(t[1]).replace(/\s*-\s*Urząd Miejski.*$/i, '').trim();
  return null;
}

const META_RE =
  /cct-page__name[^"]*">\s*([\s\S]*?)<\/div>\s*<div\s+class="cct-page__value[^"]*">\s*([\s\S]*?)<\/div>/gi;

/**
 * Parse the structured inline metadata block into a { label: value } map.
 * Labels are stored WITHOUT the trailing colon (e.g. "Rodzaj nieruchomości").
 * @param {string} html @returns {Object<string,string>}
 */
export function extractMetadata(html) {
  const out = {};
  if (!html) return out;
  META_RE.lastIndex = 0;
  let m;
  while ((m = META_RE.exec(html)) !== null) {
    const label = stripTags(m[1]).replace(/:\s*$/, '').trim();
    const value = stripTags(m[2]);
    if (label && !(label in out)) out[label] = value;
  }
  return out;
}

/**
 * Extract /download/attachment/<id>/<name> links (absolute URLs).
 * @param {string} html @returns {Array<{url:string}>}
 */
export function extractAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"]+)?\/download\/attachment\/\d+\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let url = m[1];
    if (!/^https?:\/\//i.test(url)) url = PORTAL + url;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url });
  }
  return out;
}

const ANNEX_RE = /zal-nr|zalacznik|mapa|zgloszenie|oswiadczenie|szkic|zdjeci|klauzula|rodo|wynik/i;

/** The born-digital ogłoszenie PDF (never an annex or the result notice). */
export function pickAnnouncementPdf(attachments) {
  const pdfs = (attachments || []).filter((a) => /\.pdf$/i.test(a.url));
  const ann = pdfs.find(
    (a) => /ogloszeni|akt-ogl|przetarg-na-sprzeda/i.test(a.url) && !/wynik/i.test(a.url),
  );
  if (ann) return ann.url;
  const fb = pdfs.find((a) => !ANNEX_RE.test(a.url));
  return fb ? fb.url : null;
}

/** The "informacja o wyniku przetargu" PDF (filename carries "wynik"). */
export function pickResultPdf(attachments) {
  const r = (attachments || []).find((a) => /\.pdf$/i.test(a.url) && /wynik/i.test(a.url));
  return r ? r.url : null;
}

// --------------------------------------------------------------- address

// Strip a leading "ul." and the trailing town/zip/gmina tail so a clean
// "<street> <bldg>/<apt>" remains for parseAddress. "S[eę]p[oó]ln" matches both
// the diacritic ("Sępólnie") and folded forms defensively.
function cleanAddr(s) {
  if (!s) return null;
  let a = String(s).replace(/^\s*ul\.?\s*/i, '').trim();
  a = a.split(/\s+w\s+S[eę]p[oó]ln|,\s*\d{2}-\d{3}|\s+gm\.|\s+w\s+miejscowo/i)[0].trim();
  return a || null;
}

/**
 * The property address for a notice: prefer the "Adres nieruchomości" metadata
 * (present on most notices), else the title's "przy ul. <ADDR> w Sępólnie…"
 * clause. Returns a raw "<street> <bldg>/<apt>" string (may lack a number for
 * area-named garaż sites — parseAddress then yields null, handled upstream).
 * @param {Object<string,string>} meta @param {string|null} title
 * @returns {string|null}
 */
export function addressRawFromNotice(meta, title) {
  const adres = meta && meta['Adres nieruchomości'];
  if (adres) {
    const c = cleanAddr(adres);
    if (c && /\d/.test(c)) return c;
  }
  const m = /przy\s+ul\.?\s+([\s\S]+?)\s+w\s+S[eę]p[oó]ln/i.exec(title || '');
  if (m) return cleanAddr(m[1]);
  return null;
}

// --------------------------------------------------------------- notice → listing

/**
 * Assemble one notice page's HTML into a listing-shaped record. area_m2 is left
 * null here (a DEEP field crawl.js fills from the ogłoszenie PDF).
 * @param {string} html @param {string} url @returns {object}
 */
export function parseNotice(html, url) {
  const title = extractTitle(html) || '';
  const metadata = extractMetadata(html);
  const attachments = extractAttachments(html);

  const przetargNa = metadata['Przetarg na'] || '';
  const isSale =
    /sprzeda[żz]/i.test(title + ' ' + przetargNa) && !/dzier[żz]aw/i.test(title + ' ' + przetargNa);

  // classifyKind on the CMS's own "Rodzaj nieruchomości" field (its
  // classification), falling back to the title BODY — never the URL slug.
  const kind = classifyKind(metadata['Rodzaj nieruchomości'] || title);
  const round = roundFromTitle(title);

  const address_raw = addressRawFromNotice(metadata, title);
  const address = address_raw ? parseAddress(address_raw) : null;

  const starting_price_pln = parsePLN(metadata['Cena wywoławcza']);
  const auction_date = parseDataPrzetargu(metadata['Data przetargu']);
  const year = metadata['Rok'] ? Number(String(metadata['Rok']).replace(/[^\d]/g, '')) || null : null;

  return {
    url,
    title,
    metadata,
    attachments,
    is_sale: isSale,
    kind,
    round,
    address_raw,
    address,
    starting_price_pln,
    auction_date,
    published_year: year,
    announcementPdf: pickAnnouncementPdf(attachments),
    resultPdf: pickResultPdf(attachments),
  };
}

/**
 * "lokal o powierzchni użytkowej 34,30 m2" from the ogłoszenie PDF text.
 * @param {string} text @returns {number|null}
 */
export function areaFromAnnouncement(text) {
  if (!text) return null;
  const m = /powierzchni\w*\s+u[żz]ytkow\w*[^\d]{0,12}([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (m) return parseArea(m[1]);
  const bare = /o\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  return bare ? parseArea(bare[1]) : null;
}

// --------------------------------------------------------------- result PDF

// The result header states the flat as "…, ul. Hallera 9/4." — a street name
// (may be multi-word: "Plac Wolności") then "<bldg>/<apt>" closed by a period.
// Garaż notices on an area-named site ("ul. Osiedle Słowackiego (działka nr
// 576…") carry no <bldg>/<apt> pair → null (correctly no record).
function addressFromResult(text) {
  const m = /\bul\.\s+([^\n,]+?\s+\d+\/\d+[A-Za-z]?)\s*\./.exec(text);
  if (m) return parseAddress(m[1].trim());
  // Fallback: body "lokal (mieszkalny|użytkowy) nr N położony przy ul. STREET BLDG"
  const nr = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  const sb = /po[łl]o[żz]on\w*\s+przy\s+ul\.\s+([\s\S]+?)\s+(\d+[A-Za-z]?)\s+w\s+S[eę]p/i.exec(text);
  if (nr && sb) return parseAddress(`${sb[1].trim()} ${sb[2]}/${nr[1]}`);
  return null;
}

// Read the money value on a numbered result line ("5. Cena wywoławcza
// nieruchomości: 98 900,00 zł" / "6. … osiągnięta …: brak"). "brak" -> null.
function moneyField(text, labelRe) {
  const m = new RegExp('(?:' + labelRe + ')[^:\\n]*:\\s*([^\\n]+)', 'i').exec(text);
  if (!m) return null;
  const v = m[1].trim();
  if (/^brak\b/i.test(v)) return null;
  const num = /([\d][\d\s .,]*\d|\d)/.exec(v);
  return num ? parsePLN(num[1]) : null;
}

/**
 * Parse one "informacja o wyniku przetargu" PDF text into result record(s).
 * @param {string} text  pdfText output
 * @param {string|null} fallbackDate  ISO date from the notice metadata
 * @param {string} sourceUrl  absolute URL of the result PDF
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  // Gate: must look like a result notice.
  const isResult =
    /o\s+wyniku\s+przetargu/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /najwy[żz]sza\s+cena/i.test(t) ||
    /wynik(?:iem)?\s+negatywn/i.test(t);
  if (!isResult) return [];

  const address = addressFromResult(t);
  if (!address) return []; // no address to key on (e.g. area-named garaż site)

  const kind = classifyKind(t);

  const dateM =
    /(?:przeprowadzon\w*\s+w\s+dniu|w\s+dniu)\s+(\d{1,2}\s+[A-Za-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
  const auction_date = polishDateToIso(dateM ? dateM[1] : '') || fallbackDate || null;

  const starting_price_pln = moneyField(t, 'cena\\s+wywo[łl]awcza');
  const final_price_pln = moneyField(
    t,
    'najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]ta|cena\\s+osi[ąa]gni[ęe]ta',
  );

  const nabywcaM = /Nabywca\s+nieruchomo[śs]ci\s*:\s*([^\n]+)/i.exec(t);
  const nabywca = nabywcaM ? nabywcaM[1].trim() : null;
  const hasBuyer = Boolean(nabywca) && !/^brak\b/i.test(nabywca);

  const negative =
    /wynik(?:iem)?\s+negatywn/i.test(t) || final_price_pln == null || !hasBuyer;
  const outcome = !negative && final_price_pln != null ? 'sold' : 'unsold';
  const unsold_reason = outcome === 'unsold' ? 'wynik negatywny' : null;

  return [{
    kind,
    address,
    address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
    round: null, // the result notice does not state the round number
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}
