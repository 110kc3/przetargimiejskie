import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLand, landKey, splitParcels } from '../src/core/build-land.js';

test('landKey prefers parcel, then obręb-qualified parcel, then address', () => {
  assert.equal(landKey({ dzialka_nr: '233/1' }), 'dz|233/1');
  assert.equal(landKey({ dzialka_nr: '233/1', obreb: 'Śródmieście' }), 'dz|śródmieście|233/1');
  assert.equal(landKey({ address: { key: 'solskiego|10|' } }), 'solskiego|10|');
  assert.equal(landKey({ street: 'Solskiego', street_norm: 'solskiego', building: '10' }), 'solskiego|10|');
  assert.equal(landKey({ address_raw: 'ul. Bukowa dz. 5' }), 'addr|ul. bukowa dz. 5');
  assert.equal(landKey({}), null);
});

test('one plot per parcel; two rounds fold into one entry with 2 listings', () => {
  const { plots } = buildLand([
    { dzialka_nr: '1963/59', obreb: 'Brzezinka', area_m2: 514, starting_price_pln: 100000, auction_date: '2025-09-01', round: 1, outcome: 'archived' },
    { dzialka_nr: '1963/59', obreb: 'Brzezinka', area_m2: 514, starting_price_pln: 90000, auction_date: '2026-01-15', round: 4, outcome: 'active' },
  ], 'myslowice');
  assert.equal(plots.length, 1);
  const p = plots[0];
  assert.equal(p.key, 'dz|brzezinka|1963/59');
  assert.equal(p.kind, 'grunt');
  assert.equal(p.city, 'myslowice');
  assert.equal(p.area_m2, 514);
  assert.equal(p.listings.length, 2);
  // sorted oldest → newest, round preserved
  assert.deepEqual(p.listings.map((l) => l.round), [1, 4]);
  assert.equal(p.listings[0].outcome, 'archived');
});

test('distinct parcels stay separate; latest-date plot sorts first', () => {
  const { plots } = buildLand([
    { dzialka_nr: '10/1', auction_date: '2025-01-01', starting_price_pln: 1 },
    { dzialka_nr: '20/2', auction_date: '2026-06-01', starting_price_pln: 2 },
  ], 'bielsko');
  assert.equal(plots.length, 2);
  assert.equal(plots[0].dzialka_nr, '20/2'); // newest first
});

test('plot area takes the largest seen; missing round derives from order', () => {
  const { plots } = buildLand([
    { dzialka_nr: '5/5', area_m2: 600, auction_date: '2025-03-01', starting_price_pln: 1 },
    { dzialka_nr: '5/5', area_m2: 650, auction_date: '2025-08-01', starting_price_pln: 1 },
  ], 'gliwice');
  assert.equal(plots[0].area_m2, 650);
  assert.deepEqual(plots[0].listings.map((l) => l.round), [1, 2]); // derived
});

test('address-fallback keying when no parcel number is present', () => {
  const { plots } = buildLand([
    { street: 'Bukowa', street_norm: 'bukowa', building: '7', area_m2: 800, starting_price_pln: 670000, auction_date: '2026-05-01' },
  ], 'bielsko');
  assert.equal(plots.length, 1);
  assert.equal(plots[0].key, 'bukowa|7|');
  assert.equal(plots[0].area_m2, 800);
});

test('empty input → empty plots', () => {
  assert.deepEqual(buildLand([], 'x'), { plots: [] });
  assert.deepEqual(buildLand(null, 'x'), { plots: [] });
});

test('buildLand attaches a geoportal_url to each plot', () => {
  const { plots } = buildLand([{ dzialka_nr: '5/5', obreb: 'X', auction_date: '2026-09-01', starting_price_pln: 1 }], 'demo', { label: 'Demo' });
  assert.ok(plots[0].geoportal_url, 'geoportal_url set');
});

test('splitParcels: distinct parcels, deduped, with separators', () => {
  assert.deepEqual(splitParcels('263/2, 263/6').map((p) => p.nr), ['263/2', '263/6']);
  assert.deepEqual(splitParcels('5/1; 5/2, 5/1').map((p) => p.nr), ['5/1', '5/2']);
  assert.deepEqual(splitParcels('389').map((p) => p.nr), ['389']);
  assert.deepEqual(splitParcels(null), []);
});

test('buildLand attaches a per-parcel `parcels` list for multi-parcel plots', () => {
  const { plots } = buildLand([{ dzialka_nr: '263/2, 263/6', obreb: 'Bojków', area_m2: 1626, auction_date: '2026-07-14', starting_price_pln: 543060 }], 'gliwice', { label: 'Gliwice' });
  assert.deepEqual(plots[0].parcels.map((p) => p.nr), ['263/2', '263/6']);
});
