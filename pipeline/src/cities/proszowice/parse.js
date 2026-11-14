
import { parseAddress } from '../../core/normalize.js';
import {
  htmlToText as finnHtmlToText, parsePLN, areaFromText, auctionDateFromText, resolveKind,
} from '../../core/finn-bip.js';

export function htmlToText(html) {
  return finnHtmlToText(html)
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&ndash;/gi, '-')
    .replace(/&sect;/gi, '§')
    .replace(/&[rl]dquo;/gi, '"')
    .replace(/&bdquo;/gi, '"');
}


export function isCancelledTitle(title) {
  return /odwo[łl]ani|uniewa[żz]ni/i.test(title || '');
}

export function isWykazTitle(title) {
  return /^\s*wykaz/i.test(title || '');
}

export function isAnnouncementTitle(title) {
  const t = title || '';
  if (isCancelledTitle(t) || isWykazTitle(t)) return false;
  return /^\s*og[łl]oszenie\b/i.test(t) && /przetarg/i.test(t);
}

export function isResultTitle(title) {
  const t = title || '';
  if (isCancelledTitle(t)) return false;
  return /^\s*informacja\b/i.test(t) && /przetarg/i.test(t);
}


export function isSaleText(text) {
  return /zbyci|zbyci[ae]|zby[ćc]/i.test(text || '');
}

export function isLeaseText(text) {
  return /\bnajem\b|najmu|dzier[żz]aw|wynajem|najemc[ąa]/i.test(text || '');
}


const ORDINAL_PATTERNS = [
  [1, /pierwsz\w*/i], [2, /drug\w*/i], [3, /trzeci\w*/i], [4, /czwart\w*/i],
  [5, /pi[ąa]t(?!ek\b|ku\b)\w*/i], [6, /sz[óo]st\w*/i], [7, /si[óo]dm\w*/i],
  [8, /[óo]sm\w*/i], [9, /dziewi[ąa]t\w*/i],
];

export function roundFromText(text) {
  const t = text || '';
  let best = null;
  let bestIdx = Infinity;
  for (const [n, re] of ORDINAL_PATTERNS) {
    const m = re.exec(t);
    if (m && m.index < bestIdx) { bestIdx = m.index; best = n; }
  }
  if (best) return best;
  return /przetarg/i.test(t) ? 1 : null;
}


export function startingPriceFromText(text) {
  const m = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*[\s\S]{0,160}?(?<!\/)(\d[\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /cena\s+ustalona\s+w\s+przetargu\s*[:\-–]?\s*(?<!\/)(\d[\d.,\s-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


export function isSoldOutcome(text) {
  return /nabywc[ąa]\s+(?:nieruchomo[śs]ci\s+)?(?:zosta[łl]|zostali|zosta[łl]y)|osoba\s+ustalona\s+jako\s+nabywca|wynikiem\s+pozytywnym/i.test(text || '');
}

export function isUnsoldOutcome(text) {
  return /wynikiem\s+negatywnym|nikt\s+nie\s+wp[łl]aci[łl]\s+wadium|nie\s+wp[łl]acono\s+wadium|brak\s+(?:ofert|oferent)|nie\s+wy[łl]oniono/i.test(text || '');
}


const APT_RE = /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?)/i;

const BUILDING_STREET_RE =
  /budynku\w*(?:\s+[a-ząćęłńóśźż]+)?\s+(?:o\s+numerze\s+porz[ąa]dkowym|nr\.?|numer)\s*(\d+[A-Za-z]?)\s+przy\s+(?:ul\.|ulicy)?\s*([A-ZŻŹĆŁŚĄĘÓŃ0-9][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ0-9.\- ]+?)(?=\s+w\s+[A-ZŻŹĆŁŚ]|\s+wraz|\s+o\s+pow|[,.;]|$)/i;

export function addressFrom(title, text) {
  const src = `${title} ${text}`;
  const apt = APT_RE.exec(src)?.[1] || null;
  const b = BUILDING_STREET_RE.exec(src);
  if (!b) return null;
  const building = b[1].toUpperCase();
  const street = b[2].replace(/\s+/g, ' ').trim();
  const raw = `${street} ${building}${apt ? '/' + apt : ''}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}


export function parcelFromText(text) {
  const t = text || '';
  const m =
    /dzia[łl][ekią]*\s+(?:o\s+)?numer(?:ze)?\s+ewidencyjn\w*\s+([\d]+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*(?:nr\.?\s*)?\d+(?:\/\d+)?)*)/i.exec(t) ||
    /dzia[łl][ekią]*\s+(?:o\s+)?(?:nr\.?|numer\w*)\s+(?:ewid\.?\w*\s+)?([\d]+(?:\/\d+)?(?:\s*(?:,|i|oraz)\s*(?:nr\.?\s*)?\d+(?:\/\d+)?)*)/i.exec(t);
  if (!m) return null;
  const nums = m[1].split(/\s*(?:,|i|oraz)\s*/).map((x) => x.replace(/^nr\.?\s*/i, '').trim()).filter((x) => /^\d+(?:\/\d+)?$/.test(x));
  return nums.length ? nums.join(', ') : null;
}

export function plotAreaFromText(text) {
  const m = /o\s+(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(text || '');
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return v > 0 ? Math.round(v * 10000) : null;
}

export function locationFromText(text) {
  const m = /po[łl]o[żz]on\w*\s+w\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-ząćęłńóśźż]+)/.exec(text || '');
  return m ? m[1] : null;
}

export function villageBuildingFromText(text) {
  const m = /budynkiem\s+o\s+numerze\s+porz[ąa]dkowym\s+(?:([A-ZŻŹĆŁŚĄĘÓŃ][a-ząćęłńóśźż]+)\s+)?(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? { village: m[1] || null, bldg: m[2].toUpperCase() } : null;
}

function landAddress(text) {
  const location = locationFromText(text);
  const vb = villageBuildingFromText(text);
  if (vb) {
    const village = vb.village || location;
    if (village) {
      const raw = `${village} ${vb.bldg}`;
      const address = parseAddress(raw);
      if (address) return { address_raw: raw, address };
    }
  }
  return location ? { address_raw: location, address: null } : { address_raw: null, address: null };
}


export function parseAnnouncement(title, contentHtml, url) {
  const text = htmlToText(contentHtml);
  const full = `${title} ${text}`;
  if (isLeaseText(full) || !isSaleText(full)) return null;

  const kind = resolveKind(title, text);
  const round = roundFromText(full);
  const auction_date = auctionDateFromText(full);
  const starting_price_pln = startingPriceFromText(full);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(full);
    const { address_raw, address } = landAddress(full);
    if (!dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt', dzialka_nr, obreb: null, area_m2: plotAreaFromText(full),
      address_raw, address, starting_price_pln, auction_date, round,
      detail_url: url, source_url: url,
    };
  }

  const addr = addressFrom(title, text);
  if (!addr) return null;
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, area_m2: areaFromText(full),
    starting_price_pln, auction_date, round, detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = htmlToText(text);
  if (isLeaseText(t)) return [];
  if (!/przetarg/i.test(t)) return [];

  const notes = [];
  const auction_date = auctionDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const soldSignal = isSoldOutcome(t);
  const unsoldSignal = isUnsoldOutcome(t);
  const sold = soldSignal && !unsoldSignal;
  if (!soldSignal && !unsoldSignal) notes.push('parse: outcome not explicitly stated (assumed unsold)');
  if (sold && achieved == null) notes.push('parse: achieved price not stated; using cena wywoławcza (no postąpienie recorded)');
  const final_price_pln = sold ? (achieved ?? starting_price_pln) : null;

  const titleGuess = t.split(/\.\s/)[0] || '';
  const kind = resolveKind(titleGuess, t);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(t);
    const { address_raw, address } = landAddress(t);
    if (!dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    return [{
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb: null,
      area_m2: plotAreaFromText(t), address_raw, address, round,
      starting_price_pln, final_price_pln,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    }];
  }

  const addr = addressFrom('', t);
  if (!addr) return [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  return [{
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw, address: addr.address, round,
    starting_price_pln, final_price_pln,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: areaFromText(t), notes,
  }];
}
