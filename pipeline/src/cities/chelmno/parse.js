
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
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


export function hasResolution(text) {
  return field(text, 'ROZSTRZYGNIECIE').length > 0;
}

export function isLease(text) {
  const t = text || '';
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$/im.test(t);
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

export function roundFromText(text) {
  const tresc = field(text, 'TRESC');
  let m = /og[łl]asza\s+([IVXL]{1,5})\s+przetarg/i.exec(tresc);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  m = /og[łl]asza\s+(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg/i.exec(tresc);
  if (m) {
    const key = m[1].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  }
  const na = field(text, 'PRZETARGNA');
  m = /\b([IVXL]{1,5})\s+przetarg\w*\s+ustn/i.exec(na);
  if (m) return romanToInt(m[1]);
  return null;
}


export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const tresc = field(text, 'TRESC');
  m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tresc);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}


export function startingPriceFromText(text) {
  const tresc = field(text, 'TRESC');
  let m = /cena\s+wywo[łl]awcza\s+wynosi\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(tresc);
  if (!m) {
    const cena = field(text, 'CENA');
    m = /(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(cena);
  }
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  if (!/nabywc/i.test(roz)) return null;
  const m = /za\s+cen[ęe]\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(roz);
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeOutcome(text) {
  const roz = field(text, 'ROZSTRZYGNIECIE');
  return /wynikiem\s+negatywnym|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano/i.test(roz);
}


export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  const na = field(text, 'PRZETARGNA');
  return classifyKind(na);
}


function cleanAdres(raw) {
  let s = (raw || '')
    .replace(/\b\d{2}-\d{3}\b/g, ' ')
    .replace(/\bw\s+che[łl]mnie\b/gi, ' ')
    .replace(/\bche[łl]mn(?:o|a|ie|em)\b/gi, ' ')
    .replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;.\-]+|[\s,;.\-]+$/g, '')
    .trim();
  return s;
}

function flatNoFromText(text) {
  const s = `${field(text, 'PRZETARGNA')} ${field(text, 'TRESC')}`;
  const m = /lokal\w*\s+mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(s);
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  const cleaned = cleanAdres(field(text, 'ADRES')).replace(/^.*?\bprzy\s+ul\.\s*/i, '');
  if (!cleaned) return null;
  if (/\d+[A-Za-z]?\s*\/\s*\d+/.test(cleaned)) return cleaned;
  const flat = flatNoFromText(text);
  return flat ? `${cleaned}/${flat}` : cleaned;
}

const UNIT_AREA_RE =
  /(?:lokal\w*\s+mieszkaln\w+|lokal\w*\s+u[żz]ytkow\w+|pomieszcz\w+\s+przynale[żz]n\w+)[\s\S]{0,80}?o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(field(text, 'TRESC'));
  return m ? parseArea(m[1]) : null;
}

function landPlotFromText(text) {
  const adres = field(text, 'ADRES');
  const parcels = [];
  const seen = new Set();
  const reP = /\bdz(?:ia[łl]k\w*)?\.?\s*(?:nr\s*)?(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(adres)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const ah = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+[.,]\d+)\s*ha\b/i.exec(field(text, 'TRESC'));
  if (ah) {
    const ha = Number(ah[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
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
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
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
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
