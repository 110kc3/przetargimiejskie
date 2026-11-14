
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '')
    .replace(/,?-$/, '');
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
    /lista\s+os[óo]b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(^|\W)wykaz\w*|wywieszeniu\s+wykazu/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /informacj\w*\s+o\s+wynik/i.test(s);
}

export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo/i.test(s)) return true;
  if (/zaprasza.*(uczestnictw|udzia[łl]).*przetarg/i.test(s)) return true;
  return false;
}

export function isResultNotice(text) {
  return /INFORMACJA\s+o\s+wynik/i.test(text || '');
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
  const m =
    /(?:przetarg\w*(?:\s+ustn\w+(?:\s+(?:nie)?ograniczon\w+)?)?\s+b[ęe]dzie|odb[ęe]dzie\s+si[ęe])\s[^.]*?(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(
      text || '',
    );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  const m = /(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s*r\.?\s*,?\s+(?:w\s+)?Urz[ąa]d\w*\s+Miejski/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const STREET_HEADER_RE =
  /przy\s+ulic[yą]\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?))?\s*(?:\.|,|\s+oraz\b|\s+i\b|\s+w\s+Tarnowskich|\n|$)/i;

export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

const UNIT_AREA_RE =
  /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+\d+[a-z]?\s+o\s+powierzchni\s+u[żz]ytkow\w+\s+([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;

const UNIT_AREA_ALT_RE =
  /powierzchni[ae]\s+u[żz]ytkow\w+\s+lokal\w*\s*(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)?\s*(?:wynosi|:)\s*([\d.,\s ]+?)\s*m\s*[²2](?!\d)/i;

export function unitAreaFromText(text) {
  const t = text || '';
  const m = UNIT_AREA_RE.exec(t) || UNIT_AREA_ALT_RE.exec(t);
  return m ? parseArea(m[1]) : null;
}

export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[łl]awcza\b[^.]*?(\d[\d.\u00A0 ]*(?:,\d{2}|[.,]-))/i.exec(t);
  if (!m) m = /wynosi\s+(\d[\d.,\s ]*?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*(\d[\d.,\s ]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const OBREB_RE =
  /obr[ęe]b(?:ie)?\s*:?\s*((?:[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)?)/i;

export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

export function plotFromText(text) {
  const s = (text || '').replace(/\s+/g, ' ');
  const parcels = new Set();
  const parcelArea = new Map();

  const reSingle =
    /dzia[łl]k\w*\s+(?:gruntow\w+\s+)?(?:o\s+)?(?:numer\w*\s+ewidencyjn\w*\s+(?:nr\s+)?)?(?:numer\w*|nr)\s+(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/gi;
  let m;
  while ((m = reSingle.exec(s)) !== null) {
    parcels.add(m[1]);
    const a = Number(m[2].replace(',', '.'));
    if (a > 0 && !parcelArea.has(m[1])) parcelArea.set(m[1], a);
  }

  if (/dzia[łl]k/i.test(s)) {
    const reEach = /(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/gi;
    while ((m = reEach.exec(s)) !== null) {
      parcels.add(m[1]);
      const a = Number(m[2].replace(',', '.'));
      if (a > 0 && !parcelArea.has(m[1])) parcelArea.set(m[1], a);
    }
  }

  let total = null;
  const reList =
    /dzia[łl]k\w*\s+(?:o\s+numer\w*\s+ewidencyjn\w*\s+(?:nr\s+)?|numer\w*\s+)((?:\d+(?:\/\d+)?\s*(?:,|i)\s*)+\d+(?:\/\d+)?)\s+o\s+[łl][ąa]cznej\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/gi;
  while ((m = reList.exec(s)) !== null) {
    for (const p of m[1].split(/\s*(?:,|i)\s*/)) {
      const v = p.trim();
      if (/^\d+(?:\/\d+)?$/.test(v)) parcels.add(v);
    }
    const a = Number(m[2].replace(',', '.'));
    if (a > 0) total = Math.round(a * 10000);
  }
  if (total == null) {
    const lm = /[łl][ąa]cznej\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(s);
    if (lm) {
      const a = Number(lm[1].replace(',', '.'));
      if (a > 0) total = Math.round(a * 10000);
    }
  }

  let area_m2 = total;
  if (area_m2 == null && parcelArea.size) {
    let sum = 0;
    for (const a of parcelArea.values()) sum += a;
    area_m2 = Math.round(sum * 10000);
  }
  const dzialka_nr = parcels.size ? [...parcels].join(', ') : null;
  return { dzialka_nr, area_m2 };
}

function kindFromHeader(text) {
  return classifyKind((text || '').slice(0, 400));
}


export function parseAnnouncement(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kindHeader = kindFromHeader(t);
  const isLand = ctx.isLandBoard || kindHeader === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const plot = plotFromText(t);
  const obreb = obrebFromText(t);

  if (isLand) {
    const h = streetFromHeader(t);
    const address_raw = h ? `ul. ${h.street}${h.building ? ` ${h.building}` : ''}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb,
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
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  return {
    kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl, ctx = {}) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  const sold = achieved != null;
  const negativeStated =
    /Nabywca[\s\S]{0,400}?(negatywn|nie\s+wy[łl]oniono|brak\s+(?:uczestnik|ofert))/i.test(t) ||
    /osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[:\-–]?\s*brak/i.test(t);

  const obreb = obrebFromText(t);
  const plot = plotFromText(t);
  const kindHeader = kindFromHeader(t);
  const isLand = ctx.isLandBoard || kindHeader === 'grunt';

  if (isLand) {
    const h = streetFromHeader(t);
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
        obreb,
        area_m2: plot.area_m2, // PLOT area for land
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
  const kind = kindHeader === 'unknown' ? 'mieszkalny' : kindHeader;
  return [
    {
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
      ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
      notes,
    },
  ];
}
