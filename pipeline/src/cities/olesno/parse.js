// Olesno parsers.
//
// Roles:
//   1. parseListPage    — extract article links from a skyCMS per-year board
//                          page (bip.olesno.pl "przetargi na sprzedaż
//                          nieruchomości <ROK>"). Markup: <li class="pageOn
//                          PageElement…"><h2 class="pageOnPageHeader"><a
//                          href="…">TITLE</a></h2>…</li> — same family as
//                          Przemyśl's RE_OLD variant, ported verbatim (RE_NEW
//                          kept for skyCMS cross-compatibility, never matches
//                          here — confirmed live, no "post__link" markup on
//                          this host).
//
//   2. mentionsLokal / isAnnounceTitle / isResultTitle
//                        — cheap title-only pre-classification so crawl.js
//                          doesn't have to fetch every land (działka) detail
//                          page. NOTE: round-I announcements here sometimes
//                          say just "sprzedaż lokalu nr 2" with NO "mieszkalny"
//                          qualifier in the title (confirmed live: bip.olesno.
//                          pl/12154) — a przemysl-style isFlatTitle() title
//                          check would silently miss it. mentionsLokal() is
//                          deliberately loose (any "lokal*"); the AUTHORITATIVE
//                          flat/not-flat call is classifyKind() on the fetched
//                          BODY text, applied by the caller after enrichment.
//
//   3. parseAnnouncement — extract fields from one przetarg-announcement
//                          detail page: address, area, cena wywoławcza,
//                          auction date, round. Content is inline prose in
//                          <div class="bip-page__content"> — no PDF for
//                          announcements (confirmed across all 3 rounds of
//                          the groundtruth fixture).
//
//   4. parseResultDoc    — extract achieved-price fields from one result
//                          notice: address, cena wywoławcza, cena osiągnięta,
//                          auction date, round, outcome. Olesno phrases the
//                          hammer price differently from Przemyśl ("cena
//                          nieruchomości została ustalona na kwotę X zł", not
//                          "Najwyższa cena osiągnięta … wyniosła X zł") — both
//                          phrasings are matched. NOTE: not every "informacja
//                          o wyniku" article has inline text — round I's result
//                          for the groundtruth flat (bip.olesno.pl/12368) is a
//                          Google-Docs-viewer iframe wrapping a PDF ("Protokół
//                          z I przetargu…") with no inline body; parseResultDoc
//                          gracefully returns [] for it (documented residual —
//                          no PDF-text fallback wired in this LOW-effort build).
//
// Fixture groundtruth (real fetches, 2026-07-10, from this Pi's Polish IP):
//   ul. Małe Przedmieście 1, lokal nr 2, Olesno — 14,09 m², udział 142/10000,
//   Wspólnota Mieszkaniowa Małe Przedmieście 1 – Pieloka 11:
//     round I   announce  bip.olesno.pl/12154  cena wywoławcza 55 000 zł
//     round II  announce  bip.olesno.pl/12535  cena wywoławcza 50 000 zł
//     round II  result    bip.olesno.pl/12660  UNSOLD (wynikiem negatywnym)
//     round III announce  bip.olesno.pl/12722  cena wywoławcza 48 000 zł
//     round III result    bip.olesno.pl/12790  SOLD 48 480 zł netto, nabywca
//                          "AD-BAU" Artur Świtała, rozstrzygnięcie 2025-10-10

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
    .replace(/\s+/g, ' ')
    .trim();
}

// Polish price string → integer PLN. Handles "48.000,00 złotych", "50.000
// złotych" (dot-thousands, no grosze), "136 350,00 zł" (space-thousands).
export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "14,09" / "14.09" -> 14.09
export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Polish lowercase for regex-safe comparison (index-preserving).
function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

const PL_MONTHS = {
  stycznia: 1, styczen: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3, kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9, pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11, grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function dateFromNumeric(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

function dateFromWords(s) {
  const m = /(\d{1,2})\s+([a-zÀ-ž]+)\s+(\d{4})/i.exec(s || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAscii(m[2])];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// Round from announcement/result body text. Ported from przemysl verbatim —
// works unchanged on Olesno's titles/bodies (both "I/II/III przetarg" and
// "pierwszy/drugi/trzeci przetarg" phrasings observed live).
export function roundFromText(text) {
  const t = toAscii(text || '');
  if (/\bpierwsz\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 1;
  if (/\bdrug\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 3;
  if (/\bczwart\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 4;
  if (/\bpiat\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 5;
  const romanM = /\b(I{1,3}|IV|V|VI{0,3})\s+przetarg/i.exec(t);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  if (/\bkolejn\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return null;
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}

// ---------------------------------------------------------------------------
// 1. Article list page parser (per-year sale board)
// ---------------------------------------------------------------------------

/**
 * Parse a skyCMS article-list page. Returns all {title, url} pairs found.
 * Caller filters by title (mentionsLokal / isAnnounceTitle / isResultTitle).
 *
 * @param {string} html
 * @param {string} baseHost  e.g. 'https://bip.olesno.pl'
 * @returns {Array<{title:string, url:string}>}
 */
export function parseListPage(html, baseHost) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  // Two known skyCMS list-markup variants (see przemysl for the "post__link"
  // one — not used by this host, kept for cross-city robustness):
  //   Olesno (confirmed live): <h2 class="pageOnPageHeader"><a href="URL">TITLE</a></h2>
  //   Alt:                     <a href="URL" … class="post__link">…<h3>TITLE</h3>
  const RE_OLD = /<(?:h2|h3)[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/(?:h2|h3)>/gi;
  const RE_NEW = /<a[^>]+href="([^"]+)"[^>]*class="post__link"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const RE = RE_NEW.test(html) ? RE_NEW : RE_OLD;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(html)) !== null) {
    let url = m[1].replace(/&amp;/gi, '&').trim();
    const title = stripTags(m[2]).trim();
    if (!title || !url) continue;
    if (url.startsWith('/')) {
      url = baseHost.replace(/\/$/, '') + url;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
  }
  return out;
}

// Cheap title-only pre-filter: does this board entry concern a "lokal" at
// all? Deliberately loose (catches "lokal użytkowy" too) — the authoritative
// mieszkalny/not check happens on the fetched body via classifyKind().
// Loose-on-purpose because round-I announcements can omit "mieszkalny" from
// the title entirely (bip.olesno.pl/12154: "…na sprzedaż lokalu nr 2…").
export function mentionsLokal(title) {
  return /\blokal/i.test(toAscii(title || ''));
}

// Result / protocol-shaped title: "Informacja o wyniku(ach) … przetarg…" or
// "Protokół z … przetargu…". NOTE: przemysl's tighter `wynik\w*\s+przetargu`
// (no gap) does NOT match here — Olesno always inserts the round ordinal
// between "wyniku" and "przetargu" ("wyniku III przetargu"), so the gap
// tolerance is required.
export function isResultTitle(title) {
  const t = toAscii(title || '');
  return /wynik\w*\s+(?:\w+\s+){0,3}przetarg/.test(t) || /\bprotok/.test(t);
}

// Announcement-shaped title: "Ogłoszenie o … przetargu…" OR a bare leading
// roman numeral ("I przetarg ustny nieograniczony…" — round I's real title
// has no "Ogłoszenie o" prefix at all, confirmed live).
export function isAnnounceTitle(title) {
  const t = toAscii(title || '').trim();
  if (isResultTitle(title)) return false;
  return /^ogloszenie/.test(t) || /^[ivx]+\s+przetarg/.test(t);
}

// ---------------------------------------------------------------------------
// Internal: extract article body text from a full BIP page HTML
// ---------------------------------------------------------------------------

/**
 * Extract the article content from an Olesno skyCMS (bip_v4) page as plain
 * text. Anchors on the literal "bip-page__content" / "bip-page__footer"
 * class boundary — confirmed live to reliably bracket the real content,
 * unlike a brace-counting id="printArea" regex (which stops at the FIRST
 * nested </div>, e.g. the empty <div id="webreaderContainer"></div> that
 * immediately follows the heading on every Olesno page — verified this
 * truncates to just the title on real fixtures). Falls back to przemysl's
 * original heuristics for robustness if that anchor isn't present.
 *
 * @param {string} html
 * @returns {string}
 */
export function extractArticleText(html) {
  if (!html) return '';
  const contentM = /<div class="bip-page__content">([\s\S]*?)<div class="bip-page__footer"/i.exec(html);
  if (contentM) return stripTags(contentM[1]);

  const printM = /id="printArea"[^>]*>([\s\S]*?)<\/(?:div|section|main)>/i.exec(html);
  const articleM = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainM = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  let raw;
  if (printM) {
    raw = printM[1];
  } else if (articleM) {
    raw = articleM[1];
  } else if (mainM) {
    raw = mainM[1].replace(/Metryczka[\s\S]*/, '').replace(/Rejestr zmian[\s\S]*/, '');
  } else {
    raw = html;
  }
  return stripTags(raw);
}

// ---------------------------------------------------------------------------
// Address extraction (shared by announcement + result parsers)
// ---------------------------------------------------------------------------

// Olesno-specific: BIP source docs abbreviate "Małe Przedmieście" as
// "M. Przedmieście" / "M Przedmieście" inconsistently — sometimes even within
// the SAME document family across rounds (round III result used "M.", round
// III announcement used "Małe" in full, for the identical flat). Expand it so
// the address key is stable across rounds/documents for build-properties'
// history-merge. Scoped to this one street — safe because Olesno has no other
// street this could collide with.
function expandStreetAbbrev(street) {
  return street.replace(/^M\.?\s+Przedmie[śs]cie$/i, 'Małe Przedmieście');
}

/**
 * Extract a raw "<street> <bldg>/<apt>" address string from body prose.
 * Priority:
 *   1. "przy ul. X Y" (classic single-street form — e.g. a hypothetical
 *      Świercz-style flat sale not framed as a wspólnota building).
 *   2. "Wspólnoty Mieszkaniowej X Y" (the groundtruth fixture's form — tried
 *      SECOND on purpose: this building's docs also contain a "przy ul.
 *      Pieloka 11 i Małe Przedmieście 1" aside further down, and the lazy
 *      "przy ul." regex would grab the wrong ("Pieloka 11") street from that
 *      if tried against the whole body — but in practice the Wspólnoty
 *      anchor always appears EARLIER in the text, so trying it first when
 *      present avoids the trap without needing a body-order dependency).
 * The apartment number ("lokal(u) (mieszkalnego)? nr N") is extracted
 * separately and appended, since Olesno's prose states street+building and
 * flat number as separate facts (never "ul. X Y/N" inline).
 *
 * @param {string} body
 * @returns {{address_raw: string|null, address: object|null}}
 */
function extractAddress(body) {
  const aptM = /lokal\w*\s+(?:mieszkaln\w*\s+)?nr\.?\s*(\d+[A-Za-z]?)/i.exec(body);
  const apt = aptM ? aptM[1] : null;

  const wspM = /Wsp[óo]lnoty\s+Mieszkaniowej\s+([A-Za-zÀ-ž][A-Za-zÀ-ž0-9.\-]*(?:\s+[A-Za-zÀ-ž.]+)?)\s+(\d+[A-Za-z]?)\b/i.exec(body);
  if (wspM) {
    const street = expandStreetAbbrev(wspM[1].trim());
    let raw = `${street} ${wspM[2]}`;
    if (apt) raw += '/' + apt;
    const address = parseAddress(raw);
    return { address_raw: raw, address };
  }

  const przyM = /przy\s+ul\.?\s+([A-Za-zÀ-ž][A-Za-zÀ-ž0-9À-ž\s.''\-]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(body);
  if (przyM) {
    let raw = przyM[1].trim();
    if (apt && !/\/\d/.test(raw)) raw += '/' + apt;
    raw = 'ul. ' + raw;
    const address = parseAddress(raw);
    return { address_raw: raw, address };
  }

  return { address_raw: null, address: null };
}

/**
 * Extract area (m²) from body prose. Priority:
 *   1. "powierzchni(a) użytkow(a/ej) … X m2" (announcement "Opis lokalu"
 *      section — matches Przemyśl's original pattern verbatim: "Powierzchnia"
 *      (nominative) satisfies the "powierzchni\w*" stem fine).
 *   2. "o powierzchni X m2" (result-notice / "Przedmiotem przetargu" prose —
 *      deliberately requires the FULL word "powierzchni", not the "pow."
 *      abbreviation Olesno uses for the PARCEL area — "o łącznej pow. 548
 *      m2" — so this can't cross-match the wrong (much larger) number).
 *   3. Fallback: largest m² token, ASCII-normalized exclusion of
 *      działka/grunt/piwnica/przynależny/garaż/"łącznej pow." mentions
 *      (przemysl's original fallback compared its exclusion regex against
 *      the RAW diacritic body — "działkach" never matched its ASCII-only
 *      "dzialk" pattern — fixed here by toAscii-normalizing the lookback
 *      window before testing).
 *
 * @param {string} body
 * @returns {number|null}
 */
function extractAreaM2(body) {
  const areaLab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,40}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (areaLab) return parseArea(areaLab[1]);

  const areaLab2 = /\bo\s+powierzchni\s+([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (areaLab2) return parseArea(areaLab2[1]);

  const M2_RE = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let mm;
  M2_RE.lastIndex = 0;
  while ((mm = M2_RE.exec(body)) !== null) {
    const v = parseArea(mm[1]);
    if (v == null || v <= 0) continue;
    const before = toAscii(body.slice(Math.max(0, mm.index - 50), mm.index));
    if (/dzialk|grunt|lacznej\s+pow/.test(before)) continue;
    if (/piwnic|komorka?|przynale|garaz/.test(before)) continue;
    cands.push(v);
  }
  if (!cands.length) return null;
  // Smallest plausible candidate: in Olesno's docs the confusable neighbor is
  // the (larger) parcel area, not a (smaller) room sub-breakdown.
  return Math.min(...cands);
}

// ---------------------------------------------------------------------------
// 2. Announcement detail page parser
// ---------------------------------------------------------------------------

/**
 * Parse fields from one flat-auction announcement detail page HTML.
 *
 * @param {string} html  full page HTML
 * @param {string} sourceUrl  the article URL (unused, kept for signature
 *   parity with przemysl's parseAnnouncement — provenance is attached by the
 *   caller via detail_url)
 * @returns {{ kind:string, address_raw:string|null, address:object|null,
 *             area_m2:number|null, starting_price_pln:number|null,
 *             auction_date:string|null, round:number|null }}
 */
export function parseAnnouncement(html, sourceUrl) {
  const body = extractArticleText(html);
  const t = toAscii(body);

  const kind = classifyKind(body);
  const round = roundFromText(body);

  // Auction date — Olesno phrases this "Przetarg odbędzie się DD month YYYY
  // roku", WITHOUT the "w dniu" przemysl anchors on. Anchor on "odbedzie sie"
  // alone (broader) and look for a date in the next ~200 chars; this also
  // transparently handles a "w dniu DD.MM.YYYY" variant if one ever appears.
  let auction_date = null;
  const anchorIdx = t.search(/odbedzie\s+sie/);
  const scope = anchorIdx >= 0 ? body.slice(anchorIdx, anchorIdx + 200) : body.slice(0, 500);
  auction_date = dateFromWords(scope) || dateFromNumeric(scope);

  let starting_price_pln = null;
  const priceStart = t.search(/cena\s+wywolawcza/);
  if (priceStart >= 0) {
    const priceRegion = body.slice(priceStart, priceStart + 300);
    const pm = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(priceRegion);
    if (pm) starting_price_pln = parsePLN(pm[1]);
  }

  const area_m2 = extractAreaM2(body);
  const { address_raw, address } = extractAddress(body);

  return {
    kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}

// ---------------------------------------------------------------------------
// 3. Result notice detail page parser (achieved-price stream)
// ---------------------------------------------------------------------------

/**
 * Parse one result-notice article page into concluded-auction records.
 * Contract shape matches przemysl/other city parseResultDoc implementations.
 *
 * @param {string} text  plain text (or raw HTML) of the result notice body
 * @param {string|null} fallbackDate  ISO date from the crawl ref (rarely needed)
 * @param {string} sourceUrl  the article URL
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const body = /<[a-z]/.test(text) ? extractArticleText(text) : text;
  const t = toAscii(body);
  const notes = [];

  // Only proceed if this looks like a result/protocol notice with a
  // conclusion sentence. (Guards against a "Protokół …" article whose body
  // is just a Google-Docs-viewer iframe wrapping a PDF, e.g. bip.olesno.pl/
  // 12368 — no inline text, this test fails and we return [] silently.)
  if (!/odby[łl]\s+si[ęe]\s[\s\S]{0,80}przetarg|wynik\w*\s+(?:\w+\s+){0,3}przetarg|przeprowadzon\w*\s[\s\S]{0,80}przetarg/i.test(body)) {
    return [];
  }

  // Auction date — "w dniu DD month YYYY r." (result notices DO use "w dniu",
  // unlike announcements). Ported from przemysl verbatim; works unchanged.
  let auction_date = fallbackDate || null;
  const dateM1 = /[Ww]\s+dniu\s+([\d]{1,2})\s+([a-zÀ-ž]+)\s+(\d{4})/i.exec(body);
  const dateM2 = /[Ww]\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(body);
  if (dateM1) {
    const mon = PL_MONTHS[toAscii(dateM1[2])];
    if (mon) auction_date = iso(dateM1[3], mon, dateM1[1]);
  } else if (dateM2) {
    auction_date = iso(dateM2[3], dateM2[2], dateM2[1]);
  }

  const round = roundFromText(body);

  const kind = classifyKind(body);
  if (kind !== 'mieszkalny') {
    // Not a flat result (land/house/commercial) — backstop filter (caller
    // pre-filters candidates by mentionsLokal(), this catches "lokal
    // użytkowy" results that slipped through that loose title check).
    return [];
  }

  const { address_raw, address } = extractAddress(body);
  if (!address) {
    notes.push('parse: address parse failed');
    return [];
  }
  if (address.warning) notes.push(address.warning);

  let starting_price_pln = null;
  const spStart = t.search(/cena\s+wywolawcza/);
  if (spStart >= 0) {
    const spRegion = body.slice(spStart, spStart + 300);
    const spm = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(spRegion);
    if (spm) starting_price_pln = parsePLN(spm[1]);
  }
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  // Achieved price. Olesno: "cena nieruchomości została ustalona na kwotę X
  // zł" (groundtruth). Przemyśl's "Najwyższa cena osiągnięta w przetargu
  // wyniosła X zł" kept as an alternate in case a future year's clerk reuses
  // that template phrasing (same CMS family, drafting sometimes shared).
  let final_price_pln = null;
  const fpM = /(?:[Nn]ajwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+wynios[łl]a|cena\s+nieruchomo[śs]ci\s+zosta[łl]a\s+ustalona\s+na\s+kwot[ęe])\s+([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  if (fpM) final_price_pln = parsePLN(fpM[1]);

  // Outcome. Olesno's negative phrasing: "nie wpłaciła jakakolwiek osoba …"
  // (no "wadium" directly adjacent, unlike przemysl's pattern) plus the
  // standard "wynikiem negatywnym" summary sentence — both matched.
  const negative =
    /wynikiem\s+negatywnym|nie\s+wp[łl]aci[łl]\w*\s+(?:jakakolwiek|[żz]aden|nikt|wadium)|nikt\s+nie\s+przyst[ąa]pi[łl]|nikt\s+nie\s+wp[łl]aci[łl]/i.test(body);
  const outcome = (negative || final_price_pln == null) ? 'unsold' : 'sold';
  let unsold_reason = null;
  if (outcome === 'unsold') {
    if (/brak\s+uczestnik|nie\s+wp[łl]aci[łl]\w*\s+(?:jakakolwiek|[żz]aden|nikt|wadium)|nikt\s+nie\s+wp[łl]aci[łl]/i.test(body)) {
      unsold_reason = 'brak_uczestnikow';
    } else {
      unsold_reason = 'unknown';
    }
  }

  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price on positive result');

  const area_m2 = extractAreaM2(body);

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    area_m2,
    notes,
  }];
}
