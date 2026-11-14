import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  parsePLN,
  auctionDateFromText,
} from '../../core/finn-bip.js';

export { htmlToText, parsePLN, auctionDateFromText };

const OFFICE_STREET_RE = /ko[sś]ciusz/i;

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
  styczeń: 1, styczen: 1, luty: 2, marzec: 3, kwiecień: 4, kwiecien: 4, maj: 5,
  czerwiec: 6, lipiec: 7, sierpień: 8, sierpien: 8, wrzesień: 9, wrzesien: 9,
  październik: 10, pazdziernik: 10, listopad: 11, grudzień: 12, grudzien: 12,
};

const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMAN_SRC = '(VIII|VII|VI|IX|IV|V|X|III|II|I)';

export function roundFromText(text) {
  if (!text) return null;
  const t = text;
  if (/\bpierwsz\w*\s+przetarg/i.test(t)) return 1;
  if (/\bdrugi\w*\s+przetarg/i.test(t)) return 2;
  if (/\btrzeci\w*\s+przetarg/i.test(t)) return 3;
  if (/\bczwart\w*\s+przetarg/i.test(t)) return 4;
  if (/\bpi[ąa]t\w*\s+przetarg/i.test(t)) return 5;

  const m = new RegExp(`\\b${ROMAN_SRC}\\s+(?:ustn\\w+\\s+|pisemn\\w+\\s+)?przetarg`, 'i').exec(t);
  if (m) return ROMAN_MAP[m[1].toUpperCase()] ?? null;

  const numM = /\b([1-9])\s+(?:ustn\w+\s+)?przetarg/i.exec(t);
  if (numM) return Number(numM[1]);

  if (/\bprzetarg/i.test(t)) return 1;
  return null;
}

export function parseDate(s) {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (iso) return s.trim();
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) {
    return `${num[3]}-${String(num[2]).padStart(2, '0')}-${String(num[1]).padStart(2, '0')}`;
  }
  const word = /(\d{1,2})\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const m = PL_MONTHS[word[2].toLowerCase()];
    if (m) {
      return `${word[3]}-${String(m).padStart(2, '0')}-${String(word[1]).padStart(2, '0')}`;
    }
  }
  return null;
}

export function resultDateFromText(text) {
  if (!text) return null;
  let m = /w\s+dniu\s+(\d{1,2}[.\-]\d{1,2}[.\-]\d{4}|\d{1,2}\s+[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})\s*r[.\s\S]{0,120}?zosta[łl]\s+przeprowadzony/i.exec(text);
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  m = /w\s+dniu\s+(\d{1,2}[.\-]\d{1,2}[.\-]\d{4}|\d{1,2}\s+[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})\s*r/i.exec(text);
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  m = /dnia\s+(\d{1,2}[.\-]\d{1,2}[.\-]\d{4}|\d{1,2}\s+[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})\s*r/i.exec(text);
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  return auctionDateFromText(text);
}

export function unitAreaFromText(text) {
  if (!text) return null;
  const m = /(?:pow(?:ierzchni[ae])?(?:\s+u[żz]ytkow\w+)?(?:\s+lokalu(?:\s+mieszkalnego)?)?)\s*(?:wynosi|:|o\s+pow\w*\.?\s+u[żz]ytkow\w+)?\s*[:\-–]?\s*(\d+[,.]\d+)\s*m\s*[²2]?/i.exec(text);
  if (m) {
    const v = Number(m[1].replace(',', '.'));
    if (Number.isFinite(v) && v > 0) return v;
  }
  const alt = /(\d+[,.]\d+)\s*m\s*[²2](?!\d)/i.exec(text);
  if (alt) {
    const v = Number(alt[1].replace(',', '.'));
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

export function plotAreaFromText(text) {
  if (!text) return null;
  const ha = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(text);
  if (ha) {
    const v = Number(ha[1].replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  const m2 = /o\s+(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(text);
  if (m2) {
    const v = Number(m2[1].replace(/[\s ]/g, ''));
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

export function startingPriceFromText(text) {
  if (!text) return null;
  let m = /cena\s+wywo[łl]awcza[\s\S]{0,300}?(\d{1,3}(?:[.\s\u00A0]\d{3})+(?:,\d{2})?|\d{5,})\s*z[łl]/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p && p >= 1000) return p;
  }
  m = /cena\s+wywo[łl]awcza\s*(?:wynosi[łl]a|wynosi)?\s*[:\-–]?\s*(\d[\d.,\s\u00A0]*?)\s*z[łl]/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p && p >= 1000) return p;
  }
  m = /wynosi\s+(\d[\d.,\s\u00A0]*?)\s*z[łl]/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p && p >= 1000) return p;
  }
  return null;
}

export function achievedPriceFromText(text) {
  if (!text) return null;
  const m = /(?:(?:najwy[żz]sza\s+)?cena\s+)?(?:zaoferowana|osi[ąa]gni[ęe]ta)\s+w\s+przetargu\s*(?:wynosi[łl]a)?\s*[:\-–]?\s*(\d[\d.,\s\u00A0]*?)\s*z[łl]/i.exec(text);
  return m ? parsePLN(m[1]) : null;
}

export function kwFromText(text) {
  if (!text) return null;
  const m = /\b(WA[1IL]\s*G\s*\/\s*\d{5,9}\s*\/\s*\d)\b/i.exec(text);
  if (!m) return null;
  let kw = m[1].replace(/\s+/g, '').toUpperCase();
  kw = kw.replace(/^WA[IL]G/, 'WA1G');
  return /^[A-Z0-9]{4}\/\d{5,9}\/\d$/.test(kw) ? kw : null;
}

export function parcelFromText(text) {
  if (!text) return null;
  const m = /dzia[łl]k\w*\s+(?:ewidencyjn\w+\s+|ew\.\s+)?(?:nr\.?|numer\w*|[mn]\b\.?)\s*([\d]+(?:\/\d+)?(?:\s*(?:,|i)\s*(?:(?:nr|[mn])\b\.?\s*)?\d+(?:\/\d+)?)*)/i.exec(text);
  if (!m) return null;
  const nums = m[1]
    .split(/\s*(?:,|i)\s*/)
    .map((x) => x.replace(/^(?:nr|[mn])\b\.?\s*/i, '').trim())
    .filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  if (!text) return null;
  const m = /obr[ęe]b\w*\s+(\d{2,4}|[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

export function landStreetFromText(text) {
  if (!text) return null;
  const re = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:icy)?\.?\s+([A-Z0-9ŻŹĆŁŚĄĘÓŃ][A-Za-z0-9ŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,;.]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+obr[ęe]b|\s+oznaczon|\s+ksi|\n|$)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (s && !OFFICE_STREET_RE.test(s)) return s;
  }
  return null;
}

export function addressFromText(title, text) {
  if (title) {
    const titleM = /ul\.\s+([A-Z0-9ŻŹĆŁŚĄĘÓŃ][A-Za-z0-9ŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?/i.exec(title);
    if (titleM && !OFFICE_STREET_RE.test(titleM[1])) {
      const b = titleM[2].trim();
      let a = titleM[3]?.trim() || null;
      if (!a) {
        const unitTitleM = /nr\s+(\d+[A-Za-z]?)/i.exec(title);
        if (unitTitleM) a = unitTitleM[1];
      }
      if (!a && text) {
        const unitTextM = /(?:lokal\w*(?:\s+mieszkaln\w+|\s+niemieszkaln\w+|\s+u[żz]ytkow\w+)?\s*(?:nr\.?|m\.?)\s*(\d+[A-Za-z]?)|(?:m\.|lok\.)\s*(\d+[A-Za-z]?))/i.exec(text);
        if (unitTextM) a = unitTextM[1] || unitTextM[2];
      }
      const raw = a ? `ul. ${titleM[1].trim()} ${b}/${a}` : `ul. ${titleM[1].trim()} ${b}`;
      const parsed = parseAddress(raw);
      if (parsed) return { raw, parsed };
    }
  }

  const combined = `${title || ''} ${text || ''}`;
  let apt = null;

  const unitM = /(?:lokal\w*(?:\s+mieszkaln\w+|\s+niemieszkaln\w+|\s+u[żz]ytkow\w+)?\s*(?:nr\.?|m\.?)\s*(\d+[A-Za-z]?)|(?:m\.|lok\.)\s*(\d+[A-Za-z]?))/i.exec(combined);
  if (unitM) apt = unitM[1] || unitM[2];

  const streetRe = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy|w\s+budynku\s+przy|lokalizacja:?[^\n]*?)\s+ul(?:icy)?\.?\s+([A-Z0-9ŻŹĆŁŚĄĘÓŃ][A-Za-z0-9ŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)(?:\s*(?:\/|m\.\s*)(\d+[A-Za-z]?))?(?=\s*(?:,|w\s+Grodzisku|\(|$|\n))/gi;
  let sm;
  let best = null;
  while ((sm = streetRe.exec(combined)) !== null) {
    const s = sm[1].trim();
    if (OFFICE_STREET_RE.test(s)) continue;
    const b = sm[2].trim();
    if (sm[3]) apt = sm[3].trim();
    best = { street: s, building: b, apt };
    break;
  }

  if (!best) return null;
  const raw = best.apt
    ? `ul. ${best.street} ${best.building}/${best.apt}`
    : `ul. ${best.street} ${best.building}`;
  return { raw, parsed: parseAddress(raw) };
}

export function isAnnouncement(text) {
  const t = (text || '').toLowerCase();
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/.test(t)) return false;
  return /przetarg|wykaz|sprzeda[żz]/i.test(t);
}

export function isResult(text) {
  const t = (text || '').toLowerCase();
  return /informacja\s+o\s+wynik|wynik\w*\s+.*przetarg|rozstrzygni[ęe]ci/i.test(t);
}

export function isWykaz(text) {
  const t = (text || '').toLowerCase();
  return /wykaz\s+nieruchomo[sś]ci\s+przeznaczonych\s+do\s+sprzeda[żz]y|^\s*wykaz\b/i.test(t);
}

export function parseAnnouncement(title, content, url, options = {}) {
  const text = htmlToText(content);
  if (!isAnnouncement(`${title} ${text}`)) return null;

  const isWyk = Boolean(options.isWykaz || isWykaz(`${title} ${text}`));
  const kind = classifyKind(`${title} ${text}`);
  const round = roundFromText(title) ?? roundFromText(text);
  const auction_date = isWyk ? null : (auctionDateFromText(text) || auctionDateFromText(title));
  const starting_price_pln = isWyk ? null : startingPriceFromText(text);
  const kw_nr = kwFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text) || parcelFromText(title);
    const street = landStreetFromText(text) || landStreetFromText(title);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    const address = address_raw ? parseAddress(address_raw) : null;
    const area_m2 = plotAreaFromText(text) || plotAreaFromText(title);

    return {
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(text) || obrebFromText(title),
      area_m2,
      address_raw,
      address,
      starting_price_pln,
      auction_date,
      round,
      kw_nr,
      is_wykaz: isWyk,
      detail_url: url,
      source_url: url,
    };
  }

  const addr = addressFromText(title, text);
  if (!addr || !addr.parsed) return null;

  const area_m2 = unitAreaFromText(text) || unitAreaFromText(title);
  const resolvedKind = kind === 'unknown' ? 'mieszkalny' : kind;

  return {
    kind: resolvedKind,
    address_raw: addr.raw,
    address: addr.parsed,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    kw_nr,
    is_wykaz: isWyk,
    detail_url: url,
    source_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!isResult(t)) return [];

  const notes = [];
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = /wynikiem\s+negatywnym|brak\s+(?:ofert|oferent|uczestnik)|nie\s+wy[łl]oniono|nie\s+przyst[ąa]pi|nie\s+odnotowano/i.test(t);
  const kind = classifyKind(t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const street = landStreetFromText(t);
    if (!dzialka_nr && !street) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(t),
      area_m2: plotAreaFromText(t),
      address_raw: street ? `ul. ${street}` : null,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'no_bids',
      notes,
    }];
  }

  const addr = addressFromText('', t);
  if (!addr || !addr.parsed) return [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const resolvedKind = kind === 'unknown' ? 'mieszkalny' : kind;

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: resolvedKind,
    address_raw: addr.raw,
    address: addr.parsed,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'no_bids',
    area_m2: unitAreaFromText(t),
    kw_nr: kwFromText(t),
    notes,
  }];
}
