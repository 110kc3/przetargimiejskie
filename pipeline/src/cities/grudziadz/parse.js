// Grudziądz parsers.
//
// Two roles:
//   1. parseAnnouncement(text) — extracts one-or-more flat lots from a
//      "PREZYDENT GRUDZIĄDZA ogłasza … przetarg(i) ustny(e) …" .doc/.docx
//      announcement (converted by core/doc-text.js). A single announcement can
//      cover SEVERAL flats in one table (e.g. "Rybackiej 27C lokal nr 4 oraz
//      lokal nr 6") — one record per Lp. row.
//   2. parseResultDoc(text, fallbackDate, sourceUrl) — extracts the outcome
//      from an "INFORMACJA Z PRZEPROWADZONEGO PRZETARGU …" result notice
//      (a scanned PDF, converted by core/ocr-pdf.js).
//
// Groundtruthed against REAL fixtures fetched 2026-07-16:
//   Announcement (single lot, "złotych" spelled out):
//     https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/30928/4a-ogloszenie-o-i-przetargu.doc
//     → ul. Libelta 10A/5, area 45.20 m², price 109 000 zł, round 1,
//       auction_date 2026-05-06.
//   Announcement (two lots in one table, "złotych" spelled out):
//     https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/31408/2-ogloszenie.doc
//     → ul. Rybacka 27C/4 (35.00 m², 70 400 zł) i /6 (32.20 m², 58 300 zł),
//       round 1, auction_date 2026-06-29.
//   Announcement (single lot, abbreviated "zł" + abbreviated "pow. uż." area
//   label — a DIFFERENT format than the two above, confirming both currency
//   and area-label variants must be handled):
//     https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/31211/2-regulamin-przetargu.doc
//     → ul. Żeromskiego 3/5, area 38.46 m², price 80 000 zł, round 5,
//       auction_date 2026-06-02.
//   Result notice (scanned PDF, OCR'd — the ONLY result-of-a-concluded-auction
//   notice found across the entire ~620-row board archive; it is a NEGATIVE
//   (unsold) outcome — no achieved-price fixture exists yet on this board):
//     https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/5850/18_09_2024_11_13_52_20240918080804683.pdf
//     → ul. Libelta 10/4, round 2, outcome unsold (no bidders),
//       auction_date 2024-09-10.
//
// ⚠️ The SOLD branch of parseResultDoc (achieved-price extraction) is
// BEST-EFFORT and UNVALIDATED against a real fixture — no sold-outcome result
// notice was found in the live archive at build time (see crawl.js header for
// the board-wide search). It anchors on the standard Polish vocabulary
// ("cena … osiągnięta …", "nabywcę … ustalono") used by other cities'
// equivalent notices. VALIDATE + TUNE against the first real sold result.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ---- Shared helpers ---------------------------------------------------------

const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9, wrzesnia: 9,
  października: 10, październik: 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "109.000,00 złotych" / "80.000,00 zł" / "170000" → integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "45,20" / "38.46" → 45.2
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Ordinal immediately before "przetarg(i)" → round. Grudziądz announcements
// open with "pierwszy przetarg ustny nieograniczony" (singular, one lot) or
// "pierwsze przetargi ustne nieograniczone" (plural, several lots) — both
// forms share the same ordinal stem, so one regex covers both.
const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5 };
export function roundFromText(text) {
  if (!text) return null;
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(text);
  if (!m) return null;
  const key = m[1].toLowerCase().replace(/ą/g, 'a');
  return ORDINALS[key] ?? null;
}

// Auction date. Announcements state it twice: the opener ("… organizowany(e)
// w dniu <date>") and, more reliably (future-tense, unambiguous), the closing
// "Przetarg na sprzedaż powyższej nieruchomości odbędzie się w dniu <date> …"
// (singular lot) / "Przetargi … odbędą się w dniu <date> …" (multi-lot table —
// plural verb form). Prefer the latter; fall back to the opener.
export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]d[a-ząęćłńóśźż]*\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  if (anchor) {
    // "6 maja 2026" not found in the anchored window — fall back to a whole-text scan.
    const wide = /organizowan\w*\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
    if (wide) {
      const w2 = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(wide[1]);
      if (w2) {
        const mon2 = PL_MONTHS[w2[2].toLowerCase()];
        if (mon2) return iso(w2[3], mon2, w2[1]);
      }
    }
  }
  const opener = /organizowan\w*\s+w\s+dniu\s+([\s\S]{0,40})/i.exec(text);
  if (opener) {
    const w = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(opener[1]);
    if (w) {
      const mon = PL_MONTHS[w[2].toLowerCase()];
      if (mon) return iso(w[3], mon, w[1]);
    }
  }
  return null;
}

// One lot's usable area within its table-row block. Two label variants seen:
//   "o powierzchni użytkowej 45,20 m2"      (full label)
//   "(pow. uż. 38,46 m2)"                   (abbreviated — Żeromskiego 3/5)
// Both name the FLAT's own area (not the "łącznej"/total-with-attic figure or
// the parcel/cellar area), so either label wins outright when present.
export function areaFromText(text) {
  if (!text) return null;
  const full = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,15}?([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (full) {
    const v = parseArea(full[1]);
    if (v) return v;
  }
  const abbr = /pow\.?\s*u[żz]\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (abbr) {
    const v = parseArea(abbr[1]);
    if (v) return v;
  }
  // Fallback: largest bare m² token that isn't a parcel/cellar figure.
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  M2.lastIndex = 0;
  while ((m = M2.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null) continue;
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|obr[ęe]b/i.test(before)) continue; // parcel
    if (/piwnic|kom[óo]rk|przynale[żz]/i.test(before)) continue; // cellar
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

// One lot's starting price within its table-row block: the label "Cena
// wywoławcza" heads the column but the value cell can be several lines below
// (catdoc flattens the table), so we take the FIRST "<num> zł(otych)" token in
// the block — the wadium (deposit) amount always follows it as the SECOND
// token. Currency appears as either "zł" or the spelled-out "złotych"; `\b`
// can't anchor after "ł" (not a \w char in JS's non-unicode regex), so we use
// a negative lookahead for a following letter instead.
export function priceFromText(text) {
  if (!text) return null;
  const m = /([\d][\d\s.,]*)\s*z[łl]\.?(?:otych)?(?![a-zążźćęłńóśż])/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

// Split a multi-lot table into per-lot blocks anchored on
// "ul. <street+building>\n\nlokal mieszkalny nr <apt>" — every Grudziądz
// announcement table cell pairs the address line with the "lokal mieszkalny
// nr N" line via a blank line, one pair per Lp. row. A LAZY street capture
// bounded by `[^\n]` (never crosses the mandatory newlines before "lokal …")
// forces it to consume the WHOLE address line, not just its first character.
const LOT_RE =
  /ul\.\s*([^\n]+?)\s*\n+\s*lokal\w*\s+mieszkaln\w*\s*nr\.?\s*(\d+[a-zA-Z]?)/gi;

/**
 * Extract every flat lot from one announcement's converted .doc/.docx text.
 * @param {string} text
 * @returns {Array<{address_raw:string, address:object, area_m2:number|null, starting_price_pln:number|null, round:number|null, auction_date:string|null}>}
 */
export function parseAnnouncement(text) {
  if (!text) return [];
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);

  const starts = [];
  let m;
  LOT_RE.lastIndex = 0;
  while ((m = LOT_RE.exec(text)) !== null) {
    starts.push({ index: m.index, end: LOT_RE.lastIndex, street: m[1].trim(), apt: m[2] });
  }
  if (starts.length === 0) return [];

  const uwagiIdx = text.search(/\bUWAGI!/i);
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    const blockStart = starts[i].end;
    const blockEnd =
      i + 1 < starts.length ? starts[i + 1].index : uwagiIdx >= 0 ? uwagiIdx : text.length;
    const block = text.slice(blockStart, blockEnd);

    const address_raw = `${starts[i].street}/${starts[i].apt}`;
    const address = parseAddress(address_raw);
    if (!address) continue;

    out.push({
      address_raw,
      address,
      area_m2: areaFromText(block),
      starting_price_pln: priceFromText(block),
      round,
      auction_date,
    });
  }
  return out;
}

// ---- Result-doc parser -------------------------------------------------------

// "przy ul. Libelta 10" (opener prose) → "Libelta 10".
function streetFromResultText(text) {
  const m = /przy\s+ul\.\s*([^\n,.]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

// "lokalu mieszkalnego nr 4" → "4".
function aptFromResultText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s*nr\.?\s*(\d+[a-zA-Z]?)/i.exec(text);
  return m ? m[1] : null;
}

// "w dniu 10 września 2024r." → ISO. Distinct anchor from the announcement's
// future-tense "odbędzie się" — result notices report the PAST auction date.
function resultDateFromText(text) {
  const m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

// Negative (unsold) outcome phrasings, tolerant of OCR noise on scanned PDFs
// (see the real fixture: "który został zakończony wynikiem negatywnym,
// ponieważ Żadna osoba nie przystąpiła do przetargu."). Same taxonomy as
// glubczyce/parse.js's outcomeFromText.
function outcomeFromText(text) {
  const t = text || '';
  const noWadium = /nie\s+wp[łl]acon[oy]\s+wadium|nie\s+wp[łl]yn[ęe][łl]o\s+wadium|nie\s+wniesiono\s+wadium/i.test(t);
  const noBidder =
    /[żz]adna\s+osoba\s+nie\s+przyst[ąa]pi[łl]|nikt\s+nie\s+przyst[ąa]pi[łl]|nie\s+przyst[ąa]pi[łl]\w*\s+do\s+przetargu/i.test(t);
  const negative = /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|wynikiem\s+negatywnym/i.test(t);
  if (noWadium) return { outcome: 'unsold', unsold_reason: 'no_wadium' };
  if (noBidder || negative) return { outcome: 'unsold', unsold_reason: 'no_participants' };
  return null; // caller decides sold-vs-unknown from the achieved price
}

// BEST-EFFORT / unvalidated — see file header. Polish result vocabulary for a
// SOLD outcome typically reads "Cena … osiągnięta w przetargu wyniosła … zł"
// or "… ustalono nabywcę …". No live fixture exists yet on this board.
function achievedPriceFromText(text) {
  const m = /cena[^.\n]{0,40}?osi[ąa]gni[ęe]t\w*[^0-9]{0,30}([\d][\d\s.,]*)\s*z[łl]\.?(?:otych)?/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/**
 * Parse a Grudziądz "INFORMACJA Z PRZEPROWADZONEGO PRZETARGU …" result notice
 * (OCR'd text of a scanned PDF — see crawl.js).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  if (!/INFORMACJA/i.test(text) || !/PRZEPROWADZ\w*\s+.{0,20}?PRZETARG|PRZEPROWADZON\w*\s+PRZETARG/i.test(text)) {
    return [];
  }

  const streetRaw = streetFromResultText(text);
  const apt = aptFromResultText(text);
  if (!streetRaw || !apt) return [];

  const address_raw = `${streetRaw}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return [];

  const auction_date = resultDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const kind = classifyKind(text.slice(0, 1200));

  const negative = outcomeFromText(text);
  const final_price_pln = negative ? null : achievedPriceFromText(text);
  const outcome = negative ? 'unsold' : final_price_pln != null ? 'sold' : 'unsold';
  const unsold_reason = negative ? negative.unsold_reason : outcome === 'unsold' ? 'unknown' : null;

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (outcome === 'unsold' && unsold_reason === 'unknown') {
    notes.push('parse: could not determine unsold reason');
  }

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln: null, // not reliably extractable from the scanned table (see file header)
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2: null,
      notes,
    },
  ];
}
