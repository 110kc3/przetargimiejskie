// Guards the durable heals shared by scripts/heal-properties.js and refresh.js
// (core/verified-heals.js). These fold/re-key/flip verified corrections that
// history-merge would otherwise re-seed from the committed file on every run.
// The refresh integration can't be exercised offline (it needs a crawl), so the
// last test replays refresh.js's exact post-merge sequence on an in-memory
// fixture with a re-seeded junk key — that is the integration proof.
//
// Fixtures use the REAL map entries (katowice/bytom) so a change to those maps
// that breaks a fold is caught here.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { healStreetVariants, healKinds } from '../src/core/build-properties.js';
import {
  applyVerifiedRenames,
  applyVerifiedJunk,
  crossCityDisplay,
} from '../src/core/verified-heals.js';

// Silence the heals' console.error progress during the run (failures only).
const origError = console.error;
test.before(() => { console.error = () => {}; });
test.after(() => { console.error = origError; });

const listing = (date, extra = {}) => ({
  date, round: null, kind: 'mieszkalny', starting_price_pln: null,
  outcome: 'archived', final_price_pln: null, ...extra,
});

// ---- applyVerifiedJunk -----------------------------------------------------

test('applyVerifiedJunk folds a covered junk key into its survivor', () => {
  const survivor = {
    key: 'gorna|4|', street: 'Górna', street_norm: 'gorna', building: '4', apt: null,
    kind: 'mieszkalny', listings: [listing('2023-05-10', { starting_price_pln: 100000 })],
  };
  const junk = {
    key: 'gornej 4 6 i|8|', street: 'Górnej 4 6 i', street_norm: 'gornej 4 6 i', building: '8', apt: null,
    kind: 'unknown', listings: [listing('2023-05-10', { starting_price_pln: 100000, outcome: 'sold', final_price_pln: 120000, source_pdf: 'katowice-2023.pdf' })],
  };
  const out = applyVerifiedJunk([survivor, junk], 'katowice');
  assert.equal(out.length, 1, 'junk property should be removed');
  assert.equal(out.find((p) => p.key === 'gornej 4 6 i|8|'), undefined);
  // same-date rows deduped onto the survivor; the sold outcome/price survives.
  assert.equal(out[0].key, 'gorna|4|');
  assert.ok(out[0].listings.some((l) => l.outcome === 'sold' && l.final_price_pln === 120000));
});

test('applyVerifiedJunk REFUSES to fold when the junk holds an uncovered date', () => {
  const survivor = {
    key: 'gorna|4|', street: 'Górna', street_norm: 'gorna', building: '4', apt: null,
    kind: 'mieszkalny', listings: [listing('2023-05-10')],
  };
  const junk = {
    key: 'gornej 4 6 i|8|', street: 'Górnej', street_norm: 'gornej 4 6 i', building: '8', apt: null,
    kind: 'unknown', listings: [listing('2099-01-01')], // date absent from survivor
  };
  const out = applyVerifiedJunk([survivor, junk], 'katowice');
  assert.equal(out.length, 2, 'fold must be refused — both properties remain');
});

test('applyVerifiedJunk REFUSES to fold when the survivor is missing', () => {
  const junk = {
    key: 'gornej 4 6 i|8|', street: 'Górnej', street_norm: 'gornej 4 6 i', building: '8', apt: null,
    kind: 'unknown', listings: [listing('2023-05-10')],
  };
  const out = applyVerifiedJunk([junk], 'katowice');
  assert.equal(out.length, 1, 'no survivor → junk is kept, not dropped');
});

// ---- applyVerifiedRenames --------------------------------------------------

test('applyVerifiedRenames re-keys and moves a whole-property total to land', () => {
  const p = {
    key: 'strazacka 3 i ul podgorna|6|1', street: 'Strazacka 3 i ul Podgorna',
    street_norm: 'strazacka 3 i ul podgorna', building: '6', apt: '1', kind: 'mieszkalny',
    area_m2: 1749, listings: [listing('2024-01-01', { area_m2: 1749 })],
  };
  const arr = [p];
  applyVerifiedRenames(arr, 'bytom');
  assert.equal(p.key, 'strazacka|3|');
  assert.equal(p.street, 'Strażacka');
  assert.equal(p.area_m2, null, 'unit area cleared');
  assert.equal(p.land_area_m2, 1749, 'total moved to land_area_m2');
  assert.equal(p.listings[0].area_m2, null);
  assert.equal(p.listings[0].land_area_m2, 1749);
});

test('applyVerifiedRenames back-fills the verified area onto area-less listings', () => {
  const p = {
    key: 'przetargi|26|', street: 'Przetargi', street_norm: 'przetargi', building: '26', apt: null,
    kind: 'mieszkalny', listings: [listing('2023-03-20', { outcome: 'sold' })], // no area
  };
  applyVerifiedRenames([p], 'katowice');
  assert.equal(p.key, 'wita stwosza|1|11');
  assert.equal(p.area_m2, 144.07);
  assert.equal(p.listings[0].area_m2, 144.07, 'area back-filled onto the listing');
});

// ---- crossCityDisplay ------------------------------------------------------

test('crossCityDisplay flips an adjectival genitive with a cross-city twin, not a surname', () => {
  const globalByNorm = new Map([['raciborska', 'Raciborska']]); // twin exists somewhere
  const props = [
    { key: 'raciborskiej|5|', street: 'Raciborskiej', street_norm: 'raciborskiej', building: '5', apt: null, kind: 'mieszkalny', listings: [] },
    { key: 'sklodowskiej|2|', street: 'Skłodowskiej', street_norm: 'sklodowskiej', building: '2', apt: null, kind: 'mieszkalny', listings: [] },
  ];
  crossCityDisplay(props, 'testcity', globalByNorm);
  assert.equal(props[0].street, 'Raciborska', 'adjectival → nominative (twin present)');
  assert.equal(props[1].street, 'Skłodowskiej', 'surname unchanged (no twin)');
});

test('crossCityDisplay is a no-op when no evidence map is supplied', () => {
  const props = [{ key: 'raciborskiej|5|', street: 'Raciborskiej', street_norm: 'raciborskiej', building: '5', apt: null, kind: 'mieszkalny', listings: [] }];
  crossCityDisplay(props, 'testcity', undefined);
  assert.equal(props[0].street, 'Raciborskiej');
});

// ---- refresh.js post-merge integration + idempotency -----------------------

// Replays refresh.js's exact post-merge order on a fixture shaped like the
// output of mergeProperties (survivor + a junk key the merge re-seeded from the
// committed file). Proves the wired sequence self-heals — and that a second
// pass changes nothing.
function refreshPostMerge(properties, cityId, globalByNorm) {
  applyVerifiedRenames(properties, cityId);
  properties = healStreetVariants(properties);
  crossCityDisplay(properties, cityId, globalByNorm);
  properties = applyVerifiedJunk(properties, cityId);
  healKinds(properties);
  return properties;
}

test('refresh post-merge sequence folds a re-seeded junk key and is idempotent', () => {
  const make = () => ([
    { key: 'gorna|4|', street: 'Górna', street_norm: 'gorna', building: '4', apt: null,
      kind: 'mieszkalny', listings: [listing('2023-05-10', { starting_price_pln: 100000 })] },
    { key: 'gornej 4 6 i|8|', street: 'Górnej 4 6 i', street_norm: 'gornej 4 6 i', building: '8', apt: null,
      kind: 'unknown', listings: [listing('2023-05-10', { starting_price_pln: 100000, outcome: 'sold', final_price_pln: 120000 })] },
  ]);
  const once = refreshPostMerge(make(), 'katowice', new Map());
  assert.equal(once.find((p) => p.key === 'gornej 4 6 i|8|'), undefined, 're-seeded junk folded away');
  assert.equal(once.length, 1);

  // Idempotency: feeding the healed output back through changes nothing.
  const twice = refreshPostMerge(once.map((p) => ({ ...p, listings: p.listings.map((l) => ({ ...l })) })), 'katowice', new Map());
  assert.deepEqual(JSON.parse(JSON.stringify(twice)), JSON.parse(JSON.stringify(once)));
});
