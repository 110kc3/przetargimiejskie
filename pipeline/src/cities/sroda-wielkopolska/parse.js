import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


const PL = 'a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ';

function stripTags(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&sect;/gi, '§')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&bdquo;/gi, '„')
    .replace(/&rdquo;/gi, '”')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PL_MONTHS = {
  stycznia: 1, luty: 2, lutego: 2,
  marca: 3, marzec: 3,
  kwietnia: 4, kwiecien: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6,
  lipca: 7, lipiec: 7,
  sierpnia: 8, sierpien: 8,
  wrzesnia: 9, wrzesien: 9,
  pazdziernika: 10, pazdziernik: 10,
  listopada: 11, listopad: 11,
  grudnia: 12, grudzien: 12,
};

function toAsciiPL(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
}

function iso(y, m, d) {
  return String(y) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function dateFromPolishWords(text) {
  const m = /(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)\s+(\d{4})/i.exec(text || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAsciiPL(m[2])];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

function dateFromNumeric(text) {
  const m = /(\d{1,2})\.(\d{1,2})\.\s*(\d{4})/.exec(text || '');
  if (!m) return null;
  return iso(m[3], m[2], m[1]);
}

export function auctionDateFromText(text) {
  const anchorRe = /odb[ęe]d(?:zie|ą)\s+si[ęe]\s+w\s+dniu|odby[łl]y?\s+si[ęe]\s+w\s+dniu/i;
  const am = anchorRe.exec(text || '');
  if (!am) return null;
  const scope = text.slice(am.index, am.index + 80);
  return dateFromNumeric(scope) || dateFromPolishWords(scope);
}

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
function ordinalToRound(word) {
  const w = toAsciiPL(word);
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  if (w.startsWith('pi')) return 5;
  return null;
}
export function roundFromText(text, { defaultToOne = false } = {}) {
  if (!text) return null;
  const romanM = /(?:og[łl]asza|og[łl]osi[łl]|wyniku)\s+(IV|III|II|I|V)\s+(?:publiczny\s+)?przetarg/i.exec(text);
  if (romanM) return ROMAN[romanM[1].toUpperCase()] ?? null;
  const ordM = /(?:og[łl]asza|og[łl]osi[łl]|wyniku)\s+(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*)\s+przetarg\w*/i.exec(text);
  if (ordM) return ordinalToRound(ordM[1]);
  if (defaultToOne && /przetarg/i.test(text)) return 1;
  return null;
}

export function scopeAfterOznaczenie(text) {
  const t = text || '';
  const idx = t.search(/Oznaczenie\s+nieruchomo[śs]ci/i);
  return idx >= 0 ? t.slice(idx) : t;
}


export function parseBoardList(html) {
  if (!html) return [];
  const out = [];
  const RE = /<p[^>]+class="title"[^>]*>\s*<a[^>]+href="([^"]+\/wiadomosc\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = RE.exec(html)) !== null) {
    out.push({ title: stripTags(m[2]), detail_url: m[1].replace(/&amp;/gi, '&') });
  }
  return out;
}

export function isLeaseTitle(title) {
  return /wynaj\w*|najem|dzier[żz]aw/i.test(title || '');
}

export function isProceduralTitle(title) {
  return /zakwalifikowan|odwo[łl]a\w*\s+przetarg|uniewa[żz]nieni/i.test(title || '');
}

export function classifyAnnouncementTitle(title) {
  if (!title) return null;
  if (isLeaseTitle(title) || isProceduralTitle(title)) return null;
  const k = classifyKind(title);
  return k === 'mieszkalny' || k === 'grunt' ? k : null;
}

export function publishedDateFromTitle(title) {
  const m = /z\s+(\d{1,2})\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)\s+(\d{4})\s+roku\s*$/i.exec(title || '');
  if (!m) return null;
  const mon = PL_MONTHS[toAsciiPL(m[2])];
  return mon ? iso(m[3], mon, m[1]) : null;
}


export function extractDetailText(html) {
  if (!html) return '';
  const startIdx = html.indexOf('<div class="wiadomosc">');
  if (startIdx < 0) return '';
  const rest = html.slice(startIdx);
  const endIdx = rest.search(/Wiadomo[śs]ci\s+powi[ąa]zane|id="Attachments"|Rejestr zmian|id="RightMenu"/i);
  const block = endIdx >= 0 ? rest.slice(0, endIdx) : rest;
  return stripTags(block);
}


export function aptFromText(text) {
  const m = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i.exec(text || '');
  return m ? m[1] : null;
}

export function flatAddressFromText(text) {
  if (!text) return null;
  const scoped = scopeAfterOznaczenie(text);
  const RE = new RegExp(`przy\\s+ul(?:icy|\\.)?\\s+([${PL}0-9][${PL}0-9 .'-]*?)\\s+(\\d+[A-Za-z]?)\\b`, 'i');
  const m = RE.exec(scoped) || RE.exec(text);
  return m ? { street: m[1].trim(), building: m[2] } : null;
}

export function areaM2FromText(text) {
  if (!text) return null;
  const scoped = scopeAfterOznaczenie(text);
  const m = /(\d+(?:[.,]\d+)?)\s*m\s*[²2](?!\d)/.exec(scoped);
  return m ? parseArea(m[1]) : null;
}

export function startingPriceFromText(text) {
  const m = /cena\s+wywo[łl]awcza(?:\s+\S+){0,2}?\s*[:–\-]?\s*(\d[\d\s.,]*)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


export function parseFlatAnnouncement(text) {
  if (!text) return null;
  const apt = aptFromText(text);
  const addr = flatAddressFromText(text);
  if (!apt || !addr) return null;
  const address_raw = `ul. ${addr.street} ${addr.building}/${apt}`;
  const address = parseAddress(address_raw);
  if (!address) return null;
  return {
    kind: 'mieszkalny',
    address_raw,
    address,
    area_m2: areaM2FromText(text),
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text, { defaultToOne: true }),
  };
}


export function landLocationFromText(text) {
  const t = text || '';
  let m = new RegExp(`przy\\s+ulicy\\s+([${PL}][${PL} .'-]*?)(?=[,.]|\\s+stanowi|\\s+oznaczon|\\s+zapisan|$)`, 'i').exec(t);
  if (m) return { street: m[1].trim(), raw: `ul. ${m[1].trim()}` };
  m = new RegExp(`w\\s+rejonie\\s+ulicy\\s+([${PL}][${PL} .'-]*?)(?=[,.]|\\s+zapisan|\\s+stanowi|$)`, 'i').exec(t);
  if (m) return { street: m[1].trim(), raw: `rejon ul. ${m[1].trim()}` };
  m = new RegExp(`we?\\s+wsi\\s+([${PL}][${PL} .'-]*?)\\s*,\\s*gmina`, 'i').exec(t);
  if (m) return { street: null, raw: `wieś ${m[1].trim()}` };
  return { street: null, raw: null };
}

export function singleDzialkaFromText(text) {
  const m = new RegExp(`dzia[łl][${PL}]*\\s+(?:oznaczon[${PL}]*\\s+)?nr\\.?\\s*(?:ewid\\.?|geod\\.?)?\\s*(\\d+(?:\\/\\d+)?)`, 'i').exec(text || '');
  return m ? m[1].trim() : null;
}

export function haToM2(haStr) {
  const ha = Number(String(haStr).replace(',', '.'));
  return Number.isFinite(ha) ? Math.round(ha * 10000 * 100) / 100 : null;
}
export function areaHaFromText(text) {
  const m = /obszaru\s+(\d+[.,]\d+)\s*ha/i.exec(text || '');
  return m ? haToM2(m[1]) : null;
}


function parseSingleParcelLand(text) {
  const scoped = scopeAfterOznaczenie(text);
  const loc = landLocationFromText(scoped).raw ? landLocationFromText(scoped) : landLocationFromText(text);
  const dzialka_nr = singleDzialkaFromText(scoped) || singleDzialkaFromText(text);
  if (!dzialka_nr) return null;
  return {
    kind: 'grunt',
    dzialka_nr,
    obreb: null,
    address_raw: loc.raw,
    street: loc.street,
    building: null,
    area_m2: areaHaFromText(scoped) ?? areaHaFromText(text),
    zoning: /niezabudowan/i.test(text) ? 'niezabudowana' : null,
    starting_price_pln: startingPriceFromText(text),
    auction_date: auctionDateFromText(text),
    round: roundFromText(text, { defaultToOne: true }),
  };
}

function parseMultiParcelLand(text) {
  const priceRe = /(\d+\/\d+)\s+cena\s+wywo[łl]awcza\s*[–-]\s*([\d\s.,]+?)\s*z[łl](?:,\s*wadium\s+([\d\s.,]+?)\s*z[łl])?/gi;
  const priceMap = new Map();
  let m;
  while ((m = priceRe.exec(text)) !== null) {
    priceMap.set(m[1], parsePLN(m[2]));
  }
  if (priceMap.size < 2) return [];

  const areaRe = /(\d+\/\d+)\s+obszaru\s+(\d+[.,]\d+)\s*ha/gi;
  const areaMap = new Map();
  while ((m = areaRe.exec(text)) !== null) {
    areaMap.set(m[1], haToM2(m[2]));
  }

  const loc = landLocationFromText(scopeAfterOznaczenie(text));
  const auction_date = auctionDateFromText(text);
  const round = roundFromText(text, { defaultToOne: true });
  const zoning = /niezabudowan/i.test(text) ? 'niezabudowana' : null;

  const out = [];
  for (const [parcel, starting_price_pln] of priceMap) {
    out.push({
      kind: 'grunt',
      dzialka_nr: parcel,
      obreb: null,
      address_raw: loc.raw,
      street: loc.street,
      building: null,
      area_m2: areaMap.get(parcel) ?? null,
      zoning,
      starting_price_pln,
      auction_date,
      round,
    });
  }
  return out;
}

export function parseLandAnnouncement(text) {
  if (!text) return [];
  const multi = parseMultiParcelLand(text);
  if (multi.length) return multi;
  const single = parseSingleParcelLand(text);
  return single ? [single] : [];
}


export function parseResultNotice(text, sourceUrl) {
  if (!text) return [];
  const apt = aptFromText(text);
  const addr = flatAddressFromText(text);
  if (!apt || !addr) return [];

  const address_raw = `ul. ${addr.street} ${addr.building}/${apt}`;
  const address = parseAddress(address_raw);
  const notes = [];
  if (!address) {
    notes.push('parse: address parse failed');
    return [];
  }
  if (address.warning) notes.push(address.warning);

  const auction_date = auctionDateFromText(text);
  const round = roundFromText(text, { defaultToOne: false });

  const startM = /cena\s+wywo[łl]awcza\s+wynosi[łl]a\s+(\d[\d\s.,]*)\s*z[łl]/i.exec(text);
  const starting_price_pln = startM ? parsePLN(startM[1]) : null;
  if (starting_price_pln == null) notes.push('parse: missing starting price');

  const finalM = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*[–-]?\s*(\d[\d\s.,]*)\s*z[łl]/i.exec(text);

  const explicitPositive = /wynikiem\s+pozytywnym/i.test(text);
  const explicitNegative = /wynikiem\s+negatywnym/i.test(text);
  const positive = explicitPositive || finalM != null;
  if (!explicitPositive && !explicitNegative) {
    notes.push(finalM ? 'parse: outcome inferred from stated final price' : 'parse: outcome unclear');
  }

  let unsold_reason = null;
  if (/brak\s+wp[łl]aty\s+wadium/i.test(text) || /brak\s+uczestnik/i.test(text)) {
    unsold_reason = 'brak_uczestnikow';
  } else if (/uniewa[żz]ni/i.test(text)) {
    unsold_reason = 'uniewaznienie';
  }

  const outcome = positive ? 'sold' : 'unsold';
  const final_price_pln = positive && finalM ? parsePLN(finalM[1]) : null;
  if (positive && final_price_pln == null) notes.push('parse: missing final price on positive result');

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: 'mieszkalny',
    address_raw,
    address,
    round,
    area_m2: areaM2FromText(text),
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    notes,
  }];
}


export function parseResultDoc(text, _fallbackDate, sourceUrl) {
  return parseResultNotice(text, sourceUrl);
}
