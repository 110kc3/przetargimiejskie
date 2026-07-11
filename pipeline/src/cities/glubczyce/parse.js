// Głubczyce parsers (Gmina Głubczyce — powiat głubczycki, woj. opolskie).
//
// Closest STRUCTURAL analog: Kędzierzyn-Koźle (also Opolskie: board pages →
// attachment documents → extract text → route announcement vs result by the
// document BODY header). The CMS differs (Głubczyce runs eSoteka/FINN, K-K runs
// Logonet), and the field extraction is Głubczyce-specific, so this file is its
// own parser; only the shared leaf helpers (parseAddress, classifyKind, and
// FINN's area/date/PLN utilities) are reused.
//
// SOURCE SHAPE (verified live 2026-07-11 from this Pi):
//   Board /144/ ("Ogłoszenia … o przetargach") hangs the ANNOUNCEMENT documents;
//   board /145/ ("Informacje o wynikach przetargów") hangs the RESULT documents.
//   Each document is an attachment at /download/attachment/<id>/<slug>.<ext> or
//   /download//<id>/<slug>.<ext>. The PRIMARY format is legacy Word `.doc`
//   (extracted with catdoc via core/doc-text.js); newer land notices are
//   born-digital `.pdf` (core/pdf-text.js). Both are handled in crawl.js; the
//   parsers here take the already-extracted TEXT.
//
// GROUNDTRUTHED against the REAL catdoc/pdftotext text of live attachments
// (fetched 2026-07-11):
//   ANNOUNCEMENT  /download/attachment/28744  ul. B. Chrobrego 2 lok. 4, flat,
//                 II przetarg, 88,87 m², 86 838,50 zł, auction 2026-06-30
//   RESULT sold   /download/attachment/27989  B. Chrobrego 10/8, flat, I przetarg,
//                 49,70 m², achieved 92 540,50 zł, buyer named, 2026-01-20
//   RESULT sold   /download/attachment/27990  Gdańska 24/7, flat, I przetarg,
//                 42,10 m², wywoławcza 53 906,50 → achieved 106 000 zł, 2026-01-20
//   RESULT neg.   /download/attachment/28452  Braciszów 34, house (zabudowana),
//                 I przetarg, 92,13 m², wywoławcza 100 000 zł, "nikt nie przystąpił"
//   RESULT sold   /download/attachment/28361  Dębrzyca dz. 320/1, land (grunt),
//                 II przetarg, achieved 113 000 zł, 2026-03-26
//
// TWO LOAD-BEARING QUIRKS of the real catdoc output:
//   1. RESULT flat docs DO NOT restate the street — the body says only "lokal
//      mieszkalny nr N" + the księga-wieczysta number. The street+building are
//      recovered from the ATTACHMENT FILENAME slug (addressFromFilename); the apt
//      comes from the body. The result filename carries the FULL street name
//      ("boleslawa-chrobrego-10_8"), which normalises to the SAME key as the
//      announcement body's "ul. Bolesława Chrobrego 10" — so build-properties can
//      still join the result to its announcement.
//   2. catdoc renders embedded OLE objects as short binary-garbage runs, which
//      occasionally sit exactly where a RESULT's "cena wywoławcza" number is — so
//      a result's STARTING price is best-effort (null when garbled). The ACHIEVED
//      price ("cena osiągnięta w przetargu wyniosła …") sits AFTER the garbage and
//      is reliable. The result's starting-price extractor is therefore anchored on
//      the "cena wywoławcza … wynosiła" label ONLY and never falls back to a bare
//      "<n> zł" scan (which would wrongly grab the achieved price).

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { areaFromText, parsePLN, auctionDateFromText } from '../../core/finn-bip.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};
const pad = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- round (Roman)

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/** "XIV" -> 14, "III" -> 3, "I" -> 1; null on a malformed token. */
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

/** Round from the Roman numeral qualifying "przetarg ustny": announcements say
 *  "II przetarg ustny nieograniczony", results say "I przetargu ustnego" — both
 *  match "<ROMAN> przetarg… ustn…". Case-SENSITIVE on the numeral (rounds are
 *  always upper-case Roman) so the Polish conjunction "i" can never read as 1.
 *  First occurrence wins (the announced/conducted round is stated before any
 *  prior-round recap). -> int or null. */
export function roundFromText(text) {
  const m = /\b([IVXLCDM]{1,6})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}

// ---------------------------------------------------------------- doc-type gate

/** Result notice ("Informacja o wyniku przetargu") vs. announcement
 *  ("OGŁOSZENIE … ogłasza"). The body header is authoritative — an announcement
 *  may RECAP a prior round's negative outcome, so routing on outcome words would
 *  misfire; routing on this header does not. */
export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wyniku\s+przetarg/i.test(text || '');
}

/** Is this an open SALE auction announcement at all (drops rentals / wykaz /
 *  cancellations / pre-announcements)? Kept kind-agnostic; classifyKind decides
 *  the asset kind. */
export function isSaleAnnouncement(text) {
  const t = text || '';
  if (!/przetarg/i.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/i.test(t)) return false;
  if (/o\s+odwo[łl]aniu\s+przetarg|uniewa[żz]nia\s+si[ęe]/i.test(t)) return false;
  return /sprzeda|zbyci/i.test(t);
}

// ----------------------------------------------------------------------- dates

/** Announcement auction date: "…odbędzie się w dniu 30 czerwca 2026 r." — FINN's
 *  helper anchors the operative "odbędzie się" first, so a prior-round recap
 *  ("W dniu … odbył się I przetarg …") can't win. -> ISO / null. */
export function announcementDateFromText(text) {
  return auctionDateFromText(text || '');
}

/** Result auction date: "…wynik przeprowadzonego w dniu 20 stycznia 2026 r. w
 *  siedzibie …". Anchored on "przeprowadzonego w dniu" so the Rozporządzenie
 *  citation ("z dnia 14 września 2004 r.") and the publication deadline ("do dnia
 *  …") can't win. Falls back to FINN's "w dniu <date>" scan. -> ISO / null. */
export function resultDateFromText(text) {
  const t = text || '';
  const m = /przeprowadzonego\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${pad(mo)}-${pad(m[1])}`;
  }
  return auctionDateFromText(t);
}

// ----------------------------------------------------------------------- prices

// A Polish PLN amount: digit groups separated by dot / space / NBSP, optional
// ",dd" grosze. parsePLN (FINN) strips the separators + grosze -> integer PLN.
const AMOUNT = '\\d{1,3}(?:[.\\s\\u00a0]\\d{3})*(?:,\\d{2})?';

/** ANNOUNCEMENT starting price. Two forms: the labelled "Cena wywoławcza …
 *  <n> zł" (land PDFs / Wodociągi), or — for the gmina flat table whose column
 *  header is "Cena nieruchomości" — the first grosze amount in złoty (the price
 *  carries grosze; the wadium below it usually does not). -> PLN or null. */
export function startingPriceAnnouncement(text) {
  const t = text || '';
  let m = new RegExp(`cena\\s+wywo[łl]awcz[a-ząćęłńóśźż]*[\\s\\S]{0,180}?(${AMOUNT})\\s*z[łl]`, 'i').exec(t);
  if (!m) m = new RegExp(`(?<![%\\d])(\\d{1,3}(?:[.\\s\\u00a0]\\d{3})*,\\d{2})\\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}

/** RESULT starting price. ONLY the labelled "Cena wywoławcza … wynosiła <n> zł"
 *  — never a bare-amount fallback, because the first bare "<n> zł" in a result is
 *  the ACHIEVED price. catdoc sometimes eats this number (embedded OLE object);
 *  then it is legitimately null and can be recovered from the joined
 *  announcement in build-properties. -> PLN or null. */
export function startingPriceResult(text) {
  // Anchor on the "Cena wywoławcza …" label, then take the FIRST "<amount> zł"
  // within the sentence (the "wynosiła"/"wynosi" verb form varies and the słownie
  // words carry no digit+zł). The achieved price is a separate, much-later
  // sentence, so it can never be reached inside this 160-char window.
  const m = new RegExp(
    `cena\\s+wywo[łl]awcz[a-ząćęłńóśźż]*[\\s\\S]{0,160}?(${AMOUNT})\\s*z[łl]`, 'i',
  ).exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Achieved price (result notices): "Najwyższa cena osiągnięta w przetargu
 *  wyniosła 92 540,50 zł". A value ⇒ sold. -> PLN or null. */
export function achievedPriceFromText(text) {
  const m = new RegExp(
    `cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetargu\\s+wynios[łl]a\\s+(${AMOUNT})\\s*z[łl]`, 'i',
  ).exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Result outcome from the achieved price + the negative-outcome phrasings.
 *  @returns {{outcome:'sold'|'unsold', unsold_reason:string|null}} */
export function outcomeFromText(text, achieved) {
  if (achieved != null) return { outcome: 'sold', unsold_reason: null };
  const t = text || '';
  const noBidder =
    /nikt\s+nie\s+przyst[ąa]pi[łl]|nie\s+przyst[ąa]pi[łl]\w*\s+(?:do\s+przetargu|[żz]aden)/i.test(t);
  const noWadium = /nie\s+wp[łl]acono\s+wadium|nie\s+wp[łl]yn[ęe][łl]o\s+wadium|nie\s+wniesiono\s+wadium/i.test(t);
  const negative = /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|wynikiem\s+negatywnym/i.test(t);
  if (noWadium) return { outcome: 'unsold', unsold_reason: 'no_wadium' };
  if (noBidder || negative) return { outcome: 'unsold', unsold_reason: 'no_participants' };
  return { outcome: 'unsold', unsold_reason: 'unknown' };
}

// --------------------------------------------------------------------- area/kind

/** Flat/house usable area — reuses FINN's areaFromText, which prefers a labelled
 *  "powierzchni użytkowej N m²" and excludes the cellar/attic ("piwnicy …",
 *  "pomieszczenia strychowe o powierzchni użytkowej …"). -> m² or null. */
export function areaM2(text) {
  return areaFromText(text || '');
}

/** Kind from the asset-declaration sentence, sliced off the top so the trailing
 *  binary garbage (which can contain stray "dom"/"gara") can't be reached — the
 *  real "lokal mieszkalny" / "nieruchomość zabudowana" / "działkę nr" always
 *  appears in the first ~1.4k chars, before any garbage, and classifyKind is
 *  first-match-wins. */
export function kindFromText(text) {
  return classifyKind((text || '').slice(0, 1400));
}

// ------------------------------------------------------------------- addresses

const titleCase = (s) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
// The office / auction-venue street ("ul. Niepodległości 14", "ul. Powstańców
// Śl. 2") appears in every notice — never the property address.
const OFFICE_RE = /niepodleg[łl]o[śs]ci|powsta[ńn]c[óo]w/i;

// Flat/commercial unit number: "Lokal mieszkalny nr 4", "lokalu użytkowego nr 5".
const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

/**
 * Address of an address-keyed ANNOUNCEMENT (flat / commercial), read from the
 * body table: "… ul. Bolesława Chrobrego 2, Głubczyce Lokal mieszkalny nr 4 …".
 * The building number is followed by a comma or the town name; the apartment
 * comes from the separate "Lokal … nr N". Skips the office/venue street.
 * @returns {{address_raw:string, address:object}|null}
 */
export function announcementAddress(text) {
  const t = text || '';
  const apt = UNIT_NO_RE.exec(t)?.[1] || null;
  const re =
    /\bul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.'’\- ]+?)\s+(\d+[A-Za-z]?)\s*(?=,|\bG[łl]ubczyce\b)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_RE.test(street)) continue;
    const raw = `${street} ${m[2]}${apt ? '/' + apt : ''}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: `ul. ${raw}`, address };
  }
  return null;
}

/**
 * Address of an address-keyed RESULT (flat / commercial), recovered from the
 * attachment FILENAME slug because the result body omits the street. Slug form:
 *   "boleslawa-chrobrego-10_8-1p-2026-01-28"  ->  street "Boleslawa Chrobrego",
 *   building "10", apt from the body's "lokal … nr 8" (fallback: the slug's _8).
 * The slug's full de-diacritised street normalises to the SAME key as the
 * announcement body's "ul. Bolesława Chrobrego 10", so the two join.
 * @param {string} url  attachment URL
 * @param {string|null} bodyApt  apartment number read from the body
 * @returns {{address_raw:string, address:object}|null}
 */
export function addressFromFilename(url, bodyApt) {
  if (!url) return null;
  let slug = decodeURIComponent((url.split('?')[0].split('/').pop() || ''));
  slug = slug.replace(/\.(pdf|docx|doc)$/i, '');
  slug = slug.replace(/^\d+-/, '');                // leading "12-" numbering prefix
  slug = slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');  // trailing "-2026-01-28" date
  slug = slug.replace(/_\d{4}$/, '');              // trailing "_2025" year
  slug = slug.replace(/-\d{1,2}p(?:rzetarg\w*)?$/i, ''); // trailing "-1p" round
  const m = /^(.*?)-(\d+)(?:_(\d+))?$/.exec(slug);
  if (!m) return null;
  const street = titleCase(m[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
  if (!street || /^\d+$/.test(street)) return null;
  const building = m[2];
  const apt = bodyApt || m[3] || null;
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: `ul. ${raw}`, address } : null;
}

/** House / village-property location from the body: "…położona w Braciszowie
 *  nr 34…" (keeps the source's declension — display only; the key still joins to
 *  a like-worded announcement). -> {address_raw,address} | null */
export function villageAddress(text) {
  const t = text || '';
  const m =
    /po[łl]o[żz]on\w*\s+(?:w|we)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]{2,40}?)\s+nr\s+(\d+[A-Za-z]?)/i.exec(t) ||
    /\bul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(t);
  if (!m) return null;
  const loc = m[1].replace(/\s+/g, ' ').trim();
  if (OFFICE_RE.test(loc)) return null;
  const address = parseAddress(`${loc} ${m[2]}`);
  return address ? { address_raw: `${loc} ${m[2]}`, address } : null;
}

// ------------------------------------------------------------------- land fields

/** Parcel(s) + obręb + plot area (m²) for a land (grunt) record.
 *  "działka nr 1305", "obejmująca działkę nr 320/1", area from hectares
 *  ("0,2800 ha" -> 2800 m²) or an explicit "(1082m2)". obręb is best-effort from
 *  a "położona w <Village>" clause. -> { dzialka_nr, obreb, area_m2, street } */
export function landFieldsFromText(text, url) {
  const t = (text || '').replace(/\s+/g, ' ');
  let dzialka_nr = null;
  // NB: "działkę" (accusative) ends in ę, which JS \w does NOT match — so the
  // stem is closed with an explicit Polish letter class, not \w*.
  const nm = /dzia[łl]k[a-ząćęłńóśźż]*\s+nr\s+([\d/]+(?:\s*(?:,|i)\s*[\d/]+)*)/i.exec(t);
  if (nm) {
    const nums = nm[1].split(/\s*(?:,|i)\s*/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
    if (nums.length) dzialka_nr = nums.join(', ');
  }
  let area_m2 = null;
  const ha = /(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (ha) {
    const v = Number(ha[1].replace(',', '.'));
    if (v > 0) area_m2 = Math.round(v * 10000);
  }
  const m2 = /\(?\s*(\d{2,7})\s*m\s*[²2]\s*\)?/i.exec(t);
  if (area_m2 == null && m2) area_m2 = Number(m2[1]);
  // obręb: the source's "położona w <Village>", else the filename's location slug.
  let obreb = null;
  const om = /po[łl]o[żz]on\w*\s+(?:w|we)\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)/i.exec(text || '');
  if (om) obreb = om[1];
  else if (url) {
    const slug = decodeURIComponent((url.split('?')[0].split('/').pop() || ''))
      .replace(/\.(pdf|docx|doc)$/i, '').replace(/^\d+-/, '');
    const first = /^([a-ząćęłńóśźż-]+?)-\d/i.exec(slug);
    if (first) obreb = titleCase(first[1].replace(/-/g, ' '));
  }
  const sm = /\bul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(text || '');
  const street = sm && !OFFICE_RE.test(sm[1]) ? `${sm[1].replace(/\s+/g, ' ').trim()} ${sm[2]}` : null;
  return { dzialka_nr, obreb, area_m2, street };
}

// ----------------------------------------------------------- announcement parse

/**
 * Parse one ANNOUNCEMENT document (already extracted to text) into a single
 * record, or null if it is not a keyable sale auction. Flats/houses/commercial
 * are address-keyed; land (kind 'grunt') carries dzialka_nr/obręb for land.json.
 * @param {string} text
 * @param {string} [sourceUrl]
 * @returns {object|null}
 */
export function parseAnnouncement(text, sourceUrl) {
  if (!text || !isSaleAnnouncement(text)) return null;
  const t = text.replace(/\r/g, '');
  const kind = kindFromText(t);
  const round = roundFromText(t);
  const auction_date = announcementDateFromText(t);
  const starting_price_pln = startingPriceAnnouncement(t);

  if (kind === 'grunt') {
    const land = landFieldsFromText(t, sourceUrl);
    if (!land.dzialka_nr && !land.street) return null;
    return {
      kind: 'grunt',
      dzialka_nr: land.dzialka_nr,
      obreb: land.obreb,
      area_m2: land.area_m2,
      address_raw: land.street ? `ul. ${land.street}` : null,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const addr = announcementAddress(t) || villageAddress(t);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaM2(t),
    starting_price_pln,
    auction_date,
    round,
  };
}

// -------------------------------------------------------------------- result parse

/**
 * Parse one RESULT notice ("Informacja o wyniku przetargu") into a concluded
 * auction record. Single-property. Joins its announcement by address (+ unit) +
 * round in build-properties. Returns 0 or 1 record (array = framework interface).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl  the attachment URL (carries the street for flats)
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceResult(t);
  const achieved = achievedPriceFromText(t);
  const { outcome, unsold_reason } = outcomeFromText(t, achieved);
  const kind = kindFromText(t);

  if (kind === 'grunt') {
    const land = landFieldsFromText(t, sourceUrl);
    if (!land.dzialka_nr && !land.street) return [];
    if (starting_price_pln == null) notes.push('parse: missing/garbled starting price');
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: land.dzialka_nr,
      obreb: land.obreb,
      area_m2: land.area_m2,
      address_raw: land.street ? `ul. ${land.street}` : null,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason,
      notes,
    }];
  }

  const apt = UNIT_NO_RE.exec(t)?.[1] || null;
  // Flats/commercial: the body omits the street → recover it from the filename
  // slug (apt from the body). Houses (zabudowana) DO carry their location in the
  // body ("położona w Braciszowie nr 34"), and the filename's "225_1" is the
  // PARCEL, not building/apt — so prefer the body for those.
  const addr = kind === 'zabudowana'
    ? (villageAddress(t) || addressFromFilename(sourceUrl, apt))
    : (addressFromFilename(sourceUrl, apt) || villageAddress(t));
  if (!addr) return [];
  if (addr.address?.warning) notes.push(addr.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing/garbled starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason,
    area_m2: areaM2(t),
    notes,
  }];
}
