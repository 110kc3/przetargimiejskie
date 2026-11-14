import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN } from '../../core/finn-bip.js';

export { htmlToText };


const APT_SUFFIX_RE = /\s+lok[al]{1,2}\.?\s*(?:nr\.?)?\s*([0-9]+[a-zA-Z]?(?:-[0-9]+[a-zA-Z]?)?)\s*$/i;
const BUDYNEK_CLAUSE_RE = /budynku\s+przy\s+ul\.?\s+([^)]+)\)/i;

export function addressRawFromLabel(label) {
  if (!label) return null;
  const s = htmlToText(label).replace(/^UWAGA!\s*ZMIANA TERMINU PRZETARGU!\s*/i, '').trim().replace(/\s+/g, ' ');

  const budynekM = BUDYNEK_CLAUSE_RE.exec(s);
  if (budynekM) {
    const aptM = APT_SUFFIX_RE.exec(s);
    const base = `ul. ${budynekM[1].trim().replace(/\s+/g, ' ')}`;
    return aptM ? `${base}/${aptM[1]}` : base;
  }

  let out = s.replace(/^ulica\s+/i, 'ul. ');
  const aptM = APT_SUFFIX_RE.exec(out);
  if (aptM) out = out.slice(0, aptM.index) + `/${aptM[1]}`;
  return out.trim();
}


const ROUND_ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
export function roundFromPrzetargNa(przetargNaText) {
  const m = /\((I{1,3}|IV|V|VI)\s+przetarg/.exec(przetargNaText || '');
  return m ? ROUND_ROMAN[m[1]] : 1;
}


const TABLE_RE = /<table class="table table-borderless">([\s\S]*?)<\/table>/g;
const ROW_RE = /<th scope="row">([^<]+)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g;

function cellText(cellHtml) {
  return (cellHtml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTableBlock(blockHtml) {
  const fields = {};
  ROW_RE.lastIndex = 0;
  let m;
  while ((m = ROW_RE.exec(blockHtml)) !== null) {
    fields[m[1].trim()] = m[2];
  }
  const addressCellRaw = fields['Adres nieruchomości'] || '';
  const hrefM = /href="([^"]+)"/.exec(addressCellRaw);
  const dateCellRaw = fields['Data przetargu'] || '';
  const isoM = /datetime="([^"]+)"/.exec(dateCellRaw);
  return {
    addressLabel: cellText(addressCellRaw),
    detailUrl: hrefM ? hrefM[1] : null,
    przetargNa: cellText(fields['Przetarg na'] || ''),
    rodzaj: cellText(fields['Rodzaj nieruchomości'] || ''),
    cenaText: cellText(fields['Cena wywoławcza'] || ''),
    auctionDate: isoM ? isoM[1].slice(0, 10) : null,
  };
}

export function parseListingBlocks(html) {
  const out = [];
  TABLE_RE.lastIndex = 0;
  let m;
  while ((m = TABLE_RE.exec(html)) !== null) {
    const f = parseTableBlock(m[1]);
    if (f.addressLabel) out.push(f);
  }
  return out;
}

export function blockToListing(block) {
  if (!block.detailUrl) return null;
  const kind = classifyKind(`${block.rodzaj} ${block.przetargNa}`);
  if (kind !== 'mieszkalny') return null;
  const addressRaw = addressRawFromLabel(block.addressLabel);
  const address = parseAddress(addressRaw);
  if (!address) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    area_m2: null,
    round: roundFromPrzetargNa(block.przetargNa),
    starting_price_pln: parsePLN(block.cenaText),
    auction_date: block.auctionDate,
    detail_url: block.detailUrl,
    source_url: block.detailUrl,
  };
}


export function areaFromAnnouncementText(text) {
  const m = /Powierzchnia\s+lokalu:\s*([\d]+[.,]\d+)\s*m\s*2/i.exec(text || '');
  return m ? Number(m[1].replace(',', '.')) : null;
}


export function headerField(text, key) {
  const m = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(text || '');
  return m ? m[1].trim() : null;
}

const NEGATIVE_RE =
  /wynikiem\s+negatywnym|nie\s+wp[łl]aci\w*\s+wadi|nikt\s+nie\s+przyst[ąa]pi|nie\s+wy[łl]oniono\s+nabywc|nie\s+dosz[łl]o\s+do/i;

export function amountsInText(text) {
  const seen = [];
  for (const m of (text || '').matchAll(/(\d{1,3}(?:[ .]\d{3})*,\d{2})\s*z[łl]/gi)) {
    const n = parsePLN(m[1]);
    if (n != null && !seen.includes(n)) seen.push(n);
  }
  return seen;
}

export function achievedPriceFromText(text, startingPricePln) {
  if (NEGATIVE_RE.test(text || '')) return null;
  const amounts = amountsInText(text);
  const distinct = startingPricePln != null ? amounts.filter((a) => a !== startingPricePln) : amounts;
  if (distinct.length) return distinct[0];
  return amounts.length >= 2 ? amounts[1] : null;
}

export function buyerFromText(text) {
  const m = /00\/100\s*\n*\s*([^\n]+?)\s*\n\s*Opracowa/i.exec(text || '');
  return m ? m[1].trim() : null;
}

export function areaFromResultText(text) {
  const t = text || '';
  const bip = /pow\.\s*([\d]+[.,]\d+)\s*m\s*2/i.exec(t);
  if (bip) return Number(bip[1].replace(',', '.'));
  const gielda = /Powierzchnia\s+dzia[łl]ki:\s*Powierzchnia\s+lokalu:\s*[\d\s]+\s*m[²2]\s*([\d]+[.,]\d+)\s*m[²2]/i.exec(t);
  if (gielda) return Number(gielda[1].replace(',', '.'));
  return null;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  const addressRaw = headerField(t, 'ADRES');
  if (!addressRaw) return [];
  const address = parseAddress(addressRaw);
  if (!address) return [];

  const roundHeader = headerField(t, 'RUNDA');
  const round = roundHeader ? Number(roundHeader) : 1;
  const startingHeader = headerField(t, 'CENA_WYWOLAWCZA');
  const starting_price_pln = startingHeader ? Number(startingHeader) : null;
  const dateHeader = headerField(t, 'DATA');
  const auction_date = dateHeader || fallbackDate || null;

  const achieved = achievedPriceFromText(t, starting_price_pln);
  const buyer = achieved != null ? buyerFromText(t) : null;
  const area_m2 = areaFromResultText(t);

  return [{
    kind: 'mieszkalny',
    address_raw: addressRaw,
    address,
    area_m2,
    round,
    starting_price_pln,
    final_price_pln: achieved,
    outcome: achieved != null ? 'sold' : 'unsold',
    unsold_reason: achieved != null ? null : (NEGATIVE_RE.test(t) ? 'negatywny' : 'unknown'),
    auction_date,
    source_pdf: sourceUrl || null,
    notes: buyer ? [`nabywca: ${buyer}`] : [],
  }];
}
