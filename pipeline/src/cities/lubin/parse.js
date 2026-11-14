
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s.]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

const WORD_ORDINAL_STEMS = [
  ['pierwsz', 1], ['drug', 2], ['trzeci', 3], ['czwart', 4],
  ['piąt', 5], ['piat', 5], ['szóst', 6], ['szust', 6],
  ['siódm', 7], ['siodm', 7], ['ósm', 8], ['osm', 8],
];

export function roundFromText(text) {
  const t = text || '';
  const lubinOrder = /ogłasza\s+([IVXLCDM]+)\s+(?:nie)?ograniczon\S*\s+przetarg\S*\s+ustn\S*/i.exec(t);
  if (lubinOrder) {
    const n = romanToInt(lubinOrder[1]);
    if (n) return n;
  }
  const REVERSE_RE = /([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)\s+przetarg\S*\s+ustn\S*\s+nieograniczon\S*/gi;
  let m;
  while ((m = REVERSE_RE.exec(t)) !== null) {
    const token = m[1];
    if (/^[IVXLCDM]+$/.test(token)) {
      const n = romanToInt(token);
      if (n) return n;
      continue;
    }
    const low = token.toLowerCase();
    const hit = WORD_ORDINAL_STEMS.find(([stem]) => low.startsWith(stem));
    if (hit) return hit[1];
  }
  return null;
}


export function isResultNotice(text) {
  return /informacj\S*\s+o\s+wynik\S*\s+przetarg/i.test(text || '');
}


export function auctionDateFromText(text) {
  const m = /odb[ęe]dzie\s+si[ęe][\s\S]{0,250}?dnia:?\s*(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i.exec(
    text || '',
  );
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const m = /informuj\S*\s*,?\s*że\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i.exec(
    text || '',
  );
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}


export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza\S*[\s\S]{0,80}?([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /(?:najwy[żz]sza\s+)?cena\s+(?:nabycia\s+|zakupu\s+)?(?:nieruchomo\S*\s+)?osi[ąa]gni[ęe]ta\s+w\s+przetargu\S*\s*:?\s*([\d][\d\s.]*,\d{2})\s*z[łl]/i.exec(
    text || '',
  );
  return m ? parsePLN(m[1]) : null;
}

export function negativeOutcomeStated(text) {
  return /wynikiem\s+negatywnym|nie\s+(?:zosta[łl]o\s+)?wp[łl]acono\s+wadium|brak\s+wp[łl]aty\s+wadium/i.test(
    text || '',
  );
}


function singleLotAddressRaw(text) {
  const m = /Adres\s+lokalu\s*:?\s*(?:ul\.?\s*)?([^,;]+?)\s*[,;]/i.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function singleLotAreaM2(text) {
  const m = /Powierzchnia\s+u[żz]ytkowa\s+lokalu\S*\s*:?\s*(\d+[.,]\d+|\d+)\s*m\s*[²2]/i.exec(
    text || '',
  );
  return m ? parseNum(m[1]) : null;
}

function buildSingleUnitRecord(text) {
  const address_raw = singleLotAddressRaw(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const kind = classifyKind(text.slice(0, 2000));
  return {
    address_raw: `ul. ${address_raw}`,
    address,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    area_m2: singleLotAreaM2(text),
  };
}


function flatTableRows(text) {
  const RE =
    /^\s*([^\n]+?)\s+(LE1U\/\d+\/\d+)\s+(\d+\/\d+)\s+(\d+)\s+([\d\s]+?)\s+(\d+,\d+)\s+(\d+\/\d+)\s+([\d\s]+,\d{2})\s*z[łl]\s+([\d\s]+,\d{2})\s*z[łl]\s+([\d\s]+,\d{2})\s*z[łl]\s+([\d\s]+,\d{2})\s*z[łl]\s*\n\s*(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)/gm;
  const rows = new Map();
  let m;
  while ((m = RE.exec(text)) !== null) {
    const key = `${m[12]}/${m[13]}`;
    rows.set(key, {
      area_m2: parseNum(m[6]),
      starting_price_pln: parsePLN(m[10]),
    });
  }
  return rows;
}

function splitLots(text) {
  const re = /(?:^|\n)\s*(\d+)\)\s*([^\n]+?)\s*[-–—]\s*lokal/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ n: m[1], addressRaw: m[2].replace(/\s+/g, ' ').trim() });
  }
  return out.length >= 2 ? out : null;
}

function buildLotRecord(lot, table, auction_date, round) {
  const address_raw = `ul. ${lot.addressRaw}`;
  const address = parseAddress(lot.addressRaw);
  if (!address) return null;
  const keyM = /(\d+[A-Za-z]?)\/(\d+[A-Za-z]?)\s*$/.exec(lot.addressRaw);
  const key = keyM ? `${keyM[1]}/${keyM[2]}` : null;
  const priced = key ? table.get(key) : null;
  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: priced ? priced.area_m2 : null,
    starting_price_pln: priced ? priced.starting_price_pln : null,
    auction_date,
    round,
  };
}


function landBatchRows(text) {
  const RE = /^\s*(\d{1,3})\.\s+.*?(\d+\/\d+)\s{2,}(\d[\d\s]*\d|\d)\s{2,}([\d\s]+,\d{2})\s{2,}([\d\s]+,\d{2})\s*$/gm;
  const out = [];
  let m;
  while ((m = RE.exec(text)) !== null) {
    out.push({
      dzialka_nr: m[2],
      area_m2: parseNum(m[3]),
      starting_price_pln: parsePLN(m[4]),
      wadium: parsePLN(m[5]),
    });
  }
  return out;
}

function landLocationFromText(text) {
  const streetM = /przy\s+ulic[ay]\s+([A-ZŻŹĆŁŚĄĘÓŃ][^\s,.]+)/i.exec(text || '');
  if (streetM) return `ul. ${streetM[1]}`;
  const obrebM = /Obr[ęe]b\s+(\d+)\s+miasta\s+Lubina/i.exec(text || '');
  return obrebM ? `obręb ${obrebM[1]}` : null;
}

function landSingleFallback(text) {
  const m =
    /^\s*\d+\.\s*LE1U\/\d+\/\d+\s+(\d+\/\d+)\s+([\d\s]+?)\s+(\d+)\s+([^\n]+?)\s+([\d\s]+,\d{2})\s+([\d\s]+,\d{2})\s*$/m.exec(
      text,
    );
  if (!m) return null;
  return {
    kind: 'grunt',
    dzialka_nr: m[1],
    area_m2: parseNum(m[2]),
    obreb: m[3],
    address_raw: landLocationFromText(text) || m[4].replace(/\s+/g, ' ').trim(),
    starting_price_pln: parsePLN(m[5]),
  };
}

function landResultFallback(text) {
  const dzialkaM = /dzia[łl]k\S*\s*(?:nr|numer)?\s*[:\s]?\s*(\d+\/\d+)/i.exec(text || '');
  const obrebM = /Obr[ęe]b\s+(\d+)/i.exec(text || '');
  const areaM = /powierzchni\S*\s+(\d[\d\s]*)\s*m\s*[²2](?!\d)/i.exec(text || '');
  if (!dzialkaM) return null;
  return {
    dzialka_nr: dzialkaM[1],
    obreb: obrebM ? obrebM[1] : null,
    area_m2: areaM ? parseNum(areaM[1]) : null,
    address_raw: landLocationFromText(text),
  };
}

function parseLandAnnouncement(text, auction_date, round) {
  const rows = landBatchRows(text);
  if (rows.length) {
    const address_raw = landLocationFromText(text);
    return rows.map((row) => ({
      kind: 'grunt',
      dzialka_nr: row.dzialka_nr,
      obreb: (landLocationFromText(text) || '').replace(/^obręb\s*/i, '') || null,
      area_m2: row.area_m2,
      address_raw,
      starting_price_pln: row.starting_price_pln,
      auction_date,
      round,
    }));
  }
  const single = landSingleFallback(text);
  if (single) return [{ ...single, auction_date, round }];
  return [];
}

function currentLandTable(text, auction_date, round) {
  const header = text.split(/^\s*\d+\.\s+/m)[0];
  if (!/\b(?:Nr|Numer)\b/i.test(header) || !/działki/i.test(header)
    || !/Powierzchnia/i.test(header) || !/Cena\s+wywoławcza/i.test(header)) return [];
  const out = [];
  for (const line of text.split('\n')) {
    if (!/^\s*\d+\.\s+/.test(line)) continue;
    const cells = line.trim().split(/\s{2,}/);
    const kwFirst = cells.length === 8 && /^LE1U\/\d+\/\d+$/.test(cells[1]);
    const parcelFirst = cells.length === 7 && /^LE1U\/\d+\/\d+$/.test(cells[4]);
    if (!kwFirst && !parcelFirst) continue;
    const [parcel, area, district] = cells.slice(kwFirst ? 2 : 1, kwFirst ? 5 : 4);
    const price = cells.at(-2), deposit = cells.at(-1);
    if (!/^\d+(?:\/\d+)?$/.test(parcel) || !/^\d+$/.test(district)
      || !/^\d[\d ]*(?:[,.]\d+)?$/.test(area)
      || !/^\d[\d .]*,\d{2}$/.test(price) || !/^\d[\d .]*,\d{2}$/.test(deposit)) continue;
    out.push({
      kind: 'grunt', dzialka_nr: parcel, obreb: district, area_m2: parseNum(area),
      address_raw: kwFirst ? cells[5].replace(/,\s*$/, '') : `obręb ${district}`,
      starting_price_pln: parsePLN(price), auction_date, round,
      notes: /ogłasza\s+[IVXLCDM]+\s+ograniczony\s+przetarg/i.test(header)
        ? ['procedure: przetarg ustny ograniczony; participation restricted to eligible neighbouring owners'] : [],
    });
  }
  return out;
}


export function parseAnnouncement(text) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  if (isResultNotice(t)) return [];
  const auction_date = auctionDateFromText(t);
  const round = roundFromText(t);

  const lots = splitLots(t);
  if (lots) {
    const table = flatTableRows(t);
    const out = [];
    for (const lot of lots) {
      const rec = buildLotRecord(lot, table, auction_date, round);
      if (rec) out.push(rec);
    }
    if (out.length) return out;
  }

  const tableLand = currentLandTable(t, auction_date, round);
  if (tableLand.length) return tableLand;

  const kind = classifyKind(t.slice(0, 3000));
  if (kind === 'grunt') return parseLandAnnouncement(t, auction_date, round);

  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  return [{
    ...unit,
    starting_price_pln: startingPriceFromText(t),
    auction_date,
    round,
  }];
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = ['unvalidated: no live Lubin result document was reachable at build time (see parse.js header)'];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const negative = negativeOutcomeStated(t);
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');

  const kind = classifyKind(t.slice(0, 3000));
  if (kind === 'grunt') {
    const single = landSingleFallback(t) || landResultFallback(t);
    const dzialka_nr = single ? single.dzialka_nr : null;
    const address_raw = single ? single.address_raw : landLocationFromText(t);
    if (!dzialka_nr && !address_raw) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb: single ? single.obreb : null,
      area_m2: single ? single.area_m2 : null,
      address_raw,
      round,
      starting_price_pln: starting_price_pln ?? (single ? single.starting_price_pln : null),
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    }];
  }

  const unit = buildSingleUnitRecord(t);
  if (!unit) return [];
  if (unit.address.warning) notes.push(unit.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: unit.kind,
    address_raw: unit.address_raw,
    address: unit.address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    area_m2: unit.area_m2,
    notes,
  }];
}


export function isGenuineSaleWykazTitle(title) {
  const t = title || '';
  if (/dzier[żz]aw|najem|u[żz]yczeni|zamian|bezprzetargow/i.test(t)) return false;
  return /sprzeda[żz]|zbyci[ae]/i.test(t);
}

function wykazTableRows(text) {
  const RE = /^\s*(\d+)\s{2,}(.+?)\s{2,}\S.*?\s{2,}([\d\s]+,\d+)\s*m2\s*$/gm;
  const out = [];
  let m;
  while ((m = RE.exec(text)) !== null) {
    out.push({ addressRaw: m[2].trim(), area_m2: parseNum(m[3]) });
  }
  return out;
}

export function wykazRecordsFromText(text, pdfUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const rows = wykazTableRows(t);
  if (rows.length) {
    return rows
      .map((row) => {
        const address = parseAddress(row.addressRaw);
        if (!address) return null;
        return {
          kind: 'mieszkalny',
          address_raw: `ul. ${row.addressRaw}`,
          address,
          area_m2: row.area_m2,
          detail_url: pdfUrl,
        };
      })
      .filter(Boolean);
  }
  const single = /przy\s+ul\.?\s+([^\n,;.]+)/i.exec(t);
  if (!single) return [];
  const address = parseAddress(single[1].trim());
  if (!address) return [];
  return [{ kind: 'mieszkalny', address_raw: `ul. ${single[1].trim()}`, address, area_m2: null, detail_url: pdfUrl }];
}
