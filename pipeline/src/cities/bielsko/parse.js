
import { parseAddress } from '../../core/normalize.js';

const ROUND_WORDS = [
  [/pierwsz/i, 1],
  [/drug/i, 2],
  [/trzeci/i, 3],
  [/czwart/i, 4],
  [/pi[ąa]t/i, 5],
];

const LABELS = [
  'Data przetargu / rokowań',
  'Data przetargu',
  'Rodzaj nieruchomości',
  'Forma przetargu',
  'Status oferty',
  'Wysokość wadium',
  'Powierzchnia działki',
  'Powierzchnia użytkowa',
  'Powierzchnia',
  'Cena wywoławcza',
  'Cena',
  'Numer działki',
  'Typ działki',
  'Obręb',
  'Księga wieczysta',
  'Udział w częściach wspólnych',
  'Plan zagospodarowania/Studium',
  'Lokalizacja',
  'Galeria zdjęć',
  'Adres',
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const BOUNDARY = LABELS.map(escapeRe).join('|');

export function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h\d|\/span)\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&sup2;/gi, '²')
    .replace(/&sup3;/gi, '³')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&oacute;/gi, 'ó');
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function field(text, label) {
  if (!text) return null;
  const re = new RegExp(
    escapeRe(label) + '\\s*:\\s*([\\s\\S]*?)\\s*(?=(?:' + BOUNDARY + ')\\s*:|$)',
    'i',
  );
  const m = re.exec(text);
  const v = m ? m[1].trim() : null;
  return v || null;
}

export function isFlat(rodzaj) {
  return /lokal\w*\s+mieszkaln/i.test(rodzaj || '');
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '').replace(/z[łl].*$/i, '');
  const m = /^(\d{1,3}(?:[.\s]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.\s]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && fallback ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function roundFromForma(forma) {
  const t = forma || '';
  for (const [re, n] of ROUND_WORDS) if (re.test(t)) return n;
  if (/rokowan/i.test(t)) return null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

export function priceFrom(text) {
  const f = field(text, 'Cena wywoławcza') || field(text, 'Cena');
  const direct = parsePLN(f);
  if (direct != null) return direct;
  const m = /cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d][\d  . ]*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function auctionDateFrom(text) {
  const f = field(text, 'Data przetargu / rokowań') || field(text, 'Data przetargu') || text || '';
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(f);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function areaFrom(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  const prose = /powierzchni\w*\s+u[żz]ytkow\w*\s+lokalu\s+wynosi\s+([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (prose) {
    const v = parseArea(prose[1]);
    if (plausible(v)) return v;
  }
  const lab = /powierzchni\w*\s+u[żz]ytkow\w*[^0-9]{0,20}?([\d.,]+)\s*m\s*[²2]/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (plausible(v)) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;
  const cands = [];
  let m;
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt|obr[ęe]b|o\s+pow\b/i.test(before)) continue;
    if (/piwnic|kom[óo]rk|przynale[żz]|gara[żz]/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function addressFrom(text) {
  const raw = field(text, 'Adres');
  if (!raw) return null;
  const first = raw.split(/\s*[,;+]\s*/)[0].trim();
  const address = parseAddress(first) || parseAddress(raw);
  if (!address) return null;
  const street = address.street || '';
  const digitsOk = /^\d+\s/.test(street);
  if (/[;:]/.test(street) || (!digitsOk && /\d/.test(street))) return null;
  return { address_raw: raw, address };
}

export function parseNode(html) {
  const text = htmlToText(html);
  const rodzaj = field(text, 'Rodzaj nieruchomości');
  if (!isFlat(rodzaj)) return null;
  const addr = addressFrom(text);
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFrom(text),
    starting_price_pln: priceFrom(text),
    round: roundFromForma(field(text, 'Forma przetargu')),
    auction_date: auctionDateFrom(text),
    status: field(text, 'Status oferty'),
  };
}

export function findMapLink(html) {
  if (!html) return null;
  const re = /href=\"([^\"]*(?:geoportal\.gov\.pl|e-mapa\.net|geoportal2\.pl|sip\.[a-z]|msip\.|\/mapa\b)[^\"]*)\"/i;
  const m = re.exec(html);
  return m ? m[1].replace(/&amp;/gi, '&') : null;
}

export function plotAreaFrom(text) {
  const f = field(text, 'Powierzchnia działki') || field(text, 'Powierzchnia');
  if (!f) return null;
  const m = /([\d][\d\s.\u00a0]*(?:,\d+)?)/.exec(f);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s.\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseLandNode(html, url) {
  const text = htmlToText(html);
  const dzialka = field(text, 'Numer działki');
  const obreb = field(text, 'Obręb');
  const addrRaw = field(text, 'Adres');
  if (!dzialka && !addrRaw) return null;
  let address = null;
  let street = null;
  let building = null;
  if (addrRaw) {
    const a = parseAddress(addrRaw);
    if (a) { address = a; street = a.street; building = a.building; }
  }
  return {
    kind: 'grunt',
    dzialka_nr: dzialka || null,
    obreb: obreb || null,
    zoning: field(text, 'Typ działki') || null,
    address_raw: addrRaw || null,
    street,
    building,
    address,
    area_m2: plotAreaFrom(text), // PLOT area
    starting_price_pln: priceFrom(text),
    auction_date: auctionDateFrom(text),
    round: roundFromForma(field(text, 'Forma przetargu')),
    detail_url: url,
    source_url: url,
    geoportal_url: findMapLink(html), // source-provided map link, if present
  };
}

export function parseListingNode(html, url, kind) {
  const text = htmlToText(html);
  const addr = addressFrom(text);
  if (!addr) return null;
  const building = areaFrom(text);
  const plot = plotAreaFrom(text);
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: building ?? plot,
    ...(kind === 'zabudowana' && building != null && plot != null && plot !== building
      ? { land_area_m2: plot }
      : {}),
    starting_price_pln: priceFrom(text),
    round: roundFromForma(field(text, 'Forma przetargu')),
    auction_date: auctionDateFrom(text),
    detail_url: url,
  };
}

export function parseResultDoc(_text, _date, _url) {
  return [];
}
