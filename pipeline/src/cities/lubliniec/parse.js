
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
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
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


function isNonAuctionNotice(text) {
  const title = field(text, 'TITLE');
  return /odwo[łl]an/i.test(title) || /rozstrzygni[ęe]\w*\s+skargi/i.test(title);
}

export function isSaleAuction(text) {
  if (isNonAuctionNotice(text)) return false;
  const t = whole(text);
  if (/zaproszenie\s+do\s+sk[łl]adania\s+ofert/i.test(t)) return false;
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie|miesi[ęe]cznie\s*$/i.test(t);
}

/** True when this looks like a "wynik przetargu" result notice (either the
 *  "Informacja pozytywna/negatywna …" or "INFORMACJA dotycząca wyniku …"
 *  convention, or the generic "…został przeprowadzony…"/"…osiągnięta…"
 *  phrasing) — and not a cancellation/complaint-resolution notice that also
 *  lands on the results board.
 *
 *  Deliberately NOT matched on a bare "wynik…(jest)…negatywny/pozytywny": an
 *  ACTIVE announcement's own round-history recap ("I, II, III przetargi
 *  ustne nieograniczone zakończyły się wynikiem negatywnym") uses exactly
 *  that phrase to describe a PRIOR round, which would otherwise make an
 *  announcement doc misclassify as a result doc (see
 *  MICKIEWICZA_IV_ACTIVE in the test — it carries that exact recap). Every
 *  real result doc observed live already opens with "Informacja
 *  pozytywna/negatywna …", so that (title-favoring, via TITLE-then-BODY
 *  concatenation) anchor plus the body-level anchors below are sufficient
 *  without the risky bare alternative. */
export function isResultDoc(text) {
  if (isNonAuctionNotice(text)) return false;
  const t = whole(text);
  return /informacj\w*\s+(?:pozytywn|negatywn)\w*|dotycz[ąa]?\w*\s+wyniku|przeprowadzon\w*\s+zosta[łl]|zosta[łl]\s+przeprowadzon\w*|osi[ąa]gni[ęe]t/i.test(t);
}

/** True when the resolution explicitly states a negative (unsold) outcome —
 *  Lubliniec's nominative "wynik jest negatywny" as well as the instrumental
 *  "wynikiem negatywnym" seen elsewhere in this CMS family. */
export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+(?:jest\s+)?negatywn\w*|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium/i.test(t);
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
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*[.\s]\s*(\d{4})/.exec(tail);
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
  let m = /w\s+dniu\s+([\s\S]{0,24}?)\s+o\s+godz(?:inie)?\.?/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /w\s+dniu\s+([\s\S]{0,24}?)\s*(?:w\s+siedzibie|\(godz|roku\b)/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}


export function startingPriceFromText(text) {
  const t = whole(text);
  let m = /cena\s+wywo[łl]awcz\w*[^0-9]{0,30}?(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /(?<![\d/])(\d[\d. ]*(?:,\d{2})?)\s*z[łl]\s+\d[\d. ]*(?:,\d{2})?\s*z[łl]\s+\d[\d. ]*(?:,\d{2})?\s*z[łl]\s+\d{1,2}:\d{2}/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  const m = /najwy[żz]sz\w*\s+cen\w*\s+(?:netto\s+)?osi[ąa]gni[ęe]t\w*\s+w\s+przetargu\s+(\d[\d. ]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function kindFromText(text) {
  const k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(whole(text));
}


const PROP_ADDR_RE =
  /przy\s+ul\.\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{1,60}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*(\d+[A-Za-z]?))?\b/gi;

const LAND_STREET_RE =
  /po[łl]o[żz]on\w*\s+(?:w\s+Lubli[ńn]cu\s+)?(?:przy\s+ul\.|w\s+rejonie\s+ul\.)\s+([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)(?:\s+w\s+Lubli[ńn]cu|,|\s+kt[óo]r|\(|\.|$)/i;

function isOfficeAddress(street, building) {
  return /^paderewsk/i.test(street.trim()) && building === '5';
}

function isJunkStreetCapture(street) {
  return /dzia[łl]k|przedmiot|paragraf|rozdzia[łl]/i.test(street);
}

function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(whole(text));
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  const t = whole(text);
  PROP_ADDR_RE.lastIndex = 0;
  let m;
  while ((m = PROP_ADDR_RE.exec(t)) !== null) {
    const street = m[1].trim().replace(/\s+/g, ' ');
    const building = m[2];
    if (isOfficeAddress(street, building)) continue;
    if (isJunkStreetCapture(street)) continue;
    const slashApt = m[3] || null;
    const apt = unitNoFromText(text) || slashApt;
    return apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  }
  return null;
}

function landStreetFromText(text) {
  const m = LAND_STREET_RE.exec(whole(text));
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

const UNIT_AREA_RE =
  /lokal\w*\s+(?:nie)?mieszkaln\w+\s+(?:nr\s+)?\d+[A-Za-z]?[\s\S]{0,100}?\bo\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const reP = /dzia[łl]k\w*\s+nr\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const am = /o\s+(?:[łl][ąa]cznej\s+)?pow\w*\.?\s+(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
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
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
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
