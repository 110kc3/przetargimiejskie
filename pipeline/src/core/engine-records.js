import { parseAddress } from './normalize.js';
import { classifyKind, LAND_KIND } from './classify-kind.js';

const AUCTION_NOTICE = /przetarg/i;
const SALE_NOTICE = /sprzeda|zbyci|zbyt/i;
const MULTI_LOT_NOTICE = /\bprzetargi\b/i;
const VENUE_CONTEXT = /(?:w\s+dniu|urz[ęe]dzie|siedzibie|odb[ęe]d[ąa]\s+si[ęe]|odb[ęe]dzie\s+si[ęe]|sala|sali)[^.]{0,120}$/i;
const NOT_A_SALE_AUCTION = /wykaz|bezprzetarg|dzier[żz]aw|najem|wynaj|u[żz]yczen|pe[łl]nomocnict|wynik[ui]|rozstrzygni/i;
const STREET_ADDRESS = /(?:ul\.|ulicy|al\.|alei|pl\.|placu|os\.|osiedlu)\s+([A-ZĄĆĘŁŃÓŚŹŻ0-9][^,;()\d]*?(?:\s+\d{1,2}\s+[A-ZĄĆĘŁŃÓŚŹŻ][^,;()\d]*?)?)\s+(\d{1,4}[A-Za-z]?(?:\/\d{1,4}[A-Za-z]?)?)(?=[\s,.;)]|$)/;
const APARTMENT_NUMBER = /lokal\w*\s+(?:mieszkaln\w+\s+)?nr\s+(\d{1,4}[A-Za-z]?)/i;
const ROUND_WORDS = [
  [/\bpierwsz\w+|\bI\s+przetarg/i, 1], [/\bdrug\w+|\bII\s+przetarg/i, 2],
  [/\btrzec\w+|\bIII\s+przetarg/i, 3], [/\bczwart\w+|\bIV\s+przetarg/i, 4],
  [/\bpi[ąa]t\w+|\bV\s+przetarg/i, 5], [/\bsz[óo]st\w+|\bVI\s+przetarg/i, 6],
  [/\bsi[óo]dm\w+|\bVII\s+przetarg/i, 7],
];

export function isSaleAuctionNotice(title) {
  return AUCTION_NOTICE.test(title) && SALE_NOTICE.test(title)
    && !NOT_A_SALE_AUCTION.test(title) && !MULTI_LOT_NOTICE.test(title);
}

export function roundFromTitle(title) {
  const found = ROUND_WORDS.find(([pattern]) => pattern.test(title));
  return found ? found[1] : null;
}

export function addressFromNotice(title, text = '') {
  for (const source of [title, text]) {
    const street = STREET_ADDRESS.exec(source || '');
    if (!street || VENUE_CONTEXT.test((source || '').slice(0, street.index))) continue;
    const apartment = street[2].includes('/') ? null : APARTMENT_NUMBER.exec(source)?.[1];
    const raw = `${street[1].trim()} ${street[2]}${apartment ? `/${apartment}` : ''}`;
    const address = parseAddress(raw);
    if (address) return { address_raw: raw, address };
  }
  return null;
}

function kindOf(record) {
  const fromTitle = classifyKind(record.title);
  if (fromTitle !== 'unknown') return fromTitle;
  if (/lokal\w*\s+mieszkaln/i.test(record.title)) return 'mieszkalny';
  return record.property_type && !['unknown', 'lokal'].includes(record.property_type)
    ? record.property_type : 'unknown';
}

function landRecord(record, found) {
  return {
    kind: LAND_KIND,
    dzialka_nr: record.parcel || null,
    obreb: null,
    zoning: null,
    address_raw: found?.address_raw ?? null,
    street: found?.address.street ?? null,
    building: null,
    address: found?.address ?? null,
    area_m2: record.area ?? null,
    starting_price_pln: record.price ?? null,
    auction_date: record.auction_date ?? null,
    round: roundFromTitle(record.title),
    detail_url: record.url,
    source_url: record.url,
    geoportal_url: null,
  };
}

function listingRecord(record, kind, found) {
  return {
    kind,
    address_raw: found.address_raw,
    address: found.address,
    auction_date: record.auction_date ?? null,
    published_date: null,
    round: roundFromTitle(record.title),
    area_m2: record.area ?? null,
    starting_price_pln: record.price ?? null,
    detail_url: record.url,
    share: null,
  };
}

export function canonicalizeEngineRecords(records) {
  const listings = [];
  const land = [];
  for (const record of records || []) {
    if (!record || record.type === 'result' || !isSaleAuctionNotice(record.title || '')) continue;
    const kind = kindOf(record);
    const found = addressFromNotice(record.title, record.raw_text);
    if (kind === LAND_KIND) {
      if (record.parcel || found) land.push(landRecord(record, found));
    } else if (kind !== 'unknown' && found) {
      listings.push(listingRecord(record, kind, found));
    }
  }
  return { listings, wykaz: [], land };
}

export function withCanonicalRecords(crawlActive) {
  return async function canonicalCrawlActive(...args) {
    return canonicalizeEngineRecords(await crawlActive(...args));
  };
}
