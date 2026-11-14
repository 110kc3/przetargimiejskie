
import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


export function norm(text) {
  return String(text == null ? '' : text)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fold(s) {
  return norm(s)
    .toLowerCase()
    .replace(/[ąà]/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/[óò]/g, 'o')
    .replace(/ś/g, 's')
    .replace(/[żź]/g, 'z');
}


const PL_MONTHS = {
  stycznia: '01',
  lutego: '02',
  marca: '03',
  kwietnia: '04',
  maja: '05',
  czerwca: '06',
  lipca: '07',
  sierpnia: '08',
  wrzesnia: '09',
  września: '09',
  pazdziernika: '10',
  października: '10',
  listopada: '11',
  grudnia: '12',
};

export function monthNum(token) {
  if (!token) return null;
  return PL_MONTHS[fold(token)] || null;
}

export function parseDMY(dayStr, monthStr, yearStr) {
  const day = String(dayStr).padStart(2, '0');
  const mon = monthNum(monthStr);
  if (!mon) return null;
  return `${yearStr}-${mon}-${day}`;
}

export function announceDate(text) {
  const t = norm(text);
  const m = /(?:przetarg\s+odb[ęe]dzie\s+si[ęe]|termin\s+przetargu)[^.\n]*?(?:w\s+dniu)?\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(
    t,
  );
  if (m) {
    const d = parseDMY(m[1], m[2], m[3]);
    if (d) return d;
  }
  const m2 = /(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*(?:r\.?|roku)?\s+o\s+godz/i.exec(t);
  if (m2) {
    const d = parseDMY(m2[1], m2[2], m2[3]);
    if (d) return d;
  }
  return null;
}

export function resultAuctionDate(text) {
  const t = norm(text);
  let m = /w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*(?:r\.?|roku)?\s+[^.\n]*?\b(?:przeprowadzono|odby[łl]\s+si[ęe])/i.exec(
    t,
  );
  if (m) {
    const d = parseDMY(m[1], m[2], m[3]);
    if (d) return d;
  }

  m = /(?:przeprowadzonego|odby[łl]\s+si[ęe])\s+w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const d = parseDMY(m[1], m[2], m[3]);
    if (d) return d;
  }

  m = /(?:przeprowadzono|odby[łl]\s+si[ęe])\s+[^.\n]*?w\s+dniu\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(t);
  if (m) {
    const d = parseDMY(m[1], m[2], m[3]);
    if (d) return d;
  }

  return null;
}


export function parsePLN(s) {
  if (s == null) return null;
  const str = norm(s);
  if (!str || /brak/i.test(str)) return null;
  const cleaned = str.replace(/[\s\u00a0.]/g, '').replace(',', '.');
  const m = /^(\d+)(?:\.\d{1,2})?/.exec(cleaned);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function startingPrice(text) {
  const m = /Cena\s+wywo[łl]awcza(?:\s+nieruchomo[śs]ci)?(?:\s+wynosi[łl]a)?(?:\s*:\s*|\s*[-–—]\s*)([0-9.,\s\u00a0]+?)(?:\s*(?:z[łl]|z[łl]otych)|\s*\(|$)/i.exec(
    text,
  );
  return m ? parsePLN(m[1]) : null;
}

export function achievedPrice(text) {
  const m = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu(?:\s+wynios[łl]a)?(?:\s*:\s*|\s*[-–—]\s*)([0-9.,\s\u00a0]+?)(?:\s*(?:z[łl]|z[łl]otych)|\s*\(|$)/i.exec(
    text,
  );
  if (m) {
    const val = parsePLN(m[1]);
    if (val != null) return val;
  }
  const m2 = /za\s+kwot[ęe]\s+([0-9.,\s\u00a0]+?)(?:\s*(?:z[łl]|z[łl]otych)|\s*\()/i.exec(text);
  if (m2) {
    const val = parsePLN(m2[1]);
    if (val != null) return val;
  }
  return null;
}


export function areaToM2(numStr, unit) {
  const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/ha/i.test(unit)) return Math.round(n * 10000 * 100) / 100;
  return Math.round(n * 100) / 100;
}

export function extractAreaM2(text, kind) {
  if (kind !== 'grunt') {
    const m = /(?:powierzchnia\s+u[żz]ytkowa(?:\s+budynku)?(?:\s*\(.*?\))?\s*wynosi|o\s+pow(?:ierzchni|\.)?)\s*(\d+[.,]\d+)\s*(m2|m²)/i.exec(
      text,
    );
    if (m) return areaToM2(m[1], m[2]);
  }
  const m2 = /(?:o\s+(?:[łl][aą]cznej\s+)?pow(?:ierzchni|\.)?|dzia[łl]k[ai]\s+nr\s+[^\n,]+?\s+o\s+pow(?:ierzchni|\.)?)\s*(\d+[.,]\d+)\s*(ha|m2|m²)/i.exec(
    text,
  );
  if (m2) return areaToM2(m2[1], m2[2]);
  return null;
}


export function roundFromText(text) {
  const t = text.toLowerCase();
  const m = /\b(i|ii|iii|iv|v|vi)\s+ustn/i.exec(t);
  if (m) {
    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };
    return ROMAN[m[1].toLowerCase()] || null;
  }
  if (/pierwszym\s+przetarg/i.test(t)) return 1;
  if (/drugim\s+przetarg/i.test(t)) return 2;
  if (/trzecim\s+przetarg/i.test(t)) return 3;
  if (/czwartym\s+przetarg/i.test(t)) return 4;
  return null;
}

export function extractParcel(text) {
  const m = /dzia[łl]k[ai]\s+(?:gruntu\s+)?nr\s+([0-9]+(?:\/[0-9]+)?(?:\s*i\s*[0-9]+(?:\/[0-9]+)?)?)/i.exec(text);
  return m ? m[1].trim() : null;
}

export function extractPrecinct(text) {
  const m = /(?:w\s+obr[ęe]bie\s+(?:nr\s+)?|obr[ęe]b\s+(?:nr\s+)?)(\d+)/i.exec(text);
  return m ? m[1].trim() : null;
}

export function extractBuyer(text) {
  const m = /Nabywc[aą]\s+nieruchomo[śs]ci(?:\s+zosta[łl])?:\s*([^\n\r]+)/i.exec(text);
  if (!m) return null;
  const raw = m[1].replace(/\.$/, '').trim();
  if (/brak|nie\s+wy[łl]oniono/i.test(raw)) return null;
  return raw;
}

export function isResultNotice(text) {
  const f = fold(text);
  return /informacja\s+o\s+wyniku|ogloszenie\s+o\s+wyniku|wynik(?:u)?\s+(?:i|ii|iii|iv|v|\d+)?\s*ustnego/i.test(f);
}

export function isNegativeOutcome(text) {
  const f = fold(text);
  return (
    /wynik(?:iem)?\s+negatywn/i.test(f) ||
    /zaden\s+oferent\s+nie\s+wplacil\s+wadium/i.test(f) ||
    /brak\s+ofert\s+kupna/i.test(f) ||
    /nie\s+odnotowano\s+wplaty\s+wadium/i.test(f) ||
    /nie\s+wplynela\s+zadna\s+oferta/i.test(f) ||
    /nie\s+wplacono\s+wadium/i.test(f) ||
    /brak\s+chetnych/i.test(f) ||
    /nie\s+wyloniono\s+nabywcy/i.test(f) ||
    /zakonczyl\s+sie\s+wynikiem\s+negatywnym/i.test(f)
  );
}

export function isCancelled(text) {
  const f = fold(text);
  return /odwolany|uniewazniony|odwolanie\s+przetargu|uniewaznienie\s+przetargu/i.test(f);
}

export function extractSubject(text, title = '') {
  const combined = `${title}\n${text}`;
  let kind = classifyKind(combined);
  if (kind !== 'uzytkowy' && kind !== 'garaz') {
    if (/lokal\w*\s+nr\s+\d+.*?budyn\w*\s+mieszkaln|lokal\w*\s+mieszkaln|lokalu\s+mieszkaln/i.test(combined)) {
      kind = 'mieszkalny';
    }
  }

  let address_raw = null;
  const lokM = /Lokalizacja:[\s\S]*?ul\.\s*([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\/-]+?)(?:\.|\n|\r|$)/i.exec(text);
  if (lokM) {
    address_raw = 'ul. ' + lokM[1].trim();
  }

  if (!address_raw) {
    const m = /położon\w+\s+(?:w\s+Iławie\s+)?przy\s+(?:ul\.|ulicy|Bulwarze)\s*([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\/-]+?)(?:\s*\(|\s*,|\s*\.|\s+w\s+Iławie|\s+w\s+obrębie|\s+oznaczon|\s+stanowiąc|\s+z\s+przeznaczeniem|\s+wraz|\s+o\s+pow|$)/i.exec(
      text,
    );
    if (m && !/Niepodleg[łl]o[śs]ci\s*13/i.test(m[1])) {
      address_raw = 'ul. ' + m[1].trim();
    }
  }

  if (!address_raw) {
    const matches = [...text.matchAll(/(?:przy\s+ul\.|przy\s+ulicy|przy\s+Bulwarze)\s*([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\/-]+?)(?:\s*\(|\s*,|\s*\.|\s+w\s+Iławie|\s+w\s+obrębie|\s+oznaczon|\s+stanowiąc|\s+z\s+przeznaczeniem|\s+wraz|\s+o\s+pow|$)/gi)];
    for (const match of matches) {
      const candidate = match[1].trim();
      if (!/Niepodleg[łl]o[śs]ci\s*13/i.test(candidate)) {
        address_raw = 'ul. ' + candidate;
        break;
      }
    }
  }

  if (!address_raw && title) {
    const m = /(?:przy\s+ul\.|ul\.)\s*([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\/-]+?)(?:\s*\(|\s*,|\s*\.|\s+w\s+Iławie|$)/i.exec(
      title,
    );
    if (m && !/Niepodleg[łl]o[śs]ci\s*13/i.test(m[1])) {
      address_raw = 'ul. ' + m[1].trim();
    }
  }

  if (address_raw && !address_raw.includes('/')) {
    const flatM = /lokal\w*\s+(?:mieszkaln\w*\s+)?nr\s+(\d+[\w-]*)/i.exec(combined);
    if (flatM) {
      address_raw += '/' + flatM[1];
    }
  }

  const address = address_raw ? parseAddress(address_raw) : null;
  const dzialka_nr = extractParcel(combined);
  const obreb = extractPrecinct(combined);
  const area_m2 = extractAreaM2(combined, kind);

  return {
    kind,
    address_raw,
    address,
    dzialka_nr,
    obreb,
    area_m2,
  };
}


export function parseAnnouncement(title, text, detailUrl = null, docUrl = null) {
  const t = norm(text);
  if (!t || isCancelled(t)) return [];

  const subj = extractSubject(t, title);
  if (!subj.address && !subj.dzialka_nr) return [];

  const round = roundFromText(`${title} ${t}`);
  const starting = startingPrice(t);
  const aDate = announceDate(t);

  return [
    {
      kind: subj.kind,
      address_raw: subj.address_raw,
      address: subj.address,
      dzialka_nr: subj.dzialka_nr,
      obreb: subj.obreb,
      area_m2: subj.area_m2,
      starting_price_pln: starting,
      auction_date: aDate,
      round,
      detail_url: detailUrl,
      source_url: docUrl || detailUrl,
    },
  ];
}


export function parseResultDoc(text, fallbackDate = null, sourceUrl = null) {
  const t = norm(text);
  if (!t || !isResultNotice(t) || isCancelled(t)) return [];

  const subj = extractSubject(t);
  if (!subj.address && !subj.dzialka_nr) return [];

  const negative = isNegativeOutcome(t);
  const achieved = negative ? null : achievedPrice(t);
  const starting = startingPrice(t);
  const buyer = negative ? null : extractBuyer(t);
  const sold = !negative && (achieved != null || buyer != null);

  const notes = [];
  if (subj.address?.warning) notes.push(subj.address.warning);
  if (starting == null) notes.push('parse: missing starting price');
  if (!sold && !negative) notes.push('parse: no achieved price and no explicit negative outcome');
  if (sold && starting != null && achieved != null && achieved < starting) {
    notes.push('parse: achieved price below starting price — verify row');
  }
  if (buyer) notes.push(`nabywca: ${buyer}`);

  const aDate = resultAuctionDate(t) || fallbackDate || null;

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
      unsold_reason: sold ? null : 'negative_no_bidders',
      auction_date: aDate,
      source_pdf: sourceUrl,
      notes,
    },
  ];
}
