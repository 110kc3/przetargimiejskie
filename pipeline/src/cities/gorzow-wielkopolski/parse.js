// Gorzów Wielkopolski parsers — announcement batch PDFs + result-notice PDFs.
//
// Both streams are PDFs attached to BIP stub pages (bip.um.gorzow.pl).
// Groundtruthed 2026-07-06 against live documents:
//
//   Announcement (born-digital, 12 flats):
//     https://bip.um.gorzow.pl/system/obj/59130_Ogloszenie_nr_61-2025.pdf
//   Result — flats, achieved prices inline (born-digital):
//     https://bip.um.gorzow.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu.pdf&id=a7a56a4144b2940d40da90ac2b872c22&stats=true
//   Result — land, wynik negatywny (born-digital):
//     https://bip.um.gorzow.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargow_9-2026_z_16.04.2026.pdf&id=2cf2aa3fcd59798adbf4d77a4ec84cdc&stats=true
//
// Layout reality (why the strategies below):
//
//   * ANNOUNCEMENTS render as a 12-row table whose columns pdftotext interleaves
//     vertically: the address, the description (area), and the price+wadium pair
//     each appear ONCE PER ROW and IN ROW ORDER, but not on predictable lines.
//     So parseAnnouncement collects each field sequence independently and zips
//     them by index, validating counts + the cena/wadium ratio before trusting
//     the price column. Verified for both poppler (CI) and xpdf output.
//
//   * RESULT notices are one-row-per-lot tables where every row has an "N."
//     anchor line carrying the prices, with the address 1-2 lines above it.
//     parseResultDoc splits the text into (prevAnchor, anchor] blocks and reads
//     each block positionally: first big price = cena wywoławcza, second =
//     cena osiągnięta.
//
//   * Some EZD-printed PDFs embed a diacritic font WITHOUT a ToUnicode map:
//     whole words containing ą/ę/ł/ś/ż/ź/ć/ń are silently dropped by every
//     extractor (poppler, xpdf, pypdf — verified). Keywords used here are
//     chosen ASCII-safe ("przeprowadzon", "lokal mieszkaln", "wynikiem
//     negatywnym") and month matching is prefix-based + diacritic-tolerant.
//     Rows whose street name is dropped entirely (e.g. "     19/7") cannot be
//     address-keyed and are skipped.
//
// See spike: spikes/lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Small shared helpers ─────────────────────────────────────────────────────

/** Diacritic-fold + lowercase (xpdf drops some diacritics, poppler keeps them). */
function fold(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[ąà]/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

/**
 * Polish month token → 'MM', tolerant of missing diacritics
 * ("października" / xpdf "padziernika" both → '10').
 * @param {string} token
 * @returns {string|null}
 */
export function monthNum(token) {
  const t = fold(token);
  if (/^sty/.test(t)) return '01';
  if (/^lut/.test(t)) return '02';
  if (/^mar/.test(t)) return '03';
  if (/^kwi/.test(t)) return '04';
  if (/^maj/.test(t)) return '05';
  if (/^cze/.test(t)) return '06';
  if (/^lip/.test(t)) return '07';
  if (/^sie/.test(t)) return '08';
  if (/^wrz/.test(t)) return '09';
  if (/^pa[zd]/.test(t)) return '10';
  if (/^lis/.test(t)) return '11';
  if (/^gru/.test(t)) return '12';
  return null;
}

// "39.000" / "1.100.000" → integer PLN (dot-thousands, no groszy in Gorzów docs)
function plnFromDotted(s) {
  const n = Number(String(s).replace(/\./g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "19,43" → 19.43
function parseArea(s) {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Dot-thousands money ("39.000", "1.100.000"). Guards exclude:
//   * udział fractions — "5.126/124.339" (slash-adjacent),
//   * EZD ids — "351904.1032173.1205423" (digit/dot-adjacent),
//   * dates — "12.02.2026" (needs exactly 3-digit groups).
const MONEY_RE = /(?<![\d.,\/])(\d{1,3}(?:\.\d{3})+)(?![\d.\/])/g;

// "lokal mieszkalny o pow. 19,43m2" — the per-row unit area phrase.
const AREA_RE = /lokal\w*\s+mieszkaln\w*\s+o\s+pow\.?\s*(\d+(?:[.,]\d+)?)\s*m/gi;

// Street + building/apt address candidate: "Fabryczna 53/9", "Armii Polskiej 17/4",
// "ul. Grobla 22/12". Requires a capitalised street word directly before the
// slashed number, so parcel ids ("10-719/1"), KW numbers ("GW1G/00047313/2"),
// udział fractions ("5.126/124.339") and SCHE ids never match.
const ADDR_RE =
  /(?:^|[\s(>])((?:ul\.\s*)?\p{Lu}[\p{Ll}'.]+(?:\s+\p{Lu}[\p{Ll}'.]+){0,3})\s+(\d{1,3}[A-Za-z]?\/\d{1,3}[A-Za-z]?)(?![\d\/])/gmu;

// Reject pseudo-streets whose last word is a document keyword ("Ogłoszenie Nr
// 61/2025" → street candidate "Ogłoszenie Nr").
const STREET_STOPWORDS = new Set([
  'nr', 'lp', 'kw', 'dz', 'obr', 'poz', 'ust', 'pkt', 'art', 'godz', 'pok',
  'tel', 'ul', 'ogloszenie', 'ogloszeniu', 'informacja', 'wlkp', 'ezd', 'sche',
]);

/**
 * All flat-address candidates in text, in document order.
 * @param {string} text
 * @returns {Array<{raw:string, street:string, num:string}>}
 */
export function extractFlatAddresses(text) {
  const out = [];
  ADDR_RE.lastIndex = 0;
  let m;
  while ((m = ADDR_RE.exec(text || '')) !== null) {
    const street = m[1].replace(/^ul\.\s*/i, '').trim();
    const words = fold(street).split(/\s+/);
    if (words.some((w) => STREET_STOPWORDS.has(w.replace(/\W/g, '')))) continue;
    if (street.length < 3) continue;
    out.push({ raw: `ul. ${street} ${m[2]}`, street, num: m[2] });
  }
  return out;
}

// ── Round (Polish ordinal word → number) ─────────────────────────────────────

function stemToRound(word) {
  const w = fold(word);
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  if (/^pia?t/.test(w)) return 5;
  if (/^szo?st/.test(w)) return 6;
  if (/^sio?dm/.test(w)) return 7;
  if (/^o?sm/.test(w)) return 8;
  return null;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Batch auction date from an announcement body.
 * "Przetargi odbędą się 9 października 2025r." (xpdf: "Przetargi odbd si 9
 * padziernika 2025r." — hence the \S* tolerance).
 * @param {string} text
 * @returns {string|null} ISO date
 */
export function auctionDateFromText(text) {
  const m = /przetargi?\s+odb\S*\s+si\S*\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}` : null;
}

/**
 * Auction date from a result body or a result-notice TITLE.
 * Body:  "przeprowadzonych dnia 5 lutego 2026 r."
 * Title: "przeprowadzonych w dniu 5 lutego 2026r. o godz.10 …"
 * @param {string} text
 * @returns {string|null} ISO date
 */
export function resultDateFromText(text) {
  const m =
    /przeprowadzon\w*(?:\s+w)?\s+dni[au]\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}` : null;
}

// ── Announcement parser ──────────────────────────────────────────────────────

// End of the lot table / start of the boilerplate: "Lokale będące przedmiotem
// przetargu przeznaczone są…" — ASCII-safe middle words used as the cutoff.
const TABLE_END_RE = /przedmiotem\s+przetargu\s+przeznaczone/i;

// Row anchor with the round-ordinal word: "1.   drugi   I – 21.08.2025r. …"
const ANCHOR_ROUND_RE = /^\s{0,12}(\d{1,2})\.\s+(\S+)/gm;

/**
 * Parse a Gorzów batch flat-sale announcement PDF (pdftotext -layout output)
 * into one record per flat.
 *
 * Strategy: addresses, unit areas ("lokal mieszkalny o pow. X,XXm2") and
 * cena/wadium pairs each occur exactly once per row and in row order in the
 * extracted text (verified for poppler and xpdf), so they are collected as
 * independent sequences and zipped by index. Areas/prices are only attached
 * when their counts match the address count AND every cena/wadium pair has a
 * plausible ratio (wadium 2–30% of cena) — otherwise they degrade to null
 * rather than risk cross-row misattribution.
 *
 * @param {string} text
 * @param {{ pdfUrl?: string, detailUrl?: string, fallbackAuctionDate?: string|null }} [ctx]
 * @returns {Array<object>}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text || !/lokal\w*\s+mieszkaln/i.test(text)) return [];
  const t = text.replace(/\r/g, '');

  // Board date-2 ("Data i godzina przetargu") is authoritative when supplied;
  // the body phrase is the fallback (useful for direct-PDF parses).
  const auction_date = ctx.fallbackAuctionDate || auctionDateFromText(t) || null;

  // Restrict table-field scans to the lot table (before the boilerplate).
  const endM = TABLE_END_RE.exec(t);
  const table = endM ? t.slice(0, endM.index) : t;

  const addresses = extractFlatAddresses(table);
  const n = addresses.length;
  if (!n) return [];

  const areas = [...table.matchAll(AREA_RE)].map((m) => parseArea(m[1]));

  // Money sequence must be exactly n (cena, wadium) pairs to be trusted.
  const moneys = [...table.matchAll(MONEY_RE)].map((m) => plnFromDotted(m[1]));
  let prices = null;
  if (moneys.length === 2 * n) {
    const cands = [];
    let ok = true;
    for (let i = 0; i < n; i++) {
      const p = moneys[2 * i];
      const w = moneys[2 * i + 1];
      if (p == null || w == null || !(w < p && w >= p * 0.02 && w <= p * 0.3)) {
        ok = false;
        break;
      }
      cands.push(p);
    }
    if (ok) prices = cands;
  }

  // Rounds from the "N. <ordinal>" anchor lines, positioned by lp number.
  const rounds = [];
  ANCHOR_ROUND_RE.lastIndex = 0;
  let am;
  while ((am = ANCHOR_ROUND_RE.exec(table)) !== null) {
    const lp = Number(am[1]);
    const r = stemToRound(am[2]);
    if (lp >= 1 && lp <= n && r != null) rounds[lp - 1] = r;
  }

  const out = [];
  for (let i = 0; i < n; i++) {
    const address = parseAddress(addresses[i].raw);
    if (!address) continue;
    out.push({
      kind: 'mieszkalny',
      address_raw: addresses[i].raw,
      address,
      area_m2: areas.length === n ? areas[i] : null,
      starting_price_pln: prices ? prices[i] : null,
      auction_date,
      round: rounds[i] ?? null,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    });
  }
  return out;
}

// ── Result parser ────────────────────────────────────────────────────────────

/**
 * Guard: is this text a Gorzów result notice? ASCII-safe — survives both the
 * dropped-diacritics text layer and OCR output.
 * @param {string} text
 * @returns {boolean}
 */
export function isResultNotice(text) {
  return /informacja\s+o\s+wynik/i.test(text || '') && /przetarg|rokowa/i.test(text || '');
}

/** "przetarg zakończył się wynikiem negatywnym" (also with dropped diacritics). */
export function isNegative(text) {
  return /wynikiem\s+negatywnym|nie\s+odnotowano\s+wp[łl]at/i.test(text || '');
}

// Result row anchor: "1. …" at line start (lp column).
const RESULT_ANCHOR_RE = /^\s{0,12}\d{1,2}\.\s/;

/**
 * Parse a Gorzów result-notice PDF into concluded flat-auction records.
 *
 * Rows are anchored by "N." lines that carry the prices; the address sits 1-2
 * lines above its anchor. Blocks span (previous anchor, own anchor]. Only
 * blocks that contain BOTH a parseable street address with an apartment part
 * AND the phrase "lokal mieszkaln…" become records — land/commercial rows and
 * rows whose street name was dropped by the broken PDF font are skipped.
 *
 * Positional prices: first dot-thousands number in the block = cena
 * wywoławcza, second = cena osiągnięta (verified against the 05.02.2026
 * flats result: 181.000→215.000, 162.000→198.000).
 *
 * @param {string} text           pdftotext/OCR output
 * @param {string|null} fallbackDate  ISO date from the crawl ref (board title)
 * @param {string} sourceUrl      PDF URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = resultDateFromText(t) || fallbackDate || null;

  const lines = t.split('\n');
  const anchors = [];
  for (let i = 0; i < lines.length; i++) {
    if (RESULT_ANCHOR_RE.test(lines[i])) anchors.push(i);
  }

  const out = [];
  let prev = -1;
  for (const a of anchors) {
    const block = lines.slice(prev + 1, a + 1).join('\n');
    prev = a;

    // Flats only (walbrzych convention): need the phrase AND a street/apt address.
    if (!/lokal\w*\s+mieszkaln/i.test(block)) continue;
    const addrs = extractFlatAddresses(block);
    if (!addrs.length) continue; // street glyphs dropped → cannot key the row
    const address_raw = addrs[0].raw;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const notes = [];
    if (address.warning) notes.push(address.warning);

    const areaM = new RegExp(AREA_RE.source, 'i').exec(block);
    const area_m2 = areaM ? parseArea(areaM[1]) : null;

    const moneys = [...block.matchAll(MONEY_RE)].map((m) => plnFromDotted(m[1]));
    const starting_price_pln = moneys[0] ?? null;
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    const achieved = moneys[1] ?? null;

    const negative = isNegative(block);
    const sold = !negative && achieved != null;
    if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');
    if (sold && starting_price_pln != null && achieved < starting_price_pln) {
      notes.push('parse: achieved price below starting price — verify row');
    }

    const kind = classifyKind(block.slice(0, 400));
    out.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round: null, // result notices reference the announcement, not the round
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    });
  }
  return out;
}
