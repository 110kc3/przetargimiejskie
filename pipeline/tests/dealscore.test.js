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
  const s = DS.score(50 * 2400, 50, 'mieszkalny', med);
  assert.ok(s && s.below === true);
  assert.equal(s.pct, 20);
});

test('score: above median is not a good deal', () => {
  const med = DS.buildCityMedians(PROPERTIES).get('testowo');
  const s = DS.score(50 * 3600, 50, 'mieszkalny', med);
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

test('fractional ownership is excluded from whole-flat reference scores', () => {
  assert.equal(sandbox.window.ZGM_DEALSCORE.score(7000,42.87,'mieszkalny',{median:5000,n:10},'1/8'),null);
  assert.equal(sandbox.window.ZGM_DEALSCORE.buildCityMedians([{city:'glogow',kind:'mieszkalny',listings:[{starting_price_pln:7000,area_m2:42.87,share:'1/8'}]}],1).size,0);
});
