import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const MONEY = '\\d{1,3}(?:[.\\s\\u00a0]?\\d{3})*(?:,\\d{1,2})?';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[.\s ]/g, '').replace(/,(\d{1,2})$/, '.$1');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const LABELED_PRICE_RE = new RegExp(
  `cena\\s+wywo[łl]awcza(?:\\s+nieruchomo[śs]ci)?\\s*:?\\s*(${MONEY})`,
  'i',
);
const DASH_PRICE_RE = new RegExp(`[-–]\\s*(${MONEY})\\s*z[łl]`, 'i');
const BARE_PRICE_RE = new RegExp(`(${MONEY})\\s*z[łl]`, 'i');

export function startingPriceFromText(text) {
  const t = text || '';
  let m = LABELED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  m = DASH_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  m = BARE_PRICE_RE.exec(t);
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_PRICE_RE = new RegExp(
  `(?:najwy[żz]sza\\s+)?cena\\s+osi[ąa]gni[ęe]t\\w*(?:\\s+w\\s+przetargu)?\\s*[:\\-–]?\\s*(${MONEY})\\s*z[łl]`,
  'i',
);
export function achievedPriceFromText(text) {
  const m = ACHIEVED_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const FLAT_AREA_RE = /o\s+powierzchni(?:\s+u[żz]ytkowej)?\s*(\d+(?:[.,]\d+)?)\s*m/i;
export function flatAreaFromText(text) {
  const m = FLAT_AREA_RE.exec(text || '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const LAND_AREA_HA_RE = /powierzchni\w*\s*(\d+(?:[.,]\d+)?)\s*ha\b/i;
export function landAreaM2FromText(text) {
  const m = LAND_AREA_HA_RE.exec(text || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

const PARCEL_RE = /Dzia[łl]k\w*\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)/i;
export function parcelNoFromText(text) {
  const m = PARCEL_RE.exec(text || '');
  return m ? m[1] : null;
}

const OBREB_RE = /obr[ęe]b\w*\s*(?:geodezyjny)?\s*(?:nr\.?\s*)?(\d+|\p{Lu}\p{Ll}+)/u;
export function obrebFromText(text) {
  const m = OBREB_RE.exec(text || '');
  return m ? m[1] : null;
}


const ROUND_RE = /\b(IV|III|II|VI|V|I)(?:-\w{1,4})?\s+przetarg\w*/i;
const ROUND_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? (ROUND_NUM[m[1].toUpperCase()] ?? null) : null;
}


const LOKAL_NR_RE = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+[A-Za-z]?)/i;

const UL_RE =
  /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)\s+(?:nr\.?\s*)?(\d{1,4}[A-Za-z]?)\b/u;

const BUDYNEK_NR_RE = /budyn\w*\s+(?:mieszkalnego\s+)?(?:o\s+)?nr\.?\s*(\d{1,4}[A-Za-z]?)/i;

const UL_BARE_RE =
  /\bul\.\s*(\p{Lu}[\p{L}.''’-]*(?:\s+\p{Lu}[\p{L}.''’-]*){0,3}?)(?=\s+(?:we?\s+Wschowie|w\s+\p{Lu}))/u;

export function extractFlatAddress(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  const lokalM = LOKAL_NR_RE.exec(t);
  if (!lokalM) return null;
  const apt = lokalM[1];

  const scoped = t.slice(lokalM.index, lokalM.index + 500);

  let street = null;
  let building = null;
  const ulM = UL_RE.exec(scoped);
  if (ulM) {
    street = ulM[1].trim();
    building = ulM[2].toUpperCase();
  } else {
    const budM = BUDYNEK_NR_RE.exec(scoped);
    if (budM) {
      building = budM[1].toUpperCase();
      const bareM = UL_BARE_RE.exec(scoped);
      if (bareM) street = bareM[1].trim();
    }
  }
  if (!street || !building) return null;
  return `${street} ${building}/${apt}`;
}


export function isLeaseRow(text) {
  return /najem|dzier[żz]aw/i.test(text || '');
}

export function isFlatSaleRow(text) {
  if (isLeaseRow(text)) return false;
  return classifyKind(text) === 'mieszkalny';
}

export function dateOnly(s) {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}


const ITEM_ANCHOR_RE = /(?:^|\n)\s*(\d{1,2})[.)]\s*/g;

export function splitNumberedItems(text) {
  const t = (text || '').trim();
  if (!t) return [];
  const anchors = [...t.matchAll(ITEM_ANCHOR_RE)];
  if (anchors.length < 2) return [{ n: 1, text: t }];
  const out = [];
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index + anchors[i][0].length;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : t.length;
    out.push({ n: Number(anchors[i][1]), text: t.slice(start, end).trim() });
  }
  return out;
}


export function recordsFromActiveRow(row) {
  const listings = [];
  const land = [];
  if (isLeaseRow(row.dotyczyText)) return { listings, land };

  const round = roundFromText(row.dotyczyText);
  const auction_date = dateOnly(row.auctionDateRaw);
  const items = splitNumberedItems(row.cenaText);
  const bundled = items.length > 1;
  const firstAttachment = (row.attachments || [])[0] || null;
  const source_url = firstAttachment ? firstAttachment.url : null;

  for (const item of items) {
    const searchText = bundled ? item.text : `${row.dotyczyText}\n${item.text}`;
    const kind = classifyKind(searchText);

    if (kind === 'mieszkalny') {
      const address_raw = extractFlatAddress(searchText);
      if (!address_raw) continue;
      const address = parseAddress(address_raw);
      if (!address) continue;
      listings.push({
        kind: 'mieszkalny',
        address_raw,
        address,
        area_m2: flatAreaFromText(searchText),
        starting_price_pln: startingPriceFromText(item.text),
        auction_date,
        round,
        detail_url: row.detailUrl || null,
        source_url,
      });
    } else if (kind === 'grunt') {
      const dzialka_nr = parcelNoFromText(searchText);
      if (!dzialka_nr) continue;
      land.push({
        kind: 'grunt',
        dzialka_nr,
        obreb: obrebFromText(searchText),
        area_m2: landAreaM2FromText(searchText),
        address_raw: null,
        starting_price_pln: startingPriceFromText(item.text),
        auction_date,
        round,
        detail_url: row.detailUrl || null,
        source_url,
      });
    }
  }
  return { listings, land };
}


export function buildNegativeResultText(row) {
  return [
    row.dotyczyText,
    `Cena wywoławcza: ${row.cenaText}`,
    'Przetarg zakończył się wynikiem negatywnym.',
  ].join('\n');
}

const EXPLICIT_NEGATIVE_RE = /wynikiem\s+negatywnym|nie\s+odnotowano\s+wp[łl]at|nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium/i;
const EXPLICIT_POSITIVE_RE = /wynikiem\s+pozytywnym/i;

export function isExplicitNegative(text) {
  return EXPLICIT_NEGATIVE_RE.test(text || '');
}
export function isExplicitPositive(text) {
  return EXPLICIT_POSITIVE_RE.test(text || '');
}

export function isResultNotice(text) {
  return (
    /informacj\w*\s+o\s+wynik/i.test(text || '') ||
    isExplicitNegative(text) ||
    isExplicitPositive(text) ||
    achievedPriceFromText(text) != null
  );
}

export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text) return [];
  const t = text.replace(/\r/g, ' ');
  if (classifyKind(t) !== 'mieszkalny') return [];

  const achieved = achievedPriceFromText(t);
  const explicitNeg = isExplicitNegative(t);
  const explicitPos = isExplicitPositive(t);
  const sold = achieved != null && !explicitNeg;
  if (!sold && !explicitNeg && !explicitPos) return [];

  const address_raw = extractFlatAddress(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];

  const notes = [];
  if (address.warning) notes.push(address.warning);

  const starting_price_pln = startingPriceFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');

  return [
    {
      auction_date: fallbackDate || null,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: roundFromText(t),
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2: flatAreaFromText(t),
      notes,
    },
  ];
}
