//      jest oddanie w najem …" — isLease() must gate these out before

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const withoutGrosze = String(numStr).trim().replace(/[.,]\d{2}$/, '');
  const cleaned = withoutGrosze.replace(/[\s.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `BODY: ${stripHtml(f.body)}`,
    `ATTACH: ${stripHtml(f.attach)}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function whole(text) {
  if (text && /^BODY:/.test(text)) return field(text, 'BODY');
  return text || '';
}


export function isSaleAuction(text) {
  return /na\s+sprzeda[żz]/i.test(whole(text));
}

export function isLease(text) {
  const t = whole(text);
  return /oddanie\s+w\s+najem|na\s+najem\b|w\s+dzier[żz]aw[eę]|na\s+dzier[żz]aw[eę]/i.test(t);
}

export function isResultDoc(text) {
  const t = whole(text);
  if (/informacj\w*\s+o\s+wyniku|wyniku\s+(?:\w+\s+)?przetarg|osi[ąa]gni[ęe]t|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(t)) return true;
  return /przetarg/i.test(t) && (/przeprowadzon\w*/i.test(t) || /\bodby[łl]\s+si[ęe]/i.test(t));
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+wp[łl]yn[ęe][łl]a?\s+[żz]adna\s+wp[łl]ata\s+wadium/i.test(t);
}


const ORD = {
  pierwsz: 1,
  drug: 2,
  trzeci: 3,
  czwart: 4,
  'piąt': 5,
  piat: 5,
  'szóst': 6,
  szost: 6,
  'siódm': 7,
  siodm: 7,
  'ósm': 8,
  osm: 8,
  'dziewiąt': 9,
  dziewiat: 9,
  'dziesiąt': 10,
  dziesiat: 10,
};

export function roundFromText(text) {
  const t = whole(text);
  const m = /(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+(?:ustn\w*\s+)?przetarg/i.exec(t);
  if (!m) return null;
  const w = m[1].toLowerCase();
  const key = Object.keys(ORD).find((k) => w.startsWith(k.toLowerCase()));
  return key ? ORD[key] : null;
}


function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(whole(text));
  return m ? parseDatePhrase(m[1].trim()) : null;
}

export function resultDateFromText(text) {
  const m = /\bw\s+dniu\s+([\s\S]{0,24}?)\s+o\s+godz[\s\S]{0,250}?(?:przeprowadzon\w*|odby[łl]\s+si[ęe])/i.exec(whole(text));
  return m ? parseDatePhrase(m[1].trim()) : null;
}



export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz\w*[\s\S]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /uzyskano\s+kwot[ęe][\s\S]{0,60}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function kindFromText(text) {
  return classifyKind(whole(text));
}


//     Przedmiotem ustnego przetargu nieograniczonego jest…" (tresc=30279)
//     terminator), so plain (non-global) regex backtracking naturally moves
// TWO alternatives, tried in order (plain, non-global .exec() naturally
const STREET_WORD = '[A-ZŁŚŻŹĆŃÓĄĘ][\\wąćęłńóśźż.]*';
const REAL_TERMINATOR = '(?:,|\\.|\\s+w\\s+Raw\\w*|\\s+oraz\\b|$)';
const LOOSE_TERMINATOR = `(?:${REAL_TERMINATOR}|\\s+[a-ząćęłńóśźż])`;
const STREET_RE = new RegExp(
  `(?:przy\\s+[Uu]l\\.|[-–]\\s*[Uu]l\\.)\\s+` +
    `(?:(${STREET_WORD})(?=${LOOSE_TERMINATOR})|(${STREET_WORD}(?:\\s+${STREET_WORD}){1,2})(?=${REAL_TERMINATOR}))`,
);

export function streetFromText(text) {
  const m = STREET_RE.exec(whole(text));
  const raw = m ? m[1] || m[2] : null;
  return raw ? raw.trim().replace(/\s+/g, ' ') : null;
}

function buildingNumberFor(text, street) {
  if (!street) return null;
  const t = whole(text);
  const direct = new RegExp(`ul\\.?\\s*${escapeRe(street)}\\s+(\\d+[A-Za-z]?)\\b`, 'i').exec(t);
  if (direct) return direct[1];
  const attach = field(text, 'ATTACH');
  if (!attach) return null;
  const lastWord = street.trim().split(/\s+/).pop();
  const m = new RegExp(`${escapeRe(lastWord)}\\s+(\\d+[A-Za-z]?)`, 'i').exec(attach);
  return m ? m[1] : null;
}

// same "<parcel> o pow. <area> ha" shape, so ONE global scan over that shape
const PARCEL_RE = /(\d+\/\d+|\d+)\s+o\s+pow\w*\.?\s*(\d+(?:[.,]\d+)?)\s*ha\b/gi;
const TOTAL_AREA_RE = /[łl][ąa]czn\w*\s+(?:obszarze|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*ha/i;

function landPlotsFromText(t) {
  const parcels = [];
  const seen = new Set();
  const areas = [];
  let m;
  PARCEL_RE.lastIndex = 0;
  while ((m = PARCEL_RE.exec(t)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    parcels.push(m[1]);
    areas.push(parseNum(m[2]));
  }
  let area_m2 = null;
  const tot = TOTAL_AREA_RE.exec(t);
  if (tot) {
    area_m2 = Math.round(parseNum(tot[1]) * 10000);
  } else if (areas.length) {
    area_m2 = Math.round(areas.reduce((a, b) => a + (b || 0), 0) * 10000);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

function isLandLike(t, kind) {
  if (kind === 'grunt') return true;
  if (kind !== 'unknown') return false;
  return Boolean(landPlotsFromText(t).dzialka_nr);
}

function unitAreaRe(unit) {
  const unitPart = unit ? `nr\\s+${escapeRe(unit)}\\s+` : '';
  return new RegExp(
    `${unitPart}o\\s+(?:[łl][ąa]cznej\\s+)?pow\\w*\\.?\\s*(?:u[żz]ytkow\\w+\\s+)?(\\d+(?:[.,]\\d+)?)\\s*m\\s*[²2]`,
    'i',
  );
}

export function unitAreaFromText(text, unit) {
  const m = unitAreaRe(unit).exec(whole(text));
  return m ? parseNum(m[1]) : null;
}


export function splitAnnouncementUnits(text) {
  const t = whole(text);
  const re = /dla\s+lokalu\s+nr\s+(\d+[A-Za-z]?)/gi;
  const marks = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(t)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    marks.push({ unit: m[1], start: m.index });
  }
  if (!marks.length) return [{ unit: null, text: t }];
  return marks.map((mk, i) => ({
    unit: mk.unit,
    text: t.slice(mk.start, i + 1 < marks.length ? marks[i + 1].start : t.length),
  }));
}

export function splitResultUnits(text) {
  const t = whole(text);
  const re = /\bw\s+dniu\s+\d/gi;
  const starts = [];
  let m;
  while ((m = re.exec(t)) !== null) starts.push(m.index);
  if (!starts.length) return [{ unit: null, text: t }];
  return starts.map((start, i) => {
    const seg = t.slice(start, i + 1 < starts.length ? starts[i + 1] : t.length);
    const um = /lokal\w*\s+(?:mieszkaln\w*\s+)?nr\s+(\d+[A-Za-z]?)/i.exec(seg);
    return { unit: um ? um[1] : null, text: seg };
  });
}


export function parseAnnouncement(text) {
  if (!text) return [];
  const t = whole(text);
  const kind = kindFromText(text);

  if (isLandLike(t, kind)) {
    const plot = landPlotsFromText(t);
    if (!plot.dzialka_nr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: streetFromText(t),
      starting_price_pln: startingPriceFromText(t),
      auction_date: auctionDateFromText(t),
      round: roundFromText(t),
    }];
  }

  const street = streetFromText(t);
  if (!street) return [];
  const building = buildingNumberFor(text, street);
  if (!building) return [];

  const out = [];
  for (const { unit, text: seg } of splitAnnouncementUnits(t)) {
    const address_raw = unit ? `${street} ${building}/${unit}` : `${street} ${building}`;
    const address = parseAddress(address_raw);
    if (!address) continue;
    out.push({
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      area_m2: unitAreaFromText(seg, unit),
      starting_price_pln: startingPriceFromText(seg),
      auction_date: auctionDateFromText(seg),
      round: roundFromText(seg) ?? roundFromText(t),
    });
  }
  return out;
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultDoc(text) || isLease(text)) return [];
  const t = whole(text);
  const kind = kindFromText(text);

  if (isLandLike(t, kind)) {
    const plot = landPlotsFromText(t);
    if (!plot.dzialka_nr) return [];
    const auction_date = resultDateFromText(t) || fallbackDate || null;
    const starting_price_pln = startingPriceFromText(t);
    const achieved = achievedPriceFromText(t);
    const sold = achieved != null;
    const negativeStated = isNegativeOutcome(t);
    const notes = [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw: streetFromText(t),
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const street = streetFromText(t);
  if (!street) return [];
  const building = buildingNumberFor(text, street);
  if (!building) return [];

  const out = [];
  for (const { unit, text: seg } of splitResultUnits(t)) {
    const address_raw = unit ? `${street} ${building}/${unit}` : `${street} ${building}`;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const auction_date = resultDateFromText(seg) || fallbackDate || null;
    const starting_price_pln = startingPriceFromText(seg);
    const achieved = achievedPriceFromText(seg);
    const sold = achieved != null;
    const negativeStated = isNegativeOutcome(seg);
    const notes = [];
    if (address.warning) notes.push(address.warning);
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

    out.push({
      auction_date,
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round: roundFromText(seg) ?? roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(seg, unit),
      notes,
    });
  }
  return out;
}
