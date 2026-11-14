import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const HTML_ENTITIES = {
  'oacute': 'ó', 'Oacute': 'Ó',
  'aacute': 'á', 'eacute': 'é', 'iacute': 'í', 'uacute': 'ú',
  'Aacute': 'Á', 'Eacute': 'É', 'Iacute': 'Í', 'Uacute': 'Ú',
  'agrave': 'à', 'egrave': 'è', 'nbsp': ' ', 'amp': '&',
  'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
  'sup2': '²', 'sup3': '³', 'ndash': '–', 'mdash': '—',
};

function decodeHtml(s) {
  return (s || '').replace(/&([a-zA-Z0-9]+);/g, (_, name) => HTML_ENTITIES[name] ?? '');
}

function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeHtml(s);
  return s.replace(/\s+/g, ' ').trim();
}

function cellsFromRow(trHtml) {
  const cells = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = re.exec(trHtml)) !== null) {
    cells.push(htmlToText(m[1]));
  }
  return cells;
}

function rowsFromTable(tableHtml) {
  const rows = [];
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(tableHtml)) !== null) {
    rows.push(m[1]);
  }
  return rows;
}

function isHeaderRow(rowHtml) {
  if (/<th/i.test(rowHtml)) return true;
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  let totalCells = 0;
  let emOnlyCells = 0;
  while ((m = cellRe.exec(rowHtml)) !== null) {
    const inner = m[1];
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!text) { emOnlyCells++; totalCells++; continue; }
    const withoutEm = inner.replace(/<em[^>]*>[\s\S]*?<\/em>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    totalCells++;
    if (!withoutEm) emOnlyCells++;
  }
  return totalCells > 0 && emOnlyCells === totalCells;
}

function parsePLN(s) {
  if (!s) return null;
  const m = /([\d][\d\s.]*,\d{2})/.exec(String(s));
  if (m) {
    const cleaned = m[1].replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(String(s).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'wrzesnia': 9, 'pazdziernika': 10,
  listopada: 11, grudnia: 12,
};

function parseDateDMY(dmy) {
  if (!dmy) return null;
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(dmy);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}


const ORDINAL_MAP = {
  'pierwsz': 1, 'drug': 2, 'trzeci': 3, 'czwart': 4,
  'piat': 5, 'szost': 6,
};

export function roundFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase()
    .replace(/ą/g, 'a').replace(/ó/g, 'o').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ś/g, 's').replace(/ź/g, 'z')
    .replace(/ż/g, 'z').replace(/ć/g, 'c').replace(/ń/g, 'n')
    .replace(/ó/g, 'o');
  if (!t) return null;
  for (const [stem, n] of Object.entries(ORDINAL_MAP)) {
    if (t.includes(stem)) return n;
  }
  if (/przetarg/.test(t)) return 1;
  return null;
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (!t) return false;
  if (/informacja\s+o\s+wyniku|wynik\s+przetargu/.test(t)) return false;
  if (!/przetarg|og.oszenie/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (!/lokal\w*\s+mieszkaln/.test(t)) return false;
  if (/niemieszkał|niemieszkala|lokal\w*\s+u[zz]ytkow|pomieszczen\w*\s+gospodarcz/.test(t)) return false;
  return true;
}

export function isResultTitle(title) {
  const t = (title || '').toLowerCase();
  if (!t) return false;
  if (!/informacja\s+o\s+wyniku|wynik\s+przetargu/.test(t)) return false;
  if (/lokal\w*\s+niemieszkał|lokal\w*\s+niemieszkala|lokal\w*\s+u[zz]ytkow|pomieszczen\w*\s+gospodarcz/.test(t)) return false;
  return true;
}


export function auctionDateFromText(text) {
  const t = (text || '');
  const m1 = /odb[eę]dzie\s+si[eę](?:\s+w\s+dniu)?\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  const tNorm = t.toLowerCase()
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ń/g, 'n').replace(/ą/g, 'a').replace(/ł/g, 'l');
  const m2 = /odb[e]dzie\s+si[e](?:\s+w\s+dniu)?\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(tNorm);
  if (m2) {
    const mo = PL_MONTHS[m2[2]];
    if (mo) return `${m2[3]}-${String(mo).padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

export function parseAnnouncementPage(html, detailUrl, rssTitle, rssDate) {
  if (!html) return null;

  const h2Match = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  const h2Text = htmlToText(h2Match ? h2Match[1] : '');
  if (!isAnnouncementTitle(h2Text) && !isAnnouncementTitle(rssTitle)) return null;

  const contentStart = html.indexOf('id="tresc"');
  const content = contentStart >= 0 ? html.slice(contentStart) : html;

  const tableMatch = /<table[\s\S]*?<\/table>/i.exec(content);
  if (!tableMatch) return null;
  const tableHtml = tableMatch[0];

  const rows = rowsFromTable(tableHtml);
  const dataRows = rows.filter(function(r) { return /<td/i.test(r) && !isHeaderRow(r); });
  if (dataRows.length === 0) return null;

  const cells = cellsFromRow(dataRows[0]);
  if (cells.length < 4) return null;

  const posCell = cells[1] || '';
  const addrRaw = extractAddressFromCell(posCell);
  const address = addrRaw ? parseAddress(addrRaw) : null;
  if (!address) return null;

  const areaCell = cells[3] || '';
  const area_m2 = parseArea(areaCell.split(/\s/)[0]);

  const priceCell = cells[6] || '';
  const starting_price_pln = parsePLN(priceCell);

  const afterTable = content.slice(tableMatch.index + tableMatch[0].length);
  const auction_date = auctionDateFromText(afterTable);

  const round = roundFromText(rssTitle || h2Text);

  const fullText = htmlToText(content);
  const kind = classifyKind(fullText);

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addrRaw,
    address,
    auction_date,
    published_date: rssDate || null,
    round,
    area_m2,
    starting_price_pln,
    detail_url: detailUrl,
  };
}

export function extractAddressFromCell(cellText) {
  if (!cellText) return null;
  const t = cellText.replace(/\s+/g, ' ').trim();

  const splitRe = /\b(?:parter|pi[eę]tro|Opis:|opis:|piwnic|suteren)/i;
  const chunk = t.split(splitRe)[0].trim();

  const streetRe = /^(?:(?:ul|al|pl|os)\.?\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ .'''\-]{1,50}?\s+\d+(?:[A-Za-z])?(?:\s*\/\s*\d+[A-Za-z]?)?)/i;
  const m = streetRe.exec(chunk);
  if (!m) return null;

  const hasPrefix = /^(?:ul|al|pl|os)\.?\s/i.test(t);
  const prefixMatch = hasPrefix ? t.match(/^((?:ul|al|pl|os)\.?)\s*/i) : null;
  const prefix = prefixMatch ? prefixMatch[1] + ' ' : '';
  return (prefix + m[1]).replace(/\s+/g, ' ').trim();
}


export function isResultNotice(html) {
  return /INFORMACJA\s+O\s+WYNIKU/i.test(html || '');
}

export function auctionDateFromResultText(text) {
  const t = text || '';
  const m = /(?:PRZEPROWADZONEGO|przeprowadzonego)\s+W\s+DNIU\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const tNorm = t.toLowerCase()
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ó/g, 'o')
    .replace(/ń/g, 'n').replace(/ą/g, 'a').replace(/ł/g, 'l');
  const m2 = /w\s+dniu\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(tNorm);
  if (m2) {
    const mo = PL_MONTHS[m2[2]];
    if (mo) return `${m2[3]}-${String(mo).padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

export function parseResultDoc(html, fallbackDate, sourceUrl) {
  if (!isResultNotice(html)) return [];

  const contentStart = html.indexOf('id="tresc"');
  const content = contentStart >= 0 ? html.slice(contentStart) : html;
  const fullText = htmlToText(content);

  const auction_date = auctionDateFromResultText(fullText) || fallbackDate || null;

  const h2Match = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(content);
  const h2Text = htmlToText(h2Match ? h2Match[1] : '');
  const round = roundFromText(h2Text) || roundFromText(fullText);

  const tableMatch = /<table[\s\S]*?<\/table>/i.exec(content);
  if (!tableMatch) return [];
  const tableHtml = tableMatch[0];

  const rows = rowsFromTable(tableHtml);
  const dataRows = rows.filter(function(r) { return /<td/i.test(r) && !isHeaderRow(r); });

  const out = [];
  for (const rowHtml of dataRows) {
    const cells = cellsFromRow(rowHtml);
    if (cells.length < 7) continue;

    const addrRaw = extractAddressFromCell(cells[1] || '');
    if (!addrRaw) continue;
    const address = parseAddress(addrRaw);
    if (!address) continue;

    const areaCell = cells[3] || '';
    const areaFirst = areaCell.replace(/,/g, '.').match(/\d[\d.]*/);
    const area_m2 = parseArea(areaFirst ? areaFirst[0] : null);

    const starting_price_pln = parsePLN(cells[6]);

    const finalStr = (cells[7] || '').trim();
    const final_price_pln = finalStr ? parsePLN(finalStr) : null;

    const nabywca = (cells[8] || '').trim();
    const outcome = (final_price_pln != null || (nabywca && nabywca !== '&nbsp;')) ? 'sold' : 'unsold';
    const unsold_reason = outcome === 'unsold' ? 'unknown' : null;

    const blockText = cells.join(' ');
    const kind = classifyKind(blockText);

    out.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addrRaw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2,
      notes: [],
    });
  }
  return out;
}
