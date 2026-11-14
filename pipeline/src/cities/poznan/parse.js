
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  roundFromText,
} from '../../core/finn-bip.js';

export { htmlToText };

export function isAuctionAnnouncement(text) {
  return /og[łl]asza[\s\S]{0,80}?przetarg[\s\S]{0,120}?sprzeda/i.test(text || '');
}

export function normalizePrice(text) {
  return (text || '').replace(/,\s*[–−-]\s*z[łl]/gi, ',00 zł');
}

export function priceFromNotice(text) {
  return priceFromText(normalizePrice(text));
}

const LAND_SEG_RE =
  /obr[ęe]b\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z-]*)\s+arkusz\s+(\d+)\s+dzia[łl]ka\s+(\d+\/\d+)[^)]*\)\s*pow\.\s*([\d\s]+)\s*m\s*2/gi;

export function landSegmentsFromText(text) {
  const t = text || '';
  const out = [];
  let m;
  const re = new RegExp(LAND_SEG_RE.source, LAND_SEG_RE.flags);
  while ((m = re.exec(t)) !== null) {
    out.push({
      obreb: m[1],
      arkusz: m[2],
      dzialka: m[3],
      area_m2: Number(m[4].replace(/\s/g, '')) || null,
    });
  }
  return out;
}

export function totalAreaFromText(text) {
  const m = /powierzchnia\s+[łl][ąa]czna:?\s*([\d\s]+)\s*m\s*2/i.exec(text || '');
  return m ? Number(m[1].replace(/\s/g, '')) || null : null;
}

export function landAreaDescFromText(text) {
  const m = /rejon\s+ulic?y?:?\s*([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z .\-]+?)(?=\s+obr[ęe]b|\s+dzia[łl]k|$)/i.exec(text || '');
  if (!m) return null;
  return m[1].replace(/\s+i\s+ul\b.*$/i, '').trim() || null;
}

const FLAT_ADDR_RE =
  /ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z .\-]+?)\s+(\d+[A-Za-z]?)\s+lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;
const GENERIC_ADDR_RE = /ul\.\s+([A-ZŻŹĆŁŚĄĘÓŃ][\wżźćłśąęóńA-Z .\-]+?)\s+(\d+[A-Za-z]?)\b/i;

export function builtAddressFromText(text) {
  const t = text || '';
  const flat = FLAT_ADDR_RE.exec(t);
  if (flat) {
    const street = flat[1].replace(/\s+/g, ' ').trim();
    const raw = `ul. ${street} ${flat[2]}/${flat[3]}`;
    const address = parseAddress(raw);
    return address ? { address_raw: raw, address } : null;
  }
  const generic = GENERIC_ADDR_RE.exec(t);
  if (generic) {
    const street = generic[1].replace(/\s+/g, ' ').trim();
    const raw = `ul. ${street} ${generic[2]}`;
    const address = parseAddress(raw);
    return address ? { address_raw: raw, address } : null;
  }
  return null;
}

export function parseAnnouncementNotice(teaserText, pdfText = '', opts = {}) {
  const teaser = teaserText || '';
  if (!isAuctionAnnouncement(teaser)) return null;
  const combined = `${teaser}\n${pdfText || ''}`;
  const kind = classifyKind(combined);
  const round = roundFromText(teaser) ?? roundFromText(combined);
  const auction_date = auctionDateFromText(teaser) ?? auctionDateFromText(combined);
  const starting_price_pln = priceFromNotice(combined);
  const { url = null, detailUrl = null } = opts;

  if (kind === 'grunt') {
    const segs = landSegmentsFromText(teaser);
    if (!segs.length) return null;
    const dzialka_nr = segs.map((s) => s.dzialka).join(', ');
    const obreb = segs[0].obreb;
    const area_m2 = totalAreaFromText(teaser) ?? (segs.reduce((sum, s) => sum + (s.area_m2 || 0), 0) || null);
    const streetDesc = landAreaDescFromText(teaser);
    return {
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw: streetDesc ? `ul. ${streetDesc}` : null,
      round,
      starting_price_pln,
      auction_date,
      detail_url: detailUrl || url,
      source_url: detailUrl || url,
    };
  }

  const addr = builtAddressFromText(teaser);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: areaFromText(combined),
    round,
    starting_price_pln,
    auction_date,
    detail_url: detailUrl || url,
    source_url: detailUrl || url,
  };
}


export function resultDateFromText(text) {
  const m = /przeprowadzon\w*\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r\.?/i.exec(text || '');
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return auctionDateFromText(text || '');
}

export function achievedPriceFromText(text) {
  const m = /zosta[łl]a?\s+ustalona\s+na\s+kwot[ęe]\s+([\d][\d.,\s-]*?)\s*z[łl]/i.exec(normalizePrice(text || ''));
  return m ? priceFromText(`cena wywoławcza ${m[0]}`) : null;
}

export function isNegativeOutcome(text) {
  return /wynikiem\s+negatywnym|nie\s+(?:odnotowano|wp[łl]aci[łl]\w*)\s+wadium|nie\s+przyst[ąa]pi[łl]\w*\s+do\s+przetargu/i.test(text || '');
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text || '');
  if (!/wynik\w*\s+przetarg|o\s+wynik/i.test(t)) return [];
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const kind = classifyKind(t);
  const negative = isNegativeOutcome(t);
  const final_price_pln = negative ? null : achievedPriceFromText(t);
  const outcome = final_price_pln != null ? 'sold' : negative ? 'unsold' : 'unknown';

  let base;
  if (kind === 'grunt') {
    const segs = landSegmentsFromText(t);
    if (!segs.length) return [];
    base = {
      kind: 'grunt',
      dzialka_nr: segs.map((s) => s.dzialka).join(', '),
      obreb: segs[0].obreb,
      area_m2: totalAreaFromText(t) ?? (segs.reduce((sum, s) => sum + (s.area_m2 || 0), 0) || null),
      address_raw: (() => {
        const d = landAreaDescFromText(t);
        return d ? `ul. ${d}` : null;
      })(),
    };
  } else {
    const addr = builtAddressFromText(t);
    if (!addr) return [];
    base = {
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addr.address_raw,
      address: addr.address,
      area_m2: areaFromText(t),
    };
  }

  return [{
    auction_date,
    source_pdf: sourceUrl || null,
    ...base,
    final_price_pln,
    outcome,
    unsold_reason: negative ? 'wynikiem negatywnym' : null,
    notes: [],
  }];
}
