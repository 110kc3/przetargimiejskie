import { repairPropertyLedger } from './ledger-repairs.js';

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { applySourceCorrections } from './source-corrections.js';
import { htmlToText } from './finn-bip.js';
import { parseAddress } from './normalize.js';
import { addressRawFromLabel } from '../cities/wroclaw/parse.js';

import {
  dedupeListingsByDate,
  deriveAuctionRounds,
  healStreetVariants,
  healKinds,
} from './build-properties.js';

const HTML_ENTITY_RE = /&(?:#\d+|#x[\da-f]+|[a-z][\w-]+);/gi;

export function stripOcrStreetNoise(street) {
  const entities = [];
  const protectedStreet = String(street ?? '').replace(HTML_ENTITY_RE, (entity) => {
    const marker = `__HTML_ENTITY_${entities.length}__`;
    entities.push(entity);
    return marker;
  });
  const cleaned = protectedStreet.replace(/[;:]\S*/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.replace(/__HTML_ENTITY_(\d+)__/g, (_match, index) => entities[Number(index)]);
}

export const VERIFIED_RENAMES = {
  chelmno: [
    ['obr 3 miasta przy ul ignacego danielewskiego|6|', {
      key: 'ignacego danielewskiego|6|', street: 'Ignacego Danielewskiego',
      street_norm: 'ignacego danielewskiego', building: '6', apt: null,
    }],
  ],
  katowice: [
    ['przetargi|26|', {
      key: 'wita stwosza|1|11', street: 'Wita Stwosza', street_norm: 'wita stwosza',
      building: '1', apt: '11', area_m2: 144.07,
    }],
  ],
  gliwice: [
    ['mastalerza na dzialce nr|233|1', {
      key: 'mastalerza|0|garaz-233', street: 'Mastalerza', street_norm: 'mastalerza',
      building: '0', apt: 'garaz-233', kind: 'garaz',
    }],
  ],
  bytom: [
    ['strazacka 3 i ul podgorna|6|1', {
      key: 'strazacka|3|', street: 'Strażacka', street_norm: 'strazacka',
      building: '3', apt: null, moveAreaToLand: true,
    }],
  ],
  walbrzych: [
    ['przy ul stanislawa staszica|1|7', {
      key: 'stanislawa staszica|1|7', street: 'Stanisława Staszica',
      street_norm: 'stanislawa staszica', building: '1', apt: '7',
    }],
    ['walbrzych ul gen w andersa|131|1', {
      key: 'andersa|131|1', street: 'Andersa', street_norm: 'andersa',
      building: '131', apt: '1',
    }],
  ],
  sandomierz: [
    ['polskiej organizacji wojskowej i przetarg ustny nieograniczony przeprowadzono w dniu|26|', {
      key: 'polskiej organizacji wojskowej|0|garaz-0',
      street: 'Polskiej Organizacji Wojskowej', street_norm: 'polskiej organizacji wojskowej',
      building: '0', apt: 'garaz-0', kind: 'garaz',
    }],
  ],
};

export const VERIFIED_ALIASES = {
  gliwice: [
    ['karola libelta|10|1', 'libelta|10|1'],
    ['pawla stalmacha|7|3', 'stalmacha|7|3'],
    ['konstantego damrota|9|4', 'damrota|9|4'],
    ['ignacego daszynskiego|65|10', 'daszynskiego|65|10'],
    ['bl czeslawa|82|8', 'blogoslawionego czeslawa|82|8'],
  ],
  walbrzych: [
    ['przy ul harcerskiej|7|2', 'harcerskiej|7|2'],
    ['t kosciuszki|7|3', 'kosciuszki|7|3'],
    ['t kosciuszki|7|5A', 'kosciuszki|7|5A'],
  ],
  sandomierz: [
    ['polskiej organizacji wojskowej w sandomierzu zalacznik nr|1|',
      'polskiej organizacji wojskowej|0|garaz-0'],
  ],
};

export const VERIFIED_JUNK = {
  gliwice: [
    ['bednarska|2B|', 'bednarska|2B|7'],
  ],
  katowice: [
    ['gornej 4 6 i|8|', 'gorna|4|'],
    ['oddzialow mlodziezy ii ustny|66|', 'oddzialow mlodziezy powstanczej|5|10'],
    ['oddzialow mlodziezy i ustny|86|', 'powstanczej|5|8'],
  ],
};

export function applyVerifiedRenames(props, cityId) {
  for (const [oldKey, repl] of VERIFIED_RENAMES[cityId] || []) {
    const p = props.find((x) => x.key === oldKey);
    if (!p) continue;
    const { moveAreaToLand, ...fields } = repl;
    Object.assign(p, fields);
    if (fields.area_m2 != null) {
      for (const l of p.listings) if (l.area_m2 == null) l.area_m2 = fields.area_m2;
    }
    if (moveAreaToLand && p.area_m2 != null) {
      const a = p.area_m2;
      p.land_area_m2 = a;
      p.area_m2 = null;
      for (const l of p.listings) if (l.area_m2 === a) { l.land_area_m2 = a; l.area_m2 = null; }
    }
    console.error(`${cityId}: re-keyed ${oldKey} \u2192 ${p.key}`);
  }
}

export function applyVerifiedAliases(props, cityId) {
  let out = props;
  for (const [aliasKey, canonicalKey] of VERIFIED_ALIASES[cityId] || []) {
    const alias = out.find((property) => property.key === aliasKey);
    if (!alias) continue;
    const canonical = out.find((property) => property.key === canonicalKey);
    if (!canonical) {
      console.error(`${cityId}: REFUSING to fold alias ${aliasKey} — canonical ${canonicalKey} not found.`);
      continue;
    }
    backfillVerifiedRoundProvenance([alias, canonical], cityId);
    canonical.listings.push(...alias.listings);
    dedupeListingsByDate(canonical);
    canonical.listings.sort((left, right) => (left.date || '9999').localeCompare(right.date || '9999'));
    if (canonical.area_m2 == null && alias.area_m2 != null) canonical.area_m2 = alias.area_m2;
    if (canonical.area_m2 != null) {
      for (const listing of canonical.listings) {
        if (listing.area_m2 == null) listing.area_m2 = canonical.area_m2;
      }
    }
    if (canonical.kind === 'unknown' && alias.kind && alias.kind !== 'unknown') canonical.kind = alias.kind;
    deriveAuctionRounds(canonical);
    out = out.filter((property) => property !== alias);
    console.error(`${cityId}: folded verified alias ${aliasKey} into ${canonicalKey}.`);
  }
  return out;
}

export function backfillVerifiedRoundProvenance(props, cityId) {
  if (cityId !== 'gliwice') return;
  for (const property of props || []) {
    for (const listing of property.listings || []) {
      if (!Number.isInteger(listing.round) || listing.round < 1) continue;
      if (
        listing.round_source || listing.round_provenance ||
        listing.round_inferred != null || listing.round_explicit != null
      ) continue;
      if (
        listing.source === 'bip' ||
        (listing.source_pdf && (listing.outcome === 'sold' || listing.outcome === 'no_winner'))
      ) {
        listing.round_source = 'explicit';
      } else if (
        listing.outcome === 'unsold' || listing.outcome === 'active' || listing.outcome === 'archived'
      ) {
        listing.round_source = 'inferred';
      }
    }
  }
}

const GLOBAL_TWIN_SUBS = [['skiej', 'ska'], ['ckiej', 'cka'], ['dzkiej', 'dzka']];

export function buildGlobalStreetDisplay(dataDir) {
  const byNorm = new Map();
  for (const cityId of readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name)) {
    const path = join(dataDir, cityId, 'properties.json');
    if (!existsSync(path)) continue;
    try {
      for (const p of JSON.parse(readFileSync(path, 'utf8')).properties || []) {
        if (!byNorm.has(p.street_norm)) byNorm.set(p.street_norm, p.street);
      }
    } catch { /* unreadable city — skip its evidence */ }
  }
  return byNorm;
}

/**
 * Flip an ambiguous -skiej/-ckiej/-dzkiej DISPLAY street to its nominative form
 * when a nominative twin exists in ANY city (per globalByNorm). Presentation
 * only — key and street_norm are untouched. Complements build-properties'
 * applyDisplayStreets, which only flips when the twin is in the SAME city; those
 * within-city flips already survive merge, these cross-city ones do not.
 * @param {Array} props   built properties array (mutated in place)
 * @param {string} cityId
 * @param {Map<string, string>} globalByNorm  from buildGlobalStreetDisplay
 */
export function crossCityDisplay(props, cityId, globalByNorm) {
  if (!globalByNorm) return;
  for (const p of props) {
    if (/[\s-]/.test(p.street)) continue;
    for (const [gen, nom] of GLOBAL_TWIN_SUBS) {
      if (!p.street_norm.endsWith(gen)) continue;
      const twinNorm = p.street_norm.slice(0, -gen.length) + nom;
      const twin = globalByNorm.get(twinNorm);
      if (twin && !/[\s-]/.test(twin) && p.street.toLowerCase().endsWith(gen)) {
        const next = p.street.slice(0, -gen.length) + nom;
        if (next !== p.street) {
          console.error(`${cityId}: display ${p.street} \u2192 ${next} (cross-city twin)`);
          p.street = next;
        }
      }
      break;
    }
  }
}

export function applyVerifiedJunk(props, cityId) {
  let out = props;
  for (const [junkKey, survivorKey] of VERIFIED_JUNK[cityId] || []) {
    const junk = out.find((p) => p.key === junkKey);
    const survivor = out.find((p) => p.key === survivorKey);
    if (!junk) continue;
    if (!survivor) {
      console.error(`${cityId}: REFUSING to fold ${junkKey} \u2014 survivor ${survivorKey} not found.`);
      continue;
    }
    const allCovered = junk.listings.every((jl) =>
      jl.date && survivor.listings.some((sl) =>
        sl.date === jl.date &&
        (jl.starting_price_pln == null || sl.starting_price_pln == null ||
          jl.starting_price_pln === sl.starting_price_pln)),
    );
    if (!allCovered) {
      console.error(`${cityId}: REFUSING to fold ${junkKey} \u2014 it holds listings absent from ${survivorKey}.`);
      continue;
    }
    survivor.listings.push(...junk.listings);
    dedupeListingsByDate(survivor);
    survivor.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    out = out.filter((p) => p !== junk);
    console.error(`${cityId}: folded junk property ${junkKey} into ${survivorKey}.`);
  }
  return out;
}

function repairBolescinResultIdentity(props, cityId) {
  if (cityId !== 'trzebnica') return props;
  const oldKey = 'bolescin|0|2';
  // Preserve any other unknown-building rows rather than guessing their identity.
  const sources = new Map([
    ['2026-02-27', 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3110/przetarg-ggn-p-5-2026'],
    ['2026-08-10', 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3445/przetargggnp142026'],
    ['2026-09-21', 'https://bip.trzebnica.pl/przetarg-nieruchomosci/3489/przetarg-nr-ggn-p-18-2026'],
  ]);
  return props.flatMap((property) => {
    if (property.key !== oldKey) return [property];
    const isVerified = (listing) => sources.has(listing.date) && sources.get(listing.date) === listing.detail_url;
    const verified = property.listings.filter(isVerified);
    if (!verified.length) return [property];
    const remaining = property.listings.filter((listing) => !isVerified(listing));
    const { warning: _warning, ...identity } = parseAddress('Boleścin 50/2');
    const target = { ...property, ...identity, listings: verified,
      legacy_keys: remaining.length ? [] : [...new Set([...(property.legacy_keys || []), oldKey])] };
    return [...(remaining.length ? [{ ...property, listings: remaining }] : []), target];
  });
}

/**
 * Apply the complete durable post-build heal sequence used by normal refresh,
 * preserve-on-empty refresh, and the offline healer. Keeping one entry point
 * prevents an outage path from re-publishing aliases or stale inferred rounds
 * that the normal merge path would have fixed.
 * @param {Array} props
 * @param {string} cityId
 * @param {Map<string, string>} [globalByNorm]
 * @returns {Array}
 */
export function applyDurablePropertyHeals(props, cityId, globalByNorm) {
  for (const property of props) {
    const decoded = htmlToText(property.street);
    let address = null;
    if (decoded !== property.street) {
      const street = parseAddress(`${decoded} 0`);
      if (street) address = { street: decoded, street_norm: street.street_norm,
        building: property.building, apt: property.apt,
        key: `${street.street_norm}|${property.building}|${property.apt ?? ''}` };
    }
    if (cityId === 'drawsko-pomorskie' && /Lp\. Adres nieruchomości/.test(decoded)) {
      const clean = /(?:ul|pl|al|os)\.\s+([^]+)$/.exec(decoded)?.[1];
      if (clean) address = parseAddress(`${clean} ${property.building}${property.apt ? '/' + property.apt : ''}`);
    }
    if (cityId === 'wroclaw') {
      const raw = `${decoded} ${property.building}${property.apt ? '/' + property.apt : ''}`;
      address = parseAddress(addressRawFromLabel(raw)) || address;
    }
    if (address && address.key !== property.key) {
      property.legacy_keys = [...new Set([...(property.legacy_keys || []), property.key])];
      const { warning: _warning, ...identity } = address;
      Object.assign(property, identity);
    }
  }
  props = repairPropertyLedger(props, cityId);
  props = applySourceCorrections(props, cityId);
  props = repairBolescinResultIdentity(props, cityId);
  backfillVerifiedRoundProvenance(props, cityId);
  applyVerifiedRenames(props, cityId);
  const identities = new Map();
  for (const property of props) {
    const existing = identities.get(property.key);
    if (!existing) { identities.set(property.key, property); continue; }
    existing.listings.push(...property.listings);
    existing.legacy_keys = [...new Set([...(existing.legacy_keys || []), ...(property.legacy_keys || [])])];
    if (existing.area_m2 == null) existing.area_m2 = property.area_m2;
  }
  let out = healStreetVariants([...identities.values()]);
  out = applyVerifiedAliases(out, cityId);
  crossCityDisplay(out, cityId, globalByNorm);
  out = applyVerifiedJunk(out, cityId);
  healKinds(out);
  for (const property of out) deriveAuctionRounds(property);
  return out;
}
