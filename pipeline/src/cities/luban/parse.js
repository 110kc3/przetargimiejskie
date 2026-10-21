// Lubań parsers.
// Full inline HTML announcements on luban.pl (/1333 hub).
// Reuses core utilities (finn-bip, normalize, classify-kind).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  parsePLN,
  priceFromText,
  areaFromText,
  auctionDateFromText,
} from '../../core/finn-bip.js';

export { htmlToText, parsePLN, priceFromText, areaFromText, auctionDateFromText };

/**
 * Extract the article's main content body from full page HTML.
 * Cuts out outer chrome, navigation headers, and sidebar/footer widgets.
 * @param {string} html
 * @returns {string}
 */
export function extractArticleBody(html) {
  if (!html) return '';
  const dStart = html.indexOf('<div class="description">');
  if (dStart === -1) return html;
  const dEnd = html.indexOf('col-sm-3  col-sm-pull-9 sidebar', dStart);
  return dEnd !== -1 ? html.slice(dStart, dEnd) : html.slice(dStart);
}

/**
 * Check if the text represents an open municipal property sale auction.
 * Rejects rentals/leases, bezprzetargowe sales, pre-auction wykaz notices.
 * @param {string} title
 * @param {string} text
 * @returns {boolean}
 */
export function isSaleAnnouncement(title, text) {
  const combined = `${title || ''} ${text || ''}`.toLowerCase();
  if (/bezprzetargow|najem|dzier[żz]aw|rezerwacj/i.test(combined)) return false;
  if (/^komunikat\b/i.test(title || '') && !/og[łl]asza[\s\S]{0,40}przetarg/i.test(text || '')) return false;
  if (/wykaz\s+nieruchomo[śs]ci/i.test(title || '') && !/og[łl]asza[\s\S]{0,40}przetarg/i.test(text || '')) return false;
  return /przetarg/i.test(combined) && /sprzeda[żz]|zbyci/i.test(combined);
}

/**
 * Determine auction round from title or announcement body.
 * Tolerates spaced letters in Lubań's "o g ł a s z a ... przetarg".
 * @param {string} title
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromAnnouncement(title, text) {
  const t = title || '';
  if (/pierwsz/i.test(t) || /\bI\s+przetarg/i.test(t)) return 1;
  if (/drug/i.test(t) || /\bII\s+przetarg/i.test(t)) return 2;
  if (/trzeci/i.test(t) || /\bIII\s+przetarg/i.test(t)) return 3;
  if (/czwart/i.test(t) || /\bIV\s+przetarg/i.test(t)) return 4;
  if (/pi[ąa]t(?!ek\b|k)/i.test(t) || /\bV\s+przetarg/i.test(t)) return 5;

  const norm = (text || '').replace(/o\s+g\s+ł\s+a\s+s\s+z\s+a/gi, 'ogłasza');
  const m = /og[łl]asza\s+([\s\S]{0,60}?)przetarg/i.exec(norm);
  if (m) {
    const scope = m[1];
    if (/pierwsz/i.test(scope)) return 1;
    if (/drug/i.test(scope)) return 2;
    if (/trzeci/i.test(scope)) return 3;
    if (/czwart/i.test(scope)) return 4;
    if (/pi[ąa]t/i.test(scope)) return 5;
    const rom = /(VIII|VII|VI|IX|IV|V|X|I{1,3})\b/.exec(scope);
    if (rom) {
      const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
      return map[rom[1]] ?? null;
    }
  }

  return /przetarg/i.test(t) || /przetarg/i.test(text || '') ? 1 : null;
}

/**
 * Extract flat/building address from HTML and plain text.
 * Prioritizes the official wadium title instruction:
 *   "W tytule wpłaty wadium ... dopisać: „Przetarg lokal <Street> <Building>/<Apt>”"
 * and strong bullet tags, falling back to prose phrasing.
 * @param {string} html
 * @param {string} text
 * @returns {{address_raw:string, address:object}|null}
 */
export function extractFlatAddress(html, text) {
  // 1. Wadium title instruction pattern:
  // e.g. "W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Warszawska 3/2”"
  const wm = /(?:w\s+tytule\s+wp[łl]aty\s+wadium|tytu[łl]\s+wp[łl]aty)[^„"«»]*[„"«»]([^"”«»]+)[”"«»]/i.exec(text || '');
  if (wm) {
    let clean = wm[1]
      .replace(/^(?:przetarg|wadium)\s+/i, '')
      .replace(/^lokal(?:\s+mieszkalny)?\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!/^(ul\.|ulicy|al\.|alei|pl\.|plac)\b/i.test(clean)) clean = 'ul. ' + clean;
    const addr = parseAddress(clean);
    if (addr && addr.building) return { address_raw: clean, address: addr };
  }

  // 2. Strong bullet or section header in HTML:
  // e.g. <li><strong> Warszawska 3/2 </strong></li> or <p><strong>Leśna 44D/5</strong></p>
  const liM = /<(?:li|p|span|h\d)[^>]*>\s*<strong>\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ0-9\.\- ]+?\s+\d+[A-Za-z]?\/\d+[A-Za-z]?)\s*<\/strong>/i.exec(html || '');
  if (liM) {
    let raw = liM[1].trim();
    if (!/^(ul\.|ulicy|al\.|alei|pl\.|plac)\b/i.test(raw)) raw = 'ul. ' + raw;
    const addr = parseAddress(raw);
    if (addr && addr.building) return { address_raw: raw, address: addr };
  }

  // 3. Prose pattern: "lokalu mieszkalnego Nr 2 znajdującego się w budynku położonym w Lubaniu przy ul. Warszawskiej 3"
  const proseM = /lokalu\s+mieszkalnego\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)[^.]*?przy\s+(?:ul\.|ulicy|al\.|alei|pl\.|placu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)(?=\s+wraz|\s+o\s+pow|[,.;]|$)/i.exec(text || '');
  if (proseM) {
    const apt = proseM[1];
    const street = proseM[2].trim();
    const bldg = proseM[3].trim();
    const prefix = /^(plac|pl\.)/i.test(street) ? '' : 'ul. ';
    const raw = `${prefix}${street} ${bldg}/${apt}`;
    const addr = parseAddress(raw);
    if (addr && addr.building) return { address_raw: raw, address: addr };
  }

  // 4. Fallback pattern: street + building with flat number elsewhere
  const altM = /przy\s+(?:ul\.|ulicy|al\.|alei|pl\.|placu)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/i.exec(text || '');
  const aptM = /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i.exec(text || '');
  if (altM && aptM) {
    const street = altM[1].trim();
    const bldg = altM[2].trim();
    const apt = aptM[1];
    const prefix = /^(plac|pl\.)/i.test(street) ? '' : 'ul. ';
    const raw = `${prefix}${street} ${bldg}/${apt}`;
    const addr = parseAddress(raw);
    if (addr && addr.building) return { address_raw: raw, address: addr };
  }

  // 5. Standalone building / house sale without apartment:
  // e.g. "sprzedaż budynku mieszkalnego przy ul. Leśnej 43"
  const bldgM = /sprzeda[żz]\s+budynku(?:\s+mieszkalnego)?[^.]*?przy\s+(?:ul\.|ulicy)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)/i.exec(text || '');
  if (bldgM) {
    const street = bldgM[1].trim();
    const bldg = bldgM[2].trim();
    const raw = `ul. ${street} ${bldg}`;
    const addr = parseAddress(raw);
    if (addr && addr.building) return { address_raw: raw, address: addr };
  }

  return null;
}

/**
 * Resolve property asset kind for Lubań.
 * When the title is generic ("Burmistrz Miasta Lubań ogłasza pierwszy przetarg..."),
 * inspects the operative "na sprzedaż / na zbycie ..." sentence.
 * @param {string} title
 * @param {string} text
 * @returns {'mieszkalny'|'zabudowana'|'uzytkowy'|'garaz'|'grunt'|'unknown'}
 */
export function resolveKind(title, text) {
  const k = classifyKind(title || '');
  if (k !== 'unknown') return k;

  const operative = /na\s+(?:sprzeda[żz]|zbycie)\s+([\s\S]{0,180}?)(?:wraz|\(dzia[łl]k|\.|\n|$)/i.exec(text || '');
  if (operative) {
    const opKind = classifyKind(operative[1]);
    if (opKind !== 'unknown') return opKind;
  }

  return classifyKind(`${title || ''} ${(text || '').slice(0, 1000)}`);
}

/**
 * Parse a land auction announcement.
 * Extracts parcel number, obręb, plot area, street, price, date, round.
 * @param {string} title
 * @param {string} html
 * @param {string} url
 * @param {string|null} publishedDate
 * @returns {object|null}
 */
export function parseLandAnnouncement(title, html, url, publishedDate = null) {
  const bodyHtml = extractArticleBody(html);
  const text = htmlToText(bodyHtml);

  // Parcel numbers: match all parcels designated as "działka nr X" or "i nr Y"
  const parcels = [];
  for (const m of text.matchAll(/(?:dzia[łl][ek]{1,2}\w*\s+(?:oznaczon\w*\s+geodezyjnie\s+jako\s+)?(?:nr\.?|numer)?|i\s+nr)\s*(\d+(?:\/\d+)?)/gi)) {
    if (!parcels.includes(m[1])) parcels.push(m[1]);
  }
  const dzialka_nr = parcels.length ? parcels.join(', ') : null;

  // Obręb: e.g. "Obręb II" or "Obręb III"
  const obrebM = /obr[ęe]b\w*\s+([I|V|X\d]+|[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)/i.exec(text);
  const obreb = obrebM ? obrebM[1].trim() : null;

  // Plot area: e.g. "o powierzchni 1 115 m 2" or "o powierzchni 718 m2"
  let area_m2 = null;
  const areaM = /o\s+powierzchni\s+([\d\s]+(?:,\d+)?)\s*m\s*[²2]/i.exec(text);
  if (areaM) {
    const raw = areaM[1].replace(/[\s ]/g, '').replace(',', '.');
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) area_m2 = n;
  }

  // Street: e.g. "przy ulicy Na Skarpie" or "przy ulicy Zawidowskiej"
  let street = null;
  let address_raw = null;
  let address = null;
  const streetM = /przy\s+(?:ulicy|ul\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ\- ]+?)(?=\s*[,;.]|\s+w\s+|\s+oznaczon|\s+w\s+skład|\s+dla\s+której|$)/i.exec(text);
  if (streetM) {
    street = streetM[1].trim();
    address_raw = `ul. ${street}`;
    address = parseAddress(address_raw) || null;
  }

  if (!dzialka_nr && !street) return null;

  return {
    kind: 'grunt',
    dzialka_nr,
    obreb,
    zoning: null,
    address_raw,
    street,
    building: null,
    address,
    area_m2,
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    published_date: publishedDate,
    round: roundFromAnnouncement(title, text),
    detail_url: url,
    source_url: url,
    geoportal_url: null,
  };
}

/**
 * Parse one Lubań announcement into a listing or land record.
 * @param {string} title
 * @param {string} html
 * @param {string} url
 * @param {string|null} publishedDate
 * @returns {object|null}
 */
export function parseAnnouncement(title, html, url, publishedDate = null) {
  const bodyHtml = extractArticleBody(html);
  const text = htmlToText(bodyHtml);

  if (!isSaleAnnouncement(title, text)) return null;

  const kind = resolveKind(title, text);

  if (kind === 'grunt') {
    return parseLandAnnouncement(title, html, url, publishedDate);
  }

  const addr = extractFlatAddress(bodyHtml, text);
  if (!addr) return null;

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    auction_date: auctionDateFromText(text),
    published_date: publishedDate,
    round: roundFromAnnouncement(title, text),
    detail_url: url,
  };
}

/**
 * Result doc stub — Lubań publishes no separate concluded-price documents.
 * Negative round outcomes appear inline in subsequent announcements.
 * @returns {any[]}
 */
export function parseResultDoc(_text, _date, _url) {
  return [];
}
