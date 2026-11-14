
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

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

const WORD_ORDINAL_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piąt', 5], ['piat', 5], ['szóst', 6], ['szust', 6],
  ['siódm', 7], ['siodm', 7], ['ósm', 8], ['osm', 8],
];

// nieograniczon(y|e)", scanned globally so a non-ordinal word right before the
const ROUND_PHRASE_RE =
  /([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)\s+przetarg\S*\s+ustn\S*\s+nieograniczon\S*/gi;

export function roundFromText(text) {
  const t = text || '';
  ROUND_PHRASE_RE.lastIndex = 0;
  let m;
  while ((m = ROUND_PHRASE_RE.exec(t)) !== null) {
    const token = m[1];
    if (/^[IVXLCDM]+$/.test(token)) {
      const n = romanToInt(token);
      if (n) return n;
      continue;
    }
    const low = token.toLowerCase();
    const hit = WORD_ORDINAL_STEMS.find(([stem]) => low.startsWith(stem));
    if (hit) return hit[1];
  }
  return null;
}


export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wyniku\s+przetarg/i.test(text || '');
}


export function auctionDateFromText(text) {
  const m = /odb[ęe]d\S*\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const m = /informuj\S*\s*,\s*że\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}


export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\S*[\s\S]{0,80}?([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu:?\s*([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function negativeOutcomeStated(text) {
  return /wynikiem\s+negatywnym|OSOBA\s+USTALONA\s+JAKO\s+NABYWCA\s+NIERUCHOMOŚCI\s*:\s*brak/i.test(
    text || '',
  );
}


export function obrebFromText(text) {
  const m = /obr[ęe]b\S*\s*[:]?\s*([\s\S]{1,60}?)(?:,?\s*(?:dla\s+kt[óo]rej|ksi[ęe]g\S*))/i.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim().replace(/,\s*$/, '') : null;
}

export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  let dzialka_nr = null;
  const nm = /dzia[łl]k\S*\s+(?:gruntu\s+)?(?:nr|numer)\s+([\d/]+(?:\s*(?:,|i|oraz)\s*[\d/]+)*)/i.exec(s);
  if (nm) {
    const nums = nm[1].split(/\s*(?:,|i|oraz)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
    if (nums.length) dzialka_nr = nums.join(', ');
  }
  let area_m2 = null;
  const am = /o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(s);
  if (am) {
    const ha = Number(am[1].replace(',', '.'));
    if (ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr, area_m2 };
}

export function landStreetFromText(text) {
  const m = /przy\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^\n,]+?)\s+(?:stanowi\S*|oznaczon\S*)/i.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}


export function unitAreaFromText(text) {
  const m = /o\s+og[óo]lnej\s+powierzchni\S*\s+wynosz\S*\s+(\d+[.,]\d+|\d+)\s*m\s*[²2](?!\d)/i.exec(
    text || '',
  );
  return m ? parseNum(m[1]) : null;
}

const UNIT_RE = /Lokal\S*\s+(mieszkaln\S*|u[żz]ytkow\S*|niemieszkaln\S*)\s+nr\s+(\S+?)[\s,.]/i;

function normalizeUnitToken(unit) {
  const m = /^[Uu](\d+)$/.exec(unit);
  return m ? `${m[1]}U` : unit;
}

function singleLotStreetBuilding(text) {
  const m = /w\s+budynku\s+(?:przy\s+)?(?:ul\.?\s*)?([^\n,]+?)\s+o\s+og[óo]lnej/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').replace(/\s+of\b\.?$/i, '').trim();
}


function splitLots(text) {
  const re = /(?:^|\n)[ \t]*(\d+)\)[ \t]*((?:ul\.?|al\.?|pl\.?|plac)\s+[^\n]+?)\s*\n/gi;
  const headers = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    headers.push({ start: m.index, bodyStart: re.lastIndex, addressRaw: m[2].replace(/\s+/g, ' ').trim() });
  }
  if (headers.length < 2) return null;
  const lots = [];
  for (let i = 0; i < headers.length; i++) {
    const end = i + 1 < headers.length ? headers[i + 1].start : text.length;
    lots.push({ addressRaw: headers[i].addressRaw, body: text.slice(headers[i].bodyStart, end) });
  }
  return lots;
}


function buildLandRecord(text, auction_date, round) {
  const plot = plotFromText(text);
  const street = landStreetFromText(text);
  const address_raw = street ? `ul. ${street}` : null;
  if (!plot.dzialka_nr && !address_raw) return null;
  return {
    kind: 'grunt',
    dzialka_nr: plot.dzialka_nr,
    obreb: obrebFromText(text),
    area_m2: plot.area_m2,
    address_raw,
    starting_price_pln: startingPriceFromText(text),
    auction_date,
    round,
  };
}

function buildLotRecord(headerAddr, body, auction_date, round) {
  const unitM = UNIT_RE.exec(body);
  if (!unitM) return null;
  const unit = normalizeUnitToken(unitM[2].replace(/[.,]$/, ''));
  const physical = /\(w\s+budynku\s+([^)]+)\)/i.exec(body);
  const candidates = physical ? headerAddr.split(',').map((part) => part.trim())
    .filter((part) => part.toLowerCase().endsWith(physical[1].trim().toLowerCase())) : [];
  const base = candidates.length === 1 ? candidates[0] : headerAddr;
  const address_raw = `${base}/${unit}`.replace(/\s+of\b\.?(?=\/)/i, '');
  const address = parseAddress(address_raw);
  if (!address) return null;
  const kind = classifyKind(unitM[0]);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(body),
    starting_price_pln: startingPriceFromText(body),
    auction_date,
    round,
  };
}

function buildSingleUnitRecord(text) {
  const unitM = UNIT_RE.exec(text);
  if (!unitM) return null;
  const streetBldg = singleLotStreetBuilding(text);
  if (!streetBldg) return null;
  const unit = normalizeUnitToken(unitM[2].replace(/[.,]$/, ''));
  const address_raw = `ul. ${streetBldg}/${unit}`;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const kind = classifyKind(unitM[0]);
  return {
    address_raw,
    address,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    area_m2: unitAreaFromText(text),
  };
}


export function parseAnnouncement(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromText(t);
  const round = roundFromText(t);

  const lots = splitLots(t);
  if (lots) {
    const out = [];
    for (const lot of lots) {
      const kind = classifyKind(lot.body.slice(0, 800));
      let rec;
      if (kind === 'grunt') {
        const landRec = buildLandRecord(lot.body, auction_date, round);
        rec = landRec ? { ...landRec, address_raw: lot.addressRaw || landRec.address_raw } : null;
      } else {
        rec = buildLotRecord(lot.addressRaw, lot.body, auction_date, round);
      }
      if (rec) out.push(rec);
    }
    return out;
  }

  const kind = classifyKind(t.slice(0, 1600));
  if (kind === 'grunt') {
    const rec = buildLandRecord(t, auction_date, round);
    return rec ? [rec] : [];
  }
  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  return [{
    ...unit,
    starting_price_pln: startingPriceFromText(t),
    auction_date,
    round,
  }];
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negative = negativeOutcomeStated(t);
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  const kind = classifyKind(t.slice(0, 1600));
  if (kind === 'grunt') {
    const plot = plotFromText(t);
    const street = landStreetFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
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

  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  if (unit.address.warning) notes.push(unit.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: unit.kind,
    address_raw: unit.address_raw,
    address: unit.address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unit.area_m2,
    notes,
  }];
}
