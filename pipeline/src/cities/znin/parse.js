// Żnin parsers — bespoke server-rendered BIP `bip.gminaznin.pl`
// ("System Rada"/eSesja CMS, Bootstrap + DataTables front-end).
//
// SOURCE SHAPE (confirmed live 2026-07-12, browser-UA fetch — the default bot
// UA 403s; see crawl.js). Municipal property is sold via "przetarg ustny
// nieograniczony na sprzedaż" (open oral auction — the in-scope format; the
// board also carries a few "ustny ograniczony do właścicieli sąsiednich" and
// one "pisemny nieograniczony", all SALES, all kept — only rentals are skipped).
// Every auction is its own article at `/nieruchomosc/<slug>`, discovered from
// the dedicated board `/nieruchomosci` (34 live). The board skews to land: of 34
// current notices ~21 are land (działki / nieruchomości niezabudowane), ~7 are
// commercial (lokal użytkowy / niemieszkalny), ~4 are built (zabudowana), and
// exactly ONE is a lokal mieszkalny (Jadowniki Rycerskie 27/4) — flats recur but
// are rare.
//
// WHERE THE FIELDS LIVE. Each `/nieruchomosc/<slug>` page renders a clean,
// LABELLED structured block inline in the server HTML (NOT free prose):
//     <h1 class="my-3 my-md-4">TITLE</h1>
//     Sprzedaż · <KIND LABEL> · Przeznaczenie: …
//     [Powiązane przetargi  ← related-rounds table: other rounds of THIS
//                              property, linked /nieruchomosc/<slug> + Data
//                              publikacji. Never carries the Cena/Wadium/Obręb
//                              labels, so field extraction is immune to it.]
//     Cena wywoławcza  <N> PLN     ·  cena za metr <x,xx> zł
//     Wadium           <N> PLN
//     Powierzchnia: <A> m²   ·  Obręb: <O>   ·  Numer działki: <D>
//     Księga wieczysta: <KW> ·  Tryb przetargu: Przetarg ustny nieograniczony
// This block gives kind, cena wywoławcza, wadium, powierzchnia (ALREADY in m²
// for land — no ha conversion), obręb, numer działki, KW, tryb, and (via the
// H1) round + apartment/building — everything EXCEPT the auction date.
//
// THE AUCTION DATE IS ONLY IN THE OGŁOSZENIE PDF, and every ogłoszenie PDF here
// is a SCANNED image (pdftotext yields the "\f" tiny-junk empty string), so the
// date needs OCR (see crawl.js — pdfText-first, ocrPdf fallback, best-effort:
// a 403/broken PDF or an unparseable scan just leaves auction_date null and the
// inline-HTML listing still ships). OCR text reads e.g. "Przetarg odbędzie się w
// Auli Urzędu Miejskiego w Żninie (pokój nr 29) … w dniu 18 czerwca 2026 r. o
// godz. …" — extractAuctionDate anchors on "odbędzie się" so the decoy dates
// ("upłynął w dniu …", "Wadium należy wpłacić … do dnia …") never win.
//
// THE ACHIEVED-PRICE STREAM — UNSOLD-ONLY (same shape as the wolow analog). This
// BIP publishes NO "informacja o wyniku przetargu" document for property: the
// "Inne wyniki" board (/artykul/inne-wyniki) holds one unrelated 2011 item, and
// no result-notice slug exists on the property board. The ONLY confirmed outcome
// signal is a SUPERSEDED round — round K's own notice existing alongside a round
// K+1 notice for the SAME subject (address key for flats/commercial, parcel+obręb
// for land) PROVES round K did not sell. crawlResultDocs() forwards each such
// round K's OWN html; parseResultDoc extracts its real price/area/subject but
// never a hammer price (none is published), so every result is outcome:'unsold',
// final_price_pln:null. Documented residual, not a bug (ADAPTER-GUIDE §7).
//
// classifyKind runs on the H1 TITLE + the structured KIND LABEL (both part of the
// document body), NEVER the URL slug (a Kl. Janickiego "zabudowana" whose TITLE
// omits "zabudowanej" is only resolved correctly by the "Nieruchomość zabudowana"
// label — the slug is untrusted per ADAPTER-GUIDE §5).
//
// FIXTURE GROUNDTRUTH (real live fetches 2026-07-12, this Pi's Polish IP):
//   FLAT  Jadowniki Rycerskie 27/4, lokal mieszkalny nr 4, 56 m²:
//     round I  cena 82 000 zł, wadium 10 000 zł, dz. 112, KW BY1Z/00019004/2,
//              auction 2026-06-18 (OCR: "…w dniu 18 czerwca 2026 r.")
//   LAND  Brzyskorzystew, dz. nr 295/10, 1391 m²:
//     round I  cena 99 700 zł, wadium 9 000 zł, KW BY1Z/00022073/0 — rounds
//              I/II/III all on the board ⇒ rounds I,II confirmed superseded/unsold
//   COMMERCIAL  Żnin, ul. Gnieźnieńska 18, lokal niemieszkalny nr 13, 20,50 m²:
//     round I  cena 18 000 zł, wadium 1 800 zł, dz. 1154/3, KW BY1Z/00014177/0,
//              auction 2026-01-15 (OCR) — round II on the board ⇒ I superseded

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function stripTags(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // <sup>2</sup> in "56 m<sup>2</sup>" → keep the digit joined: "56 m2"
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// Polish-diacritic-safe fold for keyword tests (JS \w is ASCII-only).
export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

// "82 000,00" / "99 700,00 PLN" / "18000" → integer PLN, or null. Space (incl.
// NBSP / thin) thousands, comma or dot decimal tail dropped.
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s  ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');            // drop grosze tail
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "56" / "51,90" / "51.90" / "1391" → float m², or null. Every Żnin area (land
// included) is stated directly in m² — there is NO hectare form to convert.
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  // full genitive + nominative (OGŁOSZENIE PDF / OCR auction dates)
  stycznia: 1, styczen: 1, lutego: 2, luty: 2, marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8, wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10, listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
  // 3-letter abbreviations used by the CMS "Data publikacji" field
  sty: 1, lut: 2, mar: 3, kwi: 4, cze: 6, lip: 7, sie: 8, wrz: 9, paz: 10, lis: 11, gru: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "18 czerwca 2026" / "18.06.2026" / "15 stycznia 2026 r." → ISO, or null.
export function parsePolishDate(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
  if (num) {
    const d = +num[1], m = +num[2];
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return iso(num[3], m, d);
  }
  const word = /(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[toAscii(word[2])];
    if (mon) return iso(word[3], mon, +word[1]);
  }
  return null;
}

// Polish ordinal → round. Titles open "Pierwszy/Drugi/Trzeci/Czwarty … przetarg".
const ORDINALS = {
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, piaty: 5, szosty: 6,
  siodmy: 7, osmy: 8, dziewiaty: 9, dziesiaty: 10,
};
export function roundFromTitle(title) {
  const t = toAscii(title || '');
  const m = /\b(pierwszy|drugi|trzeci|czwarty|piaty|szosty|siodmy|osmy|dziewiaty|dziesiaty)\s+przetarg/.exec(t);
  return m ? ORDINALS[m[1]] : null;
}

// ---------------------------------------------------------------------------
// HTML structure (System Rada / eSesja article template)
// ---------------------------------------------------------------------------

/** First (and only) content <h1> = the notice title. @returns {string|null} */
export function extractTitle(html) {
  if (!html) return null;
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

/** Plain text of the notice, from just after the H1 to the "Metadane" section
 *  header (the field block + related-rounds table; excludes the page chrome).
 *  @returns {string} */
export function extractBodyText(html) {
  if (!html) return '';
  const h1 = /<\/h1>/i.exec(html);
  const start = h1 ? h1.index + h1[0].length : 0;
  const meta = /<h2[^>]*>\s*Metadane/i.exec(html);
  const end = meta ? meta.index : html.length;
  return stripTags(html.slice(start, end));
}

/** "Data publikacji: DD <miesiąc> YYYY, godz. HH:MM" → ISO, or null. Requires
 *  the colon so the label-only "Data publikacji</th>" header of the related-
 *  rounds table (which has no colon) is never mistaken for the real field. */
export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /Data\s+publikacji\s*:(?:<[^>]*>|&nbsp;|\s)*(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,})\s+(\d{4})/i.exec(html);
  if (m) {
    const mon = PL_MONTHS[toAscii(m[2])];
    if (mon) return iso(m[3], mon, +m[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Structured-field extraction (from the plain-text body)
// ---------------------------------------------------------------------------

// Labels that terminate a field value (the block renders them in this order).
const FIELD_STOP =
  'Cena wywoławcza|cena za metr|Wadium|Powierzchnia|Obręb|Numer działki|Numer ewidencyjny|Księga wieczysta|Tryb przetargu|Opis nieruchomości|Położenie|Linki|Załączniki|$';

function afterLabel(body, label) {
  const m = new RegExp(label + '\\s*:?\\s*([\\s\\S]*?)\\s*(?:' + FIELD_STOP + ')', 'i').exec(body || '');
  return m ? m[1].trim() : null;
}

/** "Cena wywoławcza 82 000,00 PLN" → 82000. Stops at the first PLN/zł so the
 *  trailing "cena za metr …" never leaks in. @returns {number|null} */
export function extractCena(body) {
  const m = /Cena\s+wywoławcza\s*([\d\s .,]+?)\s*(?:PLN|z[łl])/i.exec(body || '');
  return m ? parsePLN(m[1]) : null;
}

/** "Wadium 10 000,00 PLN" → 10000. @returns {number|null} */
export function extractWadium(body) {
  const m = /Wadium\s*([\d\s .,]+?)\s*(?:PLN|z[łl])/i.exec(body || '');
  return m ? parsePLN(m[1]) : null;
}

/** "Powierzchnia: 56 m2" / "51.90 m2" / "1391 m2" → m². @returns {number|null} */
export function extractArea(body) {
  const m = /Powierzchnia\s*:?\s*(\d+(?:[.,]\d+)?)\s*m/i.exec(body || '');
  return m ? parseArea(m[1]) : null;
}

/** "Obręb: Jadowniki Rycerskie" → "Jadowniki Rycerskie". @returns {string|null} */
export function extractObreb(body) {
  const v = afterLabel(body, 'Obręb');
  return v || null;
}

/** "Numer działki: 295/10" → "295/10". @returns {string|null} */
export function extractDzialka(body) {
  const v = afterLabel(body, 'Numer działki');
  if (!v) return null;
  // Keep parcel tokens (digits, "/", comma/"i"/"oraz" joins); drop stray words.
  const m = /\d+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*\d+(?:\/\d+)?)*/.exec(v);
  return m ? m[0].replace(/\s*(?:,|i|oraz)\s*/g, ', ').trim() : null;
}

/** "Księga wieczysta: BY1Z/00019004/2" → the KW number. @returns {string|null} */
export function extractKW(body) {
  const m = /Księga\s+wieczysta\s*:?\s*([A-Z]{2}\d[A-Z]\/\d{6,}\/\d)/i.exec(body || '');
  return m ? m[1].toUpperCase() : null;
}

// ---------------------------------------------------------------------------
// Address extraction (address-keyed kinds: mieszkalny / uzytkowy / zabudowana)
// ---------------------------------------------------------------------------
//
// Two real shapes, both stated in the H1 TITLE:
//   village flat  "lokalu mieszkalnego nr 4 położonego w Jadownikach Rycerskich
//                  w budynku mieszkalnym nr 27" → apt 4, bldg 27, street=obręb
//                  ("Jadowniki Rycerskie" — villages have no named streets)
//   town unit     "lokalu niemieszkalnego nr 13 … przy ul. Gnieźnieńskiej 18"
//                  → apt 13, street "Gnieźnieńskiej", bldg 18
// A built plot stated only as "przy ul. Kl. Janickiego … jako działka nr 1741/3"
// (no building number) yields no address and is intentionally dropped downstream
// (build-properties tolerates an occasional unparseable address).

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
// street name after "ul./al./pl./os. " up to the first "<space><building no>"
const UL_WITH_NUM = new RegExp(
  `\\b(?:ul|al|pl|os)\\.\\s+([${PL_UP}0-9][\\p{L}0-9.\\- ]*?)\\s+(\\d+[A-Za-z]?)\\b`, 'u');
// street name after "ul./…" with NO building number (stops at comma/clause)
const UL_ONLY = new RegExp(
  `\\b(?:ul|al|pl|os)\\.\\s+([${PL_UP}][\\p{L}.\\- ]*?)(?=[,.]|\\s+oznaczon|\\s+dzia[łl]|$)`, 'u');
// apartment/unit number, stated separately from street+building
const APT_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;
// village-flat building number
const BUD_RE = /budynku?\s+(?:mieszkaln\w+\s+)?nr\s+(\d+[A-Za-z]?)/i;

/**
 * @param {string} title @param {string|null} obreb
 * @returns {{address:object|null, address_raw:string|null}}
 */
export function extractAddress(title, obreb) {
  const t = title || '';
  const apt = (APT_RE.exec(t) || [])[1] || null;
  let street = null, building = null;

  const withNum = UL_WITH_NUM.exec(t);
  if (withNum) {
    street = withNum[1].trim().replace(/\s+/g, ' ');
    building = withNum[2];
  } else {
    const bud = BUD_RE.exec(t);
    if (bud) building = bud[1];
    const only = UL_ONLY.exec(t);
    street = only ? only[1].trim().replace(/\s+/g, ' ') : (obreb || null);
  }
  if (!street || !building) return { address: null, address_raw: null };
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address: parseAddress(raw), address_raw: raw };
}

// ---------------------------------------------------------------------------
// Auction date (from the OGŁOSZENIE PDF text — pdfText or OCR; see crawl.js)
// ---------------------------------------------------------------------------

/**
 * "Przetarg odbędzie się … w dniu 18 czerwca 2026 r." → "2026-06-18". Anchored
 * on "odbędzie się" so the notice's other dates (art. 34 claim deadline, wadium
 * deadline) can't win. Handles both spelled-out and DD.MM.YYYY forms. Diacritic-
 * and OCR-tolerant. @param {string} text @returns {string|null}
 */
export function extractAuctionDate(text) {
  if (!text) return null;
  const m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,220}?(?:w\s+dniu\s+)?(\d{1,2}\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,}\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(text);
  return m ? parsePolishDate(m[1]) : null;
}

// ---------------------------------------------------------------------------
// Attachment (ogłoszenie PDF) URL
// ---------------------------------------------------------------------------

const HOST = 'https://bip.gminaznin.pl';

/** The ogłoszenie PDF under "Załączniki do pobrania", as an absolute URL. Prefers
 *  a filename containing "ogloszen"; else the first non-boilerplate zalaczniki
 *  PDF (excludes the site-wide "plan-urzedu…" contact-footer attachment).
 *  @param {string} html @returns {string|null} */
export function ogloszeniePdfUrl(html) {
  if (!html) return null;
  const links = [...html.matchAll(/href="((?:https?:\/\/bip\.gminaznin\.pl)?\/pliki\/umznin\/zalaczniki\/\d+\/[^"]*\.pdf)"/gi)]
    .map((m) => m[1])
    .filter((u) => !/plan-urzedu/i.test(u));
  const pick = links.find((u) => /og[łl]oszen/i.test(u)) || links[0] || null;
  if (!pick) return null;
  return pick.startsWith('http') ? pick : HOST + pick;
}

// ---------------------------------------------------------------------------
// Top-level notice parser
// ---------------------------------------------------------------------------

/** Cancellation / invalidation guard (title-scoped). */
export function isCancelled(title) {
  const t = toAscii(title || '').trim();
  return /odwolan\w*\s+przetarg|uniewazni|^ogloszenie\s+o\s+odwolan/.test(t);
}

/** Rental guard — the board is sales-only, but skip a lease/rent notice if one
 *  ever appears. @param {string} text @returns {boolean} */
export function isRental(text) {
  return /dzierzaw|najem|najmu|wynajm|oddani\w+\s+w\s+(?:najem|dzierzaw)/.test(toAscii(text || ''));
}

/**
 * Parse one `/nieruchomosc/<slug>` notice page into the common record shape.
 * Does NOT set auction_date — that comes from the OGŁOSZENIE PDF via crawl.js.
 * @param {string} html @param {string} url @returns {object}
 */
export function parseNotice(html, url) {
  const title = extractTitle(html) || '';
  const body = extractBodyText(html);
  // KIND: title + the structured "Nieruchomość zabudowana/niezabudowana" /
  // "Lokal …" label — the document body, never the URL slug.
  const kindLabelM = /Sprzedaż\s+([A-ZŻŚ][^.]*?)\s+Przeznaczenie/i.exec(body);
  const kindLabel = kindLabelM ? kindLabelM[1].trim() : '';
  const kind = classifyKind(`${kindLabel}. ${title}`);

  const obreb = extractObreb(body);
  const dzialka_nr = extractDzialka(body);
  const { address, address_raw } = kind === 'grunt'
    ? { address: null, address_raw: null }
    : extractAddress(title, obreb);

  return {
    kind,
    title,
    round: roundFromTitle(title),
    cancelled: isCancelled(title),
    area_m2: extractArea(body),
    starting_price_pln: extractCena(body),
    wadium_pln: extractWadium(body),
    obreb,
    dzialka_nr,
    kw: extractKW(body),
    address,
    address_raw,
    published_date: extractPublishedDate(html),
    detail_url: url,
    pdf_url: ogloszeniePdfUrl(html),
  };
}

// ---------------------------------------------------------------------------
// Result parser (registry contract) — CONFIRMED-superseded rounds → unsold
// ---------------------------------------------------------------------------

const RESULT_NOTE =
  'no achieved-price document is published on bip.gminaznin.pl (see parse.js header) — ' +
  'outcome inferred from a later round of the same subject being published, not a source-stated result';

/**
 * Parse one CONFIRMED-superseded round's OWN notice HTML (crawl.js forwards it as
 * `ref.text`; source:'html' ⇒ refresh.js passes it straight through) into the
 * achieved-price-stream shape. No hammer price is ever available on this source,
 * so every record is outcome:'unsold', final_price_pln:null.
 * @param {string} text  the round's notice HTML
 * @param {string|null} fallbackDate  that round's auction date (OCR, from crawl.js)
 * @param {string} sourceUrl  the round's own URL
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const html = String(text);
  if (!/<[a-z]/i.test(html)) return []; // this source hands HTML, not raw text
  const n = parseNotice(html, sourceUrl);
  if (n.cancelled) return [];
  if (!n.address && !n.dzialka_nr) return [];

  return [{
    auction_date: fallbackDate || n.published_date || null,
    source_url: sourceUrl,
    source_pdf: sourceUrl,
    kind: n.kind,
    address_raw: n.address_raw,
    address: n.address,
    dzialka_nr: n.dzialka_nr,
    obreb: n.obreb,
    round: n.round,
    starting_price_pln: n.starting_price_pln,
    final_price_pln: null,
    outcome: 'unsold',
    unsold_reason: 'superseded_by_next_round',
    area_m2: n.area_m2,
    notes: [RESULT_NOTE],
  }];
}
