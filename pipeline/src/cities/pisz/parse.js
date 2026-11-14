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

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sect;/g, '§').replace(/&sup2;/g, '²')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `PODTYTUL: ${stripHtml(f.podtytul)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'PODTYTUL')} ${field(text, 'BODY')}`.trim();
}


export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|u[żz]yczeni/i.test(t);
}

export function isExchange(text) {
  const t = whole(text);
  return /w\s+drodze\s+zamiany/i.test(t);
}

export function isBezprzetargowo(text) {
  const t = whole(text);
  return /bezprzetargow|na\s+rzecz\s+najemc|na\s+rzecz\s+u[żz]ytkownika\s+wieczyst|na\s+rzecz\s+dotychczasowego|bonifikat/i.test(t);
}

export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t) && /nieruchomo/i.test(t);
}

export function hasScheduledDate(text) {
  return /odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu|dnia)\s+/i.test(whole(text));
}

export function isResultDoc(text) {
  const t = whole(text);
  return /wyniku\s+przetargu|rozstrzygni[ęe]ciu\s+przetargu|komisja\s+przetargowa\s+przeprowadzi|przeprowadzi\S*\s+w\s+dniu|przetarg\s+zako[ńn]czy[łl]\s+si[ęe]/i.test(t);
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi[łl]?\s+do\s+przetargu|nie\s+przyst[ąa]pi[łl]\s+do\s+przetargu|brak\s+ofert|uniewa[żz]ni/i.test(t);
}

export function isWykazNotice(text) {
  const title = field(text, 'TITLE');
  const t = whole(text);
  return /wykaz/i.test(title) && /nieruchomo/i.test(t) && /przeznaczon\w*\s+do\s+sprzeda/i.test(t);
}


const ROUND_WORD_TO_INT = {
  pierwszy: 1, drugi: 2, trzeci: 3, czwarty: 4, 'piąty': 5,
  'szósty': 6, 'siódmy': 7, 'ósmy': 8, 'dziewiąty': 9, 'dziesiąty': 10,
};
const ROUND_WORD_RE =
  /og[łl]asza\s+(pierwszy|drugi|trzeci|czwarty|pi[ąa]ty|sz[óo]sty|si[óo]dmy|[óo]smy|dziewi[ąa]ty|dziesi[ąa]ty)\s+(?:publiczny\s+)?przetarg/i;

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
  const t = whole(text);
  const wm = ROUND_WORD_RE.exec(t);
  if (wm) return ROUND_WORD_TO_INT[wm[1].toLowerCase()] ?? null;
  let m = /og[łl]asza\s+([IVXL]{1,4})\s+(?:publiczny\s+)?przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /\b([IVXL]{1,4})\s+przetargu\s+publicznym\b/i.exec(t);
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
  let m = /odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /przeprowadzi\S*\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}


export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcz\w*[^0-9]{0,100}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  let m = /cen\S*\s+w\s+wysoko[śs]ci\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  if (!m) m = /za\s+cen[ęe]\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}


const LAND_FALLBACK_RE = /niezabudowan|dzia[łl](?:k[aęiąo]|ek)\b/i;

export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  const k2 = classifyKind(field(text, 'PODTYTUL'));
  if (k2 !== 'unknown') return k2;
  const w = whole(text);
  const k3 = classifyKind(w);
  if (k3 !== 'unknown') return k3;
  return LAND_FALLBACK_RE.test(w) ? 'grunt' : 'unknown';
}


const FLAT_ADDR_RE =
  /Po[łl]o[żz]enie\s+nieruchomo[śs]ci\s*[–\-]\s*(?:(?:obr[ęe]b\s+)?[A-Za-zŁłŚśŻżŹźĆćĘęÓóŃńĄą]+\s*,\s*)?ul\.\s*([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s*(\d+(?:-\d+)?[A-Za-z]?)(?:\s*\/\s*([0-9]+[A-Za-z]?))?\b/i;

const RESULT_ADDR_RE =
  /przy\s+ul\.\s*([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s+(\d+(?:-\d+)?[A-Za-z]?)\s+w\s+Piszu/i;

function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  let m = FLAT_ADDR_RE.exec(whole(text));
  if (m) {
    const street = m[1].trim().replace(/\s+/g, ' ');
    const building = m[2];
    const apt = m[3] || unitNoFromText(text);
    return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  }
  m = RESULT_ADDR_RE.exec(whole(text));
  if (m) {
    const street = m[1].trim().replace(/\s+/g, ' ');
    const building = m[2];
    const apt = unitNoFromText(text);
    return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  }
  return null;
}

const LAND_OBREB_ANNOUNCE_RE =
  /Po[łl]o[żz]enie\s+nieruchomo[śs]ci\s*[–\-]\s*obr[ęe]b\s+([A-Za-zŁłŚśŻżŹźĆćĘęÓóŃńĄą0-9 ]+?)(?:,|\s+gmina\b|\s+[Nn]umer\b|$)/i;
const LAND_OBREB_RESULT_RE =
  /w\s+obr[ęe]bie\s+([A-Za-zŁłŚśŻżŹźĆćĘęÓóŃńĄą0-9 ]+?)(?:,|\s*\(|\s+dla\s+kt[óo]rej|\.|$)/i;

export function obrebFromText(text) {
  const t = whole(text);
  let m = LAND_OBREB_ANNOUNCE_RE.exec(t);
  if (!m) m = LAND_OBREB_RESULT_RE.exec(t);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, ' ').replace(/^ewidencyjny\s+/i, '');
}

const UNIT_AREA_RE =
  /lokal\w*\s+(?:nie)?mieszkaln\w*\s+nr\.?\s*\d+[A-Za-z]?,?\s+o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s*(?:u[żz]ytkow\w*\s+)?(\d+[.,]\d+)\s*m/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

const LAND_AREA_RE =
  /Powierzchnia\s+(?:nieruchomo[śs]ci|dzia[łl]ki)\s*[–\-:]?\s*(\d+(?:[.,]\d+)?)\s*(ha|m)/i;

export function landAreaFromText(text) {
  const m = LAND_AREA_RE.exec(whole(text));
  if (!m) return null;
  const val = parseNum(m[1]);
  if (val == null) return null;
  return /ha/i.test(m[2]) ? Math.round(val * 10000) : Math.round(val);
}

export function landPlotsFromText(text) {
  const t = whole(text);
  const seg = String.raw`\d+(?:\/\d+)?`;
  const join = String.raw`(?:\s*(?:\bi\b|\boraz\b)\s*${seg})*`;
  const re1 = new RegExp(
    `(?:numer\\w*|nr)\\s+(?:geodezyjn\\w*\\s+)?dzia[łl](?:ki|ek)\\s*(?:[–\\-:])?\\s*(${seg}${join})`,
    'i',
  );
  const re2 = new RegExp(`dzia[łl]k\\w*\\s+nr\\.?\\s*(${seg}${join})`, 'i');
  const m = re1.exec(t) || re2.exec(t);
  if (!m) return [];
  const parcels = [];
  const seen = new Set();
  for (const p of m[1].split(/\s*(?:\bi\b|\boraz\b)\s*/i)) {
    const clean = p.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      parcels.push(clean);
    }
  }
  return parcels;
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const obreb = obrebFromText(text);
    const dzialkaList = landPlotsFromText(text);
    const dzialka_nr = dzialkaList.length ? dzialkaList.join(', ') : null;
    if (!obreb && !dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(text),
      address_raw: obreb ? `obręb ${obreb}` : null,
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


export function parseWykaz(text, publishedDate) {
  if (!text) return null;
  const kind = kindFromText(text);
  if (kind === 'grunt') return null;
  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    published_date: publishedDate || null,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const obreb = obrebFromText(text);
    const dzialkaList = landPlotsFromText(text);
    const dzialka_nr = dzialkaList.length ? dzialkaList.join(', ') : null;
    if (!obreb && !dzialka_nr) return [];
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
        address_raw: obreb ? `obręb ${obreb}` : null,
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
