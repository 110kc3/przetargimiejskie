import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function fold(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[ąà]/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

export function monthNum(token) {
  const t = fold(token);
  if (/^sty/.test(t)) return '01';
  if (/^lut/.test(t)) return '02';
  if (/^mar/.test(t)) return '03';
  if (/^kwi/.test(t)) return '04';
  if (/^maj/.test(t)) return '05';
  if (/^cze/.test(t)) return '06';
  if (/^lip/.test(t)) return '07';
  if (/^sie/.test(t)) return '08';
  if (/^wrz/.test(t)) return '09';
  if (/^pa[zd]/.test(t)) return '10';
  if (/^lis/.test(t)) return '11';
  if (/^gru/.test(t)) return '12';
  return null;
}

function plnFromDotted(s) {
  const n = Number(String(s).replace(/\./g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MONEY_RE = /(?<![\d.,\/])(\d{1,3}(?:\.\d{3})+)(?![\d.\/]|\s*m\s*[²2?*])/g;

const AREA_RE = /lokal\w*\s+mieszkaln\w*\s+o\s+pow\.?\s*(\d+(?:[.,]\d+)?)\s*m(?=[²2?*\s.,;]|$)/gi;

const ADDR_RE =
  /(?:^|[\s(>])((?:ul\.\s*)?(?:\d{1,2}\s+(?=(?:Maja|Stycznia|Lutego|Marca|Kwietnia|Czerwca|Lipca|Sierpnia|Września|Października|Listopada|Grudnia)\b))?\p{Lu}[\p{Ll}'.]+(?:\s+\p{Lu}[\p{Ll}'.]+){0,3})\s+(\d{1,3}[A-Za-z]?\/\d{1,3}[A-Za-z]?)(?![\d\/])/gmu;

const STREET_STOPWORDS = new Set([
  'nr', 'lp', 'kw', 'dz', 'obr', 'poz', 'ust', 'pkt', 'art', 'godz', 'pok',
  'tel', 'ul', 'ogloszenie', 'ogloszeniu', 'informacja', 'wlkp', 'ezd', 'sche',
]);

export function extractFlatAddresses(text) {
  const out = [];
  ADDR_RE.lastIndex = 0;
  let m;
  while ((m = ADDR_RE.exec(text || '')) !== null) {
    const street = m[1].replace(/^ul\.\s*/i, '').trim();
    const words = fold(street).split(/\s+/);
    if (words.some((w) => STREET_STOPWORDS.has(w.replace(/\W/g, '')))) continue;
    if (street.length < 3) continue;
    out.push({ raw: `ul. ${street} ${m[2]}`, street, num: m[2], index: m.index + m[0].indexOf(m[1]), end: ADDR_RE.lastIndex });
  }
  return out;
}


function stemToRound(word) {
  const w = fold(word);
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  if (/^pia?t/.test(w)) return 5;
  if (/^szo?st/.test(w)) return 6;
  if (/^sio?dm/.test(w)) return 7;
  if (/^o?sm/.test(w)) return 8;
  return null;
}


export function auctionDateFromText(text) {
  const m = /przetargi?\s+odb\S*\s+si\S*\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const m =
    /przeprowadzon\w*(?:\s+w)?\s+dni[au]\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = monthNum(m[2]);
  return mo ? `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}` : null;
}


const TABLE_END_RE = /przedmiotem\s+przetargu\s+przeznaczone/i;

const ANCHOR_ROUND_RE = /^\s{0,12}(\d{1,2})\.\s+(\S+)/gm;

export function parseAnnouncement(text, ctx = {}) {
  if (!text || !/lokal\w*\s+mieszkaln/i.test(text)) return [];
  const t = text.replace(/\r/g, '');

  const auction_date = ctx.fallbackAuctionDate || auctionDateFromText(t) || null;

  const endM = TABLE_END_RE.exec(t);
  const table = endM ? t.slice(0, endM.index) : t;

  const addresses = extractFlatAddresses(table);
  const n = addresses.length;
  if (!n) return [];

  const areas = [...table.matchAll(AREA_RE)].map((m) => parseArea(m[1]));

  const moneys = [...table.matchAll(MONEY_RE)].map((m) => plnFromDotted(m[1]));
  let prices = null;
  if (moneys.length === 2 * n) {
    const cands = [];
    let ok = true;
    for (let i = 0; i < n; i++) {
      const p = moneys[2 * i];
      const w = moneys[2 * i + 1];
      if (p == null || w == null || !(w < p && w >= p * 0.02 && w <= p * 0.3)) {
        ok = false;
        break;
      }
      cands.push(p);
    }
    if (ok) prices = cands;
  }

  const rounds = [];
  ANCHOR_ROUND_RE.lastIndex = 0;
  let am;
  while ((am = ANCHOR_ROUND_RE.exec(table)) !== null) {
    const lp = Number(am[1]);
    const r = stemToRound(am[2]);
    if (lp >= 1 && lp <= n && r != null) rounds[lp - 1] = r;
  }

  const out = [];
  for (let i = 0; i < n; i++) {
    const address = parseAddress(addresses[i].raw);
    if (!address) continue;
    out.push({
      kind: 'mieszkalny',
      address_raw: addresses[i].raw,
      address,
      area_m2: areas.length === n ? areas[i] : null,
      starting_price_pln: prices ? prices[i] : null,
      auction_date,
      round: rounds[i] ?? null,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    });
  }
  return out;
}


export function isResultNotice(text) {
  return /informacja\s+o\s+wynik/i.test(text || '') && /przetarg|rokowa/i.test(text || '');
}

export function isNegative(text) {
  return /wynikiem\s+negatywnym|nie\s+odnotowano\s+wp[łl]at/i.test(text || '');
}

const RESULT_ANCHOR_RE = /^\s{0,12}\d{1,2}\.\s/;

export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = resultDateFromText(t) || fallbackDate || null;

  const addresses = extractFlatAddresses(t);
  const rows = addresses.map((candidate) => {
    const lineStart = t.lastIndexOf('\n', candidate.index - 1) + 1;
    const previousLineStart = t.lastIndexOf('\n', Math.max(0, lineStart - 2)) + 1;
    const twoLinesStart = t.lastIndexOf('\n', Math.max(0, previousLineStart - 2)) + 1;
    const ownLine = t.slice(lineStart, t.indexOf('\n', candidate.index) < 0 ? t.length : t.indexOf('\n', candidate.index));
    const preceding = t.slice(previousLineStart, lineStart);
    let start = lineStart;
    if (!/lokal\w*\s+mieszkaln/i.test(ownLine)) {
      if (/lokal\w*\s+mieszkaln/i.test(preceding)) start = previousLineStart;
      else if (/lokal\w*\s*\n\s*mieszkaln/i.test(t.slice(twoLinesStart,lineStart))) start = twoLinesStart;
    }
    return { ...candidate, start };
  });
  const out = [];
  for (const [index, row] of rows.entries()) {
    const block = t.slice(row.start, rows[index + 1]?.start ?? t.length);
    if (!/lokal\w*\s+mieszkaln/i.test(block)) continue;
    const address_raw = row.raw;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const notes = [];
    if (address.warning) notes.push(address.warning);

    const areaM = new RegExp(AREA_RE.source, 'i').exec(block);
    const areaFallback = /(?<![\d.,])(\d+[.,]\d{1,2})(?!\d)\s*m\s*[²2?*]/i.exec(block);
    const area_m2 = areaM ? parseArea(areaM[1]) : areaFallback ? parseArea(areaFallback[1]) : null;

    const moneyMatches = [...block.matchAll(MONEY_RE)]
      .filter((match) => !/\/\s*$/.test(block.slice(0, match.index)));
    const denominators = new Set();
    for (const fraction of block.matchAll(/(\d{1,3}(?:\.\d{3})+)\/\s*/g)) {
      const numerator = plnFromDotted(fraction[1]);
      const denominator = moneyMatches.find((match) => match.index >= fraction.index + fraction[0].length
        && match.index - fraction.index < 400 && plnFromDotted(match[1]) > numerator);
      if (denominator) denominators.add(denominator.index);
    }
    const moneys = moneyMatches.filter((match) => !denominators.has(match.index))
      .map((match) => plnFromDotted(match[1]));
    const starting_price_pln = moneys[0] ?? null;
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    const achieved = moneys[1] ?? null;

    const negative = isNegative(block);
    const sold = !negative && achieved != null;
    if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');
    if (sold && starting_price_pln != null && achieved < starting_price_pln) {
      notes.push('parse: achieved price below starting price — verify row');
    }

    const kind = classifyKind(block.slice(0, 400));
    out.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    });
  }
  return out;
}
