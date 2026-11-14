import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTH = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, 'września': 9, wrzesnia: 9,
  'października': 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };

function romanToInt(s) {
  const up = String(s).toUpperCase();
  if (!/^[IVXL]+$/.test(up)) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const cur = ROMAN[up[i]];
    const next = ROMAN[up[i + 1]];
    total += next && cur < next ? -cur : cur;
  }
  return total > 0 && total < 40 ? total : null;
}

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr)
    .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\s]+/g, ' ')
    .replace(/\s*([.,])\s*/g, '$1')
    .replace(/[\s.]/g, '')
    .replace(/,\d{2}$/, '');
  const n = Number(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseNum(numStr) {
  if (numStr == null) return null;
  const n = Number(String(numStr).replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}


export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&sup2;/g, '²').replace(/&amp;/g, '&')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&bdquo;|&rdquo;|&ldquo;|&quot;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildRecordText(f = {}) {
  return [
    `TITLE: ${stripHtml(f.title)}`,
    `BODY: ${stripHtml(f.body)}`,
  ].join('\n');
}

function field(text, label) {
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text || '');
  return m ? m[1].trim() : '';
}

function whole(text) {
  const fTitle = field(text, 'TITLE');
  const fBody = field(text, 'BODY');
  if (fTitle || fBody) return `${fTitle} ${fBody}`.trim();
  return String(text || '').trim();
}

function cleanSpacedText(text) {
  return text
    .replace(/\bPlac\s+u\b/gi, 'Placu')
    .replace(/\bdni\s+u\b/gi, 'dniu')
    .replace(/\bpo[łl]o[żz]on\s+ej\b/gi, 'położonej')
    .replace(/\bpo[łl]o[żz]on\s+y\b/gi, 'położony')
    .replace(/\bpo[łl]o[żz]on\s+a\b/gi, 'położona')
    .replace(/\bZ\s+abudow\s+a\b/gi, 'Zabudowa')
    .replace(/\s+/g, ' ')
    .trim();
}


function isCancellation(text) {
  const title = field(text, 'TITLE') || text;
  return /odwo[łl](?:an|uj)/i.test(title);
}

export function isLease(text) {
  const t = whole(text);
  return /dzier[żz]aw|\bnajem\b|stawk[ęe]\s+czynszu|czynsz\s+dzier|z[łl]\s+miesi[ęe]cznie/i.test(t);
}

export function isSaleAuction(text) {
  if (isCancellation(text)) return false;
  if (isLease(text)) return false;
  const t = whole(text);
  if (/zaproszenie\s+do\s+sk[łl]adania\s+ofert/i.test(t)) return false;
  return /przetarg/i.test(t) && /sprzeda[żz]/i.test(t);
}

export function isResultDoc(text) {
  if (isCancellation(text)) return false;
  const t = whole(text);
  return /informacj\w*\s+o\s+wyniku|dotycz[ąa]?\w*\s+wyniku|przeprowadzon\w*\s+zosta[łl]|zosta[łl]\s+przeprowadzon\w*|osi[ąa]gni[ęe]t/i.test(t);
}

export function isNegativeOutcome(text) {
  const t = whole(text);
  return /wynik\w*\s+(?:jest\s+)?negatywn\w*|nikt\s+nie\s+przyst[ąa]pi|nie\s+przyst[ąa]pi|brak\s+ofert|uniewa[żz]ni|nie\s+odnotowano|nie\s+wp[łl]acono\s+wadium/i.test(t);
}


export function roundFromText(text) {
  const t = whole(text);
  const mRoman = /\b([IVXL]{1,5})\s+przetarg/i.exec(t);
  if (mRoman) {
    const val = romanToInt(mRoman[1]);
    if (val != null) return val;
  }
  const mWord = /(pierwsz|drug|trzec|czwart|pi[aą]t)\w*\s+(?:ustn\w+\s+)?(?:nieograniczon\w+\s+)?przetarg/i.exec(t);
  if (mWord) {
    const w = mWord[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzec')) return 3;
    if (w.startsWith('czwart')) return 4;
    if (w.startsWith('pi')) return 5;
  }
  return null;
}


function toIso(dd, mm, yyyy) {
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function parseDatePhrase(phrase) {
  if (!phrase) return null;
  let m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*[.\s]\s*(\d{4})/.exec(phrase.trim());
  if (m) return toIso(m[1], m[2], m[3]);
  m = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(phrase.trim());
  if (m) {
    const mo = PL_MONTH[m[2].toLowerCase()];
    if (mo) return toIso(m[1], mo, m[3]);
  }
  return null;
}

export function auctionDateFromText(text) {
  const t = cleanSpacedText(whole(text));
  let m = /w\s+dniu\s+([\s\S]{0,30}?)(?:\s+r(?:oku|\.)?)?\s+o\s+godz/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1]);
    if (iso) return iso;
  }
  m = /w\s+dniu\s+([\s\S]{0,30}?)(?:\s+r(?:oku|\.)?)?\s+(?:w\s+siedzibie|przeprowadzony|rozpatrzonego)/i.exec(t);
  if (m) {
    const iso = parseDatePhrase(m[1]);
    if (iso) return iso;
  }
  return null;
}


export function startingPriceFromText(text) {
  const t = whole(text);
  const m = /cena\s+wywo[łl]awcz\w*[^0-9]{0,30}?(\d[\d. ]*(?:,\s*\d{2})?)\s*(?:z\s*[łl]|PLN)/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}

export function achievedPriceFromText(text) {
  const t = whole(text);
  const m = /cena\s+(?:nieruchomo[sś]ci\s+)?osi[ąa]gni[ęe]t\w*\s+w\s+przetargu\s+wynosi\s*[-—–:]?\s*(\d[\d. ]*(?:,\s*\d{2})?)\s*(?:z\s*[łl]|PLN)/i.exec(t);
  return m ? parsePLN(m[1]) : null;
}


export function kindFromText(text) {
  const kTitle = classifyKind(field(text, 'TITLE'));
  if (kTitle !== 'unknown') return kTitle;
  const kWhole = classifyKind(whole(text));
  if (kWhole !== 'unknown') return kWhole;
  if (/lokal\s+mieszkalny/i.test(whole(text))) return 'mieszkalny';
  return 'unknown';
}


function isExcludedOfficeAddress(street, bldg) {
  const s = street.toLowerCase();
  if (/11\s+listopada/i.test(s) && bldg === '20') return true;
  if (/zwyci[ęe]stwa/i.test(s) && bldg === '10') return true;
  return false;
}

function unitNoFromText(text) {
  const t = whole(text);
  const m = /lokal\w*\s+(?:nie)?mieszkaln\w*\s+(?:nr\s+)?(\d+[A-Za-z]?)/i.exec(t);
  return m ? m[1] : null;
}

export function addressRawFromText(text) {
  const t = cleanSpacedText(whole(text));
  const propRe =
    /(?:przy\s+(?:ul\.|ulicy|Al(?:ei|\.))\s*|przy\s+)(Plac(?:u)?\s+[A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{2,50}?|[A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]{2,50}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*(\d+[A-Za-z]?))?\b/gi;
  let m;
  while ((m = propRe.exec(t)) !== null) {
    let street = m[1].trim();
    const bldg = m[2];
    if (isExcludedOfficeAddress(street, bldg)) continue;
    if (/dzia[łl]k|przedmiot|godzin|obr[ęe]b/i.test(street)) continue;
    street = street.replace(/^Placu\b/i, 'Plac');
    const slashApt = m[3] || null;
    const apt = unitNoFromText(text) || slashApt;
    return apt ? `${street} ${bldg}/${apt}` : `${street} ${bldg}`;
  }
  return null;
}

export function landStreetFromText(text) {
  const t = cleanSpacedText(whole(text));
  const m =
    /(?:po[łl]o[żz]on\w*\s+(?:w\s+B[ęe]dzinie\s+)?(?:przy\s+ul\.|przy\s+ulicy|w\s+rejonie\s+ul\.|w\s+rejonie\s+ulicy)\s+)([A-Za-zÀ-žŁłŚśŻżŹźĆćĘęÓóŃńĄą.\- ]+?)(?:\s+oznaczon|\s+wraz|\s+o\s+pow|,|\.|\s+sk[łl]adaj)/i.exec(
      t,
    );
  return m ? m[1].trim() : null;
}

export function unitAreaFromText(text) {
  const m = /pow\w*\.?\s+(?:u[żz]ytkow\w+\s+)?(\d+[.,]\d+)\s*m\s*[²2”"]/i.exec(whole(text));
  return m ? parseNum(m[1]) : null;
}

export function landPlotFromText(text) {
  const t = whole(text);
  const parcels = [];
  const seen = new Set();
  const re = /(?:dzia[łl]k\w*|numer\w*)\s+(?:ewid\w*\.?|geod\w*\.?)?\s*(?:dzia[łl]k\w*)?\s*[:]?\s*(\d+(?:\/\d+)?)/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      parcels.push(m[1]);
    }
  }
  const reMulti =
    /(?:numerami\s+(?:ewidencyjnymi|geodezyjnymi)?(?:\s+dzia[łl]ek)?)\s*[:]?\s*(\d+(?:\/\d+)?)\s*(?:,|i|oraz)\s*(\d+(?:\/\d+)?)/gi;
  while ((m = reMulti.exec(t)) !== null) {
    for (const p of [m[1], m[2]]) {
      if (!seen.has(p)) {
        seen.add(p);
        parcels.push(p);
      }
    }
  }

  let area_m2 = null;
  const am =
    /o\s+(?:[łl][ąa]cznej\s+pow\w*\.?|pow\w*\.?\s+[łl][ąa]cznej|pow\w*\.?|powierzchni)\s*(\d+(?:[.,\s]\d+)?)\s*(ha|m\s*[²2]|\b)/i.exec(
      t,
    );
  if (am) {
    const rawVal = am[1].replace(/\s+/g, '').replace(',', '.');
    const val = Number(rawVal);
    if (Number.isFinite(val) && val > 0) {
      area_m2 = /ha/i.test(am[2]) ? Math.round(val * 10000) : Math.round(val);
    }
  }

  return { dzialka_nr: parcels.length ? parcels.join(', ') : null, area_m2 };
}


export function parseAnnouncement(text) {
  if (!text) return null;
  const kind = kindFromText(text);
  const round = roundFromText(text);
  const auction_date = auctionDateFromText(text);
  const starting_price_pln = startingPriceFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      area_m2: plot.area_m2,
      address_raw,
      starting_price_pln,
      auction_date,
      round,
    };
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const unitArea = unitAreaFromText(text);
  const plot = landPlotFromText(text);
  const area_m2 = unitArea || plot.area_m2;

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
  if (!isResultDoc(text)) return [];
  const notes = [];

  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const achieved = achievedPriceFromText(text);
  const sold = achieved != null;
  const negativeStated = isNegativeOutcome(text);
  const kind = kindFromText(text);

  if (kind === 'grunt') {
    const plot = landPlotFromText(text);
    const address_raw = landStreetFromText(text);
    if (!plot.dzialka_nr && !address_raw) return [];
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');
    return [
      {
        auction_date,
        source_url: sourceUrl,
        kind: 'grunt',
        dzialka_nr: plot.dzialka_nr,
        area_m2: plot.area_m2,
        address_raw,
        round,
        starting_price_pln,
        final_price_pln: sold ? achieved : null,
        outcome: sold ? 'sold' : 'unsold',
        unsold_reason: sold ? null : 'unknown',
        notes,
      },
    ];
  }

  const address_raw = addressRawFromText(text);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (sold && achieved == null) notes.push('parse: sold but missing achieved price');
  if (!sold && !negativeStated) notes.push('parse: no achieved price and no explicit negative outcome');

  const unitArea = unitAreaFromText(text);
  const plot = landPlotFromText(text);
  const area_m2 = unitArea || plot.area_m2;

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
