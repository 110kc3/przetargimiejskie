import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(s) {
  if (!s) return null;
  let cleaned = String(s).replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseArea(s) {
  if (s == null) return null;
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parseDateText(s) {
  if (!s) return null;
  const m = /(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/.exec(s);
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

const AUCTION_DATE_RE =
  /PRZETARG\s+ODB[ĘE]DZIE\s+SI[ĘE]\s*(?:DNIA)?\s*(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i;

export function auctionDateFromText(text) {
  const m = AUCTION_DATE_RE.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

const START_PRICE_RE = /cena\s+wywo[łl]awcza[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;

export function startingPriceFromText(text) {
  const m = START_PRICE_RE.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_PRICE_RE = /cena\s+uzyskana[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;
const ACHIEVED_PRICE_FALLBACK_RE =
  /cena\s+osi[ąa]gni[ęe]ta[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]|cena\s+nabycia[^\d]{0,100}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;

export function achievedPriceFromText(text) {
  const t = text || '';
  const m = ACHIEVED_PRICE_RE.exec(t);
  if (m) return parsePLN(m[1]);
  const m2 = ACHIEVED_PRICE_FALLBACK_RE.exec(t);
  return m2 ? parsePLN(m2[1] ?? m2[2]) : null;
}

export function isUnsoldText(text) {
  return /nikt\s+nie\s+wp[łl]aci[łl]\s+wadium|wynik(?:iem)?\s+negatywn|nie\s+przyst[ąa]pi[łl]|brak\s+ofert/i.test(
    text || '',
  );
}

const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5,
  'szóst': 6, szost: 6, 'siódm': 7, siodm: 7, 'ósm': 8, osm: 8,
  'dziewiąt': 9, dziewiat: 9, 'dziesiąt': 10, dziesiat: 10,
};
const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I|X)\b/;

export function roundFromTitle(text) {
  const t = text || '';
  const wm =
    /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm|dziewi[ąa]t|dziesi[ąa]t)\w*\s+przetarg/i.exec(
      t,
    );
  if (wm) {
    const key = wm[1].toLowerCase();
    for (const [prefix, val] of Object.entries(ROUND_WORDS)) {
      if (key.startsWith(prefix)) return val;
    }
  }
  const rm = ROMAN_RE.exec(t.toUpperCase());
  if (rm) return ROMAN_MAP[rm[1]] ?? null;
  return null;
}


const ARTICLE_RE = /<article class="row mb-5[^"]*"[\s\S]*?<\/article>/gi;
const BOARD_DATE_RE = /Opublikowane\s+dn\.\s*(\d{2})-(\d{2})-(\d{4})/i;
const BOARD_HREF_RE = /href="([^"]+\/n,\d+,[^"]+\.html)"/i;

export function parseBoardPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  let am;
  while ((am = ARTICLE_RE.exec(html)) !== null) {
    const chunk = am[0];
    const hrefM = BOARD_HREF_RE.exec(chunk);
    if (!hrefM) continue;
    const url = hrefM[1];
    if (seen.has(url)) continue;
    seen.add(url);
    const dateM = BOARD_DATE_RE.exec(chunk);
    out.push({
      url,
      published_date: dateM ? iso(dateM[3], dateM[2], dateM[1]) : null,
    });
  }
  return out;
}


const TITLE_RE = /<article class="news mb-4">\s*<h2 class="h5 mb-3">([\s\S]*?)<\/h2>/i;
const BODY_RE = /<div class="news_content_pdf">([\s\S]*?)<\/div>\s*<div style="clear:\s*both;">/i;
const PUBLISHED_BLOCK_RE = /<div class="py-2 ps-2 bg-light">([\s\S]*?)<\/div>/i;
const ATTACHMENT_PDF_RE = /<a href="([^"]+\.pdf)"[^>]*class="matomo_download"/i;

export function extractTitle(html) {
  const m = TITLE_RE.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

export function extractBody(html) {
  const m = BODY_RE.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

export function publishedDateFromDetail(html) {
  const m = PUBLISHED_BLOCK_RE.exec(html || '');
  return m ? parseDateText(stripTags(m[1])) : null;
}

export function extractAttachmentPdf(html) {
  const m = ATTACHMENT_PDF_RE.exec(html || '');
  return m ? m[1] : null;
}

export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik|wynik\s+przetargu/i.test(title || '');
}


function aptFromTitle(title) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(title || '');
  return m ? m[1] : null;
}

function streetBuildingFromTitle(title) {
  const m = /przy\s+ul\.?\s+([^\d]+?)\s+(\d+[A-Za-z]?)\s+wraz/i.exec(title || '');
  if (m) return { street: m[1].trim(), building: m[2] };
  const m2 = /przy\s+ul\.?\s+([^\d]+?)\s+(\d+[A-Za-z]?)(?:[.,]|\s*$)/i.exec(title || '');
  if (m2) return { street: m2[1].trim(), building: m2[2] };
  return null;
}

function flatAddressFromTitle(title) {
  const apt = aptFromTitle(title);
  const sb = streetBuildingFromTitle(title);
  if (!apt || !sb) return null;
  return parseAddress(`${sb.street} ${sb.building}/${apt}`);
}

const AREA_RE = /powierzchni\s+u[żz]ytkow\w*[^\d]{0,40}(\d+[,.]\d+)\s*m/i;

function unitAreaFromText(text) {
  const m = AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}


const LAND_TITLE_RE = /Dzia[łl]ka\s+(\d+(?:\/\d+)?)\s+obr[eę]b\s+([^\n<]+?)\s*$/i;
const LAND_BODY_RE =
  /o\s+numerze\s+(\d+(?:\/\d+)?)\s+po[łl]o[żz]on\w*\s+w\s+obr[eę]bie\s+([^\d,]+?)\s+o\s+pow/i;
const AREA_HA_RE = /o\s+pow\.?\s+(\d+[,.]\d+)\s*ha\b/i;

function landPlotFromTitleAndBody(title, body) {
  let dzialka_nr = null;
  let obreb = null;
  const tm = LAND_TITLE_RE.exec(title || '');
  if (tm) {
    dzialka_nr = tm[1];
    obreb = tm[2].trim();
  } else {
    const bm = LAND_BODY_RE.exec(body || '');
    if (bm) {
      dzialka_nr = bm[1];
      obreb = bm[2].trim();
    }
  }
  let area_m2 = null;
  const am = AREA_HA_RE.exec(body || '');
  if (am) {
    const ha = parseFloat(am[1].replace(',', '.'));
    if (Number.isFinite(ha) && ha > 0) area_m2 = Math.round(ha * 10000);
  }
  return { dzialka_nr, obreb, area_m2 };
}


export function parseDetailPage(html, url, publishedDateFallback = null) {
  if (!html) return null;
  const title = extractTitle(html);
  if (!title) return null;

  if (/wykaz/i.test(title)) return null;
  if (/rokowa/i.test(title)) return null;
  if (/bezprzetargow/i.test(title)) return null;
  if (isResultTitle(title)) return null;

  const body = extractBody(html);
  const kind = classifyKind(`${title} ${body}`);
  const published_date = publishedDateFromDetail(html) ?? publishedDateFallback;
  const round = roundFromTitle(`${title} ${body.slice(0, 300)}`);
  const starting_price_pln = startingPriceFromText(body);
  const auction_date = auctionDateFromText(body);

  if (kind === 'mieszkalny') {
    const address = flatAddressFromTitle(title);
    if (!address) return null;
    return {
      kind: 'mieszkalny',
      address_raw: `${address.street} ${address.building}/${address.apt ?? ''}`,
      address,
      area_m2: unitAreaFromText(body),
      starting_price_pln,
      auction_date,
      round,
      published_date,
      detail_url: url,
      source_url: url,
    };
  }

  if (kind === 'grunt') {
    const plot = landPlotFromTitleAndBody(title, body);
    if (!plot.dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      address_raw: plot.obreb ? `dz. ${plot.dzialka_nr}, obręb ${plot.obreb}` : `dz. ${plot.dzialka_nr}`,
      starting_price_pln,
      auction_date,
      round,
      published_date,
      detail_url: url,
      source_url: url,
    };
  }

  return null;
}


const LAND_CHUNK_RE = /Dla\s+dzia[łl]ki\s+nr\s+(\d+(?:\/\d+)?)/i;
const RESULT_HEAD_DATE_RE = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i;

function resultHeadDate(text) {
  const m = RESULT_HEAD_DATE_RE.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  return mon ? iso(m[3], mon, m[1]) : null;
}

function unsoldReasonFromText(text) {
  const t = text || '';
  if (/nikt\s+nie\s+wp[łl]aci[łl]\s+wadium/i.test(t)) return 'brak wadium';
  if (/nie\s+przyst[ąa]pi[łl]/i.test(t)) return 'nie przystąpiono';
  if (/brak\s+ofert/i.test(t)) return 'brak ofert';
  return 'wynik negatywny';
}

function splitLandChunks(text) {
  const parts = (text || '').split(/(?=\d+\.\s*Dla\s+dzia[łl]ki\s+nr)/i);
  return parts.filter((p) => LAND_CHUNK_RE.test(p));
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !String(text).trim()) return [];
  const t = String(text);
  if (!isResultTitle(t) && !/wynik(?:iem)?\s+negatywn/i.test(t)) return [];

  const headDate = resultHeadDate(t) ?? fallbackDate ?? null;
  const chunks = splitLandChunks(t);

  if (chunks.length > 0) {
    const out = [];
    for (const chunk of chunks) {
      const dzM = LAND_CHUNK_RE.exec(chunk);
      if (!dzM) continue;
      const starting_price_pln = startingPriceFromText(chunk);
      const final_price_pln = achievedPriceFromText(chunk);
      const sold = final_price_pln != null;
      const unsold = isUnsoldText(chunk);
      if (!sold && !unsold) continue;
      const notes = [];
      if (starting_price_pln == null) notes.push('parse: missing starting price');
      out.push({
        auction_date: headDate,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: dzM[1],
        obreb: null,
        area_m2: null,
        address_raw: `dz. ${dzM[1]}`,
        round: roundFromTitle(t.slice(0, 400)),
        starting_price_pln,
        final_price_pln: sold ? final_price_pln : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : unsoldReasonFromText(chunk),
        notes,
      });
    }
    return out;
  }

  const kind = classifyKind(t);
  const starting_price_pln = startingPriceFromText(t);
  const final_price_pln = achievedPriceFromText(t);
  const sold = final_price_pln != null;
  const unsold = isUnsoldText(t);
  if (!sold && !unsold) return [];

  if (kind === 'grunt') {
    const plot = landPlotFromTitleAndBody('', t);
    if (!plot.dzialka_nr) return [];
    const notes = [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [
      {
        auction_date: headDate,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        obreb: plot.obreb,
        area_m2: plot.area_m2,
        address_raw: plot.obreb ? `dz. ${plot.dzialka_nr}, obręb ${plot.obreb}` : `dz. ${plot.dzialka_nr}`,
        round: roundFromTitle(t.slice(0, 400)),
        starting_price_pln,
        final_price_pln: sold ? final_price_pln : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : unsoldReasonFromText(t),
        notes,
      },
    ];
  }

  const address = flatAddressFromTitle(t);
  if (!address) return [];
  const notes = ['parse: flat result template unverified against a live doc (see parse.js header)'];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  return [
    {
      auction_date: headDate,
      source_url: sourceUrl,
      kind: 'mieszkalny',
      address_raw: `${address.street} ${address.building}/${address.apt ?? ''}`,
      address,
      area_m2: unitAreaFromText(t),
      round: roundFromTitle(t.slice(0, 400)),
      starting_price_pln,
      final_price_pln: sold ? final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : unsoldReasonFromText(t),
      notes,
    },
  ];
}
