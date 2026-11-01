import test from 'node:test';
import assert from 'node:assert/strict';
import puszczykowo from '../src/cities/puszczykowo/index.js';

test('Puszczykowo adapter initializes with valid configuration', () => {
  assert.equal(puszczykowo.id, 'puszczykowo');
  assert.equal(puszczykowo.teryt, '3021021');
  assert.equal(puszczykowo.label, 'Puszczykowo');
  assert.equal(puszczykowo.voivodeship, 'wielkopolskie');
  assert.equal(typeof puszczykowo.crawlActive, 'function');
  assert.equal(typeof puszczykowo.crawlResults, 'function');
});
