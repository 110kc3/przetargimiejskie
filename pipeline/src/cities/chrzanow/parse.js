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

// The October 2026 notice puts parcel numbers, individual areas and their total
// in separate HTML cells. One row has ONE price/date for the whole parcel group.
export function parseTableRows(html) {
  const out = [];
  for (const table of String(html || '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cell[1]));
    const header = rows[0]?.map(htmlToText) || [];
    if (header.length !== 5 || !/ewidencji.*ksi[ęe]gi/i.test(header[0])
      || !/powierzchnia.*ha/i.test(header[1]) || !/cena/i.test(header[2])
      || !/termin\s+przetargu/i.test(header[3]) || !/wadium/i.test(header[4])) continue;
    for (const cells of rows.slice(1)) {
      if (cells.length !== 5) continue;
      const subject = htmlToText(cells[0]);
      const kw = /\bKR1C\/\d+\/\d\b/.exec(subject);
      if (!kw) continue;
      const parcelText = subject.slice(0, kw.index).trim();
      if (!/^\d+(?:\/\d+)?(?:[\s,;]+\d+(?:\/\d+)?)*$/.test(parcelText)) continue;
      const parcels = [...parcelText.matchAll(/\d+(?:\/\d+)?/g)].map((match) => match[0]);
      const areaText = htmlToText(cells[1]);
      const areas = [...areaText.matchAll(/\d+[.,]\d{4}/g)].map((match) => Number(match[0].replace(',', '.')));
      if (areaText.replace(/\d+[.,]\d{4}|\s/g, '') || !areas.length) continue;
      let area;
      if (areas.length === 1) area = areas[0];
      else if (areas.length === parcels.length) area = areas.reduce((sum, value) => sum + value, 0);
      else if (areas.length === parcels.length + 1) {
        area = areas.slice(0, -1).reduce((sum, value) => sum + value, 0);
        if (Math.abs(area - areas.at(-1)) > 0.000001) continue;
      } else continue;
      const prices = cells[2].replace(/<\/p\s*>|<br\s*\/?>/gi, '\n').split('\n').map(htmlToText).filter(Boolean);
      if (prices.length !== 1 || !/^\d+(?:\s\d{3})*(?:,\d{2})?$/.test(prices[0])) continue;
      const dates = [...htmlToText(cells[3]).matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)];
      if (dates.length !== 1 || area <= 0) continue;
      const date = dates[0];
      const auction_date = `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`;
      const parsedDate = new Date(`${auction_date}T00:00:00Z`);
      if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== auction_date) continue;
      out.push({
        dzialka_nr: parcels.join(', '), area_m2: Math.round(area * 10000), kw: kw[0],
        starting_price_pln: parsePLN(prices[0]), auction_date,
        notes: parcels.length > 1 ? ['Łączna cena i powierzchnia dotyczą całego pakietu działek.'] : [],
      });
    }
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
  const tableRows = parseTableRows(html);
  return (tableRows.length ? tableRows : parseRows(text)).map((r) => ({
    kind: 'grunt', dzialka_nr: r.dzialka_nr, obreb, area_m2: r.area_m2,
    address_raw, address, starting_price_pln: r.starting_price_pln,
    auction_date: r.auction_date, round: null, detail_url: url, source_url: url,
    ...(r.notes?.length ? { notes: r.notes } : {}),
  }));
}
