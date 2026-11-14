import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseAreaNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const AREA_RE = /o\s+pow(?:ierzchni)?\.?\s*(?:u[żz]ytkowej)?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseAreaNum(m[1]) : null;
}

const STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s*:?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_PRICE_RE = /cena\s+osi[ąa]gni[ęe]t\w*(?:\s+w\s+przetargu)?\s*:?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const OUTCOME_SENTENCE_RE = /zako[ńn]czy\w*\s*(?:si[ęe])?\s*wynikiem\s+(pozytywn\w*|negatywn\w*)/i;

export function isPositiveOutcome(text) {
  const t = text || '';
  const m = OUTCOME_SENTENCE_RE.exec(t);
  if (m) return /^pozytywn/i.test(m[1]);
  return /pozytywn/i.test(t) && !/negatywn/i.test(t);
}

export function isNegativeOutcome(text) {
  const t = text || '';
  const m = OUTCOME_SENTENCE_RE.exec(t);
  if (m) return /^negatywn/i.test(m[1]);
  return /negatywn/i.test(t);
}

export function isFlatSaleRow(text) {
  const t = text || '';
  if (/najem|dzier[żz]aw/i.test(t)) return false;
  return classifyKind(t) === 'mieszkalny';
}


const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+)/i;
const KLATKA_RE = /w\s+klatce\s+([A-ZĄĆĘŁŃÓŚŹŻ])/i;

const UL_RE = /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(\d{1,4}[A-Za-z]?)\b/u;

const BUDYNEK_NR_RE = /budyn\w*\s+(?:mieszkalnego\s+)?(?:o\s+)?nr\.?\s*(\d{1,4}[A-Za-z]?)/i;

const OBREB_RE = /obr[ęe]b\w*\s*(?:geodezyjny)?\s*\d{3,4}\s+(\p{Lu}\p{Ll}+)\b/u;

const BARE_PLACE_NUM_RE = /\b(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)\s+(\d{1,4}[A-Za-z]?)(?:\/\d+)?\b/u;

const PLACE_STOPWORDS = new Set([
  'sprzedazy', 'sprzedaz', 'lokalu', 'lokal', 'lokalowej', 'mieszkalnego', 'mieszkalny', 'mieszkalna',
  'miedzyrzeczu', 'miedzyrzecz', 'miedzyrzecza', 'sali', 'slubow', 'urzedu', 'miejskiego', 'burmistrz',
  'burmistrza', 'ratusza', 'sad', 'sadu', 'rejonowy', 'rejonowego', 'wydzial', 'wydzialu', 'ksiag', 'ksiege',
  'wieczystych', 'wieczysta', 'dzialka', 'dzialke', 'oznaczona', 'ewidencyjnie', 'obreb', 'geodezyjny',
  'klatce', 'klatka', 'budynku', 'budynek', 'poddaszu', 'parterze', 'pietrze', 'wraz', 'udzialem', 'udzialu',
  'czesci', 'urzadzenia', 'panstwa', 'gmina', 'gminy', 'informacja', 'ogloszenie', 'przetargu', 'przetarg',
  'rady', 'ministrow', 'rozporzadzenia', 'zgodnie', 'oznaczenie', 'nieruchomosci', 'nieruchomosc',
]);

function foldPl(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

function isStopword(word) {
  return PLACE_STOPWORDS.has(foldPl(word).replace(/[^a-z]/g, ''));
}

function hasStopword(phrase) {
  return phrase.trim().split(/\s+/).some(isStopword);
}

const PLACE_LOCATIVE_ENDINGS = [
  ['ej', 'a'],
  ['cy', 'ca'],
];
function nominativePlace(phrase) {
  return phrase
    .split(' ')
    .map((word) => {
      for (const [suffix, repl] of PLACE_LOCATIVE_ENDINGS) {
        if (word.toLowerCase().endsWith(suffix) && word.length > suffix.length) {
          return word.slice(0, -suffix.length) + repl;
        }
      }
      return word;
    })
    .join(' ');
}

function placeNameNear(text, index) {
  const RE = /\bwe?\s+(?:m\.\s+)?(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)\b/u;
  const after = text.slice(index, index + 90);
  const before = text.slice(Math.max(0, index - 90), index);
  for (const window of [after, before]) {
    RE.lastIndex = 0;
    const m = RE.exec(window);
    if (m && !hasStopword(m[1])) return m[1].trim();
  }
  return null;
}

export function extractLokalAddress(text) {
  const t = (text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const lokalM = LOKAL_NR_RE.exec(t);
  if (!lokalM) return null;
  const apt = lokalM[1];

  const scoped = t.slice(lokalM.index, lokalM.index + 500);

  const klatkaM = KLATKA_RE.exec(scoped);
  const klatka = klatkaM ? klatkaM[1].toUpperCase() : '';

  let street = null;
  let building = null;

  const ulM = UL_RE.exec(scoped);
  if (ulM) {
    street = ulM[1].trim();
    building = ulM[2].toUpperCase();
  } else {
    const budM = BUDYNEK_NR_RE.exec(scoped);
    if (budM) {
      building = budM[1].toUpperCase();
      street = placeNameNear(scoped, budM.index);
      if (street) street = nominativePlace(street);
      if (street && !street.includes(' ')) {
        const obrebM = OBREB_RE.exec(scoped);
        if (obrebM && foldPl(obrebM[1]).slice(0, 4) === foldPl(street).slice(0, 4)) {
          street = obrebM[1];
        }
      }
    } else {
      const bareM = BARE_PLACE_NUM_RE.exec(scoped);
      if (bareM && !hasStopword(bareM[1])) {
        street = bareM[1].trim();
        building = bareM[2].toUpperCase();
      }
    }
  }
  if (!street || !building) return null;
  if (klatka && !/[A-Za-z]$/.test(building)) building += klatka;
  return `${street} ${building}/${apt}`;
}


export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}



export function parseActiveRow(row) {
  if (!isFlatSaleRow(row.dotyczyText)) return null;
  const addrRaw = extractLokalAddress(row.dotyczyText);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;
  const firstAttachment = (row.attachments || [])[0] || null;
  return {
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    area_m2: areaFromText(row.dotyczyText),
    starting_price_pln: startingPriceFromText(row.cenaText),
    auction_date: dateOnly(row.auctionDateRaw),
    round: null,
    detail_url: row.detailUrl || null,
    source_url: firstAttachment ? firstAttachment.url : null,
  };
}


export function buildNegativeResultText(row) {
  return [row.dotyczyText, row.cenaText, 'Przetarg zakończył się wynikiem negatywnym.'].join('\n');
}

export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wynik/i.test(text || '') || isNegativeOutcome(text) || isPositiveOutcome(text);
}

export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = text.replace(/\r/g, ' ');
  if (!isFlatSaleRow(t)) return [];

  const negative = isNegativeOutcome(t);
  const positive = !negative && isPositiveOutcome(t);
  if (!negative && !positive) return [];

  const addrRaw = extractLokalAddress(t);
  if (!addrRaw) return [];
  const address = parseAddress(addrRaw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);

  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const achieved = positive ? achievedPriceFromText(t) : null;
  if (positive && achieved == null) notes.push('parse: positive outcome but no achieved price found');
  if (positive && achieved != null && starting_price_pln != null && achieved < starting_price_pln) {
    notes.push('parse: achieved price below starting price — verify row');
  }

  return [{
    auction_date: fallbackDate || null,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    round: null,
    starting_price_pln,
    final_price_pln: positive ? achieved : null,
    outcome: positive ? 'sold' : 'unsold',
    unsold_reason: positive ? null : 'unknown',
    area_m2: areaFromText(t),
    notes,
  }];
}
