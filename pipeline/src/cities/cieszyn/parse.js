// Cieszyn parsers -- Logonet CMS 2.9.0 HTML (bip.um.cieszyn.pl).
//
// Two kinds of page are parsed here:
//
//   INDEX PAGE  (/przetargi-nieruchomosci/{page}/15):
//     One <table class="table table-borderless"> per property. Rows are
//     <th scope="row">Label</th><td>Value</td>. The address row carries a
//     detail-page link. The <time datetime="YYYY-MM-DDTHH:MM:SS"> element
//     holds the ISO auction date. parseIndexPage() returns an array of refs.
//
//   DETAIL PAGE  (/przetarg-nieruchomosci/{id}/{slug}):
//     Same table (Szczegoly) + .addon-bip-result section linking to the wynik
//     article + .wysiwyg body text. parseDetailPage() extracts full listing
//     fields from the body text and the wynik URL from the result section.
//
//   WYNIK ARTICLE  (/artykul/21/{id}/{slug}):
//     Plain HTML article containing the achieved price. parseResultDoc() reads
//     the text of a fetched wynik article (passed as plain text by the crawler).
//
// All regexes groundtruthed against live fixtures (2026-06-28):
//   Announcement: /przetarg-nieruchomosci/40241 (Wyzsza Brama 11/6, I przetarg)
//   Announcement: /przetarg-nieruchomosci/40896 (Wyzsza Brama 11/6, II przetarg)
//   Announcement: /przetarg-nieruchomosci/39582 (Gorna 14/4, III przetarg)
//   Wynik (expired): /artykul/21/41397 (Wyzsza Brama II, 04.03.2026)

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

// ----------------------------------------------------------------- helpers

/** Strip HTML tags and collapse whitespace. */
function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse a PLN string like "76 000,00 zl" -> 76000, or null.
 *  Strips trailing currency labels ("zl", "zlotych") BEFORE parsing digits
 *  so "76 000,00 zl" doesn't leave a stray comma in the number string. */
function parsePLN(s) {
  if (!s) return null;
  // Strip currency suffix. Note: JS \b is ASCII-only -- \b doesn't fire after
  // the Unicode letter 'ł', so we anchor with (?=\s|$) instead.
  const stripped = String(s)
    .replace(/\s*z[lł]otych(?=\s|$).*/i, '')
    .replace(/\s*z[lł](?=\s|$).*/i, '')
    .trim();
  const cleaned = stripped.replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse a decimal area string "27,54" or "27.54" -> number, or null. */
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

// ----------------------------------------------------------------- round

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4,
  'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};
const ROUND_ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/**
 * Round number from text: "II ustny przetarg" -> 2, "trzeci przetarg" -> 3.
 * Roman numeral before "przetarg" takes priority (Cieszyn uses both forms).
 */
export function roundFromText(text) {
  const t = text || '';
  // Roman numeral: "II ustny przetarg", "III przetarg"
  const rm = /\b(I{1,3}|IV|V|VI?)\s+(?:ustny\s+)?przetarg/i.exec(t);
  if (rm) {
    const roman = rm[1].toUpperCase();
    if (Object.prototype.hasOwnProperty.call(ROUND_ROMAN, roman)) return ROUND_ROMAN[roman];
  }
  // Word ordinal: "drugi przetarg", "trzeciego przetargu"
  const wm = /\b(pierwsz|drug|trzeci|czwart|pi[aą]t|sz[oó]st)\w*\s+przetarg/i.exec(t);
  if (!wm) return null;
  const stem = wm[1].toLowerCase()
    .replace('ą', 'a')
    .replace('ó', 'o');
  return ROUND_WORDS[stem] ?? null;
}

// ----------------------------------------------------------------- auction date

/**
 * Auction date from announcement body or datetime attribute. Cieszyn uses:
 *   "Przetarg odbedzie sie w dniu 26 listopada 2025 r. o godz. 11:00"
 *   "przetarg odbedzie sie dnia 4 marca 2026 r. o godz. 12:00"
 * Also: <time datetime="2026-03-04T12:00:00"> (fastest).
 */
export function auctionDateFromText(text) {
  const t = text || '';
  // ISO datetime attribute -- fastest signal
  const dtm = /datetime="(\d{4}-\d{2}-\d{2})T/.exec(t);
  if (dtm) return dtm[1];
  // Numeric form: "odbedzie sie (w dniu|dnia) 04.03.2026"
  const numm = /odb[eę]dzie\s+si[eę]\s+(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (numm) return `${numm[3]}-${numm[2].padStart(2, '0')}-${numm[1].padStart(2, '0')}`;
  // Spelled month form
  const mm = /odb[eę]dzie\s+si[eę]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (!mm) return null;
  const mo = PL_MONTH[mm[2].toLowerCase()];
  if (!mo) return null;
  return `${mm[3]}-${String(mo).padStart(2, '0')}-${mm[1].padStart(2, '0')}`;
}

// ----------------------------------------------------------------- result date

/**
 * Auction date from a wynik article body.
 * Cieszyn: "W dniu 4 marca 2026 r. zostal przeprowadzony ..."
 */
export function resultDateFromText(text) {
  const t = text || '';
  // "W dniu DD MONTH YYYY r."
  const mm = /W\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s*r\./i.exec(t);
  if (mm) {
    const mo = PL_MONTH[mm[2].toLowerCase()];
    if (mo) return `${mm[3]}-${String(mo).padStart(2, '0')}-${mm[1].padStart(2, '0')}`;
  }
  // Numeric: "W dniu 04.03.2026 r."
  const nm = /W\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (nm) return `${nm[3]}-${nm[2].padStart(2, '0')}-${nm[1].padStart(2, '0')}`;
  // "ktory odbyl sie w dniu DD MONTH YYYY r."
  const km = /kt[oó]ry\s+odby[lł]\s+si[eę]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (km) {
    const mo = PL_MONTH[km[2].toLowerCase()];
    if (mo) return `${km[3]}-${String(mo).padStart(2, '0')}-${km[1].padStart(2, '0')}`;
  }
  return null;
}

// ----------------------------------------------------------------- prices

/**
 * Starting price from detail body or wynik article.
 * "Cena wywolawcza nieruchomosci wynosi 152 000,00 zl"
 */
export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[lł]awcza\s+nieruchomo[sś]ci\s+wynosi\s+([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /wynosi\s+([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /cena\s+wywo[lł]awcza\s*[:–\-]\s*([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  return null;
}

/**
 * Achieved price from wynik article body.
 * "Najwyzsza cena osiagnieta w przetargu wyniosla 77 000,00 zl"
 */
export function achievedPriceFromText(text) {
  const t = text || '';
  let m = /[Nn]ajwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta\s+w\s+przetargu\s+wynios[lł]a\s+([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /cena\s+osi[aą]gni[eę]ta\s+w\s+przetargu\s*[:–\-]?\s*([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  return null;
}

// ----------------------------------------------------------------- unit area

/**
 * Usable floor area of the flat.
 * "o pow. uzytkowej 27,54 m2" or "o powierzchni uzytkowej 40,95 m2".
 * Anchored to the FIRST hit (the flat itself), not the cellar or plot.
 */
export function unitAreaFromText(text) {
  const t = text || '';
  const m = /o\s+(?:pow\.|powierzchni)\s+u[zż]ytkow\w*\s+([\d,.]+)\s*m2/i.exec(t);
  return m ? parseArea(m[1]) : null;
}

// ----------------------------------------------------------------- address from detail body

/**
 * Parse address from the announcement (or result notice) body text.
 * Cieszyn body: "lokalu mieszkalnego nr 6 ... w budynku nr 11 przy ul. Wyzsza Brama"
 *
 * NOTE: The BIP sometimes writes the street in genitive/locative case in the
 * body text (e.g. "przy ul. Gornej" for street "Gorna"). Whatever the BIP
 * emits is stored as-is and normalised by parseAddress; the join key reflects
 * the raw BIP string exactly, so announcements and result notices (which use
 * the same phrasing) will always produce matching keys.
 */
export function addressFromBody(text) {
  const t = (text || '').replace(/\s+/g, ' ');
  // flat unit number: "lokalu mieszkalnego nr 6" / "lokal nr 6"
  const aptM = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const apt = aptM ? aptM[1] : null;
  // building number: "budynku nr 11" / "budynku mieszkalnym nr 14"
  const bldgM = /budynku\s+(?:\w+\s+)*?nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const bldg = bldgM ? bldgM[1] : null;
  // street: "przy ul. Wyzsza Brama" / "przy ul. Gornej"
  // Stop before " w Cieszynie", digits, "na parterze", "na I pietrze", "w budynku"
  const streetM = /przy\s+ul\.\s+([\wÀ-ɏ''.'\- ]+?)(?=\s+(?:w\s+[A-ZÀ-ɏ]|na\s+parterze|na\s+[IVX]|w\s+budynku|\d|$))/i.exec(t);
  if (!streetM || !bldg) return null;
  const street = streetM[1].replace(/\s+$/, '').replace(/,\s*$/, '').trim();
  if (!street) return null;
  const raw = apt ? `ul. ${street} ${bldg}/${apt}` : `ul. ${street} ${bldg}`;
  const address = parseAddress(raw);
  if (!address) return null;
  return { address_raw: raw, address };
}

// ----------------------------------------------------------------- result notice gate

/**
 * True if the text is a wynik (result) article.
 * Cieszyn wynik articles contain "INFORMACJA o wyniku" or "Najwyzsza cena osiagnieta".
 */
export function isResultNotice(text) {
  const t = text || '';
  return (
    /INFORMACJA\s+o\s+wynik/i.test(t) ||
    /[Nn]ajwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta/i.test(t) ||
    /[Oo]si[aą]gni[eę]ta\s+(?:cena|w\s+przetargu)/i.test(t)
  );
}

// ----------------------------------------------------------------- index page parser

/**
 * Parse the /przetargi-nieruchomosci/{page}/15 HTML.
 * Returns an array of index refs:
 *   { detail_url, address_raw, rodzaj, typ, starting_price_pln, auction_date }
 */
export function parseIndexPage(html) {
  const out = [];
  const blockRe = /<table[^>]+class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = blockRe.exec(html || '')) !== null) {
    const block = m[1];
    if (!/Adres\s+nieruchomo/i.test(block) && !/th[^>]*>Adres/i.test(block)) continue;

    const rows = {};
    const rowRe = /<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    let r;
    while ((r = rowRe.exec(block)) !== null) {
      const label = stripTags(r[1]).toLowerCase().trim();
      rows[label] = r[2];
    }

    const addrHtml = rows['adres nieruchomości'] || '';
    const linkM = /href="(https?:\/\/bip\.um\.cieszyn\.pl\/przetarg-nieruchomosci\/[^"]+)"/i.exec(addrHtml);
    if (!linkM) continue;
    const detail_url = linkM[1];
    const address_raw = stripTags(addrHtml);

    const rodzaj = stripTags(rows['rodzaj nieruchomości'] || '').toLowerCase();
    const typ = stripTags(rows['typ przetargu'] || '').toLowerCase();

    // parsePLN handles the currency suffix so "76 000,00 zl" -> 76000
    const priceRaw = stripTags(rows['cena wywoławcza'] || '');
    const starting_price_pln = parsePLN(priceRaw);

    const timeM = /datetime="(\d{4}-\d{2}-\d{2})T/.exec(rows['data przetargu'] || '');
    const auction_date = timeM ? timeM[1] : null;

    out.push({ detail_url, address_raw, rodzaj, typ, starting_price_pln, auction_date });
  }
  return out;
}

// ----------------------------------------------------------------- detail page parser

/**
 * Parse a detail page (/przetarg-nieruchomosci/{id}/{slug}).
 * Returns { kind:'announcement', listing:{...} } or null on failure.
 */
export function parseDetailPage(html, detailUrl) {
  if (!html) return null;

  // --- structured table (Szczegoly) ---
  const tableM = /<table[^>]+class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(html);
  const tableBlock = tableM ? tableM[1] : '';

  const rows = {};
  const rowRe = /<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
  let r;
  while ((r = rowRe.exec(tableBlock)) !== null) {
    const label = stripTags(r[1]).toLowerCase().trim();
    rows[label] = r[2];
  }

  const rodzaj = stripTags(rows['rodzaj nieruchomości'] || '').toLowerCase();
  if (rodzaj && !/lokal\s+mieszkaln/i.test(rodzaj)) return null;

  const timeM = /datetime="(\d{4}-\d{2}-\d{2})T/.exec(rows['data przetargu'] || '');
  const tableDate = timeM ? timeM[1] : null;

  const tablePriceRaw = stripTags(rows['cena wywoławcza'] || '');
  const tablePrice = parsePLN(tablePriceRaw);

  const przetargNa = stripTags(rows['przetarg na'] || '');
  const roundFromTitle = roundFromText(przetargNa);

  // Wynik URL: scan the whole page for the /artykul/21/ link (more robust than
  // trying to bound the .addon-bip-result div with a nested-div regex).
  let wynik_url = null;
  const wynikLinkM = /href="(https?:\/\/bip\.um\.cieszyn\.pl\/artykul\/21\/[^"]+)"/i.exec(html);
  if (wynikLinkM) wynik_url = wynikLinkM[1];

  // Body text: take up to 8 KB after the class="wysiwyg" opening (enough for
  // any announcement; avoids a fragile nested-div close boundary).
  const wsM = /class="wysiwyg"[^>]*>([\s\S]{0,8000})/i.exec(html);
  const bodyText = wsM ? stripTags(wsM[1]) : '';

  const area_m2 = unitAreaFromText(bodyText);

  const addrResult = addressFromBody(bodyText);
  if (!addrResult || !addrResult.address) return null;

  const starting_price_pln = tablePrice ?? startingPriceFromText(bodyText);
  const auction_date = tableDate ?? auctionDateFromText(bodyText);
  const round = roundFromTitle ?? roundFromText(bodyText);

  const kindText = bodyText.slice(0, 300);
  const kind = classifyKind(kindText) === 'unknown' ? 'mieszkalny' : classifyKind(kindText);

  return {
    kind: 'announcement',
    listing: {
      kind,
      address_raw: addrResult.address_raw,
      address: addrResult.address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl || null,
      wynik_url,
    },
  };
}

// ----------------------------------------------------------------- result doc parser

/**
 * Parse a wynik (result) article body text.
 * Called by refresh.js with (text, fallbackDate, sourceUrl).
 * Returns an array of 0 or 1 record (framework interface).
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;

  const negativeStated =
    /przetarg\s+zako[nń]czy[lł]\s+si[eę]\s+wynikiem\s+negatywnym/i.test(t) ||
    /brak\s+uczestnik/i.test(t) ||
    /nie\s+wy[lł]oniono\s+nabywcy/i.test(t);

  const addrResult = addressFromBody(t);
  if (!addrResult || !addrResult.address) return [];
  const { address_raw, address } = addrResult;
  if (address.warning) notes.push(address.warning);

  const area_m2 = unitAreaFromText(t);
  const kind = 'mieszkalny';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl || null,
      kind,
      address_raw,
      address,
      round,
      area_m2,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    },
  ];
}
