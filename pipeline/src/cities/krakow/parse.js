// Kraków parsers — MULTI-PROPERTY notices. Each ?news_id article is a numbered
// list of properties; the auction date is shared. Groundtruthed against real
// notices (verified 2026-06-26): news_id 245809 (announcement: garaż G12 ul.
// Królewska 69 + udział działki 169/16) and 249643 (result: same two, garaż sold
// 114 000 → 130 000, udział negatywny). Reuses core/finn-bip.js (htmlToText,
// parsePLN, areaFromText) + classifyKind + parseAddress.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { htmlToText, parsePLN, areaFromText } from '../../core/finn-bip.js';

export { htmlToText };

// Formatting tags can split a single word (e.g. <span>l</span>okalu). Repeated
// replacement strips nested wrappers until a fixed point is reached.
function unwrapInlineFormatting(input) {
  let previous;
  let text = String(input || '');
  do {
    previous = text;
    text = text.replace(/<\/?(?:span|strong|em|b|i|u)\b[^>]*>/gi, '');
  } while (text !== previous);
  return text;
}

const noticeText = text => htmlToText(unwrapInlineFormatting(text));

const PL_MONTH = { stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6, lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9, 'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12 };
function isoFrom(d, mo, y) { const m = PL_MONTH[String(mo).toLowerCase()]; return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null; }

// Auction date. Announcement: "Przetargi … odbędą się w dniu 15 kwietnia 2026 r."
// (+ title "Termin przetargu: 15 kwietnia 2026 r."). Result: "W dniu 15 kwietnia
// 2026 r. w siedzibie … przeprowadzone zostały" / header "z dnia 15 kwietnia 2026".
export function noticeDate(text, { isResult = false } = {}) {
  const t = noticeText(text);
  if (isResult) {
    const m = /W\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+w\s+siedzibie/i.exec(t)
      || /z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
    return m ? isoFrom(m[1], m[2], m[3]) : null;
  }
  const m = /odb[ęe]d[ąa]\s+si[ęe][^.!?]{0,160}?\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t)
    || /Termin\s+przetargu\s*:?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) return isoFrom(m[1], m[2], m[3]);
  const numeric = /termin\s+przetargu\s*:\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  return numeric ? `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}` : null;
}

// Split a notice body into numbered property items (each carries a cena wywoławcza
// amount). htmlToText flattens newlines, so split on " N. " markers and keep only
// price-bearing segments (drops the header + boilerplate numbered lists).
export function splitItems(text) {
  let source = String(text || '');
  const bodyStart = source.indexOf('<div class="news_short">');
  const bodyEnd = source.indexOf('<div class="metkaBox');
  if (bodyStart >= 0) source = source.slice(bodyStart, bodyEnd > bodyStart ? bodyEnd : undefined);
  const marked = source.replace(/<li\b[^>]*>([\s\S]*?)(?=<\/li>)/gi, (full, body) => {
    const plain = noticeText(body);
    const hasPrice = /cena\s+wywo[łl]awcz/i.test(plain);
    if (!hasPrice && !/^(?:pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg\w*\s+na\s+sprzeda[żz]/i.test(plain)) return full;
    return ` __AUCTION_LOT__ ${body}${hasPrice ? ' __AUCTION_LOT__ ' : ''}`;
  });
  const t = noticeText(marked);
  return t.split(/__AUCTION_LOT__|\s\d{1,2}\.\s+/)
    .filter((p) => /cena\s+wywo[łl]awcz/i.test(p) && /\d[\d\s .]*,\d{2}\s*z[łl]/.test(p));
}

const ROUND_WORD = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6 };
export function roundFromItem(seg) { const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(seg || ''); return m ? ROUND_WORD[m[1].toLowerCase()] ?? null : null; }
export function priceFromItem(seg) { const m = /cena\s+wywo[łl]awcz\w*(?:\s+(?:udzia[łl]u\s+w\s+nieruchomo[śs]ci|prawa\s+u[żz]ytkowania\s+wieczystego\s+nieruchomo[śs]ci|[a-ząćęłńóśźż]+))?\s+wynosi[a-ząćęłńóśźż]*\s*:?\s*([\d][\d\s .]*,\d{2})\s*z[łl]/i.exec(seg || ''); return m ? parsePLN(m[1]) : null; }
export function achievedFromItem(seg) { const m = /zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+([\d][\d\s .]*,\d{2})\s*z[łl]/i.exec(seg || ''); return m ? parsePLN(m[1]) : null; }
export function parcelFromItem(seg) {
  const m = /(?:nr\.?|numer\w*)\s+dzia[łl]ki\s+(\d+(?:\/\d+)?)/i.exec(seg || '') || /dzia[łl]k\w*\s+(?:nr\.?|numer\w*)\s+(\d+(?:\/\d+)?)/i.exec(seg || '');
  return m ? m[1] : null;
}
export function obrebFromItem(seg) { const m = /w\s+obr[ęe]bie\s+([A-Z]-?\d+[A-Za-z]?|[A-ZŻŹĆŁŚ][\w-]+)/.exec(seg || ''); return m ? m[1] : null; }
export function haAreaFromItem(seg) { const m = /(\d+[.,]\d+|\d+)\s*ha\b/i.exec(seg || ''); if (!m) return null; const ha = Number(m[1].replace(',', '.')); return ha > 0 ? Math.round(ha * 10000) : null; }

const OFFICE = /podg[óo]rsk|kasprowicz|wszystkich\s+[śs]wi[ęe]t|mogilsk|rynek/i;
export function landStreet(seg) {
  const re = /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+(?:w\s+Krakowie\s+)?przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń. -]+?)(?=\s*[,.]|\s+Nr\b|\n|$)/g;
  let m; while ((m = re.exec(seg || '')) !== null) { const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim(); if (s && !OFFICE.test(s)) return s; }
  return null;
}

// Built unit (flat / commercial / garage): "w budynku przy ul. Królewskiej Nr 69";
// garage unit "oznaczonego Nr G12" → "ul. Królewskiej 69 garaż nr 12".
export function builtAddress(seg) {
  const invalidStreet = /\b(?:cena|wywo[łl]awcza|powierzchni|u[żz]ytkowej|wynosi[łl]a|dzia[łl]ek|po[łl]o[żz]on\w*|budynk\w*)\b|\bi\s+ul\b/i;
  const streetPattern = '[\\p{L}][\\p{L}.-]*(?:\\s+[\\p{L}][\\p{L}.-]*){0,7}?';
  const direct = new RegExp(`(?:przy|na|w)\\s+(?:ul(?:icy)?|os(?:iedlu)?|pl(?:acu)?)\\.?\\s+(${streetPattern})\\s+(?:Nr\\.?\\s+)?(\\d+[A-Za-z]?)`, 'giu');
  const match = [...String(seg || '').matchAll(direct)].find(m => !invalidStreet.test(m[1]));
  const reverse = match ? null : new RegExp(`(?:budynk\\w*\\s+(?:mieszkaln\\w*\\s+)?|[, ]+)nr\\.?\\s*(\\d+[A-Za-z]?)[^.;]{0,60}?przy\\s+ul\\.?\\s+(${streetPattern})(?=\\s+o\\s+powierzchni|[,.;]|$)`, 'iu').exec(seg || '');
  if (!match && !reverse) return null;
  const street = (match ? match[1] : reverse[2]).replace(/\s+/g, ' ').trim();
  const building = match ? match[2] : reverse[1];
  const garage = /oznaczon\w*\s+Nr\s+G\s?(\d+)/i.exec(seg || '');
  if (garage) { const raw = `ul. ${street} ${building} garaż nr ${garage[1]}`; const a = parseAddress(raw); return a ? { address_raw: raw, address: a } : null; }
  const flat = /lokal\w*\s+(?:mieszkaln\w*|o\s+przeznaczeniu\s+innym\s+ni[żz]\s+mieszkalne)\s+(?:oznaczonego\s+)?(?:nr\.?|numer\w*)\s+(\d+[A-Za-z]?)/i.exec(seg || '')
    || /lokal\w*\s+mieszkaln\w*[^.]{0,120}?oznaczonego\s+nr\.?\s+(\d+[A-Za-z]?)/i.exec(seg || '');
  const raw = flat ? `ul. ${street} ${building}/${flat[1]}` : `ul. ${street} ${building}`;
  const a = parseAddress(raw); return a ? { address_raw: raw, address: a } : null;
}

function parseItem(seg, { isResult, auction_date, url }) {
  if ((seg.match(/cena\s+wywo[łl]awcz/gi) || []).length !== 1) return null;
  // Legal boilerplate/footer links can name other asset classes. Classify
  // this item's subject, before its first price, rather than the whole page.
  const subject = String(seg || '').split(/cena\s+wywo[łl]awcz/i)[0];
  const classified = classifyKind(subject.split(/\.\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/)[0]);
  const kind = classified !== 'garaz' && /lokal\w*\s+o\s+przeznaczeniu\s+innym\s+ni[żz]\s+mieszkalne/i.test(subject)
    ? 'uzytkowy' : classified;
  const round = roundFromItem(seg);
  const starting_price_pln = priceFromItem(seg);
  const achieved = isResult ? achievedFromItem(seg) : null;
  const negative = /przetarg\w*\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/i.test(seg);
  if (isResult && achieved == null && !negative) return null;
  const wrap = (base) => isResult
    ? { auction_date, source_pdf: url, ...base, final_price_pln: achieved != null ? achieved : null, outcome: achieved != null ? 'sold' : 'unsold', unsold_reason: achieved == null ? 'unknown' : null, notes: base.notes || [] }
    : { ...base, auction_date, detail_url: url, source_url: url };

  if (kind === 'grunt') {
    let dzialka_nr = parcelFromItem(seg);
    let area_m2 = haAreaFromItem(seg);
    const notes = [];
    const parcelSubject = subject.split(/\.\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/)[0];
    const parcels = [...parcelSubject.matchAll(/(?:\bnr\s*:?|\bi)\s*(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+)\s*ha/gi)];
    if (parcels.length > 1 || /sk[łl]adaj[ąa]c\w*\s+si[ęe]\s+z\s+dzia[łl]ek\s+nr/i.test(subject)) {
      const total = /(?:[łl][ąa]czna\s+powierzchnia|powierzchni\s+[łl][ąa]cznej)\s+(\d+[.,]\d+)\s*ha/i.exec(subject);
      const sum = parcels.reduce((value, p) => value + Math.round(Number(p[2].replace(',', '.')) * 10000), 0);
      if (parcels.length < 2 || new Set(parcels.map(p => p[1])).size !== parcels.length
        || (total && sum !== Math.round(Number(total[1].replace(',', '.')) * 10000))) return null;
      dzialka_nr = parcels.map(p => p[1]).join(', ');
      area_m2 = sum;
      notes.push('Łączna cena i powierzchnia dotyczą całego pakietu działek.');
    }
    const share = /udzia[łl]u\s+wynosz[ąa]cego\s+(\d+\/\d+)\s+cz[ęe][śs]ci/i.exec(subject)?.[1];
    if (share) notes.push(`Cena dotyczy udziału ${share} w nieruchomości.`);
    if (/prawa\s+u[żz]ytkowania\s+wieczystego/i.test(subject)) notes.push('Cena dotyczy prawa użytkowania wieczystego.');
    const street = landStreet(seg);
    if (!dzialka_nr && !street) return null;
    return wrap({ kind: 'grunt', dzialka_nr, obreb: obrebFromItem(seg), area_m2, address_raw: street ? `ul. ${street}` : null, round, starting_price_pln, ...(notes.length ? { notes } : {}) });
  }
  if (kind === 'unknown') return null;
  const addr = builtAddress(subject);
  if (!addr) return null;
  return wrap({ kind: kind === 'unknown' ? 'mieszkalny' : kind, address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(seg), round, starting_price_pln });
}

export function parseNotice(text, { isResult = false, url = null } = {}) {
  const auction_date = noticeDate(text, { isResult });
  const grouped = !isResult ? parseLandPriceGroups(text, { auction_date, url }) : null;
  if (grouped) return grouped;
  const out = [];
  for (const seg of splitItems(text)) { const rec = parseItem(seg, { isResult, auction_date, url }); if (rec) out.push(rec); }
  return out;
}

// Some announcements price parcel groups in separate paragraphs instead of
// numbered lots. Resolve every price against the header's parcel/area list.
function parseLandPriceGroups(text, { auction_date, url }) {
  const plain = noticeText(text);
  const pricePattern = /cena\s+wywo[łl]awcza\s+dzia[łl](?:ek|ki)\s+nr\s+(\d+\/\d+(?:\s+i\s+nr\s+\d+\/\d+)*)\s+wynosi\s+(?:[łl][ąa]cznie\s+)?([\d][\d\s.]*,\d{2})\s*z[łl]/gi;
  const groups = [...plain.matchAll(pricePattern)];
  if (!groups.length) return null;
  const subject = plain.slice(0, groups[0].index);
  if (!/sprzeda[żz]\s+nieruchomo[śs]ci\s+gruntowych/i.test(subject) || !auction_date) return [];
  const areas = new Map();
  for (const m of subject.matchAll(/\bnr\s+(\d+\/\d+)\s+o\s+powierzchni\s+(\d+[.,]\d+)\s*ha/gi)) {
    const area = Math.round(Number(m[2].replace(',', '.')) * 10000);
    if (!area || areas.has(m[1])) return [];
    areas.set(m[1], area);
  }
  const seen = new Set();
  const records = [];
  for (const group of groups) {
    const parcels = [...group[1].matchAll(/\d+\/\d+/g)].map(m => m[0]);
    if (new Set(parcels).size !== parcels.length || parcels.some(p => !areas.has(p) || seen.has(p))) return [];
    for (const p of parcels) seen.add(p);
    records.push({ kind: 'grunt', dzialka_nr: parcels.join(', '), obreb: obrebFromItem(subject),
      area_m2: parcels.reduce((sum, p) => sum + areas.get(p), 0), starting_price_pln: parsePLN(group[2]),
      auction_date, round: roundFromItem(subject), detail_url: url, source_url: url,
      notes: parcels.length > 1 ? ['Łączna cena i powierzchnia dotyczą całego pakietu działek.'] : [],
    });
  }
  return seen.size === areas.size && groups.length === (plain.match(/cena\s+wywo[łl]awcza\s+dzia[łl](?:ek|ki)/gi) || []).length ? records : [];
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (!/o\s+wynik|zosta[łl]a\s+ustalona\s+na\s+kwot|wynikiem\s+negatywnym/i.test(t)) return [];
  return parseNotice(text, { isResult: true, url: sourceUrl }).map((r) => (r.auction_date ? r : { ...r, auction_date: fallbackDate || null }));
}
