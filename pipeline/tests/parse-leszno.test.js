import test from 'node:test';
import assert from 'node:assert/strict';
import leszno from '../src/cities/leszno/index.js';

test('Leszno adapter initializes with valid configuration', () => {
  assert.equal(leszno.id, 'leszno');
  assert.equal(leszno.teryt, '3063011');
  assert.equal(leszno.label, 'Leszno');
  assert.equal(leszno.voivodeship, 'wielkopolskie');
  assert.equal(typeof leszno.crawlActive, 'function');
  assert.equal(typeof leszno.crawlResults, 'function');
});
