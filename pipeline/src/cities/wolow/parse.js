import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
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
  const cleaned = String(s).replace(/\s/g, '');
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
  stycznia: 1, styczen: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3, kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9, pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11, grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function dateFromNumeric(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return iso(m[3], mon, day);
}


export function extractArticleText(html) {
  if (!html) return '';
  const m = /<div class="sub-page__content[^"]*">([\s\S]*?)<footer class="sub-page__footer/i.exec(html);
  if (m) return stripTags(m[1]);
  const articleM = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainM = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  const raw = articleM ? articleM[1] : mainM ? mainM[1] : html;
  return stripTags(raw);
}

export function extractTitle(html) {
  if (!html) return null;
  const m = /<h1 class="pageHeader">([\s\S]*?)<\/h1>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /pageDatetimeCreate">.*?&nbsp;(\d{1,2})-(\d{1,2})-(\d{4})/i.exec(html);
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}


export function roundFromTitle(text) {
  const t = toAscii(text || '');
  const m = /\b(i|ii|iii|iv|v)\s+ustn\w*\s+przetarg\w*/.exec(t);
  if (!m) return null;
  const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
  return ROMAN[m[1]] ?? null;
}

export function isCancelled(title) {
  const t = toAscii(title || '').trim();
  return /^ogloszenie\s+o\s+odwolan|^odwolanie\s+przetarg|^uniewazni/.test(t);
}


const AFTER_POLOZ_RE = /po[łl]o[żz]on\w*\s+w\s+/i;

function locationWindow(body) {
  const m = AFTER_POLOZ_RE.exec(body || '');
  if (!m) return '';
  return body.slice(m.index + m[0].length, m.index + m[0].length + 300);
}

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';

const STREET_RE = new RegExp(
  `\\bul\\.?\\s+([${PL_UP}][${PL_UP}${PL_LOW}.\\s]{0,40}?)\\s+(\\d+[A-Za-z]?)(?:[-\\/]\\d+[A-Za-z]?)?\\b`,
);

const RURAL_RE = new RegExp(`\\b([${PL_UP}][${PL_LOW}]+)\\s+(?:nr\\.?\\s+)?(\\d+[A-Za-z]?)\\b`);

const RURAL_RE_MULTI = new RegExp(
  `\\b([${PL_UP}][${PL_LOW}]+(?:\\s+(?!Dzia[łl]\\w*\\b|Nieruchomo\\w*\\b|Lokal\\w*\\b|Am\\b)[${PL_UP}][${PL_LOW}]+)?)\\s+(?:nr\\.?\\s+)?(\\d+[A-Za-z]?)\\b`,
);

const LOKAL_NR_RE = /\bLokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+)?\s*nr\.?\s*(\d+[A-Za-z]?)/i;

function extractLokalNr(body) {
  const m = LOKAL_NR_RE.exec(body || '');
  return m ? m[1] : null;
}

const LOCATIVE_MAX_CHARS = 30;

const SELF_REPORT_RE =
  /[IVX]+\s+przetarg\w*(?:\s+na\s+sprzeda[żz]\s+nieruchomo[śs]ci)?\s+(?:przeprowadzono|zosta[łl]\s+przeprowadzony)\s+\d{1,2}\.\d{1,2}\.\d{4}\s*r\.?(?:,?\s*a\s+\w+\s+\d{1,2}\.\d{1,2}\.\d{4}\s*r\.?)*\.?\s*/i;

function nominativeWindow(body) {
  const window = locationWindow(body);
  const srM = SELF_REPORT_RE.exec(window);
  if (srM && srM.index <= LOCATIVE_MAX_CHARS) {
    return { rest: window.slice(srM.index + srM[0].length), skipped: true };
  }
  const dot = window.search(/\./);
  const skipped = dot >= 0 && dot <= LOCATIVE_MAX_CHARS;
  const rest = skipped ? window.slice(dot + 1).replace(/^\s+/, '') : window;
  return { rest, skipped };
}

function extractStreetAddress(body) {
  const window = locationWindow(body);
  const s = STREET_RE.exec(window) || STREET_RE.exec(body);
  if (s) return { street: s[1].trim().replace(/\s+/g, ' '), building: s[2] };
  const { rest, skipped } = nominativeWindow(body);
  const r = skipped ? RURAL_RE_MULTI.exec(rest) : RURAL_RE.exec(rest);
  if (r) return { street: r[1].trim().replace(/\s+/g, ' '), building: r[2] };
  return null;
}

const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:niezabudowan\w*\s+)?(?:o\s+)?(?:numer|nr\.?)\s*(\d+(?:\/\d+)?(?:\s*(?:i|,|oraz)\s*\d+(?:\/\d+)?)*)/i;

function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

const AM_RE = /\bAm\.?[\s-]*(\d+)\b/i;

function extractAmSheet(body) {
  const m = AM_RE.exec(body || '');
  return m ? m[1] : null;
}

function extractObreb(body) {
  const { rest } = nominativeWindow(body);
  const stopM = /Dzia[łl]\w*|Nieruchomo[śs][ćc]\s+zabudowan\w*|\bul\.?\s/i.exec(rest);
  const span = (stopM ? rest.slice(0, stopM.index) : rest).trim();
  const m = new RegExp(
    `^[${PL_UP}][${PL_LOW}]+(?:\\s+(?!Dzia[łl]\\w*\\b|Nieruchomo\\w*\\b)[${PL_UP}][${PL_LOW}]+)?`,
  ).exec(span);
  return m ? m[0].trim() : null;
}

function extractSubject(body, kind) {
  const dzialka_nr = extractDzialkaNr(body);
  if (kind === 'grunt') {
    const obreb = extractObreb(body);
    const am = extractAmSheet(body);
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null, am ? `Am ${am}` : null].filter(Boolean);
    return { address_raw: parts.length ? parts.join(', ') : null, address: null, dzialka_nr, obreb };
  }
  const found = extractStreetAddress(body);
  if (!found) return { address_raw: null, address: null, dzialka_nr, obreb: null };
  const apt = extractLokalNr(body);
  const raw = apt ? `${found.street} ${found.building}/${apt}` : `${found.street} ${found.building}`;
  const address = parseAddress(raw);
  return { address_raw: raw, address, dzialka_nr, obreb: null };
}


function extractAreaM2(body, kind) {
  if (kind === 'grunt') {
    const ha = /o\s+pow(?:ierzchni)?\.?\s*([\d]+[.,]\d+|\d+)\s*ha\b/i.exec(body);
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
    const m2 = /o\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
    return m2 ? parseArea(m2[1]) : null;
  }
  const labelled = /pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*[^\d]{0,20}([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  if (labelled) return parseArea(labelled[1]);
  const bare = /\bo\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(body);
  return bare ? parseArea(bare[1]) : null;
}

function extractStartingPrice(body) {
  const t = toAscii(body);
  const idx = t.search(/cena\s+wywolawcza/);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 200);
  const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

function extractWykazPrice(body) {
  const t = toAscii(body);
  const idx = t.search(/cena\s+nieruchomosci/);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 150);
  const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

function extractAuctionDate(body) {
  const idx = body.search(/odb[ęe]dzie\s+si[ęe]/i);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 60);
  return dateFromNumeric(region);
}


export function parseAnnouncement(html, url) {
  const body = extractArticleText(html);
  const title = extractTitle(html) || '';
  const kind = classifyKind(body || title);
  const round = roundFromTitle(title) ?? roundFromTitle(body);
  const cancelled = isCancelled(title);
  const subject = extractSubject(body, kind);
  return {
    kind,
    round,
    cancelled,
    area_m2: extractAreaM2(body, kind),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    ...subject,
  };
}

export function parseWykaz(html, url) {
  const body = extractArticleText(html);
  const kind = classifyKind(body);
  const subject = extractSubject(body, kind);
  return {
    kind,
    published_date: extractPublishedDate(html),
    starting_price_pln: extractWykazPrice(body),
    area_m2: extractAreaM2(body, kind),
    wykaz_no: null,
    ...subject,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const body = /<[a-z][\s\S]*>/i.test(text) ? extractArticleText(text) : text;
  if (!body || !body.trim()) return [];
  const title = extractTitle(text) || '';
  const kind = classifyKind(body || title);
  if (isCancelled(title)) return [];
  const subject = extractSubject(body, kind);
  if (!subject.address && !subject.dzialka_nr) return [];

  const auction_date = extractAuctionDate(body) || fallbackDate || null;
  const round = roundFromTitle(title) ?? roundFromTitle(body);
  const starting_price_pln = extractStartingPrice(body);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  notes.push('parse: no achieved-price document exists on this source (see parse.js header) — outcome inferred from the next round being published, not a source-stated result');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    dzialka_nr: subject.dzialka_nr,
    obreb: subject.obreb,
    round,
    starting_price_pln,
    final_price_pln: null,
    outcome: 'unsold',
    outcome_evidence: 'inferred',
    unsold_reason: 'superseded_by_next_round',
    area_m2: extractAreaM2(body, kind),
    notes,
  }];
}
