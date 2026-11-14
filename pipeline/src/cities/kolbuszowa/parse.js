import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


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
  const cleaned = String(s).replace(/[\s ]/g, '');
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

const W_DNIU_RE = /w\s+dniu\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/;

function isoFromWDniu(m) {
  if (!m) return null;
  const day = Number(m[1]);
  const mon = PL_MONTHS[m[2]];
  if (!mon || day < 1 || day > 31) return null;
  return iso(m[3], mon, day);
}

export function extractAuctionDate(text) {
  const t = toAscii(text || '');
  const anchor = /odb[ęe]dzie\s+si[ęe]/.exec(t) || /odby[łl]\w*\s+si[ęe]/.exec(t);
  if (anchor) {
    const m = W_DNIU_RE.exec(t.slice(anchor.index));
    const d = isoFromWDniu(m);
    if (d) return d;
  }
  return isoFromWDniu(W_DNIU_RE.exec(t));
}


export function extractArticleText(html) {
  if (!html) return '';
  const m = /<div class="art-body[^"]*">([\s\S]*?)(?:<!--\s*ZALACZNIKI\s*-->|<div class="attachments)/i.exec(html);
  if (m) return stripTags(m[1]);
  const m2 = /<div class="art-body[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i.exec(html);
  return m2 ? stripTags(m2[1]) : '';
}

export function extractTitle(html) {
  if (!html) return '';
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return '';
  return stripTags(m[1]).replace(/^Przetargi\s*-\s*\d{4}\s*r\.\s*-\s*/i, '').trim();
}

export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /Data\s+publikacji\s*:\s*<strong>\s*(\d{4})-(\d{2})-(\d{2})/i.exec(html);
  return m ? iso(m[1], Number(m[2]), Number(m[3])) : null;
}


const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

export function roundFromText(text) {
  const t = toAscii(text || '');
  const m = /\b(i{1,3}|iv|v)\s+(?:publiczn\w+\s+)?przetarg\w*\s+ustn/.exec(t);
  return m ? ROMAN[m[1]] ?? null : null;
}

export function isCancelled(title) {
  const t = toAscii(title || '');
  return /\bodwolan|uniewazni|\bodwoluje\b/.test(t);
}


const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

const FLAT_ADDR_RE = new RegExp(
  `budynku\\s+wielorodzinnym\\s+w\\s+[${PL_UP}][${PL_LOW}]+\\s+przy\\s+ul(?:icy|\\.)?\\s+` +
  `([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)\\s+(\\d+[A-Za-z]?)(?:[\\/-]\\d+[A-Za-z]?)?`,
  'i',
);

const LOKAL_NR_RE = /\blokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

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

const DZIALKA_RE = /nr\s+ew\.?\s+dzia[łl]\w*\s*:?\s*((?:\d+\/\d+|\d+)(?:\s*(?:i|,|oraz)\s*(?:\d+\/\d+|\d+))*)/i;

function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function extractObreb(body) {
  const m = new RegExp(
    `gruntowa\\s+po[łl]o[żz]on\\w*\\s+w\\s+([${PL_UP}][${PL_LOW}]+(?:\\s+[${PL_UP}][${PL_LOW}]+)?)`,
  ).exec(body || '');
  return m ? m[1].trim() : null;
}


export function extractAreaM2(body, kind) {
  if (kind === 'grunt') {
    const ha = /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(body || '');
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
    return null;
  }
  const m = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*[^\d]{0,12}([\d][\d.,]*)\s*m\s*[²2]/i.exec(body || '');
  if (m) return parseArea(m[1]);
  const bare = /\bo\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(body || '');
  return bare ? parseArea(bare[1]) : null;
}

function plnFromRegion(region) {
  const m = /([\d][\d\s .,]*(?:,\d{2})?)\s*z[łl]/i.exec(region || '');
  return m ? parsePLN(m[1]) : null;
}

export function extractStartingPrice(body) {
  const t = toAscii(body || '');
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 220);
  const zl = plnFromRegion(region);
  if (zl != null) return zl;
  const m = /(\d{1,3}(?:[\s ]\d{3})+,\d{2}|\d+,\d{2})/.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function extractFinalPrice(text) {
  const t = toAscii(text || '');
  const idx = t.search(/cena\s+osiagnieta/);
  if (idx < 0) return null;
  return plnFromRegion(text.slice(idx, idx + 120));
}

const UNSOLD_RE = /wynik\w*\s+negatywn|zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynikiem\s+negatywn|nie\s+wy[łl]oniono|brak\s+(?:oferent|uczestnik|wp[łl]at|wadium|nabywc)|nikt\s+nie\s+(?:przyst[ąa]pi|wp[łl]aci)/i;

export function findResultPdfHref(html) {
  if (!html) return null;
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (/wynik/i.test(stripTags(m[2]))) return m[1];
  }
  return null;
}


export function parseAnnouncement(html, url) {
  const body = extractArticleText(html);
  const title = extractTitle(html);
  const round = roundFromText(title) ?? roundFromText(body);
  const cancelled = isCancelled(title);
  let kind = classifyKind(`${title}\n${body}`);

  const flatAddr = kind !== 'grunt' ? extractFlatAddress(body) : { address_raw: null, address: null };
  const dzialka_nr = extractDzialkaNr(body);
  if (kind !== 'grunt' && !flatAddr.address && kind !== 'mieszkalny' && dzialka_nr) {
    kind = 'grunt';
  }

  const base = {
    round,
    cancelled,
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    detail_url: url,
  };

  if (kind === 'grunt') {
    const obreb = extractObreb(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return {
      ...base, kind, area_m2: extractAreaM2(body, 'grunt'),
      address_raw: parts.join(', ') || null, address: null, dzialka_nr, obreb,
    };
  }
  return {
    ...base, kind, area_m2: extractAreaM2(body, kind),
    address_raw: flatAddr.address_raw, address: flatAddr.address, dzialka_nr: null, obreb: null,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const looksResult = /o\s+wyniku\s+przetarg|cena\s+osi[ąa]gni[ęe]ta|wynikiem\s+negatywn/i.test(t);
  if (!looksResult) return [];
  const kind = classifyKind(t);
  if (kind !== 'mieszkalny') return [];
  if (isCancelled(t)) return [];

  const addr = extractFlatAddress(t);
  if (!addr.address) return [];

  const starting_price_pln = extractStartingPrice(t);
  const final_price_pln = extractFinalPrice(t);
  const unsold = UNSOLD_RE.test(t);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'open') notes.push('parse: result notice with neither an achieved price nor an unsold marker');

  return [{
    auction_date: extractAuctionDate(t) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round: roundFromText(t),
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    area_m2: null,
    notes,
  }];
}
