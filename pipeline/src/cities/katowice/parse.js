// Katowice city-BIP parsers:
//   parseAnnouncement(html, …)  — sale-auction announcement HTML body -> active listing
//   parseResultPdf(text, …)     — result-PDF table (pdftotext -layout) -> sold records
// See SPIKE-WAVE1.md for samples of both formats.

import { parseAddress } from '../../core/normalize.js';

// The Katowice BIP encodes spaces/colons as numeric HTML entities
// (&#160; &#58; …) — decode them or the field regexes never match.
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// "85 000,00 zł" / "85 000 zł" -> 85000
function parsePLN(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/,\d{2}$/, '').replace(/[^\d]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isoDate(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function kindFromText(t) {
  if (/lokal\w*\s+mieszkaln/i.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+(?:niemieszkaln|u[żz]ytkow)/i.test(t)) return 'uzytkowy';
  if (/gara[żz]/i.test(t)) return 'garaz';
  return 'unknown';
}

// Round numeral from the title ("Drugi przetarg …" = 2). Plain "Przetarg …" = 1.
function roundFromTitle(title) {
  const t = title.toLowerCase();
  if (/\bdrug\w*\s+przetarg/.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/.test(t)) return 3;
  if (/\bczwart\w*\s+przetarg/.test(t)) return 4;
  return 1;
}

// Street address out of the announcement title ("… przy ul. Sienkiewicza 8/9").
function addressFromTitle(title) {
  const m = /przy\s+(?:ul|al|pl|os)\.?\s*([^()]+?)\s*(?:\(|$)/i.exec(title);
  return m ? m[1].trim() : null;
}

/**
 * Parse a sale-auction announcement (the dokument.aspx HTML body).
 * @param {string} html   raw HTML of the dokument.aspx page
 * @param {string} title  document title (from the board link)
 * @param {string} docUrl
 * @returns {object|null} an active listing, or null if the address can't be placed
 */
export function parseAnnouncement(html, title, docUrl) {
  const text = stripTags(html);

  const addrRaw = addressFromTitle(title);
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) return null;

  const titleKind = kindFromText(title);
  const kind = titleKind !== 'unknown' ? titleKind : kindFromText(text);

  const areaM = /o\s+pow\.\s*(?:u[żz]ytkowej\s*)?(\d+(?:[,.]\d+)?)\s*m/i.exec(text);
  const areaNum = areaM ? Number(areaM[1].replace(',', '.')) : null;

  // "Cena wywoławcza [nieruchomości] wynosi: 85 000,00 zł"
  const priceM = /Cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d ]+(?:,\d{2})?)\s*z[łl]/i.exec(text);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  // "Przetarg odbędzie się w dniu 16.06.2026 r."
  const adM = /Przetarg\s+odb[ęe]dzie\s+si[ęe][^.]{0,40}?\bw\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  const auction_date = adM ? isoDate(adM[1], adM[2], adM[3]) : null;

  // "Wadium może być wnoszone w pieniądzu do dnia 08.06.2026 r."
  const wadM = /[Ww]adium[^.]{0,90}?do\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  const wadium_deadline = wadM ? isoDate(wadM[1], wadM[2], wadM[3]) : null;

  // "Oglądanie lokalu będzie możliwe w dniach od … do 08.06.2026 r."
  const viewM = /Ogl[ąa]danie[\s\S]{0,160}?\bdo\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  const viewing_date = viewM ? isoDate(viewM[1], viewM[2], viewM[3]) : null;

  return {
    kind,
    round: roundFromTitle(title),
    address_raw: addrRaw,
    address,
    auction_date,
    area_m2: Number.isFinite(areaNum) ? areaNum : null,
    starting_price_pln,
    detail_url: docUrl,
    wadium_deadline,
    viewing_date,
  };
}

// ----------------------------------------------------------- result PDF table
//
// `pdftotext -layout` of a "Wyniki przetargów" PDF is a spatial table: each
// logical row spans ~6 physical lines (the property-designation cell is itself
// multi-line). Rows are anchored by a "Lp.  DD.MM.YYYY" line; a row owns the
// physical lines between the midpoints to its neighbouring anchors. Fields are
// then regexed out of the joined row blob. v1 — see SPIKE-WAVE1.md.

const ANCHOR = /^\s*(\d{1,3})\s+(\d{2})\.(\d{2})\.(\d{4})\b/;

function parseResultRow(blob, anchorDate, sourceUrl) {
  const notes = [];

  let kind = 'unknown';
  if (/lokal\w*\s+mieszkaln/i.test(blob)) kind = 'mieszkalny';
  else if (/lokal\w*\s+niemieszkaln/i.test(blob)) kind = 'uzytkowy';
  else if (/gara[żz]/i.test(blob)) kind = 'garaz';

  // Property address: first "ul./al./pl. <street> <num>[/apt]" that is not the
  // auction venue (Urząd Miasta Katowice, ul. Młyńska 4). v1 heuristic.
  const addrCands = [
    ...blob.matchAll(
      /\b(?:ul|al|pl)\.\s*([A-ZŻŹĆĄŚĘÓŁŃ][^,;]*?\s+\d+[A-Za-z]?(?:\s*\/\s*[\dIVXLA-Za-z]+)?)/g,
    ),
  ]
    .map((m) => m[1].trim().replace(/\s+/g, ' '))
    .filter((a) => !/^M[lł]y[nń]sk/i.test(a));
  const addrRaw = addrCands[0] || '';
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) notes.push('parse: address unresolved: ' + (addrRaw || '(none)'));

  // Unit area — "o pow. użytkowej 24,18 m2" (the plot area "o pow. 852 m2" has
  // no "użytkowej", so this regex correctly skips it).
  const arM = /o\s+pow\.\s*u[żz]ytkowej\s*(\d+(?:[,.]\d+)?)\s*m/i.exec(blob);
  const areaNum = arM ? Number(arM[1].replace(',', '.')) : null;

  // The two money columns: starting price, then price achieved. Numbers use
  // Polish thousands grouping — anchoring on \d{1,3}( \d{3})* stops the regex
  // swallowing the adjacent auction-date year ("…2026 53 000 zł" -> 53 000).
  const prices = [...blob.matchAll(/(?<![\d.])(\d{1,3}(?: \d{3})*)\s*z[łl]/gi)]
    .map((m) => parsePLN(m[1]))
    .filter((n) => n != null);
  const starting_price_pln = prices[0] ?? null;
  const final_price_pln = prices[1] ?? null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (address && address.warning) notes.push(address.warning);

  return {
    auction_date: anchorDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addrRaw,
    address,
    round: null,
    starting_price_pln,
    final_price_pln,
    outcome: 'sold',
    unsold_reason: null,
    area_m2: Number.isFinite(areaNum) ? areaNum : null,
    notes,
  };
}

/**
 * Parse a Katowice "Wyniki przetargów" result PDF (pdftotext -layout text)
 * into one sold record per table row.
 * @param {string} text         pdftotext -layout output
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl    the PDF URL
 * @returns {object[]}
 */
export function parseResultPdf(text, fallbackDate, sourceUrl) {
  const lines = String(text).split('\n');
  const anchors = [];
  lines.forEach((ln, i) => {
    const m = ANCHOR.exec(ln);
    if (m) anchors.push({ i, date: `${m[4]}-${m[3]}-${m[2]}` });
  });
  if (!anchors.length) return [];

  const out = [];
  for (let k = 0; k < anchors.length; k++) {
    const start =
      k === 0
        ? Math.max(0, anchors[0].i - 4)
        : Math.floor((anchors[k - 1].i + anchors[k].i) / 2) + 1;
    const end =
      k === anchors.length - 1
        ? Math.min(lines.length, anchors[k].i + 7)
        : Math.floor((anchors[k].i + anchors[k + 1].i) / 2) + 1;
    const blob = lines.slice(start, end).join(' ').replace(/\s+/g, ' ').trim();
    out.push(parseResultRow(blob, anchors[k].date || fallbackDate, sourceUrl));
  }
  return out;
}
