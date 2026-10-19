// Golub's nine-column municipal flat-sale tables. Ordinary OCR reads columns
// in the wrong order; use source word positions to keep every row together.
import { parseAddress } from '../../core/normalize.js';
import { auctionDateFromText, roundFromText, parseNum, parsePLN } from './parse.js';

// Column interiors, measured against the official landscape table. Cropping
// excludes vertical grid lines. Other layouts must fail rather than associate
// one row's basement or deposit with another flat.
export const TABLE_COLUMNS = [[0.076, 0.178], [0.278, 0.359], [0.559, 0.625]];

export function isMunicipalFlatTable(text) {
  return /wolnych\s+lokali\s+mieszkalnych/i.test(text) && /opis\s+lokalu/i.test(text);
}

function lines(words, pageHeight) {
  const result = [];
  for (const word of [...words].sort((a, b) => a.top - b.top || a.left - b.left)) {
    let line = result.at(-1);
    if (!line || Math.abs(word.top - line.top) > pageHeight * 0.005) {
      line = { top: word.top, words: [] };
      result.push(line);
    }
    line.words.push(word);
  }
  return result.map((line) => ({ ...line,
    text: line.words.sort((a, b) => a.left - b.left).map((word) => word.text).join(' '),
  }));
}

export function parseMunicipalFlatTable(pages, context) {
  const auction_date = auctionDateFromText(context);
  const round = roundFromText(context);
  if (!auction_date) throw new Error('municipal flat table has no auction date');
  const records = [];
  for (const page of pages) {
    if (page.columns?.length !== 3) throw new Error('municipal table column geometry is missing');
    const descriptionLines = lines(page.columns[1].words, page.height);
    const starts = descriptionLines.filter((line) => /^Loka[łl]\s+mieszkalny\b/i.test(line.text));
    const footer = lines(page.words, page.height).find((line) => /^1[.,]?\s+Przetarg\s+odb/i.test(line.text));
    for (const [index, start] of starts.entries()) {
      const top = start.top - page.height * 0.005;
      const bottom = starts[index + 1]?.top - page.height * 0.005 || footer?.top || page.height;
      const cell = (column) => lines(page.columns[column].words.filter((word) =>
        word.top >= top && word.top < bottom), page.height).map((line) => line.text).join(' ');
      const location = cell(0);
      const description = cell(1);
      const originalDescription = lines(page.words.filter((word) =>
        word.top >= top && word.top < bottom && word.left / page.width >= TABLE_COLUMNS[1][0]
        && word.left / page.width < TABLE_COLUMNS[1][1]), page.height)
        .map((line) => line.text).join(' ');
      const priceCell = cell(2);
      const addresses = [...location.matchAll(/\bul\.?\s*([\p{L}][\p{L}. -]*?\s+\d+[A-Za-z]?)(?=\s|$)/giu)];
      const addressMatch = addresses.length === 1 ? addresses[0] : null;
      const unit = /nr\.?\s+(\S+)\s+o\s+pow\.?\s*([\d]+[.,][\d]+)\s*m/i.exec(description);
      // Cropping can turn 1 into l or 5 into $. Corroborate the number in
      // the original page's same cell; never substitute a guessed digit.
      const originalUnit = /nr\.?\s+(\d+[A-Za-z]?)\s+o\s+pow\.?/i.exec(originalDescription);
      const unitNumber = unit && (/^\d+[A-Za-z]?$/.test(unit[1]) ? unit[1] : originalUnit?.[1]);
      const prices = [...priceCell.matchAll(/([\d][\d .]*[,][\d]{2})/g)];
      const price = prices.length === 1 ? prices[0] : null;
      if (!addressMatch || !unit || !unitNumber || !price) {
        throw new Error(`unresolved municipal flat table row: ${location} | ${description} | ${priceCell}`);
      }
      const address_raw = `${addressMatch[1].trim()}/${unitNumber}`;
      const address = parseAddress(address_raw);
      const area_m2 = parseNum(unit[2]);
      const starting_price_pln = parsePLN(price[1]);
      if (!address || !area_m2 || !starting_price_pln) throw new Error('invalid municipal table row');
      records.push({ kind: 'mieszkalny', address_raw, address, area_m2,
        starting_price_pln, auction_date, round });
    }
  }
  if (records.length < 2 || new Set(records.map((row) => row.address.key)).size !== records.length) {
    throw new Error('municipal flat table is incomplete or has duplicate identities');
  }
  return records;
}
