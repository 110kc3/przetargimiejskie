import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function parsePLN(numStr) {
  if (!numStr) return null;
  let s = String(numStr).trim();
  s = s.replace(/[,.]-$/, '');
  s = s.replace(/[,.](\d{2})$/, '');
  s = s.replace(/[\s., ]/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isResultNotice(text) {
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(text || '');
}


export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /(^|\W)wykaz\b/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s) ||
    /lista\s+os[óo]b/i.test(s)
  );
}

export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /informacj\w*\s+o\s+wynik/i.test(s) || /\bwynik\w*\s+przetarg/i.test(s);
}

export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal/i.test(s)) return true;
  return false;
}

const ROMAN_ROUND = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROUND_WORD_PREFIX = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

export function roundFromText(text) {
  const t = text || '';
  const rm = /\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\s+przetarg/.exec(t);
  if (rm) return ROMAN_ROUND[rm[1]] ?? null;
  const wm = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)[a-ząćęłńóśźż]*\s+przetarg/i.exec(t);
  if (wm) return ROUND_WORD_PREFIX[wm[1].toLowerCase()] ?? null;
  return null;
}


function parseDateChunk(chunk) {
  const t = chunk || '';
  let m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export function auctionDateFromText(text) {
  const m = /(?:zostanie\s+przeprowadzon[a-ząćęłńóśźż]+|odb[ęe]dzie\s+si[ęe])\s+w\s+dniu\s+([\s\S]{0,40}?)(?:r\.|roku|$)/i.exec(
    text || '',
  );
  return m ? parseDateChunk(m[1]) : null;
}

export function resultDateFromText(text) {
  const m = /przetargu\s+z\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r\.?/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}


export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\s*(?:-|–|:)?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const AMOUNT_RE = /(?<![\d.])\d{1,3}(?:[.\s  ]\d{3})+(?:[,.]\d{2})?/g;

export function amountsInChunk(text) {
  const out = [];
  let m;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(text || '')) !== null) {
    const v = parsePLN(m[0]);
    if (v != null) out.push(v);
  }
  return out;
}


const UNIT_NO_RE = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;

const STREET_HEADER_RE =
  /przy\s+ul(?:icy|\.)?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęńŻŹĆŁŚĄĘŃ.'’\- ]+?)(?:\s+(\d+[A-Za-z]?)\b|\s*(?:,|\.|w\s+Szczecin|wraz\b|oraz\b|w\s+obr[ęe]bie|\n|$))/i;

export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

const UNIT_AREA_RE =
  /lokal\w*\s+mieszkaln\w*\s+nr\s+\d+[a-z]?\s+o\s+powierzchni\s+u[żz]ytkow\w+\s+([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;
const UNIT_AREA_ALT_RE = /\blokal\b\s+o\s+pow\.?\s+([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;

export function unitAreaFromText(text) {
  const t = text || '';
  const m = UNIT_AREA_RE.exec(t) || UNIT_AREA_ALT_RE.exec(t);
  return m ? parseArea(m[1]) : null;
}

const OBREB_RE = /\bobr(?:[ęe]b(?:ie)?\.?|\.)\s*(\d+)/i;

export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1] : null;
}

export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  const parcelArea = new Map();
  let total = null;

  if (/dzia[łl]/i.test(s)) {
    const m1 = /(\d+(?:\/\d+)?)\s+o\s+(?:pow\.?|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i.exec(s);
    if (m1) {
      parcels.add(m1[1]);
      const a = parseArea(m1[2]);
      if (a) parcelArea.set(m1[1], a);
    }

    const listRe =
      /((?:\d+(?:\/\d+)?\s*(?:,|i)\s*)+\d+(?:\/\d+)?)\s+o\s+[łl][ąa]cznej\s+(?:pow\.?|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*ha\b/i;
    const lm = listRe.exec(s);
    if (lm) {
      for (const p of lm[1].split(/\s*(?:,|i)\s*/)) {
        if (/^\d+(?:\/\d+)?$/.test(p.trim())) parcels.add(p.trim());
      }
      const a = Number(lm[2].replace(',', '.'));
      if (a > 0) total = Math.round(a * 10000);
    }
    if (total == null) {
      const lm2 = /[łl][ąa]cznej\s+(?:pow\.?|powierzchni)\s+(\d+(?:[.,]\d+)?)\s*ha\b/i.exec(s);
      if (lm2) {
        const a = Number(lm2[1].replace(',', '.'));
        if (a > 0) total = Math.round(a * 10000);
      }
    }
  }

  let area_m2 = total;
  if (area_m2 == null && parcelArea.size) {
    let sum = 0;
    for (const a of parcelArea.values()) sum += a;
    area_m2 = Math.round(sum);
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  return { dzialka_nr, area_m2 };
}

function kindFromHeader(text) {
  return classifyKind((text || '').slice(0, 700));
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kindHeader = kindFromHeader(t);
  const isLand = kindHeader === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const plot = plotFromText(t);
  const obreb = obrebFromText(t);

  if (isLand) {
    const h = streetFromHeader(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  return {
    kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}


const ROW_START_RE = /(?:^|\n)\s*(\d{1,2})\.\s+(\d{2})\.(\d{2})\.(\d{4})\s*r\.?/g;

export function splitResultRows(text) {
  const t = (text || '').replace(/\r/g, '');
  const starts = [];
  let m;
  ROW_START_RE.lastIndex = 0;
  while ((m = ROW_START_RE.exec(t)) !== null) {
    starts.push({ index: m.index, end: m.index + m[0].length, date: `${m[4]}-${m[3]}-${m[2]}` });
  }
  if (!starts.length) return [{ date: null, text: t }];
  return starts.map((s, i) => ({
    date: s.date,
    text: t.slice(s.end, i + 1 < starts.length ? starts[i + 1].index : t.length),
  }));
}

function dewrapTableRow(text) {
  return (text || '')
    .replace(/\bUrz[ąa]d\s+Miasta\b/gi, ' ')
    .replace(/\bSzczecinek\b/g, ' ')
    .replace(/\bustny\b/gi, ' ')
    .replace(/\bnieograniczon\w*\b/gi, ' ');
}

function parseResultRow(rawRowText, auction_date, sourceUrl) {
  const rowText = dewrapTableRow(rawRowText);
  const notes = [];
  const round = roundFromText(rowText);
  const amounts = amountsInChunk(rowText);
  const starting_price_pln = amounts[0] ?? null;
  const achieved = amounts.length > 1 ? amounts[1] : null;
  const sold = achieved != null;
  const negativeStated = /wynikiem\s+negatywnym/i.test(rowText);

  const kindHeader = kindFromHeader(rowText);
  const isLand = kindHeader === 'grunt';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  if (isLand) {
    const plot = plotFromText(rowText);
    const obreb = obrebFromText(rowText);
    const h = streetFromHeader(rowText);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb,
      area_m2: plot.area_m2,
      address_raw,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    };
  }

  const address_raw = addressRawFromText(rowText);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);
  const area_m2 = unitAreaFromText(rowText);
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  const plot = plotFromText(rowText);
  return {
    auction_date,
    source_pdf: sourceUrl,
    kind,
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
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const boilerplateDate = resultDateFromText(t);
  const rows = splitResultRows(t);
  const out = [];
  for (const row of rows) {
    const rec = parseResultRow(row.text, row.date || boilerplateDate || fallbackDate || null, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}


export function extractBodyText(html) {
  if (!html) return '';
  const h = html.replace(/\r/g, '');
  const m = /<section class="wysiwyg"[^>]*>([\s\S]*?)<\/section>/i.exec(h);
  if (!m) return '';
  let text = m[1].replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/g, ' ');
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}
