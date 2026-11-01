import test from 'node:test';
import assert from 'node:assert/strict';
import brzescKujawski from '../src/cities/brzesc-kujawski/index.js';

test('Brześć Kujawski adapter initializes with valid configuration', () => {
  assert.equal(brzescKujawski.id, 'brzesc-kujawski');
  assert.equal(brzescKujawski.teryt, '0418044');
  assert.equal(brzescKujawski.label, 'Brześć Kujawski');
  assert.equal(brzescKujawski.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof brzescKujawski.crawlActive, 'function');
  assert.equal(typeof brzescKujawski.crawlResults, 'function');
});
