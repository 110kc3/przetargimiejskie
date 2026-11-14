import { TERYT, CITY_NAME } from './config.js';

const MONTHS_PL = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05', czerwca: '06',
  lipca: '07', sierpnia: '08', wrzesnia: '09', września: '09', pazdziernika: '10', października: '10',
  listopada: '11', grudnia: '12',
};

export function extractAuctionType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('ustn') && (lower.includes('nieograniczon') || lower.includes('nieograniczony'))) {
    return 'oral_unlimited';
  }
  if (lower.includes('ustn') && lower.includes('ograniczon')) {
    return 'oral_limited';
  }
  if (lower.includes('pisemn') && (lower.includes('nieograniczon') || lower.includes('nieograniczony'))) {
    return 'written_unlimited';
  }
  if (lower.includes('pisemn') && lower.includes('ograniczon')) {
    return 'written_limited';
  }
  if (lower.includes('rokowan') || lower.includes('negocjacj')) {
    return 'negotiations';
  }
  if (lower.includes('wykaz')) {
    return 'wykaz';
  }
  return 'oral_unlimited';
}

export function extractPropertyType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('lokal mieszkaln') || lower.includes('lokalu mieszkaln') || lower.includes('mieszkani') || lower.includes('mieszkanie')) {
    return 'residential';
  }
  if (lower.includes('lokal u') || lower.includes('lokalu u') || lower.includes('użytkow')) {
    return 'commercial';
  }
  if (lower.includes('garaż') || lower.includes('garaz')) {
    return 'garage';
  }
  if (lower.includes('budynk') || lower.includes('budynek')) {
    return 'building';
  }
  if (lower.includes('działk') || lower.includes('dzialk') || lower.includes('grun') || /dz\.\s*ewid/i.test(text)) {
    return 'land';
  }
  return 'other';
}

export function extractPrice(text) {
  const m = text.match(/(?:cena\s+wywo[łl]awcza|wywo[łl]awcza|cena)\s*(?:\([^)]*\))?(?:\s+wynosi)?\s*[:\-]?\s*([1-9]\d{0,2}(?:[\s.]\d{3})*(?:,\d{2})?)\s*z[łl]/i);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '').replace('.', '').replace(',', '.');
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

export function extractDeposit(text) {
  const m = text.match(/wadium(?:\s+(?:w\s+wysoko[śs]ci|wynosi))?\s*[:\-]?\s*([1-9]\d{0,2}(?:[\s.]\d{3})*(?:,\d{2})?)\s*z[łl]/i);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '').replace('.', '').replace(',', '.');
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

export function extractAuctionDate(text) {
  const m = text.match(/(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})(?:\s*r(?:\.|oku)?)?/i);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = MONTHS_PL[m[2].toLowerCase()];
    const year = m[3];
    if (month) return `${year}-${month}-${day}`;
  }
  const m2 = text.match(/\b(\d{2})[.-](\d{2})[.-](\d{4})\b/);
  if (m2) {
    return `${m2[3]}-${m2[2]}-${m2[1]}`;
  }
  return null;
}

export function extractParcels(text) {
  const results = new Set();
  const regex = /(?:\bdzia[łl][a-ząćęłńóśźż]*|nr\s+ewid\.\s*dzia[łl]ki|nr\s+ewid\.|dz\.\s*ewid\.|dz\.)\s*(?:nr\s*)?([0-9]+(?:\/[0-9]+)?)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const p = match[1].trim();
    if (p && p !== '0') results.add(p);
  }
  return Array.from(results);
}

export function extractKw(text) {
  const m = text.match(/\b([A-Z0-9]{4}\/\d{8}\/\d)\b/);
  return m ? m[1] : null;
}

export function extractArea(text) {
  const m = text.match(/(?:pow[a-z]*\s*u[żz]ytk[a-z]*|powierzchnia|pow\.)\s*[:\-]?\s*([0-9]+(?:[,.][0-9]+)?)\s*m(?:2|kw|\^2)/i);
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export function extractAddress(text) {
  const m = text.match(/(?:ul\.|ulicy|al\.|alei|pl\.|placu)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ0-9.\-\s]+?(?:\d+[a-zA-Z]?(?:\s*(?:m\.|lok\.)\s*\d+)?))/i);
  if (m) {
    return m[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

export function isNoticeRelevant(title, text) {
  const combined = `${title || ''} ${text || ''}`.toLowerCase();
  const keywords = ['przetarg', 'rokowan', 'wykaz', 'licytacj', 'sprzeda'];
  return keywords.some(k => combined.includes(k));
}

export function parseNotice({ id, title, content = '', attachmentsText = '', date, url, attachments = [] }) {
  const fullText = `${title || ''}\n${content || ''}\n${attachmentsText || ''}`;
  if (!isNoticeRelevant(title, fullText)) {
    return null;
  }

  const isResult = /wynik|informacja\s+o\s+wyniku|rozstrzygni/i.test(title || '') ||
                   /informacja\s+o\s+wyniku/i.test(fullText.slice(0, 300));

  const isWykaz = /wykaz/i.test(title || '') && !/przetarg/i.test(title || '');

  let status = 'active';
  if (isResult) {
    status = 'result';
  } else if (isWykaz) {
    status = 'wykaz';
  }

  const parcels = extractParcels(fullText);
  const price = extractPrice(fullText);
  const deposit = extractDeposit(fullText);
  const auctionDate = extractAuctionDate(fullText) || (status === 'active' ? null : (date ? date.slice(0, 10) : null));
  const auctionType = extractAuctionType(fullText);
  const propertyType = extractPropertyType(fullText);
  const kw = extractKw(fullText);
  const areaM2 = extractArea(fullText);
  const address = extractAddress(fullText);

  return {
    id: `zyrardow-${id}`,
    city: CITY_NAME,
    teryt: TERYT,
    title: (title || '').trim(),
    status,
    auctionType,
    propertyType,
    address,
    parcels,
    areaM2,
    price,
    deposit,
    auctionDate,
    publicationDate: date ? date.slice(0, 10) : null,
    url,
    kwNumber: kw,
    sourceHost: 'bip.zyrardow.pl',
    attachments: attachments.map(a => ({
      name: a.name || a.filename || 'załącznik',
      url: a.url || a.link,
    })),
  };
}

export function parseResultDoc(textOrHtml, fallbackDate, sourceUrl) {
  return [];
}
