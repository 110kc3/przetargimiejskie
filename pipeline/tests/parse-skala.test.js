import test from 'node:test';
import assert from 'node:assert/strict';
import skala from '../src/cities/skala/index.js';

test('Skała adapter initializes with valid configuration', () => {
  assert.equal(skala.id, 'skala');
  assert.equal(skala.teryt, '1206104');
  assert.equal(skala.label, 'Skała');
  assert.equal(skala.voivodeship, 'malopolskie');
  assert.equal(typeof skala.crawlActive, 'function');
  assert.equal(typeof skala.crawlResults, 'function');
});
