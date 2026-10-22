// Grodzisk Wielkopolski parsers.
//
// Burmistrz Grodziska Wielkopolskiego publishes auction announcements and results
// in BIP menu 512 ("Przetargi"). Both types of notices contain inline HTML tables
// in the article `content`.
//
// ANNOUNCEMENT TABLE FORMAT:
//   Header cell: "[I|II|III] PRZETARG USTNY NIEOGRANICZONY na sprzedaż nieruchomości..."
//   Columns: Lp | Przedmiot sprzedaży | Opis lokalu | Opis gruntu | Forma sprzedaży | Cena wywoławcza netto | Wadium
//   Address info is in "Przedmiot sprzedaży" ("Lokal mieszkalny nr 2 ... przy ul. Kolejowej 9 ...").
//   Area is in "Opis lokalu" ("Powierzchnia użytkowa lokalu wynosi 67,80 m²").
//   Date & wadium deadline are in post-table prose ("Przetarg odbędzie się w dniu 18.05.2026r. ...").
//
// RESULT TABLE FORMAT:
//   Header: "INFORMACJA O WYNIKACH PRZETARGU ... który odbył się w dniu 18.05.2026r."
//   Columns: Lokale mieszkalne | Pow. użytkowa | Nr KW lokalu | Wadium | Cena wywoławcza | Cena wylicytowana w zł brutto | Liczba osób dopuszczonych | Imię i nazwisko nabywcy
//   Mixed notices carry land plots first, then a subheader "Lokale mieszkalne".

import { parseAddress, nominativeStreetDisplay } from '../../core/normalize.js';

const ROMAN_ROUNDS = {
  V: 5,
  IV: 4,
  III: 3,
  II: 2,
  I: 1,
};

/**
 * Clean HTML markup, unescape entities, and collapse whitespace.
 * @param {string} s
 * @returns {string}
 */
export function cleanHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&Oacute;/gi, 'Ó')
    .replace(/&sup2;/gi, '²')
    .replace(/&sup3;/gi, '³')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse Polish currency amount in PLN to integer.
 * e.g. "200.000,00 zł", "125.000 zł", "202 000 zł" -> 200000, 125000, 202000
 * @param {string} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  const str = cleanHtml(String(s)).replace(/[\s\u00a0]/g, '').replace(/z[łl].*$/i, '');
  if (!str || str === '-') return null;
  const m = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[,.]\d{2})?$/.exec(str);
  if (!m) return null;
  return Number(m[1].replace(/[.,]/g, ''));
}

/**
 * Parse comma-decimal number.
 * e.g. "67,80" -> 67.8, "35.49" -> 35.49
 * @param {string} s
 * @returns {number|null}
 */
export function parseNum(s) {
  if (!s) return null;
  const str = cleanHtml(String(s));
  const m = /(\d+)(?:[,.](\d+))?/.exec(str);
  if (!m) return null;
  return Number(m[1] + '.' + (m[2] || '0'));
}

/**
 * Extract date in ISO format YYYY-MM-DD from Polish date strings like "18.05.2026r." or "18.05. 2026".
 * @param {string} s
 * @returns {string|null}
 */
export function extractDate(s) {
  if (!s) return null;
  const m = /(\d{2})[.\s/]+(\d{2})[.\s/]+(\d{4})/.exec(s);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Extract round numeral (1-5) from text.
 * @param {string} text
 * @returns {number}
 */
export function extractRound(text) {
  const m = /\b(V|IV|III|II|I)\s+PRZETARG/i.exec(text || '');
  if (m) {
    const key = m[1].toUpperCase();
    if (ROMAN_ROUNDS[key]) return ROMAN_ROUNDS[key];
  }
  return 1;
}

/**
 * Check if an announcement or result article relates to residential flats.
 * Filters out pure land, commercial, lease, or vehicle tenders.
 * @param {string} title
 * @param {string} [html]
 * @returns {boolean}
 */
export function isFlatNotice(title, html) {
  const t = (title || '').toLowerCase();
  if (/dow[óo]z|siwz|zam[óo]wie[ńn]|sto[łl][óo]wek|remont/i.test(t)) return false;
  if (/dzier[żz]aw|najem/i.test(t)) return false;
  if (/roln/i.test(t)) return false;
  if (/lokal/i.test(t)) return true;

  const body = (html || '');
  // Match genuine flat nouns, avoiding word stems like "zlokalizowany" or "lokalizacji"
  return /\blokal(u|e|i|em|om|ach)?\s+mieszkaln/i.test(body) ||
         /\bnieruchomo[śs]ci\s+lokal/i.test(body);
}

/**
 * Extract flat address from an announcement cell's text description.
 * e.g. "Lokal mieszkalny nr 2 ... przy ul. Kolejowej 9 i w prawie..."
 * -> "Kolejowa 9/2"
 * @param {string} text
 * @returns {{ address_raw: string, address: object|null }|null}
 */
export function extractAnnouncementAddress(text) {
  const cleaned = cleanHtml(text);
  const aptM = /\blokal\w*\s+(?:mieszkaln\w*\s+)?nr\s*(\d+[a-zA-Z]?)/i.exec(cleaned);
  const apt = aptM ? aptM[1] : null;

  const addrM = /przy\s+(?:ul\.|ulicy|os\.|osiedlu)?\s*([0-9A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ\.\s\-]+?\s+\d+[a-zA-Z]?(?:-\d+)?)(?=\s+(?:i\s+w|i\s+udzia|\bzapisanej|\boznaczon|\bw\s+studium|$))/i.exec(cleaned);
  if (!addrM) return null;

  const streetBldg = addrM[1].trim();
  let streetName = streetBldg.replace(/\s+\d+[a-zA-Z]?$/, '');
  const bldgNo = streetBldg.match(/\d+[a-zA-Z]?$/)?.[0] || '';
  streetName = nominativeStreetDisplay(streetName);

  const raw = `${streetName} ${bldgNo}${apt ? '/' + apt : ''}`.trim();
  return {
    address_raw: raw,
    address: parseAddress(raw),
  };
}

/**
 * Parse an announcement article (HTML) into flat listing records.
 * @param {string} html
 * @param {{ title: string, detail_url: string }} meta
 * @returns {Array<object>}
 */
export function parseAnnouncement(html, { title, detail_url }) {
  if (!html || !isFlatNotice(title, html)) return [];

  const text = cleanHtml(html);
  const round = extractRound(text);

  const dateM =
    /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text) ||
    /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text);
  const auction_date = dateM ? extractDate(dateM[1]) : null;

  const timeM = /o\s+godzinie\s*(\d{1,2}[:.]\d{2})/i.exec(text);
  const auction_time = timeM ? timeM[1].replace('.', ':') : null;

  const wadiumDateM = /wp[łl]acenie\s+wadium\s+do\s+dnia\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text);
  const wadium_deadline = wadiumDateM ? extractDate(wadiumDateM[1]) : null;

  const rows = (html.match(/<tr[\s\S]*?<\/tr>/gi) || []).map((r) =>
    (r.match(/<td[\s\S]*?<\/td>/gi) || []).map(cleanHtml),
  );

  const listings = [];
  for (const cells of rows) {
    if (cells.length < 5 || /Przedmiot sprzeda/i.test(cells[1]) || !cells[0]) continue;
    const subject = cells[1];
    const desc = cells[2];
    const priceStr = cells[5];
    const wadiumStr = cells[6];

    // Must be a flat subject
    if (!/\blokal\w*\s+mieszkaln/i.test(subject)) continue;

    const parsedAddr = extractAnnouncementAddress(subject);
    if (!parsedAddr || !parsedAddr.address) continue;

    const areaM = /(\d+(?:[.,]\d+)?)\s*m[²2]/i.exec(desc);
    const area_m2 = areaM ? parseNum(areaM[1]) : null;

    listings.push({
      url: detail_url,
      title: title || 'Ogłoszenie o przetargu na sprzedaż nieruchomości lokalowych',
      address_raw: parsedAddr.address_raw,
      address: parsedAddr.address,
      kind: 'mieszkalny',
      area_m2,
      starting_price_pln: parsePLN(priceStr),
      wadium_pln: parsePLN(wadiumStr),
      wadium_deadline,
      auction_date,
      auction_time,
      round,
      round_source: 'explicit',
      notes: [],
    });
  }

  return listings;
}

/**
 * Parse a result document (HTML or text) into flat result records.
 * Concluded records feed the achieved-price stream.
 * @param {string} html
 * @param {string|null} [fallbackDate]
 * @param {string} [sourceUrl]
 * @returns {Array<object>}
 */
export function parseResultDoc(html, fallbackDate = null, sourceUrl = '') {
  if (!html) return [];

  const text = cleanHtml(html);
  const dateM =
    /odby[łl]\s+si[ęe]\s+w\s+dniu\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text) ||
    /z\s+dnia\s*(\d{2}[.\s/]+\d{2}[.\s/]+\d{4})/i.exec(text);
  const auction_date = dateM ? extractDate(dateM[1]) : fallbackDate || null;

  const rows = (html.match(/<tr[\s\S]*?<\/tr>/gi) || []).map((r) =>
    (r.match(/<td[\s\S]*?<\/td>/gi) || []).map(cleanHtml),
  );

  const results = [];
  let inFlatsSection = false;

  for (const cells of rows) {
    if (!cells.length) continue;
    const joined = cells.join(' ');

    if (/Lokale mieszkalne/i.test(joined)) {
      inFlatsSection = true;
    }
    if (/Dzia[łl]ki|grunty/i.test(joined) && !/Lokale/i.test(joined)) {
      inFlatsSection = false;
    }

    // Skip table header rows
    if (/Nr KW|Pow\.|Wadium|Cena wywo/i.test(joined) && /Cena wylicyt/i.test(joined)) {
      continue;
    }

    // Decide if row represents a flat
    const isFlatRow =
      inFlatsSection ||
      /lokal\s+mieszkaln/i.test(cells[0]) ||
      /m[²2]/i.test(cells[1]) ||
      /ul\.|os\./i.test(cells[0]);

    if (!isFlatRow) continue;

    // Clean address cell
    let rawAddr = cells[0]
      .replace(/Grodzisk\s+Wlkp\.?/gi, '')
      .replace(/Lokal\s+mieszkalny\s+/gi, '')
      .replace(/\(dz\.\s*nr\s*([^)]+)\)/gi, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    const address = parseAddress(rawAddr);
    if (!address) continue;

    const area_m2 = parseNum(cells[1]);
    const starting_price_pln = parsePLN(cells[4]);
    const final_price_pln = parsePLN(cells[6]) || parsePLN(cells[5]);
    const buyerCell = cells[8] && cells[8] !== '-' ? cells[8].trim() : null;
    const sold = final_price_pln != null && Boolean(buyerCell);
    const outcome = sold ? 'sold' : 'unsold';

    let unsold_reason = null;
    if (!sold) {
      if (cells[7] === '0/0' || /nie\s+wp[łl]yn[ęe][łl]y\s+[żz]adne\s+wadium/i.test(text)) {
        unsold_reason = 'no_wadium';
      } else if (/nie\s+zaoferowa[łl]y\s+post[ąa]pienia/i.test(text) || cells[7]?.startsWith('1/')) {
        unsold_reason = 'no_bids';
      } else {
        unsold_reason = 'unknown';
      }
    }

    results.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw: rawAddr,
      address,
      round: null,
      starting_price_pln,
      final_price_pln: sold ? final_price_pln : null,
      outcome,
      unsold_reason,
      area_m2,
      buyer: sold ? buyerCell : null,
      notes: [],
    });
  }

  return results;
}
