import {
  absoluteUrl, addressParts, auctionMode, fold, htmlText, isoDate,
  normalizeVoivodeship, parsePlNumber, parsePln, roundFromText, slugify,
} from '../common.js';

const ORIGIN = 'https://www.pkp.pl';

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function field(block, labels) {
  for (const label of [].concat(labels)) {
    const match = new RegExp(`<b>\\s*${escapeRe(label)}\\s*:?\\s*</b>([\\s\\S]*?)</p>`, 'i').exec(block);
    if (match) return htmlText(match[1]);
  }
  return null;
}

function outcomeFromStatus(status) {
  const normalized = fold(status);
  if (normalized === 'ogloszony') return 'active';
  if (normalized === 'rozstrzygniety') return 'sold';
  if (normalized === 'nierozstrzygniety') return 'no_winner';
  if (normalized === 'uniewazniony' || normalized === 'odwolany') return 'cancelled';
  return 'archived';
}

export function pkpAddressFromTitle(title, city = '') {
  const unit = /(?:lokal(?:u)?(?:\s+mieszkaln\w*)?|mieszkan(?:ie|ia))\s*(?:(?:nr|numer)\s*)?(\d+[A-Za-z]?)/i.exec(title)?.[1]
    || /(?:\bm\.|\blok\.)\s*(?:mieszkaln\w*\s*)?(?:nr\s*)?(\d+[A-Za-z]?)/i.exec(title)?.[1]
    || null;
  let address = null;
  const street = /\b((?:ulicy|ul\.?|al\.?|aleja|plac|pl\.)\s*.+?\s+\d+[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)(?=\s*(?:[.,;]|\s+-\s+|\s+(?:lok\.|m\.)|\s+wraz\b|\s+o\s+pow\b|\s+w(?:\s+miejscowo[śs]ci)?\s+\p{L}|$))/iu.exec(title);
  if (street) address = street[1];
  if (!address && city) {
    const afterCity = title.match(new RegExp(`${escapeRe(city)}[,\\s-]+((?:.+?\\s+)?\\d+[A-Za-z]?(?:\\s*\\/\\s*\\d+[A-Za-z]?)?)(?=\\s*(?:,|-|$))`, 'i'));
    if (afterCity) address = /^\d/.test(afterCity[1]) ? `${city} ${afterCity[1]}` : afterCity[1];
  }
  if (!address) {
    const generic = /([A-ZĄĆĘŁŃÓŚŹŻ][\p{L} .'-]+\s+\d+[A-Za-z]?(?:\s*\/\s*\d+[A-Za-z]?)?)(?=\s*(?:-|$))/u.exec(title);
    if (generic) address = generic[1];
  }
  if (!address) return title;
  address = address.replace(/^ulicy\s+/i, 'ul. ').replace(/\bnr\s+(?=\d)/gi, '').replace(/\s+/g, ' ').trim();
  if (unit && !/\/\s*\w+\s*$/.test(address)) address += `/${unit}`;
  return address;
}

export function parsePkpListPage(html) {
  const records = [];
  for (const block of String(html).split(/<div\s+class=["']result["']\s*>/i).slice(1)) {
    const body = block.split(/<\/div>/i)[0];
    const href = /href=["']([^"']*\bshow=(\d+)[^"']*)["']/i.exec(body);
    if (!href) continue;
    const externalId = href[2];
    const title = field(body, 'Nazwa') || `PKP ${externalId}`;
    const city = field(body, 'Miejscowość') || '';
    const addressRaw = pkpAddressFromTitle(title, city);
    const status = field(body, 'Status') || 'Nieznany';
    const auctionDate = isoDate(field(body, [
      'Termin przetargu pisemnego', 'Termin przetargu ustnego', 'Termin przetargu',
    ]));
    const bidDeadline = isoDate(field(body, 'Termin składania ofert'));
    const finalPrice = parsePln(field(body, [
      'Cena osiągnięta', 'Osiągnięta cena', 'Cena uzyskana', 'Cena sprzedaży',
    ]));
    const bidders = parsePlNumber(field(body, [
      'Liczba oferentów', 'Liczba uczestników', 'Liczba dopuszczonych oferentów',
    ]));
    const titleArea = parsePlNumber(/\b(?:o\s+)?pow\.?\s*([0-9]+(?:[.,][0-9]+)?)\s*m(?:2|²)/i.exec(title)?.[1]);
    records.push({
      event_key: `pkp:${externalId}`,
      external_id: externalId,
      seller_id: 'pkp',
      seller_name: 'PKP S.A.',
      seller_type: 'state_company',
      transaction_type: 'sale',
      auction_mode: auctionMode(`${title} ${field(body, 'Termin przetargu pisemnego') || ''}`),
      kind: 'mieszkalny',
      title,
      city,
      city_norm: slugify(city),
      voivodeship: normalizeVoivodeship(field(body, 'Województwo')),
      address_raw: addressRaw,
      ...addressParts(addressRaw),
      area_m2: titleArea,
      land_area_m2: null,
      publication_date: isoDate(field(body, ['Data ogłoszenia przetargu', 'Data publikacji'])),
      auction_date: auctionDate || bidDeadline,
      bid_deadline: bidDeadline,
      wadium_deadline: isoDate(field(body, 'Termin wpłaty wadium')),
      round: roundFromText(title),
      starting_price_pln: parsePln(field(body, ['Cena wywoławcza', 'Cena'])),
      final_price_pln: finalPrice,
      bidders: bidders == null ? null : Math.round(bidders),
      source_status: status,
      outcome: outcomeFromStatus(status),
      detail_url: absoluteUrl(href[1], ORIGIN),
      offer_url: null,
    });
  }
  return records;
}

export function parsePkpDetail(html) {
  const fields = new Map();
  for (const match of String(html).matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)) {
    fields.set(fold(htmlText(match[1])), htmlText(match[2]));
  }
  const areaValue = [...fields].find(([key]) => key.startsWith('pow budynku dzialki'))?.[1] || '';
  const [areaRaw, landRaw] = areaValue.split('/');
  const offerHref = /Link do oferty:[\s\S]*?<a[^>]+href=["']([^"']+)["']/i.exec(html)?.[1];
  return {
    area_m2: positiveNumber(areaRaw),
    land_area_m2: positiveNumber(landRaw),
    offer_url: absoluteUrl(offerHref, ORIGIN),
  };
}

function positiveNumber(value) {
  const number = parsePlNumber(value);
  return number > 0 ? number : null;
}

export function pkpMaxPage(html) {
  const pages = [...String(html).matchAll(/(?:[?&]|&amp;)strona=(\d+)/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 0;
}
