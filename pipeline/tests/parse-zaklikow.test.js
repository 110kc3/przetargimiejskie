import test from 'node:test';
import assert from 'node:assert/strict';
import zaklikow from '../src/cities/zaklikow/index.js';

test('Zaklików adapter initializes with valid configuration', () => {
  assert.equal(zaklikow.id, 'zaklikow');
  assert.equal(zaklikow.teryt, '1818054');
  assert.equal(zaklikow.label, 'Zaklików');
  assert.equal(zaklikow.voivodeship, 'podkarpackie');
  assert.equal(typeof zaklikow.crawlActive, 'function');
  assert.equal(typeof zaklikow.crawlResults, 'function');
});
