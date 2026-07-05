// Bochnia parsers. bochnia.eu is WordPress; announcement + result notices are
// plain HTML article bodies (no PDF, no OCR). Reuses core/finn-bip.js body
// helpers (htmlToText, areaFromText, priceFromText, auctionDateFromText,
// roundFromTitle, addressFrom, resolveKind, parsePLN); the land + result
// deviations below are Bochnia-specific. Groundtruthed against REAL live bodies
// (verified 2026-07-05):
//   flat announcement  — Murowianka 1/1, II przetarg, 43,89 m², 136 800 zł, held 2024-01-12
//   flat result (unsold)— Floris 3/2, II, wywoławcza 180 000, wynik negatywny (brak oferentów)
//   land result (sold) — Smyków, dz. 1258/42, obręb Bochnia-2, 0,1059 ha, I,
//                         wywoławcza 188 000 → wylicytowana 189 900, held 2026-04-13
//
// Bochnia deviations vs the shared FINN helpers:
//   - RESULT auction date reads "informację o wyniku … przetargu … z dnia <date>
//     przeprowadzonego". A legal-reference "z dnia 14 września 2004 r." (the
//     Rozporządzenie) precedes it, and core auctionDateFromText only anchors
//     "odbędzie się"/"w dniu", so the date is anchored AFTER "o wyniku".
//   - ACHIEVED price reads "Wylicytowana cena … wyniosła <kwota> zł netto"
//     (not the "cena osiągnięta … wyniosła" of other cities).
//   - the office street "ul. Kazimierza Wielkiego" (Urząd Miasta) must never be
//     taken as the property street.

import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText, parsePLN, areaFromText, priceFromText, auctionDateFromText,
  roundFromTitle, addressFrom, resolveKind,
} from '../../core/finn-bip.js';

export { htmlToText };

const OFFICE_STREET_RE = /kazimierza\s+wielk/i; // Urząd: ul. Kazimierza Wielkiego 2

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

// ---------------------------------------------------------------- title routing

export function isResultTitle(title) {
  return /o\s+wyniku|^\s*wyniki\b/i.test(title || '');
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem|bezprzetarg/.test(t)) return false;
  if (/^\s*wykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}

// -------------------------------------------------------------- unit extractors

// Body round fallback: "<ROMAN> przetarg ustny …". Case-SENSITIVE roman (a
// lowercase "i" is the Polish conjunction, not round 1).
export function roundFromBody(text) {
  const m = /\b(VIII|VII|VI|IX|IV|V|X|I{1,3})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? ROMAN[m[1]] ?? null : null;
}

function isoSpelled(m) {
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
function isoNumeric(m) {
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// RESULT auction date. The operative sentence reads "…o wyniku … przetargu
// ustnego … z dnia <date> r. przeprowadzonego w budynku …". The date sits
// immediately before "przeprowadzon", which is what distinguishes it from the
// leading legal-reference date "z dnia 14 września 2004 r. w sprawie …" (which is
// followed by "w sprawie", never "przeprowadzon"). Folding the post TITLE into the
// text — the title also carries "o wyniku" — is exactly why an "o wyniku"-anchored
// scan grabbed the 2004 ref on short titles; the "przeprowadzon" anchor is immune.
export function resultDateFromText(text) {
  const t = text || '';
  // Primary: date immediately before "przeprowadzon".
  let m = /z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r?\.?\s*przeprowadzon/i.exec(t);
  if (m) { const iso = isoSpelled(m); if (iso) return iso; }
  m = /z\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\.?\s*przeprowadzon/i.exec(t);
  if (m) return isoNumeric(m);
  // Fallback: date right after "…przetargu ustnego [nieograniczonego] z dnia …".
  m = /przetarg\w*\s+ustn\w*(?:\s+(?:nie)?ograniczon\w*)?\s+z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) { const iso = isoSpelled(m); if (iso) return iso; }
  return auctionDateFromText(t);
}

// Achieved price: "Wylicytowana cena … wyniosła 189 900,00 zł netto" → 189900.
// Also tolerates the "(najwyższa) cena osiągnięta … wyniosła …" phrasing.
export function achievedPriceFromText(text) {
  const m = /(?:wylicytowan\w*\s+cen\w*|(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta)[\s\S]{0,80}?wynios[łl]a\s*[:\-–]?\s*([\d][\d.,\s -]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

// ----------------------------------------------------------------- land helpers

export function parcelFromText(text) {
  const m = /dzia[łl]k\w*\s+(?:ewidencyjn\w+\s+)?(?:nr\.?|numer\w*)\s+([\d]+(?:\/\d+)?(?:\s*(?:,|i)\s*(?:nr\s*)?\d+(?:\/\d+)?)*)/i.exec(text || '');
  if (!m) return null;
  const nums = m[1].split(/\s*(?:,|i)\s*/).map((x) => x.replace(/^nr\s*/i, '').trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/.exec(text || '');
  return m ? m[1].trim() : null;
}

export function plotAreaFromText(text) {
  const ha = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(text || '');
  if (m2) { const v = Number(m2[1].replace(/[\s ]/g, '')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

export function landStreetFromText(text) {
  const re = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,;.]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+obr[ęe]b|\s+oznaczon|\s+ksi|\n|$)/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (s && !OFFICE_STREET_RE.test(s)) return s;
  }
  return null;
}

// --------------------------------------------------------------------- parsers

export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  const kind = resolveKind(title, text);
  const round = roundFromTitle(title) ?? roundFromBody(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const street = landStreetFromText(text);
    if (!dzialka_nr && !street) return null;
    const address_raw = street ? `ul. ${street}` : null;
    return {
      kind: 'grunt', dzialka_nr, obreb: obrebFromText(text), area_m2: plotAreaFromText(text),
      address_raw, address: address_raw ? parseAddress(address_raw) : null,
      starting_price_pln, auction_date, round, detail_url: url, source_url: url,
    };
  }

  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(text),
    starting_price_pln, auction_date, round, detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!/o\s+wyniku|wynik\w*\s+\w*\s*przetarg|cena\s+osi[ąa]gni[ęe]ta|wylicytowan|wynikiem\s+negatywnym/i.test(t)) return [];
  const notes = [];
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromTitle(t) ?? roundFromBody(t);
  const starting_price_pln = priceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negativeStated = /wynikiem\s+negatywnym|brak\s+(?:ofert|oferent|uczestnik)|nie\s+wy[łl]oniono|nie\s+przyst[ąa]pi|nie\s+odnotowano/i.test(t);
  const kind = resolveKind('', t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const street = landStreetFromText(t);
    if (!dzialka_nr && !street) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: obrebFromText(t),
      area_m2: plotAreaFromText(t), address_raw: street ? `ul. ${street}` : null, round,
      starting_price_pln, final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    }];
  }

  const addr = addressFrom('', t);
  if (!addr) return [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: areaFromText(t), notes,
  }];
}
