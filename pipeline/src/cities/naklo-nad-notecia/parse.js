
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


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
  const przetargNa = [stripHtml(f.przetargNa), stripHtml(f.tresc)].filter(Boolean).join(' ');
  return [
    `ADRES: ${stripHtml(f.adres)}`,
    `RODZAJ: ${stripHtml(f.rodzaj)}`,
    `CENA: ${stripHtml(f.cena)}`,
    `DATA: ${stripHtml(f.data)}`,
    `TYP: ${stripHtml(f.typ)}`,
    `WYNIK: ${stripHtml(f.wynik)}`,
    `PRZETARGNA: ${przetargNa}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}


export function hasResolution(text) {
  return field(text, 'WYNIK').length > 0;
}

export function isLease(text) {
  const t = text || '';
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$|rocznie\s*$/im.test(t);
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
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  m = /^\s*(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+(?:przetarg|rokowani)/i.exec(na);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  const wynik = field(text, 'WYNIK');
  m = /przeprowadzon\w*\s+zosta[łl]\w*\s+([IVXL]{1,5}|pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+(?:przetarg|rokowani)/i.exec(wynik);
  if (m) {
    const r = ordinalToRound(m[1]);
    if (r) return r;
  }
  return null;
}


export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const na = field(text, 'PRZETARGNA');
  m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(na);
  if (m) {
    const PL_MONTH = {
      stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
      lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
      'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
    };
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}


export function startingPriceFromText(text) {
  const cena = field(text, 'CENA');
  let m = /^(\d[\d. ]*(?:,\d{2})?)/.exec(cena);
  if (m) return parsePLN(m[1]);
  const na = field(text, 'PRZETARGNA');
  m = /cena\s+wywo[łl]awcza[^.]{0,20}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(na);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (!/nabywc/i.test(wynik)) return null;
  let m = /za\s+cen[ęe]\s*:?\s*(\d[\d.,\s]*\d)\s*z[łl]\w*/i.exec(wynik);
  if (!m) m = /w\s+wysoko[śs]ci\s*:?\s*(\d[\d.,\s]*\d)\s*z[łl]\w*/i.exec(wynik);
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeOutcome(text) {
  const wynik = field(text, 'WYNIK');
  return /wynikiem\s+negatywnym|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano/i.test(wynik);
}


export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  return classifyKind(field(text, 'PRZETARGNA'));
}


function cleanAdres(raw) {
  let s = raw || '';
  const lastComma = s.lastIndexOf(',');
  if (lastComma !== -1) s = s.slice(0, lastComma);
  s = s
    .replace(/\b\d{2}-\d{3}\b/g, ' ')
    .replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;.\-]+|[\s,;.\-]+$/g, '')
    .trim();
  return s;
}

function flatNoFromText(text) {
  const s = field(text, 'PRZETARGNA');
  const m = /lokal\w*\s+mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(s);
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  const cleaned = cleanAdres(field(text, 'ADRES'));
  if (!cleaned) return null;
  if (/\d+[A-Za-z]?\s*\/\s*\d+/.test(cleaned)) return cleaned;
  const flat = flatNoFromText(text);
  return flat ? `${cleaned}/${flat}` : cleaned;
}

const UNIT_AREA_RE =
  /(?:lokal\w*\s+mieszkaln\w+|lokal\w*\s+u[żz]ytkow\w+|pomieszcz\w+\s+przynale[żz]n\w+)[\s\S]{0,80}?o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(field(text, 'PRZETARGNA'));
  return m ? parseArea(m[1]) : null;
}

function landPlotFromText(text) {
  const adres = field(text, 'ADRES');
  const parcels = [];
  const seen = new Set();
  const reP = /\bdz(?:ia[łl]k\w*)?\.?\s*(?:ewid\.?\s*)?(?:nr\s*)?(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(adres)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const ah = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+[.,]\d+)\s*ha\b/i.exec(field(text, 'PRZETARGNA'));
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
