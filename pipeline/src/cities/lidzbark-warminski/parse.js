// Lidzbark Warmiński parsers.
//
// bip.lidzbarkw.pl's /przetargi/10054/ board (SYSTEMDOBIP.PL / E-LINE)
// renders each przetarg as ONE table row on /przetargi/10054/status/{0,1}/:
// Lp / Data ogłoszenia / Data i godzina przetargu / Dotyczy / Cena wywoławcza / Wynik / Załączniki.
//
// Like krosno-odrzanskie and wschowa:
//   - "Cena wywoławcza" is a real inline number
//   - "Wynik" is populated ("Pozytywny" / "Negatywny")
//   - Each row carries PDF attachments:
//       1. Announcement notice ("Ogłoszenie o przetargu ...") with flat area + full spec
//       2. Result notice ("Informacja o wyniku przetargu ...") with achieved price and outcome
//
// Groundtruth fixtures:
//   - ul. Krucza 4/1a (ID 145): 16.30 m², round 1, cena wyw. 50 100 zł, osiągnięta 84 000 zł (sold)
//   - ul. Konstytucji 3 Maja 6/1 (ID 141): 15.10 m², round 1, cena wyw. 43 100 zł, osiągnięta 60 000 zł (sold)
//   - ul. Wiejska 51/3 (ID 94): 57.31 m², round 3, cena wyw. 123 200 zł, osiągnięta 124 440 zł (sold)
//   - ul. Wiejska 51/3 (ID 83): 57.31 m², round 2, cena wyw. 154 000 zł, wynik Negatywny (unsold)
//   - ul. Wiejska 51/3 (ID 72): 57.31 m², round 1, cena wyw. 154 000 zł, wynik Negatywny (unsold)
//   - ul. Dantyszka 11/2 (ID 42): 21.46 m², round 1, cena wyw. 52 900 zł, osiągnięta 53 430 zł (sold)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ── Money ────────────────────────────────────────────────────────────────────

// Dot or space (regular + NBSP) thousands groups, optional ",NN" grosze tail.
// Tolerates optional space after comma ("154.000, 00").
const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\s*\\d{1,2})?';

/** "50.100,00" / "154.000, 00" / "84 000,00" -> integer PLN, or null. */
export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr)
    .replace(/[.\s\u00a0]/g, '')
    .replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const LABELED_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcz\\w*(?:\\s+nieruchomo\\w+)?\\s*[:–-]?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
const BARE_PRICE_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'i');

/** Starting price ("cena wywoławcza") from text. */
export function startingPriceFromText(text) {
  const t = text || '';
  const m = LABELED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const b = BARE_PRICE_RE.exec(t);
  return b ? parsePLN(b[1]) : null;
}

const ACHIEVED_PRICE_RE = new RegExp(
  `(?:cena\\s+osi[ąa]gni[ęe]t\\w*|najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]t\\w*)(?:\\s+w\\s+przetargu)?\\s*[:–-]?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);

/** Achieved price ("cena osiągnięta"), or null (unstated / unsold). */
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ── Area (flats) ─────────────────────────────────────────────────────────────

const FLAT_AREA_RE =
  /pow(?:ierzchni\w*)?\.?\s*u[żz]ytkow\w*(?:\s+lokalu)?\s*[:–-]?\s*(\d+(?:[.,]\d+)?)\s*m/i;

/** Usable floor area (m2) of a flat, or null. */
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Round ────────────────────────────────────────────────────────────────────

const ROUND_WORDS = {
  pierwsz: 1,
  drug: 2,
  trzeci: 3,
  czwart: 4,
  piat: 5,
  piąt: 5,
};

const ROMAN = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
};

/** Round number (1, 2, 3, etc.) from Polish ordinal or Roman numeral. */
export function roundFromText(text) {
  if (!text) return null;
  const wordRe =
    /\b(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+(?:ustn\w+\s+)?(?:nieograniczon\w+\s+|ograniczon\w+\s+)?przetarg/i;
  const romanRe =
    /\b(i|ii|iii|iv|v)\b\.?\s+(?:ustn\w+\s+)?(?:nieograniczon\w+\s+|ograniczon\w+\s+)?przetarg/i;

  const wordM = wordRe.exec(text);
  const romanM = romanRe.exec(text);

  let bestMatch = null;
  let bestIndex = Infinity;

  if (wordM) {
    const stem = wordM[1].toLowerCase().slice(0, 5);
    for (const [k, v] of Object.entries(ROUND_WORDS)) {
      if (stem.startsWith(k.slice(0, 4))) {
        bestMatch = v;
        bestIndex = wordM.index;
        break;
      }
    }
  }

  if (romanM && romanM.index < bestIndex) {
    const val = ROMAN[romanM[1].toLowerCase()];
    if (val != null) {
      bestMatch = val;
      bestIndex = romanM.index;
    }
  }

  return bestMatch;
}

// ── Address (flats) ──────────────────────────────────────────────────────────

const VENUE_RE = /świętochowsk|parkow/i;

/**
 * Extract a flat address formatted as "ul. <Street> <building>/<apt>".
 * Matches both title prose and document text.
 * Rejects the Urząd Miejski venue (Świętochowskiego).
 */
export function extractFlatAddress(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // Explicit unit number: "lokal(u) [mieszkalnego] [oznaczonego] nr 1a"
  const unitM =
    /lokal\w*\s*(?:mieszkaln\w*)?\s*(?:oznaczon\w*)?\s*nr\.?\s*(\d+[A-Za-z]?)/i.exec(t);
  const apt = unitM ? unitM[1] : null;

  if (apt) {
    const streetM =
      /(?:przy\s+budynku\s+)?przy\s+ul(?:\.|\s*icy|\s*ica)?\s+([A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ0-9.\s-]+?)\s+(\d{1,4}[A-Za-z]?)(?=\s+(?:w\b|z\b|wraz\b|o\b)|[,.;\n]|$)/iu.exec(
        t,
      );
    if (streetM && !VENUE_RE.test(streetM[1])) {
      return `ul. ${streetM[1].trim()} ${streetM[2]}/${apt}`;
    }
  }

  // Glued property form with "przy ul. ...": "przy ul. Kruczej 4/1a"
  const gluedM =
    /(?:przy\s+budynku\s+)?przy\s+ul(?:\.|\s*icy|\s*ica)?\s+([A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ0-9.\s-]+?)\s+(\d{1,4}[A-Za-z]?)\s*\/\s*(\d{1,4}[A-Za-z]?)(?=\s+(?:w\b|z\b|wraz\b|o\b)|[,.;\n]|$)/iu.exec(
      t,
    );
  if (gluedM && !VENUE_RE.test(gluedM[1])) {
    return `ul. ${gluedM[1].trim()} ${gluedM[2]}/${gluedM[3]}`;
  }

  // Bare glued form anywhere: "ul. Kruczej 4/1a"
  const bareGlued =
    /\bul\.\s*([A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ0-9.\s-]+?)\s+(\d{1,4}[A-Za-z]?)\s*\/\s*(\d{1,4}[A-Za-z]?)\b/iu.exec(
      t,
    );
  if (bareGlued && !VENUE_RE.test(bareGlued[1])) {
    return `ul. ${bareGlued[1].trim()} ${bareGlued[2]}/${bareGlued[3]}`;
  }

  return null;
}

// ── Row / document gating ────────────────────────────────────────────────────

/** True for a LEASE row (najem/dzierżawa/czynsz) — never a municipal SALE. */
export function isLeaseRow(text) {
  return /najem|dzier[żz]aw|czynsz/i.test(text || '');
}

/** True when text reads as a flat SALE (not lease, kind === 'mieszkalny'). */
export function isFlatSaleRow(text) {
  if (isLeaseRow(text)) return false;
  return classifyKind(text) === 'mieszkalny';
}

/** "2024-08-20 10:00:00" -> "2024-08-20". */
export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

// ── Outcome ──────────────────────────────────────────────────────────────────

const NEGATIVE_RE =
  /wynik(?:iem)?\s+negatywn|bez\s+rozstrzygni[ęe]|brak\s+oferent|nie\s+odnotowano\s+wp[łl]at|brak\s+wp[łl]at\w*\s+wadium|nie\s+wp[łl]acono\s+wadium/i;

/** True when the text states a negative (unsold) outcome. */
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

/** True when text carries a result signal. */
export function isResultNotice(text) {
  const t = text || '';
  return (
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /wynik\s+przeprowadzonego/i.test(t) ||
    /odby[łl]\s+si[ęe]\s+.*przetarg/i.test(t) ||
    isNegativeOutcome(t) ||
    achievedPriceFromText(t) != null ||
    /nabywc/i.test(t)
  );
}

// ── Composed result text ─────────────────────────────────────────────────────

/**
 * Build composed text for parseResultDoc().
 * Combines wynik PDF, announcement PDF, Dotyczy title and Cena wywoławcza cell.
 */
export function buildResultText(dotyczyText, cenaText, wynikPdf = '', announcementPdf = '') {
  return [
    wynikPdf || '',
    announcementPdf || '',
    dotyczyText || '',
    cenaText ? `Cena wywoławcza: ${cenaText}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Fallback composed text for a negative row with no wynik attachment. */
export function buildNegativeResultText(row) {
  return `${buildResultText(row.dotyczyText, row.cenaText, '', '')}\nPrzetarg zakończył się wynikiem negatywnym.`;
}

// ── Announcement (crawlActive → listing) ────────────────────────────────────

/**
 * Build an active FLAT listing from a status=0 board row + optional announcement PDF.
 */
export function parseAnnouncement(row, pdfBody, pdfUrl) {
  const body = pdfBody || '';
  const title = (row && row.dotyczyText) || '';
  if (isLeaseRow(title)) return null;
  if (classifyKind(body || title) !== 'mieszkalny') return null;

  const address_raw = extractFlatAddress(body) || extractFlatAddress(title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const notes = [];
  if (address.warning) notes.push(address.warning);

  let starting_price_pln = startingPriceFromText((row && row.cenaText) || '');
  if (starting_price_pln == null) starting_price_pln = startingPriceFromText(body);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: flatAreaFromText(body),
    starting_price_pln,
    auction_date: dateOnly(row && row.auctionDateRaw),
    round: roundFromText(title) ?? roundFromText(body),
    detail_url: (row && row.detailUrl) || null,
    source_url: pdfUrl || (row && row.detailUrl) || null,
    notes,
  };
}

// ── Result (crawlResultDocs → parseResultDoc) ───────────────────────────────

/**
 * Parse a composed result text into concluded FLAT records.
 *
 * @param {string} text Composed result text
 * @param {string|null} [fallbackDate] Auction date from board row
 * @param {string|null} [sourceUrl] Result PDF attachment URL
 * @returns {Array<object>} 0 or 1 record
 */
export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = String(text).replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];
  if (!isResultNotice(t)) return [];

  const negative = isNegativeOutcome(t);
  const achieved = achievedPriceFromText(t);
  const sold = !negative && achieved != null;
  if (!sold && !negative) return [];

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);
  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [
    {
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: flatAreaFromText(t),
      notes,
    },
  ];
}
