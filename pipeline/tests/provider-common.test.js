import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeProviderListings, normalizeVoivodeship, parsePln, todayWarsaw } from '../src/providers/common.js';

test('provider helpers parse Polish money and voivodeships', () => {
  assert.equal(parsePln('154 700,00 zł netto'), 154700);
  assert.equal(parsePln('72.000,00 PLN'), 72000);
  assert.equal(normalizeVoivodeship('warmińsko-mazurskie'), 'warminsko-mazurskie');
  assert.match(todayWarsaw(), /^20\d{2}-\d{2}-\d{2}$/);
});

test('provider merge keeps durable enrichment and ages missing active rows', () => {
  const previous = [
    { event_key: 'x:1', outcome: 'active', auction_date: '2026-01-01', area_m2: 43.4 },
    { event_key: 'x:2', outcome: 'sold', auction_date: '2025-01-01', final_price_pln: 200000 },
  ];
  const fresh = [
    { event_key: 'x:2', outcome: 'sold', auction_date: '2025-01-01', final_price_pln: null },
    { event_key: 'x:3', outcome: 'active', auction_date: '2026-12-01' },
  ];
  const merged = mergeProviderListings(previous, fresh, '2026-08-23');
  assert.equal(merged.find((row) => row.event_key === 'x:1').outcome, 'archived');
  assert.equal(merged.find((row) => row.event_key === 'x:2').final_price_pln, 200000);
  assert.equal(merged.find((row) => row.event_key === 'x:3').outcome, 'active');
});
