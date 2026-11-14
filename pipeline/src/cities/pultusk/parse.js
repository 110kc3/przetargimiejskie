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
  let cleaned = String(s).trim().replace(/z[łl]\.?\s*$/i, '').trim();
  cleaned = cleaned.replace(/[\s ]/g, '');
  cleaned = cleaned.replace(/[,.](\d{2})$/, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function haToM2(cellText) {
  const m = /(\d+[.,]\d+)\s*ha/i.exec(cellText || '');
  if (!m) return null;
  const ha = Number(m[1].replace(',', '.'));
  return Number.isFinite(ha) && ha > 0 ? Math.round(ha * 10000) : null;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}


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

const WORD_ORDINAL = { pierwsz: 1, drugi: 2, trzeci: 3, czwart: 4, piat: 5, 'piąt': 5 };

export function roundFromText(text) {
  if (!text) return null;
  const t = String(text);
  let m = /og[łl]asza\s+([IVXL]{1,4})\s+przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /\bo\s+([IVXL]{1,4})\s+przetarg\w*/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /^\s*([IVXL]{1,4})\s+przetarg/i.exec(t);
  if (m) return romanToInt(m[1]);
  m = /(pierwsz\w*|drugi\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+przetarg/i.exec(t);
  if (m) {
    const key = m[1].toLowerCase();
    for (const [pfx, n] of Object.entries(WORD_ORDINAL)) if (key.startsWith(pfx)) return n;
  }
  return null;
}


export function auctionDateFromText(text) {
  const t = String(text || '');
  let m = /odb[ęe]dzie\s+si[ęe][^\d]{0,20}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return iso(m[3], m[2], m[1]);
  m = /przeprowadzon\w*\s+zostan[ąa][^\d]{0,20}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return iso(m[3], m[2], m[1]);
  m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})[\s\S]{0,90}?odb[ęe]dzie\s+si[ęe]/i.exec(t);
  if (m) return iso(m[3], m[2], m[1]);
  return null;
}


export function kwNumberFromText(text) {
  const m = /(?:ksi[ęe]g[ęe]\s+wieczyst[ąa]\s+nr\.?|KW\s+nr\.?)\s*([A-Za-z0-9]+\/\d+\/\d+)/i.exec(text || '');
  return m ? m[1] : null;
}


export function obrebFromText(text) {
  const m = /w\s+obr[ęe]bie\s+(\S+)\s+miasta\s+Pu[łl]tusk/i.exec(text || '');
  return m ? m[1].replace(/[,.]$/, '') : null;
}


export function aptFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? m[1] : null;
}

export function streetBuildingFromText(text) {
  const m = /przy\s+(?:ulicy|ul\.?)\s+(.+?)\s+w\s+Pu[łl]tusku/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').replace(/[,.;]+$/, '').trim() || null;
}

export function areaFromDescCell(cellText) {
  const m = /powierzchni\s+(\d+[.,]\d+)\s*m\s*[²2]/i.exec(cellText || '');
  return m ? parseArea(m[1]) : null;
}


export function parcelsFromCell(cellText) {
  const out = [];
  const re = /\d+\/\d+/g;
  let m;
  while ((m = re.exec(cellText || '')) !== null) out.push(m[0]);
  return out;
}


export function isLeaseTitle(title) {
  return /najem|dzier[żz]aw|wynaj/i.test(title || '');
}

export function isWykazTitle(title) {
  return /^\s*wykaz\b/i.test(title || '');
}


export function extractTables(html) {
  const tables = [];
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;
  while ((tm = tableRe.exec(html || '')) !== null) {
    const rows = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(tm[1])) !== null) {
      const cells = [];
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cm;
      while ((cm = cellRe.exec(rm[1])) !== null) cells.push(stripTags(cm[1]));
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

function findCol(header, re) {
  return header.findIndex((h) => re.test(h));
}

export function findPricedTable(html) {
  const tables = extractTables(html);
  for (const rows of tables) {
    const header = rows[0] || [];
    const priceCol = findCol(header, /cena\s+wywo[łl]awcza/i);
    if (priceCol === -1) continue;
    return { header, dataRows: rows.slice(1), priceCol, wadiumCol: findCol(header, /wadium/i) };
  }
  return null;
}

function introText(html) {
  const idx = (html || '').search(/<table[\s>]/i);
  const head = idx === -1 ? html : String(html).slice(0, idx);
  return stripTags(head);
}

function pdfLinkFromHtml(html) {
  const m = /<a[^>]+href="([^"]+\.pdf)"/i.exec(html || '');
  return m ? m[1] : null;
}


export function parseFlatAnnouncement(post) {
  if (!post) return null;
  const title = stripTags(post.title || '');
  const content = post.content || '';
  const intro = introText(content);
  const bodyText = stripTags(content);

  const table = findPricedTable(content);
  if (!table) return null;
  const descCol = findCol(table.header, /opis\s+lokalu/i);
  if (descCol === -1) return null;
  const row = table.dataRows[0];
  if (!row) return null;

  const apt = aptFromText(intro);
  const streetBuilding = streetBuildingFromText(intro);
  if (!apt || !streetBuilding) return null;

  const address_raw = `${streetBuilding}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const starting_price_pln = parsePLN(row[table.priceCol]);
  if (starting_price_pln == null) return null;

  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaFromDescCell(row[descCol]),
    starting_price_pln,
    wadium_pln: table.wadiumCol !== -1 ? parsePLN(row[table.wadiumCol]) : null,
    auction_date: auctionDateFromText(bodyText),
    round: roundFromText(intro) ?? roundFromText(title),
    kw_nr: kwNumberFromText(intro),
    published_date: (post.date || '').slice(0, 10) || null,
    detail_url: post.link || null,
    detail_pdf: pdfLinkFromHtml(content),
  };
}


export function parseLandAnnouncements(post) {
  if (!post) return [];
  const title = stripTags(post.title || '');
  const content = post.content || '';
  const intro = introText(content);
  const bodyText = stripTags(content);

  const table = findPricedTable(content);
  if (!table) return [];
  const parcelCol = findCol(table.header, /nr\s*ewid|dzia[łl]ek|oznaczenie/i);
  if (parcelCol === -1) return [];
  const areaCol = findCol(table.header, /powierzchni/i);

  const obreb = obrebFromText(intro);
  const address_raw = obreb ? `obręb ${obreb} m. Pułtusk` : null;
  const auction_date = auctionDateFromText(bodyText);
  const round = roundFromText(intro) ?? roundFromText(title);
  const kw_nr = kwNumberFromText(intro);
  const published_date = (post.date || '').slice(0, 10) || null;
  const detail_pdf = pdfLinkFromHtml(content);

  const out = [];
  for (const row of table.dataRows) {
    const parcels = parcelsFromCell(row[parcelCol]);
    if (!parcels.length) continue;
    const starting_price_pln = parsePLN(row[table.priceCol]);
    if (starting_price_pln == null) continue;
    out.push({
      kind: 'grunt',
      dzialka_nr: parcels.join(', '),
      area_m2: areaCol !== -1 ? haToM2(row[areaCol]) : null,
      address_raw,
      starting_price_pln,
      wadium_pln: table.wadiumCol !== -1 ? parsePLN(row[table.wadiumCol]) : null,
      auction_date,
      round,
      kw_nr,
      published_date,
      detail_url: post.link || null,
      detail_pdf,
    });
  }
  return out;
}


export function parseAnnouncementPost(post) {
  if (!post) return [];
  const title = stripTags(post.title || '');
  if (isWykazTitle(title)) return [];
  if (isLeaseTitle(title)) return [];

  const kind = classifyKind(`${title} ${stripTags(post.content || '')}`);
  if (kind === 'mieszkalny') {
    const rec = parseFlatAnnouncement(post);
    return rec ? [rec] : [];
  }
  if (kind === 'grunt') {
    return parseLandAnnouncements(post);
  }
  return [];
}


export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
