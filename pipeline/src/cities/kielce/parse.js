
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
  const s = String(numStr).replace(/\s/g, '').replace(/,00,00$/, ',00');
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
  const n = Number(String(numStr).replace(/\s/g, '').replace(/,00,00$/, ',00').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stripHtmlTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

const ORDINAL_RE =
  /\b(pierwsz(?!e[ńn])|drug|trzeci|czwart|pi[ąa]t)[\wąćęłńóśźż]*\s+(?:[\wąćęłńóśźż]+\s+){0,4}?przetarg[\wąćęłńóśźż]*(?=([\s\S]{0,40}))/g;
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
    const stem = normPL(m[1]).replace(/[\wąćęłńóśźż]+$/, '');
    for (const [key, val] of Object.entries(ORDINALS)) {
      if (normPL(m[1]).startsWith(key)) return val;
    }
  }
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}


function aptFromTitle(title) {
  const m = /numerem\s+(\d+[A-Za-z]?)/i.exec(title || '');
  return m ? m[1] : null;
}

export function areaFromTitle(title) {
  const m = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,30}?([\d]+[.,][\d]+)\s*m/i.exec(title || '');
  if (m) return parseArea(m[1]);
  const fb = /([\d]+[.,][\d]+)\s*m\s*2/i.exec(title || '');
  return fb ? parseArea(fb[1]) : null;
}

function addressFromTitle(title, aptOverride) {
  const m = /przy\s+(?:ul|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^,\n]+?)\s+(\d+[A-Za-z]?)\s+w\s+Kielcach/i.exec(title || '');
  if (!m) return null;
  const street = m[1].trim();
  const bldg = m[2];
  const apt = aptOverride || null;
  const raw = `ul. ${street} ${bldg}${apt ? '/' + apt : ''}`;
  return parseAddress(raw);
}


export function parseListPage(html, base = 'https://bipum.kielce.eu') {
  const out = [];
  const itemRe = /<li[^>]*class="[^"]*component-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const li = m[1];
    const linkM = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(li);
    if (!linkM) continue;

    let href = linkM[1].replace(/&amp;/gi, '&');
    const titleRaw = stripHtmlTags(linkM[2]);

    if (href.startsWith('/')) href = base + href;

    const kind = classifyKind(titleRaw);
    if (kind !== 'mieszkalny') continue;
    if (/informacja\s+o\s+wyniku/i.test(titleRaw)) continue;

    const dateM = /Data\s+publikacji:\s*(\d{2})\.(\d{2})\.(\d{4})/i.exec(li);
    const published_date = dateM ? iso(dateM[3], dateM[2], dateM[1]) : null;

    const round = roundFromText(titleRaw);
    const area_m2 = areaFromTitle(titleRaw);
    const apt = aptFromTitle(titleRaw);
    const address = addressFromTitle(titleRaw, apt);
    const address_raw = address
      ? `ul. ${address.street} ${address.building}${apt ? '/' + apt : ''}`
      : null;

    out.push({
      title: titleRaw,
      detail_url: href,
      published_date,
      kind,
      round,
      area_m2,
      address,
      address_raw,
    });
  }
  return out;
}


export function isResultNoticeTitle(title) {
  return /informacja\s+o\s+wyniku\s+przetargu/i.test(title || '');
}


export function attachmentUrlFromDetail(html, base = 'https://bipum.kielce.eu') {
  if (!html) return null;
  const docx = /href="([^"]+\.docx(?:\?[^"]*)?)"/i.exec(html);
  if (docx) {
    const u = docx[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  const pdf = /href="([^"]+\.pdf(?:\?[^"]*)?)"/i.exec(html);
  if (pdf) {
    const u = pdf[1].replace(/&amp;/gi, '&');
    return u.startsWith('http') ? u : base + u;
  }
  return null;
}


export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIKU\s+PRZETARGU/i.test(text || '');
}

export function auctionDateFromResultText(text) {
  if (!text) return null;
  const spM = /przeprowadzon\w*\s+(?:w\s+)?(?:dnia|dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text);
  if (spM) {
    const mo = PL_MONTHS[normPL(spM[2])];
    if (mo) return iso(spM[3], mo, spM[1]);
  }
  const numM = /przeprowadzon\w*\s+(?:w\s+)?(?:dnia|dniu)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) return iso(numM[3], numM[2], numM[1]);
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
  const m = /przy\s+(?:ul|ulicy|al|pl|os)\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][^,\n]{2,60}?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?/i.exec(text);
  if (!m) return null;
  const apt = m[3] || null;
  return parseAddress(`ul. ${m[1].trim()} ${m[2]}${apt ? '/' + apt : ''}`);
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
  if (kind === 'grunt') {
    const parcelClauses = [...t.matchAll(/dzia[łl]k[a-ząćęłńóśźż]*\s+(?:ewid\.\s*)?nr\s*:\s*([\d/]+(?:\s*(?:,|i)\s*[\d/]+)*)/gi)];
    const parcels = [...new Set(parcelClauses.flatMap((m) => m[1].split(/\s*(?:,|i)\s*/)))];
    const areas = [...t.slice(0, t.indexOf('Do sprzedaży')).matchAll(/o\s+pow\.\s+(\d+[,.]\d+)\s*ha/gi)];
    return [{ kind, address: null, dzialka_nr: parcels.join(', ') || null,
      obreb: /\/obr\.\s*(\d+)/i.exec(t)?.[1] || null,
      address_raw: /przy ulicy\s+([^/]+)\/obr/i.exec(t)?.[1].trim() || null,
      area_m2: areas.length ? Math.round(areas.reduce((sum, m) => sum + Number(m[1].replace(',', '.')), 0) * 10000) : null,
      auction_date: auctionDate, source_pdf: sourceUrl, round: null,
      starting_price_pln, final_price_pln: negative ? null : final_price_pln,
      outcome: negative ? 'unsold' : 'sold', notes }];
  }

  const areaM = /(?:lokalu|mieszkaln\w+)[^.]{0,60}?(\d+[,.]\d+)\s*m\s*[²2]/i.exec(t)
    || /o\s+powierzchni\s+u[żz]ytkow\w*\s+([\d]+[,.]\d+)\s*m/i.exec(t);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  const addressRaw = address ? `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}` : null;

  return [{
    auction_date: auctionDate,
    source_pdf: sourceUrl,
    kind,
    address_raw: addressRaw,
    address,
    round: null, // Kielce result DOCXes don't state the round — inferred from history
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: negative ? null : (final_price_pln ?? null),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2,
    notes,
  }];
}
