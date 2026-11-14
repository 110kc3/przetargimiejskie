
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

export function normalizeBody(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fb = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fb);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function textMonthDate(seg) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(seg || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAscii(m[2])];
  if (!mon) return null;
  const d = Number(m[1]);
  if (d < 1 || d > 31) return null;
  return `${m[3]}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
const ORDINAL = {
  pierwsz: 1, drug: 2, trzec: 3, czwart: 4, piat: 5,
  szost: 6, siodm: 7, osm: 8, dziewiat: 9, dziesiat: 10,
};

export function roundFromText(text) {
  const t = toAscii(text || '');
  const rm = /\b([ivx]{1,4})\s+przetarg/.exec(t);
  if (rm && ROMAN[rm[1]]) return ROMAN[rm[1]];
  const wm = /(pierwsz|drug|trzec|czwart|piat|szost|siodm|osm|dziewiat|dziesiat)\w*\s+przetarg/.exec(t);
  if (wm) return ORDINAL[wm[1]] ?? null;
  return null;
}


export function isResultNotice(text) {
  const t = normalizeBody(text);
  return /informacj\w*\s+o\s+wyniku/i.test(t)
    || /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+(pozytywn|negatywn)/i.test(t);
}

export function isAnnouncement(text) {
  const t = normalizeBody(text);
  if (isResultNotice(t)) return false;
  if (/og[łl]asza\s+[ivx]{1,4}\s+przetarg/i.test(t)) return true;
  return /cena\s+wywo[łl]awcz/i.test(t) && /odb[ęe]dzie\s+si[ęe]/i.test(t);
}


const APT_RE = /lokal\w*\s+mieszkaln\w+\s+nr\s+(\d+[A-Za-z]?)/i;
const SUBJECT_RE =
  /(?:zbycie|sprzeda\w+)\s+lokal\w+\s+mieszkaln\w+[\s\S]{0,240}?przy\s+(ul\.|ulic\w+|pl\.|plac\w*|al\.|alei|aleja|alej\w+|os\.|osiedl\w+)\s+([^\d]{2,50}?)\s+(\d+[A-Za-z]?)\b/i;
const OBREB_RE = /w\s+obr[ęe]bie\s+(?:nr\s+)?(\d+)\s+miasta/i;

function abbrevType(t) {
  const s = (t || '').toLowerCase();
  if (s.startsWith('pl')) return 'pl';
  if (s.startsWith('al')) return 'al';
  if (s.startsWith('os')) return 'os';
  return 'ul';
}

export function extractSubject(body) {
  const aptM = APT_RE.exec(body);
  const apt = aptM ? aptM[1].toUpperCase() : null;
  const obrM = OBREB_RE.exec(body);
  const obreb = obrM ? obrM[1] : null;
  const sbM = SUBJECT_RE.exec(body);
  if (!sbM) return { address: null, address_raw: null, apt, obreb };
  const street = sbM[2].trim().replace(/\s+/g, ' ');
  const building = sbM[3].toUpperCase();
  const raw = `${abbrevType(sbM[1])}. ${street} ${building}${apt ? '/' + apt : ''}`;
  return { address: parseAddress(raw), address_raw: raw, apt, obreb };
}

export function extractAreaM2(body) {
  const m = /lokal\w*\s+mieszkaln\w+\s+nr\s+\d+[A-Za-z]?\s+o\s+pow\w*\.?\s+([\d]+[,.]\d+)\s*m/i.exec(body);
  return m ? parseArea(m[1]) : null;
}

const AMOUNT_RE = /(\d{1,3}(?:[ .]\d{3})+(?:,\d{2})?|\d+,\d{2})/;

function priceAfter(body, re, span) {
  const i = body.search(re);
  if (i < 0) return null;
  const m = AMOUNT_RE.exec(body.slice(i, i + span));
  return m ? parsePLN(m[1]) : null;
}

export function extractStartingPrice(body) {
  return priceAfter(body, /cena\s+wywo[łl]awcz\w+/i, 260);
}

export function extractAchievedPrice(body) {
  return priceAfter(body, /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]t\w+/i, 220);
}

export function extractAuctionDate(body) {
  let i = body.search(/odb[ęe]dzie\s+si[ęe]/i);
  if (i >= 0) {
    const d = textMonthDate(body.slice(i, i + 70));
    if (d) return d;
  }
  i = body.search(/\bw\s+dniu\b/i);
  if (i >= 0) {
    const d = textMonthDate(body.slice(i, i + 50));
    if (d) return d;
  }
  return null;
}

export function extractPublishedDate(body) {
  const m = /,\s*dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(body);
  return m ? textMonthDate(m[1]) : null;
}

export function extractOutcome(body) {
  if (/wynikiem\s+pozytywnym/i.test(body)) return 'sold';
  if (/wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy/i.test(body)) return 'unsold';
  return null;
}


export function parseAnnouncement(text, url) {
  const body = normalizeBody(text);
  const kind = classifyKind(body);
  const subject = extractSubject(body);
  return {
    kind,
    round: roundFromText(body),
    area_m2: extractAreaM2(body),
    starting_price_pln: extractStartingPrice(body),
    auction_date: extractAuctionDate(body),
    published_date: extractPublishedDate(body),
    detail_url: url,
    address: subject.address,
    address_raw: subject.address_raw,
    obreb: subject.obreb,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const body = normalizeBody(text);
  if (!body || !isResultNotice(body)) return [];

  const kind = classifyKind(body);
  const subject = extractSubject(body);
  if (!subject.address) return [];

  const outcome = extractOutcome(body) || 'unsold';
  const sold = outcome === 'sold';
  const achieved = sold ? extractAchievedPrice(body) : null;
  const starting_price_pln = extractStartingPrice(body);

  const notes = [];
  if (subject.address.warning) notes.push(subject.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold notice but no achieved price found');

  return [{
    auction_date: extractAuctionDate(body) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    obreb: subject.obreb,
    round: roundFromText(body),
    area_m2: extractAreaM2(body),
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome,
    unsold_reason: sold ? null : 'negatywny',
    notes,
  }];
}
