import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const WORD_ORDINAL = [
  [/^pierwsz/i, 1], [/^drug/i, 2], [/^trzec/i, 3], [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5], [/^sz[óo]st/i, 6], [/^si[óo]dm/i, 7], [/^[óo]sm/i, 8],
  [/^dziewi[ąa]t/i, 9], [/^dziesi[ąa]t/i, 10],
];

export function parsePLN(numStr) {
  if (!numStr) return null;
  const withoutGrosze = String(numStr).trim().replace(/[.,]\d{2}$/, '');
  const cleaned = withoutGrosze.replace(/[\s., ]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [`TITLE: ${stripHtml(f.title)}`, `BODY: ${stripHtml(f.body)}`].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

export function whole(text) {
  const t = String(text || '');
  const title = field(t, 'TITLE');
  const body = field(t, 'BODY');
  if (!title && !body) return t.trim();
  return `${title} ${body}`.trim();
}


export function isRealEstateSale(text) {
  const t = whole(text);
  if (!/przetarg/i.test(t)) return false;
  if (!/(sprzeda[żz]|zbyci)/i.test(t)) return false;
  if (/bezprzetargow/i.test(t)) return false;
  if (/majątk\w*\s+ruchom|ruchom\w+\s+majątk|sk[łl]adnik\w*\s+rzeczow/i.test(t)) return false;
  if (/samoch[oó]d|samochodu|ci[ąa]gnik|pojazd/i.test(t)) return false;
  return true;
}

export function isLease(text) {
  const t = whole(text);
  return /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem|u[żz]yczeni\w*)/i.test(t)
    || /\bna\s+(?:dzier[żz]aw\w*|najem)\b/i.test(t)
    || /\bw\s+dzier[żz]aw[ęe]\b/i.test(t)
    || /czynsz\w*\s+dzier[żz]aw/i.test(t);
}

export function isResultDoc(text) {
  const t = whole(text);
  if (/informacj\w*\s+o\s+wynik/i.test(t)) return true;
  return /przetarg/i.test(t)
    && (/przeprowadzon\w*/i.test(t) || /odby[łl]\s+si[ęe]\s+(?:w\s+dniu|dnia)/i.test(t));
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+negatywn|brak\s+ofert|nikt\s+nie\s+(?:zosta[łl]|wp[łl]aci|przyst[ąa]pi|z[łl]o[żz]y)|nie\s+wp[łl]yn[ęe][łl]a?\s+[żz]adna\s+wp[łl]ata|nie\s+odnotowano\s+wp[łl]aty|uniewa[żz]ni|(?<!nie\s)dopuszczono\s*:?\s*0\s+os[óo]b/i.test(t);
}


export function roundFromText(text) {
  const t = whole(text);
  const m = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+(?:(?:ustn\w*|nieograniczon\w*|ograniczon\w*|pisemn\w*|publiczn\w*)\s+){0,3}przetarg/i.exec(t);
  if (!m) return null;
  for (const [re, n] of WORD_ORDINAL) if (re.test(m[1])) return n;
  return null;
}


function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function parseDatePhrase(phrase) {
  const s = String(phrase || '').trim();
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(s);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(s);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

const DATE_TOKEN = String.raw`(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})`;

export function auctionDateFromText(text) {
  const t = whole(text);
  const patterns = [
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe][\s\S]{0,300}?(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`odby[łl]\s+si[ęe]\s+(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`przeprowadzon\w*\s+(?:w\s+dniu|dnia)\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`\bw\s+dniu\s+${DATE_TOKEN}\s+o\s+godz`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) {
      const iso = parseDatePhrase(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}


const AMOUNT = String.raw`(\d{1,3}(?:[.\s ]\d{3})*(?:,\d{2})?)`;

export function startingPriceFromText(text) {
  const m = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[\s\S]{0,600}?${AMOUNT}\s*z[łl]`, 'i').exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

export function buyerName(text) {
  const t = whole(text);
  const m = /nabywc\p{L}*(?:\s+\p{L}+){0,3}?\s+zosta\p{L}*(?:\s*\/\s*\p{L}+)?\s*[:–\-]*\s*(.*?)(?=\s{2,}|\bLp\b|\bCena\b|\bStarosta\b|\bLicz\p{L}+\b|\bBUR\b|\bZ\s+up\b|[.\n]|$)/iu.exec(t);
  if (!m) return null;
  const cand = m[1].replace(/^\s*\d+\)\s*/, '').trim();
  if (/^[\s–\-]*$/.test(cand)) return null;
  if (/^nikt\b/i.test(cand)) return null;
  if (!/\p{L}{2,}/u.test(cand)) return null;
  return cand;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!buyerName(t)) return null;
  const m = new RegExp(
    String.raw`(?:osi[ąa]gni[ęe]t\w*|uzyskan\w*|wynios[łl]\w*)[\s\S]{0,40}?${AMOUNT}\s*z[łl]`, 'i',
  ).exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function kindFromText(text) {
  return classifyKind(whole(text));
}


const OFFICE_RE = /tysi[ąa]clecia|1000-?lecia/i;
const STREET_TOKEN = '[A-ZŁŚŻŹĆŃÓĄĘ][\\p{L}.\\-]*';
const STREET_CONT = `(?:${STREET_TOKEN}|\\d{3,4}-?lecia)`;
const STREET_BLDG_SRC =
  `(?:przy\\s+ulic\\w+|(?:^|\\s)ul\\.)\\s+(${STREET_TOKEN}(?:\\s+${STREET_CONT}){0,2})\\s+(\\d+[A-Za-z]?)\\b`;

export function flatStreetBuilding(text) {
  const re = new RegExp(STREET_BLDG_SRC, 'giu');
  const t = whole(text);
  let m;
  while ((m = re.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_RE.test(street)) continue;
    return { street, building: m[2] };
  }
  return null;
}

const UNIT_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

export function unitFromText(text) {
  const m = UNIT_RE.exec(whole(text));
  return m ? m[1] : null;
}

export function flatAddressRaw(text) {
  const sb = flatStreetBuilding(text);
  if (!sb) return null;
  const unit = unitFromText(text);
  return unit ? `${sb.street} ${sb.building}/${unit}` : `${sb.street} ${sb.building}`;
}

const UNIT_AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]?/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}


export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const add = (p) => { if (p && !seen.has(p)) { seen.add(p); parcels.push(p); } };
  const reP = /(?:dzia[łl]k\w*|nr\s+geod\w*\.?|nr\s+ewid\w*\.?)\s*:?\s*(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) add(m[1]);

  let area_m2 = null;
  const am = /o\s+(?:[łl][ąa]cznej\s+)?(?:powierzchni|pow\.?)\s*(\d+(?:[.,]\d+)?)\s*(ha|m)/i.exec(t);
  if (am) {
    const v = parseNum(am[1]);
    if (v != null) area_m2 = /ha/i.test(am[2]) ? Math.round(v * 10000) : Math.round(v);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}


export function parseAnnouncement(text) {
  if (!text) return [];
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    if (!plot.dzialka_nr && plot.area_m2 == null) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: null,
      starting_price_pln,
      auction_date,
      round,
    }];
  }

  const address_raw = flatAddressRaw(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  const rec = {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
  if (address.warning) rec.notes = [address.warning];
  return [rec];
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultDoc(text) || isLease(text)) return [];
  const kind = kindFromText(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const buyerNamed = Boolean(buyerName(text));
  const negativeStated = isNegativeOutcome(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (buyerNamed && achieved == null) notes.push('parse: buyer named but achieved price not found');
  if (!buyerNamed && !negativeStated) notes.push('parse: no buyer and no explicit negative outcome');

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    if (!plot.dzialka_nr && plot.area_m2 == null) return [];
    return [{
      auction_date,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: null,
      round,
      starting_price_pln,
      final_price_pln: buyerNamed ? achieved : null,
      outcome: buyerNamed ? 'sold' : 'unsold',
      unsold_reason: buyerNamed ? null : 'unknown',
      notes,
    }];
  }

  const address_raw = flatAddressRaw(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  return [{
    auction_date,
    source_url: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: buyerNamed ? achieved : null,
    outcome: buyerNamed ? 'sold' : 'unsold',
    unsold_reason: buyerNamed ? null : 'unknown',
    area_m2: unitAreaFromText(text),
    notes,
  }];
}
