// Katowice city-BIP parsers:
//   parseAnnouncement(html, …)        — sale-auction announcement HTML body -> active listing
//   parseAnnouncements(html, …)       — same, but emits ONE listing per unit (multi-unit aware)
//   parseLandAnnouncement(html, …)    — same source, nieruchomość gruntowa → land record
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
    html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}
function parsePLN(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/,\d{2}$/, '').replace(/[^\d]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function isoDate(dd, mm, yyyy) { return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`; }
function kindFromText(t) {
  if (/lokal\w*\s+mieszkaln/i.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+(?:niemieszkaln|u[żz]ytkow)/i.test(t)) return 'uzytkowy';
  if (/gara[żz]/i.test(t)) return 'garaz';
  if (/(?<!nie)zabudowan|budyn\w*\s+mieszkaln|domem\s+mieszkaln/i.test(t)) return 'zabudowana';
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
  const m = /przy\s+(?:ul|al|pl|os)\.?\s*([A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)/i.exec(title);
  return m ? m[1].trim() : null;
}
function pickFlatArea(text) {
  const labM = /o\s+pow(?:\.|ierzchni)\s*u[żz]ytkowej\s*(\d+(?:[,.]\d+)?)\s*m\s*[²2]/i.exec(text);
  let areaNum = labM ? Number(labM[1].replace(',', '.')) : null;
  if (areaNum == null) {
    const RE = /o\s+pow(?:\.|ierzchni)\s*(\d+(?:[,.]\d+)?)\s*m\s*[²2]/gi;
    let am; let fallback = null;
    while ((am = RE.exec(text)) !== null) {
      const before = text.slice(Math.max(0, am.index - 80), am.index).toLowerCase();
      const lastParcel = Math.max(...['działk', 'dzialk', 'grunt', 'teren', 'obręb', 'obreb', 'oznaczon'].map((w) => before.lastIndexOf(w)));
      const lastLokal = before.lastIndexOf('lokal');
      const v = Number(am[1].replace(',', '.'));
      if (lastLokal > lastParcel) { areaNum = v; break; }
      if (lastParcel > lastLokal) continue;
      if (fallback == null) fallback = v;
    }
    if (areaNum == null) areaNum = fallback;
  }
  return areaNum;
}
function sharedDates(fullText) {
  const adM = /Przetarg\w*\s+odb[ęe]d[ąa]?\s*si[ęe][^.]{0,40}?\bw\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(fullText);
  const auction_date = adM ? isoDate(adM[1], adM[2], adM[3]) : null;
  const wadM = /[Ww]adium[^.]{0,90}?do\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(fullText);
  const wadium_deadline = wadM ? isoDate(wadM[1], wadM[2], wadM[3]) : null;
  const viewM = /Ogl[ąa]danie[\s\S]{0,160}?\bdo\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(fullText);
  const viewing_date = viewM ? isoDate(viewM[1], viewM[2], viewM[3]) : null;
  return { auction_date, wadium_deadline, viewing_date };
}
function buildListing({ addrRaw, address, kind, span, shared, docUrl, round }) {
  const areaNum = pickFlatArea(span);
  const isWholeProperty = !/lokal/i.test(span) || (areaNum != null && areaNum > 300);
  const priceM = /Cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d ]+(?:,\d{2})?)\s*z[łl]/i.exec(span);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;
  return {
    kind, round, address_raw: addrRaw, address,
    auction_date: shared.auction_date,
    area_m2: !isWholeProperty && Number.isFinite(areaNum) ? areaNum : null,
    ...(isWholeProperty && Number.isFinite(areaNum) ? { land_area_m2: areaNum } : {}),
    starting_price_pln, detail_url: docUrl,
    wadium_deadline: shared.wadium_deadline, viewing_date: shared.viewing_date,
  };
}
export function parseAnnouncements(html, title, docUrl) {
  const text = stripTags(html);
  const shared = sharedDates(text);
  const round = roundFromTitle(title);
  const blocks = [...text.matchAll(/(\d+)\.\s*lokal\w*\b[\s\S]*?(?=\s\d+\.\s*lokal\w*\b|$)/gi)].map((m) => m[0]);
  const titleAddrs = [
    ...title.matchAll(/(?:ul|al|pl|os)\.?\s*([A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*[\dIVXLA-Za-z]+)?)(?=\s*(?:,|\bi\b|\)|$))/gi),
  ].map((m) => m[1].trim());
  const isMultiUnit = blocks.length >= 2 || titleAddrs.length >= 2;
  if (!isMultiUnit) {
    const single = parseAnnouncement(html, title, docUrl);
    return single ? [single] : [];
  }
  const out = [];
  if (blocks.length >= 2) {
    blocks.forEach((span, i) => {
      const blkKind = kindFromText(span);
      const kind = blkKind !== 'unknown' ? blkKind : (kindFromText(title) || 'unknown');
      const addrRaw = titleAddrs[i] || addressFromBlock(span);
      const address = addrRaw ? parseAddress(addrRaw) : null;
      if (!address) return;
      out.push(buildListing({ addrRaw, address, kind, span, shared, docUrl, round }));
    });
    return out;
  }
  const kind = kindFromText(title) !== 'unknown' ? kindFromText(title) : kindFromText(text);
  for (const addrRaw of titleAddrs) {
    const address = parseAddress(addrRaw);
    if (!address) continue;
    out.push(buildListing({ addrRaw, address, kind, span: text, shared, docUrl, round }));
  }
  return out;
}
function addressFromBlock(blk) {
  const stM = /przy\s+(?:ul|al|pl|os)\.?\s*([A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?)(?=\s+(?:wraz|w\s|,|\.|$))/i.exec(blk);
  if (!stM) return null;
  let s = stM[1].trim();
  const aptM = /lokal\w*(?:\s+(?:mieszkaln\w*|niemieszkaln\w*|u[żz]ytkow\w*))?\s+nr\s+(\d+[A-Za-z]?|[IVXL]+)\b/i.exec(blk);
  if (aptM) s += '/' + aptM[1];
  return s;
}
export function parseAnnouncement(html, title, docUrl) {
  const text = stripTags(html);
  const addrRaw = addressFromTitle(title);
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) return null;
  const titleKind = kindFromText(title);
  const kind = titleKind !== 'unknown' ? titleKind : kindFromText(text);
  const areaNum = pickFlatArea(text);
  const isWholeProperty = (!/lokal/i.test(title) && !/lokal/i.test(text)) || (areaNum != null && areaNum > 300);
  const priceM = /Cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d ]+(?:,\d{2})?)\s*z[łl]/i.exec(text);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;
  const { auction_date, wadium_deadline, viewing_date } = sharedDates(text);
  return {
    kind, round: roundFromTitle(title), address_raw: addrRaw, address, auction_date,
    area_m2: !isWholeProperty && Number.isFinite(areaNum) ? areaNum : null,
    ...(isWholeProperty && Number.isFinite(areaNum) ? { land_area_m2: areaNum } : {}),
    starting_price_pln, detail_url: docUrl, wadium_deadline, viewing_date,
  };
}
/**
 * Parse a land-sale announcement (nieruchomość gruntowa) into a parcel-shaped
 * land record. Returns null when neither a parcel number nor a street can be
 * found (unkeyable). Keyed by parcel, not address — mirrors parseLandNode in
 * the Bielsko adapter.
 *
 * Live pattern (bip.katowice.eu idr=152394):
 *   title: "Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
 *           … przy ul. Solskiego (dz. 1241/36)"
 *   body:  "działka nr 1241/36 … obręb Górne Lasy Pszczyńskie … o pow. 1772 m2 …
 *           Cena wywoławcza … 880 000 zł … Przetarg odbędzie się w dniu 15.09.2026"
 *
 * @param {string} html    announcement HTML body
 * @param {string} title   board link-text (used for street + round fallback)
 * @param {string} docUrl  canonical URL for this announcement document
 * @returns {object|null}  parcel-shaped record or null
 */
export function parseLandAnnouncement(html, title, docUrl) {
  const text = stripTags(html);

  // -- parcel number: "działka nr 1241/36", "działki nr 811/69 i 813/69",
  //    "dz. nr 1241/36", "dz. 1241/36" (board title uses no space after dz.)
  const dzM =
    /dzia[łl]ki?\s+nr\s+([\d/]+)/i.exec(text) ||
    /dz\.\s*nr\s+([\d/]+)/i.exec(text) ||
    /dz\.\s*([\d/]+)/i.exec(title);
  const dzialka_nr = dzM ? dzM[1].trim() : null;

  // -- obreb: "obręb Górne Lasy Pszczyńskie", "obrębie Śródmieście"
  const obrebM = /obr[ęe]bi?\w*\s+([^,;(]{2,50}?)(?=[,;(]|\s+stanowi|\s+wpisano|\s+nr\s+KW|$)/i.exec(text);
  const obreb = obrebM ? obrebM[1].replace(/\s+/g, ' ').trim() : null;

  // -- plot area: "o pow. 1772 m2", "o powierzchni 1772 m²"
  const areaM = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:\.|ierzchni)\s*(\d[\d\s]*(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(text);
  const area_m2 = areaM ? Number(areaM[1].replace(/\s/g, '').replace(',', '.')) : null;

  // -- street from title: "przy ul. Solskiego", "przy ul. Magazynowej"
  //    We only extract the street name (no building) — land parcels rarely have one.
  const streetM =
    /przy\s+(?:ul|al|pl|os)\.?\s*([A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?:\s*[\(\[,]|\s+(?:dz\.|działk|obr|stanowi|$))/i.exec(title);
  const street = streetM ? streetM[1].replace(/\s+/g, ' ').trim() : null;

  // unkeyable: no parcel AND no street → skip
  if (!dzialka_nr && !street) return null;

  const priceM = /Cena\s+wywo[łl]awcza[^0-9]{0,60}?([\d ]+(?:,\d{2})?)\s*z[łl]/i.exec(text);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  const adM = /Przetarg\s+odb[ęe]dzie\s+si[ęe][^.]{0,40}?w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  const auction_date = adM ? isoDate(adM[1], adM[2], adM[3]) : null;

  return {
    kind: 'grunt',
    dzialka_nr,
    obreb: obreb || null,
    zoning: null,
    address_raw: street || null,
    street: street || null,
    building: null,
    address: null,
    area_m2: Number.isFinite(area_m2) && area_m2 > 0 ? area_m2 : null,
    starting_price_pln,
    auction_date,
    round: roundFromTitle(title),
    detail_url: docUrl,
    source_url: docUrl,
  };
}

// ----------------------------------------------------------- result PDF table

const ANCHOR = /^\s*(\d{1,3})\s+(\d{2})\.(\d{2})\.(\d{4})\b/;

// Negative result: the row's last column reads "Przetarg zakończony wynikiem
// negatywnym" (achieved-price column is "------"). Some wykazy mix positive
// and negative rows, so this is detected PER ROW, not per document.
const NEGATIVE_ROW_RE = /wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywc/i;


// The result table prints the starting price WITHOUT its own "zł" when the
// achieved-price cell follows on the same line ("180 000      221 400 zł");
// the blob's whitespace collapse then glues them into one spaced-thousands
// token ("180 000 221 400") that parses as 180 BILLION. When an amount is
// implausibly large, try splitting its 3-digit groups into TWO plausible
// amounts (start + achieved); a unique valid split wins, otherwise the
// original is kept so genuinely odd rows stay visible rather than guessed at.
const MAX_PLAUSIBLE_PLN = 50_000_000;
function splitGluedAmounts(numStr) {
  const whole = parsePLN(numStr);
  if (whole == null || whole <= MAX_PLAUSIBLE_PLN) return [whole];
  const groups = numStr.replace(/,\d{2}$/, '').trim().split(/[. ]/);
  if (groups.length < 2) return [whole];
  const splits = [];
  for (let i = 1; i < groups.length; i++) {
    const left = Number(groups.slice(0, i).join(''));
    // The right part must look like a number's own start: no "000…" group.
    if (/^0/.test(groups[i])) continue;
    const right = Number(groups.slice(i).join(''));
    if (
      Number.isFinite(left) && Number.isFinite(right) &&
      left >= 1000 && right >= 1000 &&
      left <= MAX_PLAUSIBLE_PLN && right <= MAX_PLAUSIBLE_PLN
    ) {
      splits.push([left, right]);
    }
  }
  return splits.length === 1 ? splits[0] : [whole];
}

function parseResultRow(blob, anchorDate, sourceUrl) {
  const notes = [];
  const negative = NEGATIVE_ROW_RE.test(blob);

  // LAND rows ("nieruchomość gruntowa", bare "grunt", parcel-only "dz. nr …"
  // designations) don't fit the street|building|apt model — their cell has no
  // building number, so the address scan used to swallow neighbouring columns
  // into the street ("Grodowa nieruchomość gruntowa Urząd Miasta Katowice
  // ustny …" with the Lp. as the building). Skip them entirely; see the TODO
  // entry about surfacing land sales for the principled future fix.
  if (
    !/lokal/i.test(blob) &&
    /nieruchomo[śs][ćc]\s+gruntow|(?:^|\s)gruntu?(?:\s|$)|dz\.\s*nr/i.test(blob)
  ) {
    return null;
  }

  let kind = 'unknown';
  if (/lokal\w*\s+mieszkaln/i.test(blob)) kind = 'mieszkalny';
  else if (/lokal\w*\s+niemieszkaln/i.test(blob)) kind = 'uzytkowy';
  else if (/gara[żz]/i.test(blob)) kind = 'garaz';
  else if (/(?<!nie)zabudowan|budyn\w*\s+mieszkaln/i.test(blob)) kind = 'zabudowana';

  const addrCands = [
    ...blob.matchAll(
      /\b(?:ul|al|pl)\.\s*([A-ZŻŹĆĄŚĘÓŁŃ][^,;]*?\s+\d+[A-Za-z]?(?:\s*\/\s*[\dIVXLA-Za-z]+)?)/g,
    ),
  ]
    .map((m) => m[1].trim().replace(/\s+/g, ' '))
    .filter((a) => !/^M[lł]y[nń]sk/i.test(a))
    // Column-bleed sanity: a street that absorbed neighbouring table cells
    // ("… Urząd Miasta … ustny …") is junk, not an address.
    .filter((a) => !/\b(urz[ąa]d|miasta|ustny|nieograniczon|przetarg|zako[ńn]czon|gruntow)\b/i.test(a));
  const addrRaw = addrCands[0] || '';
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) notes.push('parse: address unresolved: ' + (addrRaw || '(none)'));

  // Kind fallback from the address shape when the row's label fell outside
  // the blob window: an apartment number means a lokal, and Katowice's own
  // convention is Roman numerals for commercial units ("Mariackiej 26/V") vs
  // digits for flats ("Ligocka 5a/16"). No apt (building/whole property) stays
  // 'unknown' honestly.
  if (kind === 'unknown' && address?.apt) {
    kind = /^[IVXL]+$/i.test(address.apt) ? 'uzytkowy' : 'mieszkalny';
  }

  // Area: the labelled "o pow. użytkowej X m2" form, OR the result-table's
  // terser "lokal mieszkalny o pow. 26,26 m2" (no "użytkowej"). The fallback
  // anchors on "lokal" so the parcel's "o łącznej pow. 68 194 m2" can't match.
  const arM = /o\s+pow\.\s*u[żz]ytkowej\s*(\d+(?:[,.]\d+)?)\s*m/i.exec(blob)
    || /lokal\w*[^.]{0,40}?o\s+pow\.\s*(\d+(?:[,.]\d+)?)\s*m/i.exec(blob);
  // No lokal in the row → the area belongs to the whole property (plot /
  // building), not a unit. See parseAnnouncement's land_area_m2 note.
  const rowIsWholeProperty = !/lokal/i.test(blob);
  const areaNum = arM ? Number(arM[1].replace(',', '.')) : null;

  // Same amount shape as PLN_ALL_RE below: spaced or dotted thousands and
  // optional grosze — "850 000 zł", "150 000,00 zł", "150.000,00 zł". The
  // lookbehind also excludes ',' so the ",00 zł" tail can't match alone.
  const prices = [...blob.matchAll(/(?<![\d.,])(\d{1,3}(?:[. ]\d{3})*(?:,\d{2})?)\s*z[łl]/gi)]
    .flatMap((m) => splitGluedAmounts(m[1]))
    .filter((n) => n != null);
  const starting_price_pln = prices[0] ?? null;
  // In a negative row the achieved-price column is "------" — any second
  // amount the window catches belongs to a neighbouring row, so force null.
  const final_price_pln = negative ? null : prices[1] ?? null;
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
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2: !rowIsWholeProperty && Number.isFinite(areaNum) ? areaNum : null,
    ...(rowIsWholeProperty && Number.isFinite(areaNum) ? { land_area_m2: areaNum } : {}),
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
    const row = parseResultRow(blob, anchors[k].date || fallbackDate, sourceUrl);
    if (row) out.push(row); // null = land/parcel row, skipped by design
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

const BUYER_DESIGNATION_RE = /^(?:fiz|fizyczn\w*|prawn\w*)\b/i;

// Column-bleed sanity for the yearly-summary table — same junk vocabulary as
// parseResultRow's filter above. The linearised table interleaves cells, so a
// lazy street capture can swallow the neighbouring "II ustny przetarg" /
// "Urząd Miasta" columns ("Oddziałów Młodzieży II ustny 86" with a price or
// area as the building). Such a candidate is junk, not an address.
const COLUMN_BLEED_RE =
  /\b(urz[ąa]d|miasta|ustny|nieograniczon\w*|przetarg\w*|zako[ńn]czon\w*|gruntow\w*|lokal\w*|sprzedan\w*)\b/i;
const badAddrCand = (cand) =>
  BUYER_DESIGNATION_RE.test(cand) || COLUMN_BLEED_RE.test(cand);

function pickAddress(blob) {
  for (const m of blob.matchAll(/\b(?:ul|al|pl|os)\.\s*([A-ZŻŹĆĄŚĘÓŁŃa-ząćęłńóśźż][\wąćęłńóśźż.\- ]+?\s+\d+[A-Za-z]?(?:\s*\/\s*[\dIVX]+[A-Za-z]?)?)\b/gi)) {
    const cand = m[1].replace(ADDR_TAIL_RE, '').trim();
    if (!badAddrCand(cand)) return cand;
  }
  const bare = /(?<!\w)([A-ZŻŹĆĄŚĘÓŁŃ][\wąćęłńóśźż.\-]+(?:\s+[A-ZŻŹĆĄŚĘÓŁŃ][\wąćęłńóśźż.\-]+)?\s+\d+[A-Za-z]?(?:\s*\/\s*[\dIVX]+[A-Za-z]?)?)\b/.exec(blob);
  if (!bare) return null;
  const cand = bare[1].replace(ADDR_TAIL_RE, '').trim();
  return badAddrCand(cand) ? null : cand;
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
  else if (/(?<!nie)zabudowan|budyn\w*\s+mieszkaln/i.test(blob)) kind = 'zabudowana';
  if (kind === 'unknown' && address.apt && /^\d+[a-z]?$/i.test(address.apt)) {
    kind = 'mieszkalny';
  }

  // Area: "<num> m2" when the unit is printed; some yearly tables print the
  // area column BARE ("Mariacka 1/10   34,47   lokal mieszkalny"). The bare
  // fallback requires a non-zero leading digit + exactly 2 decimals, which a
  // spaced-thousands price fragment ("2 500 000,00") can never satisfy, and
  // the value is range-checked below as belt-and-braces.
  const arM = /(\d{1,5}(?:[,.]\d{1,3})?)\s*m2\b/i.exec(blob)
    || /(?<![\d,.])([1-9]\d{0,3},\d{2})(?=\s)/.exec(blob);
  // "nieruchomość zabudowana" rows (no lokal) carry the PLOT/building total —
  // route to land_area_m2 (see parseAnnouncement's note).
  const yearlyWholeProperty = !/lokal/i.test(blob);
  let areaNum = arM ? Number(arM[1].replace(',', '.')) : null;
  if (areaNum != null && (areaNum < 8 || areaNum > 5000)) areaNum = null;

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
    area_m2: !yearlyWholeProperty && Number.isFinite(areaNum) ? areaNum : null,
    ...(yearlyWholeProperty && Number.isFinite(areaNum) ? { land_area_m2: areaNum } : {}),
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
