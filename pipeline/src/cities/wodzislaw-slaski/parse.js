// Wodzisław Śląski parser.
//
// Extracts residential flats, houses, commercial premises, and land from
// municipal property auction announcements (IAG-Opost) and result notices (NWP)
// published via FINN.pl eUrząd.
//
// Text is extracted from born-digital PDFs.
// Key nuances handled:
//   - Multi-lot flat notices (e.g. PCK 16/11 + os. 1 Maja 35/19 in one PDF).
//   - Numbered streets ("ul. 26 Marca") and estate names ("os. 1 Maja").
//   - Municipal office venue ("ul. Bogumińska 4A/4B") is guarded against matching
//     as property address.
//   - Staircase notation on os. 1 Maja ("27/I/1" / "27/1/1" -> building 27, apt 1).
//   - Achieved price, buyer, and negative outcome parsing for results.

import { parseAddress } from '../../core/normalize.js';
import {
  parsePLN,
  areaFromText as finnAreaFromText,
  auctionDateFromText,
} from '../../core/finn-bip.js';
import { classifyKind } from '../../core/classify-kind.js';

const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10,
  pazdziernika: 10, listopada: 11, grudnia: 12,
};

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

/** Is this document a result notice ("Informacja o wyniku przetargu")? */
export function isResultNotice(text) {
  return /informacj\w*\s+o\s+wyniku\s+przetarg|wynik\w*\s+przetarg/i.test(text || '');
}

/** Is this an open sale auction announcement? Drops rentals, tenant-purchases, and cancellations. */
export function isSaleAnnouncement(title, text = '') {
  const t = (title || '').toLowerCase();
  if (isResultNotice(t)) return false;
  if (/informacj\w*\s+o\s+wyniku|wynik\w*\s+przetarg/i.test(t)) return false;
  if (/o\s+odwo[łl]aniu\s+przetarg|uniewa[żz]ni/i.test(t)) return false;
  if (/\bnajem\b|najmu|dzier[żz]aw|wynajem/i.test(t)) return false;
  if (/bezprzetarg|na\s+rzecz\s+najemc/i.test(t)) return false;
  if (!/przetarg/i.test(t)) return false;
  return /sprzeda|zbyci/i.test(t) || /sprzeda|zbyci/i.test(text || '');
}

/** Resolve kind: 'mieszkalny' | 'grunt' | 'zabudowana' | 'uzytkowy' | 'garaz' | 'unknown' */
export function classifyAssetKind(title, text = '') {
  const combined = `${title || ''} ${text || ''}`;
  if (/lokal\w*\s+mieszkaln|sp[óo][łl]dzielcz\w*\s+w[łl]asno[śs]ciow\w*\s+praw\w*\s+do\s+lokalu/i.test(combined)) {
    return 'mieszkalny';
  }
  if (/nieruchomo[śs]\w*\s+gruntow\w*\s+zabudowan/i.test(combined)) {
    return 'zabudowana';
  }
  if (/nieruchomo[śs]\w*\s+gruntow\w*\s+niezabudowan|dzia[łl]k\w*\s+(?:nr|niezabudowan)/i.test(combined)) {
    return 'grunt';
  }
  if (/lokal\w*\s+u[żz]ytkow/i.test(combined)) {
    return 'uzytkowy';
  }
  if (/gara[żz]/i.test(combined)) {
    return 'garaz';
  }
  return classifyKind(combined);
}

/** Extract round from text/title. */
export function roundFromText(text) {
  const t = text || '';
  if (/pierwsz(?:y|ego|ym)?\s+przetarg/i.test(t) || /\bI\s+przetarg/i.test(t)) return 1;
  if (/drugi(?:ego|m)?\s+przetarg/i.test(t) || /\bII\s+przetarg/i.test(t)) return 2;
  if (/trzeci(?:ego|m)?\s+przetarg/i.test(t) || /\bIII\s+przetarg/i.test(t)) return 3;
  if (/czwart(?:y|ego|ym)?\s+przetarg/i.test(t) || /\bIV\s+przetarg/i.test(t)) return 4;
  if (/pi[ąa]t(?:y|ego|ym)?\s+przetarg/i.test(t) || /\bV\s+przetarg/i.test(t)) return 5;
  if (/sz[óo]st(?:y|ego|ym)?\s+przetarg/i.test(t) || /\bVI\s+przetarg/i.test(t)) return 6;
  const m = /\b(VIII|VII|VI|IX|IV|V|X|I{1,3})\s+(?:ustn\w+\s+)?przetarg/i.exec(t);
  if (m) return ROMAN[m[1].toUpperCase()] ?? null;
  return /przetarg/i.test(t) ? 1 : null;
}

/** Announcement auction date. */
export function announcementDateFromText(text) {
  return auctionDateFromText(text);
}

/** Result notice auction date. Anchored on "został przeprowadzony ... w dniu <date>". */
export function resultDateFromText(text) {
  const t = text || '';
  const m =
    /(?:dnia|w\s+dniu)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?[\s\S]{0,140}?(?:zosta[łl]\s+przeprowadzony|przeprowadzono)/i.exec(t) ||
    /(?:zosta[łl]\s+przeprowadzony|przeprowadzono)[\s\S]{0,80}?(?:w\s+dniu|dnia)\s+(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})\s*r\.?/i.exec(t);
  if (m) {
    const mon = PL_MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  const mNum =
    /(?:dnia|w\s+dniu)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r\.?[\s\S]{0,140}?(?:zosta[łl]\s+przeprowadzony|przeprowadzono)/i.exec(t) ||
    /(?:zosta[łl]\s+przeprowadzony|przeprowadzono)[\s\S]{0,80}?(?:w\s+dniu|dnia)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*r\.?/i.exec(t);
  if (mNum) {
    return `${mNum[3]}-${String(mNum[2]).padStart(2, '0')}-${String(mNum[1]).padStart(2, '0')}`;
  }
  return auctionDateFromText(t);
}

/** Starting price from text. */
export function startingPriceFromText(text) {
  const m = /cen[aąęy]\s+wywo[łl]awcz[aąeyj]*(?:\s+nieruchomo[śs]ci)?(?:\s+(?:netto|brutto))?[\s\S]{0,140}?([\d][\d.,\s\u00a0-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Achieved (hammer) price from result text. */
export function achievedPriceFromText(text) {
  const m = /najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta[\s\S]{0,140}?([\d][\d.,\s\u00a0-]*?)\s*z[łl]/i.exec(text || '');
  return m ? parsePLN(m[1]) : null;
}

/** Outcome and unsold reason. */
export function outcomeFromText(text) {
  const t = text || '';
  if (/zako[ńn]czony\s+wynikiem\s+pozytywnym/i.test(t)) {
    return { outcome: 'sold', unsold_reason: null };
  }
  if (/zako[ńn]czony\s+wynikiem\s+negatywnym/i.test(t)) {
    let unsold_reason = null;
    if (/liczba\s+os[óo]b\s+dopuszczonych[^:]*:\s*0/i.test(t) || /nikt\s+nie\s+przyst[ąa]pi[łl]/i.test(t)) {
      unsold_reason = 'brak uczestników';
    } else if (/brak\s+ofert/i.test(t)) {
      unsold_reason = 'brak ofert';
    } else {
      unsold_reason = 'wynik negatywny';
    }
    return { outcome: 'unsold', unsold_reason };
  }
  return { outcome: null, unsold_reason: null };
}

/** Buyer name from result notice. */
export function buyerFromText(text) {
  const m =
    /(?:Nabywc[aą]\s+(?:przedmiotowej\s+)?nieruchomo[śs]ci|Nabywcą\s+(?:przedmiotowej\s+)?nieruchomo[śs]ci\s+zosta[łl]|Nabywca)\s*:\s*([^.\n\r]+)/i.exec(text || '');
  if (!m) return null;
  const b = m[1].replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim();
  return b.length > 2 && b.length < 100 ? b : null;
}

/** Area of flat or house in m². */
export function areaFromText(text) {
  return finnAreaFromText(text);
}

/** Clean source text of town hall venue references. */
function stripVenue(text) {
  return (text || '')
    .replace(/w\s+siedzibie\s+Urz[ęe]du\s+Miasta[^\n.]*przy\s+ul\.\s+Bogumi[ńn]skiej\s+[\w/]+/gi, ' ')
    .replace(/Urz[ęe]dzie\s+Miasta[^\n.]*przy\s+ul\.\s+Bogumi[ńn]skiej\s+[\w/]+/gi, ' ')
    .replace(/Urz[ęe]du\s+Miasta[^\n.]*przy\s+ul\.\s+Bogumi[ńn]skiej\s+[\w/]+/gi, ' ')
    .replace(/przy\s+ul\.\s+Bogumi[ńn]skiej\s+4[ABab]/gi, ' ');
}

/**
 * Extract keyed address from title and text.
 * Specialised for Wodzisław Śląski:
 *   - "os. 1 Maja 27/I/1" / "os. 1 Maja 27/1/1" -> "os. 1 Maja 27/1"
 *   - "ul. 26 Marca 29/15" -> "ul. 26 Marca 29/15"
 *   - "ul. kard. Stefana Wyszyńskiego 26/14"
 *   - "ul. PCK 16/11"
 *   - "ul. Leonida Teligi 69" (house)
 *   - "ul. Chrobrego 229" (house)
 */
export function addressFromText(title, text) {
  const cleanText = stripVenue(text || '');

  // Look in text first when text is a scoped part, then fallback to title
  const sources = cleanText ? [cleanText, title || ''] : [title || ''];

  for (const src of sources) {
    if (!src) continue;

    // Pattern 1: os. 1 Maja variations
    const m1a = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+)(?:\/([IVX\d]+))?\/(\d+)[\s\S]{0,100}?os\.\s*1\s+Maja/i.exec(src);
    if (m1a) {
      const bldg = m1a[1];
      const apt = m1a[3];
      const raw = `os. 1 Maja ${bldg}/${apt}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
    const m1b = /os\.\s*1\s+Maja\s+(\d+)(?:\/([IVX\d]+))?\/(\d+)/i.exec(src);
    if (m1b) {
      const bldg = m1b[1];
      const apt = m1b[3];
      const raw = `os. 1 Maja ${bldg}/${apt}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
    const m1c = /budynk\w*\s+(?:nr\s+)?(\d+)\s+przy\s+os\.\s*1\s+Maja/i.exec(src);
    if (m1c) {
      const aptM = /lokal\w*\s+mieszkaln\w*\s+nr\s+(?:(\d+)\/)?(?:[IVX\d]+\/)?(\d+)/i.exec(src);
      const apt = aptM ? aptM[2] : null;
      const raw = `os. 1 Maja ${m1c[1]}${apt ? '/' + apt : ''}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
    const m1s = /os\.\s*1\s+Maja\s+(\d+)\/(\d+)\b/i.exec(src);
    if (m1s) {
      const raw = `os. 1 Maja ${m1s[1]}/${m1s[2]}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
    const m1d = /os\.\s*1\s+Maja\s+(\d+)[\s\S]{0,100}?lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+)/i.exec(src);
    if (m1d) {
      const raw = `os. 1 Maja ${m1d[1]}/${m1d[2]}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
    const m1e = /lokal\w*\s+mieszkaln\w*\s+nr\s+(\d+)[\s\S]{0,100}?os\.\s*1\s+Maja\s+(\d+)/i.exec(src);
    if (m1e) {
      const raw = `os. 1 Maja ${m1e[2]}/${m1e[1]}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }

    // Official designation check: "1. Oznaczenie nieruchomości ... lokalu mieszkalnego nr <apt>"
    const s1Unit = /1\.\s*Oznaczenie[\s\S]{0,220}?lokalu\s+mieszkalnego\s+(?:nr\.?\s*)?(\d+(?:\/\d+)?)/i.exec(src);
    const officialApt = s1Unit ? s1Unit[1] : null;

    // Pattern 2: przy ul. <Street> <bldg>/<apt>
    const m2 = /(?:przy\s+)?(?:ul\.|ulicy)\s*([0-9A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(\d+[A-Za-z]?)(?:\/(\d+[A-Za-z]?))\b/i.exec(src);
    if (m2 && !/Bogumi[ńn]sk/i.test(m2[1])) {
      const street = m2[1].replace(/\s+/g, ' ').trim();
      let bldg = m2[2];
      let apt = m2[3];
      if (officialApt && /\//.test(officialApt)) {
        const [obldg, oapt] = officialApt.split('/');
        bldg = obldg;
        apt = oapt;
      }
      const raw = `ul. ${street} ${bldg}/${apt}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }

    // Pattern 3: street + separate flat <apt>
    const aptMatch = /lokal\w*\s+mieszkaln\w*\s+(?:o\s+numerze|numer|nr\.?)\s*(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)/i.exec(src);
    const aptVal = officialApt || (aptMatch ? aptMatch[1] : null);

    if (aptVal && /\//.test(aptVal)) {
      const [bldgPart, aptPart] = aptVal.split('/');
      const streetM = /(?:przy\s+)?(?:ul\.|ulicy)\s*([0-9A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=[,.;\n]|\s+w\s+Wodzisław|\s+w\s+budynku|$)/i.exec(src);
      if (streetM && !/Bogumi[ńn]sk/i.test(streetM[1])) {
        const street = streetM[1].replace(/\s+/g, ' ').trim();
        const raw = `ul. ${street} ${bldgPart}/${aptPart}`;
        const parsed = parseAddress(raw);
        if (parsed) return { address_raw: raw, address: parsed };
      }
    }

    // Pattern 4: przy ul. <Street> <bldg> [apt]
    const m4 = /(?:przy\s+)?(?:ul\.|ulicy)\s*([0-9A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)\s+(?:nr\s+)?(\d+[A-Za-z]?)\b/i.exec(src);
    if (m4 && !/Bogumi[ńn]sk/i.test(m4[1])) {
      const street = m4[1].replace(/\s+/g, ' ').trim();
      const bldg = m4[2];
      const apt = aptVal && !/\//.test(aptVal) ? aptVal : null;
      const raw = `ul. ${street} ${bldg}${apt ? '/' + apt : ''}`;
      const parsed = parseAddress(raw);
      if (parsed) return { address_raw: raw, address: parsed };
    }
  }

  return null;
}

/** Extract land parcel, obręb, area, and street. */
export function landFieldsFromText(title, text) {
  const combined = `${title || ''}\n\n${text || ''}`;
  const clean = stripVenue(combined);

  // Obręb
  const obrebM = /obr[eę]b[u]?\s+(?:nr\.?\s*)?(\d{4}|[A-ZŻŹĆŁŚĄĘÓŃ][A-Za-zżźćłśąęóńŻŹĆŁŚĄĘÓŃ\s-]{1,30}?)(?=[,.;\n]|\s+arkusz|\s+mapa|$)/i.exec(clean);
  const obreb = obrebM ? obrebM[1].replace(/\s+/g, ' ').trim() : null;

  // Cadastral parcel(s): prefer Section 1 if present
  let dzialka_nr = null;
  const s1 = /1\.\s*Oznaczenie[\s\S]{0,140}?(?:jako\s+dzia[łl]k[ai]|dzia[łl]k\w*)\s*[:\s]\s*([\s\S]{0,300}?)(?=\n\s*\n|2\.|\bopisane\b|\barkusz\b|$)/i.exec(clean);
  if (s1) {
    const parcels = [...s1[1].matchAll(/nr\s+(\d+(?:\/\d+)?)/gi)].map((m) => m[1]);
    const valid = parcels.filter((p) => /^\d+(?:\/\d+)?$/.test(p));
    if (valid.length) dzialka_nr = valid.join(', ');
  }
  if (!dzialka_nr) {
    const parcelM = /dzia[łl][ek]{1,2}\w*\s+(?:nr\.?|numer)?\s*([0-9/,\s]+)/i.exec(clean);
    if (parcelM) {
      const run = parcelM[1].slice(0, 80);
      const parcels = [...run.matchAll(/(\d+\/\d+|\d+)/g)].map((m) => m[1]);
      const valid = parcels.filter((p) => /^\d+(?:\/\d+)?$/.test(p));
      if (valid.length) dzialka_nr = valid.join(', ');
    }
  }

  // Street
  let street = null;
  let address_raw = null;
  const streetM = /(?:po[łl]o[żz]on\w*\s+(?:w\s+Wodzisławiu\s+Śl[ąa]skim\s+)?przy\s+ul(?:\.|icy)?|przy\s+ul(?:\.|icy)?)\s*([0-9A-ZŻŹĆŁŚĄĘÓŃ][A-Za-z0-9żźćłśąęóńŻŹĆŁŚĄĘÓŃ.\- ]+?)(?=[,.;\n]|\s+o\s+pow|\s+dzialka|\s+działka|$)/i.exec(clean);
  if (streetM && !/Bogumi[ńn]sk/i.test(streetM[1])) {
    street = streetM[1].replace(/\s+/g, ' ').trim();
    if (street.length > 2 && street.length < 40) {
      address_raw = `ul. ${street}`;
    } else {
      street = null;
    }
  }

  // Plot area
  let area_m2 = null;
  const areaM = /(?:o\s+powierzchni|o\s+[łl][ąa]cznej\s+powierzchni)\s+([\d.,\s]+)\s*m\s*[²2]/i.exec(clean);
  if (areaM) {
    const val = Number(areaM[1].replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(val) && val > 0 && val < 1e7) area_m2 = val;
  }
  if (area_m2 == null) {
    const haM = /([\d][\d.,\s]*)\s*ha\b/i.exec(clean);
    if (haM) {
      const val = Number(haM[1].replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(val) && val > 0 && val < 1e4) area_m2 = Math.round(val * 10000);
    }
  }

  return { dzialka_nr, obreb, area_m2, street, address_raw };
}

/**
 * Parse one announcement PDF text into an array of listings or land records.
 * Supports multi-lot documents (splits by "przetarg ustny nieograniczony na sprzedaż").
 * @param {string} title
 * @param {string} text  PDF extracted text
 * @param {string} url   Detail / document URL
 * @returns {Array<object>}
 */
export function parseAnnouncement(title, text, url) {
  if (!isSaleAnnouncement(title, text)) return [];

  // Check if multiple auctions are bundled in one announcement PDF
  const splitRe = /(?=(?:pierwszy|drugi|trzeci|czwarty|piąty|I|II|III|IV|V)\s+przetarg\s+ustny\s+nieograniczony\s+na\s+sprzeda)/gi;
  const rawParts = text.split(splitRe).filter((p) => /przetarg\s+ustny\s+nieograniczony/i.test(p));
  const parts = rawParts.length > 1 ? rawParts : [text];

  const results = [];
  const globalDate = announcementDateFromText(text);

  for (const part of parts) {
    const kind = classifyAssetKind(title, part);
    const round = roundFromText(part) ?? roundFromText(title);
    const starting_price_pln = startingPriceFromText(part);
    const auction_date = announcementDateFromText(part) || globalDate;

    if (kind === 'grunt') {
      const land = landFieldsFromText(title, part);
      if (!land.dzialka_nr && !land.street) continue;
      results.push({
        kind: 'grunt',
        dzialka_nr: land.dzialka_nr,
        obreb: land.obreb,
        zoning: null,
        address_raw: land.address_raw,
        street: land.street,
        building: null,
        address: land.address_raw ? parseAddress(land.address_raw) : null,
        area_m2: land.area_m2,
        starting_price_pln,
        auction_date,
        round,
        detail_url: url,
        source_url: url,
        geoportal_url: null,
      });
    } else {
      const addr = addressFromText(title, part);
      if (!addr) continue;
      results.push({
        kind: kind === 'unknown' ? 'mieszkalny' : kind,
        address_raw: addr.address_raw,
        address: addr.address,
        area_m2: areaFromText(part),
        starting_price_pln,
        round,
        auction_date,
        detail_url: url,
        source_url: url,
      });
    }
  }

  return results;
}

/**
 * Parse one RESULT document ("Informacja o wyniku przetargu").
 * Returns an array of concluded auction records (0 or 1).
 * @param {string} text
 * @param {string|null} fallbackDate
 * @param {string} sourceUrl
 * @returns {Array<object>}
 */
export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!isResultNotice(text)) return [];
  if (/\bnajem\b|najmu|dzier[żz]aw|czynsz/i.test(text)) return [];

  const kind = classifyAssetKind('', text);
  const auction_date = resultDateFromText(text) || fallbackDate || null;
  const round = roundFromText(text);
  const starting_price_pln = startingPriceFromText(text);
  const final_price_pln = achievedPriceFromText(text);
  const { outcome, unsold_reason } = outcomeFromText(text);
  const buyer = buyerFromText(text);
  const notes = [];

  if (kind === 'grunt') {
    const land = landFieldsFromText('', text);
    if (!land.dzialka_nr && !land.street) return [];
    return [
      {
        auction_date,
        source_pdf: sourceUrl,
        kind: 'grunt',
        dzialka_nr: land.dzialka_nr,
        obreb: land.obreb,
        area_m2: land.area_m2,
        address_raw: land.address_raw,
        round,
        starting_price_pln,
        final_price_pln: outcome === 'sold' ? final_price_pln : null,
        outcome,
        unsold_reason,
        buyer: outcome === 'sold' ? buyer : null,
        notes,
      },
    ];
  }

  const addr = addressFromText('', text);
  if (!addr) return [];
  if (addr.address?.warning) notes.push(addr.address.warning);

  return [
    {
      auction_date,
      source_pdf: sourceUrl,
      kind: kind === 'unknown' ? 'mieszkalny' : kind,
      address_raw: addr.address_raw,
      address: addr.address,
      round,
      starting_price_pln,
      final_price_pln: outcome === 'sold' ? final_price_pln : null,
      outcome,
      unsold_reason,
      area_m2: areaFromText(text),
      buyer: outcome === 'sold' ? buyer : null,
      notes,
    },
  ];
}
