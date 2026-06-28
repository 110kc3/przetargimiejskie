// Chełm parser — text PDFs from the lubelskie.pl BIP platform.
//
// All announcement PDFs follow the standard "OGŁOSZENIE O PRZETARGU" format:
//   "Prezydent Miasta Chełm ogłasza [I/II/III] ustny nieograniczony przetarg
//    na sprzedaż [lokalu mieszkalnego nr N / spółdzielczego własnościowego prawa
//    do lokalu mieszkalnego] położonego w Chełmie przy ul. XYZ N/M."
//   "Cena wywoławcza ... wynosi 278.350,00zł"  (dot = thousands sep)
//   "Przetarg odbędzie się ... dnia 20 lipca 2026r. o godz. 11^00."
//
// Result notices ("INFORMACJA") are sparse but follow:
//   "...w dniu 21.06.2021 roku ... odbył się przetarg ustny nieograniczony
//    na sprzedaż lokalu mieszkalnego nr 2A ... przy ul. G. Stephensona 4..."
//   "cena wywoławcza (brutto) nieruchomości wynosiła 33.300,00zł"
//   "w przetargu osiągnięto cenę 64.030,00 zł"
//
// Fixtures groundtruthed 2026-06-28:
//   Announcement: umchelm.bip.lubelskie.pl/upload/pliki/5-ogloszenie_o_przetargu.pdf
//     (Wolynska 65A/5, round 3, price 278350, area 51.50m2, date 2026-07-20)
//   Result: umchelm.bip.lubelskie.pl/upload/pliki/INFORMACJA_O_WYNIKACH_PRZETARGU.pdf
//     (Stephensona 4/2A, price 33300 to 64030, date 2021-06-21, sold)
//
// Achieved-price stream is WEAK (only ~5 result PDFs on 796-record board).
// crawlResultDocs() returns what exists; parse gaps are noted in record .notes.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// ----------------------------------------------------------------- number helpers

// "278.350,00zł" / "33.300,00 zł" / "64.030,00 zł" / "278350,00" -> integer PLN
// Chelm uses DOT as thousands separator and COMMA as decimal separator.
function parsePLN(numStr) {
  if (!numStr) return null;
  // Trim whitespace, remove dot-thousands separators, then strip decimal
  const cleaned = String(numStr).trim().replace(/\./g, '').replace(/,\d{2}\s*$/, '').replace(/,/g, '');
  const n = Number(cleaned.replace(/\s/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "51,50" / "51.50" / "51 50" -> number (floor area m2)
function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ----------------------------------------------------------------- title routing

/** True for items to skip outright: wykazy, najem/dzierzawa,
 *  zamiar wszczecia, cancellations (odwolanie), corrections (sprostowanie). */
export function isSkippableTitle(title) {
  const t = title || '';
  return (
    /\bwykaz\b/i.test(t) ||
    /\bnajem\b|dzier[zż]aw/i.test(t) ||
    /zamiar\w*\s+wszcz\w*/i.test(t) ||
    /odwo[łl]an\w*|uniewa[zż]ni/i.test(t) ||
    /sprostowanie/i.test(t) ||
    /przyj[ęe]cie\s+granic/i.test(t) ||
    /\brokowani/i.test(t)
  );
}

/** True when the title looks like a published result notice. */
export function isResultTitle(title) {
  const t = title || '';
  return /informacja\s+o\s+(wynik|odwo[łl]|wynikach)/i.test(t);
}

/** True when the title looks like a sale auction announcement. */
export function isAnnouncementTitle(title) {
  const t = title || '';
  return /przetarg/i.test(t) && /sprzeda[zż]|zbyci|nieruchomo[śs]/i.test(t);
}

/** True when the PDF body is a result notice. Chelm uses bare "INFORMACJA"
 *  not "INFORMACJA o wyniku", so detect by result-specific phrases. */
export function isResultNotice(text) {
  const t = text || '';
  return (
    /INFORMACJA\s+O\s+WYNIK/i.test(t) ||
    /osi[ąa]gni[ęe]to\s+cen[ęe]/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu/i.test(t) ||
    /wadium.*wp[łl]aci[łl]o\s+\d+\s+os[óo]b/i.test(t)
  );
}

// ----------------------------------------------------------------- shared extractors

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5,
  'szóst': 6, szost: 6,
};

/** Roman numeral round prefix ("I przetarg", "II przetarg", "III przetarg"). */
const ROUND_ROMAN_RE = /\b(I{1,3}|IV|V|VI{0,3})\s+(?:ustn|przetarg)/i;

/** Round from word ordinal or Roman prefix. */
export function roundFromText(text) {
  const t = text || '';
  const mWord = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(t);
  if (mWord) return ROUND_WORDS[mWord[1].toLowerCase()] ?? null;
  const mRoman = ROUND_ROMAN_RE.exec(t);
  if (mRoman) {
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return roman[mRoman[1].toUpperCase()] ?? null;
  }
  return null;
}

/** Auction date from announcement body. */
export function auctionDateFromText(text) {
  const t = text || '';
  const m = /(?:odb[ęe]dzie\s+si[ęe]|przetarg\s+odb[ęe]dzie)|dnia\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (!m) return null;
  if (m[1]) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (!mo) return null;
    return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const rest = t.slice(m.index + m[0].length);
  const dm = /(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(rest);
  if (!dm) return null;
  const mo = PL_MONTH[dm[2].toLowerCase()];
  if (!mo) return null;
  return `${dm[3]}-${String(mo).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
}

/** Result-notice auction date. */
export function resultDateFromText(text) {
  const t = text || '';
  let m = /w\s+dniu\s+(\d{2})\.(\d{2})\.(\d{4})\s+roku/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s+roku/i.exec(t);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const ADDR_RE =
  /przy\s+ul\.\s+([\wżźćłśąęóńŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\-\s]*?)\s+(\d+\s*[A-Za-z]?)\s*(?:\/\s*(\w+))?\s*[,.\n]/i;

function streetUnitFromText(text) {
  const m = ADDR_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const building = m[2].replace(/\s/g, '').toUpperCase();
  const unit = m[3] ? m[3].trim() : null;
  if (!street) return null;
  return { street, building, unit };
}

function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\s+(\w+)/i.exec(text || '');
  return m ? m[1].toUpperCase() : null;
}

function unitAreaFromText(text) {
  const m = /powierzchni\s+u[żz]ytkow\w+\s+([\d,]+)\s*m\s*[²2]/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

/** Starting price: "cena wywoławcza ... wynosi 278.350,00zł" or "wynosiła 33.300,00zł". */
export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[łl]awcza\b[^.]*?(?:wynosi[łl]?a?|:)\s*([\d.,\s]+)\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s*\([^)]*\)\s*(?:nieruchomo[śs]ci\s+)?(?:wynosi[łl]?a?|:)\s*([\d.,\s]+)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price from result notice: "osiągnięto cenę 64.030,00 zł". */
export function achievedPriceFromText(text) {
  const t = text || '';
  let m = /osi[ąa]gni[ęe]to\s+cen[ęe]\s+([\d.,]+)\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*([\d.,]+)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- announcement parse

export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');

  const kind = classifyKind(t.slice(0, 600)) || 'mieszkalny';
  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const area_m2 = kind === 'mieszkalny' ? unitAreaFromText(t) : null;

  const su = streetUnitFromText(t);
  if (!su) return null;

  let apt = su.unit;
  if (!apt && kind === 'mieszkalny') {
    apt = unitNoFromText(t) || null;
  }

  const address_raw = apt
    ? `ul. ${su.street} ${su.building}/${apt}`
    : `ul. ${su.street} ${su.building}`;

  const address = parseAddress(address_raw);
  if (!address) return null;

  return { kind, address_raw, address, area_m2, starting_price_pln, auction_date, round };
}

// ----------------------------------------------------------------- result parse

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
    /wynik\w*\s+negatywn/i.test(t) ||
    /brak\s+uczestnik/i.test(t) ||
    /nie\s+wy[łl]oniono/i.test(t);

  const su = streetUnitFromText(t);
  if (!su) return [];

  const unitNo = unitNoFromText(t);
  const apt = unitNo || su.unit || null;

  const address_raw = apt
    ? `ul. ${su.street} ${su.building}/${apt}`
    : `ul. ${su.street} ${su.building}`;

  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  const kind = classifyKind(t.slice(0, 600)) || 'mieszkalny';

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2,
    notes,
  }];
}
