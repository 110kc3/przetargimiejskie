import test from 'node:test';
import assert from 'node:assert/strict';
import czlopa from '../src/cities/czlopa/index.js';

test('Człopa adapter initializes with valid configuration', () => {
  assert.equal(czlopa.id, 'czlopa');
  assert.equal(czlopa.teryt, '3217024');
  assert.equal(czlopa.label, 'Człopa');
  assert.equal(czlopa.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof czlopa.crawlActive, 'function');
  assert.equal(typeof czlopa.crawlResults, 'function');
});
