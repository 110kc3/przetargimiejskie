import { parseAddress } from '../../core/normalize.js';


export function stripTags(html) {
  if (!html) return '';
  let s = html
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  return s.replace(/\s+/g, ' ').trim();
}

export function parseDetailFields(html) {
  const fields = new Map();
  if (!html) return fields;
  const pairRe =
    /<strong[^>]*>([\s\S]*?)<\/strong>[\s\S]*?<\/div>\s*<div[^>]*grid-inner-item[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = pairRe.exec(html)) !== null) {
    const label = stripTags(m[1]).trim();
    const value = stripTags(m[2]).trim();
    if (label) fields.set(label, value);
  }
  return fields;
}


function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s)
    .replace(/\s*z[lLł]\s*$/i, '')
    .replace(/\s/g, '')
    .replace(/,\d{1,2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}



export function parseDetailAddress(raw) {
  if (!raw) return { address_raw: raw, address: null };
  let s = raw.trim();

  s = s.replace(/^Bia[łl]ystok\s*,\s*/i, '');

  s = s.replace(/\s*,?\s*dz\.\s*nr\b.*/i, '');
  s = s.replace(/\s*,?\s*dzia[łl]ka\b.*/i, '');

  s = s.trim();

  const normalised = s.replace(
    /(\d+[A-Za-z]?)\/\d+(\s+m\.?\s*\d+[A-Za-z]?)/,
    '$1$2',
  );
  const address = parseAddress(normalised);
  return { address_raw: raw, address };
}


export function parseDetailPage(html, detailUrl) {
  if (!html) return null;
  const fields = parseDetailFields(html);
  const notes = [];

  const przeznaczenie = fields.get('Przeznaczenie') || '';
  if (!/lokal\s+mieszkaln/i.test(przeznaczenie)) return null;

  const lokalizacja =
    fields.get('Lokalizacja (położenie)') ||
    fields.get('Lokalizacja (polozenie)') ||
    fields.get('Tytuł') ||
    fields.get('Tytul') ||
    '';
  const { address_raw, address } = parseDetailAddress(lokalizacja);
  if (!address) notes.push('parse: address not resolved');

  const status = fields.get('Status') || null;

  const wywoRaw = fields.get('Cena wywoławcza') || fields.get('Cena wywolawcza') || '';
  const starting_price_pln = parsePLN(wywoRaw) ?? null;
  if (!starting_price_pln) notes.push('parse: missing starting price');

  const nabyciaRaw = fields.get('Cena nabycia') || '';
  const final_price_pln = nabyciaRaw ? (parsePLN(nabyciaRaw) ?? null) : null;

  const terminRaw = fields.get('Termin przetargu') || '';
  const auction_date = /^\d{4}-\d{2}-\d{2}$/.test(terminRaw) ? terminRaw : null;

  let outcome = null;
  if (status) {
    if (/rozstrzygniety|rozstrzygnięty/i.test(status)) outcome = 'sold';
    else if (/nierozstrzygniety|nierozstrzygnięty|unieważnione|uniewaznione|odwolany|odwołany/i.test(status)) outcome = 'unsold';
    else if (/otwarty/i.test(status)) outcome = 'open';
  }
  if (final_price_pln != null) outcome = 'sold';

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: null,
    starting_price_pln,
    final_price_pln,
    auction_date,
    status,
    outcome,
    round: null,
    source_url: detailUrl,
    notes,
  };
}



export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const notes = [];

  const fields = new Map();
  for (const line of String(text).split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key && val) fields.set(key, val);
  }

  const przeznaczenie = fields.get('Przeznaczenie') || '';
  if (!/lokal\s+mieszkaln/i.test(przeznaczenie)) return [];

  const status = fields.get('Status') || '';
  if (/^otwarty$/i.test(status.trim())) return [];

  const lokalizacja =
    fields.get('Lokalizacja (położenie)') ||
    fields.get('Lokalizacja (polozenie)') ||
    fields.get('Tytuł') ||
    fields.get('Tytul') ||
    '';
  const { address_raw, address } = parseDetailAddress(lokalizacja);
  if (!address) return [];

  const wywoRaw = fields.get('Cena wywoławcza') || fields.get('Cena wywolawcza') || '';
  const starting_price_pln = parsePLN(wywoRaw) ?? null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const nabyciaRaw = fields.get('Cena nabycia') || '';
  const final_price_pln = nabyciaRaw ? (parsePLN(nabyciaRaw) ?? null) : null;

  const terminRaw = fields.get('Termin przetargu') || '';
  const auction_date =
    (/^\d{4}-\d{2}-\d{2}$/.test(terminRaw) ? terminRaw : null) ||
    fallbackDate ||
    null;

  let outcome = 'unsold';
  let unsold_reason = 'unknown';
  if (/rozstrzygniety|rozstrzygnięty/i.test(status) && final_price_pln != null) {
    outcome = 'sold';
    unsold_reason = null;
  } else if (/rozstrzygniety|rozstrzygnięty/i.test(status) && final_price_pln == null) {
    outcome = 'unsold';
    notes.push('parse: Rozstrzygniety but no Cena nabycia');
  }
  if (!final_price_pln && outcome === 'sold') {
    notes.push('parse: missing achieved price');
  }

  const src = fields.get('source_url') || sourceUrl;

  return [{
    auction_date,
    source_pdf: src,
    kind: 'mieszkalny',
    address_raw,
    address,
    round: null,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? final_price_pln : null,
    outcome,
    unsold_reason,
    area_m2: null,
    notes,
  }];
}
