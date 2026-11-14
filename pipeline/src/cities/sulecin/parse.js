
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function foldPl(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseHa(s) {
  if (!s) return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function haToM2(s) {
  const ha = parseHa(s);
  return ha != null ? Math.round(ha * 10000) : null;
}

function parseAreaM2(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function monthNum(word) {
  return PL_MONTHS[foldPl(word)] || null;
}


const ROMAN_VALUES = { I: 1, V: 5, X: 10 };
function romanToRound(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VALUES[up[i]];
    const next = ROMAN_VALUES[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 20 ? total : null;
}

const ROUND_WORD_PREFIXES = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piat', 5], ['szost', 6], ['siodm', 7], ['osm', 8],
];
function wordToRound(word) {
  const f = foldPl(word);
  for (const [prefix, n] of ROUND_WORD_PREFIXES) {
    if (f.startsWith(prefix)) return n;
  }
  return null;
}

const ANNOUNCE_ROUND_RE =
  /ogłasza\s+([IVXivx]+|pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*)\s+przetarg/i;

export function announceRoundFromText(text) {
  const m = ANNOUNCE_ROUND_RE.exec(text || '');
  if (!m) return null;
  const token = m[1];
  return /^[IVXivx]+$/.test(token) ? romanToRound(token) : wordToRound(token);
}


const ANNOUNCE_DATE_RE = /w\s+dniu\s+(\d{1,2})\s+(\S+)\s+(\d{4})\s+r(?:oku|\.)/i;

export function announceDateFromText(text) {
  const m = ANNOUNCE_DATE_RE.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

const RESULT_DATE_RE = /(\d{1,2})\s+(\S+)\s+(\d{4})\s*r\.,\s*Urz[ąa]d/i;

export function resultDateFromText(text) {
  const m = RESULT_DATE_RE.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}


export function kindFromText(text) {
  const t = text || '';
  const i = t.indexOf('ogłasza');
  const header = i === -1 ? t.slice(0, 600) : t.slice(i, i + 400);
  return classifyKind(header);
}


export function isLease(text) {
  return /dzier[żz]aw|\bnajem\b/i.test(text || '');
}


const ANNOUNCE_FLAT_ADDR_RE =
  /^[ \t]*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+(\d{1,4}[A-Za-z]?)\/(\d{1,4}[A-Za-z]?)\s*,\s*gmina\s+Sul[ęe]cin/m;

export function announceFlatAddressRaw(text) {
  const m = ANNOUNCE_FLAT_ADDR_RE.exec(text || '');
  return m ? `${m[1]} ${m[2]}/${m[3]}` : null;
}

const UNIT_AREA_RE = /lokalu\s+mieszkalnego:?\s*(\d+(?:[.,]\d+)?)\s*m/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseAreaM2(m[1]) : null;
}


const ANNOUNCE_FLAT_TABLE_RE =
  /gmina\s+Sul[ęe]cin\s+(\d{1,4}\/\d{1,4})\s+(\d+[.,]\d+)\s+\S+\s+(\d{1,3}(?:[\s .]\d{3})*,\d{2})\s+(\d{1,3}(?:[\s .]\d{3})*,\d{2})/;

const OBREB_NAME_RE = /obr[ęe]b:?\s*(\d{1,4})\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/;

function announceFlatTable(text) {
  const m = ANNOUNCE_FLAT_TABLE_RE.exec(text || '');
  if (!m) return null;
  const obrebM = OBREB_NAME_RE.exec(text || '');
  return {
    dzialka_nr: m[1],
    obreb: obrebM ? obrebM[1] : null,
    starting_price_pln: parsePLN(m[3]),
  };
}

const HA_TOKEN_RE = /(\d{1,4}[A-Za-z]?\/\d{1,4}[A-Za-z]?|\d{1,4})\s+(\d+[.,]\d{4})\b/;
const MONEY_TOKEN_RE = /\d{1,3}(?:[\s .]\d{3})*,\d{2}/g;

function earlyObrebFromText(text) {
  const t = text || '';
  const cut = t.indexOf('Opis działki');
  const scope = cut > -1 ? t.slice(0, cut) : t.slice(0, 2500);
  const m = /obr[ęe]b\w*\s*(\d{1,4})/.exec(scope);
  return m ? m[1] : null;
}

function announceLandRow(text) {
  const t = text || '';
  const haM = HA_TOKEN_RE.exec(t);
  if (!haM) return null;

  const cut = t.indexOf('Opis działki');
  const scope = cut > -1 ? t.slice(haM.index, cut) : t.slice(haM.index, haM.index + 400);
  const moneys = scope.match(MONEY_TOKEN_RE) || [];
  if (moneys.length < 2) return null;
  const [cena, wadium] = moneys.slice(-2);
  const cenaN = parsePLN(cena);
  const wadiumN = parsePLN(wadium);
  if (cenaN != null && wadiumN != null && wadiumN >= cenaN) return null;

  return {
    dzialka_nr: haM[1],
    obreb: earlyObrebFromText(t),
    area_m2: haToM2(haM[2]),
    starting_price_pln: cenaN,
  };
}


export function parseAnnouncement(text, ctx = {}) {
  if (!text) return [];
  if (isLease(text)) return [];
  const kind = kindFromText(text);
  const round = announceRoundFromText(text);
  const auction_date = ctx.fallbackAuctionDate || announceDateFromText(text) || null;

  if (kind === 'grunt') {
    const row = announceLandRow(text);
    if (!row) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: row.dzialka_nr,
      obreb: row.obreb,
      area_m2: row.area_m2,
      address_raw: row.obreb ? `Sulęcin, obręb ${row.obreb}` : `Sulęcin, dz. ${row.dzialka_nr}`,
      starting_price_pln: row.starting_price_pln,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    }];
  }

  if (kind !== 'mieszkalny') return [];
  const addressRaw = announceFlatAddressRaw(text);
  if (!addressRaw) return [];
  const address = parseAddress(addressRaw);
  if (!address) return [];
  const table = announceFlatTable(text);
  return [{
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln: table ? table.starting_price_pln : null,
    auction_date,
    round,
    detail_url: ctx.detailUrl || null,
    source_url: ctx.pdfUrl || null,
  }];
}


export function isResultNotice(text) {
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(text || '');
}

export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym|brak\s+wp[łl]aty\s+wadium/i.test(text || '');
}

const RESULT_STARTING_PRICE_RE =
  /[Cc]ena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*[:;]?\s*(\d{1,3}(?:[\s .]\d{3})*,\d{2})\s*z[łl]/;

export function startingPriceFromWynik(text) {
  const m = RESULT_STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const RESULT_ACHIEVED_PRICE_RE =
  /[Cc]ena\s+(?:osi[ąa]gni[ęe]ta|uzyskana)\s+w\s+przetargu\s*[:;]?\s*(\d{1,3}(?:[\s .]\d{3})*,\d{2})\s*z[łl]/;

export function achievedPriceFromWynik(text) {
  const m = RESULT_ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const WYNIK_VILLAGE_NOMINATIVE = {
  rychliku: 'Rychlik',
  zubrowie: 'Żubrów',
};

function nominativeVillage(raw) {
  return WYNIK_VILLAGE_NOMINATIVE[foldPl(raw)] || raw;
}

const WYNIK_FLAT_ADDR_RE =
  /Lokal\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)\s+(?:po[łl]o[żz]on\w*\s+)?we?\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)[,\s–-]+numer\s+budynku\s*(\d{1,4}[A-Za-z]?)(?:\s*,?\s*klatka\s+([A-Za-złńóśźżąćę]))?/;

export function wynikFlatAddressRaw(text) {
  const m = WYNIK_FLAT_ADDR_RE.exec(text || '');
  if (!m) return null;
  const lokalNr = m[1];
  const village = nominativeVillage(m[2]);
  let building = m[3].toUpperCase();
  const klatka = m[4];
  if (klatka && !/[A-Za-z]$/.test(building)) building += klatka.toUpperCase();
  return `${village} ${building}/${lokalNr}`;
}


const WYNIK_LAND_RE =
  /dzia[łl]k\w*\s+nr\.?\s*(\d{1,4}\/\d{1,4})\s+o\s+pow\.?\s*(\d+[.,]\d+)\s*ha[\s\S]{0,80}?obr[ęe]b\w*\s*(\d{1,4})/i;

export function wynikLandParcel(text) {
  const m = WYNIK_LAND_RE.exec(text || '');
  if (!m) return null;
  return { dzialka_nr: m[1], obreb: m[3], area_m2: haToM2(m[2]) };
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const auction_date = resultDateFromText(text) || fallbackDate || null;
  const starting_price_pln = startingPriceFromWynik(text);
  const negative = isNegativeOutcome(text);
  const achieved = negative ? null : achievedPriceFromWynik(text);
  const sold = !negative && achieved != null;

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  const plot = wynikLandParcel(text);
  if (plot) {
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      address_raw: `Sulęcin, obręb ${plot.obreb}`,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const addressRaw = wynikFlatAddressRaw(text);
  if (!addressRaw) return [];
  const address = parseAddress(addressRaw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    round: null,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: null, // wynik docs don't restate usable area; announcement is the source for that field
    notes,
  }];
}
