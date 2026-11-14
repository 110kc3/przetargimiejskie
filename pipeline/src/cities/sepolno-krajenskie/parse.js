import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PORTAL = 'https://bip.gmina-sepolno.pl';


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
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
  if (s == null) return null;
  const cleaned = String(s).replace(/[\s  ]/g, '');
  const primary = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?(?:\s*z[łl])?$/i.exec(cleaned);
  if (primary) return Number(primary[1].replace(/[.,]/g, ''));
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
  stycznia: 1, styczen: 1, lutego: 2, luty: 2, marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4, maja: 5, maj: 5, czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7, sierpnia: 8, sierpien: 8, wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10, listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseDataPrzetargu(s) {
  const m = /(\d{1,2})[-.](\d{1,2})[-.](\d{4})/.exec(s || '');
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return iso(m[3], mo, m[1]);
}

export function polishDateToIso(s) {
  const m = /(\d{1,2})\s+([A-Za-ząćęłńóśźż]+)\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mo = PL_MONTHS[toAscii(m[2])];
  if (!mo) return null;
  return iso(m[3], mo, m[1]);
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
export function roundFromTitle(title) {
  const t = toAscii(title || '');
  const m = /\b(vi|v|iv|iii|ii|i)\s+przetarg/.exec(t);
  if (m) return ROMAN[m[1]] ?? 1;
  return 1;
}


export function extractTitle(html) {
  if (!html) return null;
  const m = /<h1[^>]*class="pageHeader"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (m) return stripTags(m[1]);
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (t) return stripTags(t[1]).replace(/\s*-\s*Urząd Miejski.*$/i, '').trim();
  return null;
}

const META_RE =
  /cct-page__name[^"]*">\s*([\s\S]*?)<\/div>\s*<div\s+class="cct-page__value[^"]*">\s*([\s\S]*?)<\/div>/gi;

export function extractMetadata(html) {
  const out = {};
  if (!html) return out;
  META_RE.lastIndex = 0;
  let m;
  while ((m = META_RE.exec(html)) !== null) {
    const label = stripTags(m[1]).replace(/:\s*$/, '').trim();
    const value = stripTags(m[2]);
    if (label && !(label in out)) out[label] = value;
  }
  return out;
}

export function extractAttachments(html) {
  const out = [];
  const seen = new Set();
  const re = /href="((?:https?:\/\/[^"]+)?\/download\/attachment\/\d+\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let url = m[1];
    if (!/^https?:\/\//i.test(url)) url = PORTAL + url;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url });
  }
  return out;
}

const ANNEX_RE = /zal-nr|zalacznik|mapa|zgloszenie|oswiadczenie|szkic|zdjeci|klauzula|rodo|wynik/i;

export function pickAnnouncementPdf(attachments) {
  const pdfs = (attachments || []).filter((a) => /\.pdf(?:[?#]|$)/i.test(a.url));
  const ann = pdfs.find(
    (a) => /ogloszeni|akt-ogl|przetarg-na-sprzeda/i.test(a.url) && !/wynik/i.test(a.url),
  );
  if (ann) return ann.url;
  const fb = pdfs.find((a) => !ANNEX_RE.test(a.url));
  return fb ? fb.url : null;
}

export function pickResultPdf(attachments) {
  const r = (attachments || []).find((a) => /\.pdf(?:[?#]|$)/i.test(a.url) && /wynik/i.test(a.url));
  return r ? r.url : null;
}


function cleanAddr(s) {
  if (!s) return null;
  let a = String(s).replace(/^\s*ul\.?\s*/i, '').trim();
  a = a.split(/\s+w\s+S[eę]p[oó]ln|,\s*\d{2}-\d{3}|\s+gm\.|\s+w\s+miejscowo/i)[0].trim();
  return a || null;
}

export function addressRawFromNotice(meta, title) {
  const adres = meta && meta['Adres nieruchomości'];
  if (adres) {
    const c = cleanAddr(adres);
    if (c && /\d/.test(c)) return c;
  }
  const m = /przy\s+ul\.?\s+([\s\S]+?)\s+w\s+S[eę]p[oó]ln/i.exec(title || '');
  if (m) return cleanAddr(m[1]);
  return null;
}


export function parseNotice(html, url) {
  const title = extractTitle(html) || '';
  const metadata = extractMetadata(html);
  const attachments = extractAttachments(html);

  const przetargNa = metadata['Przetarg na'] || '';
  const isSale =
    /sprzeda[żz]/i.test(title + ' ' + przetargNa) && !/dzier[żz]aw/i.test(title + ' ' + przetargNa);

  const kind = classifyKind(metadata['Rodzaj nieruchomości'] || title);
  const round = roundFromTitle(title);

  const address_raw = addressRawFromNotice(metadata, title);
  const address = address_raw ? parseAddress(address_raw) : null;

  const starting_price_pln = parsePLN(metadata['Cena wywoławcza']);
  const auction_date = parseDataPrzetargu(metadata['Data przetargu']);
  const year = metadata['Rok'] ? Number(String(metadata['Rok']).replace(/[^\d]/g, '')) || null : null;

  return {
    url,
    title,
    metadata,
    attachments,
    is_sale: isSale,
    kind,
    round,
    address_raw,
    address,
    starting_price_pln,
    auction_date,
    published_year: year,
    announcementPdf: pickAnnouncementPdf(attachments),
    resultPdf: pickResultPdf(attachments),
  };
}

export function areaFromAnnouncement(text) {
  if (!text) return null;
  const m = /powierzchni\w*\s+u[żz]ytkow\w*[^\d]{0,12}([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  if (m) return parseArea(m[1]);
  const bare = /o\s+pow(?:ierzchni)?\.?\s*([\d][\d.,]*)\s*m\s*[²2]/i.exec(text);
  return bare ? parseArea(bare[1]) : null;
}


function addressFromResult(text) {
  const m = /\bul\.\s+([^\n,]+?\s+\d+\/\d+[A-Za-z]?)\s*\./.exec(text);
  if (m) return parseAddress(m[1].trim());
  const nr = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  const sb = /po[łl]o[żz]on\w*\s+przy\s+ul\.\s+([\s\S]+?)\s+(\d+[A-Za-z]?)\s+w\s+S[eę]p/i.exec(text);
  if (nr && sb) return parseAddress(`${sb[1].trim()} ${sb[2]}/${nr[1]}`);
  return null;
}

function moneyField(text, labelRe) {
  const m = new RegExp('(?:' + labelRe + ')[^:\\n]*:\\s*([^\\n]+)', 'i').exec(text);
  if (!m) return null;
  const v = m[1].trim();
  if (/^brak\b/i.test(v)) return null;
  const num = /([\d][\d\s .,]*\d|\d)/.exec(v);
  return num ? parsePLN(num[1]) : null;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const isResult =
    /o\s+wyniku\s+przetargu/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /najwy[żz]sza\s+cena/i.test(t) ||
    /wynik(?:iem)?\s+negatywn/i.test(t);
  if (!isResult) return [];

  const address = addressFromResult(t);
  if (!address) return [];

  const kind = classifyKind(t);

  const dateM =
    /(?:przeprowadzon\w*\s+w\s+dniu|w\s+dniu)\s+(\d{1,2}\s+[A-Za-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
  const auction_date = polishDateToIso(dateM ? dateM[1] : '') || fallbackDate || null;

  const starting_price_pln = moneyField(t, 'cena\\s+wywo[łl]awcza');
  const final_price_pln = moneyField(
    t,
    'najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]ta|cena\\s+osi[ąa]gni[ęe]ta',
  );

  const nabywcaM = /Nabywca\s+nieruchomo[śs]ci\s*:\s*([^\n]+)/i.exec(t);
  const nabywca = nabywcaM ? nabywcaM[1].trim() : null;
  const hasBuyer = Boolean(nabywca) && !/^brak\b/i.test(nabywca);

  const negative =
    /wynik(?:iem)?\s+negatywn/i.test(t) || final_price_pln == null || !hasBuyer;
  const outcome = !negative && final_price_pln != null ? 'sold' : 'unsold';
  const unsold_reason = outcome === 'unsold' ? 'wynik negatywny' : null;

  return [{
    kind,
    address,
    address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
    round: null,
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}
