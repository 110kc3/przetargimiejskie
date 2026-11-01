import test from 'node:test';
import assert from 'node:assert/strict';
import nowe from '../src/cities/nowe/index.js';

test('Nowe adapter initializes with valid configuration', () => {
  assert.equal(nowe.id, 'nowe');
  assert.equal(nowe.teryt, '0414064');
  assert.equal(nowe.label, 'Nowe');
  assert.equal(nowe.voivodeship, 'kujawsko-pomorskie');
  assert.equal(typeof nowe.crawlActive, 'function');
  assert.equal(typeof nowe.crawlResults, 'function');
});
