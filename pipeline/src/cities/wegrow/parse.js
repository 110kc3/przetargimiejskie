import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [`TYTUL: ${stripHtml(f.title)}`, `TRESC:\n${(f.body || '').replace(/\r/g, '').trim()}`].join('\n');
}

function titleField(text) {
  const m = /^TYTUL:[ \t]*(.*)$/im.exec(text || '');
  return m ? m[1].trim() : '';
}

function bodyField(text) {
  const m = /^TRESC:\n([\s\S]*)$/m.exec(text || '');
  return m ? m[1] : '';
}


export function isSkippableTitle(title) {
  const s = title || '';
  return (
    /\bwykaz/i.test(s) ||
    /lista\s+os[óo]b/i.test(s) ||
    /odwo[łl]ani|uniewa[żz]ni/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(?<!nie)ruchomo[śs]ci/i.test(s) ||
    /\bnajem\b|dzier[żz]aw/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik/i.test(title || '');
}

export function isAnnouncementTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo/i.test(s);
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

function ordinalToRound(word) {
  const key = (word || '').toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  return null;
}

const ORDINAL_ALT = '(pierwsz\\w*|drug\\w*|trzeci\\w*|czwart\\w*|pi[ąa]t\\w*|sz[óo]st\\w*)';

export function roundFromText(text) {
  const t = bodyField(text);
  let m = new RegExp(`og[łl]asza\\s+${ORDINAL_ALT}\\s+przetarg`, 'i').exec(t);
  if (m) return ordinalToRound(m[1]);
  m = new RegExp(`odby[łl]\\s+si[ęe]\\s+${ORDINAL_ALT}\\s+przetarg`, 'i').exec(t);
  if (m) return ordinalToRound(m[1]);
  return null;
}


const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function auctionDateFromText(text) {
  const t = bodyField(text);
  let m = /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (!m) {
    m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,150}?odby[łl]\s+si[ęe]\s+(?:\S+\s+)?przetarg/i.exec(t);
  }
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}


export function startingPriceFromText(text) {
  const t = bodyField(text);
  const m = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s+wynosi(?:[łl]a)?\s*:?\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = bodyField(text);
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeOutcome(text) {
  const t = bodyField(text);
  return /wynikiem\s+negatywnym|brak\w*\s+(?:uczestnik|ofert)|nie\s+wp[łl]aci[łl]\w*\s+wadium|nie\s+odnotowano/i.test(t);
}

export function isResultNotice(text) {
  return isResultTitle(titleField(text)) || /informacj\w*\s+o\s+wynik/i.test(bodyField(text));
}


function kindFromText(text) {
  const titleKind = classifyKind(titleField(text));
  if (titleKind !== 'unknown') return titleKind;
  return classifyKind(bodyField(text).slice(0, 700));
}


const STREET_HEADER_RE =
  /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?)(?=\s*,|\s+w\s+W[ęe]growie\b))?(?=,|\s+w\s+W[ęe]growie\b|\n|$)/gi;

export function streetFromHeader(text) {
  const t = bodyField(text);
  const re = new RegExp(STREET_HEADER_RE.source, 'gi');
  let m;
  let bare = null;
  while ((m = re.exec(t)) !== null) {
    const precedingWindow = t.slice(Math.max(0, m.index - 60), m.index);
    if (/w\s+siedzibie/i.test(precedingWindow)) continue;
    const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (!street) continue;
    if (m[2]) return { street, building: m[2] };
    if (!bare) bare = { street, building: null };
  }
  return bare;
}

const UNIT_NO_RE = /lokal\w*\s+mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;

export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const t = bodyField(text);
  const um = UNIT_NO_RE.exec(t);
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

const UNIT_AREA_RE =
  /lokal\w*\s+mieszkaln\w+\s+nr\s+\d+[A-Za-z]?[\s\S]{0,150}?o\s+powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2?]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(bodyField(text));
  return m ? parseArea(m[1]) : null;
}

function plotFromText(text) {
  const t = bodyField(text).replace(/\s+/g, ' ');
  if (!/dzia[łl]k/i.test(t)) return { dzialka_nr: null, area_m2: null };
  const parcels = [];
  const seen = new Set();
  const parcelArea = new Map();
  const re = /(\d+(?:\/\d+)?)\s+o\s+pow(?:ierzchni|\.)?\s+(\d+[.,]\d+)\s*ha\b/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
    const a = Number(m[2].replace(',', '.'));
    if (a > 0 && !parcelArea.has(m[1])) parcelArea.set(m[1], a);
  }
  const reListRe = /dzia[łl]k\w*\s+(?:nr\s+)?((?:\d+(?:\/\d+)?\s*,\s*)+\d+(?:\/\d+)?)\s+o\s+[łl][ąa]cznej\s+pow/i;
  const lmList = reListRe.exec(t);
  if (lmList) {
    for (const p of lmList[1].split(/\s*,\s*/)) {
      const v = p.trim();
      if (/^\d+(?:\/\d+)?$/.test(v) && !seen.has(v)) { seen.add(v); parcels.push(v); }
    }
  }
  let area_m2 = null;
  const lm = /[łl][ąa]cznej\s+pow(?:ierzchni|\.)?\s+(\d+[.,]\d+)\s*ha\b/i.exec(t);
  if (lm) {
    const a = Number(lm[1].replace(',', '.'));
    if (a > 0) area_m2 = Math.round(a * 10000);
  }
  if (area_m2 == null && parcelArea.size) {
    let sum = 0;
    for (const a of parcelArea.values()) sum += a;
    area_m2 = Math.round(sum * 10000);
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
    const plot = plotFromText(text);
    const h = streetFromHeader(text);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
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
  const area_m2 = unitAreaFromText(text);
  const plot = kind === 'zabudowana' ? plotFromText(text) : { area_m2: null };
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = plotFromText(text);
    const h = streetFromHeader(text);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
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

  const area_m2 = unitAreaFromText(text);
  const plot = kind === 'zabudowana' ? plotFromText(text) : { area_m2: null };
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
      area_m2,
      ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
      notes,
    },
  ];
}
