
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const MONEY = '\\d{1,3}(?:[\\u00a0 ]\\d{3})*,\\d{2}';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /lista\s+(?:os[óo]b|zakwalifikowan)/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(^|\W)wykaz\b|wywieszeniu\s+wykazu/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /\bwynik\w*\b/i.test(s) && /przetarg/i.test(s);
}

export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/og[łl]oszenie/i.test(s) && /przetarg/i.test(s)) return true;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal|dzia[łl]k|grunt/i.test(s)) return true;
  return false;
}


export function isApplicationForm(text) {
  return /zg[łl]oszenie\s+udzia[łl]u\s+w\s+przetargu/i.test(text || '') &&
    !/og[łl]oszenie\s+burmistrza|informacj\S*\s+o\s+wynik/i.test(text || '');
}

export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wynik/i.test(text || '');
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(text || '');
  if (!m) return null;
  return ROUND_WORDS[m[1].toLowerCase()] ?? null;
}

export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+(?:dnia\s+)?(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  const t = text || '';
  let m = /odby[łl]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
  m = /odby[łl]\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

const STREET_HEADER_RE =
  /(?:przy\s+)?ul(?:ic[yaą])?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?))?\s*(?:\.|,|\s+m\.|\s+w\s+obr[ęe]b|\s+w\s+Braniew|\n|$)/i;

export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+\s+|niemieszkaln\w+\s+|u[żz]ytkow\w+\s+)?nr\s+(\d+[A-Za-z]?)/i;

export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w+\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

export function startingPriceFromText(text) {
  const m = new RegExp(`cena\\s+wywo[łl]awcza\\s+(${MONEY})\\s*z[łl]`, 'i').exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function tablePriceFromText(text) {
  const re = new RegExp(MONEY, 'g');
  for (const line of String(text || '').split('\n')) {
    if (!/^\s*(?:ul\.|al\.|aleja|plac|pl\.|os\.)/i.test(line)) continue;
    for (const m of line.matchAll(re)) {
      const v = parsePLN(m[0]);
      if (v != null && v >= 1000) return v;
    }
  }
  return null;
}

export function achievedPriceFromText(text) {
  const m = new RegExp(
    `cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetargu\\s*[–\\-:]?\\s*(${MONEY})\\s*z[łl]`,
    'i',
  ).exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+nr\s+(\d+)/i.exec(text || '');
  return m ? `nr ${m[1]}` : null;
}

export function landPlotFromText(text) {
  const s = String(text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  let sumHa = 0;
  const re = /dzia[łl]k\w*\s+(?:o\s+)?(?:numer\w*\s+ewidencyjn\w*\s+|numer\w*\s+|nr\s+)(\d+(?:\/\d+)?)(?:\s+(?:o\s+)?(?:powierzchni\w*)\s+(\d+[.,]\d+)\s*ha\b)?/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    parcels.add(m[1]);
    if (m[2]) sumHa += Number(m[2].replace(',', '.'));
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  const area_m2 = sumHa > 0 ? Math.round(sumHa * 10000) : null;
  return { dzialka_nr, area_m2 };
}

function kindFromText(text) {
  const m = /na\s+sprzeda[zż]\s*([\s\S]{0,400})/i.exec(text || '');
  return classifyKind(m ? m[1] : (text || '').slice(0, 400));
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const isLand = kind === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t) ?? tablePriceFromText(t);

  if (isLand) {
    const h = streetFromHeader(t);
    const plot = landPlotFromText(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plot.area_m2, // PLOT area (m2) — land has no usable floor area
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
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

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t) ?? tablePriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated =
    /osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[–\-:]?\s*BRAK/i.test(t) ||
    /nabywca\s+nieruchomo[śs]ci\s*[–\-:]?\s*BRAK/i.test(t) ||
    /wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium/i.test(t) ||
    /brak\s+oferent/i.test(t);

  const kind = kindFromText(t);
  const isLand = kind === 'grunt';

  if (isLand) {
    const h = streetFromHeader(t);
    const plot = landPlotFromText(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        obreb: obrebFromText(t),
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
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
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    },
  ];
}
