// Sosnowiec parsers.
//
// Sosnowiec BIP (bip.um.sosnowiec.pl) is a React SPA backed by a JSON API.
// Each auction is one article whose content is HTML holding the full
// announcement text inline (no PDF needed for flats). Flat auctions AND land
// (dzialka/grunt) auctions are parsed here; see crawl.js for routing.
//
// LAND phrasings (June 2026), confirmed from live API:
//   Single plot: "dzialka nr 2420 obreb 0010 Sosnowiec, o powierzchni 1.457 m2"
//   Multi-merged: "dzialki o numerach 2225/10, 2226/6, obreb 03 Zagorze, 1308 m2"
//   Multi-separate: I. Nieruchomosc ... II. Nieruchomosc ...
//   Date forms: "w dniu 10 lipca 2026 r." / "w dniu 21.08.2026 r." / "6.02.2026 r."

import { parseAddress } from '../../core/normalize.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'wrzesnia': 9, 'wrzesień': 9, 'września': 9, wrzesnia: 9, 'październik': 10, 'października': 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

export function htmlToText(html) {
  if (!html) return '';
  let s = html.replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&sup2;/gi, '²')
    .replace(/&sup3;/gi, '³')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—');
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export function isFlatAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/przetarg/.test(t) || /bezprzetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln|prawa\s+w[łl]asno[śs]ci\s+lokalu\s+mieszkaln/.test(t);
}

export function roundFromText(text) {
  const m = /og[łl]asza\s+([\s\S]{0,60}?)przetarg/i.exec(text || '');
  const scope = m ? m[1] : '';
  if (/pierwsz/i.test(scope)) return 1;
  if (/drug/i.test(scope)) return 2;
  if (/trzeci/i.test(scope)) return 3;
  if (/czwart/i.test(scope)) return 4;
  const r = /\b(VI|IV|V|I{1,3})\b/i.exec(scope);
  if (r) return ROMAN[r[1].toUpperCase()] ?? null;
  return /og[łl]asza/i.test(text || '') ? 1 : null;
}

export function auctionDateFromText(text) {
  if (!text) return null;
  const m = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(text);
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const num = /odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (num) return `${num[3]}-${num[2].padStart(2, '0')}-${num[1].padStart(2, '0')}`;
  return null;
}

function parsePLN(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/[.,]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function priceFromText(text) {
  const m = /cena\s+wywo[łl]awcza[^0-9]{0,40}?([\d][\d\s.]*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function areaFromText(text) {
  if (!text) return null;
  const plausible = (v) => v != null && v >= 8 && v <= 300;
  const lab = /pow(?:ierzchni\w*)?\.?\s+u[żz]ytkow\w*[^0-9]{0,20}?([\d.,]+)\s*m\s*(?:[²2]|kw)/i.exec(text);
  if (lab) {
    const v = parseArea(lab[1]);
    if (plausible(v)) return v;
  }
  const M2 = /([\d][\d.,]*)\s*m\s*(?:[²2]|kw)(?!\d)/gi;
  let m;
  const cands = [];
  while ((m = M2.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/dzia[łl]k|grunt/i.test(before)) continue;
    const v = parseArea(m[1]);
    if (plausible(v)) cands.push(v);
  }
  return cands.length ? Math.max(...cands) : null;
}

export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt = /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|nr)\s*(\d+[A-Za-z]?)/i.exec(src)?.[1] || null;
  const RE_LOC = /przy\s+(?:ul\.|al\.|alei|placu|pl\.|os\.)?\s*([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/;
  const loc = RE_LOC.exec(title) || RE_LOC.exec(src);
  if (!loc) return null;
  const street = loc[1].replace(/\s+/g, ' ').trim();
  const building = loc[2];
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

export function parseAnnouncement(title, content) {
  const text = htmlToText(content);
  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: roundFromText(text),
    auction_date: auctionDateFromText(text),
  };
}

// ---------------- land (dzialki/grunty) parsing ----------------------------

function parsePricesPerParcel(text) {
  const map = new Map();
  const re = /za\s+nieruchomo[śs][ćc]\s+oznaczon[^\s]*\s+geodezyjnie\s+jako\s+dzia[łl]ka\s+nr\s+([\d\/]+)[\s\S]{0,120}?([\d][\d\s.]*,\d{2})\s*z[łl]/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const parcel = m[1].trim();
    const price = parsePLN(m[2]);
    if (price != null) map.set(parcel, price);
  }
  return map;
}

function parseDatesPerParcel(text) {
  const map = new Map();
  const re = /[Pp]rzetarg\s+na\s+sprzeda[żz][^\s]*\s*nieruchomo[śs]ci\s+oznaczone[jg]\s+geodezyjnie\s+jako\s+dzia[łl]ka\s+nr\s+([\d\/]+)[\s\S]{0,120}?[–\-]\s*(\d{1,2}\.\d{1,2}\.\d{4})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const parcel = m[1].trim();
    const date = parseDateNumeric(m[2]);
    if (date) map.set(parcel, date);
  }
  return map;
}

function parseDateNumeric(s) {
  if (!s) return null;
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function parsePlotArea(text) {
  if (!text) return null;
  const num = (s) => {
    let raw = String(s).replace(/[  ]/g, '');
    if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, ''); // thousands dots
    raw = raw.replace(',', '.');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  // m² / m2 / mkw, optional pow./powierzchni/łącznej preamble, glued or spaced.
  const reM2 = /(?:pow(?:ierzchni)?\.?|powierzchni\w*)?\s*(?:[łl][ąa]cznej\s+)?([\d][\d . ]*(?:,\d+)?)\s*m\s*(?:[²2]|kw)(?!\d)/i;
  let m = reM2.exec(text);
  if (m) { const n = num(m[1]); if (n != null) return n; }
  // hectares: "0,1115 ha" / "1,5350 ha" → m²
  m = /([\d][\d . ]*(?:,\d+)?)\s*ha\b/i.exec(text);
  if (m) { const n = num(m[1]); if (n != null) return Math.round(n * 10000); }
  return null;
}

function parseObreb(text) {
  if (!text) return null;
  const m = /obr[ęe]b\s+([\d]+\s+[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ\-]+)/i.exec(text);
  if (m) return m[1].trim();
  const m2 = /obr[ęe]b\s+([\w\/]+)/i.exec(text);
  return m2 ? m2[1].trim() : null;
}

function parseFirstParcel(text) {
  if (!text) return null;
  const m =
    /dzia[łl]ka\s+nr\s+([\d\/]+)/i.exec(text) ||
    /dzia[łl]ki\s+(?:o\s+)?numerach?\s+([\d\/]+)/i.exec(text) ||
    /dzia[łl]k[aie]\s+(?:o\s+)?(?:nr|numerze|numerach)\s+([\d\/]+)/i.exec(text);
  return m ? m[1].trim() : null;
}

function parseAllParcels(text) {
  if (!text) return [];
  const m = /dzia[łl]ki\s+(?:o\s+)?numerach?\s+([\d\/,\s]+?)(?:\s*,\s*obr[ęe]b|\s*(?:o\s+)?pow)/i.exec(text);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim()).filter(Boolean);
}

function parseMultiPlotBlocks(text) {
  if (!text) return [];
  const blocks = [];
  const RE_BLOCK = /\b(I{1,3}V?|VI{0,3}|IV|IX|V)\.\s+Nieruchomo[śs][ćc]/g;
  let m;
  const positions = [];
  while ((m = RE_BLOCK.exec(text)) !== null) positions.push(m.index);
  if (positions.length < 2) return [];
  positions.push(text.length);
  for (let i = 0; i < positions.length - 1; i++) {
    const chunk = text.slice(positions[i], positions[i + 1]);
    const parcel = parseFirstParcel(chunk);
    if (!parcel) continue;
    const obreb = parseObreb(chunk);
    const area_m2 = parsePlotArea(chunk);
    blocks.push({ parcel, obreb, area_m2 });
  }
  return blocks;
}

export function isLandAuction(title) {
  const t = (title || '').toLowerCase();
  if (!/przetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  if (/bezprzetarg|dzier[żz]aw|najem/.test(t)) return false;
  if (/odwo[łl]anie|lista\s+os[óo]b|wynik/.test(t)) return false;
  if (/lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t)) return false;
  return /niezabudowan|dzia[łl]k|grunt/.test(t);
}

export function parseLandAnnouncement(title, content, detailUrl) {
  const text = htmlToText(content);
  const round = roundFromText(text);

  const blocks = parseMultiPlotBlocks(text);
  if (blocks.length >= 2) {
    const priceMap = parsePricesPerParcel(text);
    const dateMap = parseDatesPerParcel(text);
    const results = [];
    for (const blk of blocks) {
      results.push({
        kind: 'grunt',
        dzialka_nr: blk.parcel,
        obreb: blk.obreb,
        area_m2: blk.area_m2,
        address_raw: title || null,
        street: null,
        starting_price_pln: priceMap.get(blk.parcel) ?? null,
        auction_date: dateMap.get(blk.parcel) ?? null,
        round,
        detail_url: detailUrl,
        source_url: detailUrl,
        geoportal_url: null,
      });
    }
    return results;
  }

  const firstParcel = parseFirstParcel(text) || parseFirstParcel(title);
  if (!firstParcel) return [];

  const allParcels = parseAllParcels(text);
  const obreb = parseObreb(text);
  const area_m2 = parsePlotArea(text);
  const parcelStr = allParcels.length > 1 ? allParcels.join(', ') : firstParcel;
  const address_raw = obreb
    ? `dz. nr ${parcelStr}, obręb ${obreb}`
    : `dz. nr ${parcelStr}`;
  const starting_price_pln = priceFromText(text);
  const auction_date = auctionDateFromText(text) || parseDateNumericFromText(text);

  return [{
    kind: 'grunt',
    dzialka_nr: firstParcel,
    obreb,
    area_m2,
    address_raw,
    street: null,
    starting_price_pln,
    auction_date,
    round,
    detail_url: detailUrl,
    source_url: detailUrl,
    geoportal_url: null,
  }];
}

function parseDateNumericFromText(text) {
  if (!text) return null;
  const m = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = /przetarg\s+odb[ęe]dzie[^.]{0,80}?(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return null;
}

export function isFlatResult(title) {
  const t = (title || '').toLowerCase();
  if (!/^\s*wynik/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  return /lokalu?\s+mieszkaln/.test(t);
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const s = String(text || '');
  const nl = s.indexOf('\n');
  const title = nl >= 0 ? s.slice(0, nl) : s;
  const body = nl >= 0 ? s.slice(nl + 1) : '';
  if (!isFlatResult(title)) return [];

  const notes = [];
  const addr = addressFrom(title, body);
  if (!addr) return [];

  let auction_date = null;
  const dn = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(body);
  if (dn) {
    auction_date = `${dn[3]}-${dn[2].padStart(2, '0')}-${dn[1].padStart(2, '0')}`;
  } else {
    const ds = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(body);
    const mon = ds ? PL_MONTHS[ds[2].toLowerCase()] : null;
    if (mon) auction_date = `${ds[3]}-${String(mon).padStart(2, '0')}-${ds[1].padStart(2, '0')}`;
  }
  if (!auction_date) auction_date = fallbackDate || null;

  let finalM = /najwy[żz]sz[ąa]\s+cen[ęe][^0-9]{0,60}?([\d][\d\s.]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  // Older result notices phrase the achieved price as "...osiągnęła kwotę w wysokości N zł".
  if (!finalM) finalM = /osi[ąa]gn[ęe][łl]a\s+kwot[ęe][^0-9]{0,30}?([\d][\d\s.]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  const negative =
    /negatywn|nie\s+wy[łl]oniono|zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem/i.test(body) ||
    (!finalM && !/nabywc/i.test(body));

  const starting_price_pln = priceFromText(body);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  const final_price_pln = negative ? null : finalM ? parsePLN(finalM[1]) : null;
  if (!negative && final_price_pln == null) notes.push('parse: missing achieved price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    round: null,
    starting_price_pln,
    final_price_pln,
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2: areaFromText(body),
    notes,
  }];
}
