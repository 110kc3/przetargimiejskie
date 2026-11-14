
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

export function romanToInt(s) {
  if (!s) return null;
  const up = String(s).toUpperCase().trim();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

export function parsePLN(numStr) {
  if (!numStr) return null;
  const stripped = String(numStr).replace(/\s*z[łl].*$/i, '').trim();
  const strippedGrosze = stripped.replace(/[.,]\d{2}$/, '');
  const cleaned = strippedGrosze.replace(/[\s.]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&#8221;|&#8222;|&#8220;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    'BODY:',
    stripHtml(f.body),
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function whole(text) {
  return text || '';
}


export function isSaleAuction(text) {
  const t = whole(text);
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|stanowisk\s+handlowych|ci[ąa]gnik|odbudowy\s+zabytk[oó]w|zam[oó]wie[ńn]\s+publicznych|[śs]wiadcze[ńn]\s+zdrowotnych/i.test(t);
}

export function isResultDoc(text) {
  const t = whole(text);
  return /informacj\w*\s+o\s+wyniku\s+przetargu|wynik\w*\s+przetargu/i.test(t) &&
    !/^\s*og[łl]oszenie\s+o\b/i.test(field(text, 'TITLE'));
}

export function isAnnouncement(text) {
  const t = whole(text);
  return /og[łl]oszenie\s+o\s+przetargu|og[łl]asza\s+przetarg/i.test(t) && !isResultDoc(text);
}

export function isWykaz(text) {
  const t = whole(text);
  return /wykaz\s+nieruchomo[śs]ci/i.test(t) && !/przetarg\s+odb[ęe]dzie\s+si[ęe]/i.test(t);
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynikiem\s+negatywnym|brak\s+wadium|brak\s+wniesionego\s+wadium|brak\s+oferent[oó]w|brak\s+post[ąa]pie[ńn]|nie\s+przyst[ąa]pi|nie\s+stawi[łl]\s+si[ęe]/i.test(t);
}


export function roundFromText(text) {
  const m = /\b([IVXL]{1,5})\s+przetarg\b/i.exec(whole(text));
  return m ? romanToInt(m[1]) : null;
}


function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function parseAuctionDate(text, fallbackDate = null) {
  const t = whole(text);
  let m = /przeprowadzonego\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  m = /przeprowadzonego\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return toIso(m[1], m[2], m[3]);

  m = /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  m = /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:dnia\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return toIso(m[1], m[2], m[3]);

  m = /Przetarg\s+odb[ęe]dzie\s+si[ęe]\s+(?:dnia\s+)?(\d{1,2})\s+([a-ząćęłńóśźż]+)/i.exec(t);
  if (m && fallbackDate) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    const yr = fallbackDate.slice(0, 4);
    if (mo && yr) return toIso(m[1], mo, yr);
  }

  m = /z\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (m) return toIso(m[1], m[2], m[3]);

  return fallbackDate || null;
}


const PRICE_RE = /\b(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?)\s*z[łl]/gi;

function extractStreetAndBuilding(rawStr) {
  const m = /(?:ul\.|przy\s+ul\.)\s*((?:11\s+Listopada|\d+\s+[A-Za-zŁŚŻŹĆĘÓŃĄa-z]+|[A-Za-zŁŚŻŹĆĘÓŃĄa-z\s.-]+?))\s+(\d+[A-Za-z]?)\b/i.exec(rawStr) ||
            /\b(11\s+Listopada)\s+(\d+[A-Za-z]?)\b/i.exec(rawStr) ||
            /\b([A-ZŁŚŻŹĆĘÓŃĄ][a-ząćęłńóśźż]+(?:\s+[A-ZŁŚŻŹĆĘÓŃĄ][a-ząćęłńóśźż]+)*)\s+(\d+[A-Za-z]?)\b/i.exec(rawStr);
  if (!m) return null;
  return { street: m[1].trim(), building: m[2].trim() };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  if (!isResultDoc(text)) return [];
  if (isLease(text)) return [];
  if (!isSaleAuction(text)) return [];

  const auction_date = parseAuctionDate(text, fallbackDate);
  const docRound = roundFromText(text);
  const wholeText = whole(text);

  const firstZl = wholeText.indexOf('zł');
  const allFlatStarts = [...wholeText.matchAll(/Lokal\s+mieszka[lł]ny/gi)].map((m) => m.index);
  const isVertical = allFlatStarts.length > 1 && firstZl !== -1 && allFlatStarts.every((idx) => idx < firstZl);

  if (isVertical) {
    const records = [];
    const prices = [...wholeText.matchAll(PRICE_RE)].map((m) => parsePLN(m[1]));
    const flatMatches = [...wholeText.matchAll(/Lokal\s+mieszka[lł]ny\s+(?:[Nn]r\s+)?(\d+[A-Za-z]?)[ \t|]*(?:ul\.|przy\s+ul\.)?[ \t|]*([^\n\r]+)/gi)];

    flatMatches.forEach((fm, idx) => {
      const apt = fm[1];
      const sb = extractStreetAndBuilding(fm[2]);
      if (!sb) return;
      const raw = `${sb.street} ${sb.building}/${apt}`;
      const address = parseAddress(raw);
      const starting_price_pln = prices[idx + 1] || null;
      records.push({
        auction_date,
        source_url: sourceUrl,
        kind: 'mieszkalny',
        address_raw: raw,
        address,
        round: docRound,
        starting_price_pln,
        final_price_pln: null,
        outcome: 'unsold',
        unsold_reason: 'no_buyer',
        area_m2: null,
        notes: [],
      });
    });

    const landMatch = /Udzia[łl][\s\S]*?dzia[łl]k\w*\s*(?:Nr\w*|nr\w*)?\s*(\d+)[^]*?obr[ęe]b\s+(\d+|[A-Za-z]+)/i.exec(wholeText);
    if (landMatch) {
      records.push({
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: landMatch[1],
        obreb: landMatch[2],
        area_m2: null,
        address_raw: landMatch[2],
        round: docRound,
        starting_price_pln: prices[0] || null,
        final_price_pln: null,
        outcome: 'unsold',
        unsold_reason: 'no_buyer',
        notes: [],
      });
    }

    return records;
  }

  const stopIdx = wholeText.search(/Informacj[ęe]\s+o\s+wyniku\s+przetargu\s+wywiesza/i);
  const tableText = stopIdx !== -1 ? wholeText.slice(0, stopIdx) : wholeText;

  const rowMarker = /(?:^|\n)[ \t]*(?:\|[ \t]*)?(?:(?=Lokal\s+mieszka[lł]ny)|(?=Obr[ęe]b\s+(?:\d+|[A-ZŁŚŻŹĆĘÓŃĄ][a-z]+))|(?=Udzia[łl]))/gi;
  const rowStarts = [];
  let m;
  while ((m = rowMarker.exec(tableText)) !== null) {
    rowStarts.push(m.index);
  }
  rowStarts.push(tableText.length);

  const records = [];

  for (let i = 0; i < rowStarts.length - 1; i++) {
    const row = tableText.slice(rowStarts[i], rowStarts[i + 1]);

    if (/Lokal\s+mieszka[lł]ny/i.test(row)) {
      const aptMatch = /Lokal\s+mieszka[lł]ny\s+(?:[Nn]r\s+)?(\d+[A-Za-z]?)/i.exec(row);
      const sb = extractStreetAndBuilding(row);
      if (!aptMatch || !sb) continue;

      const apt = aptMatch[1];
      const raw = `${sb.street} ${sb.building}/${apt}`;
      const address = parseAddress(raw);
      if (!address) continue;

      const prices = [...row.matchAll(PRICE_RE)].map((p) => parsePLN(p[1]));
      const isNegative = isNegativeOutcome(row);
      let sold = false;
      let starting_price_pln = prices[0] || null;
      let final_price_pln = null;

      if (prices.length >= 2 && !isNegative) {
        sold = true;
        starting_price_pln = prices[0];
        final_price_pln = prices[1];
      } else if (prices.length >= 1) {
        starting_price_pln = prices[0];
      }

      records.push({
        auction_date,
        source_url: sourceUrl,
        kind: 'mieszkalny',
        address_raw: raw,
        address,
        round: docRound,
        starting_price_pln,
        final_price_pln: sold ? final_price_pln : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (isNegative ? 'no_buyer' : 'unknown'),
        area_m2: null,
        notes: [],
      });
    } else if (/Obr[ęe]b|Udzia[łl]/i.test(row)) {
      const obrebMatch = /obr[ęe]b[ua]?\s+(\d+|[A-ZŁŚŻŹĆĘÓŃĄ][a-z]+)/i.exec(row);
      const obreb = obrebMatch ? obrebMatch[1] : null;
      const parcelMatch = /(?:dzia[łl]k\w*[^0-9\n\r]*?)?(?:Nr\w*|nr\w*)\s*([0-9\s/.,i]+)/i.exec(row);
      const dzialka_nr = parcelMatch ? parcelMatch[1].replace(/[=\-|]$/, '').trim() : null;

      const prices = [...row.matchAll(PRICE_RE)].map((p) => parsePLN(p[1]));
      const isNegative = isNegativeOutcome(row);
      let sold = false;
      let starting_price_pln = prices[0] || null;
      let final_price_pln = null;

      if (prices.length >= 2 && !isNegative) {
        sold = true;
        starting_price_pln = prices[0];
        final_price_pln = prices[1];
      } else if (prices.length >= 1) {
        starting_price_pln = prices[0];
      }

      records.push({
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr,
        obreb,
        area_m2: null,
        address_raw: obreb,
        round: docRound,
        starting_price_pln,
        final_price_pln: sold ? final_price_pln : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : (isNegative ? 'no_buyer' : 'unknown'),
        notes: [],
      });
    }
  }

  return records;
}


export function parseAnnouncement(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  if (isResultDoc(text)) return [];
  if (isLease(text)) return [];
  if (!isSaleAuction(text)) return [];

  const wholeText = whole(text);
  const auctionDate = parseAuctionDate(text, fallbackDate);

  const roundMatches = [...wholeText.matchAll(/\b([IVX]+)\s+przetarg\b/gi)];
  const endOfProperties = wholeText.search(/Przetarg\s+odb[ęe]dzie\s+si[ęe]/i);
  const limit = endOfProperties !== -1 ? endOfProperties : wholeText.length;

  const results = [];

  const sections = [];
  if (roundMatches.length === 0) {
    sections.push({ roundNum: null, text: wholeText.slice(0, limit) });
  } else {
    for (let r = 0; r < roundMatches.length; r++) {
      const roundNum = romanToInt(roundMatches[r][1]);
      const start = roundMatches[r].index;
      const end = r + 1 < roundMatches.length ? roundMatches[r + 1].index : limit;
      sections.push({ roundNum, text: wholeText.slice(start, end) });
    }
  }

  for (const { roundNum, text: section } of sections) {
    const itemMarker = /(?:^|\n)[ \t]*(?:\d+\.\s+)?(Lokal\s+mieszka[lł]ny|Nieruchomo[śs][ćc]i?\s+komunaln\w*|Udzia[łl]\s+w\s+wysoko[śs]ci)/gi;
    const itemStarts = [];
    let im;
    while ((im = itemMarker.exec(section)) !== null) {
      itemStarts.push(im.index);
    }
    if (itemStarts.length === 0) itemStarts.push(0);
    itemStarts.push(section.length);

    for (let i = 0; i < itemStarts.length - 1; i++) {
      const itemText = section.slice(itemStarts[i], itemStarts[i + 1]);

      if (/Lokal\s+mieszka[lł]ny/i.test(itemText)) {
        const aptMatch = /Lokal\s+mieszka[lł]ny\s+(?:[Nn]r\s+)?(\d+[A-Za-z]?)/i.exec(itemText);
        const sb = extractStreetAndBuilding(itemText);
        if (!aptMatch || !sb) continue;

        const apt = aptMatch[1];
        const raw = `${sb.street} ${sb.building}/${apt}`;
        const address = parseAddress(raw);
        if (!address) continue;

        const areaMatch = /powierzchnia\s+u[żz]ytkowa\s+lokalu\s+wynosi\s*(\d+[.,]\d+)/i.exec(itemText);
        const area_m2 = areaMatch ? parseNum(areaMatch[1]) : null;

        const priceMatch = /cena\s+wywo[łl]awcza:?\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?)\s*z[łl]/i.exec(itemText);
        const starting_price_pln = priceMatch ? parsePLN(priceMatch[1]) : null;

        results.push({
          kind: 'mieszkalny',
          address_raw: raw,
          address,
          area_m2,
          starting_price_pln,
          auction_date: auctionDate,
          round: roundNum,
          source_url: sourceUrl,
        });
      } else if (/dzia[łl]k\w*|obr[ęe]b/i.test(itemText)) {
        const obrebMatch = /obr[ęe]b[ua]?\s+(\d+|[A-ZŁŚŻŹĆĘÓŃĄ][a-z]+)/i.exec(itemText);
        const obreb = obrebMatch ? obrebMatch[1] : null;
        const parcelMatch = /(?:dzia[łl]k\w*[^0-9\n\r]*?)?(?:Nr\w*|nr\w*)\s*([0-9\s/.,i]+)/i.exec(itemText);
        const dzialka_nr = parcelMatch ? parcelMatch[1].replace(/[=\-|]$/, '').trim() : null;

        const areaMatch = /o\s+powierzchni\s*(\d+[.,]\d+)\s*ha/i.exec(itemText);
        const area_m2 = areaMatch ? Math.round(parseNum(areaMatch[1]) * 10000) : null;

        const priceMatch = /cena\s+wywo[łl]awcza:?\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?)\s*z[łl]/i.exec(itemText);
        const starting_price_pln = priceMatch ? parsePLN(priceMatch[1]) : null;

        results.push({
          kind: 'grunt',
          dzialka_nr,
          obreb,
          area_m2,
          address_raw: obreb,
          starting_price_pln,
          auction_date: auctionDate,
          round: roundNum,
          source_url: sourceUrl,
        });
      }
    }
  }

  return results;
}


export function parseWykaz(text, publishedDate, sourceUrl) {
  if (!text) return [];
  if (!isWykaz(text)) return [];
  if (isLease(text)) return [];

  const wholeText = whole(text);
  const results = [];

  const flatMatch = /lokalu\s+mieszkalnego\s+(?:[Nn]r\s+)?(\d+[A-Za-z]?)/i.exec(wholeText);
  const sb = extractStreetAndBuilding(wholeText);

  if (flatMatch && sb) {
    const apt = flatMatch[1];
    const raw = `${sb.street} ${sb.building}/${apt}`;
    const address = parseAddress(raw);
    if (address) {
      results.push({
        kind: 'mieszkalny',
        address_raw: raw,
        address,
        published_date: publishedDate,
        detail_url: sourceUrl,
        source_url: sourceUrl,
      });
    }
  }

  return results;
}
