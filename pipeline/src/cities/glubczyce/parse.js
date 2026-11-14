
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import { areaFromText, parsePLN, auctionDateFromText } from '../../core/finn-bip.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};
const pad = (n) => String(n).padStart(2, '0');


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

export function roundFromText(text) {
  const m = /\b([IVXLCDM]{1,6})\s+przetarg\w*\s+ustn/.exec(text || '');
  return m ? romanToInt(m[1]) : null;
}


export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wyniku\s+przetarg/i.test(text || '');
}

export function isSaleAnnouncement(text) {
  const t = text || '';
  if (!/przetarg/i.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/i.test(t)) return false;
  if (/o\s+odwo[łl]aniu\s+przetarg|uniewa[żz]nia\s+si[ęe]/i.test(t)) return false;
  return /sprzeda|zbyci/i.test(t);
}


export function announcementDateFromText(text) {
  return auctionDateFromText(text || '');
}

export function resultDateFromText(text) {
  const t = text || '';
  const m = /przeprowadzonego\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${pad(mo)}-${pad(m[1])}`;
  }
  return auctionDateFromText(t);
}


const AMOUNT = '\\d{1,3}(?:[.\\s\\u00a0]+\\d{3})*(?:,\\d{2})?';

export function startingPriceAnnouncement(text) {
  const t = text || '';
  let m = new RegExp(`cena\\s+wywo[łl]awcz[a-ząćęłńóśźż]*[\\s\\S]{0,180}?(${AMOUNT})\\s*z[łl]`, 'i').exec(t);
  if (!m) m = new RegExp(`(?<![%\\d])(\\d{1,3}(?:[.\\s\\u00a0]+\\d{3})*,\\d{2})\\s*z[łl]`, 'i').exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function startingPriceResult(text) {
  const m = new RegExp(
    `cena\\s+wywo[łl]awcz[a-ząćęłńóśźż]*[\\s\\S]{0,160}?(${AMOUNT})\\s*z[łl]`, 'i',
  ).exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = new RegExp(
    `cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetargu\\s+wynios[łl]a\\s+(${AMOUNT})\\s*z[łl]`, 'i',
  ).exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function outcomeFromText(text, achieved) {
  if (achieved != null) return { outcome: 'sold', unsold_reason: null };
  const t = text || '';
  const noBidder =
    /nikt\s+nie\s+przyst[ąa]pi[łl]|nie\s+przyst[ąa]pi[łl]\w*\s+(?:do\s+przetargu|[żz]aden)/i.test(t);
  const noWadium = /nie\s+wp[łl]acono\s+wadium|nie\s+wp[łl]yn[ęe][łl]o\s+wadium|nie\s+wniesiono\s+wadium/i.test(t);
  const negative = /zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym|wynikiem\s+negatywnym/i.test(t);
  if (noWadium) return { outcome: 'unsold', unsold_reason: 'no_wadium' };
  if (noBidder || negative) return { outcome: 'unsold', unsold_reason: 'no_participants' };
  return { outcome: 'unsold', unsold_reason: 'unknown' };
}


export function areaM2(text) {
  return areaFromText(text || '');
}

export function kindFromText(text) {
  const t = text || '';
  const subject = /przedmiotem\s+sprzeda[żz]y([\s\S]*?)(?=\n\s*2\.|$)/i.exec(t)?.[1];
  const declaration = subject?.split(/Wymieniona nieruchomość|Nieruchomość położona jest/)[0];
  return classifyKind(declaration || t.slice(0, 1400));
}


const titleCase = (s) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
const OFFICE_RE = /niepodleg[łl]o[śs]ci|powsta[ńn]c[óo]w/i;

const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;

export function announcementAddress(text) {
  const t = text || '';
  const apt = UNIT_NO_RE.exec(t)?.[1] || null;
  const re =
    /\bul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.'’\- ]+?)\s+(\d+[A-Za-z]?)\s*(?=,|\bG[łl]ubczyce\b)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const street = m[1].replace(/\s+/g, ' ').trim();
    if (OFFICE_RE.test(street)) continue;
    const raw = `${street} ${m[2]}${apt ? '/' + apt : ''}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: `ul. ${raw}`, address };
  }
  return null;
}

export function addressFromFilename(url, bodyApt) {
  if (!url) return null;
  let slug = decodeURIComponent((url.split('?')[0].split('/').pop() || ''));
  slug = slug.replace(/\.(pdf|docx|doc)$/i, '');
  slug = slug.replace(/^\d+-/, '');
  slug = slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  slug = slug.replace(/_\d{4}$/, '');
  slug = slug.replace(/-\d{1,2}p(?:rzetarg\w*)?$/i, '');
  const m = /^(.*?)-(\d+)(?:_(\d+))?$/.exec(slug);
  if (!m) return null;
  const street = titleCase(m[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim());
  if (!street || /^\d+$/.test(street)) return null;
  const building = m[2];
  const apt = bodyApt || m[3] || null;
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: `ul. ${raw}`, address } : null;
}

export function villageAddress(text) {
  const t = text || '';
  const m =
    /po[łl]o[żz]on\w*\s+(?:w|we)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]{2,40}?)\s+nr\s+(\d+[A-Za-z]?)/i.exec(t) ||
    /\bul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(t);
  if (!m) return null;
  const loc = m[1].replace(/\s+/g, ' ').trim();
  if (OFFICE_RE.test(loc)) return null;
  const address = parseAddress(`${loc} ${m[2]}`);
  return address ? { address_raw: `${loc} ${m[2]}`, address } : null;
}


export function landFieldsFromText(text, url) {
  const t = (text || '').replace(/\s+/g, ' ');
  let dzialka_nr = null;
  const nm = /dzia[łl]k[a-ząćęłńóśźż]*\s+nr\s+([\d/]+(?:\s*(?:,|i)\s*(?:nr\s+)?[\d/]+)*)/i.exec(t);
  if (nm) {
    const nums = nm[1].split(/\s*(?:,|i)\s*(?:nr\s+)?/).map((x) => x.trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
    if (nums.length) dzialka_nr = nums.join(', ');
  }
  if (!dzialka_nr && url) {
    const list = /(?:braciszow-)(144_3-i-144_6)|(?:raciborska-)(1382-1383-i-1384)/i.exec(url);
    if (list) dzialka_nr = (list[1] || list[2]).replace(/_/g, '/').replace(/-i-/g, ', ').replace(/-(?=\d)/g, ', ');
  }
  let area_m2 = null;
  const ha = /(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (ha) {
    const v = Number(ha[1].replace(',', '.'));
    if (v > 0) area_m2 = Math.round(v * 10000);
  }
  const m2 = /\(?\s*(\d{2,7})\s*m\s*[²2]\s*\)?/i.exec(t);
  if (area_m2 == null && m2) area_m2 = Number(m2[1]);
  let obreb = null;
  const om = /po[łl]o[żz]on\w*\s+(?:w|we)\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń]+)/i.exec(text || '');
  if (om) obreb = om[1];
  else if (url) {
    const slug = decodeURIComponent((url.split('?')[0].split('/').pop() || ''))
      .replace(/\.(pdf|docx|doc)$/i, '').replace(/^\d+-/, '');
    const first = /^([a-ząćęłńóśźż-]+?)-\d/i.exec(slug);
    if (first) obreb = titleCase(first[1].replace(/-/g, ' '));
  }
  const sm = /\bul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)\b/.exec(text || '');
  const street = sm && !OFFICE_RE.test(sm[1]) ? `${sm[1].replace(/\s+/g, ' ').trim()} ${sm[2]}` : null;
  return { dzialka_nr, obreb, area_m2, street };
}


export function parseAnnouncement(text, sourceUrl) {
  if (!text || !isSaleAnnouncement(text)) return null;
  const t = text.replace(/\r/g, '');
  const kind = /(?:braciszow-144_3-i-144_6|raciborska-1382-1383-i-1384)/i.test(sourceUrl || '') ? 'grunt' : kindFromText(t);
  const round = roundFromText(t);
  const auction_date = announcementDateFromText(t);
  const starting_price_pln = startingPriceAnnouncement(t);

  if (kind === 'grunt') {
    const land = landFieldsFromText(t, sourceUrl);
    if (!land.dzialka_nr && !land.street) return null;
    return {
      kind: 'grunt',
      dzialka_nr: land.dzialka_nr,
      obreb: land.obreb,
      area_m2: land.area_m2,
      address_raw: land.street ? `ul. ${land.street}` : null,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const addr = announcementAddress(t) || villageAddress(t);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaM2(t),
    starting_price_pln,
    auction_date,
    round,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text) || /czynszu\s+dzier[żz]awnego|stawka\s+czynszu/i.test(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceResult(t);
  const achieved = achievedPriceFromText(t);
  const { outcome, unsold_reason } = outcomeFromText(t, achieved);
  const kind = /(?:braciszow-144_3-i-144_6|raciborska-1382-1383-i-1384)/i.test(sourceUrl || '') ? 'grunt' : kindFromText(t);

  if (kind === 'grunt') {
    const land = landFieldsFromText(t, sourceUrl);
    if (!land.dzialka_nr && !land.street) return [];
    if (starting_price_pln == null) notes.push('parse: missing/garbled starting price');
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: land.dzialka_nr,
      obreb: land.obreb,
      area_m2: land.area_m2,
      address_raw: land.street ? `ul. ${land.street}` : null,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? achieved : null,
      outcome,
      unsold_reason,
      notes,
    }];
  }

  const apt = UNIT_NO_RE.exec(t)?.[1] || null;
  const addr = kind === 'zabudowana'
    ? (villageAddress(t) || addressFromFilename(sourceUrl, apt))
    : (addressFromFilename(sourceUrl, apt) || villageAddress(t));
  if (!addr) return [];
  if (addr.address?.warning) notes.push(addr.address.warning);
  if (starting_price_pln == null) notes.push('parse: missing/garbled starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    starting_price_pln,
    final_price_pln: outcome === 'sold' ? achieved : null,
    outcome,
    unsold_reason,
    area_m2: areaM2(t),
    notes,
  }];
}
