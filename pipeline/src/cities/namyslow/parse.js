
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function stripTags(s) {
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
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
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

const PL_MONTH_ABBR = {
  sty: 1, lut: 2, mar: 3, kwi: 4, maj: 5, cze: 6,
  lip: 7, sie: 8, wrz: 9, 'paź': 10, paz: 10, lis: 11, gru: 12,
};


const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50 };

function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VAL[up[i]];
    const next = ROMAN_VAL[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

export function roundFromText(text) {
  const m = /og[łl]asza\s+([IVXL](?:\s*[IVXL]){0,4})\s+(?:publiczny\s+)?przetarg/i.exec(text || '');
  if (!m) return null;
  return romanToInt(m[1].replace(/\s+/g, ''));
}

export function roundFromTitle(title) {
  const m = /^\s*([IVXL](?:\s*[IVXL]){0,4})\s+publiczny\s+przetarg/i.exec(title || '');
  return m ? romanToInt(m[1].replace(/\s+/g, '')) : null;
}


export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTHS[m[2].toLowerCase()];
  return mo ? iso(m[3], mo, m[1]) : null;
}

export function parsePublishedShort(s) {
  const m = /([a-ząćęłńóśźż]{3})\s+(\d{1,2}),\s*(\d{4})/i.exec(s || '');
  if (!m) return null;
  const mo = PL_MONTH_ABBR[m[1].toLowerCase()];
  return mo ? iso(m[3], mo, m[2]) : null;
}


export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\s*[–‒\-:]?\s*(\d[\d.,\s]*)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function areaM2FromText(text) {
  const m = /powierzchni\s+u[żz]ytkow\w*[\s\S]{0,60}?(\d+[.,]\d+)\s*m\s*[²2]/i.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

export function kwNumberFromText(text) {
  const m = /ksi[ęe]g[ęe]\s+wieczyst[ąa]\s+nr\.?\s*([A-Z0-9]+\/\d+\/\d+)/i.exec(text || '');
  return m ? m[1] : null;
}

export function aptFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? m[1] : null;
}

export function streetBuildingFromText(text) {
  const m = /po[łl]o[żz]on\w*\s+przy\s+(?:ul\.?\s*)?(.+?)\s+w\s+Namys[łl]owie/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').replace(/[,.;]+$/, '').trim() || null;
}


export function parseNoticeText(text) {
  if (!text) return null;
  if (classifyKind(text) !== 'mieszkalny') return null;

  const apt = aptFromText(text);
  const streetBuilding = streetBuildingFromText(text);
  if (!apt || !streetBuilding) return null;

  const address_raw = `${streetBuilding}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaM2FromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text),
    kw_nr: kwNumberFromText(text),
  };
}


const LEASE_RE = /\bnajem\b|dzier[żz]aw|wynajem/i;

export function isFlatSaleTitle(title) {
  if (!title) return false;
  if (LEASE_RE.test(title)) return false;
  return classifyKind(title) === 'mieszkalny';
}

export function parseBoardPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  const artRe = /<article\s+id="post-\d+"\s+class="et_pb_post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let am;
  while ((am = artRe.exec(html)) !== null) {
    const block = am[1];
    const linkM = /<h2 class="entry-title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/i.exec(block);
    if (!linkM) continue;
    const url = linkM[1].trim();
    if (seen.has(url)) continue;
    seen.add(url);
    const title = stripTags(linkM[2]);
    const pubM = /<span class="published">([^<]+)<\/span>/i.exec(block);
    const published_date = pubM ? parsePublishedShort(pubM[1]) : null;
    out.push({ url, title, published_date });
  }
  return out;
}


function entryContentBlock(html) {
  const m = /<div class="entry-content">([\s\S]*?)<\/article>/i.exec(html);
  return m ? m[1] : html;
}

function pdfLinksFromBlock(block) {
  const out = [];
  const re = /<a href="([^"]+\.pdf)"[^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi;
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push({ url: m[1], text: stripTags(m[2]) });
  }
  return out;
}

function titleFromHtml(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  return m ? stripTags(m[1]) : null;
}

export function parseDetailPage(html, pageUrl) {
  if (!html) return null;
  const block = entryContentBlock(html);
  const text = stripTags(block);
  const rec = parseNoticeText(text);
  if (!rec) return null;

  const round = rec.round ?? roundFromTitle(titleFromHtml(html));

  const pdfs = pdfLinksFromBlock(block);
  const detail_pdf =
    pdfs.find((p) => /og[łl]oszeni/i.test(p.text))?.url ??
    pdfs.find((p) => !/regulamin/i.test(p.text))?.url ??
    null;

  return { ...rec, round, detail_url: pageUrl, detail_pdf };
}


export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
