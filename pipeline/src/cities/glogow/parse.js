import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeWs(s) {
  return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
}


export function buildRecordText(f = {}) {
  return [`TITLE: ${normalizeWs(f.title)}`, `BODY: ${normalizeWs(f.body)}`].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function whole(text) {
  return `${field(text, 'TITLE')} ${field(text, 'BODY')}`.trim();
}


export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

export function isLease(text) {
  const t = whole(text);
  return /\b(?:na|w|do)\s+(?:wieloletni\w+\s+)?(?:dzier[żz]aw\w*|najem|najm\w+)\b/i.test(t)
    || /oddani\w+\s+w\s+(?:dzier[żz]aw\w*|najem)/i.test(t)
    || /czynsz\w*\s+(?:dzier[żz]aw|najm)/i.test(t);
}

export function isQualifiedBiddersList(text) {
  return /lista\s+os[óo]b\s+zakwalifikowan/i.test(whole(text));
}

export function isResultDoc(text) {
  return /informacj\w*\s+o\s+wynik/i.test(whole(text));
}

export function isAnnouncement(text) {
  return /og[łl]asza/i.test(whole(text));
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przyst[ąa]pi|nie\s+zaoferowa\w*\s+post[ąa]pieni/i.test(t);
}


const ORDINAL_STEMS = [
  [/^pierwsz/i, 1], [/^drug/i, 2], [/^trzeci/i, 3], [/^czwart/i, 4],
  [/^pi[ąa]t/i, 5], [/^sz[óo]st/i, 6], [/^si[óo]dm/i, 7], [/^[oó]sm/i, 8],
  [/^dziewi[ąa]t/i, 9], [/^dziesi[ąa]t/i, 10],
];
const ORDINAL_RE =
  /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[oó]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg\w*/i;

function stemToRound(stem) {
  for (const [re, n] of ORDINAL_STEMS) if (re.test(stem)) return n;
  return null;
}

export function roundFromText(text) {
  let m = ORDINAL_RE.exec(field(text, 'BODY'));
  if (m) return stemToRound(m[1]);
  m = ORDINAL_RE.exec(field(text, 'TITLE'));
  return m ? stemToRound(m[1]) : null;
}


export function kindFromText(text) {
  const body = field(text, 'BODY');
  let k = classifyKind(body.slice(0, 600));
  if (k !== 'unknown') return k;
  k = classifyKind(field(text, 'TITLE'));
  if (k !== 'unknown') return k;
  return classifyKind(body);
}


function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function parseDatePhrase(tail) {
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/.exec(tail);
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(tail);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

export function auctionDateFromText(text) {
  const t = field(text, 'BODY') || whole(text);
  let m = /odb(?:ędzie|ędą)\s+si[ęe]\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  m = /przetarg\w*\s+przeprowadzono\s+w\s+dniu\s+([\s\S]{0,24})/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1].trim());
    if (iso) return iso;
  }
  return null;
}


const STARTING_PRICE_RE = /cen[a-ząęó]*\s+wywo[łl]awcz[a-ząęó]*[\s\S]{0,150}?(\d[\d\s.]{2,}(?:,\d{2})?)/i;

export function startingPriceFromText(plainText) {
  const m = STARTING_PRICE_RE.exec(plainText || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(plainText) {
  const t = plainText || '';
  if (!/nabywc/i.test(t)) return null;
  const m = /za\s+najwy[żz]sz[ąa]\s+zaoferowan[ąa]\s+cen[ęe]\s+(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

const UNIT_AREA_RE = /powierzchni\s+u[żz]ytkow\w*\s+(\d+(?:[.,]\d+)?)\s*m\s*[²2]/i;

export function unitAreaFromText(plainText) {
  const m = UNIT_AREA_RE.exec(plainText || '');
  return m ? parseNum(m[1]) : null;
}


const PROP_ADDR_RE =
  /przy\s+(ul(?:\.|icy)|pl(?:\.|acu))\s+((?:\d+[\s-]+)?[A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)\s+(\d+[A-Za-z]?)\b/i;

const LAND_STREET_RE =
  /przy\s+(ul(?:\.|icy)|pl(?:\.|acu))\s+((?:\d+[\s-]+)?[A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{2,40}?)(?:,|\s+oznaczon|\s+w\s+G[łl]ogowie|\.|$)/i;

function foldStreet(designator, rawStreet) {
  const street = rawStreet.trim().replace(/\s+/g, ' ');
  return /^pl/i.test(designator) ? `Plac ${street}` : street;
}

const UNIT_NO_RE = /lokal\w*\s+(?:(?:nie)?mieszkaln\w+|u[żz]ytkow\w+)\s+(?:nr\s+)?(\d+[A-Za-z]?)/i;
function unitNoFromText(text) {
  const m = UNIT_NO_RE.exec(text);
  return m ? m[1] : null;
}

function garageNoFromText(text) {
  const m = /gara[żz]\w*\s+nr\s+(\d+)/i.exec(text);
  return m ? m[1] : null;
}

export function addressRawFromText(plainText) {
  const t = plainText || '';
  const m = PROP_ADDR_RE.exec(t);
  if (!m) return null;
  const street = foldStreet(m[1], m[2]);
  const building = m[3];
  const inlineUnit = /^\s*\/\s*(\d+[A-Za-z]?)/.exec(t.slice(m.index + m[0].length));
  const apt = inlineUnit?.[1] || unitNoFromText(t);
  if (apt) return `${street} ${building}/${apt}`;
  const garageNo = garageNoFromText(t);
  if (garageNo) return `${street} ${building} garaż nr ${garageNo}`;
  return `${street} ${building}`;
}

export function ownershipShare(text) {
  const match = /udzia[łl]\w*\s+(?:wynosz[ąa]c\w*\s+)?(\d+\s*\/\s*\d+)\s+w\s+prawie\s+w[łl]asno[śs]ci\s*:?\s*lokal/i.exec(text || '');
  return match ? match[1].replace(/\s/g, '') : null;
}

export function landStreetFromText(plainText) {
  const m = LAND_STREET_RE.exec(plainText || '');
  return m ? foldStreet(m[1], m[2]) : null;
}

export function landPlotFromText(plainText) {
  const whole = plainText || '';
  const priceAnchor = /cen[a-ząęó]*\s+wywo[łl]awcz/i.exec(whole);
  const t = priceAnchor ? whole.slice(0, priceAnchor.index) : whole;
  const parcels = [];
  const seen = new Set();
  const reP = /nr\s+geod\.?\s+(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); parcels.push(m[1]); }
  }
  let area_m2 = null;
  const am = /o\s+powierzchni\s+(\d+(?:[.,]\d+)?)\s*(ha|m)(?:\s*[²2])?(?![a-ząęółśżźćń])/i.exec(t);
  if (am) {
    const val = parseNum(am[1]);
    if (val != null) area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
  }
  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}


const LOT_START_RE = /Samodzieln\w+\s+lokal\w*\s+(?:(?:nie)?mieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+\d+[A-Za-z]?/gi;

export function splitLots(body) {
  const b = body || '';
  const starts = [];
  LOT_START_RE.lastIndex = 0;
  let m;
  while ((m = LOT_START_RE.exec(b)) !== null) starts.push(m.index);
  if (starts.length < 2) return [b];
  const chunks = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : b.length;
    chunks.push(b.slice(starts[i], end));
  }
  return chunks;
}


function buildAnnouncementRecord(chunk, kind, round, auction_date) {
  const starting_price_pln = startingPriceFromText(chunk);
  if (kind === 'grunt') {
    const plot = landPlotFromText(chunk);
    const address_raw = landStreetFromText(chunk);
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }
  const address_raw = addressRawFromText(chunk);
  if (!address_raw) {
    if (kind === 'zabudowana') {
      const plot = landPlotFromText(chunk);
      if (plot.dzialka_nr) {
        return {
          kind: 'grunt',
          dzialka_nr: plot.dzialka_nr,
          area_m2: plot.area_m2,
          address_raw: landStreetFromText(chunk),
          starting_price_pln,
          auction_date,
          round,
        };
      }
    }
    return null;
  }
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2: unitAreaFromText(chunk),
    ...(ownershipShare(chunk) ? { share: ownershipShare(chunk) } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}

export function parseAnnouncement(text) {
  if (!text) return [];
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const body = field(text, 'BODY') || whole(text);
  const chunks = splitLots(body);
  const out = [];
  for (const chunk of chunks) {
    const rec = buildAnnouncementRecord(chunk, kind, round, auction_date);
    if (rec) out.push(rec);
  }
  return out;
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultDoc(text)) return [];
  const notes = [];
  const body = field(text, 'BODY') || whole(text);

  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const starting_price_pln = startingPriceFromText(body);
  const achieved = achievedPriceFromText(body);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(body);
    const address_raw = landStreetFromText(body);
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
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

  const address_raw = addressRawFromText(body);
  if (!address_raw) {
    if (kind === 'zabudowana') {
      const plot = landPlotFromText(body);
      if (plot.dzialka_nr) {
        notes.push('parse: address-less built property — parcel-keyed');
        if (starting_price_pln == null) notes.push('parse: missing starting price');
        if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
        return [
          {
            auction_date,
            source_url: sourceUrl,
            kind: 'grunt',
            dzialka_nr: plot.dzialka_nr,
            area_m2: plot.area_m2,
            address_raw: landStreetFromText(body),
            round,
            starting_price_pln,
            final_price_pln: sold ? achieved : null,
            outcome: sold ? 'sold' : 'unsold',
            unsold_reason: sold ? null : 'unknown',
            notes,
          },
        ];
      }
    }
    return [];
  }
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

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
      area_m2: unitAreaFromText(body),
      ...(ownershipShare(body) ? { share: ownershipShare(body) } : {}),
      notes,
    },
  ];
}
