// Kłodzko parsers — groundtruthed against real BIP pages (2026-06-27):
//
//   ANNOUNCEMENT: id=17391 (ul. Adama Mickiewicza 3/2, 44,90 m², 140 000 zł,
//                           przetarg 16.07.2026 r.)
//   ANNOUNCEMENT: id=17390 (ul. Wojska Polskiego 8/1, 76,95 m², 330 000 zł,
//                           przetarg 16.07.2026 r.)
//   RESULT NOTICE: id=16332 (ul. Romualda Traugutta 5/1, 111,59 m²,
//                            cena wywoławcza 280 000 zł, cena nabycia 282 800 zł,
//                            data przetargu: 10 kwietnia 2025 r.)
//
// HTML structure (CMS: custom PHP, um.bip.klodzko.pl):
//   - Listing board: items linked as
//     <a href='index.php?n=i&amp;id=NNN&amp;akcja=info&amp;menu=346…'>{title}</a>
//     The item title (in the anchor's title= attr) carries the full announcement
//     or result-notice headline. The publication date is in the inline
//     "statystyki" table ("Data wprowadzenia do BIP: DD.MM.YYYY").
//   - Detail page: the body text is between "Treść informacji" and
//     "Pliki powiązane" / "METRYKA INFORMACJI" markers. The text is
//     server-rendered inline HTML — no JS, no PDF needed (PDFs are supplemental).
//
// Announcement body key phrases:
//   "I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr N
//    zlokalizowanego w Kłodzku przy ul. {STREET} {BLDG} o powierzchni {AREA} m²"
//   "CENA WYWOŁAWCZA – {PRICE} zł"
//   "Przetarg odbędzie się dnia {DD.MM.YYYY}"
//
// Result notice body key phrases:
//   "INFORMACJA BURMISTRZA MIASTA KŁODZKA O WYNIKU PRZETARGU"
//   "Data przetargu: {DD miesiąc YYYY} r."        ← spelled out month
//   "Rodzaj przetargu: {I/II/…} przetarg ustny nieograniczony."
//   "Dane nieruchomości: lokal mieszkalny nr N zlokalizowanego w Kłodzku
//    przy ul. {STREET} {BLDG} o powierzchni {AREA} m²"
//   "Cena wywoławcza: {PRICE} zł"
//   "Cena nabycia – {FINAL_PRICE} zł"

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags and normalise whitespace. */
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&[a-z]{2,8};/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the main body text from a detail page HTML.
 * The body is between the "Treść informacji" marker and the "Pliki powiązane"
 * / "METRYKA INFORMACJI" footer section.
 */
function extractBodyText(html) {
  const m = html.match(
    /Tre[śs][ćc]\s+informacji\s*([\s\S]+?)(?:Pliki\s+powi[aą]zane|METRYKA\s+INFORMACJI|Informacja\s+powi[aą]zana)/i,
  );
  return m ? stripTags(m[1]) : stripTags(html);
}

const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9,
  wrzesnia: 9,
  października: 10, październik: 10, pazdziernika: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function isoDate(d, m, y) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * "140 000,00 zł" / "140.000,00 zł" / "140000" → integer PLN.
 * Handles both space-thousands and dot-thousands formats.
 */
function parsePLN(s) {
  if (!s) return null;
  // Strip thousand separators (space or dot before a 3-digit group)
  const cleaned = String(s)
    .replace(/\s/g, '')
    .replace(/\.(\d{3})/g, '$1') // dot-thousands: "140.000" → "140000"
    .replace(/,\d{2}$/, '');     // strip decimal: "140000,00" → "140000"
  const n = Number(cleaned.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "44,90" / "44.90" / "44,90 m²" → 44.9 */
function parseArea(s) {
  if (!s) return null;
  const m = /(\d[\d ]*[.,]\d+|\d+)/.exec(String(s).replace(/\s/g, ''));
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Listing board parser ──────────────────────────────────────────────────────

/**
 * Parse the active listing board HTML.
 * Returns item refs: { id, title, published_date }.
 * @param {string} html  raw HTML of the listing board page
 */
export function parseListingPage(html) {
  const items = [];
  const seen = new Set();

  // Each item is an anchor whose href contains id=NNN&amp;akcja=info&amp;menu=346.
  // The full title is in the data-bs-toggle/title attribute; the link text is a
  // shorter form. We use the link text (the anchor's visible text) which is the
  // canonical announcement headline.
  const itemRe =
    /href='index\.php\?n=i&amp;id=(\d+)&amp;akcja=info&amp;menu=346[^']*'\s+data-bs-toggle='tooltip'[^>]*title='([^']+)'[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    // Use the link visible text as the title (slightly shorter than the tooltip)
    const title = m[3].trim();

    // Published date: inline in the collapsed statystyki table for this item.
    // "Data wprowadzenia do BIP:&nbsp;&nbsp;27.05.2026"
    // We look for the date AFTER this id's anchor section (within 1500 chars).
    const pos = m.index;
    const window = html.slice(pos, pos + 1500);
    const dateM = /Data\s+wprowadzenia\s+do\s+BIP:[\s\S]*?(\d{2})\.(\d{2})\.(\d{4})/.exec(window);
    const published_date = dateM
      ? `${dateM[3]}-${dateM[2]}-${dateM[1]}`
      : null;

    items.push({ id, title, published_date });
  }
  return items;
}

// ── Announcement detail parser ────────────────────────────────────────────────

/**
 * Round from title or body text.
 * "I przetarg" → 1, "II przetarg" → 2, "kolejny" → null.
 * Roman numerals at the START of the operative phrase "N przetarg ustny".
 */
export function roundFromText(text) {
  if (!text) return null;
  const t = text;
  // Roman numeral immediately before "przetarg" or "ustny"
  const romanM = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg\s+ustny/i.exec(t);
  if (romanM) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return ROMAN[romanM[1].toUpperCase()] ?? null;
  }
  // Ordinal words
  if (/\bpierwsz\w+\s+przetarg/i.test(t)) return 1;
  if (/\bdrugI\w*\s+przetarg|\bdrug\w+\s+przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/i.test(t)) return 3;
  if (/\bczwart\w+\s+przetarg/i.test(t)) return 4;
  if (/\bpi[ąa]t\w+\s+przetarg/i.test(t)) return 5;
  return null;
}

/**
 * Auction date from announcement body.
 * "Przetarg odbędzie się dnia 16.07.2026 r." → "2026-07-16"
 * or spelled month "16 lipca 2026" → "2026-07-16"
 */
export function auctionDateFromText(text) {
  if (!text) return null;
  // Numeric: "dnia 16.07.2026" or "w dniu 16.07.2026"
  const numM = /(?:odbędzie\s+się\s+dnia|w\s+dniu)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return isoDate(numM[1], numM[2], numM[3]);
  // Spelled month: "odbędzie się dnia 16 lipca 2026"
  const wordM = /(?:odbędzie\s+się\s+dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[wordM[2].toLowerCase()];
    if (mo) return isoDate(wordM[1], mo, wordM[3]);
  }
  return null;
}

/**
 * Starting price from announcement body.
 * "CENA WYWOŁAWCZA – 140 000,00 zł" → 140000
 */
export function startingPriceFromText(text) {
  if (!text) return null;
  const m = /CENA\s+WYWO[ŁL]AWCZA\s*[–\-:]\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  if (m) return parsePLN(m[1]);
  // Fallback: plain "cena wywoławcza … zł"
  const fb = /cena\s+wywo[łl]awcza[^0-9]{0,30}([\d\s.,]+)\s*z[łl]/i.exec(text);
  return fb ? parsePLN(fb[1]) : null;
}

/**
 * Flat usable area from announcement or result text.
 * "o powierzchni 44,90 m²" or "o powierzchni użytkowej 44,90 m²"
 * Prefer the FIRST "o powierzchni…m²" after the flat description
 * and NOT preceded by "w tym" (which marks the common-parts share).
 * Cellar areas ("piwnica … 3,87 m²") follow later — we take the first hit.
 */
export function unitAreaFromText(text) {
  if (!text) return null;
  // Labelled: "łącznej powierzchni użytkowej NNN m²" or "o powierzchni NNN m²"
  // The cellar/piwnica is introduced by "piwnica przynależna" further along —
  // anchoring on "powierzchni" alone and taking the FIRST match works for Kłodzko
  // because the flat area always appears before the cellar caveat.
  const labM =
    /(?:łącznej\s+)?(?:powierzchni\s+u[żz]ytkowej|powierzchni)\s+([\d,.\s]+)\s*m[²2]/i.exec(text);
  if (labM) {
    const v = parseArea(labM[1]);
    if (v && v > 0) return v;
  }
  // Bare "NNN m²" fallback (take largest non-cellar)
  const M2_RE = /([\d][\d ,.]*)[\s]*m[²2²](?!\d)/gi;
  const cands = [];
  let m2m;
  M2_RE.lastIndex = 0;
  while ((m2m = M2_RE.exec(text)) !== null) {
    const v = parseArea(m2m[1]);
    if (!v || v <= 0) continue;
    const before = text.slice(Math.max(0, m2m.index - 50), m2m.index);
    if (/piwnic|kom[óo]rk|przynale[żz]|grunt|dzia[łl]k/i.test(before)) continue;
    cands.push(v);
  }
  if (cands.length) return cands[0]; // first non-cellar area
  return null;
}

/**
 * Extract flat address from announcement body.
 * "zlokalizowanego w Kłodzku przy ul. Adama Mickiewicza 3 o powierzchni …"
 * → "ul. Adama Mickiewicza 3/2" (apt from "lokal … nr N" or from title)
 */
export function addressFromText(text, titleHint) {
  if (!text) return null;

  // Pattern 1: "przy ul. {STREET} {BLDG}" followed by "o powierzchni"
  // Also handles "nr {APT}" or "/N" within the address phrase.
  const atM =
    /przy\s+(ul|al|pl|os)\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.''\s-]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s*(?:\/\s*(\d+[A-Za-z]?))?\s+(?:o\s+powierzchni|wraz\s+z|zlokalizowanego|składa|lokal)/i.exec(
      text,
    );
  if (atM) {
    const street = `${atM[1]}. ${atM[2].trim()}`;
    const bldg = atM[3];
    const apt = atM[4] || null;

    // If no apt in body, try to extract apt nr from "lokal … nr N" nearby
    let aptFinal = apt;
    if (!aptFinal) {
      const lokaM = /lokal\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
      if (lokaM) aptFinal = lokaM[1];
    }
    // Fallback: apt from title hint (e.g. "ul. A. Mickiewicza 3/2" in title)
    if (!aptFinal && titleHint) {
      const titleAddr = /(\d+)\/(\d+)/i.exec(titleHint);
      if (titleAddr && titleAddr[1] === bldg) aptFinal = titleAddr[2];
    }

    const raw = aptFinal ? `${street} ${bldg}/${aptFinal}` : `${street} ${bldg}`;
    return { address_raw: raw, address: parseAddress(raw) };
  }

  // Pattern 2: fallback — look for title hint address
  if (titleHint) {
    const m = /(ul|al|pl|os)\.\s+[A-ZŻŹĆŁŚĄĘÓŃa-ząćęłńóśźż\s.'-]+\s+\d+(?:\/\d+)?/i.exec(titleHint);
    if (m) {
      const raw = m[0].trim();
      return { address_raw: raw, address: parseAddress(raw) };
    }
  }
  return null;
}

// ── Result notice detail parser ───────────────────────────────────────────────

/** True when the text is a result notice (not an announcement). */
export function isResultNotice(text) {
  return /INFORMACJA\s+BURMISTRZA.*WYNIKU\s+PRZETARGU|WYNIKU\s+PRZETARGU/i.test(text || '');
}

/**
 * Result auction date from result notice body.
 * "Data przetargu: 10 kwietnia 2025 r." → "2025-04-10"
 */
export function resultDateFromText(text) {
  if (!text) return null;
  // Spelled month: "10 kwietnia 2025"
  const wordM = /Data\s+przetargu\s*:\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[wordM[2].toLowerCase()];
    if (mo) return isoDate(wordM[1], mo, wordM[3]);
  }
  // Numeric fallback
  const numM = /Data\s+przetargu\s*:\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return isoDate(numM[1], numM[2], numM[3]);
  return null;
}

/**
 * Round from result notice body.
 * "Rodzaj przetargu: I przetarg ustny nieograniczony." → 1
 */
export function resultRoundFromText(text) {
  if (!text) return null;
  const m = /Rodzaj\s+przetargu\s*:\s*([\s\S]{0,80})/i.exec(text);
  const scope = m ? m[1] : text;
  return roundFromText(scope);
}

/**
 * Address from result notice body.
 * "lokal mieszkalny nr N zlokalizowanego w Kłodzku przy ul. {STREET} {BLDG}
 *  o powierzchni {AREA} m²"
 */
export function resultAddressFromText(text) {
  if (!text) return null;
  // "przy ul. {STREET} {BLDG} o powierzchni"
  const m =
    /przy\s+(ul|al|pl|os)\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.''\s-]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s*(?:\/\s*(\d+[A-Za-z]?))?\s+(?:o\s+powierzchni|wraz\s+z|,|\.|składa)/i.exec(
      text,
    );
  if (!m) return null;
  const street = `${m[1]}. ${m[2].trim()}`;
  const bldg = m[3];
  let apt = m[4] || null;
  // "lokal mieszkalny nr N" — extract apt from nearby text
  if (!apt) {
    const lokaM = /lokal\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
    if (lokaM) apt = lokaM[1];
  }
  const raw = apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

/**
 * Achieved price ("Cena nabycia") from result notice.
 * "Cena nabycia – 282 800,00 zł" → 282800
 */
export function achievedPriceFromText(text) {
  if (!text) return null;
  const m = /Cena\s+nabycia\s*[–\-:]\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

// ── Top-level detail page parser ──────────────────────────────────────────────

/**
 * Parse a BIP detail page (announcement OR result notice).
 * @param {string} html  raw HTML of the detail page
 * @param {string} id    item id (for logging)
 * @param {string} [titleHint]  title from the listing board (for address extraction)
 * @returns {{ kind:'announcement'|'result', text:string, listing?:object, auction_date?:string|null } | null}
 */
export function parseDetailPage(html, id, titleHint) {
  const text = extractBodyText(html);
  if (!text) return null;

  if (isResultNotice(text)) {
    return {
      kind: 'result',
      text,
      auction_date: resultDateFromText(text),
    };
  }

  // Announcement — extract fields
  if (!/lokal\s+mieszkaln/i.test(text)) {
    // Not a flat — commercial, land, built property; skip
    return null;
  }

  const addrResult = addressFromText(text, titleHint);
  if (!addrResult) {
    console.error(`  klodzko: could not parse address from detail id=${id}`);
    return null;
  }

  const listing = {
    kind: classifyKind(text),
    address_raw: addrResult.address_raw,
    address: addrResult.address,
    area_m2: unitAreaFromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text),
    detail_url: `https://um.bip.klodzko.pl/index.php?n=i&id=${id}&akcja=info&menu=346`,
  };

  return { kind: 'announcement', text, listing };
}

// ── parseResultDoc — contract function called by refresh.js ──────────────────

/**
 * Parse a Kłodzko result notice (plain HTML body text).
 * Each result notice covers exactly one flat (confirmed from live examples).
 *
 * @param {string} text          extracted body text (set by crawlResultDocs)
 * @param {string|null} fallbackDate  ISO date if the text parse fails
 * @param {string} sourceUrl     the detail page URL (provenance)
 * @returns {Array<object>}      zero or one result record
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];

  const notes = [];
  const auctionDate = resultDateFromText(text) || fallbackDate || null;
  const round = resultRoundFromText(text);

  const addrResult = resultAddressFromText(text);
  if (!addrResult) {
    console.error(`  klodzko parseResultDoc: could not extract address from ${sourceUrl}`);
    return [];
  }
  if (addrResult.address?.warning) notes.push(addrResult.address.warning);

  const area_m2 = unitAreaFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const final_price_pln = achievedPriceFromText(text);

  // Negative outcome: no achieved price and no buyer mention
  const negative =
    /negatywn|nie\s+dosz[łl]o\s+do\s+zawarcia|nie\s+wy[łl]oniono/i.test(text) ||
    (!final_price_pln && !/Nabywc/i.test(text));

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  return [
    {
      auction_date: auctionDate,
      source_pdf: sourceUrl,
      kind: classifyKind(text),
      address_raw: addrResult.address_raw,
      address: addrResult.address,
      round,
      area_m2,
      starting_price_pln,
      final_price_pln: negative ? null : final_price_pln,
      outcome: negative ? 'unsold' : 'sold',
      unsold_reason: negative ? 'unknown' : null,
      notes,
    },
  ];
}
