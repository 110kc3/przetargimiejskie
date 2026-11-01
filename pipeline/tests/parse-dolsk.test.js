import test from 'node:test';
import assert from 'node:assert/strict';
import dolsk from '../src/cities/dolsk/index.js';

test('Dolsk adapter initializes with valid configuration', () => {
  assert.equal(dolsk.id, 'dolsk');
  assert.equal(dolsk.teryt, '3026024');
  assert.equal(dolsk.label, 'Dolsk');
  assert.equal(dolsk.voivodeship, 'wielkopolskie');
  assert.equal(typeof dolsk.crawlActive, 'function');
  assert.equal(typeof dolsk.crawlResults, 'function');
});
