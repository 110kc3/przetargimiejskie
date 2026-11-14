import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  sect: '§', ndash: '–', mdash: '—', hellip: '…',
  oacute: 'ó', Oacute: 'Ó', aacute: 'á', eacute: 'é', sup2: '²',
  laquo: '«', raquo: '»', bdquo: '„', rdquo: '”', ldquo: '“',
};

export function stripTags(s) {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m))
    .replace(/​/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toAscii(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, wrzesnia_: 9, pazdziernika: 10,
  listopada: 11, grudnia: 12,
  styczen: 1, luty: 2, marzec: 3, kwiecien: 4, maj: 5, czerwiec: 6,
  lipiec: 7, sierpien: 8, wrzesien: 9, pazdziernik: 10, listopad: 11, grudzien: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) {
    const d = Number(num[1]), mo = Number(num[2]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return iso(num[3], mo, num[1]);
    return null;
  }
  const word = /(\d{1,2})\s+([A-Za-zŁŚŻŹĆŃÓĄĘłśżźćńóąę]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[toAscii(word[2])];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}


export function extractTitle(html) {
  if (!html) return null;
  const m = /<article[^>]*class="article-area__article[^"]*"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html)
    || /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

export function extractPublishedDate(html) {
  if (!html) return null;
  const m = /Pierwsza\s+publikacja:[\s\S]{0,40}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(html);
  return m ? iso(m[3], m[2], m[1]) : null;
}

const MIN_INLINE_CHARS = 40;

export function extractInlineBody(html) {
  if (!html) return '';
  const m = /<div class="editor-content"[^>]*>([\s\S]*?)(?:<h3[^>]*>\s*Materia|<div class="metrics")/i.exec(html);
  if (!m) return '';
  const text = stripTags(m[1]);
  return text.length >= MIN_INLINE_CHARS ? text : '';
}

const HOST = 'https://samorzad.gov.pl';

export function extractAttachmentUrl(html) {
  if (!html) return null;
  const m = /href="(\/attachment\/[0-9a-fA-F-]+)"/i.exec(html);
  return m ? HOST + m[1] : null;
}


function saleSubject(text) {
  const m = /na\s+sprzeda[żz]\s+([\s\S]{0,140})/i.exec(text || '');
  if (!m) return '';
  return m[1].split(/[.\n]/)[0];
}

export function classifyLipsko(body, title) {
  const subj = saleSubject(body) || saleSubject(title || '');
  if (subj) {
    const k = classifyKind(subj);
    if (k !== 'unknown') return k;
  }
  const kt = classifyKind(title || '');
  if (kt !== 'unknown') return kt;
  return classifyKind(body || '');
}

const RENTAL_RE = /\b(?:na|w|do)\s+(?:dzier[żz]aw|najem|najmu|u[żz]yczeni)/i;

export function isRental(text) {
  return RENTAL_RE.test(text || '');
}

export function isCancelled(text) {
  const t = toAscii(text || '');
  return /\bo\s+odwolan\w+\s+(?:[ivx]+\s+)?przetarg|uniewazni\w*\s+(?:[ivx]+\s+)?przetarg/.test(t);
}


const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
const WORD_ROUND = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5 };

export function roundFrom(text) {
  const t = toAscii(text || '');
  const r = /\b(iii|iv|ii|v|i)\s+przetarg/.exec(t);
  if (r) return ROMAN[r[1]] ?? null;
  const w = /\b(pierwsz|drug|trzeci|czwart|piat)\w*\s+przetarg/.exec(t);
  if (w) return WORD_ROUND[w[1]] ?? null;
  return null;
}


const DZIALKA_RE = /dzia[łl][kc]\w*\s+(?:ewid\.?\s+)?(?:o\s+)?(?:numer|nr\.?)\s*(\d+(?:\/\d+)?)/i;

export function extractDzialkaNr(body) {
  const m = DZIALKA_RE.exec(body || '');
  return m ? m[1] : null;
}

const OBREB_RE = /w\s+obr[ęe]bie\s+(?:geodezyjnym\s+)?(?:\d{3,4}\s+)?([A-ZŁŚŻŹĆŃÓĄĘ][^.,\n]*?)(?=[.,]|\s+Dla\b|\s+urz[ąa]dzon|\s+o\s+pow|$)/;

export function extractObreb(body) {
  const m = OBREB_RE.exec(body || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

const PL_UP = 'A-ZĄĆĘŁŃÓŚŹŻ';
const PL_LOW = 'a-ząćęłńóśźż';
const STREET_RE = new RegExp(`\\bul\\.?\\s+([${PL_UP}][${PL_UP}${PL_LOW}.\\s]{0,40}?)\\s+(\\d+[A-Za-z]?)\\b`);
const LOKAL_NR_RE = /\blokal\w*\s+(?:mieszkaln\w+\s+|u[żz]ytkow\w+\s+|niemieszkaln\w+\s+)?nr\.?\s*(\d+[A-Za-z]?)/i;

export function extractSubject(body, kind) {
  const dzialka_nr = extractDzialkaNr(body);
  const obreb = extractObreb(body);
  if (kind === 'grunt') {
    const parts = [obreb, dzialka_nr ? `dz. nr ${dzialka_nr}` : null].filter(Boolean);
    return { address_raw: parts.length ? parts.join(', ') : null, address: null, dzialka_nr, obreb };
  }
  const s = STREET_RE.exec(body || '');
  if (!s) return { address_raw: null, address: null, dzialka_nr, obreb: null };
  const street = s[1].trim().replace(/\s+/g, ' ');
  const building = s[2];
  const aptM = LOKAL_NR_RE.exec(body || '');
  const apt = aptM ? aptM[1] : null;
  const raw = apt ? `${street} ${building}/${apt}` : `${street} ${building}`;
  return { address_raw: raw, address: parseAddress(raw), dzialka_nr: null, obreb: null };
}


export function extractAreaM2(body, kind) {
  const b = body || '';
  if (kind === 'grunt') {
    const ha = /o\s+pow(?:ierzchni)?\.?\s*(\d+[.,]\d+|\d+)\s*ha\b/i.exec(b);
    if (ha) {
      const v = parseArea(ha[1]);
      return v == null ? null : Math.round(v * 10000);
    }
  }
  const m2 = /o\s+pow(?:ierzchni)?(?:\s+u[żz]ytkowej)?\.?\s*(\d[\d.,]*)\s*m\s*[²2]/i.exec(b);
  return m2 ? parseArea(m2[1]) : null;
}

function priceAfter(body, label) {
  const t = toAscii(body || '');
  const idx = t.search(label);
  if (idx < 0) return null;
  const region = body.slice(idx, idx + 200);
  const m = /([\d][\d\s.,]*(?:,\d{2})?)\s*z[łl]/i.exec(region);
  return m ? parsePLN(m[1]) : null;
}

export function extractStartingPrice(body) {
  return priceAfter(body, /cena\s+wywolawcza/);
}

export function extractFinalPrice(body) {
  return priceAfter(body, /cena\s+osiagnieta/);
}

export function extractAuctionDate(body) {
  const re = /(?:w\s+dniu|dnia)\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\s+[A-Za-złśżźćńóąęŁŚŻŹĆŃÓĄĘ]{3,}\s+\d{4})\s*r?\.?\s*(?:\([^)]{0,25}\)\s*)?o\s+godz/i;
  const m = re.exec(body || '');
  return m ? parseDateText(m[1]) : null;
}


export function parseAnnouncement(body, title) {
  const b = body || '';
  const t = title || '';
  if (isRental(t) || isRental(b)) return null;
  if (isCancelled(t)) return { cancelled: true };
  const kind = classifyLipsko(b, t);
  const subject = extractSubject(b, kind);
  return {
    kind,
    round: roundFrom(t) ?? roundFrom(b),
    cancelled: false,
    ...subject,
    area_m2: extractAreaM2(b, kind),
    starting_price_pln: extractStartingPrice(b),
    auction_date: extractAuctionDate(b),
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const body = /<(?:div|p|span|article|h2)\b/i.test(text) ? stripTags(text) : text;
  if (!body.trim()) return [];
  if (isRental(body) || isCancelled(body)) return [];

  const folded = toAscii(body);
  const looksResult =
    /informacj\w*\s+o\s+wynik/.test(folded) ||
    /cena\s+osiagnieta/.test(folded) ||
    /wynik\w*\s+negatywn/.test(folded) ||
    /zostal\s+przeprowadzon|przeprowadzono/.test(folded);
  if (!looksResult) return [];

  const kind = classifyLipsko(body, '');
  const subject = extractSubject(body, kind);
  if (!subject.address && !subject.dzialka_nr) return [];

  const starting_price_pln = extractStartingPrice(body);
  const final_price_pln = extractFinalPrice(body);
  const negative =
    /wynik\w*\s+negatywn|zakonczy\w*\s+(?:sie\s+)?wynikiem\s+negatywn|nie\s+wplacono\s+wadium|nikt\s+nie\s+przystapi|brak\s+(?:oferent|uczestnik|wplat)/.test(folded);
  const outcome = negative ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'open') notes.push('parse: result notice without an achieved price or negative marker');

  return [{
    auction_date: extractAuctionDate(body) || fallbackDate || null,
    source_pdf: sourceUrl,
    kind,
    address_raw: subject.address_raw,
    address: subject.address,
    dzialka_nr: subject.dzialka_nr,
    obreb: subject.obreb,
    round: roundFrom(body),
    starting_price_pln,
    final_price_pln: final_price_pln ?? null,
    outcome,
    unsold_reason: negative ? 'wynik negatywny' : null,
    area_m2: extractAreaM2(body, kind),
    notes,
  }];
}
