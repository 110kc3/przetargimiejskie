import test from 'node:test';
import assert from 'node:assert/strict';
import gryfice from '../src/cities/gryfice/index.js';

test('Gryfice adapter initializes with valid configuration', () => {
  assert.equal(gryfice.id, 'gryfice');
  assert.equal(gryfice.teryt, '3205024');
  assert.equal(gryfice.label, 'Gryfice');
  assert.equal(gryfice.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof gryfice.crawlActive, 'function');
  assert.equal(typeof gryfice.crawlResults, 'function');
});
