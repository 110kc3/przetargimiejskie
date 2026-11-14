import { parseAddress } from '../../core/normalize.js';
import { classifyKind } from '../../core/classify-kind.js';


function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&oacute;/gi, 'ó')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripHtml(html) {
  if (!html) return '';
  const withBreaks = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/tr|\/td|\/li|\/h\d)\s*\/?>/gi, ' \n ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(withBreaks).replace(/[ \t]+/g, ' ').replace(/\n[ \t]*\n+/g, '\n').trim();
}


export function parsePLN(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[,.]\d{2})?$/.exec(cleaned);
  if (m) return Number(m[1].replace(/[.,]/g, ''));
  const fallback = cleaned.replace(/\./g, '').replace(/,.*/, '').replace(/[^\d]/g, '');
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseAreaNum(s) {
  if (s == null) return null;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function haToM2(ha) {
  return ha == null ? null : Math.round(ha * 10000);
}


const PL_MONTHS = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9,
  października: 10, pazdziernika: 10, listopada: 11, grudnia: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function polishDateToIso(s) {
  const m = /(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i.exec(s || '');
  if (!m) return null;
  const mon = PL_MONTHS[m[2].toLowerCase()];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}

const RFC_MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
export function pubDateToIso(s) {
  const m = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mon = RFC_MONTHS[m[2]];
  if (!mon) return null;
  return iso(m[3], mon, m[1]);
}


const ROUND_RE = /\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\s+(?:przetarg|Przetarg|PRZETARG)\w{0,3}\b/;
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

export function roundFromText(text) {
  const m = ROUND_RE.exec(text || '');
  return m ? ROMAN[m[1]] ?? null : null;
}


function placToNominative(name) {
  return name
    .trim()
    .replace(/^Placu\b/, 'Plac')
    .replace(/\b([A-ZŻŹĆŁŃÓŚĄĘ][a-ząćęłńóśźż]*?)(sk|ck)im\b/, '$1$2i')
    .replace(/\b([A-ZŻŹĆŁŃÓŚĄĘ][a-ząćęłńóśźż]*?)(sk|ck)ą\b/, '$1$2a');
}

function safeBuildingToken(building) {
  return building.replace(/\//g, '-');
}


const LOKAL_UNIT_RE = /Lokal\S*\s+mieszkaln\S*\s+nr\s+(\d+(?:\s*(?:i|,|oraz)\s*\d+)*)/i;
const LOKAL_UZYTKOWY_RE = /Lokal\S*\s+(?:u[żz]ytkow\S*|niemieszkaln\S*)\s+nr\s+(\d+(?:\s*(?:i|,|oraz)\s*\d+)*)/i;
const STREET_UL_RE = /przy\s+ul\.?\s*([^\n,]+?)\s*[Nn]r\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
const STREET_PLAC_RE = /przy\s+(Placu?\s+[^\n,]+?)\s*[Nn]r\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
const TABLE_POSITION_RE = /Po[łl]o[żz]enie\s+nieruchomo[śs]ci\s*:?\s*([^\n]+?)\s*[Nn]r\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
const AREA_UNIT_RE = /Powierzchnia\s+u[żz]ytkow\S*\s+mieszkania(?:\s+nr\s+(\d+))?\s*-\s*([\d]+(?:[.,]\d+)?)\s*m/gi;
const TABLE_AREA_LOKAL_RE = /Powierzchnia\s+lokalu\s*:?\s*([\d]+(?:[.,]\d+)?)\s*m/i;
const TABLE_PRICE_RE = /Cena\s+wywo[łl]awcza(?:\s+brutto)?\s*:?\s*([\d][\d\s.,]*)\s*z[łl]/i;
const TABLE_DATE_RE = /Przetarg\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*r\.?/i;
const LAND_PLOT_RE = /dzia[łl]k[aię]?\s+nr\s+(\d+(?:\/\d+)?)\s*(?:o\s+pow\.?|[-–])\s*([\d]+(?:[.,]\d+)?)\s*ha/gi;
const LAND_STREET_UL_RE = /przy\s+ul\.?\s*([^\n,.\-]+)/i;
const LAND_STREET_PLAC_RE = /przy\s+Placu?\s+([^\n,.\-]+)/i;
const IS_ZABUDOWANA_RE = /zabudowan/i;

export function parseActiveItem(title, descriptionHtml, detailUrl) {
  const t = title || '';
  const tableText = stripHtml(descriptionHtml);
  const starting_price_pln = parsePLN((TABLE_PRICE_RE.exec(tableText) || [])[1]);
  const dateM = TABLE_DATE_RE.exec(tableText);
  const auction_date = dateM ? polishDateToIso(dateM[1]) : null;
  const round = roundFromText(t);

  const lokalM = LOKAL_UNIT_RE.exec(t) || LOKAL_UZYTKOWY_RE.exec(t);
  if (lokalM) {
    const kind = classifyKind(t) === 'unknown' ? 'mieszkalny' : classifyKind(t);
    const nrs = lokalM[1].split(/\s*(?:i|,|oraz)\s*/i).map((s) => s.trim()).filter(Boolean);
    const streetM = STREET_UL_RE.exec(t) || TABLE_POSITION_RE.exec(tableText);
    if (!streetM) return { listings: [], land: [] };
    const street = streetM[1].trim();
    const building = safeBuildingToken(streetM[2]);
    const areas = {};
    let am;
    AREA_UNIT_RE.lastIndex = 0;
    while ((am = AREA_UNIT_RE.exec(t)) !== null) {
      if (am[1]) areas[am[1]] = parseAreaNum(am[2]);
    }
    const tableArea = parseAreaNum((TABLE_AREA_LOKAL_RE.exec(tableText) || [])[1]);
    const listings = [];
    for (const nr of nrs) {
      const address_raw = `${street} ${building}/${nr}`;
      const address = parseAddress(address_raw);
      if (!address) continue;
      listings.push({
        kind,
        address_raw,
        address,
        auction_date,
        round,
        area_m2: areas[nr] ?? tableArea,
        starting_price_pln,
        detail_url: detailUrl || null,
      });
    }
    return { listings, land: [] };
  }

  const parcels = [];
  let pm;
  LAND_PLOT_RE.lastIndex = 0;
  while ((pm = LAND_PLOT_RE.exec(t)) !== null) parcels.push({ nr: pm[1], area_ha: parseAreaNum(pm[2]) });

  if (parcels.length) {
    if (IS_ZABUDOWANA_RE.test(t)) {
      const posM = TABLE_POSITION_RE.exec(tableText);
      if (posM) {
        const street = posM[1].trim();
        const building = safeBuildingToken(posM[2]);
        const address_raw = `${street} ${building}`;
        const address = parseAddress(address_raw);
        if (address) {
          return {
            listings: [{
              kind: 'zabudowana',
              address_raw,
              address,
              auction_date,
              round,
              area_m2: null,
              land_area_m2: haToM2(parcels.reduce((s, p) => s + (p.area_ha || 0), 0)) || null,
              starting_price_pln,
              detail_url: detailUrl || null,
            }],
            land: [],
          };
        }
      }
    }
    const streetM = LAND_STREET_UL_RE.exec(t) || LAND_STREET_PLAC_RE.exec(t) ||
      TABLE_POSITION_RE.exec(tableText) || /po[łl]o[żz]on\S*\s+przy\s+ulicy\s+([^\n<]+)/i.exec(tableText);
    const street = streetM ? streetM[1].trim() : null;
    const dzialka_nr = parcels.map((p) => p.nr).join(', ');
    const totalHa = parcels.reduce((s, p) => s + (p.area_ha || 0), 0);
    return {
      listings: [],
      land: [{
        kind: 'grunt',
        dzialka_nr,
        obreb: null,
        area_m2: haToM2(totalHa) || null,
        address_raw: street ? `ul. ${street}` : null,
        auction_date,
        round,
        starting_price_pln,
        detail_url: detailUrl || null,
      }],
    };
  }

  return { listings: [], land: [] };
}


const WYKAZ_PUBLISHED_RE = /W\s+dniu\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})\s*r\.?\s+zosta[łl]/i;
const WYKAZ_NO_RE = /zarz[ąa]dzenie\s+nr\s+([\d\/]+)/i;

export function parseWykazItem(title, descriptionHtml, pubDateRfc822) {
  const t = title || '';
  const body = stripHtml(descriptionHtml);
  const published_date = polishDateToIso((WYKAZ_PUBLISHED_RE.exec(body) || [])[1]) || pubDateToIso(pubDateRfc822);
  const wykaz_no = (WYKAZ_NO_RE.exec(body) || [])[1] || null;

  const lokalM = LOKAL_UNIT_RE.exec(t) || LOKAL_UZYTKOWY_RE.exec(t);
  const ulM = STREET_UL_RE.exec(t);
  const placM = ulM ? null : STREET_PLAC_RE.exec(t);
  if (!ulM && !placM) return [];
  const street = ulM ? ulM[1].trim() : placToNominative(placM[1].trim());
  const building = safeBuildingToken((ulM || placM)[2]);

  if (lokalM) {
    const nrs = lokalM[1].split(/\s*(?:i|,|oraz)\s*/i).map((s) => s.trim()).filter(Boolean);
    const areas = {};
    let am;
    AREA_UNIT_RE.lastIndex = 0;
    while ((am = AREA_UNIT_RE.exec(t)) !== null) {
      if (am[1]) areas[am[1]] = parseAreaNum(am[2]);
    }
    const singleArea = parseAreaNum((/Powierzchnia\s+u[żz]ytkow\S*\s+mieszkania\s*-\s*([\d]+(?:[.,]\d+)?)\s*m/i.exec(t) || [])[1]);
    const kind = classifyKind(t) === 'unknown' ? 'mieszkalny' : classifyKind(t);
    const out = [];
    for (const nr of nrs) {
      const address_raw = `${street} ${building}/${nr}`;
      const address = parseAddress(address_raw);
      if (!address) continue;
      out.push({ address, address_raw, kind, area_m2: areas[nr] ?? singleArea, published_date, wykaz_no });
    }
    return out;
  }

  const address_raw = `${street} ${building}`;
  const address = parseAddress(address_raw);
  if (!address) return [];
  const kind = classifyKind(t) === 'unknown' ? 'zabudowana' : classifyKind(t);
  return [{ address, address_raw, kind, area_m2: null, published_date, wykaz_no }];
}


const IS_RESULT_RE = /informacj[ęe]\s+o\s+wyniku/i;
const IS_PLOT_TABLE_RE = /Nr\s+dzia[łl]ki\b/i;

const RESULT_AUCTION_DATE_RE = /Na\s+dzie[ńn]\s+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i;
const PLOT_NR_RE = /Nr\s+dzia[łl]ki\s+(\d+(?:\/\d+)?)/i;
const PLOT_AREA_HA_RE = /Powierzchnia\s+dzia[łl]ki\s*\(ha\)\s+([\d]+(?:[.,]\d+)?)/i;
const OBREB_RE = /Obr[ęe]b:?\s*(\d+)/i;
const PLOT_POSITION_RE = /Po[łl]o[żz]enie\s+(?:ul\.?\s*)?([^\n,]+?)(?:,\s*Obr[ęe]b|\s*$)/im;
const PLOT_STARTING_PRICE_RE = /Cena\s+wywo[łl]awcza\s+brutto\s+([\d][\d\s.,]*)\s*z[łl]/i;
const PLOT_ACHIEVED_RE = /Najwy[żz]sza\s+cena\s+osi[ąa]gni[ęe]ta\s+w\s+przetargu\s+([\d][\d\s.,]*?)\s+brutto/i;
const PLOT_BUYER_RE = /Nabywca\s+nieruchomo[śs]ci\s+([^\n]+)/i;
const PLOT_ADMITTED_RE = /Liczba\s+os[óo]b\s+dopuszczonych\s+do\s+przetargu\s+(\d+)/i;

const LOKAL_RESULT_UNIT_RE = /lokal\S*\s+mieszkaln\S*\s+nr\s+(\d+[a-zA-Z]?)/i;
const LOKAL_RESULT_STREET_RE = /przy\s+ul\.?\s*([^\n,]+?)\s+Nr\.?\s*(\d+(?:\/\d+)?[a-zA-Z]?)/i;
const LOKAL_RESULT_AREA_RE = /nr\s+\d+[a-zA-Z]?\s+o\s+pow\.?\s+([\d]+(?:[.,]\d+)?)\s*m/i;
const LOKAL_RESULT_PRICE_RE = /[Cc]en[ąa]\s+wywo[łl]awcz\S*\s+lokalu(?:\s+do\s+[IVX]+\s+przetargu)?\s+by[łl]a\s+kwota\s+([\d][\d\s.,-]*)\s*z[łl]/i;
const NEGATIVE_RE = /wynikiem\s+negatywnym|nikt\s+nie\s+wp[łl]aci[łl]\s+wadium|nie\s+wp[łl]acono\s+wadium/i;

export function parseResultDoc(text, fallbackDate, sourceUrl) {
  if (!text || !IS_RESULT_RE.test(text)) return [];
  const t = text.replace(/\r/g, '');
  const round = roundFromText(t);
  const auctionDateM = RESULT_AUCTION_DATE_RE.exec(t);
  const auction_date = (auctionDateM && polishDateToIso(auctionDateM[1])) || fallbackDate || null;
  const notes = [];

  if (IS_PLOT_TABLE_RE.test(t)) {
    const dzialka_nr = (PLOT_NR_RE.exec(t) || [])[1] || null;
    const area_m2 = haToM2(parseAreaNum((PLOT_AREA_HA_RE.exec(t) || [])[1]));
    const obreb = (OBREB_RE.exec(t) || [])[1] || null;
    const posM = PLOT_POSITION_RE.exec(t);
    let street = posM ? posM[1].replace(/^ul\.?\s*/i, '').trim() : null;
    const address_raw = street ? `ul. ${street}` : null;
    const starting_price_pln = parsePLN((PLOT_STARTING_PRICE_RE.exec(t) || [])[1]);
    const achievedRaw = (PLOT_ACHIEVED_RE.exec(t) || [])[1];
    const achieved = achievedRaw != null ? parsePLN(achievedRaw) : null;
    const buyer = ((PLOT_BUYER_RE.exec(t) || [])[1] || '').trim();
    const noBuyer = !buyer || /^brak\b/i.test(buyer);
    const sold = achieved != null && achieved > 0 && !noBuyer;
    if (starting_price_pln == null) notes.push('parse: missing starting price');
    let unsold_reason = null;
    if (!sold) {
      if (noBuyer && /^0$/.test((PLOT_ADMITTED_RE.exec(t) || [])[1] || '')) unsold_reason = 'brak uczestników';
      else if (noBuyer) unsold_reason = 'brak nabywcy';
      else unsold_reason = 'unknown';
    }
    if (!dzialka_nr && !address_raw) return [];
    return [{
      kind: 'grunt',
      dzialka_nr,
      obreb,
      area_m2,
      address_raw,
      auction_date,
      round,
      starting_price_pln,
      final_price_pln: sold ? achieved : null,
      outcome: sold ? 'sold' : 'unsold',
      unsold_reason,
      source_pdf: sourceUrl,
      notes,
    }];
  }

  const unitM = LOKAL_RESULT_UNIT_RE.exec(t);
  const streetM = LOKAL_RESULT_STREET_RE.exec(t);
  if (!unitM || !streetM) {
    notes.push('parse: could not resolve lokal/address from result text');
    return [];
  }
  const street = streetM[1].trim();
  const building = safeBuildingToken(streetM[2]);
  const nr = unitM[1];
  const address_raw = `${street} ${building}/${nr}`;
  const address = parseAddress(address_raw);
  if (!address) {
    notes.push(`parse: could not parse address from '${address_raw}'`);
    return [];
  }
  if (address.warning) notes.push(address.warning);
  const kind = classifyKind(t) === 'unknown' ? 'mieszkalny' : classifyKind(t);
  const area_m2 = parseAreaNum((LOKAL_RESULT_AREA_RE.exec(t) || [])[1]);
  const starting_price_pln = parsePLN((LOKAL_RESULT_PRICE_RE.exec(t) || [])[1]);
  if (starting_price_pln == null) notes.push('parse: missing starting price');
  const negativeStated = NEGATIVE_RE.test(t);
  const sold = !negativeStated && /nabywc[ąa]\s+(?:nieruchomo[śs]ci\s+)?(?:zosta[łl]|ustalono)/i.test(t);
  let final_price_pln = null;
  if (sold) {
    const m = /(?:nabywc[ąa][\s\S]{0,120}?|cen[ąa]\s+osi[ąa]gni[ęe]t[ąa][\s\S]{0,40}?)([\d][\d\s.,]*)\s*z[łl]/i.exec(t);
    final_price_pln = m ? parsePLN(m[1]) : null;
  }
  return [{
    kind,
    address_raw,
    address,
    round,
    auction_date,
    starting_price_pln,
    final_price_pln,
    outcome: sold ? 'sold' : 'unsold',
    unsold_reason: sold ? null : (negativeStated ? 'brak wpłaty wadium' : 'unknown'),
    area_m2,
    source_pdf: sourceUrl,
    notes,
  }];
}
