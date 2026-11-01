import test from 'node:test';
import assert from 'node:assert/strict';
import niepolomice from '../src/cities/niepolomice/index.js';

test('Niepołomice adapter initializes with valid configuration', () => {
  assert.equal(niepolomice.id, 'niepolomice');
  assert.equal(niepolomice.teryt, '1219044');
  assert.equal(niepolomice.label, 'Niepołomice');
  assert.equal(niepolomice.voivodeship, 'malopolskie');
  assert.equal(typeof niepolomice.crawlActive, 'function');
  assert.equal(typeof niepolomice.crawlResults, 'function');
});
