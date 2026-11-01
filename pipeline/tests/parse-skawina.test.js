import test from 'node:test';
import assert from 'node:assert/strict';
import skawina from '../src/cities/skawina/index.js';

test('Skawina adapter initializes with valid configuration', () => {
  assert.equal(skawina.id, 'skawina');
  assert.equal(skawina.teryt, '1206114');
  assert.equal(skawina.label, 'Skawina');
  assert.equal(skawina.voivodeship, 'malopolskie');
  assert.equal(typeof skawina.crawlActive, 'function');
  assert.equal(typeof skawina.crawlResults, 'function');
});
