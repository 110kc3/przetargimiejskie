// Slupsk parsers.
//
// Three roles:
//   1. parseListingPage  -- extracts notice links + metadata from one paginated
//      listing page (/przetargi/nieruchomosci/?pix=N). Filters to flat auctions.
//   2. parseNoticePage   -- extracts the per-flat fields from a single notice HTML
//      (/przetargi/<id>.html): address, apt, area, starting price, auction date,
//      round, KW number.
//   3. parseResultDoc    -- extracts achieved-price fields from one result PDF's
//      extracted text.
//
// VALIDATE: parsers written against live fixtures (2026-06-27). Tune the result
// parser positive-outcome path on the first live CI run with a sold-outcome PDF.

import { parseAddress } from '../../core/normalize.js';

// ---- shared helpers ---------------------------------------------------------

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

export function roundFromTitle(title) {
  const t = (title || '').replace(/\s+/g, ' ');
  if (/\bpierwsz/i.test(t)) return 1;
  if (/\bdrug/i.test(t)) return 2;
  if (/\btrzeci/i.test(t)) return 3;
  if (/\bczwart/i.test(t)) return 4;
  if (/\bpi[ąa]t/i.test(t)) return 5;
  const m = /\b(VI{0,3}|IV|V?I{1,3})\s+przetarg/i.exec(t)
    || /^(VI{0,3}|IV|V?I{1,3})\s+/i.exec(t);
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  if (/przetarg/i.test(t)) return 1;
  return null;
}

// "D.M.YYYY" / "DD.MM.YYYY" -> "YYYY-MM-DD" (ISO).
function dateFromSlupsk(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// "180 000,00" / "180000,00" / "180 000" -> integer PLN.
function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const n = Number(cleaned.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "57,45" / "57.45" -> 57.45
function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

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

// ---- listing page -----------------------------------------------------------

export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/mieszkaln/.test(t)) return false;
  if (/\bnajem\b/.test(t)) return false;
  if (/ograniczony/.test(t) && !/nieograniczony/.test(t)) return false;
  if (/rokowania/.test(t)) return false;
  if (/gara[zż]/.test(t)) return false;
  if (/\bdzia[łl]k/.test(t) || /\bgrunty?\b/.test(t)) return false;
  if (/niemieszkalneg/.test(t)) return false;
  return true;
}

/**
 * Parse one listing page HTML -> array of notice refs.
 * @param {string} html
 * @param {string} [origin]
 * @returns {Array<{detail_url:string, title:string, round:number|null, auction_date:string|null, status:string|null}>}
 */
export function parseListingPage(html, origin) {
  if (origin === undefined) origin = 'https://bip.um.slupsk.pl';
  const out = [];
  const itemRe = /<div class="mx-list-item"><a href="([^"]+)"><h3>([^<]+)<\/h3><div class="mx-lead">([\s\S]*?)<\/div><\/a><\/div>/g;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const href = m[1];
    const rawTitle = m[2];
    const rawLead = m[3];
    const title = rawTitle.replace(/\s+/g, ' ').trim();
    if (!isFlatAuction(title)) continue;
    let detail_url;
    try {
      detail_url = new URL(href, origin + '/').href;
    } catch (e) {
      detail_url = origin + href;
    }
    const lead = stripTags(rawLead);
    const auction_date = dateFromSlupsk(lead);
    const statusM = /status:\s*(\S+)/i.exec(lead);
    const status = statusM ? statusM[1].replace(/[.,]$/, '') : null;
    out.push({ detail_url, title, round: roundFromTitle(title), auction_date, status });
  }
  return out;
}

/** True when the paginator has a next-page link (class="mx-next"). */
export function hasNextPage(html) {
  return /<a[^>]*class="mx-next"/.test(html || '');
}

// ---- notice (detail) page ---------------------------------------------------

/**
 * Parse one notice page HTML -> flat fields. Returns null if not a flat auction.
 * @param {string} html
 * @param {string} detailUrl
 * @returns {object|null}
 */
export function parseNoticePage(html, detailUrl) {
  if (!html) return null;
  const titleM = /<h2>([^<]+)<\/h2>/.exec(html);
  const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : '';
  if (!isFlatAuction(title)) return null;

  const leadM = /<div class="mx-lead">([\s\S]*?)<\/div>/.exec(html);
  const lead = leadM ? stripTags(leadM[1]) : '';
  const auction_date = dateFromSlupsk(lead);

  const bodyM = /<div class="mx-html">([\s\S]*?)<\/div>\s*<div class="mx-files"/.exec(html)
    || /<div class="mx-html">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="metka"/.exec(html);
  const body = stripTags(bodyM ? bodyM[1] : html);

  // Area: "o powierzchni uzytkowej NN,NN m2" (with or without diacritics)
  const areaM = /o\s+powierzchni\s+\S+\s+([\d.,]+)\s*m\s*[2²]?/i.exec(body);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  // Starting price: "cena wywolawcza nieruchomosci wynosi: NNN zl"
  const priceM = /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s+wynosi\s*:?\s*([\d][^z]*?)\s*z[łl]/i.exec(body);
  const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

  // KW number: "KW nr SL1S/NNNNNNN/N"
  const kwM = /KW\s+nr\s+(SL\d[A-Z\/\d]+)/i.exec(body);
  const kw = kwM ? kwM[1] : null;

  // Address from title: "... przy ul. X N stanowiacego/stanowiacej ..."
  const addrM = /przy\s+ul\.\s+([\s\S]+?)(?:\s+stanowi[ąa]c|\s+w\s+obr[ęe]bie|$)/i.exec(title);
  const addrRaw = addrM
    ? ('ul. ' + addrM[1].replace(/\s+/g, ' ').trim())
    : title;
  // Corner addresses appear as "ul. Street1 N - Street2 M" (two intersecting streets).
  // Normalise to the primary street only: drop everything from " - <word>" onward.
  // Example: "ul. Stefana Starzynskiego 1 - Wojska Polskiego 54" -> "ul. Stefana Starzynskiego 1"
  const address_raw = addrRaw.replace(/\s+-\s+\S.*$/, '').trim();
  const address = parseAddress(address_raw);

  // Flat apt number from body "lokal mieszkalny nr N"
  let finalAddress = address;
  if (address && !address.apt) {
    const aptM = /lokal\s+(?:nie)?mieszkaln\w+\s+nr\s+(\d+[a-z]?)/i.exec(body);
    if (aptM) {
      const rawWithApt = address_raw.replace(/\/\s*\d+[a-z]?$/i, '') + '/' + aptM[1];
      const withApt = parseAddress(rawWithApt);
      if (withApt) finalAddress = withApt;
    }
  }

  return {
    kind: 'mieszkalny',
    address_raw,
    address: finalAddress,
    round: roundFromTitle(title),
    auction_date,
    area_m2,
    starting_price_pln,
    kw,
    detail_url: detailUrl,
  };
}

// ---- result archive page ----------------------------------------------------

/**
 * Parse the result archive page -> PDF refs.
 * @param {string} html
 * @param {string} [origin]
 * @returns {Array<{pdf_url:string, name:string}>}
 */
export function parseResultArchive(html, origin) {
  if (origin === undefined) origin = 'https://bip.um.slupsk.pl';
  const out = [];
  const linkRe = /<div class="mx-files-item pdf"><a href="(file\/\d+)">([^<]+)<\/a><\/div>/g;
  let m;
  while ((m = linkRe.exec(html || '')) !== null) {
    out.push({
      pdf_url: `${origin}/${m[1]}`,
      name: m[2].replace(/\s*\(pdf[^)]*\)/, '').trim(),
    });
  }
  return out;
}

// ---- result PDF parser ------------------------------------------------------

// Polish ordinal in result text "I/II/III nieograniczonym przetargu" -> round.
function resultRoundFromText(text) {
  const m = /\b(I{1,3}|IV|V)\s+(?:nieograniczon|ograniczon)/i.exec(text || '');
  if (!m) return null;
  return ROMAN[m[1].toUpperCase()] ?? null;
}

// "rozstrzygnietym w dniu DD.MM.YYYY roku" -> ISO date.
function resultDateFromText(text) {
  const m = /rozstrzygni[ęe]tym\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text || '');
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Parse one result PDF text (from pdftotext -layout) into result records.
 * @param {string} text  pdftotext -layout output
 * @param {string|null} fallbackDate  ISO date from crawl ref
 * @param {string} sourceUrl  the /file/<id> URL
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '').replace(/\s+/g, ' ').trim();

  // Guard: must be a Slupsk property result notice.
  if (!/Prezydent\s+Miasta\s+S[łl]upska\s+informuje/i.test(t)) return [];
  if (!/rozstrzygni[ęe]tym/i.test(t)) return [];

  const notes = [];
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = resultRoundFromText(t);

  // Kind: mieszkalny vs uzytkowy.
  const kindM = /sprzeda[ży]y\s+(?:cz[ęe][śs]ci\s+)?nieruchomo[śs]ci\s+\(lokalu\s+(mieszkalnego|niemieszkalnego)\)/i.exec(t);
  const kindWord = kindM ? kindM[1].toLowerCase() : '';
  const kind = /niemieszkalneg/.test(kindWord) ? 'uzytkowy' : 'mieszkalny';

  // Address from the bullet line: "- lokal WORD nr APT przy ul. STREET N,"
  const bulletRe = /[-–]\s*lokal\s+\S+\s+nr\s+(\d+[a-zA-Z]?)\s+przy\s+ul\.\s+([\wÀ-ɏ\s.]+?\d+\w*),/i;
  const bulletM = bulletRe.exec(t);
  let address_raw, address;
  if (bulletM) {
    address_raw = 'ul. ' + bulletM[2].replace(/\s+/g, ' ').trim() + '/' + bulletM[1];
    address = parseAddress(address_raw);
  } else {
    const hdrM = /przy\s+ul\.\s+([\wÀ-ɏ\s.]+?\d+\w*)\s+stanowi[ąa]c/i.exec(t);
    if (hdrM) {
      address_raw = 'ul. ' + hdrM[1].replace(/\s+/g, ' ').trim();
      address = parseAddress(address_raw);
    } else {
      notes.push('parse: address not found');
    }
  }
  if (!address) notes.push('parse: address parse failed');

  // Starting price: "- cena wywolawcza nieruchomosci: NNN zl"
  const startM = /[-–]\s*cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*:\s*([\d][^z\n–-]*?)\s*z[łl]/i.exec(t);
  const starting_price_pln = startM ? parsePLN(startM[1]) : null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  // Achieved price
  const achievedM =
    /najwy[żs]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:\s*([\d][^z\n–-]*?)\s*z[łl]/i.exec(t)
    || /najwy[żs]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*:\s*(\d+)/i.exec(t);

  const negativeText =
    /wynikiem\s+negatywnym/i.test(t)
    || /brak\s+oferent/i.test(t)
    || /nie\s+dosz[łl]o\s+do/i.test(t);

  let final_price_pln = null;
  if (achievedM) {
    const raw = parsePLN(achievedM[1]);
    if (raw != null && raw > 0) final_price_pln = raw;
  }

  const negative = negativeText || final_price_pln == null;
  const outcome = negative ? 'unsold' : 'sold';
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind,
    address_raw: address_raw || null,
    address: address || null,
    round,
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason: negative ? 'unknown' : null,
    area_m2: null,
    notes,
  }];
}
