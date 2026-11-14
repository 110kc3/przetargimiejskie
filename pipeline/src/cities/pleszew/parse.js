
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
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  cleaned = cleaned.replace(/[\s.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};
const MONTH_ALT = Object.keys(PL_MONTHS).filter((k) => k !== 'wrzesnia' && k !== 'pazdziernika').join('|');

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)\s+(\d{4})/.exec(s);
  if (word) {
    const mon = PL_MONTHS[word[2].toLowerCase()];
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}


const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };

export function roundFromText(text) {
  const t = text || '';
  let m = /[Oo]g[łl]asza\s+(I{1,3}|IV|VI{0,3}|IX)\s+przetarg/.exec(t);
  if (m) return ROMAN_MAP[m[1]] ?? null;
  m = /(?:[Uu]stalono\s+termin|[Oo]dby[łl]\s+si[ęe]|[Zz]ako[ńn]czy[łl]\s+si[ęe]|[Ww]\s+wyniku|[Oo]\s+wyniku)\s+(I{1,3}|IV|VI{0,3}|IX)\s+przetarg/.exec(t);
  return m ? ROMAN_MAP[m[1]] ?? null : null;
}

const AUCTION_DATE_RE = new RegExp(
  `[Pp]rzetarg\\s+odb[ęe]dzie\\s+si[ęe][\\s\\S]{0,160}?(\\d{1,2})\\s+(${MONTH_ALT})\\s+(\\d{4})`,
);
export function auctionDateFromText(text) {
  const m = AUCTION_DATE_RE.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

const STARTING_PRICE_RE = /cen[a-ząćęłńóśźż]*\s+wywo[łl]awcz[a-ząćęłńóśźż]*[\s\S]{0,80}?([\d][\d\s.,]*)\s*z[łl]/i;
export function startingPriceFromText(text) {
  const m = STARTING_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const OFFICE_STREET_RE = /^$/;

export function streetBuildingFromText(text) {
  const re =
    /przy\s+ul\.?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ.\-]*)*)\s+(\d+[A-Za-z]?)\b/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_STREET_RE.test(street)) continue;
    return { street, building: m[2].toUpperCase() };
  }
  return null;
}

const FLAT_APT_RE = new RegExp(`lokal${WC}\\s+(?:mieszkaln${WC}\\s+)?nr\\.?\\s*(\\d+[A-Za-z]?)`, 'i');
export function flatAptFromText(text) {
  const m = FLAT_APT_RE.exec(text || '');
  return m ? m[1] : null;
}

export function flatAreaFromText(text) {
  const m = /(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s+u[żz]ytkowej\s+(\d+[,.]\d+)\s*m/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

// "Lokal mieszkalny nr N położony jest ..." somewhere, which classifyKind's
const PREMISES_RE = /nieruchomo[śs]ci?\s+lokalow[a-ząćęłńóśźż]*/i;
function classifyEntryKind(text) {
  const t = text || '';
  const kind = classifyKind(t);
  if (kind === 'grunt' && PREMISES_RE.test(t) && flatAptFromText(t)) return 'mieszkalny';
  return kind;
}


const PARCEL_ADJ_RE = new RegExp(`dzia[łl]k${WC}\\s+nr\\.?\\s*:?\\s*(\\d+(?:\\/\\d+)?)`, 'i');
const PARCEL_GAP_RE = new RegExp(`dzia[łl]k${WC}[\\s\\S]{0,80}?\\bnr\\.?\\s*(\\d+(?:\\/\\d+)?)\\b`, 'i');
export function parcelFromText(text) {
  const t = text || '';
  let m = PARCEL_ADJ_RE.exec(t);
  if (m) return m[1];
  m = PARCEL_GAP_RE.exec(t);
  return m ? m[1] : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\s+\d+\s+(?:Miasto\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńĄĘŁŃÓŚŻŹ]*)/i.exec(text || '');
  return m ? m[1].trim() : null;
}

const NAME_RE = `[A-ZŻŹĆŁŚĄĘÓŃ][\\w${PL}]*(?:\\s+[A-ZŻŹĆŁŚĄĘÓŃ][\\w${PL}]*)?`;
const MIEJSCOWOSC_DIRECT_RE = new RegExp(`[Ww]\\s+miejscowo[śs]ci\\s+(${NAME_RE})`);
const MIEJSCOWOSC_POLOZ_RE = new RegExp(`[Pp]o[łl]o[żz]on[\\w${PL}]*\\s+[Ww]\\s+(?:miejscowo[śs]ci\\s+)?(${NAME_RE})`);
export function miejscowoscFromText(text) {
  const t = text || '';
  let m = MIEJSCOWOSC_DIRECT_RE.exec(t);
  if (m) return m[1];
  m = MIEJSCOWOSC_POLOZ_RE.exec(t);
  return m ? m[1] : null;
}

export function plotAreaFromText(text) {
  const m = /o\s+pow(?:ierzchni)?\.?\s+(\d+[,.]\d+)\s*ha\b/i.exec(text || '');
  if (m) {
    const v = Number(m[1].replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  return null;
}

const PARCEL_ROW_RE = /(\d{1,4}\/\d{1,4})\s+(\d[,.]\d{2,4})\s*ha\b/g;
export function parcelsFromText(text) {
  const t = text || '';
  const out = [];
  const seen = new Set();
  let m;
  PARCEL_ROW_RE.lastIndex = 0;
  while ((m = PARCEL_ROW_RE.exec(t)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ dzialka_nr: m[1], area_m2: Math.round(Number(m[2].replace(',', '.')) * 10000) });
  }
  return out;
}

export function parcelPriceFromText(text, dzialkaNr) {
  const t = text || '';
  const esc = dzialkaNr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re = new RegExp(`dla\\s+(?:dz\\.|dzia[łl]ki)\\s+(?:nr\\s+)?${esc}\\s*[–—-]\\s*([\\d][\\d\\s.,]*)\\s*z[łl]`, 'i');
  let m = re.exec(t);
  if (m) return parsePLN(m[1]);
  re = new RegExp(`(?:^|\\n)\\s*${esc}\\s+[\\s\\S]{0,90}?\\s(\\d[\\d.,]*)\\s*z[łl]`, 'i');
  m = re.exec(t);
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_RE = /nabywc[a-ząćęłńóśźż]*[\s\S]{0,80}?za\s+(?:cen[ęe]|kwot[ęe])(?:\s+(?:brutto|netto))?\s+([\d][\d\s.,]*)\s*z[łl]/i;
export function achievedPriceFromText(text) {
  const m = ACHIEVED_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function isUnsoldText(text) {
  const t = text || '';
  return /wynikiem\s+negatywnym|nie\s+wp[łl]yn[ęe][łl]o\s+[żz]adne\s+wadium/i.test(t);
}
export function isSoldText(text) {
  const t = text || '';
  return /wynikiem\s+pozytywnym|nabywc[a-ząćęłńóśźż]*[\s\S]{0,80}?za\s+(?:cen[ęe]|kwot[ęe])/i.test(t);
}


const BEZPRZETARGOWO_RE = /bezprzetargow/i;
const SKIP_RE = /wydzier[żz]aw|dzier[żz]aw[a-ząćęłńóśźż]*|naj[ęe]m|wynaj[ąa][cć]|u[żz]yczeni|u[żz]yczy[cć]|wniesieni[a-ząćęłńóśźż]*\s+aportu|aport\s+rzeczow/i;
const SALE_VERB_RE = new RegExp(`sprzeda[a-z${PL}]*|zbyci[ae]|zby[cć]`, 'i');

export function isSkippableEntryText(text) {
  const t = text || '';
  if (BEZPRZETARGOWO_RE.test(t)) return true;
  if (SKIP_RE.test(t)) return true;
  return false;
}

export function isSaleAnnouncementText(text) {
  const t = text || '';
  if (isSkippableEntryText(t)) return false;
  return /ogłasza/i.test(t) && SALE_VERB_RE.test(t);
}

export function isGenuineSaleWykazText(text) {
  const t = text || '';
  if (isSkippableEntryText(t)) return false;
  return SALE_VERB_RE.test(t);
}

export function isResultLabel(label) {
  return /wynik/i.test(label || '');
}


export function parseAnnouncementPage(text, url) {
  const t = (text || '').trim();
  if (!t) return [];

  const kind = classifyEntryKind(t);
  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);

  if (kind === 'grunt') {
    const rows = parcelsFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    const obreb = obrebFromText(t);
    const address_raw = miejscowosc || null;
    if (rows.length > 0) {
      return rows.map(({ dzialka_nr, area_m2 }) => ({
        kind: 'grunt',
        dzialka_nr,
        obreb: obreb || miejscowosc,
        area_m2,
        address_raw,
        address: null,
        starting_price_pln: parcelPriceFromText(t, dzialka_nr) ?? startingPriceFromText(t),
        auction_date,
        round,
        detail_url: url,
      }));
    }
    const dzialka_nr = parcelFromText(t);
    if (!dzialka_nr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: obreb || miejscowosc,
      area_m2: plotAreaFromText(t),
      address_raw,
      address: null,
      starting_price_pln: startingPriceFromText(t),
      auction_date,
      round,
      detail_url: url,
    }];
  }

  const base = streetBuildingFromText(t);
  if (!base) return [];
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  const address = parseAddress(addressStr);
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `ul. ${addressStr}`,
    address,
    area_m2: flatAreaFromText(t),
    starting_price_pln: startingPriceFromText(t),
    auction_date,
    round,
    detail_url: url,
  }];
}


const PDF_LINK_RE = /<a\s+(?:title="[^"]*"\s+)?href="([^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi;

export function parseYearBoard(html, base) {
  if (!html) return [];
  const start = html.indexOf('<h2>');
  if (start === -1) return [];
  const parts = html.slice(start).split(/(<h2>[\s\S]*?<\/h2>)/);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = stripTags(parts[i]);
    if (title === 'Miasto i Gmina Pleszew') continue;
    let body = parts[i + 1] || '';
    const footerIdx = body.indexOf('<div class="content-footer">');
    if (footerIdx !== -1) body = body.slice(0, footerIdx);

    const pdfLinks = [];
    const seen = new Set();
    PDF_LINK_RE.lastIndex = 0;
    let m;
    while ((m = PDF_LINK_RE.exec(body)) !== null) {
      const href = m[1].trim();
      if (seen.has(href)) continue;
      seen.add(href);
      const linkUrl = /^https?:\/\//i.test(href) ? href : base + href;
      pdfLinks.push({ url: linkUrl, label: stripTags(m[2]) });
    }

    const prose = body.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ');

    out.push({ title, bodyText: stripTags(prose), pdfLinks });
  }
  return out;
}


export function wykazRecordFromEntry(bodyText, pdfUrl) {
  const t = bodyText || '';
  const kind = classifyEntryKind(t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    if (!dzialka_nr && !miejscowosc) return null;
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb: obrebFromText(t) || miejscowosc,
      area_m2: plotAreaFromText(t),
      address_raw: miejscowosc,
      address: null,
      detail_url: pdfUrl,
    };
  }

  const base = streetBuildingFromText(t);
  if (!base) return null;
  const apt = flatAptFromText(t);
  const addressStr = apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: `ul. ${addressStr}`,
    address: parseAddress(addressStr),
    detail_url: pdfUrl,
  };
}


function addressFromResultText(t) {
  const base = streetBuildingFromText(t);
  if (!base) return null;
  const apt = flatAptFromText(t);
  return parseAddress(apt ? `${base.street} ${base.building}/${apt}` : `${base.street} ${base.building}`);
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = (text || '').trim();
  if (!t) return [];

  const isResultDoc =
    /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(t) ||
    /o\s+wyniku[\s\S]{0,20}?przetargu/i.test(t) ||
    isUnsoldText(t) ||
    isSoldText(t);
  if (!isResultDoc) return [];

  const kind = classifyEntryKind(t);
  const round = roundFromText(t);
  const unsold = isUnsoldText(t);
  const sold = !unsold && isSoldText(t);
  const outcome = unsold ? 'unsold' : sold ? 'sold' : 'open';
  const achieved = sold ? achievedPriceFromText(t) : null;

  const dateM = /na\s+dzie[ńn]\s+(\d{1,2}\s+[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{4})/i.exec(t);
  const auction_date = (dateM && parseDateText(dateM[1])) ?? auctionDateFromText(t) ?? fallbackDate ?? null;

  if (kind === 'grunt') {
    const rows = parcelsFromText(t);
    const miejscowosc = miejscowoscFromText(t);
    const obreb = obrebFromText(t) || miejscowosc;
    if (rows.length > 0) {
      return rows.map(({ dzialka_nr, area_m2 }) => {
        const starting_price_pln = parcelPriceFromText(t, dzialka_nr) ?? startingPriceFromText(t);
        return {
          kind: 'grunt',
          dzialka_nr,
          obreb,
          area_m2,
          address_raw: miejscowosc,
          round,
          starting_price_pln,
          final_price_pln: outcome === 'sold' ? achieved : null,
          outcome,
          unsold_reason: unsold ? 'wynik negatywny' : null,
          auction_date,
          source_pdf: sourceUrl,
        };
      });
    }
    const dzialka_nr = parcelFromText(t);
    if (!dzialka_nr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2: plotAreaFromText(t),
      address_raw: miejscowosc,
      round,
      starting_price_pln: startingPriceFromText(t),
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason: unsold ? 'wynik negatywny' : null,
      auction_date,
      source_pdf: sourceUrl,
    }];
  }

  const address = addressFromResultText(t);
  if (!address) return [];
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: address.street + ' ' + address.building + (address.apt ? '/' + address.apt : ''),
    address,
    round,
    starting_price_pln: startingPriceFromText(t),
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason: unsold ? 'wynik negatywny' : null,
    auction_date,
    source_pdf: sourceUrl,
  }];
}
