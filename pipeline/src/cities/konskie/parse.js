//       "Przedmiotem sprzedaży jest spółdzielcze własnościowe prawo do lokalu
//        Przedmiotem sprzedaży jest lokal mieszkalny nr 4 położony w

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const SALE_OBJECT_IS_PLOT_RE = /(?:zbycie|sprzeda[żz]\w*)\s+zabudowan\w*\s+dzia[łl]k/i;
export function flatKindFromText(text) {
  const k = classifyKind(text);
  if (k === 'mieszkalny' && SALE_OBJECT_IS_PLOT_RE.test(text || '')) return 'zabudowana';
  return k;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeText(raw) {
  return (raw || '').replace(/\s+/g, ' ').trim();
}


const APT_RE = /(?:lokal\w*\s+mieszkaln\w*\s+(?:nr|numer)|oznaczon\w*\s+numerem)\s+(\d+[A-Za-z]?)/i;
export function aptFromText(text) {
  const m = APT_RE.exec(text || '');
  return m ? m[1] : null;
}

const STREET_BUILDING_RE = /po[łl]o[żz]on\w*[^.]{0,60}?przy\s+(?:ul\.|ulicy)\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\d,.]+?)\s+(\d+[A-Za-z]?)\b/i;
export function streetBuildingFromText(text) {
  const m = STREET_BUILDING_RE.exec(text || '');
  if (!m) return null;
  return { street: m[1].replace(/\s+/g, ' ').trim(), building: m[2] };
}

export function addressRawFromText(text) {
  const sb = streetBuildingFromText(text);
  if (!sb) return null;
  const apt = aptFromText(text);
  return apt ? `${sb.street} ${sb.building}/${apt}` : `${sb.street} ${sb.building}`;
}

export function addressFromText(text) {
  const raw = addressRawFromText(text);
  return raw ? parseAddress(raw) : null;
}

const AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w*\s+(\d+[.,]\d+)\s*m/i;
export function areaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

const START_PRICE_RE = /Cena\s+(?:wywo[łl]awcza\s+)?(?:\S+\s+)?wynosi(?:[łl]a)?\s*[-–]?\s*(\d[\d\s.,]*?)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = START_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_PRICE_RE = /Najwy[żz]sz[ąa]\s+cen[ęa]\s+osi[ąa]gni[ęe]t[ąa][\s\S]{0,60}?(\d[\d\s.,]*?)\s*z[łl]/i;
const BUYER_PRICE_RE = /nabywc[ąa][\s\S]{0,150}?za\s+cen[ęe]\s+(\d[\d\s.,]*?)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  let m = ACHIEVED_PRICE_RE.exec(text || '');
  if (m) return parsePLN(m[1]);
  m = BUYER_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const NEGATIVE_RE = /wynik\w*\s+negatywn|nie\s+wy[łl]oniono\s+nabywcy|nikt\s+nie\s+przyst[ąa]pi[łl]/i;
export function isNegativeOutcome(text) {
  return NEGATIVE_RE.test(text || '');
}

const ROUND_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4], ['piąt', 5], ['piat', 5],
];
function roundFromStem(word) {
  const w = (word || '').toLowerCase();
  for (const [stem, val] of ROUND_STEMS) if (w.startsWith(stem)) return val;
  return null;
}
const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VAL[up[i]];
    const next = ROMAN_VAL[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}
const ANNOUNCE_ROUND_RE = /og[łl]asza\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|[IVXL]{1,4})\s+przetarg/i;
const RESULT_ROUND_RE = /wynikach\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+przetarg/i;
export function roundFromText(text) {
  const t = text || '';
  let m = ANNOUNCE_ROUND_RE.exec(t);
  if (m) {
    const word = m[1];
    const r = /^[IVXL]+$/i.test(word) ? romanToInt(word) : roundFromStem(word);
    if (r) return r;
  }
  m = RESULT_ROUND_RE.exec(t);
  if (m) {
    const r = roundFromStem(m[1]);
    if (r) return r;
  }
  return null;
}

const DATE_SCHEDULED_RE = /odb[ęe]dzie\s+si[ęe][^.]{0,40}?(?:dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i;
const DATE_HELD_RE = /przeprowadzon\w*[^.]{0,40}?(?:dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i;
export function auctionDateFromText(text) {
  const t = text || '';
  const m = DATE_SCHEDULED_RE.exec(t) || DATE_HELD_RE.exec(t);
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

const SHARE_RE = /udziale?\s+wynosz[ąa]cym\s+(\d+\/\d+)\s+cz[ęe][śs]ci/i;
export function shareFromText(text) {
  const m = SHARE_RE.exec(text || '');
  return m ? m[1] : null;
}


export function publishedDateFromDetail(html) {
  if (!html) return null;
  const m = /Data wytworzenia dokumentu:\s*<span>(\d{2})\.(\d{2})\.(\d{4})<\/span>/i.exec(html);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const PL_MONTHS_GEN = { ...PL_MONTHS };
  const m2 = /Data wprowadzenia dokumentu do BIP:\s*<span>(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(html);
  if (m2) {
    const mon = PL_MONTHS_GEN[m2[2].toLowerCase()];
    if (mon) return iso(m2[3], mon, m2[1]);
  }
  return null;
}

export function attachmentPdfUrlFromDetail(html) {
  if (!html) return null;
  const m = /href="(https?:\/\/bip-v1-files\.idcom-jst\.pl[^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}


export function parseAnnouncement(rawText, meta = {}) {
  const text = normalizeText(rawText);
  if (!text) return null;
  if (flatKindFromText(text) !== 'mieszkalny') return null;
  const address = addressFromText(text);
  if (!address) return null;
  const share = shareFromText(text);
  return {
    kind: 'mieszkalny',
    address_raw: addressRawFromText(text),
    address,
    area_m2: areaFromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text),
    detail_url: meta.detailUrl ?? null,
    published_date: meta.publishedDate ?? null,
    ...(share ? { share } : {}),
  };
}

export function parseResultDoc(rawText, fallbackDate, sourceUrl) {
  const text = normalizeText(rawText);
  if (!text) return [];
  if (flatKindFromText(text) !== 'mieszkalny') return [];
  const address = addressFromText(text);
  if (!address) return [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const negative = isNegativeOutcome(text);
  const achieved = negative ? null : achievedPriceFromText(text);
  const sold = achieved != null;
  const share = shareFromText(text);

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
    address,
    kind: 'mieszkalny',
    address_raw: addressRawFromText(text),
    auction_date,
    round,
    area_m2: areaFromText(text),
    starting_price_pln,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'no_buyer',
    final_price_pln: sold ? achieved : null,
    source_pdf: sourceUrl,
    notes,
    ...(share ? { share } : {}),
  }];
}
