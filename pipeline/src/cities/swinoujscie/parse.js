
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/\bnajem\b|dzier[zż]aw|wynaj[eę]/i.test(s)) return true;
  if (/odwo[łl]ani|uniewa[zż]ni|zawiadomieni.*odwo[łl]/i.test(s)) return true;
  if (/zam[oó]wieni.*publiczn/i.test(s)) return true;
  if (/najem.*gara[zż]|najem.*postoj/i.test(s)) return true;
  return false;
}

export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (!/przetarg/i.test(s)) return false;
  if (!/sprzeda[zż]|zbyci/i.test(s)) return false;
  return true;
}


export function roundFromTitle(title) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm)\w*\s*[,.]?\s*/i.exec(title || '');
  if (!m) return null;
  const rest = (title || '').slice(m.index + m[0].length);
  if (!/^\s*(?:nieograniczon\w+\s+)?(?:ustn\w+\s+)?przetarg/i.test(rest)) return null;
  const w = m[1].toLowerCase();
  if (/^pierwsz/.test(w)) return 1;
  if (/^drug/.test(w)) return 2;
  if (/^trzeci/.test(w)) return 3;
  if (/^czwart/.test(w)) return 4;
  if (/^pi[aą]t/.test(w)) return 5;
  if (/^sz[oó]st/.test(w)) return 6;
  if (/^si[oó]dm/.test(w)) return 7;
  if (/^[oó]sm/.test(w)) return 8;
  return null;
}


export function areaFromTitle(title) {
  const m = /(?:powierzchni\w*|pow\.)\s+([\d,]+)\s*m[²2]/i.exec(title || '');
  return m ? parseArea(m[1]) : null;
}


export function auctionDateFromBlurb(text) {
  if (!text) return null;
  const numM = /odb[ęe]dzie\s+si[ęe]\s+dnia\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(text);
  if (numM) {
    return `${numM[3]}-${numM[2].padStart(2, '0')}-${numM[1].padStart(2, '0')}`;
  }
  const wordM = /odb[ęe]dzie\s+si[ęe]\s+dnia\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text);
  if (wordM) {
    const mo = PL_MONTH[wordM[2].toLowerCase()];
    if (!mo) return null;
    return `${wordM[3]}-${String(mo).padStart(2, '0')}-${wordM[1].padStart(2, '0')}`;
  }
  return null;
}


export function addressRawFromTitle(title) {
  if (!title) return null;
  const t = title.replace(/\n/g, ' ');

  const m = /przy\s+ul\.\s+(.+?\s+(\d+(?:-\d+)?[A-Za-z]?(?:\/\d+[A-Za-z]?)?))(?=\s+w\s|\s*,|\s*$)/i.exec(t);
  if (m) {
    const full = m[1].replace(/\s+/g, ' ').trim();
    const numPart = m[2];

    const unitM = /lokal\w*\s+(?:mieszkaln\w+|u[zż]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i.exec(t);
    if (unitM && !numPart.includes('/')) {
      return `ul. ${full}/${unitM[1]}`;
    }
    return `ul. ${full}`;
  }

  const plM = /przy\s+Plac[uo]?\s+(.+?\s+(\d+[A-Za-z]?))(?=\s+w\s|\s*,|\s*$)/i.exec(t);
  if (plM) {
    return `Plac ${plM[1].replace(/\s+/g, ' ').trim()}`;
  }

  return null;
}


export function startingPriceFromDoc(text) {
  const m = /cena\s+wywo[łl]awcz[ay]\s*[:\-–]?\s*(\d[\d\s .,]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


export function kindFromTitle(title) {
  const t = (title || '');
  const k = classifyKind(t);
  return k === 'unknown' ? 'mieszkalny' : k;
}


export function parseArticle(art) {
  const { title = '', blurb = '', detail_url = '' } = art || {};
  if (!title) return null;

  const kind = kindFromTitle(title);
  const round = roundFromTitle(title);
  const area_m2 = areaFromTitle(title);
  const auction_date = auctionDateFromBlurb(blurb);
  const address_raw = addressRawFromTitle(title);
  if (!address_raw) return null;

  const address = parseAddress(address_raw);
  if (!address) return null;

  return {
    kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln: null, // enriched from DOC when available
    auction_date,
    round,
    detail_url,
  };
}


export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  return [];
}
