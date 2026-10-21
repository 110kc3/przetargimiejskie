// Parsers for Płońsk municipal property announcements and result notices.
//
// BIP host: umplonsk.bip.org.pl (bip.org.pl network CMS).
// Notices live inside attachments (mixed .docx and born-digital / scanned .pdf).
//
// Groundtruthed against real municipal documents (2021–2026):
//   - ul. Młodzieżowa 23/4 (2026 announcement & result notice, unsold)
//   - ul. Północna 10/22 (2023 announcement & result notice, sold 185 090 zł)
//   - Pl. 15-go Sierpnia 2 (2024 share announcement & result notice, sold 253 448 zł)
//   - ul. Zduńska 8a (2023 house announcement & result notice, sold 186 605 zł)
//   - ul. Rzemieślnicza (2026 active land auction, round 2, 2026-11-20)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: '01', styczen: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecien: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpien: '08',
  wrzesnia: '09', wrzesień: '09', września: '09',
  pazdziernika: '10', pazdziernik: '10', października: '10', październik: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzien: '12',
};

// Urząd Miejski w Płońsku office addresses to exclude from property matching
const OFFICE_STREETS_RE = /\b(?:Płocka|Plocka|1[- ]go\s+Maja|1\s+Maja)\b/i;

export function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parses Polish date strings (e.g. "20 marca 2026", "15.12.2023") into ISO YYYY-MM-DD. */
export function parseDate(str) {
  if (!str) return null;
  const s = str.trim();
  const numM = /^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/.exec(s);
  if (numM) {
    return `${numM[3]}-${numM[2].padStart(2, '0')}-${numM[1].padStart(2, '0')}`;
  }
  const wordM = /^(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})$/.exec(s);
  if (wordM) {
    const m = PL_MONTHS[wordM[2].toLowerCase()];
    if (m) return `${wordM[3]}-${m}-${wordM[1].padStart(2, '0')}`;
  }
  return null;
}

/** Parses Polish currency strings into integer PLN (e.g. "183.250,00 zł" -> 183250). */
export function parsePLN(str) {
  if (!str) return null;
  const clean = String(str).replace(/\s*z[łl]\.?$/i, '').trim();
  if (/,\d{2}$/.test(clean)) {
    const val = Number(clean.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(val) && val > 0 ? Math.round(val) : null;
  }
  const digits = clean.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parses decimal area strings into float m² (e.g. "22,91" -> 22.91). */
export function parseArea(str) {
  if (!str) return null;
  const n = Number(String(str).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Nominative normalization for Płońsk street adjectives. */
export function normalizeStreetName(street) {
  if (!street) return street;
  let s = street.trim();
  if (/^młodzieżow/i.test(s)) return 'Młodzieżowa';
  if (/^północn/i.test(s)) return 'Północna';
  if (/^zduńsk/i.test(s)) return 'Zduńska';
  if (/^rzemieślnicz/i.test(s)) return 'Rzemieślnicza';
  if (/^pułtusk/i.test(s)) return 'Pułtuska';
  if (/^skarżyńsk/i.test(s)) return 'Skarżyńska';
  if (/^warszawsk/i.test(s)) return 'Warszawska';
  if (/^wspóln/i.test(s)) return 'Wspólna';
  if (/^sienkiewicz/i.test(s)) return 'Sienkiewicza';
  return s;
}

/** Discriminator: true if document or title represents a tender outcome / result notice. */
export function isResultDoc(title, text) {
  const t = `${title || ''} ${text || ''}`;
  if (/wyni?k/i.test(title || '')) return true;
  return /informacj\w*\s+o\s+wynik|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(t);
}

/** Discriminator: true if document represents a tender announcement (not result or qualification list). */
export function isAnnouncementDoc(title, text) {
  if (isResultDoc(title, text)) return false;
  const t = `${title || ''} ${text || ''}`;
  if (/lista\s+os[oó]b\s+zakwalifikowanych/i.test(t)) return false;
  return /przetarg|og[łl]oszenie/i.test(t);
}

/** Extracts tender round number (1, 2, 3...) from title or text. */
export function roundFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase().replace(/[-_]/g, ' ');
  if (/\b(v|pi[ąa]t\w*)\b/i.test(t)) return 5;
  if (/\b(iv|czwart\w*)\b/i.test(t)) return 4;
  if (/\b(iii|trzeci\w*)\b/i.test(t)) return 3;
  if (/\b(ii|drug\w*)\b/i.test(t)) return 2;
  if (/\b(i|pierwsz\w*)\b/i.test(t)) return 1;
  if (/\bprzetarg\b/i.test(t)) return 1;
  return null;
}

/** Extracts auction date from text. */
export function auctionDateFromText(text) {
  if (!text) return null;
  let m = /(?:odby[łl]\s+si[ęe]\s+w\s+dniu|wyznaczonego\s+na\s+dzie[ńn]|odb[ęe]dzie\s+si[ęe]\s+w\s+dniu)\s+(\d{1,2}\s+[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+\s+\d{4}|\d{1,2}[.\-]\d{1,2}[.\-]\d{4})/i.exec(text);
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  m = /w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+\s+\d{4}|\d{1,2}[.\-]\d{1,2}[.\-]\d{4})\s*(?:r|roku)?[\s\S]{0,40}?godzin/i.exec(text);
  if (m) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  return null;
}

/** Extracts starting price (cena wywoławcza) from text. */
export function startingPriceFromText(text) {
  if (!text) return null;
  let m = /cena\s+wywo[łl]awcza[\s\S]{0,100}?wynios[łl]a?[\s\S]{0,30}?([\d\s.,]+)\s*z[łl]/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p) return p;
  }
  m = /cena\s+wywo[łl]awcza\s*(?:nieruchomo[sś]ci|przedmiotowego\s+lokalu)?\s*(?:wynosi|wynios[łl]a)?\s*[:\-–]?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  if (m) {
    const p = parsePLN(m[1]);
    if (p) return p;
  }
  return null;
}

/** Extracts achieved price (cena osiągnięta) from result notice text. */
export function achievedPriceFromText(text) {
  if (!text) return null;
  const m = /(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?\s*([\d\s.,]+)\s*z[łl]/i.exec(text);
  if (m) {
    return parsePLN(m[1]);
  }
  return null;
}

/** Outcome extractor for result notices. */
export function outcomeFromText(text) {
  if (!text) return { outcome: 'unknown', reason: null };
  if (/wynikiem\s+negatywnym|nie\s+wy[łl]oniono\s+nabywcy/i.test(text)) {
    let reason = 'brak_ofert';
    if (/nie\s+stawi[łl]|nie\s+pojawi[łl]/i.test(text)) {
      reason = 'oferent_nie_przystapil';
    } else if (/nie\s+wp[łl]aci[łl]/i.test(text)) {
      reason = 'brak_wadium';
    }
    return { outcome: 'unsold', reason };
  }
  if (/wynikiem\s+pozytywnym/i.test(text) || /nabywc[aą]/i.test(text)) {
    return { outcome: 'sold', reason: null };
  }
  return { outcome: 'unknown', reason: null };
}

/** Buyer extractor for positive-outcome result notices. */
export function buyerFromText(text) {
  if (!text) return null;
  const m = /nabywc[aą]\s+(?:ww\.?\s+)?[^.\n]*?(?:zostali|zosta[łl][aoy]?|ustalono)\s*:?\s*([^\n]+)/i.exec(text);
  if (m) {
    const cleaned = m[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/\.$/, '').trim();
    if (cleaned.length > 2 && !/przetarg|komisj/i.test(cleaned)) return cleaned;
  }
  return null;
}

/** Unit usable area in m² (powierzchnia użytkowa). */
export function unitAreaFromText(text) {
  if (!text) return null;
  const m = /pow\.?\s*u[żz]ytk\w*\.?\s*:?\s*([\d]+[,.]\d+)\s*m/i.exec(text);
  if (m) {
    const val = Number(m[1].replace(',', '.'));
    if (Number.isFinite(val) && val > 0) return val;
  }
  const m2 = /(?:powierzchni[ae]?|pow\.)\s*(?:u[żz]ytkow\w+)?\s*:?\s*([\d]+[,.]\d+)\s*m/i.exec(text);
  if (m2) {
    const val = Number(m2[1].replace(',', '.'));
    if (Number.isFinite(val) && val > 0) return val;
  }
  return null;
}

/** Plot area in m² from ha or m² (for land or total property plot). */
export function plotAreaFromText(text) {
  if (!text) return null;
  const ha = /o\s+pow(?:ierzchni)?\w*\.?\s*([\d]+[,.]\d+)\s*ha\b/i.exec(text);
  if (ha) {
    const val = Number(ha[1].replace(',', '.'));
    if (val > 0) return Math.round(val * 10000);
  }
  const m2 = /o\s+pow(?:ierzchni)?\w*\.?\s*([\d\s]+)\s*m\s*[²2]/i.exec(text);
  if (m2) {
    const val = Number(m2[1].replace(/\s/g, ''));
    if (Number.isFinite(val) && val > 0) return val;
  }
  return null;
}

/** Cadastral parcel number (działka nr ...). */
export function parcelFromText(text) {
  if (!text) return null;
  const m = /dzia[łl]k\w*\s+(?:ewidencyjn\w+\s+|ew\.\s+)?(?:nr\.?|numer\w*)\s*([\d]+(?:\/\d+)?)/i.exec(text)
    || /dzia[łl]ki\s+([0-9]+(?:\/[0-9]+)?)/i.exec(text);
  return m ? m[1].trim() : null;
}

/** Cadastral precinct (obręb ...). */
export function obrebFromText(text) {
  if (!text) return null;
  const m = /obr[ęe]b\w*\s+(\d{2,4}|[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

/** Fractional share in property (e.g. '1/2'). */
export function shareFromText(text) {
  if (!text) return null;
  if (/udzia[łl]\s+½/i.test(text)) return '1/2';
  if (/udzia[łl]\s+¼/i.test(text)) return '1/4';
  const m = /udzia[łl]\s+(\d+)\s*\/\s*(\d+)/i.exec(text);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Street name extraction for land records. */
export function landStreetFromText(text) {
  if (!text) return null;
  const m = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:icy)?\.?\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ.\- ]+?)(?=[,\s\n;]|\s+w\s+Płońsku|\s+obr[ęe]b|\s+oznaczon|$)/i.exec(text);
  if (m && !OFFICE_STREETS_RE.test(m[1])) {
    return normalizeStreetName(m[1]);
  }
  return null;
}

/**
 * Extracts property address (flat or building) from notice title and body.
 * Normalizes Polish adjectival street names to nominative form.
 * Excludes UM office street references (Płocka 39, 1-go Maja).
 */
export function addressFromText(title, text) {
  const combined = `${title || ''}\n${text || ''}`.replace(/_/g, ' ');

  // 1. Plac 15 Sierpnia / Pl. 15-go Sierpnia (also matches OCR artifact 'PI.')
  const mPlac = /(?:przy\s+|w\s+)?(?:p[li]\.?|plac(?:u)?)\s*(?:nr\s*)?(15(?:\s*-\s*go)?\s+sierpnia)\s+(\d+[A-Za-z]?)/i.exec(combined);
  if (mPlac) {
    const raw = `Pl. 15-go Sierpnia ${mPlac[2]}`;
    const parsed = parseAddress(raw);
    if (parsed) return { raw, parsed };
  }

  // 2. Unit number if present in text or title
  let apt = null;
  const mUnit = /(?:lokal(?:u|e|em)?(?:\s+mieszkaln\w+)?|\bm\.)\s*(?:nr|oznaczony\s+nr)?\s*(\d+[A-Za-z]?)/i.exec(combined);
  if (mUnit) apt = mUnit[1];

  // 3. Street + building
  const mStreet = /(?:przy\s+ul(?:icy)?\.?\s+|ul\.\s+|ulicy\s+)([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ.\- ]+?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?(?=[,\s\n]|$)/i.exec(combined);
  if (mStreet) {
    const streetCandidate = mStreet[1].trim();
    if (OFFICE_STREETS_RE.test(streetCandidate)) return null;
    const normalizedStreet = normalizeStreetName(streetCandidate);
    const building = mStreet[2].trim();
    if (!apt && mStreet[3]) apt = mStreet[3].trim();
    const raw = apt ? `ul. ${normalizedStreet} ${building}/${apt}` : `ul. ${normalizedStreet} ${building}`;
    const parsed = parseAddress(raw);
    if (parsed) return { raw, parsed };
  }

  return null;
}

/**
 * Parses an announcement document into an active listing or land record.
 */
export function parseAnnouncement(title, text, sourceUrl, detailUrl, publishedDate) {
  const t = text || '';
  const kind = classifyKind(t || title);
  const round = roundFromText(title) || roundFromText(t) || 1;
  const auctionDate = auctionDateFromText(t);
  const startingPrice = startingPriceFromText(t);
  const share = shareFromText(t);

  if (kind === 'grunt') {
    const dzialkaNr = parcelFromText(t) || parcelFromText(title);
    const obreb = obrebFromText(t);
    const street = landStreetFromText(t);
    const plotArea = plotAreaFromText(t);
    const addrRaw = street ? `ul. ${street}` : dzialkaNr ? `dz. ${dzialkaNr}` : 'Płońsk';
    return {
      kind: 'grunt',
      dzialka_nr: dzialkaNr,
      obreb,
      street,
      address_raw: addrRaw,
      area_m2: plotArea,
      starting_price_pln: startingPrice,
      auction_date: auctionDate,
      round,
      source_url: sourceUrl,
      detail_url: detailUrl,
      published_date: publishedDate || null,
    };
  }

  const addr = addressFromText(title, t);
  if (!addr) return null;

  const unitArea = unitAreaFromText(t);
  const plotArea = plotAreaFromText(t);

  return {
    kind,
    address: addr.parsed,
    address_raw: addr.raw,
    area_m2: unitArea ?? null,
    land_area_m2: plotArea ?? null,
    starting_price_pln: startingPrice,
    auction_date: auctionDate,
    round,
    share: share || undefined,
    source_url: sourceUrl,
    detail_url: detailUrl,
    published_date: publishedDate || null,
  };
}

/**
 * Parses a tender result document ("Informacja o wyniku przetargu").
 * Returns an array of result records.
 */
export function parseResultDoc(text, fallbackAuctionDate, sourceUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  if (!isResultDoc('', t)) return [];

  const kind = classifyKind(t);
  const round = roundFromText(t) || 1;
  const auctionDate = auctionDateFromText(t) || fallbackAuctionDate || null;
  const startingPrice = startingPriceFromText(t);
  const finalPrice = achievedPriceFromText(t);
  const { outcome, reason } = outcomeFromText(t);
  const buyer = buyerFromText(t);
  const share = shareFromText(t);
  const notes = [];

  if (kind === 'grunt') {
    const dzialkaNr = parcelFromText(t);
    const obreb = obrebFromText(t);
    const street = landStreetFromText(t);
    const plotArea = plotAreaFromText(t);
    const addrRaw = street ? `ul. ${street}` : dzialkaNr ? `dz. ${dzialkaNr}` : 'Płońsk';
    return [{
      kind: 'grunt',
      dzialka_nr: dzialkaNr,
      obreb,
      street,
      address_raw: addrRaw,
      area_m2: plotArea,
      starting_price_pln: startingPrice,
      final_price_pln: outcome === 'sold' ? finalPrice : null,
      outcome,
      unsold_reason: reason,
      buyer: outcome === 'sold' ? buyer : null,
      auction_date: auctionDate,
      round,
      source_pdf: sourceUrl,
      notes,
    }];
  }

  const addr = addressFromText('', t);
  if (!addr) {
    notes.push('parse: address not found in result text');
  }

  const unitArea = unitAreaFromText(t);
  const plotArea = plotAreaFromText(t);

  return [{
    kind,
    address: addr ? addr.parsed : null,
    address_raw: addr ? addr.raw : null,
    round,
    auction_date: auctionDate,
    starting_price_pln: startingPrice,
    final_price_pln: outcome === 'sold' ? finalPrice : null,
    outcome,
    unsold_reason: reason,
    buyer: outcome === 'sold' ? buyer : null,
    area_m2: unitArea ?? null,
    land_area_m2: plotArea ?? null,
    share: share || undefined,
    source_pdf: sourceUrl,
    notes,
  }];
}
