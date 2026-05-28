// Katowice city-BIP parsers:
//   parseAnnouncement(html, …)        — sale-auction announcement HTML body -> active listing
//   parseResultPdf(text, …)           — per-auction "Wyniki przetargów DD.MM.YYYY" PDF table
//   parseYearlySummaryPdf(text, …)    — annual "Wykaz nieruchomości sprzedanych w roku YYYY" PDF
//   parseResultDoc(text, …)           — dispatcher: picks the right parser by content sniff
// See SPIKE-WAVE1.md for samples of both result-PDF formats.

import { parseAddress } from '../../core/normalize.js';

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

function roundFromTitle(title) {
  const t = title.toLowerCase();
  if (/\bdrug\w*\s+przetarg/.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/.test(t)) return 3;
  if (/\bczwart\w*\s+przetarg/.test(t)) return 4;
  return 1;
}

function addressFromTitle(title) {
  const m = /przy\s+(?:ul|al|pl|os)\.?\s*([^()]+?)\s*(?:\(|$)/i.exec(title);
  return m ? m[1].trim() : null;
}

export function parseAnnouncement(html, title, docUrl) {
  const text = stripTags(html);

  const addrRaw = addressFromTitle(title);
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) return null;

  const titleKind = kindFromText(title);
  const kind = titleKind !== 'unknown' ? titleKind : kindFromText(text);

  const areaM = /o\s+pow\.\s*(?:u[żz]ytkowej\s*)?(\d+(?:[,.]\d+)?)\s*m/i.exec(text);
  const areaNum = areaM ? Number(areaM[1].replace(',', '.')) : null;

  const priceM = /Cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d ]+(?:,\d{2})?)\s*z[łl]/i.exec(text);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  const adM = /Przetarg\s+odb[ęe]dzie\s+si[ęe][^.]{0,40}?\bw\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  const auction_date = adM ? isoDate(adM[1], adM[2], adM[3]) : null;

  const wadM = /[Ww]adium[^.]{0,90}?do\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  const wadium_deadline = wadM ? isoDate(wadM[1], wadM[2], wadM[3]) : null;

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

const ANCHOR = /^\s*(\d{1,3})\s+(\d{2})\.(\d{2})\.(\d{4})\b/;

function parseResultRow(blob, anchorDate, sourceUrl) {
  const notes = [];

  let kind = 'unknown';
  if (/lokal\w*\s+mieszkaln/i.test(blob)) kind = 'mieszkalny';
  else if (/lokal\w*\s+niemieszkaln/i.test(blob)) kind = 'uzytkowy';
  else if (/gara[żz]/i.test(blob)) kind = 'garaz';

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

  const arM = /o\s+pow\.\s*u[żz]ytkowej\s*(\d+(?:[,.]\d+)?)\s*m/i.exec(blob);
  const areaNum = arM ? Number(arM[1].replace(',', '.')) : null;

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

// ------------------------------------------------- yearly summary PDF table

const ROMAN_TO_INT = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };
const PLN_ALL_RE = /(?<![\d.,])(\d{1,3}(?:[. ]\d{3})*(?:,\d{2})?)\s*z[łl]/gi;
const DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})r?\.?/;
const ROUND_RE = /\b(I{1,3}|IV|V|VI{0,3}|IX)\s+(?:przetarg\s+)?ustny\b/i;
const ADDR_TAIL_RE = /\s*[\(\[].*$/;

function isYearlySummaryText(text) {
  return (
    /Wykaz\s+nieruchomo[śs]ci\s+sprzedanych/i.test(text) ||
    /Informacja\s+w\s+sprawie\s+zbywania[\s\S]{0,200}?w\s+drodze\s+przetargu\s+za\s+rok/i.test(text)
  );
}

// Reject candidates that the regex would otherwise pull from the buyer-
// designation column ("osoba fizyczna" → "os. fiz. <next number>", "osoba
// prawna" → "os. prawn. <num>"). These appear in 2018+ tables where the
// buyer column happens to neighbour a parcel/lot number — without a guard,
// pickAddress greedily reads them as if they were `os. <street> <bldg>`.
const BUYER_DESIGNATION_RE = /^(?:fiz|fizyczn\w*|prawn\w*)\b/i;

function pickAddress(blob) {
  // Iterate prefixed candidates and skip any whose street part looks like a
  // buyer designation.
  for (const m of blob.matchAll(/\b(?:ul|al|pl|os)\.\s*([A-ZŻŹĆĄŚĘÓŁŃa-ząćęłńóśźż][\wąćęłńóśźż.\- ]+?\s+\d+[A-Za-z]?(?:\s*\/\s*[\dIVX]+[A-Za-z]?)?)\b/gi)) {
    const cand = m[1].replace(ADDR_TAIL_RE, '').trim();
    if (!BUYER_DESIGNATION_RE.test(cand)) return cand;
  }
  const bare = /(?<!\w)([A-ZŻŹĆĄŚĘÓŁŃ][\wąćęłńóśźż.\-]+(?:\s+[A-ZŻŹĆĄŚĘÓŁŃ][\wąćęłńóśźż.\-]+)?\s+\d+[A-Za-z]?(?:\s*\/\s*[\dIVX]+[A-Za-z]?)?)\b/.exec(blob);
  if (!bare) return null;
  const cand = bare[1].replace(ADDR_TAIL_RE, '').trim();
  return BUYER_DESIGNATION_RE.test(cand) ? null : cand;
}

function parseYearlySummaryRow(lines, lo, _anchorI, hi, prices, sourceUrl) {
  const blob = lines.slice(lo, hi + 1).join(' ').replace(/\s+/g, ' ').trim();

  if (/\b(?:grunt|nieruchomo[śs][ćc]\s+gruntow)/i.test(blob) && !/lokal/i.test(blob)) {
    return null;
  }

  const dm = DATE_RE.exec(blob);
  if (!dm) return null;
  const auction_date = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;

  const addrRaw = pickAddress(blob);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;

  const starting_price_pln = parsePLN(prices[0]);
  const final_price_pln = parsePLN(prices[1]);
  if (starting_price_pln == null) return null;

  let kind = 'unknown';
  if (/lokal\w*\s+mieszkaln/i.test(blob)) kind = 'mieszkalny';
  else if (/lokal\w*\s+(?:niemieszkaln|u[żz]ytkow)/i.test(blob)) kind = 'uzytkowy';
  else if (/gara[żz]/i.test(blob)) kind = 'garaz';
  // 2012-13 PDFs split the "rodzaj nieruchomości" cell across two physical
  // lines; the word "lokal" sometimes falls outside the row's midpoint window.
  // An apartment-bearing address ("Wojewódzka 20/6") is almost always
  // residential — defensible fallback when explicit kind detection misses.
  if (kind === 'unknown' && address.apt && /^\d+[a-z]?$/i.test(address.apt)) {
    kind = 'mieszkalny';
  }

  const arM = /(\d{1,5}(?:[,.]\d{1,3})?)\s*m2\b/i.exec(blob);
  const areaNum = arM ? Number(arM[1].replace(',', '.')) : null;

  let round = null;
  const rm = ROUND_RE.exec(blob);
  if (rm) round = ROMAN_TO_INT[rm[1].toUpperCase()] ?? null;

  const notes = [];
  if (address.warning) notes.push(address.warning);

  return {
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw: addrRaw,
    address,
    round,
    starting_price_pln,
    final_price_pln,
    outcome: 'sold',
    unsold_reason: null,
    area_m2: Number.isFinite(areaNum) ? areaNum : null,
    notes,
  };
}

export function parseYearlySummaryPdf(text, _fallbackDate, sourceUrl) {
  const lines = String(text).split('\n');
  const anchors = [];
  for (let i = 0; i < lines.length; i++) {
    PLN_ALL_RE.lastIndex = 0;
    const ps = [];
    let m;
    while ((m = PLN_ALL_RE.exec(lines[i])) !== null) ps.push(m[1]);
    if (ps.length >= 2) anchors.push({ i, prices: ps });
  }
  if (!anchors.length) return [];

  const out = [];
  for (let k = 0; k < anchors.length; k++) {
    const cur = anchors[k];
    const lo = k === 0
      ? Math.max(0, cur.i - 3)
      : Math.floor((anchors[k - 1].i + cur.i) / 2) + 1;
    const hi = k === anchors.length - 1
      ? Math.min(lines.length - 1, cur.i + 3)
      : Math.floor((cur.i + anchors[k + 1].i) / 2);
    const row = parseYearlySummaryRow(lines, lo, cur.i, hi, cur.prices, sourceUrl);
    if (row) out.push(row);
  }
  return out;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (isYearlySummaryText(text)) {
    return parseYearlySummaryPdf(text, fallbackDate, sourceUrl);
  }
  return parseResultPdf(text, fallbackDate, sourceUrl);
}
