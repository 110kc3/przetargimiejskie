// Chrzanów parsers. Land announcements are MULTI-PROPERTY TABLES — one row per
// działka: "49/283 – 0,0912 KR1C/00104660/5 205 000 19.11.2025 - 11.00 41 000"
// (nr – pow. ha – KW – cena – termin przetargu/godz – wadium). Groundtruthed
// against the real notice (Borowcowa, obręb Pogorzyce: dz. 49/283 = 205 000 zł and
// 49/284 = 217 000 zł, przetarg 19.11.2025). Reuses finn-bip htmlToText/parsePLN +
// parseAddress; result notices ("Wyniki przetargów") follow the standard
// achieved-price grammar.

import { parseAddress } from '../../core/normalize.js';
import { htmlToText, parsePLN } from '../../core/finn-bip.js';

export { htmlToText };

export function isSaleAnnouncement(text) {
  const t = (text || '').toLowerCase();
  if (/dzier[żz]aw|\bnajem\b|najmu|wynajem|bezprzetarg/.test(t)) return false;
  if (/^\s*wykaz|zamiar\s+sprzeda/.test(t)) return false;
  return /og[łl]asza/.test(t) && /przetarg/.test(t) && /sprzeda/.test(t);
}

export function obrebFromText(text) { const m = /obr[ęe]b\w*\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+)/.exec(text || ''); return m ? m[1] : null; }
export function streetFromText(text) {
  const m = /(?:w\s+rejonie|przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)(?=\s*[,.]|\s+w\s+|\n|$)/.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim() : null;
}

// One row per priced działka: "<nr> – <ha> [(udz…)] <KW> <cena> <DD.MM.YYYY>".
// The shared road działka (udział, no cena) lacks the cena→date run and is skipped.
const ROW_RE = /(\d+\/\d+)\s*[–-]\s*(\d+,\d+)\s*(?:\([^)]*\))?\s*(KR1C\/\d+\/\d)\s+(\d[\d  ]*\d)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/g;
export function parseRows(text) {
  const out = [];
  const re = new RegExp(ROW_RE.source, 'g');
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const ha = Number(m[2].replace(',', '.'));
    out.push({ dzialka_nr: m[1], area_m2: ha > 0 ? Math.round(ha * 10000) : null, kw: m[3], starting_price_pln: parsePLN(m[4]), auction_date: `${m[7]}-${m[6].padStart(2, '0')}-${m[5].padStart(2, '0')}` });
  }
  return out;
}

/** Parse one announcement → an ARRAY of land records (one per priced row). */
export function parseAnnouncement(title, html, url) {
  const text = htmlToText(html);
  if (!isSaleAnnouncement(text)) return [];
  const obreb = obrebFromText(text);
  const street = streetFromText(text);
  const address_raw = street ? `ul. ${street}` : null;
  const address = address_raw ? parseAddress(address_raw) : null;
  return parseRows(text).map((r) => ({
    kind: 'grunt', dzialka_nr: r.dzialka_nr, obreb, area_m2: r.area_m2,
    address_raw, address, starting_price_pln: r.starting_price_pln,
    auction_date: r.auction_date, round: null, detail_url: url, source_url: url,
  }));
}
