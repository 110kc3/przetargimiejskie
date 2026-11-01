import test from 'node:test';
import assert from 'node:assert/strict';
import kolo from '../src/cities/kolo/index.js';

test('Koło adapter initializes with valid configuration', () => {
  assert.equal(kolo.id, 'kolo');
  assert.equal(kolo.teryt, '3009011');
  assert.equal(kolo.label, 'Koło');
  assert.equal(kolo.voivodeship, 'wielkopolskie');
  assert.equal(typeof kolo.crawlActive, 'function');
  assert.equal(typeof kolo.crawlResults, 'function');
});
