import {
  htmlToText,
  priceFromText,
  addressFrom,
  roundFromTitle,
  parsePLN,
} from '../../core/finn-bip.js';

export { classifyKind } from '../../core/classify-kind.js';

export {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  addressFrom,
  roundFromTitle,
  roundFromText,
  shareFromTitle,
  parseAnnouncement,
  parseLandAnnouncement,
} from '../../core/finn-bip.js';


export function isAuctionAnnouncement(title) {
  const t = (title || '').toLowerCase();
  if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni|zamiar\s+sprzeda|^\s*wykaz|za[łl][ąa]cznik/.test(t)) {
    return false;
  }
  if (/^\s*(?:kw\b|ksi[eę]g)/.test(t)) return false;
  if (!/przetarg/.test(t)) return false;
  return /sprzeda/.test(t);
}

export function isFlatAnnouncement(title) {
  const t = (title || '').toLowerCase();
  if (/informacj\w*\s+o\b|wynik\w*\s+(?:z\s+)?\w*\s*przetarg|odwo[łl]ani|uniewa[żz]ni|zamiar\s+sprzeda|^\s*wykaz|za[łl][ąa]cznik/.test(t)) {
    return false;
  }
  if (/^\s*(?:kw\b|ksi[eę]g)/.test(t)) return false;
  if (!/przetarg/.test(t)) return false;
  if (!/sprzeda/.test(t)) return false;
  return /lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/.test(t);
}

export function parseDocLinks(html, origin) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href="(\/res\/serwisy\/pliki\/\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = origin + m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: htmlToText(m[2]) });
  }
  return out;
}


export function isFlatResultNotice(title) {
  const t = (title || '').toLowerCase();
  if (!/informacj\w*\s+o\s+wynik/.test(t)) return false;
  if (/odwo[łl]ani|uniewa[żz]ni/.test(t)) return false;
  return /lokalu\s+mieszkaln|prawa\s+do\s+lokalu\s+mieszkaln/.test(t);
}

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, 'pażdziernika': 10, listopada: 11, grudnia: 12,
};

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const s = String(text || '');
  const nlAt = s.indexOf('\n');
  const title = nlAt >= 0 ? s.slice(0, nlAt) : s;
  const body = nlAt >= 0 ? s.slice(nlAt + 1).replace(/\s+/g, ' ') : '';
  if (!isFlatResultNotice(title)) return [];

  const notes = [];
  const addr = addressFrom(title, body);
  if (!addr) return [];
  const round = roundFromTitle(title);

  let auction_date = null;
  const dn = /w\s+dniu\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(body);
  if (dn) {
    auction_date = `${dn[3]}-${dn[2].padStart(2, '0')}-${dn[1].padStart(2, '0')}`;
  } else {
    const ds = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(body);
    const mon = ds ? (PL_MONTH[ds[2].toLowerCase()] || (/^pa[zżź]dz/.test(ds[2].toLowerCase()) ? 10 : null)) : null;
    if (mon) auction_date = `${ds[3]}-${String(mon).padStart(2, '0')}-${ds[1].padStart(2, '0')}`;
  }
  if (!auction_date) {
    const pr = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r?\W{0,5}przeprowadzono/i.exec(body);
    const mon = pr ? (PL_MONTH[pr[2].toLowerCase()] || (/^pa[zżź]dz/.test(pr[2].toLowerCase()) ? 10 : null)) : null;
    if (mon) {
      auction_date = `${pr[3]}-${String(mon).padStart(2, '0')}-${pr[1].padStart(2, '0')}`;
    } else {
      const pn = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r?\W{0,5}przeprowadzono/i.exec(body);
      if (pn) auction_date = `${pn[3]}-${pn[2].padStart(2, '0')}-${pn[1].padStart(2, '0')}`;
    }
  }
  if (!auction_date && fallbackDate) {
    auction_date = fallbackDate;
    notes.push('date: board publish-date fallback');
  }

  const achievedM =
    /(?:najwy[żz]sz\w+\s+cen|cen[aąęy]\s+osi[ąa]gni[ęe]t|osi[ąa]gni[ęe]t[ao][^0-9]{0,20}cen|cen[aąęy]\s+nabycia|cen[aąęy]\s+sprzeda[żz]y)[^0-9]{0,80}?([\d][\d  .]*(?:,\d{2})?)\s*z[łl]/i.exec(body);
  const negative =
    /negatywn|nie\s+wy[łl]oniono|nikt\s+nie\s+przyst[ąa]pi|brak\s+ofert|nie\s+dosz[łl]o\s+do/i.test(body);

  if (!negative && !achievedM) return [];

  const starting_price_pln = priceFromText(body);
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    starting_price_pln,
    final_price_pln: negative ? null : parsePLN(achievedM[1]),
    outcome: negative ? 'unsold' : 'sold',
    unsold_reason: negative ? 'unknown' : null,
    area_m2: null,
    notes,
  }];
}
