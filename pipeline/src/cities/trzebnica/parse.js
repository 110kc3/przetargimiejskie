import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const TOWN = 'Trzebnica';


export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).trim().replace(/[,.]\d{2}$/, '').replace(/[\s. ]/g, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `ADRES: ${stripHtml(f.adres)}`,
    `RODZAJ: ${stripHtml(f.rodzaj)}`,
    `CENA: ${stripHtml(f.cena)}`,
    `DATA: ${stripHtml(f.data)}`,
    `TYP: ${stripHtml(f.typ)}`,
    `PRZETARGNA: ${stripHtml(f.przetargNa)}`,
    `OGLOSZENIE: ${stripHtml(f.ogloszenie)}`,
    `WYNIK: ${stripHtml(f.wynik)}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}


export function hasResolution(text) {
  return field(text, 'WYNIK').length > 0;
}

export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIKU\s+PRZETARGU/i.test(text || '');
}

export function isLease(text) {
  const t = `${field(text, 'RODZAJ')} ${field(text, 'PRZETARGNA')} ${field(text, 'CENA')} ${field(text, 'TYP')}`;
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s*\/?\s*miesi[ęe]cznie|miesi[ęe]cznie\s*$|rocznie\s*$/im.test(t);
}


export function kindFromText(text) {
  const rodzaj = field(text, 'RODZAJ');
  const k = classifyKind(rodzaj);
  if (k !== 'unknown') return k;
  return classifyKind(field(text, 'PRZETARGNA'));
}


const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

export function roundFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (wynik) {
    const m = /(?:Rodzaj\s+przeprowadzonego\s+przetargu|przeprowadzon\w*\s+zosta[łl]\w*)[\s\S]{0,60}?\b([IVXL]{1,5})\b\s+przetarg/i.exec(wynik);
    if (m) {
      const r = romanToInt(m[1]);
      if (r) return r;
    }
  }
  const na = field(text, 'PRZETARGNA');
  let m = /^\s*([IVXL]{1,5})\s+przetarg/i.exec(na);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  const ogl = field(text, 'OGLOSZENIE');
  m = /ogłasza\s+([IVXL]{1,5})\s+przetarg/i.exec(ogl);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  return null;
}


export function auctionDateFromText(text) {
  const data = field(text, 'DATA');
  let m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(data);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const wynik = field(text, 'WYNIK');
  m = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})\s*rok/i.exec(wynik);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}


export function startingPriceFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (wynik) {
    const m = /Cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*:?\s*(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(wynik);
    if (m) {
      const v = parsePLN(m[1]);
      if (v != null) return v;
    }
  }
  const cena = field(text, 'CENA');
  let m = /(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(cena);
  if (!m) m = /(\d[\d.\s ]*(?:,\d{2})?)/.exec(cena);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const wynik = field(text, 'WYNIK');
  const m = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:?\s*(\d[\d.\s ]*(?:,\d{2})?)\s*z[łl]/i.exec(wynik);
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeOutcome(text) {
  const wynik = field(text, 'WYNIK');
  return /wynikiem\s+negatywnym|nie\s+dotyczy/i.test(wynik);
}


const AREA_M2_RE = /(\d{1,4}[.,]\d{1,2})\s*m\s*[²2](?!\d)/;

export function unitAreaFromText(text) {
  const ogl = field(text, 'OGLOSZENIE');
  const m = AREA_M2_RE.exec(ogl);
  return m ? parseArea(m[1]) : null;
}


const HA_RE = /\b(\d{1,2},\d{4})\b/;

function landAreaFromOgloszenie(ogl) {
  const m = HA_RE.exec(ogl || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return ha > 0 ? Math.round(ha * 10000) : null;
}

export function landPlotFromText(text) {
  const wynik = field(text, 'WYNIK');
  if (wynik) {
    const m = /([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ .-]*?)\s*,\s*dz\.?\s*nr\.?\s*(\d+(?:\/\d+)?)/i.exec(wynik);
    if (m) return { dzialka_nr: m[2], village: m[1].trim() };
  }
  const ogl = field(text, 'OGLOSZENIE');
  const all = [...ogl.matchAll(/dzia[łl]k\w*\s+nr\.?\s+(\d+(?:\/\d+)?)/gi)];
  return { dzialka_nr: all.length ? all[all.length - 1][1] : null, village: null };
}

export function landAreaFromText(text) {
  return landAreaFromOgloszenie(field(text, 'OGLOSZENIE'));
}

const OBREB_RE = /obr[ęe]b\w*\s+(?:wsi\s+|miasta\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZżźćłśąęóńŻŹĆŁŚĄĘÓŃ]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZżźćłśąęóńŻŹĆŁŚĄĘÓŃ]*)?)/;

export function obrebFromText(text) {
  const hay = `${field(text, 'PRZETARGNA')} ${field(text, 'OGLOSZENIE')}`;
  const m = OBREB_RE.exec(hay);
  return m ? m[1].trim() : null;
}


function cleanAdres(raw) {
  let s = (raw || '').trim();
  if (!s) return '';
  s = s.replace(/\b(ul|al|pl|os)\.(?=\S)/gi, '$1. ');
  s = s.replace(new RegExp(`^\\s*${TOWN}\\s*,?\\s*`, 'i'), '');
  s = s.replace(new RegExp(`\\s*,?\\s*${TOWN}\\s*\\.?\\s*$`, 'i'), '');
  s = s.replace(/\s*\.\s*$/, '');
  return s.replace(/\s+/g, ' ').trim();
}

function flatNoFromText(text) {
  const hay = `${field(text, 'OGLOSZENIE')} ${field(text, 'PRZETARGNA')}`;
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(hay);
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  const cleaned = cleanAdres(field(text, 'ADRES'));
  if (!cleaned) return null;
  if (/\d/.test(cleaned)) return cleaned;
  if (/^Boleścin$/i.test(cleaned)) {
    const explicit = /Lokal\s+mieszkalny\s+nr\s+(\d+[A-Za-z]?)\s+położony\s+w\s+budynku\s+nr\s+(\d+[A-Za-z]?)\s+w\s+Boleścinie\b/i.exec(field(text, 'WYNIK'));
    if (explicit) return `${cleaned} ${explicit[2]}/${explicit[1]}`;
  }
  const lokal = flatNoFromText(text);
  return lokal ? `${cleaned} 0/${lokal}` : null;
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const { dzialka_nr } = landPlotFromText(text);
    const address_raw = cleanAdres(field(text, 'ADRES')) || null;
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(text),
      area_m2: landAreaFromText(text),
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(text),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!hasResolution(text)) return [];
  const wynikBody = field(text, 'WYNIK');
  if (!isResultNotice(wynikBody)) return [];

  const notes = [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);
  const isLand = kind === 'grunt' || /dz\.?\s*nr\.?\s*\d/i.test(wynikBody);

  if (isLand) {
    const { dzialka_nr, village } = landPlotFromText(text);
    const address_raw = village || cleanAdres(field(text, 'ADRES')) || null;
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb: village || obrebFromText(text),
        area_m2: landAreaFromText(text),
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_url: sourceUrl,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
