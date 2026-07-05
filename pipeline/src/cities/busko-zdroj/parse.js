// Busko-Zdrój parsers.
//
// parseIndexPage(html) — extract auction-announcement links from a page of the
//   Joomla /ogloszenia feed. The feed is mostly obwieszczenia (warunki
//   zabudowy / środowisko); we keep only links whose title matches the standard
//   property-sale auction phrasing ("przetarg ustny nieograniczony na sprzedaż
//   nieruchomości komunalnych"). Returns Array<{ url, title }> (absolute URLs).
//
// parseAnnouncementListings(html, url) — from ONE auction-announcement article
//   page, extract every lokal-mieszkalny record. A single announcement can list
//   a flat + a commercial building + land plots; only flats are returned.
//   The flat's address + starting price come from the "Ceny wywoławcze …"
//   enumeration line ("190 000,00 zł lokal mieszkalny Busko-Zdrój os. Kościuszki
//   7/6"); its area from the descriptive paragraph ("Lokal mieszkalny nr 6 o
//   pow. użytkowej 26,38 m²"); the auction date from "Przetarg odbędzie się w
//   dniu 7 sierpnia 2025 r."; the round from the article title ordinal.
//
// parseResultLink(html) — from the same article page, extract the result PDF
//   URL ("Informacja o wynikach przetargu [pdf]") + the announcement PDF URL +
//   the article's published date. Feeds crawlResultDocs.
//
// parseResultDoc(text, fallbackDate, sourceUrl) — registry contract. Parses a
//   born-digital "Informacja o wynikach przetargu" PDF (pdftotext -layout).
//   The PDF is multi-item (one numbered clause per property); only flat clauses
//   are returned. NOTE: pdftotext strips Polish diacritics on this host, so the
//   regexes are diacritic-tolerant (u\w+ for "użytkowej", osi\w+ for
//   "osiągnięta", etc.).
//
// Groundtruthed against live fixtures fetched 2026-07-05:
//   ANNOUNCEMENT: umig.busko.pl/ogloszenia/24147-…-gnwr-6840-23-2025.html
//     flat: os. Kościuszki 7/6, 26,38 m², cena wywoławcza 190 000 zł,
//           I (pierwszy) przetarg, 7 sierpnia 2025.
//   RESULT PDF: dl.umig.busko.pl/bip/ogloszenia/2025/08/19/
//               informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf
//     flat clause: cena osiągnięta 0 → przetarg zakończony wynikiem negatywnym
//     (UNSOLD; no achieved price). The batch's other clause (Plac Zwycięstwa 26,
//     zabudowana nieruchomość) is filtered out.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { pdfText } from '../../core/pdf-text.js';

const HOST = 'https://www.umig.busko.pl';
const DL_HOST = 'https://dl.umig.busko.pl';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function stripTags(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "190 000,00 zł" / "190000" → integer PLN, or null. Zero is treated as "no
// price" (a result PDF prints "cena osiągnięta - 0" for an unsold lot).
export function parsePLN(s) {
  if (s == null) return null;
  let cleaned = String(s).replace(/[\s  ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "26,38" / "26.38" → float m², or null.
export function parseArea(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Polish month-name → number. Genitive forms (both diacritic + ASCII-stripped,
// since pdftotext drops diacritics on this host).
const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "7 sierpnia 2025" / "07.08.2025" / "7 sierpnia 2025 r." → ISO date or null.
export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([a-zżźćńłśąęóA-ZŻŹĆŃŁŚĄĘÓ]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

// Round from a title / clause head. Polish ordinal words + Roman numerals.
const ORDINAL_WORDS = {
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, piaty: 5, 'piąty': 5,
  szosty: 6, 'szósty': 6, siodmy: 7, 'siódmy': 7, osmy: 8, 'ósmy': 8,
};
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };
const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I)\b/;

export function roundFromTitle(title) {
  if (!title) return 1;
  const lower = title.toLowerCase();
  for (const [word, n] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\s+przetarg`, 'i').test(lower)) return n;
  }
  const rm = ROMAN_RE.exec(title.toUpperCase());
  if (rm) return ROMAN_MAP[rm[1]] ?? 1;
  const nm = /\b([1-9])\s+przetarg/i.exec(title);
  if (nm) return Number(nm[1]);
  return 1; // bare "przetarg" = first
}

// The standard property-sale auction title on this host.
const AUCTION_TITLE_RE =
  /przetarg[\s\S]{0,40}?(?:ustn\w+\s+)?(?:nieograniczon\w+\s+)?na\s+sprzeda[żz][\s\S]{0,40}?nieruchomo[śs]ci\s+komunaln/i;

// Isolate the Joomla article body (drops the surrounding nav/footer boilerplate).
function articleBody(html) {
  if (!html) return '';
  const start = html.indexOf('com-content-article__body');
  if (start === -1) return html;
  const rest = html.slice(start);
  const end = rest.search(/<nav[^>]+pagenavigation|class="article-info/i);
  return end === -1 ? rest : rest.slice(0, end);
}

// Page <title> (used for round detection when present).
function pageTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

// ---------------------------------------------------------------------------
// Index (feed) page parser
// ---------------------------------------------------------------------------

/**
 * Extract auction-announcement links from one /ogloszenia feed page.
 * @param {string} html
 * @returns {Array<{ url: string, title: string }>}
 */
export function parseIndexPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const re = /href="(\/ogloszenia\/\d+-[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    const title = stripTags(m[2]);
    if (!AUCTION_TITLE_RE.test(title)) continue;
    seen.add(path);
    out.push({ url: HOST + path, title });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Announcement article parser (active flat listings)
// ---------------------------------------------------------------------------

// A flat's price+address anchor from the "Ceny wywoławcze nieruchomości
// wynoszą:" enumeration, e.g.
//   "190 000,00 zł lokal mieszkalny Busko-Zdrój os. Kościuszki 7/6"
const PRICE_ADDR_RE =
  /([\d][\d\s ]*,\d{2})\s*z[łl]\s+lokal\w*\s+mieszkaln\w*\s+Busko[\-\s]?Zdr[oó]j\w*\s+(?:os\.|ul\.|al\.|pl\.)\s*([^\d,]+?)\s+(\d+[A-Za-z]?)\s*\/\s*(\d+[A-Za-z]?)/gi;

/**
 * Parse one auction-announcement article page into flat listing record(s).
 * @param {string} html
 * @param {string} pageUrl
 * @returns {Array<object>}
 */
export function parseAnnouncementListings(html, pageUrl) {
  if (!html) return [];
  const bodyText = stripTags(articleBody(html));
  if (!/lokal\w*\s+mieszkaln/i.test(bodyText)) return [];

  const title = pageTitle(html);
  const round = roundFromTitle(title || bodyText);

  // Shared auction date: "Przetarg odbędzie się w dniu 7 sierpnia 2025 r."
  const dateM =
    /Przetarg\s+odb[eę]dzie\s+si[eę]\s+w\s+dniu\s+(\d{1,2}\s+[a-zżźćńłśąęó]+\s+\d{4})/i.exec(bodyText) ||
    /w\s+dniu\s+(\d{1,2}\s+[a-zżźćńłśąęó]+\s+\d{4})/i.exec(bodyText);
  const auction_date = dateM ? parseDateText(dateM[1]) : null;

  const out = [];
  const seen = new Set();
  let m;
  PRICE_ADDR_RE.lastIndex = 0;
  while ((m = PRICE_ADDR_RE.exec(bodyText)) !== null) {
    const starting_price_pln = parsePLN(m[1]);
    const street = m[2].trim();
    const building = m[3];
    const apt = m[4];
    const address = parseAddress(`${street} ${building}/${apt}`);
    if (!address) continue;
    if (seen.has(address.key)) continue;
    seen.add(address.key);

    // Area from the descriptive paragraph for this apartment number.
    const areaRe = new RegExp(
      `Lokal\\w*\\s+mieszkaln\\w*\\s+nr\\s+${apt}\\s+o\\s+pow\\.\\s+u[żz]ytkowej\\s+(\\d+[,.]\\d+)`,
      'i',
    );
    const areaM = areaRe.exec(bodyText);
    const area_m2 = areaM ? parseArea(areaM[1]) : null;

    out.push({
      kind: 'mieszkalny',
      title: title || null,
      address_raw: `${street} ${building}/${apt}`,
      address,
      area_m2: area_m2 ?? null,
      round: round ?? 1,
      starting_price_pln: starting_price_pln ?? null,
      auction_date,
      detail_url: pageUrl,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Result-link extractor (points crawlResultDocs at the result PDF)
// ---------------------------------------------------------------------------

/**
 * From an announcement article page, find the result PDF + announcement PDF +
 * an article date.
 * @param {string} html
 * @returns {{ resultPdf: string|null, announcementPdf: string|null, publishedDate: string|null }}
 */
export function parseResultLink(html) {
  const empty = { resultPdf: null, announcementPdf: null, publishedDate: null };
  if (!html) return empty;

  let resultPdf = null;
  let announcementPdf = null;

  // Each attachment is: <strong>LABEL</strong> [ <a href="…pdf">pdf</a> ]
  const re = /<strong>\s*(?:<strong>)?\s*([^<\[]{4,80}?)\s*(?:<\/strong>)?\s*\[[\s\S]{0,40}?<a[^>]+href="([^"]+\.pdf)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const label = stripTags(m[1]).toLowerCase();
    let href = m[2];
    if (href.startsWith('/')) href = DL_HOST + href;
    if (/informacj\w*\s+o\s+wynik/i.test(label)) {
      if (!resultPdf) resultPdf = href;
    } else if (/dokument\s+[źz]r[oó]d[łl]owy|og[łl]oszeni/i.test(label)) {
      if (!announcementPdf) announcementPdf = href;
    }
  }

  // Fallback: pick result/announcement PDFs straight from dl.umig links by name.
  if (!resultPdf || !announcementPdf) {
    const linkRe = /href="(https?:\/\/dl\.umig\.busko\.pl\/[^"]+\.pdf)"/gi;
    let lm;
    while ((lm = linkRe.exec(html)) !== null) {
      const u = lm[1];
      if (!resultPdf && /informacj\w*_o_wy\w*|o_wynik|wynikach/i.test(u)) resultPdf = u;
      else if (!announcementPdf && /ogloszenie|og[łl]oszeni/i.test(u)) announcementPdf = u;
    }
  }

  // Article date from "Zmodyfikowano" / "Opublikowano" or the body's own date.
  let publishedDate = null;
  const modM = /(?:Zmodyfikowano|Opublikowano)[^0-9]*(\d{1,2}[.\-]\d{1,2}[.\-]\d{4})/i.exec(html);
  if (modM) publishedDate = parseDateText(modM[1]);
  if (!publishedDate) {
    const bodyDate = /Busko[\-\s]?Zdr[oó]j\w*,\s*dn\.?\s*(\d{1,2}[.\-]\d{1,2}[.\-]\d{4})/i.exec(stripTags(articleBody(html)));
    if (bodyDate) publishedDate = parseDateText(bodyDate[1]);
  }

  return { resultPdf, announcementPdf, publishedDate };
}

// ---------------------------------------------------------------------------
// Result PDF parser (registry contract: parseResultDoc)
// ---------------------------------------------------------------------------

// Split a multi-item result notice into per-property clauses. Each clause opens
// with "N. <ordinal> przetarg ustny nieograniczony na sprzedaż …".
function splitResultClauses(text) {
  const parts = text.split(/(?=\n?\s*\d+\.\s+\w+\s+przetarg\s+ustny\s+nieograniczony)/i);
  return parts.filter((p) => /\d+\.\s+\w+\s+przetarg\s+ustny/i.test(p));
}

function addressFromClause(clause) {
  const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(clause);
  if (!aptM) return null;
  const apt = aptM[1];
  const bldgM = /budyn\w*\s+\w+\s+nr\s+(\d+[A-Za-z]?)/i.exec(clause);
  const building = bldgM ? bldgM[1] : null;
  const streetM = /na\s+(?:os\.|ul\.|al\.|pl\.)\s+([A-Za-zżźćńłśąęóŻŹĆŃŁŚĄĘÓ]+)/i.exec(clause);
  const street = streetM ? streetM[1] : null;
  if (!building || !street) return null;
  return parseAddress(`${street} ${building}/${apt}`);
}

/**
 * Parse a "Informacja o wynikach przetargu" PDF text into flat result record(s).
 * @param {string} text  pdfText output
 * @param {string|null} fallbackDate  ISO date from the article page
 * @param {string} sourceUrl  absolute URL of the PDF
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const isResultNotice =
    /informacj\w*[\s\S]{0,40}?o\s+wynik/i.test(t) ||
    /cena\s+osi\w+\s+w\s+przetargu/i.test(t) ||
    /wynik\w*\s+negatywn/i.test(t);
  if (!isResultNotice) return [];

  // Shared auction date from the notice header: "które odbyły się w dniu 7
  // sierpnia 2025 roku".
  let headerDate = fallbackDate ?? null;
  const hM =
    /w\s+dniu\s+(\d{1,2}\s+[a-zżźćńłśąęó]+\s+\d{4})/i.exec(t) ||
    /w\s+dniu\s+(\d{1,2}[.\-]\d{1,2}[.\-]\d{4})/i.exec(t);
  if (hM) headerDate = parseDateText(hM[1]) ?? headerDate;

  const out = [];
  for (const clause of splitResultClauses(t)) {
    if (classifyKind(clause) !== 'mieszkalny') continue;

    const address = addressFromClause(clause);
    if (!address) continue;

    const areaM = /pow\.\s+u\w*ytkowej\s+(\d+[,.]\d+)/i.exec(clause);
    const area_m2 = areaM ? parseArea(areaM[1]) : null;

    const startM = /Cena\s+wywo\w+\s+nieruchomo\w+\s*[-:]?\s*([\d][\d\s ]*,\d{2})/i.exec(clause);
    const starting_price_pln = startM ? parsePLN(startM[1]) : null;

    const achM = /cena\s+osi\w+\s+w\s+przetargu\s*[-:]?\s*([\d][\d\s ]*)/i.exec(clause);
    const final_price_pln = achM ? parsePLN(achM[1]) : null;

    const unsold = /wynik\w*\s+negatywn|brak\s+os[oó]b\s+ucze|nie\s+zg[łl]osi/i.test(clause);
    const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
    const unsold_reason = unsold ? 'wynik negatywny' : null;

    out.push({
      kind: 'mieszkalny',
      address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
      address,
      area_m2: area_m2 ?? null,
      round: roundFromTitle(clause),
      starting_price_pln: starting_price_pln ?? null,
      final_price_pln: final_price_pln ?? null,
      auction_date: headerDate,
      outcome,
      unsold_reason,
      source_pdf: sourceUrl,
    });
  }
  return out;
}

// Re-export for crawl.js result-PDF extraction.
export { pdfText };
