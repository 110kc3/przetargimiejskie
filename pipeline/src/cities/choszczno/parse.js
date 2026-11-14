
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function firstPrice(s) {
  if (!s) return null;
  const m = /(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(s);
  return m ? parsePLN(m[1]) : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const SECTION_LABELS = ['TITLE', 'OGLOSZENIE', 'INFORMACJA'];

export function buildRecordText(f = {}) {
  return [
    `TITLE:\n${(f.title || '').trim()}`,
    `OGLOSZENIE:\n${(f.ogloszenie || '').trim()}`,
    `INFORMACJA:\n${(f.informacja || '').trim()}`,
  ].join('\n');
}

export function section(text, label) {
  if (!text) return '';
  const marker = `${label}:\n`;
  const start = text.indexOf(marker);
  if (start === -1) return '';
  const from = start + marker.length;
  let end = text.length;
  for (const other of SECTION_LABELS) {
    if (other === label) continue;
    const idx = text.indexOf(`\n${other}:\n`, from);
    if (idx !== -1 && idx < end) end = idx;
  }
  return text.slice(from, end).trim();
}


export function hasResolution(text) {
  return section(text, 'INFORMACJA').length > 0;
}

export function isLease(text) {
  const t = `${section(text, 'TITLE')} ${section(text, 'OGLOSZENIE')}`;
  return /dzier[żz]aw|\bnajem\b/i.test(t);
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
  'siódm': 7, siodm: 7, 'ósm': 8, osm: 8, 'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
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
  const title = section(text, 'TITLE');
  let m = /ogłasza\s+([IVXL]{1,5})\s+przetarg/i.exec(title);
  if (m) {
    const r = romanToInt(m[1]);
    if (r) return r;
  }
  m = /ogłasza\s+(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg/i.exec(title);
  if (m) {
    const key = m[1].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) if (key.startsWith(prefix)) return val;
  }
  return null;
}


export function auctionDateFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  let m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(ogl);
  if (!m) m = /Termin\s+i\s+miejsce[^\n]*?przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(ogl);
  if (!m) {
    const info = section(text, 'INFORMACJA');
    m = /\bw\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(info);
  }
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}


export function startingPriceFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  let m = /Cena\s+wywo[łl]awcza\b([^\n]*)/i.exec(ogl);
  if (m) {
    const p = firstPrice(m[1]);
    if (p != null) return p;
  }
  const info = section(text, 'INFORMACJA');
  m = /Cena\s+wywo[łl]awcza\b([^\n]*)/i.exec(info);
  return m ? firstPrice(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const info = section(text, 'INFORMACJA');
  let m = /ustalono\s+cen[ęe]([^\n]*)/i.exec(info);
  if (m) {
    const p = firstPrice(m[1]);
    if (p != null) return p;
  }
  m = /cen[ęa]\s+ustalon\w*\s+zosta[łl]\w*\s+na\s+kwot[ęe]\s*([\s\S]{0,60})/i.exec(info);
  return m ? firstPrice(m[1]) : null;
}

export function isNegativeOutcome(text) {
  const info = section(text, 'INFORMACJA');
  return /wynikiem\s+negatywn|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|odwo[łl]an|nie\s+odnotowano/i.test(info);
}

export function buyerFromText(text) {
  const info = section(text, 'INFORMACJA');
  let m = /Nabywc[ąa]\s+ustal\w+\s+zosta[łl]\w*\s*:?\s*([\s\S]+?)\.(?=\s*\n\s*\n|\s*$)/i.exec(info);
  if (!m) m = /Nabywc[ąa]\s+zosta[łl]\w*\s+ustalon\w*\s*:?\s*([\s\S]+?)\.(?=\s*\n\s*\n|\s*$)/i.exec(info);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}


export function kindFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  const typM = /Typ\s+nieruchomo[śs]ci\s+(.+)/i.exec(ogl);
  if (typM) {
    const k = classifyKind(typM[1]);
    if (k !== 'unknown') return k;
  }
  let k = classifyKind(ogl);
  if (k !== 'unknown') return k;
  k = classifyKind(section(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(section(text, 'INFORMACJA'));
}


function stripLocalityPrefix(raw) {
  if (!raw) return null;
  const m = /,\s*((?:ul|al|pl|os)\.?\s+.+)/i.exec(raw);
  if (m) return m[1].trim();
  if (/^\s*(?:ul|al|pl|os)\.?\s/i.test(raw)) return raw.trim();
  return null;
}

export function addressRawFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  const placeM = /Miejscowo[śs][ćc]\s+(.+)/i.exec(ogl);
  const fromOgl = placeM ? stripLocalityPrefix(placeM[1].trim()) : null;
  if (fromOgl) return fromOgl;

  const title = section(text, 'TITLE');
  const m = /\b((?:ul|al|pl|os)\.?\s+[^,]+?)(?=\s+(?:na\s+dzia[łl]|obr\.|obr[eę]b|gmina\b|stanow|wraz\b)|,|$)/i.exec(title);
  return m ? m[1].trim() : null;
}

const UNIT_AREA_RE = /\bpow\w*\.?\s*(?:[a-ząćęłńóśźż]+\.?\s+){0,3}?(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  const m = UNIT_AREA_RE.exec(ogl);
  return m ? parseArea(m[1]) : null;
}

function parcelFromText(text) {
  const ogl = section(text, 'OGLOSZENIE');
  let m = /Nr\s+dzia[łl]ki\s*,\s*obr[eę]b[^\n]*?(\d+(?:\/\d+)?)/i.exec(ogl);
  if (m) return m[1];
  m = /dzia[łl]k[ąa]\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)/i.exec(ogl);
  return m ? m[1] : null;
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const address_raw = addressRawFromText(text);
    const dzialka_nr = parcelFromText(text);
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      area_m2: null,
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
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);
  const buyer = sold ? buyerFromText(text) : null;

  if (kind === 'grunt') {
    const address_raw = addressRawFromText(text);
    const dzialka_nr = parcelFromText(text);
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_pdf: sourceUrl || null,
        kind: 'grunt',
        dzialka_nr,
        area_m2: null,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (negativeStated ? 'wynik negatywny' : 'unknown'),
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
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl || null,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : (negativeStated ? 'wynik negatywny' : 'unknown'),
      buyer,
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
