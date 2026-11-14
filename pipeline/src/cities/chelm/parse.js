import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};


function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).trim().replace(/\./g, '').replace(/,\d{2}\s*$/, '').replace(/,/g, '');
  const n = Number(cleaned.replace(/\s/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSkippableTitle(title) {
  const t = title || '';
  return (
    /\bwykaz\b/i.test(t) ||
    /\bnajem\b|dzier[zż]aw/i.test(t) ||
    /zamiar\w*\s+wszcz\w*/i.test(t) ||
    /odwo[łl]an\w*|uniewa[zż]ni/i.test(t) ||
    /sprostowanie/i.test(t) ||
    /przyj[ęe]cie\s+granic/i.test(t) ||
    /\brokowani/i.test(t)
  );
}

export function isResultTitle(title) {
  const t = title || '';
  return /informacja\s+o\s+(wynik|odwo[łl]|wynikach)/i.test(t);
}

export function isAnnouncementTitle(title) {
  const t = title || '';
  return /przetarg/i.test(t) && /sprzeda[zż]|zbyci|nieruchomo[śs]/i.test(t);
}

export function isResultNotice(text) {
  const t = text || '';
  return (
    /INFORMACJA\s+O\s+WYNIK/i.test(t) ||
    /osi[ąa]gni[ęe]to\s+cen[ęe]/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu/i.test(t) ||
    /wadium.*wp[łl]aci[łl]o\s+\d+\s+os[óo]b/i.test(t)
  );
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5,
  'szóst': 6, szost: 6,
};

const ROUND_ROMAN_RE = /\b(I{1,3}|IV|V|VI{0,3})\s+(?:ustn|przetarg)/i;

export function roundFromText(text) {
  const t = text || '';
  const mWord = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(t);
  if (mWord) return ROUND_WORDS[mWord[1].toLowerCase()] ?? null;
  const mRoman = ROUND_ROMAN_RE.exec(t);
  if (mRoman) {
    const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return roman[mRoman[1].toUpperCase()] ?? null;
  }
  return null;
}

export function auctionDateFromText(text) {
  const t = text || '';
  const m = /(?:odb[ęe]dzie\s+si[ęe]|przetarg\s+odb[ęe]dzie)|dnia\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (!m) return null;
  if (m[1]) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (!mo) return null;
    return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const rest = t.slice(m.index + m[0].length);
  const dm = /(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(rest);
  if (!dm) return null;
  const mo = PL_MONTH[dm[2].toLowerCase()];
  if (!mo) return null;
  return `${dm[3]}-${String(mo).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  const t = text || '';
  let m = /w\s+dniu\s+(\d{2})\.(\d{2})\.(\d{4})\s+roku/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s+roku/i.exec(t);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const ADDR_RE =
  /przy\s+ul\.\s+([\wżźćłśąęóńŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\-\s]*?)\s+(\d+\s*[A-Za-z]?)\s*(?:\/\s*(\w+))?\s*[,.\n]/i;

function streetUnitFromText(text) {
  const m = ADDR_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  const building = m[2].replace(/\s/g, '').toUpperCase();
  const unit = m[3] ? m[3].trim() : null;
  if (!street) return null;
  return { street, building, unit };
}

function unitNoFromText(text) {
  const m = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\s+(\w+)/i.exec(text || '');
  return m ? m[1].toUpperCase() : null;
}

function unitAreaFromText(text) {
  const m = /powierzchni\s+u[żz]ytkow\w+\s+([\d,]+)\s*m\s*[²2]/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[łl]awcza\b[^.]*?(?:wynosi[łl]?a?|:)\s*([\d.,\s]+)\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s*\([^)]*\)\s*(?:nieruchomo[śs]ci\s+)?(?:wynosi[łl]?a?|:)\s*([\d.,\s]+)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  let m = /osi[ąa]gni[ęe]to\s+cen[ęe]\s+([\d.,]+)\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*([\d.,]+)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');

  const kind = classifyKind(t.slice(0, 600)) || 'mieszkalny';
  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const area_m2 = kind === 'mieszkalny' ? unitAreaFromText(t) : null;

  const su = streetUnitFromText(t);
  if (!su) return null;

  let apt = su.unit;
  if (!apt && kind === 'mieszkalny') {
    apt = unitNoFromText(t) || null;
  }

  const address_raw = apt
    ? `ul. ${su.street} ${su.building}/${apt}`
    : `ul. ${su.street} ${su.building}`;

  const address = parseAddress(address_raw);
  if (!address) return null;

  return { kind, address_raw, address, area_m2, starting_price_pln, auction_date, round };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;

  const negativeStated =
    /wynik\w*\s+negatywn/i.test(t) ||
    /brak\s+uczestnik/i.test(t) ||
    /nie\s+wy[łl]oniono/i.test(t);

  const su = streetUnitFromText(t);
  if (!su) return [];

  const unitNo = unitNoFromText(t);
  const apt = unitNo || su.unit || null;

  const address_raw = apt
    ? `ul. ${su.street} ${su.building}/${apt}`
    : `ul. ${su.street} ${su.building}`;

  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  const kind = classifyKind(t.slice(0, 600)) || 'mieszkalny';

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2,
    notes,
  }];
}
