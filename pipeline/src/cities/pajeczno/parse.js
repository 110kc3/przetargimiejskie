// Pajęczno parsers — Sulimo city-portal board + detail HTML (see config.js).
//
// parseBoardPage    — extract {url, published_date} pairs from one board list
//                      page (.../ogloszenia-o-sprzedazy-nieruchomosci/[?p=N]).
// parseDetailPage    — extract a listing (flat 'mieszkalny' or land 'grunt')
//                      from one detail page, or null when the page is a
//                      wykaz / rokowania / bezprzetargowa / result notice /
//                      unrecognised kind (crawl.js routes those separately).
// isResultTitle      — true when a title marks a "Informacja o wyniku
//                      przetargu" result notice (routed by crawl.js, not
//                      parseDetailPage).
// extractAttachmentPdf — first PDF attachment link on a detail page (used by
//                      crawl.js to OCR a result notice whose inline body is
//                      empty — confirmed necessary for the one 2022 example).
// parseResultDoc     — registry contract. Handles BOTH shapes seen in the
//                      wild: a single-property (flat OR land) notice, and a
//                      multi-parcel "1. Dla działki nr N ... 2. Dla działki
//                      nr M ..." notice (the ONLY live result example found,
//                      see below).
//
// ---------------------------------------------------------------------------
// Groundtruthed against REAL pages fetched live 2026-07-10:
//
//   BOARD (2 pages total, https://www.pajeczno.pl/informator/
//   ogloszenia-o-sprzedazy-nieruchomosci/[?p=2]):
//     <article class="row mb-5 g-0 position-relative">
//       <div class="date_news ...">Opublikowane dn. 15-05-2026</div>
//       <h2 class="fw-bold h5" ...>TITLE (possibly truncated "...")</h2>
//       <a class="btn ... stretched-link" href="DETAIL_URL">Czytaj więcej</a>
//     </article>
//
//   FLAT detail (n,410660 ul. Rekreacyjnej 7/20; n,410661 Rekreacyjnej 3/10;
//   n,410662 Małej 1/18 — all "Pierwszy przetarg ustny nieograniczony",
//   published 15-05-2026, auction 17-06-2026):
//     <article class="news mb-4">
//       <h2 class="h5 mb-3">Pierwszy przetarg ... lokalu mieszkalnego nr 20
//         położonego w Pajęcznie przy ul. Rekreacyjnej 7 wraz z udziałem...</h2>
//       <div class="py-2 ps-2 bg-light">Data publikacji: 15 maja 2026</div>
//       <div class="news_content_pdf"> <p>...
//         <strong>CENA WYWOŁAWCZA NETTO NIERUCHOMOŚCI WYNOSI — 220000,00 zł</strong>...
//         <strong><span ...>PRZETARG ODBĘDZIE SIĘDNIA 17 czerwca 2026 ROKU O
//           GODZ. 12:00</span> ...</strong>...</p></div>
//     </article>
//   NOTE the source text itself randomly drops spaces ("SIĘDNIA", "WYNOSI —
//   220000,00" vs "228 000,00" elsewhere, "NETTONIERUCHOMOŚCI") — these are
//   typos IN THE SOURCE HTML (verified byte-for-byte), not an artifact of tag
//   stripping. Every regex below is written to tolerate an arbitrary run of
//   non-digit junk between an anchor phrase and the value it introduces,
//   rather than assuming exact spacing.
//   The area figure also uses a garbled unit ("30,00 m'" — a stray apostrophe
//   where "m²" belongs, position varies across listings) — area regexes never
//   match on the unit character, only on the anchor phrase before the number.
//
//   LAND detail (n,395483 Działka 1092 obręb Niwiska Dolne, one of 6 Niwiska
//   Dolne parcels on the board, all published 30-01-2026):
//     Title: "Ogłoszenie o przetargu na sprzedaż nieruchomości Gminy Pajęczno
//       Działka 1092 obręb Niwiska Dolne"
//     Body: "Przedmiotem sprzedaży jest nieruchomość niezabudowana o numerze
//       1092 położona w obrębie Niwiska Dolne o pow. 0,2500 ha ...
//       Cena wywoławcza netto nieruchomości wynosi 40 000,00 zł ...
//       Przetarg odbędzie się dnia 12 marca 2026 r. o godz. 14:30 ..."
//     (clean text, no glued-word typos — unlike the flat notices above)
//
//   RESULT notice (n,354725 "Informacja o wyniku przetargu", published
//   14-01-2022): the ONLY "wynik" title found across both board pages. Its
//   inline <div class="news_content_pdf"> is EMPTY — the text lives only in
//   the attached scanned PDF (confirmed via pdftotext: 0 fonts, 1 embedded
//   200dpi JPEG). OCR'd live (tesseract -l pol, cached at
//   pipeline/ocr-cache/Informacja_o_wyniku_przetargu_przeprowadzonego_w_dniu_12_01_2022.pdf.*.txt):
//     "INFORMACJA O WYNIKU PRZETARGU ustnego nieograniczonego przeprowadzonego
//      w dniu 12 stycznia 2022 r. ... został przeprowadzony pierwszy przetarg
//      ustny nieograniczony na sprzedaż nieruchomości ... jako działki numer:
//      894 o pow. 0,14 ha obręb M. Pajęczno, 591 o pow. 0,13 ha obręb Stare
//      Gajęcice, 533/3 o pow. 0,3802 ha obręb Patrzyków.
//      1. Dla działki nr 894 ... Cena wywoławcza wynosiła 62.500,00 zł netto...
//         Cena uzyskana w przetargu wynosi 63.130,00 zł netto...
//         Nabywcą zostali Państwo Łukasz i Krzysztofa Dzieszkowscy.
//      2. Dla działki nr 591 ... nikt nie wpłacił wadium.
//      3. Dla działki nr 533/3 ... Cena wywoławcza wynosiła 6.160,00 zł netto...
//         Cena uzyskana w przetargu wynosi 15.070,00 zł netto...
//         Nabywcą została Pani Elżbieta Kula-Przybytek."
//   This is a LAND result (multi-parcel) — confirms the achieved-price
//   vocabulary ("cena wywoławcza wynosiła" / "cena uzyskana w przetargu
//   wynosi" / "Nabywcą został/zostali" / "nikt nie wpłacił wadium") for real,
//   but NOT a flat-specific example (none exists on the board as of
//   2026-07-10 — matches the spike's "hammer-price board not confirmed" for
//   flats specifically). The single-property branch of parseResultDoc (used
//   for a flat OR a lone land parcel) reuses this SAME confirmed vocabulary
//   by direct analogy — CONFIRM against a live flat result on first CI run
//   that actually posts one (see parseResultDoc below).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function stripTags(s) {
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

// "220000,00 zł" / "189 000,00" / "62.500,00" (OCR dot-thousands) -> integer
// PLN. Handles space-thousands (HTML notices), dot-thousands (OCR'd PDFs),
// and no-separator runs (the "SIĘDNIA"-style glued source text).
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

// "30,00" / "0,2500" -> float, or null.
export function parseArea(s) {
  if (s == null) return null;
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
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

/** "15 maja 2026" -> "2026-05-15", or null. */
export function parseDateText(s) {
  if (!s) return null;
  const m = /(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/.exec(s);
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

// Auction date: "PRZETARG ODBĘDZIE SIĘDNIA 17 czerwca 2026" (glued, flat
// notices, uppercase) / "Przetarg odbędzie się dnia 12 marca 2026" (land,
// lowercase, normal spacing). `\s*(?:DNIA)?\s*` tolerates the missing space
// either way (zero-or-more on both sides of the optional "DNIA").
const AUCTION_DATE_RE =
  /PRZETARG\s+ODB[ĘE]DZIE\s+SI[ĘE]\s*(?:DNIA)?\s*(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i;

/** Auction date from an announcement body, or null. */
export function auctionDateFromText(text) {
  const m = AUCTION_DATE_RE.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

// "Cena wywoławcza" is ALWAYS nominative in the price statement itself; the
// wadium clause uses the genitive "ceny wywoławczej" ("10% ceny wywoławczej,
// tj. 22 000,00 zł") which this literal ending ("...WCZA") does not match —
// verified against all 4 live fixtures (3 flats + 1 land). The gap to the
// number is matched with [^\d]{0,N} (non-digit only) so it can skip past
// "NETTO NIERUCHOMOŚCI WYNOSI —" / "netto nieruchomości wynosi" / "wynosiła"
// (result-doc past tense) regardless of exact wording, but can never leap
// over an unrelated digit (e.g. a stray "10%" earlier in the sentence).
const START_PRICE_RE = /cena\s+wywo[łl]awcza[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;

/** Starting price ("cena wywoławcza wynosi(ła)? ...") from any body text. */
export function startingPriceFromText(text) {
  const m = START_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// Achieved price — result-doc only ("Cena uzyskana w przetargu wynosi ...").
// "cena osiągnięta" / "cena nabycia" kept as OR fallbacks (other-city
// vocabulary; harmless if never hit here, cheap defensive cross-compat).
const ACHIEVED_PRICE_RE = /cena\s+uzyskana[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;
const ACHIEVED_PRICE_FALLBACK_RE =
  /cena\s+osi[ąa]gni[ęe]ta[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]|cena\s+nabycia[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;

/** Achieved ("cena uzyskana w przetargu") price from a result-doc chunk. */
export function achievedPriceFromText(text) {
  const t = text || '';
  const m = ACHIEVED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const m2 = ACHIEVED_PRICE_FALLBACK_RE.exec(t);
  return m2 ? parsePLN(m2[1] ?? m2[2]) : null;
}

/** True when a result-doc chunk explicitly states a negative/unsold outcome. */
export function isUnsoldText(text) {
  return /nikt\s+nie\s+wp[łl]aci[łl]\s+wadium|wynik(?:iem)?\s+negatywn|nie\s+przyst[ąa]pi[łl]|brak\s+ofert/i.test(
    text || '',
  );
}

// Round: Polish word ordinal ("Pierwszy przetarg", "Drugi przetarg") — the
// form used on this board — with a Roman-numeral fallback ("II przetarg")
// for any re-listing that switches style.
const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5,
  'szóst': 6, szost: 6, 'siódm': 7, siodm: 7, 'ósm': 8, osm: 8,
  'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I|X)\b/;

/** Auction round from title/body text ("Pierwszy przetarg" -> 1), or null. */
export function roundFromTitle(text) {
  const t = text || '';
  const wm =
    /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg/i.exec(
      t,
    );
  if (wm) {
    const key = wm[1].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) {
      if (key.startsWith(prefix)) return val;
    }
  }
  const rm = ROMAN_RE.exec(t.toUpperCase());
  if (rm) return ROMAN_MAP[rm[1]] ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// Board list page
// ---------------------------------------------------------------------------

const ARTICLE_RE = /<article class="row mb-5[^"]*"[\s\S]*?<\/article>/gi;
const BOARD_DATE_RE = /Opublikowane\s+dn\.\s*(\d{2})-(\d{2})-(\d{4})/i;
const BOARD_HREF_RE = /href="([^"]+\/n,\d+,[^"]+\.html)"/i;

/**
 * Extract {url, published_date} pairs from one board list page (either
 * .../ogloszenia-o-sprzedazy-nieruchomosci/ or its ?p=N pagination).
 * @param {string} html
 * @returns {Array<{url:string, published_date:string|null}>}
 */
export function parseBoardPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  let am;
  while ((am = ARTICLE_RE.exec(html)) !== null) {
    const chunk = am[0];
    const hrefM = BOARD_HREF_RE.exec(chunk);
    if (!hrefM) continue;
    const url = hrefM[1];
    if (seen.has(url)) continue;
    seen.add(url);
    const dateM = BOARD_DATE_RE.exec(chunk);
    out.push({
      url,
      published_date: dateM ? iso(dateM[3], dateM[2], dateM[1]) : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Detail page — shared extraction
// ---------------------------------------------------------------------------

const TITLE_RE = /<article class="news mb-4">\s*<h2 class="h5 mb-3">([\s\S]*?)<\/h2>/i;
const BODY_RE = /<div class="news_content_pdf">([\s\S]*?)<\/div>\s*<div style="clear:\s*both;">/i;
const PUBLISHED_BLOCK_RE = /<div class="py-2 ps-2 bg-light">([\s\S]*?)<\/div>/i;
const ATTACHMENT_PDF_RE = /<a href="([^"]+\.pdf)"[^>]*class="matomo_download"/i;

// Exported (not just used internally by parseDetailPage below) because
// crawl.js needs the title/body/date BEFORE deciding whether a detail page is
// a result notice (routed to OCR/parseResultDoc) or a listing (routed to
// parseDetailPage) — see crawl.js's crawlAll().

/** Full (untruncated) title from a detail page's <h2 class="h5 mb-3">. */
export function extractTitle(html) {
  const m = TITLE_RE.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

/** Plain-text body from a detail page's <div class="news_content_pdf">. */
export function extractBody(html) {
  const m = BODY_RE.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

/** "Data publikacji: D month YYYY" from a detail page, or null. */
export function publishedDateFromDetail(html) {
  const m = PUBLISHED_BLOCK_RE.exec(html || '');
  return m ? parseDateText(stripTags(m[1])) : null;
}

/** First PDF attachment link on a detail page ("Załączniki" table), or null. */
export function extractAttachmentPdf(html) {
  const m = ATTACHMENT_PDF_RE.exec(html || '');
  return m ? m[1] : null;
}

/** True when a title marks a "Informacja o wyniku przetargu" result notice. */
export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik|wynik\s+przetargu/i.test(title || '');
}

// ---------------------------------------------------------------------------
// Flat address (from the h2 title — see the module header for the fixed
// "lokalu mieszkalnego nr N położonego w Pajęcznie przy ul. X Y wraz..." shape)
// ---------------------------------------------------------------------------

function aptFromTitle(title) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(title || '');
  return m ? m[1] : null;
}

function streetBuildingFromTitle(title) {
  const m = /przy\s+ul\.?\s+([^\d]+?)\s+(\d+[A-Za-z]?)\s+wraz/i.exec(title || '');
  if (m) return { street: m[1].trim(), building: m[2] };
  // Fallback for a title with no trailing "wraz..." clause.
  const m2 = /przy\s+ul\.?\s+([^\d]+?)\s+(\d+[A-Za-z]?)(?:[.,]|\s*$)/i.exec(title || '');
  if (m2) return { street: m2[1].trim(), building: m2[2] };
  return null;
}

function flatAddressFromTitle(title) {
  const apt = aptFromTitle(title);
  const sb = streetBuildingFromTitle(title);
  if (!apt || !sb) return null;
  return parseAddress(`${sb.street} ${sb.building}/${apt}`);
}

// Usable floor area: anchored on "powierzchni użytkowej" so the FIRST number
// after it is taken — never the piwnica/udział figures that follow later in
// the same paragraph. Tolerant of the garbled "m'" unit (see module header).
const AREA_RE = /powierzchni\s+u[żz]ytkow\w*[^\d]{0,40}(\d+[,.]\d+)\s*m/i;

function unitAreaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// ---------------------------------------------------------------------------
// Land (dzialka_nr / obreb / area) — from the title first (clean, reliable:
// "... Działka 1092 obręb Niwiska Dolne"), body as fallback.
// ---------------------------------------------------------------------------

const LAND_TITLE_RE = /Dzia[łl]ka\s+(\d+(?:\/\d+)?)\s+obr[eę]b\s+([^\n<]+?)\s*$/i;
const LAND_BODY_RE =
  /o\s+numerze\s+(\d+(?:\/\d+)?)\s+po[łl]o[żz]on\w*\s+w\s+obr[eę]bie\s+([^\d,]+?)\s+o\s+pow/i;
const AREA_HA_RE = /o\s+pow\.?\s+(\d+[,.]\d+)\s*ha\b/i;

function landPlotFromTitleAndBody(title, body) {
  let dzialka_nr = null;
  let obreb = null;
  const tm = LAND_TITLE_RE.exec(title || '');
  if (tm) {
    dzialka_nr = tm[1];
    obreb = tm[2].trim();
  } else {
    const bm = LAND_BODY_RE.exec(body || '');
    if (bm) {
      dzialka_nr = bm[1];
      obreb = bm[2].trim();
    }
  }
  let area_m2 = null;
  const am = AREA_HA_RE.exec(body || '');
  if (am) {
    const ha = parseFloat(am[1].replace(',', '.'));
    if (Number.isFinite(ha) && ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr, obreb, area_m2 };
}

// ---------------------------------------------------------------------------
// parseDetailPage — registry-adjacent (crawl.js contract, not the registry
// itself): flat ('mieszkalny') or land ('grunt') record, or null when the
// page is a wykaz / rokowania / bezprzetargowa notice, a result notice
// (routed separately by crawl.js before this is even called), or an
// unrecognised kind.
// ---------------------------------------------------------------------------

/**
 * @param {string} html
 * @param {string} url
 * @param {string|null} [publishedDateFallback] board-level published_date,
 *   used only if the detail page's own "Data publikacji:" block is missing.
 * @returns {object|null}
 */
export function parseDetailPage(html, url, publishedDateFallback = null) {
  if (!html) return null;
  const title = extractTitle(html);
  if (!title) return null;

  // Non-auction dispositions and pre-announcements — never a scheduled
  // open-auction listing. Checked before classifyKind so a wykaz notice that
  // happens to describe flats in its body can never be misread as a live
  // auction (the 31-03-2026 wykaz's own body has no such text, but a future
  // one might).
  if (/wykaz/i.test(title)) return null;
  if (/rokowa/i.test(title)) return null;
  if (/bezprzetargow/i.test(title)) return null;
  if (isResultTitle(title)) return null; // crawl.js routes results separately

  const body = extractBody(html);
  const kind = classifyKind(`${title} ${body}`);
  const published_date = publishedDateFromDetail(html) ?? publishedDateFallback;
  const round = roundFromTitle(`${title} ${body.slice(0, 300)}`);
  const starting_price_pln = startingPriceFromText(body);
  const auction_date = auctionDateFromText(body);

  if (kind === 'mieszkalny') {
    const address = flatAddressFromTitle(title);
    if (!address) return null;
    return {
      kind: 'mieszkalny',
      address_raw: `${address.street} ${address.building}/${address.apt ?? ''}`,
      address,
      area_m2: unitAreaFromText(body),
      starting_price_pln,
      auction_date,
      round,
      published_date,
      detail_url: url,
      source_url: url,
    };
  }

  if (kind === 'grunt') {
    const plot = landPlotFromTitleAndBody(title, body);
    if (!plot.dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      address_raw: plot.obreb ? `dz. ${plot.dzialka_nr}, obręb ${plot.obreb}` : `dz. ${plot.dzialka_nr}`,
      starting_price_pln,
      auction_date,
      round,
      published_date,
      detail_url: url,
      source_url: url,
    };
  }

  return null; // commercial/garage/unknown — not observed on this board
}

// ---------------------------------------------------------------------------
// parseResultDoc — registry contract.
//
// Two shapes, both driven by the SAME confirmed vocabulary (see module
// header): "cena wywoławcza wynosi(ła)", "cena uzyskana w przetargu wynosi",
// "Nabywcą został/zostali ...", "nikt nie wpłacił wadium".
//
//   MULTI-PARCEL (land, "1. Dla działki nr N ... 2. Dla działki nr M ...") —
//   confirmed live against the one real result notice found (n,354725,
//   2022-01-12; see module header). Each numbered chunk becomes its own land
//   result record, keyed by its own dzialka_nr — this is required because a
//   single such notice can mix sold and unsold parcels in the same document.
//
//   SINGLE-PROPERTY (flat, or a lone land parcel with no numbered list) — NOT
//   yet seen live for a flat (none posted on the board as of 2026-07-10); the
//   flat branch is a template built by direct analogy to the confirmed
//   vocabulary above, plus the same address-from-title parsing already
//   verified live for announcements. VALIDATE on first live flat result post.
// ---------------------------------------------------------------------------

const LAND_CHUNK_RE = /Dla\s+dzia[łl]ki\s+nr\s+(\d+(?:\/\d+)?)/i;
const RESULT_HEAD_DATE_RE = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i;

function resultHeadDate(text) {
  const m = RESULT_HEAD_DATE_RE.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

/** Specific unsold reason, derived from whichever isUnsoldText pattern hit —
 *  not just hardcoded, so e.g. a lone-parcel/flat "wynikiem negatywnym" isn't
 *  mislabelled "brak wadium" when the doc never said that. */
function unsoldReasonFromText(text) {
  const t = text || '';
  if (/nikt\s+nie\s+wp[łl]aci[łl]\s+wadium/i.test(t)) return 'brak wadium';
  if (/nie\s+przyst[ąa]pi[łl]/i.test(t)) return 'nie przystąpiono';
  if (/brak\s+ofert/i.test(t)) return 'brak ofert';
  return 'wynik negatywny';
}

function splitLandChunks(text) {
  const parts = (text || '').split(/(?=\d+\.\s*Dla\s+dzia[łl]ki\s+nr)/i);
  return parts.filter((p) => LAND_CHUNK_RE.test(p));
}

/**
 * @param {string} text  plain text (inline HTML stripped, or OCR output)
 * @param {string|null} fallbackDate  ISO date (board published_date / detail
 *   "Data publikacji") to use when the doc's own "w dniu ..." can't be found.
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);
  if (!isResultTitle(t) && !/wynik(?:iem)?\s+negatywn/i.test(t)) return [];

  const headDate = resultHeadDate(t) ?? fallbackDate ?? null;
  const chunks = splitLandChunks(t);

  if (chunks.length > 0) {
    // MULTI-PARCEL land result — one record per numbered "Dla działki nr N".
    const out = [];
    for (const chunk of chunks) {
      const dzM = LAND_CHUNK_RE.exec(chunk);
      if (!dzM) continue;
      const starting_price_pln = startingPriceFromText(chunk);
      const final_price_pln = achievedPriceFromText(chunk);
      const sold = final_price_pln != null;
      const unsold = isUnsoldText(chunk);
      if (!sold && !unsold) continue; // no evidence of an outcome — skip, don't guess
      const notes = [];
      if (starting_price_pln == null) notes.push('parse: missing starting price');
      out.push({
        auction_date: headDate,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: dzM[1],
        obreb: null,
        area_m2: null,
        address_raw: `dz. ${dzM[1]}`,
        round: roundFromTitle(t.slice(0, 400)),
        starting_price_pln,
        final_price_pln: sold ? final_price_pln : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : unsoldReasonFromText(chunk),
        notes,
      });
    }
    return out;
  }

  // SINGLE-PROPERTY — flat (template, unverified live — see header) or a
  // lone land parcel (same confirmed vocabulary as the multi-parcel branch).
  const kind = classifyKind(t);
  const starting_price_pln = startingPriceFromText(t);
  const final_price_pln = achievedPriceFromText(t);
  const sold = final_price_pln != null;
  const unsold = isUnsoldText(t);
  if (!sold && !unsold) return []; // no stated outcome — nothing to record

  if (kind === 'grunt') {
    const plot = landPlotFromTitleAndBody('', t);
    if (!plot.dzialka_nr) return [];
    const notes = [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [
      {
        auction_date: headDate,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        obreb: plot.obreb,
        area_m2: plot.area_m2,
        address_raw: plot.obreb ? `dz. ${plot.dzialka_nr}, obręb ${plot.obreb}` : `dz. ${plot.dzialka_nr}`,
        round: roundFromTitle(t.slice(0, 400)),
        starting_price_pln,
        final_price_pln: sold ? final_price_pln : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : unsoldReasonFromText(t),
        notes,
      },
    ];
  }

  // Flat — UNVERIFIED template (see header docblock).
  const address = flatAddressFromTitle(t);
  if (!address) return [];
  const notes = ['parse: flat result template unverified against a live doc (see parse.js header)'];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  return [
    {
      auction_date: headDate,
      source_url: sourceUrl,
      kind: 'mieszkalny',
      address_raw: `${address.street} ${address.building}/${address.apt ?? ''}`,
      address,
      area_m2: unitAreaFromText(t),
      round: roundFromTitle(t.slice(0, 400)),
      starting_price_pln,
      final_price_pln: sold ? final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : unsoldReasonFromText(t),
      notes,
    },
  ];
}
