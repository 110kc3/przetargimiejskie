import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|td|tr|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–').replace(/&mdash;/gi, '—')
    .replace(/&sup2;/gi, '²').replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
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

export function whole(text) {
  const t = String(text || '');
  const title = field(t, 'TITLE');
  const body = field(t, 'BODY');
  if (!title && !body) return t.trim();
  return `${title} ${body}`.trim();
}

const PL = 'A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄąÜü';
const UPPER = 'A-ZŁŚŻŹĆĘÓŃĄÜ';


export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /(sprzeda[żz]|zbyci)/i.test(t);
}

export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t);
}

export function isRokowania(text) {
  return /\brokowani/i.test(whole(text));
}

export function isCancelled(text) {
  const title = field(text, 'TITLE');
  const t = whole(text);
  if (/^\s*odwo[łl]ani\w*\s+przetarg/i.test(title)) return true;
  return /przetarg\w*\s+(?:zosta[łl]\w*\s+)?odwo[łl]an/i.test(t) || /uniewa[żz]ni\w*\s+przetarg/i.test(t);
}

export function isResultDoc(text) {
  const title = field(text, 'TITLE');
  if (/^\s*informacj/i.test(title)) return true;
  const t = whole(text);
  return /informacj\w*\s+(?:burmistrza\s+)?(?:miasta\s+)?(?:l[ęe]borka\s+)?(?:o\s+wynik|po\s+[IVX]+\s+przetarg|dotycz)/i.test(t)
    || /podaj[ęe]\s+do\s+publicznej\s+wiadomo[śs]ci\s+informacj/i.test(t)
    || /przetarg\w*\s+zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynikiem/i.test(t);
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|zako[ńn]czy[łl]\w*\s+si[ęe]\s+wynikiem\s+negatywnym|nikt\s+nie\s+(?:przyst[ąa]pi|wp[łl]aci|wzi[ąeą][łl])|brak\s+ofert|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium/i.test(t);
}


const ROMAN = { I: 1, V: 5, X: 10 };

function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

export function roundFromText(text) {
  const RE = /\b([IVX]{1,4})\s+przetarg/i;
  const title = field(text, 'TITLE');
  let m = RE.exec(title);
  if (m) { const n = romanToInt(m[1]); if (n) return n; }
  m = RE.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}


const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function parseDatePhrase(phrase) {
  const s = String(phrase || '').trim();
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(s);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(s);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

const DATE_TOKEN = String.raw`(\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})`;

export function auctionDateFromText(text) {
  const t = whole(text);
  const patterns = [
    new RegExp(String.raw`odb[ęe]dzie\s+si[ęe]\s+(?:w\s+dniu\s+|dnia\s+)?${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`przeprowadzon\w*[\s\S]{0,20}?\bw\s+dniu\s+${DATE_TOKEN}`, 'i'),
    new RegExp(String.raw`og[łl]oszon\w*\s+na\s+dzie[ńn]\s+${DATE_TOKEN}`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) {
      const iso = parseDatePhrase(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}


const AMOUNT = String.raw`(?<!\d)(\d{1,3}(?:[.\s ]\d{3})*,\d{2})`;
const PRICE_RE = new RegExp(String.raw`cena\s+wywo[łl]awcz\w*[^0-9]{0,40}?${AMOUNT}\s*z[łl]`, 'i');
const AMOUNT_ZL_RE = new RegExp(String.raw`${AMOUNT}\s*z[łl]`, 'i');

export function startingPriceFromText(text) {
  const t = whole(text);
  const m = PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const m2 = AMOUNT_ZL_RE.exec(t);
  return m2 ? parsePLN(m2[1]) : null;
}

export function wadiumFromText(text) {
  const m = /wadium\w*[^0-9]{0,40}?w\s+wysoko[śs]ci\s+(\d{1,3}(?:[.\s ]\d{3})*,\d{2})\s*z[łl]/i.exec(whole(text));
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  if (!/nabywc/i.test(t)) return null;
  if (isNegativeOutcome(t)) return null;
  let m = new RegExp(String.raw`najwy[żz]sz\w+\s+cen\w+[^0-9]{0,80}?${AMOUNT}\s*z[łl]`, 'i').exec(t);
  if (!m) m = new RegExp(String.raw`za\s+cen[ęe]\s+(?:w\s+wysoko[śs]ci\s+)?${AMOUNT}\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function isLandNotice(text) {
  const t = whole(text);
  if (/lokal\w*\s+(?:mieszkaln|o\s+innym\s+ni[żz]\s+mieszkaln|niemieszkaln|u[żz]ytkow)/i.test(t)) return false;
  return /gruntow\w*|niezabudowan\w*|nieruchomo[śs]ci\s+gruntow|dzia[łl]k/i.test(t);
}

function kindFromSegment(seg) {
  const s = String(seg || '');
  if (/lokal\w*\s+o\s+innym\s+ni[żz]\s+mieszkaln|lokal\w*\s+(?:niemieszkaln|u[żz]ytkow)/i.test(s)) return 'uzytkowy';
  if (/lokal\w*\s+mieszkaln|mieszkaln\w+\s+nr|lokalu\s+nr/i.test(s)) return 'mieszkalny';
  if (/gara[żz]/i.test(s)) return 'garaz';
  const k = classifyKind(s);
  return k === 'unknown' ? 'mieszkalny' : k;
}

export function kindFromText(text) {
  if (isLandNotice(text)) return 'grunt';
  return kindFromSegment(whole(text));
}


const LOKAL_NR_RE = /\bnr\s+(\d+[A-Za-z]?)\s+(?:oficyna\s+)?o\s+p(?:ow\b|ow\.|owierzchni)/i;

const ADDR_RE = new RegExp(String.raw`[Pp]rzy\s+(?:ul(?:\.|ic\w*)?\s+)?([${UPPER}][${PL}.\- ]*?)\s+(\d+[A-Za-z]?)\b`);
const OFFICE_RE = /(urz[ęe]d|siedzib|sali\b|w\s+sali|banku|oddzia[łl]|tablicy)/i;

const AREA_RE = /o\s+p(?:ow\.|owierzchni)\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

function flatSegments(body) {
  const re = new RegExp(String.raw`\blokal\w*\b[^.]{0,80}?\bnr\s+\d+[A-Za-z]?\s+(?:oficyna\s+)?o\s+p(?:ow\b|ow\.|owierzchni)`, 'gi');
  const starts = [];
  let m;
  while ((m = re.exec(body)) !== null) starts.push(m.index);
  if (starts.length <= 1) return [body];
  const segs = [];
  for (let i = 0; i < starts.length; i++) {
    segs.push(body.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : body.length));
  }
  return segs;
}

function streetBuildingFromSegment(seg) {
  const re = new RegExp(ADDR_RE.source, 'g');
  let m;
  while ((m = re.exec(seg)) !== null) {
    const before = seg.slice(Math.max(0, m.index - 30), m.index);
    if (OFFICE_RE.test(before)) continue;
    return { street: m[1].trim().replace(/\s+/g, ' '), building: m[2] };
  }
  return null;
}

export function flatAddressRaw(seg) {
  const sb = streetBuildingFromSegment(seg);
  if (!sb) return null;
  const u = LOKAL_NR_RE.exec(seg);
  const apt = u ? u[1] : null;
  return apt ? `${sb.street} ${sb.building}/${apt}` : `${sb.street} ${sb.building}`;
}

export function unitAreaFromText(seg) {
  const m = AREA_RE.exec(seg);
  return m ? parseNum(m[1]) : null;
}


export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const reP = /dzia[łl]k[a-ząćęłńóśźż]*\s+nr\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  if (!parcels.length) {
    const row = /Nabywca\s+(\d+(?:\/\d+)?)\s+(\d{2,5})\b/i.exec(t);
    if (row) { parcels.push(row[1]); area_m2 = parseNum(row[2]); }
  }
  if (area_m2 == null) {
    const am = /o\s+(?:[łl][ąa]cznej\s+)?p(?:ow\.|owierzchni)\s+(\d+(?:[.,]\d+)?)\s*(ha|m)\b/i.exec(t);
    if (am) {
      const val = parseNum(am[1]);
      if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
    }
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}

export function landStreetFromText(text) {
  const re = new RegExp(String.raw`przy\s+ul(?:\.|ic\w*)?\s+([${PL}][${PL}.\- ]{1,40}?)(\s+\d|,|;|\.|\s+i\s+|$)`, 'gi');
  let m;
  const t = whole(text);
  while ((m = re.exec(t)) !== null) {
    if (/^\s+\d/.test(m[2])) continue;
    const before = t.slice(Math.max(0, m.index - 30), m.index);
    if (OFFICE_RE.test(before)) continue;
    return m[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

function gruntAchieved(text, starting) {
  if (starting == null) return null;
  const re = new RegExp(AMOUNT_ZL_RE.source, 'gi');
  let m; let best = null;
  while ((m = re.exec(whole(text))) !== null) {
    const v = parsePLN(m[1]);
    if (v != null && v > starting && (best == null || v > best)) best = v;
  }
  return best;
}


function flatRecord(seg, round, auction_date) {
  const address_raw = flatAddressRaw(seg);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const rec = {
    kind: kindFromSegment(seg),
    address_raw,
    address,
    area_m2: unitAreaFromText(seg),
    starting_price_pln: startingPriceFromText(seg),
    wadium_pln: wadiumFromText(seg),
    auction_date,
    round,
  };
  if (address.warning) rec.notes = [address.warning];
  return rec;
}

export function parseAnnouncement(text) {
  if (!text) return [];
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const body = whole(text);

  if (isLandNotice(text)) {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    return [{
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln: startingPriceFromText(text),
      auction_date,
      round,
    }];
  }

  const out = [];
  for (const seg of flatSegments(body)) {
    const rec = flatRecord(seg, round, auction_date);
    if (rec) out.push(rec);
  }
  return out;
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const negativeStated = isNegativeOutcome(text);
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (isLandNotice(text)) {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    const achieved = negativeStated ? null : gruntAchieved(text, starting_price_pln);
    const sold = achieved != null;
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
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
    }];
  }

  const address_raw = flatAddressRaw(whole(text));
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    auction_date,
    source_url: sourceUrl,
    kind: kindFromSegment(whole(text)),
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(whole(text)),
    notes,
  }];
}
