
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr)
    .replace(/[\s. ]/g, '')
    .replace(/,\d{2}$/, '')
    .replace(/,?[.-]$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
const WORD = { pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6 };

export function roundFromText(text) {
  const t = text || '';
  let m = /\b(VI|IV|III|II|V|I)\s+przetarg\w*\s+ustn/i.exec(t);
  if (m) { const r = ROMAN[m[1].toLowerCase()]; if (r) return r; }
  m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st)\w*\s+przetarg/i.exec(t);
  if (m) return WORD[m[1].toLowerCase()] ?? null;
  return null;
}

function isoDate(m) {
  if (!m) return null;
  const mo = PL_MONTH[m[2].toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function announcementDateFromText(text) {
  return isoDate(
    /przetarg\w*\s+odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || ''),
  );
}

export function resultDateFromText(text) {
  return isoDate(
    /informuje[^.]{0,60}?\bw\s+dniu\s+(\d{1,2})\s+([a-ząęóśżźćłń]+)\s+(\d{4})/i.exec(text || ''),
  );
}

export function startingPriceFromText(text) {
  const m = /cen[aęy]\w*\s+wywo[łl]awcz\w*[^.\d]{0,60}?(\d[\d.,  ]{0,17})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = text || '';
  let m = /osi[ąa]gni[ęe]to\s+cen[ęe]\s+(\d[\d.,  ]{0,17})\s*z[łl]/i.exec(t);
  if (!m) m = /cen[aęy]\w*\s+osi[ąa]gni[ęe]t\w*[^.\d]{0,40}?(\d[\d.,  ]{0,17})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

const PARCEL_RE = /dzia[łl]ka\s+nr\s+(\d+(?:\/\d+)?)\s+o\s+powierzchni\s+(\d+[.,]\d+|\d+)\s*ha\b/i;

export function parcelFromText(text) {
  const m = PARCEL_RE.exec((text || '').replace(/\s+/g, ' '));
  if (!m) return { dzialka_nr: null, area_m2: null };
  const ha = Number(m[2].replace(',', '.'));
  return { dzialka_nr: m[1], area_m2: ha > 0 ? Math.round(ha * 10000) : null };
}

const LOCALITY_RE =
  /[Pp]o[łl]o[żz]on\w*\s+(?:jest\s+)?w\s+([A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+(?:\s+[A-ZŻŹĆŁŚĄĘÓŃ][a-zżźćłśąęóń-]+)?)/;

export function localityFromText(text) {
  const m = LOCALITY_RE.exec(text || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}


const STREET_HEADER_RE =
  /przy\s+ul(?:ic[yą]|\.)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'’\- ]+?)(?:\s+(\d+[A-Za-z]?))?\s*(?:\.|,|\s+oraz\b|\s+i\b|\s+w\s+Gostyni|\n|$)/i;

export function streetFromHeader(text) {
  const m = STREET_HEADER_RE.exec(text || '');
  if (!m) return null;
  const street = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  return { street, building: m[2] || null };
}

const UNIT_NO_RE = /lokal\w*\s+(?:mieszkaln\w+|niemieszkaln\w+|u[żz]ytkow\w+)\s+nr\s+(\d+[A-Za-z]?)/i;
const UNIT_AREA_RE =
  /powierzchni\s+u[żz]ytkow\w+[^.\d]{0,40}?(\d[\d.,\s ]*?)\s*m\s*[²2](?!\d)/i;

export function addressRawFromText(text) {
  const h = streetFromHeader(text);
  if (!h || !h.building) return null;
  const um = UNIT_NO_RE.exec(text || '');
  return um ? `ul. ${h.street} ${h.building}/${um[1]}` : `ul. ${h.street} ${h.building}`;
}

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

function kindFromHeader(text) {
  const t = text || '';
  const i = t.search(/na\s+sprzeda[żz]/i);
  return classifyKind(i >= 0 ? t.slice(i, i + 300) : t.slice(0, 500));
}


function splitBlocks(text, startRe) {
  const re = new RegExp(startRe.source, startRe.flags.includes('g') ? startRe.flags : startRe.flags + 'g');
  const idx = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    idx.push(m.index);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (idx.length === 0) return [text];
  const out = [];
  for (let i = 0; i < idx.length; i++) out.push(text.slice(idx[i], idx[i + 1] ?? text.length));
  return out;
}

const ANN_BLOCK_RE = /(?:BURMISTRZ\s+GOSTYNIA|Burmistrz\s+Gostynia)\s+og[łl]asza/i;
const RESULT_BLOCK_RE = /Na\s+podstawie\s+[$§]?\s*12\s+Rozporz/i;


export function isSkippableTitle(title) {
  const s = title || '';
  return (
    /\bnajem\b|dzier[zż]aw/i.test(s) ||
    /(^|\W)wykaz\b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

export function isResultTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /wynik/i.test(s);
}

export function isAnnouncementTitle(title) {
  const s = title || '';
  return /przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo|lokal|dzia[łl]k/i.test(s);
}

export function isResultNotice(text) {
  const t = text || '';
  return (
    /osi[ąa]gni[ęe]to\s+cen/i.test(t) ||
    /cen[aęy]\w*\s+osi[ąa]gni[ęe]t/i.test(t) ||
    /informacj\w*\s+o\s+wynik/i.test(t) ||
    /przeprowadzony\s+zosta[łl]\s+\S*\s*przetarg/i.test(t)
  );
}


export function parseArticleList(xml) {
  const s = xml || '';
  const pagesM = /<ilosc-stron>\s*(\d+)\s*<\/ilosc-stron>/i.exec(s);
  const pages = pagesM ? Number(pagesM[1]) : 1;
  const items = [];
  const re = /<artykul>([\s\S]*?)<\/artykul>/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    const blk = m[1];
    const url = (/<url>\s*([\s\S]*?)\s*<\/url>/i.exec(blk) || [])[1];
    let title = (/<tytul>\s*([\s\S]*?)\s*<\/tytul>/i.exec(blk) || [])[1] || '';
    title = unescapeXml(title).replace(/\s+/g, ' ').trim();
    const dRaw = (/<data>\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*<\/data>/i.exec(blk) || []);
    const date = dRaw.length ? `${dRaw[3]}-${dRaw[2].padStart(2, '0')}-${dRaw[1].padStart(2, '0')}` : null;
    if (url) items.push({ url: url.trim(), title, date });
  }
  return { pages: pages > 0 ? pages : 1, items };
}

function unescapeXml(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
}


export function extractTitle(html) {
  const m = /<h1[^>]*id="content-header"[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  return m ? stripTags(m[1]) : '';
}

export function extractBodyText(html) {
  const h = html || '';
  const m =
    /<section[^>]*class="[^"]*wysiwyg[^"]*"[\s\S]*?>([\s\S]*?)<\/section>/i.exec(h) ||
    /<div[^>]*class="[^"]*contents[^"]*"[^>]*>([\s\S]*?)<section[^>]*id="attachments"/i.exec(h);
  return m ? stripTags(m[1]) : '';
}

export function extractAttachments(html) {
  const h = html || '';
  const secM = /<section[^>]*id="attachments"[\s\S]*?<\/section>/i.exec(h);
  const scope = secM ? secM[0] : h;
  const out = [];
  const seen = new Set();
  const re =
    /\/attachments\/download\/(\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,120}?class="files\s+text\w+"[^>]*>\s*([a-z0-9]+)/gi;
  let m;
  while ((m = re.exec(scope)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      url: `https://biuletyn.gostyn.pl/attachments/download/${id}`,
      id,
      name: stripTags(m[2]),
      ext: m[3].toLowerCase(),
    });
  }
  return out;
}

function stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}


function parseAnnouncementBlock(t) {
  const kind = kindFromHeader(t);
  const round = roundFromText(t);
  const auction_date = announcementDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);

  if (kind === 'grunt') {
    const { dzialka_nr, area_m2 } = parcelFromText(t);
    const obreb = localityFromText(t);
    if (!dzialka_nr && !obreb) return null;
    return { kind: 'grunt', dzialka_nr, obreb, area_m2, address_raw: null, starting_price_pln, auction_date, round };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  const area_m2 = unitAreaFromText(t);
  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
  };
}

export function parseAnnouncement(text) {
  if (!text || isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const out = [];
  for (const block of splitBlocks(t, ANN_BLOCK_RE)) {
    const rec = parseAnnouncementBlock(block);
    if (rec) out.push(rec);
  }
  return out;
}


function parseResultBlock(t, fallbackDate, sourceUrl) {
  const kind = kindFromHeader(t);
  const round = roundFromText(t);
  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;
  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  if (kind === 'grunt') {
    const { dzialka_nr, area_m2 } = parcelFromText(t);
    const obreb = localityFromText(t);
    if (!dzialka_nr && !obreb) return null;
    return {
      auction_date, source_pdf: sourceUrl, kind: 'grunt', dzialka_nr, obreb, area_m2, address_raw: null,
      round, starting_price_pln, final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown', notes,
    };
  }

  const address_raw = addressRawFromText(t);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);
  return {
    auction_date, source_pdf: sourceUrl, kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw, address, round, starting_price_pln, final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold', unsold_reason: sold ? null : 'unknown',
    area_m2: unitAreaFromText(t), notes,
  };
}

export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  if (!text || !isResultNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const out = [];
  for (const block of splitBlocks(t, RESULT_BLOCK_RE)) {
    const rec = parseResultBlock(block, fallbackDate, sourceUrl);
    if (rec) out.push(rec);
  }
  return out;
}
