
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
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const PL_MONTHS_DIACRITIC_MAP = {
  'września': 9, 'października': 10,
};

function plMonthNum(word) {
  const lower = word.toLowerCase();
  return PL_MONTHS[lower] ?? PL_MONTHS_DIACRITIC_MAP[lower] ?? null;
}

export function parseDateText(s) {
  if (!s) return null;
  const num = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/.exec(s);
  if (num) return iso(num[3], num[2], num[1]);
  const word = /(\d{1,2})\s+([a-zA-ZÀ-ž]{3,})\s+(\d{4})/.exec(s);
  if (word) {
    const mon = plMonthNum(word[2]);
    if (mon) return iso(word[3], mon, word[1]);
  }
  return null;
}

export function dateFromUrl(url) {
  const m = /\/(\d{2})-(\d{2})-(\d{4})\s*$/.exec((url || '').trim());
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}



const INDEX_LINK_RE = /href="(https?:\/\/nowasol\.pl\/przetargi\/przetarg\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const PUB_DATE_RE = /Data\s+publikacji\s*:\s*([^<\n]+)/i;

export function parseIndexPage(html) {
  if (!html) return [];
  const out = [];
  const seen = new Set();
  let m;
  while ((m = INDEX_LINK_RE.exec(html)) !== null) {
    const url = m[1].trim();
    if (seen.has(url)) continue;
    const title = stripTags(m[2]);
    if (classifyKind(title) !== 'mieszkalny') continue;
    seen.add(url);
    const context = html.slice(m.index, m.index + 500);
    const dateM = PUB_DATE_RE.exec(context);
    const published_date = dateM
      ? parseDateText(dateM[1].trim())
      : dateFromUrl(url);
    out.push({ url, title, published_date });
  }
  return out;
}



const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 };
const ROMAN_RE = /\b(VIII|VII|VI|IX|IV|V|III|II|I)\b/;

function roundFromTitle(title) {
  const m = ROMAN_RE.exec((title || '').toUpperCase());
  if (m) return ROMAN_MAP[m[1]] ?? 1;
  const nm = /\b([1-9])\s+przetarg/i.exec(title || '');
  if (nm) return Number(nm[1]);
  return null;
}

function countPreviousRounds(text) {
  const m = /Poprzednie przetargi[\s\S]*?odby[lł]y\s+si[eę]\s+w\s+dniach\s*:([\s\S]*?)(?=Wadium|Przetarg\s+odb|$)/i.exec(text);
  if (!m) return 0;
  const dashCount = (m[1].match(/[–\-]\s+\d/g) || []).length;
  return dashCount;
}

export function parseDetailPage(html, pageUrl) {
  if (!html) return null;

  const text = stripTags(html);

  if (classifyKind(text) !== 'mieszkalny') return null;

  const published_date = dateFromUrl(pageUrl);

  let title = '';
  const h2M = /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi;
  let hm;
  while ((hm = h2M.exec(html)) !== null) {
    const t = stripTags(hm[1]);
    if (/lokal\w*\s+mieszkaln/i.test(t)) {
      title = t;
      break;
    }
  }

  const tableM = /<table[\s\S]*?<\/table>/i.exec(html);
  if (!tableM) return null;
  const tableText = stripTags(tableM[0]);

  const kwM = /([A-Z][A-Z0-9]{1,5}\/\d{5,9}\/\d+)/.exec(tableText);
  const kw_nr = kwM ? kwM[1] : null;

  const addrM = /ul\.\s+([\wÀ-ž\s.]+?\s+\d+[A-Za-z]?)(?=\s+(?:\d|nr|o\s+pow|obr[eę]b|dzia[lł]|udzia[lł]|lok|Lp\.|$))/i.exec(tableText);
  const addressRaw = addrM ? 'ul. ' + addrM[1].trim() : null;

  const lokalM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(tableText);
  const localNo = lokalM ? lokalM[1] : null;

  let address = null;
  if (addressRaw && localNo) {
    address = parseAddress(`${addressRaw}/${localNo}`);
  } else if (addressRaw) {
    address = parseAddress(addressRaw);
  }

  const areaM = /(\d+[,.]\d+)\s*m/.exec(tableText);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const priceM = /(\d[\d\s]*)000,00/i.exec(tableText);
  let starting_price_pln = null;
  if (priceM) {
    starting_price_pln = parsePLN(priceM[1].replace(/\s/g, '') + '000');
  }

  const auctionRe = /Przetarg\s+odb[eę]dzie\s+si[eę]\s+(\d{1,2}\s+[a-zA-ZÀ-ž]+\s+\d{4})/i;
  const auctionM = auctionRe.exec(text);
  const auction_date = auctionM ? parseDateText(auctionM[1]) : null;

  let round = roundFromTitle(title);
  if (round == null) {
    const prev = countPreviousRounds(text);
    if (prev > 0) round = prev + 1;
  }

  return {
    kind: 'mieszkalny',
    title,
    kw_nr: kw_nr ?? null,
    address_raw: addressRaw ?? title,
    address,
    area_m2: area_m2 ?? null,
    round: round ?? null,
    starting_price_pln: starting_price_pln ?? null,
    auction_date,
    published_date,
    detail_url: pageUrl,
  };
}


export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
