import { parseAddress } from '../../core/normalize.js';


export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s  ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
  styczeń: 1, styczen: 1, luty: 2, marzec: 3, kwiecień: 4, kwiecien: 4, maj: 5,
  czerwiec: 6, lipiec: 7, sierpień: 8, sierpien: 8, wrzesień: 9, wrzesien: 9,
  październik: 10, pazdziernik: 10, listopad: 11, grudzień: 12, grudzien: 12,
};

function plMonthNum(word) {
  return PL_MONTHS[(word || '').toLowerCase()] ?? null;
}

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = plMonthNum(word[2]);
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

const ORDINAL_WORDS = {
  pierwsz: 1, drugi: 2, drugim: 2, trzeci: 3, trzecim: 3, czwart: 4, piat: 5, piąt: 5,
};
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

export function roundFromText(text) {
  if (!text) return 1;
  const t = String(text);
  const roman = /\b(VI|IV|V|III|II|I)\s+(?:ustny\s+)?przetarg/i.exec(t);
  if (roman) return ROMAN_MAP[roman[1].toUpperCase()] ?? 1;
  const word = /\b(pierwsz\w*|drugi\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+(?:ustny\w*\s+)?przetarg/i.exec(t);
  if (word) {
    const key = word[1].toLowerCase();
    for (const [pfx, n] of Object.entries(ORDINAL_WORDS)) {
      if (key.startsWith(pfx)) return n;
    }
  }
  return 1;
}


export function isFlatSaleAnnouncement(title, bodyText) {
  const t = `${title || ''} ${bodyText || ''}`.toLowerCase();
  if (!/(lokal\w*\s+mieszkaln|\bmieszkani[ea]\b|\bmieszkanie\b)/.test(t)) return false;
  if (!/(sprzeda|zbyci|wystawi|licytacj|przetarg)/.test(t)) return false;
  if (!/cena\s+wywo[łl]awcz/.test(t)) return false;
  if (/(najem|wynajmij|wynaj[ei]|dzier[żz]aw|dzia[łl]k|lokal\w*\s+u[żz]ytkow|gastronomi|bonifikat|wykup|komunaln|\bbtbs\b|\bsim\b|posag|na\s+wydzier)/.test(t)) {
    return false;
  }
  return true;
}

function addressFromBody(text) {
  const estM = /\bos(?:iedl\w*|\.)?\s+([A-ZŁŚŻŹĆŃÓĄĘ][a-ząćęłńóśźż]+)/.exec(text);
  if (!estM) return null;
  let estate = estM[1].trim();

  let building = null;
  const blokM = /blok(?:u|iem)?\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  if (blokM) {
    building = blokM[1];
  } else {
    const estNumM = /\bos(?:iedl\w*|\.)?\s+([A-ZŁŚŻŹĆŃÓĄĘ][a-ząćęłńóśźż]+)\s+(\d{1,4}[A-Za-z]?)\b/.exec(text);
    if (estNumM) {
      estate = estNumM[1].trim();
      building = estNumM[2];
    }
  }
  if (!building) return null;

  const address = parseAddress(`${estate} ${building}`);
  return address ? { address, address_raw: `os. ${estate} ${building}` } : null;
}

function resolveAuctionDate(day, monthNum, postDateIso) {
  let year = new Date().getFullYear();
  const pm = /^(\d{4})-(\d{2})/.exec(postDateIso || '');
  if (pm) {
    year = Number(pm[1]);
    const postMonth = Number(pm[2]);
    if (monthNum < postMonth) year += 1;
  }
  return iso(year, monthNum, day);
}

export function parseAnnouncementPost(post) {
  if (!post) return null;
  const title = stripTags(post.title || '');
  const body = stripTags(post.content || '');
  if (!isFlatSaleAnnouncement(title, body)) return null;

  const addr = addressFromBody(body);
  if (!addr) return null;

  const areaM = /(\d+,\d+)\s*mkw|(\d+,\d+)\s*m(?:²|2|\s|\.|<|$)/i.exec(body);
  const area_m2 = areaM ? parseArea(areaM[1] || areaM[2]) : null;

  const priceM = /(\d{1,3}(?:[\s  .]\d{3})+,\d{2})\s*z[łl]/.exec(body);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  let auction_date = null;
  const dM = /Przetarg\s+odb[eę]dzie\s+si[eę]\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)/i.exec(body);
  if (dM) {
    const mon = plMonthNum(dM[2]);
    if (mon) auction_date = resolveAuctionDate(Number(dM[1]), mon, post.date);
  }

  const round = roundFromText(`${title} ${body}`);

  const bipM = /https?:\/\/[^"'\s]*bip\.gov\.pl\/[^"'\s]+/i.exec(post.content || '');

  return {
    kind: 'mieszkalny',
    title,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: area_m2 ?? null,
    round: round ?? 1,
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: null,
    auction_date,
    published_date: (post.date || '').slice(0, 10) || null,
    detail_url: post.link || null,
    bip_url: bipM ? bipM[0] : null,
  };
}


function priceFromResultText(text, labelPattern) {
  const re = new RegExp(labelPattern + '[^\\d]{0,30}(\\d[\\d\\u00a0\\u202f .]*,\\d{2}|\\d[\\d\\u00a0\\u202f .]*\\d)\\s*z[łl]', 'i');
  const m = re.exec(text);
  return m ? parsePLN(m[1]) : null;
}

function addressFromResultText(text) {
  const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text);
  const apt = aptM ? aptM[1] : null;
  const estM = /\bos(?:iedl\w*|\.)?\s+([A-ZŁŚŻŹĆŃÓĄĘ][a-ząćęłńóśźż]+)\s+(\d+[A-Za-z]?)/.exec(text);
  if (!estM) return null;
  const base = `${estM[1]} ${estM[2]}`;
  return parseAddress(apt ? `${base}/${apt}` : base);
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);

  const isResultNotice =
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /cena\s+osi[ąa]gni[ęe]ta/i.test(t) ||
    /wynik(?:iem)?\s+negatywn/i.test(t);
  if (!isResultNotice) return [];

  if (/niezabudowan\w*\s+dzia[łl]k|sprzeda[żz]\s+dzia[łl]k|lokal\w*\s+u[żz]ytkow|dzier[żz]aw/i.test(t)) return [];
  if (!/lokal\w*\s+mieszkaln|mieszkani/i.test(t)) return [];

  const address = addressFromResultText(t);
  if (!address) return [];

  let auction_date = fallbackDate ?? null;
  const dM1 = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  const dM2 = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (dM1) {
    const mon = plMonthNum(dM1[2]);
    if (mon) auction_date = iso(dM1[3], mon, dM1[1]);
  } else if (dM2) {
    auction_date = iso(dM2[3], dM2[2], dM2[1]);
  }

  const starting_price_pln = priceFromResultText(t, 'cena\\s+wywo[łl]awcza\\s*:?');
  const final_price_pln =
    priceFromResultText(t, 'cena\\s+osi[ąa]gni[ęe]ta[^\\d:]*:?') ??
    priceFromResultText(t, 'najwy[żz]sza\\s+oferta\\s*:?') ??
    priceFromResultText(t, 'cena\\s+nabycia\\s*:?');

  const unsold = /wynik(?:iem)?\s+negatywn|nikt\s+nie\s+przyst[ąa]pi|brak\s+(?:oferent|uczestnik|wp[łl]at\w*\s+wadium)/i.test(t);
  const outcome = unsold ? 'unsold' : (final_price_pln != null ? 'sold' : 'open');
  const unsold_reason = unsold
    ? (/wadium/i.test(t) ? 'brak wpłaty wadium' : 'wynik negatywny')
    : null;

  if (!unsold && final_price_pln == null) return [];

  return [{
    kind: 'mieszkalny',
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    starting_price_pln: starting_price_pln ?? null,
    final_price_pln: final_price_pln ?? null,
    auction_date,
    outcome,
    unsold_reason,
    source_pdf: sourceUrl,
    notes: [],
  }];
}
