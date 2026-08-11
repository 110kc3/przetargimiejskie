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

import {
  applyVerifiedRenames,
  applyVerifiedAliases,
  applyVerifiedJunk,
  applyDurablePropertyHeals,
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

test('verified Bednarska migration removes only the covered legacy building row', () => {
  const unit7 = {
    key: 'bednarska|2B|7', street: 'Bednarska', street_norm: 'bednarska',
    building: '2B', apt: '7', kind: 'mieszkalny',
    listings: [listing('2024-03-11', {
      outcome: 'unsold', starting_price_pln: 109700, source_pdf: 'result.pdf',
    })],
  };
  const unit8 = {
    key: 'bednarska|2B|8', street: 'Bednarska', street_norm: 'bednarska',
    building: '2B', apt: '8', kind: 'mieszkalny',
    listings: [listing('2024-03-11', {
      outcome: 'unsold', starting_price_pln: 112600, source_pdf: 'result.pdf',
    })],
  };
  const legacy = {
    key: 'bednarska|2B|', street: 'Bednarska', street_norm: 'bednarska',
    building: '2B', apt: null, kind: 'mieszkalny',
    listings: [listing('2024-03-11', {
      outcome: 'unsold', starting_price_pln: 109700, source_pdf: 'result.pdf',
    })],
  };
  const out = applyVerifiedJunk([unit7, unit8, legacy], 'gliwice');
  assert.deepEqual(out.map((property) => property.key).sort(),
    ['bednarska|2B|7', 'bednarska|2B|8']);
  assert.equal(out.find((property) => property.key === 'bednarska|2B|7').listings.length, 1);
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

test('applyVerifiedAliases combines unique dates and lets a result row replace a same-date archived alias', () => {
  const canonical = {
    key: 'libelta|10|1', street: 'Libelta', street_norm: 'libelta', building: '10', apt: '1',
    kind: 'mieszkalny', listings: [
      listing('2026-05-11', { round: 1, outcome: 'unsold', starting_price_pln: 300690, source_pdf: 'result-may.pdf' }),
      listing('2026-07-06', { round: 2, outcome: 'unsold', starting_price_pln: 267280, source_pdf: 'result-july.pdf' }),
      listing('2026-09-07', { round: 3, outcome: 'active', starting_price_pln: 233870 }),
    ],
  };
  const alias = {
    key: 'karola libelta|10|1', street: 'Karola Libelta', street_norm: 'karola libelta', building: '10', apt: '1',
    kind: 'mieszkalny', listings: [
      listing('2026-03-30', { round: 1, outcome: 'unsold', starting_price_pln: 334100, source_pdf: 'result-march.pdf' }),
      listing('2026-07-06', { round: 3, outcome: 'archived', starting_price_pln: 267280, source: 'bip' }),
    ],
  };
  const out = applyVerifiedAliases([canonical, alias], 'gliwice');
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].listings.map((item) => item.date),
    ['2026-03-30', '2026-05-11', '2026-07-06', '2026-09-07']);
  assert.deepEqual(out[0].listings.map((item) => item.round), [1, 2, 3, 4]);
  assert.deepEqual(out[0].listings.map((item) => item.round_source),
    ['inferred', 'inferred', 'explicit', 'inferred']);
  assert.equal(out[0].listings[2].outcome, 'unsold');
  assert.equal(out[0].listings[2].source_pdf, 'result-july.pdf');
});

test('verified Daszyńskiego alias restores the full four-attempt trajectory', () => {
  const canonical = {
    key: 'daszynskiego|65|10', street: 'Daszyńskiego', street_norm: 'daszynskiego', building: '65', apt: '10',
    kind: 'mieszkalny', area_m2: 51.59, listings: [
      listing('2026-05-11', { round: 1, outcome: 'unsold', starting_price_pln: 240840, source_pdf: 'may.pdf' }),
      listing('2026-07-06', { round: 2, outcome: 'unsold', starting_price_pln: 214080, source_pdf: 'july.pdf' }),
      listing('2026-09-07', { round: 3, outcome: 'active', starting_price_pln: 214080 }),
    ],
  };
  const alias = {
    key: 'ignacego daszynskiego|65|10', street: 'Ignacego Daszyńskiego',
    street_norm: 'ignacego daszynskiego', building: '65', apt: '10',
    kind: 'mieszkalny', area_m2: 51.59, listings: [
      listing('2026-03-30', { round: 1, outcome: 'unsold', starting_price_pln: 267600, source_pdf: 'march.pdf' }),
    ],
  };
  const out = applyVerifiedAliases([canonical, alias], 'gliwice');
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'daszynskiego|65|10');
  assert.deepEqual(out[0].listings.map((item) => item.round), [1, 2, 3, 4]);
  assert.deepEqual(out[0].listings.map((item) => item.starting_price_pln),
    [267600, 240840, 214080, 214080]);
});

test('verified Bł. Czesława alias preserves explicit round III and back-fills area', () => {
  const canonical = {
    key: 'blogoslawionego czeslawa|82|8', street: 'Błogosławionego Czesława',
    street_norm: 'blogoslawionego czeslawa', building: '82', apt: '8',
    kind: 'mieszkalny', area_m2: null, listings: [
      listing('2024-08-26', {
        round: 3, outcome: 'sold', starting_price_pln: 161500,
        final_price_pln: 194440, source_pdf: 'august.pdf', area_m2: null,
      }),
    ],
  };
  const alias = {
    key: 'bl czeslawa|82|8', street: 'Bł. Czesława', street_norm: 'bl czeslawa',
    building: '82', apt: '8', kind: 'mieszkalny', area_m2: 46.59, listings: [
      listing('2024-05-13', {
        round: 1, outcome: 'unsold', starting_price_pln: 201800,
        source_pdf: 'may.pdf', area_m2: 46.59,
      }),
    ],
  };
  const out = applyVerifiedAliases([canonical, alias], 'gliwice');
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].listings.map((item) => item.round), [1, 3]);
  assert.deepEqual(out[0].listings.map((item) => item.round_source), ['inferred', 'explicit']);
  assert.equal(out[0].area_m2, 46.59);
  assert.ok(out[0].listings.every((item) => item.area_m2 === 46.59));
});

test('applyVerifiedAliases refuses to rename an alias when its canonical twin is absent', () => {
  const alias = {
    key: 'karola libelta|10|1', street: 'Karola Libelta', street_norm: 'karola libelta', building: '10', apt: '1',
    kind: 'mieszkalny', listings: [listing('2026-03-30')],
  };
  const out = applyVerifiedAliases([alias], 'gliwice');
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'karola libelta|10|1');
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
test('refresh post-merge sequence folds a re-seeded junk key and is idempotent', () => {
  const make = () => ([
    { key: 'gorna|4|', street: 'Górna', street_norm: 'gorna', building: '4', apt: null,
      kind: 'mieszkalny', listings: [listing('2023-05-10', { starting_price_pln: 100000 })] },
    { key: 'gornej 4 6 i|8|', street: 'Górnej 4 6 i', street_norm: 'gornej 4 6 i', building: '8', apt: null,
      kind: 'unknown', listings: [listing('2023-05-10', { starting_price_pln: 100000, outcome: 'sold', final_price_pln: 120000 })] },
  ]);
  const once = applyDurablePropertyHeals(make(), 'katowice', new Map());
  assert.equal(once.find((p) => p.key === 'gornej 4 6 i|8|'), undefined, 're-seeded junk folded away');
  assert.equal(once.length, 1);

  // Idempotency: feeding the healed output back through changes nothing.
  const twice = applyDurablePropertyHeals(
    once.map((p) => ({ ...p, listings: p.listings.map((l) => ({ ...l })) })),
    'katowice',
    new Map(),
  );
  assert.deepEqual(JSON.parse(JSON.stringify(twice)), JSON.parse(JSON.stringify(once)));
});
