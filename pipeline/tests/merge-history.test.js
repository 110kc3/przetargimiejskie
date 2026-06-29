// Tests for the history-accumulation merge (core/merge-history.js): the dataset
// must be monotonic — records the source later removes are retained, while
// re-seen events are updated from the fresh crawl.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeProperties, listingFingerprint, archivePastActive } from '../src/core/merge-history.js';

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

test('fingerprint = date: stable across outcome/price/round changes', () => {
  // same date+kind but different outcome/price → SAME fingerprint
  assert.equal(listingFingerprint(L('2026-01-01', 'active', { round: 1, price: null })),
               listingFingerprint(L('2026-01-01', 'sold', { round: 1, price: 95000 })));
  // round is NOT part of identity (it's derived) → SAME fingerprint
  assert.equal(listingFingerprint(L('2026-01-01', 'active', { round: 1 })),
               listingFingerprint(L('2026-01-01', 'active', { round: 2 })));
});

test('archivePastActive ages out retained past-dated actives, keeps future + dateless', () => {
  // A listing the source removed while still 'active' is retained by the merge
  // frozen at 'active' — it must age out by date instead of inflating
  // active_auctions forever (June 2026 fix).
  const prev = [prop('a|1|2', [L('2026-01-15', 'active')])]; // gone upstream
  const fresh = [prop('b|3|4', [L('2026-12-01', 'active'), L(null, 'active')])];
  const { properties } = mergeProperties(prev, fresh);
  const n = archivePastActive(properties, '2026-06-09');
  assert.equal(n, 1);
  const a = properties.find((p) => p.key === 'a|1|2');
  assert.equal(a.listings[0].outcome, 'archived', 'past-dated retained row aged out');
  const b = properties.find((p) => p.key === 'b|3|4');
  assert.deepEqual(b.listings.map((l) => l.outcome), ['active', 'active'],
    'future-dated and dateless rows stay active');
});

test('round derivation does not duplicate: null-round old + derived-round fresh → one row', () => {
  // Regression: Gliwice historical rows were stored with round=null; once the
  // pipeline began deriving round, the fresh copy had round=N. With round in the
  // fingerprint, old (null) and new (N) both survived — doubling every row.
  const prev = [prop('zwyciestwa|45|7', [
    L('2025-12-08', 'unsold', { round: null }),
    L('2026-01-26', 'unsold', { round: null }),
  ])];
  const fresh = [prop('zwyciestwa|45|7', [
    L('2025-12-08', 'unsold', { round: 1 }),
    L('2026-01-26', 'unsold', { round: 2 }),
  ])];
  const { properties } = mergeProperties(prev, fresh);
  assert.equal(properties[0].listings.length, 2, 'no duplication: 2 distinct dates, not 4');
  const byDate = Object.fromEntries(properties[0].listings.map((l) => [l.date, l.round]));
  assert.equal(byDate['2025-12-08'], 1, 'fresh derived round wins');
  assert.equal(byDate['2026-01-26'], 2);
});

test('null-twin: dateless row superseded by a dated row from the same source is dropped', () => {
  // Regression (Warszawa AMW): a pre-fix run stored the listing dateless +
  // priceless; the fixed parser later yields the date + price from the SAME PDF.
  // The dateless row (fingerprinted by detail_url) and the dated row
  // (fingerprinted by date) must not both survive.
  const url = 'https://eto.um.warszawa.pl/announcement/attachment/154506/256690';
  const prev = [prop('smocza|4|13', [L(null, 'active', { detail_url: url, price: null, area: 19.6 })])];
  const fresh = [prop('smocza|4|13', [L('2026-07-24', 'active', { detail_url: url, price: 340000, area: 19.6 })])];
  const { properties } = mergeProperties(prev, fresh);
  assert.equal(properties[0].listings.length, 1, 'null-twin collapsed to one row');
  assert.equal(properties[0].listings[0].date, '2026-07-24', 'the dated row survives');
  assert.equal(properties[0].listings[0].starting_price_pln, 340000);
});

test('null-twin guard: a dateless row with no dated twin from the same source is kept', () => {
  const prev = [prop('a|1|2', [L(null, 'active', { detail_url: 'u1' })])];
  const fresh = [prop('a|1|2', [L('2026-01-01', 'active', { detail_url: 'u2' })])]; // different source
  const { properties } = mergeProperties(prev, fresh);
  assert.equal(properties[0].listings.length, 2, 'distinct sources both kept');
});
