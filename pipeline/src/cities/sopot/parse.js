
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  parsePLN,
  shareFromTitle,
  addressFrom,
} from '../../core/finn-bip.js';

export { htmlToText };


export function isOutOfScopeTitle(title) {
  const t = (title || '').toLowerCase();
  if (/najem|dzier[żz]aw|wynajem/.test(t)) return true;
  if (/pojazd|samoch[oó]d|motorower|sk[łl]adnika\s+maj[ąa]tku\s+ruchomego|kawiarenk/.test(t)) return true;
  if (/rokowa/.test(t) && !/przetarg/.test(t)) return true;
  if (/^\s*wykaz/.test(t)) return true;
  return false;
}

export function isCancelledTitle(title) {
  return /odwo[łl]an|uniewa[żz]ni/i.test(title || '');
}

export function titleInScopeKind(title) {
  const t = title || '';
  if (/lokal\w*\s+mieszkaln/i.test(t)) return 'mieszkalny';
  if (/lokal\w*\s+(?:u[żz]ytkow|niemieszkaln)/i.test(t)) return 'uzytkowy';
  if (/gara[żz]/i.test(t)) return 'garaz';
  return null;
}

export function isSaleAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

export function isResultStandaloneTitle(title) {
  return /informacj\w*[\s\S]{0,40}?(rozstrzygni|wynik)/i.test(title || '');
}


export function isResultText(text) {
  const t = text || '';
  return (
    /wynikiem\s+negatywnym/i.test(t) ||
    /informacj\w*\s+o\s+wyniku/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+przez\s+[żz]aden\s+podmiot/i.test(t) ||
    /rozstrzygni[ęe]cia\s+(?:i|ii|iii|iv|v)?\s*publiczn/i.test(t) ||
    /cena\s+sprzeda[żz]y[\s\S]{0,120}?osi[ąa]gn/i.test(t)
  );
}

export function isAnnouncementText(text) {
  return /cena\s+wywo[łl]awcz/i.test(text || '') && !isResultText(text);
}

export function isNegativeResultText(text) {
  const t = text || '';
  return (
    /wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+przez\s+[żz]aden\s+podmiot/i.test(t) ||
    /nie\s+wp[łl]acono\s+wadium/i.test(t)
  );
}

export function achievedPriceFromText(text) {
  const m = /osi[ąa]gn[ęe][łl]a[\s\S]{0,80}?kwot[ęe]\s*-?\s*([\d][\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function buyerFromText(text) {
  const m = /Nabywc[ąa]\s+(?:lokalu\s+)?(?:zosta[łl]\w*|sta[łl]\w*)\s+(Pan\w*\s+[A-ZŻŹĆŁŚĄĘÓŃ][\p{L}.\- ]+?)(?=,|\s+zamieszka|\s*$)/u.exec(
    text || '',
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function unsoldReasonFromText(text) {
  const t = text || '';
  if (/wadium/i.test(t) && /(nie\s+zosta[łl]o\s+wp[łl]acone|nie\s+wp[łl]acono|brak\s+wp[łl]aty)/i.test(t)) {
    return 'no_wadium';
  }
  if (/brak\s+uczestnik|nikt\s+nie\s+przyst[ąa]pi/i.test(t)) return 'no_participants';
  return 'unknown';
}


const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
const WORD_ROUND_RE = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i;
const WORD_ROUND_MAP = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, pi: 5 };

export function roundFrom(text) {
  const t = (text || '').replace(/^\s*[([][^)\]]*[)\]]\s*/, '');
  const w = WORD_ROUND_RE.exec(t);
  if (w) return WORD_ROUND_MAP[w[1].toLowerCase()] ?? null;
  if (/^l\s+publiczny\s+przetarg/.test(t)) return 1;
  const m = /\b(I{1,3}|IV|V)\s+publiczn\w*\s+przetarg/.exec(t) || /\b(I{1,3}|IV|V)\s+przetarg/.exec(t);
  if (m) return ROMAN[m[1]] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}


const STREET_PREFIX_NORMALIZATIONS = [
  [/\bGen\.\s+/g, 'Generała '],
  [/\bgen\.\s+/g, 'generała '],
  [/\bAlei\s+/g, 'Al. '],
  [/\balei\s+/g, 'al. '],
];
function expandRankAbbrev(s) {
  let out = s || '';
  for (const [re, repl] of STREET_PREFIX_NORMALIZATIONS) out = out.replace(re, repl);
  return out;
}

export function garageAddressFrom(text) {
  const t = text || '';
  const noM = /gara[żz]u?\s*nr\s*(\d+)/i.exec(t);
  if (!noM) return null;
  const streetM =
    /przy\s+(?:ul\.|ulicy|al\.|alei)?\s*((?:\d{1,2}\s+)?[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?:\s+(\d+[A-Za-z]?))?(?=\s+(?:w\s+Sopocie|wraz|i\s+ustanowieniem|[,.]|$))/i.exec(
      t,
    );
  if (!streetM) return null;
  const street = streetM[1].replace(/\s+/g, ' ').trim();
  const bldg = streetM[2];
  const raw = bldg ? `ul. ${street} ${bldg} garaż nr ${noM[1]}` : `ul. ${street} garaż nr ${noM[1]}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}


const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9, pazdziernika: 10,
  'października': 10, listopada: 11, grudnia: 12,
};
function isoFromPl(d, monName, y) {
  const m = PL_MONTHS[String(monName).toLowerCase()];
  return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const t = text || '';
  const m1 = /[Ww]\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,150}?odby[łl]/i.exec(t);
  if (m1) {
    const d = isoFromPl(m1[1], m1[2], m1[3]);
    if (d) return d;
  }
  const m2 = /[Tt]ermin\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m2) {
    const d = isoFromPl(m2[1], m2[2], m2[3]);
    if (d) return d;
  }
  return null;
}


function unitAptFrom(text) {
  const m = /lokal\w*\s+(?:mieszkaln\w*|niemieszkaln\w*|u[żz]ytkow\w*)\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i.exec(
    text || '',
  );
  return m ? m[1] : null;
}

function resolveAddress(title, text, kind) {
  const t = expandRankAbbrev(title);
  const b = expandRankAbbrev(text);
  if (kind === 'garaz') {
    return garageAddressFrom(t) || garageAddressFrom(b) || addressFrom(t, b);
  }
  const addr = addressFrom(t, b);
  if (!addr || addr.address.apt != null) return addr;
  const apt = unitAptFrom(`${t} ${b}`);
  if (!apt) return addr;
  const raw = `${addr.address.street} ${addr.address.building}/${apt}`;
  const patched = parseAddress(raw);
  return patched ? { address_raw: raw, address: patched } : addr;
}


export function buildAnnouncementRecord(title, text, url) {
  let kind = classifyKind(`${title} ${text}`);
  if (kind === 'unknown') kind = titleInScopeKind(title) || 'unknown';
  if (kind === 'grunt' || kind === 'unknown') return null;

  const addr = resolveAddress(title, text, kind);
  if (!addr) return null;

  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFrom(title),
    auction_date: auctionDateFromText(text),
    detail_url: url,
    source_url: url,
    share: shareFromTitle(title, text),
  };
}

export function buildResultRecord(text, url) {
  if (!text) return null;
  const negative = isNegativeResultText(text);
  const achieved = negative ? null : achievedPriceFromText(text);
  const kind = classifyKind(text);
  if (kind === 'grunt' || kind === 'unknown') return null;

  const addr = resolveAddress('', text, kind);
  if (!addr) return null;

  const buyer = achieved != null ? buyerFromText(text) : null;
  return {
    kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    round: roundFrom(text),
    starting_price_pln: priceFromText(text),
    auction_date: resultDateFromText(text),
    final_price_pln: achieved,
    outcome: achieved != null ? 'sold' : 'unsold',
    unsold_reason: achieved != null ? null : unsoldReasonFromText(text),
    source_pdf: url,
    notes: buyer ? [`nabywca: ${buyer}`] : [],
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const rec = buildResultRecord(text, sourceUrl);
  if (!rec) return [];
  if (!rec.auction_date) rec.auction_date = fallbackDate || null;
  return [rec];
}
