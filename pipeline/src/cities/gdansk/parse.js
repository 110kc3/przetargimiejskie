
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, areaFromText } from '../../core/finn-bip.js';

export { htmlToText };

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function auctionDateFromText(text) {
  if (!text) return null;
  const headingM =
    /(?:uczestnictwa|udzia[łl]u)\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text.slice(0, 2000));
  if (headingM) {
    const mo = PL_MONTH[headingM[2].toLowerCase()];
    if (mo) return `${headingM[3]}-${String(mo).padStart(2, '0')}-${headingM[1].padStart(2, '0')}`;
  }
  const numM =
    /W\s+DNIU\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text) ||
    /odb[ęe]d[ąa]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text) ||
    /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) {
    const [, d, mo, y] = numM;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const splM =
    /odb[ęe]d[ąa]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text) ||
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (splM) {
    const mo = PL_MONTH[splM[2].toLowerCase()];
    if (mo) return `${splM[3]}-${String(mo).padStart(2, '0')}-${splM[1].padStart(2, '0')}`;
  }
  return null;
}

export function roundFromText(text) {
  if (!text) return 1;
  const t = text;
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  const m = /\b(VI{0,3}|IV|I{1,3}|V)\s+PRZETARG/i.exec(t);
  if (m) {
    const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return ROMAN[m[1].toUpperCase()] ?? 1;
  }
  return 1;
}


const ADDR_RE =
  /(?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.''\- ]+?\s+\d+[A-Za-z]?(?:\s*(?:lok\.?|lokal(?:u)?\s+nr|m\.)\s*\d+[A-Za-z]?(?:[,/]\d+[A-Za-z]?)*|\s*\/\s*\d+[A-Za-z]?)?/;

function normaliseAptSuffix(raw) {
  return raw
    .replace(/\s+(?:lok\.?|lokal(?:u)?\s+nr)\s*(\d+[A-Za-z]?)(?:[,\/]\d+[A-Za-z]?)*/i, '/$1')
    .replace(/\s+m\.?\s*(\d+[A-Za-z]?)/i, '/$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// pdftotext -layout preserves table columns, but long addresses can wrap over
function tableAddress(block) {
  const leftColumn = (line) => line.trim().split(/\s{2,}/, 1)[0].trim();
  const lines = block.split('\n');
  const aptIndex = lines.findIndex((line) => /\blokal(?:u)?\s+nr\b/i.test(leftColumn(line)));
  if (aptIndex < 0) return null;

  const aptLine = leftColumn(lines[aptIndex]);
  if (/^(?:ul|al|pl|os)\.?\s/i.test(aptLine)) return aptLine;

  for (let i = aptIndex - 1; i >= 0; i--) {
    const streetLine = leftColumn(lines[i]);
    if (/^(?:ul|al|pl|os)\.?\s/i.test(streetLine)) {
      return `${streetLine} ${aptLine}`;
    }
  }
  return null;
}

export function splitBlocks(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');

  const localM = /NIERUCHOMOŚCI\s+LOKALOWE\s*:/i.exec(t);
  if (localM) {
    let local = t.slice(localM.index + localM[0].length);
    const footer = /\nWarunkiem\s+wzi[ęe]cia\s+udzia[łl]u/i.exec(local);
    if (footer) local = local.slice(0, footer.index);
    const starts = [...local.matchAll(/^\s*Gda[ńn]sk\s+[\-–]\s+/gmi)];
    const blocks = [];
    for (let i = 0; i < starts.length; i++) {
      const start = i === 0 ? 0 : starts[i].index;
      const end = i + 1 < starts.length ? starts[i + 1].index : local.length;
      const block = local.slice(start, end).trim();
      if (/\blokal(?:u)?\s+nr\b/i.test(block) && /z[łl]/i.test(block)) blocks.push(block);
    }
    return blocks;
  }

  const parts = t.split(/(?:^|\n)(\d{1,2})\.\s+/m);
  const blocks = [];
  for (let i = 1; i < parts.length; i += 2) {
    const block = (parts[i + 1] || '').trim();
    if (/cen[aą]\s+wywo[łl]awcz/i.test(block)) {
      blocks.push(block);
    }
  }
  if (blocks.length === 0 && /cen[aą]\s+wywo[łl]awcz/i.test(t)) {
    blocks.push(t);
  }
  return blocks;
}

export function parseBlock(block) {
  if (!block) return null;
  const b = block.replace(/\r/g, '');

  const tableAddressRaw = tableAddress(b);
  const addrM = tableAddressRaw ? null : ADDR_RE.exec(b.replace(/\s+/g, ' '));
  const rawAddress = tableAddressRaw ?? addrM?.[0];
  if (!rawAddress) return null;
  const addressRaw = normaliseAptSuffix(rawAddress);
  const address = parseAddress(addressRaw);
  if (!address) return null;

  const kind = (() => {
    if (/\blokal(?:u)?\s+nr\b/i.test(b)) return 'mieszkalny';
    const k = classifyKind(b);
    return (k === 'unknown') ? 'mieszkalny' : k;
  })();

  const tableRowStart = /\blokal(?:u)?\s+nr\b/i.exec(b)?.index ?? 0;
  const tableAreaM = /(\d{1,3},\d{2})\s*m(?:2|²)/i.exec(b.slice(tableRowStart));
  const area_m2 = tableAreaM ? Number(tableAreaM[1].replace(',', '.')) : areaFromText(b);

  const labelledPrice =
    (/cen[aą]\s+wywo[łl]awcz\w*\s*(?:wynosi\w*|lokalu\s+wynosi\w*|:)?\s*([\d][\d .,]*)\s*z[łl]/i.exec(b) ||
     /wynosi\s+([\d][\d .,]*)\s*z[łl]/i.exec(b))?.[1] ?? null;
  const tablePrices = [...b.matchAll(/(\d{1,3}(?:[ .]\d{3})+(?:,\d{2})?|\d{4,}(?:,\d{2})?)\s*z[łl]/gi)]
    .map((match) => parsePLN(match[1]))
    .filter(Number.isFinite);
  const tablePrice = tablePrices.length > 0 ? Math.max(...tablePrices) : null;
  const starting_price_pln = parsePLN(labelledPrice) ?? tablePrice;

  return {
    kind,
    address_raw: addressRaw,
    address,
    area_m2,
    starting_price_pln,
  };
}

export function parseAnnouncementPdf(text, opts = {}) {
  if (!text) return [];
  const auction_date = auctionDateFromText(text);
  const blocks = splitBlocks(text);
  const out = [];
  const seen = new Set();
  for (const block of blocks) {
    const rec = parseBlock(block);
    if (!rec) continue;
    const key = rec.address?.key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind: rec.kind,
      address_raw: rec.address_raw,
      address: rec.address,
      area_m2: rec.area_m2,
      starting_price_pln: rec.starting_price_pln,
      auction_date,
      round: roundFromText(block),
      detail_url: opts.detail_url ?? null,
      source_url: opts.source_url ?? null,
    });
  }
  return out;
}


export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
