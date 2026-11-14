
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&sup2;|&#178;/gi, '²')
    .replace(/&quot;/gi, '"')
    .replace(/&rsaquo;/gi, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
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
  styczen: 1, stycznia: 1,
  luty: 2, lutego: 2,
  marzec: 3, marca: 3,
  kwiecien: 4, kwietnia: 4,
  maj: 5, maja: 5,
  czerwiec: 6, czerwca: 6,
  lipiec: 7, lipca: 7,
  sierpien: 8, sierpnia: 8,
  wrzesien: 9, wrzesnia: 9,
  pazdziernik: 10, pazdziernika: 10,
  listopad: 11, listopada: 11,
  grudzien: 12, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function dateFromWords(s) {
  const m = /(\d{1,2})\s+([A-Za-ząćęłńóśźż]{3,})\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAscii(m[2])];
  if (!mon) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  return iso(m[3], mon, day);
}

function dateFromNumeric(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return iso(m[3], mon, day);
}

export function parseDateText(s) {
  return dateFromWords(s) ?? dateFromNumeric(s);
}


export function extractTextContent(html) {
  if (!html) return '';
  const m = /<div id="text_content">([\s\S]*?)(?:<div class="table_file"|<div id="div_up"|<div id="foot")/i.exec(html);
  if (m) return stripTags(m[1]);
  const t = /<div id="tresc"[^>]*>([\s\S]*?)<div id="foot"/i.exec(html);
  return t ? stripTags(t[1]) : stripTags(html);
}

export function extractTitle(html) {
  const body = extractTextContent(html);
  const m = /^(.*?)\s*Status\s*:/is.exec(body);
  if (m && m[1].trim()) return m[1].trim();
  const t = /<title>([^<]*)<\/title>/i.exec(html || '');
  if (!t) return null;
  return t[1]
    .replace(/^\s*Przetargi na sprzeda[żz] nieruchomo[śs]ci\s*-\s*/i, '')
    .replace(/\s*-\s*BIP GZMK.*$/i, '')
    .trim();
}

export function extractPublishedDate(html) {
  if (!html) return null;
  const reg = /Informacj[eę]\s+wprowadzi[łl]\([^)]*\)\s*:[^(]*\((\d{4})-(\d{2})-(\d{2})/i.exec(stripTags(html));
  if (reg) return `${reg[1]}-${reg[2]}-${reg[3]}`;
  const pub = /Data\s+opublikowania\s*:\s*(\d{4})-(\d{2})-(\d{2})/i.exec(stripTags(html));
  if (pub) return `${pub[1]}-${pub[2]}-${pub[3]}`;
  return null;
}


const NEXT_LABEL =
  '(?=Status\\s*:|Adres\\s*:|Nr dzia|Nr ks|Powierzchnia|Plan zagosp|Cena wyw|Data przetargu|Kwota wadium|Data wniesienia|Z\\s?A\\s?W\\s?I\\s?A\\s?D|ZAWIADOM|Pliki do pobrania|metryczka|$)';

function field(body, labelRe) {
  const re = new RegExp('(?:' + labelRe + ')\\s*:\\s*(.*?)\\s*' + NEXT_LABEL, 'is');
  const m = re.exec(body || '');
  return m ? m[1].trim() : null;
}

export function extractStatus(body) {
  const v = field(body, 'Status');
  if (!v) return null;
  return toAscii(v).replace(/[^a-z].*$/, '') || null;
}


export function roundFromTitle(text) {
  const t = toAscii(text || '');
  const m = /\b(i|ii|iii|iv|v)\s+ustn\w*\s+przetarg\w*/.exec(t);
  if (!m) return null;
  return { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }[m[1]] ?? null;
}


function parseAdresField(adres) {
  if (!adres) return { street: null, building: null, city: null };
  const left = adres.split(',')[0].trim().replace(/^ul\.?\s+/i, '');
  const cityM = /\d{2}-\d{3}\s+(.+?)\s*$/.exec(adres);
  const city = cityM ? cityM[1].trim() : null;
  const bm = /^(.*?\S)\s+(\d+[A-Za-z]?)$/.exec(left);
  if (bm) return { street: bm[1].trim(), building: bm[2], city };
  return { street: left || null, building: null, city };
}

function extractDzialkaNr(body) {
  const v = field(body, 'Nr dzia[łl]ki');
  if (!v) return null;
  const m = /(\d+(?:\/\d+)?)/.exec(v);
  return m ? m[1] : null;
}

function extractStreetAddress(body, title) {
  const adres = field(body, 'Adres');
  const a = parseAdresField(adres);
  const hay = `${title || ''} ${body || ''}`;

  let street = a.street;
  let building = a.building;
  if (!building) {
    const bm = /\bul\.?\s+[A-Za-ząćęłńóśźż.]+\s+(\d+[A-Za-z]?)\b/i.exec(hay);
    if (bm) building = bm[1];
  }
  if (!street) {
    const sm = /\bul\.?\s+([A-Za-ząćęłńóśźż.]+?)\s+\d/i.exec(hay);
    if (sm) street = sm[1];
  }
  if (!street || !building) return null;

  let apt = null;
  const am = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)?\s*nr\.?\s*(\d+[A-Za-z]?)/i.exec(hay);
  if (am) apt = am[1];
  else {
    const slashM = new RegExp('\\b' + building.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*/\\s*(\\d+[A-Za-z]?)').exec(hay);
    if (slashM) apt = slashM[1];
  }

  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address_raw: raw, address: parseAddress(raw) };
}

function extractSubject(body, title, kind) {
  const dzialka_nr = extractDzialkaNr(body);
  if (kind === 'grunt') {
    const obreb = parseAdresField(field(body, 'Adres')).city;
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return { address_raw: parts.length ? parts.join(', ') : null, address: null, dzialka_nr, obreb };
  }
  const found = extractStreetAddress(body, title);
  if (!found) return { address_raw: null, address: null, dzialka_nr, obreb: null };
  return { address_raw: found.address_raw, address: found.address, dzialka_nr, obreb: null };
}


export function extractAreaM2(body, kind) {
  if (kind === 'mieszkalny' || kind === 'uzytkowy' || kind === 'garaz') {
    const m = /u[żz]ytkow\w*\s*([\d]+(?:[.,]\d+)?)\s*m\s*[²2]?/i.exec(body || '');
    return m ? parseArea(m[1]) : null;
  }
  const pow = field(body, 'Powierzchnia');
  if (!pow) return null;
  const ha = /([\d]+(?:[.,]\d+)?)\s*ha\b/i.exec(pow);
  if (ha) {
    const v = parseArea(ha[1]);
    return v == null ? null : Math.round(v * 10000);
  }
  const m2 = /([\d]+(?:[.,]\d+)?)\s*m\s*[²2]?/i.exec(pow);
  return m2 ? parseArea(m2[1]) : null;
}

export function extractStartingPrice(body) {
  const m = /Cena\s+wywo[łl]awcza\s*(?:\(netto\))?\s*:\s*([\d\s.,]+?)\s*z[łl]/i.exec(body || '');
  return m ? parsePLN(m[1]) : null;
}

export function extractAuctionDate(body) {
  const v = field(body, 'Data przetargu');
  return v ? parseDateText(v) : null;
}


const SOLD_PRICE_RE = /nabywc[aeęą][\s\S]{0,220}?za\s+cen[eę]\s*([\d\s.,]+?)\s*z[łl]/i;
const CENA_OSIAG_RE = /cena\s+osi[ąa]gni[eę]ta\s*[:\-]?\s*([\d\s.,]+?)\s*z[łl]/i;
const NEGATIVE_RE = /wynikiem\s+negatywnym|nie\s+zosta[łl]o\s+wp[łl]acone\s+[żz]adne\s+wadium|nie\s+wp[łl]yn[eę][łl]o\s+[żz]adne\s+wadium|nikt\s+nie\s+przyst[ąa]pi[łl]/i;

export function extractOutcome(body) {
  const b = body || '';
  const soldM = SOLD_PRICE_RE.exec(b) || CENA_OSIAG_RE.exec(b);
  if (soldM) {
    return { outcome: 'sold', final_price_pln: parsePLN(soldM[1]), unsold_reason: null };
  }
  if (NEGATIVE_RE.test(b)) {
    const reason = /[żz]adne\s+wadium/i.test(b) ? 'brak wadium' : 'wynik negatywny';
    return { outcome: 'unsold', final_price_pln: null, unsold_reason: reason };
  }
  return { outcome: 'open', final_price_pln: null, unsold_reason: null };
}


export function parseNotice(html, url) {
  const body = extractTextContent(html);
  const title = extractTitle(html) || '';
  const kind = classifyKind(body || title);
  const status = extractStatus(body);
  const subject = extractSubject(body, title, kind);
  return {
    kind,
    status,
    round: roundFromTitle(title) ?? roundFromTitle(body),
    area_m2: extractAreaM2(body, kind),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(html),
    detail_url: url,
    ...subject,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const html = String(text);
  const body = /<[a-z][\s\S]*>/i.test(html) ? extractTextContent(html) : html;
  if (!body.trim()) return [];
  const title = extractTitle(html) || '';
  const status = extractStatus(body);
  const { outcome, final_price_pln, unsold_reason } = extractOutcome(body);
  if (status !== 'rozstrzygniety' && outcome === 'open') return [];

  const kind = classifyKind(body || title);
  const subject = extractSubject(body, title, kind);
  if (!subject.address && !subject.dzialka_nr) return [];

  return [{
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    dzialka_nr: subject.dzialka_nr,
    obreb: subject.obreb,
    round: roundFromTitle(title) ?? roundFromTitle(body),
    area_m2: extractAreaM2(body, kind),
    starting_price_pln: extractStartingPrice(body),
    final_price_pln,
    auction_date: extractAuctionDate(body) || fallbackDate || null,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}
