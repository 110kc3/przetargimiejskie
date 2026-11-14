
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (numStr == null) return null;
  const m = /(\d[\d.  ]*(?:,\d{2}|[.,]-)?)/.exec(String(numStr));
  if (!m) return null;
  const cleaned = m[1]
    .replace(/[\s. ]/g, '')
    .replace(/,\d{2}$/, '')
    .replace(/,?-$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaRow(html, label) {
  const re = new RegExp(`${label}<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i');
  const m = re.exec(html);
  return m ? stripHtml(m[1]) : null;
}

export function parseMetaTable(html) {
  const h = String(html || '');
  const title = metaRow(h, 'Adres nieruchomości');
  const rodzaj = metaRow(h, 'Rodzaj nieruchomości');
  const cena = metaRow(h, 'Cena wywoławcza');
  const dm = /Data przetargu[\s\S]*?datetime="([^"]+)"/i.exec(h);
  const auction_date = dm ? dm[1].slice(0, 10) : null;
  return { title, rodzaj, cena, auction_date };
}

export function parseAttachments(html) {
  const out = [];
  const re = /href="([^"]*attachments\/download\/(\d+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html || ''))) !== null) {
    out.push({ url: m[1], id: m[2], label: stripHtml(m[3]) });
  }
  return out;
}

export function isResultAttachment(label) {
  return /wynik/i.test(label || '');
}

export function isAnnouncementAttachment(label) {
  return /og[łl]oszeni/i.test(label || '');
}


const ROUND_WORDS = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, piat: 5, 'piąt': 5 };

export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t)\w*\s+przetarg/i.exec(text || '');
  if (!m) return null;
  return ROUND_WORDS[m[1].toLowerCase()] ?? null;
}

const STREET_RE =
  /przy\s+ul\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.\- ]+?)\s+(\d+[A-Za-z]?)\b/i;

export function streetBuildingFromText(text) {
  const m = STREET_RE.exec(String(text || '').replace(/\s+/g, ' '));
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] };
}

const UNIT_RE = /oznaczon\w*\s+(?:nr\.?|numerem)\s+(\d{1,3}[a-z]?)(?!\s*geodez)(?!\/)/i;

export function unitFromText(text) {
  const m = UNIT_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? m[1] : null;
}

const UNIT_AREA_RE =
  /oznaczon\w*\s+(?:nr\.?|numerem)\s+\d{1,3}[a-z]?\s+o\s+(?:pow\.?|powierzchni)\s+u[żz]ytkow\w*\s+([\d  ]{1,7}[.,]\d{2})\s*m/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? parseArea(m[1]) : null;
}

const STARTING_RE =
  /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s+wynios[łl]a\s+([\d  .]+,\d{2})/i;

export function startingPriceFromText(text) {
  const m = STARTING_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? parsePLN(m[1]) : null;
}

const ACHIEVED_RE =
  /najwy[żz]sza\s+cena\s+nieruchomo[śs]ci\s+wynios[łl]a\s+([\d  .]+,\d{2})/i;

export function achievedPriceFromText(text) {
  const m = ACHIEVED_RE.exec(String(text || '').replace(/\s+/g, ' '));
  return m ? parsePLN(m[1]) : null;
}

const RESULT_DATE_RE =
  /W\s*d\w{0,2}niu\s+(\d{1,2})\s+([a-ząęółśżźćń]+)\s+(\d{4})/i;

export function resultDateFromText(text) {
  const m = RESULT_DATE_RE.exec(text || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function isResultNotice(text) {
  return /informuje\s+o\s+wyniku/i.test(text || '');
}


export function titleToAddressRaw(title) {
  if (!title) return null;
  let s = String(title).replace(/\s+/g, ' ').trim();
  s = s.replace(/^Ostro[łl][ęe]ka\s*,?\s*/i, '');
  s = s.replace(/\bulica\b/i, 'ul.');
  if (!/\bul\.|\bal\.|\bpl\.|\bos\./i.test(s)) return null;
  return s.trim();
}

export function buildActiveListing(meta, ctx = {}) {
  if (!meta) return null;
  const raw = titleToAddressRaw(meta.title);
  if (!raw) return null;
  const address = parseAddress(raw);
  if (!address) return null;
  const rodzajKind = classifyKind(meta.rodzaj || '');
  const kind = rodzajKind === 'unknown' ? 'mieszkalny' : rodzajKind;
  const roundSrc = `${ctx.label || ''} ${(ctx.ocrText || '').slice(0, 300)}`;
  return {
    kind,
    address_raw: raw,
    address,
    area_m2: unitAreaFromText(ctx.ocrText || ''),
    starting_price_pln: parsePLN(meta.cena),
    auction_date: meta.auction_date,
    round: roundFromText(roundSrc),
    detail_url: ctx.detailUrl || null,
  };
}


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  const t = String(text).replace(/\r/g, '');
  const notes = [];

  const sb = streetBuildingFromText(t);
  if (!sb) {
    notes.push('parse: no street/building in result body');
    return [];
  }
  const unit = unitFromText(t);
  const address_raw = unit
    ? `ul. ${sb.street} ${sb.building}/${unit}`
    : `ul. ${sb.street} ${sb.building}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const area_m2 = unitAreaFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);

  const sold = achieved != null;
  let unsold_reason = null;
  if (!sold) {
    if (/nikt\s+nie\s+wp[łl]aci[łl]\s+wadium/i.test(t)) unsold_reason = 'brak wadium';
    else if (/nie\s+ustalono\s+nabywc/i.test(t)) unsold_reason = 'nie ustalono nabywcy';
    else unsold_reason = 'unknown';
  }

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (area_m2 == null) notes.push('parse: missing usable area');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: 'mieszkalny',
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason,
      area_m2,
      notes,
    },
  ];
}
