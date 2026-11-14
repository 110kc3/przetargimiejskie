import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};


export function stripTags(html) {
  if (!html) return '';
  let s = String(html).replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d|\/ul|\/ol)\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  return s
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&oacute;/g, 'ó')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&minus;/gi, '-')
    .replace(/&plus;/gi, '+')
    .replace(/&sect;/gi, '§')
    .replace(/&quot;/gi, '"')
    .replace(/&sup2;/gi, '²')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{1,2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSkippableTitle(title) {
  const s = title || '';
  return (
    /bezprzetargow/i.test(s) ||
    /\bnajem\b|wynaj[ęe]|dzier[żz]aw|czynsz/i.test(s) ||
    /(^|\W)wykaz\b/i.test(s) ||
    /oferta\s+inwestycyjna/i.test(s) ||
    /zarz[ąa]dzeni/i.test(s) ||
    /regulamin/i.test(s) ||
    /pierwokup/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /odwo[łl]ani|uniewa[żz]ni/i.test(s) ||
    /lista\s+(?:os[oó]b|zakwalifikowan)/i.test(s) ||
    /rokowani/i.test(s) ||
    /stoisk/i.test(s) ||
    /wypo[żz]yczalni/i.test(s) ||
    /stacj\w*\s+[łl]adowania/i.test(s)
  );
}

export function isResultTitle(title) {
  const s = title || '';
  return /\bwynik\w*\b/i.test(s) && /przetarg/i.test(s);
}

export function isAnnouncementTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal|dzia[łl]k|grunt/i.test(s);
}


export function isLeaseNotice(text) {
  const t = text || '';
  return (/\bnajem\b|wynaj[ęe]c\w*|dzier[żz]aw/i.test(t)) && !/sprzeda[żz]/i.test(t);
}

export function isResultNotice(text) {
  return /informacj\S*\s+o\s+(?:negatywnym\s+)?wynik/i.test(text || '');
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
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

const ROUND_ANCHOR_RE =
  /(?:og[łl]asza|zosta[łl]\s+przeprowadzony)\s+(?:([ivxl]{1,4})\b|([a-ząćęłńóśźż]+))\s+przetarg/i;

export function roundFromText(text) {
  const m = ROUND_ANCHOR_RE.exec(text || '');
  if (!m) return null;
  if (m[1]) return romanToInt(m[1]);
  if (m[2]) {
    const key = m[2].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) {
      if (key.startsWith(prefix)) return val;
    }
  }
  return null;
}

export function auctionDateFromText(text) {
  const m = /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r/i.exec(
    text || '',
  );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  const m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})[\s\S]{0,60}?zosta[łl]\s+przeprowadzon/i.exec(
    text || '',
  );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci(?:\s+lokalowej)?\s+wynosi(?:[łl]a)?\s+(\d[\d.\s]*(?:,\d+)?)\s*z[łl]\w*/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /Najwy[żz]sz\w*\s+cen\w*\s+osi[ąa]gni[ęe]t\w*\s+w\s+przetargu\s*[:\-–]?\s*(\d[\d.\s]*(?:,\d+)?)\s*z[łl]\w*/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

export function isNegativeOutcome(text) {
  return /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/i.test(text || '');
}


const FLAT_HEADER_RE =
  /(?:og[łl]asza|zosta[łl]\s+przeprowadzony)\s+(?:[ivxl]{1,4}|[a-ząćęłńóśźż]+)\s+przetarg\s+ustny\s+(?:nie)?ograniczony\s+na\s+sprzeda[żz]\s+(?:gminnego\s+|wolnego\s+)?lokalu\s+mieszkaln\w*\s+nr\s+(\w+)[,]?\s*po[łl]o[żz]on\w*\s+w\s+budynku\s+przy\s+ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-ZŻŹĆŁŚĄĘÓŃ.\- ]*?)\s+(\d+[A-Za-z]?)\s+w\s+Mr[ąa]gowie/i;

export function flatHeaderFromText(text) {
  const m = FLAT_HEADER_RE.exec(text || '');
  if (!m) return null;
  return {
    apt: m[1].toUpperCase(),
    street: m[2].replace(/\s+/g, ' ').trim(),
    building: m[3].toUpperCase(),
  };
}

export function flatAddressRawFromText(text) {
  const h = flatHeaderFromText(text);
  return h ? `ul. ${h.street} ${h.building}/${h.apt}` : null;
}

const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}


export function landStreetFromText(text) {
  const m = /przy\s+ulicy\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-ZŻŹĆŁŚĄĘÓŃ.\- ]*?)(?:,|\s+oznaczon|\s+w\s+Mr[ąa]gowie|\.|;)/i.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+nr\s+(\d+)/i.exec(text || '');
  return m ? `nr ${m[1]}` : null;
}

export function landPlotFromText(text) {
  const s = String(text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  let sumHa = 0;
  const re = /dzia[łl]k\w*\s+(?:nr\s+)?(\d+(?:\/\d+)?)(?:\s+o\s+powierzchni\w*\s+(\d+[.,]\d+)\s*ha\b)?/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    parcels.add(m[1]);
    if (m[2]) sumHa += Number(m[2].replace(',', '.'));
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  const area_m2 = sumHa > 0 ? Math.round(sumHa * 10000) : null;
  return { dzialka_nr, area_m2 };
}


function kindFromText(text) {
  const m = /na\s+sprzeda[żz]\s*([\s\S]{0,300})/i.exec(text || '');
  return classifyKind(m ? m[1] : (text || '').slice(0, 300));
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = String(text).replace(/\r/g, '');
  const kind = kindFromText(t);
  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  if (kind === 'grunt') {
    const street = landStreetFromText(t);
    const plot = landPlotFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const h = flatHeaderFromText(t);
  if (!h) return null;
  const address_raw = `ul. ${h.street} ${h.building}/${h.apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(t),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = String(text).replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(t);
  const kind = kindFromText(t);

  if (kind === 'grunt') {
    const street = landStreetFromText(t);
    const plot = landPlotFromText(t);
    const address_raw = street ? `ul. ${street}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        obreb: obrebFromText(t),
        area_m2: plot.area_m2,
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

  const h = flatHeaderFromText(t);
  if (!h) return [];
  const address_raw = `ul. ${h.street} ${h.building}/${h.apt}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: unitAreaFromText(t),
      notes,
    },
  ];
}
