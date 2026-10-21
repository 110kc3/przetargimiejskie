// Starogard Gdański parsers.
//
// Extracts:
// 1. Wykaz stream from starogard.pl/informacje-o-nieruchomosciach.html
//    (Mayoral orders designating flats, garages, plots for auction disposal).
// 2. Active/archived oral auction announcements from BIP (bip.starogard.pl) PDFs.
// 3. Concluded auction result notices from BIP (bip.starogard.pl) PDFs.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  parsePLN,
  priceFromText,
  auctionDateFromText,
} from '../../core/finn-bip.js';

export { htmlToText, parsePLN };

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
  styczeń: 1, styczen: 1, luty: 2, marzec: 3, kwiecień: 4, kwiecien: 4, maj: 5,
  czerwiec: 6, lipiec: 7, sierpień: 8, sierpien: 8, wrzesień: 9, wrzesien: 9,
  październik: 10, pazdziernik: 10, listopad: 11, grudzień: 12, grudzien: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/** Parse Polish date string to YYYY-MM-DD, handling single dates and conjoined ranges ("15 i 16 września 2020") */
export function polishDateToISO(text) {
  if (!text) return null;
  const m = /(?:(\d{1,2})\s+i\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/iu.exec(text);
  if (m) {
    const day = m[2];
    const mon = PL_MONTHS[m[3].toLowerCase()];
    if (mon) return `${m[4]}-${String(mon).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const num = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(text);
  if (num) {
    return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  }
  return null;
}

/** Convert inflected Polish street name (genitive) to nominative: "Chabrowej" -> "Chabrowa" */
export function normalizeStreetNominative(st) {
  if (!st) return st;
  return st
    .replace(/ow[ąe]j$/i, 'owa')
    .replace(/ski[ąe]j$/i, 'ska')
    .replace(/cki[ąe]j$/i, 'cka')
    .replace(/n[ąe]j$/i, 'na')
    .replace(/ej$/i, 'a');
}

/** Extract auction round from title or body */
export function roundFromStarogardText(text) {
  if (!text) return 1;
  const t = text.slice(0, 400);
  if (/pierwsz/i.test(t)) return 1;
  if (/drugi/i.test(t)) return 2;
  if (/trzeci/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  if (/pi[ąa]t(?!ek|k)/i.test(t)) return 5;
  const m = /\b(VIII|VII|VI|IX|IV|V|X|III|II|I)\s+(?:przetarg|PRZETARG)/.exec(t);
  if (m) return ROMAN[m[1]] ?? 1;
  return 1;
}

/** Extract Land Register (KW) number */
export function kwFromText(text) {
  if (!text) return null;
  const m = /\b(GD1A\/[0-9]{8}\/[0-9])\b/i.exec(text);
  if (m) return m[1].toUpperCase();
  const mShort = /KW\s*(?:lokalu\s*)?([A-Z0-9\/]+)/i.exec(text);
  if (mShort && !/gruntu|budynku/i.test(mShort[1])) return mShort[1].trim();
  return null;
}

/** Extract starting price from table rows without "zł" suffix */
function parseTablePrice(text) {
  if (!text) return null;
  const mRow = /(?:^|\n)\s*(?:[0-9]+[.,][0-9]{2}(?:\s*\+\s*[0-9]+[.,][0-9]{2})?)\s+\d+\s+[0-9.,]+\s+([0-9]{1,3}(?:\s+[0-9]{3})*(?:,[0-9]{2})?)/m.exec(text);
  if (mRow) return parsePLN(mRow[1]);
  return null;
}

/**
 * Parse the municipal wykaz board HTML (starogard.pl/informacje-o-nieruchomosciach.html).
 * Extracts mayoral orders (Zarządzenia) designating properties for auction.
 * @param {string} html
 * @param {object} ctx
 * @returns {Array<object>}
 */
export function parseWykazBoard(html, ctx = {}) {
  if (!html) return [];

  // Isolate container if present
  const mContainer = /<div class="site wysiwyg -clearafter">([\s\S]*?)<\/div>/i.exec(html);
  const rawHtml = mContainer ? mContainer[1] : html;

  const text = rawHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '-')
    .replace(/&sup2;/g, 'm²')
    .replace(/&oacute;/g, 'ó')
    .replace(/&bdquo;/g, '"')
    .replace(/&rdquo;/g, '"');

  const records = [];

  // Split into mayoral notice sections
  const sections = text.split(/(?=(?:Prezydent\s+Miasta\s+Starogard\s+Gda\u0144ski\s+informuje|Nieruchomo[śs]ci\s+Gminy\s+Miejskiej))/gi);

  for (const sec of sections) {
    if (!/Zarz[ąa]dzeni\w*\s+Nr/i.test(sec)) continue;

    // Date of notice for this section
    const secDateM = /(?:że|dnia)\s+([\d\s\wąćęłńóśźż,.-]+?)\s*r\.\s+wydan[eay]/iu.exec(sec);
    const secDate = polishDateToISO(secDateM ? secDateM[1] : null);

    // Match each Zarządzenie block within the section
    const zarzMatches = [
      ...sec.matchAll(
        /(?:Dnia\s+([\d\s\wąćęłńóśźż,.-]+?)\s*r\.\s+wydan[eay][\s\S]*?)?Zarz[ąa]dzeni\w*\s+Nr\s+([0-9]+\/[0-9]+\/[0-9]+)\s+w\s+sprawie\s+og[łl]oszenia\s+wykazu([\s\S]*?)(?=Zarz[ąa]dzeni\w*\s+Nr|Dnia\s+\d+|Informacji\s+szczeg|$)/gi,
      ),
    ];

    for (const zm of zarzMatches) {
      const explicitDateRaw = zm[1];
      const wykaz_no = zm[2];
      const body = zm[0];

      // Filter out non-auction entries (bezprzetargowe sales, leases/tenancies)
      const isDzierzawa = /dzier[żz]aw|\bnajem\b|najmu/i.test(body);
      const isBezprzetarg = /bezprzetarg|na\s+rzecz\s+najemcy/i.test(body);
      const isPrzetarg = /przetarg/i.test(body);

      if (!isPrzetarg || (isBezprzetarg && !/zbycie\s+w\s+drodze\s+przetargu/i.test(body)) || isDzierzawa) {
        continue;
      }

      // Determine published date
      const published_date = polishDateToISO(explicitDateRaw) || secDate;

      // Match flat items in the block:
      // e.g. "ul. Chojnicka 45 - lokal mieszkalny..." or "1) ul. Skarszewska 2C/14 - lokal mieszkalny..."
      const flatItemRegex =
        /(?:(\d+)\)\s*)?(ul\.\s*[A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZŻŹĆŁŚĄĘÓŃżźćłśąęóń.\s\-]+?\d+[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)\s*[-–]\s*(lokal\s+mieszkaln[\s\S]*?)(?=(?:\d+\)\s*ul\.|Dnia\s+\d+|Zarz[ąa]dzeni\w*\s+Nr|Informacji\s+szczeg|$))/gi;

      for (const match of body.matchAll(flatItemRegex)) {
        let addrRaw = match[2].replace(/\s+/g, ' ').replace(/\s*\/\s*/, '/').trim();
        // Normalize building/apt spacing, e.g. "5 B/3" -> "5B/3"
        addrRaw = addrRaw.replace(/(\d+)\s+([A-Za-z])(?=\/|\b)/, '$1$2');

        const desc = match[3].replace(/\s+/g, ' ').trim();
        // Skip if individual item is marked bezprzetargowe
        if (/bezprzetarg|na\s+rzecz\s+najemcy/i.test(desc)) continue;

        const address = parseAddress(addrRaw);
        if (!address) continue;

        // Extract area
        const areaM =
          /(?:pow\.?\s*u[żz]ytk\.?|powierzchni\s*u[żz]ytkowej|pow\.?\s*u[żz]ytkowa)\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*m/i.exec(
            desc,
          ) || /o\s+pow\.?\s*(?:u[żz]ytk\.?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*m/i.exec(desc);
        const area_m2 = areaM ? parseFloat(areaM[1].replace(',', '.')) : null;

        // Extract KW
        const kw = kwFromText(desc);

        // Extract parcel and obręb: handles działka, działki, działce, działkach
        const dzM = /dzia[łl][kc]\w*(?:[\s\S]{0,50}?)\bnr(?::|\.)?\s*([0-9]+(?:\/[0-9]+)?(?:\s*(?:,|i)\s*[0-9]+(?:\/[0-9]+)?)*)/i.exec(desc);
        const dzialka_nr = dzM ? dzM[1].replace(/\s+i\s+/g, ', ').replace(/\s+/g, ' ').trim() : null;

        const obM = /obr(?:[ęe]b\w*|\.)\s*(\d+)/i.exec(desc);
        const obreb = obM ? obM[1] : null;

        // Extract fractional share (e.g. "udział 3/4", "przynależnym udziale 77/128")
        let share = null;
        const shareM = /udzia[łl]\w*(?:\s+\S+){0,2}?\s+([1-9][0-9]*\/[1-9][0-9]*)\s*(?:cz[ęe][śs]|w\s+dzia|\b)/i.exec(desc);
        if (shareM && !/KW/i.test(shareM[0])) {
          share = shareM[1];
        }

        records.push({
          kind: 'mieszkalny',
          address_raw: addrRaw,
          address,
          area_m2,
          kw,
          dzialka_nr,
          obreb,
          share,
          wykaz_no,
          published_date,
          source_url: ctx.source_url || ctx.detail_url || 'https://starogard.pl/informacje-o-nieruchomosciach.html',
          detail_url: ctx.detail_url || ctx.source_url || 'https://starogard.pl/informacje-o-nieruchomosciach.html',
        });
      }
    }
  }

  return records;
}

/**
 * Parse an oral auction announcement document (BIP PDF text).
 * @param {string} text
 * @param {object} ctx
 * @returns {object|null}
 */
export function parseAnnouncement(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');

  const effTitle = `${ctx.title || ''} ${t.slice(0, 500)}`;
  const kind = classifyKind(effTitle);
  const isLand = kind === 'grunt';

  const round = roundFromStarogardText(t) || 1;
  const kw = kwFromText(t);

  // Auction date
  let auction_date = auctionDateFromText(t);
  if (!auction_date) {
    const dM = /przetarg\s+odb[ęe]dzie\s+si[ęe][\s\S]{0,50}?dnia\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
    if (dM) auction_date = polishDateToISO(dM[1]);
  }

  // Wadium deadline
  let wadium_deadline = null;
  const wM = /wadium[\s\S]{0,80}?najp[óo][źz]niej\s+do\s+(?:dnia\s+)?(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
  if (wM) wadium_deadline = polishDateToISO(wM[1]);

  // Viewing date
  let viewing_date = null;
  const vM = /(?:ogl[ąa]da[ćc]|ogl[ąa]dania)\s*[:\s-][\s\S]{0,40}?(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i.exec(t);
  if (vM) viewing_date = polishDateToISO(vM[1]);

  // Starting price (inline or table)
  const starting_price_pln = priceFromText(t) || parseTablePrice(t);

  // Parcel & obręb: handles działka, działki, działce, działkach
  const dzM = /dzia[łl][kc]\w*(?:[\s\S]{0,50}?)\bnr(?::|\.)?\s*([0-9]+(?:\/[0-9]+)?(?:\s*(?:,|i)\s*[0-9]+(?:\/[0-9]+)?)*)/i.exec(t);
  const dzialka_nr = dzM ? dzM[1].replace(/\s+i\s+/g, ', ').replace(/\s+/g, ' ').trim() : null;

  const obM = /obr(?:[ęe]b\w*|\.)\s*(\d+)/i.exec(t);
  const obreb = obM ? obM[1] : null;

  if (isLand) {
    const streetM = /przy\s+ul(?:\.|\w*)\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZŻŹĆŁŚĄĘÓŃżźćłśąęóń.\s\-]+?)(?=\s*[,.]|\s+pod\s+|\s+obr|\n|$)/i.exec(t);
    const street = streetM ? normalizeStreetNominative(streetM[1].trim()) : null;
    const address_raw = street ? `ul. ${street}` : null;
    const address = address_raw ? parseAddress(address_raw) : null;

    // Area
    const areaM = /o\s+powierzchni\s+([0-9\s.]+)\s*m2/i.exec(t);
    const area_m2 = areaM ? parseFloat(areaM[1].replace(/[\s.]/g, '')) : null;

    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw,
      address,
      starting_price_pln,
      auction_date,
      wadium_deadline,
      round,
      kw,
      detail_url: ctx.detail_url,
      source_url: ctx.source_url,
    };
  }

  // Flats, premises, garages
  // Address from "przy ulicy ... lokalu mieszkalnego nr ..."
  let address_raw = null;
  const aptM = /lokalu\s+mieszkalnego\s+nr\s*(\d+[A-Za-z]?)/i.exec(t);
  const apt = aptM ? aptM[1] : null;

  const bldgM = /przy\s+ulicy\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZŻŹĆŁŚĄĘÓŃżźćłśąęóń.\s\-]+?\s+\d+[A-Za-z]?)/i.exec(t);
  if (bldgM) {
    const bldg = bldgM[1].trim();
    address_raw = apt ? `ul. ${bldg}/${apt}` : `ul. ${bldg}`;
  } else {
    // Garage / other building: "przy ulicy Romualda Traugutta – działka nr 4/163"
    const stM = /przy\s+ulicy\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZŻŹĆŁŚĄĘÓŃżźćłśąęóń.\s\-]+?)(?=\s*[-–]|\s+dzia|\s+o\s+pow|\n|$)/i.exec(t);
    if (stM) {
      address_raw = `ul. ${normalizeStreetNominative(stM[1].trim())}`;
    }
  }

  // Fallback to title if address_raw not yet determined
  if (!address_raw && ctx.title) {
    const tAddrM = /przy\s+ul(?:\.|\w*)\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zA-ZŻŹĆŁŚĄĘÓŃżźćłśąęóń.\s\-]+?\d+[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)/i.exec(ctx.title);
    if (tAddrM) address_raw = `ul. ${tAddrM[1].trim()}`;
  }

  const address = address_raw ? parseAddress(address_raw) : null;
  if (!address && !dzialka_nr && !address_raw) return null;

  // Usable area:
  // 1. "29,05 + 5,92" format (usable flat area + cellar)
  let area_m2 = null;
  const plusM = /(\d{1,3}[.,]\d{2})\s*\+\s*\d{1,3}[.,]\d{2}/.exec(t);
  if (plusM) {
    area_m2 = parseFloat(plusM[1].replace(',', '.'));
  }

  // 2. Standard inline area: "powierzchni użytkowej garażu 15,65 m2" or "powierzchnia użytkowa lokalu ... 29,05 m2"
  if (area_m2 == null) {
    const aM =
      /(?:powierzchni\w*|pow\.)\s*(?:u[żz]ytkow\w*)?(?:\s+gara[żz]u|\s+lokalu)?\s*[:\s-]?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*m/i.exec(
        t,
      );
    if (aM) {
      area_m2 = parseFloat(aM[1].replace(',', '.'));
    }
  }

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    kw,
    dzialka_nr,
    obreb,
    wadium_deadline,
    viewing_date,
    detail_url: ctx.detail_url,
    source_url: ctx.source_url,
  };
}

/**
 * Parse an auction result protocol document (BIP PDF text).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @param {object} ctx
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl, ctx = {}) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');

  if (!/informuje\s+o\s+wyniku|wynik\w*\s+przetargu/i.test(t)) {
    return [];
  }

  const round = roundFromStarogardText(t);
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const kw = kwFromText(t);

  const obM = /obr(?:[ęe]b\w*|\.)\s*(\d+)/i.exec(t);
  const obreb = obM ? obM[1] : null;

  const stM = /przy\s+ul(?:\.|\w*)\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)/i.exec(t);
  const street = stM ? normalizeStreetNominative(stM[1].trim()) : null;

  const lines = t.split('\n');
  const records = [];

  for (const line of lines) {
    // Row starts with "1.", "2.", etc.
    const mRow = /^\s*(\d+)\.\s+(\S+)/.exec(line);
    if (!mRow) continue;

    const parts = line.trim().split(/\s{2,}/);
    if (parts.length < 5) continue;

    const dzialka_nr = parts[1];
    // Area
    const rawArea = parts[2].replace(/\s/g, '').replace(',', '.');
    const area_m2 = parseFloat(rawArea);

    // Identify starting price, achieved price, and buyer
    const buyer = parts[parts.length - 1].trim();
    const isUnsold = /brak|nie|———|---/i.test(buyer) || parts.some((p) => p === '———' || p === '---');

    let starting_price_pln = null;
    let final_price_pln = null;

    for (let i = 3; i < parts.length - 1; i++) {
      const p = parts[i].trim();
      if (p === '———' || p === '---' || /^\d+\/\d+$/.test(p)) continue;
      const parsed = parsePLN(p);
      if (parsed != null && parsed > 0) {
        if (starting_price_pln == null) {
          starting_price_pln = parsed;
        } else if (final_price_pln == null) {
          final_price_pln = parsed;
        }
      }
    }

    const outcome = !isUnsold && final_price_pln != null ? 'sold' : 'unsold';
    const unsold_reason = outcome === 'unsold' ? 'no_bidders' : null;

    records.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: Number.isFinite(area_m2) ? area_m2 : null,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? final_price_pln : null,
      outcome,
      unsold_reason,
      kw,
      address_raw: street ? `ul. ${street}` : null,
    });
  }

  return records;
}
