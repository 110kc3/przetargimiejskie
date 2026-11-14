import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function norm(text) {
  return String(text == null ? '' : text)
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fold(s) {
  return norm(s)
    .toLowerCase()
    .replace(/[ąà]/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/[óò]/g, 'o')
    .replace(/ś/g, 's').replace(/[żź]/g, 'z');
}


export function parsePLN(s) {
  if (s == null) return null;
  const str = norm(s);
  if (!str || /^brak$/i.test(str)) return null;
  const cleaned = str.replace(/[\s .]/g, '');
  const m = /^(\d+)(?:,\d{1,2})?/.exec(cleaned);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function areaToM2(numStr, unit) {
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/ha/i.test(unit)) return Math.round(n * 10000 * 100) / 100;
  return Math.round(n * 100) / 100;
}

export function monthNum(token) {
  const t = fold(token);
  if (/^sty/.test(t)) return '01';
  if (/^lut/.test(t)) return '02';
  if (/^mar/.test(t)) return '03';
  if (/^kwi/.test(t)) return '04';
  if (/^maj/.test(t)) return '05';
  if (/^cze/.test(t)) return '06';
  if (/^lip/.test(t)) return '07';
  if (/^sie/.test(t)) return '08';
  if (/^wrz/.test(t)) return '09';
  if (/^pa[zd]/.test(t)) return '10';
  if (/^lis/.test(t)) return '11';
  if (/^gru/.test(t)) return '12';
  return null;
}

function isoFromDMY(d, monthToken, y) {
  const mo = monthNum(monthToken);
  if (!mo) return null;
  return `${y}-${mo}-${String(d).padStart(2, '0')}`;
}


export function announceDate(text) {
  const t = norm(text);
  const m = /przetarg\s+odb\S+\s+si\S+\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  return m ? isoFromDMY(m[1], m[2], m[3]) : null;
}

export function resultDate(text) {
  const t = norm(text);
  let m = /informuje,?\s+[żz]e\s+dnia\s+(\d{1,2})\s+(\S+)\s+(\d{4})/i.exec(t);
  if (!m) m = /dnia\s+(\d{1,2})\s+([A-Za-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?\s+o\s+godz/i.exec(t);
  return m ? isoFromDMY(m[1], m[2], m[3]) : null;
}


export function roundFromText(text) {
  const m = /(pierwsz\w*|drug\w*|trzeci\w*|czwart\w*|pi[ąa]t\w*|szóst\w*|szost\w*)\s+przetarg\s+ustn/i.exec(
    norm(text),
  );
  if (!m) return null;
  const w = fold(m[1]);
  if (w.startsWith('pierwsz')) return 1;
  if (w.startsWith('drug')) return 2;
  if (w.startsWith('trzeci')) return 3;
  if (w.startsWith('czwart')) return 4;
  if (/^pia?t/.test(w)) return 5;
  if (/^szo?st/.test(w)) return 6;
  return null;
}


export function isResultNotice(text) {
  const f = fold(text);
  return /informacj\w*\s+o\s+wyniku\s+przetargu/.test(f) ||
    (/wynik\w*\s+(?:przetargu|negatywnym)/.test(f) && /cena\s+osiagnieta|zostal\s+przeprowadzony/.test(f));
}

export function isNegativeOutcome(text) {
  const f = fold(text);
  return /wynikiem\s+negatywnym|nikt\s+nie\s+przystapil|nie\s+odnotowano\s+wplat|zakonczyl\s+sie\s+wynikiem\s+negatywnym/.test(f);
}

export function isCancelled(text) {
  const f = fold(text);
  if (/prawo\s+(?:do\s+)?odwolania/.test(f)) return false;
  return /uniewazni|odwolanie\s+przetargu|odwoluje\s+przetarg|przetarg\s+zostal\s+odwolan|o\s+odwolaniu\s+przetargu/.test(f);
}


const MONEY = '(\\d[\\d \\u00a0.]*,\\d{2})';

export function startingPrice(text) {
  const m = new RegExp(`cena\\s+wywo[łl]awcza\\s*[-–—:]?\\s*${MONEY}`, 'i').exec(norm(text));
  return m ? parsePLN(m[1]) : null;
}

export function achievedPrice(text) {
  const t = norm(text);
  const m = new RegExp(`najwy[żz]sza\\s+cena\\s+osi[ąa]gni[ęe]ta\\s+w\\s+przetargu\\s*[-–—:]?\\s*(brak|${MONEY})`, 'i').exec(t);
  if (m && !/^brak$/i.test(m[1])) {
    const p = parsePLN(m[1]);
    if (p) return p;
  }
  const kw = new RegExp(`za\\s+kwot[ęe]\\s+${MONEY}`, 'i').exec(t);
  return kw ? parsePLN(kw[1]) : null;
}

export function buyerName(text) {
  const m = /nabywc[ąa][\s\S]{0,80}?zosta[łl][ao]?\s+(Pan[i]?\s+[A-ZŚŁŻŹĆŃÓĄĘ][^,]{1,60}?)\s+za\s+kwot[ęe]/i.exec(norm(text));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}


const SUBJECT_RE =
  /na\s+sprzeda[żz]y?\s+(.+?)\s+o\s+(?:[łl][ąa]cznej\s+)?pow(?:ierzchni)?\.?\s*(\d+(?:[.,]\d+)?)\s*(m²|m2|m\b|ha)/i;

const ADDR_RE =
  /przy\s+ul\.\s+(.+?)\s+(\d+[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)(?:\s+w\s+K[ęe]trzynie|\s*[,.])/i;

const APT_RE = /lokal\w*\s+(?:nie)?mieszkaln\w*\s+nr\s+(\d+[A-Za-z]?)/i;

function extractObreb(t) {
  const m = /obr[ęe]b\w*\s+(?:nr\s+)?\d+\s+(?:miasta\s+(K[ęe]trzyn)|w\s+miejscowo[śs]ci\s+([A-ZŁŚŻŹ][A-Za-ząćęłńóśźż-]+(?:\s+[A-ZŁŚŻŹ][A-Za-ząćęłńóśźż-]+)?))/i.exec(
    t,
  );
  if (!m) return null;
  if (m[1]) return 'Kętrzyn';
  return m[2] ? m[2].replace(/\s+/g, ' ').trim() : null;
}

function extractParcels(subject) {
  const nums = [...String(subject || '').matchAll(/\bnr\s+(\d+(?:\/\d+)?)/gi)].map((m) => m[1]);
  return nums.length ? [...new Set(nums)].join(', ') : null;
}

export function extractSubject(text) {
  const t = norm(text);
  const sm = SUBJECT_RE.exec(t);
  const subject = sm ? sm[1].trim() : null;
  const area_m2 = sm ? areaToM2(sm[2], sm[3]) : null;
  const kind = classifyKind(subject || t.slice(0, 300));

  if (kind === 'grunt') {
    return {
      kind,
      subject,
      area_m2,
      address: null,
      address_raw: null,
      dzialka_nr: extractParcels(subject) || extractParcels(t),
      obreb: extractObreb(t),
    };
  }

  const am = ADDR_RE.exec(t);
  const aptM = APT_RE.exec(t);
  let address = null;
  let address_raw = null;
  if (am) {
    const street = am[1].replace(/\s+/g, ' ').trim();
    const building = am[2].replace(/\s+/g, '');
    const apt = aptM ? aptM[1] : null;
    address_raw = `${street} ${building}${apt ? `/${apt}` : ''}`;
    address = parseAddress(address_raw);
  }
  return { kind, subject, area_m2, address, address_raw, dzialka_nr: null, obreb: null };
}


export function parseAnnouncement(text, ctx = {}) {
  const t = norm(text);
  if (!t || !/przetarg/i.test(t) || !/sprzeda[żz]/i.test(t)) return null;

  const subj = extractSubject(t);
  if (!subj.address && !subj.dzialka_nr) return null;

  return {
    kind: subj.kind,
    address_raw: subj.address_raw,
    address: subj.address,
    dzialka_nr: subj.dzialka_nr,
    obreb: subj.obreb,
    area_m2: subj.area_m2,
    starting_price_pln: startingPrice(t),
    auction_date: announceDate(t) || ctx.fallbackAuctionDate || null,
    round: roundFromText(t),
    cancelled: isCancelled(t),
    detail_url: ctx.detailUrl || null,
    source_url: ctx.sourceUrl || ctx.detailUrl || null,
  };
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  const t = norm(text);
  if (!t || !isResultNotice(t) || isCancelled(t)) return [];

  const subj = extractSubject(t);
  if (!subj.address && !subj.dzialka_nr) return [];

  const negative = isNegativeOutcome(t);
  const achieved = negative ? null : achievedPrice(t);
  const starting = startingPrice(t);
  const sold = !negative && achieved != null;

  const notes = [];
  if (subj.address?.warning) notes.push(subj.address.warning);
  if (starting == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');
  if (sold && starting != null && achieved < starting) {
    notes.push('parse: achieved price below starting price — verify row');
  }
  const buyer = sold ? buyerName(t) : null;
  if (buyer) notes.push(`nabywca: ${buyer}`);

  return [
    {
      kind: subj.kind,
      address_raw: subj.address_raw,
      address: subj.address,
      dzialka_nr: subj.dzialka_nr,
      obreb: subj.obreb,
      area_m2: subj.area_m2,
      round: roundFromText(t),
      starting_price_pln: starting,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason: sold ? null : negative ? 'negative_no_bidders' : 'unknown',
      auction_date: resultDate(t) || fallbackDate || null,
      source_pdf: sourceUrl,
      notes,
    },
  ];
}
