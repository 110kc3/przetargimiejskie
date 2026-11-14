
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSkippableTitle(title) {
  const s = (title || '');
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /(^|\W)wykaz\b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s)
  );
}

export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik/i.test(title || '');
}

export function isAnnouncementTitle(title) {
  const s = (title || '');
  if (/przetarg/i.test(s) && /sprzeda/i.test(s)) return true;
  if (/rokowania\s+na\s+sprzeda/i.test(s)) return true;
  return false;
}

export function isResultNotice(text) {
  return /I\s*n\s*f\s*o\s*r\s*m\s*a\s*c\s*j\s*a\s+o\s+wyniku/i.test(text || '');
}


const ROUND_ORDINALS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4,
};

export function roundFromText(text) {
  const s = text || '';
  const m = /\b(pierwsz|drug|trzeci|czwart)\w*(?:[,\s]\s*\w+)*?[,\s]\s*przetarg/i.exec(s);
  if (m) return ROUND_ORDINALS[m[1].toLowerCase()] ?? null;
  if (/\brokowania\b/i.test(s)) return 2;
  return null;
}

export function auctionDateFromText(text) {
  const s = text || '';
  const m = /(?:w\s+dniu|zaplanowany\s+na|odbedzie\s+sie\s+(?:w\s+dniu\s+)?|na\s+dzien\s+|odbędzie\s+się\s+(?:w\s+dniu\s+)?)(\d{1,2})\s+([a-zA-Ząęóśżźćłń]+)\s+(\d{4})\s*r?\.?/i.exec(s);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const dateRe = /(\d{1,2})\s+([a-zA-Ząęóśżźćłń]{4,})\s+(\d{4})\s*r?\.?/gi;
  let m2;
  while ((m2 = dateRe.exec(s)) !== null) {
    const mo = PL_MONTH[m2[2].toLowerCase()];
    const yr = Number(m2[3]);
    if (mo && yr >= 2020) {
      return `${m2[3]}-${String(mo).padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
    }
  }
  return null;
}

export function startingPriceFromText(text) {
  const s = text || '';
  let m = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*[:\n\r\s]+(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  m = /cena\s+wywo[łl]awcza\s+do\s+rokowa[ńn]\s*[:\n\r\s]+(?:nie\s+ni[żz]sza\s+ni[żz]\s+)?(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  m = /wynosi\s+(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  m = /cena\s+wywo[łl]awcza\s*[:\-–]?\s*(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  return null;
}

export function achievedPriceFromText(text) {
  const s = text || '';
  let m = /cena\s+(?:osi[ąa]gni[ęe]ta|naby[wt]\w+)\s*(?:w\s+przetargu)?\s*[:\-–]?\s*(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  m = /oferuj[ąa]c\s+cen[ęe]\s+(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  m = /zaoferowa[łl]\w*\s+cen[ęe]\s+(\d[\d\s.,]*?)\s*z[łl]/i.exec(s);
  if (m) return parsePLN(m[1]);
  return null;
}

const ADDR_RE =
  /(?:Racib[oó]rz\s*,\s*ul\.\s*|przy\s+ul\.\s*)([A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.''\- ]+?)\s+nr\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?/i;

export function addressRawFromText(text) {
  const m = ADDR_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const bldg = m[2];
  const apt = m[3] || null;
  return apt ? `ul. ${street} ${bldg}/${apt}` : `ul. ${street} ${bldg}`;
}

const AREA_RE = /(?:lokal\w*|mieszkani\w*)\s.*?powierzchni\s+u[żz]ytkow\w+\s+([\d,. ]+?)\s*m\s*[²2]/i;
const AREA_RE2 = /powierzchni\s+u[żz]ytkow\w+\s+([\d,. ]+?)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const s = text || '';
  let m = AREA_RE.exec(s);
  if (!m) m = AREA_RE2.exec(s);
  return m ? parseArea(m[1]) : null;
}

const PARCEL_MULTI_RE =
  /dzia[łl]k[ięa]\s+oznaczon\w+\s+ewidencyjnie[\s\S]{0,20}?nr\s+([\d/]+(?:\s*,\s*[\d/]+)*(?:\s+i\s+[\d/]+)?)/i;
const PARCEL_SINGLE_RE = /dzia[łl]k[ęa]\s+gruntu\s+oznaczon\w+\s+nr\s+([\d/]+)/i;

export function parcelsFromText(text) {
  const s = text || '';
  let m = PARCEL_MULTI_RE.exec(s);
  if (!m) m = PARCEL_SINGLE_RE.exec(s);
  if (!m) return null;
  return m[1].replace(/\s+i\s+/g, ', ').replace(/\s+/g, '').trim() || null;
}

function kindFromHeader(text) {
  const t = text || '';
  const fromShort = classifyKind(t.slice(0, 500));
  if (fromShort !== 'unknown') return fromShort;
  return classifyKind(t);
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromHeader(t);
  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const auction_date = auctionDateFromText(t);
  const round = roundFromText(t) ?? 1;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;

  const negativeStated =
    /wynikiem\s+negatywnym/i.test(t) ||
    /brak\s+(?:uczestnik|ofert)/i.test(t) ||
    /nie\s+wy[łl]oniono\s+nabywcy/i.test(t);

  const kindHeader = kindFromHeader(t);
  const isLand = kindHeader === 'grunt';

  if (isLand) {
    const dzialka_nr = parcelsFromText(t);
    const address_raw = addressRawFromText(t);
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (negativeStated ? 'brak uczestnikow' : 'unknown'),
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold flag but missing achieved price');
  if (!sold && !negativeStated) {
    notes.push('parse: no achieved price and no explicit negative outcome - validate on first live CI refresh');
  }

  const area_m2 = unitAreaFromText(t);
  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kindHeader === 'unknown' ? 'mieszkalny' : kindHeader,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : (negativeStated ? 'brak uczestnikow' : 'unknown'),
      area_m2,
      notes,
    },
  ];
}
