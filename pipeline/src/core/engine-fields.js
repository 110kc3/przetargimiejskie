const MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05', czerwca: '06',
  lipca: '07', sierpnia: '08', wrzesnia: '09', września: '09', pazdziernika: '10',
  października: '10', listopada: '11', grudnia: '12',
};

const DATE_WORDS = '([0-9]{1,2}\\s+[a-ząćęłńóśźż]+\\s+20\\d{2})';
const DATE_NUMERIC = '([0-9]{1,2}\\.[0-9]{1,2}\\.20\\d{2})';
const AUCTION_LEAD = '(?:odb[ęe]dzie\\s+si[ęe]|odb[ęe]d[ąa]\\s+si[ęe]|termin\\s+przetargu|data\\s+przetargu|data\\s*:|termin\\s+i\\s+miejsce\\s+przetargu)';
const AUCTION_DATE_PATTERN = new RegExp(
  `${AUCTION_LEAD}[\\s\\S]{0,120}?(?:${DATE_WORDS}|${DATE_NUMERIC})`,
  'i',
);

export function parsePolishDate(text) {
  if (!text) return null;
  const numeric = text.match(/(?<!\d)(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(20\d{2})/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;
  const words = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(20\d{2})/i);
  if (!words) return null;
  const month = MONTHS[words[2].toLowerCase()];
  return month ? `${words[3]}-${month}-${words[1].padStart(2, '0')}` : null;
}

export function findAuctionDate(text) {
  if (!text) return null;
  const match = AUCTION_DATE_PATTERN.exec(text);
  return match ? parsePolishDate(match[1] || match[2]) : null;
}

const AREA_PATTERN = /(?:powierzchni|pow\.)\s*(?:u[żz]ytkowej|ca[łl]kowitej)?\s*(?:wynosi\s*)?([0-9][0-9\s.]*(?:,[0-9]+)?)\s*(m2|m²|m\s*2|ha)\b/i;

export function parseAreaSqm(text) {
  if (!text) return null;
  const match = AREA_PATTERN.exec(text);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/\s+/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  return match[2].toLowerCase() === 'ha' ? Math.round(value * 10000) : value;
}
