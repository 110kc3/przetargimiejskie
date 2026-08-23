import { createHash } from 'node:crypto';

import { parseAddress } from '../core/normalize.js';

const ENTITIES = {
  amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  oacute: 'ó', Oacute: 'Ó', aogon: 'ą', Aogon: 'Ą', cacute: 'ć', Cacute: 'Ć',
  eogon: 'ę', Eogon: 'Ę', lstrok: 'ł', Lstrok: 'Ł', nacute: 'ń', Nacute: 'Ń',
  sacute: 'ś', Sacute: 'Ś', zacute: 'ź', Zacute: 'Ź', zdot: 'ż', Zdot: 'Ż',
};

export function decodeHtml(value = '') {
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[entity] ?? ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

export function htmlText(value = '', { breaks = ' ' } = {}) {
  return decodeHtml(String(value)
    .replace(/<br\s*\/?>/gi, breaks)
    .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '$1')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePlNumber(value) {
  if (value == null || value === '') return null;
  let normalized = htmlText(value).replace(/[^0-9.,-]/g, '');
  if (!normalized) return null;
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  } else {
    const dots = normalized.match(/\./g)?.length || 0;
    if (dots > 1) normalized = normalized.replace(/\./g, '');
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function parsePln(value) {
  const number = parsePlNumber(value);
  return number == null ? null : Math.round(number);
}

export function isoDate(value) {
  const text = htmlText(value);
  let match = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(text);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  match = /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/.exec(text);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : null;
}

export function fold(value = '') {
  return String(value).toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function slugify(value = '') {
  return fold(value).replace(/\s+/g, '-');
}

export function normalizeVoivodeship(value = '') {
  return slugify(String(value).replace(/^woj\.?\s*/i, '')) || null;
}

export function absoluteUrl(value, origin) {
  if (!value) return null;
  try { return new URL(decodeHtml(value), origin).toString(); }
  catch { return null; }
}

export function addressParts(addressRaw) {
  const parsed = parseAddress(addressRaw);
  return parsed
    ? { street: parsed.street, building: parsed.building, apt: parsed.apt }
    : { street: addressRaw || null, building: null, apt: null };
}

export function stableId(...parts) {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

export function providerEventKey(provider, city, address, auctionDate, fallback = '') {
  const identity = [fold(city), fold(address), auctionDate || '', fold(fallback)].join('|');
  return `${provider}:${stableId(identity)}`;
}

export function romanOrNumber(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const roman = value.toUpperCase();
  const values = { I: 1, V: 5, X: 10 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = values[roman[i]] || 0;
    const next = values[roman[i + 1]] || 0;
    result += current < next ? -current : current;
  }
  return result || null;
}

export function roundFromText(value = '') {
  // Horizontal whitespace only: numbered PDF sections such as "3.\n\nPrzetarg"
  // are not auction rounds.
  const match = /\b(\d+|I{1,3}|IV|V|VI{0,3}|IX|X)[ \t]*(?:[.-]?[ \t]*)?(?:przetarg|aukcj)/i.exec(value);
  return match ? romanOrNumber(match[1]) : null;
}

export function auctionMode(value = '') {
  const text = fold(value);
  if (text.includes('przetarg pisemny') || text.includes('pisemnego przetarg')) return 'written_tender';
  if (text.includes('przetarg ustny') || text.includes('ustnego przetarg') || text.includes('licytacj')) return 'oral_auction';
  if (text.includes('rokowania')) return 'negotiations';
  return 'unknown';
}

export function todayWarsaw() {
  // Do not rely on en-CA rendering as YYYY-MM-DD: small-ICU Node builds can
  // silently fall back to en-US and return MM/DD/YYYY. Time-zone conversion is
  // still reliable, so assemble the numeric parts explicitly.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function ageProviderListing(listing, today = todayWarsaw()) {
  if (listing.outcome !== 'active') return listing;
  const decisiveDate = listing.auction_date || listing.bid_deadline;
  return decisiveDate && decisiveDate < today
    ? { ...listing, outcome: 'archived' }
    : listing;
}

/** Fresh rows win; rows missing from today's source remain as durable history. */
export function mergeProviderListings(previous = [], fresh = [], today = todayWarsaw()) {
  const merged = new Map();
  for (const row of previous) if (row?.event_key) merged.set(row.event_key, ageProviderListing(row, today));
  for (const row of fresh) {
    if (!row?.event_key) continue;
    const prior = merged.get(row.event_key) || {};
    const next = { ...prior, ...row };
    // Detail/OCR enrichment is expensive and some source indexes omit it on a
    // later day. A missing value must not erase a previously verified value.
    for (const key of ['area_m2', 'land_area_m2']) {
      if (next[key] == null && prior[key] > 0) next[key] = prior[key];
    }
    for (const key of ['final_price_pln', 'bidders', 'round', 'offer_url']) {
      if (next[key] == null && prior[key] != null) next[key] = prior[key];
    }
    merged.set(row.event_key, ageProviderListing(next, today));
  }
  return [...merged.values()].sort((a, b) => {
    const ad = a.auction_date || a.publication_date || '';
    const bd = b.auction_date || b.publication_date || '';
    return bd.localeCompare(ad) || String(a.event_key).localeCompare(String(b.event_key));
  });
}

export function providerCounts(listings) {
  const count = (outcome) => listings.filter((row) => row.outcome === outcome).length;
  return {
    total_listings: listings.length,
    active_auctions: count('active'),
    historical_auctions: listings.filter((row) => row.outcome !== 'active').length,
    sold_auctions: count('sold'),
    unsold_auctions: count('unsold') + count('no_winner'),
    cancelled_auctions: count('cancelled'),
  };
}
