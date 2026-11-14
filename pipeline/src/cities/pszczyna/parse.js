import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';
import {
  htmlToText, parsePLN, priceFromText, auctionDateFromText, roundFromTitle, resolveKind,
} from '../../core/finn-bip.js';

export { htmlToText };

const ORIGIN = 'https://bip.pszczyna.pl';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

function fixMalformedGrosze(text) {
  return (text || '').replace(/(,\d{2})-(?=\s|[,.]|$)/g, '$1');
}


export function isResultTitle(title) {
  return /informacj[\węi]*\s+o\s+wynik|^\s*wynik(?:i)?\s+\w*\s*przetarg/i.test(title || '');
}

export function isLeaseTitle(title) {
  const t = (title || '').toLowerCase();
  return /wydzier[żz]awi|dzier[żz]aw|\bnajem\b|najmu|wynajem|u[żz]yczeni/.test(t);
}

export function isAnnouncementTitle(title) {
  const t = (title || '').toLowerCase();
  if (isResultTitle(t)) return false;
  if (isLeaseTitle(t)) return false;
  if (/bezprzetarg/.test(t)) return false;
  if (/\bwykaz|zamiar\s+sprzeda|odwo[łl]ani|uniewa[żz]ni/.test(t)) return false;
  return /przetarg/.test(t) && /sprzeda/.test(t);
}


const H2_RE = /<h2[^>]*>([\s\S]*?)<\/h2>/i;
const CONTENT_RE = /<article\s+class="content">([\s\S]*?)<\/article>/i;
const ATTACH_RE =
  /<a\s+aria-label="Pobierz\s+za[łl][ąa]cznik:\s*([^"]*?)\s+w\s+formacie\s+(\w+)[^"]*"\s+href="([^"]+)"/gi;

export function extractDetail(html) {
  const cntIdx = (html || '').indexOf('id="cnt"');
  if (cntIdx < 0) return null;
  const region = html.slice(cntIdx);

  const h2 = H2_RE.exec(region);
  const title = h2 ? htmlToText(h2[1]) : '';

  const contentM = CONTENT_RE.exec(region);
  const contentHtml = contentM ? contentM[1] : '';
  const contentText = contentHtml ? htmlToText(contentHtml) : '';

  const attachments = [];
  const filesIdx = region.indexOf('Pliki do pobrania');
  const attachRegion = filesIdx >= 0 ? region.slice(filesIdx, filesIdx + 8000) : '';
  let am;
  ATTACH_RE.lastIndex = 0;
  while ((am = ATTACH_RE.exec(attachRegion)) !== null) {
    const url = am[3].startsWith('http') ? am[3] : `${ORIGIN}${am[3].startsWith('/') ? '' : '/'}${am[3]}`;
    attachments.push({ name: am[1].trim(), format: am[2].toLowerCase(), url });
  }

  return { title, contentHtml, contentText, attachments };
}


export function resultTableFromHtml(contentHtml) {
  const tableM = /<table[^>]*>([\s\S]*?)<\/table>/i.exec(contentHtml || '');
  if (!tableM) return null;
  const rows = [...tableM[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (!rows.length) return null;
  const dataRow = rows[rows.length - 1][1];
  const cells = [...dataRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlToText(m[1]));
  if (cells.length < 5) return null;
  const [dopuszczona, niedopuszczona, wywolawcza, osiagnieta, nabywca] = cells;
  return {
    dopuszczona: Number(dopuszczona) || 0,
    niedopuszczona: Number(niedopuszczona) || 0,
    starting_price_pln: parsePLN(fixMalformedGrosze(wywolawcza)),
    final_price_pln: parsePLN(fixMalformedGrosze(osiagnieta)),
    buyer: nabywca && nabywca.trim() ? nabywca.trim() : null,
  };
}

export function isNegativeOutcome(text) {
  return /wynik\w*\s+negatywn\w*|zako[ńn]czy[łl]\s+si[ęe]\s+negatywnie|brak\s+(?:ofert|oferent|uczestnik|ch[ęe]tnych)|nikt\s+nie\s+przyst[ąa]pi[łl]|nie\s+wp[łl]aci[łl]a?o?\s+wadium/i.test(
    text || '',
  );
}

export function resultDateFromText(text) {
  const t = text || '';
  const m = /wyznaczon\w*\s+na\s+dzie[ńn]\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return auctionDateFromText(t);
}


export function flatIdFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\.?\s*(\d+(?:\/\d+)?)/i.exec(text || '');
  return m ? m[1] : null;
}

const RYNEK_RE = /^rynku$/i;

export function flatAddressFromText(title, text) {
  const src = `${title} ${text}`;
  const flatId = flatIdFromText(src);
  if (!flatId) return null;

  const STREET_RE =
    /przy\s+(?:ul\.?\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+(?:\s*[\-–]\s*\d+)*)/g;
  let m;
  let street = null;
  let streetNr = null;
  while ((m = STREET_RE.exec(src)) !== null) {
    const candStreet = m[1].replace(/\s+/g, ' ').trim();
    const candNr = m[2].replace(/\s+/g, '');
    if (RYNEK_RE.test(candStreet) === false || candNr.split(/[\-–]/)[0] !== '2') {
      street = RYNEK_RE.test(candStreet) ? 'Rynek' : candStreet;
      streetNr = candNr;
      break;
    }
  }
  if (!street) return null;

  const raw = flatId.includes('/') ? `${street} ${flatId}` : `${street} ${streetNr.split(/[\-–]/)[0]}/${flatId}`;
  const address = parseAddress(raw);
  return address ? { address_raw: raw, address } : null;
}

export function unitAreaFromText(text, flatId) {
  if (!text) return null;
  const AREA_RE = /(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\w*\.?\s+u[żz]ytkow\w*\s*([\d][\d.,\s]*)\s*m\s*[²2]/gi;
  const escapedFlatId = flatId
    ? String(flatId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : null;
  const idRe = escapedFlatId ? new RegExp(`nr\\.?\\s*${escapedFlatId}\\b`, 'i') : null;
  const candidates = [];
  let m;
  while ((m = AREA_RE.exec(text)) !== null) {
    const v = Number(String(m[1]).replace(/[\s ]/g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) continue;
    const before = text.slice(Math.max(0, m.index - 170), m.index);
    candidates.push({ v, near: idRe ? idRe.test(before) : false });
  }
  if (!candidates.length) return null;
  const nearHit = candidates.find((c) => c.near);
  if (nearHit) return nearHit.v;
  const plausible = candidates.filter((c) => c.v >= 8 && c.v <= 300);
  if (plausible.length) return Math.min(...plausible.map((c) => c.v));
  return candidates[0].v;
}


const DZIALKA_STEM = 'dzia[łl]k[\\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]*\\s*(?:(?:ewidencyjn\\w*\\s*)?nr\\.?:?\\s*)?';
function plausibleParcel(v) {
  return /\//.test(v) || v.length >= 2;
}

export function parcelFromText(text) {
  const full = text || '';
  const cut = full.search(/słu[żz]ebno[śs]/i);
  const t = cut >= 0 ? full.slice(0, cut) : full;
  const seen = new Set();
  const nums = [];
  const RE = new RegExp(`${DZIALKA_STEM}(\\d+(?:\\/\\d+)?)`, 'gi');
  const CONT_RE = /^(?:\s*(?:,|i|oraz)\s*\d+(?:\/\d+)?)+/;
  let m;
  while ((m = RE.exec(t)) !== null) {
    if (!plausibleParcel(m[1])) continue;
    if (!seen.has(m[1])) { seen.add(m[1]); nums.push(m[1]); }
    const contM = CONT_RE.exec(t.slice(RE.lastIndex));
    if (!contM) continue;
    for (const tok of contM[0].split(/\s*(?:,|i|oraz)\s*/)) {
      const v = tok.trim();
      if (v && plausibleParcel(v) && !seen.has(v)) { seen.add(v); nums.push(v); }
    }
  }
  return nums.length ? nums.join(', ') : null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+(?:ewidencyjn\w+\s+)?([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ-]+)/.exec(text || '');
  return m ? m[1].trim() : null;
}

function totalHaFromText(text) {
  const m = /[łl][ąa]czn\w*\s+powierzchni\w*(?:\s+nieruchomo[śs]ci|\s+dzia[łl]ek)?\s+wynosi\s*:?\s*(\d+[.,]\d+|\d+)\s*ha\b/i.exec(
    text || '',
  );
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return v > 0 ? Math.round(v * 10000) : null;
}

export function plotAreaFromText(text) {
  const t = text || '';
  const total = totalHaFromText(t);
  if (total != null) return total;
  const ha = /o\s+(?:[łl][ąa]czn\w+\s+)?(?:pow|powierzchni)\w*\.?\s+(\d+[.,]\d+|\d+)\s*ha\b/i.exec(t);
  if (ha) { const v = Number(ha[1].replace(',', '.')); if (v > 0) return Math.round(v * 10000); }
  const m2 = /o\s+(?:[łl][ąa]czn\w+\s+)?(?:pow|powierzchni)\w*\.?\s+([\d\s ]+?)\s*m\s*[²2]/i.exec(t);
  if (m2) { const v = Number(m2[1].replace(/[\s ]/g, '')); if (Number.isFinite(v) && v > 0) return v; }
  return null;
}

const OFFICE_STREET_RE = /^rynek$/i;

export function landStreetFromText(text) {
  const re =
    /(?:przy|w\s+rejonie|po[łl]o[żz]on\w+\s+przy)\s+ul(?:icy)?\.?\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=\s*[,;.]|\s+w\s+[A-ZŻŹĆŁŚ]|\s+obr[ęe]b|\s+oznaczon|\s+ksi|\n|$)/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const s = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
    if (s && !OFFICE_STREET_RE.test(s)) return s;
  }
  return null;
}

export function landPlaceFromText(text) {
  const m = /po[łl]o[żz]on\w+\s+w\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-ząćęłńóśźż]+)(?=[\s,.]|$)/.exec(text || '');
  return m ? m[1].trim() : null;
}


const LAND_SUBJECT_RE = /na\s+sprzeda[żz][\s\S]{0,80}?(?:niezabudowan|nieruchomo[śs]ci\s+gruntow)/i;

function resolveKindPszczyna(title, text) {
  const fromTitle = classifyKind(title);
  if (fromTitle !== 'unknown') return fromTitle;
  if (LAND_SUBJECT_RE.test(`${title} ${text}`)) return 'grunt';
  return resolveKind(title, text);
}

function buildLandRecord({ text, url, starting_price_pln, auction_date, round }) {
  const dzialka_nr = parcelFromText(text);
  const street = landStreetFromText(text);
  const place = street ? null : landPlaceFromText(text);
  if (!dzialka_nr && !street && !place) return null;
  const address_raw = street ? `ul. ${street}` : place || null;
  return {
    kind: 'grunt',
    dzialka_nr,
    obreb: obrebFromText(text),
    area_m2: plotAreaFromText(text),
    address_raw,
    address: address_raw ? parseAddress(address_raw) : null,
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
    source_url: url,
  };
}

export function parseAnnouncement(title, bodyText, url) {
  const text = fixMalformedGrosze(htmlToText(bodyText));
  if (isLeaseTitle(title) || isLeaseTitle(text.slice(0, 400))) return null;
  const kind = resolveKindPszczyna(title, text);
  const round = roundFromTitle(title);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = priceFromText(text);

  if (kind === 'grunt') {
    return buildLandRecord({ text, url, starting_price_pln, auction_date, round });
  }

  const addr = flatAddressFromText(title, text);
  if (!addr) return null;
  const flatId = flatIdFromText(`${title} ${text}`);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: unitAreaFromText(text, flatId),
    starting_price_pln,
    auction_date,
    round,
    detail_url: url,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const t = fixMalformedGrosze(htmlToText(text));
  if (!/informacj[\węi]*\s+o\s+wynik|wynik\w*\s+przetarg|cena\s+osi[ąa]gni[ęe]ta|wynik\w*\s+negatywn/i.test(t)) return [];
  if (isLeaseTitle(t.slice(0, 400))) return [];

  const table = resultTableFromHtml(text);
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromTitle(t);
  const negativeStated = isNegativeOutcome(t);
  const sold = Boolean(table && table.final_price_pln != null);
  const starting_price_pln = table ? table.starting_price_pln : priceFromText(t);
  const kind = resolveKindPszczyna('', t);
  const notes = [];

  if (kind === 'grunt') {
    const rec = buildLandRecord({ text: t, url: sourceUrl, starting_price_pln, auction_date, round });
    if (!rec) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [{
      ...rec,
      source_pdf: sourceUrl,
      final_price_pln: sold ? table.final_price_pln : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : negativeStated ? 'wynik negatywny' : 'unknown',
      buyer: table ? table.buyer : null,
      notes,
    }];
  }

  const addr = flatAddressFromText('', t);
  if (!addr) return [];
  const flatId = flatIdFromText(t);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2: unitAreaFromText(t, flatId),
    starting_price_pln,
    final_price_pln: sold ? table.final_price_pln : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : negativeStated ? 'wynik negatywny' : 'unknown',
    buyer: table ? table.buyer : null,
    auction_date,
    round,
    source_pdf: sourceUrl,
    notes,
  }];
}
