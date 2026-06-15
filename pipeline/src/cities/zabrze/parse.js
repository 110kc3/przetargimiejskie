// Zabrze parsers.
//
// Two layers:
//   1. Title parsers — round + auction date from the list title
//      ("Ogłoszenie o II ustnych … przetargach … na dzień 18.06.2026 r.").
//      These are reliable (read straight from the server-rendered list).
//   2. parseAnnouncementText — extracts the per-flat (address / area /
//      starting price) rows from the announcement attachment's extracted text.
//
// ⚠️ parseAnnouncementText is BEST-EFFORT, written without a real sample
// attachment (the file was unreachable during the spike — see config.js). It
// uses the standard Polish ogłoszenie vocabulary (the same boilerplate the
// Gliwice parser anchors on: "przy ul. <street> <bldg>/<apt>", "o powierzchni
// … m²", "cena wywoławcza … zł"), tolerant of both a `pdftotext -layout` table
// (linearised rows) and prose. VALIDATE + TUNE against the first real CI run.

import { parseAddress } from '../../core/normalize.js';

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

/** "Ogłoszenie o II ustnych … na dzień 18.06.2026 r." → 2 */
export function roundFromTitle(title) {
  const t = title || '';
  // Word ordinals first (some titles spell them out).
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrugi|\bdrugich|\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  // Roman numeral immediately before "ustn…" ("o II ustnych …").
  const m = /\bo\s+(VI{0,3}|IV|I{1,3}|V)\s+ustn/i.exec(t);
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  if (/\bustn\w+\s+(?:nieograniczon\w+\s+)?przetarg/i.test(t)) return 1;
  return null;
}

/** "… na dzień 18.06.2026 r." → "2026-06-18" (ISO). */
export function auctionDateFromTitle(title) {
  const m = /na\s+dzie[ńn]\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(title || '');
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Auction date from the announcement body — many titles omit it, but the body
 * always says "Przetargi odbędą się w dniu DD.MM.YYYY roku". Anchored on the
 * FUTURE-tense "odbęd…" (vs. the past-round "odbyły się w dniu …") so we get
 * THIS auction's date, not a prior round's. → ISO, or null.
 */
export function auctionDateFromText(text) {
  const m = /odb[ęe]d[ąa]?\w*\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// "253.620,00" / "97 000 zł" / "46500,00" → integer PLN.
function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = numStr.replace(/\s/g, '').replace(/[:;]/g, '.');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

// "52,40" / "52.40" → 52.4
function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function classifyKind(s) {
  const t = (s || '').toLowerCase();
  if (/niemieszkaln/.test(t)) return 'uzytkowy';
  if (/mieszkaln/.test(t)) return 'mieszkalny';
  // Tight: bare /użytkow/ false-positived on boilerplate ("prawa użytkowania
  // wieczystego", "pow. użytkowa") — require the actual "lokal użytkowy" label.
  if (/lokal\w*\s+u[żz]ytkow/.test(t)) return 'uzytkowy';
  return 'mieszkalny'; // this board is the "Lokale mieszkalne" category
}

// The real Zabrze announcement (a text PDF) is a numbered table — one block per
// flat — e.g.:
//
//   1. adres: ul. Ks. Bolesława Domańskiego 4/6
//   działka: nr 4129/50 pow.: 1.377 m2 księga wieczysta nr GL1Z/00019567/1
//   opis lokalu: położenie: I piętro pow.: 26,74 m2 pomieszczenia: …
//   Cena wywoławcza: 37.000,00 zł
//   Wysokość wadium: 1.900,00 zł
//
// So we split on the per-flat "adres:" label (which appears only in the flat
// blocks, never in the boilerplate — this also avoids the office addresses
// "ul. Powstańców Śląskich 5-7" etc. that a generic address scan would wrongly
// pick up). The block has TWO `pow.:` values: the *plot* (działka) first and the
// *flat* (opis lokalu) second — we take the flat one.

// The address token within the "adres:" line. The capture group excludes the
// ul./al./pl. prefix; the full match (am[0]) keeps it for parseAddress.
// Includes both apostrophes ('/’) — "ul. Gen. de Gaulle’a 89/3" used to be
// dropped (0-flat warn) because the typographic apostrophe broke the class.
const ADDR_IN_LINE =
  /(?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?/;
// In the real pdftotext -layout output the "w tym: …%" cell lands BETWEEN
// "Cena" and "wywoławcza:", so we anchor on the second word "wywoławcza" — the
// starting price ("37.000,00 zł") follows it directly.
// Bare "<num> m2" / "<num> m²" token (NOT requiring a "pow." prefix). The
// `pdftotext -layout` output wraps the table so the flat's area often sits on a
// different line from its "pow.:" label — e.g. "lokalu: II piętro  52,00 m2".
// Spacing between "m" and the "2" is inconsistent ("m2", "m  2", "m     2"), so
// we allow any amount.
const M2_RE = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;

// Flat area for one block. Several "<num> m²" appear — the PLOT (działka), the
// FLAT (opis lokalu / położenie), and a cellar (piwnica / pomieszczenie
// przynależne). We collect m² tokens in the flat's own section (before
// "Cena"/"Wysokość wadium") and drop:
//   - the PLOT — value inside the "działka … opis/położenie" span, or directly
//     preceded by "działka";
//   - the CELLAR — value preceded (within ~35 chars) by piwnica / przynależne /
//     komórka / garaż.
// Then take the LARGEST of what's left (the flat). Validated against both
// Zabrze layouts (the "Domańskiego" sample and the wrapped "Andersa"/
// "Kosmowskiej" doc 96404, incl. the "49,11 m  2" wide-spacing case).
function flatAreaFromBlock(block) {
  const cut = block.search(/Wysoko[śs][ćc]\s+wadium|Cena\b/i);
  const region = cut > 0 ? block.slice(0, cut) : block;
  const dz = region.search(/dzia[łl]k/i);
  const opis = region.search(/opis\s+lokalu|po[łl]o[żz]enie/i);
  const cands = [];
  M2_RE.lastIndex = 0;
  let m;
  while ((m = M2_RE.exec(region)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const idx = m.index;
    const inPlotSpan = dz >= 0 && opis > dz && idx > dz && idx < opis;
    const isPlot = inPlotSpan || /dzia[łl]k/i.test(region.slice(Math.max(0, idx - 35), idx));
    // Cellar: the actual cellar VALUE is labelled "piwnica o pow. X" / "komórka
    // … X" right before the number. Use a TIGHT window so the wrapped column
    // header "pomieszczenia przynależne" (which lands before the FLAT's area in
    // some layouts) doesn't get mistaken for a cellar.
    const isCellar = /piwnic|kom[óo]rk|gara[żz]/i.test(region.slice(Math.max(0, idx - 18), idx));
    if (isPlot || isCellar) continue;
    cands.push(v);
  }
  if (cands.length) return Math.max(...cands);
  // Fallback: pdftotext sometimes wraps the superscript of "m²" onto a
  // DIFFERENT line than the number ("lokalu: parter   2" / "34,90 m łazienka…"
  // — the Harcerska 2/2 layout), so the strict M2_RE never sees "m2". Re-scan
  // for a bare "<num> m" token (NOT followed by another letter, so "mapy"/"mieszkalny"
  // don't match), same plot/cellar exclusions, only when the strict pass found
  // nothing — the strict token is always preferred when present.
  const BARE_M_RE = /([\d][\d.,]*)\s*m(?![a-ząćęłńóśźż0-9²])/gi;
  BARE_M_RE.lastIndex = 0;
  while ((m = BARE_M_RE.exec(region)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const idx = m.index;
    const inPlotSpan = dz >= 0 && opis > dz && idx > dz && idx < opis;
    const isPlot = inPlotSpan || /dzia[łl]k/i.test(region.slice(Math.max(0, idx - 35), idx));
    const isCellar = /piwnic|kom[óo]rk|gara[żz]/i.test(region.slice(Math.max(0, idx - 18), idx));
    if (isPlot || isCellar) continue;
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

// Starting price for one block. The label "Cena wywoławcza" is followed —
// possibly after an interleaved "w tym: …%" cell — by the amount "… zł". We
// scan from "wywoławcza" up to "Wysokość wadium" and take the first "<num> zł"
// (the percentages use "%", not "zł", so they're skipped).
function priceFromBlock(block) {
  const start = block.search(/wywo[łl]awcza/i);
  if (start < 0) return null;
  const end = block.search(/Wysoko[śs][ćc]\s+wadium/i);
  const region = block.slice(start, end > start ? end : start + 500);
  const m = /([\d][\d .,]*)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

/**
 * Extract per-flat rows from one announcement's attachment text.
 * @param {string} text  extracted attachment text (pdftotext)
 * @returns {Array<{address_raw:string, address:object|null, kind:string, area_m2:number|null, starting_price_pln:number|null}>}
 */
export function parseAnnouncementText(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const starts = [...t.matchAll(/adres\s*:/gi)].map((m) => m.index);
  if (starts.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < starts.length; i++) {
    const block = t.slice(starts[i], starts[i + 1] ?? t.length);
    const addrLine = (/adres\s*:?\s*([^\n]+)/i.exec(block)?.[1] || '').trim();
    const am = ADDR_IN_LINE.exec(addrLine);
    if (!am) continue;
    const addressRaw = am[0].replace(/\s+/g, ' ').trim();
    const address = parseAddress(addressRaw);
    if (!address || seen.has(address.key)) continue;
    seen.add(address.key);

    out.push({
      address_raw: addressRaw,
      address,
      kind: classifyKind(block),
      area_m2: flatAreaFromBlock(block),
      starting_price_pln: priceFromBlock(block),
    });
  }
  return out;
}

// ------------------- result notices ("INFORMACJA O WYNIKU PRZETARGÓW") ------
//
// Some /doc pages on the same board carry the published RESULT notice as
// their attachment — prose, one bullet per flat:
//
//   • Nieruchomość lokalowa stanowiąca lokal mieszkalny nr 12 o pow. użytk.
//     46,56 m2 znajdująca się w budynku położonym w Zabrzu przy
//     ul. Armii Krajowej 6a na działce … Cena wywoławcza została ustalona
//     na kwotę 100.000,00 zł. Najwyższa zaproponowana cena w przetargu
//     wyniosła 101.000,00 zł. Jako nabywcę … ustalono …
//
// The preamble carries the auction date ("W dniu 28 kwietnia 2026 roku …")
// and the round ("zostały przeprowadzone drugie ustne … przetargi"). This is
// Zabrze's achieved-price stream — crawl.js routes these texts to
// parseResultDoc via crawlResultDocs(); build-properties' within-run dedupe
// folds each sold row onto the same flat's announcement listing
// (result-backed row wins).

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/** Is this attachment a published result notice (vs. a sale announcement)? */
export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIKU/i.test(text || '');
}

// "W dniu 28 kwietnia 2026 roku" → "2026-04-28" (Polish month-name genitive).
function resultDateFromText(text) {
  const m = /W\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// "zostały przeprowadzone drugie ustne … przetargi" → 2. Anchored on the
// "przeprowadzon…" clause so flat descriptions can't leak a wrong ordinal.
function resultRoundFromText(text) {
  const m = /przeprowadzon\w*\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)/i.exec(text || '');
  if (!m) return null;
  const w = m[1].toLowerCase();
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  return 5;
}

/**
 * Parse one result notice into concluded auction records (framework shape —
 * same fields Katowice's parseResultPdf emits).
 * @param {string} text  extracted attachment text (pdftotext)
 * @param {string|null} fallbackDate  ISO date from the crawl ref (rarely set)
 * @param {string} sourceUrl  the /attachment/<id> URL (provenance)
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const auctionDate = resultDateFromText(t) || fallbackDate || null;
  const round = resultRoundFromText(t);

  // One block per flat, anchored on the bullet's fixed opening phrase.
  const starts = [...t.matchAll(/Nieruchomo[śs][ćc]\s+lokalow/gi)].map((m) => m.index);
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    // Collapse the PDF's hard wraps so phrase regexes work across lines.
    const block = t.slice(starts[i], starts[i + 1] ?? t.length).replace(/\s+/g, ' ');
    const notes = [];

    const aptM = /lokal\s+(?:nie)?mieszkaln\w+\s+nr\s+(\d+[a-z]?)/i.exec(block)
      || /lokal\s+u[żz]ytkow\w+\s+nr\s+(\d+[a-z]?)/i.exec(block);
    // "na działce / na działkach" — note the k→c declension in the locative
    // ("działce"), so anchor on the stem "dział" only.
    const streetM = /przy\s+(?:ul|al|pl|os)\.?\s+(.+?)\s+na\s+dzia[łl]/i.exec(block);
    if (!aptM || !streetM) {
      // Not a per-flat bullet we understand (e.g. a grunt/parcel row) — skip.
      continue;
    }
    const address_raw = `${streetM[1].replace(/\s+/g, ' ').trim()}/${aptM[1]}`;
    const address = parseAddress(address_raw);
    if (!address) continue;
    if (address.warning) notes.push(address.warning);

    const areaM = /pow\.\s*u[żz]ytk\.?\s*([\d.,]+)\s*m/i.exec(block);
    const startM = /wywo[łl]awcza\s+zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+([\d .,]+)\s*z[łl]/i.exec(block)
      || /na\s+kwot[ęe]\s+([\d .,]+)\s*z[łl]/i.exec(block);
    const finalM = /Najwy[żz]sza\s+zaproponowana\s+cena.*?wynios[łl]a\s+([\d .,]+)\s*z[łl]/i.exec(block);

    // Negative outcome: explicit wording, or no achieved price + no buyer.
    const negative =
      /negatywn|nie\s+wy[łl]oniono|nie\s+dosz[łl]o\s+do/i.test(block) ||
      (!finalM && !/nabywc/i.test(block));

    const starting_price_pln = startM ? parsePLN(startM[1]) : null;
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    const final_price_pln = negative ? null : finalM ? parsePLN(finalM[1]) : null;
    if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

    out.push({
      auction_date: auctionDate,
      source_pdf: sourceUrl,
      kind: classifyKind(block),
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome: negative ? 'unsold' : 'sold',
      unsold_reason: negative ? 'unknown' : null,
      area_m2: areaM ? parseArea(areaM[1]) : null,
      notes,
    });
  }
  return out;
}


// ------------------- land announcements (board 555: dzialki/grunty) ----------
//
// Zabrze municipal LAND sale auctions ("Ogloszenie ... o ... przetargu na
// sprzedaz nieruchomosci niezabudowanej") live on document-list board 555 (a
// sibling of the flats board 549, found by probing the document-list API). Each
// attachment is single-parcel prose:
//   "... Dzialka nr 6089/50 o pow. 477 m2 ... polozona w Zabrzu przy ul. Stefana
//    Batorego, obreb: Zabrze ... Cena wywolawcza ... 97 000 zl ..."
// parseLandAttachment pulls parcel, plot area, obreb, street and price; the
// record is emitted kind:'grunt' -> data/zabrze/land.json (see crawl-land.js).

/** Polish plot area: "1.377"/"1 377" -> 1377; "477" -> 477; "52,40" -> 52.4. */
function parsePlotArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[ .\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse one Zabrze land (dzialka) announcement attachment into a parcel record.
 * @param {string} text  extracted attachment text (pdftotext / catdoc)
 * @returns {null | {dzialka_nr, obreb, area_m2, address_raw, starting_price_pln, auction_date}}
 */
export function parseLandAttachment(text) {
  if (!text) return null;
  const t = text.replace(/\s+/g, ' ');
  const parcels = [...t.matchAll(/dzia[\u0142l]k[ai]?\s+nr\s+(\d+(?:\/\d+)?)/gi)].map((m) => m[1]);
  const dzialka_nr = parcels.length ? [...new Set(parcels)].join(', ') : null;
  const areaM = /o\s+pow(?:\.|ierzchni)?\s+([\d][\d \u00a0.]*(?:,\d+)?)\s*m\s*[\u00b22]/i.exec(t);
  const area_m2 = areaM ? parsePlotArea(areaM[1]) : null;
  const obrebM = /obr[\u0119e]b(?:ie)?\s*:?\s*([A-Z\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143][A-Za-z\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143\u017c\u017a\u0107\u0142\u015b\u0105\u0119\u00f3\u0144-]*)/i.exec(t);
  const obreb = obrebM ? obrebM[1] : null;
  const streetM = /przy\s+(ul|al|pl|os)\.?\s+([A-Z\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143][A-Za-z0-9\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143\u017c\u017a\u0107\u0142\u015b\u0105\u0119\u00f3\u0144.'\u2019\- ]{2,60}?)\s*(?:,|obr[\u0119e]b|stanowi|zapisan|o\s+pow)/i.exec(t);
  const address_raw = streetM ? `${streetM[1]}. ${streetM[2].replace(/\s+/g, ' ').trim()}` : null;
  const priceM = /cena\s+wywo[\u0142l]awcza[^0-9]{0,60}?([\d][\d \u00a0.]*(?:,\d{2})?)\s*z[\u0142l]/i.exec(t);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;
  // Auction date — body says "Przetarg odbędzie się [w dniu] DD.MM.YYYY" OR a
  // SPELLED Polish month ("Przetarg odbędzie się 20 października 2022 r").
  let auction_date = null;
  const numM = /odb[ęe]dzie\s+si[ęe](?:\s+w\s+dniu)?\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (numM) auction_date = `${numM[3]}-${numM[2].padStart(2, '0')}-${numM[1].padStart(2, '0')}`;
  if (!auction_date) {
    const spM = /odb[ęe]dzie\s+si[ęe]\s+(\d{1,2})\s+([a-ząęóśżźćłńA-ZĄĘÓŚŻŹĆŁŃ]+)\s+(\d{4})/i.exec(t);
    const mo = spM ? PL_MONTH[spM[2].toLowerCase()] : null;
    if (mo) auction_date = `${spM[3]}-${String(mo).padStart(2, '0')}-${spM[1].padStart(2, '0')}`;
  }
  if (!dzialka_nr && !address_raw) return null;
  return { dzialka_nr, obreb, area_m2, address_raw, starting_price_pln, auction_date };
}
