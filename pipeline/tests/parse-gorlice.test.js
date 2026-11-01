import test from 'node:test';
import assert from 'node:assert/strict';
import gorlice from '../src/cities/gorlice/index.js';

test('Gorlice adapter initializes with valid configuration', () => {
  assert.equal(gorlice.id, 'gorlice');
  assert.equal(gorlice.teryt, '1205011');
  assert.equal(gorlice.label, 'Gorlice');
  assert.equal(gorlice.voivodeship, 'malopolskie');
  assert.equal(typeof gorlice.crawlActive, 'function');
  assert.equal(typeof gorlice.crawlResults, 'function');
});
