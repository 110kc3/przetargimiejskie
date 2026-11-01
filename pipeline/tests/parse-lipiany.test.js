import test from 'node:test';
import assert from 'node:assert/strict';
import lipiany from '../src/cities/lipiany/index.js';

test('Lipiany adapter initializes with valid configuration', () => {
  assert.equal(lipiany.id, 'lipiany');
  assert.equal(lipiany.teryt, '3212034');
  assert.equal(lipiany.label, 'Lipiany');
  assert.equal(lipiany.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof lipiany.crawlActive, 'function');
  assert.equal(typeof lipiany.crawlResults, 'function');
});
