import test from 'node:test';
import assert from 'node:assert/strict';
import dobrodzien from '../src/cities/dobrodzien/index.js';

test('Dobrodzień adapter initializes with valid configuration', () => {
  assert.equal(dobrodzien.id, 'dobrodzien');
  assert.equal(dobrodzien.teryt, '1608014');
  assert.equal(dobrodzien.label, 'Dobrodzień');
  assert.equal(dobrodzien.voivodeship, 'opolskie');
  assert.equal(typeof dobrodzien.crawlActive, 'function');
  assert.equal(typeof dobrodzien.crawlResults, 'function');
});
