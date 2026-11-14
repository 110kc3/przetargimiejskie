import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;/gi, '–')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, styczen: 1, lutego: 2, luty: 2, marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8, wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10, listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function spelledDate(tFolded) {
  const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(tFolded || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2]];
  const day = Number(m[1]);
  if (!mon || day < 1 || day > 31) return null;
  return iso(m[3], mon, day);
}

function numericDate(t) {
  const m = /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/.exec(t || '');
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return iso(m[3], mon, day);
}


function cleanFragment(frag) {
  return stripTags(
    (frag || '')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<xml[\s\S]*?<\/xml>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<section\b[^>]*section-news[\s\S]*?<\/section>/gi, ' ')
  );
}

export function extractBodyText(html) {
  if (!html) return '';
  const open = /<div class="content mb-5">/i.exec(html) || /<div class="content[^"]*">/i.exec(html);
  if (!open) return '';
  const start = open.index + open[0].length;
  let depth = 1;
  const tagRe = /<(\/?)div\b[^>]*>/gi;
  tagRe.lastIndex = start;
  let inner = null;
  let tm;
  while ((tm = tagRe.exec(html)) !== null) {
    depth += tm[1] ? -1 : 1;
    if (depth === 0) { inner = html.slice(start, tm.index); break; }
  }
  if (inner == null) {
    const rest = html.slice(start);
    const cut = rest.search(/<div class="page__(?:shortcuts|share|footer)"|<footer\b/i);
    inner = cut >= 0 ? rest.slice(0, cut) : rest.slice(0, 40000);
  }
  return cleanFragment(inner);
}

export function extractTitle(html) {
  if (!html) return '';
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1) return stripTags(h1[1]);
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return t ? stripTags(t[1]).replace(/\s*[-–|]\s*Gmina K[łl]obuck\s*$/i, '').trim() : '';
}

export function extractPublishedDate(html) {
  const body = extractBodyText(html);
  const s = /K[łl]obuck,?\s+(?:dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(body);
  if (s) {
    const mon = PL_MONTHS[toAscii(s[2])];
    if (mon) return iso(s[3], mon, Number(s[1]));
  }
  const n = /K[łl]obuck,?\s+(?:dnia\s+)?(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/i.exec(body);
  return n ? iso(n[3], Number(n[2]), Number(n[1])) : null;
}


const ORDINAL = { pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5, szost: 6, siodm: 7 };
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

export function roundFromText(text) {
  const t = toAscii(text || '');
  const sp = /\b(pierwsz|drug|trzec|czwart|piat|szost|siodm)\w*\s+(?:ustn\w+\s+)?(?:publiczn\w+\s+)?(?:przetarg|rokowan)/.exec(t);
  if (sp) return ORDINAL[sp[1]] ?? null;
  const rm = /\b(vii|iii|vi|iv|ii|v|i)\s+(?:publiczn\w+\s+)?(?:przetarg|rokowan)/.exec(t);
  return rm ? ROMAN[rm[1]] ?? null : null;
}

export function extractAuctionDate(text) {
  const t = toAscii(text || '');
  const ann = /odb[ee]dzie\s+si[ee]/.exec(t);
  if (ann) {
    const slice = t.slice(ann.index, ann.index + 140);
    const d = spelledDate(slice) || numericDate(slice);
    if (d) return d;
  }
  const res = /zorganizowan\w*\s+przez\s+burmistrza\s+klobucka[\s\S]{0,40}?\b(?:w\s+dniu|dnia)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})/.exec(t);
  if (res) {
    const d = numericDate(res[1]);
    if (d) return d;
  }
  return numericDate(t) || spelledDate(t) || null;
}

export function isCancelled(title) {
  const t = toAscii(title || '');
  return /\bodwolan|uniewazni|\bodwoluj/.test(t);
}


export function isResultTitle(title) {
  const t = toAscii(title || '');
  return /informacj\w*\s+o\s+wyniku|\bwynik\w*\s+\w*\s*przetarg/.test(t);
}

export function isLeaseTitle(title) {
  const t = toAscii(title || '');
  return /\bnajem\b|\bnajmu\b|dzierzaw|uzyczeni|wydzierzaw|wynajem/.test(t);
}

export function isAnnouncementTitle(title) {
  const t = toAscii(title || '');
  if (isResultTitle(t)) return false;
  if (isLeaseTitle(t)) return false;
  if (/\bwykaz|odwolan|uniewazni|bezprzetarg/.test(t)) return false;
  return /(?:przetarg|rokowan)\w*/.test(t) && /sprzeda/.test(t);
}


const FLAT_ADDR_RE = new RegExp(
  'budynku\\s+wielorodzinn\\w*[\\s\\S]{0,60}?przy\\s+ul(?:icy|\\.)?\\s+' +
  `([${PL_UP}][${PL_LOW}]+(?:\\s+(?!Nr\\b)[${PL_UP}0-9][${PL_LOW}0-9]*)?)\\s+(?:Nr\\.?\\s*)?(\\d+[A-Za-z]?)`,
  'i',
);

const STREET_ADDR_RE = new RegExp(
  `przy\\s+ul(?:icy|\\.)?\\s+([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)\\s+(\\d+[A-Za-z]?)`,
);

const LOKAL_NR_RE = /\blokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

const DZIALKA_RE = /(?:ewidencyjn\w*\s+nr\.?|nr\.?\s+ewid\w*\.?|dzia[łl]\w*\s+(?:nr|oznaczon)\w*)\s*:?\s*(\d+\/\d+(?:\s*(?:i|,|oraz)\s*\d+\/\d+)*)/i;

const OBREB_RE = new RegExp(`obr[ęe]b\\w*\\s+(?:ewidencyjn\\w*\\s+)?([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)`);

function extractFlatAddress(body) {
  const sm = FLAT_ADDR_RE.exec(body || '');
  if (!sm) return { address_raw: null, address: null };
  const street = sm[1].trim().replace(/\s+/g, ' ');
  const building = sm[2];
  const aptM = LOKAL_NR_RE.exec(body || '');
  const apt = aptM ? aptM[1] : null;
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

function extractStreetAddress(body) {
  const m = STREET_ADDR_RE.exec(body || '');
  if (!m) return { address_raw: null, address: null };
  const raw = `${m[1].trim().replace(/\s+/g, ' ')} ${m[2]}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

export function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function extractObreb(body) {
  const m = OBREB_RE.exec(body || '');
  return m ? m[1].trim() : null;
}

function extractLandStreet(body) {
  const m = new RegExp(`przy\\s+ul(?:icy|\\.)?\\s+([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)`).exec(body || '');
  return m ? m[1].trim() : null;
}


export function extractAreaM2(body, kind) {
  const t = body || '';
  if (kind === 'grunt') {
    const ha = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(t);
    if (ha) { const v = parseArea(ha[1]); return v == null ? null : Math.round(v * 10000); }
    return null;
  }
  const u = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*[^\d]{0,12}([\d][\d.,]*)\s*m\s*[²2]/i.exec(t);
  if (u) return parseArea(u[1]);
  const bare = /\bo\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(t);
  return bare ? parseArea(bare[1]) : null;
}

function plnFromRegion(region) {
  const m = /([\d][\d\s .,]*(?:,\d{2})?)\s*z[łl]/i.exec(region || '');
  return m ? parsePLN(m[1]) : null;
}

export function extractStartingPrice(body) {
  const t = toAscii(body || '');
  const idx = t.search(/cen[aey]\s+wywolawcz/);
  if (idx < 0) return null;
  const region = (body || '').slice(idx, idx + 240);
  const zl = plnFromRegion(region);
  if (zl != null) return zl;
  const m = /(\d{1,3}(?:[.\s ]\d{3})+,\d{2}|\d+,\d{2})/.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function extractFinalPrice(text) {
  const t = toAscii(text || '');
  let m = /osiagni\w*[\s\S]{0,60}?w\s+kwocie\s+([\d][\d\s .,]*(?:,\d{2})?)\s*z[łl]/.exec(t);
  if (m) return parsePLN(m[1]);
  m = /(?:cena\s+)?osiagni\w*[\s\S]{0,40}?([\d][\d\s .,]*(?:,\d{2})?)\s*z[łl]/.exec(t);
  return m ? parsePLN(m[1]) : null;
}

const UNSOLD_RE = /wynik\w*\s+negatywn|zako[ńn]czy[łl]\w*\s+si[ęe][\s\S]{0,30}negatywn|nikt\s+nie\s+(?:przyst[ąa]pi|wp[łl]aci|z[łl]o[żz])|nie\s+pojawi[łl]\s+si[ęe]\s+[żz]aden|brak\s+(?:oferent|uczestnik|nabywc|ch[ęe]tn|wp[łl]at|wadium)/i;

function extractBuyer(text) {
  const m = new RegExp(
    `nabywc[${PL_LOW}]*\\s+(?:nieruchomo[śs]ci\\s+[${PL_LOW}]+\\s+)?(?:zosta[łl][${PL_LOW}]*\\s+)?(?:p\\.?\\s*|pan[${PL_LOW}]*\\s+|pa[nń]stwo\\s+)?([${PL_UP}][^.,;(\\n]{2,60})`,
    'i',
  ).exec(text || '');
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}


export function parseAnnouncement(html, url) {
  const body = extractBodyText(html);
  const title = extractTitle(html);
  const kind = classifyKind(`${title}\n${body}`);

  const base = {
    round: roundFromText(title) ?? roundFromText(body),
    cancelled: isCancelled(title),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    detail_url: url,
  };

  if (kind === 'grunt') {
    const dzialka_nr = extractDzialkaNr(body);
    const obreb = extractObreb(body);
    const street = extractLandStreet(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return {
      ...base, kind, area_m2: extractAreaM2(body, 'grunt'),
      address_raw: parts.join(', ') || (street ? `ul. ${street}` : null),
      address: null, dzialka_nr, obreb,
    };
  }

  const addr = kind === 'mieszkalny' ? extractFlatAddress(body) : extractStreetAddress(body);
  return {
    ...base, kind, area_m2: extractAreaM2(body, kind),
    address_raw: addr.address_raw, address: addr.address, dzialka_nr: null, obreb: null,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  let t = String(text);
  t = /<div class="content[^"]*">/i.test(t) ? extractBodyText(t) : stripTags(t);

  const looksResult = /o\s+wyniku\s+[\s\S]*?przetarg|informacj\w*\s+o\s+wyniku|cena\s+osi[ąa]gni|wynik\w*\s+negatywn/i.test(t);
  if (!looksResult) return [];
  if (isLeaseTitle(t.slice(0, 300))) return [];
  if (isCancelled(t.slice(0, 300))) return [];

  const kind = classifyKind(t);
  const starting_price_pln = extractStartingPrice(t);
  const final_price_pln = extractFinalPrice(t);
  const unsold = UNSOLD_RE.test(t);
  const outcome = unsold ? 'unsold' : final_price_pln != null ? 'sold' : 'open';
  const auction_date = extractAuctionDate(t) || fallbackDate || null;
  const round = roundFromText(t);
  const buyer = outcome === 'sold' ? extractBuyer(t) : null;

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'open') notes.push('parse: result notice with neither an achieved price nor an unsold marker');

  const common = {
    auction_date, source_pdf: sourceUrl, kind, round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    buyer,
    notes,
  };

  if (kind === 'grunt') {
    const dzialka_nr = extractDzialkaNr(t);
    const obreb = extractObreb(t);
    const street = extractLandStreet(t);
    if (!dzialka_nr && !obreb && !street) return [];
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return [{
      ...common,
      address_raw: parts.join(', ') || (street ? `ul. ${street}` : null),
      address: null, dzialka_nr, obreb, area_m2: extractAreaM2(t, 'grunt'),
    }];
  }

  const addr = kind === 'mieszkalny' ? extractFlatAddress(t) : extractStreetAddress(t);
  if (!addr.address) return [];
  return [{
    ...common,
    address_raw: addr.address_raw, address: addr.address, area_m2: extractAreaM2(t, kind),
  }];
}
