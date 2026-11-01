import test from 'node:test';
import assert from 'node:assert/strict';
import rzeszow from '../src/cities/rzeszow/index.js';

test('Rzeszów adapter initializes with valid configuration', () => {
  assert.equal(rzeszow.id, 'rzeszow');
  assert.equal(rzeszow.teryt, '1863011');
  assert.equal(rzeszow.label, 'Rzeszów');
  assert.equal(rzeszow.voivodeship, 'podkarpackie');
  assert.equal(typeof rzeszow.crawlActive, 'function');
  assert.equal(typeof rzeszow.crawlResults, 'function');
});
