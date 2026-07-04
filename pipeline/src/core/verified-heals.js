// Verified, city-specific heals that must survive EVERY refresh — the single
// source of truth shared by:
//   - scripts/heal-properties.js  (manual, offline, whole-corpus healer)
//   - refresh.js                  (per-city, post-merge, runs in CI)
//
// Why these live in the post-merge heal and not only in the parsers: history
// merge re-seeds every previously-committed key from data/<city>/properties.json
// on every run, so a since-fixed parser bug's junk key (or a display flip the
// merge reverts via `old.street = fp.street`) is otherwise resurrected forever.
// The street-variant, plot-area and kind heals already run post-merge inside
// build-properties (healStreetVariants → applyDisplayStreets/healPlotAreas, and
// healKinds). The three heals HERE close the remaining gaps:
//   1. VERIFIED_RENAMES  — re-key a junk key to its verified true identity.
//   2. crossCityDisplay  — the -skiej/-ckiej/-dzkiej display flip whose
//        nominative-twin evidence lives in ANOTHER city (applyDisplayStreets
//        only sees within-city twins, so these specific flips are lost on merge).
//   3. VERIFIED_JUNK     — fold a bled junk key into its named survivor.
//
// Every map entry is data-verified against the cached source document; do not
// add speculative entries. Maps are keyed by city id and are no-ops for any
// city without an entry, so calling all three unconditionally per city is safe.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { dedupeListingsByDate } from './build-properties.js';

// city → [old key, replacement fields] — junk keys from since-fixed parser bugs
// whose TRUE identity was verified against the cached source document.
//   katowice przetargi 26 — page-break artifact in the 2023 yearly PDF: footer
//     "Strona 1" + header "Przetargi" + row number "26." glued into an address.
//     The row (Wita Stwosza 1/11, 144,07 m², 20.03.2023) identifies the flat.
//   gliwice mastalerza — garage on a bare parcel ("zabudowanej garażem … przy
//     ul. Mastalerza na działce nr 233/1"); re-keyed with the rejon-garage
//     convention the fixed parser now emits.
//   bytom strażacka — joint lot ("ul. Strażacka 3 i ul. Podgórna 6/1", one
//     price); keyed on the first address, the 1 749 m² total is the whole
//     property, not a unit → land_area_m2.
export const VERIFIED_RENAMES = {
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
};

// city → [junk key, surviving key] — fold junk into survivor ONLY if every dated
// listing of the junk property has a same-date listing on the survivor (with a
// matching starting price when both carry one); otherwise the fold is refused.
// Folding + per-date dedupe lets a result-backed junk row upgrade the survivor
// (an announcement-only 'archived' row gains the sold outcome + achieved price)
// instead of being thrown away.
//   gornej 4 6 i|8|  — old capture-to-end-of-title bug; its one archived row is
//                      byte-identical to gorna|4|'s.
//   …ii ustny|66|    — yearly-summary column bleed; same date AND same 250 000 zł
//                      start as powstanczej|5|10's archived row (fold also
//                      contributes the achieved price).
//   …i ustny|86|     — yearly-summary column bleed; "86" is the bled area
//                      (86,38 m²); its 2025-02-24 / 450 000 → 517 500 zł sale
//                      matches exactly powstanczej|5|8 (area 86,38).
export const VERIFIED_JUNK = {
  katowice: [
    ['gornej 4 6 i|8|', 'gorna|4|'],
    ['oddzialow mlodziezy ii ustny|66|', 'oddzialow mlodziezy powstanczej|5|10'],
    ['oddzialow mlodziezy i ustny|86|', 'powstanczej|5|8'],
  ],
};

/**
 * Apply the verified re-keys for a city, in place. Sets the property's true
 * key/street/fields; back-fills a verified area onto area-less listings; and,
 * when the entry sets `moveAreaToLand`, migrates a whole-property total out of
 * the unit-area field. No-op for a city with no entry.
 * @param {Array} props   built properties array (mutated in place)
 * @param {string} cityId
 */
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

// Ambiguous adjectival endings: the genitive can be a place adjective
// ("Raciborskiej" → "Raciborska") OR a female-patron surname ("Skłodowskiej",
// which stays). The tell is a nominative twin street existing SOMEWHERE.
const GLOBAL_TWIN_SUBS = [['skiej', 'ska'], ['ckiej', 'cka'], ['dzkiej', 'dzka']];

/**
 * Build the cross-city display-evidence map (street_norm → display street) from
 * every committed city's properties.json. Used by crossCityDisplay to decide
 * whether an ambiguous -skiej/-ckiej/-dzkiej name is adjectival (has a
 * nominative twin somewhere) or a surname (no twin). Built once from the
 * committed baseline — the evidence is deliberately independent of the city
 * currently being refreshed.
 * @param {string} dataDir  absolute path to the data/ directory
 * @returns {Map<string, string>}
 */
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

/**
 * Fold each verified junk key for a city into its named survivor, returning the
 * properties array with folded junk removed. A fold is REFUSED (and logged) if
 * the survivor is missing, or if the junk holds any dated listing not covered by
 * a same-date (price-compatible) listing on the survivor — so a re-seeded junk
 * key that no longer matches is never silently merged. No-op for a city with no
 * entry.
 * @param {Array} props   built properties array
 * @param {string} cityId
 * @returns {Array} properties with folded junk removed
 */
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
