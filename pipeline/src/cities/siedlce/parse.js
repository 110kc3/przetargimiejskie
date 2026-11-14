
import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText, areaFromText, priceFromText, roundFromText,
  addressFrom as finnAddressFrom, resolveKind, parseLandAnnouncement, isSaleAuction,
  auctionDateFromText as finnAuctionDateFromText,
} from '../../core/finn-bip.js';

export { htmlToText };

const APT_RE = /oznaczon\w*\s+(?:nr\.?|numer\w*)\s*(\d+[A-Za-z]?)/i;

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const ROMAN_RE_SRC = '(VIII|VII|VI|IX|IV|V|X|I{1,3})';

function explicitRoundFromTitle(title) {
  const t = title || '';
  if (/pierwsz/i.test(t)) return 1;
  if (/drug/i.test(t)) return 2;
  if (/trzeci/i.test(t)) return 3;
  if (/czwart/i.test(t)) return 4;
  const r = new RegExp(`\\b${ROMAN_RE_SRC}\\s+(?:[Uu]stnym\\s+|USTNYM\\s+)?(?:[Pp]rzetarg|PRZETARG)`).exec(t);
  return r ? ROMAN[r[1]] ?? null : null;
}

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, września: 9, pazdziernika: 10,
  października: 10, listopada: 11, grudnia: 12,
};

export function isAnnouncementTitle(title) {
  return isSaleAuction(title);
}

export function isResultTitle(title) {
  return /informacj\w*\s+o\s+wynik|^\s*wynik\w*\s+\w*\s*przetarg/i.test(title || '');
}

function addressFrom(title, text) {
  const base = finnAddressFrom(title, text);
  if (!base) return null;
  if (base.address?.apt) return base;
  const m = APT_RE.exec(`${title} ${text}`);
  if (!m) return base;
  const raw = `${base.address.street} ${base.address.building}/${m[1]}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : base;
}

export function auctionDateFromText(text) {
  const t = text || '';
  const spelled =
    /odb[ęe]dzie\s+si[ęe][\s\S]{0,200}?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (spelled) {
    const mon = PL_MONTHS[spelled[2].toLowerCase()];
    if (mon) return `${spelled[3]}-${String(mon).padStart(2, '0')}-${spelled[1].padStart(2, '0')}`;
  }
  const numeric =
    /odb[ęe]dzie\s+si[ęe][\s\S]{0,200}?w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;
  return finnAuctionDateFromText(t);
}

export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  const kind = resolveKind(title, text);

  if (kind === 'grunt') {
    return parseLandAnnouncement(title, contentHtml, url);
  }

  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(text),
    starting_price_pln: priceFromText(text),
    round: explicitRoundFromTitle(title) ?? roundFromText(text) ?? 1,
    auction_date: auctionDateFromText(text),
    detail_url: url,
    source_url: url,
  };
}

export function parseResultDoc(_text, _date, _url) {
  return [];
}
