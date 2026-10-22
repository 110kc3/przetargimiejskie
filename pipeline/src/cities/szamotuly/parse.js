// Szamotuły parser — bip.szamotuly.pl
//
// Extracts structured listing, land, and result records from eBIP JSON article payloads
// where notice bodies arrive as inline HTML in `content`.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  września: 9,
  wrzesnia: 9,
  października: 10,
  pazdziernika: 10,
  listopada: 11,
  grudnia: 12,
};

/**
 * Decode numeric and named HTML entities emitted by the eBIP CMS.
 * @param {string} html
 * @returns {string}
 */
export function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&oacute;/g, 'ó')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&plusmn;/g, '±')
    .replace(/&sup2;/g, '²')
    .replace(/&sup3;/g, '³')
    .replace(/&sect;/g, '§')
    .replace(/&bdquo;/g, '„')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Convert HTML body into clean text lines with entities decoded.
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  if (!html) return '';
  const decoded = decodeHtml(html);
  const text = decoded
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Parse currency string to integer PLN.
 * @param {string|number} s
 * @returns {number|null}
 */
export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).trim();
  cleaned = cleaned.replace(/[,-]+$/, '');
  cleaned = cleaned.replace(/\s*z[łl].*$/i, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  cleaned = cleaned.replace(/[^\d]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse area string to float m2.
 * @param {string|number} s
 * @returns {number|null}
 */
export function parseArea(s) {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse Polish date to ISO YYYY-MM-DD.
 * @param {string} str
 * @returns {string|null}
 */
export function parseDatePL(str) {
  if (!str) return null;
  const m1 = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(str);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${String(mon).padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  const m2 = /(\d{1,2})[.-](\d{1,2})[.-](\d{4})/.exec(str);
  if (m2) {
    return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Extract auction date from notice text.
 * @param {string} text
 * @returns {string|null}
 */
export function auctionDateFromText(text) {
  const t = text || '';
  const mAnn =
    /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(t);
  if (mAnn) return parseDatePL(mAnn[1]);

  const mRes =
    /w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})[\s\S]{0,250}?(?:odby[łl]\s+si[ęe]|spisany\s+zosta[łl]\s+protok[óo][łl])/i.exec(
      t,
    );
  if (mRes) return parseDatePL(mRes[1]);

  const mRes2 =
    /(?:odby[łl]\s+si[ęe]|spisany\s+zosta[łl]\s+protok[óo][łl])[\s\S]{0,250}?w\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(
      t,
    );
  if (mRes2) return parseDatePL(mRes2[1]);

  return null;
}

/**
 * Extract auction round number (1, 2, 3...) from text.
 * @param {string} text
 * @returns {number|null}
 */
export function roundFromText(text) {
  const t = text || '';
  const mOrd =
    /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|piąt\w*|szóst\w*|siódm\w*|ósm\w*|dziewiąt\w*|dziesiąt\w*)\s+przetarg/i.exec(
      t,
    );
  if (mOrd) {
    const w = mOrd[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzec')) return 3;
    if (w.startsWith('czwart')) return 4;
    if (w.startsWith('piąt') || w.startsWith('piat')) return 5;
    if (w.startsWith('szóst') || w.startsWith('szost')) return 6;
    if (w.startsWith('siódm') || w.startsWith('siodm')) return 7;
    if (w.startsWith('ósm') || w.startsWith('osm')) return 8;
    if (w.startsWith('dziewiąt') || w.startsWith('dziewiat')) return 9;
    if (w.startsWith('dziesiąt') || w.startsWith('dziesiat')) return 10;
  }
  const mRom = /\b(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s+przetarg/i.exec(t);
  if (mRom) {
    const rom = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return rom[mRom[1].toUpperCase()] || null;
  }
  return 1;
}

/**
 * Extract wadium payment deadline from notice text.
 * @param {string} text
 * @returns {string|null}
 */
export function extractWadiumDeadline(text) {
  const m =
    /w\s+terminie\s+do\s*(?:dnia)?\s*(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(
      text || '',
    );
  if (m) return parseDatePL(m[1]);
  return null;
}

/**
 * Extract land register (KW) number.
 * @param {string} text
 * @returns {string|null}
 */
export function extractKW(text) {
  const m = /\b(PO1[A-Z]\/\d{8}\/\d)\b/i.exec(text || '');
  return m ? m[1].toUpperCase() : null;
}

/**
 * Convert locative village names to nominative.
 */
function normalizeVillageName(loc) {
  if (!loc) return loc;
  const map = {
    szamotułach: 'Szamotuły',
    przysieczynie: 'Przysieczyn',
    mutowie: 'Mutowo',
    piotrkówku: 'Piotrkówko',
    piotrkowku: 'Piotrkówko',
    koźlu: 'Koźle',
    kozlu: 'Koźle',
    otorowie: 'Otorowo',
    przyborowie: 'Przyborowo',
    lipnicy: 'Lipnica',
  };
  const key = loc.toLowerCase();
  return map[key] || loc;
}

/**
 * Extract address_raw and parseAddress from notice text.
 * @param {string} text
 * @param {string} [title]
 * @returns {{ address_raw: string, address: object|null }}
 */
export function extractAddress(text, title = '') {
  const combined = `${title}\n${text}`;

  // 1. Street with building and optional apartment number
  // Ignore Dworcowa (seat of Urząd Miasta)
  const mStreetWithNo =
    /przy\s+ul(?:icy|\.)\s+((?!Dworcow)[A-Za-ząćęłńóśźż\s\-]+?\s+\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)(?:\s+o\s+powierzchni|\.|\s+stanowi|\s*,)/i.exec(
      combined,
    );
  if (mStreetWithNo) {
    const raw = mStreetWithNo[1].trim();
    const address_raw = raw.toLowerCase().startsWith('rynek') ? raw : `ul. ${raw}`;
    const address = parseAddress(address_raw);
    return { address_raw, address };
  }

  // 2. Village with house number: "w Przysieczynie 52"
  const mVillageWithNo =
    /położon\w+\s+w\s+([A-Za-ząćęłńóśźż]+)\s+(\d+[a-zA-Z]?)(?:\s+stanowi|\.|\s+o\s+powierzchni|\s*,)/i.exec(
      combined,
    );
  if (mVillageWithNo) {
    const village = normalizeVillageName(mVillageWithNo[1]);
    const address_raw = `${village} ${mVillageWithNo[2]}`;
    const address = parseAddress(address_raw);
    return { address_raw, address };
  }

  // 3. Street without building number (land / general street)
  const mStreet =
    /przy\s+ul(?:icy|\.)\s+((?!Dworcow)[A-Za-ząćęłńóśźż\s\-]+?)(?:\s+stanowi|\.|\s*,|\s+o\s+powierzchni|\s+oznaczon)/i.exec(
      combined,
    );
  if (mStreet) {
    const raw = mStreet[1].trim();
    const address_raw = raw.toLowerCase().startsWith('rynek') ? raw : `ul. ${raw}`;
    const address = parseAddress(address_raw);
    return { address_raw, address };
  }

  // 4. Village name: "w Mutowie", "w Koźlu", etc.
  const mVillage =
    /położon\w+\s+w\s+([A-Za-ząćęłńóśźż]+)(?:\s*,|\s+stanowi|\.|\s+oznaczon)/i.exec(
      combined,
    );
  if (mVillage) {
    const address_raw = normalizeVillageName(mVillage[1]);
    return { address_raw, address: null };
  }

  // Fallback to title keywords if available
  const mTitleVillage =
    /\b(Mutowo|Koźle|Kozle|Piotrkówko|Piotrkowko|Otorowo|Przyborowo|Lipnica|Przysieczyn)\b/i.exec(
      title,
    );
  if (mTitleVillage) {
    const address_raw = normalizeVillageName(mTitleVillage[1]);
    return { address_raw, address: null };
  }

  return { address_raw: null, address: null };
}

/**
 * Extract usable floor area for flats / commercial units / houses.
 * @param {string} text
 * @returns {number|null}
 */
export function extractUnitArea(text) {
  const t = text || '';
  const m1 = /powierzchni\s+u[żz]ytkowej\s+([\d.,]+)\s*m/i.exec(t);
  if (m1) return parseArea(m1[1]);
  const m2 = /powierzchnia\s+u[żz]ytkowa\s+(?:lokalu\s+)?wynosi\s+([\d.,]+)\s*m/i.exec(t);
  if (m2) return parseArea(m2[1]);
  const m3 =
    /budynkiem\s+(?:mieszkalnym|u[żz]ytkowym)\s+o\s+powierzchni(?:\s+u[żz]ytkowej)?\s+([\d.,]+)\s*m/i.exec(
      t,
    );
  if (m3) return parseArea(m3[1]);
  return null;
}

/**
 * Extract starting price from notice text.
 * @param {string} text
 * @returns {number|null}
 */
export function extractStartingPrice(text) {
  const t = text || '';
  const m =
    /cena\s+wywo[łl]awcza\s*(?:nieruchomo[śs]ci(?:\s+lokalowej)?)?\s*(?:wynosi[łl]?a?)?\s*[-:–]?\s*([\d\s.,]+)\s*z[łl]/i.exec(
      t,
    );
  if (m) return parsePLN(m[1]);
  return null;
}

/**
 * Extract wadium amount from notice text.
 * @param {string} text
 * @returns {number|null}
 */
export function extractWadium(text) {
  const t = text || '';
  const m = /wadium\s+wynosi\s*[-:–]?\s*([\d\s.,]+)\s*z[łl]/i.exec(t);
  if (m) return parsePLN(m[1]);
  return null;
}

/**
 * Extract outcome, final price, and unsold reason for result notices.
 * @param {string} text
 * @returns {{ outcome: 'sold'|'unsold', final_price_pln: number|null, unsold_reason: string|null }}
 */
export function extractOutcome(text) {
  const t = text || '';
  const mAchieved =
    /(?:najwy[żz]sza\s+)?cena\s+osi[ąa]gni[ęe]ta\s*(?:w\s+przetargu)?\s*[-:–]\s*([\d\s.,]+)\s*z[łl]/i.exec(
      t,
    );
  const achievedPrice = mAchieved ? parsePLN(mAchieved[1]) : null;

  const hasBuyer = /nabywc[aą]\s+nieruchomo[śs]ci(?:\s+jest|\s*:)\s*([^.]+)/i.test(t);
  const isNegative =
    /wynikiem\s+negatywnym|brak\s+wp[łl]aty\s+wadium|brak\w*\s+oferent[óo]w|nie\s+wy[łl]oniono\s+nabywcy/i.test(
      t,
    );

  if ((achievedPrice && achievedPrice > 0) || (hasBuyer && !isNegative)) {
    return {
      outcome: 'sold',
      final_price_pln: achievedPrice,
      unsold_reason: null,
    };
  }

  let unsold_reason = 'wynik negatywny';
  if (/brak\s+wp[łl]aty\s+wadium/i.test(t)) unsold_reason = 'brak wpłaty wadium';
  else if (/brak\w*\s+oferent[óo]w/i.test(t)) unsold_reason = 'brak oferentów';
  else if (/nie\s+wy[łl]oniono\s+nabywcy/i.test(t)) unsold_reason = 'nie wyłoniono nabywcy';

  return {
    outcome: 'unsold',
    final_price_pln: null,
    unsold_reason,
  };
}

/**
 * Extract land parcel rows from HTML tables.
 * @param {string} html
 * @returns {Array<{ dzialka_nr: string, area_m2: number|null, kw: string|null, starting_price_pln: number|null, wadium_pln: number|null }>}
 */
export function parseTables(html) {
  const decoded = decodeHtml(html);
  const tables = [];
  const reTable = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;
  while ((tm = reTable.exec(decoded)) !== null) {
    const tableHtml = tm[1];
    const rows = [];
    const reRow = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    while ((rm = reRow.exec(tableHtml)) !== null) {
      const cells = [];
      const reCell = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm;
      while ((cm = reCell.exec(rm[1])) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 1) {
      const header = rows[0].map((h) => h.toLowerCase());
      const colPlot = header.findIndex((h) => /dzia[łl]k|nr/i.test(h));
      const colArea = header.findIndex((h) => /powierzchni/i.test(h));
      const colKW = header.findIndex((h) => /kw|ksi[ęe]g/i.test(h));
      const colPrice = header.findIndex((h) => /cena/i.test(h));
      const colWadium = header.findIndex((h) => /wadium/i.test(h));

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (colPlot === -1 && row.length < 3) continue;
        const dzialka_nr = colPlot !== -1 ? row[colPlot] : null;
        if (!dzialka_nr || /^[a-ząćęłńóśźż]+$/i.test(dzialka_nr)) continue;
        tables.push({
          dzialka_nr,
          area_m2: colArea !== -1 ? parseArea(row[colArea]) : null,
          kw: colKW !== -1 ? row[colKW] : null,
          starting_price_pln: colPrice !== -1 ? parsePLN(row[colPrice]) : null,
          wadium_pln: colWadium !== -1 ? parsePLN(row[colWadium]) : null,
        });
      }
    }
  }
  return tables;
}

/**
 * Filter out rentals, cancellations, list of qualified bidders, etc.
 * @param {string} title
 * @param {string} lead
 * @param {string} slug
 * @returns {boolean}
 */
export function isSkippableArticle(title = '', lead = '', slug = '') {
  const combined = `${title} ${lead} ${slug}`.toLowerCase();
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem|ogródk|ogrodk|użyczeni/i.test(combined)) return true;
  if (/odwo[łl]ani|uniewa[żz]ni/i.test(combined)) return true;
  if (/lista\s+os[óo]b\s+zakwalifikowanych|przetarg-lista/i.test(combined)) return true;
  if (/sprostowanie/i.test(combined)) return true;
  if (/\brokowani/i.test(combined)) return true;
  return false;
}

/**
 * True if article is an achieved-price result notice ("Informacja o wyniku...").
 * @param {string} title
 * @param {string} lead
 * @param {string} slug
 * @param {string} [body]
 * @returns {boolean}
 */
export function isResultArticle(title = '', lead = '', slug = '', body = '') {
  const combined = `${title} ${lead} ${slug} ${body}`.toLowerCase();
  if (/informacj\w*\s+o\s+wynik|o\s+wyniku\s+\w*\s*przetargu|protok[óo][łl]\s+z\s+\w*\s*przetargu|wynik\s+przetargu/i.test(combined)) {
    return true;
  }
  const cleanTitle = (title || '').trim();
  if (/^informacja\b/i.test(cleanTitle)) return true;
  const cleanSlug = (slug || '').replace(/^a,\d+,/, '');
  if (/^informacja\b/i.test(cleanSlug)) return true;
  return false;
}

/**
 * True if article is an auction announcement ("Burmistrz ... ogłasza przetarg...").
 * @param {string} title
 * @param {string} lead
 * @param {string} slug
 * @param {string} [body]
 * @returns {boolean}
 */
export function isAnnouncementArticle(title = '', lead = '', slug = '', body = '') {
  if (isResultArticle(title, lead, slug, body)) return false;
  if (isSkippableArticle(title, lead, slug)) return false;
  const combined = `${title} ${lead} ${slug} ${body}`.toLowerCase();
  return /przetarg|og[łl]oszen/i.test(combined) && /zbyci|sprzeda|nieruchomo/i.test(combined);
}

/**
 * Parse an announcement article JSON payload into 1 or more listing/land records.
 * @param {object} article
 * @returns {Array<object>}
 */
export function parseAnnouncement(article) {
  const title = (article?.title || article?.aliasFields?.find((x) => x.alias === 'title')?.value || '').trim();
  const html = article?.content || '';
  const text = htmlToText(html);
  const detail_url = article?.link ? `https://bip.szamotuly.pl/${article.link}` : `https://bip.szamotuly.pl/api/articles/${article.id}`;
  const source_url = detail_url;

  const kind = classifyKind(`${title} ${text}`);
  const auction_date = auctionDateFromText(text);
  const round = roundFromText(`${title} ${text}`);
  const wadium_deadline = extractWadiumDeadline(text);

  if (kind === 'grunt') {
    const tablePlots = parseTables(html);
    const { address_raw } = extractAddress(text, title);

    if (tablePlots.length > 0) {
      return tablePlots.map((plot) => ({
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        obreb: null,
        area_m2: plot.area_m2,
        address_raw,
        starting_price_pln: plot.starting_price_pln || extractStartingPrice(text),
        wadium_pln: plot.wadium_pln || extractWadium(text),
        wadium_deadline,
        auction_date,
        round,
        detail_url,
        source_url,
      }));
    }

    // Bare text land plot
    const mPlot = /dzia[łl]k\w*\s+(?:nr|numer|ewidencyjn\w*)?\s*([0-9\/\, ]+)/i.exec(text);
    const dzialka_nr = mPlot ? mPlot[1].trim() : null;
    const area_m2 = extractUnitArea(text) || parseArea((/o\s+powierzchni\s*([\d\s.,]+)\s*m/i.exec(text) || [])[1]);

    return [
      {
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        area_m2,
        address_raw,
        starting_price_pln: extractStartingPrice(text),
        wadium_pln: extractWadium(text),
        wadium_deadline,
        auction_date,
        round,
        detail_url,
        source_url,
      },
    ];
  }

  // Flats, commercial units, houses
  const { address_raw, address } = extractAddress(text, title);
  if (!address_raw) return [];

  const area_m2 = extractUnitArea(text);
  const starting_price_pln = extractStartingPrice(text);
  const wadium_pln = extractWadium(text);

  return [
    {
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      area_m2,
      starting_price_pln,
      wadium_pln,
      wadium_deadline,
      auction_date,
      round,
      detail_url,
      source_url,
    },
  ];
}

/**
 * Parse a result document / notice into an array of concluded auction records.
 * Standard interface expected by refresh.js: (text, fallbackDate, sourceUrl).
 * @param {string} textOrHtml
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(textOrHtml, fallbackDate, sourceUrl) {
  const text = textOrHtml && textOrHtml.includes('<') ? htmlToText(textOrHtml) : textOrHtml || '';
  if (!isResultArticle('', '', '', text)) return [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const kind = classifyKind(text);
  const { outcome, final_price_pln, unsold_reason } = extractOutcome(text);
  const starting_price_pln = extractStartingPrice(text);
  const notes = [];

  if (starting_price_pln == null && outcome === 'sold') notes.push('parse: missing starting price');
  if (outcome === 'sold' && final_price_pln == null) notes.push('parse: sold but missing achieved price');

  if (kind === 'grunt') {
    const tablePlots = parseTables(textOrHtml);
    const { address_raw } = extractAddress(text);

    if (tablePlots.length > 0) {
      return tablePlots.map((plot) => {
        // In multi-plot notices, check if this specific plot was sold
        const escapedPlot = plot.dzialka_nr.replace('/', '\\/').trim();
        const plotRegex = new RegExp(
          `dzia[łl]ka\\s+numer\\s*${escapedPlot}[\\s\\S]{0,450}?cena\\s+osi[ąa]gni[ęe]ta(?:\\s+w\\s+przetargu)?\\s*[-:–]?\\s*([\\d\\s.,]+)\\s*z[łl]`,
          'i',
        );
        const mPlotAchieved = plotRegex.exec(text);
        const plotAchievedPrice = mPlotAchieved ? parsePLN(mPlotAchieved[1]) : null;
        const isPlotSold = Boolean(plotAchievedPrice && plotAchievedPrice > 0);

        return {
          auction_date,
          source_pdf: sourceUrl,
          kind: 'grunt',
          dzialka_nr: plot.dzialka_nr,
          obreb: null,
          area_m2: plot.area_m2,
          address_raw,
          round,
          starting_price_pln: plot.starting_price_pln || starting_price_pln,
          final_price_pln: isPlotSold ? plotAchievedPrice : (tablePlots.length === 1 && outcome === 'sold' ? final_price_pln : null),
          outcome: isPlotSold || (tablePlots.length === 1 && outcome === 'sold') ? 'sold' : 'unsold',
          unsold_reason: isPlotSold || (tablePlots.length === 1 && outcome === 'sold') ? null : unsold_reason,
          notes: [...notes],
        };
      });
    }

    const mPlot = /dzia[łl]k\w*\s+(?:nr|numer|ewidencyjn\w*)?\s*([0-9\/\, ]+)/i.exec(text);
    const dzialka_nr = mPlot ? mPlot[1].trim() : null;
    const area_m2 = extractUnitArea(text) || parseArea((/o\s+powierzchni\s*([\d\s.,]+)\s*m/i.exec(text) || [])[1]);

    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln,
        outcome,
        unsold_reason,
        notes,
      },
    ];
  }

  // Address-keyed properties (flats, commercial units, houses)
  const { address_raw, address } = extractAddress(text);
  if (!address_raw) return [];

  const area_m2 = extractUnitArea(text);

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2,
      notes,
    },
  ];
}
