import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTHS = {
  stycznia: 1, styczen: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function normPL(s) {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ł/g, 'l').replace(/ń/g, 'n');
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr).replace(/\s/g, '');
  const commaDecimal = /^[\d.]+,\d{2}$/.test(s);
  if (commaDecimal) {
    return Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) | 0;
  }
  const digits = s.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripHtmlTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

const ORDINAL_RE =
  /\b(pierwsz(?!e[nn])|drug|trzeci|czwart|pi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,40}))/g;
const ORDINALS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5 };
const ROMAN_PRE_RE = /\b(II{0,3}|IV|VI?I?I?|IX|X)\s+przetarg/i;
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const t = (text || '');
  const rm = ROMAN_PRE_RE.exec(t);
  if (rm) {
    const r = ROMAN_MAP[rm[1].toUpperCase()];
    if (r) return r;
  }
  ORDINAL_RE.lastIndex = 0;
  let m;
  while ((m = ORDINAL_RE.exec(t)) !== null) {
    if (/\b(?:odby[łl]|zako[ńn]czy[łl])/.test(m[2] || '')) continue;
    for (const [key, val] of Object.entries(ORDINALS)) {
      if (normPL(m[1]).startsWith(normPL(key))) return val;
    }
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}


export function parseListPage(html, base = 'https://bip.um.augustow.pl') {
  const out = [];
  const itemRe = /<li[^>]*class="[^"]*component-item[^"]*clearfix[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const li = m[1];

    const linkM = /<h2[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"(?:[^>]*title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    if (!linkM) continue;

    let href = linkM[1].replace(/&amp;/gi, '&');
    const titleRaw = stripHtmlTags(linkM[2] || linkM[3]);

    if (href.startsWith('/')) href = base + href;

    const kind = classifyKind(titleRaw);
    if (kind !== 'mieszkalny') continue;

    if (/informacja\s+o\s+wynikach/i.test(titleRaw)) continue;

    const dateM = /<div[^>]*class="[^"]*component-date-add[^"]*"[^>]*>(\d{4}-\d{2}-\d{2})/.exec(li);
    const published_date = dateM ? dateM[1] : null;

    const round = roundFromText(titleRaw);

    out.push({
      title: titleRaw,
      detail_url: href,
      published_date,
      kind,
      round,
    });
  }
  return out;
}


export function isResultNoticeTitle(title) {
  return /informacja\s+o\s+wynikach/i.test(title || '');
}


function htmlToText(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function announcementBaseAddress(text) {
  if (!text) return null;
  const m = /przy\s+(Rynku?\s+[A-ZŻŹĆŁŚĄĘÓŃ][^\n,:(]{2,50}?|(?:ul\.?\s+)?[A-ZŻŹĆŁŚĄĘÓŃ][^\n,:(]{2,50}?)\s+(\d+[A-Za-z]?)\s*[:(,]/i.exec(text);
  if (!m) return null;
  let street = m[1].trim().replace(/^Rynku\b/i, 'Rynek');
  if (!/^(rynek|ul\.|al\.|pl\.|os\.|plac|rynek)/i.test(street)) street = 'ul. ' + street;
  return { streetPrefix: street, building: m[2] };
}

export function auctionDateFromAnnouncementText(text) {
  if (!text) return null;
  const numM = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  const wordM = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[normPL(wordM[2])];
    if (mo) return iso(wordM[3], mo, wordM[1]);
  }
  return null;
}

export function parseAnnouncementDetail(html, ctx = {}) {
  const text = htmlToText(html);
  const base = announcementBaseAddress(text);
  if (!base) return [];

  const auction_date = auctionDateFromAnnouncementText(text);
  const round = ctx.round ?? roundFromText(text);
  const kind = ctx.kind || 'mieszkalny';
  const detail_url = ctx.detail_url || null;
  const published_date = ctx.published_date || null;

  const out = [];
  const blockRe = /lokal\s+mieszkaln\w*\s+Nr\s+(\d+[A-Za-z]?)\s+o\s+(?:pow\.?\s*)?(\d+[,.]\d+)\s*m\s*(?:kw|[²2])/gi;
  const hits = [];
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    hits.push({ apt: m[1], area: m[2], idx: m.index });
  }
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].idx : hits[i].idx + 600;
    const seg = text.slice(hits[i].idx, end);
    const pm = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(seg);
    const address = parseAddress(`${base.streetPrefix} ${base.building}/${hits[i].apt}`);
    if (!address) continue;
    out.push({
      kind,
      address,
      address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
      auction_date,
      published_date,
      round: round ?? null,
      area_m2: parseArea(hits[i].area),
      starting_price_pln: pm ? parsePLN(pm[1]) : null,
      detail_url,
    });
  }

  if (out.length === 0) {
    const address = parseAddress(`${base.streetPrefix} ${base.building}`);
    if (address) {
      out.push({
        kind,
        address,
        address_raw: `${address.street} ${address.building}`,
        auction_date,
        published_date,
        round: round ?? null,
        area_m2: areaFromResultText(text),
        starting_price_pln: startingPriceFromResultText(text),
        detail_url,
      });
    }
  }
  return out;
}


export function attachmentUrlFromDetail(html, base = 'https://bip.um.augustow.pl') {
  if (!html) return null;
  const pdf = /href="([^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html);
  if (pdf) {
    const u = pdf[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  const docx = /href="([^"]+\.docx?(?:\?[^"]*)?)"/i.exec(html);
  if (docx) {
    const u = docx[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  return null;
}


export function isResultNotice(text) {
  return /informacja\s+o\s+wynikach[\s\S]{0,80}przetarg/i.test(text || '');
}

export function auctionDateFromResultText(text) {
  if (!text) return null;
  const numM = /przeprowadzon\w*\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text)
    || /przeprowadzon\w*\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  const wordM = /przeprowadzon\w*\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTHS[normPL(wordM[2])];
    if (mo) return iso(wordM[3], mo, wordM[1]);
  }
  return null;
}

export function startingPriceFromResultText(text) {
  if (!text) return null;
  const m = /cena\s+wywo[łl]awcza\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromResultText(text) {
  if (!text) return null;
  const m = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

function isNegativeOutcome(text) {
  return /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy/i.test(text || '');
}

export function addressFromResultText(text) {
  if (!text) return null;
  const m1 = /przy\s+(?:ul|ulicy|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^,\n]{2,60}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?(?:\s|,|$)/i.exec(text);
  if (m1) {
    const apt = m1[3] || null;
    return parseAddress(`ul. ${m1[1].trim()} ${m1[2]}${apt ? '/' + apt : ''}`);
  }
  const m2 = /przy\s+(Rynku?\s+[A-ZŻŹĆŁŚĄĘÓŃ][^\n,]{2,50}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?(?:\s|,|$)/i.exec(text);
  if (m2) {
    const apt = m2[3] || null;
    return parseAddress(`${m2[1].trim()} ${m2[2]}${apt ? '/' + apt : ''}`);
  }
  return null;
}

export function areaFromResultText(text) {
  if (!text) return null;
  const m = /(?:lokal|mieszkaln)[^.]{0,80}?(\d+[,.]\d+)\s*m\s*(?:[²2kw]|kw)/i.exec(text)
    || /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?([\d]+[,.]\d+)\s*m/i.exec(text);
  return m ? parseArea(m[1]) : null;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');

  const notes = [];
  const auctionDate = auctionDateFromResultText(t) || fallbackDate || null;
  const starting_price_pln = startingPriceFromResultText(t);
  const final_price_pln = achievedPriceFromResultText(t);
  const negative = isNegativeOutcome(t) || (!final_price_pln && !/nabywc/i.test(t));

  const address = addressFromResultText(t);
  if (!address) notes.push('parse: address not found in result text');

  const kind = classifyKind(t);
  const area_m2 = areaFromResultText(t);

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  const addressRaw = address
    ? `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`
    : null;

  return [{
    auction_date: auctionDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addressRaw,
    address,
    round: roundFromText(t),
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: negative ? null : (final_price_pln ?? null),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2: area_m2 ?? null,
    notes,
  }];
}
