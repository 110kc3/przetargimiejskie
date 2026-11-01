import { TERYT, CITY_NAME } from './config.js';

const MONTHS_PL = {
  stycznia: '01', styczeń: '01',
  lutego: '02', luty: '02',
  marca: '03', marzec: '03',
  kwietnia: '04', kwiecień: '04',
  maja: '05', maj: '05',
  czerwca: '06', czerwiec: '06',
  lipca: '07', lipiec: '07',
  sierpnia: '08', sierpień: '08',
  wrzesnia: '09', września: '09', wrzesień: '09',
  pazdziernika: '10', października: '10', październik: '10',
  listopada: '11', listopad: '11',
  grudnia: '12', grudzień: '12',
};

export function extractAuctionType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('ustn') || lower.includes('licytacj')) {
    if (lower.includes('nieograniczon')) return 'oral_unlimited';
    if (lower.includes('ograniczon')) return 'oral_limited';
  }
  if (lower.includes('pisemn')) {
    if (lower.includes('nieograniczon')) return 'written_unlimited';
    if (lower.includes('ograniczon')) return 'written_limited';
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
  if (lower.includes('garaż') || lower.includes('garaz')) {
    return 'garage';
  }
  if (lower.includes('lokal u') || lower.includes('lokalu u') || (lower.includes('użytkow') && !lower.includes('powierzchni') && !lower.includes('pow.')) || lower.includes('przemysłow') || lower.includes('składow')) {
    return 'commercial';
  }
  if (/lokal[a-ząćęłńóśźż]*\s*mieszkaln[a-ząćęłńóśźż]*/i.test(text) || (lower.includes('mieszkani') && lower.includes('lokal'))) {
    return 'residential';
  }
  if (lower.includes('działk') || lower.includes('dzialk') || lower.includes('dz.') || lower.includes('grun') || lower.includes('obręb') || lower.includes('obr.') || lower.includes('zabudowy mieszkaniowej') || lower.includes('budownictwa mieszkaniowego')) {
    return 'land';
  }
  if (lower.includes('budynk') || lower.includes('budynek')) {
    return 'building';
  }
  return 'other';
}

export function extractPrice(text) {
  const m = text.match(/(?:cena\s+wywo[łl]awcza|wywo[łl]awcza|cena)\s*(?:\([^)]*\))?(?:\s+(?:nieruchomo[śs]ci|lokalu|dzia[łl]ki|gara[żz]u))?(?:\s+(?:netto|brutto))?(?:\s+w\s+z[łl]\.?)?(?:\s+wynosi)?\s*[:\-–]?\s*([1-9]\d{0,2}(?:[\s.]\d{3})*(?:,\d{2})?)(?:\s*z[łl])?/i);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

export function extractDeposit(text) {
  const m = text.match(/wadium(?:\s+(?:w\s+wysoko[śs]ci|wynosi|w\s+z[łl]\.?))?\s*[:\-–]?\s*([1-9]\d{0,2}(?:[\s.]\d{3})*(?:,\d{2})?)(?:\s*z[łl])?/i);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

export function extractAuctionDate(text) {
  const m2 = text.match(/\b(\d{2})[.-](\d{2})[.-](\d{4})\b/);
  if (m2) {
    return `${m2[3]}-${m2[2]}-${m2[1]}`;
  }
  const m = text.match(/(?:(?:\bw\s+)?dniu|dnia|termin(?:\s+przetarg[oó]w)?\s*[:\-]?\s*(?:w\s+dniu)?)\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})(?:\s*r(?:\.|oku)?)?/i);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = MONTHS_PL[m[2].toLowerCase()];
    const year = m[3];
    if (month) return `${year}-${month}-${day}`;
  }
  return null;
}

export function extractParcels(text) {
  const results = new Set();
  const regex = /(?:\bdzia[łl][a-ząćęłńóśźż]*(?:\s+ewid\.?|\s+ew\.?)?|nr\s+ewid\.|dz\.\s*ewid\.|dz\.\s*ew\.|dz\.|\bnr|\bnieruchomo[śs][ćc]\s+nr)\s*(?:nr\s*)?[:\-]?\s*([0-9]+(?:\/[0-9]+)?)/gi;
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
  const mHa = text.match(/(?:o\s+powierzchni|powierzchnia(?:\s+dzia[łl]ki)?|pow\.(?:\s+w\s+ha)?)\s*[:\-]?\s*([0-9]+(?:[,.][0-9]+)?)\s*ha\b/i);
  if (mHa) {
    const haVal = parseFloat(mHa[1].replace(',', '.'));
    if (Number.isFinite(haVal)) return Math.round(haVal * 10000 * 100) / 100;
  }
  const mM2 = text.match(/(?:pow[a-z.]*\s*u[żz]ytk[a-z.]*|powierzchni\s+[łl][ąa]cznej|powierzchnia(?:\s+dzia[łl]ki)?|pow\.)\s*(?:w\s+m2)?\s*[:\-]?\s*([0-9]+(?:[\s.][0-9]{3})*(?:,[0-9]+)?)\s*(?:m(?:2|kw|\^2|&sup2;))?/i);
  if (mM2) {
    const raw = mM2[1].replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(raw);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export function extractAddress(text) {
  const m = text.match(/(?:ul\.|ulicy|al\.|alei|pl\.|placu)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ0-9.\-\s\/]+?(?:\d+[a-zA-Z]?(?:\s*(?:m\.|lok\.|[\/])\s*\d+)?)?)(?:[,\n;]|$)/i);
  if (m && !m[1].includes('Parkowa 22') && !m[1].includes('Rynek 26')) {
    return m[1].trim().replace(/\s+/g, ' ');
  }
  const mObr = text.match(/(?:obr[ęe]b(?:ie)?(?:\s+ewidencyjnym)?|obr\.)\s+([0-9]+|[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i);
  if (mObr) {
    return `obręb ${mObr[1].trim()}`;
  }
  return null;
}

export function isNoticeRelevant(title, text) {
  const combined = `${title || ''} ${text || ''}`.toLowerCase();
  const keywords = ['przetarg', 'rokowan', 'wykaz', 'licytacj', 'sprzeda', 'zbycie'];
  return keywords.some(k => combined.includes(k));
}

export function parseNotice({ id, title, content = '', attachmentsText = '', date, url, attachments = [] }) {
  const fullText = `${title || ''}\n${content || ''}\n${attachmentsText || ''}`;
  if (!isNoticeRelevant(title, fullText)) {
    return null;
  }

  const isResult = /wynik|informacja\s+o\s+wyniku|rozstrzygni/i.test(title || '') ||
                   /informacja\s+o\s+wyniku/i.test(fullText.slice(0, 300));

  const isWykaz = /wykaz/i.test(title || '') && !/\bprzetarg/i.test(title || '');

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
    id: `gostynin-${id}`,
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
    sourceHost: 'umgostynin.bip.org.pl',
    attachments: attachments.map(a => ({
      name: a.name || 'Dokument',
      url: a.url,
    })),
  };
}

export function parseResultDoc(textOrHtml, fallbackDate, sourceUrl) {
  return [];
}
