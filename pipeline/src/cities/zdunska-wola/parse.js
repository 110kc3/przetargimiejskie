import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `ADRES: ${stripHtml(f.adres)}`,
    `RODZAJ: ${stripHtml(f.rodzaj)}`,
    `CENA: ${stripHtml(f.cena)}`,
    `DATA: ${stripHtml(f.data)}`,
    `ROZSTRZYGNIECIE: ${stripHtml(f.rozstrzygniecie)}`,
    `PRZETARGNA: ${stripHtml(f.przetargNa)}`,
    `TRESC: ${stripHtml(f.tresc)}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function freeText(text) {
  return [field(text, 'PRZETARGNA'), field(text, 'TRESC'), field(text, 'ROZSTRZYGNIECIE')].join(' ');
}


export function hasResolution(text) {
  return field(text, 'ROZSTRZYGNIECIE').length > 0;
}

export function isSkippable(text) {
  const t = text || '';
  return (
    /bezprzetargow/i.test(t) ||
    /na\s+rzecz\s+najemc/i.test(t) ||
    /dzier[żz]aw/i.test(t) ||
    /\bnajem\b/i.test(t) ||
    /\bTBS\b/.test(t)
  );
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
  'siódm': 7, siodm: 7, 'ósm': 8, osm: 8, 'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

function ordinalToRound(token) {
  const r = romanToInt(token);
  if (r) return r;
  const key = token.toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  return null;
}

export function roundFromText(text) {
  const na = field(text, 'PRZETARGNA');
  let m = /^\s*([IVXL]{1,5})\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  m = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  for (const label of ['TRESC', 'ROZSTRZYGNIECIE']) {
    const t = field(text, label);
    m = /\b([IVXL]{1,5})\s+(?:przetarg|rokowani)/i.exec(t);
    if (m) {
      const r = romanToInt(m[1]);
      if (r) return r;
    }
    m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:przetarg|rokowani)/i.exec(t);
    if (m) {
      const r = ordinalToRound(m[1]);
      if (r) return r;
    }
  }
  return null;
}


export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const tresc = field(text, 'TRESC');
  const PL_MONTH = {
    stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
    lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
    'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
  };
  m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tresc);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}


export function startingPriceFromText(text) {
  const cena = field(text, 'CENA');
  const m = /^(\d[\d.\s ]*(?:,\d{2})?)/.exec(cena);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  if (!roz) return null;
  const m = /za\s+cen[ęe]\s+(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(roz);
  return m ? parsePLN(m[1]) : null;
}

export function buyerFromText(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  const m = /Osob(?:ami|ą)\s+wy[łl]on\w*\s+w\s+wyniku\s+przeprowadzonego\s+przetargu\s+zosta[łl]\w*\s+([^,]+?),\s*kt[óo]r/i.exec(roz);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function isPositiveOutcome(text) {
  return /wynikiem\s+pozytywnym/i.test(field(text, 'ROZSTRZYGNIECIE'));
}

export function isNegativeOutcome(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  return /wynikiem\s+negatywnym|nie\s+w(?:p[łl]aci|niesi)\w*\s+wadi|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi[łl]\s+ż|brak\s+ofert|uniewa[żz]ni/i.test(roz);
}


export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  if (/nieruchomo[śs][ćc]\s+lokalow/i.test(rodzaj)) {
    return /lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)/i.test(freeText(text)) ? 'uzytkowy' : 'mieszkalny';
  }
  return classifyKind(field(text, 'PRZETARGNA'));
}


function cleanAdres(raw) {
  return (raw || '')
    .replace(/^\s*Zdu[nń]ska\s+Wola\s*,?\s*/i, '')
    .replace(/\bw\s+Zdu[nń]skiej\s+Woli\b/gi, ' ')
    .replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNIT_SUFFIX_RE = /\s+lokal\s+nr\s+(\d+[A-Za-z]?)\s*$/i;

export function addressRawFromText(text) {
  let s = cleanAdres(field(text, 'ADRES'));
  if (!s) return null;
  s = s.replace(/^(?:ul|al|pl|os)\.\s*/i, '');
  let unit = null;
  const um = UNIT_SUFFIX_RE.exec(s);
  if (um) {
    unit = um[1];
    s = s.slice(0, um.index).trim();
  }
  const bldgM = /^(.+?)\s+(?:nr\.?\s+)?(\d+[A-Za-z]?)\s*$/.exec(s);
  const street = bldgM ? bldgM[1].trim() : s;
  const building = bldgM ? bldgM[2] : null;
  if (!street) return null;
  return `ul. ${street}${building ? ` ${building}` : ''}${unit ? `/${unit}` : ''}`;
}

const UNIT_AREA_RE =
  /lokal\w*(?:\s+mieszkaln\w+|\s+u[żz]ytkow\w+)?[\s\S]{0,60}?o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2](?!\d)/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(freeText(text));
  return m ? parseArea(m[1]) : null;
}

const PLOT_LIST_RE =
  /dzia[łl]\w*\s+(\d+(?:\/\d+)?(?:\s*(?:,|i)\s*\d+(?:\/\d+)?)*)\s+o\s+[łl][ąa]cznej\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i;
const PLOT_SINGLE_RE =
  /dzia[łl]\w*\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i;

export function plotFromText(text) {
  const s = freeText(text);
  let m = PLOT_LIST_RE.exec(s);
  if (m) {
    const parcels = m[1].split(/\s*(?:,|i)\s*/).filter((p) => /^\d+(?:\/\d+)?$/.test(p));
    const area = Number(m[2].replace(',', '.'));
    return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2: area > 0 ? Math.round(area) : null };
  }
  m = PLOT_SINGLE_RE.exec(s);
  if (m) {
    const area = Number(m[2].replace(',', '.'));
    return { dzialka_nr: m[1], area_m2: area > 0 ? Math.round(area) : null };
  }
  return { dzialka_nr: null, area_m2: null };
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = plotFromText(text);
    const address_raw = addressRawFromText(text);
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!hasResolution(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const buyer = sold ? buyerFromText(text) : null;
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = plotFromText(text);
    const address_raw = addressRawFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        buyer,
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      buyer,
      notes,
    },
  ];
}
