import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function foldPl(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z');
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s)
    .replace(/z[łl]\.?/gi, '')
    .replace(/[\s ]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseHa(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/ha/gi, '').trim().replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function haToM2(s) {
  const ha = parseHa(s);
  return ha != null ? Math.round(ha * 10000) : null;
}

export function parseAreaM2(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/m2|m²/gi, '').trim().replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function monthNum(word) {
  return PL_MONTHS[foldPl(word)] || null;
}


const ROMAN_VALUES = { I: 1, V: 5, X: 10 };
function romanToRound(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVX]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN_VALUES[up[i]];
    const next = ROMAN_VALUES[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 20 ? total : null;
}

const ROUND_WORD_PREFIXES = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piat', 5], ['szost', 6], ['siodm', 7], ['osm', 8],
];
function wordToRound(word) {
  const f = foldPl(word);
  for (const [prefix, n] of ROUND_WORD_PREFIXES) {
    if (f.startsWith(prefix)) return n;
  }
  return null;
}

const ANNOUNCE_ROUND_RE =
  /\b([IVXivx]+|pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*)\s+przetarg/i;

export function announceRoundFromText(text) {
  const m = ANNOUNCE_ROUND_RE.exec(text || '');
  if (!m) return null;
  const token = m[1];
  return /^[IVXivx]+$/.test(token) ? romanToRound(token) : wordToRound(token);
}


const ANNOUNCE_DATE_RE =
  /przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:dnia|w\s+dniu)\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i;

export function announceDateFromText(text) {
  const m = ANNOUNCE_DATE_RE.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  const dotM = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotM) {
    return `${dotM[3]}-${dotM[2].padStart(2, '0')}-${dotM[1].padStart(2, '0')}`;
  }
  const wordM = raw.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/);
  if (wordM) {
    const mo = monthNum(wordM[2]);
    return mo ? `${wordM[3]}-${String(mo).padStart(2, '0')}-${wordM[1].padStart(2, '0')}` : null;
  }
  return null;
}

const RESULT_DATE_RE =
  /(?:przeprowadzonego\s+)?w\s+dniu\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*r/i;

export function resultDateFromText(text) {
  const m = RESULT_DATE_RE.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  const dotM = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotM) {
    return `${dotM[3]}-${dotM[2].padStart(2, '0')}-${dotM[1].padStart(2, '0')}`;
  }
  const wordM = raw.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/);
  if (wordM) {
    const mo = monthNum(wordM[2]);
    return mo ? `${wordM[3]}-${String(mo).padStart(2, '0')}-${wordM[1].padStart(2, '0')}` : null;
  }
  return null;
}


export function isLease(text) {
  return /dzier[żz]aw|najem\s+lokalu|\bogrodk[óo]w\s+gastronomiczn/i.test(text || '');
}

export function isResultNotice(text) {
  return /informacj[a-ząćęłńóśźż]*\s+o\s+wynik/i.test(text || '');
}

export function isAnnouncementNotice(text) {
  return /og[łl]oszenie\s+o\s+przetargu|og[łl]asza\s+.*przetarg/i.test(text || '');
}

export function isNegativeOutcome(text) {
  return /nie\s+zosta[łl]a\s+zbyta|brak\s+nabywcy|wynikiem\s+negatywnym|brak\s+wp[łl]aty\s+wadium/i.test(text || '');
}


export function announceFlatAddressRaw(text) {
  const t = text || '';
  const lokalNrM = t.match(/lokal\s+mieszkaln\w*\s+Nr\s*(\d+[A-Za-z]?)/i);
  const streetM = t.match(/przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+?)\s+(\d+[\d,\s]*)/i);
  if (!streetM) return null;

  const entranceM = t.match(/w\s+wej[śs]ciu\s+oznaczonym\s+Nr\s*(\d+[A-Za-z]?)/i);
  let bldg = streetM[2].trim();
  if (entranceM) {
    bldg = entranceM[1];
  } else if (bldg.includes(',')) {
    bldg = bldg.split(',')[0].trim();
  }

  const apt = lokalNrM ? lokalNrM[1] : '';
  const street = streetM[1].trim();
  return apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
}

export function flatAreaFromText(text) {
  const m =
    (text || '').match(/lokal[^\n]*?o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*m2/i) ||
    (text || '').match(/powierzchnia\s+lokalu\s+wynosi\s*(\d+(?:[.,]\d+)?)\s*m2/i);
  return m ? parseAreaM2(m[1]) : null;
}

export function startingPriceFromText(text) {
  const m = (text || '').match(/Cena\s+wywo[łl]awcza[^\n]*?(\d{1,3}(?:[\s . ]\d{3})*,\d{2})\s*z[łl]/i);
  return m ? parsePLN(m[1]) : null;
}


export function parseAnnouncement(text, ctx = {}) {
  if (!text) return [];
  if (isLease(text)) return [];

  const round = announceRoundFromText(text);
  const auction_date = ctx.fallbackAuctionDate || announceDateFromText(text) || null;
  const isFlat = /lokal\s+mieszkaln|nieruchomo[śs]ci\s+lokalowej/i.test(text);

  if (isFlat) {
    const addressRaw = announceFlatAddressRaw(text);
    if (!addressRaw) return [];
    const address = parseAddress(addressRaw);
    if (!address) return [];
    const area_m2 = flatAreaFromText(text);
    const starting_price_pln = startingPriceFromText(text);

    return [{
      kind: 'mieszkalny',
      address_raw: addressRaw,
      address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    }];
  }

  const isLand = /dzia[łl]k|grunt|niezabudowan/i.test(text);
  if (!isLand) return [];

  const tablePartM = text.match(/I\.\s+Oznaczenie[\s\S]*?(?=II\.|\n[A-Z]{2,}\.|$)/i);
  if (tablePartM) {
    const tablePart = tablePartM[0];
    const rows = [...tablePart.matchAll(/^\s*(\d+)\s+(\d+(?:\/\d+)?)\s+(\d+[.,]\d+)\s*ha\s+([\s\S]*?)(ul\.[^\n]+?)\s+(\d{1,3}(?:[\s . ]\d{3})*,\d{2})\s*z[łl]/gm)];
    if (rows.length > 0) {
      const records = [];
      for (const r of rows) {
        const dzialka_nr = r[2].trim();
        const ha = r[3].trim();
        let street = r[5].trim();
        if (/Rotmistrza\s+Witolda/i.test(street) && !/Pileckiego/i.test(street)) {
          street = 'ul. Rotmistrza Witolda Pileckiego';
        }
        records.push({
          kind: 'grunt',
          dzialka_nr,
          obreb: null,
          area_m2: haToM2(ha),
          address_raw: `${street}, dz. ${dzialka_nr}`,
          starting_price_pln: parsePLN(r[6]),
          auction_date,
          round,
          detail_url: ctx.detailUrl || null,
          source_url: ctx.pdfUrl || null,
        });
      }
      if (records.length > 0) return records;
    }
  }

  const singleDzM = text.match(/dzia[łl]k\w*\s+Nr\s*([0-9a-zA-Z\s\/i]+?)(?=\s+(?:o\s+)?pow|\s+ul|\s+KW|\s*,|\n)/i);
  const singleHaM = text.match(/(\d+[.,]\d+)\s*ha/i);
  const singleStreetM = text.match(/przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?:\s+w\s+Bartoszycach|\s*,|\s+KW|\n)/i) ||
                        text.match(/(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?:\s+\d{1,3}(?:[\s . ]\d{3})*,\d{2}\s*z[łl]|\s+KW)/i);
  const singlePrice = startingPriceFromText(text);

  if (singleDzM && singlePrice != null) {
    const dzialka_nr = singleDzM[1].trim();
    const street = singleStreetM ? singleStreetM[1].trim() : 'Bartoszyce';
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb: null,
      area_m2: singleHaM ? haToM2(singleHaM[1]) : null,
      address_raw: `${street}, dz. ${dzialka_nr}`,
      starting_price_pln: singlePrice,
      auction_date,
      round,
      detail_url: ctx.detailUrl || null,
      source_url: ctx.pdfUrl || null,
    }];
  }

  return [];
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  if (isLease(text)) return [];

  const auction_date = resultDateFromText(text) || fallbackDate || null;

  const lines = text.split('\n');
  const headerLineIdx = lines.findIndex((l) => l.includes('Oznaczenie'));
  if (headerLineIdx === -1) return [];

  const headerLine = lines[headerLineIdx];
  const cLiczba = headerLine.indexOf('Liczba');
  const cCena = headerLine.indexOf('Cena');
  const cNajwyzsza = headerLine.indexOf('Najwyższa');
  const cImie = headerLine.indexOf('Imię');

  if (cLiczba === -1 || cCena === -1) return [];

  let endIdx = lines.findIndex((l, i) => i > headerLineIdx && /Informacj[ęe]\s+wywieszono/i.test(l));
  if (endIdx === -1) endIdx = lines.length;

  const rowChunks = [];
  let curRow = null;

  for (let i = headerLineIdx + 1; i < endIdx; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.includes('katastru') || line.includes('przetargu')) continue;

    const rowStart = line.match(/^\s*(\d+)\.\s*/);
    if (rowStart) {
      if (curRow) rowChunks.push(curRow);
      curRow = {
        lp: rowStart[1],
        oznaczenie: '',
        liczba: '',
        cenaWyw: '',
        najwyzsza: '',
        imie: '',
      };
    }
    if (curRow) {
      const osobyIdx = line.search(/Osoby\s+dopuszczone|Osoby\s+nie\s+dopuszczone/i);
      const col1End = osobyIdx > -1 ? osobyIdx : cLiczba;

      curRow.oznaczenie += ' ' + line.slice(0, col1End).replace(/^\s*\d+\.\s*/, '').trim();
      curRow.liczba += ' ' + line.slice(col1End, cCena).trim();
      curRow.cenaWyw += ' ' + line.slice(cCena, cNajwyzsza > -1 ? cNajwyzsza : line.length).trim();
      if (cNajwyzsza > -1 && cImie > -1) {
        curRow.najwyzsza += ' ' + line.slice(cNajwyzsza, cImie).trim();
        curRow.imie += ' ' + line.slice(cImie).trim();
      } else if (cNajwyzsza > -1) {
        curRow.najwyzsza += ' ' + line.slice(cNajwyzsza).trim();
      }
    }
  }
  if (curRow) rowChunks.push(curRow);

  const records = [];

  const hdrStreetM = text.match(/(?:po[łl]o[żz]on\w*\s+)?(?:w\s+budynku\s+)?przy\s+(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?:\s+w\s+Bartoszycach|\s*,|\n)/i);
  const fallbackStreet = hdrStreetM ? hdrStreetM[1].trim() : null;

  for (const r of rowChunks) {
    const oznaczenie = r.oznaczenie.replace(/\s+/g, ' ').trim();
    const cenaWywStr = r.cenaWyw.replace(/\s+/g, ' ').trim();
    const najwyzszaStr = r.najwyzsza.replace(/\s+/g, ' ').trim();
    const imieStr = r.imie.replace(/\s+/g, ' ').trim();

    const startPrice = parsePLN(cenaWywStr);
    const achievedPrice = parsePLN(najwyzszaStr);
    const negative = isNegativeOutcome(oznaczenie + ' ' + imieStr + ' ' + najwyzszaStr) ||
                     (achievedPrice == null && !imieStr);
    const sold = !negative && achievedPrice != null;

    const isFlat = /lokal\s+mieszkaln/i.test(oznaczenie) || /lokal\s+mieszkaln/i.test(text.slice(0, headerLineIdx));

    if (isFlat) {
      let addrRaw = null;
      const addrM = oznaczenie.match(/(?:przy\s+)?(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?\s+\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i);
      if (addrM) {
        addrRaw = addrM[1].trim();
      } else if (fallbackStreet) {
        addrRaw = fallbackStreet;
      }
      if (!addrRaw) continue;

      const address = parseAddress(addrRaw);
      if (!address) continue;

      const areaM = oznaczenie.match(/o\s+pow(?:ierzchni|\.)?\s*(\d+(?:[.,]\d+)?)\s*m2/i);
      const area_m2 = areaM ? parseAreaM2(areaM[1]) : null;

      records.push({
        auction_date,
        source_pdf: sourceUrl,
        kind: 'mieszkalny',
        address_raw: addrRaw,
        address,
        round: null,
        starting_price_pln: startPrice,
        final_price_pln: sold ? achievedPrice : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        area_m2,
        notes: [],
      });
    } else {
      const dzM = oznaczenie.match(/dzia[łl]k\w*\s+nr\.?\s*([0-9a-zA-Z\s\/i]+?)(?=\s+(?:o\s+)?pow|\s+ul|\s+KW|\s*,|\n|$)/i);
      const haM = oznaczenie.match(/(\d+[.,]\d+)\s*ha/i);
      const streetM = oznaczenie.match(/(ul\.?\s+[A-ZĄĆĘŁŃÓŚŹŻ][^\n,]+?)(?=\s+KW|\s+pow|\s+Osoby|\s+\d|\n|$)/i);

      let street = streetM ? streetM[1].trim() : fallbackStreet || 'Bartoszyce';
      if (/Rotmistrza\s+Witolda/i.test(street) && !/Pileckiego/i.test(street)) {
        street = 'ul. Rotmistrza Witolda Pileckiego';
      }

      const dzialka_nr = dzM ? dzM[1].trim() : null;
      const address_raw = dzialka_nr ? `${street}, dz. ${dzialka_nr}` : street;

      records.push({
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        area_m2: haM ? haToM2(haM[1]) : null,
        address_raw,
        round: null,
        starting_price_pln: startPrice,
        final_price_pln: sold ? achievedPrice : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes: [],
      });
    }
  }

  return records;
}
