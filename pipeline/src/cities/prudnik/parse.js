// Prudnik parsers — announcement PDFs and result notice PDFs from bip.prudnik.pl.
//
// Both announcement and result documents are born-digital text-extractable PDFs
// attached to BIP articles in /gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali.
//
// Multi-lot announcements bundle several properties (land, commercial, flats);
// each flat lot is delineated by "Lokal mieszkalny" descriptions and ends with
// its own "Cena wywoławcza".
//
// Paired "Informacja o wynikach przetargów" documents contain a table with:
// - Oznaczenie nieruchomości (describing the lot, address, floor, and KW)
// - Cena wywoławcza (starting price)
// - Najwyższa cena osiągnięta w przetargu (achieved price)
// - Imię i nazwisko osoby ustalonej jako nabywca (or "wynik negatywny")

import { parseAddress } from '../../core/normalize.js';

const PL_MONTH = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  wrzesnia: 9,
  września: 9,
  pazdziernika: 10,
  października: 10,
  listopada: 11,
  grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const stripped = String(numStr)
    .replace(/[^\d,.]/g, '')
    .replace(/\./g, '')
    .replace(/,\d{2}$/, '');
  const n = Number(stripped.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const m = /\d+(?:[.,]\d+)?/.exec(String(numStr));
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isResultNotice(text) {
  return /informacja\s+(?:z\s+dnia\s+[\d.]+\s*r\.\s+)?o\s+wynik/i.test(text || '');
}

export function isSkippableTitle(title) {
  const t = title || '';
  if (/lokal|mieszkal|mieszkan/i.test(t)) return false;
  return /\bniezabudowan|\broln|\bdrewno|\bautobus|\bpojazd|\bksse\b|strefy\s+ekonomicznej/i.test(
    t,
  );
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const m =
    /odb[eę]d[aą]\s+si[eę]\s+przetarg[^\n.]*?\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
      t,
    ) ||
    /odb[eę]dzie\s+si[eę]\s+przetarg[^\n.]*?\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
      t,
    ) ||
    /og[łl]asza,\s+[zż]e\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
      t,
    ) ||
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*(?:roku|r\.)?[^\n.]*?odb[eę]d[aą]/i.exec(
      t,
    ) ||
    /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*(?:roku|r\.)?[^\n.]*?odb[eę]dzie/i.exec(
      t,
    );
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function resultDateFromText(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const m =
    /przeprowadzon\w+\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
      t,
    ) ||
    /przeprowadzonego\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
      t,
    ) ||
    /z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\./i.exec(t);
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function extractLotRound(lotText, headingText = '') {
  const combined = headingText + '\n' + (lotText || '');
  const priorMatches = [
    ...combined.matchAll(
      /(?:I{1,3}|IV|V|VI{0,3}|IX|X|Pierwszy|Drugi|Trzeci|Czwarty|Pi[aą]ty|Sz[oó]sty)\s+przetarg\s+odby[łl]\s+si[eę]/gi,
    ),
  ];
  if (priorMatches.length > 0) {
    return priorMatches.length + 1;
  }
  const headingM =
    /PRZETARG[IY]?\s+PO\s+RAZ\s+(PIERWSZY|DRUGI|TRZECI|CZWARTY|PI[AĄ]TY|SZ[OÓ]STY)/i.exec(
      combined,
    );
  if (headingM) {
    const map = {
      PIERWSZY: 1,
      DRUGI: 2,
      TRZECI: 3,
      CZWARTY: 4,
      'PIĄTY': 5,
      PIATY: 5,
      'SZÓSTY': 6,
      SZOSTY: 6,
    };
    return map[headingM[1].toUpperCase()] || null;
  }
  return 1;
}

export function extractAddressFromLot(lotText, detailContext = '') {
  if (!lotText) return null;
  const t = lotText.replace(/\r/g, '');
  const lotStart = t.search(/lokal\s+mieszkaln/i);
  const targetText = lotStart !== -1 ? t.slice(lotStart) : t;

  // Strip table column row numbers and build a clean first-column representation
  const lines = targetText.split('\n').map((l) => l.trim()).filter(Boolean);
  let colDesc = '';
  for (const line of lines) {
    const stripped = line.replace(/^\d+\.\s*/, '').trim();
    const col = stripped.split(/\s{3,}/)[0].trim();
    colDesc += ' ' + col;
  }

  const searchTexts = [colDesc, targetText];

  for (const search of searchTexts) {
    let unit = null;
    const unitM = /lokal\s+mieszkaln\w*\s+nr\s+(\d+[a-zA-Z]?)/i.exec(search);
    if (unitM) unit = unitM[1];

    // 1. "przy ul. X N/M" or "przy [7.] ul. X N/M"
    const comboM =
      /przy\s+(?:\d+\.\s+)?(?:ul\.|placu|pl\.)\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń-]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń-]+)*)\s+(\d+[a-zA-Z]?)\/(\d+[a-zA-Z]?)/i.exec(
        search,
      );
    if (comboM) {
      const street = comboM[1].trim();
      if (!/ko[sś]ciuszk/i.test(street)) {
        return `ul. ${street} ${comboM[2]}/${comboM[3]}`;
      }
    }

    // 2. "w klatce schodowej Piastowska 21"
    const klatkaM =
      /w\s+klatce\s+schodowej\s+(?:przy\s+ul\.\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń]+)\s+(\d+[a-zA-Z]?)/i.exec(
        search,
      );
    if (klatkaM && unit) {
      return `ul. ${klatkaM[1].trim()} ${klatkaM[2]}/${unit}`;
    }

    // 3. "przy ul. Street [nr] Building"
    const streetM =
      /przy\s+(?:\d+\.\s+)?(?:ul\.|placu|pl\.)\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń-]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń-]+)*)\s+(?:nr\s+)?(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\b/i.exec(
        search,
      );
    if (streetM) {
      const street = streetM[1].trim();
      if (!/ko[sś]ciuszk/i.test(street)) {
        let bldg = streetM[2].trim();
        const bldgNrM = /w\s+budynku\s+nr\s+(\d+[a-zA-Z]?)/i.exec(search);
        if (bldgNrM) bldg = bldgNrM[1];

        if (bldg.includes('/')) {
          return `ul. ${street} ${bldg}`;
        }
        if (unit) return `ul. ${street} ${bldg}/${unit}`;
        return `ul. ${street} ${bldg}`;
      }
    }

    // 4. Fallback for "przy ul. Rynek w Prudniku"
    const rynekM = /przy\s+ul\.\s+Rynek\s+w\s+Prudniku/i.exec(search);
    if (rynekM) {
      const bldgCtx = /(?:Rynek|rynek)[-\s]+(\d+)/i.exec(
        detailContext + ' ' + search,
      );
      const bldg = bldgCtx ? bldgCtx[1] : '20';
      if (unit) return `ul. Rynek ${bldg}/${unit}`;
      return `ul. Rynek ${bldg}`;
    }
  }

  return null;
}

export function parseAnnouncement(text, detailUrl = '', sourceUrl = '') {
  if (!text || isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromText(t);

  // Match each flat lot without crossing over to adjacent flat lots
  const re =
    /(Lokal\s+mieszkaln[\s\S]+?Cena\s+wywo[łl]awcza[^\n]*?[\d. ]+,\d{2}\s*z[łl][\s\S]*?(?=Po[łl]o[żz]enie|PRZETARG[IY]?\s+PO\s+RAZ|\n\s*(?:(?:\d+|[IVX]+)\.\s+)?(?:Ksi[eę]ga|Lokal\s+mieszkaln\w*\s+nr)|Przetargi\s+przeprowadza|Szczeg[oó][łl]owych\s+informacji|$))/gi;
  const lots = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    lots.push(m[1]);
  }

  const out = [];
  for (const lot of lots) {
    const address_raw = extractAddressFromLot(lot, detailUrl || sourceUrl);
    if (!address_raw) continue;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const priceM = /Cena\s+wywo[łl]awcza[^\n]*?([\d. ]+,\d{2})\s*z[łl]/i.exec(
      lot,
    );
    const starting_price_pln = priceM ? parsePLN(priceM[1]) : null;

    const areaM =
      /o\s+(?:[a-ząćęłńóśźż]+\s+)?(?:pow\.|powierzchni)\s+u[zż]ytkow\w*\s+([\d.,]+)\s*m2/i.exec(
        lot,
      );
    const area_m2 = areaM ? parseArea(areaM[1]) : null;
    const round = extractLotRound(lot);

    out.push({
      kind: 'mieszkalny',
      address_raw,
      address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl,
      source_url: sourceUrl,
    });
  }
  return out;
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const auction_date = resultDateFromText(text) || fallbackDate || null;

  const tableIdx = text.search(/Lp\.[\s\S]*?przetargu/i);
  const body = tableIdx !== -1 ? text.slice(tableIdx) : text;

  const pattern =
    /(?:^|\n|\f)(?=[ \t]*(?:\d+\.[ \t]+)?(?:Lokal\s+(?:mieszkaln|u[zż]ytkow)|Nieruchomo[sś][cć]|Dzia[łl]k[ai]))/i;
  const rawLots = body.split(pattern).filter((p) => p.trim().length > 20);

  const results = [];
  for (const lot of rawLots) {
    if (!/lokal\s+mieszkaln/i.test(lot)) continue;

    const address_raw = extractAddressFromLot(lot, sourceUrl);
    if (!address_raw) continue;
    const address = parseAddress(address_raw);
    if (!address) continue;

    const isUnsold =
      /negatywn|nie\s+odby[łl]|brak\s+post[aą]pienia|nikt\s+nie\s+przyst[aą]pi[łl]|nie\s+przyst[aą]piono/i.test(
        lot,
      );

    const amounts = [...lot.matchAll(/([\d. ]+,\d{2})\s*z[łl]/gi)]
      .map((m) => parsePLN(m[1]))
      .filter(Boolean);
    let starting_price_pln = null;
    let final_price_pln = null;
    if (amounts.length >= 2) {
      starting_price_pln = Math.min(amounts[0], amounts[1]);
      final_price_pln = Math.max(amounts[0], amounts[1]);
    } else if (amounts.length === 1) {
      starting_price_pln = amounts[0];
      final_price_pln = null;
    }
    const outcome = !isUnsold && final_price_pln ? 'sold' : 'unsold';
    const unsold_reason = outcome === 'unsold' ? 'no_bidders' : null;

    const areaM =
      /o\s+(?:[a-ząćęłńóśźż]+\s+)?(?:pow\.|powierzchni)\s+(?:u[zż]ytkow\w*\s+)?([\d.,]+)\s*m2/i.exec(
        lot,
      );
    const area_m2 = areaM ? parseArea(areaM[1]) : null;

    results.push({
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round: null,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      area_m2,
      notes: [],
    });
  }
  return results;
}
