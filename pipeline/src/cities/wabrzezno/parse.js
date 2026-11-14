import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const WORD_ORDINAL = [
  [/^pierwsz/i, 1],
  [/^drug/i, 2],
  [/^trzec/i, 3],
  [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5],
  [/^sz[óo]st/i, 6],
  [/^si[óo]dm/i, 7],
  [/^[óo]sm/i, 8],
];

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
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
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
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

const PLW = 'a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ';


export function isSaleAuction(text) {
  const t = whole(text);
  if (/zaproszenie\s+do\s+(?:sk[łl]adania|z[łl]o[żz]enia)\s+ofert/i.test(t)) return false;
  return /przetarg/i.test(t) && /(sprzeda[żz]|zbyci)/i.test(t);
}

export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t)
    || /z[łl]\s*\/?\s*miesi[ęe]cznie|\bmiesi[ęe]cznie\b/i.test(t);
}

export function isRokowania(title) {
  return /\brokowani/i.test(String(title || ''));
}

export function isResultDoc(text) {
  const title = field(text, 'TITLE');
  const t = whole(text);
  if (/informacj\w*\s+(?:o\s+wynik|dotycz)/i.test(title)) return true;
  return /\binformuj[ęe]\b/i.test(t)
    && /(wynikiem\s+negatywnym|zako[ńn]czy[łl]\w*\s+si[ęe]|osi[ąa]gni[ęe]t|zosta[łl]\s+nabywc|nabywc[ąa]\s+\w+\s+zosta)/i.test(t);
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+negatywn\w*|zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynik\w*\s+negatywn|brak\s+ofert|nikt\s+nie\s+(?:zosta[łl]|wp[łl]aci|przyst[ąa]pi)|nie\s+wzi[ąeą][łl]\s+udzia[łl]|uniewa[żz]ni/i.test(t);
}


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

function wordOrdinalToInt(word) {
  for (const [re, n] of WORD_ORDINAL) if (re.test(word)) return n;
  return null;
}

export function roundFromText(text) {
  const t = whole(text);
  let m = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*)\s+(?:nie)?ograniczon\w+\s+(?:pisemn\w+\s+)?przetarg/i.exec(t);
  if (m) {
    const n = wordOrdinalToInt(m[1]);
    if (n) return n;
  }
  m = /\b([IVXL]{1,4})\s+(?:(?:nie)?ograniczon\w+\s+(?:pisemn\w+\s+)?)?przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
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
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe]\s+dnia\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`przeprowadzon\w*\s+w\s+dniu\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`og[łl]oszon\w*\s+na\s+dzie[ńn]\s+${DATE_TOKEN}`, 'i'),
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


const AMOUNT = String.raw`(\d{1,3}(?:[.\s ]\d{3})*,\d{2})`;
const PRICE_RE = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[^,]{0,60}?${AMOUNT}\s*z[łl]`, 'i');

export function startingPriceFromText(text) {
  const m = PRICE_RE.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  if (/nikt\s+nie\s+zosta[łl]\s+nabywc/i.test(t)) return null;
  const m = new RegExp(String.raw`osi[ąa]gni[ęe]t\w*[^0-9]{0,40}?${AMOUNT}\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function kindFromText(text) {
  return classifyKind(whole(text));
}


const FLAT_ADDR_RE =
  /przy\s+ulic\w*\.?\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘꟳÓóŃńĄą.\- ]+?)\s+nr\s+(\d+[A-Za-z]?)\b/i;

const LOKAL_RE = /lokalu?\s+(?:nie)?mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;

const UNIT_AREA_RE = /powierzchni\w*\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]?/i;

function flatSegments(body) {
  const re = new RegExp(LOKAL_RE.source, 'gi');
  const starts = [];
  let m;
  while ((m = re.exec(body)) !== null) starts.push(m.index);
  if (starts.length <= 1) return [body];
  const segs = [];
  for (let i = 0; i < starts.length; i++) {
    segs.push(body.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : body.length));
  }
  return segs;
}

export function flatAddressRaw(segment) {
  const a = FLAT_ADDR_RE.exec(segment);
  if (!a) return null;
  const street = a[1].trim().replace(/\s+/g, ' ');
  const building = a[2];
  const u = LOKAL_RE.exec(segment);
  const apt = u ? u[1] : null;
  return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
}

export function unitAreaFromText(segment) {
  const m = UNIT_AREA_RE.exec(segment);
  return m ? parseNum(m[1]) : null;
}


export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const add = (p) => { if (p && !seen.has(p)) { seen.add(p); parcels.push(p); } };

  const reP = new RegExp(
    `dzia[łl]k[${PLW}]*\\s+(?:ewidencyjn[${PLW}]*\\s+)?(?:o\\s+)?nr\\s*:?\\s*(\\d+(?:\\/\\d+)?)`,
    'gi',
  );
  let m;
  while ((m = reP.exec(t)) !== null) {
    add(m[1]);
    const tail = t.slice(reP.lastIndex, reP.lastIndex + 80);
    const run = /^((?:\s*,\s*\d+(?:\/\d+)?)+)/.exec(tail);
    if (run) for (const p of run[1].match(/\d+(?:\/\d+)?/g) || []) add(p);
  }

  let area_m2 = null;
  const am = /o\s+(?:[łl][ąa]cznej\s+)?(?:powierzchni|pow\.?)\s*(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

export function landStreetFromText(text) {
  const re = /przy\s+ul(?:ic\w*|\.)\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘꟳÓóŃńĄą.\- ]{2,40}?)(\s+nr\s+\d|\s+i\s+|,|\.|;|$)/gi;
  let m;
  while ((m = re.exec(whole(text))) !== null) {
    if (/^\s+nr\s+\d/.test(m[2])) continue;
    return m[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}


function flatRecord(segment, notionalKind, round, auction_date) {
  const address_raw = flatAddressRaw(segment);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const k = classifyKind(segment);
  const kind = k !== 'unknown' ? k : (notionalKind !== 'unknown' ? notionalKind : 'mieszkalny');
  const rec = {
    kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(segment),
    starting_price_pln: startingPriceFromText(segment),
    auction_date,
    round,
  };
  if (address.warning) rec.notes = [address.warning];
  return rec;
}

export function parseAnnouncement(text) {
  if (!text) return [];
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const body = whole(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln: startingPriceFromText(text),
      auction_date,
      round,
    }];
  }

  const out = [];
  for (const seg of flatSegments(body)) {
    const rec = flatRecord(seg, kind, round, auction_date);
    if (rec) out.push(rec);
  }
  return out;
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const kind = kindFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    return [{
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
    }];
  }

  const address_raw = flatAddressRaw(whole(text));
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
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(whole(text)),
    notes,
  }];
}
