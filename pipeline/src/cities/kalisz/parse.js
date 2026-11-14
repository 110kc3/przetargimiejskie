import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText as finnAuctionDateFromText,
  parsePLN,
} from '../../core/finn-bip.js';

export { htmlToText };


const AUCTION_ANCHOR_RE = /przetarg\w*\s+ustn\w*|ustn\w*\s+przetarg\w*/i;

export function isAuctionSaleDoc(text) {
  const t = text || '';
  if (!AUCTION_ANCHOR_RE.test(t)) return false;
  return /sprzeda/i.test(t);
}

export function isResultNotice(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && /informacj\w*\s+o\s+wyniku|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(t);
}

export function isAnnouncement(text) {
  const t = text || '';
  return isAuctionSaleDoc(t) && !isResultNotice(t) && /og[łl]asza/i.test(t);
}

const SECTION_HEADER_RE = /\n\s*I\.\s+[A-ZŁŚŻŹĆŃÓĄĘ]/;
const SUBJECT_WINDOW_CAP = 900;

export function subjectWindow(text) {
  const t = text || '';
  const anchorM = /og[łl]asza|informacj\w*\s+o\s+wyniku/i.exec(t);
  const rest = anchorM ? t.slice(anchorM.index) : t;
  const sectionM = SECTION_HEADER_RE.exec(rest.slice(10));
  const end = sectionM ? Math.min(10 + sectionM.index, SUBJECT_WINDOW_CAP) : SUBJECT_WINDOW_CAP;
  return rest.slice(0, end);
}


const APT_RE = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;
const STREET_RE =
  /przy\s+(?:ul\.|ulic\w+|pl\.|plac\w*|al\.|alei|alej\w+|os\.|osiedl\w+)\s+([^\d,]{2,60}?)\s+(\d+[A-Za-z]?)\b/i;

export function addressFromText(text) {
  const w = subjectWindow(text);
  const sm = STREET_RE.exec(w);
  if (!sm) return null;
  const street = sm[1].trim().replace(/\s+/g, ' ');
  const building = sm[2];
  const am = APT_RE.exec(w);
  const apt = am ? am[1] : null;
  const raw = `ul. ${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

const ORDINAL = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5,
  'szóst': 6, szost: 6, 'siódm': 7, siodm: 7, 'ósm': 8, osm: 8,
  'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const t = text || '';
  const m =
    /(?:og[łl]asza|wynik\w*|odby[łl]\s+si[ęe])[\s\S]{0,50}?(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*)\s+przetarg/i.exec(
      t,
    );
  if (m) {
    const word = m[1].toLowerCase();
    for (const [stem, n] of Object.entries(ORDINAL)) {
      if (word.startsWith(stem)) return n;
    }
  }
  const rm = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s+przetarg/.exec(t);
  if (rm) return ROMAN[rm[1]] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, 'września': 9, pazdziernika: 10,
  'października': 10, listopada: 11, grudnia: 12,
};

export function auctionDateFromText(text) {
  const fromAnnouncement = finnAuctionDateFromText(text);
  if (fromAnnouncement) return fromAnnouncement;
  const m =
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,150}?(?:zosta[łl]\s+przeprowadzon\w*|odby[łl]\s+si[ęe])\s+\w*\s*przetarg/i.exec(
      text || '',
    );
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export function achievedPriceFromText(text) {
  const m = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t\w*[\s\S]{0,60}?([\d][\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function isPositiveOutcome(text) {
  return /wynikiem\s+pozytywnym/i.test(text || '');
}

export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy|nie\s+(?:odnotowano|wp[łl]aci[łl]\w*)\s+wadium/i.test(
    text || '',
  );
}


export function parseAnnouncement(text, opts = {}) {
  const t = text || '';
  if (!isAnnouncement(t)) return null;
  const kind = classifyKind(subjectWindow(t));
  if (kind === 'grunt') return null;
  const addr = addressFromText(t);
  if (!addr) return null;
  const { url = null } = opts;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(t),
    round: roundFromText(t),
    starting_price_pln: priceFromText(t),
    auction_date: auctionDateFromText(t),
    detail_url: url,
    source_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = text || '';
  if (!isResultNotice(t)) return [];
  const kind = classifyKind(subjectWindow(t));
  if (kind === 'grunt') return [];
  const addr = addressFromText(t);
  if (!addr) return [];

  const positive = isPositiveOutcome(t);
  const negative = isNegativeOutcome(t);
  const final_price_pln = positive ? achievedPriceFromText(t) : null;
  const outcome = final_price_pln != null ? 'sold' : negative ? 'unsold' : 'unknown';

  const notes = [];
  if (addr.address.warning) notes.push(addr.address.warning);
  if (positive && final_price_pln == null) notes.push('parse: sold notice but no achieved price found');

  return [{
    auction_date: auctionDateFromText(t) || fallbackDate || null,
    source_pdf: sourceUrl || null,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round: roundFromText(t),
    area_m2: areaFromText(t),
    starting_price_pln: priceFromText(t),
    final_price_pln,
    outcome,
    unsold_reason: negative ? 'wynikiem negatywnym' : null,
    notes,
  }];
}
