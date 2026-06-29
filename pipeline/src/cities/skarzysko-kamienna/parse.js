// Skarżysko-Kamienna parsers.
//
// Every record page is a self-contained HTML notice (flat announcement or
// result). The structured detail table carries type metadata; the body text
// (plain HTML <p>) carries all the data we parse. Closest analog:
// Kędzierzyn-Koźle (same Logonet CMS), but Skarżysko uses dot-thousands
// ("95.800,00 zł"), word ordinals for rounds (first/second/third = "pierwszy/
// drugi/trzeci"), and the achieved-price phrasing is unique to this office.
//
// All regexes groundtruthed against live BIP pages (verified 2026-06-29):
//
//   ANNOUNCEMENT flat (round 3):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/10586/…chalubinskiego-nr-8-lokal-nr-5
//     "ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu
//      mieszkalnego nr 5 … przy ul. Chałubińskiego nr 8 …"
//     "skład lokalu: … o łącznej powierzchni 33,60 m²"
//     "CENA WYWOŁAWCZA do przetargu wynosi - 95.800,00 zł"
//     "Przetarg odbędzie się w dniu 14 stycznia 2025 r."
//
//   RESULT flat sold (round 1):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/…staffa-nr-25-lokal-nr-1-informacja-o-wyniku-przetargu
//     "odbył się ustny nieograniczony przetarg … przy ul. Staffa 25 …
//      o powierzchni 14,00 m2"
//     "Cena wywoławcza została ustalona na kwotę 31.600,00 zł."
//     "Najwyższa cena jak została osiągnięta w przetargu wyniosła 31.920,00 zł."
//
//   RESULT flat unsold (round 3):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/…chalubinskiego-nr-8-lokal-nr-5-informacja-o-wyniku-trzeciego-przetargu
//     "odbył się trzeci ustny nieograniczony przetarg … przy ul. Chałubińskiego 8/5
//      … o powierzchni 33,60 m2"
//     "Cena wywoławcza została ustalona na kwotę 95.800,00 zł"
//     "Na przedmiotowy lokal nie zostało wpłacone wadium … wynikiem negatywnym."
//
//   RESULT flat unsold (round 5, "brak oferentów"):
//     https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/…staffa-13-2-informacja-o-wyniku-przetargu
//     "W związku z brakiem oferentów przetarg zakończył się wynikiem negatywnym."

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// "95.800,00" / "31 600,00" / "31.920,00 zł" -> integer PLN.
// Dot OR space thousands separator, optional ",00" grosze tail.
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "33,60" / "14,00" / "33.60" -> number. Used for usable floor area (m2).
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- doc-type gate

/** Result notice ("INFORMACJA O WYNIKU …") vs. sale announcement.
 *  The body header or title is the authority. */
export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wynik/i.test(text || '');
}

// ------------------------------------------------------------- title routing

/** True for items to skip: rentals, pre-announcement lists, cancellations,
 *  sprostowania (corrections), rokowania (negotiations). */
export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /lista\s+os[óo]b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(^|\W)wykaz\b|wywieszeniu\s+wykazu/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

/** True when the title/slug looks like a published result notice. */
export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /informacj\w*\s+o\s+wynik/i.test(s);
}

/** True when the title/slug looks like a sale announcement. */
export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo/i.test(s)) return true;
  return false;
}

// ----------------------------------------------------------------- dates

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
  'siódm': 7, siodm: 7, 'ósm': 8, osm: 8,
};

/** Round from a Polish word ordinal qualifying "przetarg":
 *  "trzeci przetarg" -> 3, "pierwszego przetargu" -> 1. Returns null when
 *  no ordinal is found (first occurrence wins). */
export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm)\w*\s+(?:ustny\s+nieograniczony\s+)?przetarg/i.exec(text || '');
  if (!m) return null;
  const key = m[1].toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) {
    if (key.startsWith(prefix)) return val;
  }
  return null;
}

/** Announcement auction date: "Przetarg odbędzie się w dniu 14 stycznia 2025 r."
 *  Also handles numeric forms "14.01.2025". -> ISO or null. */
export function auctionDateFromText(text) {
  const t = text || '';
  // Word form: "w dniu DD <miesiąc> YYYY"
  let m = /(?:przetarg\w*\s+)?odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // Numeric form from structured table: "14.01.2025 godz. …"
  m = /Data\s+przetargu\D{0,20}(\d{2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/** Result-notice auction date: "w dniu 14 maja 2024 r. w siedzibie Urzędu Miasta
 *  … odbył się … przetarg". Anchored on the "… r. w siedzibie" tail so the
 *  Rozporządzenie citation ("z dnia 14 września 2004 r.") can't win.
 *  Falls back to the structured table date. -> ISO or null. */
export function resultDateFromText(text) {
  const t = text || '';
  // "w dniu DD <miesiąc> YYYY r. w siedzibie"
  let m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+w\s+siedzibie/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  // Also try "Skarżysko-Kamienna, dn. DD.MM.YYYY" header stamp
  m = /Skarżysko-Kamienna\s*,?\s+dn\.\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
  return null;
}

// ----------------------------------------------------------------- prices

/** Starting price. Phrasings seen live:
 *  "CENA WYWOŁAWCZA do przetargu wynosi - 95.800,00 zł"  (announcements)
 *  "Cena wywoławcza została ustalona na kwotę 95.800,00 zł"  (results)
 *  "Cena wywoławcza 95 800,00 zł"  (structured table field) */
export function startingPriceFromText(text) {
  const t = text || '';
  // "wynosi - N" / "wynosi N" / "ustalona na kwotę N"
  let m = /cena\s+wywo[łl]awcza\s*(?:do\s+przetargu\s*)?wynosi\s*[-–]?\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s+zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s+(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices only).
 *  "Najwyższa cena jak została osiągnięta w przetargu wyniosła 31.920,00 zł."
 *  -> PLN or null (null means unsold). */
export function achievedPriceFromText(text) {
  const m = /(?:najwy[żz]sza\s+cena\s+(?:jak\s+)?zosta[łl]a\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+wynios[łl]a|cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?)\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- address

// Flat number: "lokalu mieszkalnego nr 5" / "lokal mieszkalny nr 26"
const UNIT_NO_RE = /lokal\w*\s+mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i;

// Street + building from the announcement header clause "… przy ul. Chałubińskiego
// nr 8 …" / "… przy ul. Staffa 25 …" / "… przy Al. Marsz. J. Piłsudskiego nr 32 …"
// Also handles inline "przy ul. Chałubińskiego 8/5" (result notice form).
const STREET_BLDG_RE =
  /przy\s+(?:ul(?:icy)?\.?|al(?:ei)?\.?)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'\- ]+?)\s+(?:nr\s+)?(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?\s*(?:\b|[,.\s])/i;

/** "ul. <street> <bldg>[/<apt>]" raw address. Returns null if not parseable. */
export function addressRawFromText(text) {
  const t = text || '';
  const sm = STREET_BLDG_RE.exec(t);
  if (!sm) return null;
  const street = sm[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  const bldg = sm[2];
  // If the regex already captured an inline apt (ul. Chałubińskiego 8/5 form):
  if (sm[3]) return `ul. ${street} ${bldg}/${sm[3]}`;
  // Otherwise look for the unit number separately
  const um = UNIT_NO_RE.exec(t);
  return um ? `ul. ${street} ${bldg}/${um[1]}` : `ul. ${street} ${bldg}`;
}

// Usable floor area: "o łącznej powierzchni 33,60 m²" / "o powierzchni 14,00 m2"
// The anchor "łącznej powierzchni" or "o powierzchni" after the lokal description.
// We specifically capture the area associated with the unit, not the land parcel.
const UNIT_AREA_RE = /lokal\w*[\s\S]{0,400}?o\s+(?:[łl][ąa]cznej\s+)?powierzchni\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

/** Usable floor area (m2) of the flat, or null. */
export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// Kind from the sale-clause after "na sprzedaż":
function kindFromText(text) {
  const m = /na\s+sprzeda[zż]\s*([\s\S]{0,600})/i.exec(text || '');
  return classifyKind(m ? m[1] : (text || '').slice(0, 600));
}

// ----------------------------------------------------------------- HTML extraction

/** Extract the plain-text body of a BIP record page.
 *  The body is in the first <p style="text-align: justify;"> inside the
 *  <div class="author" id="content_legal_autor"> (not the metryczka second div).
 *  The structured detail table (Adres/Cena/Data) is prepended so that
 *  startingPriceFromText and auctionDateFromText can also pick up table values
 *  as a fallback. */
export function extractBodyText(html) {
  if (!html) return '';
  // Strip \r for consistent matching
  const h = html.replace(/\r/g, '');
  // Extract the first content_legal_autor div (the body; the second is metryczka)
  const divM = /id="content_legal_autor"[^>]*>([\s\S]*?)<\/div>\s*(?:<section|<div[^>]*class="author")/i.exec(h);
  const bodyHtml = divM ? divM[1] : '';
  // Also extract the detail table for fallback fields
  const tableM = /<table[^>]*class="[^"]*table-borderless[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(h);
  const tableHtml = tableM ? tableM[1] : '';
  const combined = tableHtml + '\n' + bodyHtml;
  // Strip HTML tags
  let text = combined.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ');
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

// ------------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT HTML page (flat, built property, or land parcel).
 * Single-property: returns ONE record or null.
 * @param {string} text  extracted body text (via extractBodyText)
 * @returns {object|null}
 */
export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const area_m2 = unitAreaFromText(t);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}

// ------------------------------------------------------------------ result parse

/**
 * Parse one RESULT notice HTML page into a concluded auction record.
 * Returns 0 or 1 record (array = framework interface).
 * @param {string} text       extracted body text (via extractBodyText)
 * @param {string|null} fallbackDate  ISO date from the crawl ref (structured table)
 * @param {string} sourceUrl  the canonical page URL (provenance)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;

  const negativeStated =
    /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium/i.test(t) ||
    /brak\s+oferent/i.test(t) ||
    /nie\s+dosz[łl]o\s+do\s+zawarcia/i.test(t);

  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  const kind = kindFromText(t);

  return [
    {
      auction_date,
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    },
  ];
}
