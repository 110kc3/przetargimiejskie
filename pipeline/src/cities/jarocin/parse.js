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
  const cleaned = String(s).replace(/[\s ]/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
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
  return /odwo[łl]a/i.test(title || '');
}


const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

const FLAT_SLASH_RE = new RegExp(
  `(?:Os\\.|Osiedle|ul\\.|ulicy|przy\\s+ul\\.?)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9. \\t]*?)[ \\t]+(\\d+[A-Za-z]?)\\s*/\\s*(\\d+[A-Za-z]?)\\b`,
);
const FLAT_NOSLASH_RE = new RegExp(
  `(?:Os\\.|Osiedle|ul\\.|ulicy|przy\\s+ul\\.?)\\s+([${PL_UP}][${PL_UP}${PL_LOW}0-9. \\t]*?)[ \\t]+(\\d+[A-Za-z]?)\\b`,
);
const LOKAL_NR_RE = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;

function extractFlatAddress(text) {
  const slash = FLAT_SLASH_RE.exec(text);
  if (slash) {
    const raw = `${slash[1].trim().replace(/\s+/g, ' ')} ${slash[2]}/${slash[3]}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  const m = FLAT_NOSLASH_RE.exec(text);
  if (m) {
    const apt = (LOKAL_NR_RE.exec(text) || [])[1] || null;
    const raw = apt ? `${m[1].trim().replace(/\s+/g, ' ')} ${m[2]}/${apt}` : `${m[1].trim().replace(/\s+/g, ' ')} ${m[2]}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  return null;
}

const TOWN_MAP = {
  jarocinie: 'Jarocin', witaszycach: 'Witaszyce', siedleminie: 'Siedlemin',
  potarzycy: 'Potarzyca', luszczanowie: 'Łuszczanów', wilkowyi: 'Wilkowyja',
  cielczy: 'Cielcza', golinie: 'Golina', bachorzewie: 'Bachorzew',
  mieszkowie: 'Mieszków', roszkowie: 'Roszków', prusach: 'Prusy',
  tarcach: 'Tarce', radlinie: 'Radlin', zakrzewie: 'Zakrzew',
};
function nominativeTown(loc) {
  if (!loc) return null;
  const raw = loc.trim();
  const key = toAscii(raw);
  if (TOWN_MAP[key]) return TOWN_MAP[key];
  if (/inie$/i.test(raw)) return raw.replace(/inie$/i, 'in');
  if (/owie$/i.test(raw)) return raw.replace(/owie$/i, 'ów');
  if (/ycach$/i.test(raw)) return raw.replace(/ycach$/i, 'yce');
  if (/ycy$/i.test(raw)) return raw.replace(/ycy$/i, 'yca');
  return raw;
}

const OBREB_LABEL_RE = new RegExp(`obr[ęe]b\\w*\\s+([${PL_UP}][${PL_LOW}]+)`);
const POLOZ_TOWN_RE = new RegExp(
  `po[łl]o[żz]on\\w*\\s+w\\s+([${PL_UP}][${PL_LOW}]+)`,
);

function extractObreb(text) {
  const lbl = OBREB_LABEL_RE.exec(text);
  if (lbl) return lbl[1];
  const m = POLOZ_TOWN_RE.exec(text);
  return m ? nominativeTown(m[1]) : null;
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
  const lokal = /powierzchni\w*\s+lokalu\s+([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (lokal) return parseArea(lokal[1]);
  const uzyt = /powierzchni\w*\s+u[żz]ytkow\w*[^\d]{0,20}([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (uzyt) return parseArea(uzyt[1]);
  const bare = /\bo\s+pow\w*\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  return bare ? parseArea(bare[1]) : null;
}

function amountBeforeZl(region) {
  const m = /([\d][\d\s .,]*\d|\d)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

function extractStartingPrice(text) {
  const t = toAscii(text);
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx >= 0) {
    const p = amountBeforeZl(text.slice(idx, idx + 140));
    if (p != null) return p;
  }
  const brutto = /([\d][\d\s .,]*\d)\s*z[łl]\s*brutto/i.exec(text);
  return brutto ? parsePLN(brutto[1]) : null;
}

function extractFinalPrice(text) {
  const t = toAscii(text);
  let idx = t.search(/uzyskano\s+cen\w*\s+w\s+wysokosci/);
  if (idx < 0) idx = t.search(/cena\s+osiagni[ęe]t\w*/);
  if (idx < 0) idx = t.search(/osiagni[ęe]t\w*\s+cen/);
  if (idx < 0) return null;
  return amountBeforeZl(text.slice(idx, idx + 120));
}

function extractAnnounceDate(text) {
  const idx = text.search(/odb[ęe]dzie\s+si[ęe]/i);
  if (idx < 0) return null;
  return parseDateText(text.slice(idx, idx + 220));
}

function extractResultDate(text, title) {
  const bi = (text || '').search(/w\s+dniu\s/i);
  if (bi >= 0) {
    const d = parseDateText(text.slice(bi, bi + 45));
    if (d) return d;
  }
  const ti = (title || '').search(/z\s+dnia\s/i);
  if (ti >= 0) return parseDateText(title.slice(ti, ti + 45));
  return null;
}

const UNSOLD_RE = /wynik\w*\s+negatywn|niewstawieni|nie\s+przyst[ąa]pi[łl]|brak\s+(?:oferent|uczestnik|os[óo]b\s+dopuszczon)|nie\s+wp[łl]ac|brak\s+wp[łl]at\s+wadium|nie\s+wy[łl]oniono|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywn/i;


export function parseAnnouncement(text, title, sourceUrl) {
  const body = String(text || '');
  const subject = body.split(/\bw\s+s[ąa]siedztwie\b/i)[0];
  const kind = classifyKind(subject || title || '');
  const round = roundFromText(title) ?? roundFromText(body);
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
  const found = extractFlatAddress(title || '') || extractFlatAddress(body);
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

export function parseAnnouncementLots(text, title, sourceUrl) {
  const body = String(text || '');
  const header = /Lp\.\s+Numer\s+Pow\.\s+Klasy/.exec(body);
  if (!header) return [parseAnnouncement(body, title, sourceUrl)];
  const base = parseAnnouncement(body, title, sourceUrl);
  if (base.kind !== 'grunt') return [base];
  const end = body.indexOf('Księga wieczysta', header.index);
  if (end < 0 || !base.auction_date || !base.obreb) return [];
  const table = body.slice(header.index, end);
  const areas = new Map();
  for (const row of table.matchAll(/^\s*(?:\d+\.\s+)?(\d+\/\d+)\s+(\d+[.,]\d{4})\s+\S+/gm)) {
    const area = parseArea(row[2]);
    if (!area || areas.has(row[1])) return [];
    areas.set(row[1], Math.round(area * 10000));
  }
  const prices = [...table.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*zł/g)].map(m => parsePLN(m[1]));
  const groups = [...body.matchAll(/DLA\s+DZIAŁEK\s+NR\s+([\d/, \t]+)\s*\r?\n([\s\S]*?)(?=DLA\s+DZIAŁEK\s+NR|POZOSTAŁE INFORMACJE|$)/g)];
  if (!areas.size || !groups.length || groups.length !== prices.length) return [];
  const covered = new Set();
  const lots = [];
  for (const [index, group] of groups.entries()) {
    const parcels = group[1].split(',').map(s => s.trim());
    if (!parcels.length || new Set(parcels).size !== parcels.length
      || parcels.some(p => !/^\d+\/\d+$/.test(p) || !areas.has(p) || covered.has(p))) return [];
    const deposit = /wadium\s+w\s+wysokości\s+20%\s+ceny\s+wywoławczej,\s*tj\.\s*([\d.,]+)\s*zł/.exec(group[2]);
    if (!deposit || !prices[index] || parsePLN(deposit[1]) * 5 !== prices[index]) return [];
    for (const parcel of parcels) covered.add(parcel);
    lots.push({ ...base, address: null, address_raw: `${base.obreb}, dz. nr ${parcels.join(', ')}`,
      dzialka_nr: parcels.join(', '), area_m2: parcels.reduce((sum, p) => sum + areas.get(p), 0),
      starting_price_pln: prices[index],
      notes: ['Łączna cena i powierzchnia dotyczą całego pakietu działek.'],
    });
  }
  return covered.size === areas.size ? lots : [];
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const body = String(text || '');
  if (!body.trim()) return [];
  const isResult =
    /informacj\w*\s+o\s+wynik/i.test(body) ||
    /uzyskano\s+cen/i.test(body) ||
    /cena\s+osi[ąa]gni[ęe]t/i.test(body) ||
    UNSOLD_RE.test(body);
  if (!isResult) return [];
  if (isCancellation(body.slice(0, 400))) return [];

  const title = '';
  const kind = classifyKind(body);
  const round = roundFromText(body);
  const auction_date = extractResultDate(body, title) || fallbackDate || null;
  const starting_price_pln = extractStartingPrice(body);
  const final_price_pln = extractFinalPrice(body);
  const unsold = UNSOLD_RE.test(body);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/wadium/i.test(body) && /brak\s+wp[łl]at|nie\s+wp[łl]ac/i.test(body) ? 'brak wpłaty wadium'
      : /niewstawieni|nie\s+przyst[ąa]pi[łl]/i.test(body) ? 'brak uczestników'
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
  const dcount = extractDzialki(body).count;
  if (dcount > 1) notes.push(`parse: multi-parcel result (${dcount} działki) — primary parcel + first stated price only`);
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
