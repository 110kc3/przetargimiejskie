
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, styczen: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8, sierpień: 8,
  wrzesnia: 9, września: 9, wrzesien: 9, wrzesień: 9,
  pazdziernika: 10, października: 10, pazdziernik: 10, październik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) {
    const d = Number(num[1]), m = Number(num[2]);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return iso(num[3], m, d);
  }
  const word = /(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()] ?? PL_MONTHS[toAscii(word[2])];
    const d = Number(word[1]);
    if (mon && d >= 1 && d <= 31) return iso(word[3], mon, d);
  }
  return null;
}


const PL_ORDINALS = { pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5, szost: 6 };
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

export function roundFromText(s) {
  const t = toAscii(s || '');
  const w = /\b(pierwsz|drug|trzec|czwart|piat|szost)\w*\s+przetarg/.exec(t);
  if (w) return PL_ORDINALS[w[1]] ?? null;
  const r = /\b(iv|iii|ii|vi|v|i)\s+przetarg/.exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  return null;
}

export function isCancellation(title) {
  const t = toAscii(title || '');
  if (/zastrzega\s+si[ea]\s+prawo\s+odwolania/.test(t)) return false;
  return /o\s+odwolaniu|odwolan\w*\s+przetarg|uniewazni/.test(t);
}


const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

const FLAT_SLASH_RE = new RegExp(
  `(?:przy\\s+ul\\.?|ul\\.|ulicy|Os\\.|Osiedle)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9.\\s]*?)\\s+(\\d+[A-Za-z]?)\\s*/\\s*(\\d+[A-Za-z]?)\\b`,
);
const FLAT_NOSLASH_RE = new RegExp(
  `(?:przy\\s+ul\\.?|ul\\.|ulicy|Os\\.|Osiedle)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9.\\s]*?)\\s+(\\d+[A-Za-z]?)\\b`,
);
const LOKAL_NR_RE = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;

function extractFlatAddress(text) {
  const body = String(text || '');
  const start = body.search(/lokal|nieruchomo[śs]/i);
  const venue = body.search(/w\s+sali|siedzib\w*\s+urz[ęe]du|urz[ęe]du\s+miejskiego/i);
  const region = start >= 0
    ? body.slice(start, venue > start ? venue : start + 600)
    : body;

  for (const src of [region, body]) {
    const slash = FLAT_SLASH_RE.exec(src);
    if (slash) {
      const raw = `${slash[1].trim().replace(/\s+/g, ' ')} ${slash[2]}/${slash[3]}`;
      const address = parseAddress(raw);
      if (address) return { address_raw: raw, address };
    }
    const m = FLAT_NOSLASH_RE.exec(src);
    if (m) {
      const apt = (LOKAL_NR_RE.exec(src) || LOKAL_NR_RE.exec(body) || [])[1] || null;
      const street = m[1].trim().replace(/\s+/g, ' ');
      const raw = apt ? `${street} ${m[2]}/${apt}` : `${street} ${m[2]}`;
      const address = parseAddress(raw);
      if (address) return { address_raw: raw, address };
    }
  }
  return null;
}

const OBREB_LABEL_RE = new RegExp(`obr[ęe]b\\w*\\s+([${PL_UP}][${PL_LOW}]+)`);
const POLOZ_TOWN_RE = new RegExp(`po[łl]o[żz]on\\w*\\s+w\\s+([${PL_UP}][${PL_LOW}]+)`);
function extractObreb(text) {
  const lbl = OBREB_LABEL_RE.exec(text);
  if (lbl) return lbl[1];
  const m = POLOZ_TOWN_RE.exec(text);
  return m ? m[1] : null;
}

const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:ewidencyjn\w*\s+)?(?:nr\.?|numer)?\s*:?\s*(?:[-–]\s*|[a-z]\)\s*)?(\d+(?:\/\d+)?)/i;

function extractDzialki(text) {
  const first = DZIALKA_RE.exec(text);
  if (!first) return { dzialka_nr: null, count: 0 };
  const all = new Set();
  for (const m of text.matchAll(/\b(\d{1,4}\/\d{1,4})\b/g)) all.add(m[1]);
  return { dzialka_nr: first[1], count: Math.max(all.size, 1) };
}


function extractArea(text, kind) {
  if (kind === 'grunt') {
    const ha = /o\s+pow\w*\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(text);
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
    const m2 = /o\s+pow\w*\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
    return m2 ? parseArea(m2[1]) : null;
  }
  const uzyt = /u[żz]ytkow\w*[^\d]{0,12}(\d+[.,]\d+)/i.exec(text);
  if (uzyt) return parseArea(uzyt[1]);
  const bare = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?[^\d]{0,12}(\d+[.,]\d+)\s*m(?=[²2?*"”\s.,;]|$)/i.exec(text);
  return bare ? parseArea(bare[1]) : null;
}

function amountBeforeZl(region) {
  const m = /([\d][\d\s.,]*\d|\d)\s*(?:[,.]\s*-)?\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

function extractStartingPrice(text) {
  const t = toAscii(text);
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx >= 0) {
    const p = amountBeforeZl(text.slice(idx, idx + 160));
    if (p != null) return p;
  }
  return null;
}

function extractFinalPrice(text) {
  const t = toAscii(text);
  let idx = t.search(/najwy[żz]sza\s+cena\s+osiagni[ea]t/);
  if (idx < 0) idx = t.search(/cena\s+osiagni[ea]t/);
  if (idx < 0) idx = t.search(/uzyskano\s+cen\w*\s+w\s+wysokosci/);
  if (idx < 0) return null;
  return amountBeforeZl(text.slice(idx, idx + 120));
}

function extractAnnounceDate(text) {
  const flat = /w\s+przetargu\s+w\s+dniu\b/i.exec(text);
  if (flat) {
    const d = parseDateText(text.slice(flat.index, flat.index + 60));
    if (d) return d;
  }
  const land = /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]/i.exec(text);
  if (land) {
    const d = parseDateText(text.slice(land.index, land.index + 60));
    if (d) return d;
  }
  return null;
}

function extractResultDate(text) {
  const naDzien = /na\s+dzie[ńn]\s/i.exec(text);
  if (naDzien) {
    const d = parseDateText(text.slice(naDzien.index, naDzien.index + 40));
    if (d) return d;
  }
  const przepr = /przeprowadzonego/i.exec(text);
  if (przepr) {
    const d = parseDateText(text.slice(przepr.index, przepr.index + 60));
    if (d) return d;
  }
  return null;
}

const UNSOLD_RE = /wynik\w*\s+negatywn|brak\s+ch[ęe]tnych|nie\s+wy[łl]oniono|niewstawieni|nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik)|nikt\s+nie\s+przyst/i;


export function parseAnnouncement(text, title, sourceUrl) {
  const body = String(text || '');
  const kind = classifyKind(body || title || '');
  const round = roundFromText(body) ?? roundFromText(title);
  const area_m2 = extractArea(body, kind);
  const starting_price_pln = extractStartingPrice(body);
  const auction_date = extractAnnounceDate(body);

  if (kind === 'grunt') {
    const { dzialka_nr, count } = extractDzialki(body);
    const obreb = extractObreb(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    const notes = count > 1 ? [`parse: multi-parcel notice (${count} działki) — primary parcel only`] : [];
    return {
      kind, address_raw: parts.length ? parts.join(', ') : null, address: null,
      dzialka_nr, obreb, area_m2, starting_price_pln, auction_date, round,
      detail_url: sourceUrl, notes,
    };
  }
  const found = extractFlatAddress(body);
  return {
    kind,
    address_raw: found ? found.address_raw : null,
    address: found ? found.address : null,
    dzialka_nr: null,
    obreb: null,
    area_m2, starting_price_pln, auction_date, round,
    detail_url: sourceUrl,
    notes: [],
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const body = String(text || '');
  if (!body.trim()) return [];
  const isResult =
    /informacj\w*\s+o\s+wynik/i.test(body) ||
    /cena\s+osi[ąa]gni[ęe]t/i.test(body) ||
    UNSOLD_RE.test(body);
  if (!isResult) return [];
  if (isCancellation(body.slice(0, 400))) return [];

  const kind = classifyKind(body);
  const round = roundFromText(body);
  const auction_date = extractResultDate(body) || fallbackDate || null;
  const starting_price_pln = extractStartingPrice(body);
  const final_price_pln = extractFinalPrice(body);
  const unsold = UNSOLD_RE.test(body);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/brak\s+ch[ęe]tnych/i.test(body) ? 'brak chętnych'
      : /wadium/i.test(body) && /brak\s+wp[łl]at|nie\s+wp[łl]ac/i.test(body) ? 'brak wpłaty wadium'
      : /niewstawieni|nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik)/i.test(body) ? 'brak uczestników'
      : 'wynik negatywny')
    : null;

  let address = null, address_raw = null, dzialka_nr = null, obreb = null;
  if (kind === 'grunt') {
    const d = extractDzialki(body);
    dzialka_nr = d.dzialka_nr;
    obreb = extractObreb(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    address_raw = parts.length ? parts.join(', ') : null;
  } else {
    const found = extractFlatAddress(body);
    if (found) { address = found.address; address_raw = found.address_raw; }
  }
  if (!address && !dzialka_nr) return [];

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    kind, address_raw, address, dzialka_nr, obreb,
    area_m2: extractArea(body, kind),
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    auction_date, round, outcome, unsold_reason,
    source_pdf: sourceUrl,
    notes,
  }];
}
