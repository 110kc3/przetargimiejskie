// Ostrzeszów parser — bip.nowoczesnagmina.pl and bip.zgm-ostrzeszow.pl
//
// Extracts structured listing, land, wykaz and result records from:
// - Modern born-digital PDF notices and result documents
// - Scanned PDF notices and result documents (via ocrPdf with psm: 1 for rotated scans)
// - Legacy Word documents (.doc/.docx via docText)
// - Inline HTML land tables (nowoczesnagmina CMS)
// - Board teasers and attachment metadata

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL = 'żźćłśąęóńŻŹĆŁŚĄĘÓŃ';
const WC = `[\\w${PL}]*`;

export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

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

export function parseArea(s) {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, września: 9, pazdziernika: 10,
  października: 10, listopada: 11, grudnia: 12,
};

export function parseDateText(s) {
  if (!s) return null;
  const cleaned = s.replace(/r\.?$/i, '').trim();
  const mDot = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(cleaned);
  if (mDot) {
    return `${mDot[3]}-${mDot[2].padStart(2, '0')}-${mDot[1].padStart(2, '0')}`;
  }
  const mText = /^(\d{1,2})\s+([A-Za-ząćęłńóśźż]+)\s+(\d{4})$/i.exec(cleaned);
  if (mText) {
    const mon = PL_MONTHS[mText[2].toLowerCase()];
    if (mon) return `${mText[3]}-${String(mon).padStart(2, '0')}-${mText[1].padStart(2, '0')}`;
  }
  return null;
}

export function roundFromText(text) {
  const t = text || '';
  const m = /(?:^|\s)(I{1,3}|IV|V)\s+przetarg/i.exec(t);
  if (m) return m[1].toUpperCase();
  if (/pierwsz[a-ząćęłńóśźż]*\s+przetarg/i.test(t)) return 'I';
  if (/drugi[a-ząćęłńóśźż]*\s+przetarg/i.test(t)) return 'II';
  if (/trzeci[a-ząćęłńóśźż]*\s+przetarg/i.test(t)) return 'III';
  return 'I';
}

const DATE_P = '(\\d{1,2}(?:\\.|\\s+)(?:[A-Za-ząćęłńóśźż]+|\\d{1,2})(?:\\.|\\s+)\\d{4})';

export function auctionDateFromText(text) {
  const t = text || '';
  const m1 = new RegExp(`odb[ęe]dzie\\s+si[ęe](?:\\s+w\\s+dniu)?\\s+${DATE_P}`, 'i').exec(t);
  if (m1) return parseDateText(m1[1]);
  const m2 = new RegExp(`(?:w\\s+dniu|dnia)\\s+${DATE_P}[\\s\\S]{0,150}zosta[łl]\\s+przeprowadzony`, 'i').exec(t);
  if (m2) return parseDateText(m2[1]);
  const m3 = new RegExp(`wyznaczony\\s+na\\s+dzie[ńn]\\s+${DATE_P}`, 'i').exec(t);
  if (m3) return parseDateText(m3[1]);
  const m4 = new RegExp(`do\\s+dnia\\s+${DATE_P}`, 'i').exec(t);
  if (m4) return parseDateText(m4[1]);
  return null;
}

export function startingPriceFromText(text) {
  const t = text || '';
  const m = /cena\s+(?:wywo[łl]awcza\s*(?:brutto)?|nieruchomo[śs]ci\s*(?:brutto)?)\s*[:–\-]?\s*([\d\s.,]+)\s*z[łl]/i.exec(t);
  if (m) return parsePLN(m[1]);
  const m2 = /Cena\s+(?:wywo[łl]awcza\s*)?nieruchomo[śs]ci[\s\S]{0,100}?\[z[łl]\][\s\S]{0,100}?\b(\d{2,3}(?:[ .]\d{3})*(?:,\d{2})?)\b/i.exec(t);
  if (m2) return parsePLN(m2[1]);
  return null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  const m1 = /(?:najwy[żz]sza\s+)?cena\s+(?:osi[aą]gni[eę]ta|sprzeda[żz]y)[^\d]*([\d\s.,]+)\s*z[łl]/i.exec(t);
  if (m1 && !/nie\s+zosta[łl]a|brak/i.test(m1[0])) return parsePLN(m1[1]);
  const m2 = /(?:nabywc[aą]|za\s+(?:kwot[eę]|cen[eę]))\s*[:–\-]?\s*([\d\s.,]+)\s*z[łl]/i.exec(t);
  if (m2) return parsePLN(m2[1]);
  return null;
}

export function isUnsoldText(text) {
  const t = text || '';
  return /negatywnym|brak\s+oferent[oó]w|nie\s+wp[łl]yn[eę][łl]o\s+wadium|brak\s+wp[łl]aty\s+wadium|nikt\s+nie\s+przyst[aą]pi[łl]|nie\s+zosta[łl]a\s+osi[aą]gni[eę]ta|brak\s+uczestnik[oó]w|odwo[łl]an(?:y|o|ie)|niedopuszczen/i.test(t);
}

export function isSoldText(text) {
  const t = text || '';
  return /pozytywnym|zosta[łl]\s+ustalon|nabywc[aą]/i.test(t) && !isUnsoldText(t);
}

// Skip non-sale notices, maintenance procurement on ZGM, and tenant-sale noise
export function isSkippableEntryText(text) {
  const t = text || '';
  if (/dzier[żz]aw|najm|najem|u[żz]yczeni|lokalu\s+u[żz]ytkowego/i.test(t)) return true;
  if (/(?:zaprasza|zaproszenie)\s+do\s+zło[żz]enia\s+oferty|modernizacj|wymiana\s+pokrycia|inspektor|nadz[oó]r|kotłowni|gara[żz]|przebudowa|operat|rozbi[oó]rk|remont\b|rob[oó]t\s+remontowych|elewacji|bzp\b/i.test(t)) return true;
  if (/bezprzetargow|na\s+rzecz\s+najemcy/i.test(t)) return true;
  if (/sprostowan/i.test(t)) return true;
  return false;
}

export function isGenuineSaleWykazText(text) {
  const t = text || '';
  return /wykaz/i.test(t) && /(?:sprzeda[żz]|zbyci)/i.test(t) && !isSkippableEntryText(t);
}

export function isResultLabel(text) {
  const t = text || '';
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik|wynik\s+przetargu|wyniku\s+przetargu|protok[oó][łl]/i.test(t);
}

// Municipality office streets (never the subject of property sale)
const OFFICE_STREET_RE = /^(?:Zamkow[a-ząćęłńóśźż]*|Sportow[a-ząćęłńóśźż]*)$/i;

export function streetBuildingFromText(text) {
  const t = text || '';
  const re = /(?:przy\s+)?(?:\bulicy\b|\bul\b\.?|\bal\b\.?)\s*([0-9A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[0-9A-Za-zŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*)*?)\s+(?:nr\s+)?(\d+[A-Za-z]?)\b/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return { street, building: m[2].toUpperCase() };
  }

  // Village/rural house number without street (e.g. "w miejscowości Szklarka Przygodzicka 89", "we wsi Szklarka Przygodzicka 89")
  const vRe = /(?:w\s+miejscowo[śs]ci|we\s+wsi)\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*)*?)(?:\s+nr\b)?\s+(\d+[A-Za-z]?)\b/i;
  const vm = vRe.exec(t);
  if (vm) {
    return { street: vm[1].trim(), building: vm[2].toUpperCase() };
  }

  return null;
}

export function flatAptFromText(text) {
  const t = text || '';
  const m1 = /lokal[\wżźćłśąęóń]*\s+(?:mieszkaln[\wżźćłśąęóń]*\s+)?nr\.?\s*(\d+[A-Za-z]?)\b/i.exec(t);
  if (m1) return m1[1];
  const m2 = /(?:\bul\.|\bulicy)\s*[^/\n,;]+\/(\d+[A-Za-z]?)\b/i.exec(t);
  return m2 ? m2[1] : null;
}

export function flatAreaFromText(text) {
  const t = text || '';
  const m = /(?:powierzchni[a-ząćęłńóśźż]*\s*(?:u[żz]ytkow[a-ząćęłńóśźż]*\s*)?(?:lokalu\s*)?(?:wynosi\s*)?|pow\.?\s*u[żz]ytkowa\s*:?\s*)(\d+[,.]\d+)\s*m/i.exec(t);
  return m ? parseArea(m[1]) : null;
}

export function parcelFromText(text) {
  const t = text || '';
  const m = /dzia[łl]k[a-ząćęłńóśźż]*\s+(?:ewidencyjn[a-ząćęłńóśźż]*\s+)?(?:nr|numer)\.?\s*:?\s*(\d+(?:\/\d+)?)/i.exec(t);
  return m ? m[1] : null;
}

export function obrebFromText(text) {
  const t = text || '';
  const m = /obr[ęe]b(?:ie)?(?:\s+ewidencyjn[\wżźćłśąęóń]*)?\s*:?\s*(?:\d+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóń]*)/i.exec(t);
  return m ? m[1].trim() : null;
}

export function miejscowoscFromText(text) {
  const t = text || '';
  const m = /(?:w\s+miejscowo[śs]ci|we\s+wsi)\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ]*)*)/i.exec(t);
  return m ? m[1].trim() : null;
}

export function plotAreaFromText(text) {
  const t = text || '';
  const mHa = /(?:o\s+)?pow(?:ierzchni[a-ząćęłńóśźż]*)?\.?\s*(?:[łl][ąa]czn[a-ząćęłńóśźż]*\s*)?:?\s*(\d+[,.]\d+)\s*ha\b/i.exec(t);
  if (mHa) {
    const v = Number(mHa[1].replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  const mM2 = /(?:o\s+)?pow(?:ierzchni[a-ząćęłńóśźż]*)?\.?\s*(?:[łl][ąa]czn[a-ząćęłńóśźż]*\s*)?:?\s*(\d+[,.]\d+|\d+)\s*m/i.exec(t);
  if (mM2) {
    const v = Number(mM2[1].replace(',', '.'));
    if (v > 0) return Math.round(v);
  }
  return null;
}

export function classifyEntryKind(text) {
  const t = text || '';
  if (/nieruchomo[śs]c[a-ząćęłńóśźż]*\s+lokalow[a-ząćęłńóśźż]*/i.test(t)) return 'mieszkalny';
  if (/lokal\s+mieszkalny|lokalu\s+mieszkalnego/i.test(t)) return 'mieszkalny';
  if (/nieruchomo[śs]ci\s+gruntow[a-ząćęłńóśźż]*,\s*zabudowan/i.test(t)) return 'zabudowana';
  return classifyKind(t);
}

// ---------------------------------------------------------------------------
// Inline HTML table parsing (e.g. Niedźwiedź ?a=1752)
// ---------------------------------------------------------------------------

export function parseInlineTable(html, sourceUrl, pageText = '') {
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
  const records = [];
  const combinedText = `${pageText} ${stripTags(html)}`;
  const round = roundFromText(combinedText);
  const auction_date = auctionDateFromText(combinedText);

  for (const tMatch of tables) {
    const tContent = tMatch[1];
    if (!/dzia[łl]k/i.test(tContent) || !/cena/i.test(tContent)) continue;

    const rows = [...tContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rows.length < 2) continue;

    let colPol = -1, colDz = -1, colPow = -1, colCena = -1;
    const headerCells = [...rows[0][1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      stripTags(c[1]).toLowerCase()
    );

    for (let i = 0; i < headerCells.length; i++) {
      const h = headerCells[i];
      if (/po[łl]o[żz]enie|adres/i.test(h)) colPol = i;
      else if (/dzia[łl]k/i.test(h)) colDz = i;
      else if (/powierzchnia|pow/i.test(h)) colPow = i;
      else if (/cena/i.test(h)) colCena = i;
    }

    for (let r = 1; r < rows.length; r++) {
      const cells = [...rows[r][1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
        stripTags(c[1])
      );
      if (cells.length < 3) continue;

      const dzialka_nr = colDz !== -1 ? cells[colDz] : null;
      if (!dzialka_nr || !/\d/.test(dzialka_nr)) continue;

      const rawPol = colPol !== -1 ? cells[colPol] : '';
      const rawPow = colPow !== -1 ? cells[colPow] : '';
      const rawCena = colCena !== -1 ? cells[colCena] : '';

      const area_m2 = parseArea(rawPow);
      const starting_price_pln = parsePLN(rawCena);

      records.push({
        kind: 'grunt',
        dzialka_nr: dzialka_nr.trim(),
        obreb: rawPol.trim() || null,
        area_m2: area_m2 ? Math.round(area_m2) : null,
        address_raw: rawPol.trim() || null,
        starting_price_pln,
        auction_date,
        round,
        detail_url: sourceUrl,
      });
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// Document announcement parsing (PDF or DOC/DOCX)
// ---------------------------------------------------------------------------

export function parseAnnouncementDoc(text, sourceUrl, isLand = false) {
  const t = text || '';
  const kind = isLand ? 'grunt' : classifyEntryKind(t);
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const auction_date = auctionDateFromText(t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const obreb = obrebFromText(t) || miejscowoscFromText(t);
    const area_m2 = plotAreaFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw: miejscowosc,
      starting_price_pln,
      auction_date,
      round,
      detail_url: sourceUrl,
      source_pdf: sourceUrl,
    };
  }

  const base = streetBuildingFromText(t);
  if (!base) return null;
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  const area_m2 = flatAreaFromText(t) ?? plotAreaFromText(t);

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addressStr,
    address: parseAddress(addressStr),
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    detail_url: sourceUrl,
    source_pdf: sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Wykaz record from title/teaser
// ---------------------------------------------------------------------------

export function wykazRecordFromEntry(title, detailUrl) {
  const t = title || '';
  const kind = classifyEntryKind(t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(t) || miejscowosc,
      area_m2: plotAreaFromText(t),
      address_raw: miejscowosc,
      address: null,
      detail_url: detailUrl,
    };
  }

  const base = streetBuildingFromText(t);
  if (!base) return null;
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addressStr,
    address: parseAddress(addressStr),
    detail_url: detailUrl,
  };
}

// ---------------------------------------------------------------------------
// parseResultDoc — registry contract
// ---------------------------------------------------------------------------

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = (text || '').trim();
  if (!t) return [];

  const isResult =
    isResultLabel(t) ||
    isUnsoldText(t) ||
    isSoldText(t) ||
    /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(t);
  if (!isResult) return [];

  const kind = classifyEntryKind(t);
  const round = roundFromText(t);
  const unsold = isUnsoldText(t);
  const sold = !unsold && isSoldText(t);
  const outcome = unsold ? 'unsold' : sold ? 'sold' : 'open';
  const achieved = sold ? achievedPriceFromText(t) : null;
  const starting_price_pln = startingPriceFromText(t);
  const auction_date = auctionDateFromText(t) || fallbackDate || null;

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    const obreb = obrebFromText(t) || miejscowosc;
    const area_m2 = plotAreaFromText(t);
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw: miejscowosc,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason: unsold ? (t.includes('odwołan') ? 'przetarg odwołany' : 'wynik negatywny') : null,
      auction_date,
      source_pdf: sourceUrl,
    }];
  }

  const base = streetBuildingFromText(t);
  if (!base) return [];
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  const address = parseAddress(addressStr);

  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addressStr,
    address,
    round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason: unsold ? (t.includes('odwołan') ? 'przetarg odwołany' : 'wynik negatywny') : null,
    auction_date,
    source_pdf: sourceUrl,
  }];
}
