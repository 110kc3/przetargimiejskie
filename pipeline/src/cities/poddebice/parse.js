
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9,
  pazdziernika: 10, 'października': 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/\./g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}


export function isAuctionSaleTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  if (!/przetarg/.test(t)) return false;
  if (!/ustn\w+/.test(t)) return false;
  if (!/nieograniczon\w*|ograniczon\w*/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (/wynik|rozstrzygni[eę]|odwo[łl]a|uniewa[żz]ni|wykaz/.test(t)) return false;
  return true;
}

export function isLeaseTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return /dzier[żz]aw|\bnajem\b/.test(t);
}

export function roundFromTitle(title) {
  if (!title) return null;
  const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
  const roman = /\b(i{1,3}|iv|vi{0,3}|ix|x)\s+przetarg/i.exec(title);
  if (roman) {
    const val = ROMAN[roman[1].toLowerCase()];
    if (val) return val;
  }
  const t = title
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
  if (/\bpierwsz\w*\s+przetarg/.test(t)) return 1;
  if (/\bdrugi\w*\s+przetarg/.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/.test(t)) return 3;
  if (/\bczwart\w*\s+przetarg/.test(t)) return 4;
  return null;
}

export function obrebFromTitle(title) {
  if (!title) return null;
  const m = /w\s+obr[eę]bie(?:\s+geodezyjnym)?\s+(?:nr\s+)?([^\s,]+)/i.exec(title);
  return m ? m[1].replace(/[.,;]+$/, '') : null;
}

export function streetFromTitle(title) {
  if (!title) return null;
  const m = /przy\s+ulicy\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\d]*?)\s+(\d+[A-Za-z]?)/i.exec(title);
  return m ? { street: m[1].trim().replace(/\s+$/, ''), building: m[2] } : null;
}


export function auctionDateFromText(text) {
  if (!text) return null;
  const m = /Przetarg\s+odb[eę]dzie\s+si[eę]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s+roku/i.exec(text);
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}


const BULLET_RE =
  /[•\-]\s*dla\s+(lokalu|dzia[łl]ki)\s+nr\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)(?:\s+i\s+nr\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?))?(?:\s+przy\s+ulicy\s+([A-ZŁŚĆĘĄÓŹŻŃ][^\d]*?)\s+(\d+[A-Za-z]?))?\s*[-–]\s*([\d][\d.\s]*,\d{2})\s*z[łl]/gi;

const OBREB_BULLET_RE =
  /-\s*dla\s+dzia[łl]ki\s+nr\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)([\s\S]{0,60}?)([\d][\d.\s]*)(?:,-|,\d{2})\s*z[łl]/gi;
const OBREB_IN_SPAN_RE = /obr[eę]b\w*\s+(?:nr\s+)?([^\s,]+)/i;

const INLINE_WADIUM_RE = /t\.?\s*j\.?([\s\S]{0,200}?)([\d][\d.\s]*,\d{2})\s*z[łl]/i;
const PARCEL_NR_RE = /\bnr\.?\s*(\d+[A-Za-z]?\/\d+[A-Za-z]?)\b/gi;
const SINGLE_PARCEL_INLINE_RE = /dzia[łl]k[eę]\s+(\d+[A-Za-z]?\/\d+[A-Za-z]?)\b/i;


export function extractItems(text, isFlat) {
  if (!text) return [];
  const items = [];
  BULLET_RE.lastIndex = 0;
  let m;
  while ((m = BULLET_RE.exec(text)) !== null) {
    const [, , id1, id2, street, building, wadiumStr] = m;
    items.push({
      ids: [id1, id2].filter(Boolean),
      street: street ? street.trim() : null,
      building: building || null,
      wadium: parsePLN(wadiumStr),
    });
  }
  if (items.length) return items;

  if (!isFlat) {
    OBREB_BULLET_RE.lastIndex = 0;
    while ((m = OBREB_BULLET_RE.exec(text)) !== null) {
      const [, id, span, amountStr] = m;
      const om = OBREB_IN_SPAN_RE.exec(span);
      items.push({
        ids: [id],
        street: null,
        building: null,
        obreb: om ? om[1].replace(/[.,;]+$/, '') : null,
        wadium: parsePLN(amountStr),
      });
    }
    if (items.length) return items;
  }

  const wm = INLINE_WADIUM_RE.exec(text);
  if (!wm) return [];
  const wadium = parsePLN(wm[2]);
  if (isFlat) return [{ ids: [], street: null, building: null, wadium }];

  const between = wm[1];
  const ids = [];
  PARCEL_NR_RE.lastIndex = 0;
  let pm;
  while ((pm = PARCEL_NR_RE.exec(between)) !== null) ids.push(pm[1]);
  if (ids.length === 0) {
    const sm = SINGLE_PARCEL_INLINE_RE.exec(text);
    if (sm) ids.push(sm[1]);
  }
  return [{ ids, street: null, building: null, wadium }];
}

const FLAT_AREA_RE = /(\d{1,3}[.,]\d{1,2})[ \t]+\d+\/\d{3,}\b/g;

const LAND_AREA_RE = /(\d+(?:[.,]\d+)?)[ \t]*m\s*2\b/g;

export function areaTokens(text, isFlat) {
  if (!text) return [];
  const re = isFlat ? FLAT_AREA_RE : LAND_AREA_RE;
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(parseArea(m[1]));
  return out;
}


const NIERUCHOMOSC_LOKALOWA_RE = /nieruchomo[śs]ci\s+lokalow\w*/i;

export function kindFromTitle(title) {
  if (!title) return 'grunt';
  if (NIERUCHOMOSC_LOKALOWA_RE.test(title)) return 'mieszkalny';
  return classifyKind(title) === 'mieszkalny' ? 'mieszkalny' : 'grunt';
}


export function parseAnnouncementPdf(text, title, fallbackDate, sourceUrl) {
  if (!text || !title) return [];
  if (isLeaseTitle(title)) return [];

  const kind = kindFromTitle(title);
  const isFlat = kind === 'mieszkalny';
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromTitle(title);

  const items = extractItems(text, isFlat);
  if (items.length === 0) return [];

  const tokens = items.length === 1 ? areaTokens(text, isFlat) : [];
  const singleArea = tokens.length ? tokens[0] : null;

  const titleStreet = isFlat ? streetFromTitle(title) : null;
  const titleObreb = !isFlat ? obrebFromTitle(title) : null;
  const addressRawFor = (obreb) =>
    obreb ? (/^\d+$/.test(obreb) ? `Poddębice, obręb ${obreb}` : obreb) : null;

  const out = [];
  for (const item of items) {
    const starting_price_pln = item.wadium != null ? item.wadium * 10 : null;

    if (isFlat) {
      const street = item.street || titleStreet?.street || null;
      const building = item.building || titleStreet?.building || null;
      if (!street || !building) continue;
      const apt = item.ids[0] || null;
      const address_raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
      const address = parseAddress(address_raw);
      if (!address) continue;
      out.push({
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2: singleArea,
        starting_price_pln,
        auction_date,
        round,
        detail_url: sourceUrl,
      });
    } else {
      const dzialka_nr = item.ids.length ? item.ids.join(', ') : null;
      const obreb = item.obreb || titleObreb;
      const address_raw = addressRawFor(obreb);
      if (!dzialka_nr && !address_raw) continue;
      out.push({
        kind: 'grunt',
        dzialka_nr,
        obreb,
        address_raw,
        area_m2: singleArea,
        starting_price_pln,
        auction_date,
        round,
        detail_url: sourceUrl,
      });
    }
  }
  return out;
}


const RESULT_GUARD_RE = /wynik|Burmistrz\s+Poddębic/i;

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !RESULT_GUARD_RE.test(text)) return [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;

  const negative =
    /wynik\w*\s+negatywn/i.test(text) ||
    /nie\s+wp[lł]yn[eę][lł]o\s+wadium/i.test(text) ||
    /brak\s+ofert/i.test(text);

  const priceM = /(?:cena\s+osi[aą]gni[eę]ta|za\s+cen[eę])[\s\S]{0,60}?([\d][\d.\s]*,\d{2})\s*z[łl]/i.exec(text);
  const startM = /cena\s+wywo[łl]awcza[\s\S]{0,100}?([\d][\d.\s]*,\d{2})\s*z[łl]/i.exec(text);

  const finalPrice = negative ? null : (priceM ? parsePLN(priceM[1]) : null);
  const outcome = finalPrice != null ? 'sold' : 'unsold';

  if (finalPrice == null && !startM) return [];

  return [{
    kind: 'unknown',
    auction_date,
    outcome,
    unsold_reason: outcome === 'unsold' ? 'unknown' : null,
    starting_price_pln: startM ? parsePLN(startM[1]) : null,
    final_price_pln: finalPrice,
    source_pdf: sourceUrl,
    notes: ['poddebice: parseResultDoc is ungroundtruthed — no live result notice exists for this city'],
  }];
}
