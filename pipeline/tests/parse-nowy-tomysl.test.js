import test from 'node:test';
import assert from 'node:assert/strict';
import nowyTomysl from '../src/cities/nowy-tomysl/index.js';

test('Nowy Tomyśl adapter initializes with valid configuration', () => {
  assert.equal(nowyTomysl.id, 'nowy-tomysl');
  assert.equal(nowyTomysl.teryt, '3015044');
  assert.equal(nowyTomysl.label, 'Nowy Tomyśl');
  assert.equal(nowyTomysl.voivodeship, 'wielkopolskie');
  assert.equal(typeof nowyTomysl.crawlActive, 'function');
  assert.equal(typeof nowyTomysl.crawlResults, 'function');
});
