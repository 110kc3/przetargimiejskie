import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function toAsciiPL(s) {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const PRICE_NUM_RE = /(\d[\d\s.]*?)\s*(?:,\s*(?:\d{2}|-))?\s*z[łl]/i;

function firstPriceInWindow(text, anchorAsciiRe, windowSize = 250) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const start = t.search(anchorAsciiRe);
  if (start < 0) return null;
  const region = text.slice(start, start + windowSize);
  const m = PRICE_NUM_RE.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function startingPriceFromBody(text) {
  return firstPriceInWindow(text, /cena\s+wywolawcza/i);
}

export function achievedPriceFromBody(text) {
  return firstPriceInWindow(text, /najwyzsza\s+cena\s+osiagnieta/i);
}

export function isNegativeOutcome(text) {
  const t = toAsciiPL(text);
  return /wynikiem\s+negatywnym|nie\s+wyloniono\s+nabywcy/.test(t);
}


const ROUND_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piat', 5], ['szost', 6], ['siodm', 7], ['osm', 8],
  ['dziewiat', 9], ['dziesiat', 10],
];
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

export function roundFromText(text) {
  if (!text) return null;
  const romanM = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(text);
  if (romanM) {
    const val = ROMAN[romanM[1].toLowerCase()];
    if (val) return val;
  }
  const t = toAsciiPL(text);
  for (const [stem, val] of ROUND_STEMS) {
    if (new RegExp(`\\b${stem}`, 'i').test(t)) return val;
  }
  return null;
}


const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function auctionDateFromBody(text) {
  if (!text) return null;
  const t = toAsciiPL(text);
  const anchorM = /odbedzie\s+sie|odbyl\s+sie/.exec(t);
  const scope = anchorM ? text.slice(anchorM.index, anchorM.index + 220) : text.slice(0, 500);
  const numM = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(scope);
  if (numM) return iso(numM[3], numM[2], numM[1]);
  const wordM = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(scope);
  if (wordM) {
    const mon = PL_MONTH[toAsciiPL(wordM[2])];
    if (mon) return iso(wordM[3], mon, wordM[1]);
  }
  return null;
}


const UNIT_AREA_RE =
  /lokal\w*(?:\s+(?:nie)?mieszkaln\w*|\s+u[żz]ytkow\w*)?(?:\s+nr\.?\s*\d+[A-Za-z]?)?[^.]{0,40}?o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*(?:u[żz]ytkow\w+\s*)?(\d+[.,]\d+)\s*m\s*[²2]/i;

export function areaFromBody(text) {
  if (!text) return null;
  const m = UNIT_AREA_RE.exec(text);
  return m ? parseArea(m[1]) : null;
}


export function addressFromText(text) {
  if (!text) return null;

  const LOKAL_KIND = /lokal\w*(?:\s+(?:nie)?mieszkaln\w*|\s+u[żz]ytkow\w*)?/;

  const patA = new RegExp(
    LOKAL_KIND.source + '\\s+nr\\.?\\s*(\\d+[A-Za-z]?).{0,40}?\\s*po[łl]\\.?\\s+w\\s+\\S+\\s+przy\\s+ul\\.?\\s*([A-ZŁŚĆĄĘŃÓŹŻ][^\\d,]+?)\\s+(\\d+[A-Za-z]?)\\b',
    'i',
  );
  const mA = patA.exec(text);
  if (mA) return { apt: mA[1], street: mA[2].trim(), building: mA[3] };

  const patB = new RegExp(
    LOKAL_KIND.source + '\\s+nr\\.?\\s*(\\d+[A-Za-z]?).{0,40}?\\s*po[łl]\\.?\\s+we?\\s+(?:wsi|miejscowo[śs]ci)\\s+([A-ZŁŚĆĄĘŃÓŹŻ][^\\d,]+?)\\s+(\\d+[A-Za-z]?)\\b',
    'i',
  );
  const mB = patB.exec(text);
  if (mB) return { apt: mB[1], street: mB[2].trim(), building: mB[3] };

  const aptM = new RegExp(LOKAL_KIND.source + '\\s+(?:nr\\.?\\s*)?(\\d+[A-Za-z]?)', 'i').exec(text);
  const bldgVillM =
    /budynk\w*[^.]{0,40}?[Nn]r\.?\s*(\d+[A-Za-z]?)[^.]{0,40}?\bwe?\s+(?:wsi\s+|miejscowo[śs]ci\s+)?([A-ZŁŚĆĄĘŃÓŹŻ][\wŁŚĆĄĘŃÓŹŻłśćąęńóźż]*)\b/i.exec(text);
  if (aptM && bldgVillM) {
    return { apt: aptM[1], street: bldgVillM[2], building: bldgVillM[1] };
  }
  return null;
}


export function landParcelFromText(text) {
  if (!text) return null;
  const m = /(?:numer(?:em)?|nr\.?(?:\s+ewid\.?)?)\s*:?\s*(\d+(?:\/\d+)?)/i.exec(text);
  return m ? m[1] : null;
}

export function landAreaFromText(text) {
  if (!text) return null;
  const m =
    /o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?:?\s*(\d+[.,]\d+)\s*ha/i.exec(text) ||
    /\bpowierzchnia\s*:?\s*(\d+[.,]\d+)\s*ha/i.exec(text);
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

export function obrebFromText(text) {
  if (!text) return null;
  const m = /obr[eę]b(?:ie)?\.?\s*(?:geod\.?)?\s*\d*\s*([A-ZĄĆĘŁŃÓŚŹŻ][\wĄĆĘŁŃÓŚŹŻąćęłńóśźż]*)/i.exec(text);
  return m ? m[1] : null;
}


export function isSaleAuctionTitle(title) {
  if (!title) return false;
  const t = toAsciiPL(title);
  if (!/przetarg|obwieszczeni|ogloszeni/.test(t)) return false;
  if (/wynik|informacj\w*\s+o\s+wyniku/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/dzierzaw|najem|uzyczeni/.test(t)) return false;
  if (/sprzedaz|zbycie|zbyci/.test(t)) return true;
  return false;
}

export function isResultTitle(title) {
  if (!title) return false;
  const t = toAsciiPL(title);
  if (!/wynik/.test(t)) return false;
  if (/dzierzaw|najem|uzyczeni/.test(t)) return false;
  if (/sprzedaz|zbycie|zbyci/.test(t)) return true;
  return false;
}


function resolveKind(text) {
  const kind = classifyKind(text);
  if (kind !== 'garaz') return kind;
  if (
    /nieruchomo[śs]ci?\s+niezabudowan|nieruchom\w*\s+grunto\w*\s+niezabudowan|na\s+sprzeda[żz]\s+(?:ni[żz]ej\s+wymienionych\s+)?dzia[łl]|sprzeda[żz]\s+dzia[łl]|dzia[łl]ek?\s+gruntu\s+nr/i.test(
      text,
    )
  ) {
    return 'grunt';
  }
  return kind;
}


export function parseAnnouncement(fullText, detailUrl) {
  if (!fullText) return null;
  const kind = resolveKind(fullText);
  const round = roundFromText(fullText);
  const auction_date = auctionDateFromBody(fullText);
  const starting_price_pln = startingPriceFromBody(fullText);

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(fullText);
    const obreb = obrebFromText(fullText);
    if (!dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(fullText),
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl,
      source_url: detailUrl,
    };
  }

  const addr = addressFromText(fullText);
  if (!addr) return null;
  const address = parseAddress(`${addr.street} ${addr.building}/${addr.apt}`);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `${addr.street} ${addr.building}/${addr.apt}`,
    address,
    area_m2: areaFromBody(fullText),
    starting_price_pln,
    auction_date,
    round,
    detail_url: detailUrl,
    source_url: detailUrl,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const kind = resolveKind(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromBody(text) || fallbackDate || null;
  const starting_price_pln = startingPriceFromBody(text);
  const achieved = achievedPriceFromBody(text);
  const negativeStated = isNegativeOutcome(text);
  const sold = achieved != null && !negativeStated;
  const notes = [];

  if (kind === 'grunt') {
    const dzialka_nr = landParcelFromText(text);
    const obreb = obrebFromText(text);
    if (!dzialka_nr) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date,
      source_url: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: landAreaFromText(text),
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const addr = addressFromText(text);
  if (!addr) return [];
  const address_raw = `${addr.street} ${addr.building}/${addr.apt}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [{
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
    area_m2: areaFromBody(text),
    notes,
  }];
}
