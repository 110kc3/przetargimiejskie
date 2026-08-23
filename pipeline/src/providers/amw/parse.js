import {
  absoluteUrl, addressParts, auctionMode, fold, htmlText, isoDate,
  normalizeVoivodeship, parsePlNumber, parsePln, providerEventKey,
  roundFromText, slugify, stableId,
} from '../common.js';

const ORIGIN = 'https://amw.com.pl';

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function field(card, label) {
  const match = new RegExp(`<span[^>]*>\\s*${escapeRe(label)}\\s*:?\\s*</span>([\\s\\S]*?)</p>`, 'i').exec(card);
  return match ? htmlText(match[1]) : null;
}

function titleFields(card) {
  const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(card)?.[1] || '';
  const title = htmlText(h2, { breaks: ',' }).replace(/(?:\s*,\s*)+/g, ', ').replace(/,\s*$/, '').trim();
  const parts = title.split(/\s*,\s*/).filter(Boolean);
  const city = parts.shift() || '';
  const addressPartsRaw = parts.filter((part) => !/^dz\.?\s/i.test(part) && !/^obr[ęe]b/i.test(part));
  let address = addressPartsRaw.shift() || title;
  const unit = addressPartsRaw.find((part) => /^(?:lok\.?|m\.?)\s*\w+/i.test(part));
  if (unit && !/\/\s*\w+\s*$/.test(address)) {
    const unitNo = /(?:lok\.?|m\.?)\s*(\w+)/i.exec(unit)?.[1];
    if (unitNo) address += `/${unitNo}`;
  }
  return { title, city, address_raw: address.replace(/\s+/g, ' ').trim() };
}

function categories(card) {
  return [...card.matchAll(/class=["'][^"']*col-category__item[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => htmlText(match[1])).filter(Boolean);
}

function isResidentialSale(card, categoryList) {
  const transaction = field(card, 'Forma zbycia') || htmlText(/<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(card)?.[1] || '');
  return fold(transaction).includes('sprzedaz') && categoryList.some((category) => fold(category).includes('mieszkaniow'));
}

function parseArea(value) {
  // Strip the unit first: htmlText turns m<sup>2</sup> into "m2", and feeding
  // that trailing 2 to the generic numeric parser would turn 77,77 into 77,772.
  const numeric = /-?\d[\d\s.]*(?:,\d+)?/.exec(String(value))?.[0];
  const area = parsePlNumber(numeric);
  if (area == null) return null;
  return /\bha\b/i.test(value) ? area * 10_000 : area;
}

function baseListing(card) {
  const title = titleFields(card);
  const date = isoDate(field(card, 'Data przetargu'));
  const categoryList = categories(card);
  if (!isResidentialSale(card, categoryList)) return null;
  const voivMatch = /Woj\.?\s*:\s*([^<]+)<\/p>/i.exec(card);
  const area = parseArea(field(card, 'Powierzchnia') || '');
  const parsedAddress = addressParts(title.address_raw);
  const kind = /\bdz\.?\s*\d/i.test(title.title) && !parsedAddress.apt
    ? 'grunt' : 'mieszkalny';
  return {
    ...title,
    seller_id: 'amw',
    seller_name: 'Agencja Mienia Wojskowego',
    seller_type: 'state_agency',
    transaction_type: 'sale',
    auction_mode: 'unknown',
    kind,
    city_norm: slugify(title.city),
    voivodeship: normalizeVoivodeship(voivMatch?.[1]),
    ...parsedAddress,
    area_m2: kind === 'grunt' ? null : area,
    land_area_m2: kind === 'grunt' ? area : null,
    publication_date: null,
    auction_date: date,
    bid_deadline: null,
    wadium_deadline: null,
    round: null,
    starting_price_pln: parsePln(field(card, 'Cena wywoławcza')),
    final_price_pln: null,
    bidders: null,
    categories: categoryList,
    event_key: providerEventKey('amw', title.city, title.address_raw, date),
  };
}

export function parseAmwActivePage(html) {
  const rows = [];
  for (const card of String(html).split(/<div\s+class=["']element["']\s*>/i).slice(1)) {
    const base = baseListing(card);
    if (!base) continue;
    const href = /<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i.exec(card)?.[1]
      || /<a[^>]+href=["']([^"']*przetargi-nieruchomosci[^"']+)["']/i.exec(card)?.[1];
    const detailUrl = absoluteUrl(href, ORIGIN);
    const externalId = /-(\d+)\/?$/.exec(detailUrl || '')?.[1] || stableId(detailUrl || base.event_key);
    rows.push({
      ...base,
      external_id: externalId,
      source_status: 'Ogłoszony',
      outcome: 'active',
      detail_url: detailUrl,
      offer_url: detailUrl,
    });
  }
  return rows;
}

export function parseAmwResultsPage(html) {
  const rows = [];
  for (const card of String(html).split(/<div\s+class=["']element["']\s*>/i).slice(1)) {
    const base = baseListing(card);
    if (!base) continue;
    const pdfHref = /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?Pobierz wynik przetargu/i.exec(card)?.[1];
    const resultUrl = absoluteUrl(pdfHref, ORIGIN);
    const positive = /estate-publication-result-type--positive/i.test(card);
    const negative = /estate-publication-result-type--negative/i.test(card);
    if (!positive && !negative) continue;
    rows.push({
      ...base,
      external_id: stableId(resultUrl || base.event_key),
      source_status: positive ? 'Pozytywny' : 'Negatywny',
      outcome: positive ? 'sold' : 'unsold',
      detail_url: resultUrl,
      result_url: resultUrl,
    });
  }
  return rows;
}

export function parseAmwResultText(text) {
  const normalized = String(text || '').replace(/\u00a0/g, ' ');
  const priceMatch = /(?:najwy[żz]sza\s+)?cena(?:\s+nieruchomo[śs]ci)?\s+osi[aą]gni[eę]ta[\s\S]{0,100}?([0-9][0-9\s.]*?(?:,[0-9]{2})?)\s*z[łl]/i.exec(normalized);
  const bidderMatch = /(?:liczba\s+os[oó]b\s+dopuszczonych[\s\S]{0,120}?|zakwalifikowano\s+)(\d+)\b/i.exec(normalized)
    || /wp[łl]at[ęe]\s+(\d+)\s+wadi[oó]w/i.exec(normalized);
  const wordRound = /\b(pierwsz\w*|drug\w*|trzec\w*|czwart\w*)(?:\s+\([IVX]+\))?(?:\s+ustn\w*)?\s+przetarg/i.exec(normalized)?.[1];
  const foldedRound = fold(wordRound);
  const wordNumber = foldedRound.startsWith('pierwsz') ? 1
    : foldedRound.startsWith('drug') ? 2
      : foldedRound.startsWith('trzec') ? 3
        : foldedRound.startsWith('czwart') ? 4 : null;
  return {
    final_price_pln: parsePln(priceMatch?.[1]),
    bidders: bidderMatch ? Number(bidderMatch[1]) : null,
    round: wordNumber || roundFromText(normalized),
    auction_mode: auctionMode(normalized),
  };
}

export function nextAmwPage(html) {
  const href = /<button[^>]+data-url=["']([^"']+)["'][^>]*btn-show-more-items/i.exec(html)?.[1]
    || /<button[^>]+btn-show-more-items[^>]+data-url=["']([^"']+)["']/i.exec(html)?.[1];
  return absoluteUrl(href, ORIGIN);
}
