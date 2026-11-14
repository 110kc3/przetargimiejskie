
import { parseAddress } from '../../core/normalize.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (numStr == null) return null;
  const cleaned = String(numStr).replace(/[\s .]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeWs(s) {
  return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
}

function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}


export function isFlat(text) {
  return /lokal\w*\s+mieszkaln/i.test(text || '');
}


const GIVEN_NAMES = [
  'Mikołaja', 'Ignacego', 'Jana', 'Marii', 'Adama', 'Józefa', 'Wincentego',
  'Stanisława', 'Tadeusza', 'Henryka', 'Bolesława', 'Władysława', 'Fryderyka',
  'Romualda', 'Juliusza', 'Wojciecha', 'Piotra', 'Pawła', 'Kazimierza',
  'Aleksandra', 'Zygmunta', 'Michała', 'Andrzeja',
];
const GIVEN_NAME_RE = new RegExp(
  `^(?:[A-ZĄĆĘŁŃÓŚŻŹ]\\.\\s+|(?:${GIVEN_NAMES.join('|')})\\s+)`,
  'i',
);

export function stripGivenName(street) {
  const s = normalizeWs(street);
  if (!/\s/.test(s)) return s;
  return s.replace(GIVEN_NAME_RE, '').trim();
}

const FLAT_NO_RE = /lokal\w*\s+mieszkaln\w+\s+nr\s+(\d+[a-z]?)/i;
const ADDR_UL_RE = /przy\s+ul(?:\.|icy)?\s+(.+?)\s+(\d+[a-z]?)[^\w\s]?\s+w\s+Dzier[żz]oniowie/i;
const ADDR_OS_RE = /\bos(?:\.|iedl\w*)\s+(.+?)\s+(\d+[a-z]?)[^\w\s]?\s+w\s+Dzier[żz]oniowie/i;
const ADDR_RYNEK_RE = /\bRyn(?:ek|ku)\s+(\d+[a-z]?)[^\w\s]?\s+w\s+Dzier[żz]oniowie/i;

export function extractFlatAddressRaw(text) {
  const t = normalizeWs(text);
  let street = null;
  let building = null;
  let m = ADDR_UL_RE.exec(t);
  if (m) { street = stripGivenName(m[1]); building = m[2]; }
  if (!street) {
    m = ADDR_OS_RE.exec(t);
    if (m) { street = `os. ${normalizeWs(m[1])}`; building = m[2]; }
  }
  if (!street) {
    m = ADDR_RYNEK_RE.exec(t);
    if (m) { street = 'Rynek'; building = m[1]; }
  }
  if (!street || !building) return null;
  const fm = FLAT_NO_RE.exec(t);
  return fm ? `${street} ${building}/${fm[1]}` : `${street} ${building}`;
}


export function titleAuctionDate(title) {
  const m = /z\s+dnia\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(title || '');
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  return mo ? toIso(m[1], mo, m[3]) : null;
}


const AMOUNT_G = /\d{1,3}(?:[ \u00a0]\d{3})*,\d{2}/g;

export function announcementTableRow(pdfTextRaw) {
  let best = null;
  let bestCount = 0;
  for (const line of String(pdfTextRaw || '').split('\n')) {
    const nums = line.match(AMOUNT_G) || [];
    if (nums.length > bestCount) { bestCount = nums.length; best = nums; }
  }
  if (!best || best.length < 4) return null;
  return {
    area_m2: parseNum(best[0]),
    starting_price_pln: parsePLN(best[best.length - 2]),
    wadium: parsePLN(best[best.length - 1]),
  };
}

export function announcementTermin(pdfTextRaw) {
  const t = normalizeWs(pdfTextRaw);
  const m = /Termin\s+przetargu\s*[-:]?\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(t);
  return m ? toIso(m[1], m[2], m[3]) : null;
}

export function announcementRound(pdfTextRaw) {
  const t = normalizeWs(pdfTextRaw);
  const anchor = /Poprzedni\w*/i.exec(t);
  if (!anchor) return 1;
  const window = t.slice(anchor.index, anchor.index + 320);
  const dates = window.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [];
  return dates.length ? dates.length + 1 : 1;
}

export function parseAnnouncement(pdfTextRaw, titleAddress, detailUrl) {
  const addrRaw = extractFlatAddressRaw(titleAddress);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;
  const row = announcementTableRow(pdfTextRaw) || {};
  return {
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    area_m2: row.area_m2 ?? null,
    starting_price_pln: row.starting_price_pln ?? null,
    auction_date: announcementTermin(pdfTextRaw),
    round: announcementRound(pdfTextRaw),
    detail_url: detailUrl,
    wadium_deadline: null,
  };
}


const ITEM_OPEN_RE =
  /Lokal\w*\s+(?:mieszkaln\w+|u[żz]ytkow\w+|niemieszkaln\w+)\s+nr|Dzia[łl]ki\s+nr|Gara[żz]\w*\s+nr/g;

export function splitResultItems(pdfTextRaw) {
  const text = String(pdfTextRaw || '');
  const starts = [];
  ITEM_OPEN_RE.lastIndex = 0;
  let m;
  while ((m = ITEM_OPEN_RE.exec(text)) !== null) starts.push(m.index);
  const chunks = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    chunks.push(text.slice(starts[i], end));
  }
  return chunks;
}

const RES_START_RE =
  /cena\s+wywo[łl]awcza\s+nieruchomo[śs]ci\s*(?:netto)?\s*:?\s*(\d[\d\s ]*,\d{2})\s*z[łl]/i;
const RES_FINAL_RE =
  /uzyskan\w*\s+cen\w*\s+ze\s+sprzeda[żz]y\s+nieruchomo[śs]ci\s*(?:netto)?\s*:?\s*(\d[\d\s ]*,\d{2})\s*z[łl]/i;
const RES_FINAL_ALT_RE = /cen\w*\s+sprzeda[żz]y\s*:?\s*(\d[\d\s ]*,\d{2})\s*z[łl]/i;
const RES_AREA_LACZNA_RE = /[łl][ąa]czn\w*\s+powierzchni\w*\s+lokalu\s+(\d+(?:[.,]\d+)?)\s*m/i;
const RES_AREA_RE =
  /lokal\w*\s+mieszkaln\w+\s+nr\s+\d+[a-z]?\s+o\s+pow\.?\s+(?:u[żz]ytkowej\s+)?(\d+(?:[.,]\d+)?)\s*m/i;
const RES_NEGATIVE_RE =
  /wynikiem\s+negatywnym|brak\s+oferent[óo]w|nie\s+odnotowano\s+wp[łl]aty\s+wadium|nikt\s+nie\s+przyst[ąa]pi/i;

function unsoldReason(itemNorm) {
  if (/brak\s+oferent[óo]w|nikt\s+nie\s+przyst[ąa]pi/i.test(itemNorm)) return 'no_participants';
  if (/nie\s+odnotowano\s+wp[łl]aty\s+wadium/i.test(itemNorm)) return 'no_wadium';
  return 'unknown';
}

function resultItemArea(itemNorm) {
  const l = RES_AREA_LACZNA_RE.exec(itemNorm);
  if (l) return parseNum(l[1]);
  const m = RES_AREA_RE.exec(itemNorm);
  return m ? parseNum(m[1]) : null;
}

export function parseResultItem(itemChunk, auction_date, sourceUrl) {
  const item = normalizeWs(itemChunk);
  const addrRaw = extractFlatAddressRaw(item);
  if (!addrRaw) return null;
  const address = parseAddress(addrRaw);
  if (!address) return null;

  const starting_price_pln = (() => {
    const m = RES_START_RE.exec(item);
    return m ? parsePLN(m[1]) : null;
  })();
  let final_price_pln = null;
  const fm = RES_FINAL_RE.exec(item) || RES_FINAL_ALT_RE.exec(item);
  if (fm) final_price_pln = parsePLN(fm[1]);
  const soldNamed = /nabywc\w*/i.test(item);
  const sold = final_price_pln != null && soldNamed;
  const negativeStated = RES_NEGATIVE_RE.test(item);

  const notes = [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && final_price_pln == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  return {
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw: addrRaw,
    address,
    round: null, // never stated per-item; build-properties derives it from history
    starting_price_pln,
    final_price_pln: sold ? final_price_pln : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : unsoldReason(item),
    area_m2: resultItemArea(item),
    notes,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  const out = [];
  for (const chunk of splitResultItems(text)) {
    if (!isFlat(chunk)) continue;
    const rec = parseResultItem(chunk, fallbackDate || null, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}
