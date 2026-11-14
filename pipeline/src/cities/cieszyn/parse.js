
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePLN(s) {
  if (!s) return null;
  const stripped = String(s)
    .replace(/\s*z[lł]otych(?=\s|$).*/i, '')
    .replace(/\s*z[lł](?=\s|$).*/i, '')
    .trim();
  const cleaned = stripped.replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4,
  'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
};
const ROUND_ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

export function roundFromText(text) {
  const t = text || '';
  const rm = /\b(I{1,3}|IV|V|VI?)\s+(?:ustny\s+)?przetarg/i.exec(t);
  if (rm) {
    const roman = rm[1].toUpperCase();
    if (Object.prototype.hasOwnProperty.call(ROUND_ROMAN, roman)) return ROUND_ROMAN[roman];
  }
  const wm = /\b(pierwsz|drug|trzeci|czwart|pi[aą]t|sz[oó]st)\w*\s+przetarg/i.exec(t);
  if (!wm) return null;
  const stem = wm[1].toLowerCase()
    .replace('ą', 'a')
    .replace('ó', 'o');
  return ROUND_WORDS[stem] ?? null;
}


export function auctionDateFromText(text) {
  const t = text || '';
  const dtm = /datetime="(\d{4}-\d{2}-\d{2})T/.exec(t);
  if (dtm) return dtm[1];
  const numm = /odb[eę]dzie\s+si[eę]\s+(?:w\s+dniu\s+|dnia\s+)(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (numm) return `${numm[3]}-${numm[2].padStart(2, '0')}-${numm[1].padStart(2, '0')}`;
  const mm = /odb[eę]dzie\s+si[eę]\s+(?:w\s+dniu\s+|dnia\s+)?(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (!mm) return null;
  const mo = PL_MONTH[mm[2].toLowerCase()];
  if (!mo) return null;
  return `${mm[3]}-${String(mo).padStart(2, '0')}-${mm[1].padStart(2, '0')}`;
}


export function resultDateFromText(text) {
  const t = text || '';
  const mm = /W\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})\s*r\./i.exec(t);
  if (mm) {
    const mo = PL_MONTH[mm[2].toLowerCase()];
    if (mo) return `${mm[3]}-${String(mo).padStart(2, '0')}-${mm[1].padStart(2, '0')}`;
  }
  const nm = /W\s+dniu\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (nm) return `${nm[3]}-${nm[2].padStart(2, '0')}-${nm[1].padStart(2, '0')}`;
  const km = /kt[oó]ry\s+odby[lł]\s+si[eę]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(t);
  if (km) {
    const mo = PL_MONTH[km[2].toLowerCase()];
    if (mo) return `${km[3]}-${String(mo).padStart(2, '0')}-${km[1].padStart(2, '0')}`;
  }
  return null;
}


export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[lł]awcza\s+nieruchomo[sś]ci\s+wynosi\s+([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /wynosi\s+([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /cena\s+wywo[lł]awcza\s*[:–\-]\s*([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  return null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  let m = /[Nn]ajwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta\s+w\s+przetargu\s+wynios[lł]a\s+([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  m = /cena\s+osi[aą]gni[eę]ta\s+w\s+przetargu\s*[:–\-]?\s*([\d\s .,]+?)\s*z[lł]/i.exec(t);
  if (m) return parsePLN(m[1]);
  return null;
}


export function unitAreaFromText(text) {
  const t = text || '';
  const m = /o\s+(?:pow\.|powierzchni)\s+u[zż]ytkow\w*\s+([\d,.]+)\s*m2/i.exec(t);
  return m ? parseArea(m[1]) : null;
}


export function addressFromBody(text) {
  const t = (text || '').replace(/\s+/g, ' ');
  const aptM = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const apt = aptM ? aptM[1] : null;
  const bldgM = /budynku\s+(?:\w+\s+)*?nr\s+(\d+[A-Za-z]?)/i.exec(t);
  const bldg = bldgM ? bldgM[1] : null;
  const streetM = /przy\s+ul\.\s+([\wÀ-ɏ''.'\- ]+?)(?=\s+(?:w\s+[A-ZÀ-ɏ]|na\s+parterze|na\s+[IVX]|w\s+budynku|\d|$))/i.exec(t);
  if (!streetM || !bldg) return null;
  const street = streetM[1].replace(/\s+$/, '').replace(/,\s*$/, '').trim();
  if (!street) return null;
  const raw = apt ? `ul. ${street} ${bldg}/${apt}` : `ul. ${street} ${bldg}`;
  const address = parseAddress(raw);
  if (!address) return null;
  return { address_raw: raw, address };
}


export function isResultNotice(text) {
  const t = text || '';
  return (
    /INFORMACJA\s+o\s+wynik/i.test(t) ||
    /[Nn]ajwy[zż]sza\s+cena\s+osi[aą]gni[eę]ta/i.test(t) ||
    /[Oo]si[aą]gni[eę]ta\s+(?:cena|w\s+przetargu)/i.test(t)
  );
}


export function parseIndexPage(html) {
  const out = [];
  const blockRe = /<table[^>]+class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = blockRe.exec(html || '')) !== null) {
    const block = m[1];
    if (!/Adres\s+nieruchomo/i.test(block) && !/th[^>]*>Adres/i.test(block)) continue;

    const rows = {};
    const rowRe = /<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    let r;
    while ((r = rowRe.exec(block)) !== null) {
      const label = stripTags(r[1]).toLowerCase().trim();
      rows[label] = r[2];
    }

    const addrHtml = rows['adres nieruchomości'] || '';
    const linkM = /href="(https?:\/\/bip\.um\.cieszyn\.pl\/przetarg-nieruchomosci\/[^"]+)"/i.exec(addrHtml);
    if (!linkM) continue;
    const detail_url = linkM[1];
    const address_raw = stripTags(addrHtml);

    const rodzaj = stripTags(rows['rodzaj nieruchomości'] || '').toLowerCase();
    const typ = stripTags(rows['typ przetargu'] || '').toLowerCase();

    const priceRaw = stripTags(rows['cena wywoławcza'] || '');
    const starting_price_pln = parsePLN(priceRaw);

    const timeM = /datetime="(\d{4}-\d{2}-\d{2})T/.exec(rows['data przetargu'] || '');
    const auction_date = timeM ? timeM[1] : null;

    out.push({ detail_url, address_raw, rodzaj, typ, starting_price_pln, auction_date });
  }
  return out;
}


export function parseDetailPage(html, detailUrl) {
  if (!html) return null;

  const tableM = /<table[^>]+class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(html);
  const tableBlock = tableM ? tableM[1] : '';

  const rows = {};
  const rowRe = /<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
  let r;
  while ((r = rowRe.exec(tableBlock)) !== null) {
    const label = stripTags(r[1]).toLowerCase().trim();
    rows[label] = r[2];
  }

  const rodzaj = stripTags(rows['rodzaj nieruchomości'] || '').toLowerCase();
  if (rodzaj && !/lokal\s+mieszkaln/i.test(rodzaj)) return null;

  const timeM = /datetime="(\d{4}-\d{2}-\d{2})T/.exec(rows['data przetargu'] || '');
  const tableDate = timeM ? timeM[1] : null;

  const tablePriceRaw = stripTags(rows['cena wywoławcza'] || '');
  const tablePrice = parsePLN(tablePriceRaw);

  const przetargNa = stripTags(rows['przetarg na'] || '');
  const roundFromTitle = roundFromText(przetargNa);

  let wynik_url = null;
  const wynikLinkM = /href="(https?:\/\/bip\.um\.cieszyn\.pl\/artykul\/21\/[^"]+)"/i.exec(html);
  if (wynikLinkM) wynik_url = wynikLinkM[1];

  const wsM = /class="wysiwyg"[^>]*>([\s\S]{0,8000})/i.exec(html);
  const bodyText = wsM ? stripTags(wsM[1]) : '';

  const area_m2 = unitAreaFromText(bodyText);

  const addrResult = addressFromBody(bodyText);
  if (!addrResult || !addrResult.address) return null;

  const starting_price_pln = tablePrice ?? startingPriceFromText(bodyText);
  const auction_date = tableDate ?? auctionDateFromText(bodyText);
  const round = roundFromTitle ?? roundFromText(bodyText);

  const kindText = bodyText.slice(0, 300);
  const kind = classifyKind(kindText) === 'unknown' ? 'mieszkalny' : classifyKind(kindText);

  return {
    kind: 'announcement',
    listing: {
      kind,
      address_raw: addrResult.address_raw,
      address: addrResult.address,
      area_m2,
      starting_price_pln,
      auction_date,
      round,
      detail_url: detailUrl || null,
      wynik_url,
    },
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = (text || '').replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;

  const negativeStated =
    /przetarg\s+zako[nń]czy[lł]\s+si[eę]\s+wynikiem\s+negatywnym/i.test(t) ||
    /brak\s+uczestnik/i.test(t) ||
    /nie\s+wy[lł]oniono\s+nabywcy/i.test(t);

  const addrResult = addressFromBody(t);
  if (!addrResult || !addrResult.address) return [];
  const { address_raw, address } = addrResult;
  if (address.warning) notes.push(address.warning);

  const area_m2 = unitAreaFromText(t);
  const kind = 'mieszkalny';

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return [
    {
      auction_date,
      source_pdf: sourceUrl || null,
      kind,
      address_raw,
      address,
      round,
      area_m2,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      notes,
    },
  ];
}
