import test from 'node:test';
import assert from 'node:assert/strict';
import sulmierzyce from '../src/cities/sulmierzyce/index.js';

test('Sulmierzyce adapter initializes with valid configuration', () => {
  assert.equal(sulmierzyce.id, 'sulmierzyce');
  assert.equal(sulmierzyce.teryt, '3012011');
  assert.equal(sulmierzyce.label, 'Sulmierzyce');
  assert.equal(sulmierzyce.voivodeship, 'wielkopolskie');
  assert.equal(typeof sulmierzyce.crawlActive, 'function');
  assert.equal(typeof sulmierzyce.crawlResults, 'function');
});
