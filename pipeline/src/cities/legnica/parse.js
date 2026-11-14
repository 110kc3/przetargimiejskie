import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTHS = {
  stycznia: 1, styczeń: 1,
  lutego: 2, luty: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecień: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpień: 8,
  września: 9, wrzesień: 9,
  'wrzesnia': 9,
  października: 10, październik: 10,
  'pazdziernika': 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzień: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s| /g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s| /g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ORDINAL_HISTORY = [
  /\bpierwsz\w+\s+przetarg\s+odby[łl]/i,
  /\bdrug\w+\s+(?:\d|przetarg\s+odby)/i,
  /\btrzeci\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bczwart\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bpi[ąa]t\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bsz[oó]st\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bsi[oó]dm\w*\s+(?:\d|przetarg\s+odby)/i,
  /\b[oó]sm\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bdzi[eę]wi[ąa]t\w*\s+(?:\d|przetarg\s+odby)/i,
  /\bdziesi[ąa]t\w*\s+(?:\d|przetarg\s+odby)/i,
];

const ORDINAL_LIST = [
  { re: /\bpierwsz\w+\s+\d/, v: 1 },
  { re: /\bdrug\w+\s+\d/, v: 2 },
  { re: /\btrzeci\w*\s+\d/, v: 3 },
  { re: /\bczwart\w*\s+\d/, v: 4 },
  { re: /\bpi[ąa]t\w*\s+\d/, v: 5 },
  { re: /\bsz[oó]st\w*\s+\d/, v: 6 },
  { re: /\bsi[oó]dm\w*\s+\d/, v: 7 },
  { re: /\b[oó]sm\w*\s+\d/, v: 8 },
  { re: /\bdzi[eę]wi[ąa]t\w*\s+\d/, v: 9 },
  { re: /\bdziesi[ąa]t\w*\s+\d/, v: 10 },
];

export function roundFromText(text) {
  if (!text) return null;
  const t = text;
  const histStart = t.search(/Pierwszy\s+przetarg\s+odby[łl]/i);
  if (histStart >= 0) {
    const hist = t.slice(histStart);
    let maxOrdinal = 0;
    for (let i = 0; i < ORDINAL_LIST.length; i++) {
      if (ORDINAL_LIST[i].re.test(hist)) maxOrdinal = ORDINAL_LIST[i].v;
    }
    if (maxOrdinal > 0) return maxOrdinal + 1;
  }
  if (/\bpierwsz\w+\s+przetarg/i.test(t)) return 1;
  if (/\bdrug\w+\s+przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/i.test(t)) return 3;
  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

export function areaFromText(text) {
  if (!text) return null;
  const labelled = /Powierzchni\w*\s+([\d][\d\s.,]*)\s*m\s*[²2²]/i.exec(text);
  if (labelled) {
    const v = parseArea(labelled[1]);
    if (v && v > 0) return v;
  }
  const uzytkowej = /powierzchni\w*\s+u[żz]ytkow\w*\s+([\d][\d.,]*)\s*m\s*[²2²]/i.exec(text);
  if (uzytkowej) {
    const v = parseArea(uzytkowej[1]);
    if (v && v > 0) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*[²2²](?!\d)/gi;
  const cands = [];
  let m;
  M2.lastIndex = 0;
  while ((m = M2.exec(text)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (/dzia[łl]k|grunt/i.test(before)) continue;
    if (/piwnic|kom[óo]rk|przynale[żz]/i.test(before)) continue;
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function priceFromText(text) {
  if (!text) return null;
  const labelled = /[Cc]ena\s+(?:lokalu|wywo[łl]awcza)\s+([\d][\d\s.,]*)\s*z[łl]/i.exec(text);
  if (labelled) return parsePLN(labelled[1]);
  const start = text.search(/\bcena\b/i);
  if (start >= 0) {
    const region = text.slice(start, start + 200);
    const m = /([\d][\d\s.,]*)\s*z[łl]/i.exec(region);
    if (m) return parsePLN(m[1]);
  }
  return null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const anchor = /odb[ęe]dzie\s+si[ęe]\s+([\s\S]{0,60})/i.exec(text);
  const scope = anchor ? anchor[1] : text;
  const num = /(\d{1,2})\.\s*(\d{2})\.\s*(\d{4})/.exec(scope);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  if (anchor) {
    const num2 = /(\d{1,2})\.\s*(\d{2})\.\s*(\d{4})/.exec(text);
    if (num2) return iso(num2[3], num2[2], num2[1]);
  }
  return null;
}


export function parseAnnouncement(text) {
  return {
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
  };
}


function finalPriceFromText(text) {
  const m = /[Cc]ena\s+nieruchomo[śs]ci\s+osi[ąa]gni[ęe]ta\s+w\s+wyniku\s+przetargu[^0-9]{0,20}([\d][\d .,]*)\s*z[łl]/i.exec(text);
  if (m) return parsePLN(m[1]);
  const m2 = /osi[ąa]gni[ęe]ta[^0-9]{0,80}([\d][\d .,]*)\s*z[łl]/i.exec(text);
  if (m2) return parsePLN(m2[1]);
  return null;
}

function stripCity(s) {
  return (s || '').replace(/^\s*Legnica\s+/i, '').trim();
}

function resultDateFromText(text) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s+r?\./i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

function startingPriceFromResultText(text) {
  const lab = /[Cc]ena\s+lokalu[^0-9]{0,30}([\d][\d .,]*)\s*z[łl]/i.exec(text);
  if (lab) return parsePLN(lab[1]);
  const priceRe = /([\d][\d .,]*)\s*z[łl]/gi;
  let m;
  while ((m = priceRe.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (/osi[ąa]gni[ęe]ta/i.test(before)) continue;
    const v = parsePLN(m[1]);
    if (v && v >= 10000) return v;
  }
  return null;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  if (!/INFORMACJA\s+dotycz[ąa]ca\s+rozstrzygni[ęe]cia/i.test(text) &&
      !/rozstrzygni[ęe]cia\s+przetargu/i.test(text)) {
    return [];
  }

  const t = text.replace(/\r/g, '');

  const auctionDate = resultDateFromText(t) || fallbackDate || null;


  const blockRe = /Legnica\s+(?:ul|al|pl|os)\.?\s+[A-ZŻŹĆŁŚĄĘÓŃ]/gi;
  const blockStarts = [];
  let bm;
  while ((bm = blockRe.exec(t)) !== null) blockStarts.push(bm.index);

  if (blockStarts.length === 0) blockStarts.push(0);

  const out = [];
  for (let i = 0; i < blockStarts.length; i++) {
    const block = t.slice(blockStarts[i], blockStarts[i + 1] ?? t.length);
    const notes = [];

    const addrLineM = /Legnica\s+((?:ul|al|pl|os)\.?\s+[^\n]+)/.exec(block);
    if (!addrLineM) continue;
    const addrLine = addrLineM[1].replace(/\s+/g, ' ').trim();

    const aptM = /[Ll]okal\s+(?:mieszkaln\w+|u[żz]ytkow\w+|)?\s*nr\s+(\d+[a-z]?)/i.exec(block);
    if (!aptM) continue;
    const apt = aptM[1];

    const addressRaw = `${addrLine}/${apt}`;
    const address = parseAddress(addressRaw);
    if (!address) {
      notes.push(`parse: could not parse address from '${addressRaw}'`);
      continue;
    }
    if (address.warning) notes.push(address.warning);

    const kind = classifyKind(block.slice(0, 200));

    let area_m2 = null;
    const powierzchniaIdx = block.search(/\bPowierzchnia\b/i);
    if (powierzchniaIdx >= 0) {
      const afterPow = block.slice(powierzchniaIdx);
      const areaM = /([\d][\d.,]*)\s*m\s*[²2²](?!\d)/i.exec(afterPow);
      area_m2 = areaM ? parseArea(areaM[1]) : null;
    } else {
      const areaM2Re = /([\d][\d.,]*)\s*m\s*[²2²](?!\d)/gi;
      let am;
      while ((am = areaM2Re.exec(block)) !== null) {
        const before = block.slice(Math.max(0, am.index - 30), am.index);
        if (/Dz\.\s*nr\s*\d|dzia[łl]k|grunt/i.test(before)) continue;
        area_m2 = parseArea(am[1]);
        break;
      }
    }

    const starting_price_pln = startingPriceFromResultText(block);
    if (starting_price_pln == null) notes.push('parse: missing starting price');

    const final_price_pln = finalPriceFromText(block);

    const negative =
      /negatywn|nie\s+wy[łl]oniono|nie\s+dosz[łl]o\s+do/i.test(block) ||
      (final_price_pln == null && !/nabywc/i.test(block));

    if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

    out.push({
      auction_date: auctionDate,
      source_pdf: sourceUrl,
      kind,
      address_raw: addressRaw,
      address,
      round: null,
      starting_price_pln,
      final_price_pln: negative ? null : final_price_pln,
      outcome: negative ? 'unsold' : 'sold',
      unsold_reason: negative ? 'unknown' : null,
      area_m2,
      notes,
    });
  }

  return out;
}
