
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function isoFrom(d, mo, y) {
  const m = PL_MONTH[String(mo).toLowerCase()];
  return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}

export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s .]/g, '').replace(/,\d{1,2}$/, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


function _parsePriceLine(line) {
  const tokens = (line || '').trim().split(/\s+/);
  const prices = [];
  let i = 0;
  while (i < tokens.length) {
    const cur = tokens[i];
    if (!/^\d+$/.test(cur)) { i++; continue; }
    if (
      i + 1 < tokens.length &&
      /^\d{1,3}$/.test(cur) &&
      /^\d{3}$/.test(tokens[i + 1])
    ) {
      prices.push(Number(cur + tokens[i + 1]));
      i += 2;
    } else {
      prices.push(Number(cur));
      i++;
    }
  }
  return prices;
}

export function auctionDateFromAnn(text) {
  const m = /(?:Przetarg(?:i|y)?|Aukcj[ae])\s+odb(?:[ęe]d[ąa]|[ęe]dzie)\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  return isoFrom(m[1], m[2], m[3]);
}

export function splitLots(text) {
  const t = (text || '').replace(/\r/g, '').replace(/\f/g, '\n');
  return t
    .split(/(?=^[ \t]*(?:\d{1,2}\.[ \t]+)?(?:ul\.|al\.|pl\.|os\.)\s+)/m)
    .map((segment) => segment.trim())
    .filter((segment) =>
      /LD\d[A-Z]\/\d{8}\/\d/.test(segment) && /lokal[^\n]{0,60}\s+nr\s+\d/i.test(segment));
}

export function parseLotSegment(seg) {
  if (!seg) return null;

  const addrRe =
    /(?:ul\.|al\.|pl\.|os\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- '"]+?)\s+(\d+(?:\/\d+)?[A-Za-z]?)(?:\*\d+)?\s+(lokal[^0-9\n]{0,40}?)\s+nr\s+(\d+[A-Za-z]*)(?:\*\d+)?/i;
  const addrM = addrRe.exec(seg);
  if (!addrM) return null;

  const street = addrM[1].replace(/\s+/g, ' ').trim();
  const buildingFull = addrM[2].toUpperCase();
  const kindPhrase = addrM[3].replace(/\s+/g, ' ').trim();
  const apt = addrM[4].toUpperCase();

  const kind = /gara[żz]/i.test(kindPhrase) ? 'garaz' : classifyKind(kindPhrase);

  const address_raw = `ul. ${street} ${buildingFull}/${apt}`;
  const buildingMain = buildingFull.split('/')[0];
  const address = parseAddress(`ul. ${street} ${buildingMain}/${apt}`);
  if (!address) return null;

  const areaM = /(\d{1,3},\d{2})\b/.exec(seg);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const lines = seg.split('\n').map(l => l.trim()).filter(Boolean);
  let starting_price_pln = null;
  let wadium_pln = null;
  const grouped = String.raw`\d{1,3}(?:[ \t ]\d{3})+`;
  const priceColumns = new RegExp(`(${grouped})[ \\t]+(${grouped})[ \\t]+(${grouped}|\\d{3,4})(?:\\s*)$`);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = priceColumns.exec(lines[i]);
    if (!m) continue;
    starting_price_pln = parsePLN(m[1]);
    wadium_pln = parsePLN(m[2]);
    break;
  }
  let priceLine = '';
  for (let i = lines.length - 1; starting_price_pln == null && i >= 0; i--) {
    if (/^[\d\s]+$/.test(lines[i])) { priceLine = lines[i]; break; }
  }
  const priceNums = _parsePriceLine(priceLine);
  if (starting_price_pln == null) starting_price_pln = priceNums.length >= 1 ? priceNums[0] : null;
  if (wadium_pln == null) wadium_pln = priceNums.length >= 2 ? priceNums[1] : null;
  if (starting_price_pln != null && starting_price_pln < 1000) starting_price_pln = null;

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    wadium_pln,
  };
}

export function parseAnnouncementPdf(text, ctx = {}) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const auction_date = auctionDateFromAnn(t);
  const segs = splitLots(t);
  const out = [];
  for (const seg of segs) {
    const rec = parseLotSegment(seg);
    if (!rec) continue;
    out.push({
      ...rec,
      auction_date,
      round: null, // Łódź announcements don't state the round ordinal in the body
      detail_url: ctx.detail_url || null,
      source_url: ctx.source_url || null,
    });
  }
  return out;
}


export function auctionDateFromResult(text) {
  const m = /przeprowadzonych\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s*r\./i.exec(text || '');
  if (!m) return null;
  return isoFrom(m[1], m[2], m[3]);
}

export function splitResultLots(text) {
  const t = (text || '').replace(/\r/g, '').replace(/\f/g, '\n');
  const parts = t.split(/^(\d{1,2})\.\s+/m);
  const segs = [];
  for (let i = 1; i < parts.length; i += 2) {
    const seg = (parts[i + 1] || '').trim();
    if (/Liczba\s+os[óo]b\s+dopuszczonych/i.test(seg)) segs.push(seg);
  }
  return segs;
}

export function parseResultSegment(seg, auction_date, sourceUrl) {
  if (!seg) return null;

  const addrRe =
    /(?:ul\.|al\.|pl\.|os\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- '"]+?)\s+(\d+(?:\/\d+)?[A-Za-z]?)(?:\*\d+)?\s+(lokal[^0-9\n]{0,40}?)\s+nr\s+(\d+[A-Za-z]*)(?:\*\d+)?/i;
  const addrM = addrRe.exec(seg);
  if (!addrM) return null;

  const street = addrM[1].replace(/\s+/g, ' ').trim();
  const buildingFull = addrM[2].toUpperCase();
  const kindPhrase = addrM[3].replace(/\s+/g, ' ').trim();
  const apt = addrM[4].toUpperCase();
  const kind = /gara[żz]/i.test(kindPhrase) ? 'garaz' : classifyKind(kindPhrase);

  const address_raw = `ul. ${street} ${buildingFull}/${apt}`;
  const buildingMain = buildingFull.split('/')[0];
  const address = parseAddress(`ul. ${street} ${buildingMain}/${apt}`);
  if (!address) return null;

  const beforeResult = seg.replace(/Liczba\s+os[óo]b[\s\S]*/i, '');
  const afterShare = beforeResult.replace(/^[\s\S]*\b0,\d+\s*/m, '');
  const priceMatch = /(\d[\d ]*\d{3}|\d{3,})/g.exec(afterShare);
  const starting_price_pln = priceMatch ? parsePLN(priceMatch[1].replace(/\s/g, '')) : null;

  const areaM = /(\d{1,3},\d{2})\b/.exec(seg);
  const area_m2 = areaM ? parseArea(areaM[1]) : null;

  const soldM = /ustalona\s+na\s+kwot[ęe]\s+w\s+wysoko[śs]ci\s+([\d\s]+)\s*z[łl]/i.exec(seg);
  const final_price_pln = soldM ? parsePLN(soldM[1].replace(/\s/g, '')) : null;
  const sold = final_price_pln != null;

  const negativeStated = /wynikiem\s+negatywnym/i.test(seg)
    || /brak\s+os[óo]b\s+dopuszczonych/i.test(seg)
    || /brak\s+posta[ąa]pienia/i.test(seg);

  const notes = [];
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return {
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    final_price_pln: sold ? final_price_pln : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : 'unknown',
    round: null,
    notes,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  if (!/INFORMACJA\s+o\s+wynikach/i.test(t)) return [];

  const auction_date = auctionDateFromResult(t) || fallbackDate || null;
  const segs = splitResultLots(t);
  const out = [];
  for (const seg of segs) {
    const rec = parseResultSegment(seg, auction_date, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}
