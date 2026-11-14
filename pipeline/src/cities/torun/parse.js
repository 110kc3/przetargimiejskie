
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}


export function parseDateField(raw) {
  if (!raw) return null;
  const s = raw.replace(/\s+/g, '');
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

export function parsePriceField(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/\bod\b.*\bdo\b/i.test(s)) return null;
  if (/wadium/i.test(s)) {
    const pricePart = s.split(/wadium/i)[0].trim().replace(/[,;]\s*$/, '');
    if (/^\d[\d .,-]*(?:z[łl])?$/i.test(pricePart)) {
      return _parsePLN(pricePart.replace(/z[łl]$/i, '').trim().replace(/,-$/, ''));
    }
  }
  const priceRe = /([\d][\d .,]*),?-?[\s]*z[łl]/gi;
  const hits = [];
  let m;
  while ((m = priceRe.exec(s)) !== null) {
    const n = _parsePLN(m[1]);
    if (n != null) hits.push(n);
  }
  if (hits.length === 1) return hits[0];
  if (hits.length === 2 && /wadium/i.test(s)) return hits[0];
  return null;
}

function _parsePLN(numStr) {
  if (!numStr) return null;
  const s = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(s);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = s.replace(/[.,]\d{2}$/, '').replace(/[.,]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function roundFromText(text) {
  const t = (text || '').toLowerCase();
  if (/kolejn/i.test(t)) return null;
  if (/\bdrugi[eaim]?\b|\bdrugich\b/i.test(t)) return 2;
  if (/\btrzeci[cha]?\b/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  if (/\bpi[a-z]{2}t/i.test(t)) return 5;
  if (/\bpierwsz/i.test(t)) return 1;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

export function isResolved(text) {
  return /lokal\w*\s+sprzeda[ny]/i.test(text || '');
}


function _xmlText(xml, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m
    ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
    : '';
}

export function parseXmlFeed(xml) {
  if (!xml) return [];
  const out = [];
  const itemRe = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block          = m[1];
    const url            = _xmlText(block, 'url');
    const adresRaw       = _xmlText(block, 'adres-nieruchomosci');
    const przetargNa     = _xmlText(block, 'przetarg-na');
    const rodzaj         = _xmlText(block, 'rodzaj-nieruchomosci');
    const cenaRaw        = _xmlText(block, 'cena-wywolawcza');
    const dataRaw        = _xmlText(block, 'data-przetargu');

    if (!url || !adresRaw) continue;

    const idM  = /\/przetarg-nieruchomosci\/(\d+)\//.exec(url);
    const id   = idM ? idM[1] : null;

    const resolved = isResolved(adresRaw) || isResolved(url);

    const adresClean = adresRaw
      .replace(/\s*[-–]\s*lokal\w*\s+sprzeda\w*/i, '')
      .replace(/\s+lokal\w*\s+sprzeda\w*/i, '')
      .trim();

    const kind               = classifyKind(rodzaj + ' ' + przetargNa);
    const auction_date       = parseDateField(dataRaw);
    const starting_price_pln = parsePriceField(cenaRaw);
    const round              = roundFromText(przetargNa);

    out.push({
      id, detail_url: url, address_raw: adresClean,
      rodzaj, przetarg_na: przetargNa,
      kind, auction_date, starting_price_pln, round, resolved,
    });
  }
  return out;
}


export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIK/i.test(text || '');
}

function _resultDate(text) {
  const m =
    /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? iso(m[3], mo, m[1]) : null;
}

const _HDR = /Pol[oa][zz]enie|Lokal.*pow|Dzia[ll]ka|Ksiega|MPZP|Cena\s+wywo|Cena\s+wylic|Ilos[cc]|Nabywca/i;

const _STARTS_RECORD = /^(ul\.|[A-Za-z][a-zA-Z]+\s+[A-Za-z]?[a-zA-Z]*\s*\d)/;

function _startsRecord(line) {
  return _STARTS_RECORD.test(line.trim());
}

function _extractArea(s) {
  const m = /([\d]+[,.]?[\d]*)\s*m\s*2/.exec(s);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}


export function areaFromDetailHtml(html) {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, ' ');
  const m = /(\d+[,.]\d+)\s*m2/i.exec(text);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function _parseBlock(block, auctionDate, sourceUrl) {
  const flat = block.replace(/\n/g, '\t');
  const cols = flat.split('\t');

  const loc = (cols[0] || '').trim();
  if (!loc || _HDR.test(loc)) return null;

  let ci = -1;
  for (let i = cols.length - 1; i >= 2; i--) {
    if (/^\d+\/\d+$/.test(cols[i].trim())) { ci = i; break; }
  }
  if (ci < 3) return null;

  const startingRaw = cols[ci - 2].trim();
  const achievedRaw = cols[ci - 1].trim();
  const buyer       = cols.slice(ci + 1).map((c) => c.trim()).filter(Boolean).join(' ');

  const unitRaw = (cols[1] || '').trim();
  const areaRaw = (cols[2] || '').trim();
  const unitM   = /Nr\s+(\d+)(?:\s*([A-Za-z])(?!\d))?/i.exec(unitRaw);
  const unitNo  = unitM ? (unitM[1] + (unitM[2] || '')).trim() : null;
  const area_m2 = _extractArea(unitRaw) || _extractArea(areaRaw) || null;

  let address_raw = loc;
  if (unitNo) {
    const already = new RegExp(`/${unitNo}\\b`, 'i').test(address_raw);
    if (!already) address_raw = `${address_raw}/${unitNo}`;
  }

  const address = parseAddress(address_raw);
  if (!address) return null;

  const startM          = /([\d][\d .,]*)[\s]*z[łl]/i.exec(startingRaw);
  const starting_price_pln = startM ? _parsePLN(startM[1]) : null;

  const negative =
    /^-+$/.test(achievedRaw) || achievedRaw === '' || /nie\s+dosz/i.test(achievedRaw);
  const finalM          = !negative ? /([\d][\d .,]*)[\s]*z[łl]/i.exec(achievedRaw) : null;
  const final_price_pln = finalM ? _parsePLN(finalM[1]) : null;

  return {
    auction_date: auctionDate,
    kind: 'mieszkalny',
    address_raw: address_raw.trim(),
    address,
    area_m2,
    starting_price_pln,
    final_price_pln,
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    buyer: buyer || null,
    notes: [],
    source_pdf: sourceUrl,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];

  const t           = (text || '').replace(/\r/g, '');
  const auctionDate = _resultDate(t) || fallbackDate || null;

  const out   = [];
  const lines = t.split('\n');
  let pending = null;

  const flush = () => {
    if (pending === null) return;
    const row = _parseBlock(pending, auctionDate, sourceUrl);
    if (row) out.push(row);
    pending = null;
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    if (_startsRecord(line)) {
      flush();
      pending = line;
    } else if (pending !== null) {
      pending = pending + '\n' + line;
    }
    // pre-record header/date text -- ignored (pending is null)
  }
  flush();

  return out;
}

export function splitMultiFlatNotice(record, html) {
  const units = [...record.address_raw.matchAll(/(?:m\.\s*nr|i\s+nr)\s*(\d+[A-Za-z]?)/gi)].map((m) => m[1]);
  if (units.length < 2) return [record];
  const base = record.address_raw.replace(/\s+m\.\s*nr[\s\S]*$/i, '');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const priceField = /Cena wywoławcza\s+([\s\S]*?)Data przetargu/i.exec(text)?.[1];
  const prices = priceField?.split(';').map((part) => parsePriceField(part.trim()));
  if (!prices || prices.length !== units.length || prices.some((v) => v == null)) throw new Error('multi-flat notice has ambiguous prices');
  return units.map((unit, index) => {
    const paragraph = new RegExp(`lokalu\\s+mieszkalnego\\s+nr\\s+${unit}\\b([\\s\\S]*?)(?=\\d+\\)\\s*lokalu|$)`, 'i').exec(text)?.[1];
    const area = /powierzchni(?:\s+użytkowej)?\s+(\d+[,.]\d+)\s*m2/i.exec(paragraph || '');
    if (!area) throw new Error('multi-flat notice has no unit-specific area');
    return { ...record, address_raw: `${base}/${unit}`, area_m2: Number(area[1].replace(',', '.')),
      starting_price_pln: prices[index] };
  });
}
