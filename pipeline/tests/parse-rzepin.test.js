import test from 'node:test';
import assert from 'node:assert/strict';
import rzepin from '../src/cities/rzepin/index.js';

test('Rzepin adapter initializes with valid configuration', () => {
  assert.equal(rzepin.id, 'rzepin');
  assert.equal(rzepin.teryt, '0805044');
  assert.equal(rzepin.label, 'Rzepin');
  assert.equal(rzepin.voivodeship, 'lubuskie');
  assert.equal(typeof rzepin.crawlActive, 'function');
  assert.equal(typeof rzepin.crawlResults, 'function');
});
