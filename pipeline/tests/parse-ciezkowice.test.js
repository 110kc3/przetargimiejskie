import test from 'node:test';
import assert from 'node:assert/strict';
import ciezkowice from '../src/cities/ciezkowice/index.js';

test('Ciężkowice adapter initializes with valid configuration', () => {
  assert.equal(ciezkowice.id, 'ciezkowice');
  assert.equal(ciezkowice.teryt, '1216014');
  assert.equal(ciezkowice.label, 'Ciężkowice');
  assert.equal(ciezkowice.voivodeship, 'malopolskie');
  assert.equal(typeof ciezkowice.crawlActive, 'function');
  assert.equal(typeof ciezkowice.crawlResults, 'function');
});
