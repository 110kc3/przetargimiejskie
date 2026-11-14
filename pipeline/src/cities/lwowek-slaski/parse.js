import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const NAME_CHARS = 'A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\\- ';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#8221;|&#8222;|&#8220;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'BODY')}`.trim();
}


export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|oddanie\s+w\s+dzier/i.test(t);
}

export function isResultDoc(text) {
  const t = whole(text);
  return /informacj\w*\s+o\s+wyniku|informacj\w*\s+o\s+nabywc|wyniku\s+przetargu|\bnabywc\w*/i.test(t) &&
    !/^\s*og[łl]oszenie\s+o\b/i.test(field(text, 'TITLE'));
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium|nie\s+wp[łl]yn[ęe][łl]o\s+wadium|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|nie\s+odby[łl]\s+si[ęe]/i.test(t);
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
  const m = /\b([IVXL]{1,5})\s+przetarg\w*\s+ustn\w*/i.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}


function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

export function auctionDateFromText(text) {
  const t = whole(text);
  let m = /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+dnia\s+([\s\S]{0,16})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /\bW\s+dniu\s+([\s\S]{0,24}?)\s*(?:r\.|roku)/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}


export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz[ae]\w*[^0-9]{0,40}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /cena\s+osi[ąa]gni[ęe]t\w*\s+w\s+przetargu[^0-9]{0,20}?(\d[\d.\s]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(whole(text));
}


const UNIT_ADDR_PATTERNS = [
  new RegExp(`przy\\s+ul(?:\\.|icy)\\s+([${NAME_CHARS}]+?)\\s+(?:nr\\s+)?(\\d+(?:-\\d+)?[A-Za-z]?)\\b`, 'i'),
  new RegExp(`w\\s+miejscowo[śs]ci\\s+([${NAME_CHARS}]+?)\\s+nr\\s+(\\d+(?:-\\d+)?[A-Za-z]?)\\b`, 'i'),
];

function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  const t = whole(text);
  let m = null;
  for (const re of UNIT_ADDR_PATTERNS) {
    m = re.exec(t);
    if (m) break;
  }
  if (!m) return null;
  const street = m[1].trim().replace(/\s+/g, ' ');
  const building = m[2];
  const apt = unitNoFromText(text);
  return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
}

const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w*\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}


function landParcelFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const re = /(?:ewidencyjnie\s+nr|dzia[łl]k\w*(?:\s+oznaczon\w*\s+ewidencyjnie)?\s+nr|dzia[łl]ce\s+nr)\s+(\d+(?:[\/.]\d+)?(?:\s+i\s+\d+(?:[\/.]\d+)?)*)/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    for (const p of m[1].split(/\s+i\s+/)) {
      const norm = p.trim().replace(/\./g, '/');
      if (norm && !seen.has(norm)) { seen.add(norm); parcels.push(norm); }
    }
  }
  return parcels.length ? parcels.join(', ') : null;
}

function obrebFromText(text) {
  const m = new RegExp(`w\\s+obr[ęe]bie\\s+(\\d+|[A-ZŁŚŻŹĆĘÓŃĄ][a-ząćęłńóśźż]+)`).exec(whole(text));
  return m ? m[1] : null;
}

const LAND_AREA_RE = /(?:[łl][ąa]cznej\s+)?powierzchni\s+(\d+(?:[.,]\d+)?)\s*ha\b/i;

function landAreaFromText(text) {
  const m = LAND_AREA_RE.exec(whole(text));
  if (!m) return null;
  const val = parseNum(m[1]);
  return val == null ? null : Math.round(val * 10000);
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(text);
    const obreb = obrebFromText(text);
    if (!dzialka_nr && !obreb) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(text),
      address_raw: obreb,
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
  if (!isResultDoc(text)) return [];
  if (isLease(text)) return [];
  if (!isSaleAuction(text)) return [];

  const kind = kindFromText(text);
  if (kind === 'unknown') return [];

  const notes = [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(text);
    const obreb = obrebFromText(text);
    if (!dzialka_nr && !obreb) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2: landAreaFromText(text),
        address_raw: obreb,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (negativeStated ? 'no_buyer' : 'unknown'),
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
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : (negativeStated ? 'no_buyer' : 'unknown'),
      area_m2: unitAreaFromText(text),
      notes,
    },
  ];
}
