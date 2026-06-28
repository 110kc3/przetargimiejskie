// Świnoujście parsers.
//
// Data sources (groundtruthed 2026-06-28):
//
//   BOARD INDEX (artykuly/1717 + artykuly/1718):
//     Each article is listed as: <h2><a href="/artykul/{board}/{id}/{slug}">TITLE</a></h2>
//     followed by an optional <p> body blurb.
//
//   ARTICLE TITLE — carries all structural fields:
//     "trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4
//      wraz z pomieszczeniem przynależnym o łącznej powierzchni 90,73 m2 położonego
//      przy ul. Konstytucji 3 Maja 4/4 w Świnoujściu"
//     → round: 3, kind: mieszkalny, area: 90.73 m², address: Konstytucji 3 Maja 4/4
//
//     "drugi nieograniczony ustny przetarg na sprzedaż udziału w nieruchomości
//      przy ul. Armii Krajowej 7a w Świnoujściu, w ramach którego przysługuje
//      prawo do wyłącznego korzystania z lokalu mieszkalnego nr 6"
//     → round: 2, kind: mieszkalny, address: Armii Krajowej 7a, apt: 6
//
//   ARTICLE BODY BLURB — auction date:
//     "Przetarg odbędzie się dnia 16 października 2024 r. o godzinie 12:00"
//     "Przetarg odbędzie się dnia 13.01.2025 r."
//
//   DOC ATTACHMENT (newer announcements only) — starting price:
//     "Cena wywoławcza: 428 825,00 zł"
//     "Cena wywoławcza: 504 500,00 zł (słownie: ...)"
//
// No result notices ("Informacja o wyniku") are published on this BIP —
// crawlResultDocs() returns [].
//
// Skippable: najem (rental), lokale użytkowe do wynajęcia, garażowe, postojowe,
// zamówienia publiczne, odwołanie, unieważnienie, zawiadomienie o odwołaniu.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ----------------------------------------------------------------- helpers

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

/** "159 000,00" / "428 825,00" / "504500" → integer PLN or null. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "90,73" / "90.73" / "30,66" → number or null. */
export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- title routing

/** True when this article title/slug should be skipped outright (not a flat/house/land SALE). */
export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  // Rentals (najem, dzierżawa, wynajem)
  if (/\bnajem\b|dzier[zż]aw|wynaj[eę]/i.test(s)) return true;
  // Cancellations / withdrawals
  if (/odwo[łl]ani|uniewa[zż]ni|zawiadomieni.*odwo[łl]/i.test(s)) return true;
  // Public procurement (zamówienia publiczne — not property auctions)
  if (/zam[oó]wieni.*publiczn/i.test(s)) return true;
  // Garages and parking as rental (sale of garage as property is OK)
  if (/najem.*gara[zż]|najem.*postoj/i.test(s)) return true;
  return false;
}

/** True when the title looks like a municipal PROPERTY SALE announcement. */
export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  // Must be about a sale auction
  if (!/przetarg/i.test(s)) return false;
  if (!/sprzeda[zż]|zbyci/i.test(s)) return false;
  return true;
}

// ----------------------------------------------------------------- round

/** Polish ordinal → round number, or null. */
export function roundFromTitle(title) {
  // Allow optional comma or punctuation between the ordinal and the przetarg phrase
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm)\w*\s*[,.]?\s*/i.exec(title || '');
  if (!m) return null;
  // Verify it's followed by przetarg — avoids matching ordinals in address fragments
  const rest = (title || '').slice(m.index + m[0].length);
  if (!/^\s*(?:nieograniczon\w+\s+)?(?:ustn\w+\s+)?przetarg/i.test(rest)) return null;
  const w = m[1].toLowerCase();
  if (/^pierwsz/.test(w)) return 1;
  if (/^drug/.test(w)) return 2;
  if (/^trzeci/.test(w)) return 3;
  if (/^czwart/.test(w)) return 4;
  if (/^pi[aą]t/.test(w)) return 5;
  if (/^sz[oó]st/.test(w)) return 6;
  if (/^si[oó]dm/.test(w)) return 7;
  if (/^[oó]sm/.test(w)) return 8;
  return null;
}

// ----------------------------------------------------------------- area from title

/** Area (m²) from the title: "…powierzchni 90,73 m2…" or "…pow. 58,33 m2…" */
export function areaFromTitle(title) {
  const m = /(?:powierzchni\w*|pow\.)\s+([\d,]+)\s*m[²2]/i.exec(title || '');
  return m ? parseArea(m[1]) : null;
}

// ----------------------------------------------------------------- auction date from blurb

/**
 * Auction date from the article body blurb.
 * Handles:
 *   "Przetarg odbędzie się dnia 16 października 2024 r."
 *   "Przetarg odbędzie się dnia 13.01.2025 r."
 *   "Przetarg odbedzie sie dnia 16 kwietnia 2025 roku"
 * → ISO date or null.
 */
export function auctionDateFromBlurb(text) {
  if (!text) return null;
  // Numeric form: DD.MM.YYYY
  const numM = /odb[ęe]dzie\s+si[ęe]\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) {
    return `${numM[3]}-${numM[2].padStart(2, '0')}-${numM[1].padStart(2, '0')}`;
  }
  // Word form: DD <miesiąc> YYYY
  const wordM = /odb[ęe]dzie\s+si[ęe]\s+dnia\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTH[wordM[2].toLowerCase()];
    if (!mo) return null;
    return `${wordM[3]}-${String(mo).padStart(2, '0')}-${wordM[1].padStart(2, '0')}`;
  }
  return null;
}

// ----------------------------------------------------------------- address from title

/**
 * Extract a raw address string from the article title.
 *
 * Phrasings groundtruthed:
 *   (a) "…lokalu mieszkalnego nr 4 …przy ul. Konstytucji 3 Maja 4/4 w Świnoujściu"
 *       → "ul. Konstytucji 3 Maja 4/4"  (flat nr from separate regex below)
 *
 *   (b) "…udziału w nieruchomości przy ul. Armii Krajowej 7a w Świnoujściu,
 *        w ramach którego przysługuje prawo do wyłącznego korzystania z lokalu
 *        mieszkalnego nr 6"
 *       → "ul. Armii Krajowej 7a" with apt 6 appended
 *
 *   (c) "…nieruchomości gruntowej zabudowanej budynkiem mieszkalnym
 *        jednorodzinnym, położonej w Świnoujściu przy ul. Miodowej 8"
 *       → "ul. Miodowej 8"
 *
 * Returns the raw address string or null.
 */
export function addressRawFromTitle(title) {
  if (!title) return null;
  const t = title.replace(/\n/g, ' ');

  // Match "przy ul. <anything up to building number>" terminated by " w " or ","
  // Use a lazy match up to a number+optional-letter, then look ahead for terminator.
  // This avoids character-class issues with Polish diacritics in street names
  // and handles digits in street names (e.g. "Konstytucji 3 Maja").
  const m = /przy\s+ul\.\s+(.+?\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?))(?=\s+w\s|\s*,|\s*$)/i.exec(t);
  if (m) {
    const full = m[1].replace(/\s+/g, ' ').trim();
    const numPart = m[2];

    // Pattern (b): if the number part has no apt slash AND there's "lokal nr N" later
    const unitM = /lokal\w*\s+(?:mieszkaln\w+|u[zż]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(t);
    if (unitM && !numPart.includes('/')) {
      return `ul. ${full}/${unitM[1]}`;
    }
    return `ul. ${full}`;
  }

  // Fallback: "przy Placu <Name> <number>"
  const plM = /przy\s+Plac[uo]?\s+(.+?\s+(\d+[A-Za-z]?))(?=\s+w\s|\s*,|\s*$)/i.exec(t);
  if (plM) {
    return `Plac ${plM[1].replace(/\s+/g, ' ').trim()}`;
  }

  return null;
}

// ----------------------------------------------------------------- starting price from DOC text

/**
 * Starting price from DOC attachment text.
 * "Cena wywoławcza: 428 825,00 zł"
 * "Cena wywoławcza: 549 000,00 zł (słownie: …)"
 */
export function startingPriceFromDoc(text) {
  const m = /cena\s+wywo[łl]awcz[ay]\s*[:\-–]?\s*(\d[\d\s .,]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- kind from title

/**
 * Classify the property kind from the title.
 * Falls back to classifyKind on the whole title.
 */
export function kindFromTitle(title) {
  const t = (title || '');
  const k = classifyKind(t);
  return k === 'unknown' ? 'mieszkalny' : k;
}

// ----------------------------------------------------------------- parseArticle

/**
 * Parse one board article (title + blurb text from the index page HTML)
 * into an active listing record. DOC-based price must be enriched separately.
 *
 * @param {{ title: string, blurb: string, detail_url: string, board: number }} art
 * @returns {object|null}
 */
export function parseArticle(art) {
  const { title = '', blurb = '', detail_url = '' } = art || {};
  if (!title) return null;

  const kind = kindFromTitle(title);
  const round = roundFromTitle(title);
  const area_m2 = areaFromTitle(title);
  const auction_date = auctionDateFromBlurb(blurb);
  const address_raw = addressRawFromTitle(title);
  if (!address_raw) return null;

  const address = parseAddress(address_raw);
  if (!address) return null;

  return {
    kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln: null, // enriched from DOC when available
    auction_date,
    round,
    detail_url,
  };
}

// ----------------------------------------------------------------- parseResultDoc

/**
 * Świnoujście BIP does not publish result notices — this function always
 * returns []. Signature matches the framework contract.
 * @returns {Array}
 */
export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
