import test from 'node:test';
import assert from 'node:assert/strict';
import sulkowice from '../src/cities/sulkowice/index.js';

test('Sułkowice adapter initializes with valid configuration', () => {
  assert.equal(sulkowice.id, 'sulkowice');
  assert.equal(sulkowice.teryt, '1209074');
  assert.equal(sulkowice.label, 'Sułkowice');
  assert.equal(sulkowice.voivodeship, 'malopolskie');
  assert.equal(typeof sulkowice.crawlActive, 'function');
  assert.equal(typeof sulkowice.crawlResults, 'function');
});
