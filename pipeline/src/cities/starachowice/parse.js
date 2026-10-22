// Starachowice parsers.
// Handles both active announcements and concluded auction results from starachowice.eu.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

export function isResultTitle(title) {
  return /wynik\w*|o\s+wyniku|rozstrzyg/i.test(title || '');
}

export function isExcludedTitle(title) {
  const t = title || '';
  return /\bnajem\b|najmu|dzier[żz]aw|wynajem|ogródk|ogrodk|znicz|stanowisk\w*\s+handlow|wykaz/i.test(t);
}

export function isAnnouncementTitle(title) {
  const t = title || '';
  if (isResultTitle(t)) return false;
  if (isExcludedTitle(t)) return false;
  if (/odwo[łl]ani|uniewa[żz]ni/i.test(t)) return false;
  return /przetarg/i.test(t) && (/sprzeda|zbyci|lokal|nieruchomo|dzia[łl]k/i.test(t));
}

export function parseDatePL(str) {
  if (!str) return null;
  const m1 = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(str);
  if (m1) {
    const mon = PL_MONTHS[m1[2].toLowerCase()];
    if (mon) return `${m1[3]}-${String(mon).padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  const m2 = /(\d{1,2})[.-](\d{1,2})[.-](\d{4})/.exec(str);
  if (m2) {
    return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

export function auctionDateFromText(text, title = '') {
  const t = text || '';
  let m = /(?:odbędzie się w dniu|dnia|odbył się w dniu|w dniu)\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(t);
  if (m) {
    const d = parseDatePL(m[1]);
    if (d) return d;
  }
  return parseDatePL(title);
}

export function roundFromText(title = '', text = '') {
  const combined = `${title} ${text}`;
  const mOrd = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*|piąt\w*|piat\w*|szóst\w*|szost\w*|siódm\w*|siodm\w*|ósm\w*|osm\w*|dziewiąt\w*|dziewiat\w*|dziesiąt\w*|dziesiat\w*)\s+przetarg/i.exec(combined);
  if (mOrd) {
    const w = mOrd[1].toLowerCase();
    if (w.startsWith('pierwsz')) return 1;
    if (w.startsWith('drug')) return 2;
    if (w.startsWith('trzec')) return 3;
    if (w.startsWith('czwart')) return 4;
    if (w.startsWith('piąt') || w.startsWith('piat')) return 5;
    if (w.startsWith('szóst') || w.startsWith('szost')) return 6;
    if (w.startsWith('siódm') || w.startsWith('siodm')) return 7;
    if (w.startsWith('ósm') || w.startsWith('osm')) return 8;
    if (w.startsWith('dziewiąt') || w.startsWith('dziewiat')) return 9;
    if (w.startsWith('dziesiąt') || w.startsWith('dziesiat')) return 10;
  }
  const mRom = /\b(I{1,3}|IV|V|VI{1,3}|IX|X)\s+przetarg/i.exec(combined);
  if (mRom) {
    const rom = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return rom[mRom[1].toUpperCase()] || null;
  }
  return null;
}

export function wadiumDeadlineToISO(text) {
  const t = text || '';
  let m = /wadium[\s\S]{0,100}?(?:wpłacić|wnieść|wpłaty|wniesienia|terminu)[\s\S]{0,60}?do\s+(?:dnia\s+)?(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i.exec(t);
  if (m) return parseDatePL(m[1]);
  m = /terminu\s+(?:na\s+dzień|do\s+dnia)\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{4})[\s\S]{0,80}?wadium/i.exec(t);
  if (m) return parseDatePL(m[1]);
  return null;
}

export function unitAreaFromText(text) {
  const re = /(?:o\s+)?(?:powierzchni|pow\w*\.?)\s*(?:użytkowej\s+)?(\d+(?:\s*[.,]\s*\d+)?)\s*m\s*[²2]/gi;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    const val = parseFloat(m[1].replace(/\s+/g, '').replace(',', '.'));
    const precede = (text || '').slice(Math.max(0, m.index - 60), m.index);
    if (/dzia[łl]k/i.test(precede)) continue;
    if (/piwnic/i.test(precede)) continue;
    if (val > 0) return val;
  }
  return null;
}

export function plotAreaFromText(text) {
  const ha = /o\s+(?:ł\s*[ąa]cznej\s+)?(?:pow|powierzchni)\w*\.?\s+(\d+(?:\s*[.,]\s*\d+)?)\s*ha\b/i.exec(text || '');
  if (ha) {
    const v = Number(ha[1].replace(/\s+/g, '').replace(',', '.'));
    if (v > 0) return Math.round(v * 10000);
  }
  const m2 = /(?:dzia[łl]k\w*|nieruchomo[śs]c\w*)[\s\S]{0,40}?powierzchni\s+(\d+(?:\s*[.,]\s*\d+)?)\s*m\s*[²2]/i.exec(text || '');
  if (m2) {
    const v = Number(m2[1].replace(/\s+/g, '').replace(',', '.'));
    if (v > 0) return Math.round(v);
  }
  return null;
}

export function parcelFromText(text) {
  const t = text || '';
  const multiSection = /(?:dzia[łl]k\w*|dz\.)[:\s]+([\s\S]{1,250}?)(?=\s+dla\s+kt|\s+ksi[ęe]g|\s+cena|\.|$)/i.exec(t);
  if (multiSection) {
    const parcels = [...multiSection[1].matchAll(/(?:nr\s+|numer\s+)(\d+\/\d+|\d+)/gi)].map((m) => m[1]);
    if (parcels.length > 1) {
      return [...new Set(parcels)].join(', ');
    }
  }
  const m = /(?:dzia[łl]k\w*|dz\.)[:\s]*(?:nr\s*|numer\s*)?([0-9\s,/]+(?:\s+i\s+[0-9\s,/]+)?)(?=\s+o\s+(?:ł\s*[ąa]cznej\s+)?pow|\s+obr[ęe]b|\s+dla|\s+powierzchni|\.|$)/i.exec(t);
  if (m) {
    return m[1].replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
  }
  return null;
}

export function obrebFromText(text) {
  const m = /obr[ęe]b\w*\s+([0-9]{4}|[0-9]+)/i.exec(text || '');
  return m ? m[1] : null;
}

export function cleanStreetGenitive(street) {
  if (!street) return street;
  let s = street.trim();
  s = s.replace(/^alei\s+/i, 'Aleja ');
  s = s.replace(/^al\.\s*/i, 'Aleja ');
  if (/skiej$/i.test(s) && !/Marii|Skłodowskiej/i.test(s)) s = s.replace(/skiej$/i, 'ska');
  else if (/ckiej$/i.test(s)) s = s.replace(/ckiej$/i, 'cka');
  else if (/dzkiej$/i.test(s)) s = s.replace(/dzkiej$/i, 'dzka');
  else if (/owej$/i.test(s)) s = s.replace(/owej$/i, 'owa');
  else if (/nej$/i.test(s)) s = s.replace(/nej$/i, 'na');
  else if (/ej$/i.test(s)) s = s.replace(/ej$/i, 'a');
  return s;
}

export function extractFlatAddress(text, title = '') {
  const combined = `${title}\n${text}`;

  // 1) lokal mieszkalny nr <apt> ... ul. <street> <bld>
  let m = /lokal\w*\s+mieszkaln\w*\s+nr\s+([0-9a-zA-Z]+)[\s\S]{0,120}?(?:przy\s+ul\.?|\bul\.?)\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\-]+?)\s+(\d+[a-zA-Z]?)(?:[,\s]|$)/i.exec(combined);
  if (m && !/budynku/i.test(m[2])) {
    const street = cleanStreetGenitive(m[2].trim());
    const raw = `ul. ${street} ${m[3]}/${m[1]}`;
    const parsed = parseAddress(raw);
    if (parsed) return { address_raw: raw, address: parsed };
  }

  // 2) lokal ... nr <apt> ... budynku ... nr <bld> przy ul. <street>
  m = /lokal\w*\s+mieszkaln\w*\s+nr\s+([0-9a-zA-Z]+)[\s\S]{0,150}?budynku\s+(?:mieszkalnym\s+)?(?:wielorodzinnym\s+)?nr\s+(\d+[a-zA-Z]?)\s+przy\s+ul\.?\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\-]+?)(?:[,\s]|$)/i.exec(combined);
  if (m) {
    const street = cleanStreetGenitive(m[3].trim());
    const raw = `ul. ${street} ${m[2]}/${m[1]}`;
    const parsed = parseAddress(raw);
    if (parsed) return { address_raw: raw, address: parsed };
  }

  // 3) PDF table: ul. <street> <bld> \n lokal mieszkalny nr <apt>
  m = /ul\.?\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\-]+?)\s+(\d+[a-zA-Z]?)\s*[\n\r]+\s*lokal\w*\s+mieszkaln\w*\s+nr\s+([0-9a-zA-Z]+)/i.exec(combined);
  if (m) {
    const street = cleanStreetGenitive(m[1].trim());
    const raw = `ul. ${street} ${m[2]}/${m[3]}`;
    const parsed = parseAddress(raw);
    if (parsed) return { address_raw: raw, address: parsed };
  }

  // 4) ul. <street> <bld> ... lokal mieszkalny nr <apt>
  m = /ul\.?\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s\-]+?)\s+(\d+[a-zA-Z]?)[,\s]+(?:mieszczącego się w budynku[\s\S]{0,60}?)?lokal\w*\s+mieszkaln\w*\s+nr\s+([0-9a-zA-Z]+)/i.exec(combined);
  if (m) {
    const street = cleanStreetGenitive(m[1].trim());
    const raw = `ul. ${street} ${m[2]}/${m[3]}`;
    const parsed = parseAddress(raw);
    if (parsed) return { address_raw: raw, address: parsed };
  }

  return null;
}

export function extractLandAddress(text, title = '') {
  const combined = `${title}\n${text}`;

  // 1) Look for "położon... przy ul. <street> [bld]"
  let m = /po[łl]o[żz]on\w*[\s\S]{0,60}?(?:przy\s+ul\.?|\bul\.?)\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\t \-]+?)(?:\s+(\d+[a-zA-Z]?))?(?=[,\.\n\r]|\s+w\s+Starachowicach|\s+oznaczon|\s+stanowi|\s+obr[ęe]b|\s+dla|\s+jako\s+dzia[łl]k|$)/i.exec(combined);
  if (m && !/dzia[łl]k|obr[ęe]b|budynku|siedzib/i.test(m[1])) {
    const street = cleanStreetGenitive(m[1].trim());
    const bld = m[2] ? m[2].trim() : null;
    const raw = bld ? `ul. ${street} ${bld}` : `ul. ${street}`;
    if (!/Radomska 45/i.test(raw)) {
      const parsed = parseAddress(raw);
      return { address_raw: raw, address: parsed };
    }
  }

  // 2) Look in title: "przy ul. <street> [bld]"
  m = /(?:przy\s+ul\.?|\bul\.?)\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\t \-]+?)(?:\s+(\d+[a-zA-Z]?))?(?=[,\.\n\r]|\s+w\s+Starachowicach|\s+oznaczon|\s+stanowi|\s+obr[ęe]b|\s+dla|\s+jako\s+dzia[łl]k|$)/i.exec(title || '');
  if (m && !/dzia[łl]k|obr[ęe]b|budynku/i.test(m[1])) {
    const street = cleanStreetGenitive(m[1].trim());
    const bld = m[2] ? m[2].trim() : null;
    const raw = bld ? `ul. ${street} ${bld}` : `ul. ${street}`;
    if (!/Radomska 45/i.test(raw)) {
      const parsed = parseAddress(raw);
      return { address_raw: raw, address: parsed };
    }
  }

  // 3) General fallback in text (excluding Radomska 45)
  m = /(?:przy\s+ul\.?|\bul\.?)\s*([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\t \-]+?)(?:\s+(\d+[a-zA-Z]?))?(?=[,\.\n\r]|\s+w\s+Starachowicach|\s+oznaczon|\s+stanowi|\s+obr[ęe]b|\s+dla|\s+jako\s+dzia[łl]k|$)/i.exec(combined);
  if (m && !/dzia[łl]k|obr[ęe]b|budynku/i.test(m[1])) {
    const street = cleanStreetGenitive(m[1].trim());
    const bld = m[2] ? m[2].trim() : null;
    const raw = bld ? `ul. ${street} ${bld}` : `ul. ${street}`;
    if (!/Radomska 45/i.test(raw)) {
      const parsed = parseAddress(raw);
      return { address_raw: raw, address: parsed };
    }
  }

  return null;
}

export function extractPriceAndWadium(text) {
  let starting_price_pln = null;
  let wadium_pln = null;

  const mPrice = /(?:cena\s+wywoławcza\s+brutto|cena\s+brutto|cena\s+wywoławcza)[\s\S]{0,60}?(\d{1,3}(?:[ .\xa0]\d{3})*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  if (mPrice) {
    starting_price_pln = Math.round(parseFloat(mPrice[1].replace(/[ .\xa0]/g, '').replace(',', '.')));
  }

  const mWad = /(?:wadium|kwocie)[\s\S]{0,50}?(\d{1,3}(?:[ .\xa0]\d{3})*(?:,\d{2})?)\s*z[łl]/i.exec(text || '');
  if (mWad) {
    wadium_pln = Math.round(parseFloat(mWad[1].replace(/[ .\xa0]/g, '').replace(',', '.')));
  }

  return { starting_price_pln, wadium_pln };
}

export function extractResultOutcomeAndPrices(text) {
  const isSold = /pozytywn/i.test(text || '');
  const outcome = isSold ? 'sold' : 'unsold';

  const allPrices = [...(text || '').matchAll(/(\d{1,3}(?:[ .\xa0]\d{3})*(?:,\d{2})?)\s*z[łl]/gi)]
    .map((m) => Math.round(parseFloat(m[1].replace(/[ .\xa0]/g, '').replace(',', '.'))))
    .filter((p) => p >= 1000);

  let starting_price_pln = null;
  let final_price_pln = null;

  if (isSold) {
    if (allPrices.length >= 2) {
      starting_price_pln = allPrices[0];
      final_price_pln = allPrices[1];
    } else if (allPrices.length === 1) {
      final_price_pln = allPrices[0];
    }
  } else {
    if (allPrices.length >= 1) {
      starting_price_pln = allPrices[0];
    }
  }

  let unsold_reason = null;
  if (outcome === 'unsold') {
    if (/nie\s+wp[łl]yn[ęe][łl]o\s+ani\s+jedno\s+wadium|brak\s+wadium/i.test(text || '')) {
      unsold_reason = 'brak wadium';
    } else if (/brak\s+ofert/i.test(text || '')) {
      unsold_reason = 'brak ofert';
    } else {
      unsold_reason = 'brak ofert';
    }
  }

  return { outcome, starting_price_pln, final_price_pln, unsold_reason };
}

export function parseAnnouncement(title, text, url, docUrl) {
  const combined = `${title}\n${text}`;
  const kind = classifyKind(combined);
  const auction_date = auctionDateFromText(text, title);
  const round = roundFromText(title, text);
  const wadium_deadline = wadiumDeadlineToISO(text);
  const { starting_price_pln, wadium_pln } = extractPriceAndWadium(text);

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text) || parcelFromText(title);
    const obreb = obrebFromText(text) || obrebFromText(title);
    const area_m2 = plotAreaFromText(text);
    const addr = extractLandAddress(text, title);
    if (!dzialka_nr && !addr) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw: addr?.address_raw || null,
      address: addr?.address || null,
      starting_price_pln,
      auction_date,
      round,
      wadium_deadline,
      wadium_pln,
      detail_url: url,
      source_url: docUrl || url,
    }];
  }

  const addr = extractFlatAddress(text, title) || extractLandAddress(text, title);
  if (!addr) return [];
  const area_m2 = unitAreaFromText(text) || (kind === 'zabudowana' ? plotAreaFromText(text) : null);

  return [{
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    wadium_deadline,
    wadium_pln,
    detail_url: url,
    source_url: docUrl || url,
  }];
}

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultTitle(text)) return [];

  const kind = classifyKind(text);
  const auction_date = auctionDateFromText(text) || fallbackDate || null;
  const round = roundFromText('', text);
  const { outcome, starting_price_pln, final_price_pln, unsold_reason } = extractResultOutcomeAndPrices(text);

  const notes = [];
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  if (outcome === 'sold' && final_price_pln == null) notes.push('parse: sold but missing achieved price');

  if (kind === 'grunt') {
    const dzialka_nr = parcelFromText(text);
    const obreb = obrebFromText(text);
    const area_m2 = plotAreaFromText(text);
    const addr = extractLandAddress(text);
    if (!dzialka_nr && !addr) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw: addr?.address_raw || null,
      round,
      starting_price_pln,
      final_price_pln,
      outcome,
      unsold_reason,
      notes,
    }];
  }

  const addr = extractFlatAddress(text) || extractLandAddress(text);
  if (!addr) return [];
  const area_m2 = unitAreaFromText(text) || (kind === 'zabudowana' ? plotAreaFromText(text) : null);

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw: addr.address_raw,
    address: addr.address,
    round,
    starting_price_pln,
    final_price_pln,
    outcome,
    unsold_reason,
    area_m2,
    notes,
  }];
}
