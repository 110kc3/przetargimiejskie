// Sztum parsers — extracts municipal auctions, rokowań, and results.
//
// Document patterns on bip.sztum.pl (single mixed board 1186.html):
//   - Announcements: "OGŁOSZENIE O ... PRZETARGU / ROKOWANIACH NA SPRZEDAŻ"
//     Structured 2-column or labelled notice with address, usable area,
//     starting price (cena wywoławcza), auction date and round.
//   - Results: "INFORMACJA o wyniku ... przetargu / rokowań"
//     Carries exact auction date ("1. W dniu DD miesiąc YYYY r. ..."),
//     address/parcel ("2. Przedmiotem przetargu był..."), starting price,
//     achieved price ("Najwyższa cena osiągnięta...: [price] zł" or negative
//     marker "do przetargu nie przystąpił żaden oferent" / "-"), round.
//   - Wykazy: "WYKAZ NIERUCHOMOŚCI PRZEZNACZONYCH DO SPRZEDAŻY"
//     Pre-auction designation carrying address, area, estimated value.

import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: '01', lutego: '02', marca: '03', kwietnia: '04', maja: '05', czerwca: '06',
  lipca: '07', sierpnia: '08', września: '09', wrzesnia: '09',
  października: '10', pazdziernika: '10', listopada: '11', grudnia: '12',
};

export function parsePLN(numStr) {
  if (!numStr) return null;
  const cleaned = String(numStr)
    .replace(/\s+|[\u00a0\u202f]/g, '')
    .replace(/[.,]00(?:\s*zł)?$/i, '')
    .replace(/zł.*$/i, '')
    .replace(/,/g, '.');
  const n = Math.round(parseFloat(cleaned));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseArea(numStr) {
  if (numStr == null) return null;
  const cleaned = String(numStr).replace(/\s+|[\u00a0\u202f]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function parsePolishDate(str) {
  if (!str) return null;
  const trimmed = str.trim();
  const dotM = /^(\d{1,2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (dotM) {
    const d = dotM[1].padStart(2, '0');
    return `${dotM[3]}-${dotM[2]}-${d}`;
  }
  const wordM = /^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})(?:\s*r\.?)?$/i.exec(trimmed);
  if (wordM) {
    const mon = PL_MONTHS[wordM[2].toLowerCase()];
    if (mon) {
      const d = wordM[1].padStart(2, '0');
      return `${wordM[3]}-${mon}-${d}`;
    }
  }
  return null;
}

function wordToRound(w) {
  const s = w.toLowerCase();
  if (/^pi[e]?r[w]?sz|^i$/i.test(s)) return 1;
  if (/^drug|^ii$/i.test(s)) return 2;
  if (/^trzec|^iii$/i.test(s)) return 3;
  if (/^czwart|^iv$/i.test(s)) return 4;
  if (/^pi[ąa]t|^v$/i.test(s)) return 5;
  if (/^sz[óo]st|^vi$/i.test(s)) return 6;
  if (/^si[óo]dm|^vii$/i.test(s)) return 7;
  if (/^[óo]sm|^viii$/i.test(s)) return 8;
  if (/^dziewi[ąa]t|^ix$/i.test(s)) return 9;
  if (/^dziesi[ąa]t|^x$/i.test(s)) return 10;
  return null;
}

export function roundFromText(text) {
  if (!text) return null;
  const t = String(text);
  const m = /\b(pierwsz\w*|piersz\w*|drug\w*|trzec\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*|x|ix|viii|vii|vi|v|iv|iii|ii|i)\s+(?:ustn\w+\s+)?(?:nieograniczon\w+\s+|ograniczon\w+\s+)?(?:przetarg\w*|rokowa[nń]\w*)/i.exec(t);
  if (m) return wordToRound(m[1]);
  const m2 = /(?:o\s+wynik\w*\s+)\b(pierwsz\w*|piersz\w*|drug\w*|trzec\w*|czwart\w*|pi[ąa]t\w*|sz[óo]st\w*|si[óo]dm\w*|[óo]sm\w*|dziewi[ąa]t\w*|dziesi[ąa]t\w*|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/i.exec(t);
  if (m2) return wordToRound(m2[1]);
  return null;
}

export function isSkippableTitle(t) {
  if (!t) return true;
  // auxiliary forms, declarations, GDPR, attachments
  if (/zgłoszenie|oświadczenie|rodo|formularz|mapa|klauzula|załącznik\s+\d/i.test(t)) return true;
  // noise: waste, waters, grants, social services, election, hunting
  if (/odpad|śmieci|wody\s+polskie|konsultacj|stypend|dotacj|zezwolen|planu\s+deinstytucjonalizacji|petycj|wyborcz|łowieck/i.test(t)) return true;
  // pure lease/rent without sale
  if (/dzierżaw|najm|użyczen/i.test(t) && !/sprzeda/i.test(t)) return true;
  return false;
}

export function isResultTitle(t) {
  return /wynik/i.test(t || '');
}

export function isAnnouncementTitle(t) {
  const s = String(t || '');
  if (isResultTitle(s) || isSkippableTitle(s)) return false;
  return /ogłoszenie|ogłasza|przetarg|rokowan/i.test(s);
}

export function isWykazTitle(t) {
  const s = String(t || '');
  if (isSkippableTitle(s)) return false;
  return /wykaz/i.test(s);
}

function normalizeStreetCase(street) {
  if (!street) return street;
  if (street === street.toUpperCase()) {
    return street
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return street;
}

export function addressRawFromText(text, fallbackTitle = '') {
  const combined = (text ? text.slice(0, 3000) : '') + '\n' + (fallbackTitle || '');

  // 1. "ul. Street Bldg/Apt" (e.g. "ul. Nowowiejskiego 18/1A", "ul. Jagiełły 6/6")
  const slashMatch = /(?:ul\.|ulicy|przy\s+ulicy|przy\s+ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)?)\s+(\d+[A-Za-z]?)\s*\/\s*(\d+[A-Za-z]?)/i.exec(combined);
  if (slashMatch) {
    const street = normalizeStreetCase(slashMatch[1].trim());
    return `ul. ${street} ${slashMatch[2]}/${slashMatch[3]}`;
  }

  // 2. "lokal mieszkalny nr <apt> ... budynku nr <bldg> przy ul. <street>"
  const bldgFirstM = /lokal\w*\s+mieszkaln\w*\s+(?:nr\s+)?(\d+[A-Za-z]?)[^.\n]*?budynk\w*\s+(?:nr\s+)?(\d+[A-Za-z]?)[^.\n]*?(?:przy\s+)?(?:ul\.|ulicy)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)?)/i.exec(combined);
  if (bldgFirstM) {
    const street = normalizeStreetCase(bldgFirstM[3].trim());
    return `ul. ${street} ${bldgFirstM[2]}/${bldgFirstM[1]}`;
  }

  // 3. "lokal mieszkalny nr <apt> ... przy ul. <street> <bldg>"
  const streetFirstM = /lokal\w*\s+mieszkaln\w*\s+(?:nr\s+)?(\d+[A-Za-z]?)[^.\n]*?(?:przy\s+)?(?:ul\.|ulicy)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)?)\s+(\d+[A-Za-z]?)/i.exec(combined);
  if (streetFirstM) {
    const street = normalizeStreetCase(streetFirstM[2].trim());
    return `ul. ${street} ${streetFirstM[3]}/${streetFirstM[1]}`;
  }

  // 4. Fallback for building without apt: "ul. Street Bldg"
  const bldgMatch = /(?:ul\.|ulicy|przy\s+ulicy|przy\s+ul\.)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)?)\s+(\d+[A-Za-z]?)(?:[,\s.]|$)/i.exec(combined);
  if (bldgMatch) {
    const street = normalizeStreetCase(bldgMatch[1].trim());
    return `ul. ${street} ${bldgMatch[2]}`;
  }

  return null;
}

export function plotFromText(text, fallbackTitle = '') {
  const combined = (text ? text.slice(0, 3000) : '') + '\n' + (fallbackTitle || '');

  let dzialka_nr = null;
  const plotM = /dzia[łl](?:k\w*|ek)\s+(?:budowlan\w*\s+)?(?:o\s+numer\w*\s+)?(?:nr\s+|numer\s+)?((?:\d+(?:\/\d+)?(?:\s*,\s*|\s+i\s+)?)+)/i.exec(combined);
  if (plotM) {
    dzialka_nr = plotM[1].trim().replace(/[,\s]+$/, '');
  }

  let area_m2 = null;
  const haM = /o\s+pow(?:ierzchni|\.)\s*(?:[łl][ąa]cznej\s+)?([0-9]+[.,][0-9]{1,4})\s*ha\b/i.exec(combined);
  if (haM) {
    const val = parseFloat(haM[1].replace(',', '.'));
    if (val > 0) area_m2 = Math.round(val * 10000);
  } else {
    const m2M = /o\s+pow(?:ierzchni|\.)\s*([0-9]+[.,]?[0-9]*)\s*m2\b/i.exec(combined);
    if (m2M) {
      const val = parseFloat(m2M[1].replace(',', '.'));
      if (val > 0) area_m2 = Math.round(val);
    }
  }

  let obreb = null;
  const obrebM = /\b(?:obr\.|obr[ęe]bie|obr[ęe]b)\s+([0-9A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s-]+?)(?=\s+o\s+pow|\s+dla\s+kt|\s+ul\.|\s*,|\s*\.|\s*$|\s*\n)/i.exec(combined);
  if (obrebM) {
    obreb = obrebM[1].trim();
  }

  return { dzialka_nr, area_m2, obreb };
}

export function kwFromText(text) {
  if (!text) return null;
  const m = /\b([A-Z0-9]{4}\/[0-9]{8}\/[0-9])\b/.exec(text);
  return m ? m[1] : null;
}

export function unitAreaFromText(text) {
  if (!text) return null;
  const m = /(?:powierzchnia\s+u[żz]ytkowa|pow\.\s+u[żz]ytkow[ąa]|powierzchni\s+u[żz]ytkowej)\s*(?:lokalu\s*)?(?:wynosi\s*)?([0-9]+[.,][0-9]{1,2})\s*m2/i.exec(text);
  if (m) return parseArea(m[1]);
  const m2 = /lokal\w*\s+mieszkaln\w*[\s\S]{0,100}?o\s+pow(?:ierzchni|\.)\s*(?:u[żz]ytkowej\s*)?([0-9]+[.,][0-9]{1,2})\s*m2/i.exec(text);
  if (m2) return parseArea(m2[1]);
  return null;
}

export function startingPriceFromText(text) {
  if (!text) return null;
  const m = /(?:Cena\s+wywo[łl]awcza|Cena\s+wywo[łl]awcz[ąa])\s*(?:\([^)]*\)\s*)?(?:za\s+udzia[łl][^:\n]*)?\s*[:\s-]\s*([0-9]{1,3}(?:[ .\u00a0][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/i.exec(text);
  if (m) return parsePLN(m[1]);
  const idx = text.search(/Cena\s+wywo[łl]awcza/i);
  if (idx !== -1) {
    const windowBefore = text.slice(Math.max(0, idx - 120), idx);
    const mBefore = /([0-9]{1,3}(?:[ .\u00a0][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl](?:\s*[*+])?[\s\n]*$/i.exec(windowBefore.trim());
    if (mBefore) return parsePLN(mBefore[1]);
  }
  return null;
}

export function achievedPriceFromResult(text) {
  if (!text) return null;
  const m = /(?:Najwyższa\s+cena\s+osi[ąa]gni[ęe]ta|Cena\s+osi[ąa]gni[ęe]ta|Najkorzystniejsza\s+oferta)[\s\S]{0,50}?[=:]\s*([0-9]{1,3}(?:[ .\u00a0][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/i.exec(text);
  if (!m) return null;
  return parsePLN(m[1]);
}

export function auctionDateFromAnnouncement(text) {
  if (!text) return null;
  const m = /(?:przetarg\w*\s+odb[ęe]d[ąa]\s+si[ęe]|przetarg\w*\s+odb[ęe]dzie\s+si[ęe]|rokowania\s+zostan[ąa]\s+przeprowadzone|rokowania\s+odb[ęe]d[ąa]\s+si[ęe])[\s\S]{0,120}?(?:w\s+dniu|dnia)?\s*([0-9]{1,2}(?:\s+[a-ząćęłńóśźż]+|\.[0-9]{2}\.)\s+[0-9]{4})/i.exec(text);
  if (m) return parsePolishDate(m[1]);
  return null;
}

export function auctionDateFromResult(text) {
  if (!text) return null;
  const m = /1\.\s*W\s+dniu\s+([0-9]{1,2}\s+[a-ząćęłńóśźż]+\s+[0-9]{4})\s+r\./i.exec(text);
  if (m) return parsePolishDate(m[1]);
  const m2 = /W\s+dniu\s+([0-9]{1,2}\s+[a-ząćęłńóśźż]+\s+[0-9]{4})\s+r\./i.exec(text);
  if (m2) return parsePolishDate(m2[1]);
  return null;
}

export function parseAnnouncement(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = classifyKind(t.slice(0, 600));
  const isLand = kind === 'grunt';

  const round = roundFromText(t);
  const auction_date = auctionDateFromAnnouncement(t);
  const starting_price_pln = startingPriceFromText(t);
  const kw = kwFromText(t);
  const notes = [];
  if (/rokowa[nń]/i.test(t)) notes.push('procedure: rokowania');

  if (isLand) {
    const plot = plotFromText(t, ctx.title);
    if (!plot.dzialka_nr) return null;
    return {
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      auction_date,
      starting_price_pln,
      round,
      kw,
      notes,
    };
  }

  const address_raw = addressRawFromText(t, ctx.title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;
  if (address.warning) notes.push(address.warning);

  const area_m2 = unitAreaFromText(t);

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    starting_price_pln,
    auction_date,
    round,
    kw,
    notes,
  };
}

export function parseResultDoc(text, fallbackDate, sourceUrl, ctx = {}) {
  if (!text) return [];
  const t = text.replace(/\r/g, '');
  const isResult = /informacja\s+o\s+wynik/i.test(t) || /o\s+wynik/i.test(t);
  if (!isResult) return [];

  const notes = [];
  if (/rokowa[nń]/i.test(t)) notes.push('procedure: rokowania');

  const auction_date = auctionDateFromResult(t) || fallbackDate || null;
  const round = roundFromText(t);
  const starting_price_pln = startingPriceFromText(t);
  const achieved = achievedPriceFromResult(t);
  const kw = kwFromText(t);

  const sold = achieved != null;
  const unsold_reason = sold ? null : 'unknown';

  const kind = classifyKind(t.slice(0, 600));
  const isLand = kind === 'grunt';

  if (isLand) {
    const plot = plotFromText(t, ctx.title);
    if (!plot.dzialka_nr) return [];
    return [{
      auction_date,
      source_pdf: sourceUrl,
      kind: 'grunt',
      dzialka_nr: plot.dzialka_nr,
      obreb: plot.obreb,
      area_m2: plot.area_m2,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason,
      kw,
      notes,
    }];
  }

  const address_raw = addressRawFromText(t, ctx.title);
  if (!address_raw) return [];
  const address = parseAddress(address_raw);
  if (!address) return [];
  if (address.warning) notes.push(address.warning);

  const area_m2 = unitAreaFromText(t);

  return [{
    auction_date,
    source_pdf: sourceUrl,
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    round,
    starting_price_pln,
    final_price_pln: sold ? achieved : null,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason,
    area_m2,
    kw,
    notes,
  }];
}

export function parseWykaz(text, ctx = {}) {
  if (!text) return null;
  const t = text.replace(/\r/g, '');
  const kind = classifyKind(t.slice(0, 600));
  if (kind === 'grunt') return null;

  const address_raw = addressRawFromText(t, ctx.title);
  if (!address_raw) return null;
  const address = parseAddress(address_raw);
  if (!address) return null;

  const area_m2 = unitAreaFromText(t);
  const mVal = /(?:Warto[śs][ćc]\s+nieruchomo[śs]ci|Cena\s+nieruchomo[śs]ci|Cena\s+wywo[łl]awcza)[\s\S]{0,50}?([0-9]{1,3}(?:[ .\u00a0][0-9]{3})*(?:,[0-9]{2})?)\s*z[łl]/i.exec(t);
  const estimated_price_pln = mVal ? parsePLN(mVal[1]) : null;

  return {
    kind: kind === 'unknown' ? 'mieszkalny' : kind,
    address_raw,
    address,
    area_m2,
    estimated_price_pln,
    source_url: ctx.source_url,
    detail_url: ctx.detail_url,
  };
}
