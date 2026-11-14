
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PORTAL = 'https://bip.wloclawek.eu';


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
  const cleaned = String(s).replace(/[\s ]/g, '');
  const primary = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?(?:\s*z[łl])?$/i.exec(cleaned);
  if (primary) return Number(primary[1].replace(/[.,]/g, ''));
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
  if (t) return stripTags(t[1]).replace(/\s*-\s*Urząd Miasta.*$/i, '').trim();
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

const RESULT_RE = /wynik|rozstrzygni/i;

export function pickResultAttachment(attachments) {
  const matches = (attachments || []).filter((a) => RESULT_RE.test(a.url));
  if (!matches.length) return null;
  const docx = matches.find((a) => /\.docx(?:[?#]|$)/i.test(a.url));
  if (docx) return docx.url;
  const pdf = matches.find((a) => /\.pdf(?:[?#]|$)/i.test(a.url));
  return pdf ? pdf.url : matches[0].url;
}


function cleanAddr(s) {
  if (!s) return null;
  let a = String(s).replace(/^\s*ul\.?\s*/i, '').trim();
  a = a.split(
    /\s+we?\s+W[łl]oc[łl]awk\w*|,\s*dz\.|,?\s*obr[eę]b|,\s*KM|,?\s*oznaczon\w*|,?\s*obj[eę]t\w*|,\s*\d{2}-\d{3}|\s+w\s+budynku/i,
  )[0].trim();
  return a || null;
}

function lokalNrFromText(text) {
  const m = /lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(
    text || '',
  );
  return m ? m[1] : null;
}

export function addressRawFromNotice(meta, title) {
  const base = cleanAddr(meta && meta['Adres nieruchomości']);
  if (!base) return null;
  if (!/\//.test(base)) {
    const nr = lokalNrFromText(title);
    if (nr) return `${base}/${nr}`;
  }
  return base;
}


export function areaFromBody(html) {
  if (!html) return null;
  const contentM = /<div class="bip-page__content">([\s\S]*?)(?:<div class="bip-page__footer">|$)/i.exec(
    html,
  );
  const scope = contentM ? contentM[1] : html;
  const text = stripTags(scope);
  const m = /o\s+powierzchni\s+([\d]+[.,]\d+)\s*m\s*[²2]/i.exec(text);
  return m ? parseArea(m[1]) : null;
}


export function parseNotice(html, url) {
  const title = extractTitle(html) || '';
  const metadata = extractMetadata(html);
  const attachments = extractAttachments(html);

  const isSale =
    /sprzeda[żz]/i.test(title) &&
    !/dzier[żz]aw|najem/i.test(title) &&
    !/Skarbu\s+Państwa/i.test(title);

  const kind = classifyKind(`${metadata['Rodzaj nieruchomości'] || ''} ${title}`);
  const round = roundFromTitle(title);

  const address_raw = addressRawFromNotice(metadata, title);
  const address = address_raw ? parseAddress(address_raw) : null;

  const starting_price_pln = parseStartingPriceFromField(metadata['Cena wywoławcza']);
  const auction_date = parseDataPrzetargu(metadata['Data przetargu']);
  const year = metadata['Rok publikacji']
    ? Number(String(metadata['Rok publikacji']).replace(/[^\d]/g, '')) || null
    : null;
  const area_m2 = areaFromBody(html);

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
    area_m2,
    published_year: year,
    resultDocUrl: pickResultAttachment(attachments),
  };
}

function parseStartingPriceFromField(value) {
  if (!value) return null;
  const m = /([\d][\d\s]*(?:[.,]\d{2})?)\s*z[łl]/i.exec(value);
  return m ? parsePLN(m[1]) : null;
}


function addressFromResult(text) {
  const t = text || '';
  let m = /po[łl]o[żz]on\w*[\s\S]{0,80}?\bul\.\s+([^\n,]+)/i.exec(t);
  if (!m) {
    const all = [...t.matchAll(/\bul\.\s+([^\n,]+)/gi)];
    m = all.length ? all[all.length - 1] : null;
  }
  if (!m) return null;
  let base = m[1].trim().replace(/\s+we?\s+W[łl]oc[łl]awk\w*\s*$/i, '').trim();
  if (!base) return null;
  if (!/\//.test(base)) {
    const nr = lokalNrFromText(t);
    if (nr) base = `${base}/${nr}`;
  }
  return parseAddress(base);
}

function moneyField(text, labelRe) {
  const m = new RegExp(labelRe + '\\s*:?\\s*([\\d][\\d\\s]*(?:[.,]\\d{2})?)\\s*z[łl]', 'i').exec(
    text,
  );
  return m ? parsePLN(m[1]) : null;
}

const START_PRICE_RE = 'Cena\\s+(?:netto\\s+)?wywo[łl]awcza(?:\\s+netto)?\\s+nieruchomo[śs]ci';
const FINAL_PRICE_RE = 'Wylicytowana\\s+cena\\s+(?:netto\\s+)?nieruchomo[śs]ci';

function buyerFromResult(text) {
  const m = /Nabywc[ąa]\s+nieruchomo[śs]ci\s+zosta[łl]\w*\s*[-–]?\s*([^\n.]+?)\s*\./i.exec(
    text || '',
  );
  if (!m) return null;
  const v = m[1].trim();
  return v && !/^brak\b/i.test(v) ? v : null;
}

function resultKind(text, hasAddress) {
  const k = classifyKind(text);
  return k === 'grunt' && hasAddress ? 'zabudowana' : k;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const isResult =
    /informuj[ea]/i.test(t) ||
    /o\s+wyniku\s+przetargu/i.test(t) ||
    /o\s+rozstrzygni[eę]tym\s+przetargu/i.test(t) ||
    /wylicytowan\w*\s+cena/i.test(t) ||
    /nabywc[ąa]\s+nieruchomo[śs]ci/i.test(t);
  if (!isResult) return [];

  const address = addressFromResult(t);
  if (!address) return [];

  const kind = resultKind(t, true);

  const dateM = /w\s+dniu\s+(\d{1,2}\s+[A-Za-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
  const auction_date = polishDateToIso(dateM ? dateM[1] : '') || fallbackDate || null;

  const starting_price_pln = moneyField(t, START_PRICE_RE);
  const final_price_pln = moneyField(t, FINAL_PRICE_RE);

  const buyer = buyerFromResult(t);
  const hasBuyer = Boolean(buyer);

  const negative = /wynik(?:iem)?\s+negatywn/i.test(t) || final_price_pln == null || !hasBuyer;
  const outcome = !negative && final_price_pln != null ? 'sold' : 'unsold';
  const unsold_reason = outcome === 'unsold'
    ? (/wynik(?:iem)?\s+negatywn/i.test(t) ? 'wynik negatywny' : 'brak nabywcy')
    : null;

  return [{
    kind,
    address,
    address_raw: `${address.street} ${address.building}${address.apt ? '/' + address.apt : ''}`,
    round: null, // the result doc does not state the round number
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
  }];
}
