import test from 'node:test';
import assert from 'node:assert/strict';
import krzeszowice from '../src/cities/krzeszowice/index.js';

test('Krzeszowice adapter initializes with valid configuration', () => {
  assert.equal(krzeszowice.id, 'krzeszowice');
  assert.equal(krzeszowice.teryt, '1206064');
  assert.equal(krzeszowice.label, 'Krzeszowice');
  assert.equal(krzeszowice.voivodeship, 'malopolskie');
  assert.equal(typeof krzeszowice.crawlActive, 'function');
  assert.equal(typeof krzeszowice.crawlResults, 'function');
});
