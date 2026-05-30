// Tests for the history-accumulation merge (core/merge-history.js): the dataset
// must be monotonic — records the source later removes are retained, while
// re-seen events are updated from the fresh crawl.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeProperties, listingFingerprint } from '../src/core/merge-history.js';

const prop = (key, listings, extra = {}) => ({
  key, street: key.split('|')[0], street_norm: key.split('|')[0],
  building: key.split('|')[1], apt: key.split('|')[2] || null,
  kind: 'mieszkalny', listings, ...extra,
});
const L = (date, outcome, o = {}) => ({ date, round: o.round ?? 1, kind: 'mieszkalny', outcome, starting_price_pln: o.price ?? 100000, area_m2: o.area ?? null, ...o });

test('retains a property that disappeared from the fresh crawl', () => {
  const prev = [prop('a|1|2', [L('2024-01-01', 'sold')])];
  const fresh = [prop('b|3|4', [L('2026-01-01', 'active')])];
  const { properties, stats } = mergeProperties(prev, fresh);
  const keys = properties.map((p) => p.key).sort();
  assert.deepEqual(keys, ['a|1|2', 'b|3|4'], 'old property a kept, new b added');
  assert.equal(stats.kept_properties, 1);
});

test('retains an old listing absent from the fresh crawl, within a re-seen property', () => {
  const prev = [prop('a|1|2', [L('2024-01-01', 'unsold'), L('2024-06-01', 'sold')])];
  const fresh = [prop('a|1|2', [L('2026-01-01', 'active')])]; // only the new round
  const { properties } = mergeProperties(prev, fresh);
  const dates = properties[0].listings.map((l) => l.date).sort();
  assert.deepEqual(dates, ['2024-01-01', '2024-06-01', '2026-01-01'], 'all three retained');
});

test('fresh replaces same event in place (active→sold, area/price corrected, no dup)', () => {
  // same date+round+kind; outcome active→sold, price/area corrected on re-crawl
  const prev = [prop('a|1|2', [L('2026-01-01', 'active', { area: null, price: null })])];
  const fresh = [prop('a|1|2', [L('2026-01-01', 'sold', { area: 52.4, price: 95000 })])];
  const { properties } = mergeProperties(prev, fresh);
  assert.equal(properties[0].listings.length, 1, 'same date+round+kind → single row, not duplicated');
  assert.equal(properties[0].listings[0].outcome, 'sold', 'fresh outcome wins');
  assert.equal(properties[0].listings[0].area_m2, 52.4, 'fresh area wins');
  assert.equal(properties[0].listings[0].starting_price_pln, 95000, 'fresh price wins');
});

test('property-level area prefers fresh, propagates to listings', () => {
  const prev = [prop('a|1|2', [L('2024-01-01', 'sold')], { area_m2: null })];
  const fresh = [prop('a|1|2', [L('2026-01-01', 'active')], { area_m2: 40 })];
  const { properties } = mergeProperties(prev, fresh);
  assert.equal(properties[0].area_m2, 40);
  assert.ok(properties[0].listings.every((l) => l.area_m2 === 40));
});

test('empty previous → fresh passes through', () => {
  const fresh = [prop('a|1|2', [L('2026-01-01', 'active')])];
  const { properties, stats } = mergeProperties([], fresh);
  assert.equal(properties.length, 1);
  assert.equal(stats.kept_properties, 0);
});

test('fingerprint = date|round|kind: matches across outcome/price changes, splits on round', () => {
  // same date+round+kind but different outcome/price → SAME fingerprint
  assert.equal(listingFingerprint(L('2026-01-01', 'active', { round: 1, price: null })),
               listingFingerprint(L('2026-01-01', 'sold', { round: 1, price: 95000 })));
  // different round → different fingerprint
  assert.notEqual(listingFingerprint(L('2026-01-01', 'active', { round: 1 })),
                  listingFingerprint(L('2026-01-01', 'active', { round: 2 })));
});
