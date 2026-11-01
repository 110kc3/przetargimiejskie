import test from 'node:test';
import assert from 'node:assert/strict';
import sierakow from '../src/cities/sierakow/index.js';

test('Sieraków adapter initializes with valid configuration', () => {
  assert.equal(sierakow.id, 'sierakow');
  assert.equal(sierakow.teryt, '3014044');
  assert.equal(sierakow.label, 'Sieraków');
  assert.equal(sierakow.voivodeship, 'wielkopolskie');
  assert.equal(typeof sierakow.crawlActive, 'function');
  assert.equal(typeof sierakow.crawlResults, 'function');
});
