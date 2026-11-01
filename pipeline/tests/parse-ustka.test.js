import test from 'node:test';
import assert from 'node:assert/strict';
import ustka from '../src/cities/ustka/index.js';

test('Ustka adapter initializes with valid configuration', () => {
  assert.equal(ustka.id, 'ustka');
  assert.equal(ustka.teryt, '2212011');
  assert.equal(ustka.label, 'Ustka');
  assert.equal(ustka.voivodeship, 'pomorskie');
  assert.equal(typeof ustka.crawlActive, 'function');
  assert.equal(typeof ustka.crawlResults, 'function');
});
