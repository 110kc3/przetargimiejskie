// Przemyśl parsers.
//
// Roles:
//   1. parseListPage  — extract article links from a skyCMS article-list page
//                       (both invest.przemysl.eu announcements and bip.przemysl.pl
//                       results share the same <li><h2><a href="…">TITLE</a></h2></li>
//                       markup). Returns [{title, url}] — caller filters by title.
//
//   2. parseAnnouncement — extract fields from one flat-auction detail page HTML:
//                          address, area, cena wywoławcza, auction date, round.
//                          Content is inline in the <article>/<main> body — no PDF.
//
//   3. parseResultDoc  — extract achieved-price fields from one result notice HTML
//                        body text: address, cena wywoławcza, cena osiągnięta,
//                        auction date, round, outcome (sold / unsold).
//
// Fixture groundtruth:
//   Announcement — invest.przemysl.eu/40004 or any /NNNNN/ detail page
//   Result       — bip.przemysl.pl/76706 (Mierosławskiego 4, sold, 136 350 zł)
//   Result list  — bip.przemysl.pl/59228 (10+2 items across 2 pages)

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

// Polish price string → integer PLN. Handles "136 350,00 zł", "136.350,00", "136350".
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "52,40" / "52.40" → 52.4
function parseArea(s) {
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

// Round from announcement title or body text.
// "kolejny" / "kolejne" → treated as round > 1 but exact number unknown → null
// (we'd need to count prior rounds; leave for enrichment).
export function roundFromText(text) {
  const t = toAscii(text || '');
  // Ordinal words before "przetarg"
  if (/\bpierwsz\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 1;
  if (/\bdrug\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 3;
  if (/\bczwart\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 4;
  if (/\bpiat\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return 5;
  // Roman ordinals: "II przetarg" / "III przetarg"
  const romanM = /\b(I{1,3}|IV|V|VI{0,3})\s+przetarg/i.exec(t);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  // "kolejny" / "kolejne" before "przetarg" = repeat round, ordinal unknown → null.
  // Must come before the bare fallback so "kolejny przetarg" doesn't become 1.
  if (/\bkolejn\w*\s+(?:\w+\s+){0,4}przetarg/i.test(t)) return null;
  // Bare "przetarg" with no ordinal = first round
  if (/\bprzetarg/.test(t)) return 1;
  return null;
}

// ---------------------------------------------------------------------------
// 1. Article list page parser (shared between announce and results listing)
// ---------------------------------------------------------------------------

/**
 * Parse a skyCMS article-list page (bip.przemysl.pl or invest.przemysl.eu).
 * Returns all {title, url} pairs found as <h2><a href="…">TITLE</a></h2> items.
 * Caller is responsible for title-based filtering.
 *
 * @param {string} html
 * @param {string} baseHost  e.g. 'https://bip.przemysl.pl' or 'https://invest.przemysl.eu'
 * @returns {Array<{title:string, url:string}>}
 */
export function parseListPage(html, baseHost) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  // skyCMS article-list markup. Two known variants:
  //   old: <h2|h3><a href="URL">TITLE</a></h2|h3>
  //   live 2026-07: <article class="post"><a href="URL" … class="post__link">
  //                   … <h3 class="post__header">TITLE</h3> … </a></article>
  //   (the link WRAPS the heading, so the old pattern never matches it)
  const RE_OLD = /<(?:h2|h3)[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/(?:h2|h3)>/gi;
  const RE_NEW = /<a[^>]+href="([^"]+)"[^>]*class="post__link"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const RE = RE_NEW.test(html) ? RE_NEW : RE_OLD;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(html)) !== null) {
    let url = m[1].replace(/&amp;/gi, '&').trim();
    const title = stripTags(m[2]).trim();
    if (!title || !url) continue;
    // Resolve relative URLs
    if (url.startsWith('/')) {
      url = baseHost.replace(/\/$/, '') + url;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
  }
  return out;
}

// Whether a title is for a flat ("lokal mieszkalny") auction or result.
export function isFlatTitle(title) {
  const t = toAscii(title || '');
  return /lokal\w*\s+mieszkaln/.test(t) || /mieszkaln\w*\s+lokal/.test(t);
}

// Whether a title is for a result notice (wynik przetargu).
export function isResultTitle(title) {
  const t = toAscii(title || '');
  return /wynik\w*\s+przetargu|wynik\w*\s+kolejnego\s+przetargu|wynik\w*\s+przetargow/i.test(t);
}

// ---------------------------------------------------------------------------
// 2. Announcement detail page parser
// ---------------------------------------------------------------------------

/**
 * Parse fields from one flat-auction announcement detail page HTML.
 * The content lives in the <article> / printArea / main section as prose.
 * Extracts: address, area_m2, starting_price_pln, auction_date, round, kind.
 *
 * @param {string} html  full page HTML
 * @param {string} sourceUrl  the article URL (for provenance)
 * @returns {{ kind:string, address_raw:string|null, address:object|null,
 *             area_m2:number|null, starting_price_pln:number|null,
 *             auction_date:string|null, round:number|null }}
 */
export function parseAnnouncement(html, sourceUrl) {
  const body = extractArticleText(html);
  const t = toAscii(body);

  // Kind from body text
  const kind = classifyKind(body);

  // Round from body text
  const round = roundFromText(body);

  // Auction date — anchor on "odbędzie się w dniu"
  let auction_date = null;
  const anchorIdx = t.search(/odbedzie\s+sie\s+w\s+dniu/);
  const scope = anchorIdx >= 0 ? body.slice(anchorIdx) : body.slice(0, 500);
  auction_date = dateFromNumeric(scope) || dateFromWords(scope);

  // Starting price — after "cena wywoławcza" label
  let starting_price_pln = null;
  const priceStart = t.search(/cena\s+wywolawcza/);
  if (priceStart >= 0) {
    const priceRegion = body.slice(priceStart, priceStart + 300);
    const pm = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(priceRegion);
    if (pm) starting_price_pln = parsePLN(pm[1]);
  }

  // Area — prefer "powierzchni użytkowej … m²"
  let area_m2 = null;
  const areaLab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,40}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (areaLab) {
    area_m2 = parseArea(areaLab[1]);
  }
  if (area_m2 == null) {
    // Fallback: take largest m² token not preceded by działka/piwnica
    const M2_RE = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
    const cands = [];
    let mm;
    M2_RE.lastIndex = 0;
    while ((mm = M2_RE.exec(body)) !== null) {
      const v = parseArea(mm[1]);
      if (v == null || v <= 0) continue;
      const before = body.slice(Math.max(0, mm.index - 50), mm.index);
      if (/dziadk|dzialki?|grunt/i.test(before)) continue;
      if (/piwnic|komorka?|przynale|garaz/i.test(before)) continue;
      cands.push(v);
    }
    if (cands.length) area_m2 = Math.max(...cands);
  }

  // Address — "przy ul. X Y/Z" pattern
  let address_raw = null;
  let address = null;
  const addrM = /przy\s+ul\.?\s+([A-Za-zÀ-ž][A-Za-z0-9À-ž\s.''\-]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(body);
  if (addrM) {
    address_raw = ('ul. ' + addrM[1]).replace(/\s+/g, ' ').trim();
    address = parseAddress(address_raw);
  }

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
 * Each notice covers one property (address, cena wywoławcza, cena osiągnięta /
 * wynik negatywny, auction date). Only flat records (kind='mieszkalny') are kept.
 *
 * Contract shape (same as Zabrze/Katowice parseResultDoc):
 *   { auction_date, source_pdf (URL), kind, address_raw, address,
 *     round, starting_price_pln, final_price_pln, outcome, unsold_reason,
 *     area_m2, notes }
 *
 * @param {string} text  plain text (or HTML) of the result notice body
 * @param {string|null} fallbackDate  ISO date from the crawl ref (rarely needed)
 * @param {string} sourceUrl  the article URL
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  // Accept both pre-extracted text and raw HTML
  const body = /<[a-z]/.test(text) ? extractArticleText(text) : text;
  const t = toAscii(body);
  const notes = [];

  // Only proceed if this looks like a result notice.
  // Match singular "przeprowadzony przetarg" AND plural "przeprowadzone przetargi".
  if (!/wynik\w*\s+przetarg|wyniku\s+przetarg|przeprowadzon\w*\s[\s\S]{0,80}przetarg/i.test(body)) return [];

  // Auction date — "W dniu DD miesiąca YYYY r." or "w dniu DD.MM.YYYY r."
  let auction_date = fallbackDate || null;
  const dateM1 = /[Ww]\s+dniu\s+([\d]{1,2})\s+([a-zÀ-ž]+)\s+(\d{4})/i.exec(body);
  const dateM2 = /[Ww]\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(body);
  if (dateM1) {
    const mon = PL_MONTHS[toAscii(dateM1[2])];
    if (mon) auction_date = iso(dateM1[3], mon, dateM1[1]);
  } else if (dateM2) {
    auction_date = iso(dateM2[3], dateM2[2], dateM2[1]);
  }

  // Round from body
  const round = roundFromText(body);

  // Kind from body — flat-only filter applied by caller via isFlatTitle;
  // we also check the body for "lokal mieszkalny" as a guard.
  const kind = classifyKind(body);
  if (kind !== 'mieszkalny') {
    // Not a flat result (land/house/commercial) — return empty to skip silently.
    // Caller (crawlResultDocs) already pre-filters by title; this is a backstop.
    return [];
  }

  // Address — "przy ul. X bldg/apt" or "położonej przy ul. X bldg"
  let address_raw = null;
  let address = null;
  const addrM = /przy\s+ul\.?\s+([A-Za-zÀ-ž][A-Za-z0-9À-ž\s.''\-]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(body);
  if (addrM) {
    address_raw = ('ul. ' + addrM[1]).replace(/\s+/g, ' ').trim();
    address = parseAddress(address_raw);
  }
  if (!address) {
    notes.push('parse: address parse failed');
    return [];
  }
  if (address.warning) notes.push(address.warning);

  // Starting price
  let starting_price_pln = null;
  const spStart = t.search(/cena\s+wywolawcza/);
  if (spStart >= 0) {
    const spRegion = body.slice(spStart, spStart + 300);
    const spm = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(spRegion);
    if (spm) starting_price_pln = parsePLN(spm[1]);
  }
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  // Achieved price ("Najwyższa cena osiągnięta w przetargu wyniosła X zł")
  let final_price_pln = null;
  const fpM = /[Nn]ajwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+wynios[łl]a\s+([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  if (fpM) final_price_pln = parsePLN(fpM[1]);

  // Outcome
  const negative =
    /wynikiem\s+negatywnym|nie\s+wp[łl]aci[łl]|nikt\s+nie\s+przyst[ąa]pi[łl]|nikt\s+nie\s+wp[łl]aci[łl]/i.test(body);
  const outcome = (negative || final_price_pln == null) ? 'unsold' : 'sold';
  let unsold_reason = null;
  if (outcome === 'unsold') {
    if (/brak\s+uczestnik|nie\s+wp[łl]aci[łl]\s+wadium|nikt\s+nie\s+wp[łl]aci[łl]/i.test(body)) {
      unsold_reason = 'brak_uczestnikow';
    } else {
      unsold_reason = 'unknown';
    }
  }

  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price on positive result');

  // Area
  let area_m2 = null;
  const areaLab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,40}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (areaLab) area_m2 = parseArea(areaLab[1]);

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

// ---------------------------------------------------------------------------
// Internal: extract article body text from a full BIP page HTML
// ---------------------------------------------------------------------------

/**
 * Extract the article/main content from a skyCMS page as plain text.
 * Strips nav/header/footer/metryczka boilerplate.
 * @param {string} html
 * @returns {string}
 */
export function extractArticleText(html) {
  if (!html) return '';
  // Try to isolate <article> or id="printArea" (skyCMS content wrapper)
  const printM = /id="printArea"[^>]*>([\s\S]*?)<\/(?:div|section|main)>/i.exec(html);
  const articleM = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainM = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);

  let raw = '';
  if (printM) {
    raw = printM[1];
  } else if (articleM) {
    raw = articleM[1];
  } else if (mainM) {
    // main includes nav — cut off at "Metryczka" or "Rejestr zmian"
    raw = mainM[1].replace(/Metryczka[\s\S]*/, '').replace(/Rejestr zmian[\s\S]*/, '');
  } else {
    raw = html;
  }
  return stripTags(raw);
}
