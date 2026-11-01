import test from 'node:test';
import assert from 'node:assert/strict';
import koszyce from '../src/cities/koszyce/index.js';

test('Koszyce adapter initializes with valid configuration', () => {
  assert.equal(koszyce.id, 'koszyce');
  assert.equal(koszyce.teryt, '1214024');
  assert.equal(koszyce.label, 'Koszyce');
  assert.equal(koszyce.voivodeship, 'malopolskie');
  assert.equal(typeof koszyce.crawlActive, 'function');
  assert.equal(typeof koszyce.crawlResults, 'function');
});
