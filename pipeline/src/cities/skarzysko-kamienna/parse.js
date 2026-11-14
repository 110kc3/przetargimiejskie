
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr).replace(/[\s. ]/g, '').replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArea(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wynik/i.test(text || '');
}


export function isSkippableTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return (
    /\bnajem\b|najmu|czynsz|dzier[zż]aw/i.test(s) ||
    /lista\s+os[óo]b/i.test(s) ||
    /sprostowanie/i.test(s) ||
    /(^|\W)wykaz\b|wywieszeniu\s+wykazu/i.test(s) ||
    /odwo[łl]ani|uniewa[zż]ni/i.test(s) ||
    /rozstrzygni[ęe]ci\w*\s+skarg|skarg\w*\s+na\s+czynno/i.test(s) ||
    /\brokowani/i.test(s)
  );
}

export function isRentalNotice(text) {
  return /cena\s+wywo[łl]awcz\w*[\s\S]{0,50}?czynsz\w*\s+najmu/i.test(text || '')
    || /przetarg\w*[\s\S]{0,100}?na\s+(?:najem|dzier[zż]aw|oddanie\s+w\s+najem)/i.test(text || '');
}

export function isResultTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  return /informacj\w*\s+o\s+wynik/i.test(s);
}

export function isAnnouncementTitle(title, slug) {
  const s = `${title || ''} ${(slug || '').replace(/-/g, ' ')}`;
  if (/przetarg/i.test(s) && /sprzeda|zbyci|nieruchomo/i.test(s)) return true;
  return false;
}


const ROUND_WORDS = {
  pierwsz: 1, drug: 2, trzeci: 3, czwart: 4, 'piąt': 5, piat: 5, 'szóst': 6, szost: 6,
  'siódm': 7, siodm: 7, 'ósm': 8, osm: 8,
};

export function roundFromText(text) {
  const m = /\b(pierwsz|drug|trzeci|czwart|pi[ąa]t|sz[óo]st|si[óo]dm|[óo]sm)\w*\s+(?:ustny\s+nieograniczony\s+)?przetarg/i.exec(text || '');
  if (!m) return null;
  const key = m[1].toLowerCase();
  for (const [prefix, val] of Object.entries(ROUND_WORDS)) {
    if (key.startsWith(prefix)) return val;
  }
  return null;
}

export function auctionDateFromText(text) {
  const t = text || '';
  let m = /(?:przetarg\w*\s+)?odb[ęe]dzie\s+si[ęe]\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /Data\s+przetargu\D{0,20}(\d{2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

export function resultDateFromText(text) {
  const t = text || '';
  let m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+w\s+siedzibie/i.exec(t);
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /Skarżysko-Kamienna\s*,?\s+dn\.\s+(\d{1,2})\.(\d{2})\.(\d{4})/i.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`;
  return null;
}


export function startingPriceFromText(text) {
  const t = text || '';
  let m = /cena\s+wywo[łl]awcza\s*(?:do\s+przetargu\s*)?wynosi\s*[-–]?\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s+zosta[łl]a\s+ustalona\s+na\s+kwot[ęe]\s+(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  if (!m) m = /cena\s+wywo[łl]awcza\s+(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const m = /(?:najwy[żz]sza\s+cena\s+(?:jak\s+)?zosta[łl]a\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+wynios[łl]a|cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s*(?:wynios[łl]a)?\s*[:\-–]?)\s*(\d[\d.\s ]*,\d{2})\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}


const UNIT_NO_RE = /lokal\w*\s+mieszkaln\w+\s+(?:nr\s+)?(\d+[A-Za-z]?)/i;

const STREET_BLDG_RE =
  /przy\s+(?:ul(?:icy)?\.?|al(?:ei)?\.?)\s+([A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zŻŹĆŁŚĄĘÓŃżźćłśąęóń.'\- ]+?)\s+(?:nr\s+)?(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))?\s*(?:\b|[,.\s])/i;

export function addressRawFromText(text) {
  const t = text || '';
  const sm = STREET_BLDG_RE.exec(t);
  if (!sm) return null;
  const street = sm[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  if (!street) return null;
  const bldg = sm[2];
  if (sm[3]) return `ul. ${street} ${bldg}/${sm[3]}`;
  const um = UNIT_NO_RE.exec(t);
  return um ? `ul. ${street} ${bldg}/${um[1]}` : `ul. ${street} ${bldg}`;
}

const UNIT_AREA_RE = /lokal\w*[\s\S]{0,400}?o\s+(?:[łl][ąa]cznej\s+)?powierzchni\s+(\d+[.,]\d+)\s*m\s*[²2]/i;

export function unitAreaFromText(text) {
  const m = UNIT_AREA_RE.exec(text || '');
  return m ? parseArea(m[1]) : null;
}

function kindFromText(text) {
  const m = /na\s+sprzeda[zż]\s*([\s\S]{0,600})/i.exec(text || '');
  return classifyKind(m ? m[1] : (text || '').slice(0, 600));
}


export function extractBodyText(html) {
  if (!html) return '';
  const h = html.replace(/\r/g, '');
  const wysM = /<div class="wysiwyg">([\s\S]*?)(?:<h2 id="contents_legal_title"|<div[^>]*class="author")/i.exec(h);
  const divM = /id="content_legal_autor"[^>]*>([\s\S]*?)<\/div>\s*(?:<section|<div[^>]*class="author")/i.exec(h);
  const bodyHtml = wysM ? wysM[1] : (divM ? divM[1] : '');
  const tableM = /<table[^>]*class="[^"]*table-borderless[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(h);
  const tableHtml = tableM ? tableM[1] : '';
  const combined = tableHtml + '\n' + bodyHtml;
  let text = combined.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ');
  return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}

export function landSaleFields(text) {
  const t = text.replace(/\s+/g, ' ');
  const raw = /Adres nieruchomości\s+([\s\S]*?)(?=Przetarg na|Typ przetargu|Rodzaj nieruchomości)/i.exec(t)?.[1].trim();
  const titleParcel = /dzia[łl]k\w*\s+nr\s+(?:ewid\.\s*)?(\d+(?:\/\d+)?)/i.exec(raw || '')?.[1];
  let subject = t.slice(Math.max(0, t.search(/przedmiotem\s+sprzeda[żz]y/i)));
  if (titleParcel) {
    const clauses = [...t.matchAll(/na sprzedaż prawa własności nieruchomości([\s\S]*?)(?=(?:II|III)\.\s|$)/gi)];
    subject = clauses.find((m) => new RegExp(`działka numer ${titleParcel.replace('/', '\\/')}\\b`).test(m[0]))?.[0] || subject;
  }
  const multi = /działki o numerach:\s*([\s\S]*?)(?=Dla ww\.|II\.)/i.exec(subject)?.[1];
  const parcels = multi ? [...multi.matchAll(/(?:^|,\s*nr\s*|działce nr\s*)([\d/]+(?:\s*(?:,|i)\s*[\d/]+)*)/gi)]
    .flatMap((m) => m[1].split(/\s*(?:,|i)\s*/)) : [];
  const nr = parcels.length ? [...new Set(parcels)].join(', ') : titleParcel
    || /(?:dzia[łl]k[a-ząćęłńóśźż]*[\s\S]{0,240}?(?:nr(?:\s+ewid\.)?|numer(?:em)?)|numerem)\s*[:.]?\s*(\d+(?:\/\d+)?)/i.exec(subject)?.[1];
  if (!nr) throw new Error('land sale without a source parcel');
  const ha = /(?:o\s+)?powierzchni\s+(\d+[.,]\d+)\s*ha/i.exec(subject)?.[1];
  return { kind: 'grunt', dzialka_nr: nr,
    obreb: multi ? null : /obręb\s+(\d+)/i.exec(subject)?.[1] || null,
    area_m2: !multi && ha ? Math.round(Number(ha.replace(',', '.')) * 10000) : null,
    address_raw: raw || null,
    ...(multi ? { notes: ['Package includes parcels in two districts and a 1/2 share; see source for individual rights and areas.'] } : {}) };
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  if (isRentalNotice(t)) return null;
  const kind = kindFromText(t);

  const round = roundFromText(t);
  const auction_date = auctionDateFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  if (kind === 'grunt') return { ...landSaleFields(t), starting_price_pln, auction_date, round };


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


export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text) || isRentalNotice(text)) return [];
  const t = text.replace(/\r/g, '');
  const notes = [];

  const auction_date = resultDateFromText(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromText(t);
  const sold = achieved != null;

  const negativeStated =
    /przetarg\s+zako[ńn]czy[łl]\s+si[ęe]\s+wynikiem\s+negatywnym/i.test(t) ||
    /nie\s+zosta[łl]o\s+wp[łl]acone\s+wadium/i.test(t) ||
    /brak\s+oferent/i.test(t) ||
    /nie\s+dosz[łl]o\s+do\s+zawarcia/i.test(t);

  if (kindFromText(t) === 'grunt') return [{ ...landSaleFields(t), auction_date,
    source_url: sourceUrl, starting_price_pln, final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold', round, notes }];
  const address_raw = addressRawFromText(t);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const area_m2 = unitAreaFromText(t);
  const kind = kindFromText(t);

  return [
    {
      auction_date,
      source_url: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw,
      address,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : 'unknown',
      area_m2,
      notes,
    },
  ];
}
