// Unit coverage for the extension's deal-score helper (extension/dealscore.js).
// The DOM wiring (popup cell / content chip) can't run headless, but the
// median + percentage math is pure and IS testable — load the IIFE in a
// node:vm sandbox (same trick as normalize-parity.test.js) and exercise it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const path = fileURLToPath(new URL('../../extension/dealscore.js', import.meta.url));
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(path, 'utf8'), sandbox, { filename: path });
const DS = sandbox.window.ZGM_DEALSCORE;

// A city with 5 priced residential flats at 1000..5000 zł/m² (median 3000),
// plus a garage that must NOT skew the median, plus a too-small city.
const PROPERTIES = [
  ...[1000, 2000, 3000, 4000, 5000].map((zlM2, i) => ({
    city: 'testowo', kind: 'mieszkalny', area_m2: 50,
    listings: [{ starting_price_pln: zlM2 * 50, area_m2: 50, kind: 'mieszkalny' }],
    key: `testowo|s|${i}|`,
  })),
  { city: 'testowo', kind: 'garaz', area_m2: 18,
    listings: [{ starting_price_pln: 18 * 200, area_m2: 18, kind: 'garaz' }], key: 'testowo|g|1|' },
  { city: 'malo', kind: 'mieszkalny', area_m2: 40,
    listings: [{ starting_price_pln: 40 * 9000, area_m2: 40, kind: 'mieszkalny' }], key: 'malo|x|1|' },
];

test('buildCityMedians: residential-only median, min-sample gate', () => {
  const m = DS.buildCityMedians(PROPERTIES);
  assert.equal(m.get('testowo').median, 3000, 'median ignores the garage');
  assert.equal(m.get('testowo').n, 5);
  assert.equal(m.has('malo'), false, 'a city below min-sample (5) gets no median');
});

test('score: below median is a good deal', () => {
  const med = DS.buildCityMedians(PROPERTIES).get('testowo');
  const s = DS.score(50 * 2400, 50, 'mieszkalny', med); // 2400 vs 3000 → 20% below
  assert.ok(s && s.below === true);
  assert.equal(s.pct, 20);
});

test('score: above median is not a good deal', () => {
  const med = DS.buildCityMedians(PROPERTIES).get('testowo');
  const s = DS.score(50 * 3600, 50, 'mieszkalny', med); // 3600 vs 3000 → 20% above
  assert.ok(s && s.below === false);
  assert.equal(s.pct, 20);
});

test('score: returns null for non-residential, missing data, no median, near-median', () => {
  const med = DS.buildCityMedians(PROPERTIES).get('testowo');
  assert.equal(DS.score(100000, 18, 'garaz', med), null, 'garage excluded');
  assert.equal(DS.score(null, 50, 'mieszkalny', med), null, 'no price');
  assert.equal(DS.score(150000, 0, 'mieszkalny', med), null, 'no area');
  assert.equal(DS.score(150000, 50, 'mieszkalny', undefined), null, 'no city median');
  assert.equal(DS.score(50 * 3010, 50, 'mieszkalny', med), null, 'within ~1% of median → no badge');
});
