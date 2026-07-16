// Włocławek parsers — extranet "BIP w JST" (gov.pl-BIP) CMS at bip.wloclawek.eu
// (bip.um.wlocl.pl 302-redirects here). See config.js for the full rationale.
//
// Roles:
//   1. extractTitle / extractMetadata / extractAttachments
//        — pull the <h1 class="pageHeader"> title, the structured inline
//          metadata block (repeated
//            <div class="cct-page__name"> LABEL: </div>
//            <div class="cct-page__value"> VALUE </div>
//          pairs, each wrapped in a "cct-page__attribute--NNN" div — the SAME
//          skeleton as sepolno-krajenskie, confirmed live 2026-07-16), and the
//          /download/attachment/<id>/<name> links out of one notice page.
//
//   2. pickResultAttachment — choose the "informacja o wyniku przetargu" /
//        "informacja o rozstrzygniętym przetargu" attachment, preferring a
//        .docx twin (born-digital, no OCR risk) over a .pdf when both exist
//        (Kilińskiego 12A/1's real fixture carries both).
//
//   3. parseNotice — assemble one notice's HTML into a listing-shaped record.
//        Unlike sepolno, area_m2 comes straight from the notice BODY prose
//        ("o powierzchni NN,NN m²") — no separate ogłoszenie PDF needed here.
//        kind = classifyKind(metadata['Rodzaj nieruchomości'] + ' ' + title):
//        Włocławek's "Rodzaj nieruchomości" is a COARSE 6-value board-filter
//        category (Nieruchomości niezabudowane/zabudowane, Lokale
//        mieszkalne/niemieszkalne, Najem lokali mieszkalne/niemieszkalne), and
//        it can be flatly WRONG for a udział (share) sale (Jagiellońska 2/4's
//        own metadata says "Nieruchomości niezabudowane" even though the title
//        clearly reads "...zabudowanej budynkiem mieszkalnym..." — confirmed
//        live). classifyKind's ordering/guards (see core/classify-kind.js)
//        already resolve this correctly when metadata+title are concatenated:
//        a positive "zabudowanej" in the title beats a "niezabudowane" in the
//        metadata, because the LAND branch is guarded by a "not also built"
//        check. address (from "Adres nieruchomości" metadata, which for lokal
//        entries omits the unit number — "ul. Kilińskiego 12A we Włocławku"
//        with NO "/1" — so the "lokal(u) mieszkalnego/użytkowego nr N" clause
//        in the TITLE supplies the apartment number, combined here).
//
//   4. areaFromBody — "o powierzchni 40,70 m², składa się z ..." from the
//        notice body HTML (plain prose, born-digital HTML — no PDF/OCR).
//
//   5. parseResultDoc — the achieved-price stream. Włocławek's result-doc
//        template is a flowing "INFORMUJE" prose (not sepolno's numbered-line
//        template):
//          "W dniu 24 kwietnia 2024 r. w siedzibie ... odbył się ... przetarg
//           ustny nieograniczony na sprzedaż ... ul. Kilińskiego 12A we
//           Włocławku, ..."
//          "Cena wywoławcza nieruchomości : 110 270,00 zł"
//          "Wylicytowana cena nieruchomości : 111 380,00 zł"
//          "Nabywcą nieruchomości został Pan Adam Kuliński ."
//        (a second real template variant drops "Lista osób ..." lines and
//        reads "Cena netto wywoławcza nieruchomości:" / "Wylicytowana cena
//        netto nieruchomości:" / "Nabywcą nieruchomości została - <company>."
//        — Jagiellońska 2/4's fixture; handled by the same regexes, "netto"
//        and "netto " being optional).
//
// Fixture groundtruth (real fetches via this Pi, 2026-07-16):
//   Kilińskiego 12A/1  lokal mieszkalny nr 1, pow. 40,70 m², udział
//                407/3568, KW WL1W/00043190/6, dz. 7/1 KM 45, cena wyw.
//                110 270 zł, III przetarg 24-04-2024 (I 12-06-2023 i II
//                13-11-2023 both "wynikiem negatywnym", self-reported in this
//                page's own prose, no separate result doc for either) →
//                RESULT sold: cena wylicytowana 111 380 zł, nabywca Pan Adam
//                Kuliński. Attachments: wynik-przetarg-kilinskiego.pdf
//                (born-digital, pdftotext succeeds) +
//                informacja-o-wyniku-przetargu-kilinskiego-12a-m-1.docx
//                (dokument dostępny cyfrowo — preferred).
//   Jagiellońska 2/4  udział 271/350 części zabudowanej budynkiem mieszkalnym
//                nieruchomości, dz. 53/5 KM 49/1, cena wyw. netto 83 250 zł,
//                III przetarg 18-12-2023 (I 24-07-2023 i II 18-09-2023 both
//                "wynikiem negatywnym", self-reported) → RESULT sold: cena
//                wylicytowana netto 84 100 zł, nabywca "KA-BO Borkowski Spółka
//                Komandytowa" (a company, not "Pan/Pani" — the buyer regex
//                must not assume a person). Attachment:
//                informacja-o-rozstrzygnietym-przetargu-...-dokument-dostepny-
//                cyfrowo.pdf — labelled "dostępny cyfrowo" but is in fact a
//                SCANNED image PDF (pdftotext → a single \f byte); OCR'd here.
//                The OCR'd text is terse enough that classifyKind() alone
//                would misread it as 'grunt' (bare "działka nr 53/5 ... o pow.
//                0,0209 ha", no "zabudowan"/"udział" repeated) — parseResultDoc
//                overrides 'grunt' → 'zabudowana' once a clean civic
//                street+building address has already been resolved (see
//                resultKind below), because Włocławek's genuine bare-land
//                notices are referenced by "ul. <street>" with NO building
//                number, or by "działka nr" alone — never by a resolvable
//                street+number civic address.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PORTAL = 'https://bip.wloclawek.eu';

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

// Polish price string -> integer PLN. Handles "110 270,00 zł" (space-thousands +
// grosze + trailing zł), "83 250,00" (no zł), "1 234 567,00 zł".
export function parsePLN(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/[\s ]/g, '');
  const primary = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?(?:\s*z[łl])?$/i.exec(cleaned);
  if (primary) return Number(primary[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "40,70" / "40.70" -> 40.7
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
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

// "24-04-2024" (metadata "Data przetargu") -> "2024-04-24".
export function parseDataPrzetargu(s) {
  const m = /(\d{1,2})[-.](\d{1,2})[-.](\d{4})/.exec(s || '');
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return iso(m[3], mo, m[1]);
}

// "24 kwietnia 2024" (result-doc prose) -> "2024-04-24".
export function polishDateToIso(s) {
  const m = /(\d{1,2})\s+([A-Za-ząćęłńóśźż]+)\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mo = PL_MONTHS[toAscii(m[2])];
  if (!mo) return null;
  return iso(m[3], mo, m[1]);
}

// Round from the notice title: "III przetarg ustny…" -> 3, a bare "Ogłoszenie
// o przetargu ustnym…" (no roman before "przetarg") -> 1.
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
  if (t) return stripTags(t[1]).replace(/\s*-\s*Urząd Miasta.*$/i, '').trim();
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

const RESULT_RE = /wynik|rozstrzygni/i;

/**
 * The "informacja o wyniku/rozstrzygniętym przetargu" attachment: prefer a
 * .docx twin (born-digital, "dokument dostępny cyfrowo") over a .pdf when both
 * exist for the same notice (Kilińskiego 12A/1's real fixture carries both).
 * @param {Array<{url:string}>} attachments @returns {string|null}
 */
export function pickResultAttachment(attachments) {
  const matches = (attachments || []).filter((a) => RESULT_RE.test(a.url));
  if (!matches.length) return null;
  const docx = matches.find((a) => /\.docx$/i.test(a.url));
  if (docx) return docx.url;
  const pdf = matches.find((a) => /\.pdf$/i.test(a.url));
  return pdf ? pdf.url : matches[0].url;
}

// --------------------------------------------------------------- address

// Strip a leading "ul." and a trailing "we/w Włocławku" or cadastral clause, so
// a clean "<street> <bldg>" remains for parseAddress.
function cleanAddr(s) {
  if (!s) return null;
  let a = String(s).replace(/^\s*ul\.?\s*/i, '').trim();
  a = a.split(
    /\s+we?\s+W[łl]oc[łl]awk\w*|,\s*dz\.|,?\s*obr[eę]b|,\s*KM|,?\s*oznaczon\w*|,?\s*obj[eę]t\w*|,\s*\d{2}-\d{3}|\s+w\s+budynku/i,
  )[0].trim();
  return a || null;
}

// "lokal(u) mieszkalnego/użytkowego/niemieszkalnego nr N" -> "N" (the apartment
// number Włocławek's "Adres nieruchomości" metadata omits for lokal entries).
function lokalNrFromText(text) {
  const m = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(
    text || '',
  );
  return m ? m[1] : null;
}

/**
 * The property address for a notice: the "Adres nieruchomości" metadata,
 * cleaned, plus the title's "lokal(u) ... nr N" apartment number when the
 * cleaned address has no "/N" suffix of its own.
 * @param {Object<string,string>} meta @param {string|null} title
 * @returns {string|null}
 */
export function addressRawFromNotice(meta, title) {
  const base = cleanAddr(meta && meta['Adres nieruchomości']);
  if (!base) return null;
  if (!/\//.test(base)) {
    const nr = lokalNrFromText(title);
    if (nr) return `${base}/${nr}`;
  }
  return base;
}

// --------------------------------------------------------------- area (body HTML)

/**
 * "o powierzchni 40,70 m², składa się z ..." from the notice body prose
 * (plain HTML — no PDF/OCR needed for Włocławek listings).
 * @param {string} html @returns {number|null}
 */
export function areaFromBody(html) {
  if (!html) return null;
  const contentM = /<div class="bip-page__content">([\s\S]*?)(?:<div class="bip-page__footer">|$)/i.exec(
    html,
  );
  const scope = contentM ? contentM[1] : html;
  const text = stripTags(scope);
  const m = /o\s+powierzchni\s+([\d]+[.,]\d+)\s*m\s*[²2]/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

// --------------------------------------------------------------- notice → listing

/**
 * Assemble one notice page's HTML into a listing-shaped record.
 * @param {string} html @param {string} url @returns {object}
 */
export function parseNotice(html, url) {
  const title = extractTitle(html) || '';
  const metadata = extractMetadata(html);
  const attachments = extractAttachments(html);

  const isSale =
    /sprzeda[żz]/i.test(title) &&
    !/dzier[żz]aw|najem/i.test(title) &&
    !/Skarbu\s+Państwa/i.test(title);

  // classifyKind on metadata + title combined: metadata's "Rodzaj
  // nieruchomości" is a coarse board-filter category that can be wrong for a
  // udział sale (see header comment); the ordering/guards in
  // core/classify-kind.js let a positive "zabudowanej" in the title win over a
  // "niezabudowane" mention in the metadata.
  const kind = classifyKind(`${metadata['Rodzaj nieruchomości'] || ''} ${title}`);
  const round = roundFromTitle(title);

  const address_raw = addressRawFromNotice(metadata, title);
  const address = address_raw ? parseAddress(address_raw) : null;

  const starting_price_pln = parseStartingPriceFromField(metadata['Cena wywoławcza']);
  const auction_date = parseDataPrzetargu(metadata['Data przetargu']);
  const year = metadata['Rok publikacji']
    ? Number(String(metadata['Rok publikacji']).replace(/[^\d]/g, '')) || null
    : null;
  const area_m2 = areaFromBody(html);

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
    area_m2,
    published_year: year,
    resultDocUrl: pickResultAttachment(attachments),
  };
}

// The "Cena wywoławcza" metadata VALUE is a prose sentence, not a bare number —
// e.g. "110 270,00 zł. Sprzedaż lokalu ... zwolniona ... Wadium wynosi
// 10 000,00 zł." (price first) or "Cena netto wynosi – 83 250,00 zł.<br />Wadium
// ... 8 325,00 zł" (price after a lead-in phrase, wadium follows). In both real
// fixtures the FIRST money token in the field is the actual cena wywoławcza —
// extract that.
function parseStartingPriceFromField(value) {
  if (!value) return null;
  const m = /([\d][\d\s]*(?:[.,]\d{2})?)\s*z[łl]/i.exec(value);
  return m ? parsePLN(m[1]) : null;
}

// --------------------------------------------------------------- result doc

// "ul. Kilińskiego 12A we Włocławku, usytuowanego..." or "ul. Jagiellońskiej
// 2/4, oznaczonej..." — capture up to the first comma, then strip a trailing
// "we/w Włocławku" if present; combine with a "lokal ... nr N" mention
// elsewhere in the doc when the base has no "/apt" of its own.
//
// LOAD-BEARING GOTCHA (caught only by testing against the real fixtures): the
// result doc ALWAYS mentions the auction VENUE's address first — "w siedzibie
// Urzędu Miasta Włocławek przy ul. 3 Maja 22 odbył się ..." / "Urzędu Miasta
// Włocławek ul. 3 Maja 22, w sali nr 9, odbył się ..." — before the property's
// own address. A naive "first ul." match grabs the venue (wrong address, and
// in the Kilińskiego fixture the venue clause has no comma before the NEXT
// one, so a naive match swallows the whole following sentence and fails to
// parse at all). Anchor on "położonego/położonej ... przy ul." instead — the
// phrase that specifically introduces the PROPERTY's own location — falling
// back to the LAST "ul." mention (the venue is always first) if that anchor
// isn't present.
function addressFromResult(text) {
  const t = text || '';
  let m = /po[łl]o[żz]on\w*[\s\S]{0,80}?\bul\.\s+([^\n,]+)/i.exec(t);
  if (!m) {
    const all = [...t.matchAll(/\bul\.\s+([^\n,]+)/gi)];
    m = all.length ? all[all.length - 1] : null;
  }
  if (!m) return null;
  let base = m[1].trim().replace(/\s+we?\s+W[łl]oc[łl]awk\w*\s*$/i, '').trim();
  if (!base) return null;
  if (!/\//.test(base)) {
    const nr = lokalNrFromText(t);
    if (nr) base = `${base}/${nr}`;
  }
  return parseAddress(base);
}

// Read a money value that follows a labelled line, e.g. "Cena wywoławcza
// nieruchomości : 110 270,00 zł" / "Cena netto wywoławcza nieruchomości:
// 83 250,00 zł". "netto" is optional both before and after "wywoławcza".
function moneyField(text, labelRe) {
  const m = new RegExp(labelRe + '\\s*:?\\s*([\\d][\\d\\s]*(?:[.,]\\d{2})?)\\s*z[łl]', 'i').exec(
    text,
  );
  return m ? parsePLN(m[1]) : null;
}

const START_PRICE_RE = 'Cena\\s+(?:netto\\s+)?wywo[łl]awcza(?:\\s+netto)?\\s+nieruchomo[śs]ci';
const FINAL_PRICE_RE = 'Wylicytowana\\s+cena\\s+(?:netto\\s+)?nieruchomo[śs]ci';

// "Nabywcą nieruchomości został Pan Adam Kuliński ." (person) or "Nabywcą
// nieruchomości została - KA-BO Borkowski Spółka Komandytowa." (company — the
// buyer is not always a "Pan/Pani").
function buyerFromResult(text) {
  const m = /Nabywc[ąa]\s+nieruchomo[śs]ci\s+zosta[łl]\w*\s*[-–]?\s*([^\n.]+?)\s*\./i.exec(
    text || '',
  );
  if (!m) return null;
  const v = m[1].trim();
  return v && !/^brak\b/i.test(v) ? v : null;
}

// classifyKind on the result doc's own (often terse) text can under-inform: a
// notice whose announcement clearly reads "zabudowanej budynkiem mieszkalnym"
// may reduce, in its short result doc, to a bare "sprzedaż nieruchomości ...
// działka nr 53/5 ... o pow. 0,0209 ha" (confirmed live: Jagiellońska 2/4's OCR
// text, 2026-07-16) — classifyKind then defaults to 'grunt' on the "działka"
// mention alone. But by this point `address` already resolved a clean civic
// "ul. <street> <bldg>" — Włocławek's genuine bare-land notices are referenced
// by "ul. <street>" with NO building number, or by "działka nr" alone with no
// street at all, so a resolvable street+building address is itself evidence
// this is an address-keyed (built-property share) sale, not undeveloped land.
function resultKind(text, hasAddress) {
  const k = classifyKind(text);
  return k === 'grunt' && hasAddress ? 'zabudowana' : k;
}

/**
 * Parse one "informacja o wyniku/rozstrzygniętym przetargu" doc's text
 * (docText/pdfText/ocrPdf output) into result record(s).
 *
 * KNOWN LIMITATION: Włocławek does not appear to publish a dedicated
 * negative-result document (see config.js) — both live fixtures groundtruthing
 * this function are SOLD. The unsold branch below is defensive-by-construction
 * (mirrors the confirmed sepolno-krajenskie template on the same CMS family)
 * but not live-verified against a real Włocławek negative-result document.
 *
 * @param {string} text
 * @param {string|null} fallbackDate  ISO date from the notice metadata
 * @param {string} sourceUrl  absolute URL of the result doc
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const isResult =
    /informuj[ea]/i.test(t) ||
    /o\s+wyniku\s+przetargu/i.test(t) ||
    /o\s+rozstrzygni[eę]tym\s+przetargu/i.test(t) ||
    /wylicytowan\w*\s+cena/i.test(t) ||
    /nabywc[ąa]\s+nieruchomo[śs]ci/i.test(t);
  if (!isResult) return [];

  const address = addressFromResult(t);
  if (!address) return [];

  const kind = resultKind(t, true);

  const dateM = /w\s+dniu\s+(\d{1,2}\s+[A-Za-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
  const auction_date = polishDateToIso(dateM ? dateM[1] : '') || fallbackDate || null;

  const starting_price_pln = moneyField(t, START_PRICE_RE);
  const final_price_pln = moneyField(t, FINAL_PRICE_RE);

  const buyer = buyerFromResult(t);
  const hasBuyer = Boolean(buyer);

  const negative = /wynik(?:iem)?\s+negatywn/i.test(t) || final_price_pln == null || !hasBuyer;
  const outcome = !negative && final_price_pln != null ? 'sold' : 'unsold';
  const unsold_reason = outcome === 'unsold'
    ? (/wynik(?:iem)?\s+negatywn/i.test(t) ? 'wynik negatywny' : 'brak nabywcy')
    : null;

  return [{
    kind,
    address,
    address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
    round: null, // the result doc does not state the round number
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}
