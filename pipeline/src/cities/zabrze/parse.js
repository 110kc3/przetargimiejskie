
import { parseAddress } from '../../core/normalize.js';

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

export function roundFromTitle(title) {
  const t = title || '';
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrugi|\bdrugich|\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  const m = /\bo\s+(VI{0,3}|IV|I{1,3}|V)\s+ustn/i.exec(t);
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  if (/\bustn\w+\s+(?:nieograniczon\w+\s+)?przetarg/i.test(t)) return 1;
  return null;
}

export function auctionDateFromTitle(title) {
  const m = /na\s+dzie[ńn]\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(title || '');
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function auctionDateFromText(text) {
  const m = /odb[ęe]d[ąa]?\w*\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = numStr.replace(/\s/g, '').replace(/[:;]/g, '.');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}

function parseArea(numStr) {
  if (!numStr) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function classifyKind(s) {
  const t = (s || '').toLowerCase();
  if (/niemieszkaln/.test(t)) return 'uzytkowy';
  if (/mieszkaln/.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+u[żz]ytkow/.test(t)) return 'uzytkowy';
  return 'mieszkalny';
}


const ADDR_IN_LINE =
  /(?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?/;
const M2_RE = /([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi;

function flatAreaFromBlock(block) {
  const cut = block.search(/Wysoko[śs][ćc]\s+wadium|Cena\b/i);
  const region = cut > 0 ? block.slice(0, cut) : block;
  const dz = region.search(/dzia[łl]k/i);
  const opis = region.search(/opis\s+lokalu|po[łl]o[żz]enie/i);
  const cands = [];
  M2_RE.lastIndex = 0;
  let m;
  while ((m = M2_RE.exec(region)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const idx = m.index;
    const inPlotSpan = dz >= 0 && opis > dz && idx > dz && idx < opis;
    const isPlot = inPlotSpan || /dzia[łl]k/i.test(region.slice(Math.max(0, idx - 35), idx));
    const isCellar = /piwnic|kom[óo]rk|gara[żz]/i.test(region.slice(Math.max(0, idx - 18), idx));
    if (isPlot || isCellar) continue;
    cands.push(v);
  }
  if (cands.length) return Math.max(...cands);
  const BARE_M_RE = /([\d][\d.,]*)\s*m(?![a-ząćęłńóśźż0-9²])/gi;
  BARE_M_RE.lastIndex = 0;
  while ((m = BARE_M_RE.exec(region)) !== null) {
    const v = parseArea(m[1]);
    if (v == null || v <= 0) continue;
    const idx = m.index;
    const inPlotSpan = dz >= 0 && opis > dz && idx > dz && idx < opis;
    const isPlot = inPlotSpan || /dzia[łl]k/i.test(region.slice(Math.max(0, idx - 35), idx));
    const isCellar = /piwnic|kom[óo]rk|gara[żz]/i.test(region.slice(Math.max(0, idx - 18), idx));
    if (isPlot || isCellar) continue;
    cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

function priceFromBlock(block) {
  const start = block.search(/wywo[łl]awcza/i);
  if (start < 0) return null;
  const end = block.search(/Wysoko[śs][ćc]\s+wadium/i);
  const region = block.slice(start, end > start ? end : start + 500);
  const m = /([\d][\d .,]*)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function parseAnnouncementText(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const starts = [...t.matchAll(/adres\s*:/gi)].map((m) => m.index);
  if (starts.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < starts.length; i++) {
    const block = t.slice(starts[i], starts[i + 1] ?? t.length);
    const addrLine = (/adres\s*:?\s*([^\n]+)/i.exec(block)?.[1] || '').trim();
    const am = ADDR_IN_LINE.exec(addrLine);
    if (!am) continue;
    const addressRaw = am[0].replace(/\s+/g, ' ').trim();
    const address = parseAddress(addressRaw);
    if (!address || seen.has(address.key)) continue;
    seen.add(address.key);

    out.push({
      address_raw: addressRaw,
      address,
      kind: classifyKind(block),
      area_m2: flatAreaFromBlock(block),
      starting_price_pln: priceFromBlock(block),
    });
  }
  return out;
}


const COMM_HEADER_RE =
  /^[ \t]*\d+\.[ \t]*(?:adres\s*:?\s*)?((?:ul|al|pl|os)\.?\s*[A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?\s+\d+(?:-\d+)?[A-Za-z]?(?:\s+lokal\w*\s+u[żz]ytkow\w*(?:\s+nr\s*(?:\d+[A-Za-z]?|[IVX]+))?)?)/im;

function commercialAreaFromBlock(block) {
  const cut = block.search(/Wysoko[śs][ćc]\s+wadium|Cena\b/i);
  const region = cut > 0 ? block.slice(0, cut) : block;
  const opis = region.search(/opis\s+lokalu|lokal\s*:|po[łl]o[żz]enie/i);
  const scan = opis >= 0 ? region.slice(opis) : region;
  const cands = [];
  for (const re of [/([\d][\d.,]*)\s*m\s*[²2](?!\d)/gi, /([\d][\d.,]*)\s*m(?![a-ząćęłńóśźż0-9²])/gi]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(scan)) !== null) {
      const v = parseArea(m[1]);
      if (v == null || v <= 0) continue;
      if (/dzia[łl]k/i.test(scan.slice(Math.max(0, m.index - 35), m.index))) continue;
      cands.push(v);
    }
    if (cands.length) break;
  }
  return cands.length ? Math.max(...cands) : null;
}

export function parseCommercialAttachment(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const headerRe = /^[ \t]*\d+\.[ \t]*(?:adres\s*:?\s*)?(?:ul|al|pl|os)\.?\s*[^\n]*?lokal\w*\s+u[żz]ytkow/gim;
  const starts = [...t.matchAll(headerRe)].map((m) => m.index);
  if (starts.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < starts.length; i++) {
    const block = t.slice(starts[i], starts[i + 1] ?? t.length);
    const hm = COMM_HEADER_RE.exec(block);
    if (!hm) continue;
    const addressRaw = hm[1]
      .replace(/\s+lokal\w*\s+u[żz]ytkow\w*\s+nr\s*(\d+[A-Za-z]?|[IVX]+)/i, '/$1')
      .replace(/\s+lokal\w*\s+u[żz]ytkow\w*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    const address = parseAddress(addressRaw);
    if (!address || seen.has(address.key)) continue;
    seen.add(address.key);
    out.push({
      address_raw: addressRaw,
      address,
      kind: 'uzytkowy', // board 552 is the commercial board by definition
      area_m2: commercialAreaFromBlock(block),
      starting_price_pln: priceFromBlock(block),
    });
  }
  return out;
}


const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function isResultNotice(text) {
  return /INFORMACJA\s+O\s+WYNIKU/i.test(text || '');
}

function resultDateFromText(text) {
  const m = /W\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function resultRoundFromText(text) {
  const m = /przeprowadzon\w*\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)/i.exec(text || '');
  if (!m) return null;
  const w = m[1].toLowerCase();
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  return 5;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const auctionDate = resultDateFromText(t) || fallbackDate || null;
  const round = resultRoundFromText(t);

  const starts = [...t.matchAll(/Nieruchomo[śs][ćc]\s+lokalow/gi)].map((m) => m.index);
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    const block = t.slice(starts[i], starts[i + 1] ?? t.length).replace(/\s+/g, ' ');
    const notes = [];

    const aptM = /lokal\s+(?:nie)?mieszkaln\w+\s+nr\s+(\d+[a-z]?)/i.exec(block)
      || /lokal\s+u[żz]ytkow\w+\s+nr\s+(\d+[a-z]?)/i.exec(block);
    const streetM = /przy\s+(?:ul|al|pl|os)\.?\s+(.+?)\s+na\s+dzia[łl]/i.exec(block);
    if (!aptM || !streetM) {
      continue;
    }
    const address_raw = `${streetM[1].replace(/\s+/g, ' ').trim()}/${aptM[1]}`;
    const address = parseAddress(address_raw);
    if (!address) continue;
    if (address.warning) notes.push(address.warning);

    const areaM = /pow\.\s*u[żz]ytk\.?\s*([\d.,]+)\s*m/i.exec(block);
    const startM = /wywo[łl]awcza\s+zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+([\d .,]+)\s*z[łl]/i.exec(block)
      || /na\s+kwot[ęe]\s+([\d .,]+)\s*z[łl]/i.exec(block);
    const finalM = /Najwy[żz]sza\s+zaproponowana\s+cena.*?wynios[łl]a\s+([\d .,]+)\s*z[łl]/i.exec(block);

    const negative =
      /negatywn|nie\s+wy[łl]oniono|nie\s+dosz[łl]o\s+do/i.test(block) ||
      (!finalM && !/nabywc/i.test(block));

    const starting_price_pln = startM ? parsePLN(startM[1]) : null;
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    const final_price_pln = negative ? null : finalM ? parsePLN(finalM[1]) : null;
    if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

    out.push({
      auction_date: auctionDate,
      source_pdf: sourceUrl,
      kind: classifyKind(block),
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome: negative ? 'unsold' : 'sold',
      unsold_reason: negative ? 'unknown' : null,
      area_m2: areaM ? parseArea(areaM[1]) : null,
      notes,
    });
  }
  return out;
}



function parsePlotArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[ .\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseLandAttachment(text) {
  if (!text) return null;
  const t = text.replace(/\s+/g, ' ');
  const parcels = [...t.matchAll(/dzia[\u0142l]k[ai]?\s+nr\s+(\d+(?:\/\d+)?)/gi)].map((m) => m[1]);
  const dzialka_nr = parcels.length ? [...new Set(parcels)].join(', ') : null;
  const areaM = /o\s+(?:[\u0142l][\u0105a]cznej\s+)?pow(?:\.|ierzchni)?\s+([\d][\d \u00a0.]*(?:,\d+)?)\s*m\s*[\u00b22]/i.exec(t);
  let area_m2 = areaM ? parsePlotArea(areaM[1]) : null;
  if (area_m2 == null) {
    const haM = /o\s+(?:[\u0142l][\u0105a]cznej\s+)?pow(?:\.|ierzchni)?\s+([\d][\d \u00a0.]*(?:,\d+)?)\s*ha\b/i.exec(t);
    if (haM) {
      const n = Number(haM[1].replace(/[\s\u00a0]/g, '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) area_m2 = Math.round(n * 10000);
    }
  }
  const obrebM = /obr[\u0119e]b(?:ie)?\s*:?\s*([A-Z\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143][A-Za-z\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143\u017c\u017a\u0107\u0142\u015b\u0105\u0119\u00f3\u0144-]*)/i.exec(t);
  const obreb = obrebM ? obrebM[1] : null;
  const streetM = /przy\s+(ul|al|pl|os)\.?\s+([A-Z\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143][A-Za-z0-9\u017b\u0179\u0106\u0141\u015a\u0104\u0118\u00d3\u0143\u017c\u017a\u0107\u0142\u015b\u0105\u0119\u00f3\u0144.'\u2019\- ]{2,60}?)\s*(?:,|obr[\u0119e]b|stanowi|zapisan|o\s+pow)/i.exec(t);
  const address_raw = streetM ? `${streetM[1]}. ${streetM[2].replace(/\s+/g, ' ').trim()}` : null;
  const priceM = /cena\s+wywo[\u0142l]awcza[^0-9]{0,60}?([\d][\d \u00a0.]*(?:,\d{2})?)\s*z[\u0142l]/i.exec(t);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;
  let auction_date = null;
  const numM = /odb[ęe]dzie\s+si[ęe](?:\s+w\s+dniu)?\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (numM) auction_date = `${numM[3]}-${numM[2].padStart(2, '0')}-${numM[1].padStart(2, '0')}`;
  if (!auction_date) {
    const spM = /odb[ęe]dzie\s+si[ęe]\s+(\d{1,2})\s+([a-ząęóśżźćłńA-ZĄĘÓŚŻŹĆŁŃ]+)\s+(\d{4})/i.exec(t);
    const mo = spM ? PL_MONTH[spM[2].toLowerCase()] : null;
    if (mo) auction_date = `${spM[3]}-${String(mo).padStart(2, '0')}-${spM[1].padStart(2, '0')}`;
  }
  if (!dzialka_nr && !address_raw) return null;
  return { dzialka_nr, obreb, area_m2, address_raw, starting_price_pln, auction_date };
}
