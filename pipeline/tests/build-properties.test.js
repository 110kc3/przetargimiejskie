// Regression tests for buildCityData's same-run healing (June 2026 review):
//   1. dual-stream dedupe — Katowice surfaces the same auction from the
//      results PDF AND the announcement archive; the announcement row used to
//      either replace the result record in merge-history or survive next to
//      it and inflate the derived round (observed: grzyski|1|7 got a
//      fabricated round 2; sklodowskiej curie|21|1 lost its result record).
//   2. street case-variant coalescing — "Staromiejska" (results PDF) vs
//      "Staromiejskiej" (announcement) used to become two properties.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildCityData } from '../src/core/build-properties.js';
import { parseAddress } from '../src/core/normalize.js';

const resultRec = (addrRaw, date, o = {}) => ({
  auction_date: date,
  source_pdf: o.source_pdf ?? 'https://example/wyniki.pdf',
  kind: o.kind ?? 'unknown',
  address_raw: addrRaw,
  address: parseAddress(addrRaw),
  round: o.round ?? null,
  starting_price_pln: o.starting ?? null,
  final_price_pln: o.final ?? null,
  outcome: o.outcome ?? 'sold',
  unsold_reason: o.unsold_reason ?? null,
  notes: [],
});

const activeListing = (addrRaw, date, o = {}) => ({
  kind: o.kind ?? 'mieszkalny',
  round: o.round ?? 1,
  address_raw: addrRaw,
  address: parseAddress(addrRaw),
  auction_date: date,
  area_m2: o.area ?? null,
  starting_price_pln: o.starting ?? null,
  detail_url: o.detail_url ?? 'https://example/ogloszenie',
  wadium_deadline: null,
  viewing_date: null,
});

test('same auction from results PDF + announcement collapses into ONE result-backed listing', () => {
  // Past date → the announcement-derived row would be 'archived'.
  const { properties } = buildCityData({
    allRecords: [resultRec('ul. Grzyśki 1/7', '2026-02-17', { starting: 280000, final: 286000 })],
    active: [activeListing('ul. Grzyśki 1/7', '2026-02-17', { area: 48.3, starting: 280000 })],
    wykaz: [],
    detailAreas: new Map(),
  });
  assert.equal(properties.length, 1);
  const p = properties[0];
  assert.equal(p.listings.length, 1, 'one auction → one listing, not two');
  const l = p.listings[0];
  assert.equal(l.outcome, 'sold', 'result record wins over announcement row');
  assert.equal(l.final_price_pln, 286000);
  assert.equal(l.round, 1, 'no fabricated second attempt');
  assert.equal(l.kind, 'mieszkalny', 'kind back-filled from the announcement');
  assert.equal(l.area_m2, 48.3, 'area back-filled from the announcement');
  assert.equal(l.detail_url, 'https://example/ogloszenie', 'detail_url back-filled');
});

test('street case variants (genitive ↔ nominative) coalesce into one property', () => {
  const { properties } = buildCityData({
    allRecords: [resultRec('ul. Staromiejska 15/8', '2026-05-19', { outcome: 'unsold', starting: 160000 })],
    active: [activeListing('ul. Staromiejskiej 15/8', '2026-05-19', { starting: 160000 })],
    wykaz: [],
    detailAreas: new Map(),
  });
  assert.equal(properties.length, 1, 'one flat, not two key spellings');
  assert.equal(properties[0].key, 'staromiejska|15|8', 'nominative key survives');
  assert.equal(properties[0].listings.length, 1);
  assert.equal(properties[0].listings[0].outcome, 'unsold');
});

test('distinct dates remain distinct listings with derived rounds', () => {
  const { properties } = buildCityData({
    allRecords: [
      resultRec('ul. Polna 3/2', '2025-11-03', { outcome: 'unsold' }),
      resultRec('ul. Polna 3/2', '2026-01-12', { outcome: 'sold', final: 200000 }),
    ],
    active: [],
    wykaz: [],
    detailAreas: new Map(),
  });
  assert.equal(properties[0].listings.length, 2);
  assert.deepEqual(properties[0].listings.map((l) => l.round), [1, 2]);
});
