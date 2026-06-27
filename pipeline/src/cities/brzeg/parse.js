// Brzeg parsers.
//
// parseListingPage — extract active flat listings from the WordPress summary
//   page at brzeg.pl/gminne-nieruchomosci-do-sprzedazy/.  Each listing is a
//   sequence of labelled lines inside a <div class="entry-content"> block.
//   Groundtruthed against live page 2026-06-27:
//     "Lokal mieszkalny nr 1 przy ulicy 3 Maja 1"
//     "Cena: 97 000,00 zł"
//     "Tryb sprzedaży: I przetarg"
//     "Termin przetargu: 18.09. 2024 r., godz. 9.00"
//     "Pokaż pełne ogłoszenie: https://bip.brzeg.pl/przetargi,9_1-2024-7_72"
//
// parseBipIndexMonth — extract przetarg item links from a BIP month-level
//   index page (e.g. /przetargi,9_1-2026-1).  Items still active appear as
//   /przetargi,9_1-YYYY-M_NNN; archived items appear as /archiwum,7_5_NNN.
//
// parseBipItemPage — from an active BIP item page (/przetargi,9_1-YYYY-M_NNN)
//   extract the item title and the attachment links (announcement PDF + result PDF).
//
// parseResultDoc — registry contract.  Called by crawlResultDocs with the raw
//   text of a "Informacja o wyniku przetargu" PDF (pdfText output) + the page
//   date + source URL.
//
// NOTE (confirm on first CI refresh): parseResultDoc is groundtruthed against
//   the standard Polish result-notice template only (the live PDF was not
//   fetched during the spike).  Tune if real CI output diverges.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { pdfText } from '../../core/pdf-text.js';

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
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// "97 000,00 zł" / "220 000,00" / "97000" → integer PLN, or null.
// Polish monetary formatting uses a space as thousands separator and comma as
// decimal: "97 000,00 zł". Strategy: strip all whitespace, strip trailing
// decimal fraction, then parse. The 3-digit-regex approach fails here because
// "97000" after space-strip has no separators to split on.
export function parsePLN(s) {
  if (!s) return null;
  // Strip whitespace (regular space, non-breaking space, thin space)
  let cleaned = String(s).replace(/[\s  ]/g, '');
  // Strip trailing decimal ",NN" or ".NN"
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  // Remove remaining dot/comma thousand-separators: "97.000" -> "97000"
  // Only if the pattern is \d{1,3}([.,]\d{3})+ (classic thousands grouping)
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Round from title text: "I ustny…" → 1, "II ustny…" → 2, etc.
// Also handles "I przetarg", "II przetarg" from listing page tryb field.
const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I)\b/i;
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

export function roundFromTitle(title) {
  const m = ROMAN_RE.exec((title || '').toUpperCase());
  if (m) return ROMAN_MAP[m[1]] ?? null;
  // Plain "1 przetarg", "2 przetarg" (numeric)
  const nm = /\b([1-9])\s+przetarg/i.exec(title || '');
  if (nm) return Number(nm[1]);
  return 1; // bare "przetarg" = first
}

// Polish month-name → number.  Both diacritic (original) and ASCII-stripped
// (from pdfText Latin-1 conversion or stripped HTML) forms are included.
const PL_MONTHS = {
  // Genitive — diacritics
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, października: 10, listopada: 11, grudnia: 12,
  // Genitive — ASCII-stripped (pdfText may strip diacritics)
  wrzesnia: 9, pazdziernika: 10,
  // Nominative — diacritics
  styczeń: 1, luty: 2, marzec: 3, kwiecień: 4, maj: 5, czerwiec: 6,
  lipiec: 7, sierpień: 8, wrzesień: 9, październik: 10, listopad: 11, grudzień: 12,
  // Nominative — ASCII-stripped
  styczen: 1, kwiecien: 4, sierpien: 8, wrzesien: 9, pazdziernik: 10, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Parse "18.09. 2024" / "18.09.2024" / "18 września 2024" → ISO date or null.
export function parseDateText(s) {
  if (!s) return null;
  // Numeric: "18.09.2024" or "18.09. 2024"
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  // Spelled-out: "18 września 2024" (diacritics may be encoded or stripped)
  const word = /(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// brzeg.pl listing page parser
// ---------------------------------------------------------------------------

// The /gminne-nieruchomosci-do-sprzedazy/ page is a WordPress page listing
// currently active flat auctions.  Each auction entry is a cluster of <h2>/<p>
// elements inside .entry-content, structured as:
//   <h2>Lokal mieszkalny nr N przy ulicy <street> <bldg></h2>
//   <p>...description...</p>
//   <p>Cena: <price> zł</p>
//   <p>Tryb sprzedaży: <roman> przetarg</p>
//   <p>Termin przetargu: <date>, godz. ...</p>
//   <p>Pokaż pełne ogłoszenie: https://bip.brzeg.pl/przetargi,...</p>
//
// Strategy: split on <h2> or heading-like tags that start with "Lokal
// mieszkalny". Each chunk is its own listing block. Within the chunk we
// strip tags and extract the labelled fields from the plain text.

// Extract BIP URL from a text block (after tag-stripping).
function bipUrlFromBlock(text) {
  const m = /https?:\/\/bip\.brzeg\.pl\/\S+/i.exec(text);
  return m ? m[0].trim() : null;
}

// "Lokal mieszkalny nr N przy ulicy <street> <bldg>" → ParsedAddress or null.
function addrFromHeading(heading) {
  const m = /nr\s+(\d+[A-Za-z]?)\s+przy\s+ul(?:icy)?\.?\s+(.+)/i.exec(heading);
  if (!m) return null;
  const apt = m[1];
  const rest = m[2].trim();
  // rest = "<street> <bldg>". Last space-separated token is the building number.
  const parts = rest.split(/\s+/);
  if (parts.length < 2) return null;
  const bldg = parts[parts.length - 1];
  const street = parts.slice(0, -1).join(' ');
  return parseAddress(`${street} ${bldg}/${apt}`);
}

/**
 * Parse the brzeg.pl /gminne-nieruchomosci-do-sprzedazy/ HTML.
 * @param {string} html
 * @returns {Array<object>}
 */
export function parseListingPage(html) {
  if (!html) return [];
  const out = [];

  // Split on HTML headings (h1-h6) or <p>/<strong> that start a new listing.
  // Lookahead keeps the opening tag in each chunk.
  const chunks = html.split(/(?=<h[1-6][^>]*>\s*Lokal\s+mieszkaln)/i).filter(Boolean);

  for (const chunk of chunks) {
    // Also handle listings that start with <p><strong>Lokal... (some WP themes)
    // or bare <p>Lokal... — scan chunk for this pattern if no h-tag match.
    const isLokal = /^<h[1-6]/i.test(chunk.trimStart()) || /Lokal\s+mieszkaln\w*\s+nr\s+\d/i.test(chunk);
    if (!isLokal) continue;

    // Strip tags to get plain text for this block
    const text = stripTags(chunk);
    if (!/lokal\s+mieszkaln\w*\s+nr\s+\d/i.test(text)) continue;

    // Extract heading: "Lokal mieszkalny nr N przy ulicy <street> <bldg>"
    // The heading ends at the first field label or another lokal heading.
    const headingM = /^(Lokal\s+mieszkaln\w*\s+nr\s+\d+[A-Za-z]?\s+przy\s+\S+\.?\s+[\w\s]+?\d+[A-Za-z]?)(?=\s+Lokal\s+mieszkaln|\s+Cena\s*:|\s+Tryb|\s+Wadium|\s+Termin|\s+Kontakt|\s+Poka|$)/i.exec(text);
    const heading = headingM ? headingM[1].trim() : '';
    if (!heading) continue;

    const address = addrFromHeading(heading);
    if (!address) continue;

    // Cena: "97 000,00 zł" — capture digits+spaces+dots+commas before "zł"
    const cenaM = /Cena\s*:\s*([\d  .,]+?)\s*z[łlł]/i.exec(text);
    const starting_price_pln = cenaM ? parsePLN(cenaM[1]) : null;

    // Tryb sprzedaży: "I przetarg"
    const trybM = /Tryb\s+sprzeda[zż]y\s*:\s*([IVX\d]+\s+przetarg[^C]*?)(?=\s+(?:Wadium|Termin|Kontakt|Poka|$))/i.exec(text);
    const round = trybM ? (roundFromTitle(trybM[1].trim()) ?? 1) : 1;

    // Termin przetargu: "18.09. 2024 r., godz. 9.00"
    const terminM = /Termin\s+przetargu\s*:\s*([\d.\s\w,]+?)(?=\s+(?:Kontakt|Poka[zż]|Termin\s+wp|$))/i.exec(text);
    const auction_date = terminM ? parseDateText(terminM[1]) : null;

    // BIP URL from the text block
    const bip_url = bipUrlFromBlock(text);

    out.push({
      kind: 'mieszkalny',
      address_raw: heading,
      address,
      round,
      starting_price_pln,
      auction_date,
      bip_url: bip_url ?? null,
      detail_url: bip_url ?? null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// BIP index month page parser
// ---------------------------------------------------------------------------

const BIP_BASE = 'https://bip.brzeg.pl';

/**
 * Extract active (non-archived) przetarg item links from a BIP month-index page.
 * Active items: href="/przetargi,9_1-YYYY-M_NNN"
 * Archived:     href="/archiwum,7_5_NNN"  (excluded — content is hidden)
 *
 * @param {string} html  BIP month-index page HTML
 * @returns {Array<{title:string, url:string}>}
 */
export function parseBipIndexMonth(html) {
  const out = [];
  const seen = new Set();
  const re = /href="(\/przetargi,9_1-\d{4}-\d+_\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({
      title: stripTags(m[2]).trim(),
      url: BIP_BASE + path,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// BIP item page parser
// ---------------------------------------------------------------------------

/**
 * Parse an active BIP item page (/przetargi,9_1-YYYY-M_NNN).
 * @param {string} html
 * @param {string} pageUrl
 * @returns {{ title:string, announcementPdf:string|null, resultPdf:string|null, publishedDate:string|null } | null}
 */
export function parseBipItemPage(html, pageUrl) {
  if (!html) return null;

  // Title from <h1> or metadata "Nazwa:" field
  let title = '';
  const h1M = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1M) {
    title = stripTags(h1M[1]).trim();
  } else {
    const nameM = /Nazwa(?:\s+przetargu)?\s*:\s*([\s\S]*?)(?:\n|<)/i.exec(html);
    if (nameM) title = stripTags(nameM[1]).trim();
  }

  // Attachment PDF links: /uploaded_files/serwis_files/attachments/przetargi/NNN/hash.pdf
  const attachRe = /href="(\/uploaded_files\/serwis_files\/attachments\/przetargi\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let announcementPdf = null;
  let resultPdf = null;
  let am;
  while ((am = attachRe.exec(html)) !== null) {
    const href = am[1];
    const linkText = stripTags(am[2]).toLowerCase();
    const absUrl = BIP_BASE + href;
    if (/informacj\w*\s+o\s+wynik/i.test(linkText)) {
      resultPdf = absUrl;
    } else if (/og[łl]oszeni/i.test(linkText)) {
      if (!announcementPdf) announcementPdf = absUrl;
    } else if (!announcementPdf && !resultPdf) {
      // First PDF without a recognised label — likely the announcement
      if (!resultPdf) announcementPdf = absUrl;
    }
  }

  // Published date from metadata "Data wytworzenia informacji: DD.MM.YYYY HH:MM:SS"
  const dateM = /Data\s+wytworzenia\s+informacji\s*:\s*(\d{2}\.\d{2}\.\d{4})/i.exec(html);
  const publishedDate = dateM ? parseDateText(dateM[1]) : null;

  return { title, announcementPdf, resultPdf, publishedDate };
}

// ---------------------------------------------------------------------------
// Result PDF parser (registry contract: parseResultDoc)
// ---------------------------------------------------------------------------

// "Informacja o wynikach przetargu" PDFs follow the standard Polish template:
//
//   Burmistrz Miasta Brzegu informuje, że w dniu <date> odbył się
//   <N> przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr <apt>
//   przy ulicy <street> <bldg> ...
//   Cena wywoławcza: <price> zł
//   Cena osiągnięta: <final> zł   ← achieved price (if sold)
//   — or —
//   Przetarg zakończył się wynikiem negatywnym.
//
// NOTE: this parser was NOT verified against a live PDF during the spike.
// Groundtruthed against the standard Polish municipal template.
// VALIDATE on first live CI refresh and tune as needed.

function priceFromResultText(text, labelPattern) {
  const re = new RegExp(labelPattern + '[^\\d]{0,25}([\\d][\\d\\u00a0 .,]*)\\s*z[łl\\u0142]', 'i');
  const m = re.exec(text);
  return m ? parsePLN(m[1]) : null;
}

function addressFromResultText(text) {
  // Extract apartment number from "lokal(u) mieszkaln... nr N"
  const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  if (!aptM) return null;
  const apt = aptM[1];

  // Extract street + building from "przy ul(icy). <street> <bldg>"
  // Street names may start with digits ("3 Maja") so we use [\w\s.\-]+?
  // Terminated by punctuation or end of line.
  const addrM = /przy\s+ul(?:icy)?\.?\s+([\w\s.\-]+?)\s+(\d+[A-Za-z]?)(?=[.,;\s])/i.exec(text);
  if (!addrM) return null;

  return parseAddress(`${addrM[1].trim()} ${addrM[2]}/${apt}`);
}

/**
 * Parse a "Informacja o wynikach przetargu" PDF text into result record(s).
 * @param {string} text   pdfText output
 * @param {string|null} fallbackDate  ISO date from BIP page metadata
 * @param {string} sourceUrl  absolute URL of the PDF
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  // Gate: must look like a result notice.
  // The PDF header typically contains "Informacja o wynikach przetargu", but
  // some PDFs start directly with the body ("Burmistrz … informuje …").
  // Accept when: the header phrase is present OR a result-specific field
  // ("Cena osiągnięta") OR an unsold marker ("wynikiem negatywnym") is present.
  const isResultNotice =
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /Cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /wynik(?:iem)?\s+negatywn/i.test(t);
  if (!isResultNotice) return [];

  // Kind: Brzeg adapter scope is residential flats only.
  // Land sales (działki) also appear on the BIP board — exclude them.
  if (/niezabudowan\w*\s+dzia[łl]k|sprzeda[żz]\s+dzia[łl]k/i.test(t)) return [];
  const kind = 'mieszkalny';

  // Address
  const address = addressFromResultText(t);
  if (!address) return [];

  // Auction date from "w dniu DD miesiąca YYYY" or "w dniu DD.MM.YYYY"
  let auction_date = fallbackDate ?? null;
  const dateM1 = /w\s+dniu\s+(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})\s+(?:roku\s+)?(?:o\s+godz|odby[łl])/i.exec(t);
  const dateM2 = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(?:roku\s+)?(?:o\s+godz|odby[łl])/i.exec(t);
  if (dateM1) {
    const mon = PL_MONTHS[dateM1[2].toLowerCase()];
    if (mon) auction_date = iso(dateM1[3], mon, dateM1[1]);
  } else if (dateM2) {
    auction_date = iso(dateM2[3], dateM2[2], dateM2[1]);
  }

  const starting_price_pln = priceFromResultText(t, 'Cena\\s+wywo[łl\\u0142]awcza\\s*:?');
  const final_price_pln =
    priceFromResultText(t, 'Cena\\s+osi[ąa]gni[ęe]ta\\s*:?') ??
    priceFromResultText(t, 'cena\\s+nabycia\\s*:?');

  const unsold = /wynik(?:iem)?\s+negatywn|nikt\s+nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik|wadium)/i.test(t);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/brak\s+wadium/i.test(t) ? 'brak wadium' : 'wynik negatywny')
    : null;

  return [{
    kind,
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}

// Re-export for crawl.js result-PDF extraction
export { pdfText };
