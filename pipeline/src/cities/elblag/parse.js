import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ORDINAL_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const m = /(\d[\d\s.,]*)/.exec(String(numStr));
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, '').replace(/,\d{2}$/, '').replace(/\./g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseHa(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).trim().replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).trim().replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isBezprzetargowoDoc(text) {
  const t = text || '';
  return (
    /bezprzetargow/i.test(t) ||
    /sprzeda[żz]y\s+na\s+rzecz\s+najemc[óo]w/i.test(t) ||
    /na\s+rzecz\s+najemc[óo]w\s+oraz\s+udzielenia\s+bonifikat/i.test(t)
  );
}

export function isResultDoc(text) {
  return /informacj\w*\s+o\s+wynik\w*\s+przetarg/i.test(text || '');
}

export function isAnnouncementDoc(text) {
  return /ogłasza[\s\S]{0,80}przetarg/i.test(text || '');
}


const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/i.test(s)) return null;
  const up = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 ? total : null;
}

export function roundFromRoundField(text) {
  const m = /^\s*([IVXLCDM]+)\b/i.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}

export function roundFromSectionHeader(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+(?:ustny|pisemny)\s+przetarg/i.exec(text || '');
  return m ? ORDINAL_WORDS[m[1].toLowerCase()] ?? null : null;
}


export function ddmmyyyyToIso(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s || '');
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function auctionDateFromText(text) {
  const m = /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

export function resultDateFromText(text) {
  const m = /przeprowadzon\w*\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}


const LOKALIZACJA_RE =
  /Lokalizacja:\s*Elbl[ąa]g,\s*ul\.\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]*?)(?:\s+(\d+[A-Za-z]?)(?:\/(\S+?))?)?\s*\./;

export function lokalizacjaFromText(text) {
  const m = LOKALIZACJA_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').trim();
  if (!street) return null;
  return { street, building: m[2] || null, apt: m[3] || null };
}

export function addressRawFromText(text) {
  const h = lokalizacjaFromText(text);
  if (!h || !h.building) return null;
  return h.apt ? `ul. ${h.street} ${h.building}/${h.apt}` : `ul. ${h.street} ${h.building}`;
}


const DZIALKA_RE =
  /obr(?:ęb|\.)\s*(\d+)\s*,\s*dzia[łl]k\w*\s*nr\s*(\d+(?:\/\d+)?)\s*o\s*(?:pow\.|powierzchni)\s*([\d,.]+)\s*ha/i;

export function dzialkaFromText(text) {
  const m = DZIALKA_RE.exec((text || '').replace(/\s+/g, ' '));
  if (!m) return { obreb: null, dzialka_nr: null, area_m2: null };
  const ha = parseHa(m[3]);
  return {
    obreb: m[1],
    dzialka_nr: m[2],
    area_m2: ha != null ? Math.round(ha * 10000) : null,
  };
}

const UNIT_AREA_RE = /[łl][ąa]cznej\s+powierzchni\s+u[żz]ytkow\w+\s+([\d.,\s]+?)\s*m\s*[²2](?!\d)/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec((text || '').replace(/\s+/g, ' '));
  return m ? parseArea(m[1]) : null;
}


function kindFromHeader(text) {
  return classifyKind((text || '').slice(0, 600));
}


export function parseAnnouncement(fields = {}) {
  const pdfText = fields.pdfText || '';
  if (!pdfText || isBezprzetargowoDoc(pdfText)) return null;

  const kind = fields.kindText ? classifyKind(fields.kindText) : kindFromHeader(pdfText);
  const round = fields.roundText ? roundFromRoundField(fields.roundText) : null;
  const starting_price_pln = fields.priceText != null
    ? parsePLN(fields.priceText)
    : (() => {
        const m = /Cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci:?\s*([\d.\s]+)\s*z[łl]/i.exec(pdfText);
        return m ? parsePLN(m[1]) : null;
      })();
  const auction_date = fields.auctionDateIso || auctionDateFromText(pdfText);
  const plot = dzialkaFromText(pdfText);

  if (kind === 'grunt') {
    const h = lokalizacjaFromText(pdfText);
    const address_raw = h ? `ul. ${h.street}` : null;
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(pdfText);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(pdfText);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    ...(area_m2 == null && plot.area_m2 != null ? { land_area_m2: plot.area_m2 } : {}),
    starting_price_pln,
    auction_date,
    round,
  };
}

const ROW_RE =
  /\n\t?(\d+)\.\t([^\t\n]+?)\s*\t(\S+)\t(\S+)\t(\S+)\t([\d.,]+)\t(\S+)\t(\S+)\t([\d.,]+|-+)\t([\d.,]+|-+)\t([\s\S]*?)(?=\n\t?\d+\.\t|\n\t?(?:pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+(?:ustny|pisemny)\s+przetarg|$)/gi;

function outcomeFromRow(nabywcaRaw, najwyzszaCenaRaw, startingPricePln) {
  const nabywca = (nabywcaRaw || '').replace(/\s+/g, ' ').trim();
  const negative = /brak\s+wp[łl]aty\s+wadium|wynikiem\s+negatywnym|brak\s+ofert|nie\s+wy[łl]oniono/i.test(nabywca);
  const najwyzsza = parsePLN(najwyzszaCenaRaw);
  if (negative || !nabywca) {
    return { outcome: 'unsold', final_price_pln: null, notes: [] };
  }
  if (najwyzsza != null) {
    return { outcome: 'sold', final_price_pln: najwyzsza, notes: [] };
  }
  return {
    outcome: 'sold',
    final_price_pln: startingPricePln,
    notes: startingPricePln != null ? ['parse: sold at cena wywoławcza (single admitted bidder, no recorded raise)'] : ['parse: sold but no achieved or starting price recorded'],
  };
}

function rowAddressAndKind(streetCellRaw) {
  const cell = (streetCellRaw || '').replace(/\s+/g, ' ').trim();
  const m = /^([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]*?)\s+(\d+[A-Za-z]?)(?:\/(\S+))?$/.exec(cell);
  if (!m) return { kind: 'grunt', address_raw: cell ? `ul. ${cell}` : null, address: null };
  const [, street, building, apt] = m;
  const address_raw = apt ? `ul. ${street} ${building}/${apt}` : `ul. ${street} ${building}`;
  const address = parseAddress(address_raw);
  const kind = apt ? 'mieszkalny' : 'zabudowana';
  return { kind, address_raw, address };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !isResultDoc(text) || isBezprzetargowoDoc(text)) return [];
  const t = text.replace(/\r/g, '').replace(/\n{2,}/g, '\n');
  const docDate = resultDateFromText(t) || fallbackDate || null;

  const sectionRe =
    /\n\t?((?:pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+(?:ustny|pisemny)\s+przetarg\s+\w+)/gi;
  const sections = [];
  let sm;
  while ((sm = sectionRe.exec(t)) !== null) {
    sections.push({ index: sm.index, round: roundFromSectionHeader(sm[1]) });
  }
  const roundAt = (idx) => {
    let round = null;
    for (const s of sections) {
      if (s.index <= idx) round = s.round;
      else break;
    }
    return round;
  };

  const out = [];
  let rm;
  ROW_RE.lastIndex = 0;
  while ((rm = ROW_RE.exec(t)) !== null) {
    const [, , streetCellRaw, , obrebCell, dzialkaCell, powCellHa, , , cenaWywRaw, najwyzszaRaw, nabywcaRaw] = rm;
    const { kind, address_raw, address } = rowAddressAndKind(streetCellRaw);
    const starting_price_pln = parsePLN(cenaWywRaw);
    const { outcome, final_price_pln, notes } = outcomeFromRow(nabywcaRaw, najwyzszaRaw, starting_price_pln);
    const round = roundAt(rm.index);
    const ha = parseHa(powCellHa);
    const area_m2 = ha != null ? Math.round(ha * 10000) : null;

    if (kind === 'grunt') {
      if (!address_raw && !dzialkaCell) continue;
      out.push({
        auction_date: docDate,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: /^\d+(?:\/\d+)?$/.test(dzialkaCell) ? dzialkaCell : null,
        obreb: /^\d+$/.test(obrebCell) ? obrebCell : null,
        area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln,
        outcome,
        unsold_reason: outcome === 'unsold' ? 'unknown' : null,
        notes,
      });
      continue;
    }

    if (!address) continue;
    out.push({
      auction_date: docDate,
      source_pdf: sourceUrl,
      kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason: outcome === 'unsold' ? 'unknown' : null,
      area_m2,
      notes,
    });
  }
  return out;
}
