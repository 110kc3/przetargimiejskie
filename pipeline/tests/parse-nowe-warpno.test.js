import test from 'node:test';
import assert from 'node:assert/strict';
import noweWarpno from '../src/cities/nowe-warpno/index.js';

test('Nowe Warpno adapter initializes with valid configuration', () => {
  assert.equal(noweWarpno.id, 'nowe-warpno');
  assert.equal(noweWarpno.teryt, '3211034');
  assert.equal(noweWarpno.label, 'Nowe Warpno');
  assert.equal(noweWarpno.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof noweWarpno.crawlActive, 'function');
  assert.equal(typeof noweWarpno.crawlResults, 'function');
});
