import test from 'node:test';
import assert from 'node:assert/strict';
import polkowice from '../src/cities/polkowice/index.js';

test('Polkowice adapter initializes with valid configuration', () => {
  assert.equal(polkowice.id, 'polkowice');
  assert.equal(polkowice.teryt, '0216044');
  assert.equal(polkowice.label, 'Polkowice');
  assert.equal(polkowice.voivodeship, 'dolnoslaskie');
  assert.equal(typeof polkowice.crawlActive, 'function');
  assert.equal(typeof polkowice.crawlResults, 'function');
});
